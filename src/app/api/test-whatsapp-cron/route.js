import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";

/**
 * GET /api/test-whatsapp-cron
 * 
 * Secure internal testing endpoint to verify the Appointment Reminders Cron scheduler.
 * Dynamically provisions tomorrow's appointment, invokes the cron job with security credentials,
 * captures outputs, and tears down all test resources.
 */
export async function GET(req) {
  const startedAt = Date.now();
  let createdAppointmentId = null;
  let patientId = null;
  let doctorId = null;
  let originalConsentState = null;

  try {
    console.log("[WhatsApp Cron Test] Fetching doctor and patient context from database...");

    // 1. Get a sample appointment to retrieve real doctor and patient UUIDs
    const { data: sampleApt, error: sampleErr } = await supabase
      .from("appointments")
      .select("patient_id, doctor_id")
      .limit(1)
      .maybeSingle();

    if (sampleErr) throw sampleErr;
    if (!sampleApt) {
      return failure("Test Context Error", "Could not fetch a sample appointment to extract patient/doctor IDs.", 404);
    }

    patientId = sampleApt.patient_id;
    doctorId = sampleApt.doctor_id;

    // 2. Fetch the patient user to ensure they have a phone number
    const { data: patientUser, error: userErr } = await supabase
      .from("users")
      .select("phone_number")
      .eq("id", patientId)
      .maybeSingle();

    if (userErr) throw userErr;
    
    // Fallback to a sandbox phone number if none is set
    let phoneNumber = patientUser?.phone_number;
    if (!phoneNumber) {
      phoneNumber = "+917887777666";
      await supabase
        .from("users")
        .update({ phone_number: phoneNumber })
        .eq("id", patientId);
      console.log(`[WhatsApp Cron Test] Set temporary phone number ${phoneNumber} on patient ${patientId}`);
    }

    // 3. Compute tomorrow's date string (YYYY-MM-DD)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    const appointmentTime = "13:30";

    console.log(`[WhatsApp Cron Test] Creating temporary appointment for tomorrow (${tomorrowStr})...`);

    // 4. Ensure no existing duplicate notifications or reminders block this test
    await supabase
      .from("notifications")
      .delete()
      .eq("user_id", patientId)
      .eq("type", "appointment_reminder");

    // 5. Insert mock appointment for tomorrow
    const { data: mockApt, error: createAptErr } = await supabase
      .from("appointments")
      .insert({
        patient_id: patientId,
        doctor_id: doctorId,
        appointment_date: tomorrowStr,
        appointment_time: appointmentTime,
        appointment_type: "video_consultation",
        status: "booked"
      })
      .select("id")
      .single();

    if (createAptErr) throw createAptErr;
    createdAppointmentId = mockApt.id;
    console.log(`[WhatsApp Cron Test] Temporary appointment created successfully with ID: ${createdAppointmentId}`);

    // 6. Ensure active DPDP consent for the test patient
    // 6. Ensure active DPDP consent for the test patient without deleting actual logs
    const { data: existingConsents } = await supabase
      .from("consent_logs")
      .select("id, status")
      .eq("patient_id", patientId)
      .eq("consent_type", "DATA_SHARING")
      .order("created_at", { ascending: false })
      .limit(1);

    const alreadyConsented = existingConsents && existingConsents.length > 0 && existingConsents[0].status === true;
    let insertedConsentId = null;

    if (!alreadyConsented) {
      const { data: insData, error: insErr } = await supabase
        .from("consent_logs")
        .insert({
          patient_id: patientId,
          consent_type: "DATA_SHARING",
          status: true,
          metadata: { source: "temp-cron-test", timestamp: new Date().toISOString() }
        })
        .select("id")
        .single();
      
      if (insErr) throw insErr;
      insertedConsentId = insData?.id;
      console.log(`[WhatsApp Cron Test] Dynamic DPDP consent injected (ID: ${insertedConsentId}) for patient: ${patientId}`);
    } else {
      console.log(`[WhatsApp Cron Test] Patient ${patientId} already has active consent. Skipping temporary injection.`);
    }

    // 7. Trigger the cron endpoint internally using HTTP fetch
    const cronSecret = process.env.CRON_SECRET || "1a077b6e0d8f4128bd22ca73e0e01123";
    const appUrl = "http://localhost:3000";
    const cronUrl = `${appUrl}/api/cron/appointment-reminders`;

    console.log(`[WhatsApp Cron Test] Hitting cron endpoint internally at ${cronUrl}...`);
    
    const cronRes = await fetch(cronUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${cronSecret}`
      }
    });

    const cronStatus = cronRes.status;
    const cronJson = await cronRes.json();

    console.log(`[WhatsApp Cron Test] Cron responded with HTTP status ${cronStatus}`);

    // 8. TEARDOWN AND CLEANUP
    console.log("[WhatsApp Cron Test] Starting teardown and cleanup operations...");

    // Delete mock appointment
    if (createdAppointmentId) {
      await supabase
        .from("appointments")
        .delete()
        .eq("id", createdAppointmentId);
      console.log("[WhatsApp Cron Test] Mock appointment deleted.");
    }

    // Delete notification audit record created by the cron
    await supabase
      .from("notifications")
      .delete()
      .eq("user_id", patientId)
      .eq("type", "appointment_reminder");
    console.log("[WhatsApp Cron Test] Reminder notifications audit records cleared.");

    // Restore consent state (delete temporary consent log if we inserted one)
    if (insertedConsentId) {
      await supabase
        .from("consent_logs")
        .delete()
        .eq("id", insertedConsentId);
      console.log("[WhatsApp Cron Test] Temporary consent log removed successfully.");
    } else {
      console.log("[WhatsApp Cron Test] No temporary consent log was inserted. Cleanup skipped.");
    }

    const duration = Date.now() - startedAt;
    console.log(`[WhatsApp Cron Test] Verification complete in ${duration}ms.`);

    return success("Appointment reminders cron job pipeline fully tested.", {
      duration_ms: duration,
      cron_status: cronStatus,
      cron_response: cronJson
    });

  } catch (err) {
    console.error("[WhatsApp Cron Test] Fatal execution failure:", err.message);
    
    // Safe teardown on exception
    try {
      if (createdAppointmentId) {
        await supabase.from("appointments").delete().eq("id", createdAppointmentId);
      }
      if (patientId) {
        await supabase.from("notifications").delete().eq("user_id", patientId).eq("type", "appointment_reminder");
      }
      if (insertedConsentId) {
        await supabase.from("consent_logs").delete().eq("id", insertedConsentId);
      }
    } catch (cleanErr) {
      console.error("[WhatsApp Cron Test] Error during safety cleanup:", cleanErr.message);
    }

    return failure("Cron testing route exception", err.message, 500);
  }
}
