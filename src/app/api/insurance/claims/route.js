import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const applicationId = searchParams.get("application_id");
    const status = searchParams.get("status");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("insurance_claims")
      .select(`
        *,
        user_insurance_applications (
          applicant_name,
          applicant_phone,
          health_insurance_policies (
            policy_name,
            health_insurance_providers (
              provider_name
            )
          )
        )
      `, { count: "exact" })
      .order("created_at", { ascending: false });

    if (applicationId) {
      query = query.eq("application_id", applicationId);
    }
    if (status) {
      query = query.eq("claim_status", status);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    return success(
      "Insurance claims fetched successfully.",
      {
        claims: data,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      },
      200,
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("GET Insurance Claims Error:", error);
    return failure(
      "Failed to fetch insurance claims. " + error.message,
      "claim_list_failed",
      500,
      { headers: corsHeaders }
    );
  }
}

export async function POST(req) {
  try {
    const formData = await req.json();

    const required = [
      "application_id",
      "claim_amount",
      "claim_reason",
      "hospital_name",
      "treatment_date",
    ];
    for (const field of required) {
      if (!formData[field]) {
        return failure(
          `Missing required field: ${field}`,
          "validation_error",
          400,
          { headers: corsHeaders }
        );
      }
    }

    const { data, error } = await supabase
      .from("insurance_claims")
      .insert([
        {
          application_id: formData.application_id,
          claim_amount: parseFloat(formData.claim_amount),
          claim_reason: formData.claim_reason,
          hospital_name: formData.hospital_name,
          treatment_date: formData.treatment_date,
          discharge_date: formData.discharge_date,
          documents_submitted: formData.documents_submitted || [],
          claim_status: "submitted",
        },
      ])
      .select(`
        *,
        user_insurance_applications (
          applicant_name,
          health_insurance_policies (
            policy_name,
            health_insurance_providers (
              provider_name
            )
          )
        )
      `)
      .single();

    if (error) throw error;

    return success("Insurance claim submitted successfully.", data, 201, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Create Insurance Claim Error:", error);
    return failure(
      "Failed to submit insurance claim. " + error.message,
      "claim_submission_failed",
      500,
      { headers: corsHeaders }
    );
  }
}