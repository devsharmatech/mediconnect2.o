import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";
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

    const { data: doctor, error } = await supabase
      .from("doctor_details")
      .select("*, users(phone_number)")
      .eq("id", doctor_id)
      .maybeSingle();

    if (error) throw error;
    if (!doctor) {
      return failure("Doctor not found", null, 404, { headers: corsHeaders });
    }

    const profile = {
      name: doctor.full_name || "Doctor",
      email: doctor.email,
      phone: doctor.users?.phone_number,
      specialty: doctor.specialization || "General Medicine",
      rating: doctor.rating || 4.5,
      reviewsCount: doctor.reviewsCount || doctor.total_reviews || 0,
      experience: doctor.experience || (doctor.experience_years ? `${doctor.experience_years} Years` : "0 Years"),
      bio: doctor.about_me || doctor.bio || "No bio available.",
      videoConsultFee: Number(doctor.video_consultation_fee || doctor.consultation_fee || 500),
      inPersonVisitFee: Number(doctor.clinic_consultation_fee || doctor.consultation_fee || 800),
      qualifications: (Array.isArray(doctor.qualifications) && doctor.qualifications.length > 0) 
        ? doctor.qualifications 
        : (Array.isArray(doctor.qualification) 
          ? doctor.qualification 
          : (typeof doctor.qualification === 'string' 
            ? doctor.qualification.split(',').map(q => q.trim()).filter(Boolean) 
            : [])),
      languages: doctor.languages || ["English"],
      specializations: doctor.specialization ? [doctor.specialization] : ["General Medicine"],
      available_days: doctor.available_days || [],
      leave_days: doctor.leave_days || [],
      clinic_slots: doctor.clinic_slots || {},
      video_slots: doctor.video_slots || {},
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
      qualifications, 
      languages, 
      specialty,
      secondBookingDiscountType,
      secondBookingDiscountValue,
      available_days,
      leave_days,
      clinic_slots,
      video_slots
    } = body;

    if (!doctor_id) {
      return failure("doctor_id is required", null, 400, { headers: corsHeaders });
    }

    const updatePayload = {};

    const bioValue = bio !== undefined ? bio : about_me;
    if (bioValue !== undefined) {
      updatePayload.about_me = bioValue;
    }

    const rawExp = experience !== undefined ? experience : experience_years;
    if (rawExp !== undefined) {
      const parsedExp = parseInt(String(rawExp), 10);
      if (!isNaN(parsedExp)) {
        updatePayload.experience_years = parsedExp;
      }
    }

    if (videoConsultFee !== undefined) updatePayload.video_consultation_fee = Number(videoConsultFee) || 0;
    if (inPersonVisitFee !== undefined) updatePayload.clinic_consultation_fee = Number(inPersonVisitFee) || 0;
    if (qualifications !== undefined) {
      updatePayload.qualification = Array.isArray(qualifications) ? qualifications.join(", ") : qualifications;
    }
    if (languages !== undefined) updatePayload.languages = languages;
    if (specialty !== undefined) updatePayload.specialization = specialty;
    if (secondBookingDiscountType !== undefined) updatePayload.second_booking_discount_type = secondBookingDiscountType;
    if (secondBookingDiscountValue !== undefined) updatePayload.second_booking_discount_value = Number(secondBookingDiscountValue) || 0;
    if (available_days !== undefined) updatePayload.available_days = available_days;
    if (leave_days !== undefined) updatePayload.leave_days = leave_days;
    if (clinic_slots !== undefined) updatePayload.clinic_slots = clinic_slots;
    if (video_slots !== undefined) updatePayload.video_slots = video_slots;

    if (Object.keys(updatePayload).length > 0) {
      const { error } = await supabase
        .from("doctor_details")
        .update(updatePayload)
        .eq("id", doctor_id);

      if (error) throw error;
    }

    return success("Profile updated successfully", {}, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Profile POST Error:", error);
    return failure("Internal Error", error.message, 500, { headers: corsHeaders });
  }
}

