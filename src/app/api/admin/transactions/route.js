import { NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Unified Admin Patient Transactions API
 * Aggregates payments & transactions across:
 * 1. Doctor Consultations (appointments)
 * 2. Diagnostic Lab Test Orders (lab_test_orders)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "15", 10));
    const offset = (page - 1) * limit;

    const patientId = searchParams.get("patient_id") || "";
    const search = searchParams.get("search") || "";
    const serviceType = searchParams.get("service_type") || "all"; // 'all', 'appointment', 'lab'
    const paymentStatus = searchParams.get("payment_status") || "all"; // 'all', 'paid', 'pending', 'free', 'failed'
    const fromDate = searchParams.get("from_date") || "";
    const toDate = searchParams.get("to_date") || "";

    // 1. Fetch appointments query
    const aptConditions = [sql`1 = 1`];
    if (patientId) {
      aptConditions.push(sql`a.patient_id = ${patientId}::uuid`);
    }
    if (paymentStatus !== "all") {
      if (paymentStatus === "paid") {
        aptConditions.push(sql`LOWER(COALESCE(a.payment_status, '')) IN ('paid', 'completed')`);
      } else if (paymentStatus === "free") {
        aptConditions.push(sql`(LOWER(COALESCE(a.payment_status, '')) = 'free' OR COALESCE(a.final_fee, a.original_fee, 0) = 0)`);
      } else if (paymentStatus === "pending") {
        aptConditions.push(sql`LOWER(COALESCE(a.payment_status, 'pending')) IN ('pending', 'booked') AND COALESCE(a.final_fee, a.original_fee, 0) > 0`);
      } else if (paymentStatus === "failed") {
        aptConditions.push(sql`LOWER(COALESCE(a.payment_status, '')) IN ('failed', 'cancelled', 'refunded')`);
      }
    }
    if (fromDate) {
      aptConditions.push(sql`a.created_at >= ${fromDate}::timestamp`);
    }
    if (toDate) {
      aptConditions.push(sql`a.created_at <= ${toDate + " 23:59:59"}::timestamp`);
    }
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      aptConditions.push(sql`(
        p.full_name ILIKE ${s} OR
        p.email ILIKE ${s} OR
        u.phone_number ILIKE ${s} OR
        u.un_id::text ILIKE ${s} OR
        d.full_name ILIKE ${s} OR
        d.specialization ILIKE ${s} OR
        a.id::text ILIKE ${s} OR
        a.razorpay_payment_id ILIKE ${s} OR
        a.razorpay_order_id ILIKE ${s}
      )`);
    }
    const aptWhere = aptConditions.reduce((acc, curr) => sql`${acc} AND ${curr}`);

    // 2. Fetch lab test orders query
    const labConditions = [sql`1 = 1`];
    if (patientId) {
      labConditions.push(sql`l.patient_id = ${patientId}::uuid`);
    }
    if (paymentStatus !== "all") {
      if (paymentStatus === "paid") {
        labConditions.push(sql`LOWER(COALESCE(l.payment_status, '')) IN ('paid', 'completed')`);
      } else if (paymentStatus === "free") {
        labConditions.push(sql`(LOWER(COALESCE(l.payment_status, '')) = 'free' OR COALESCE(l.total_amount, 0) = 0)`);
      } else if (paymentStatus === "pending") {
        labConditions.push(sql`LOWER(COALESCE(l.payment_status, 'pending')) IN ('pending', 'unpaid') AND COALESCE(l.total_amount, 0) > 0`);
      } else if (paymentStatus === "failed") {
        labConditions.push(sql`LOWER(COALESCE(l.payment_status, '')) IN ('failed', 'cancelled', 'refunded')`);
      }
    }
    if (fromDate) {
      labConditions.push(sql`l.created_at >= ${fromDate}::timestamp`);
    }
    if (toDate) {
      labConditions.push(sql`l.created_at <= ${toDate + " 23:59:59"}::timestamp`);
    }
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      labConditions.push(sql`(
        p.full_name ILIKE ${s} OR
        p.email ILIKE ${s} OR
        u.phone_number ILIKE ${s} OR
        u.un_id::text ILIKE ${s} OR
        ld.lab_name ILIKE ${s} OR
        l.id::text ILIKE ${s} OR
        l.razorpay_payment_id ILIKE ${s} OR
        l.razorpay_order_id ILIKE ${s}
      )`);
    }
    const labWhere = labConditions.reduce((acc, curr) => sql`${acc} AND ${curr}`);

    // Build unified CTE based on serviceType filter
    let rows = [];
    let totalCount = 0;

    if (serviceType === "appointment") {
      const [{ count }] = await sql`
        SELECT COUNT(*)::int AS count
        FROM appointments a
        LEFT JOIN users u ON u.id = a.patient_id
        LEFT JOIN patient_details p ON p.id = a.patient_id
        LEFT JOIN doctor_details d ON d.id = a.doctor_id
        WHERE ${aptWhere}
      `;
      totalCount = count || 0;

      rows = await sql`
        SELECT 
          ('apt-' || a.id::text) AS transaction_id,
          a.id::text AS reference_id,
          'appointment' AS service_type,
          'Doctor Consultation' AS service_label,
          COALESCE(a.appointment_type, 'consultation') AS sub_type,
          a.created_at,
          COALESCE(a.final_fee, a.original_fee, 0)::numeric AS amount,
          LOWER(COALESCE(a.payment_status, 'pending')) AS payment_status,
          COALESCE(a.status, 'pending') AS booking_status,
          a.razorpay_payment_id,
          a.razorpay_order_id,
          a.patient_id::text AS patient_id,
          COALESCE(p.full_name, 'Patient') AS patient_name,
          p.email AS patient_email,
          u.phone_number AS patient_phone,
          u.un_id AS patient_un_id,
          p.gender AS patient_gender,
          p.date_of_birth AS patient_dob,
          d.id::text AS provider_id,
          COALESCE(d.full_name, 'Doctor') AS provider_name,
          COALESCE(d.specialization, 'General Medicine') AS provider_specialty,
          d.qualification AS provider_qualification,
          COALESCE(d.license_number, 'N/A') AS provider_license,
          COALESCE(a.clinic_name, d.clinic_name, 'MediConnect Partner Clinic') AS facility_name,
          COALESCE(a.clinic_address, d.clinic_address, 'N/A') AS facility_address,
          NULL::jsonb AS order_items,
          a.disease_info AS clinical_notes,
          a.appointment_date,
          a.appointment_time
        FROM appointments a
        LEFT JOIN users u ON u.id = a.patient_id
        LEFT JOIN patient_details p ON p.id = a.patient_id
        LEFT JOIN doctor_details d ON d.id = a.doctor_id
        WHERE ${aptWhere}
        ORDER BY a.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (serviceType === "lab") {
      const [{ count }] = await sql`
        SELECT COUNT(*)::int AS count
        FROM lab_test_orders l
        LEFT JOIN users u ON u.id = l.patient_id
        LEFT JOIN patient_details p ON p.id = l.patient_id
        LEFT JOIN lab_details ld ON ld.id = l.lab_id
        WHERE ${labWhere}
      `;
      totalCount = count || 0;

      rows = await sql`
        SELECT 
          ('lab-' || l.id::text) AS transaction_id,
          l.id::text AS reference_id,
          'lab' AS service_type,
          'Diagnostic Lab Test' AS service_label,
          COALESCE(l.collection_type, 'walk-in') AS sub_type,
          l.created_at,
          COALESCE(l.total_amount, 0)::numeric AS amount,
          LOWER(COALESCE(l.payment_status, 'pending')) AS payment_status,
          COALESCE(l.status, 'pending') AS booking_status,
          l.razorpay_payment_id,
          l.razorpay_order_id,
          l.patient_id::text AS patient_id,
          COALESCE(p.full_name, 'Patient') AS patient_name,
          p.email AS patient_email,
          u.phone_number AS patient_phone,
          u.un_id AS patient_un_id,
          p.gender AS patient_gender,
          p.date_of_birth AS patient_dob,
          ld.id::text AS provider_id,
          COALESCE(ld.lab_name, 'Diagnostic Partner Lab') AS provider_name,
          'Diagnostic Laboratory' AS provider_specialty,
          NULL AS provider_qualification,
          COALESCE(ld.license_number, ld.registration_number, 'N/A') AS provider_license,
          COALESCE(ld.lab_name, 'MediConnect Partner Lab') AS facility_name,
          COALESCE(ld.address, 'N/A') AS facility_address,
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', item.id,
                'name', item.test_name,
                'price', item.price,
                'status', item.status
              )
            )
            FROM lab_test_order_items item
            WHERE item.order_id = l.id
          ) AS order_items,
          NULL::jsonb AS clinical_notes,
          l.scheduled_at::date AS appointment_date,
          l.scheduled_at::time AS appointment_time
        FROM lab_test_orders l
        LEFT JOIN users u ON u.id = l.patient_id
        LEFT JOIN patient_details p ON p.id = l.patient_id
        LEFT JOIN lab_details ld ON ld.id = l.lab_id
        WHERE ${labWhere}
        ORDER BY l.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      // Unified query across both
      const countRes = await sql`
        WITH unified_counts AS (
          SELECT a.id FROM appointments a
          LEFT JOIN users u ON u.id = a.patient_id
          LEFT JOIN patient_details p ON p.id = a.patient_id
          LEFT JOIN doctor_details d ON d.id = a.doctor_id
          WHERE ${aptWhere}
          UNION ALL
          SELECT l.id FROM lab_test_orders l
          LEFT JOIN users u ON u.id = l.patient_id
          LEFT JOIN patient_details p ON p.id = l.patient_id
          LEFT JOIN lab_details ld ON ld.id = l.lab_id
          WHERE ${labWhere}
        )
        SELECT COUNT(*)::int AS count FROM unified_counts;
      `;
      totalCount = countRes[0]?.count || 0;

      rows = await sql`
        WITH unified_transactions AS (
          SELECT 
            ('apt-' || a.id::text) AS transaction_id,
            a.id::text AS reference_id,
            'appointment' AS service_type,
            'Doctor Consultation' AS service_label,
            COALESCE(a.appointment_type, 'consultation') AS sub_type,
            a.created_at,
            COALESCE(a.final_fee, a.original_fee, 0)::numeric AS amount,
            LOWER(COALESCE(a.payment_status, 'pending')) AS payment_status,
            COALESCE(a.status, 'pending') AS booking_status,
            a.razorpay_payment_id,
            a.razorpay_order_id,
            a.patient_id::text AS patient_id,
            COALESCE(p.full_name, 'Patient') AS patient_name,
            p.email AS patient_email,
            u.phone_number AS patient_phone,
            u.un_id AS patient_un_id,
            p.gender AS patient_gender,
            p.date_of_birth AS patient_dob,
            d.id::text AS provider_id,
            COALESCE(d.full_name, 'Doctor') AS provider_name,
            COALESCE(d.specialization, 'General Medicine') AS provider_specialty,
            d.qualification AS provider_qualification,
            COALESCE(d.license_number, 'N/A') AS provider_license,
            COALESCE(a.clinic_name, d.clinic_name, 'MediConnect Partner Clinic') AS facility_name,
            COALESCE(a.clinic_address, d.clinic_address, 'N/A') AS facility_address,
            NULL::jsonb AS order_items,
            a.disease_info AS clinical_notes,
            a.appointment_date,
            a.appointment_time
          FROM appointments a
          LEFT JOIN users u ON u.id = a.patient_id
          LEFT JOIN patient_details p ON p.id = a.patient_id
          LEFT JOIN doctor_details d ON d.id = a.doctor_id
          WHERE ${aptWhere}

          UNION ALL

          SELECT 
            ('lab-' || l.id::text) AS transaction_id,
            l.id::text AS reference_id,
            'lab' AS service_type,
            'Diagnostic Lab Test' AS service_label,
            COALESCE(l.collection_type, 'walk-in') AS sub_type,
            l.created_at,
            COALESCE(l.total_amount, 0)::numeric AS amount,
            LOWER(COALESCE(l.payment_status, 'pending')) AS payment_status,
            COALESCE(l.status, 'pending') AS booking_status,
            l.razorpay_payment_id,
            l.razorpay_order_id,
            l.patient_id::text AS patient_id,
            COALESCE(p.full_name, 'Patient') AS patient_name,
            p.email AS patient_email,
            u.phone_number AS patient_phone,
            u.un_id AS patient_un_id,
            p.gender AS patient_gender,
            p.date_of_birth AS patient_dob,
            ld.id::text AS provider_id,
            COALESCE(ld.lab_name, 'Diagnostic Partner Lab') AS provider_name,
            'Diagnostic Laboratory' AS provider_specialty,
            NULL AS provider_qualification,
            COALESCE(ld.license_number, ld.registration_number, 'N/A') AS provider_license,
            COALESCE(ld.lab_name, 'MediConnect Partner Lab') AS facility_name,
            COALESCE(ld.address, 'N/A') AS facility_address,
            (
              SELECT jsonb_agg(
                jsonb_build_object(
                  'id', item.id,
                  'name', item.test_name,
                  'price', item.price,
                  'status', item.status
                )
              )
              FROM lab_test_order_items item
              WHERE item.order_id = l.id
            ) AS order_items,
            NULL::jsonb AS clinical_notes,
            l.scheduled_at::date AS appointment_date,
            l.scheduled_at::time AS appointment_time
          FROM lab_test_orders l
          LEFT JOIN users u ON u.id = l.patient_id
          LEFT JOIN patient_details p ON p.id = l.patient_id
          LEFT JOIN lab_details ld ON ld.id = l.lab_id
          WHERE ${labWhere}
        )
        SELECT *
        FROM unified_transactions
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    // Calculate quick overall stats
    const statsResult = await sql`
      SELECT 
        (SELECT COUNT(*)::int FROM appointments) AS total_appointments_count,
        (SELECT COALESCE(SUM(COALESCE(final_fee, original_fee, 0)), 0)::numeric FROM appointments) AS total_appointments_volume,
        (SELECT COUNT(*)::int FROM lab_test_orders) AS total_labs_count,
        (SELECT COALESCE(SUM(COALESCE(total_amount, 0)), 0)::numeric FROM lab_test_orders) AS total_labs_volume
    `;
    const sRow = statsResult[0] || {};
    const aptCount = parseInt(sRow.total_appointments_count || "0", 10);
    const aptVol = parseFloat(sRow.total_appointments_volume || "0");
    const labCount = parseInt(sRow.total_labs_count || "0", 10);
    const labVol = parseFloat(sRow.total_labs_volume || "0");

    const totalPages = Math.ceil(totalCount / limit) || 1;

    return NextResponse.json({
      success: true,
      transactions: rows,
      stats: {
        total_count: aptCount + labCount,
        total_volume: aptVol + labVol,
        appointments_count: aptCount,
        appointments_volume: aptVol,
        labs_count: labCount,
        labs_volume: labVol,
      },
      pagination: {
        page,
        limit,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/transactions error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
