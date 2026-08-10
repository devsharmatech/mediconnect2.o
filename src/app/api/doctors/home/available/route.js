import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

/* ---------------------------------------------------
   ALWAYS GET INDIA TIME ON LIVE SERVER
---------------------------------------------------*/
function getISTDate() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  );
}

function getTodayNameIST() {
  return getISTDate().toLocaleString("en-US", { weekday: "long" }); // Monday
}

function getISTTimeHHMM() {
  return getISTDate().toTimeString().slice(0, 5); // "14:32"
}

/* Convert HH:MM → minutes */
function toMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST() {
  try {
    const today = getTodayNameIST(); // IST-based weekday
    const currentTime = getISTTimeHHMM(); // IST-based time

    // 1) Fetch approved doctors
    const { data: doctors, error } = await supabase
      .from("doctor_details")
      .select("*, users!inner(role, is_verified)")
      .eq("users.role", "doctor")
      .eq("users.is_verified", true)
      .eq("onboarding_status", "approved");

    if (error) throw error;

    // 2) Filter doctors who have home slots configured
    const availableDoctors = doctors.filter((doc) => {
      // Return true if the doctor has home_slots configured
      return doc.home_slots && Object.keys(doc.home_slots).length > 0;
    });

    return success("Home available doctors", availableDoctors, 200, {
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("Home doctor error:", err);
    return failure("Failed to fetch home available doctors", err.message, 500, {
      headers: corsHeaders,
    });
  }
}
