import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { sendAppointmentReminder } from "@/lib/sms";

/**
 * GET / POST /api/cron/appointment-reminders
 * 
 * Daily appointment reminder cron job.
 * Finds all booked/approved appointments scheduled for tomorrow,
 * verifies if a reminder notification has already been sent,
 * and dispatches a WhatsApp reminder template notification if not.
 */

export async function GET(req) {
  return await executeAppointmentReminders(req);
}

export async function POST(req) {
  return await executeAppointmentReminders(req);
}

async function executeAppointmentReminders(req) {
  const cronSecret = req.headers.get("x-cron-secret") || req.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && cronSecret !== expectedSecret && cronSecret !== `Bearer ${expectedSecret}`) {
    return failure("Unauthorized", "Invalid cron secret", 401);
  }

  console.log("[AppointmentReminders Cron] Starting reminder dispatch process...");
  const startedAt = Date.now();
  const stats = { fetched: 0, sent: 0, skipped_duplicate: 0, skipped_no_phone: 0, errors: [] };

  try {
    // 1. Calculate tomorrow's date string (YYYY-MM-DD)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    console.log(`[AppointmentReminders Cron] Target date for reminders: ${tomorrowStr}`);

    // 2. Fetch all booked/approved/confirmed appointments for tomorrow
    const { data: appointments, error: fetchErr } = await supabase
      .from("appointments")
      .select("id, patient_id, doctor_id, appointment_date, appointment_time, appointment_type, status")
      .eq("appointment_date", tomorrowStr)
      .in("status", ["booked", "approved", "confirmed"]);

    if (fetchErr) throw fetchErr;

    if (!appointments || appointments.length === 0) {
      console.log("[AppointmentReminders Cron] No appointments scheduled for tomorrow.");
      return success("No appointments scheduled for tomorrow. Reminder run complete.", { duration_ms: Date.now() - startedAt, ...stats });
    }

    stats.fetched = appointments.length;

    for (const apt of appointments) {
      try {
        const patientId = apt.patient_id;
        const doctorId = apt.doctor_id;

        // A. Check if reminder already sent to maintain idempotency
        const { data: existingNotifs, error: notifErr } = await supabase
          .from("notifications")
          .select("id, metadata")
          .eq("user_id", patientId)
          .eq("type", "appointment_reminder");

        if (notifErr) throw notifErr;

        const alreadySent = existingNotifs?.some(notif => notif.metadata?.appointment_id === apt.id);
        if (alreadySent) {
          stats.skipped_duplicate++;
          continue;
        }

        // B. Fetch patient and doctor details
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

        const phoneNumber = patientUser?.phone_number;
        const patientName = patientDetails?.full_name || "Patient";
        const doctorName = doctorDetails?.full_name || "Doctor";

        if (!phoneNumber) {
          console.warn(`[AppointmentReminders Cron] Patient ${patientId} has no phone number. Skipping.`);
          stats.skipped_no_phone++;
          continue;
        }

        // C. Dispatch WhatsApp Reminder
        const appointmentCode = "MCAPT-" + apt.id.slice(0, 8).toUpperCase();
        const mode = apt.appointment_type === "video_call" || apt.appointment_type === "video_consultation" || apt.appointment_type === "video"
          ? "Video Call"
          : (apt.appointment_type === "home_visit" ? "Home Visit" : "Clinic Visit");

        console.log(`[AppointmentReminders Cron] Dispatching reminder for appointment ${apt.id} to ${phoneNumber}...`);
        
        const dispatchResult = await sendAppointmentReminder({
          phone_number: phoneNumber,
          recipient_name: patientName,
          appointment_code: appointmentCode,
          patient_name: patientName,
          doctor_or_service: "Dr. " + doctorName,
          date: apt.appointment_date,
          time: apt.appointment_time,
          location_or_mode: mode,
          patient_id: patientId
        });

        if (dispatchResult.success) {
          // D. Record notification inside the DB to lock and maintain idempotency
          await supabase.from("notifications").insert({
            user_id: patientId,
            title: "Appointment Reminder",
            message: `This is a reminder for your upcoming appointment with Dr. ${doctorName} tomorrow at ${apt.appointment_time}.`,
            type: "appointment_reminder",
            metadata: { appointment_id: apt.id }
          });

          stats.sent++;
        } else {
          throw new Error(dispatchResult.error || "Unknown dispatch failure");
        }

      } catch (aptErr) {
        console.error(`[AppointmentReminders Cron] Failed for appointment ${apt.id}:`, aptErr.message);
        stats.errors.push({ appointment_id: apt.id, error: aptErr.message });
      }
    }

    const duration = Date.now() - startedAt;
    console.log(`[AppointmentReminders Cron] Complete in ${duration}ms:`, JSON.stringify(stats));

    return success("Appointment reminders cron job executed successfully", { duration_ms: duration, ...stats });

  } catch (err) {
    console.error("[AppointmentReminders Cron] Fatal error:", err.message);
    return failure("Appointment reminders cron job failed", err.message, 500);
  }
}
