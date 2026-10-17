import sql from "@/lib/db";
import { uploadToS3, getCloudFrontUrl } from "@/lib/s3";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

const safeUuid = (val) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ? val : null);

export const STANDARD_COMPLIANCE_DOCUMENTS = [
  {
    type: "incorporation_cin",
    title: "Incorporation Certificate / CIN",
    description: "Certificate of Incorporation or CIN proof verifying legal entity",
    authority: "Ministry of Corporate Affairs (MCA)",
    requires_expiry: false,
    initial_status: "RECEIVED",
  },
  {
    type: "pan_card",
    title: "PAN Card",
    description: "Entity / Authorized Signatory PAN Card",
    authority: "Income Tax Department",
    requires_expiry: false,
    initial_status: "RECEIVED",
  },
  {
    type: "bmw_agreement",
    title: "BMW Services Agreement / Renewal",
    description: "Agreement with authorized Common Bio-medical Waste Treatment Facility (CBWTF)",
    authority: "Authorized Waste Management Provider",
    requires_expiry: true,
    initial_status: "RECEIVED",
  },
  {
    type: "dpcc_noise_report",
    title: "DPCC Noise Monitoring Report",
    description: "Pollution Control Committee noise compliance monitoring report",
    authority: "DPCC / Authorized Lab",
    requires_expiry: true,
    initial_status: "RECEIVED",
  },
  {
    type: "dpcc_medical_waste",
    title: "DPCC Medical-Waste Management Report",
    description: "Medical waste management submission and authorization compliance report",
    authority: "Delhi Pollution Control Committee (DPCC)",
    requires_expiry: true,
    initial_status: "RECEIVED",
  },
  {
    type: "iso_15189",
    title: "ISO 15189:2022 Certificate",
    description: "Medical laboratories - Requirements for quality and competence",
    authority: "Certification Body / Registrar",
    requires_expiry: true,
    initial_status: "RECEIVED",
  },
  {
    type: "nabl_certificate",
    title: "NABL Accreditation Certificate",
    description: "National Accreditation Board for Testing and Calibration Laboratories certificate",
    authority: "NABL",
    requires_expiry: true,
    initial_status: "RECEIVED",
  },
  {
    type: "nabl_scope",
    title: "NABL Scope of Accreditation",
    description: "Approved scope mapping valid diagnostic tests for accreditation",
    authority: "NABL",
    requires_expiry: true,
    initial_status: "RECEIVED",
  },
  {
    type: "lab_license",
    title: "Applicable Lab Registration / Licence",
    description: "Clinical Establishment registration or local health department license",
    authority: "Directorate of Health Services",
    requires_expiry: true,
    initial_status: "RECEIVED",
  },
  {
    type: "dpcc_bmw_auth",
    title: "DPCC Biomedical-Waste Authorization",
    description: "Authorization consent under Bio-Medical Waste Management Rules",
    authority: "DPCC",
    requires_expiry: true,
    initial_status: "RECEIVED",
  },
  {
    type: "partner_agreement",
    title: "Executed Partner Agreement",
    description: "Signed bilateral partner service agreement with MediConnect",
    authority: "MediConnect & Partner",
    requires_expiry: true,
    initial_status: "NOT_APPLICABLE",
  },
  {
    type: "bank_proof",
    title: "Bank Proof (Cancelled Cheque / Letter)",
    description: "Cancelled cheque or bank account verification letter for payouts",
    authority: "Partner Bank",
    requires_expiry: false,
    initial_status: "NOT_APPLICABLE",
  },
];
export const STANDARD_COMPLIANCE_DOCS = STANDARD_COMPLIANCE_DOCUMENTS;

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

// GET all compliance documents for a lab
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const lab_id = searchParams.get("lab_id");
    const cleanId = safeUuid(lab_id);

    if (!cleanId) {
      return failure("Valid lab_id is required", "validation_error", 400, { headers: corsHeaders });
    }

    // Get lab details to map fallback URLs if not yet migrated
    const labRows = await sql`
      SELECT id, lab_name, pan_card_url, lab_license_url, aadhaar_card_url
      FROM lab_details
      WHERE id = ${cleanId}
      LIMIT 1
    `;

    if (!labRows.length) {
      return failure("Lab not found", "lab_not_found", 404, { headers: corsHeaders });
    }

    const lab = labRows[0];

    // Fetch existing records in lab_partner_documents
    const existingDocs = await sql`
      SELECT *
      FROM lab_partner_documents
      WHERE lab_id = ${cleanId}
      ORDER BY created_at ASC
    `;

    const existingMap = {};
    existingDocs.forEach((d) => {
      existingMap[d.document_type] = d;
    });

    // Merge standard checklist with uploaded records
    const documents = STANDARD_COMPLIANCE_DOCUMENTS.map((std) => {
      const record = existingMap[std.type];
      if (record) {
        return {
          ...record,
          standard_title: std.title,
          description: std.description,
          default_authority: std.authority,
          requires_expiry: std.requires_expiry,
        };
      }

      // Check legacy column fallback from lab_details
      let fallbackUrl = null;
      if (std.type === "pan_card" && lab.pan_card_url) fallbackUrl = lab.pan_card_url;
      if (std.type === "lab_license" && lab.lab_license_url) fallbackUrl = lab.lab_license_url;

      return {
        id: null,
        lab_id: cleanId,
        document_type: std.type,
        document_name: std.title,
        document_url: fallbackUrl,
        storage_key: null,
        document_number: null,
        issuing_authority: std.authority,
        issue_date: null,
        expiry_date: null,
        verification_status: fallbackUrl ? "RECEIVED" : "NOT_APPLICABLE",
        verified_by: null,
        verified_at: null,
        rejection_reason: null,
        not_applicable_reason: null,
        remarks: null,
        standard_title: std.title,
        description: std.description,
        default_authority: std.authority,
        requires_expiry: std.requires_expiry,
      };
    });

    // Add any custom documents uploaded by lab that are not in standard 12
    existingDocs.forEach((d) => {
      if (!STANDARD_COMPLIANCE_DOCUMENTS.some((s) => s.type === d.document_type)) {
        documents.push({
          ...d,
          standard_title: d.document_name,
          description: "Custom uploaded document",
          default_authority: d.issuing_authority || "Authority",
          requires_expiry: !!d.expiry_date,
        });
      }
    });

    // Calculate status counts
    const summary = {
      total: documents.length,
      verified: documents.filter((d) => d.verification_status === "VERIFIED").length,
      under_review: documents.filter((d) => d.verification_status === "UNDER_REVIEW").length,
      received: documents.filter((d) => d.verification_status === "RECEIVED").length,
      rejected: documents.filter((d) => d.verification_status === "REJECTED").length,
      not_applicable: documents.filter((d) => d.verification_status === "NOT_APPLICABLE").length,
      uploaded: documents.filter((d) => !!d.document_url).length,
    };

    return success("Compliance documents fetched successfully", { documents, summary }, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Error fetching lab partner documents:", error);
    return failure("Failed to fetch documents", error.message, 500, { headers: corsHeaders });
  }
}

// POST upload/save a document
export async function POST(req) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let lab_id, document_type, document_name, document_number, issuing_authority, issue_date, expiry_date, remarks, document_url, file;

    if (contentType.includes("application/json")) {
      const body = await req.json();
      lab_id = body.lab_id;
      document_type = body.document_type;
      document_name = body.document_name;
      document_number = body.document_number;
      issuing_authority = body.issuing_authority;
      issue_date = body.issue_date || null;
      expiry_date = body.expiry_date || null;
      remarks = body.remarks || null;
      document_url = body.document_url || null;
    } else {
      const formData = await req.formData();
      lab_id = formData.get("lab_id");
      document_type = formData.get("document_type");
      document_name = formData.get("document_name");
      document_number = formData.get("document_number");
      issuing_authority = formData.get("issuing_authority");
      issue_date = formData.get("issue_date") || null;
      expiry_date = formData.get("expiry_date") || null;
      remarks = formData.get("remarks") || null;
      document_url = formData.get("document_url") || null;
      file = formData.get("file");
    }

    const cleanId = safeUuid(lab_id);
    if (!cleanId) {
      return failure("Valid lab_id is required", "validation_error", 400, { headers: corsHeaders });
    }

    if (!document_type) {
      return failure("document_type is required", "validation_error", 400, { headers: corsHeaders });
    }

    let storage_key = null;
    if (file && typeof file === "object" && file.size > 0) {
      const fileExt = (file.name || "file.pdf").split(".").pop();
      const safeDocType = document_type.replace(/[^a-zA-Z0-9_-]/g, "_");
      storage_key = `lab-compliance/${cleanId}/${safeDocType}_${Date.now()}.${fileExt}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploadRes = await uploadToS3(buffer, storage_key, file.type || "application/octet-stream");
      document_url = uploadRes.url || getCloudFrontUrl(storage_key);
    }

    const docTitle = document_name || STANDARD_COMPLIANCE_DOCUMENTS.find((d) => d.type === document_type)?.title || document_type;

    // Check if record already exists for this lab and document_type
    const existing = await sql`
      SELECT id FROM lab_partner_documents
      WHERE lab_id = ${cleanId} AND document_type = ${document_type}
      LIMIT 1
    `;

    let saved;
    if (existing.length > 0) {
      const [updated] = await sql`
        UPDATE lab_partner_documents
        SET
          document_name = ${docTitle},
          document_url = COALESCE(${document_url}, document_url),
          storage_key = COALESCE(${storage_key}, storage_key),
          document_number = COALESCE(${document_number}, document_number),
          issuing_authority = COALESCE(${issuing_authority}, issuing_authority),
          issue_date = ${issue_date ? issue_date : null},
          expiry_date = ${expiry_date ? expiry_date : null},
          remarks = COALESCE(${remarks}, remarks),
          verification_status = CASE WHEN ${document_url} IS NOT NULL THEN 'RECEIVED' ELSE verification_status END,
          updated_at = NOW()
        WHERE id = ${existing[0].id}
        RETURNING *
      `;
      saved = updated;
    } else {
      const [inserted] = await sql`
        INSERT INTO lab_partner_documents (
          lab_id,
          document_type,
          document_name,
          document_url,
          storage_key,
          document_number,
          issuing_authority,
          issue_date,
          expiry_date,
          verification_status,
          remarks,
          created_at,
          updated_at
        ) VALUES (
          ${cleanId},
          ${document_type},
          ${docTitle},
          ${document_url},
          ${storage_key},
          ${document_number || null},
          ${issuing_authority || null},
          ${issue_date ? issue_date : null},
          ${expiry_date ? expiry_date : null},
          ${document_url ? 'RECEIVED' : 'NOT_APPLICABLE'},
          ${remarks || null},
          NOW(),
          NOW()
        )
        RETURNING *
      `;
      saved = inserted;
    }

    // Sync legacy columns in lab_details if pan or license
    if (document_type === "pan_card" && document_url) {
      await sql`UPDATE lab_details SET pan_card_url = ${document_url}, updated_at = NOW() WHERE id = ${cleanId}`.catch(() => {});
    } else if (document_type === "lab_license" && document_url) {
      await sql`UPDATE lab_details SET lab_license_url = ${document_url}, updated_at = NOW() WHERE id = ${cleanId}`.catch(() => {});
    }

    return success("Document saved successfully", saved, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Error saving lab partner document:", error);
    return failure("Failed to save document", error.message, 500, { headers: corsHeaders });
  }
}

// PATCH verify or update status of a compliance document
export async function PATCH(req) {
  try {
    const body = await req.json();
    const {
      id,
      lab_id,
      document_type,
      verification_status,
      verified_by = "Admin",
      rejection_reason = null,
      not_applicable_reason = null,
      remarks = null,
      document_number = null,
      expiry_date = null,
    } = body;

    const allowedStatuses = ["REQUIRED", "RECEIVED", "UNDER_REVIEW", "VERIFIED", "REJECTED", "EXPIRED", "NOT_APPLICABLE"];
    if (verification_status && !allowedStatuses.includes(verification_status)) {
      return failure(`Invalid verification_status. Allowed: ${allowedStatuses.join(", ")}`, "validation_error", 400, { headers: corsHeaders });
    }

    let targetDocId = safeUuid(id);
    const cleanLabId = safeUuid(lab_id);

    // If ID is not passed but lab_id and document_type are passed
    if (!targetDocId && cleanLabId && document_type) {
      const existing = await sql`
        SELECT id FROM lab_partner_documents
        WHERE lab_id = ${cleanLabId} AND document_type = ${document_type}
        LIMIT 1
      `;
      if (existing.length > 0) {
        targetDocId = existing[0].id;
      } else {
        // Create initial record
        const docTitle = STANDARD_COMPLIANCE_DOCUMENTS.find((d) => d.type === document_type)?.title || document_type;
        const [inserted] = await sql`
          INSERT INTO lab_partner_documents (
            lab_id,
            document_type,
            document_name,
            verification_status,
            verified_by,
            verified_at,
            not_applicable_reason,
            created_at,
            updated_at
          ) VALUES (
            ${cleanLabId},
            ${document_type},
            ${docTitle},
            ${verification_status || 'NOT_APPLICABLE'},
            ${verification_status === 'VERIFIED' ? verified_by : null},
            ${verification_status === 'VERIFIED' ? sql`NOW()` : null},
            ${not_applicable_reason || null},
            NOW(),
            NOW()
          )
          RETURNING id
        `;
        targetDocId = inserted.id;
      }
    }

    if (!targetDocId) {
      return failure("Document ID or (lab_id + document_type) is required", "validation_error", 400, { headers: corsHeaders });
    }

    const isVerified = verification_status === "VERIFIED";

    const [updated] = await sql`
      UPDATE lab_partner_documents
      SET
        verification_status = COALESCE(${verification_status}, verification_status),
        verified_by = ${isVerified ? verified_by : null},
        verified_at = ${isVerified ? sql`NOW()` : null},
        rejection_reason = ${rejection_reason !== undefined ? rejection_reason : null},
        not_applicable_reason = ${not_applicable_reason !== undefined ? not_applicable_reason : null},
        remarks = COALESCE(${remarks}, remarks),
        document_number = COALESCE(${document_number}, document_number),
        expiry_date = ${expiry_date ? expiry_date : null},
        updated_at = NOW()
      WHERE id = ${targetDocId}
      RETURNING *
    `;

    if (!updated) {
      return failure("Document not found", "not_found", 404, { headers: corsHeaders });
    }

    return success("Document status updated successfully", updated, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Error updating document status:", error);
    return failure("Failed to update document status", error.message, 500, { headers: corsHeaders });
  }
}
