import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { executeOrchestration } from "@/lib/layer1/controlLayer";
import { randomUUID } from "crypto";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

function calculateFee(doctor, appointmentType) {
  const meta = doctor?.meta || {};
  if (appointmentType === "video" || appointmentType === "video_consultation") {
    return Number(doctor?.video_consultation_fee ?? meta?.video_consultation_fee ?? doctor?.consultation_fee ?? 0);
  }
  if (appointmentType === "home_visit") {
    return Number(doctor?.home_visit_fee ?? meta?.home_visit_fee ?? doctor?.consultation_fee ?? 0);
  }
  return Number(doctor?.clinic_consultation_fee ?? meta?.clinic_consultation_fee ?? doctor?.consultation_fee ?? 0);
}

/**
 * GET /api/appointment/reschedule?appointment_id=...&new_type=...
 * Checks whether rescheduling requires a payment and returns the fee breakdown.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const appointment_id = searchParams.get("appointment_id");
    const new_type = searchParams.get("new_type");

    if (!appointment_id) {
      return failure("appointment_id is required.", null, 400, { headers: corsHeaders });
    }

    const [appointment] = await sql`
      SELECT id, doctor_id, patient_id, appointment_type, payment_status, care_episode_id
      FROM appointments
      WHERE id = ${appointment_id}
      LIMIT 1
    `;

    if (!appointment) {
      return failure("Appointment not found.", null, 404, { headers: corsHeaders });
    }

    const [doctor] = await sql`
      SELECT id, full_name, consultation_fee, video_consultation_fee, clinic_consultation_fee, home_visit_fee, meta
      FROM doctor_details
      WHERE id = ${appointment.doctor_id}
      LIMIT 1
    `;

    const currentType = appointment.appointment_type || "clinic_visit";
    const targetType = new_type || currentType;

    const currentFee = calculateFee(doctor, currentType);
    const targetFee = calculateFee(doctor, targetType);

    const isAlreadyPaid = appointment.payment_status === "paid";
    let needsPayment = false;
    let amountToPay = 0;
    let reason = "Free reschedule";

    if (!isAlreadyPaid) {
      // Unpaid original appointment: must pay consultation fee
      if (targetFee > 0) {
        needsPayment = true;
        amountToPay = targetFee;
        reason = "Consultation fee required";
      } else {
        needsPayment = false;
        amountToPay = 0;
        reason = "Complimentary consultation";
      }
    } else {
      // Already paid: check if upgrading to a higher fee consultation type
      if (targetFee > currentFee) {
        needsPayment = true;
        amountToPay = targetFee - currentFee;
        reason = "Consultation upgrade difference";
      } else {
        needsPayment = false;
        amountToPay = 0;
        reason = "Free reschedule";
      }
    }

    return success("Reschedule fee evaluated successfully.", {
      needs_payment: needsPayment,
      amount: amountToPay,
      currency: "INR",
      reason,
      current_payment_status: appointment.payment_status || "pending",
      doctor_name: doctor?.full_name || "Doctor",
      doctor_id: appointment.doctor_id,
      patient_id: appointment.patient_id,
      care_episode_id: appointment.care_episode_id,
      current_type: currentType,
      target_type: targetType,
      target_fee: targetFee,
    }, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("GET /api/appointment/reschedule error:", error);
    return failure("Failed to evaluate reschedule fee.", error.message, 500, { headers: corsHeaders });
  }
}

/**
 * POST /api/appointment/reschedule
 * Validates slot, enforces payment if required, and executes reschedule via AWS RDS.
 */
export async function POST(req) {
  try {
    const {
      appointment_id,
      new_date,
      new_time,
      new_type,
      user_id,
      payment_id,
      razorpay_order_id,
    } = await req.json();

    if (!appointment_id || !new_date || !new_time || !user_id) {
      return failure("appointment_id, new_date, new_time, and user_id are required.", null, 400, { headers: corsHeaders });
    }

    // Authoritative check on AWS RDS: Does this appointment require payment?
    const [appointment] = await sql`
      SELECT id, doctor_id, patient_id, appointment_type, payment_status, care_episode_id
      FROM appointments
      WHERE id = ${appointment_id}
      LIMIT 1
    `;

    if (!appointment) {
      return failure("Appointment not found.", null, 404, { headers: corsHeaders });
    }

    const [doctor] = await sql`
      SELECT id, full_name, consultation_fee, video_consultation_fee, clinic_consultation_fee, home_visit_fee, meta
      FROM doctor_details
      WHERE id = ${appointment.doctor_id}
      LIMIT 1
    `;

    const currentType = appointment.appointment_type || "clinic_visit";
    const targetType = new_type || currentType;

    const currentFee = calculateFee(doctor, currentType);
    const targetFee = calculateFee(doctor, targetType);

    const isAlreadyPaid = appointment.payment_status === "paid";
    let requiredAmount = 0;

    if (!isAlreadyPaid) {
      if (targetFee > 0) requiredAmount = targetFee;
    } else {
      if (targetFee > currentFee) requiredAmount = targetFee - currentFee;
    }

    // If payment is required but no payment_id was provided:
    if (requiredAmount > 0 && !payment_id) {
      return failure(
        `Payment of ₹${requiredAmount} is required before rescheduling this appointment.`,
        { required_amount: requiredAmount, currency: "INR" },
        402,
        { headers: corsHeaders }
      );
    }

    // Route via orchestration engine (AWS RDS PostgreSQL)
    const orchestrationResult = await executeOrchestration({
      idempotencyKey: `reschedule-${appointment_id}-${new_date}-${new_time}-${randomUUID()}`,
      actionType: "RESCHEDULE_APPOINTMENT",
      actorId: user_id,
      actorType: "patient",
      careEpisodeId: appointment.care_episode_id || null,
      payload: {
        appointment_id,
        new_date,
        new_time,
        new_type: targetType,
        payment_id: payment_id || null,
        razorpay_order_id: razorpay_order_id || null,
        amount_paid: requiredAmount,
      }
    });

    if (!orchestrationResult.success) {
      const isDuplicate = orchestrationResult.cached || orchestrationResult.isDuplicate;
      if (isDuplicate) {
        return success("Appointment already rescheduled (Idempotent response)", orchestrationResult.data, 200, { headers: corsHeaders });
      }
      return failure(orchestrationResult.error || "Failed to reschedule appointment", null, orchestrationResult.status || 500, { headers: corsHeaders });
    }

    return success("Appointment rescheduled successfully.", orchestrationResult.data, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("POST /api/appointment/reschedule error:", error);
    return failure("Failed to reschedule appointment.", error.message, 500, { headers: corsHeaders });
  }
}
