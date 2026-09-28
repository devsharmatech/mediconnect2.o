import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { appointment_id, doctor_id, patient_id, duration_seconds = 600 } = await req.json();

    if (!appointment_id) {
      return failure("appointment_id is required", null, 400, { headers: corsHeaders });
    }

    let docId = doctor_id;
    let patId = patient_id;

    // Retrieve doctor and patient from appointments table in RDS if missing
    if (!docId || !patId) {
      try {
        const apts = await sql`
          SELECT doctor_id, patient_id 
          FROM appointments 
          WHERE id = ${appointment_id} 
          LIMIT 1
        `;
        if (apts && apts.length > 0) {
          docId = docId || apts[0].doctor_id;
          patId = patId || apts[0].patient_id;
        }
      } catch (dbErr) {
        console.warn("Could not query appointments for slot consumption:", dbErr.message);
      }
    }

    const durationMins = Math.round(Number(duration_seconds) / 60) || 10;

    // Send notification to Doctor
    if (docId) {
      try {
        await sql`
          INSERT INTO notifications (user_id, title, message, type, metadata, read, created_at)
          VALUES (
            ${docId},
            'Dedicated Time Slot Consumed',
            ${`The dedicated consultation time slot (${durationMins} minutes) for appointment #${appointment_id} has been consumed.`},
            'slot_consumed',
            ${JSON.stringify({ appointment_id, duration_seconds, role: "doctor" })},
            false,
            NOW()
          )
        `;
      } catch (nErr) {
        console.warn("Failed to insert doctor notification:", nErr.message);
      }
    }

    // Send notification to Patient
    if (patId) {
      try {
        await sql`
          INSERT INTO notifications (user_id, title, message, type, metadata, read, created_at)
          VALUES (
            ${patId},
            'Consultation Time Slot Consumed',
            ${`Your dedicated consultation time slot (${durationMins} minutes) has completed.`},
            'slot_consumed',
            ${JSON.stringify({ appointment_id, duration_seconds, role: "patient" })},
            false,
            NOW()
          )
        `;
      } catch (pnErr) {
        console.warn("Failed to insert patient notification:", pnErr.message);
      }
    }

    return success(
      "Dedicated time slot consumption logged and notifications dispatched.",
      { appointment_id, duration_seconds },
      200,
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("slot-consumed route error:", error);
    return failure("Failed to record slot consumption", error.message, 500, { headers: corsHeaders });
  }
}
