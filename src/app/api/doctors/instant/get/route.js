import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export const dynamic = "force-dynamic";

function getISTDate() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
}

function getTodaySlugsIST() {
  const short1 = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const short2 = ["Sun", "Mon", "Tues", "Wed", "Thurs", "Fri", "Sat"];
  const longDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const idx = getISTDate().getDay();
  return [short1[idx], short2[idx], longDays[idx]];
}

function getISTTimeHHMM() {
  return getISTDate().toTimeString().slice(0, 5);
}

function toMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET() {
  try {
    const todaySlugs = getTodaySlugsIST();
    const currentTime = getISTTimeHHMM();
    const nowMin = toMinutes(currentTime);

    const doctors = await sql`
      SELECT d.*, json_build_object('role', u.role, 'is_verified', u.is_verified, 'status', u.status) AS users
      FROM doctor_details d
      JOIN users u ON u.id = d.id
      LEFT JOIN doctor_onboarding_status dos ON dos.doctor_id = u.id
      WHERE u.role = 'doctor'
        AND u.status = 1
        AND (d.onboarding_status = 'approved' OR dos.allowed_to_consult = true)
    `;

    const availableDoctors = (doctors || []).filter((doc) => {
      if (doc.is_open === false || doc.is_available === false) return false;

      if (doc.available_days && doc.available_days.length > 0) {
        const isToday = Array.isArray(doc.available_days)
          ? todaySlugs.some((slug) => doc.available_days.includes(slug))
          : todaySlugs.some((slug) => String(doc.available_days).includes(slug));

        if (!isToday) return false;
      }

      let hasTimeConstraint = false;
      let isWithinTime = false;

      if (doc.available_time) {
        hasTimeConstraint = true;
        let start, end;
        if (typeof doc.available_time === "string") {
          try {
            const parsed = JSON.parse(doc.available_time);
            start = parsed.start;
            end = parsed.end;
          } catch {}
        } else {
          ({ start, end } = doc.available_time);
        }

        if (start && end) {
          const sMin = toMinutes(start);
          const eMin = toMinutes(end);
          if (sMin !== null && eMin !== null && nowMin >= sMin && nowMin <= eMin) {
            isWithinTime = true;
          }
        }
      }

      if (!isWithinTime && doc.video_slots) {
        hasTimeConstraint = true;
        let slots = [];
        if (Array.isArray(doc.video_slots)) {
          slots = doc.video_slots;
        } else if (typeof doc.video_slots === "string") {
          try {
            slots = JSON.parse(doc.video_slots) || [];
          } catch {}
        } else if (typeof doc.video_slots === "object") {
          const dayName = todaySlugs[2];
          const daySlot = doc.video_slots[dayName] || doc.video_slots[dayName?.toLowerCase()];
          if (Array.isArray(daySlot)) slots = daySlot;
          else if (daySlot) slots = [daySlot];
        }

        for (const slot of slots) {
          const s = slot.start || slot.time || slot.from;
          const e = slot.end || slot.to;
          if (s && e) {
            const sMin = toMinutes(s);
            const eMin = toMinutes(e);
            if (sMin !== null && eMin !== null && nowMin >= sMin && nowMin <= eMin) {
              isWithinTime = true;
              break;
            }
          }
        }
      }

      if (!hasTimeConstraint) {
        return true;
      }

      return isWithinTime;
    });

    if (availableDoctors.length === 0) {
      const fallbackDoctors = (doctors || []).filter((doc) => doc.is_open !== false && doc.is_available !== false);
      return success("Available doctors", fallbackDoctors, 200, {
        headers: corsHeaders,
      });
    }

    const todayIST = getISTDate();
    const yyyy = todayIST.getFullYear();
    const mm = String(todayIST.getMonth() + 1).padStart(2, "0");
    const dd = String(todayIST.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const todaysAppointments = await sql`
      SELECT doctor_id, appointment_date, appointment_time::text AS appointment_time, status
      FROM appointments
      WHERE appointment_date = ${todayStr}::date
        AND status IN ('booked', 'approved', 'completed', 'freezed')
    `;

    const instantDoctors = availableDoctors.filter((doc) => {
      const isBusy = (todaysAppointments || []).some((apt) => {
        if (apt.doctor_id !== doc.id) return false;
        const aptTime = (apt.appointment_time || "").slice(0, 5);
        return aptTime === currentTime;
      });
      return !isBusy;
    });

    return success("Instant available doctors", instantDoctors.length > 0 ? instantDoctors : availableDoctors, 200, {
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("Instant doctor error:", err);
    return failure("Failed to fetch instant doctors", err.message, 500, {
      headers: corsHeaders,
    });
  }
}
