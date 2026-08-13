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

    const { data: doctors, error: doctorErr } = await supabase
      .from("doctor_details")
      .select("*, users!inner(role, is_verified)")
      .eq("users.role", "doctor")
      .eq("users.is_verified", true)
      .eq("onboarding_status", "approved")
      .eq("is_open", true);

    if (doctorErr) throw doctorErr;

    const availableDoctors = (doctors || []).filter((doc) => {
      if (!doc.available_days || !doc.available_time) return false;

      const isToday = Array.isArray(doc.available_days)
        ? todaySlugs.some(slug => doc.available_days.includes(slug))
        : todaySlugs.some(slug => String(doc.available_days).includes(slug));

      if (!isToday) return false;

      let start, end;
      if (typeof doc.available_time === "string") {
        try {
          const parsed = JSON.parse(doc.available_time);
          start = parsed.start;
          end = parsed.end;
        } catch {
          return false;
        }
      } else {
        ({ start, end } = doc.available_time);
      }

      if (!start || !end) return false;

      const nowMin = toMinutes(currentTime);
      const startMin = toMinutes(start);
      const endMin = toMinutes(end);

      return nowMin >= startMin && nowMin <= endMin;
    });

    if (availableDoctors.length === 0) {
      return success("No available doctors right now.", [], 200, {
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

    return success("Instant available doctors", instantDoctors, 200, {
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("Instant doctor error:", err);
    return failure("Failed to fetch instant doctors", err.message, 500, {
      headers: corsHeaders,
    });
  }
}
