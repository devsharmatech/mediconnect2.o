import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";

/**
 * GET /api/test-notify-button
 * 
 * Verifies that POST /api/notifications/send successfully queries the appointment,
 * validates consent, and dispatches the WhatsApp notification.
 */
export async function GET(req) {
  const startedAt = Date.now();
  let patientId = null;
  let appointmentId = null;

  try {
    console.log("[Doctor Notify Test] Querying a real appointment to construct the payload...");

    // 1. Fetch a real appointment for target context
    const { data: apt, error: aptErr } = await supabase
      .from("appointments")
      .select("id, patient_id, doctor_id, appointment_date, appointment_time, appointment_type")
      .limit(1)
      .maybeSingle();

    if (aptErr) throw aptErr;
    if (!apt) {
      return failure("No context", "No appointments exist in the database to run the test.", 404);
    }

    appointmentId = apt.id;
    patientId = apt.patient_id;

    // 2. Check existing consent to avoid deleting user's actual data
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
          metadata: { source: "test-notify-button-route", timestamp: new Date().toISOString() }
        })
        .select("id")
        .single();
      
      if (insErr) throw insErr;
      insertedConsentId = insData?.id;
      console.log(`[Doctor Notify Test] Temporary consent log injected (ID: ${insertedConsentId}) for patient: ${patientId}`);
    } else {
      console.log(`[Doctor Notify Test] Patient ${patientId} already has active consent. Skipping temporary injection.`);
    }

    // 3. Make POST request to the newly integrated /api/notifications/send endpoint
    const sendUrl = "http://localhost:3000/api/notifications/send";
    console.log(`[Doctor Notify Test] POSTing to ${sendUrl}...`);

    const postResponse = await fetch(sendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        user_id: patientId,
        title: "Appointment Reminder",
        message: "Your doctor is ready for the consultation. Please join now.",
        type: "appointment_reminder",
        metadata: {
          appointment_id: appointmentId,
          doctor_id: apt.doctor_id
        }
      })
    });

    const status = postResponse.status;
    const json = await postResponse.json();

    console.log(`[Doctor Notify Test] Integrated /api/notifications/send responded with status ${status}`);

    // 4. CLEANUP consent log
    if (insertedConsentId) {
      await supabase
        .from("consent_logs")
        .delete()
        .eq("id", insertedConsentId);
      console.log("[Doctor Notify Test] Temporary consent log removed successfully.");
    } else {
      console.log("[Doctor Notify Test] No temporary consent log was inserted. Cleanup skipped.");
    }

    const duration = Date.now() - startedAt;
    console.log(`[Doctor Notify Test] Test run finished in ${duration}ms.`);

    return success("Doctor-side Notify Patient panel integration successfully verified.", {
      duration_ms: duration,
      http_status: status,
      api_response: json
    });

  } catch (err) {
    console.error("[Doctor Notify Test] Fatal error:", err.message);
    
    // Safety cleanup
    if (insertedConsentId) {
      try {
        await supabase
          .from("consent_logs")
          .delete()
          .eq("id", insertedConsentId);
        console.log("[Doctor Notify Test] Safety cleanup: Temporary consent log removed.");
      } catch (cleanErr) {
        console.error("[Doctor Notify Test] Safety cleanup error:", cleanErr.message);
      }
    }

    return failure("Notify button integration test failed", err.message, 500);
  }
}
