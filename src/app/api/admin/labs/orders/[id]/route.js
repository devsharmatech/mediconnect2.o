export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import dayjs from "dayjs";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

// GET /api/admin/labs/orders/[id] - Fetch complete detail of a specific lab test order
export async function GET(req, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return failure("Order ID is required", null, 400, { headers: corsHeaders });
    }

    // 1. Fetch Order and joined patient, lab, and prescription doctor details
    const orderRows = await sql`
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
        -- Patient Details
        p.full_name as patient_name,
        COALESCE(u.phone_number, o.delivery_address->>'phone', p.emergency_contact, 'N/A') as patient_phone,
        p.email as patient_email,
        p.gender as patient_gender,
        p.date_of_birth as patient_dob,
        p.blood_group as patient_blood_group,
        p.address as patient_address,
        p.emergency_contact as patient_emergency_phone,
        -- Lab Details
        l.lab_name,
        l.owner_name as lab_owner,
        l.phone_number as lab_phone,
        l.email as lab_email,
        l.address as lab_address,
        l.license_number as lab_license,
        l.rating as lab_rating,
        l.accepts_home_collection as lab_accepts_home_collection,
        -- Prescription Details
        rx.diagnosis as rx_diagnosis,
        rx.vital_signs as rx_vitals,
        rx.signed_at as rx_signed_at,
        rx.status as rx_status,
        rx.file_url as rx_file_url,
        doc.id as doctor_id,
        doc.full_name as doctor_name,
        doc.specialization as doctor_specialization,
        doc.license_number as doctor_license
      FROM lab_test_orders o
      LEFT JOIN patient_details p ON o.patient_id = p.id
      LEFT JOIN users u ON o.patient_id = u.id
      LEFT JOIN lab_details l ON o.lab_id = l.id
      LEFT JOIN prescriptions rx ON o.prescription_id = rx.id
      LEFT JOIN doctor_details doc ON rx.doctor_id = doc.id
      WHERE o.id::text = ${id} OR o.unid::text = ${id}
      LIMIT 1;
    `;

    if (orderRows.length === 0) {
      return failure("Lab test order not found", null, 404, { headers: corsHeaders });
    }

    const order = orderRows[0];
    const orderUuid = order.id;

    // 2. Fetch Order Items with category matching and commission calculation
    const items = await sql`
      WITH item_categories AS (
        SELECT 
          oi.id as item_id,
          oi.order_id,
          oi.unid as item_unid,
          oi.test_name,
          COALESCE(oi.price, 0)::numeric as item_price,
          oi.status as item_status,
          oi.notes as item_notes,
          oi.test_id,
          COALESCE(
            c_by_id.name, 
            c_by_name.name,
            CASE 
              WHEN oi.test_name ILIKE '%package%' OR oi.test_name ILIKE '%checkup%' THEN 'All Test Packages'
              ELSE 'Category 1'
            END
          ) as category_name,
          COALESCE(
            c_by_id.slug,
            c_by_name.slug,
            'category-1'
          ) as category_slug,
          COALESCE(
            c_by_id.commission_percentage,
            c_by_name.commission_percentage,
            50.00
          )::numeric as commission_percentage
        FROM lab_test_order_items oi
        LEFT JOIN lab_tests t_by_id ON oi.test_id = t_by_id.id
        LEFT JOIN lab_test_categories c_by_id ON t_by_id.category_id = c_by_id.id
        LEFT JOIN LATERAL (
          SELECT t2.category_id, t2.id as matched_test_id
          FROM lab_tests t2 
          WHERE LOWER(TRIM(t2.test_name)) = LOWER(TRIM(oi.test_name))
             OR t2.test_name ILIKE ('%' || oi.test_name || '%')
             OR oi.test_name ILIKE ('%' || t2.test_name || '%')
          LIMIT 1
        ) t_by_name ON t_by_id.id IS NULL
        LEFT JOIN lab_test_categories c_by_name ON t_by_name.category_id = c_by_name.id
        WHERE oi.order_id = ${orderUuid}
      )
      SELECT 
        ic.*,
        ROUND((ic.item_price * ic.commission_percentage / 100.0), 2)::numeric as admin_commission,
        ROUND(ic.item_price - (ic.item_price * ic.commission_percentage / 100.0), 2)::numeric as lab_share
      FROM item_categories ic
      ORDER BY ic.item_unid ASC;
    `;

    // 3. Fetch Legal Consents logged for this order
    const consents = await sql`
      SELECT 
        id,
        sample_collection_consent,
        data_sharing_consent,
        prescription_sharing_consent,
        terms_accepted,
        consent_timestamp,
        consent_version,
        device_type,
        ip_address,
        created_at
      FROM lab_order_consents
      WHERE order_id = ${orderUuid}
      ORDER BY created_at DESC;
    `;

    // 4. Fetch Uploaded Diagnostic Reports
    const reports = await sql`
      SELECT 
        id,
        report_url,
        test_type,
        result_summary,
        structured_results,
        created_at
      FROM lab_reports
      WHERE order_id = ${orderUuid}
      ORDER BY created_at DESC;
    `;

    // 5. Fetch Payment Logs
    const paymentLogs = await sql`
      SELECT 
        id,
        amount::numeric,
        currency,
        status,
        source,
        razorpay_order_id,
        razorpay_payment_id,
        error_details,
        created_at
      FROM lab_payment_logs
      WHERE order_id = ${orderUuid}
      ORDER BY created_at DESC;
    `;

    // 6. Fetch Activity Logs
    const activityLogs = await sql`
      SELECT 
        id,
        action_type,
        description,
        created_at
      FROM activity_log
      WHERE module_type = 'lab' AND (description ILIKE ('%' || ${orderUuid} || '%') OR description ILIKE ('%' || ${order.unid} || '%'))
      ORDER BY created_at DESC
      LIMIT 10;
    `;

    // Compute Financial Breakdown
    const grossAmount = Number(order.total_amount) || 0;
    const itemsSubtotal = items.reduce((sum, item) => sum + Number(item.item_price), 0);
    const homeCollectionFee = order.visit_type === 'home_collection' ? 150 : 0;
    const totalAdminCommission = items.reduce((sum, item) => sum + Number(item.admin_commission), 0);
    const totalLabShare = items.reduce((sum, item) => sum + Number(item.lab_share), 0) + homeCollectionFee;
    const effectiveCommissionRate = grossAmount > 0 ? Math.round((totalAdminCommission / grossAmount) * 100) : 0;

    let patientAge = null;
    if (order.patient_dob) {
      patientAge = dayjs().diff(dayjs(order.patient_dob), 'year');
    }

    const payload = {
      order: {
        id: order.id,
        unid: order.unid,
        status: order.status,
        payment_status: order.payment_status,
        total_amount: grossAmount,
        visit_type: order.visit_type,
        patient_notes: order.patient_notes,
        lab_notes: order.lab_notes,
        delivery_address: order.delivery_address,
        razorpay_order_id: order.razorpay_order_id,
        razorpay_payment_id: order.razorpay_payment_id,
        created_at: order.created_at,
        updated_at: order.updated_at,
        technician: {
          name: order.technician_name,
          phone: order.technician_phone,
          status: order.technician_status || 'unassigned',
        },
      },
      patient: {
        id: order.patient_id,
        full_name: order.patient_name || 'Patient',
        phone_number: order.patient_phone || 'N/A',
        email: order.patient_email || 'N/A',
        gender: order.patient_gender,
        blood_group: order.patient_blood_group,
        date_of_birth: order.patient_dob,
        age: patientAge,
        address: order.patient_address,
        emergency_phone: order.patient_emergency_phone,
      },
      lab: {
        id: order.lab_id,
        lab_name: order.lab_name || 'Assigned Laboratory',
        owner_name: order.lab_owner,
        phone_number: order.lab_phone,
        email: order.lab_email,
        address: order.lab_address,
        license_number: order.lab_license,
        rating: order.lab_rating,
        accepts_home_collection: order.lab_accepts_home_collection,
      },
      prescription: order.prescription_id ? {
        id: order.prescription_id,
        doctor_id: order.doctor_id,
        doctor_name: order.doctor_name,
        doctor_specialization: order.doctor_specialization,
        doctor_license: order.doctor_license,
        diagnosis: order.rx_diagnosis,
        vitals: order.rx_vitals,
        signed_at: order.rx_signed_at,
        status: order.rx_status,
        file_url: order.rx_file_url,
      } : null,
      financials: {
        gross_total: grossAmount,
        items_subtotal: itemsSubtotal,
        home_collection_fee: homeCollectionFee,
        total_admin_commission: totalAdminCommission,
        total_lab_payout: totalLabShare,
        effective_commission_rate: effectiveCommissionRate,
      },
      items: items.map(i => ({
        id: i.item_id,
        unid: i.item_unid,
        test_name: i.test_name,
        price: Number(i.item_price),
        category_name: i.category_name,
        category_slug: i.category_slug,
        commission_percentage: Number(i.commission_percentage),
        admin_commission: Number(i.admin_commission),
        lab_share: Number(i.lab_share),
        status: i.item_status,
        notes: i.item_notes,
      })),
      consents: consents || [],
      reports: reports || [],
      payment_logs: paymentLogs || [],
      activity_logs: activityLogs || [],
    };

    return success("Order details retrieved successfully", payload, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("[Admin Lab Order Detail GET] Error:", error);
    return failure("Failed to fetch order details", error.message, 500, { headers: corsHeaders });
  }
}

// PATCH /api/admin/labs/orders/[id] - Update order status, technician, or notes
export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (!id) {
      return failure("Order ID is required", null, 400, { headers: corsHeaders });
    }

    const {
      status,
      payment_status,
      lab_notes,
      technician_name,
      technician_phone,
      technician_status,
    } = body;

    // Check existing order
    const existing = await sql`
      SELECT id, unid, status, payment_status, patient_id, lab_id
      FROM lab_test_orders
      WHERE id::text = ${id} OR unid::text = ${id}
      LIMIT 1;
    `;

    if (existing.length === 0) {
      return failure("Order not found", null, 404, { headers: corsHeaders });
    }

    const currentOrder = existing[0];

    // Perform update
    const updated = await sql`
      UPDATE lab_test_orders
      SET
        status = COALESCE(${status}, status),
        payment_status = COALESCE(${payment_status}, payment_status),
        lab_notes = COALESCE(${lab_notes}, lab_notes),
        technician_name = COALESCE(${technician_name}, technician_name),
        technician_phone = COALESCE(${technician_phone}, technician_phone),
        technician_status = COALESCE(${technician_status}, technician_status),
        updated_at = NOW()
      WHERE id = ${currentOrder.id}
      RETURNING *;
    `;

    // Log admin activity audit record in AWS RDS
    try {
      await sql`
        INSERT INTO activity_log (
          patient_id,
          actor_id,
          module_type,
          action_type,
          description,
          created_at
        ) VALUES (
          ${currentOrder.patient_id},
          ${currentOrder.lab_id},
          'lab',
          'admin_update',
          ${`Admin updated lab test order #${currentOrder.unid} status to ${status || currentOrder.status}, payment: ${payment_status || currentOrder.payment_status}`},
          NOW()
        );
      `;
    } catch (auditErr) {
      console.warn("Failed to write activity log:", auditErr.message);
    }

    return success("Order updated successfully", updated[0], 200, { headers: corsHeaders });
  } catch (error) {
    console.error("[Admin Lab Order PATCH] Error:", error);
    return failure("Failed to update order", error.message, 500, { headers: corsHeaders });
  }
}
