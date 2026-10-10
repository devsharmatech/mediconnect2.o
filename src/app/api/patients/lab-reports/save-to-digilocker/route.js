import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

const safeUuid = (val) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ? val : null);

export async function POST(req) {
  try {
    const { patient_id, report_id, order_id, report_url, document_name } = await req.json();

    const cleanPatientId = safeUuid(patient_id);
    if (!cleanPatientId) {
      return failure("Valid patient_id is required.", null, 400, { headers: corsHeaders });
    }

    let urlToSave = report_url;
    let titleToSave = document_name || "Diagnostic Lab Report";
    let labName = "Diagnostic Lab";

    // If report_id or order_id provided, look up details
    if (report_id) {
      const rep = await sql`
        SELECT lr.*, ld.lab_name
        FROM lab_reports lr
        LEFT JOIN lab_details ld ON ld.id = lr.lab_id
        WHERE lr.id = ${safeUuid(report_id)}
        LIMIT 1
      `;
      if (rep.length > 0) {
        urlToSave = urlToSave || rep[0].report_url;
        labName = rep[0].lab_name || labName;
        titleToSave = titleToSave || `Diagnostic Report (${rep[0].test_type || "Lab Test"}) - ${labName}`;
      }
    } else if (order_id) {
      const ord = await sql`
        SELECT o.*, ld.lab_name
        FROM lab_test_orders o
        LEFT JOIN lab_details ld ON ld.id = o.lab_id
        WHERE o.id = ${safeUuid(order_id)}
        LIMIT 1
      `;
      if (ord.length > 0) {
        labName = ord[0].lab_name || labName;
        const rep = await sql`
          SELECT report_url, test_type FROM lab_reports WHERE order_id = ${ord[0].id} LIMIT 1
        `;
        if (rep.length > 0) {
          urlToSave = urlToSave || rep[0].report_url;
          titleToSave = `Diagnostic Report #${ord[0].unid || ""} - ${labName}`;
        }
      }
    }

    if (!urlToSave) {
      return failure("Report URL not found. Report might not be uploaded yet.", null, 400, { headers: corsHeaders });
    }

    // Check if already in digital locker
    const existing = await sql`
      SELECT id, document_name, document_url, created_at
      FROM digital_locker_documents
      WHERE user_id = ${cleanPatientId}
        AND (document_url = ${urlToSave} OR document_name = ${titleToSave})
      LIMIT 1
    `;

    if (existing.length > 0) {
      return success("Report is already safely stored in your MediConnect DigiLocker.", {
        document: existing[0],
        already_saved: true,
      }, 200, { headers: corsHeaders });
    }

    const isPdf = urlToSave.toLowerCase().endsWith(".pdf");

    // Insert into digital_locker_documents
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
        'lab_report',
        ${urlToSave},
        0,
        ${isPdf ? "application/pdf" : "image/jpeg"},
        ${`Verified diagnostic report issued by ${labName}`},
        true,
        true,
        NOW(),
        NOW(),
        NOW(),
        ${["lab_report", "verified_lab", labName]}
      )
      RETURNING *
    `;

    return success("Report successfully added to your MediConnect DigiLocker!", {
      document: inserted[0],
      already_saved: false,
    }, 200, { headers: corsHeaders });

  } catch (err) {
    console.error("Save to DigiLocker Error:", err);
    return failure("Failed to save report to DigiLocker.", err.message, 500, { headers: corsHeaders });
  }
}
