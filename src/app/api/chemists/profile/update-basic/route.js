import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { chemist_id, ...fields } = await req.json();

    if (!chemist_id)
      return failure("chemist_id required", null, 400, { headers: corsHeaders });

    const { data, error } = await supabase
      .from("chemist_details")
      .update({ ...fields, updated_at: new Date() })
      .eq("id", chemist_id)
      .select()
      .maybeSingle();

    if (error) throw error;

    return success("Profile updated", data, 200, { headers: corsHeaders });
  } catch (err) {
    return failure("Error updating profile", err.message, 500, { headers: corsHeaders });
  }
}
