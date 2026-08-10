// /api/chemist/profile/get.js
import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { chemist_id } = await req.json();

    if (!chemist_id) {
      return failure("chemist_id is required", null, 400, { headers: corsHeaders });
    }

    // 1) fetch chemist_details
    const { data: chemist, error: chemistErr } = await supabase
      .from("chemist_details")
      .select("*")
      .eq("id", chemist_id)
      .maybeSingle();

    if (chemistErr) throw chemistErr;

    if (!chemist) {
      return failure("Chemist not found", null, 404, { headers: corsHeaders });
    }

    // 2) fetch user row from users table by same id
    const { data: user, error: userErr } = await supabase
      .from("users")
      .select("id, phone_number, profile_picture, role, status, created_at")
      .eq("id", chemist_id)
      .maybeSingle();

    if (userErr) throw userErr;

    // Merge into one response object
    const payload = {
      ...chemist,
      user: user || null,
    };

    return success("Chemist profile fetched", payload, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Error fetching chemist profile:", err);
    return failure("Error fetching chemist profile", err.message, 500, { headers: corsHeaders });
  }
}
