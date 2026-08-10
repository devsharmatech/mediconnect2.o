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
    const userId = searchParams.get("user_id");
    const status = searchParams.get("status");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("user_insurance_applications")
      .select(`
        *,
        health_insurance_policies (
          policy_name,
          policy_type,
          sum_insured,
          premium_amount,
          health_insurance_providers (
            provider_name,
            logo_url
          )
        )
      `, { count: "exact" })
      .order("created_at", { ascending: false });

    if (userId) {
      query = query.eq("user_id", userId);
    }
    if (status) {
      query = query.eq("application_status", status);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    return success(
      "Insurance applications fetched successfully.",
      {
        applications: data,
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
    console.error("GET Insurance Applications Error:", error);
    return failure(
      "Failed to fetch insurance applications. " + error.message,
      "application_list_failed",
      500,
      { headers: corsHeaders }
    );
  }
}

export async function POST(req) {
  try {
    const formData = await req.json();

    const required = [
      "user_id",
      "policy_id",
      "applicant_name",
      "applicant_age",
      "sum_insured",
      "premium_amount",
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
      .from("user_insurance_applications")
      .insert([
        {
          user_id: formData.user_id,
          policy_id: formData.policy_id,
          applicant_name: formData.applicant_name,
          applicant_email: formData.applicant_email,
          applicant_phone: formData.applicant_phone,
          applicant_age: parseInt(formData.applicant_age),
          applicant_gender: formData.applicant_gender,
          sum_insured: parseFloat(formData.sum_insured),
          premium_amount: parseFloat(formData.premium_amount),
          medical_history: formData.medical_history || {},
          nominee_details: formData.nominee_details || {},
          documents_submitted: formData.documents_submitted || [],
          application_status: "pending",
          application_date: new Date().toISOString(),
        },
      ])
      .select(`
        *,
        health_insurance_policies (
          policy_name,
          policy_type,
          health_insurance_providers (
            provider_name
          )
        )
      `)
      .single();

    if (error) throw error;

    return success("Insurance application submitted successfully.", data, 201, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Create Insurance Application Error:", error);
    return failure(
      "Failed to submit insurance application. " + error.message,
      "application_submission_failed",
      500,
      { headers: corsHeaders }
    );
  }
}