import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { resolveCallerFromRequest } from "@/lib/layer1/authGuard";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// GET — Patient's lab order history (with payment info)
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const patient_id = searchParams.get("patient_id");
        const page = parseInt(searchParams.get("page")) || 1;
        const limit = parseInt(searchParams.get("limit")) || 10;
        const status = searchParams.get("status");

        if (!patient_id) {
            return failure("patient_id is required", null, 400, { headers: corsHeaders });
        }

        const caller = await resolveCallerFromRequest(req);
        if (!caller) {
            return failure("Unauthorized - missing or invalid token.", null, 401, { headers: corsHeaders });
        }
        if (caller.id !== patient_id && caller.role !== "admin") {
            return failure("Forbidden - you do not have permission to view this order history.", null, 403, { headers: corsHeaders });
        }

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        // Count total
        let countQuery = supabase
            .from("lab_test_orders")
            .select("*", { count: "exact", head: true })
            .eq("patient_id", patient_id);
        if (status) countQuery = countQuery.eq("status", status);

        const { count } = await countQuery;

        // Fetch orders with payment info
        let query = supabase
            .from("lab_test_orders")
            .select(`
                id,
                unid,
                status,
                payment_status,
                total_amount,
                patient_notes,
                lab_notes,
                visit_type,
                delivery_address,
                razorpay_order_id,
                created_at,
                updated_at,
                lab:lab_id (
                    id
                )
            `)
            .eq("patient_id", patient_id)
            .order("created_at", { ascending: false })
            .range(from, to);

        if (status) query = query.eq("status", status);

        const { data: orders, error } = await query;
        if (error) throw error;

        // Attach lab name from lab_details
        const labIds = [...new Set(orders.map(o => o.lab?.id).filter(Boolean))];
        let labDetailsMap = {};
        if (labIds.length > 0) {
            const { data: labDetails } = await supabase
                .from("lab_details")
                .select("id, lab_name, address")
                .in("id", labIds);
            (labDetails || []).forEach(l => { labDetailsMap[l.id] = l; });
        }

        const enrichedOrders = orders.map(o => ({
            ...o,
            lab_details: labDetailsMap[o.lab?.id] || null,
        }));

        return success("Order history fetched", {
            orders: enrichedOrders,
            pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
        }, 200, { headers: corsHeaders });

    } catch (error) {
        console.error("Patient order history error:", error);
        return failure("Failed to fetch order history", error.message, 500, { headers: corsHeaders });
    }
}
