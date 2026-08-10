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
  return getISTDate().toLocaleString("en-US", { weekday: "long" }); // Monday, Tuesday...
}

function getISTTimeHHMM() {
  return getISTDate().toTimeString().slice(0, 5); // "HH:MM"
}

/* Safely convert "HH:MM" into minutes */
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
    const today = getTodayNameIST(); // "Monday" (IST)
    const currentTime = getISTTimeHHMM(); // "14:32" (IST)

    // 1) Fetch approved doctors
    const { data: doctors, error } = await supabase
      .from("doctor_details")
      .select("*, users!inner(role, is_verified)")
      .eq("users.role", "doctor")
      .eq("users.is_verified", true)
      .eq("onboarding_status", "approved");

    if (error) throw error;

    // 2) Filter doctors who have clinic slots configured
    const availableDoctors = doctors.filter((doc) => {
      // Return true if the doctor has clinic_slots configured
      return doc.clinic_slots && Object.keys(doc.clinic_slots).length > 0;
    });

    return success("Clinic available doctors", availableDoctors, 200, {
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("Clinic doctor error:", err);
    return failure(
      "Failed to fetch clinic available doctors",
      err.message,
      500,
      { headers: corsHeaders },
    );
  }
}
