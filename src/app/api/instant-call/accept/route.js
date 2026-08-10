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

    // Update appointment status
    await supabase
      .from("appointments")
      .update({ status: "approved" })
      .eq("id", appointment_id);

    // Fetch appointment details
    const { data: apt } = await supabase
      .from("appointments")
      .select("patient_id")
      .eq("id", appointment_id)
      .single();

    const patient_id = apt.patient_id;

    // Insert notification for patient
    await supabase.from("notifications").insert({
      user_id: patient_id,
      title: "Call Accepted",
      message: "Doctor has accepted your instant call request.",
      type: "call_accepted",
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
            title: "Call Accepted 🎉",
            body: "Doctor is joining the call.",
          },
          data: {
            type: "call_accepted",
            appointment_id,
          },
        });
      } catch (fcmErr) {
        console.error("FCM Send to patient failed inside instant-call accept:", fcmErr);
      }
    }

    return success("Call accepted", { room_id: appointment_id }, 200, {
      headers: corsHeaders,
    });
  } catch (err) {
    return failure("Failed to accept call", err.message, 500, {
      headers: corsHeaders,
    });
  }
}
