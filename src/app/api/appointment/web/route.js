import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = (searchParams.get("search") || "").trim();
    const status = searchParams.get("status") || "all";
    const date = searchParams.get("date") || "";
    const doctor_id = searchParams.get("doctor_id") || "";
    const patient_id = searchParams.get("patient_id") || "";

    const offset = (page - 1) * limit;

    let baseFilter = sql`WHERE a.status != 'freezed'`;

    if (status !== "all") {
      baseFilter = sql`${baseFilter} AND a.status = ${status}`;
    }
    if (date) {
      baseFilter = sql`${baseFilter} AND (a.appointment_date = ${date}::date OR a.appointment_date::text LIKE ${date + '%'})`;
    }
    if (doctor_id) {
      baseFilter = sql`${baseFilter} AND a.doctor_id::text = ${doctor_id}`;
    }
    if (patient_id) {
      baseFilter = sql`${baseFilter} AND a.patient_id::text = ${patient_id}`;
    }
    const apptType = searchParams.get("type") || "all";
    const payStatus = searchParams.get("payment") || "all";
    if (apptType !== "all") {
      baseFilter = sql`${baseFilter} AND a.appointment_type = ${apptType}`;
    }
    if (payStatus === "free") {
      baseFilter = sql`${baseFilter} AND COALESCE(a.final_fee, 0) = 0`;
    } else if (payStatus === "paid") {
      baseFilter = sql`${baseFilter} AND COALESCE(a.final_fee, 0) > 0 AND a.payment_status = 'paid'`;
    } else if (payStatus === "unpaid") {
      baseFilter = sql`${baseFilter} AND COALESCE(a.final_fee, 0) > 0 AND a.payment_status <> 'paid'`;
    }
    if (search) {
      const searchPattern = `%${search}%`;
      baseFilter = sql`${baseFilter} AND (
        pd.full_name ILIKE ${searchPattern} OR
        pd.email ILIKE ${searchPattern} OR
        pu.phone_number ILIKE ${searchPattern} OR
        pu.un_id::text ILIKE ${searchPattern} OR
        dd.full_name ILIKE ${searchPattern} OR
        dd.email ILIKE ${searchPattern} OR
        du.phone_number ILIKE ${searchPattern} OR
        du.un_id::text ILIKE ${searchPattern} OR
        a.id::text ILIKE ${searchPattern}
      )`;
    }

    // Main records query
    const appointments = await sql`
      SELECT 
        a.id, a.appointment_date, a.appointment_time, a.appointment_type, a.status,
        a.disease_info, a.created_at, a.updated_at, a.patient_id, a.doctor_id,
        COALESCE(a.original_appointment_time, a.appointment_time)::text AS original_appointment_time,
        a.extended_until,
        a.final_fee, a.original_fee, a.discount_amount, a.payment_status,
        pu.un_id AS patient_un_id, pu.phone_number AS patient_phone, pu.profile_picture AS patient_picture,
        pd.full_name AS patient_name, pd.email AS patient_email, pd.gender AS patient_gender,
        du.un_id AS doctor_un_id, du.phone_number AS doctor_phone, du.profile_picture AS doctor_picture,
        dd.full_name AS doctor_name, dd.email AS doctor_email, dd.specialization,
        dd.clinic_name, dd.consultation_fee
      FROM appointments a
      LEFT JOIN users pu ON pu.id = a.patient_id
      LEFT JOIN patient_details pd ON pd.id = a.patient_id
      LEFT JOIN users du ON du.id = a.doctor_id
      LEFT JOIN doctor_details dd ON dd.id = a.doctor_id
      ${baseFilter}
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Filtered count
    const [countRow] = await sql`
      SELECT COUNT(*)::int AS count
      FROM appointments a
      LEFT JOIN users pu ON pu.id = a.patient_id
      LEFT JOIN patient_details pd ON pd.id = a.patient_id
      LEFT JOIN users du ON du.id = a.doctor_id
      LEFT JOIN doctor_details dd ON dd.id = a.doctor_id
      ${baseFilter}
    `;
    const totalMatching = countRow?.count || 0;

    // Summary counts by status
    const summaryRows = await sql`
      SELECT 
        status, 
        COUNT(*)::int AS count
      FROM appointments
      WHERE status != 'freezed'
      GROUP BY status
    `;

    const statusCounts = {
      booked: 0,
      approved: 0,
      cancelled: 0,
      completed: 0,
      rejected: 0,
    };
    let totalAll = 0;

    for (const r of summaryRows) {
      if (statusCounts[r.status] !== undefined) {
        statusCounts[r.status] = r.count;
      }
      totalAll += r.count;
    }

    const transformedAppointments = appointments.map((apt) => ({
      id: apt.id,
      appointment_date: apt.appointment_date,
      appointment_time: apt.appointment_time,
      original_appointment_time: apt.original_appointment_time,
      extended_until: apt.extended_until,
      appointment_type: apt.appointment_type,
      status: apt.status,
      final_fee: apt.final_fee,
      original_fee: apt.original_fee,
      discount_amount: apt.discount_amount,
      payment_status: apt.payment_status,
      disease_info: apt.disease_info,
      created_at: apt.created_at,
      patient: {
        id: apt.patient_id,
        un_id: apt.patient_un_id,
        phone_number: apt.patient_phone,
        profile_picture: apt.patient_picture,
        full_name: apt.patient_name,
        email: apt.patient_email,
        gender: apt.patient_gender,
      },
      doctor: {
        id: apt.doctor_id,
        un_id: apt.doctor_un_id,
        phone_number: apt.doctor_phone,
        profile_picture: apt.doctor_picture,
        full_name: apt.doctor_name,
        email: apt.doctor_email,
        specialization: apt.specialization,
        clinic_name: apt.clinic_name,
        consultation_fee: apt.consultation_fee,
      },
    }));

    return success(
      "Appointments fetched successfully.",
      {
        appointments: transformedAppointments,
        pagination: {
          total: totalMatching,
          perPage: limit,
          currentPage: page,
          totalPages: Math.ceil(totalMatching / limit),
        },
        summary: {
          total: totalAll,
          ...statusCounts,
        },
      },
      200,
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Appointments fetch error:", error);
    return failure("Failed to fetch appointments.", error.message, 500, {
      headers: corsHeaders,
    });
  }
}
