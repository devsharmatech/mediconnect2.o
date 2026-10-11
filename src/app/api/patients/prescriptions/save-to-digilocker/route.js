import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

const safeUuid = (val) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ? val : null);

/**
 * GET /api/patients/prescriptions/save-to-digilocker
 * Query: patient_id, prescription_id, appointment_id
 * Checks whether this prescription is already saved in MediConnect DigiLocker.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const patient_id = searchParams.get("patient_id");
    const prescription_id = searchParams.get("prescription_id");
    const appointment_id = searchParams.get("appointment_id");

    const cleanPatientId = safeUuid(patient_id);
    if (!cleanPatientId) {
      return failure("Valid patient_id is required.", null, 400, { headers: corsHeaders });
    }

    const cleanRxId = safeUuid(prescription_id);
    const cleanApptId = safeUuid(appointment_id);

    if (!cleanRxId && !cleanApptId) {
      return failure("prescription_id or appointment_id is required.", null, 400, { headers: corsHeaders });
    }

    let rxIdToCheck = cleanRxId;
    if (!rxIdToCheck && cleanApptId) {
      const rxRow = await sql`
        SELECT id FROM prescriptions 
        WHERE appointment_id = ${cleanApptId} AND patient_id = ${cleanPatientId} 
        LIMIT 1
      `;
      if (rxRow.length > 0) rxIdToCheck = rxRow[0].id;
    }

    if (!rxIdToCheck) {
      return success("Prescription not found.", { is_saved: false }, 200, { headers: corsHeaders });
    }

    const existing = await sql`
      SELECT id, document_name, document_url, created_at, upload_date
      FROM digital_locker_documents
      WHERE user_id = ${cleanPatientId}
        AND document_type = 'prescription'
        AND (
          ${rxIdToCheck} = ANY(tags)
          OR document_url LIKE ${`%${rxIdToCheck}%`}
          OR description LIKE ${`%${rxIdToCheck}%`}
        )
      LIMIT 1
    `;

    return success("Status fetched", {
      is_saved: existing.length > 0,
      document: existing[0] || null,
    }, 200, { headers: corsHeaders });

  } catch (err) {
    console.error("Check Prescription DigiLocker Status Error:", err);
    return failure("Failed to check DigiLocker status", err.message, 500, { headers: corsHeaders });
  }
}

import { uploadToS3 } from "@/lib/s3";

/**
 * POST /api/patients/prescriptions/save-to-digilocker
 * Body: FormData or JSON { patient_id, prescription_id, appointment_id, file }
 * Saves the client-rendered PDF directly to AWS S3 and digital_locker_documents table in AWS RDS.
 */
export async function POST(req) {
  try {
    let patient_id = null;
    let prescription_id = null;
    let appointment_id = null;
    let file = null;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      patient_id = formData.get("patient_id");
      prescription_id = formData.get("prescription_id");
      appointment_id = formData.get("appointment_id");
      file = formData.get("file");
    } else {
      const body = await req.json();
      patient_id = body.patient_id;
      prescription_id = body.prescription_id;
      appointment_id = body.appointment_id;
    }

    const cleanPatientId = safeUuid(patient_id);
    if (!cleanPatientId) {
      return failure("Valid patient_id is required.", null, 400, { headers: corsHeaders });
    }

    const cleanRxId = safeUuid(prescription_id);
    const cleanApptId = safeUuid(appointment_id);

    if (!cleanRxId && !cleanApptId) {
      return failure("prescription_id or appointment_id is required.", null, 400, { headers: corsHeaders });
    }

    // 1. Fetch prescription details from AWS RDS PostgreSQL
    let rxRows = [];
    if (cleanRxId) {
      rxRows = await sql`
        SELECT 
          p.*,
          d.full_name AS doctor_name,
          d.specialization AS doctor_specialization,
          d.clinic_name AS doctor_clinic_name,
          TO_CHAR(a.appointment_date, 'DD Mon YYYY') AS appt_date_str,
          a.appointment_type,
          u.un_id AS doctor_un_id
        FROM prescriptions p
        LEFT JOIN doctor_details d ON d.id = p.doctor_id
        LEFT JOIN users u ON u.id = p.doctor_id
        LEFT JOIN appointments a ON a.id = p.appointment_id
        WHERE p.id = ${cleanRxId} AND p.patient_id = ${cleanPatientId}
        LIMIT 1
      `;
    } else {
      rxRows = await sql`
        SELECT 
          p.*,
          d.full_name AS doctor_name,
          d.specialization AS doctor_specialization,
          d.clinic_name AS doctor_clinic_name,
          TO_CHAR(a.appointment_date, 'DD Mon YYYY') AS appt_date_str,
          a.appointment_type,
          u.un_id AS doctor_un_id
        FROM prescriptions p
        LEFT JOIN doctor_details d ON d.id = p.doctor_id
        LEFT JOIN users u ON u.id = p.doctor_id
        LEFT JOIN appointments a ON a.id = p.appointment_id
        WHERE p.appointment_id = ${cleanApptId} AND p.patient_id = ${cleanPatientId}
        LIMIT 1
      `;
    }

    if (!rxRows || rxRows.length === 0) {
      return failure("Prescription not found or unauthorized.", null, 404, { headers: corsHeaders });
    }

    const rx = rxRows[0];
    const doctorName = rx.doctor_name || "Doctor";
    const dateStr = rx.appt_date_str || new Date(rx.created_at || Date.now()).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    // Determine diagnosis text safely
    let diagText = "Medical Consultation";
    if (rx.diagnosis) {
      if (typeof rx.diagnosis === "string") diagText = rx.diagnosis;
      else if (typeof rx.diagnosis === "object") {
        diagText = rx.diagnosis.primary || rx.diagnosis.text || rx.diagnosis.name || Object.values(rx.diagnosis).filter(x => typeof x === "string").join(", ") || diagText;
      }
    }

    const titleToSave = `Prescription - Dr. ${doctorName} (${dateStr})`;
    const docDesc = `Verified digital prescription signed by Dr. ${doctorName} (${rx.doctor_specialization || "Specialist"}) for ${diagText}`;

    // 2. Upload the real client-generated PDF file to AWS S3 if provided
    let urlToSave = rx.file_url || null;
    let fileSize = 0;

    if (file && typeof file.arrayBuffer === "function") {
      try {
        const arrayBuf = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        fileSize = buffer.length;
        const fileName = `${cleanPatientId}-prescription-${rx.id}-${Date.now()}.pdf`;
        const { url } = await uploadToS3(buffer, `digital-locker/${fileName}`, "application/pdf");
        urlToSave = url;
      } catch (uploadErr) {
        console.error("Failed to upload prescription PDF to S3:", uploadErr);
        return failure("Failed to upload prescription PDF to storage.", uploadErr.message, 500, { headers: corsHeaders });
      }
    }

    if (!urlToSave) {
      return failure("A generated prescription PDF file is required to save to DigiLocker.", null, 400, { headers: corsHeaders });
    }

    // 3. Check if already present in digital_locker_documents
    const existing = await sql`
      SELECT id, document_name, document_url, created_at
      FROM digital_locker_documents
      WHERE user_id = ${cleanPatientId}
        AND document_type = 'prescription'
        AND (
          ${rx.id} = ANY(tags)
          OR document_url = ${urlToSave}
          OR document_name = ${titleToSave}
        )
      LIMIT 1
    `;

    if (existing.length > 0) {
      // Update with the fresh S3 URL if existing didn't have one
      if (urlToSave && (!existing[0].document_url || !existing[0].document_url.startsWith("http"))) {
        await sql`
          UPDATE digital_locker_documents 
          SET document_url = ${urlToSave}, file_size = ${fileSize}, updated_at = NOW()
          WHERE id = ${existing[0].id}
        `;
      }
      return success("Prescription is already saved in your MediConnect DigiLocker.", {
        document: { ...existing[0], document_url: urlToSave || existing[0].document_url },
        already_saved: true,
      }, 200, { headers: corsHeaders });
    }

    // 4. Insert into digital_locker_documents
    const inserted = await sql`
      INSERT INTO digital_locker_documents (
        user_id,
        document_name,
        document_type,
        document_url,
        file_size,
        mime_type,
        description,
        is_verified,
        is_active,
        upload_date,
        created_at,
        updated_at,
        tags
      ) VALUES (
        ${cleanPatientId},
        ${titleToSave},
        'prescription',
        ${urlToSave},
        ${fileSize},
        'application/pdf',
        ${docDesc},
        true,
        true,
        NOW(),
        NOW(),
        NOW(),
        ${["prescription", "verified_doctor", doctorName, rx.id, "digilocker"]}
      )
      RETURNING *
    `;

    return success("Prescription successfully saved to your MediConnect DigiLocker!", {
      document: inserted[0],
      already_saved: false,
    }, 200, { headers: corsHeaders });

  } catch (err) {
    console.error("Save Prescription to DigiLocker Error:", err);
    return failure("Failed to save prescription to DigiLocker.", err.message, 500, { headers: corsHeaders });
  }
}
