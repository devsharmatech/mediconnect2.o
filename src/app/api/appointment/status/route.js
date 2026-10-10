import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { executeOrchestration } from "@/lib/layer1/controlLayer";
import { randomUUID } from "crypto";

import sql from "@/lib/db";

function parseAppointmentDateTime(rawDate, rawTime) {
  if (!rawDate) return null;
  let year = NaN, month = NaN, day = NaN;

  if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
    year = rawDate.getFullYear();
    month = rawDate.getMonth() + 1;
    day = rawDate.getDate();
  } else if (typeof rawDate === "string") {
    const cleanDate = rawDate.trim().split("T")[0];
    const parts = cleanDate.split(/[-/]/).map(Number);
    if (parts.length === 3) {
      if (parts[0] > 1000) {
        [year, month, day] = parts;
      } else if (parts[2] > 1000) {
        [day, month, year] = parts;
      }
    }
  }

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    const parsed = new Date(rawDate);
    if (!isNaN(parsed.getTime())) {
      year = parsed.getFullYear();
      month = parsed.getMonth() + 1;
      day = parsed.getDate();
    } else {
      return null;
    }
  }

  let hours = 23, minutes = 59;
  if (rawTime && typeof rawTime === "string") {
    const timeMatch = rawTime.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = parseInt(timeMatch[2], 10);
      const modifier = timeMatch[3] ? timeMatch[3].toUpperCase() : null;

      if (modifier === "PM" && h < 12) h += 12;
      if (modifier === "AM" && h === 12) h = 0;

      hours = h;
      minutes = m;
    }
  }

  const dt = new Date(year, month - 1, day, hours, minutes, 0);
  return isNaN(dt.getTime()) ? null : dt;
}

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { appointment_id, status, doctor_id } = await req.json();
    if (!appointment_id || !status || !doctor_id)
      return failure("appointment_id, status, and doctor_id required.", null, 400, { headers: corsHeaders });

    if (!["approved", "rejected"].includes(status))
      return failure("Invalid status. Must be approved or rejected.", null, 400, { headers: corsHeaders });

    // Validate that appointment slot has not expired if approving
    if (status === "approved") {
      const [apt] = await sql`
        SELECT appointment_date, appointment_time, status
        FROM appointments
        WHERE id = ${appointment_id}
        LIMIT 1
      `;

      if (apt?.appointment_date) {
        const aptDateTime = parseAppointmentDateTime(apt.appointment_date, apt.appointment_time);
        if (aptDateTime) {
          const now = new Date();
          if (now.getTime() > aptDateTime.getTime() + 30 * 60 * 1000) {
            return failure("This appointment slot has expired and can no longer be approved.", null, 400, { headers: corsHeaders });
          }
        }
      }
    }

    // Route via orchestration engine
    const orchestrationResult = await executeOrchestration({
      idempotencyKey: `status-${appointment_id}-${status}-${randomUUID()}`,
      actionType: "UPDATE_APPOINTMENT_STATUS",
      actorId: doctor_id,
      actorType: "doctor",
      careEpisodeId: null, // Will map internally if needed
      payload: { appointment_id, status }
    });

    if (!orchestrationResult.success) {
      const isDuplicate = orchestrationResult.cached || orchestrationResult.isDuplicate;
      if (isDuplicate) {
        return success("Appointment status already updated (Idempotent response)", orchestrationResult.data, 200, { headers: corsHeaders });
      }
      return failure(orchestrationResult.error || "Failed to update appointment status", null, orchestrationResult.status || 500, { headers: corsHeaders });
    }

    return success(`Appointment ${status} successfully.`, orchestrationResult.data, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("POST /api/appointment/status error:", error);
    return failure("Failed to update appointment status.", error.message, 500, { headers: corsHeaders });
  }
}
