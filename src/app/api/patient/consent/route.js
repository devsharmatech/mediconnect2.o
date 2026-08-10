import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { user_id, prescriptions, labReports, consultationHistory } = await req.json();

    if (!user_id) {
      return failure("Missing user_id", null, 400, { headers: corsHeaders });
    }

    const { data: patient, error: fetchError } = await supabase
      .from('patient_details')
      .select('consent')
      .eq('id', user_id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      return failure("Database error fetching patient.", fetchError.message, 500, { headers: corsHeaders });
    }
    
    // Update consent settings inside a JSONB column or separate table
    const consentObj = patient?.consent || {};
    consentObj.prescriptions = prescriptions ?? consentObj.prescriptions;
    consentObj.labReports = labReports ?? consentObj.labReports;
    consentObj.consultationHistory = consultationHistory ?? consentObj.consultationHistory;
    consentObj.updatedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('patient_details')
      .update({ consent: consentObj })
      .eq('id', user_id);

    if (updateError) {
      return failure("Failed to update consent preferences. (Make sure consent JSONB column exists)", updateError.message, 500, { headers: corsHeaders });
    }

    return success("Consent preferences updated.", consentObj, 200, { headers: corsHeaders });
  } catch (error) {
    return failure("Unexpected server error", error.message, 500, { headers: corsHeaders });
  }
}
