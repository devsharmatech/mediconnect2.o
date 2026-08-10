import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const doctor_id = searchParams.get("doctor_id");

    if (!doctor_id) {
      return failure("doctor_id is required", null, 400);
    }

    const { data: doctor, error } = await supabase
      .from("doctor_details")
      .select("*, users(phone_number)")
      .eq("id", doctor_id)
      .maybeSingle();

    if (error) throw error;
    if (!doctor) {
      return failure("Doctor not found", null, 404);
    }

    const profile = {
      name: doctor.full_name || "Doctor",
      email: doctor.email,
      phone: doctor.users?.phone_number,
      specialty: doctor.specialization || "General Medicine",
      rating: doctor.rating || 4.5,
      reviewsCount: doctor.reviewsCount || 0,
      experience: doctor.experience || "0 Years",
      bio: doctor.bio || doctor.about_me || "No bio available.",
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

    return success("Profile fetched successfully", profile, 200);
  } catch (error) {
    console.error("Profile GET Error:", error);
    return failure("Internal Error", error.message, 500);
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { 
      doctor_id, 
      bio, 
      experience, 
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
      return failure("doctor_id is required", null, 400);
    }

    const { error } = await supabase
      .from("doctor_details")
      .update({
        bio,
        experience,
        video_consultation_fee: videoConsultFee !== undefined ? Number(videoConsultFee) : undefined,
        clinic_consultation_fee: inPersonVisitFee !== undefined ? Number(inPersonVisitFee) : undefined,
        qualifications,
        languages,
        specialization: specialty,
        second_booking_discount_type: secondBookingDiscountType,
        second_booking_discount_value: secondBookingDiscountValue !== undefined ? Number(secondBookingDiscountValue) : undefined,
        available_days,
        leave_days,
        clinic_slots,
        video_slots,
      })
      .eq("id", doctor_id);

    if (error) throw error;

    return success("Profile updated successfully", {}, 200);
  } catch (error) {
    console.error("Profile POST Error:", error);
    return failure("Internal Error", error.message, 500);
  }
}
