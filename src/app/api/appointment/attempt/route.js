import { success, failure } from "@/lib/response";
import sql from "@/lib/db";

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

    const rows = await sql`
      INSERT INTO booking_attempts (
        patient_id, doctor_id, appointment_date, appointment_time, appointment_type, fee, status
      ) VALUES (
        ${patient_id || null}, ${doctor_id}, ${appointment_date}, ${appointment_time},
        ${appointment_type || 'clinic_visit'}, ${fee || 0}, 'initiated'
      )
      RETURNING *
    `;

    return success("Booking attempt logged successfully", rows[0], 201);
  } catch (err) {
    console.error("[Attempt API] Exception:", err);
    return failure("Failed to log booking attempt", err.message, 500);
  }
}
