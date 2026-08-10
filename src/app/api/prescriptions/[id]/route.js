import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const { data: prescription, error } = await supabase
      .from("prescriptions")
      .select(
        `
    id,
    appointment_id,
    doctor_id,
    patient_id,
    medicines,
    lab_tests,
    special_message,
    ai_analysis,
    created_at,
    updated_at,
    appointments:appointment_id (
      id,
      appointment_date,
      appointment_time,
      status,
      disease_info
    ),
    doctor_details:doctor_id (
      id,
      full_name,
      email,
      specialization,
      qualification,
      experience_years,
      clinic_name,
      clinic_address,
      consultation_fee,
      rating,
      total_reviews,
      signature_url
    ),
    patient_details:patient_id (
      id,
      full_name,
      email,
      gender,
      date_of_birth,
      blood_group,
      address
    )
  `
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!prescription)
      return failure("Prescription not found.", null, 404, {
        headers: corsHeaders,
      });

    const response = {
      id: prescription.id,
      created_at: prescription.created_at,
      updated_at: prescription.updated_at,
      medicines: prescription.medicines || [],
      lab_tests: prescription.lab_tests || [],
      special_message: prescription.special_message || "",
      ai_analysis: prescription.ai_analysis || {},
      appointment: {
        id: prescription.appointments?.id,
        date: prescription.appointments?.appointment_date,
        time: prescription.appointments?.appointment_time,
        status: prescription.appointments?.status,
        disease_info: prescription.appointments?.disease_info || {},
      },
      doctor: prescription.doctor_details
        ? {
            id: prescription.doctor_details.id,
            full_name: prescription.doctor_details.full_name,
            email: prescription.doctor_details.email,
            specialization: prescription.doctor_details.specialization,
            qualification: prescription.doctor_details.qualification,
            experience_years: prescription.doctor_details.experience_years,
            clinic_name: prescription.doctor_details.clinic_name,
            clinic_address: prescription.doctor_details.clinic_address,
            consultation_fee: prescription.doctor_details.consultation_fee,
            rating: prescription.doctor_details.rating,
            total_reviews: prescription.doctor_details.total_reviews,
          }
        : null,
      patient: prescription.patient_details
        ? {
            id: prescription.patient_details.id,
            full_name: prescription.patient_details.full_name,
            email: prescription.patient_details.email,
            gender: prescription.patient_details.gender,
            date_of_birth: prescription.patient_details.date_of_birth,
            blood_group: prescription.patient_details.blood_group,
            address: prescription.patient_details.address,
          }
        : null,
    };

    return success("Prescription fetched successfully.", response, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Get prescription error:", error);
    return failure("Failed to fetch prescription.", error.message, 500, {
      headers: corsHeaders,
    });
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const {
      appointment_id,
      doctor_id,
      patient_id,
      medicines,
      lab_tests,
      special_message,
      ai_analysis,
    } = body;

    if (!id) {
      return failure("Prescription ID is required", null, 400, {
        headers: corsHeaders,
      });
    }

    const { data, error } = await supabase
      .from("prescriptions")
      .update({
        appointment_id,
        doctor_id,
        patient_id,
        medicines,
        lab_tests,
        special_message,
        ai_analysis,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return success("Prescription updated successfully.", data, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Update prescription error:", error);
    return failure("Failed to update prescription.", error.message, 500, {
      headers: corsHeaders,
    });
  }
}
