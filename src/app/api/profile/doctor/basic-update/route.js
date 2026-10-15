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
      video_follow_up_fee,
      clinic_consultation_fee,
      clinic_follow_up_fee,
      home_visit_fee,
      home_follow_up_fee,
      follow_up_fee,
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

    // Ensure follow_up fee and clinic columns exist in doctor_details
    await sql`
      ALTER TABLE doctor_details ADD COLUMN IF NOT EXISTS video_follow_up_fee NUMERIC DEFAULT 0;
      ALTER TABLE doctor_details ADD COLUMN IF NOT EXISTS clinic_follow_up_fee NUMERIC DEFAULT 0;
      ALTER TABLE doctor_details ADD COLUMN IF NOT EXISTS home_follow_up_fee NUMERIC DEFAULT 0;
      ALTER TABLE doctor_details ADD COLUMN IF NOT EXISTS follow_up_fee NUMERIC DEFAULT 0;
      ALTER TABLE doctor_details ADD COLUMN IF NOT EXISTS additional_clinics JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE doctor_details ADD COLUMN IF NOT EXISTS second_booking_discount_type TEXT DEFAULT 'none';
      ALTER TABLE doctor_details ADD COLUMN IF NOT EXISTS second_booking_discount_value NUMERIC DEFAULT 0;
    `.catch((err) => {
      console.warn("Could not alter doctor_details for follow_up fees:", err.message);
    });

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
    if (video_follow_up_fee !== undefined) updateData.video_follow_up_fee = Number(video_follow_up_fee) || 0;
    if (clinic_consultation_fee !== undefined) updateData.clinic_consultation_fee = Number(clinic_consultation_fee) || 0;
    if (clinic_follow_up_fee !== undefined) updateData.clinic_follow_up_fee = Number(clinic_follow_up_fee) || 0;
    if (home_visit_fee !== undefined) updateData.home_visit_fee = Number(home_visit_fee) || 0;
    if (home_follow_up_fee !== undefined) updateData.home_follow_up_fee = Number(home_follow_up_fee) || 0;
    if (follow_up_fee !== undefined) updateData.follow_up_fee = Number(follow_up_fee) || 0;
    if (clinic_name !== undefined) updateData.clinic_name = clinic_name;
    if (clinic_address !== undefined) updateData.clinic_address = clinic_address;
    if (license_number !== undefined) updateData.license_number = license_number;
    if (about_me !== undefined) updateData.about_me = about_me;
    if (languages !== undefined) updateData.languages = Array.isArray(languages) ? languages.join(", ") : languages;
    if (available_days !== undefined) updateData.available_days = Array.isArray(available_days) ? available_days : null;
    if (available_time !== undefined) updateData.available_time = sql.json(available_time);

    function sanitizeSlotMap(slots) {
      if (!slots || typeof slots !== "object") return {};
      const result = {};
      for (const [day, val] of Object.entries(slots)) {
        if (!val) continue;
        if (Array.isArray(val)) {
          const filtered = val.filter(s => s && s.start && s.end);
          if (filtered.length > 0) result[day] = filtered;
        } else if (typeof val === "object" && val.start && val.end) {
          result[day] = [{ start: val.start, end: val.end }];
        }
      }
      return result;
    }

    if (clinic_slots !== undefined) updateData.clinic_slots = sql.json(sanitizeSlotMap(clinic_slots));
    if (video_slots !== undefined) updateData.video_slots = sql.json(sanitizeSlotMap(video_slots));
    if (home_slots !== undefined) updateData.home_slots = sql.json(sanitizeSlotMap(home_slots));
    if (leave_days !== undefined) updateData.leave_days = sql.json(leave_days);
    if (second_booking_discount_type !== undefined) updateData.second_booking_discount_type = second_booking_discount_type;
    if (second_booking_discount_value !== undefined) updateData.second_booking_discount_value = Number(second_booking_discount_value) || 0;

    // Sanitize clinics list
    const cleanClinics = Array.isArray(additional_clinics)
      ? additional_clinics.filter(c => c && (c.name?.trim() || c.address?.trim()))
      : [];

    if (additional_clinics !== undefined) {
      updateData.additional_clinics = sql.json(cleanClinics);
    }

    let existingMeta = {};
    if (existingDoc?.meta) {
      if (typeof existingDoc.meta === "object" && existingDoc.meta !== null) {
        existingMeta = existingDoc.meta;
      } else if (typeof existingDoc.meta === "string") {
        try { existingMeta = JSON.parse(existingDoc.meta); } catch {}
      }
    }
    let metaUpdated = false;
    const newMeta = { ...existingMeta };

    if (additional_clinics !== undefined) {
      newMeta.additional_clinics = cleanClinics;
      metaUpdated = true;
    }
    if (second_booking_discount_type !== undefined) {
      newMeta.second_booking_discount_type = second_booking_discount_type;
      metaUpdated = true;
    }
    if (second_booking_discount_value !== undefined) {
      newMeta.second_booking_discount_value = Number(second_booking_discount_value) || 0;
      metaUpdated = true;
    }
    if (video_follow_up_fee !== undefined) {
      newMeta.video_follow_up_fee = Number(video_follow_up_fee) || 0;
      metaUpdated = true;
    }
    if (clinic_follow_up_fee !== undefined) {
      newMeta.clinic_follow_up_fee = Number(clinic_follow_up_fee) || 0;
      metaUpdated = true;
    }
    if (home_follow_up_fee !== undefined) {
      newMeta.home_follow_up_fee = Number(home_follow_up_fee) || 0;
      metaUpdated = true;
    }
    if (follow_up_fee !== undefined) {
      newMeta.follow_up_fee = Number(follow_up_fee) || 0;
      metaUpdated = true;
    }
    if (metaUpdated) {
      updateData.meta = sql.json(newMeta);
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

    // Update users table (phone_number if present — full_name is stored in doctor_details)
    if (phone_number) {
      await sql`
        UPDATE users
        SET phone_number = ${phone_number}, updated_at = NOW()
        WHERE id = ${user_id}
      `;
    }

    return success("Doctor profile updated successfully", updatedDoctor || updateData, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Doctor basic-update Error:", err);
    return failure("Failed to update doctor profile", err.message, 500, { headers: corsHeaders });
  }
}
