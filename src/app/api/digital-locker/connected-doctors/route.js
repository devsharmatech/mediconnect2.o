import { NextResponse } from "next/server";
import sql from "@/lib/db";

/**
 * GET /api/digital-locker/connected-doctors?patient_id={id}
 * Queries AWS RDS PostgreSQL for doctors connected with a patient via consultations or appointments.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patient_id");

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: "Patient ID is required" },
        { status: 400 }
      );
    }

    const [consultations, appointments] = await Promise.all([
      sql`
        SELECT id, appointment_id, doctor_id, created_at
        FROM consultations
        WHERE patient_id = ${patientId}
      `.catch(() => []),
      sql`
        SELECT id, doctor_id, created_at, status
        FROM appointments
        WHERE patient_id = ${patientId}
      `.catch(() => []),
    ]);

    const connectionMap = new Map();

    (consultations || []).forEach((c) => {
      if (!c.doctor_id) return;
      const apptId = c.appointment_id || c.id;
      const key = `${c.doctor_id}:${apptId}`;
      connectionMap.set(key, {
        doctor_id: c.doctor_id,
        appointment_id: String(apptId),
        created_at: c.created_at,
      });
    });

    (appointments || []).forEach((a) => {
      if (!a.doctor_id) return;
      const key = `${a.doctor_id}:${a.id}`;
      if (!connectionMap.has(key)) {
        connectionMap.set(key, {
          doctor_id: a.doctor_id,
          appointment_id: String(a.id),
          created_at: a.created_at,
        });
      }
    });

    const connections = Array.from(connectionMap.values()).sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    if (connections.length === 0) {
      return NextResponse.json({ success: true, doctors: [] });
    }

    const doctorIds = [...new Set(connections.map((c) => c.doctor_id))];
    const doctorDetails = await sql`
      SELECT id, full_name, specialization
      FROM doctor_details
      WHERE id = ANY(${doctorIds})
    `;

    const doctorMap = (doctorDetails || []).reduce((acc, doc) => {
      acc[doc.id] = doc;
      return acc;
    }, {});

    const formattedDoctors = connections.map((c) => {
      const doc = doctorMap[c.doctor_id];
      return {
        consultation_id: c.appointment_id,
        appointment_id: c.appointment_id,
        doctor_id: c.doctor_id,
        doctor_name: doc?.full_name || "Doctor",
        specialization: doc?.specialization || "General Medicine",
      };
    });

    return NextResponse.json({
      success: true,
      doctors: formattedDoctors,
    });
  } catch (error) {
    console.error("Connected doctors fetch error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
