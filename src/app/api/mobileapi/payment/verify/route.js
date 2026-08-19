import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import crypto from "crypto";
import { createLedgerEntry } from "@/lib/layer1/financialLedger";
import { logActivity } from "@/lib/layer1/activityLogger";
import { logAudit } from "@/lib/layer1/auditLogger";
import { sendPaymentUpdate } from "@/lib/sms";


export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * POST /api/payment/verify
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, reference_id, service_type }
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { 
        razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature, 
        reference_id, 
        service_type 
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !reference_id) {
      return failure("Missing payment verification details", null, 400, { headers: corsHeaders });
    }

    // ── 1. VERIFY SIGNATURE ───────────────────────────────────
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const generated_signature = crypto
      .createHmac("sha256", secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return failure("Invalid payment signature — security violation logged", null, 403, { headers: corsHeaders });
    }

    // ── 2. RESOLVE CARE EPISODE ────────────────────────────────
    let care_episode_id = null;
    let patient_id = null;
    let amount = 0;

    if (service_type === "consultation") {
        // Find appointment
        const { data: appointment } = await supabase
            .from("appointments")
            .select("id, patient_id, care_episode_id, status, doctor_id, appointment_type")
            .eq("id", reference_id)
            .single();
        
        if (appointment) {
            care_episode_id = appointment.care_episode_id;
            patient_id = appointment.patient_id;
            
            // Fetch fee and discount settings
            const { data: doctorDetails } = await supabase
                .from("doctor_details")
                .select("consultation_fee, video_consultation_fee, clinic_consultation_fee, home_visit_fee, second_booking_discount_type, second_booking_discount_value")
                .eq("id", appointment.doctor_id)
                .single();

            let originalFee = 0;
            const apptType = appointment.appointment_type || "clinic_visit";
            if (apptType === "video_consultation") {
                originalFee = Number(doctorDetails?.video_consultation_fee || doctorDetails?.consultation_fee || 0);
            } else if (apptType === "clinic_visit") {
                originalFee = Number(doctorDetails?.clinic_consultation_fee || doctorDetails?.consultation_fee || 0);
            } else if (apptType === "home_visit") {
                originalFee = Number(doctorDetails?.home_visit_fee || doctorDetails?.consultation_fee || 0);
            } else {
                originalFee = Number(doctorDetails?.consultation_fee || 0);
            }

            // Count prior appointments (not cancelled, excluding this one)
            const { count: priorCount } = await supabase
                .from("appointments")
                .select("id", { count: "exact", head: true })
                .eq("patient_id", patient_id)
                .eq("doctor_id", appointment.doctor_id)
                .neq("status", "cancelled")
                .neq("id", reference_id);

            const isDiscountApplicable = priorCount === 1 && doctorDetails?.second_booking_discount_type && doctorDetails.second_booking_discount_type !== "none";
            let discountAmount = 0;

            if (isDiscountApplicable) {
                const type = doctorDetails.second_booking_discount_type;
                const val = Number(doctorDetails.second_booking_discount_value || 0);
                if (type === "percentage") {
                    discountAmount = originalFee * (val / 100);
                } else if (type === "flat") {
                    discountAmount = val;
                }
                discountAmount = Math.max(0, Math.min(originalFee, discountAmount));
            }

            amount = Math.max(0, originalFee - discountAmount);
        }
    } else if (service_type === "lab") {
        // Find lab order
        const { data: order } = await supabase
            .from("lab_test_orders")
            .select("id, patient_id, care_episode_id, total_amount")
            .eq("id", reference_id)
            .single();
        
        if (order) {
            care_episode_id = order.care_episode_id;
            patient_id = order.patient_id;
            amount = order.total_amount;
        }
    }

    // ── 3. UPDATE ENTITY STATUS ────────────────────────────────
    if (service_type === "consultation") {
        await supabase
            .from("appointments")
            .update({ 
                payment_status: "paid", 
                razorpay_order_id, 
                razorpay_payment_id,
                status: "booked" // Ensure it's active
            })
            .eq("id", reference_id);
    } else if (service_type === "lab") {
        await supabase
            .from("lab_test_orders")
            .update({ 
                payment_status: "paid", 
                razorpay_order_id, 
                razorpay_payment_id,
                status: "booked"
            })
            .eq("id", reference_id);
    }

    // ── 4. RECORD SUCCESS IN LEDGER (Append-only) ───────────────
    if (patient_id) {
        await createLedgerEntry({
            patient_id,
            care_episode_id,
            service_type,
            reference_id,
            debit_credit: "credit", // Payment received
            amount,
            status: "success",
            payment_mode: "razorpay",
            payment_gateway_id: razorpay_payment_id,
            description: `Payment confirmed for ${service_type} reference: ${reference_id}`,
            metadata: { razorpay_order_id, razorpay_signature }
        });

        // Trigger WhatsApp Payment Update asynchronously
        (async () => {
            try {
                const { data: patientUser } = await supabase
                    .from("users")
                    .select("phone_number")
                    .eq("id", patient_id)
                    .single();

                const { data: patientDetails } = await supabase
                    .from("patient_details")
                    .select("full_name")
                    .eq("id", patient_id)
                    .single();

                const phoneNumber = patientUser?.phone_number;
                const patientName = patientDetails?.full_name || "Customer";

                // Mapped display name for service
                const displayServiceName = service_type === "consultation" 
                    ? "Doctor Consultation" 
                    : service_type === "lab" 
                        ? "Lab Diagnostics Order" 
                        : "Chemist Orders/Services";

                if (phoneNumber) {
                    await sendPaymentUpdate({
                        phone_number: phoneNumber,
                        recipient_name: patientName,
                        payment_status: "success",
                        payment_reference_id: razorpay_payment_id,
                        paid_amount: amount.toString(),
                        service_name: displayServiceName,
                        patient_id
                    });
                }

                // Dispatch In-App & FCM Push Notification to Patient
                const { sendPushAndInAppNotification } = await import("@/lib/notificationHelper");
                await sendPushAndInAppNotification({
                    user_id: patient_id,
                    title: "Payment Confirmed!",
                    message: `Your payment of ₹${amount} for ${displayServiceName} was successful.`,
                    type: "payment_success",
                    metadata: { razorpay_payment_id, reference_id, service_type }
                });
            } catch (err) {
                console.error("[NOTIFICATION ENGINE] Failed to send payment success notification:", err.message);
            }
        })();
    }


    // ── 5. LOG AUDIT + ACTIVITY ───────────────────────────────
    logActivity({
        patient_id,
        care_episode_id,
        actor_id: patient_id,
        module_type: "financial",
        action_type: "payment_verified",
        reference_id: razorpay_payment_id,
        description: `Successfully verified ₹${amount} for ${service_type} via Razorpay`,
    }).then(null, () => {});

    logAudit({
        entity_type: "financial_transaction",
        entity_id: razorpay_payment_id,
        previous_state: { status: "initiated" },
        new_state: { status: "success", razorpay_payment_id },
        changed_by: patient_id,
        change_description: "Financial transaction resolved through Razorpay verification",
    }).then(null, () => {});

    return success("Payment verified and ledger resolved", { reference_id, service_type });

  } catch (error) {
    console.error("Payment verify error:", error);
    return failure("Payment verification failed", error.message, 500, { headers: corsHeaders });
  }
}
