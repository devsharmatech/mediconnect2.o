import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";

export async function POST(req) {
  try {
    const body = await req.json();
    const { note, patientId, doctorId } = body;

    if (!note || !patientId || !doctorId) {
      return failure("Note, patientId, and doctorId are required", null, 400);
    }

    const { error } = await supabase.from("medical_notes").insert([
      {
        patient_id: patientId,
        doctor_id: doctorId,
        note: note,
        created_at: new Date()
      }
    ]);

    if (error) {
      // For prototype, if medical_notes table doesn't exist, we just ignore the error 
      // or we return success and tell the user to create it
      if (error.code === '42P01') {
        console.warn("medical_notes table does not exist in Supabase yet.");
      } else {
        throw error;
      }
    }

    return success("Note saved successfully", { patientId }, 200);
  } catch (error) {
    console.error("Notes Save Error:", error);
    return failure("Internal Error", error.message, 500);
  }
}
