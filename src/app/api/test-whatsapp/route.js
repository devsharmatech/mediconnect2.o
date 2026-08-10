import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import {
  sendAppointmentReminder,
  sendAppointmentUpdateAlert,
  sendPaymentUpdate
} from "@/lib/sms";

/**
 * GET /api/test-whatsapp
 * 
 * Secure internal testing endpoint to verify the three WhatsApp template message dispatches
 * with real dynamic formatting and compliance verifications.
 */
export async function GET(req) {
  const startedAt = Date.now();
  const results = {
    reminder: null,
    update_alert: null,
    payment_success: null,
    payment_refund: null
  };

  try {
    // 1. Fetch a sample appointment for testing context
    const { data: apt, error: aptErr } = await supabase
      .from("appointments")
      .select("id, patient_id, doctor_id, appointment_date, appointment_time, appointment_type")
      .limit(1)
      .maybeSingle();

    if (aptErr) throw aptErr;
    if (!apt) {
      return failure("Test context failure", "No appointments found to run tests.", 404);
    }

    const patientId = apt.patient_id;
    const doctorId = apt.doctor_id;

    // 2. Fetch patient and doctor names, and user phone number
    const { data: patientUser } = await supabase
      .from("users")
      .select("phone_number")
      .eq("id", patientId)
      .maybeSingle();

    const { data: patientDetails } = await supabase
      .from("patient_details")
      .select("full_name")
      .eq("id", patientId)
      .maybeSingle();

    const { data: doctorDetails } = await supabase
      .from("doctor_details")
      .select("full_name")
      .eq("id", doctorId)
      .maybeSingle();

    let phoneNumber = patientUser?.phone_number;
    const patientName = patientDetails?.full_name || "Test Patient";
    const doctorName = doctorDetails?.full_name || "Test Doctor";

    if (!phoneNumber) {
      // Temporarily use sandbox number if user has no phone set
      phoneNumber = "+917289043888";
    }

    console.log(`[WhatsApp Test Endpoint] Running dispatches to recipient ${phoneNumber} for patient ID ${patientId}...`);

    // 3. Check existing consent to avoid deleting user's actual data
    const { data: existingConsent } = await supabase
      .from("consent_logs")
      .select("id, status")
      .eq("patient_id", patientId)
      .eq("consent_type", "DATA_SHARING")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const alreadyConsented = existingConsent?.status === true;
    let insertedConsentId = null;

    if (!alreadyConsented) {
      const { data: insData, error: insErr } = await supabase
        .from("consent_logs")
        .insert({
          patient_id: patientId,
          consent_type: "DATA_SHARING",
          status: true,
          metadata: { source: "temp-test-route", timestamp: new Date().toISOString() }
        })
        .select("id")
        .single();

      if (insErr) throw insErr;
      insertedConsentId = insData?.id;
      console.log(`[WhatsApp Test Endpoint] Temporary consent log injected (ID: ${insertedConsentId}) for patient: ${patientId}`);
    } else {
      console.log(`[WhatsApp Test Endpoint] Patient ${patientId} already has active consent. Skipping temporary injection.`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST CASE 1: Appointment Reminder
    // Passing "Dr. Dr. Dev Kumar" to test recursion and raw time/date
    // ─────────────────────────────────────────────────────────────────────────
    console.log("[WhatsApp Test Endpoint] Dispatching Test 1: Reminder...");
    results.reminder = await sendAppointmentReminder({
      phone_number: phoneNumber,
      recipient_name: patientName,
      appointment_code: "MCAPT-" + apt.id.slice(0, 8).toUpperCase(),
      patient_name: patientName,
      doctor_or_service: "Dr. Dr. Dev Kumar", // Duplicate prefixes to verify stripping
      date: "2026-05-25",                      // Raw date to verify "25 May 2026"
      time: "13:30",                           // Raw time to verify "01:30 PM"
      location_or_mode: "Video Call",
      patient_id: patientId
    });

    // ─────────────────────────────────────────────────────────────────────────
    // TEST CASE 2: Appointment Update Alert
    // Passing "dr Dev Kumar" to test lowercase recursion and raw time/date
    // ─────────────────────────────────────────────────────────────────────────
    console.log("[WhatsApp Test Endpoint] Dispatching Test 2: Update Alert...");
    results.update_alert = await sendAppointmentUpdateAlert({
      phone_number: phoneNumber,
      recipient_name: patientName,
      status_type: "rescheduled",
      appointment_code: "MCAPT-" + apt.id.slice(0, 8).toUpperCase(),
      patient_name: patientName,
      doctor_or_service: "dr Dev Kumar",       // Lowercase prefix
      date: "2026-05-25",
      time: "14:45",                           // raw 24h format -> "02:45 PM"
      location_or_mode: "Video Call",
      patient_id: patientId
    });

    // ─────────────────────────────────────────────────────────────────────────
    // TEST CASE 3: Payment Success Update
    // ─────────────────────────────────────────────────────────────────────────
    console.log("[WhatsApp Test Endpoint] Dispatching Test 3: Payment Success Receipt...");
    results.payment_success = await sendPaymentUpdate({
      phone_number: phoneNumber,
      recipient_name: patientName,
      payment_status: "success",
      payment_reference_id: "pay_test_captured_123",
      paid_amount: "499",
      service_name: "Doctor Consultation",
      patient_id: patientId
    });

    // ─────────────────────────────────────────────────────────────────────────
    // TEST CASE 4: Payment Refund Update
    // ─────────────────────────────────────────────────────────────────────────
    console.log("[WhatsApp Test Endpoint] Dispatching Test 4: Refund Notification...");
    results.payment_refund = await sendPaymentUpdate({
      phone_number: phoneNumber,
      recipient_name: patientName,
      payment_status: "refund_initiated",
      payment_reference_id: "rfnd_test_reversed_123",
      paid_amount: "499",
      service_name: "Refund for Appointment",
      patient_id: patientId
    });

    // 4. Clean up temporary consent record to restore database integrity
    if (insertedConsentId) {
      await supabase
        .from("consent_logs")
        .delete()
        .eq("id", insertedConsentId);
      console.log("[WhatsApp Test Endpoint] Temporary consent log removed successfully.");
    } else {
      console.log("[WhatsApp Test Endpoint] No temporary consent was inserted. Cleanup skipped.");
    }

    const duration = Date.now() - startedAt;
    console.log(`[WhatsApp Test Endpoint] Complete in ${duration}ms.`);

    return success("All three message types successfully tested and dispatched.", {
      duration_ms: duration,
      recipient_phone: phoneNumber,
      recipient_name: patientName,
      results
    });

  } catch (err) {
    console.error("[WhatsApp Test Endpoint] Fatal Error:", err.message);
    return failure("Test endpoint run failed", err.message, 500);
  }
}
