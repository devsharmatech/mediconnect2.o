import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const doctor_id = searchParams.get("doctor_id");

    if (!doctor_id) {
      return failure("doctor_id is required", null, 400);
    }

    const todayIST = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );
    const yyyy = todayIST.getFullYear();
    const mm = String(todayIST.getMonth() + 1).padStart(2, "0");
    const dd = String(todayIST.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("id, appointment_time, appointment_type, status, patient_details(first_name, last_name, avatar_url, gender, dob)")
      .eq("doctor_id", doctor_id)
      .eq("appointment_date", todayStr)
      .in("status", ["booked", "approved", "checked_in", "waiting"])
      .order("appointment_time", { ascending: true });

    if (error) throw error;

    return success("Patient queue fetched", { queue: appointments }, 200);
  } catch (error) {
    console.error("Queue API Error:", error);
    return failure("Internal Server Error", error.message, 500);
  }
}
