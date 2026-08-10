import crypto from "crypto";
import { supabase } from "@/lib/supabaseAdmin";

// POST — Razorpay Webhook Handler
// Razorpay sends POST requests to this endpoint when payment events occur
// This acts as a safety net in case the frontend verify-payment call fails
export async function POST(req) {
    try {
        const rawBody = await req.text();
        const webhookSignature = req.headers.get("x-razorpay-signature");

        // ── 1. Verify webhook signature ───────────────────────────
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

        if (webhookSignature) {
            const expectedSignature = crypto
                .createHmac("sha256", webhookSecret)
                .update(rawBody)
                .digest("hex");

            if (expectedSignature !== webhookSignature) {
                console.error("Webhook signature mismatch");
                return new Response(
                    JSON.stringify({ status: false, message: "Invalid webhook signature" }),
                    { status: 400, headers: { "Content-Type": "application/json" } }
                );
            }
        }

        const event = JSON.parse(rawBody);
        const eventType = event.event;
        const payload = event.payload?.payment?.entity;

        if (!payload) {
            return new Response(
                JSON.stringify({ status: true, message: "No payment entity — skipped" }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        }

        const razorpay_order_id = payload.order_id;
        const razorpay_payment_id = payload.id;
        const amount = payload.amount / 100; // Convert from paise to INR

        // Log every webhook event
        console.log(`[Razorpay Webhook] ${eventType} — order: ${razorpay_order_id}, payment: ${razorpay_payment_id}`);

        // ── 2. Find the matching order ────────────────────────────
        const { data: order, error: orderError } = await supabase
            .from("lab_test_orders")
            .select("id, patient_id, lab_id, total_amount, payment_status, status")
            .eq("razorpay_order_id", razorpay_order_id)
            .maybeSingle();

        if (orderError || !order) {
            // Log unknown webhook for audit
            await supabase.from("lab_payment_logs").insert({
                razorpay_order_id,
                razorpay_payment_id,
                amount,
                currency: "INR",
                status: `webhook_${eventType}_no_order`,
                source: "webhook",
                metadata: { event: eventType, raw_event_id: event.id },
            }).then(null, () => {});

            return new Response(
                JSON.stringify({ status: true, message: "No matching order found — logged" }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        }

        // ── 3. Handle payment.captured ────────────────────────────
        if (eventType === "payment.captured") {
            if (order.payment_status === "paid") {
                // Already handled by verify-payment — just log
                await supabase.from("lab_payment_logs").insert({
                    order_id: order.id,
                    patient_id: order.patient_id,
                    lab_id: order.lab_id,
                    razorpay_order_id,
                    razorpay_payment_id,
                    amount,
                    currency: "INR",
                    status: "already_paid",
                    source: "webhook",
                }).then(null, () => {});

                return new Response(
                    JSON.stringify({ status: true, message: "Payment already confirmed" }),
                    { status: 200, headers: { "Content-Type": "application/json" } }
                );
            }

            // Confirm payment (backup path)
            await supabase
                .from("lab_test_orders")
                .update({
                    status: "booked",
                    payment_status: "paid",
                    razorpay_payment_id,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", order.id);

            // Log payment
            await supabase.from("lab_payment_logs").insert({
                order_id: order.id,
                patient_id: order.patient_id,
                lab_id: order.lab_id,
                razorpay_order_id,
                razorpay_payment_id,
                amount,
                currency: "INR",
                status: "paid",
                source: "webhook",
            }).then(null, () => {});

            // Notify lab (backup)
            await supabase.from("notifications").insert({
                user_id: order.lab_id,
                title: "New Paid Lab Test Order",
                message: `A new lab test order has been placed and paid (₹${amount}). Please review.`,
                type: "lab_order",
                metadata: { order_id: order.id, patient_id: order.patient_id, amount },
            }).then(null, () => {});

            // Activity log
            await supabase.from("lab_activity_logs").insert({
                lab_id: order.lab_id,
                action: "PAYMENT_CONFIRMED_VIA_WEBHOOK",
                details: {
                    order_id: order.id,
                    patient_id: order.patient_id,
                    amount,
                    razorpay_payment_id,
                },
            }).then(null, () => {});
        }

        // ── 4. Handle payment.failed ──────────────────────────────
        if (eventType === "payment.failed") {
            await supabase
                .from("lab_test_orders")
                .update({
                    payment_status: "failed",
                    status: "payment_failed",
                    updated_at: new Date().toISOString(),
                })
                .eq("id", order.id);

            await supabase.from("lab_payment_logs").insert({
                order_id: order.id,
                patient_id: order.patient_id,
                lab_id: order.lab_id,
                razorpay_order_id,
                razorpay_payment_id,
                amount,
                currency: "INR",
                status: "failed",
                source: "webhook",
                error_details: {
                    description: payload.error_description || "Payment failed",
                    code: payload.error_code || null,
                    reason: payload.error_reason || null,
                },
            }).then(null, () => {});

            await supabase.from("lab_activity_logs").insert({
                lab_id: order.lab_id,
                action: "PAYMENT_FAILED",
                details: {
                    order_id: order.id,
                    patient_id: order.patient_id,
                    amount,
                    error: payload.error_description || "Unknown",
                },
            }).then(null, () => {});

            // Notify patient about failure
            await supabase.from("notifications").insert({
                user_id: order.patient_id,
                title: "Payment Failed",
                message: `Your payment of ₹${amount} for the lab test order failed. Please try again.`,
                type: "lab_order",
                metadata: { order_id: order.id, amount },
            }).then(null, () => {});
        }

        // ── 5. Handle payment.authorized (auto-capture scenario) ──
        if (eventType === "payment.authorized") {
            await supabase.from("lab_payment_logs").insert({
                order_id: order.id,
                patient_id: order.patient_id,
                lab_id: order.lab_id,
                razorpay_order_id,
                razorpay_payment_id,
                amount,
                currency: "INR",
                status: "authorized",
                source: "webhook",
            }).then(null, () => {});
        }

        return new Response(
            JSON.stringify({ status: true, message: `Webhook ${eventType} processed` }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Webhook processing error:", error);
        // Always return 200 to Razorpay to prevent retries for processing errors
        return new Response(
            JSON.stringify({ status: false, message: "Webhook processing error", error: error.message }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    }
}
