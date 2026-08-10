import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req) {
  try {
    const { user_id, symptoms } = await req.json();

    if (!user_id || !symptoms) {
      return failure("Missing required fields", null, 400);
    }

    // Save symptom log
    const { data: log, error } = await supabase
      .from("symptom_logs")
      .insert({
        patient_id: user_id,
        symptoms: symptoms,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    // Basic heuristic response (Mock AI since we don't have an AI endpoint)
    const diagnosis = "Based on the symptoms provided, it is recommended to consult a general physician.";

    return success("Symptoms analyzed", { diagnosis, log_id: log?.id }, 200);
  } catch (error) {
    console.error("Symptom Check Error:", error);
    return failure("Internal Server Error", error.message, 500);
  }
}
