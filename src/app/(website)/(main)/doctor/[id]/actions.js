"use server";

import { supabase } from "@/lib/supabaseAdmin";

export async function getDoctorDetailsAction(doctorId) {
  try {
    if (!doctorId) return { success: false, error: "Doctor ID is required" };

    const { data: doctor, error } = await supabase
      .from("users")
      .select(`*, doctor_details (*)`)
      .eq("id", doctorId)
      .eq("role", "doctor")
      .single();

    if (error) throw error;
    if (!doctor) return { success: false, error: "Doctor not found" };

    return { success: true, data: doctor };
  } catch (error) {
    console.error("Error in getDoctorDetailsAction:", error);
    return { success: false, error: error.message };
  }
}

export async function checkDoctorDiscountAction({ patient_id, doctor_id, appointment_type = "clinic_visit" }) {
  try {
    if (!patient_id || !doctor_id) return { success: false, error: "patient_id and doctor_id are required" };

    const { count, error: countError } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("patient_id", patient_id)
      .eq("doctor_id", doctor_id)
      .neq("status", "cancelled");

    if (countError) throw countError;

    const { data: doctor, error: docError } = await supabase
      .from("doctor_details")
      .select("consultation_fee, meta, second_booking_discount_type, second_booking_discount_value")
      .eq("id", doctor_id)
      .maybeSingle();

    if (docError) throw docError;
    if (!doctor) return { success: false, error: "Doctor not found" };

    let originalFee = 0;
    const meta = typeof doctor.meta === 'string' ? JSON.parse(doctor.meta || '{}') : (doctor.meta || {});

    if (appointment_type === "video_consultation") {
      originalFee = Number(meta?.video_consultation_fee ?? doctor.consultation_fee ?? 0);
    } else if (appointment_type === "clinic_visit") {
      originalFee = Number(meta?.clinic_consultation_fee ?? doctor.consultation_fee ?? 0);
    } else if (appointment_type === "home_visit") {
      originalFee = Number(meta?.home_visit_fee ?? doctor.consultation_fee ?? 0);
    } else {
      originalFee = Number(doctor.consultation_fee ?? 0);
    }

    const isDiscountApplicable = count === 1 && doctor.second_booking_discount_type && doctor.second_booking_discount_type !== "none";
    let discountAmount = 0;
    let discountedFee = originalFee;

    if (isDiscountApplicable) {
      const type = doctor.second_booking_discount_type;
      const val = Number(doctor.second_booking_discount_value || 0);

      if (type === "percentage") {
        discountAmount = originalFee * (val / 100);
      } else if (type === "flat") {
        discountAmount = val;
      }

      discountAmount = Math.max(0, Math.min(originalFee, discountAmount));
      discountedFee = Math.max(0, originalFee - discountAmount);
    }

    return {
      success: true,
      data: {
        is_discount_applicable: isDiscountApplicable,
        previous_appointments_count: count,
        original_fee: originalFee,
        discount_amount: discountAmount,
        discounted_fee: discountedFee,
        discount_type: doctor.second_booking_discount_type || "none",
        discount_value: Number(doctor.second_booking_discount_value || 0)
      }
    };
  } catch (error) {
    console.error("Error in checkDoctorDiscountAction:", error);
    return { success: false, error: error.message };
  }
}

const SLOT_COLUMN_MAP = {
  clinic_visit: "clinic_slots",
  video_consultation: "video_slots",
  home_visit: "home_slots",
};

function parseTimeTo24h(str) {
  if (!str || typeof str !== "string") return "";
  const clean = str.trim();
  const ampmMatch = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampmMatch) {
    let [_, h, m, period] = ampmMatch;
    let hours = parseInt(h, 10);
    if (period.toUpperCase() === "PM" && hours !== 12) hours += 12;
    if (period.toUpperCase() === "AM" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${m}`;
  }
  const timeMatch = clean.match(/^(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    let [_, h, m] = timeMatch;
    return `${String(h).padStart(2, "0")}:${m}`;
  }
  return clean;
}

function resolveIntervals(typeSlots, availableTime, fullWeekday, shortWeekday) {
  let rawSlots = typeSlots;
  if (typeof rawSlots === "string") {
    try { rawSlots = JSON.parse(rawSlots); } catch { rawSlots = null; }
  }

  let intervals = [];

  if (rawSlots && typeof rawSlots === "object") {
    if (rawSlots.start && rawSlots.end) {
      intervals = [{ start: parseTimeTo24h(rawSlots.start), end: parseTimeTo24h(rawSlots.end) }];
    } else if (Array.isArray(rawSlots) && rawSlots.length > 0 && rawSlots[0]?.start && rawSlots[0]?.end) {
      intervals = rawSlots.map(s => ({ start: parseTimeTo24h(s.start), end: parseTimeTo24h(s.end) }));
    } else {
      const daySlot = rawSlots[fullWeekday] || 
                      rawSlots[shortWeekday] || 
                      rawSlots[fullWeekday.toLowerCase()] || 
                      rawSlots[shortWeekday.toLowerCase()];
      if (daySlot) {
        if (Array.isArray(daySlot)) {
          intervals = daySlot.filter(s => s.start && s.end).map(s => ({
            start: parseTimeTo24h(s.start),
            end: parseTimeTo24h(s.end)
          }));
        } else if (daySlot.start && daySlot.end) {
          intervals = [{ start: parseTimeTo24h(daySlot.start), end: parseTimeTo24h(daySlot.end) }];
        }
      }
    }
  }

  if (intervals.length === 0 && availableTime) {
    let rawTime = availableTime;
    if (typeof rawTime === "string") {
      try { rawTime = JSON.parse(rawTime); } catch {}
    }

    if (typeof rawTime === "object" && rawTime?.start && rawTime?.end) {
      intervals = [{ start: parseTimeTo24h(rawTime.start), end: parseTimeTo24h(rawTime.end) }];
    } else if (typeof rawTime === "string" && rawTime.includes("-")) {
      const parts = rawTime.split("-").map(s => s.trim());
      if (parts.length === 2 && parts[0] && parts[1]) {
        intervals = [{ start: parseTimeTo24h(parts[0]), end: parseTimeTo24h(parts[1]) }];
      }
    }
  }

  return intervals.filter(s => s.start && s.end && s.start < s.end);
}

export async function getDoctorSlotsAction({ doctor_id, date, appointment_type = "video_consultation" }) {
  try {
    if (!doctor_id || !date) return { success: false, error: "doctor_id and date required" };

    const { data: doctor, error: doctorErr } = await supabase
      .from("doctor_details")
      .select("available_days, available_time, clinic_slots, video_slots, home_slots, leave_days, is_open, slot_interval_minutes")
      .eq("id", doctor_id)
      .maybeSingle();

    if (doctorErr) throw doctorErr;
    if (!doctor) return { success: false, error: "Doctor not found" };

    if (doctor.is_open === false) {
      return { success: true, data: [] };
    }

    const [yyyy, mm, dd] = date.split("-").map(Number);
    const localDate = new Date(yyyy, mm - 1, dd);
    const shortWeekday = localDate.toLocaleString("en-US", { weekday: "short" });
    const fullWeekday = localDate.toLocaleString("en-US", { weekday: "long" });

    const leaveDays = Array.isArray(doctor.leave_days)
      ? doctor.leave_days
      : (typeof doctor.leave_days === "string" ? JSON.parse(doctor.leave_days) : []);

    if (leaveDays.some(ld => String(ld).toLowerCase() === fullWeekday.toLowerCase() || String(ld).toLowerCase() === shortWeekday.toLowerCase())) {
      return { success: true, data: [] };
    }

    const availableDays = Array.isArray(doctor.available_days)
      ? doctor.available_days
      : (typeof doctor.available_days === "string" ? JSON.parse(doctor.available_days) : []);

    if (availableDays.length > 0) {
      const isAvailable = availableDays.some(ad => {
        const adClean = String(ad).trim().toLowerCase();
        return adClean === fullWeekday.toLowerCase() || adClean === shortWeekday.toLowerCase();
      });
      if (!isAvailable) {
        return { success: true, data: [] };
      }
    }

    const slotColumnKey = SLOT_COLUMN_MAP[appointment_type] || "video_slots";
    const typeSlots = doctor[slotColumnKey];
    const intervals = resolveIntervals(typeSlots, doctor.available_time, fullWeekday, shortWeekday);

    if (intervals.length === 0) {
      return { success: true, data: [] };
    }

    const slots = [];
    const slotInterval = doctor.slot_interval_minutes || 15;

    intervals.forEach(({ start, end }) => {
      let current = new Date(`1970-01-01T${start}:00`);
      const endLimit = new Date(`1970-01-01T${end}:00`);

      while (current < endLimit) {
        const time = current.toTimeString().slice(0, 5);
        if (!slots.some(s => s.time === time)) {
          slots.push({ time, slot_booked: false });
        }
        current.setMinutes(current.getMinutes() + slotInterval);
      }
    });

    slots.sort((a, b) => a.time.localeCompare(b.time));

    const { data: bookedAppointments, error: appErr } = await supabase
      .from("appointments")
      .select("appointment_time")
      .eq("doctor_id", doctor_id)
      .eq("appointment_date", date)
      .in("status", ["booked", "approved", "completed", "freezed"]);

    if (appErr) throw appErr;

    const bookedTimes = bookedAppointments?.map((a) => a.appointment_time.slice(0, 5)) || [];

    const finalSlots = slots.map((slot) => ({
      ...slot,
      slot_booked: bookedTimes.includes(slot.time),
    }));

    return { success: true, data: finalSlots };
  } catch (error) {
    console.error("Error in getDoctorSlotsAction:", error);
    return { success: false, error: error.message, data: [] };
  }
}
