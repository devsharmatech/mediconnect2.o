export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const doctor_id = searchParams.get("doctor_id");

    if (!doctor_id) {
      return failure("doctor_id is required", null, 400, { headers: corsHeaders });
    }

    const doctorRows = await sql`
      SELECT 
        d.*,
        u.phone_number as user_phone,
        u.profile_picture as user_profile_picture
      FROM doctor_details d
      LEFT JOIN users u ON d.id = u.id
      WHERE d.id = ${doctor_id}
      LIMIT 1
    `;

    if (doctorRows.length === 0) {
      return failure("Doctor not found", null, 404, { headers: corsHeaders });
    }

    const doctor = doctorRows[0];

    // Resolve profile picture from users.profile_picture or doctor_details.passport_photo
    let pic = doctor.user_profile_picture;
    if (pic) {
      pic = String(pic).replace(/^'+|'+$/g, "").replace(/::text$/i, "").trim();
      if (!pic.startsWith("http") || pic.includes("::text")) pic = null;
    }
    if (!pic && doctor.passport_photo) {
      if (Array.isArray(doctor.passport_photo) && doctor.passport_photo.length > 0) {
        pic = doctor.passport_photo[0];
      } else if (typeof doctor.passport_photo === "string") {
        try {
          const parsed = JSON.parse(doctor.passport_photo);
          if (Array.isArray(parsed) && parsed.length > 0) pic = parsed[0];
          else if (typeof parsed === "string") pic = parsed;
        } catch {
          if (doctor.passport_photo.startsWith("http")) pic = doctor.passport_photo;
        }
      }
    }

    const profile = {
      id: doctor.id,
      name: doctor.full_name || "Doctor",
      email: doctor.email,
      phone: doctor.user_phone,
      specialty: doctor.specialization || "General Medicine",
      rating: Number(doctor.rating) || 4.5,
      reviewsCount: doctor.total_reviews || 0,
      experience: doctor.experience_years ? `${doctor.experience_years} Years` : "0 Years",
      experience_years: doctor.experience_years || 0,
      bio: doctor.about_me || "No bio available.",
      videoConsultFee: Number(doctor.video_consultation_fee || doctor.consultation_fee || 500),
      inPersonVisitFee: Number(doctor.clinic_consultation_fee || doctor.consultation_fee || 800),
      homeVisitFee: Number(doctor.home_visit_fee || 1000),
      profile_picture: pic || null,
      qualifications: (Array.isArray(doctor.qualification) && doctor.qualification.length > 0) 
        ? doctor.qualification 
        : (typeof doctor.qualification === 'string' 
          ? doctor.qualification.split(',').map(q => q.trim()).filter(Boolean) 
          : []),
      languages: doctor.languages || ["English"],
      specializations: doctor.specialization ? [doctor.specialization] : ["General Medicine"],
      available_days: doctor.available_days || [],
      leave_days: doctor.leave_days || [],
      clinic_slots: doctor.clinic_slots || {},
      video_slots: doctor.video_slots || {},
      home_slots: doctor.home_slots || {},
      clinic_name: doctor.clinic_name || "",
      clinic_address: doctor.clinic_address || "",
      license_number: doctor.license_number || "",
      secondBookingDiscountType: doctor.second_booking_discount_type || "none",
      secondBookingDiscountValue: Number(doctor.second_booking_discount_value || 0),
    };

    return success("Profile fetched successfully", profile, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Profile GET Error:", error);
    return failure("Internal Error", error.message, 500, { headers: corsHeaders });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { 
      doctor_id, 
      bio,
      about_me,
      experience,
      experience_years,
      videoConsultFee, 
      inPersonVisitFee, 
      homeVisitFee,
      qualifications, 
      languages, 
      specialty,
      secondBookingDiscountType,
      secondBookingDiscountValue,
      available_days,
      leave_days,
      clinic_slots,
      video_slots,
      home_slots,
      profile_picture
    } = body;

    if (!doctor_id) {
      return failure("doctor_id is required", null, 400, { headers: corsHeaders });
    }

    const bioValue = bio !== undefined ? bio : about_me;
    const rawExp = experience !== undefined ? experience : experience_years;
    const parsedExp = rawExp !== undefined ? parseInt(String(rawExp), 10) : undefined;

    // Update doctor_details in AWS RDS PostgreSQL
    await sql`
      UPDATE doctor_details
      SET
        about_me = COALESCE(${bioValue !== undefined ? bioValue : null}, about_me),
        experience_years = COALESCE(${!isNaN(parsedExp) ? parsedExp : null}, experience_years),
        video_consultation_fee = COALESCE(${videoConsultFee !== undefined ? Number(videoConsultFee) : null}, video_consultation_fee),
        clinic_consultation_fee = COALESCE(${inPersonVisitFee !== undefined ? Number(inPersonVisitFee) : null}, clinic_consultation_fee),
        home_visit_fee = COALESCE(${homeVisitFee !== undefined ? Number(homeVisitFee) : null}, home_visit_fee),
        qualification = COALESCE(${qualifications !== undefined ? (Array.isArray(qualifications) ? qualifications.join(", ") : qualifications) : null}, qualification),
        languages = COALESCE(${languages !== undefined ? languages : null}, languages),
        specialization = COALESCE(${specialty !== undefined ? specialty : null}, specialization),
        second_booking_discount_type = COALESCE(${secondBookingDiscountType !== undefined ? secondBookingDiscountType : null}, second_booking_discount_type),
        second_booking_discount_value = COALESCE(${secondBookingDiscountValue !== undefined ? Number(secondBookingDiscountValue) : null}, second_booking_discount_value),
        available_days = COALESCE(${available_days !== undefined ? sql.json(available_days) : null}, available_days),
        leave_days = COALESCE(${leave_days !== undefined ? sql.json(leave_days) : null}, leave_days),
        clinic_slots = COALESCE(${clinic_slots !== undefined ? sql.json(clinic_slots) : null}, clinic_slots),
        video_slots = COALESCE(${video_slots !== undefined ? sql.json(video_slots) : null}, video_slots),
        home_slots = COALESCE(${home_slots !== undefined ? sql.json(home_slots) : null}, home_slots),
        updated_at = NOW()
      WHERE id = ${doctor_id};
    `;

    // If profile_picture was provided, update users table as well
    if (profile_picture) {
      await sql`
        UPDATE users
        SET profile_picture = ${profile_picture}, updated_at = NOW()
        WHERE id = ${doctor_id};
      `;
    }

    return success("Profile updated successfully", {}, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Profile POST Error:", error);
    return failure("Internal Error", error.message, 500, { headers: corsHeaders });
  }
}
