export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import dayjs from "dayjs";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

// GET /api/admin/labs/orders
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").trim();
    const status = searchParams.get("status") || "all";
    const paymentStatus = searchParams.get("payment_status") || "all";
    const visitType = searchParams.get("visit_type") || "all";
    const labId = searchParams.get("lab_id") || "all";
    const dateRange = searchParams.get("dateRange") || "all";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    // Date range bounds
    let startIso = null;
    let endIso = dayjs().endOf('day').toISOString();
    const today = dayjs();

    if (dateRange === "today") {
      startIso = today.startOf("day").toISOString();
    } else if (dateRange === "week") {
      startIso = today.subtract(7, "day").startOf("day").toISOString();
    } else if (dateRange === "month") {
      startIso = today.subtract(1, "month").startOf("day").toISOString();
    } else if (dateRange === "quarter") {
      startIso = today.subtract(3, "month").startOf("day").toISOString();
    }

    // 1. Calculate overall summary aggregates across all lab orders with category-based commission
    const [summaryRes] = await sql`
      WITH item_categories AS (
        SELECT 
          oi.id as item_id,
          oi.order_id,
          COALESCE(oi.price, 0)::numeric as item_price,
          COALESCE(
            c_by_id.commission_percentage,
            c_by_name.commission_percentage,
            50.00
          )::numeric as commission_percentage
        FROM lab_test_order_items oi
        LEFT JOIN lab_tests t_by_id ON oi.test_id = t_by_id.id
        LEFT JOIN lab_test_categories c_by_id ON t_by_id.category_id = c_by_id.id
        LEFT JOIN LATERAL (
          SELECT t2.category_id 
          FROM lab_tests t2 
          WHERE LOWER(TRIM(t2.test_name)) = LOWER(TRIM(oi.test_name))
             OR t2.test_name ILIKE ('%' || oi.test_name || '%')
             OR oi.test_name ILIKE ('%' || t2.test_name || '%')
          LIMIT 1
        ) t_by_name ON t_by_id.id IS NULL
        LEFT JOIN lab_test_categories c_by_name ON t_by_name.category_id = c_by_name.id
      ),
      order_commissions AS (
        SELECT 
          order_id,
          ROUND(SUM(item_price * commission_percentage / 100.0), 2) as order_admin_commission
        FROM item_categories
        GROUP BY order_id
      )
      SELECT 
        COUNT(o.id)::int as total_orders,
        COUNT(o.id) FILTER (WHERE o.payment_status = 'paid' OR o.status = 'completed')::int as paid_orders_count,
        COUNT(o.id) FILTER (WHERE o.payment_status = 'pending')::int as pending_orders_count,
        COUNT(o.id) FILTER (WHERE o.visit_type = 'home_collection')::int as home_collection_count,
        COUNT(o.id) FILTER (WHERE o.visit_type = 'walk_in')::int as walk_in_count,
        -- Paid Gross Volume
        COALESCE(SUM(o.total_amount) FILTER (WHERE o.payment_status = 'paid' OR o.status = 'completed'), 0)::numeric as paid_gross_volume,
        -- Paid Admin Commission Revenue
        COALESCE(SUM(oc.order_admin_commission) FILTER (WHERE o.payment_status = 'paid' OR o.status = 'completed'), 0)::numeric as paid_admin_commission,
        -- All Gross Volume
        COALESCE(SUM(o.total_amount), 0)::numeric as all_gross_volume,
        -- All Admin Potential Commission
        COALESCE(SUM(oc.order_admin_commission), 0)::numeric as all_admin_commission
      FROM lab_test_orders o
      LEFT JOIN order_commissions oc ON o.id = oc.order_id;
    `;

    const paidGross = Number(summaryRes?.paid_gross_volume || 0);
    const paidCommission = Number(summaryRes?.paid_admin_commission || 0);
    const labPayouts = Math.max(0, parseFloat((paidGross - paidCommission).toFixed(2)));

    // 2. Fetch paginated orders with item details, category assignment, and commission calculations
    const ordersQuery = await sql`
      WITH item_categories AS (
        SELECT 
          oi.id as item_id,
          oi.order_id,
          oi.unid as item_unid,
          oi.test_name,
          COALESCE(oi.price, 0)::numeric as item_price,
          oi.status as item_status,
          oi.notes as item_notes,
          COALESCE(
            c_by_id.name, 
            c_by_name.name,
            CASE 
              WHEN oi.test_name ILIKE '%package%' OR oi.test_name ILIKE '%checkup%' THEN 'All Test Packages'
              ELSE 'Category 1'
            END
          ) as category_name,
          COALESCE(
            c_by_id.commission_percentage,
            c_by_name.commission_percentage,
            50.00
          )::numeric as commission_percentage
        FROM lab_test_order_items oi
        LEFT JOIN lab_tests t_by_id ON oi.test_id = t_by_id.id
        LEFT JOIN lab_test_categories c_by_id ON t_by_id.category_id = c_by_id.id
        LEFT JOIN LATERAL (
          SELECT t2.category_id 
          FROM lab_tests t2 
          WHERE LOWER(TRIM(t2.test_name)) = LOWER(TRIM(oi.test_name))
             OR t2.test_name ILIKE ('%' || oi.test_name || '%')
             OR oi.test_name ILIKE ('%' || t2.test_name || '%')
          LIMIT 1
        ) t_by_name ON t_by_id.id IS NULL
        LEFT JOIN lab_test_categories c_by_name ON t_by_name.category_id = c_by_name.id
      ),
      item_commissions AS (
        SELECT 
          ic.*,
          ROUND((ic.item_price * ic.commission_percentage / 100.0), 2) as admin_commission,
          ROUND(ic.item_price - (ic.item_price * ic.commission_percentage / 100.0), 2) as lab_share
        FROM item_categories ic
      ),
      order_summaries AS (
        SELECT 
          order_id,
          COUNT(item_id)::int as items_count,
          COALESCE(SUM(admin_commission), 0)::numeric as total_admin_commission,
          COALESCE(SUM(lab_share), 0)::numeric as total_lab_share,
          COALESCE(SUM(item_price), 0)::numeric as items_subtotal,
          json_agg(
            json_build_object(
              'item_id', item_id,
              'unid', item_unid,
              'test_name', test_name,
              'price', item_price,
              'category_name', category_name,
              'commission_percentage', commission_percentage,
              'admin_commission', admin_commission,
              'lab_share', lab_share,
              'status', item_status,
              'notes', item_notes
            ) ORDER BY item_unid ASC
          ) as items_json
        FROM item_commissions
        GROUP BY order_id
      )
      SELECT 
        o.id,
        o.unid,
        o.patient_id,
        o.lab_id,
        o.prescription_id,
        o.care_episode_id,
        o.status,
        o.payment_status,
        o.total_amount::numeric,
        o.visit_type,
        o.patient_notes,
        o.lab_notes,
        o.delivery_address,
        o.razorpay_order_id,
        o.razorpay_payment_id,
        o.technician_name,
        o.technician_phone,
        o.technician_status,
        o.created_at,
        o.updated_at,
        -- Patient info
        p.full_name as patient_name,
        COALESCE(u.phone_number, o.delivery_address->>'phone', p.emergency_contact, 'N/A') as patient_phone,
        p.email as patient_email,
        p.gender as patient_gender,
        p.date_of_birth as patient_dob,
        p.blood_group as patient_blood_group,
        -- Lab info
        l.lab_name,
        l.owner_name as lab_owner,
        l.phone_number as lab_phone,
        l.email as lab_email,
        l.address as lab_address,
        l.rating as lab_rating,
        -- Prescribing Doctor info (if linked)
        doc.full_name as doctor_name,
        doc.specialization as doctor_specialization,
        -- Commission & Items summary
        COALESCE(os.items_count, 0)::int as items_count,
        COALESCE(os.items_subtotal, 0)::numeric as items_subtotal,
        COALESCE(os.total_admin_commission, 0)::numeric as total_admin_commission,
        COALESCE(os.total_lab_share, 0)::numeric as total_lab_share,
        COALESCE(os.items_json, '[]'::json) as items,
        -- Attached Reports count
        (SELECT COUNT(*)::int FROM lab_reports lr WHERE lr.order_id = o.id) as reports_count,
        -- Consents logged count
        (SELECT COUNT(*)::int FROM lab_order_consents loc WHERE loc.order_id = o.id) as consents_count,
        -- Total matching count for pagination
        COUNT(*) OVER()::int as filtered_total
      FROM lab_test_orders o
      LEFT JOIN patient_details p ON o.patient_id = p.id
      LEFT JOIN users u ON o.patient_id = u.id
      LEFT JOIN lab_details l ON o.lab_id = l.id
      LEFT JOIN prescriptions rx ON o.prescription_id = rx.id
      LEFT JOIN doctor_details doc ON rx.doctor_id = doc.id
      LEFT JOIN order_summaries os ON o.id = os.order_id
      WHERE 
        (${status} = 'all' OR o.status = ${status})
        AND (${paymentStatus} = 'all' OR o.payment_status = ${paymentStatus})
        AND (${visitType} = 'all' OR o.visit_type = ${visitType})
        AND (${labId} = 'all' OR o.lab_id::text = ${labId})
        AND (${startIso}::timestamp with time zone IS NULL OR o.created_at >= ${startIso}::timestamp with time zone)
        AND (${endIso}::timestamp with time zone IS NULL OR o.created_at <= ${endIso}::timestamp with time zone)
        AND (
          ${search} = ''
          OR o.id::text ILIKE ('%' || ${search} || '%')
          OR o.unid::text ILIKE ('%' || ${search} || '%')
          OR COALESCE(p.full_name, '') ILIKE ('%' || ${search} || '%')
          OR COALESCE(u.phone_number, '') ILIKE ('%' || ${search} || '%')
          OR COALESCE(o.delivery_address->>'phone', '') ILIKE ('%' || ${search} || '%')
          OR COALESCE(l.lab_name, '') ILIKE ('%' || ${search} || '%')
          OR COALESCE(o.technician_name, '') ILIKE ('%' || ${search} || '%')
          OR COALESCE(o.razorpay_order_id, '') ILIKE ('%' || ${search} || '%')
          OR COALESCE(o.razorpay_payment_id, '') ILIKE ('%' || ${search} || '%')
        )
      ORDER BY o.created_at DESC
      LIMIT ${limit} OFFSET ${offset};
    `;

    const filteredTotal = ordersQuery[0]?.filtered_total || 0;
    const totalPages = Math.ceil(filteredTotal / limit) || 1;

    // Calculate effective commission and lab payout per order
    const formattedOrders = ordersQuery.map(row => {
      const grossAmount = Number(row.total_amount) || 0;
      const adminComm = Number(row.total_admin_commission) || 0;
      // Home collection fee (+150) goes to lab/phlebotomist or remains in gross
      const labPayout = Math.max(0, parseFloat((grossAmount - adminComm).toFixed(2)));
      const effectiveRate = grossAmount > 0 ? Math.round((adminComm / grossAmount) * 100) : 0;

      let patientAge = null;
      if (row.patient_dob) {
        patientAge = dayjs().diff(dayjs(row.patient_dob), 'year');
      }

      return {
        id: row.id,
        unid: row.unid,
        status: row.status,
        payment_status: row.payment_status,
        total_amount: grossAmount,
        visit_type: row.visit_type,
        home_collection_fee: row.visit_type === 'home_collection' ? 150 : 0,
        patient_notes: row.patient_notes,
        lab_notes: row.lab_notes,
        delivery_address: row.delivery_address,
        razorpay_order_id: row.razorpay_order_id,
        razorpay_payment_id: row.razorpay_payment_id,
        technician: {
          name: row.technician_name,
          phone: row.technician_phone,
          status: row.technician_status || 'unassigned',
        },
        patient: {
          id: row.patient_id,
          full_name: row.patient_name || 'Patient',
          phone_number: row.patient_phone || 'N/A',
          email: row.patient_email || 'N/A',
          gender: row.patient_gender,
          blood_group: row.patient_blood_group,
          age: patientAge,
        },
        lab: {
          id: row.lab_id,
          lab_name: row.lab_name || 'Assigned Laboratory',
          owner_name: row.lab_owner,
          phone_number: row.lab_phone,
          email: row.lab_email,
          address: row.lab_address,
          city: row.lab_city,
          rating: row.lab_rating,
        },
        prescription: row.prescription_id ? {
          id: row.prescription_id,
          doctor_name: row.doctor_name,
          doctor_specialization: row.doctor_specialization,
        } : null,
        items_count: row.items_count,
        items_subtotal: Number(row.items_subtotal),
        admin_commission: adminComm,
        lab_payout: labPayout,
        effective_commission_rate: effectiveRate,
        items: row.items,
        reports_count: row.reports_count,
        consents_count: row.consents_count,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    const payload = {
      summary: {
        totalOrders: summaryRes?.total_orders || 0,
        paidOrdersCount: summaryRes?.paid_orders_count || 0,
        pendingOrdersCount: summaryRes?.pending_orders_count || 0,
        homeCollectionCount: summaryRes?.home_collection_count || 0,
        walkInCount: summaryRes?.walk_in_count || 0,
        grossVolume: paidGross,
        adminCommissionRevenue: paidCommission, // Platform earned revenue
        labPayouts: labPayouts,                 // Disbursed to partner labs
        allGrossVolume: Number(summaryRes?.all_gross_volume || 0),
        allPotentialCommission: Number(summaryRes?.all_admin_commission || 0),
      },
      orders: formattedOrders,
      pagination: {
        total: filteredTotal,
        page,
        limit,
        totalPages,
      },
    };

    return success("Lab orders with commission fetched successfully", payload, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("[Admin Lab Orders GET] Error:", error);
    return failure("Failed to fetch lab orders", error.message, 500, { headers: corsHeaders });
  }
}
