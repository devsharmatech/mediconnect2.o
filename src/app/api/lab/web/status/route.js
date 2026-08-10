import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { id, onboarding_status } = await req.json();
    if (!id || !onboarding_status)
      return failure("Missing fields.", "validation_error", 400, {
        headers: corsHeaders,
      });

    const { data, error } = await supabase
      .from("lab_details")
      .update({ onboarding_status })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    return success("Lab onboarding status updated.", data, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    return failure("Failed to update status. " + error.message, "status_update_failed", 500, {
      headers: corsHeaders,
    });
  }
}
