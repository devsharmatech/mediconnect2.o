import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req, { params }) {
  try {
    const { id } = params;
    
    if (!id) {
      return failure("appointment id is required", null, 400);
    }

    const { data, error } = await supabase
      .from("appointments")
      .update({
        status: "cancelled"
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return success("Appointment cancelled successfully", data, 200);
  } catch (error) {
    console.error("Cancel Appointment API Error:", error);
    return failure("Internal Server Error", error.message, 500);
  }
}
