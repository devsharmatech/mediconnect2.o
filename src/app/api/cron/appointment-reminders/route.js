import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { sendAppointmentReminder } from "@/lib/sms";
import nodemailer from "nodemailer";

/**
 * GET / POST /api/cron/appointment-reminders
 * 
 * Daily appointment reminder cron job.
 * Finds all booked/approved appointments scheduled for today & tomorrow,
 * verifies if a reminder notification has already been sent,
 * and dispatches WhatsApp & Email reminders.
 */

// SMTP Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

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
    // 1. Calculate today and tomorrow's date strings in IST (YYYY-MM-DD)
    const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(nowIST);
    
    const tomorrowDate = new Date(nowIST);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(tomorrowDate);

    const targetDates = [todayStr, tomorrowStr];
    console.log(`[AppointmentReminders Cron] Target dates for reminders (IST): ${targetDates.join(", ")}`);

    // 2. Fetch all booked/approved/confirmed appointments for today & tomorrow
    const { data: appointments, error: fetchErr } = await supabase
      .from("appointments")
      .select("id, patient_id, doctor_id, appointment_date, appointment_time, appointment_type, status")
      .in("appointment_date", targetDates)
      .in("status", ["booked", "approved", "confirmed"]);

    if (fetchErr) throw fetchErr;

    if (!appointments || appointments.length === 0) {
      console.log("[AppointmentReminders Cron] No appointments scheduled for today or tomorrow.");
      return success("No appointments scheduled for today or tomorrow. Reminder run complete.", { duration_ms: Date.now() - startedAt, ...stats });
    }

    stats.fetched = appointments.length;

    for (const apt of appointments) {
      try {
        const patientId = apt.patient_id;
        const doctorId = apt.doctor_id;
        const isToday = apt.appointment_date === todayStr;
        const timingWord = isToday ? "today" : "tomorrow";

        // Fetch patient and doctor details
        const { data: patientUser } = await supabase
          .from("users")
          .select("phone_number, email")
          .eq("id", patientId)
          .maybeSingle();

        const { data: patientDetails } = await supabase
          .from("patient_details")
          .select("full_name, email")
          .eq("id", patientId)
          .maybeSingle();

        const { data: doctorUser } = await supabase
          .from("users")
          .select("phone_number, email")
          .eq("id", doctorId)
          .maybeSingle();

        const { data: doctorDetails } = await supabase
          .from("doctor_details")
          .select("full_name, email")
          .eq("id", doctorId)
          .maybeSingle();

        const patientPhone = patientUser?.phone_number;
        const doctorPhone = doctorUser?.phone_number;
        const patientEmail = patientDetails?.email || patientUser?.email;
        const doctorEmail = doctorDetails?.email || doctorUser?.email;

        const patientName = patientDetails?.full_name || "Patient";
        const doctorName = doctorDetails?.full_name || "Doctor";

        const appointmentCode = "MCAPT-" + apt.id.slice(0, 8).toUpperCase();
        const mode = apt.appointment_type === "video_call" || apt.appointment_type === "video_consultation" || apt.appointment_type === "video"
          ? "Video Call"
          : (apt.appointment_type === "home_visit" ? "Home Visit" : "Clinic Visit");

        // --- A. PATIENT REMINDER ---
        if (patientId) {
          const { data: existingPatientNotifs } = await supabase
            .from("notifications")
            .select("id, metadata")
            .eq("user_id", patientId)
            .eq("type", "appointment_reminder");

          const alreadySentPatient = existingPatientNotifs?.some(
            n => n.metadata?.appointment_id === apt.id && n.metadata?.reminder_date === apt.appointment_date
          );

          if (!alreadySentPatient) {
            try {
              if (patientPhone) {
                await sendAppointmentReminder({
                  phone_number: patientPhone,
                  recipient_name: patientName,
                  appointment_code: appointmentCode,
                  patient_name: patientName,
                  doctor_or_service: "Dr. " + doctorName,
                  date: isToday ? "Today" : "Tomorrow",
                  time: apt.appointment_time,
                  location_or_mode: mode,
                  patient_id: patientId
                });
              }

              if (patientEmail && isToday && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
                try {
                  await transporter.sendMail({
                    from: `"MediConnect" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
                    to: patientEmail,
                    subject: `Reminder: Appointment with Dr. ${doctorName} Today`,
                    html: `
                      <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;color:#333;line-height:1.6;">
                        <div style="background-color:#0067A1;padding:24px;text-align:center;border-radius:10px 10px 0 0;">
                          <h2 style="color:white;margin:0;font-size:20px;">Appointment Reminder for Today</h2>
                        </div>
                        <div style="padding:24px;background-color:#fff;border:1px solid #eee;border-top:none;border-radius:0 0 10px 10px;">
                          <p>Hello <strong>${patientName}</strong>,</p>
                          <p>You have a confirmed consultation with <strong>Dr. ${doctorName}</strong> today.</p>
                          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                            <tr><td style="padding:8px 0;color:#666;">Date:</td><td style="padding:8px 0;font-weight:bold;">${apt.appointment_date}</td></tr>
                            <tr><td style="padding:8px 0;color:#666;">Time:</td><td style="padding:8px 0;font-weight:bold;">${apt.appointment_time}</td></tr>
                            <tr><td style="padding:8px 0;color:#666;">Mode:</td><td style="padding:8px 0;font-weight:bold;">${mode}</td></tr>
                            <tr><td style="padding:8px 0;color:#666;">Appointment Ref:</td><td style="padding:8px 0;font-weight:bold;">${appointmentCode}</td></tr>
                          </table>
                        </div>
                      </div>`,
                  });
                } catch (emailErr) {
                  console.warn("[AppointmentReminders Cron] Patient email reminder note:", emailErr?.message);
                }
              }

              await supabase.from("notifications").insert({
                user_id: patientId,
                title: isToday ? "Appointment Reminder (Today)" : "Appointment Reminder (Tomorrow)",
                message: `Reminder: You have an appointment with Dr. ${doctorName} ${timingWord} at ${apt.appointment_time}.`,
                type: "appointment_reminder",
                metadata: { appointment_id: apt.id, reminder_date: apt.appointment_date }
              });
              stats.sent++;
            } catch (err) {
              console.warn(`[AppointmentReminders Cron] Failed sending patient reminder:`, err.message);
            }
          }
        }

        // --- B. DOCTOR REMINDER ---
        if (doctorId) {
          const { data: existingDoctorNotifs } = await supabase
            .from("notifications")
            .select("id, metadata")
            .eq("user_id", doctorId)
            .eq("type", "appointment_reminder");

          const alreadySentDoctor = existingDoctorNotifs?.some(
            n => n.metadata?.appointment_id === apt.id && n.metadata?.reminder_date === apt.appointment_date
          );

          if (!alreadySentDoctor) {
            try {
              if (doctorPhone) {
                await sendAppointmentReminder({
                  phone_number: doctorPhone,
                  recipient_name: "Dr. " + doctorName,
                  appointment_code: appointmentCode,
                  patient_name: patientName,
                  doctor_or_service: "Dr. " + doctorName,
                  date: isToday ? "Today" : "Tomorrow",
                  time: apt.appointment_time,
                  location_or_mode: mode,
                  patient_id: patientId
                });
              }

              if (doctorEmail && isToday && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
                try {
                  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mediconnect.fit";
                  await transporter.sendMail({
                    from: `"MediConnect" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
                    to: doctorEmail,
                    subject: `Appointment Reminder: ${patientName} Today at ${apt.appointment_time}`,
                    html: `
                      <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;color:#333;line-height:1.6;">
                        <div style="background-color:#0067A1;padding:24px;text-align:center;border-radius:10px 10px 0 0;">
                          <h2 style="color:white;margin:0;font-size:20px;">Appointment Reminder for Today</h2>
                        </div>
                        <div style="padding:24px;background-color:#fff;border:1px solid #eee;border-top:none;border-radius:0 0 10px 10px;">
                          <p>Dear <strong>Dr. ${doctorName}</strong>,</p>
                          <p>This is a reminder for your scheduled consultation today with <strong>${patientName}</strong>.</p>
                          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                            <tr><td style="padding:8px 0;color:#666;">Date:</td><td style="padding:8px 0;font-weight:bold;">${apt.appointment_date}</td></tr>
                            <tr><td style="padding:8px 0;color:#666;">Time:</td><td style="padding:8px 0;font-weight:bold;">${apt.appointment_time}</td></tr>
                            <tr><td style="padding:8px 0;color:#666;">Mode:</td><td style="padding:8px 0;font-weight:bold;">${mode}</td></tr>
                            <tr><td style="padding:8px 0;color:#666;">Appointment Ref:</td><td style="padding:8px 0;font-weight:bold;">${appointmentCode}</td></tr>
                          </table>
                          <div style="margin:24px 0;text-align:center;">
                            <a href="${appUrl}/doctor/appointments?id=${apt.id}&date=all&status=all" style="background-color:#0067A1;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">View Appointment &amp; Start</a>
                          </div>
                        </div>
                      </div>`,
                  });
                } catch (emailErr) {
                  console.warn("[AppointmentReminders Cron] Doctor email reminder note:", emailErr?.message);
                }
              }

              await supabase.from("notifications").insert({
                user_id: doctorId,
                title: isToday ? "Appointment Reminder (Today)" : "Appointment Reminder (Tomorrow)",
                message: `Reminder: You have a scheduled appointment with ${patientName} ${timingWord} at ${apt.appointment_time}.`,
                type: "appointment_reminder",
                metadata: { appointment_id: apt.id, reminder_date: apt.appointment_date }
              });
              stats.sent++;
            } catch (err) {
              console.warn(`[AppointmentReminders Cron] Failed sending doctor reminder:`, err.message);
            }
          }
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
