import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { createCareEpisode } from "@/lib/layer1/careEpisodeService";
import { createLedgerEntry } from "@/lib/layer1/financialLedger";
import { logActivity } from "@/lib/layer1/activityLogger";
import { logAudit } from "@/lib/layer1/auditLogger";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// POST create a marketplace lab test order
export async function POST(req) {
    try {
        const body = await req.json();
        const { patient_id, test_id, lab_id, patient_notes, razorpay_order_id, razorpay_payment_id } = body;

        if (!patient_id || !test_id || !lab_id) {
            return failure("patient_id, test_id, and lab_id are required", null, 400, { headers: corsHeaders });
        }

        // 1. Fetch exact price from DB to prevent client-side spoofing
        const { data: testDetails, error: testErr } = await supabase
            .from("lab_tests")
            .select("price, test_name")
            .eq("id", test_id)
            .single();

        if (testErr || !testDetails) {
            return failure("Lab test not found or unavailable", null, 404, { headers: corsHeaders });
        }

        // ── 1.5. LAYER-1 Foundations ──────────────────────────
        let careEpisodeId = null;
        try {
            const episodeResult = await createCareEpisode(patient_id, "lab");
            if (episodeResult.success) {
                careEpisodeId = episodeResult.data.id;
            }
        } catch (l1Err) {
            console.warn("Care episode creation failed:", l1Err);
        }

        // 2. Insert into lab_test_orders
        const { data: order, error: orderErr } = await supabase
            .from("lab_test_orders")
            .insert([
                {
                    patient_id,
                    lab_id,
                    care_episode_id: careEpisodeId,
                    status: "pending",
                    patient_notes,
                    total_amount: testDetails.price,
                    payment_status: razorpay_payment_id ? "paid" : "pending",
                    razorpay_order_id,
                    razorpay_payment_id
                },
            ])
            .select()
            .single();

        if (orderErr) throw orderErr;

        // ── 2.5. LAYER-1 Financial Ledger ─────────────────────
        if (careEpisodeId) {
            await createLedgerEntry({
                patient_id,
                care_episode_id: careEpisodeId,
                service_type: "lab",
                reference_id: order.id,
                debit_credit: "debit",
                amount: testDetails.price,
                status: razorpay_payment_id ? "success" : "initiated",
                description: `Lab test order initiated: ${testDetails.test_name}`,
            });
        }

        // Activity Log
        logActivity({
            patient_id,
            care_episode_id: careEpisodeId,
            actor_id: patient_id,
            module_type: "lab",
            action_type: "order_initiated",
            reference_id: order.id,
            description: `Marketplace lab test ordered: ${testDetails.test_name}`,
        }).then(null, () => {});

        // 3. Insert into lab_test_order_items (for backward compatibility with the Lab Dashboard)
        const { error: itemErr } = await supabase
            .from("lab_test_order_items")
            .insert([
                {
                    order_id: order.id,
                    test_name: testDetails.test_name,
                    price: testDetails.price,
                    // If we added test_id column previously, we could populate it: test_id: test_id
                }
            ]);

        if (itemErr) throw itemErr;

        return success("Lab test order created successfully", order, 201, { headers: corsHeaders });
    } catch (error) {
        console.error("Error creating marketplace lab order:", error);
        return failure("Failed to create test order", error.message, 500, { headers: corsHeaders });
    }
}
