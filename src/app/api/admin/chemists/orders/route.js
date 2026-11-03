import { NextResponse } from "next/server";
import sql from "@/lib/db";

// GET /api/admin/chemists/orders
// Returns paginated chemist medicine orders with search, filters, and KPI summary
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get("limit") || "15", 10)));
    const offset = (page - 1) * limit;

    const search = (searchParams.get("search") || "").trim();
    const status = searchParams.get("status") || "all";
    const paymentStatus = searchParams.get("payment_status") || "all";
    const chemistId = searchParams.get("chemist_id") || "all";
    const dateRange = searchParams.get("dateRange") || "all";

    // Build SQL conditions
    const conditions = [];

    if (search) {
      conditions.push(sql`(
        mo.id::text ILIKE ${`%${search}%`} OR
        mo.unid::text ILIKE ${`%${search}%`} OR
        cd.pharmacy_name ILIKE ${`%${search}%`} OR
        cd.owner_name ILIKE ${`%${search}%`} OR
        cd.mobile ILIKE ${`%${search}%`} OR
        pd.full_name ILIKE ${`%${search}%`} OR
        u.phone_number ILIKE ${`%${search}%`} OR
        mo.utr_number ILIKE ${`%${search}%`} OR
        mo.payu_txnid ILIKE ${`%${search}%`}
      )`);
    }

    if (status !== "all") {
      conditions.push(sql`mo.status = ${status}`);
    }

    if (paymentStatus !== "all") {
      conditions.push(sql`mo.payment_status = ${paymentStatus}`);
    }

    if (chemistId !== "all") {
      conditions.push(sql`mo.chemist_id = ${chemistId}`);
    }

    if (dateRange !== "all") {
      if (dateRange === "today") {
        conditions.push(sql`mo.created_at >= CURRENT_DATE`);
      } else if (dateRange === "yesterday") {
        conditions.push(sql`mo.created_at >= CURRENT_DATE - INTERVAL '1 day' AND mo.created_at < CURRENT_DATE`);
      } else if (dateRange === "7days") {
        conditions.push(sql`mo.created_at >= CURRENT_DATE - INTERVAL '7 days'`);
      } else if (dateRange === "30days") {
        conditions.push(sql`mo.created_at >= CURRENT_DATE - INTERVAL '30 days'`);
      } else if (dateRange === "this_month") {
        conditions.push(sql`date_trunc('month', mo.created_at) = date_trunc('month', CURRENT_DATE)`);
      }
    }

    const whereClause = conditions.length > 0 ? sql`WHERE ${conditions.reduce((prev, curr) => sql`${prev} AND ${curr}`)}` : sql``;

    // Fetch KPI Summary
    const [summaryResult] = await sql`
      SELECT 
        COUNT(*)::int as total_orders,
        COUNT(*) FILTER (WHERE status IN ('pending', 'payment_pending', 'payment_submitted', 'preparing', 'dispatched'))::int as active_orders,
        COUNT(*) FILTER (WHERE status IN ('delivered', 'completed'))::int as delivered_orders,
        COUNT(*) FILTER (WHERE status IN ('cancelled', 'rejected'))::int as cancelled_orders,
        COUNT(*) FILTER (WHERE payment_status = 'paid')::int as paid_orders,
        COUNT(*) FILTER (WHERE payment_status = 'pending')::int as pending_payments,
        COALESCE(SUM(total_amount) FILTER (WHERE status IN ('delivered', 'completed') OR payment_status = 'paid'), 0)::numeric as total_revenue,
        COALESCE(SUM(total_amount), 0)::numeric as gross_value
      FROM medicine_orders;
    `;

    // Fetch Total count for current filter
    const [countResult] = await sql`
      SELECT COUNT(*)::int as total
      FROM medicine_orders mo
      LEFT JOIN chemist_details cd ON cd.id = mo.chemist_id
      LEFT JOIN users u ON u.id = mo.patient_id
      LEFT JOIN patient_details pd ON pd.id = u.id
      ${whereClause};
    `;
    const total = countResult?.total || 0;

    // Fetch Paginated Orders
    const orders = await sql`
      SELECT 
        mo.id,
        mo.unid,
        mo.prescription_id,
        mo.patient_id,
        mo.chemist_id,
        mo.status,
        mo.delivery_type,
        mo.total_amount,
        mo.medicine_subtotal,
        mo.delivery_charge,
        mo.discount,
        mo.patient_notes,
        mo.chemist_notes,
        mo.payment_method,
        mo.payment_status,
        mo.utr_number,
        mo.payment_proof_url,
        mo.payu_txnid,
        mo.payu_mihpayid,
        mo.razorpay_payment_id,
        mo.chemist_payout_amount,
        mo.platform_commission_amount,
        mo.settlement_status,
        mo.promised_delivery_at,
        mo.actual_delivery_at,
        mo.created_at,
        mo.updated_at,
        cd.pharmacy_name,
        cd.owner_name as chemist_owner,
        cd.mobile as chemist_mobile,
        cd.email as chemist_email,
        cd.address as chemist_address,
        pd.full_name as patient_name,
        u.phone_number as patient_phone,
        pd.email as patient_email,
        pd.address as patient_address,
        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', moi.id,
                'medicine_name', moi.medicine_name,
                'dosage', moi.dosage,
                'quantity', moi.quantity,
                'price', moi.price,
                'status', moi.status
              )
            )
            FROM medicine_order_items moi
            WHERE moi.order_id = mo.id
          ),
          '[]'::jsonb
        ) as items,
        (
          SELECT COUNT(*)::int
          FROM medicine_order_items moi
          WHERE moi.order_id = mo.id
        ) as item_count
      FROM medicine_orders mo
      LEFT JOIN chemist_details cd ON cd.id = mo.chemist_id
      LEFT JOIN users u ON u.id = mo.patient_id
      LEFT JOIN patient_details pd ON pd.id = u.id
      ${whereClause}
      ORDER BY mo.created_at DESC
      LIMIT ${limit} OFFSET ${offset};
    `;

    // Fetch Chemists list for filter dropdown
    const chemists = await sql`
      SELECT id, pharmacy_name, owner_name 
      FROM chemist_details 
      ORDER BY pharmacy_name ASC;
    `;

    return NextResponse.json({
      success: true,
      data: {
        orders,
        summary: summaryResult || {
          total_orders: 0,
          active_orders: 0,
          delivered_orders: 0,
          cancelled_orders: 0,
          paid_orders: 0,
          pending_payments: 0,
          total_revenue: 0,
          gross_value: 0,
        },
        chemists,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    console.error("Admin chemist orders GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch chemist orders" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/chemists/orders
// Update order status or payment status from admin panel
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { orderId, status, payment_status, chemist_notes, settlement_status } = body;

    if (!orderId) {
      return NextResponse.json({ success: false, error: "Order ID is required" }, { status: 400 });
    }

    const updates = {};
    if (status !== undefined) updates.status = status;
    if (payment_status !== undefined) updates.payment_status = payment_status;
    if (chemist_notes !== undefined) updates.chemist_notes = chemist_notes;
    if (settlement_status !== undefined) updates.settlement_status = settlement_status;
    updates.updated_at = new Date();

    if (status === "delivered" || status === "completed") {
      updates.actual_delivery_at = new Date();
    }
    if (payment_status === "paid") {
      updates.payment_verified_at = new Date();
    }

    await sql`
      UPDATE medicine_orders
      SET ${sql(updates)}
      WHERE id = ${orderId};
    `;

    return NextResponse.json({
      success: true,
      message: "Order updated successfully",
    });
  } catch (error) {
    console.error("Admin chemist orders PATCH error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update chemist order" },
      { status: 500 }
    );
  }
}

