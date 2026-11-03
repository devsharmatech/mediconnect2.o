import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { doctor_id, appointment_date, appointment_times, action } = body || {};

    if (!doctor_id || !appointment_date || !appointment_times?.length || !action) {
      return failure(
        "doctor_id, appointment_date, appointment_times (array), and action are required.",
        null,
        400,
        { headers: corsHeaders }
      );
    }

    if (!["freeze", "unfreeze"].includes(action)) {
      return failure("Invalid action. Use 'freeze' or 'unfreeze'.", null, 400, { headers: corsHeaders });
    }

    const results = [];

    for (const time of appointment_times) {
      const existingRows = await sql`
        SELECT id, status
        FROM appointments
        WHERE doctor_id = ${doctor_id}
          AND appointment_date = ${appointment_date}::date
          AND SUBSTRING(appointment_time::text, 1, 5) = ${String(time).slice(0, 5)}
        LIMIT 1
      `;
      const existing = existingRows[0] || null;

      if (action === "freeze") {
        if (existing && ["booked", "approved", "completed"].includes(existing.status)) {
          results.push({ time, status: "failed", message: "Slot already booked by a patient" });
          continue;
        }

        if (existing && existing.status === "freezed") {
          results.push({ time, status: "skipped", message: "Slot already freezed" });
          continue;
        }

        if (existing) {
          await sql`
            UPDATE appointments
            SET status = 'freezed',
                patient_id = ${doctor_id},
                updated_at = NOW()
            WHERE id = ${existing.id}
          `;
          results.push({ time, status: "success", action: "freezed" });
        } else {
          await sql`
            INSERT INTO appointments (doctor_id, patient_id, appointment_date, appointment_time, status)
            VALUES (${doctor_id}, ${doctor_id}, ${appointment_date}::date, ${time}, 'freezed')
          `;
          results.push({ time, status: "success", action: "freezed" });
        }
      }

      if (action === "unfreeze") {
        if (!existing || existing.status !== "freezed") {
          results.push({ time, status: "failed", message: "Slot is not freezed" });
          continue;
        }

        await sql`
          DELETE FROM appointments
          WHERE id = ${existing.id}
        `;
        results.push({ time, status: "success", action: "unfreezed" });
      }
    }

    return success(`Slots ${action} operation completed.`, results, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Freeze/unfreeze multiple slots error:", error);
    return failure("Failed to freeze/unfreeze slots.", error.message, 500, { headers: corsHeaders });
  }
}
