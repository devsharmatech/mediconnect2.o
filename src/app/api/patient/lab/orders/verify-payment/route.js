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
                400
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
            return failure("Order not found", null, 404);
        }

        const order = orders[0];

        // Check if already paid
        if (order.payment_status === "paid") {
            return success("Payment already verified for this order", {
                order_id: order.id,
                status: "already_paid",
            }, 200);
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
            return failure("Payment verification failed — order ID mismatch", null, 400);
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
                400
            );
        }

        // ── 4. Signature valid → Confirm the order in AWS RDS ─────
        await sql`
            UPDATE lab_test_orders
            SET 
                status = 'approved',
                payment_status = 'paid',
                razorpay_payment_id = ${razorpay_payment_id},
                updated_at = NOW()
            WHERE id = ${order_id}
        `;

        await sql`
            UPDATE lab_test_order_items
            SET status = 'approved'
            WHERE order_id = ${order_id}
        `;

        // ── 5. Compute Financial Breakdown & Audit Distribution ─
        let adminCommission = 0;
        let labPayout = 0;
        let auditBreakdown = [];
        try {
            const items = await sql`
                SELECT 
                    oi.id, oi.test_name, oi.price, oi.test_id,
                    COALESCE(c.commission_percentage, 50.00)::numeric as commission_percentage
                FROM lab_test_order_items oi
                LEFT JOIN lab_tests lt ON lt.id = oi.test_id
                LEFT JOIN lab_test_categories c ON c.id = lt.category_id
                WHERE oi.order_id = ${order.id}
            `;
            const homeFee = order.visit_type === 'home_collection' ? 150 : 0;
            for (const item of items) {
                const itemPrice = parseFloat(item.price) || 0;
                const commPct = parseFloat(item.commission_percentage) || 50;
                const itemComm = parseFloat(((itemPrice * commPct) / 100).toFixed(2));
                const itemLabShare = parseFloat((itemPrice - itemComm).toFixed(2));
                adminCommission += itemComm;
                labPayout += itemLabShare;
                auditBreakdown.push({
                    test_name: item.test_name,
                    price: itemPrice,
                    commission_percentage: commPct,
                    admin_commission: itemComm,
                    lab_share: itemLabShare,
                });
            }
            adminCommission = parseFloat(adminCommission.toFixed(2));
            labPayout = parseFloat((labPayout + homeFee).toFixed(2));
        } catch (commErr) {
            console.warn("Commission distribution calculation warning:", commErr.message);
        }

        // ── 5.1. Log payment & audit trail in AWS RDS ──────────────
        try {
            await sql`
                INSERT INTO lab_payment_logs (
                    order_id, patient_id, lab_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency, status, source, error_details, created_at
                ) VALUES (
                    ${order.id}, ${order.patient_id}, ${order.lab_id}, ${razorpay_order_id}, ${razorpay_payment_id}, ${razorpay_signature}, ${order.total_amount}, 'INR', 'paid', 'api', ${sql.json({ admin_commission: adminCommission, lab_payout: labPayout, audit: auditBreakdown })}, NOW()
                )
            `;
        } catch (logErr) {
            console.warn("Payment log insert warning:", logErr.message);
        }

        // ── 5.2. Record immutable Activity Audit Log ───────────────
        try {
            await sql`
                INSERT INTO activity_log (
                    patient_id,
                    actor_id,
                    reference_id,
                    module_type,
                    action_type,
                    description,
                    metadata,
                    created_at
                ) VALUES (
                    ${order.patient_id},
                    ${order.patient_id},
                    ${order.id},
                    'lab',
                    'PAYMENT_VERIFIED',
                    ${`Payment of ₹${order.total_amount} verified via Razorpay (${razorpay_payment_id}). Order confirmed. MediConnect Platform Commission: ₹${adminCommission}, Lab Disbursable Share: ₹${labPayout}.`},
                    ${sql.json({
                        order_id: order.id,
                        order_unid: order.unid,
                        razorpay_order_id,
                        razorpay_payment_id,
                        gross_amount: Number(order.total_amount),
                        admin_commission: adminCommission,
                        lab_payout: labPayout,
                        audit_breakdown: auditBreakdown,
                        status: 'paid'
                    })},
                    NOW()
                )
            `;
        } catch (actErr) {
            console.warn("Activity log audit insert warning:", actErr.message);
        }

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
        }, 200);

    } catch (error) {
        console.error("Payment verification error:", error);
        return failure("Failed to verify payment", error.message, 500);
    }
}
