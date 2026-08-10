import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { user_id, camera, location, notifications } = await req.json();

    if (!user_id) {
      return failure("Missing user_id", null, 400, { headers: corsHeaders });
    }

    const { data: patient, error: fetchError } = await supabase
      .from('patient_details')
      .select('preferences')
      .eq('id', user_id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      return failure("Database error fetching patient.", fetchError.message, 500, { headers: corsHeaders });
    }
    
    // Update preferences inside JSONB column
    const prefs = patient?.preferences || {};
    prefs.permissions = {
      camera: camera ?? false,
      location: location ?? false,
      notifications: notifications ?? false,
      updatedAt: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('patient_details')
      .update({ preferences: prefs })
      .eq('id', user_id);

    if (updateError) {
      return failure("Failed to update permissions. (Make sure preferences JSONB column exists)", updateError.message, 500, { headers: corsHeaders });
    }

    return success("Permissions updated.", prefs.permissions, 200, { headers: corsHeaders });
  } catch (error) {
    return failure("Unexpected server error", error.message, 500, { headers: corsHeaders });
  }
}
