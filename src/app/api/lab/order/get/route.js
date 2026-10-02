import sql from "@/lib/db";
import { corsHeaders } from "@/lib/cors";

const safeUuid = (val) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ? val : null);

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const rawLabId = searchParams.get("lab_id");
    const cleanLabId = safeUuid(rawLabId);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.max(1, Number(searchParams.get("limit") || 10));

    if (!cleanLabId) {
      return new Response(
        JSON.stringify({ status: false, message: "Valid lab_id missing" }),
        { headers: corsHeaders, status: 400 }
      );
    }

    const offset = (page - 1) * limit;

    // Count total orders
    const countRes = await sql`
      SELECT COUNT(*)::int as count
      FROM lab_test_orders
      WHERE lab_id = ${cleanLabId}
    `;
    const total = countRes[0]?.count || 0;

    // Fetch orders with patient info
    const orders = await sql`
      SELECT 
        lto.id,
        lto.unid,
        lto.status,
        lto.total_amount,
        lto.created_at,
        json_build_object(
          'phone_number', u.phone_number,
          'patient_details', json_build_object(
            'full_name', pd.full_name,
            'email', pd.email,
            'gender', pd.gender,
            'address', pd.address
          )
        ) as patient
      FROM lab_test_orders lto
      LEFT JOIN users u ON u.id = lto.patient_id
      LEFT JOIN patient_details pd ON pd.id = lto.patient_id
      WHERE lto.lab_id = ${cleanLabId}
      ORDER BY lto.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return new Response(
      JSON.stringify({
        status: true,
        total,
        page,
        limit,
        orders,
      }),
      { headers: corsHeaders, status: 200 }
    );
  } catch (err) {
    console.error("GET lab/order/get error:", err);
    return new Response(
      JSON.stringify({ status: false, message: err.message }),
      { headers: corsHeaders, status: 500 }
    );
  }
}
