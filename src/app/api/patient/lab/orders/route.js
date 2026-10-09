import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

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

        const offset = (page - 1) * limit;

        // Count total - only show confirmed orders:
        // Exclude uncompleted/abandoned checkout drafts where payment is pending and status is pending
        let countRes;
        if (status) {
            countRes = await sql`
                SELECT COUNT(*)::int as count 
                FROM lab_test_orders 
                WHERE patient_id = ${patient_id} 
                  AND status = ${status}
                  AND (payment_status = 'paid' OR status != 'pending')
            `;
        } else {
            countRes = await sql`
                SELECT COUNT(*)::int as count 
                FROM lab_test_orders 
                WHERE patient_id = ${patient_id}
                  AND (payment_status = 'paid' OR status != 'pending')
            `;
        }
        const count = countRes[0]?.count || 0;

        // Fetch orders - only confirmed/paid orders
        let orders;
        if (status) {
            orders = await sql`
                SELECT 
                    lto.*,
                    json_build_object(
                        'id', ld.id,
                        'lab_name', ld.lab_name,
                        'address', ld.address,
                        'phone_number', ld.phone_number
                    ) as lab_details
                FROM lab_test_orders lto
                LEFT JOIN lab_details ld ON ld.id = lto.lab_id
                WHERE lto.patient_id = ${patient_id} 
                  AND lto.status = ${status}
                  AND (lto.payment_status = 'paid' OR lto.status != 'pending')
                ORDER BY lto.created_at DESC
                LIMIT ${limit} OFFSET ${offset}
            `;
        } else {
            orders = await sql`
                SELECT 
                    lto.*,
                    json_build_object(
                        'id', ld.id,
                        'lab_name', ld.lab_name,
                        'address', ld.address,
                        'phone_number', ld.phone_number
                    ) as lab_details
                FROM lab_test_orders lto
                LEFT JOIN lab_details ld ON ld.id = lto.lab_id
                WHERE lto.patient_id = ${patient_id}
                  AND (lto.payment_status = 'paid' OR lto.status != 'pending')
                ORDER BY lto.created_at DESC
                LIMIT ${limit} OFFSET ${offset}
            `;
        }

        return success("Order history fetched", {
            orders,
            pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
        }, 200, { headers: corsHeaders });

    } catch (error) {
        console.error("Patient order history error:", error);
        return failure("Failed to fetch order history", error.message, 500, { headers: corsHeaders });
    }
}
