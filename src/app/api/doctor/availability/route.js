import { success, failure } from "@/lib/response";
import sql from "@/lib/db";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { doctor_id, action, is_open, slot_interval_minutes } = body;

    if (!doctor_id) {
      return failure("doctor_id is required", null, 400, { headers: corsHeaders });
    }

    if (action === "get") {
      const rows = await sql`
        SELECT is_open, is_available, slot_interval_minutes
        FROM doctor_details
        WHERE id = ${doctor_id}
        LIMIT 1
      `;
      const data = rows[0] || null;
      const openState = data ? (data.is_open !== false && data.is_available !== false) : false;

      return success(
        "Availability fetched successfully",
        {
          is_open: openState,
          is_available: openState,
          slot_interval_minutes: Number(data?.slot_interval_minutes) || 10,
        },
        200,
        { headers: corsHeaders }
      );
    }

    if (action === "toggle") {
      const nextOpen = Boolean(is_open);

      // If turning offline, check if doctor has active appointments today
      if (!nextOpen) {
        const todayStr = new Date().toISOString().split("T")[0];
        const appointments = await sql`
          SELECT id, appointment_time::text AS appointment_time, appointment_type, status
          FROM appointments
          WHERE doctor_id = ${doctor_id}
            AND appointment_date = ${todayStr}::date
            AND status IN ('approved', 'booked', 'pending')
        `;

        if (appointments && appointments.length > 0) {
          return new Response(
            JSON.stringify({
              success: false,
              message: "Cannot go offline: You have active appointments today.",
              appointments,
            }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      await sql`
        UPDATE doctor_details
        SET is_open = ${nextOpen},
            is_available = ${nextOpen}
        WHERE id = ${doctor_id}
      `;

      const statusMsg = nextOpen
        ? "Now You Are Live — Open for Appointments"
        : "Now You Are Closed — Offline for Appointments";

      return success(
        statusMsg,
        { is_open: nextOpen, is_available: nextOpen },
        200,
        { headers: corsHeaders }
      );
    }

    if (action === "set_interval") {
      const parsed = parseInt(slot_interval_minutes, 10);
      const validInterval = !Number.isNaN(parsed) && parsed >= 5 ? parsed : 10;

      await sql`
        UPDATE doctor_details
        SET slot_interval_minutes = ${validInterval}
        WHERE id = ${doctor_id}
      `;

      return success(
        `Slot interval updated to ${validInterval} minutes`,
        { slot_interval_minutes: validInterval },
        200,
        { headers: corsHeaders }
      );
    }

    return failure("Invalid action", null, 400, { headers: corsHeaders });
  } catch (error) {
    console.error("Availability POST Error:", error);
    return failure("Internal Error", error.message, 500, { headers: corsHeaders });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const doctor_id = searchParams.get("doctor_id");

    if (!doctor_id) {
      return failure("doctor_id is required", null, 400, { headers: corsHeaders });
    }

    const rows = await sql`
      SELECT is_open, is_available, slot_interval_minutes
      FROM doctor_details
      WHERE id = ${doctor_id}
      LIMIT 1
    `;
    const data = rows[0] || null;
    const openState = data ? (data.is_open !== false && data.is_available !== false) : false;

    return success(
      "Availability fetched",
      {
        is_open: openState,
        is_available: openState,
        slot_interval_minutes: Number(data?.slot_interval_minutes) || 10,
      },
      200,
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Availability GET Error:", error);
    return failure("Internal Error", error.message, 500, { headers: corsHeaders });
  }
}
