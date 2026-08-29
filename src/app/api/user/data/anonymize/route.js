import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";
import { anonymizePatientAccount } from "@/lib/patientDeletion";
import { corsHeaders } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * POST /api/user/data/anonymize
 * DPDP Compliant Anonymization. Removes PII but retains clinical data for aggregate analytics.
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { user_id, reason } = body;

    if (!user_id) {
      return failure("user_id is required", null, 400, { headers: corsHeaders });
    }

    // 1. Verify User Exists and Get Role
    const { data: user } = await supabase.from("users").select("id, role").eq("id", user_id).single();
    if (!user) return failure("User not found", null, 404, { headers: corsHeaders });

    if (user.role === "patient") {
      const result = await anonymizePatientAccount(user_id, reason || "USER_REQUEST");
      return success("User data anonymized successfully. Clinical records de-identified and retained for statutory audits.", result, 200, { headers: corsHeaders });
    }

    // For non-patient roles (doctors, chemists, labs), mask basic profile
    const { error: userErr } = await supabase
      .from("users")
      .update({
        phone_number: "ANONYMIZED_" + user_id.substring(0, 8),
        profile_picture: null,
      })
      .eq("id", user_id);

    if (userErr) throw userErr;

    const roleTables = {
      admin: "admin_details",
      doctor: "doctor_details",
      chemist: "chemist_details",
      pharmacist: "pharmacist_details",
      lab: "lab_details",
    };

    const detailsTable = roleTables[user.role];
    if (detailsTable) {
      const updatePayload = {
        full_name: user.role === "doctor" ? "DE-IDENTIFIED CLINICIAN" : "DE-IDENTIFIED USER",
        email: `anonymized_${user_id.substring(0, 8)}@mediconnect.fit`,
      };

      if (user.role === "doctor") {
        updatePayload.clinic_address = "ANONYMIZED";
        updatePayload.clinic_name = "ANONYMIZED";
        updatePayload.license_number = "ANONYMIZED";
      }

      await supabase.from(detailsTable).update(updatePayload).eq("id", user_id);
    }

    return success("User data anonymized successfully.", {
      user_id,
      anonymized_at: new Date().toISOString()
    }, 200, { headers: corsHeaders });

  } catch (err) {
    console.error("POST /api/user/data/anonymize error:", err);
    return failure("Internal server error", err.message, 500, { headers: corsHeaders });
  }
}



