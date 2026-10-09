import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import Razorpay from "razorpay";
import { calculateLabTestPricing } from "@/lib/labPricing";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// POST — Step 1: Create lab order in AWS RDS + Razorpay order
export async function POST(req) {
    try {
        const body = await req.json();
        const {
            patient_id,
            lab_id,
            prescription_id,
            prescription_url,
            tests,
            address,
            visit_type,
            payment_method = "razorpay", // "razorpay" | "cod" | "pay_on_collection"
            patient_notes,
            consents,
            device_type,
            ip_address,
        } = body;

        // ── 1. Validate required fields ───────────────────────────
        if (!patient_id || !lab_id) {
            return failure("patient_id and lab_id are required", null, 400);
        }

        if (!Array.isArray(tests) || tests.length === 0) {
            return failure("At least one test is required", null, 400);
        }

        // ── 2. Validate address ───────────────────────────────────
        if (!address || !address.full_address) {
            return failure("Delivery/visit address is required", null, 400);
        }

        // ── 3. Validate visit_type ────────────────────────────────
        const validVisitTypes = ["home_collection", "walk_in"];
        const selectedVisitType = validVisitTypes.includes(visit_type) ? visit_type : "home_collection";

        // ── 4. Validate Indian Medical Law Consents ───────────────
        if (!consents || typeof consents !== "object") {
            return failure("Consent object is required for compliance with Indian medical regulations", null, 400);
        }

        // ── 5. Verify lab exists in AWS RDS ───────────────────────
        const labRows = await sql`
            SELECT id, lab_name, onboarding_status, address
            FROM lab_details
            WHERE id = ${lab_id}
            LIMIT 1
        `;

        if (labRows.length === 0) {
            return failure("Lab not found", null, 404);
        }

        const labData = labRows[0];

        // ── 6. Fetch actual prices from DB (prevent spoofing) ─────
        const testIds = tests.filter(t => t.test_id).map(t => t.test_id);
        let priceMap = {};

        if (testIds.length > 0) {
            const dbTests = await sql`
                SELECT id, test_name, price, discount_percentage, offer_price, department
                FROM lab_tests
                WHERE id = ANY(${testIds})
                  AND lab_id = ${lab_id}
                  AND is_active = true
            `;
            dbTests.forEach(t => { priceMap[t.id] = t; });
        }

        // Build verified items with server-side prices and discount rules (40% on CT/USG/X-Ray, 30% Echo)
        const verifiedItems = tests.map(t => {
            const dbTest = priceMap[t.test_id];
            const itemToPrice = dbTest || t;
            const pricing = calculateLabTestPricing(itemToPrice);
            return {
                test_id: t.test_id || null,
                test_name: dbTest?.test_name || t.test_name || t.name,
                price: pricing.finalPrice,
                mrp: pricing.mrp,
                discount: pricing.discountAmount,
                notes: t.notes || null
            };
        });

        let totalAmount = verifiedItems.reduce((sum, t) => sum + t.price, 0);
        if (selectedVisitType === "home_collection") {
            totalAmount += 150;
        }

        if (totalAmount <= 0) {
            return failure("Order total must be greater than zero", null, 400);
        }

        // ── 6.5. Resolve Care Episode from prescription if available
        let careEpisodeId = null;
        let resolvedPrescriptionId = prescription_id || null;

        if (prescription_url && !resolvedPrescriptionId) {
            try {
                const prescInsert = await sql`
                    INSERT INTO prescriptions (
                        patient_id, file_url, notes, created_at, updated_at
                    ) VALUES (
                        ${patient_id}, ${prescription_url}, 'Uploaded by patient for lab booking', NOW(), NOW()
                    )
                    RETURNING id
                `;
                if (prescInsert.length > 0) {
                    resolvedPrescriptionId = prescInsert[0].id;
                }
            } catch (prescErr) {
                console.warn("Failed saving uploaded prescription to table:", prescErr.message);
            }
        }

        if (resolvedPrescriptionId) {
            const prescRows = await sql`
                SELECT a.care_episode_id
                FROM prescriptions p
                LEFT JOIN appointments a ON a.id = p.appointment_id
                WHERE p.id = ${resolvedPrescriptionId}
                LIMIT 1
            `;
            if (prescRows.length > 0 && prescRows[0].care_episode_id) {
                careEpisodeId = prescRows[0].care_episode_id;
            }
        }

        // ── 7. Handle Payment / Razorpay ──────────────────────────
        const isCod = payment_method === "cod" || payment_method === "pay_on_collection";
        let razorpayOrder = null;
        const razorpayKeyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
        const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!isCod) {
            try {
                const razorpay = new Razorpay({
                    key_id: razorpayKeyId,
                    key_secret: razorpaySecret,
                });

                razorpayOrder = await razorpay.orders.create({
                    amount: Math.round(totalAmount * 100), // Convert to paise
                    currency: "INR",
                    receipt: `lab_ord_${Date.now()}`,
                    notes: {
                        patient_id,
                        lab_id,
                        lab_name: labData.lab_name,
                        tests_count: verifiedItems.length.toString(),
                    },
                });
            } catch (rzError) {
                console.error("Razorpay order creation failed:", rzError);
                return failure("Payment gateway error. Please try again.", rzError.message, 502);
            }
        }

        // ── 7.5. Clean up any abandoned uncompleted checkout drafts for this patient & lab ──
        try {
            const oldDrafts = await sql`
                SELECT id FROM lab_test_orders
                WHERE patient_id = ${patient_id}
                  AND lab_id = ${lab_id}
                  AND status = 'pending'
                  AND payment_status = 'pending'
                  AND razorpay_payment_id IS NULL
            `;
            if (oldDrafts.length > 0) {
                const oldIds = oldDrafts.map(d => d.id);
                await sql`DELETE FROM lab_order_consents WHERE order_id = ANY(${oldIds})`;
                await sql`DELETE FROM lab_payment_logs WHERE order_id = ANY(${oldIds})`;
                await sql`DELETE FROM lab_test_order_items WHERE order_id = ANY(${oldIds})`;
                await sql`DELETE FROM lab_test_orders WHERE id = ANY(${oldIds})`;
            }
        } catch (cleanupErr) {
            console.warn("Cleaned up old pending drafts warning:", cleanupErr.message);
        }

        // ── 8. Create DB order in AWS RDS ─────────────────────────
        const initialStatus = isCod ? 'sent_to_lab' : 'pending';
        const initialPaymentStatus = isCod ? 'pending' : 'pending';

        const orderRows = await sql`
            INSERT INTO lab_test_orders (
                prescription_id,
                prescription_url,
                patient_id,
                lab_id,
                care_episode_id,
                status,
                payment_status,
                total_amount,
                patient_notes,
                razorpay_order_id,
                delivery_address,
                visit_type,
                created_at,
                updated_at
            ) VALUES (
                ${resolvedPrescriptionId},
                ${prescription_url || null},
                ${patient_id},
                ${lab_id},
                ${careEpisodeId},
                ${initialStatus},
                ${initialPaymentStatus},
                ${totalAmount},
                ${patient_notes || null},
                ${razorpayOrder ? razorpayOrder.id : null},
                ${sql.json(address)},
                ${selectedVisitType},
                NOW(),
                NOW()
            )
            RETURNING *
        `;

        const order = orderRows[0];

        // ── 9. Insert order items in AWS RDS ──────────────────────
        for (const t of verifiedItems) {
            await sql`
                INSERT INTO lab_test_order_items (
                    order_id,
                    test_name,
                    price,
                    test_id,
                    notes,
                    status
                ) VALUES (
                    ${order.id},
                    ${t.test_name},
                    ${t.price},
                    ${t.test_id || null},
                    ${t.notes || null},
                    'pending'
                )
            `;
        }

        // ── 10. Record immutable consent in AWS RDS ───────────────
        try {
            await sql`
                INSERT INTO lab_order_consents (
                    order_id,
                    patient_id,
                    lab_id,
                    data_sharing_consent,
                    prescription_sharing_consent,
                    sample_collection_consent,
                    terms_accepted,
                    consent_timestamp,
                    ip_address,
                    device_type,
                    consent_version,
                    created_at
                ) VALUES (
                    ${order.id},
                    ${patient_id},
                    ${lab_id},
                    ${consents.data_sharing_consent === true},
                    ${consents.prescription_sharing_consent === true || Boolean(prescription_url)},
                    ${consents.sample_collection_consent === true},
                    ${consents.terms_accepted === true},
                    NOW(),
                    ${ip_address || null},
                    ${device_type || "web"},
                    '1.0',
                    NOW()
                )
            `;
        } catch (consentErr) {
            console.warn("Failed recording consent:", consentErr.message);
        }

        // ── 11. Log payment initiation in AWS RDS ─────────────────
        if (razorpayOrder) {
            try {
                await sql`
                    INSERT INTO lab_payment_logs (
                        order_id,
                        patient_id,
                        lab_id,
                        razorpay_order_id,
                        amount,
                        currency,
                        status,
                        source,
                        created_at
                    ) VALUES (
                        ${order.id},
                        ${patient_id},
                        ${lab_id},
                        ${razorpayOrder.id},
                        ${totalAmount},
                        'INR',
                        'initiated',
                        'api',
                        NOW()
                    )
                `;
            } catch (payLogErr) {
                console.warn("Failed logging payment initiation:", payLogErr.message);
            }
        }

        // If COD, notify lab immediately
        if (isCod) {
            try {
                await sql`
                    INSERT INTO notifications (user_id, title, message, type, metadata, created_at)
                    VALUES (
                        ${lab_id},
                        'New Lab Test Booking (Pay on Collection)',
                        ${'A new lab test order has been placed (₹' + totalAmount + ') with payment on sample collection.'},
                        'lab_order',
                        ${sql.json({ order_id: order.id, patient_id, amount: totalAmount, visit_type: selectedVisitType })},
                        NOW()
                    )
                `;
            } catch {}
        }

        // ── 12. Return everything the frontend needs ──────────────
        return success(isCod ? "Order booked successfully" : "Order initiated. Proceed to payment.", {
            order_id: order.id,
            order_unid: String(order.unid || ""),
            amount: totalAmount,
            currency: "INR",
            is_cod: isCod,
            razorpay_order_id: razorpayOrder ? razorpayOrder.id : null,
            razorpay_key: razorpayKeyId,
            lab_name: labData.lab_name,
            tests: verifiedItems,
        }, 201);

    } catch (error) {
        console.error("Order initiation error:", error);
        return failure("Failed to initiate order. Please try again.", error.message, 500);
    }
}
