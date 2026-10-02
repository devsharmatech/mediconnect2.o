import sql from "@/lib/db";
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

    const [existingDoc] = await sql`
      SELECT id, meta FROM doctor_details WHERE id = ${user_id} LIMIT 1
    `;

    const updateData = {
      updated_at: new Date(),
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
    if (languages !== undefined) updateData.languages = Array.isArray(languages) ? languages.join(", ") : languages;
    if (available_days !== undefined) updateData.available_days = Array.isArray(available_days) ? available_days : null;
    if (available_time !== undefined) updateData.available_time = sql.json(available_time);
    if (clinic_slots !== undefined) updateData.clinic_slots = sql.json(clinic_slots);
    if (video_slots !== undefined) updateData.video_slots = sql.json(video_slots);
    if (home_slots !== undefined) updateData.home_slots = sql.json(home_slots);
    if (leave_days !== undefined) updateData.leave_days = sql.json(leave_days);
    if (second_booking_discount_type !== undefined) updateData.second_booking_discount_type = second_booking_discount_type;
    if (second_booking_discount_value !== undefined) updateData.second_booking_discount_value = Number(second_booking_discount_value) || 0;

    if (additional_clinics !== undefined) {
      const existingMeta = (existingDoc?.meta && typeof existingDoc.meta === "object") ? existingDoc.meta : {};
      updateData.meta = sql.json({ ...existingMeta, additional_clinics });
    }

    let updatedDoctor;
    if (existingDoc) {
      const keys = Object.keys(updateData);
      [updatedDoctor] = await sql`
        UPDATE doctor_details
        SET ${sql(updateData, ...keys)}
        WHERE id = ${user_id}
        RETURNING *
      `;
    } else {
      updateData.id = user_id;
      const keys = Object.keys(updateData);
      [updatedDoctor] = await sql`
        INSERT INTO doctor_details ${sql(updateData, ...keys)}
        RETURNING *
      `;
    }

    // Update users table (phone_number and full_name if present)
    const userUpdates = {};
    if (phone_number) userUpdates.phone_number = phone_number;
    if (full_name) userUpdates.full_name = full_name;
    if (Object.keys(userUpdates).length > 0) {
      userUpdates.updated_at = new Date();
      const userKeys = Object.keys(userUpdates);
      await sql`
        UPDATE users
        SET ${sql(userUpdates, ...userKeys)}
        WHERE id = ${user_id}
      `;
    }

    return success("Doctor profile updated successfully", updatedDoctor || updateData, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Doctor basic-update Error:", err);
    return failure("Failed to update doctor profile", err.message, 500, { headers: corsHeaders });
  }
}
