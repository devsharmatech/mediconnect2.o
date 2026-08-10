import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const patient_id = searchParams.get("patient_id");

    if (!patient_id) {
      return failure("patient_id required", null, 400, { headers: corsHeaders });
    }

    const { data: prescriptions, error } = await supabase
      .from("prescriptions")
      .select("*, doctor_details(full_name)")
      .eq("patient_id", patient_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const formatted = (prescriptions || []).map((rx) => {
      const diagnosisVal = rx.diagnosis && rx.diagnosis.text ? rx.diagnosis.text : 
                           (typeof rx.diagnosis === 'string' ? rx.diagnosis : 
                           (Array.isArray(rx.diagnosis) ? rx.diagnosis.join(', ') : 'Medical Prescription'));
      return {
        id: rx.id,
        title: diagnosisVal,
        date: new Date(rx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        doctorName: rx.doctor_details?.full_name || 'Medical Practitioner'
      };
    });

    return success("Prescriptions fetched", formatted, 200, { headers: corsHeaders });
  } catch (err) {
    return failure("Error fetching prescriptions", err.message, 500, { headers: corsHeaders });
  }
}
