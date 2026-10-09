import sql from "@/lib/db";
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

        if (!id) {
            return failure("Order ID is required", null, 400, { headers: corsHeaders });
        }

        let orders;
        if (patient_id) {
            orders = await sql`
                SELECT 
                    lto.*,
                    ld.lab_name,
                    ld.address as lab_address,
                    ld.phone_number as lab_phone,
                    ld.opening_hours,
                    ld.accepts_home_collection
                FROM lab_test_orders lto
                LEFT JOIN lab_details ld ON ld.id = lto.lab_id
                WHERE lto.id = ${id} AND lto.patient_id = ${patient_id}
                LIMIT 1
            `;
        } else {
            orders = await sql`
                SELECT 
                    lto.*,
                    ld.lab_name,
                    ld.address as lab_address,
                    ld.phone_number as lab_phone,
                    ld.opening_hours,
                    ld.accepts_home_collection
                FROM lab_test_orders lto
                LEFT JOIN lab_details ld ON ld.id = lto.lab_id
                WHERE lto.id = ${id}
                LIMIT 1
            `;
        }

        if (orders.length === 0) {
            return failure("Order not found", null, 404, { headers: corsHeaders });
        }

        const order = orders[0];

        // Fetch order items
        const items = await sql`
            SELECT * FROM lab_test_order_items
            WHERE order_id = ${id}
            ORDER BY unid ASC
        `;

        // Fetch consents
        const consents = await sql`
            SELECT * FROM lab_order_consents
            WHERE order_id = ${id}
            LIMIT 1
        `;

        const result = {
            ...order,
            order,
            items,
            consent: consents[0] || null,
        };

        return success("Order details fetched", result, 200, { headers: corsHeaders });

    } catch (error) {
        console.error("Order detail error:", error);
        return failure("Failed to fetch order details", error.message, 500, { headers: corsHeaders });
    }
}
