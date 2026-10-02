import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import Papa from "papaparse";
import { resolveCallerFromRequest } from "@/lib/layer1/authGuard";

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * POST /api/admin/doctors/export
 * Body: { ids: string[] | 'all', format: 'csv' | 'json', consentAcknowledged: boolean, admin_id: string }
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { ids, format = "csv", consentAcknowledged, admin_id } = body;

    // 1. Validate Consent (DPDP Compliance)
    if (!consentAcknowledged) {
      return failure(
        "Mandatory legal consent for data export is required under DPDP Act 2023.",
        null,
        422,
        { headers: corsHeaders }
      );
    }

    // Mandatory Layer-111 Cryptographic Session Privilege Validation
    const adminUser = await resolveCallerFromRequest(req);
    if (!adminUser || adminUser.role !== "admin") {
      return failure(
        "Unauthorized data extraction attempt intercepted. Cryptographically verified administrative privileges are mandatory to export medical practitioner PII/KYC datasets.",
        null,
        403,
        { headers: corsHeaders }
      );
    }

    const rawAdminId = adminUser.id || admin_id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const executingAdminId = uuidRegex.test(rawAdminId) ? rawAdminId : "00000000-0000-0000-0000-000000000000";

    // 2. Fetch Data from RDS PostgreSQL
    let doctors;
    if (ids !== "all" && Array.isArray(ids) && ids.length > 0) {
      doctors = await sql`
        SELECT 
          u.id, u.phone_number, u.status, u.created_at,
          d.full_name, d.email, d.specialization, d.license_number, d.clinic_name,
          d.clinic_address, d.experience_years, d.consultation_fee, d.onboarding_status,
          d.rating, d.total_reviews, d.dmc_mci_certificate, d.aadhaar_pan_license,
          d.address_proof, d.passport_photo, d.signature_url, d.clinic_photos,
          d.kyc_data, d.meta
        FROM users u
        LEFT JOIN doctor_details d ON u.id = d.id
        WHERE u.role = 'doctor' AND u.id = ANY(${ids})
        ORDER BY u.created_at DESC
      `;
    } else {
      doctors = await sql`
        SELECT 
          u.id, u.phone_number, u.status, u.created_at,
          d.full_name, d.email, d.specialization, d.license_number, d.clinic_name,
          d.clinic_address, d.experience_years, d.consultation_fee, d.onboarding_status,
          d.rating, d.total_reviews, d.dmc_mci_certificate, d.aadhaar_pan_license,
          d.address_proof, d.passport_photo, d.signature_url, d.clinic_photos,
          d.kyc_data, d.meta
        FROM users u
        LEFT JOIN doctor_details d ON u.id = d.id
        WHERE u.role = 'doctor'
        ORDER BY u.created_at DESC
      `;
    }

    if (!doctors || doctors.length === 0) {
      return failure("No doctor records found to export.", null, 404, {
        headers: corsHeaders,
      });
    }

    // Helper to handle potential array/object fields in CSV
    const formatValue = (val) => {
      if (Array.isArray(val)) return val.join(" ; ");
      if (typeof val === 'object' && val !== null) return JSON.stringify(val);
      return val || "N/A";
    };

    // 3. Flatten Data for Export
    const flattenedData = doctors.map((d) => ({
      ID: d.id,
      FullName: d.full_name || "N/A",
      Email: d.email || "N/A",
      Phone: d.phone_number || "N/A",
      Specialization: formatValue(d.specialization),
      LicenseNumber: d.license_number || "N/A",
      ClinicName: d.clinic_name || "N/A",
      ClinicAddress: d.clinic_address || "N/A",
      Experience: `${d.experience_years || 0} years`,
      Fee: d.consultation_fee || 0,
      Status: d.status === 1 ? "Active" : "Inactive",
      Onboarding: d.onboarding_status || "pending",
      Rating: d.rating || 0,
      Reviews: d.total_reviews || 0,
      JoinedAt: new Date(d.created_at).toLocaleDateString(),
      // Documents & Images
      MCICertificate: formatValue(d.dmc_mci_certificate),
      IDProof: formatValue(d.aadhaar_pan_license),
      AddressProof: formatValue(d.address_proof),
      PassportPhoto: formatValue(d.passport_photo),
      Signature: formatValue(d.signature_url),
      ClinicPhotos: formatValue(d.clinic_photos),
      KYC_Data: formatValue(d.kyc_data),
      Meta: formatValue(d.meta)
    }));

    // 4. Log the Data Access (Audit)
    try {
      await sql`
        INSERT INTO data_access_log (action_type, requested_by, metadata)
        VALUES (
          ${`doctor_export_complete_${format}`},
          ${executingAdminId},
          ${JSON.stringify({
            record_count: flattenedData.length,
            export_ids: ids === "all" ? "ALL" : ids,
            fields_included: ["profile", "documents", "images", "kyc", "meta"],
            legal_consent_version: "DPDP_ADMIN_V1",
            timestamp: new Date().toISOString()
          })}
        )
      `;
    } catch (logErr) {
      console.warn("Could not log data_access_log for doctor export:", logErr.message);
    }

    // 5. Format and Return
    if (format === "csv") {
      const csv = Papa.unparse(flattenedData);
      return new Response(csv, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename=doctors_complete_export_${Date.now()}.csv`,
        },
      });
    }

    return success("Complete doctor data exported successfully", flattenedData, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Doctor export error:", error);
    return failure("Failed to export doctor data.", error.message, 500, {
      headers: corsHeaders,
    });
  }
}
