import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req, { params }) {
  try {
    const { id } = params;

    const { data, error } = await supabase
      .from("user_insurance_applications")
      .select(`
        *,
        health_insurance_policies (
          *,
          health_insurance_providers (*)
        )
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    return success("Insurance application fetched successfully.", data, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("GET Insurance Application Error:", error);
    return failure(
      "Failed to fetch insurance application. " + error.message,
      "application_fetch_failed",
      500,
      { headers: corsHeaders }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const formData = await req.json();

    const { data, error } = await supabase
      .from("user_insurance_applications")
      .update({
        application_status: formData.application_status,
        policy_start_date: formData.policy_start_date,
        policy_end_date: formData.policy_end_date,
        remarks: formData.remarks,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(`
        *,
        health_insurance_policies (
          policy_name,
          health_insurance_providers (
            provider_name
          )
        )
      `)
      .single();

    if (error) throw error;

    return success("Insurance application updated successfully.", data, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Update Insurance Application Error:", error);
    return failure(
      "Failed to update insurance application. " + error.message,
      "application_update_failed",
      500,
      { headers: corsHeaders }
    );
  }
}