import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

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

function extractDayIntervals(rawSlots, fullWeekday, shortWeekday) {
  let slotsObj = rawSlots;
  if (typeof slotsObj === "string") {
    try {
      slotsObj = JSON.parse(slotsObj);
    } catch {
      slotsObj = null;
    }
  }
  if (!slotsObj || typeof slotsObj !== "object") return [];

  if (slotsObj.start && slotsObj.end) {
    return [{ start: parseTimeTo24h(slotsObj.start), end: parseTimeTo24h(slotsObj.end) }];
  }
  if (Array.isArray(slotsObj)) {
    return slotsObj
      .filter((s) => s && s.start && s.end)
      .map((s) => ({ start: parseTimeTo24h(s.start), end: parseTimeTo24h(s.end) }));
  }

  const daySlot =
    slotsObj[fullWeekday] ||
    slotsObj[shortWeekday] ||
    slotsObj[fullWeekday.toLowerCase()] ||
    slotsObj[shortWeekday.toLowerCase()];

  if (!daySlot) return [];
  if (Array.isArray(daySlot)) {
    return daySlot
      .filter((s) => s && s.start && s.end)
      .map((s) => ({ start: parseTimeTo24h(s.start), end: parseTimeTo24h(s.end) }));
  }
  if (daySlot.start && daySlot.end) {
    return [{ start: parseTimeTo24h(daySlot.start), end: parseTimeTo24h(daySlot.end) }];
  }
  return [];
}

export async function POST(req) {
  try {
    const { doctor_id, date } = await req.json();

    if (!doctor_id || !date) {
      return failure("doctor_id and date are required", null, 400, { headers: corsHeaders });
    }

    const docRows = await sql`
      SELECT available_days, available_time, clinic_slots, video_slots, home_slots, leave_days, is_open, is_available, slot_interval_minutes
      FROM doctor_details
      WHERE id = ${doctor_id}
      LIMIT 1
    `;
    const doctor = docRows[0];
    if (!doctor) return failure("Doctor not found", null, 404, { headers: corsHeaders });

    if (doctor.is_open === false || doctor.is_available === false) {
      return success("Doctor is currently closed for appointments.", [], 200, { headers: corsHeaders });
    }

    const [_y, _m, _d] = date.split("-").map(Number);
    const localDate = new Date(_y, _m - 1, _d);
    const shortWeekday = localDate.toLocaleString("en-US", { weekday: "short" });
    const fullWeekday = localDate.toLocaleString("en-US", { weekday: "long" });

    // Check leave_days
    let leaveDays = [];
    if (Array.isArray(doctor.leave_days)) {
      leaveDays = doctor.leave_days;
    } else if (typeof doctor.leave_days === "string") {
      try {
        leaveDays = JSON.parse(doctor.leave_days);
      } catch {
        leaveDays = doctor.leave_days.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }

    if (
      Array.isArray(leaveDays) &&
      leaveDays.some(
        (ld) =>
          String(ld).toLowerCase() === fullWeekday.toLowerCase() ||
          String(ld).toLowerCase() === shortWeekday.toLowerCase()
      )
    ) {
      return success(`Doctor is on leave on ${fullWeekday}.`, [], 200, { headers: corsHeaders });
    }

    // Collect intervals from clinic_slots, video_slots, home_slots for this weekday
    let intervals = [
      ...extractDayIntervals(doctor.clinic_slots, fullWeekday, shortWeekday),
      ...extractDayIntervals(doctor.video_slots, fullWeekday, shortWeekday),
      ...extractDayIntervals(doctor.home_slots, fullWeekday, shortWeekday),
    ];

    // Fallback to general available_days + available_time if no weekday-specific intervals found
    if (intervals.length === 0) {
      let availableDays = [];
      if (Array.isArray(doctor.available_days)) {
        availableDays = doctor.available_days;
      } else if (typeof doctor.available_days === "string") {
        try {
          availableDays = JSON.parse(doctor.available_days);
        } catch {
          availableDays = doctor.available_days.split(",").map((s) => s.trim()).filter(Boolean);
        }
      }

      if (Array.isArray(availableDays) && availableDays.length > 0) {
        const isAvailable = availableDays.some((ad) => {
          const adClean = String(ad).trim().toLowerCase();
          return adClean === fullWeekday.toLowerCase() || adClean === shortWeekday.toLowerCase();
        });
        if (!isAvailable) {
          return success(`Doctor is not available on ${fullWeekday}.`, [], 200, { headers: corsHeaders });
        }
      }

      let rawTime = doctor.available_time;
      if (typeof rawTime === "string") {
        try {
          rawTime = JSON.parse(rawTime);
        } catch {}
      }

      if (typeof rawTime === "object" && rawTime?.start && rawTime?.end) {
        intervals = [{ start: parseTimeTo24h(rawTime.start), end: parseTimeTo24h(rawTime.end) }];
      } else if (typeof rawTime === "string" && rawTime.includes("-")) {
        const parts = rawTime.split("-").map((s) => s.trim());
        if (parts.length === 2 && parts[0] && parts[1]) {
          intervals = [{ start: parseTimeTo24h(parts[0]), end: parseTimeTo24h(parts[1]) }];
        }
      }
    }

    intervals = intervals.filter((s) => s.start && s.end && s.start < s.end);

    if (intervals.length === 0) {
      return success("Doctor has no availability time set for this day.", [], 200, { headers: corsHeaders });
    }

    const slots = [];
    const slotInterval = Math.max(5, Number(doctor.slot_interval_minutes) || 10);

    intervals.forEach(({ start, end }) => {
      let current = new Date(`1970-01-01T${start}:00`);
      const endLimit = new Date(`1970-01-01T${end}:00`);

      while (current < endLimit) {
        const time = current.toTimeString().slice(0, 5);
        if (!slots.some((s) => s.time === time)) {
          slots.push({ time, status: "available", duration: `${slotInterval} min` });
        }
        current.setMinutes(current.getMinutes() + slotInterval);
      }
    });

    const appointments = await sql`
      SELECT a.id, a.appointment_time::text AS appointment_time, a.status, p.full_name AS patient_name
      FROM appointments a
      LEFT JOIN patient_details p ON p.id = a.patient_id
      WHERE a.doctor_id = ${doctor_id}
        AND a.appointment_date = ${date}::date
        AND a.status NOT IN ('cancelled', 'rejected')
    `;

    const finalSlots = slots.map((slot) => {
      const appt = appointments.find((a) => (a.appointment_time || "").slice(0, 5) === slot.time);
      if (appt) {
        slot.status = appt.status;
        slot.id = appt.id;
        if (appt.patient_name && appt.status !== "freezed") {
          slot.patient_name = appt.patient_name;
        }
      }
      return slot;
    });

    return success("Doctor slots fetched successfully.", finalSlots, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Get doctor slots error:", error);
    return failure("Failed to fetch doctor slots.", error.message, 500, { headers: corsHeaders });
  }
}
