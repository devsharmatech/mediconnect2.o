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
    const search = searchParams.get("search") || "";
    const policyType = searchParams.get("type") || "";
    const providerId = searchParams.get("provider_id");
    const minSumInsured = searchParams.get("min_sum_insured");
    const maxPremium = searchParams.get("max_premium");
    const isActive = searchParams.get("is_active");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("health_insurance_policies")
      .select(`
        *,
        health_insurance_providers (
          provider_name,
          contact_email,
          contact_phone,
          website_url,
          logo_url,
          rating,
          total_reviews
        )
      `, { count: "exact" })
      .order("created_at", { ascending: false });

    if (search) {
      query = query.ilike("policy_name", `%${search}%`);
    }
    if (policyType) {
      query = query.eq("policy_type", policyType);
    }
    if (providerId) {
      query = query.eq("provider_id", providerId);
    }
    if (minSumInsured) {
      query = query.gte("sum_insured", parseFloat(minSumInsured));
    }
    if (maxPremium) {
      query = query.lte("premium_amount", parseFloat(maxPremium));
    }
    if (isActive !== null) {
      query = query.eq("is_active", isActive === "true");
    }

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    return success(
      "Insurance policies fetched successfully.",
      {
        policies: data,
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
    console.error("GET Insurance Policies Error:", error);
    return failure(
      "Failed to fetch insurance policies. " + error.message,
      "policy_list_failed",
      500,
      { headers: corsHeaders }
    );
  }
}

export async function POST(req) {
  try {
    const formData = await req.json();

    const required = [
      "provider_id",
      "policy_name",
      "policy_type",
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
      .from("health_insurance_policies")
      .insert([
        {
          provider_id: formData.provider_id,
          policy_name: formData.policy_name,
          policy_type: formData.policy_type,
          description: formData.description,
          sum_insured: parseFloat(formData.sum_insured),
          premium_amount: parseFloat(formData.premium_amount),
          premium_type: formData.premium_type || "annual",
          coverage_details: formData.coverage_details || {},
          exclusions: formData.exclusions || [],
          waiting_period: parseInt(formData.waiting_period) || 30,
          network_hospitals: formData.network_hospitals || [],
          cashless_facility: formData.cashless_facility !== undefined ? formData.cashless_facility : true,
          room_rent_limit: formData.room_rent_limit ? parseFloat(formData.room_rent_limit) : null,
          co_payment: formData.co_payment ? parseFloat(formData.co_payment) : 0,
          claim_settlement_ratio: formData.claim_settlement_ratio ? parseFloat(formData.claim_settlement_ratio) : null,
          min_age: parseInt(formData.min_age) || 0,
          max_age: parseInt(formData.max_age) || 100,
          pre_existing_conditions_waiting_period: parseInt(formData.pre_existing_conditions_waiting_period) || 24,
          is_active: formData.is_active !== undefined ? formData.is_active : true,
          features: formData.features || [],
          documents_required: formData.documents_required || [],
        },
      ])
      .select(`
        *,
        health_insurance_providers (
          provider_name,
          contact_email,
          contact_phone,
          website_url,
          logo_url
        )
      `)
      .single();

    if (error) throw error;

    return success("Insurance policy created successfully.", data, 201, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Create Insurance Policy Error:", error);
    return failure(
      "Failed to create insurance policy. " + error.message,
      "policy_creation_failed",
      500,
      { headers: corsHeaders }
    );
  }
}