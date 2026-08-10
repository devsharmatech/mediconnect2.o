import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { new_date, new_time, reason } = body;

    if (!id || !new_date || !new_time) {
      return failure("appointment id, new_date, and new_time are required", null, 400);
    }

    const { data, error } = await supabase
      .from("appointments")
      .update({
        appointment_date: new_date,
        appointment_time: new_time,
        status: "rescheduled",
        notes: reason || ""
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return success("Appointment rescheduled successfully", data, 200);
  } catch (error) {
    console.error("Reschedule Appointment API Error:", error);
    return failure("Internal Server Error", error.message, 500);
  }
}
