import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

async function handleGetAttempts(doctorId) {
  if (!doctorId) {
    return { error: "Doctor ID is required", status: 400 };
  }

  // 1. Fetch doctor fees for fallback
  let doctorVideoFee = 500;
  let doctorClinicFee = 800;
  let doctorDefaultFee = 500;

  try {
    const docRows = await sql`
      SELECT video_consultation_fee, clinic_consultation_fee, consultation_fee
      FROM doctor_details
      WHERE id = ${doctorId}
      LIMIT 1
    `;
    if (docRows.length > 0) {
      const doc = docRows[0];
      const parseVal = (v) => (v !== null && v !== undefined && v !== "" && !isNaN(Number(v)) ? Number(v) : null);
      doctorVideoFee = parseVal(doc.video_consultation_fee) ?? parseVal(doc.consultation_fee) ?? 0;
      doctorClinicFee = parseVal(doc.clinic_consultation_fee) ?? parseVal(doc.consultation_fee) ?? 0;
      doctorDefaultFee = parseVal(doc.consultation_fee) ?? doctorVideoFee ?? 0;
    }
  } catch (err) {
    console.warn("[Doctor Booking Attempts] Could not fetch doctor fees:", err.message);
  }

  // 2. Query booking attempts with patient details from AWS RDS
  let rawAttempts = [];
  try {
    rawAttempts = await sql`
      SELECT 
        b.id,
        b.doctor_id,
        b.patient_id,
        b.appointment_date,
        b.appointment_time,
        b.appointment_type,
        b.fee,
        b.status,
        b.created_at,
        b.updated_at,
        p.full_name as patient_full_name,
        u.phone_number as patient_phone,
        u.email as patient_email
      FROM booking_attempts b
      LEFT JOIN patient_details p ON b.patient_id = p.id
      LEFT JOIN users u ON b.patient_id = u.id
      WHERE b.doctor_id = ${doctorId}
      ORDER BY b.created_at DESC
    `;
  } catch (dbErr) {
    console.warn("[Doctor Booking Attempts] DB join query error, trying simple fetch:", dbErr.message);
    try {
      rawAttempts = await sql`
        SELECT *
        FROM booking_attempts
        WHERE doctor_id = ${doctorId}
        ORDER BY created_at DESC
      `;
    } catch (fallbackErr) {
      console.error("[Doctor Booking Attempts] Fallback DB Error:", fallbackErr.message);
      return { data: [] };
    }
  }

  // 3. Map amount and doctor consultation fee so analytics never defaults revenue to ₹0
  const mappedAttempts = rawAttempts.map((attempt) => {
    const type = (attempt.appointment_type || "").toLowerCase();
    let fallbackFee = doctorDefaultFee;
    if (type.includes("video") || type.includes("instant") || type === "consultation") {
      fallbackFee = doctorVideoFee;
    } else if (type.includes("clinic") || type.includes("person")) {
      fallbackFee = doctorClinicFee;
    }

    const rawFeeNum = attempt.fee !== null && attempt.fee !== undefined && attempt.fee !== "" ? Number(attempt.fee) : NaN;
    const resolvedFee = !isNaN(rawFeeNum) ? rawFeeNum : fallbackFee;

    return {
      id: attempt.id,
      doctor_id: attempt.doctor_id,
      patient_id: attempt.patient_id,
      appointment_date: attempt.appointment_date ? (attempt.appointment_date instanceof Date ? attempt.appointment_date.toISOString().split("T")[0] : String(attempt.appointment_date).split("T")[0]) : "",
      appointment_time: attempt.appointment_time ? String(attempt.appointment_time).slice(0, 5) : "",
      appointment_type: attempt.appointment_type || "video_consultation",
      fee: resolvedFee,
      amount: resolvedFee,
      status: attempt.status || "initiated",
      created_at: attempt.created_at,
      updated_at: attempt.updated_at,
      patient: attempt.patient_id ? {
        id: attempt.patient_id,
        full_name: attempt.patient_full_name || "Guest Patient",
        phone: attempt.patient_phone || "",
        email: attempt.patient_email || ""
      } : null
    };
  });

  return { data: mappedAttempts };
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get("doctor_id") || searchParams.get("doctorId");

    const result = await handleGetAttempts(doctorId);
    if (result.error) {
      return failure(result.error, null, result.status || 400, { headers: corsHeaders });
    }

    return success("Booking attempts fetched successfully", result.data, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("[Doctor Attempts API GET] Exception:", err);
    return failure("Internal Server Error", err.message, 500, { headers: corsHeaders });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const doctorId = body.doctor_id || body.doctorId;

    const result = await handleGetAttempts(doctorId);
    if (result.error) {
      return failure(result.error, null, result.status || 400, { headers: corsHeaders });
    }

    return success("Booking attempts fetched successfully", result.data, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("[Doctor Attempts API POST] Exception:", err);
    return failure("Internal Server Error", err.message, 500, { headers: corsHeaders });
  }
}
