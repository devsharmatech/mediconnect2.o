import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { lab_id, updates } = await req.json();

    if (!lab_id) {
      return failure("lab_id required", null, 400, { headers: corsHeaders });
    }

    if (!updates || typeof updates !== 'object') {
      return failure("updates object required", null, 400, { headers: corsHeaders });
    }

    // Update lab details
    const { data, error } = await supabase
      .from("lab_details")
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq("id", lab_id)
      .select()
      .single();

    if (error) throw error;

    return success("Profile updated successfully", data, 200, { headers: corsHeaders });
  } catch (err) {
    return failure("Failed to update profile", err.message, 500, { headers: corsHeaders });
  }
}