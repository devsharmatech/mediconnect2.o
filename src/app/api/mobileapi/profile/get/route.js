import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { resolveCallerFromRequest } from "@/lib/layer1/authGuard";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { user_id } = await req.json();
    if (!user_id)
      return failure("User ID is required.", null, 400, { headers: corsHeaders });

    const caller = await resolveCallerFromRequest(req, user_id);
    if (!caller) {
      return failure("Unauthorized - missing or invalid token.", null, 401, { headers: corsHeaders });
    }

    if (caller.id !== user_id && caller.role !== "admin") {
      return failure("Forbidden - access denied to this profile.", null, 403, { headers: corsHeaders });
    }

    // 🧩 Get base user
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, un_id, role, phone_number, profile_picture, is_verified, created_at")
      .eq("id", user_id)
      .maybeSingle();

    if (userError) throw userError;
    if (!user)
      return failure("User not found.", null, 404, { headers: corsHeaders });

    const roleTables = {
      admin: "admin_details",
      doctor: "doctor_details",
      patient: "patient_details",
      chemist: "chemist_details",
      pharmacist: "pharmacist_details",
      lab: "lab_details",
    };

    const table = roleTables[user.role];
    if (!table)
      return failure("Invalid role or missing role mapping.", null, 400, {
        headers: corsHeaders,
      });

    // 🧩 Fetch role details
    const { data: details, error: detailsError } = await supabase
      .from(table)
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (detailsError) throw detailsError;
    if (!details)
      return failure("Profile details not found.", null, 404, { headers: corsHeaders });

    return success(
      "Profile fetched successfully.",
      { ...user, details },
      200,
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Get Profile Error:", error);
    return failure("Failed to fetch profile.", error.message, 500, { headers: corsHeaders });
  }
}
