import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

// Convert HH:MM → total minutes
function toMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// Convert minutes → HH:MM
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
    // 1) Fetch doctor's home visit slots & leave days
    // ---------------------------------------------
    const { data: doctor, error: docErr } = await supabase
      .from("doctor_details")
      .select("home_slots, leave_days, slot_interval_minutes")
      .eq("id", doctor_id)
      .maybeSingle();

    if (docErr) throw docErr;
    if (!doctor) return failure("Doctor not found", null, 404, { headers: corsHeaders });

    // Parse as local time (not UTC) to avoid off-by-one day in IST/UTC+ timezones
    const [_y, _m, _d] = date.split("-").map(Number);
    const weekday = new Date(_y, _m - 1, _d).toLocaleString("en-US", { weekday: "long" });

    let todaySlot = doctor.home_slots?.[weekday];

    if (!todaySlot) {
      return success("No home visit timing set for this day", [], 200, {
        headers: corsHeaders,
      });
    }

    // Parse if string JSON
    if (typeof todaySlot === "string") {
      try {
        todaySlot = JSON.parse(todaySlot);
      } catch {
        return failure("Invalid home slot format", null, 500, {
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
      return success("Doctor has no home visit timing this day", [], 200, {
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
    // 3) Generate home visit slots
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
    // 4) Check booked home visit appointments
    // ---------------------------------------------
    const { data: booked, error: bookedErr } = await supabase
      .from("appointments")
      .select("appointment_time")
      .eq("doctor_id", doctor_id)
      .eq("appointment_date", date)
   // .eq("type", "home") 
      .in("status", ["booked", "approved", "completed", "freezed"]);

    if (bookedErr) throw bookedErr;

    const bookedTimes =
      booked?.map((a) => a.appointment_time.slice(0, 5)) || [];

    // ---------------------------------------------
    // 5) Mark booked slots
    // ---------------------------------------------
    const finalSlots = slots.map((slot) => ({
      ...slot,
      slot_booked: bookedTimes.includes(slot.time),
    }));

    return success("Home visit slots generated successfully", finalSlots, 200, {
      headers: corsHeaders,
    });

  } catch (err) {
    console.error("Home slot error:", err);
    return failure("Failed to generate home visit slots", err.message, 500, {
      headers: corsHeaders,
    });
  }
}
