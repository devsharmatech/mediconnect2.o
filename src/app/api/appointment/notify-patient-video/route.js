import admin from "@/lib/firebaseAdmin";
import { supabase } from "@/lib/supabaseAdmin";
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

    // Fetch appointment details to get patient_id and doctor details
    const { data: apt, error: aptErr } = await supabase
      .from("appointments")
      .select("patient_id, doctor_details(full_name)")
      .eq("id", appointment_id)
      .single();

    if (aptErr || !apt) {
      return failure("Appointment not found", aptErr?.message, 404, {
        headers: corsHeaders,
      });
    }

    const patient_id = apt.patient_id;
    const docName = apt.doctor_details?.full_name || "Doctor";

    // Insert notification for patient
    await supabase.from("notifications").insert({
      user_id: patient_id,
      title: "Consultation Started",
      message: `Dr. ${docName} has started the video consultation. Click here to join.`,
      type: "video_call_started",
      metadata: { appointment_id },
    });

    // Send FCM to patient
    const { data: patientUser } = await supabase
      .from("users")
      .select("fcm_token")
      .eq("id", patient_id)
      .single();

    if (patientUser?.fcm_token) {
      try {
        await admin.messaging().send({
          token: patientUser.fcm_token,
          notification: {
            title: "Consultation Started 📞",
            body: `Dr. ${docName} is waiting for you in the video call.`,
          },
          data: {
            type: "video_call_started",
            appointment_id,
          },
        });
      } catch (fcmErr) {
        console.warn("FCM Send Error:", fcmErr.message);
      }
    }

    return success("Patient notified", { appointment_id }, 200, {
      headers: corsHeaders,
    });
  } catch (err) {
    return failure("Failed to notify patient", err.message, 500, {
      headers: corsHeaders,
    });
  }
}
