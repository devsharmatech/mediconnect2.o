import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { resolveCallerFromRequest } from "@/lib/layer1/authGuard";

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { patient_id, date_filter = "all", page = 1 } = await req.json();

    if (!patient_id) {
      return failure("patient_id is required.", null, 400, { headers: corsHeaders });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(String(patient_id).trim())) {
      return failure("Invalid patient_id format. Must be a valid UUID.", null, 400, { headers: corsHeaders });
    }

    let caller = await resolveCallerFromRequest(req, patient_id);
    if (!caller && patient_id) {
      const users = await sql`
        SELECT id, role FROM users WHERE id = ${patient_id} LIMIT 1
      `;
      if (users && users.length > 0) caller = users[0];
    }

    if (!caller) {
      return failure("Unauthorized - missing or invalid token.", null, 401, { headers: corsHeaders });
    }
    if (caller.id !== patient_id && caller.role !== "admin") {
      return failure("Forbidden - you do not have permission to view these appointments.", null, 403, { headers: corsHeaders });
    }

    // Verify user exists in users table
    const patientUsers = await sql`
      SELECT id, role FROM users WHERE id = ${patient_id} LIMIT 1
    `;
    const patientUser = patientUsers[0];

    if (!patientUser) {
      return failure("Invalid patient_id. User not found.", null, 400, { headers: corsHeaders });
    }

    // Auto-ensure patient_details row exists for the user if missing (supports doctors, chemists, labs, admins in patient mode)
    const [pDetail] = await sql`SELECT id FROM patient_details WHERE id = ${patient_id} LIMIT 1`;
    if (!pDetail) {
      let resolvedName = "Patient";
      let resolvedEmail = null;
      if (patientUser.role === "doctor") {
        const [doc] = await sql`SELECT full_name, email FROM doctor_details WHERE id = ${patient_id} LIMIT 1`;
        if (doc) { resolvedName = doc.full_name; resolvedEmail = doc.email; }
      } else if (patientUser.role === "chemist") {
        const [chem] = await sql`SELECT owner_name, pharmacist_name, pharmacy_name, email FROM chemist_details WHERE id = ${patient_id} LIMIT 1`;
        if (chem) { resolvedName = chem.owner_name || chem.pharmacist_name || chem.pharmacy_name || "Chemist"; resolvedEmail = chem.email; }
      } else if (patientUser.role === "lab") {
        const [lab] = await sql`SELECT owner_name, lab_name, email FROM lab_details WHERE id = ${patient_id} LIMIT 1`;
        if (lab) { resolvedName = lab.owner_name || lab.lab_name || "Lab"; resolvedEmail = lab.email; }
      } else if (patientUser.role === "admin") {
        const [adminRow] = await sql`SELECT full_name, email FROM admin_details WHERE id = ${patient_id} LIMIT 1`;
        if (adminRow) {
          resolvedName = adminRow.full_name;
          resolvedEmail = adminRow.email;
        } else {
          resolvedName = "Dev Sharma";
        }
      }
      try {
        await sql`
          INSERT INTO patient_details (id, full_name, email, created_at, updated_at)
          VALUES (${patient_id}, ${resolvedName}, ${resolvedEmail}, NOW(), NOW())
          ON CONFLICT (id) DO NOTHING
        `;
      } catch (e) {
        console.warn("Auto-provision patient_details warning:", e.message);
      }
    }

    const perPage = 50;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const offset = (pageNum - 1) * perPage;

    // Auto-expire appointments whose scheduled slot has passed by > 30 minutes
    try {
      await sql`
        UPDATE appointments
        SET status = 'expired', updated_at = NOW()
        WHERE patient_id = ${patient_id}
          AND status IN ('booked', 'approved', 'freezed')
          AND (appointment_date + appointment_time + INTERVAL '30 minutes') < (NOW() AT TIME ZONE 'Asia/Kolkata')
      `;
    } catch (expErr) {
      console.warn("[patient-appointment] Auto-expire warning:", expErr.message);
    }

    // Date filter fragment
    let dateCondition = sql``;
    if (date_filter === "today") {
      dateCondition = sql`AND a.appointment_date = CURRENT_DATE`;
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
        a.care_episode_id,
        a.created_at,
        a.updated_at,
        d.full_name AS doctor_full_name,
        d.email AS doctor_email,
        d.specialization AS doctor_specialization,
        d.clinic_name AS doctor_clinic_name,
        d.clinic_address AS doctor_clinic_address,
        d.license_number AS doctor_license_number,
        d.qualification AS doctor_qualification,
        d.consultation_fee AS doctor_consultation_fee,
        d.video_consultation_fee AS doctor_video_consultation_fee,
        d.clinic_consultation_fee AS doctor_clinic_consultation_fee,
        d.home_visit_fee AS doctor_home_visit_fee,
        d.passport_photo AS doctor_passport_photo,
        d.meta AS doctor_meta,
        du.profile_picture AS doctor_profile_picture,
        p.full_name AS patient_full_name,
        p.gender AS patient_gender,
        p.date_of_birth AS patient_date_of_birth,
        p.address AS patient_address,
        COUNT(*) OVER()::int AS full_count
      FROM appointments a
      LEFT JOIN doctor_details d ON d.id = a.doctor_id
      LEFT JOIN users du ON du.id = a.doctor_id
      LEFT JOIN patient_details p ON p.id = a.patient_id
      WHERE a.patient_id = ${patient_id}
        ${dateCondition}
      ORDER BY a.appointment_date DESC, a.created_at DESC
      LIMIT ${perPage} OFFSET ${offset}
    `;

    const total = rows.length > 0 ? rows[0].full_count : 0;

    if (!rows.length) {
      return success(
        "No appointments found.",
        { appointments: [], pagination: { total: 0, perPage, currentPage: pageNum, totalPages: 0 } },
        200,
        { headers: corsHeaders }
      );
    }

    // ── Batch lookup prescriptions & DigiLocker status ──
    const apptIds = rows.map((r) => r.id).filter(Boolean);
    const episodeIds = [...new Set(rows.map((r) => r.care_episode_id).filter(Boolean))];

    let rxRows = [];
    try {
      if (apptIds.length > 0) {
        if (episodeIds.length > 0) {
          rxRows = await sql`
            SELECT DISTINCT ON (p.appointment_id)
              p.id, p.appointment_id, p.status, p.signed_at, p.is_draft, p.file_url, p.created_at,
              a.care_episode_id
            FROM prescriptions p
            LEFT JOIN appointments a ON a.id = p.appointment_id
            WHERE p.appointment_id = ANY(${apptIds})
               OR (a.care_episode_id IS NOT NULL AND a.care_episode_id = ANY(${episodeIds}))
            ORDER BY p.appointment_id, p.created_at DESC
          `;
        } else {
          rxRows = await sql`
            SELECT DISTINCT ON (p.appointment_id)
              p.id, p.appointment_id, p.status, p.signed_at, p.is_draft, p.file_url, p.created_at,
              NULL AS care_episode_id
            FROM prescriptions p
            WHERE p.appointment_id = ANY(${apptIds})
            ORDER BY p.appointment_id, p.created_at DESC
          `;
        }
      }
    } catch (rxErr) {
      console.warn("[patient-appointment] Prescription fetch warning:", rxErr.message);
    }

    const rxIds = (rxRows || []).map((r) => r.id).filter(Boolean);
    const digiLockerRxIds = new Set();
    if (rxIds.length > 0) {
      try {
        const lockerRows = await sql`
          SELECT tags, document_url, description
          FROM digital_locker_documents
          WHERE user_id = ${patient_id}
            AND document_type = 'prescription'
        `;
        for (const d of lockerRows || []) {
          const dTags = Array.isArray(d.tags) ? d.tags : [];
          for (const rxId of rxIds) {
            if (
              dTags.includes(rxId) ||
              (d.document_url && d.document_url.includes(rxId)) ||
              (d.description && d.description.includes(rxId))
            ) {
              digiLockerRxIds.add(rxId);
            }
          }
        }
      } catch (lockerErr) {
        console.warn("[patient-appointment] Locker status check warning:", lockerErr.message);
      }
    }

    const merged = rows.map((a) => {
      let resolvedDocPhoto = a.doctor_profile_picture || null;
      if (!resolvedDocPhoto && a.doctor_passport_photo) {
        const raw = a.doctor_passport_photo;
        if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "string") {
          resolvedDocPhoto = raw[0];
        } else if (typeof raw === "string") {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) resolvedDocPhoto = parsed[0];
            else if (typeof parsed === "string") resolvedDocPhoto = parsed;
          } catch (_) {}
          if (!resolvedDocPhoto && raw.startsWith("http")) resolvedDocPhoto = raw;
        }
      }

      // Match prescription directly or via care episode
      const matchedRx =
        (rxRows || []).find((r) => r.appointment_id === a.id) ||
        (a.care_episode_id ? (rxRows || []).find((r) => r.care_episode_id === a.care_episode_id) : null);

      const hasPrescription = !!matchedRx;
      const isSigned = !!(
        matchedRx?.signed_at ||
        (matchedRx && !matchedRx.is_draft && matchedRx.status === "completed")
      );
      const isSavedInDigiLocker = matchedRx ? digiLockerRxIds.has(matchedRx.id) : false;

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
        care_episode_id: a.care_episode_id,
        created_at: a.created_at,
        updated_at: a.updated_at,
        prescription: matchedRx
          ? {
              id: matchedRx.id,
              status: matchedRx.status,
              is_signed: isSigned,
              signed_at: matchedRx.signed_at,
              file_url: matchedRx.file_url,
              is_saved_in_digilocker: isSavedInDigiLocker,
            }
          : null,
        has_prescription: hasPrescription,
        is_prescription_signed: isSigned,
        prescription_id: matchedRx?.id || null,
        prescription_saved_in_digilocker: isSavedInDigiLocker,
        doctor: a.doctor_id ? {
          id: a.doctor_id,
          full_name: a.doctor_full_name || null,
          email: a.doctor_email || null,
          specialization: a.doctor_specialization || null,
          clinic_name: a.doctor_clinic_name || null,
          clinic_address: a.doctor_clinic_address || null,
          license_number: a.doctor_license_number || null,
          qualification: a.doctor_qualification || null,
          consultation_fee: a.doctor_consultation_fee || null,
          video_consultation_fee: a.doctor_video_consultation_fee || null,
          clinic_consultation_fee: a.doctor_clinic_consultation_fee || null,
          home_visit_fee: a.doctor_home_visit_fee || null,
          meta: a.doctor_meta || null,
          profile_image_url: resolvedDocPhoto || null,
          profile_image: resolvedDocPhoto || null,
          profile_picture: a.doctor_profile_picture || null,
          passport_photo: a.doctor_passport_photo || null,
        } : null,
        patient: a.patient_id ? {
          id: a.patient_id,
          full_name: a.patient_full_name || null,
          gender: a.patient_gender || null,
          date_of_birth: a.patient_date_of_birth || null,
          address: a.patient_address || null,
        } : null,
      };
    });

    return success(
      "Patient appointments fetched successfully.",
      {
        appointments: merged,
        pagination: {
          total,
          perPage,
          currentPage: pageNum,
          totalPages: Math.ceil((total || 0) / perPage),
        },
      },
      200,
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[PATIENT-APPOINTMENT] Catch block error:", error);
    return failure("Failed to fetch patient appointments.", error.message, 500, { headers: corsHeaders });
  }
}
