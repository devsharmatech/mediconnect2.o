import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req, { params }) {
  try {
     const { id } = await params; 

    if (!id) {
      return failure("Appointment ID is required.", null, 400, { headers: corsHeaders });
    }

    // Step 1: Fetch the appointment with patient_id and doctor_id only
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select('id, appointment_date, appointment_time, appointment_type, status, disease_info, created_at, updated_at, patient_id, doctor_id')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return failure("Appointment not found.", null, 404, { headers: corsHeaders });
      }
      throw error;
    }

    if (!appointment) {
      return failure("Appointment not found.", null, 404, { headers: corsHeaders });
    }

    // Step 2: Fetch patient and doctor details in parallel (flat queries — no nested joins)
    const [patientUserRes, patientDetailsRes, doctorUserRes, doctorDetailsRes] = await Promise.all([
      supabase.from('users').select('id, phone_number, un_id, profile_picture, created_at').eq('id', appointment.patient_id).maybeSingle(),
      supabase.from('patient_details').select('full_name, email, gender, date_of_birth, blood_group, address, emergency_contact').eq('id', appointment.patient_id).maybeSingle(),
      supabase.from('users').select('id, phone_number, un_id, profile_picture, created_at').eq('id', appointment.doctor_id).maybeSingle(),
      supabase.from('doctor_details').select('full_name, email, specialization, experience_years, license_number, clinic_name, clinic_address, available_days, available_time, consultation_fee, rating, total_reviews, qualification, latitude, longitude, signature_url').eq('id', appointment.doctor_id).maybeSingle(),
    ]);

    const patientUser = patientUserRes.data || {};
    const patientDetail = patientDetailsRes.data || {};
    const doctorUser = doctorUserRes.data || {};
    const doctorDetail = doctorDetailsRes.data || {};

    const transformedAppointment = {
      id: appointment.id,
      appointment_date: appointment.appointment_date,
      appointment_time: appointment.appointment_time,
      appointment_type: appointment.appointment_type,
      status: appointment.status,
      disease_info: appointment.disease_info,
      created_at: appointment.created_at,
      updated_at: appointment.updated_at,

      patient: {
        id: patientUser.id || appointment.patient_id,
        un_id: patientUser.un_id,
        phone_number: patientUser.phone_number,
        profile_picture: patientUser.profile_picture,
        created_at: patientUser.created_at,
        full_name: patientDetail.full_name,
        email: patientDetail.email,
        gender: patientDetail.gender,
        date_of_birth: patientDetail.date_of_birth,
        blood_group: patientDetail.blood_group,
        address: patientDetail.address,
        emergency_contact: patientDetail.emergency_contact,
      },

      doctor: {
        id: doctorUser.id || appointment.doctor_id,
        un_id: doctorUser.un_id,
        phone_number: doctorUser.phone_number,
        profile_picture: doctorUser.profile_picture,
        created_at: doctorUser.created_at,
        full_name: doctorDetail.full_name,
        email: doctorDetail.email,
        specialization: doctorDetail.specialization,
        experience_years: doctorDetail.experience_years,
        license_number: doctorDetail.license_number,
        clinic_name: doctorDetail.clinic_name,
        clinic_address: doctorDetail.clinic_address,
        available_days: doctorDetail.available_days,
        available_time: doctorDetail.available_time,
        consultation_fee: doctorDetail.consultation_fee,
        rating: doctorDetail.rating,
        total_reviews: doctorDetail.total_reviews,
        qualification: doctorDetail.qualification,
        latitude: doctorDetail.latitude,
        longitude: doctorDetail.longitude,
        signature_url: doctorDetail.signature_url,
      },
    };

    return success(
      "Appointment details fetched successfully.",
      {
        appointment: transformedAppointment
      },
      200,
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error("Appointment details fetch error:", error);
    return failure("Failed to fetch appointment details.", error.message, 500, { headers: corsHeaders });
  }
}