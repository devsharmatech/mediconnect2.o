import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { doctor_id, date_filter = "today", page = 1 } = await req.json();

    if (!doctor_id) {
      return failure("doctor_id is required.", null, 400, { headers: corsHeaders });
    }

    // Verify doctor exists and is a doctor in AWS RDS
    const doctorUsers = await sql`
      SELECT id, role FROM users WHERE id = ${doctor_id} LIMIT 1
    `;
    const doctorUser = doctorUsers[0];

    if (!doctorUser || doctorUser.role !== "doctor") {
      return failure("Invalid doctor_id or user is not a doctor.", null, 400, {
        headers: corsHeaders,
      });
    }

    const perPage = 15;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const offset = (pageNum - 1) * perPage;

    // Build date filter fragment for AWS RDS
    let dateCondition = sql``;
    if (date_filter === "today") {
      dateCondition = sql`AND a.appointment_date = CURRENT_DATE`;
    } else if (date_filter === "tomorrow") {
      dateCondition = sql`AND a.appointment_date = CURRENT_DATE + INTERVAL '1 day'`;
    } else if (date_filter === "this_week") {
      dateCondition = sql`AND a.appointment_date >= CURRENT_DATE AND a.appointment_date <= CURRENT_DATE + INTERVAL '6 days'`;
    } else if (date_filter === "next_week") {
      dateCondition = sql`AND a.appointment_date >= CURRENT_DATE + INTERVAL '7 days' AND a.appointment_date <= CURRENT_DATE + INTERVAL '13 days'`;
    } else if (date_filter && date_filter !== "all") {
      dateCondition = sql`AND a.appointment_date = ${date_filter}::date`;
    }

    const rows = await sql`
      SELECT 
        a.id,
        a.doctor_id,
        a.patient_id,
        TO_CHAR(a.appointment_date, 'YYYY-MM-DD') AS appointment_date,
        a.appointment_time::text AS appointment_time,
        a.status,
        a.disease_info,
        a.appointment_type,
        a.payment_status,
        a.razorpay_order_id,
        a.razorpay_payment_id,
        a.clinic_name,
        a.clinic_address,
        a.screening_id,
        a.created_at,
        a.updated_at,
        p.full_name AS patient_full_name,
        p.email AS patient_email,
        p.gender AS patient_gender,
        p.blood_group AS patient_blood_group,
        p.address AS patient_address,
        u.phone_number AS patient_phone,
        COUNT(*) OVER()::int AS full_count
      FROM appointments a
      LEFT JOIN patient_details p ON p.id = a.patient_id
      LEFT JOIN users u ON u.id = a.patient_id
      WHERE a.doctor_id = ${doctor_id}
        ${dateCondition}
      ORDER BY a.appointment_date ASC, a.appointment_time ASC
      LIMIT ${perPage} OFFSET ${offset}
    `;

    const total = rows.length > 0 ? rows[0].full_count : 0;

    if (!rows.length) {
      return success(
        "No appointments found.",
        {
          appointments: [],
          pagination: {
            total: 0,
            totalItems: 0,
            perPage,
            currentPage: pageNum,
            totalPages: 0,
          },
        },
        200,
        { headers: corsHeaders }
      );
    }

    // Fetch screenings if available
    const screeningIds = rows.map((r) => r.screening_id).filter(Boolean);
    let screenings = [];
    if (screeningIds.length > 0) {
      try {
        screenings = await sql`
          SELECT id, initial_symptoms, stage, status
          FROM screening_sessions
          WHERE id = ANY(${screeningIds})
        `;
      } catch (sErr) {
        console.warn("[DOCTOR-APPOINTMENTS] Screening query note:", sErr.message);
      }
    }

    const merged = rows.map((a) => {
      const screening = a.screening_id
        ? screenings.find((s) => s.id === a.screening_id) || null
        : null;

      const simplePatient = {
        id: a.patient_id,
        phone: a.patient_phone || null,
        full_name: a.patient_full_name || null,
        email: a.patient_email || null,
        gender: a.patient_gender || null,
        blood_group: a.patient_blood_group || null,
        address: a.patient_address || null,
      };

      return {
        id: a.id,
        doctor_id: a.doctor_id,
        patient_id: a.patient_id,
        appointment_date: a.appointment_date,
        appointment_time: a.appointment_time,
        status: a.status,
        disease_info: a.disease_info,
        appointment_type: a.appointment_type,
        payment_status: a.payment_status,
        razorpay_order_id: a.razorpay_order_id,
        razorpay_payment_id: a.razorpay_payment_id,
        clinic_name: a.clinic_name,
        clinic_address: a.clinic_address,
        screening_id: a.screening_id,
        created_at: a.created_at,
        updated_at: a.updated_at,
        patient: simplePatient,
        screening,
      };
    });

    return success(
      "Doctor appointments (detailed) fetched successfully.",
      {
        appointments: merged,
        pagination: {
          total,
          totalItems: total,
          perPage,
          currentPage: pageNum,
          totalPages: Math.ceil((total || 0) / perPage),
        },
      },
      200,
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Doctor appointments detailed error:", error);
    return failure("Failed to fetch doctor appointments.", error.message, 500, {
      headers: corsHeaders,
    });
  }
}
