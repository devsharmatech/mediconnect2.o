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
    const search = (searchParams.get("search") || "").trim();
    const statusFilter = searchParams.get("status") || "all";

    if (!cleanLabId) {
      return new Response(
        JSON.stringify({ status: false, message: "Valid lab_id missing" }),
        { headers: corsHeaders, status: 400 }
      );
    }

    const offset = (page - 1) * limit;

    // Build dynamic WHERE conditions
    let countQuery;
    let ordersQuery;

    const hasSearch = search.length > 0;
    const hasStatus = statusFilter && statusFilter !== "all";

    if (!hasSearch && !hasStatus) {
      // Simple query - no filters
      countQuery = await sql`
        SELECT COUNT(*)::int as count
        FROM lab_test_orders
        WHERE lab_id = ${cleanLabId}
      `;

      ordersQuery = await sql`
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
    } else if (hasSearch && !hasStatus) {
      const searchLike = `%${search}%`;
      countQuery = await sql`
        SELECT COUNT(*)::int as count
        FROM lab_test_orders lto
        LEFT JOIN users u ON u.id = lto.patient_id
        LEFT JOIN patient_details pd ON pd.id = lto.patient_id
        WHERE lto.lab_id = ${cleanLabId}
          AND (
            pd.full_name ILIKE ${searchLike}
            OR u.phone_number ILIKE ${searchLike}
            OR lto.unid::text ILIKE ${searchLike}
          )
      `;

      ordersQuery = await sql`
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
          AND (
            pd.full_name ILIKE ${`%${search}%`}
            OR u.phone_number ILIKE ${`%${search}%`}
            OR lto.unid::text ILIKE ${`%${search}%`}
          )
        ORDER BY lto.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (!hasSearch && hasStatus) {
      countQuery = await sql`
        SELECT COUNT(*)::int as count
        FROM lab_test_orders
        WHERE lab_id = ${cleanLabId}
          AND status = ${statusFilter}
      `;

      ordersQuery = await sql`
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
          AND lto.status = ${statusFilter}
        ORDER BY lto.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      // Both search and status
      countQuery = await sql`
        SELECT COUNT(*)::int as count
        FROM lab_test_orders lto
        LEFT JOIN users u ON u.id = lto.patient_id
        LEFT JOIN patient_details pd ON pd.id = lto.patient_id
        WHERE lto.lab_id = ${cleanLabId}
          AND lto.status = ${statusFilter}
          AND (
            pd.full_name ILIKE ${`%${search}%`}
            OR u.phone_number ILIKE ${`%${search}%`}
            OR lto.unid::text ILIKE ${`%${search}%`}
          )
      `;

      ordersQuery = await sql`
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
          AND lto.status = ${statusFilter}
          AND (
            pd.full_name ILIKE ${`%${search}%`}
            OR u.phone_number ILIKE ${`%${search}%`}
            OR lto.unid::text ILIKE ${`%${search}%`}
          )
        ORDER BY lto.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    const total = countQuery[0]?.count || 0;

    return new Response(
      JSON.stringify({
        status: true,
        total,
        page,
        limit,
        orders: ordersQuery,
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
