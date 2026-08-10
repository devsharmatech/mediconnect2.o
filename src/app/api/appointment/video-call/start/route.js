import admin from "@/lib/firebaseAdmin";
import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { logActivity } from "@/lib/layer1/activityLogger";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { appointment_id, doctor_id } = await req.json();

    if (!appointment_id || !doctor_id) {
      return failure("appointment_id and doctor_id are required", null, 400, {
        headers: corsHeaders,
      });
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select("id, doctor_id, patient_id, appointment_type, appointment_date, appointment_time")
      .eq("id", appointment_id)
      .single();

    if (appointmentError || !appointment) {
      return failure("Appointment not found", null, 404, {
        headers: corsHeaders,
      });
    }

    if (String(appointment.doctor_id) !== String(doctor_id)) {
      return failure("Forbidden", null, 403, { headers: corsHeaders });
    }

    const isVideoType =
      appointment.appointment_type === "video" ||
      appointment.appointment_type === "video_call" ||
      appointment.appointment_type === "video_consultation";

    if (!isVideoType) {
      return failure("This appointment is not a video appointment", null, 422, {
        headers: corsHeaders,
      });
    }

    const patient_id = appointment.patient_id;

    // Insert notification for patient (DB)
    const { error: insertError } = await supabase.from("notifications").insert({
      user_id: patient_id,
      title: "Video Call Started",
      message: "Doctor has started the video consultation. Tap to join.",
      type: "video_call_started",
      metadata: {
        appointment_id,
        doctor_id,
        patient_id,
      },
    });

    if (insertError) {
      console.error("Notification insert error:", insertError);
      return failure("Failed to create notification", insertError.message, 500, {
        headers: corsHeaders,
      });
    }

    // ✅ LAYER-1: Activity log for video call start (fire-and-forget)
    logActivity({
      patient_id,
      care_episode_id: appointment.care_episode_id || null, // appointment might not have care_episode_id fetched, but we log anyway
      actor_id: doctor_id,
      module_type: "consultation",
      action_type: "video_call_started",
      reference_id: appointment_id,
      description: `Doctor started video consultation`,
      metadata: { appointment_id, doctor_id },
    }).then(null, () => {});

    // Send FCM push to patient (best-effort)
    const { data: patientUser } = await supabase
      .from("users")
      .select("fcm_token")
      .eq("id", patient_id)
      .single();

    if (patientUser?.fcm_token) {
      await admin.messaging().send({
        token: patientUser.fcm_token,
        notification: {
          title: "Video Call Started",
          body: "Doctor has started the consultation. Join now.",
        },
        data: {
          type: "video_call_started",
          appointment_id: String(appointment_id),
        },
      });
    }

    return success(
      "Patient notified successfully",
      {
        appointment_id,
        patient_id,
      },
      200,
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("Start video call error:", err);
    return failure("Failed to start video call", err.message, 500, {
      headers: corsHeaders,
    });
  }
}
