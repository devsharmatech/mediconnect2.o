import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { createCareEpisode } from "@/lib/layer1/careEpisodeService";
import { createLedgerEntry } from "@/lib/layer1/financialLedger";
import { logActivity } from "@/lib/layer1/activityLogger";

const safeUuid = (val) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ? val : null);

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// POST create a marketplace lab test order
export async function POST(req) {
    try {
        const body = await req.json();
        const { patient_id, test_id, lab_id, patient_notes, razorpay_order_id, razorpay_payment_id } = body;

        const cleanPatientId = safeUuid(patient_id);
        const cleanTestId = safeUuid(test_id);
        const cleanLabId = safeUuid(lab_id);

        if (!cleanPatientId || !cleanTestId || !cleanLabId) {
            return failure("Valid patient_id, test_id, and lab_id are required", null, 400, { headers: corsHeaders });
        }

        // 1. Fetch exact price from DB to prevent client-side spoofing
        const testRows = await sql`
            SELECT price, test_name FROM lab_tests WHERE id = ${cleanTestId} LIMIT 1
        `;

        if (!testRows.length) {
            return failure("Lab test not found or unavailable", null, 404, { headers: corsHeaders });
        }

        const testDetails = testRows[0];

        // 1.5. LAYER-1 Foundations
        let careEpisodeId = null;
        try {
            const episodeResult = await createCareEpisode(cleanPatientId, "lab");
            if (episodeResult.success) {
                careEpisodeId = episodeResult.data.id;
            }
        } catch (l1Err) {
            console.warn("Care episode creation failed:", l1Err);
        }

        const cleanEpisodeId = safeUuid(careEpisodeId);

        // 2. Insert into lab_test_orders
        const createdOrders = await sql`
            INSERT INTO lab_test_orders (
                patient_id,
                lab_id,
                care_episode_id,
                status,
                patient_notes,
                total_amount,
                payment_status,
                razorpay_order_id,
                razorpay_payment_id,
                created_at,
                updated_at
            ) VALUES (
                ${cleanPatientId},
                ${cleanLabId},
                ${cleanEpisodeId},
                'pending',
                ${patient_notes || null},
                ${Number(testDetails.price)},
                ${razorpay_payment_id ? "paid" : "pending"},
                ${razorpay_order_id || null},
                ${razorpay_payment_id || null},
                NOW(),
                NOW()
            )
            RETURNING *
        `;

        const order = createdOrders[0];

        // 2.5. LAYER-1 Financial Ledger
        if (cleanEpisodeId) {
            await createLedgerEntry({
                patient_id: cleanPatientId,
                care_episode_id: cleanEpisodeId,
                service_type: "lab",
                reference_id: order.id,
                debit_credit: "credit",
                amount: Number(testDetails.price),
                status: razorpay_payment_id ? "success" : "initiated",
                description: `Lab test order initiated: ${testDetails.test_name}`,
            }).catch(e => console.warn("Ledger entry error:", e.message));
        }

        // Activity Log
        logActivity({
            patient_id: cleanPatientId,
            care_episode_id: cleanEpisodeId,
            actor_id: cleanPatientId,
            module_type: "lab",
            action_type: "order_initiated",
            reference_id: order.id,
            description: `Marketplace lab test ordered: ${testDetails.test_name}`,
        }).then(null, () => {});

        // 3. Insert into lab_test_order_items
        await sql`
            INSERT INTO lab_test_order_items (
                order_id,
                test_name,
                price,
                test_id,
                status
            ) VALUES (
                ${order.id},
                ${testDetails.test_name},
                ${Number(testDetails.price)},
                ${cleanTestId},
                'pending'
            )
        `;

        return success("Lab test order created successfully", order, 201, { headers: corsHeaders });
    } catch (error) {
        console.error("Error creating marketplace lab order:", error);
        return failure("Failed to create test order", error.message, 500, { headers: corsHeaders });
    }
}
