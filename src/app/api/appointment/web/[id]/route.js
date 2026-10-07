import sql from "@/lib/db";
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

    const rows = await sql`
      SELECT 
        a.id, a.appointment_date, a.appointment_time, a.appointment_type, a.status,
        a.disease_info, a.created_at, a.updated_at, a.patient_id, a.doctor_id,
        pu.un_id AS patient_un_id, pu.phone_number AS patient_phone, pu.profile_picture AS patient_picture,
        pd.full_name AS patient_name, pd.email AS patient_email, pd.gender AS patient_gender,
        pd.date_of_birth AS patient_dob, pd.blood_group AS patient_blood_group, pd.address AS patient_address,
        pd.emergency_contact AS patient_emergency,
        du.un_id AS doctor_un_id, du.phone_number AS doctor_phone, du.profile_picture AS doctor_picture,
        dd.full_name AS doctor_name, dd.email AS doctor_email, dd.specialization, dd.experience_years,
        dd.license_number, dd.clinic_name, dd.clinic_address, dd.available_days, dd.available_time,
        dd.consultation_fee, dd.rating, dd.total_reviews, dd.qualification, dd.latitude, dd.longitude,
        dd.signature_url
      FROM appointments a
      LEFT JOIN users pu ON pu.id = a.patient_id
      LEFT JOIN patient_details pd ON pd.id = a.patient_id
      LEFT JOIN users du ON du.id = a.doctor_id
      LEFT JOIN doctor_details dd ON dd.id = a.doctor_id
      WHERE a.id = ${id}
      LIMIT 1
    `;

    if (!rows || rows.length === 0) {
      return failure("Appointment not found.", null, 404, { headers: corsHeaders });
    }

    const row = rows[0];

    const transformedAppointment = {
      id: row.id,
      appointment_date: row.appointment_date,
      appointment_time: row.appointment_time,
      appointment_type: row.appointment_type,
      status: row.status,
      disease_info: row.disease_info,
      created_at: row.created_at,
      updated_at: row.updated_at,

      patient: {
        id: row.patient_id,
        un_id: row.patient_un_id,
        phone_number: row.patient_phone,
        profile_picture: row.patient_picture,
        created_at: row.created_at,
        full_name: row.patient_name,
        email: row.patient_email,
        gender: row.patient_gender,
        date_of_birth: row.patient_dob,
        blood_group: row.patient_blood_group,
        address: row.patient_address,
        emergency_contact: row.patient_emergency,
      },

      doctor: {
        id: row.doctor_id,
        un_id: row.doctor_un_id,
        phone_number: row.doctor_phone,
        profile_picture: row.doctor_picture,
        created_at: row.created_at,
        full_name: row.doctor_name,
        email: row.doctor_email,
        specialization: row.specialization,
        experience_years: row.experience_years,
        license_number: row.license_number,
        clinic_name: row.clinic_name,
        clinic_address: row.clinic_address,
        available_days: row.available_days,
        available_time: row.available_time,
        consultation_fee: row.consultation_fee,
        rating: row.rating,
        total_reviews: row.total_reviews,
        qualification: row.qualification,
        latitude: row.latitude,
        longitude: row.longitude,
        signature_url: row.signature_url,
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