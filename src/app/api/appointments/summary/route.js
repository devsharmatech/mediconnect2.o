import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const appointment_id = searchParams.get('appointment_id');

    if (!appointment_id) {
      return failure("Missing appointment_id", null, 400, { headers: corsHeaders });
    }

    // Fetch appointment record
    const { data: appointment } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", appointment_id)
      .maybeSingle();

    const { data: prescription, error } = await supabase
      .from("prescriptions")
      .select("*")
      .eq("appointment_id", appointment_id)
      .maybeSingle();

    if (error) throw error;

    const docId = appointment?.doctor_id || prescription?.doctor_id;
    const patId = appointment?.patient_id || prescription?.patient_id;

    let doctorDetails = null;
    let patientDetails = null;

    if (docId) {
      const { data: docData } = await supabase
        .from("doctor_details")
        .select("id, full_name, email, specialization, clinic_name, clinic_address, license_number, qualification, profile_picture, signature_url")
        .eq("id", docId)
        .maybeSingle();
      doctorDetails = docData;
    }

    if (patId) {
      const { data: patData } = await supabase
        .from("patient_details")
        .select("id, full_name, gender, date_of_birth, un_id")
        .eq("id", patId)
        .maybeSingle();

      if (patData) {
        let calculatedAge = null;
        if (patData.date_of_birth) {
          const dob = new Date(patData.date_of_birth);
          if (!isNaN(dob.getTime())) {
            const today = new Date();
            calculatedAge = today.getFullYear() - dob.getFullYear();
            const m = today.getMonth() - dob.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
              calculatedAge--;
            }
          }
        }
        patientDetails = {
          ...patData,
          age: calculatedAge !== null ? String(calculatedAge) : null,
          un_id: patData.un_id || patData.id?.slice(0, 8).toUpperCase() || null
        };
      }
    }

    if (!prescription) {
      const emptySummary = {
        appointment_id: appointment_id,
        appointment_date: appointment?.appointment_date || null,
        appointment_time: appointment?.appointment_time || null,
        appointment_type: appointment?.appointment_type || appointment?.type || null,
        doctor_details: doctorDetails,
        patient_details: patientDetails,
        diagnosis: "No formal diagnosis recorded yet.",
        prescription: [],
        lab_tests: [],
        advice: "Follow general wellness guidelines.",
        followUp: "As advised by your physician."
      };
      return success("No prescription found for this appointment", emptySummary, 200, { headers: corsHeaders });
    }

    const diagnosisVal = prescription.diagnosis && prescription.diagnosis.primary ? prescription.diagnosis.primary :
                         (prescription.diagnosis && prescription.diagnosis.text ? prescription.diagnosis.text : 
                         (typeof prescription.diagnosis === 'string' ? prescription.diagnosis : 
                         (Array.isArray(prescription.diagnosis) ? prescription.diagnosis.join(', ') : "Upper respiratory tract symptoms")));

    const rawMedicines = Array.isArray(prescription.medicines) ? prescription.medicines : [];
    const formattedMedicines = rawMedicines.map(m => ({
      name: m.name || m.medicine_name || "Medicine",
      dosage: m.dosage || m.dosage_instruction || "As directed",
      duration: m.duration || "As advised",
      frequency: m.frequency || "",
      instructions: m.instructions || ""
    }));

    const adviceVal = prescription.special_message || 
                      (prescription.special_instructions && prescription.special_instructions.text ? prescription.special_instructions.text :
                      (typeof prescription.special_instructions === 'string' ? prescription.special_instructions : "Take rest and drink warm water."));

    const followUpVal = prescription.follow_up && prescription.follow_up.notes ? prescription.follow_up.notes :
                        (prescription.follow_up && prescription.follow_up.text ? prescription.follow_up.text :
                        (typeof prescription.follow_up === 'string' ? prescription.follow_up : "Follow up if symptoms persist."));

    const summary = {
      prescription_id: prescription.id,
      appointment_id: appointment_id,
      appointment_date: appointment?.appointment_date || null,
      appointment_time: appointment?.appointment_time || null,
      appointment_type: appointment?.appointment_type || appointment?.type || null,
      doctor_details: doctorDetails,
      patient_details: patientDetails,
      diagnosis: diagnosisVal,
      prescription: formattedMedicines,
      lab_tests: prescription.lab_tests || [],
      advice: adviceVal,
      followUp: followUpVal
    };

    return success("Consultation summary fetched.", summary, 200, { headers: corsHeaders });
  } catch (error) {
    return failure("Unexpected server error", error.message, 500, { headers: corsHeaders });
  }
}
