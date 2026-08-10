import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

// Convert time to minutes
function toMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// Convert minutes to HH:MM
function minutesToHHMM(min) {
  const h = Math.floor(min / 60).toString().padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    let { doctor_id, date, slot_duration = 10 } = await req.json();

    if (!doctor_id || !date) {
      return failure("doctor_id & date required", null, 400, {
        headers: corsHeaders,
      });
    }

    // ---------------------------------------------
    // 1) Fetch doctor clinic slots
    // ---------------------------------------------
    const { data: doctor, error: docErr } = await supabase
      .from("doctor_details")
      .select("clinic_slots, leave_days, slot_interval_minutes")
      .eq("id", doctor_id)
      .maybeSingle();

    if (docErr) throw docErr;
    if (!doctor) return failure("Doctor not found", null, 404, { headers: corsHeaders });

    // Parse as local time (not UTC) to avoid off-by-one day in IST/UTC+ timezones
    const [_y, _m, _d] = date.split("-").map(Number);
    const weekday = new Date(_y, _m - 1, _d).toLocaleString("en-US", { weekday: "long" });

    let todaySlot = doctor.clinic_slots?.[weekday];

    if (!todaySlot) {
      return success("No clinic timings set for this day", [], 200, {
        headers: corsHeaders,
      });
    }

    if (typeof todaySlot === "string") {
      try {
        todaySlot = JSON.parse(todaySlot);
      } catch (e) {
        return failure("Invalid clinic slot format", null, 500, {
          headers: corsHeaders,
        });
      }
    }

    let intervals = [];
    if (Array.isArray(todaySlot)) {
      intervals = todaySlot.filter(s => s.start && s.end);
    } else if (todaySlot.start && todaySlot.end) {
      intervals = [todaySlot];
    }

    if (intervals.length === 0) {
      return success("Doctor has no clinic timing for this day", [], 200, {
        headers: corsHeaders,
      });
    }

    // Check if doctor is on leave (leave_days stores full weekday names like "Thursday")
    const leaveDays = Array.isArray(doctor.leave_days)
      ? doctor.leave_days
      : (typeof doctor.leave_days === "string" ? (() => { try { return JSON.parse(doctor.leave_days); } catch { return []; } })() : []);
    if (leaveDays.includes(weekday)) {
      return success("Doctor is on leave this day", [], 200, {
        headers: corsHeaders,
      });
    }

    // ---------------------------------------------
    // 3) Generate slot times
    // ---------------------------------------------
    const slots = [];
    const actual_slot_duration = doctor.slot_interval_minutes || slot_duration || 10;
    
    intervals.forEach(({ start, end }) => {
      const startMin = toMinutes(start);
      const endMin = toMinutes(end);

      for (let m = startMin; m < endMin; m += actual_slot_duration) {
        const timeHHMM = minutesToHHMM(m);
        if (!slots.some(s => s.time === timeHHMM)) {
          slots.push({
            time: timeHHMM,
            slot_booked: false,
          });
        }
      }
    });

    slots.sort((a, b) => a.time.localeCompare(b.time));

    // ---------------------------------------------
    // 4) Fetch booked appointments for same date
    // ---------------------------------------------
    const { data: bookedAppointments, error: appErr } = await supabase
      .from("appointments")
      .select("appointment_time")
      .eq("doctor_id", doctor_id)
      .eq("appointment_date", date)
      .in("status", ["booked", "approved", "completed", "freezed"]);

    if (appErr) throw appErr;

    const bookedTimes = bookedAppointments?.map((a) =>
      a.appointment_time.slice(0, 5)
    );

    // ---------------------------------------------
    // 5) Mark booked slots
    // ---------------------------------------------
    const finalSlots = slots.map((slot) => ({
      ...slot,
      slot_booked: bookedTimes.includes(slot.time),
    }));

    return success("Clinic slots generated successfully", finalSlots, 200, {
      headers: corsHeaders,
    });

  } catch (error) {
    console.error("Clinic slot error:", error);
    return failure("Failed to generate clinic slots", error.message, 500, {
      headers: corsHeaders,
    });
  }
}
