import sql from "@/lib/db";
import { sendPushAndInAppNotification } from "@/lib/notifications";
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

    const appointments = await sql`
      SELECT id, doctor_id, patient_id, appointment_type, appointment_date, appointment_time, care_episode_id
      FROM appointments
      WHERE id = ${appointment_id}
      LIMIT 1
    `;

    if (appointments.length === 0) {
      return failure("Appointment not found", null, 404, {
        headers: corsHeaders,
      });
    }

    const appointment = appointments[0];

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

    // Send in-app notification directly to RDS notifications table and FCM push
    await sendPushAndInAppNotification({
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

    // Activity log for video call start
    logActivity({
      patient_id,
      care_episode_id: appointment.care_episode_id || null,
      actor_id: doctor_id,
      module_type: "consultation",
      action_type: "video_call_started",
      reference_id: appointment_id,
      description: "Doctor started video consultation",
      metadata: { appointment_id, doctor_id },
    }).then(null, () => {});

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
