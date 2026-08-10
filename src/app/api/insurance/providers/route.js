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
    const isActive = searchParams.get("is_active");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("health_insurance_providers")
      .select("*", { count: "exact" })
      .order("provider_name", { ascending: true });

    if (search) {
      query = query.ilike("provider_name", `%${search}%`);
    }
    if (isActive !== null) {
      query = query.eq("is_active", isActive === "true");
    }

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    return success(
      "Insurance providers fetched successfully.",
      {
        providers: data,
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
    console.error("GET Insurance Providers Error:", error);
    return failure(
      "Failed to fetch insurance providers. " + error.message,
      "provider_list_failed",
      500,
      { headers: corsHeaders }
    );
  }
}

export async function POST(req) {
  try {
    const formData = await req.json();

    const required = ["provider_name", "contact_email", "contact_phone"];
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
      .from("health_insurance_providers")
      .insert([
        {
          provider_name: formData.provider_name,
          description: formData.description,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          website_url: formData.website_url,
          logo_url: formData.logo_url,
          is_active: formData.is_active !== undefined ? formData.is_active : true,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return success("Insurance provider created successfully.", data, 201, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Create Insurance Provider Error:", error);
    return failure(
      "Failed to create insurance provider. " + error.message,
      "provider_creation_failed",
      500,
      { headers: corsHeaders }
    );
  }
}