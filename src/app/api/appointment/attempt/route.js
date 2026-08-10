import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      patient_id,
      doctor_id,
      appointment_date,
      appointment_time,
      appointment_type,
      fee,
    } = body;

    if (!doctor_id || !appointment_date || !appointment_time) {
      return failure("Missing required fields for booking attempt", null, 400);
    }

    const { data, error } = await supabase
      .from("booking_attempts")
      .insert([
        {
          patient_id: patient_id || null,
          doctor_id,
          appointment_date,
          appointment_time,
          appointment_type: appointment_type || 'clinic_visit',
          fee: fee || 0,
          status: 'initiated'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("[Attempt API] Database error:", error);
      return failure("Failed to log booking attempt", error.message, 500);
    }

    return success("Booking attempt logged successfully", data, 201);
  } catch (err) {
    console.error("[Attempt API] Exception:", err);
    return failure("Failed to log booking attempt", err.message, 500);
  }
}
