import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function PUT(req) {
  try {
    const {
      user_id,
      full_name,
      email,
      phone_number,
      specialization,
      qualification,
      experience_years,
      video_consultation_fee,
      clinic_consultation_fee,
      home_visit_fee,
      clinic_name,
      clinic_address,
      license_number,
      about_me,
      languages,
      available_days,
      available_time,
      clinic_slots,
      video_slots,
      home_slots,
      leave_days,
      second_booking_discount_type,
      second_booking_discount_value,
      additional_clinics,
    } = await req.json();

    if (!user_id) {
      return failure("user_id is required.", null, 400, { headers: corsHeaders });
    }

    // Fetch user and validate role
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, role, phone_number, profile_picture, is_verified, created_at")
      .eq("id", user_id)
      .maybeSingle();

    if (userError) throw userError;
    if (!user) {
      return failure("User not found.", null, 404, { headers: corsHeaders });
    }

    if (user.role !== "doctor") {
      return failure("Only doctor profiles can be updated here.", null, 403, {
        headers: corsHeaders,
      });
    }

    // Prepare doctor_details update payload (only known columns)
    const doctorUpdate = {};

    if (typeof full_name === "string" && full_name.trim()) {
      doctorUpdate.full_name = full_name.trim();
    }
    if (typeof email === "string" && email.trim()) {
      doctorUpdate.email = email.trim();
    }
    // Specialization: allow multiple values (same as onboarding "speciality")
    if (Array.isArray(specialization)) {
      doctorUpdate.specialization = specialization;
    } else if (typeof specialization === "string") {
      const trimmed = specialization.trim();
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            doctorUpdate.specialization = parsed;
          } else if (trimmed) {
            doctorUpdate.specialization = [trimmed];
          }
        } catch {
          doctorUpdate.specialization = trimmed
            ? trimmed.split(",").map((s) => s.trim()).filter(Boolean)
            : [];
        }
      } else if (trimmed) {
        doctorUpdate.specialization = trimmed
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }

    // Qualification: allow multiple values
    if (Array.isArray(qualification)) {
      doctorUpdate.qualification = qualification;
    } else if (typeof qualification === "string") {
      const trimmed = qualification.trim();
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            doctorUpdate.qualification = parsed;
          } else if (trimmed) {
            doctorUpdate.qualification = [trimmed];
          }
        } catch {
          doctorUpdate.qualification = trimmed
            ? trimmed.split(",").map((q) => q.trim()).filter(Boolean)
            : [];
        }
      } else if (trimmed) {
        doctorUpdate.qualification = trimmed
          .split(",")
          .map((q) => q.trim())
          .filter(Boolean);
      }
    }
    if (typeof license_number === "string") {
      doctorUpdate.license_number = license_number.trim();
    }
    if (typeof clinic_name === "string") {
      doctorUpdate.clinic_name = clinic_name.trim();
    }
    if (typeof clinic_address === "string") {
      doctorUpdate.clinic_address = clinic_address.trim();
    }

    if (typeof about_me === "string") {
      doctorUpdate.about_me = about_me.trim();
    }

    if (typeof languages === "string") {
      doctorUpdate.languages = languages.trim();
    }

    if (experience_years !== undefined && experience_years !== null) {
      const yearsNum = Number(experience_years);
      if (!Number.isNaN(yearsNum)) {
        doctorUpdate.experience_years = yearsNum;
      }
    }

    if (video_consultation_fee !== undefined && video_consultation_fee !== null) {
      const feeNum = Number(video_consultation_fee);
      if (!Number.isNaN(feeNum)) {
        doctorUpdate.video_consultation_fee = feeNum;
      }
    }

    if (clinic_consultation_fee !== undefined && clinic_consultation_fee !== null) {
      const feeNum = Number(clinic_consultation_fee);
      if (!Number.isNaN(feeNum)) {
        doctorUpdate.clinic_consultation_fee = feeNum;
      }
    }

    if (home_visit_fee !== undefined && home_visit_fee !== null) {
      const feeNum = Number(home_visit_fee);
      if (!Number.isNaN(feeNum)) {
        doctorUpdate.home_visit_fee = feeNum;
      }
    }

    if (Array.isArray(available_days)) {
      doctorUpdate.available_days = available_days;
    }

    if (available_time && typeof available_time === "object") {
      const { start, end } = available_time;
      if (start && end) {
        doctorUpdate.available_time = { start, end };
      }
    }

    if (clinic_slots && typeof clinic_slots === "object") {
      doctorUpdate.clinic_slots = clinic_slots;
    }

    if (video_slots && typeof video_slots === "object") {
      doctorUpdate.video_slots = video_slots;
    }

    if (home_slots && typeof home_slots === "object") {
      doctorUpdate.home_slots = home_slots;
    }

    if (Array.isArray(leave_days)) {
      doctorUpdate.leave_days = leave_days;
    }

    if (second_booking_discount_type !== undefined) {
      doctorUpdate.second_booking_discount_type = second_booking_discount_type;
    }

    if (second_booking_discount_value !== undefined) {
      doctorUpdate.second_booking_discount_value = second_booking_discount_value !== null ? Number(second_booking_discount_value) : 0;
    }

    if (additional_clinics !== undefined) {
      const { data: docData } = await supabase
        .from("doctor_details")
        .select("meta")
        .eq("id", user_id)
        .maybeSingle();
      const existingMeta = docData?.meta || {};
      doctorUpdate.meta = {
        ...existingMeta,
        additional_clinics
      };
    }

    if (Object.keys(doctorUpdate).length > 0) {
      const { error: updateError } = await supabase
        .from("doctor_details")
        .update({
          ...doctorUpdate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user_id);

      if (updateError) throw updateError;
    }

    // Optionally update phone number on users table
    if (typeof phone_number === "string" && phone_number.trim()) {
      const { error: phoneError } = await supabase
        .from("users")
        .update({ phone_number: phone_number.trim() })
        .eq("id", user_id);

      if (phoneError) throw phoneError;
    }

    // Fetch updated profile in the same shape as /profile/get
    const { data: updatedUser, error: updatedUserError } = await supabase
      .from("users")
      .select("id, role, phone_number, profile_picture, is_verified, created_at")
      .eq("id", user_id)
      .maybeSingle();

    if (updatedUserError) throw updatedUserError;

    const { data: details, error: detailsError } = await supabase
      .from("doctor_details")
      .select("*")
      .eq("id", user_id)
      .maybeSingle();

    if (detailsError) throw detailsError;

    return success(
      "Doctor profile updated successfully.",
      { ...updatedUser, details },
      200,
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error("Doctor basic update error:", error);
    return failure("Failed to update doctor profile.", error.message, 500, {
      headers: corsHeaders,
    });
  }
}
