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

    // Global Stats for this lab (KPI Cards)
    const statsQuery = await sql`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN LOWER(status) IN ('pending', 'sent_to_lab') THEN 1 END)::int as pending,
        COUNT(CASE WHEN LOWER(status) IN ('approved', 'sample_collected', 'processing') THEN 1 END)::int as in_progress,
        COUNT(CASE WHEN LOWER(status) = 'completed' THEN 1 END)::int as completed,
        COUNT(CASE WHEN LOWER(status) = 'rejected' THEN 1 END)::int as rejected,
        COALESCE(SUM(CASE WHEN LOWER(status) = 'completed' THEN total_amount ELSE 0 END), 0)::float as revenue
      FROM lab_test_orders
      WHERE lab_id = ${cleanLabId}
    `;

    // Build dynamic WHERE conditions
    let countQuery;
    let ordersQuery;

    const hasSearch = search.length > 0;
    const hasStatus = statusFilter && statusFilter !== "all";
    const isTabInProgress = statusFilter === "in_progress";
    const isTabPending = statusFilter === "pending";

    const statusConditions = isTabInProgress
      ? sql`LOWER(lto.status) IN ('approved', 'sample_collected', 'processing')`
      : isTabPending
      ? sql`LOWER(lto.status) IN ('pending', 'sent_to_lab')`
      : sql`LOWER(lto.status) = LOWER(${statusFilter})`;

    if (!hasSearch && !hasStatus) {
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
          lto.payment_status,
          COALESCE(lto.collection_type, lto.visit_type, 'walk_in') as collection_type,
          lto.total_amount,
          lto.prescription_id,
          lto.created_at,
          lto.technician_name,
          lto.technician_phone,
          lto.technician_vehicle,
          (SELECT COUNT(*)::int FROM lab_test_order_items WHERE order_id = lto.id) as items_count,
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
          lto.payment_status,
          COALESCE(lto.collection_type, lto.visit_type, 'walk_in') as collection_type,
          lto.total_amount,
          lto.prescription_id,
          lto.created_at,
          lto.technician_name,
          lto.technician_phone,
          lto.technician_vehicle,
          (SELECT COUNT(*)::int FROM lab_test_order_items WHERE order_id = lto.id) as items_count,
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
            pd.full_name ILIKE ${searchLike}
            OR u.phone_number ILIKE ${searchLike}
            OR lto.unid::text ILIKE ${searchLike}
          )
        ORDER BY lto.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (!hasSearch && hasStatus) {
      countQuery = await sql`
        SELECT COUNT(*)::int as count
        FROM lab_test_orders lto
        WHERE lto.lab_id = ${cleanLabId}
          AND ${statusConditions}
      `;

      ordersQuery = await sql`
        SELECT 
          lto.id,
          lto.unid,
          lto.status,
          lto.payment_status,
          COALESCE(lto.collection_type, lto.visit_type, 'walk_in') as collection_type,
          lto.total_amount,
          lto.prescription_id,
          lto.created_at,
          lto.technician_name,
          lto.technician_phone,
          lto.technician_vehicle,
          (SELECT COUNT(*)::int FROM lab_test_order_items WHERE order_id = lto.id) as items_count,
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
          AND ${statusConditions}
        ORDER BY lto.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      const searchLike = `%${search}%`;
      countQuery = await sql`
        SELECT COUNT(*)::int as count
        FROM lab_test_orders lto
        LEFT JOIN users u ON u.id = lto.patient_id
        LEFT JOIN patient_details pd ON pd.id = lto.patient_id
        WHERE lto.lab_id = ${cleanLabId}
          AND ${statusConditions}
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
          lto.payment_status,
          COALESCE(lto.collection_type, lto.visit_type, 'walk_in') as collection_type,
          lto.total_amount,
          lto.prescription_id,
          lto.created_at,
          lto.technician_name,
          lto.technician_phone,
          lto.technician_vehicle,
          (SELECT COUNT(*)::int FROM lab_test_order_items WHERE order_id = lto.id) as items_count,
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
          AND ${statusConditions}
          AND (
            pd.full_name ILIKE ${searchLike}
            OR u.phone_number ILIKE ${searchLike}
            OR lto.unid::text ILIKE ${searchLike}
          )
        ORDER BY lto.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    const total = countQuery[0]?.count || 0;
    const stats = statsQuery[0] || {
      total: 0,
      pending: 0,
      in_progress: 0,
      completed: 0,
      rejected: 0,
      revenue: 0,
    };

    return new Response(
      JSON.stringify({
        status: true,
        total,
        page,
        limit,
        stats,
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
