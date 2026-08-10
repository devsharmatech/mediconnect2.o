import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import admin from "@/lib/firebaseAdmin";
import { createCareEpisode } from "@/lib/layer1/careEpisodeService";
import { createLedgerEntry } from "@/lib/layer1/financialLedger";
import { logActivity } from "@/lib/layer1/activityLogger";
import { logAudit } from "@/lib/layer1/auditLogger";
import { insertOutboxEvent } from "@/lib/layer1/eventOutbox";
import { supabase } from "@/lib/supabaseAdmin";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { doctor_id, patient_id, payment_id, razorpay_order_id, care_episode_id: incomingCareEpisodeId } = await req.json();

    if (!doctor_id || !patient_id) {
      return failure("doctor_id & patient_id required", null, 400, {
        headers: corsHeaders,
      });
    }

    // Generate IST time
    const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const dateStr = nowIST.toISOString().split("T")[0];
    const timeStr = nowIST.toTimeString().slice(0, 5);

    // ------------------------------------------
    // 1) Create instant appointment
    // ------------------------------------------
    const { data: appointment, error: aptErr } = await supabase
      .from("appointments")
      .insert({
        doctor_id,
        patient_id,
        appointment_date: dateStr,
        appointment_time: timeStr,
        appointment_type: "instant",
        status: "booked",
        care_episode_id: incomingCareEpisodeId || null
      })
      .select()
      .single();

    if (aptErr) throw aptErr;

    // ✅ LAYER-1: Create Care Episode (PDF Part 1)
    let careEpisodeId = incomingCareEpisodeId;
    if (!careEpisodeId) {
      try {
        const episodeResult = await createCareEpisode(patient_id, "consultation");
        if (episodeResult.success) {
          careEpisodeId = episodeResult.data.id;
          // Link to appointment
          await supabase
            .from("appointments")
            .update({ care_episode_id: careEpisodeId })
            .eq("id", appointment.id);
        }
      } catch (l1Err) {
        console.warn("Care episode creation failed:", l1Err);
      }
    }

    // ✅ LAYER-1: Initialize Financial Ledger (PDF Part 10-4)
    // For instant calls, we usually have a flat fee. Fetching from doctor_details.
    const { data: doctorDetails } = await supabase
      .from("doctor_details")
      .select("consultation_fee, video_consultation_fee, clinic_consultation_fee")
      .eq("id", doctor_id)
      .single();

    if (careEpisodeId) {
      await createLedgerEntry({
        patient_id,
        care_episode_id: careEpisodeId,
        service_type: "consultation",
        reference_id: appointment.id,
        debit_credit: "debit",
        amount: doctorDetails?.video_consultation_fee ?? doctorDetails?.consultation_fee ?? doctorDetails?.clinic_consultation_fee ?? 0,
        status: "completed",
        payment_mode: payment_id ? "Razorpay" : "Free",
        payment_gateway_id: payment_id || null,
        description: payment_id ? `Instant video consultation fee (Paid via Razorpay: ${payment_id})` : "Instant video consultation fee",
      });
    }

    // ✅ LAYER-1: Initialize Clinical Consultation (Stage: STARTED)
    if (careEpisodeId) {
      await supabase
        .from("consultations")
        .insert({
          appointment_id: appointment.id,
          patient_id,
          doctor_id,
          care_episode_id: careEpisodeId,
          case_status: "STARTED",
          consultation_mode: "VIDEO", // Instant is always video
          is_active: true
        });
    }

    // ✅ LAYER-1: Logs
    await logActivity({
      patient_id,
      care_episode_id: careEpisodeId,
      actor_id: patient_id,
      module_type: "consultation",
      action_type: "instant_call_initiated",
      reference_id: appointment.id,
      description: "Instant consultation requested and foundations initialized",
    }).catch((err) => console.error("[Layer111] Activity logging dropped:", err.message));

    await logAudit({
      entity_type: "appointment",
      entity_id: appointment.id,
      previous_state: null,
      new_state: { type: "instant", status: "booked", care_episode_id: careEpisodeId },
      changed_by: patient_id,
      change_description: "Instant appointment created with Layer-1 foundations",
    }).catch((err) => console.error("[Layer111] Audit logging dropped:", err.message));

    // ✅ LAYER-111: Ensure outbox tracking capture
    await insertOutboxEvent({
      event_type: "INSTANT_CALL_REQUESTED",
      consultation_id: appointment.id,
      care_episode_id: careEpisodeId,
      consultation_type: "VIDEO",
      payload: { doctor_id, patient_id, appointment_id: appointment.id },
    }).catch((err) => console.error("[Layer111] Outbox persistence dropped:", err.message));

    const callRoomId = appointment.id; // call room = appointment ID

    // ------------------------------------------
    // 2) Notify doctor via DB
    // ------------------------------------------
    await supabase.from("notifications").insert({
      user_id: doctor_id,
      title: "Incoming Instant Consultation",
      message: "A patient is requesting a video consultation.",
      type: "instant_call",
      expires_at: new Date(Date.now() + 90 * 1000).toISOString(),
      metadata: {
        appointment_id: appointment.id,
        patient_id,
        call_room_id: callRoomId,
      },
    });

    // ------------------------------------------
    // 3) Send FCM to doctor
    // ------------------------------------------
    const { data: doctorUser } = await supabase
      .from("users")
      .select("fcm_token")
      .eq("id", doctor_id)
      .single();

    if (doctorUser?.fcm_token) {
      try {
        await admin.messaging().send({
          token: doctorUser.fcm_token,
          notification: {
            title: "Incoming Instant Consultation",
            body: "A patient is requesting for a video consultation.",
          },
          data: {
            type: "instant_call",
            appointment_id: String(appointment.id),
            patient_id: String(patient_id),
            call_room_id: String(callRoomId),
          },
        });
      } catch (fcmErr) {
        console.error("FCM Send to doctor failed inside instant-call:", fcmErr);
      }
    }

    return success(
      "Instant call initiated",
      {
        appointment,
        call_room_id: callRoomId,
      },
      200,
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("Instant-call error:", err);
    return failure("Failed to start instant call", err.message, 500, {
      headers: corsHeaders,
    });
  }
}
