import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export const dynamic = 'force-dynamic';

function getISTDate() {
  const nowIST = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  return nowIST;
}

function getTodaySlugsIST() {
  const short1 = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const short2 = ["Sun", "Mon", "Tues", "Wed", "Thurs", "Fri", "Sat"];
  const longDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const idx = getISTDate().getDay();
  return [short1[idx], short2[idx], longDays[idx]];
}

function getISTTimeHHMM() {
  return getISTDate().toTimeString().slice(0, 5); // "HH:MM"
}

function toMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const todaySlugs = getTodaySlugsIST();
    const currentTime = getISTTimeHHMM();
    const nowMin = toMinutes(currentTime);

    const { data: doctors, error: doctorErr } = await supabase
      .from("doctor_details")
      .select("*, users!inner(role, is_verified, status)")
      .eq("users.role", "doctor")
      .eq("users.status", 1);

    if (doctorErr) throw doctorErr;

    const availableDoctors = (doctors || []).filter((doc) => {
      if (doc.is_open === false) return false;

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
      const fallbackDoctors = (doctors || []).filter((doc) => doc.is_open !== false);
      return success("Available doctors", fallbackDoctors.length > 0 ? fallbackDoctors : doctors || [], 200, {
        headers: corsHeaders,
      });
    }

    const blockedStatuses = ["booked", "approved", "completed", "freezed"];
    const todayIST = getISTDate();
    const yyyy = todayIST.getFullYear();
    const mm = String(todayIST.getMonth() + 1).padStart(2, "0");
    const dd = String(todayIST.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const { data: todaysAppointments, error: appErr } = await supabase
      .from("appointments")
      .select("doctor_id, appointment_date, appointment_time, status")
      .eq("appointment_date", todayStr)
      .in("status", blockedStatuses);

    if (appErr) throw appErr;

    const instantDoctors = availableDoctors.filter((doc) => {
      const isBusy = (todaysAppointments || []).some((apt) => {
        if (apt.doctor_id !== doc.id) return false;
        const aptTime = apt.appointment_time?.slice(0, 5);
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
