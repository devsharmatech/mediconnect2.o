import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

// Map appointment_type -> doctor_details column
const SLOT_COLUMN_MAP = {
  clinic_visit: "clinic_slots",
  video_consultation: "video_slots",
  home_visit: "home_slots",
};

/**
 * Normalizes time strings like "9:00 AM", "09:00:00", "9:00" to 24-hour "HH:MM" format.
 */
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

/**
 * Extracts start/end intervals for a specific weekday from typeSlots or general available_time.
 */
function resolveIntervals(typeSlots, availableTime, fullWeekday, shortWeekday) {
  let rawSlots = typeSlots;
  if (typeof rawSlots === "string") {
    try { rawSlots = JSON.parse(rawSlots); } catch { rawSlots = null; }
  }

  let intervals = [];

  if (rawSlots && typeof rawSlots === "object") {
    // 1. Direct interval object: { start: "09:00", end: "21:00" }
    if (rawSlots.start && rawSlots.end) {
      intervals = [{ start: parseTimeTo24h(rawSlots.start), end: parseTimeTo24h(rawSlots.end) }];
    }
    // 2. Direct array of intervals: [{ start: "09:00", end: "21:00" }]
    else if (Array.isArray(rawSlots) && rawSlots.length > 0 && rawSlots[0]?.start && rawSlots[0]?.end) {
      intervals = rawSlots.map(s => ({ start: parseTimeTo24h(s.start), end: parseTimeTo24h(s.end) }));
    }
    // 3. Object with weekday keys: { "Monday": ..., "Wednesday": ..., "Wed": ..., "wednesday": ... }
    else {
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

  // Fallback to doctor's general available_time if typeSlots returned no intervals
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

export async function POST(req) {
  try {
    const { doctor_id, date, appointment_type = "video_consultation" } = await req.json();

    if (!doctor_id || !date)
      return failure("doctor_id and date required", null, 400, { headers: corsHeaders });

    // Fetch doctor details
    const { data: doctor, error: doctorErr } = await supabase
      .from("doctor_details")
      .select("available_days, available_time, clinic_slots, video_slots, home_slots, leave_days, is_open, slot_interval_minutes")
      .eq("id", doctor_id)
      .maybeSingle();

    if (doctorErr) throw doctorErr;
    if (!doctor) return failure("Doctor not found", null, 404, { headers: corsHeaders });

    // Check if doctor is open
    if (doctor.is_open === false) {
      return success("Doctor is currently not accepting appointments.", [], 200, { headers: corsHeaders });
    }

    // Derive weekday names
    const [yyyy, mm, dd] = date.split("-").map(Number);
    const localDate = new Date(yyyy, mm - 1, dd);
    const shortWeekday = localDate.toLocaleString("en-US", { weekday: "short" });
    const fullWeekday = localDate.toLocaleString("en-US", { weekday: "long" });

    // Check leave_days
    const leaveDays = Array.isArray(doctor.leave_days)
      ? doctor.leave_days
      : (typeof doctor.leave_days === "string" ? JSON.parse(doctor.leave_days) : []);

    if (leaveDays.some(ld => String(ld).toLowerCase() === fullWeekday.toLowerCase() || String(ld).toLowerCase() === shortWeekday.toLowerCase())) {
      return success(`Doctor is on leave on ${fullWeekday}.`, [], 200, { headers: corsHeaders });
    }

    // Check available_days if configured
    const availableDays = Array.isArray(doctor.available_days)
      ? doctor.available_days
      : (typeof doctor.available_days === "string" ? JSON.parse(doctor.available_days) : []);

    if (availableDays.length > 0) {
      const isAvailable = availableDays.some(ad => {
        const adClean = String(ad).trim().toLowerCase();
        return adClean === fullWeekday.toLowerCase() || adClean === shortWeekday.toLowerCase();
      });
      if (!isAvailable) {
        return success(`Doctor is not available on ${fullWeekday}.`, [], 200, { headers: corsHeaders });
      }
    }

    // Resolve intervals for requested appointment type with fallback to available_time
    const slotColumnKey = SLOT_COLUMN_MAP[appointment_type] || "video_slots";
    const typeSlots = doctor[slotColumnKey];
    const intervals = resolveIntervals(typeSlots, doctor.available_time, fullWeekday, shortWeekday);

    if (intervals.length === 0) {
      return success(
        `Doctor has no ${appointment_type.replace(/_/g, " ")} hours configured for ${fullWeekday}.`,
        [],
        200,
        { headers: corsHeaders }
      );
    }

    // Generate slot times using interval (default 15 minutes)
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

    // Fetch booked slots
    const { data: bookedAppointments, error: appErr } = await supabase
      .from("appointments")
      .select("appointment_time")
      .eq("doctor_id", doctor_id)
      .eq("appointment_date", date)
      .in("status", ["booked", "approved", "completed", "freezed"]);

    if (appErr) throw appErr;

    const bookedTimes = bookedAppointments?.map((a) => a.appointment_time.slice(0, 5)) || [];

    // Mark booked slots
    const finalSlots = slots.map((slot) => ({
      ...slot,
      slot_booked: bookedTimes.includes(slot.time),
    }));

    return success("Slots generated successfully.", finalSlots, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Generate slots error:", error);
    return failure("Failed to generate slots.", error.message, 500, { headers: corsHeaders });
  }
}
