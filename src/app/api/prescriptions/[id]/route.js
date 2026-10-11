import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return failure("Prescription ID is required", null, 400, { headers: corsHeaders });
    }

    // 1. Fetch prescription from RDS PostgreSQL
    const prescRows = await sql`
      SELECT 
        p.*,
        a.care_episode_id,
        ce.episode_id AS care_episode_code
      FROM prescriptions p
      LEFT JOIN appointments a ON a.id = p.appointment_id
      LEFT JOIN care_episodes ce ON ce.id = a.care_episode_id
      WHERE p.id::text = ${id} OR p.pid::text = ${id} OR p.unid::text = ${id}
      LIMIT 1
    `;

    if (!prescRows || prescRows.length === 0) {
      return failure("Prescription not found.", null, 404, {
        headers: corsHeaders,
      });
    }

    const prescription = prescRows[0];

    // 2. Fetch doctor, patient, appointment, and user un_ids
    const [docRows, patRows, fullApptRows, docUserRows, patUserRows] = await Promise.all([
      prescription.doctor_id
        ? sql`SELECT * FROM doctor_details WHERE id = ${prescription.doctor_id} LIMIT 1`
        : Promise.resolve([]),
      prescription.patient_id
        ? sql`SELECT * FROM patient_details WHERE id = ${prescription.patient_id} LIMIT 1`
        : Promise.resolve([]),
      prescription.appointment_id
        ? sql`SELECT * FROM appointments WHERE id = ${prescription.appointment_id} LIMIT 1`
        : Promise.resolve([]),
      prescription.doctor_id
        ? sql`SELECT un_id FROM users WHERE id = ${prescription.doctor_id} LIMIT 1`
        : Promise.resolve([]),
      prescription.patient_id
        ? sql`SELECT un_id FROM users WHERE id = ${prescription.patient_id} LIMIT 1`
        : Promise.resolve([]),
    ]);

    const docDetails = docRows[0] || {};
    const patDetails = patRows[0] || {};
    const apptDetails = fullApptRows[0] || {};
    const docUnId = docUserRows[0]?.un_id || null;
    const patUnId = patUserRows[0]?.un_id || null;

    const careEpisodeCode = prescription.care_episode_code || 
      (prescription.care_episode_id ? `EP-${String(prescription.care_episode_id).slice(0, 8).toUpperCase()}` : (apptDetails.care_episode_id ? `EP-${String(apptDetails.care_episode_id).slice(0, 8).toUpperCase()}` : null));

    const response = {
      ...prescription,
      doctor_details: {
        ...docDetails,
        un_id: docUnId,
      },
      patient_details: {
        ...patDetails,
        un_id: patUnId,
      },
      appointments: apptDetails,
      care_episode_id: prescription.care_episode_id || apptDetails.care_episode_id,
      episode_id: careEpisodeCode,
      // Backwards compatibility mappings:
      appointment: {
        id: apptDetails.id,
        date: apptDetails.appointment_date,
        time: apptDetails.appointment_time,
        status: apptDetails.status,
        disease_info: apptDetails.disease_info || {},
      },
      doctor: {
        id: docDetails.id,
        full_name: docDetails.full_name,
        email: docDetails.email,
        specialization: docDetails.specialization,
        qualification: docDetails.qualification,
        experience_years: docDetails.experience_years,
        clinic_name: docDetails.clinic_name,
        clinic_address: docDetails.clinic_address,
        consultation_fee: docDetails.consultation_fee,
        rating: docDetails.rating,
        total_reviews: docDetails.total_reviews,
        license_number: docDetails.license_number,
        signature_url: docDetails.signature_url,
        un_id: docUnId,
      },
      patient: {
        id: patDetails.id,
        full_name: patDetails.full_name,
        email: patDetails.email,
        gender: patDetails.gender,
        date_of_birth: patDetails.date_of_birth,
        blood_group: patDetails.blood_group,
        address: patDetails.address,
        un_id: patUnId,
      },
    };

    return success("Prescription fetched successfully.", response, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Get prescription error:", error);
    return failure("Failed to fetch prescription.", error.message, 500, {
      headers: corsHeaders,
    });
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const {
      appointment_id,
      doctor_id,
      patient_id,
      medicines,
      lab_tests,
      special_message,
      ai_analysis,
    } = body;

    if (!id) {
      return failure("Prescription ID is required", null, 400, {
        headers: corsHeaders,
      });
    }

    const updatedRows = await sql`
      UPDATE prescriptions
      SET 
        appointment_id = COALESCE(${appointment_id}, appointment_id),
        doctor_id = COALESCE(${doctor_id}, doctor_id),
        patient_id = COALESCE(${patient_id}, patient_id),
        medicines = COALESCE(${JSON.stringify(medicines || [])}::jsonb, medicines),
        lab_tests = COALESCE(${JSON.stringify(lab_tests || [])}::jsonb, lab_tests),
        special_message = COALESCE(${special_message}, special_message),
        ai_analysis = COALESCE(${JSON.stringify(ai_analysis || {})}::jsonb, ai_analysis),
        updated_at = NOW()
      WHERE id::text = ${id} OR pid::text = ${id}
      RETURNING *
    `;

    if (!updatedRows || updatedRows.length === 0) {
      return failure("Prescription not found or update failed.", null, 404, {
        headers: corsHeaders,
      });
    }

    return success("Prescription updated successfully.", updatedRows[0], 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Update prescription error:", error);
    return failure("Failed to update prescription.", error.message, 500, {
      headers: corsHeaders,
    });
  }
}
