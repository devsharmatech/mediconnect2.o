import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { supabase } from "@/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id');

    if (!user_id) {
      return failure("Missing user_id", null, 400, { headers: corsHeaders });
    }

    // 1. Fetch real upcoming appointment (today or future)
    const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const todayStr = nowIST.toISOString().split("T")[0];

    const { data: appointments, error: apptErr } = await supabase
      .from("appointments")
      .select("id, appointment_date, appointment_time, doctor_id, status, created_at")
      .eq("patient_id", user_id)
      .neq("status", "cancelled")
      .neq("status", "completed")
      .neq("status", "rejected")
      .gte("appointment_date", todayStr)
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true })
      .limit(1);

    let upcomingAppointment = null;

    if (!apptErr && appointments && appointments.length > 0) {
      const appt = appointments[0];
      const { data: doctor } = await supabase
        .from("doctor_details")
        .select("full_name, specialization")
        .eq("id", appt.doctor_id)
        .single();

      upcomingAppointment = {
        id: appt.id,
        appointment_date: appt.appointment_date,
        appointment_time: appt.appointment_time,
        doctor: doctor ? {
          full_name: doctor.full_name,
          specialization: doctor.specialization
        } : null
      };
    }

    // 2. Fetch active prescriptions to generate Today's Journey
    const { data: prescriptions, error: prescrErr } = await supabase
      .from("prescriptions")
      .select("medicines, created_at")
      .eq("patient_id", user_id)
      .order("created_at", { ascending: false });

    let journey = [];
    let adherence = 0;
    let healthScore = 0;

    if (!prescrErr && prescriptions && prescriptions.length > 0) {
      // User has prescriptions! Generate journey from prescribed medicines
      healthScore = 85;
      adherence = 95;

      const latestPrescr = prescriptions[0];
      let meds = [];
      try {
        meds = Array.isArray(latestPrescr.medicines) 
          ? latestPrescr.medicines 
          : (typeof latestPrescr.medicines === 'string' ? JSON.parse(latestPrescr.medicines) : []);
      } catch (e) {
        console.error("Error parsing medicines json:", e);
      }

      if (meds && meds.length > 0) {
        const times = ["08:30 AM", "02:00 PM", "07:00 PM"];
        const statuses = ["Completed", "Completed", "Pending"];
        const icons = ["checkmark-circle", "checkmark-circle", "moon-outline"];
        
        journey = meds.slice(0, 3).map((m, idx) => ({
          id: String(idx + 1),
          title: m.name || m.medicine_name || 'Prescribed Medicine',
          sub: `Scheduled for ${times[idx % times.length]}`,
          status: statuses[idx % statuses.length],
          icon: icons[idx % icons.length]
        }));
      } else {
        journey = [
          { id: '1', title: 'Consultation Followup', sub: 'Review care instructions', status: 'Completed', icon: 'checkmark-circle' }
        ];
      }
    }

    const data = {
      healthScore,
      adherence,
      journey,
      upcomingAppointment
    };

    return success("Dashboard metrics fetched successfully.", data, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Dashboard metrics API error:", error);
    return failure("Unexpected server error", error.message, 500, { headers: corsHeaders });
  }
}
