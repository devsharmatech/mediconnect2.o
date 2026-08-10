import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { id, onboarding_status } = await req.json();

    if (!id || !onboarding_status) {
      return failure("ID and status are required", "validation_error", 400, {
        headers: corsHeaders,
      });
    }

    const validStatuses = ["pending", "approved", "rejected"];
    if (!validStatuses.includes(onboarding_status)) {
      return failure("Invalid status", "validation_error", 400, {
        headers: corsHeaders,
      });
    }

    const { data, error } = await supabase
      .from("hospital_details")
      .update({ 
        onboarding_status,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return success("Hospital status updated successfully.", data, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Update Hospital Status Error:", error);
    return failure(
      "Failed to update hospital status. " + error.message,
      "hospital_status_update_failed",
      500,
      {
        headers: corsHeaders,
      }
    );
  }
}