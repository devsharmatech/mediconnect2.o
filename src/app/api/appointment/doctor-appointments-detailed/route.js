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

    // Auto-expire appointments whose scheduled slot has passed (respecting extensions and clinic vs video)
    // NOTE: Appointments with a generated/signed prescription MUST NEVER expire!
    try {
      await sql`
        UPDATE appointments
        SET status = 'expired', updated_at = NOW()
        WHERE doctor_id = ${doctor_id}
          AND status IN ('booked', 'freezed')
          AND id NOT IN (
            SELECT appointment_id FROM prescriptions 
            WHERE appointment_id IS NOT NULL AND (is_draft IS NULL OR is_draft = false)
          )
          AND (extended_until IS NULL OR extended_until < (NOW() AT TIME ZONE 'Asia/Kolkata'))
          AND (
            -- Video calls expire 30 minutes after slot if unextended
            (COALESCE(appointment_type, 'video') NOT IN ('clinic_visit', 'home_visit') 
             AND (appointment_date + appointment_time + INTERVAL '30 minutes') < (NOW() AT TIME ZONE 'Asia/Kolkata'))
            OR
            -- Clinic and home visits only expire after the full appointment date has passed
            (COALESCE(appointment_type, 'video') IN ('clinic_visit', 'home_visit') 
             AND appointment_date < (NOW() AT TIME ZONE 'Asia/Kolkata')::date)
          )
      `;

      // Ensure any appointment with an existing prescription is marked 'completed'
      await sql`
        UPDATE appointments
        SET status = 'completed', updated_at = NOW()
        WHERE doctor_id = ${doctor_id}
          AND status != 'completed'
          AND id IN (
            SELECT appointment_id FROM prescriptions 
            WHERE appointment_id IS NOT NULL AND (is_draft IS NULL OR is_draft = false)
          )
      `;
    } catch (expErr) {
      console.warn("[doctor-appointments-detailed] Auto-expire warning:", expErr.message);
    }

    // Build date filter fragment for AWS RDS (Indian Standard Time)
    let dateCondition = sql``;
    if (date_filter === "today") {
      dateCondition = sql`AND a.appointment_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date`;
    } else if (date_filter === "tomorrow") {
      dateCondition = sql`AND a.appointment_date = ((NOW() AT TIME ZONE 'Asia/Kolkata')::date + INTERVAL '1 day')`;
    } else if (date_filter === "this_week") {
      dateCondition = sql`AND a.appointment_date >= (NOW() AT TIME ZONE 'Asia/Kolkata')::date AND a.appointment_date <= ((NOW() AT TIME ZONE 'Asia/Kolkata')::date + INTERVAL '6 days')`;
    } else if (date_filter === "next_week") {
      dateCondition = sql`AND a.appointment_date >= ((NOW() AT TIME ZONE 'Asia/Kolkata')::date + INTERVAL '7 days') AND a.appointment_date <= ((NOW() AT TIME ZONE 'Asia/Kolkata')::date + INTERVAL '13 days')`;
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
        COALESCE(a.original_appointment_time, a.appointment_time)::text AS original_appointment_time,
        a.extended_until,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM prescriptions pr 
            WHERE pr.appointment_id = a.id AND (pr.is_draft IS NULL OR pr.is_draft = false)
          ) THEN 'completed'
          ELSE a.status
        END AS status,
        EXISTS (
          SELECT 1 FROM prescriptions pr 
          WHERE pr.appointment_id = a.id AND (pr.is_draft IS NULL OR pr.is_draft = false)
        ) AS has_prescription,
        (
          SELECT pr.id FROM prescriptions pr 
          WHERE pr.appointment_id = a.id AND (pr.is_draft IS NULL OR pr.is_draft = false)
          ORDER BY pr.created_at DESC LIMIT 1
        ) AS prescription_id,
        a.disease_info,
        a.appointment_type,
        a.care_episode_id,
        COALESCE(ce.episode_id, CASE WHEN a.care_episode_id IS NOT NULL THEN 'EP-' || UPPER(SUBSTRING(a.care_episode_id::text, 1, 8)) ELSE 'EP-' || UPPER(SUBSTRING(a.id::text, 1, 8)) END) AS episode_id,
        a.unid,
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
        p.date_of_birth AS patient_date_of_birth,
        p.blood_group AS patient_blood_group,
        p.address AS patient_address,
        p.is_identity_verified AS patient_is_identity_verified,
        p.identity_verified_at AS patient_identity_verified_at,
        u.phone_number AS patient_phone,
        u.un_id AS patient_un_id,
        d.full_name AS doctor_full_name,
        d.specialization AS doctor_specialization,
        d.qualification AS doctor_qualification,
        d.license_number AS doctor_license_number,
        d.clinic_name AS doctor_clinic_name,
        d.clinic_address AS doctor_clinic_address,
        COUNT(*) OVER()::int AS full_count
      FROM appointments a
      LEFT JOIN patient_details p ON p.id = a.patient_id
      LEFT JOIN users u ON u.id = a.patient_id
      LEFT JOIN doctor_details d ON d.id = a.doctor_id
      LEFT JOIN care_episodes ce ON ce.id = a.care_episode_id
      WHERE a.doctor_id = ${doctor_id}
        ${dateCondition}
      ORDER BY 
        CASE 
          WHEN a.appointment_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date THEN 0
          WHEN a.appointment_date > (NOW() AT TIME ZONE 'Asia/Kolkata')::date THEN 1
          ELSE 2
        END ASC,
        CASE 
          WHEN a.appointment_date >= (NOW() AT TIME ZONE 'Asia/Kolkata')::date THEN a.appointment_date 
          ELSE NULL 
        END ASC,
        CASE 
          WHEN a.appointment_date >= (NOW() AT TIME ZONE 'Asia/Kolkata')::date THEN a.appointment_time 
          ELSE NULL 
        END ASC,
        a.appointment_date DESC,
        a.appointment_time DESC
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

      let patientAge = null;
      if (a.patient_date_of_birth) {
        const dob = new Date(a.patient_date_of_birth);
        if (!isNaN(dob.getTime())) {
          const today = new Date();
          let ageDiff = today.getFullYear() - dob.getFullYear();
          const m = today.getMonth() - dob.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) ageDiff--;
          if (ageDiff >= 0) patientAge = ageDiff;
        }
      }

      const simplePatient = {
        id: a.patient_id,
        phone: a.patient_phone || null,
        full_name: (a.patient_full_name && !a.patient_full_name.includes("DE-IDENTIFIED")) 
          ? a.patient_full_name 
          : `Patient #${a.patient_un_id || "Verified"}`,
        email: (a.patient_email && !a.patient_email.startsWith("anonymized_") && !a.patient_email.startsWith("deleted_")) 
          ? a.patient_email 
          : null,
        gender: a.patient_gender || null,
        date_of_birth: a.patient_date_of_birth || null,
        age: patientAge,
        patient_age: patientAge !== null ? `${patientAge} yrs` : null,
        blood_group: a.patient_blood_group || null,
        address: a.patient_address || null,
        un_id: a.patient_un_id || null,
        is_identity_verified: Boolean(a.patient_is_identity_verified),
        identity_verified_at: a.patient_identity_verified_at || null,
      };

      const simpleDoctor = {
        id: a.doctor_id,
        full_name: a.doctor_full_name || null,
        specialization: a.doctor_specialization || null,
        qualification: a.doctor_qualification || null,
        license_number: a.doctor_license_number || null,
        clinic_name: a.doctor_clinic_name || a.clinic_name || null,
        clinic_address: a.doctor_clinic_address || a.clinic_address || null,
      };

      return {
        id: a.id,
        doctor_id: a.doctor_id,
        patient_id: a.patient_id,
        care_episode_id: a.care_episode_id || null,
        episode_id: a.episode_id || (a.care_episode_id ? `EP-${String(a.care_episode_id).slice(0, 8).toUpperCase()}` : `EP-${String(a.id).slice(0, 8).toUpperCase()}`),
        unid: a.unid || null,
        appointment_date: a.appointment_date,
        appointment_time: a.appointment_time,
        original_appointment_time: a.original_appointment_time,
        extended_until: a.extended_until,
        status: a.status,
        has_prescription: Boolean(a.has_prescription),
        prescription_id: a.prescription_id || null,
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
        doctor: simpleDoctor,
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
