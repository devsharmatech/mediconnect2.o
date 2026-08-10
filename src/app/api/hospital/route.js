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
    const status = searchParams.get("status") || "";
    const hospitalType = searchParams.get("type") || "";
    const offset = (page - 1) * limit;

    let query = supabase
      .from("hospital_details")
      .select("*, users!inner(id, phone_number, profile_picture, role)", {
        count: "exact",
      })
      .eq("users.role", "hospital")
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (search) query = query.ilike("hospital_name", `%${search}%`);
    if (status) query = query.eq("onboarding_status", status);
    if (hospitalType) query = query.eq("hospital_type", hospitalType);

    const { data, count, error } = await query;
    if (error) throw error;

    return success(
      "Hospitals fetched successfully.",
      {
        hospitals: data,
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
    console.error("GET Hospitals Error:", error);
    return failure(
      "Failed to fetch hospitals. " + error.message,
      "hospital_list_failed",
      500,
      {
        headers: corsHeaders,
      }
    );
  }
}