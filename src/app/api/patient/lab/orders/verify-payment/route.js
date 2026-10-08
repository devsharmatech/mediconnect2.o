import crypto from "crypto";
import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// POST — Step 2: Verify Razorpay payment and confirm order in AWS RDS
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
                "Missing payment verification details: order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature",
                null,
                400,
                { headers: corsHeaders }
            );
        }

        // ── 2. Fetch the order from AWS RDS ───────────────────────
        const orders = await sql`
            SELECT id, unid, patient_id, lab_id, total_amount, payment_status, razorpay_order_id, status, care_episode_id, prescription_id
            FROM lab_test_orders
            WHERE id = ${order_id}
            LIMIT 1
        `;

        if (orders.length === 0) {
            return failure("Order not found", null, 404, { headers: corsHeaders });
        }

        const order = orders[0];

        // Check if already paid
        if (order.payment_status === "paid") {
            return success("Payment already verified for this order", {
                order_id: order.id,
                status: "already_paid",
            }, 200, { headers: corsHeaders });
        }

        // Verify razorpay_order_id matches
        if (order.razorpay_order_id !== razorpay_order_id) {
            try {
                await sql`
                    INSERT INTO lab_payment_logs (
                        order_id, patient_id, lab_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency, status, source, error_details, created_at
                    ) VALUES (
                        ${order.id}, ${order.patient_id}, ${order.lab_id}, ${razorpay_order_id}, ${razorpay_payment_id}, ${razorpay_signature}, ${order.total_amount}, 'INR', 'failed', 'api', ${sql.json({ error: 'Razorpay order ID mismatch' })}, NOW()
                    )
                `;
            } catch {}
            return failure("Payment verification failed — order ID mismatch", null, 400, { headers: corsHeaders });
        }

        // ── 3. Verify HMAC SHA256 signature ──────────────────────
        const generatedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (generatedSignature !== razorpay_signature) {
            try {
                await sql`
                    INSERT INTO lab_payment_logs (
                        order_id, patient_id, lab_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency, status, source, error_details, created_at
                    ) VALUES (
                        ${order.id}, ${order.patient_id}, ${order.lab_id}, ${razorpay_order_id}, ${razorpay_payment_id}, ${razorpay_signature}, ${order.total_amount}, 'INR', 'failed', 'api', ${sql.json({ error: 'Signature verification failed', expected: generatedSignature })}, NOW()
                    )
                `;
            } catch {}
            return failure(
                "Payment signature verification failed. Please contact support.",
                null,
                400,
                { headers: corsHeaders }
            );
        }

        // ── 4. Signature valid → Confirm the order in AWS RDS ─────
        await sql`
            UPDATE lab_test_orders
            SET 
                status = 'booked',
                payment_status = 'paid',
                razorpay_payment_id = ${razorpay_payment_id},
                updated_at = NOW()
            WHERE id = ${order_id}
        `;

        await sql`
            UPDATE lab_test_order_items
            SET status = 'booked'
            WHERE order_id = ${order_id}
        `;

        // ── 5. Log successful payment in AWS RDS ──────────────────
        try {
            await sql`
                INSERT INTO lab_payment_logs (
                    order_id, patient_id, lab_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency, status, source, created_at
                ) VALUES (
                    ${order.id}, ${order.patient_id}, ${order.lab_id}, ${razorpay_order_id}, ${razorpay_payment_id}, ${razorpay_signature}, ${order.total_amount}, 'INR', 'paid', 'api', NOW()
                )
            `;
        } catch {}

        // ── 6. Notify lab and patient ─────────────────────────────
        try {
            if (order.lab_id) {
                await sql`
                    INSERT INTO notifications (user_id, title, message, type, metadata, created_at)
                    VALUES (
                        ${order.lab_id},
                        'New Paid Lab Test Order',
                        ${'A new lab test order has been placed and paid (₹' + order.total_amount + '). Please review.'},
                        'lab_order',
                        ${sql.json({ order_id: order.id, patient_id: order.patient_id, amount: order.total_amount })},
                        NOW()
                    )
                `;
            }
            if (order.patient_id) {
                await sql`
                    INSERT INTO notifications (user_id, title, message, type, metadata, created_at)
                    VALUES (
                        ${order.patient_id},
                        'Lab Order Confirmed',
                        ${'Your payment of ₹' + order.total_amount + ' was received and your lab test order has been confirmed.'},
                        'lab_order',
                        ${sql.json({ order_id: order.id, lab_id: order.lab_id, amount: order.total_amount })},
                        NOW()
                    )
                `;
            }
        } catch {}

        return success("Payment verified successfully and order confirmed", {
            order_id: order.id,
            order_unid: String(order.unid || ""),
            status: "booked",
            payment_status: "paid",
        }, 200, { headers: corsHeaders });

    } catch (error) {
        console.error("Payment verification error:", error);
        return failure("Failed to verify payment", error.message, 500, { headers: corsHeaders });
    }
}
