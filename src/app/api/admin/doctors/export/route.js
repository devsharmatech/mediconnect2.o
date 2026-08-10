import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import Papa from "papaparse";
import { resolveCallerFromRequest } from "@/lib/layer1/authGuard";

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

    // Mandatory Layer-111 Cryptographic Session Privilege Validation (Gap 2.3 Remediation)
    const adminUser = await resolveCallerFromRequest(req);
    if (!adminUser || adminUser.role !== "admin") {
      return failure(
        "Unauthorized data extraction attempt intercepted. Cryptographically verified administrative privileges are mandatory to export medical practitioner PII/KYC datasets.",
        null,
        403,
        { headers: corsHeaders }
      );
    }

    const executingAdminId = adminUser.id || admin_id;

    // 2. Fetch Data
    let query = supabase
      .from("users")
      .select(`
        id,
        phone_number,
        status,
        created_at,
        doctor_details (
          full_name,
          email,
          specialization,
          license_number,
          clinic_name,
          clinic_address,
          experience_years,
          consultation_fee,
          onboarding_status,
          rating,
          total_reviews,
          dmc_mci_certificate,
          aadhaar_pan_license,
          address_proof,
          passport_photo,
          signature_url,
          clinic_photos,
          kyc_data,
          meta
        )
      `)
      .eq("role", "doctor");

    if (ids !== "all" && Array.isArray(ids) && ids.length > 0) {
      query = query.in("id", ids);
    }

    const { data: doctors, error: fetchErr } = await query;

    if (fetchErr) throw fetchErr;

    if (!doctors || doctors.length === 0) {
      return failure("No doctor records found to export.", null, 404, {
        headers: corsHeaders,
      });
    }

    // Helper to handle potential array fields in CSV
    const formatValue = (val) => {
      if (Array.isArray(val)) return val.join(" ; ");
      if (typeof val === 'object' && val !== null) return JSON.stringify(val);
      return val || "N/A";
    };

    // 3. Flatten Data for Export
    const flattenedData = doctors.map((d) => ({
      ID: d.id,
      FullName: d.doctor_details?.full_name || "N/A",
      Email: d.doctor_details?.email || "N/A",
      Phone: d.phone_number || "N/A",
      Specialization: formatValue(d.doctor_details?.specialization),
      LicenseNumber: d.doctor_details?.license_number || "N/A",
      ClinicName: d.doctor_details?.clinic_name || "N/A",
      ClinicAddress: d.doctor_details?.clinic_address || "N/A",
      Experience: `${d.doctor_details?.experience_years || 0} years`,
      Fee: d.doctor_details?.consultation_fee || 0,
      Status: d.status === 1 ? "Active" : "Inactive",
      Onboarding: d.doctor_details?.onboarding_status || "pending",
      Rating: d.doctor_details?.rating || 0,
      Reviews: d.doctor_details?.total_reviews || 0,
      JoinedAt: new Date(d.created_at).toLocaleDateString(),
      // Documents & Images
      MCICertificate: formatValue(d.doctor_details?.dmc_mci_certificate),
      IDProof: formatValue(d.doctor_details?.aadhaar_pan_license),
      AddressProof: formatValue(d.doctor_details?.address_proof),
      PassportPhoto: formatValue(d.doctor_details?.passport_photo),
      Signature: formatValue(d.doctor_details?.signature_url),
      ClinicPhotos: formatValue(d.doctor_details?.clinic_photos),
      KYC_Data: formatValue(d.doctor_details?.kyc_data),
      Meta: formatValue(d.doctor_details?.meta)
    }));

    // 4. Log the Data Access (Audit)
    await supabase.from("data_access_log").insert({
      action_type: `doctor_export_complete_${format}`,
      requested_by: executingAdminId,
      metadata: {
        record_count: flattenedData.length,
        export_ids: ids === "all" ? "ALL" : ids,
        fields_included: ["profile", "documents", "images", "kyc", "meta"],
        legal_consent_version: "DPDP_ADMIN_V1",
        timestamp: new Date().toISOString()
      },
    });

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
