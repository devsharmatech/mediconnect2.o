import sql from "@/lib/db";
import { sendPushAndInAppNotification } from "@/lib/notifications";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { appointment_id, doctor_id } = await req.json();

    if (!appointment_id || !doctor_id) {
      return failure("appointment_id & doctor_id required", null, 400, {
        headers: corsHeaders,
      });
    }

    // Fetch appointment details to get patient_id and doctor details from AWS RDS
    const rows = await sql`
      SELECT a.patient_id, d.full_name AS doctor_name
      FROM appointments a
      LEFT JOIN doctor_details d ON d.id = a.doctor_id
      WHERE a.id = ${appointment_id}
      LIMIT 1
    `;

    if (!rows || rows.length === 0) {
      return failure("Appointment not found", null, 404, {
        headers: corsHeaders,
      });
    }

    const { patient_id, doctor_name } = rows[0];
    const docName = doctor_name || "Doctor";

    // Send in-app notification to RDS and FCM push
    await sendPushAndInAppNotification({
      user_id: patient_id,
      title: "Consultation Started 📞",
      message: `Dr. ${docName} has started the video consultation. Click here to join.`,
      type: "video_call_started",
      metadata: { appointment_id },
    });

    return success("Patient notified", { appointment_id }, 200, {
      headers: corsHeaders,
    });
  } catch (err) {
    return failure("Failed to notify patient", err.message, 500, {
      headers: corsHeaders,
    });
  }
}
