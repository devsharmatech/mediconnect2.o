import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req, { params }) {
  try {
    const { id: patient_id } = await params;

    if (!patient_id) {
      return failure("patient_id is required in URL path", null, 400);
    }

    // 1. Fetch Lab Records / Documents from upload table
    const { data: documents, error: docError } = await supabase
      .from("upload") // or 'records' if you have a specific table
      .select("id, original_name, file_url, file_type, ai_tags, created_at")
      .eq("user_id", patient_id)
      .order("created_at", { ascending: false });

    // 3. Fetch past prescriptions given to this patient
    const { data: prescriptions, error: preError } = await supabase
      .from("prescriptions")
      .select("id, diagnosis, advice, created_at, doctor_id")
      .eq("patient_id", patient_id)
      .order("created_at", { ascending: false });

    // 4. Fetch lab reports
    const { data: labReports, error: labError } = await supabase
      .from("lab_reports")
      .select("*, lab_details(lab_name)")
      .eq("patient_id", patient_id)
      .order("created_at", { ascending: false });

    if (docError) {
      console.warn("Could not fetch documents:", docError);
    }
    
    if (preError) {
      console.warn("Could not fetch prescriptions:", preError);
    }

    if (labError) {
      console.warn("Could not fetch lab reports:", labError);
    }
 
    return success("Patient records fetched successfully", {
      documents: documents || [],
      prescriptions: prescriptions || [],
      labReports: labReports || []
    }, 200);

  } catch (err) {
    console.error("[Doctor Patient Records API] Exception:", err);
    return failure("Internal Server Error", err.message, 500);
  }
}
