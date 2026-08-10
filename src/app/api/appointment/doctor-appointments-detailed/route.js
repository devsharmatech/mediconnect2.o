import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { doctor_id, date_filter = "today", page = 1 } = await req.json();

    if (!doctor_id)
      return failure("doctor_id is required.", null, 400, { headers: corsHeaders });

    const { data: doctorUser, error: userErr } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", doctor_id)
      .single();

    if (userErr || !doctorUser || doctorUser.role !== "doctor")
      return failure("Invalid doctor_id or user is not a doctor.", null, 400, {
        headers: corsHeaders,
      });

    const perPage = 15;
    const offset = (page - 1) * perPage;

    const todayDate = new Date();
    const formatDate = (d) => d.toISOString().split("T")[0];
    const today = formatDate(todayDate);

    let query = supabase
      .from("appointments")
      .select(
        `
        *,
        patient:patient_id (
          id,
          phone_number,
          patient_details (
            full_name,
            email,
            gender,
            blood_group,
            address
          )
        )
      `,
        { count: "exact" }
      )
      .eq("doctor_id", doctor_id)
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true });

    if (date_filter === "today") {
      query = query.eq("appointment_date", today);
    } else if (date_filter === "tomorrow") {
      const tomorrow = new Date(todayDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      query = query.eq("appointment_date", formatDate(tomorrow));
    } else if (date_filter === "this_week") {
      const end = new Date(todayDate);
      end.setDate(end.getDate() + 6);
      query = query
        .gte("appointment_date", formatDate(todayDate))
        .lte("appointment_date", formatDate(end));
    } else if (date_filter === "next_week") {
      const start = new Date(todayDate);
      start.setDate(start.getDate() + 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      query = query
        .gte("appointment_date", formatDate(start))
        .lte("appointment_date", formatDate(end));
    } else if (date_filter !== "all") {
      query = query.eq("appointment_date", date_filter);
    }

    query = query.range(offset, offset + perPage - 1);

    const { data: appointments, error, count } = await query;
    if (error) throw error;

    if (!appointments.length)
      return success(
        "No appointments found.",
        { appointments: [], pagination: {} },
        200,
        { headers: corsHeaders }
      );

    const screeningIds = appointments.map((a) => a.screening_id).filter(Boolean);

    let screenings = [];

    if (screeningIds.length) {
      const { data: screeningsData, error: sErr } = await supabase
        .from("screening_sessions")
        .select("id, initial_symptoms, analysis")
        .in("id", screeningIds);

      if (sErr) throw sErr;
      screenings = screeningsData || [];
    }

    const merged = appointments.map((a) => {
      const screening = a.screening_id
        ? screenings.find((s) => s.id === a.screening_id) || null
        : null;
      const p = a.patient;

      const simplePatient = p
        ? {
            id: p.id,
            phone: p.phone_number || null,
            full_name: p.patient_details?.full_name || null,
            email: p.patient_details?.email || null,
            gender: p.patient_details?.gender || null,
            blood_group: p.patient_details?.blood_group || null,
            address: p.patient_details?.address || null,
          }
        : null;

      return {
        ...a,
        patient: simplePatient,
        screening,
      };
    });

    return success(
      "Doctor appointments (detailed) fetched successfully.",
      {
        appointments: merged,
        pagination: {
          total: count,
          totalItems: count,
          perPage,
          currentPage: page,
          totalPages: Math.ceil((count || 0) / perPage),
        },
      },
      200,
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Doctor appointments detailed error:", error);
    return failure("Failed to fetch doctor appointments.", error.message, 500, {
      headers: corsHeaders,
    });
  }
}
