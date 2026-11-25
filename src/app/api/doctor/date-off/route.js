import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { doctor_id, date, action } = body || {};

    if (!doctor_id || !date) {
      return failure("doctor_id and date are required.", null, 400, { headers: corsHeaders });
    }

    // Fetch doctor record
    const rows = await sql`
      SELECT id, leave_days, clinic_slots, video_slots, home_slots, available_days, available_time, slot_interval_minutes
      FROM doctor_details
      WHERE id = ${doctor_id}
      LIMIT 1
    `;
    const doctor = rows[0];
    if (!doctor) {
      return failure("Doctor not found.", null, 404, { headers: corsHeaders });
    }

    let leaveDays = [];
    if (Array.isArray(doctor.leave_days)) {
      leaveDays = [...doctor.leave_days];
    } else if (typeof doctor.leave_days === "string") {
      try {
        leaveDays = JSON.parse(doctor.leave_days);
      } catch {
        leaveDays = doctor.leave_days.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }
    if (!Array.isArray(leaveDays)) leaveDays = [];

    const isCurrentlyOff = leaveDays.some((d) => String(d).trim().toLowerCase() === date.toLowerCase());

    if (action === "status") {
      return success(
        "Date off status fetched successfully",
        { is_off: isCurrentlyOff, leave_days: leaveDays },
        200,
        { headers: corsHeaders }
      );
    }

    if (action === "mark_off") {
      if (!isCurrentlyOff) {
        leaveDays.push(date);
        await sql`
          UPDATE doctor_details
          SET leave_days = ${sql.json(leaveDays)}
          WHERE id = ${doctor_id}
        `;
      }

      return success(
        `${date} marked as Day Off successfully.`,
        { is_off: true, leave_days: leaveDays },
        200,
        { headers: corsHeaders }
      );
    }

    if (action === "mark_available") {
      const updatedLeaveDays = leaveDays.filter(
        (d) => String(d).trim().toLowerCase() !== date.toLowerCase()
      );

      await sql`
        UPDATE doctor_details
        SET leave_days = ${sql.json(updatedLeaveDays)}
        WHERE id = ${doctor_id}
      `;

      // Unfreeze any freezed slots on that date so slots become available again
      await sql`
        DELETE FROM appointments
        WHERE doctor_id = ${doctor_id}
          AND appointment_date = ${date}::date
          AND status = 'freezed'
      `;

      return success(
        `${date} marked as Working Day successfully.`,
        { is_off: false, leave_days: updatedLeaveDays },
        200,
        { headers: corsHeaders }
      );
    }

    return failure("Invalid action. Use 'mark_off', 'mark_available', or 'status'.", null, 400, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Doctor date-off error:", error);
    return failure("Failed to update date-off status.", error.message, 500, {
      headers: corsHeaders,
    });
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
      SELECT leave_days
      FROM doctor_details
      WHERE id = ${doctor_id}
      LIMIT 1
    `;
    const doctor = rows[0];
    if (!doctor) return failure("Doctor not found", null, 404, { headers: corsHeaders });

    let leaveDays = [];
    if (Array.isArray(doctor.leave_days)) {
      leaveDays = doctor.leave_days;
    } else if (typeof doctor.leave_days === "string") {
      try {
        leaveDays = JSON.parse(doctor.leave_days);
      } catch {
        leaveDays = doctor.leave_days.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }

    return success("Leave days fetched", { leave_days: leaveDays || [] }, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Doctor date-off GET error:", error);
    return failure("Failed to fetch leave days.", error.message, 500, { headers: corsHeaders });
  }
}
