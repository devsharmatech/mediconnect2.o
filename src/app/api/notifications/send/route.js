import admin from "@/lib/firebaseAdmin";
import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { sendAppointmentReminder } from "@/lib/sms";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * POST /api/notifications/send
 * Production notification sender — inserts DB row + sends FCM push.
 *
 * Body: { user_id, title, message, type?, metadata? }
 */
export async function POST(req) {
  try {
    const body = await req.json();

    const {
      user_id,
      title = "Notification",
      message = "",
      type = "general",
      metadata = {},
    } = body;

    if (!user_id) {
      return failure("user_id is required", null, 400, {
        headers: corsHeaders,
      });
    }

    // 1) Insert notification row in DB
    const { error: insertError } = await supabase.from("notifications").insert({
      user_id,
      title,
      message,
      type,
      metadata,
    });

    if (insertError) {
      console.error("[notifications/send] DB insert error:", insertError);
      return failure("Failed to create notification", insertError.message, 500, {
        headers: corsHeaders,
      });
    }

    // 1.5) Best-effort WhatsApp Appointment Reminder trigger
    if (metadata?.appointment_id) {
      try {
        const appointmentId = metadata.appointment_id;
        console.log(`[notifications/send] Notify clicked for appointment ${appointmentId}. Triggering WhatsApp...`);

        // Fetch appointment details
        const { data: apt, error: aptErr } = await supabase
          .from("appointments")
          .select("id, patient_id, doctor_id, appointment_date, appointment_time, appointment_type")
          .eq("id", appointmentId)
          .maybeSingle();

        if (!aptErr && apt) {
          const patientId = apt.patient_id;
          const doctorId = apt.doctor_id;

          // Fetch patient details and phone number
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

          // Fetch doctor details
          const { data: doctorDetails } = await supabase
            .from("doctor_details")
            .select("full_name")
            .eq("id", doctorId)
            .maybeSingle();

          const phoneNumber = patientUser?.phone_number;
          const patientName = patientDetails?.full_name || "Patient";
          const doctorName = doctorDetails?.full_name || "Doctor";

          if (phoneNumber) {
            const appointmentCode = "MCAPT-" + apt.id.slice(0, 8).toUpperCase();
            const mode = apt.appointment_type === "video_call" || apt.appointment_type === "video_consultation" || apt.appointment_type === "video"
              ? "Video Call"
              : (apt.appointment_type === "home_visit" ? "Home Visit" : "Clinic Visit");

            console.log(`[notifications/send] Dispatching WhatsApp reminder to patient phone ${phoneNumber} for appointment ${appointmentId}...`);
            const waResult = await sendAppointmentReminder({
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
            console.log(`[notifications/send] WhatsApp reminder dispatch result:`, waResult);
          } else {
            console.warn(`[notifications/send] Patient ${patientId} has no phone number. Skipping WhatsApp.`);
          }
        } else {
          console.warn(`[notifications/send] Failed to fetch appointment details for ${appointmentId}:`, aptErr?.message);
        }
      } catch (waErr) {
        console.error("[notifications/send] WhatsApp dispatch error:", waErr.message);
      }
    }

    // 2) Best-effort FCM push
    let pushSent = false;

    const { data: user } = await supabase
      .from("users")
      .select("fcm_token")
      .eq("id", user_id)
      .single();

    if (user?.fcm_token) {
      try {
        await admin.messaging().send({
          token: user.fcm_token,
          notification: { title, body: message },
          data: {
            type,
            ...(metadata.appointment_id
              ? { appointment_id: String(metadata.appointment_id) }
              : {}),
          },
        });
        pushSent = true;
      } catch (pushErr) {
        console.warn("[notifications/send] FCM push failed:", pushErr.message);
      }
    }

    return success(
      "Notification sent",
      { user_id, push_sent: pushSent },
      200,
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("[notifications/send] Error:", err);
    return failure("Failed to send notification", err.message, 500, {
      headers: corsHeaders,
    });
  }
}

