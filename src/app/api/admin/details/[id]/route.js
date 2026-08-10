import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(_, { params }) {
  try {
    const { id } = await params;

    if (!id)
      return failure("Missing admin ID.", "validation_error", 400, { headers: corsHeaders });

    // 🔹 Get user + admin details joined
    const { data, error } = await supabase
      .from("users")
      .select(
        `
        id,
        phone_number,
        role,
        profile_picture,
        is_verified,
        created_at,
        updated_at,
        admin_details:admin_details(
          full_name,
          email,
          permissions,
          created_at
        )
      `
      )
      .eq("id", id)
      .eq("role", "admin")
      .maybeSingle();

    if (error) throw error;
    if (!data) return failure("Admin not found.", "not_found", 404, { headers: corsHeaders });

    return success("Admin details fetched successfully.", data, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Fetch admin details error:", err);
    return failure("Failed to fetch admin details. " + err.message, "admin_fetch_failed", 500, {
      headers: corsHeaders,
    });
  }
}
