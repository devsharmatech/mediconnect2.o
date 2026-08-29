import { supabase } from "@/lib/supabaseAdmin";
import { deleteFromS3, extractKeyFromUrl } from "@/lib/s3";
import { randomUUID } from "crypto";

/**
 * Helper to safely delete from Supabase table without crashing if table/column doesn't exist
 */
async function safeDelete(table, queryBuilderFn) {
  try {
    let query = supabase.from(table).delete();
    query = queryBuilderFn(query);
    const { error } = await query;
    if (error && error.code !== "PGRST204" && error.code !== "42P01") {
      // Soft notice for non-critical errors
      console.warn(`[DPDP PURGE] Note deleting from ${table}:`, error.message);
    }
  } catch (err) {
    console.warn(`[DPDP PURGE] Exception deleting from ${table}:`, err.message);
  }
}

/**
 * Anonymizes and de-identifies a patient account in compliance with India's DPDP Act 2023.
 * 
 * 1. Permanently erases all Personally Identifiable Information (PII) from PostgreSQL & AWS S3:
 *    - Name -> "DE-IDENTIFIED PATIENT"
 *    - Phone -> "ANONYMIZED_<hash>"
 *    - Email -> "anonymized_<hash>@mediconnect.fit"
 *    - Address, Date of Birth, Gender, Emergency Contact -> Cleared/Masked
 *    - Profile picture & Digital Locker files -> Permanently deleted from AWS S3
 * 2. Revokes active tokens, FCM push tokens, notifications, and consents.
 * 3. Cancels any active/upcoming appointments.
 * 4. Retains de-identified clinical notes & financial transaction references so doctors & institutions
 *    comply with statutory 3-5 year medico-legal audit regulations (NMC, Clinical Establishments Act, GST Act).
 * 
 * @param {string} userId - UUID of the patient user
 * @param {string} [reason="USER_REQUEST"] - Reason for anonymization
 * @returns {Promise<{success: boolean, message: string, anonymized_at: string}>}
 */
export async function anonymizePatientAccount(userId, reason = "USER_REQUEST") {
  if (!userId) {
    throw new Error("Missing required parameter: userId");
  }

  console.log(`[DPDP ANONYMIZE] Initiating PII de-identification for patient: ${userId}`);

  // 1. Delete S3 profile pictures & Digital Locker private documents
  try {
    const { data: user } = await supabase
      .from("users")
      .select("id, profile_picture")
      .eq("id", userId)
      .maybeSingle();

    if (user?.profile_picture) {
      try {
        const key = extractKeyFromUrl(user.profile_picture) || `profile-pictures/${user.profile_picture.split("/").pop()}`;
        if (key) await deleteFromS3(key);
      } catch (imgErr) {
        console.warn("[DPDP ANONYMIZE] Warning deleting profile picture from S3:", imgErr.message);
      }
    }

    const { data: lockerDocs } = await supabase
      .from("digital_locker_documents")
      .select("file_url, file_path")
      .eq("user_id", userId);

    if (lockerDocs && lockerDocs.length > 0) {
      for (const doc of lockerDocs) {
        const s3Path = doc.file_path || (doc.file_url ? extractKeyFromUrl(doc.file_url) : null);
        if (s3Path) {
          try {
            await deleteFromS3(s3Path);
          } catch (docErr) {
            console.warn("[DPDP ANONYMIZE] Warning deleting locker file from S3:", docErr.message);
          }
        }
      }
    }
  } catch (s3ScanErr) {
    console.warn("[DPDP ANONYMIZE] Warning scanning S3 files:", s3ScanErr.message);
  }

  const anonymizedHash = randomUUID().replace(/-/g, "").substring(0, 10);
  const nowIso = new Date().toISOString();

  // 2. Anonymize Base User (Mask phone_number, clear OTP/tokens, remove avatar)
  const { error: userErr } = await supabase
    .from("users")
    .update({
      phone_number: `ANONYMIZED_${anonymizedHash}`,
      profile_picture: null,
      otp_code: null,
      otp_expires_at: null,
      updated_at: nowIso,
    })
    .eq("id", userId);

  if (userErr) {
    console.error("[DPDP ANONYMIZE] Error updating users:", userErr);
    throw new Error(`Failed to anonymize user record: ${userErr.message}`);
  }

  // 3. Anonymize Patient Details Table (Scrub full_name, email, address, DOB, emergency contact)
  const { error: detailsErr } = await supabase
    .from("patient_details")
    .update({
      full_name: "DE-IDENTIFIED PATIENT",
      email: `anonymized_${anonymizedHash}@mediconnect.fit`,
      address: "ANONYMIZED",
      date_of_birth: "1970-01-01",
      emergency_contact: null,
      blood_group: null,
      gender: "Other",
      updated_at: nowIso,
    })
    .eq("id", userId);

  if (detailsErr) {
    console.error("[DPDP ANONYMIZE] Error updating patient_details:", detailsErr);
    throw new Error(`Failed to anonymize patient details: ${detailsErr.message}`);
  }

  // 4. Scrub Digital Locker Metadata & Verification Requests
  await safeDelete("document_verification_requests", (q) => q.eq("user_id", userId));
  await safeDelete("digital_locker_documents", (q) => q.eq("user_id", userId));
  await safeDelete("document_shares", (q) => q.eq("patient_id", userId));

  // 5. Revoke and Reset Consent Logs
  await safeDelete("consent_logs", (q) => q.eq("patient_id", userId));
  await safeDelete("patient_consent_log", (q) => q.eq("patient_id", userId));
  await safeDelete("nursing_consent_logs", (q) => q.or(`patient_id.eq.${userId},user_id.eq.${userId}`));
  await safeDelete("lab_order_consents", (q) => q.or(`patient_id.eq.${userId},user_id.eq.${userId}`));

  // 6. Cancel Any Active / Upcoming Appointments
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    await supabase
      .from("appointments")
      .update({
        status: "cancelled",
        updated_at: nowIso,
      })
      .eq("patient_id", userId)
      .gte("appointment_date", todayStr)
      .in("status", ["pending", "booked", "confirmed", "freezed"]);
  } catch (apptErr) {
    console.warn("[DPDP ANONYMIZE] Notice cancelling active appointments:", apptErr.message);
  }

  // 7. Clear Push Tokens, Notifications, and Session Preferences
  await safeDelete("fcm_tokens", (q) => q.eq("user_id", userId));
  await safeDelete("user_preferences", (q) => q.eq("user_id", userId));
  await safeDelete("notifications", (q) => q.eq("user_id", userId));

  // 8. Immutable Audit Trail Logging for DPDP Compliance
  try {
    await supabase.from("data_access_log").insert([{
      user_id: userId,
      patient_id: userId,
      action: "ANONYMIZE_DATA",
      action_type: "anonymize",
      resource_type: "USER_PROFILE",
      status: "completed",
      metadata: {
        reason: reason || "USER_REQUEST",
        compliance: "DPDP_ACT_2023_SECTION_12",
        anonymized_hash: anonymizedHash,
        anonymized_at: nowIso,
      }
    }]);
  } catch (logErr) {
    console.warn("[DPDP ANONYMIZE] Audit log warning:", logErr.message);
  }

  console.log(`[DPDP ANONYMIZE] Successfully completed PII anonymization for patient: ${userId}`);
  return {
    success: true,
    message: "Patient account successfully anonymized. PII erased, clinical records de-identified for statutory audit compliance.",
    anonymized_at: nowIso,
  };
}

/**
 * Permanently deletes a patient account and all associated personal, medical,
 * and clinical data in compliance with India's DPDP Act 2023 (Right to Erasure / Right to be Forgotten).
 * 
 * Safely removes child foreign-key dependencies in correct order before deleting
 * patient_details and users rows.
 * 
 * @param {string} userId - UUID of the patient user
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
export async function deletePatientAccount(userId) {
  if (!userId) {
    throw new Error("Missing required parameter: userId");
  }

  console.log(`[DPDP PURGE] Initiating complete data erasure for patient: ${userId}`);

  // 1. Fetch user & S3 file references before DB deletion
  try {
    const { data: user } = await supabase
      .from("users")
      .select("id, profile_picture")
      .eq("id", userId)
      .maybeSingle();

    if (user?.profile_picture) {
      try {
        const key = extractKeyFromUrl(user.profile_picture) || `profile-pictures/${user.profile_picture.split("/").pop()}`;
        if (key) await deleteFromS3(key);
      } catch (imgErr) {
        console.warn("[DPDP PURGE] Warning deleting profile picture from S3:", imgErr.message);
      }
    }

    // Delete all files in patient's digital locker from S3
    const { data: lockerDocs } = await supabase
      .from("digital_locker_documents")
      .select("file_url, file_path")
      .eq("user_id", userId);

    if (lockerDocs && lockerDocs.length > 0) {
      for (const doc of lockerDocs) {
        const s3Path = doc.file_path || (doc.file_url ? extractKeyFromUrl(doc.file_url) : null);
        if (s3Path) {
          try {
            await deleteFromS3(s3Path);
          } catch (docErr) {
            console.warn("[DPDP PURGE] Warning deleting locker file from S3:", docErr.message);
          }
        }
      }
    }
  } catch (s3ScanErr) {
    console.warn("[DPDP PURGE] Warning scanning S3 files for user:", s3ScanErr.message);
  }

  // 2. Cascade Delete Child Records (Strict dependency order)

  // A. Document & Consent Subsystem (Delete children before consent_logs / patient_details)
  await safeDelete("document_verification_requests", (q) => q.eq("user_id", userId));
  await safeDelete("document_shares", (q) => q.eq("patient_id", userId));
  await safeDelete("digital_locker_documents", (q) => q.eq("user_id", userId));
  await safeDelete("consent_logs", (q) => q.eq("patient_id", userId));
  await safeDelete("patient_consent_log", (q) => q.eq("patient_id", userId));
  await safeDelete("nursing_consent_logs", (q) => q.or(`patient_id.eq.${userId},user_id.eq.${userId}`));
  await safeDelete("lab_order_consents", (q) => q.or(`patient_id.eq.${userId},user_id.eq.${userId}`));
  await safeDelete("data_access_log", (q) => q.or(`patient_id.eq.${userId},user_id.eq.${userId}`));
  await safeDelete("funnel_tracking_log", (q) => q.eq("patient_id", userId));

  // B. Clinical & Consultation Data
  await safeDelete("consultation_outcome", (q) => q.eq("patient_id", userId));
  await safeDelete("consultation_baseline", (q) => q.eq("patient_id", userId));
  await safeDelete("prescriptions", (q) => q.eq("patient_id", userId));
  await safeDelete("consultations", (q) => q.eq("patient_id", userId));
  await safeDelete("appointments", (q) => q.eq("patient_id", userId));
  await safeDelete("vital_signs", (q) => q.eq("patient_id", userId));
  await safeDelete("patient_vitals", (q) => q.eq("patient_id", userId));
  await safeDelete("health_assessments", (q) => q.or(`patient_id.eq.${userId},user_id.eq.${userId}`));
  await safeDelete("breathing_sessions", (q) => q.eq("user_id", userId));
  await safeDelete("home_visit_request", (q) => q.eq("patient_id", userId));
  await safeDelete("offline_queue", (q) => q.eq("patient_id", userId));

  // C. Commerce & Orders
  try {
    const { data: medOrders } = await supabase
      .from("medicine_orders")
      .select("id")
      .eq("patient_id", userId);

    if (medOrders && medOrders.length > 0) {
      const orderIds = medOrders.map((o) => o.id);
      await safeDelete("medicine_order_items", (q) => q.in("order_id", orderIds));
      await safeDelete("medicine_orders", (q) => q.in("id", orderIds));
    }
  } catch (err) {
    console.warn("[DPDP PURGE] Error deleting medicine orders:", err.message);
  }

  try {
    const { data: labOrders } = await supabase
      .from("lab_test_orders")
      .select("id")
      .eq("patient_id", userId);

    if (labOrders && labOrders.length > 0) {
      const orderIds = labOrders.map((o) => o.id);
      await safeDelete("lab_test_order_items", (q) => q.in("order_id", orderIds));
      await safeDelete("lab_payment_logs", (q) => q.in("order_id", orderIds));
      await safeDelete("lab_test_orders", (q) => q.in("id", orderIds));
    }
  } catch (err) {
    console.warn("[DPDP PURGE] Error deleting lab orders:", err.message);
  }

  await safeDelete("lab_reports", (q) => q.eq("patient_id", userId));
  await safeDelete("lab_payment_logs", (q) => q.eq("patient_id", userId));
  await safeDelete("user_insurance_applications", (q) => q.eq("user_id", userId));

  // D. Nursing & Care Episodes
  try {
    const { data: nursingLeads } = await supabase
      .from("nursing_leads")
      .select("id")
      .or(`patient_id.eq.${userId},user_id.eq.${userId}`);

    if (nursingLeads && nursingLeads.length > 0) {
      const leadIds = nursingLeads.map((l) => l.id);
      await safeDelete("nursing_notes", (q) => q.in("lead_id", leadIds));
      await safeDelete("nursing_referrals", (q) => q.in("lead_id", leadIds));
      await safeDelete("nursing_leads", (q) => q.in("id", leadIds));
    }
  } catch (err) {
    console.warn("[DPDP PURGE] Error deleting nursing leads:", err.message);
  }

  await safeDelete("activity_log", (q) => q.or(`patient_id.eq.${userId},actor_id.eq.${userId}`));
  await safeDelete("care_episodes", (q) => q.eq("patient_id", userId));

  // E. Identity, Preferences & Notifications
  await safeDelete("notifications", (q) => q.eq("user_id", userId));
  await safeDelete("fcm_tokens", (q) => q.eq("user_id", userId));
  await safeDelete("user_preferences", (q) => q.eq("user_id", userId));
  await safeDelete("support_tickets", (q) => q.eq("user_id", userId));

  // F. Delete patient_details and users records
  const { error: patientDetailsErr } = await supabase
    .from("patient_details")
    .delete()
    .eq("id", userId);

  if (patientDetailsErr) {
    console.error("[DPDP PURGE] Error deleting patient_details:", patientDetailsErr);
    throw new Error(`Failed to delete patient details: ${patientDetailsErr.message}`);
  }

  const { error: userErr } = await supabase
    .from("users")
    .delete()
    .eq("id", userId);

  if (userErr) {
    console.error("[DPDP PURGE] Error deleting users:", userErr);
    throw new Error(`Failed to delete user profile: ${userErr.message}`);
  }

  console.log(`[DPDP PURGE] Successfully erased all data for patient: ${userId}`);
  return { success: true, message: "Patient account and personal data completely erased." };
}
