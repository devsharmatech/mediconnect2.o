import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// GET — Single order detail with items, payment info, lab details, and consent audit trail
export async function GET(req, { params }) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(req.url);
        const patient_id = searchParams.get("patient_id");

        if (!id || !patient_id) {
            return failure("Order ID and patient_id are required", null, 400, { headers: corsHeaders });
        }

        // Fetch order with payment info
        const { data: order, error: orderError } = await supabase
            .from("lab_test_orders")
            .select(`
                id,
                unid,
                prescription_id,
                status,
                payment_status,
                total_amount,
                patient_notes,
                lab_notes,
                visit_type,
                delivery_address,
                razorpay_order_id,
                razorpay_payment_id,
                created_at,
                updated_at,
                lab:lab_id (
                    id
                )
            `)
            .eq("id", id)
            .eq("patient_id", patient_id)
            .single();

        if (orderError) {
            if (orderError?.code === "PGRST116") {
                return failure("Order not found", null, 404, { headers: corsHeaders });
            }
            throw orderError;
        }

        // Fetch order items
        const { data: items, error: itemsError } = await supabase
            .from("lab_test_order_items")
            .select("*")
            .eq("order_id", id);

        if (itemsError) throw itemsError;

        // Fetch lab details
        let labDetails = null;
        if (order.lab?.id) {
            const { data: ld } = await supabase
                .from("lab_details")
                .select("id, lab_name, address, phone_number, opening_hours, accepts_home_collection")
                .eq("id", order.lab.id)
                .single();
            labDetails = ld;
        }

        // Fetch consent record (audit trail)
        const { data: consent } = await supabase
            .from("lab_order_consents")
            .select("*")
            .eq("order_id", id)
            .eq("patient_id", patient_id)
            .maybeSingle();

        // Fetch payment logs for this order
        const { data: paymentLogs } = await supabase
            .from("lab_payment_logs")
            .select("id, status, source, amount, razorpay_payment_id, created_at")
            .eq("order_id", id)
            .order("created_at", { ascending: true });

        // Log activity
        await supabase.from("lab_activity_logs").insert({
            lab_id: order.lab?.id,
            action: "PATIENT_ORDER_VIEWED",
            details: { order_id: id, patient_id },
        });

        return success("Order details fetched", {
            order: {
                ...order,
                lab_details: labDetails,
            },
            items: items || [],
            consent: consent || null,
            payment_history: paymentLogs || [],
        }, 200, { headers: corsHeaders });

    } catch (error) {
        console.error("Patient order detail error:", error);
        return failure("Failed to fetch order details", error.message, 500, { headers: corsHeaders });
    }
}
