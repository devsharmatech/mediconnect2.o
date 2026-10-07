import { success, failure } from "@/lib/response";
import sql from "@/lib/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const doctor_id = searchParams.get("doctor_id");

    if (!doctor_id) {
      return failure("doctor_id is required", null, 400);
    }

    const appointments = await sql`
      SELECT id, status
      FROM appointments
      WHERE doctor_id = ${doctor_id}
        AND appointment_date = CURRENT_DATE
    `;

    const doctorRows = await sql`
      SELECT consultation_fee, meta
      FROM doctor_details
      WHERE id = ${doctor_id}
      LIMIT 1
    `;

    const doctor = doctorRows[0];
    const fee = doctor?.consultation_fee ? Number(doctor.consultation_fee) : 500;

    const completedCount = appointments.filter((a) => a.status === "completed").length;
    const pendingCount = appointments.filter((a) =>
      ["booked", "approved", "checked_in", "waiting"].includes(a.status)
    ).length;

    const stats = {
      total_appointments: appointments.length,
      completed: completedCount,
      pending: pendingCount,
      earnings: completedCount * fee,
    };

    return success("Dashboard stats fetched", { stats }, 200);
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return failure("Internal Server Error", error.message, 500);
  }
}
