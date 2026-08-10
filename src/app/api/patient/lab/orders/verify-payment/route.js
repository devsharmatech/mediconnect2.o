import crypto from "crypto";
import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { insertOutboxEvent } from "@/lib/layer1/eventOutbox";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// POST — Step 2: Verify Razorpay payment after checkout
export async function POST(req) {
    try {
        const body = await req.json();
        const {
            order_id,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = body;

        // ── 1. Validate required fields ───────────────────────────
        if (!order_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return failure(
                "Missing payment verification details. All fields are required: order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature",
                null,
                400,
                { headers: corsHeaders }
            );
        }

        // ── 2. Fetch the order to verify ownership ────────────────
        const { data: order, error: orderError } = await supabase
            .from("lab_test_orders")
            .select("id, patient_id, lab_id, total_amount, payment_status, razorpay_order_id, status, care_episode_id, prescription_id")
            .eq("id", order_id)
            .single();

        if (orderError || !order) {
            return failure("Order not found", null, 404, { headers: corsHeaders });
        }

        // Check if already paid
        if (order.payment_status === "paid") {
            return success("Payment already verified for this order", {
                order_id: order.id,
                status: "already_paid",
            }, 200, { headers: corsHeaders });
        }

        // Verify razorpay_order_id matches
        if (order.razorpay_order_id !== razorpay_order_id) {
            await logPayment(order, razorpay_order_id, razorpay_payment_id, razorpay_signature, "failed", "api", {
                error: "Razorpay order ID mismatch",
            });
            return failure("Payment verification failed — order ID mismatch", null, 400, { headers: corsHeaders });
        }

        // ── 3. Verify HMAC SHA256 signature (tamper-proof) ────────
        const generatedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (generatedSignature !== razorpay_signature) {
            // Log failed attempt
            await logPayment(order, razorpay_order_id, razorpay_payment_id, razorpay_signature, "failed", "api", {
                error: "Signature verification failed",
                expected: generatedSignature,
            });

            await supabase.from("lab_activity_logs").insert({
                lab_id: order.lab_id,
                action: "PAYMENT_SIGNATURE_FAILED",
                details: {
                    order_id: order.id,
                    patient_id: order.patient_id,
                    razorpay_order_id,
                    razorpay_payment_id,
                },
            });

            return failure(
                "Payment signature verification failed. This may indicate a tampered payment. Please contact support.",
                null,
                400,
                { headers: corsHeaders }
            );
        }

        // ── 4. Signature valid → Confirm the order ────────────────
        const { error: updateError } = await supabase
            .from("lab_test_orders")
            .update({
                status: "booked",
                payment_status: "paid",
                razorpay_payment_id,
                updated_at: new Date().toISOString(),
            })
            .eq("id", order_id);

        if (updateError) throw updateError;

        // ── 4.5 Dispatch Webhook Event to Outbox (Layer 111) ──
        if (order.care_episode_id) {
            await insertOutboxEvent({
                event_type: "PAYMENT_CAPTURED_WEBHOOK",
                consultation_id: order.prescription_id || order.id, // Fallback if direct booking
                care_episode_id: order.care_episode_id,
                consultation_type: "STANDARD_MODE",
                payload: {
                    order_id: order.id,
                    payment_id: razorpay_payment_id,
                    amount: order.total_amount,
                    service_type: "lab",
                    patient_id: order.patient_id,
                },
            }).catch(e => console.error("Outbox insertion failed:", e));
        }

        // ── 5. Log successful payment ─────────────────────────────
        await logPayment(order, razorpay_order_id, razorpay_payment_id, razorpay_signature, "paid", "api", null);

        // ── 6. Notify the lab ─────────────────────────────────────
        await supabase.from("notifications").insert({
            user_id: order.lab_id,
            title: "New Paid Lab Test Order",
            message: `A new lab test order has been placed and paid (₹${order.total_amount}). Please review.`,
            type: "lab_order",
            metadata: {
                order_id: order.id,
                patient_id: order.patient_id,
                amount: order.total_amount,
            },
        });

        // ── 7. Log activity ──────────────────────────────────────
        await supabase.from("lab_activity_logs").insert({
            lab_id: order.lab_id,
            action: "PAYMENT_VERIFIED",
            details: {
                order_id: order.id,
                patient_id: order.patient_id,
                amount: order.total_amount,
                razorpay_payment_id,
            },
        });

        await supabase.from("lab_activity_logs").insert({
            lab_id: order.lab_id,
            action: "PATIENT_ORDER_PLACED",
            details: {
                order_id: order.id,
                patient_id: order.patient_id,
                amount: order.total_amount,
                payment_method: "razorpay",
            },
        });

        return success("Payment verified successfully. Order sent to lab.", {
            order_id: order.id,
            payment_status: "paid",
            order_status: "sent_to_lab",
            amount: order.total_amount,
        }, 200, { headers: corsHeaders });

    } catch (error) {
        console.error("Payment verification error:", error);
        return failure("Payment verification encountered an error. Your payment is safe — please contact support if the order is not confirmed.", error.message, 500, { headers: corsHeaders });
    }
}

// Helper — Log payment event
async function logPayment(order, rzOrderId, rzPaymentId, rzSignature, status, source, errorDetails) {
    try {
        await supabase.from("lab_payment_logs").insert({
            order_id: order.id,
            patient_id: order.patient_id,
            lab_id: order.lab_id,
            razorpay_order_id: rzOrderId,
            razorpay_payment_id: rzPaymentId || null,
            razorpay_signature: rzSignature || null,
            amount: order.total_amount,
            currency: "INR",
            status,
            source,
            error_details: errorDetails || null,
        });
    } catch (e) {
        console.error("Failed to log payment:", e);
    }
}
