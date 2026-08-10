import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseClient";

export async function PUT(req) {
  try {
    const body = await req.json();
    const { doctor_id, ...settings } = body;

    if (!doctor_id) {
      return failure("doctor_id is required", null, 400);
    }

    const { data, error } = await supabase
      .from("doctor_details")
      .update(settings)
      .eq("id", doctor_id)
      .select()
      .single();

    if (error) throw error;

    return success("Doctor settings updated successfully", data, 200);
  } catch (error) {
    console.error("Doctor Settings API Error:", error);
    return failure("Internal Server Error", error.message, 500);
  }
}
