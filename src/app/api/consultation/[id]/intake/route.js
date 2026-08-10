import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req, { params }) {
  try {
    const { id } = params;

    if (!id) {
      return failure("consultation id is required", null, 400);
    }

    // Attempt to fetch from consultations first
    const { data: consultation, error: cErr } = await supabase
      .from("consultations")
      .select("summary, diagnosis, notes, appointment_id")
      .eq("id", id)
      .maybeSingle();

    let intake = {
      appointment_id: id,
      primary_symptom: "Not specified",
      ai_summary: "No AI intake summary available yet.",
      vitals: {}
    };

    if (consultation) {
      intake.appointment_id = consultation.appointment_id;
      if (consultation.summary) intake.ai_summary = consultation.summary;
      if (consultation.diagnosis) intake.primary_symptom = consultation.diagnosis;
      if (consultation.notes) intake.ai_summary += "\n\nNotes: " + consultation.notes;
    }

    // Try fetching vitals from prescriptions linked to this appointment (since the schema stores vitals there)
    const aptId = consultation ? consultation.appointment_id : id; // Assume id might be appointment_id
    const { data: prescription } = await supabase
      .from("prescriptions")
      .select("vital_signs, diagnosis")
      .eq("appointment_id", aptId)
      .maybeSingle();

    if (prescription) {
      if (prescription.vital_signs) {
        intake.vitals = prescription.vital_signs;
      }
      if (prescription.diagnosis && prescription.diagnosis.primary) {
        intake.primary_symptom = prescription.diagnosis.primary;
      }
    }

    return success("Consultation intake fetched", { intake }, 200);
  } catch (error) {
    console.error("Consultation Intake API Error:", error);
    return failure("Internal Server Error", error.message, 500);
  }
}
