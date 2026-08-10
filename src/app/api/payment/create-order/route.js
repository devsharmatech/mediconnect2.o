import Razorpay from "razorpay";
import { createLedgerEntry } from "@/lib/layer1/financialLedger";
import { success, failure } from "@/lib/response";
import { acquireIdempotencyLock, releaseIdempotencyLock } from "@/lib/layer1/idempotencyService";
import { createCareEpisode } from "@/lib/layer1/careEpisodeService";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders() });
}
export async function POST(req) {
    try {
        const body = await req.json();
        const { amount, currency = "INR", patient_id, doctor_id, appointment_type, care_episode_id, idempotency_key } = body;

        if (!amount) {
            return failure("Amount is required", null, 400);
        }

        let resolvedCareEpisodeId = care_episode_id;
        if (!resolvedCareEpisodeId && patient_id) {
            // Auto-provision a care episode for new booking flows
            try {
                const episodeResult = await createCareEpisode(patient_id, "consultation");
                if (episodeResult.success && episodeResult.data) {
                    resolvedCareEpisodeId = episodeResult.data.id;
                }
            } catch (err) {
                console.warn("Failed to auto-provision care episode in create-order:", err);
            }
        }

        if (!resolvedCareEpisodeId) {
            return failure("care_episode_id could not be resolved or provisioned", null, 400);
        }

        if (!idempotency_key) {
            return failure("idempotency_key is required to prevent duplicate charges", null, 400);
        }

        // 1. Idempotency Guard
        const { isLocked, isDuplicate, responseBody, responseStatus, error } = await acquireIdempotencyLock(
            idempotency_key,
            "/api/payment/create-order",
            resolvedCareEpisodeId
        );

        if (error) return failure("Payment orchestration locked or failed", error, 500);
        
        if (isDuplicate) {
            // Already processed this key, return the exact same response
            return success(
                responseBody?.message || "Payment order retrieved successfully", 
                responseBody?.data, 
                responseStatus
            );
        }

        const instance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const options = {
            amount: Math.round(amount * 100), // amount in smallest currency unit (paise)
            currency,
            receipt: `receipt_${Date.now()}`,
        };

        const order = await instance.orders.create(options);

        // ✅ Create "initiated" financial log immediately
        if (patient_id) {
            await createLedgerEntry({
                patient_id,
                care_episode_id: resolvedCareEpisodeId,
                service_type: "consultation",
                debit_credit: "debit",
                amount: amount,
                payment_mode: "Razorpay",
                payment_gateway_id: order.id,
                status: "initiated",
                description: `Payment initiated for ${appointment_type || 'consultation'}`,
                metadata: { doctor_id, order_id: order.id }
            });
        }

        const successData = { 
            order, 
            care_episode_id: resolvedCareEpisodeId,
            razorpay_key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID
        };
        const responseMessage = "Payment order created successfully";
        
        // 2. Release Lock with final payload
        await releaseIdempotencyLock(idempotency_key, { message: responseMessage, data: successData }, 200);

        return success(responseMessage, successData, 200);
    } catch (error) {
        console.error("Razorpay order creation error:", error);
        return failure("Failed to create payment order", error.message, 500);
    }
}
