import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

function toMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

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

    const docRows = await sql`
      SELECT clinic_slots, leave_days, is_open, is_available, slot_interval_minutes
      FROM doctor_details
      WHERE id = ${doctor_id}
      LIMIT 1
    `;
    const doctor = docRows[0];
    if (!doctor) return failure("Doctor not found", null, 404, { headers: corsHeaders });

    if (doctor.is_open === false || doctor.is_available === false) {
      return success("Doctor is currently closed for appointments", [], 200, {
        headers: corsHeaders,
      });
    }

    const [_y, _m, _d] = date.split("-").map(Number);
    const weekday = new Date(_y, _m - 1, _d).toLocaleString("en-US", { weekday: "long" });

    let clinicSlotsObj = doctor.clinic_slots;
    if (typeof clinicSlotsObj === "string") {
      try {
        clinicSlotsObj = JSON.parse(clinicSlotsObj);
      } catch {
        clinicSlotsObj = {};
      }
    }

    let todaySlot = clinicSlotsObj?.[weekday] || clinicSlotsObj?.[weekday.toLowerCase()];

    if (!todaySlot) {
      return success("No clinic timings set for this day", [], 200, {
        headers: corsHeaders,
      });
    }

    if (typeof todaySlot === "string") {
      try {
        todaySlot = JSON.parse(todaySlot);
      } catch {
        return failure("Invalid clinic slot format", null, 500, {
          headers: corsHeaders,
        });
      }
    }

    let intervals = [];
    if (Array.isArray(todaySlot)) {
      intervals = todaySlot.filter((s) => s.start && s.end);
    } else if (todaySlot.start && todaySlot.end) {
      intervals = [todaySlot];
    }

    if (intervals.length === 0) {
      return success("Doctor has no clinic timing for this day", [], 200, {
        headers: corsHeaders,
      });
    }

    const leaveDays = Array.isArray(doctor.leave_days)
      ? doctor.leave_days
      : typeof doctor.leave_days === "string"
        ? (() => {
            try {
              return JSON.parse(doctor.leave_days);
            } catch {
              return [];
            }
          })()
        : [];
    if (leaveDays.includes(weekday)) {
      return success("Doctor is on leave this day", [], 200, {
        headers: corsHeaders,
      });
    }

    const slots = [];
    const actual_slot_duration = Math.max(5, Number(doctor.slot_interval_minutes) || Number(slot_duration) || 10);

    intervals.forEach(({ start, end }) => {
      const startMin = toMinutes(start);
      const endMin = toMinutes(end);

      for (let m = startMin; m < endMin; m += actual_slot_duration) {
        const timeHHMM = minutesToHHMM(m);
        if (!slots.some((s) => s.time === timeHHMM)) {
          slots.push({
            time: timeHHMM,
            slot_booked: false,
          });
        }
      }
    });

    slots.sort((a, b) => a.time.localeCompare(b.time));

    const bookedAppointments = await sql`
      SELECT appointment_time::text AS appointment_time
      FROM appointments
      WHERE doctor_id = ${doctor_id}
        AND appointment_date = ${date}::date
        AND status IN ('booked', 'approved', 'completed', 'freezed')
    `;

    const bookedTimes = bookedAppointments.map((a) => (a.appointment_time || "").slice(0, 5));

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
