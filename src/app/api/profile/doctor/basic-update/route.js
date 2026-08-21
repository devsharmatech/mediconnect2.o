import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function PUT(req) {
  try {
    const body = await req.json();
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
    } = body;

    if (!user_id) {
      return failure("user_id is required", null, 400, { headers: corsHeaders });
    }

    const updateData = {
      updated_at: new Date().toISOString(),
    };

    if (full_name !== undefined) updateData.full_name = full_name;
    if (email !== undefined) updateData.email = email;
    if (specialization !== undefined) updateData.specialization = Array.isArray(specialization) ? specialization.join(", ") : specialization;
    if (qualification !== undefined) updateData.qualification = Array.isArray(qualification) ? qualification.join(", ") : qualification;
    if (experience_years !== undefined) updateData.experience_years = Number(experience_years) || 0;
    if (video_consultation_fee !== undefined) updateData.video_consultation_fee = Number(video_consultation_fee) || 0;
    if (clinic_consultation_fee !== undefined) updateData.clinic_consultation_fee = Number(clinic_consultation_fee) || 0;
    if (home_visit_fee !== undefined) updateData.home_visit_fee = Number(home_visit_fee) || 0;
    if (clinic_name !== undefined) updateData.clinic_name = clinic_name;
    if (clinic_address !== undefined) updateData.clinic_address = clinic_address;
    if (license_number !== undefined) updateData.license_number = license_number;
    if (about_me !== undefined) updateData.about_me = about_me;
    if (languages !== undefined) updateData.languages = languages;
    if (available_days !== undefined) updateData.available_days = available_days;
    if (available_time !== undefined) updateData.available_time = available_time;
    if (clinic_slots !== undefined) updateData.clinic_slots = clinic_slots;
    if (video_slots !== undefined) updateData.video_slots = video_slots;
    if (home_slots !== undefined) updateData.home_slots = home_slots;
    if (leave_days !== undefined) updateData.leave_days = leave_days;
    if (second_booking_discount_type !== undefined) updateData.second_booking_discount_type = second_booking_discount_type;
    if (second_booking_discount_value !== undefined) updateData.second_booking_discount_value = Number(second_booking_discount_value) || 0;

    if (additional_clinics !== undefined) {
      // Fetch existing meta to merge
      const { data: existingDoc } = await supabase
        .from("doctor_details")
        .select("meta")
        .eq("id", user_id)
        .maybeSingle();

      const existingMeta = (existingDoc?.meta && typeof existingDoc.meta === "object") ? existingDoc.meta : {};
      updateData.meta = { ...existingMeta, additional_clinics };
    }

    // Update doctor_details
    let { data: updatedDoctor, error: detailsError } = await supabase
      .from("doctor_details")
      .update(updateData)
      .eq("id", user_id)
      .select()
      .maybeSingle();

    if (detailsError) throw detailsError;

    if (!updatedDoctor) {
      const { data: insertedDoctor, error: insertError } = await supabase
        .from("doctor_details")
        .insert([{ id: user_id, ...updateData }])
        .select()
        .single();
      if (insertError) throw insertError;
      updatedDoctor = insertedDoctor;
    }

    // Update users table (phone_number and full_name if present)
    const userUpdates = {};
    if (phone_number) userUpdates.phone_number = phone_number;
    if (full_name) userUpdates.full_name = full_name;
    if (Object.keys(userUpdates).length > 0) {
      await supabase
        .from("users")
        .update(userUpdates)
        .eq("id", user_id);
    }

    return success("Doctor profile updated successfully", updatedDoctor || updateData, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Doctor basic-update Error:", err);
    return failure("Failed to update doctor profile", err.message, 500, { headers: corsHeaders });
  }
}
