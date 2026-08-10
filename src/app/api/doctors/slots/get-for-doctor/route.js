import { supabase } from "@/lib/supabaseAdmin";
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

export async function POST(req) {
  try {
    const { doctor_id, date } = await req.json();

    if (!doctor_id || !date)
      return failure("doctor_id and date are required", null, 400, { headers: corsHeaders });

    const { data: doctor, error: doctorErr } = await supabase
      .from("doctor_details")
      .select("available_days, available_time, clinic_slots, video_slots, home_slots, leave_days, is_open, slot_interval_minutes")
      .eq("id", doctor_id)
      .maybeSingle();

    if (doctorErr) throw doctorErr;
    if (!doctor) return failure("Doctor not found", null, 404, { headers: corsHeaders });

    if (doctor.is_open === false) {
      return success("Doctor is currently not accepting appointments.", [], 200, { headers: corsHeaders });
    }

    const [_y, _m, _d] = date.split("-").map(Number);
    const localDate = new Date(_y, _m - 1, _d);
    const shortWeekday = localDate.toLocaleString("en-US", { weekday: "short" });
    const fullWeekday = localDate.toLocaleString("en-US", { weekday: "long" });

    // Check leave_days
    const leaveDays = Array.isArray(doctor.leave_days)
      ? doctor.leave_days
      : (typeof doctor.leave_days === "string" ? JSON.parse(doctor.leave_days) : []);

    if (leaveDays.some(ld => String(ld).toLowerCase() === fullWeekday.toLowerCase() || String(ld).toLowerCase() === shortWeekday.toLowerCase())) {
      return success(`Doctor is on leave on ${fullWeekday}.`, [], 200, { headers: corsHeaders });
    }

    // Check available_days
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

    // Extract start & end times
    let intervals = [];
    let rawTime = doctor.available_time;
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

    if (intervals.length === 0) {
      return success(`Doctor has no availability time set.`, [], 200, { headers: corsHeaders });
    }

    const slots = [];
    const slotInterval = doctor.slot_interval_minutes || 30;

    intervals.forEach(({ start, end }) => {
      let current = new Date(`1970-01-01T${start}:00`);
      const endLimit = new Date(`1970-01-01T${end}:00`);

      while (current < endLimit) {
        const time = current.toTimeString().slice(0, 5);
        if (!slots.some(s => s.time === time)) {
          slots.push({ time, status: "available" });
        }
        current.setMinutes(current.getMinutes() + slotInterval);
      }
    });

    const { data: appointments, error: appErr } = await supabase
      .from("appointments")
      .select("appointment_time, status")
      .eq("doctor_id", doctor_id)
      .eq("appointment_date", date);

    if (appErr) throw appErr;

    const finalSlots = slots.map(slot => {
      const appt = appointments.find(a => a.appointment_time.slice(0, 5) === slot.time);
      if (appt) slot.status = appt.status;
      return slot;
    });

    return success("Doctor slots fetched successfully.", finalSlots, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Get doctor slots error:", error);
    return failure("Failed to fetch doctor slots.", error.message, 500, { headers: corsHeaders });
  }
}
