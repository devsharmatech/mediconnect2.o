import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const doctor_id = searchParams.get("doctor_id");

    if (!doctor_id) {
      return failure("doctor_id is required", null, 400, { headers: corsHeaders });
    }

    // Fetch doctor fee
    let fee = 500;
    try {
      const { data: doctor, error: docError } = await supabase
        .from("doctor_details")
        .select("video_consultation_fee, clinic_consultation_fee")
        .eq("id", doctor_id)
        .maybeSingle();

      if (!docError && doctor) {
        fee = doctor.video_consultation_fee || doctor.clinic_consultation_fee || 500;
      }
    } catch (e) {
      console.warn("Could not fetch doctor fee, using default:", e);
    }

    // Fetch appointments
    let appointments = [];
    try {
      const { data: appts, error: apptError } = await supabase
        .from("appointments")
        .select("id, appointment_type, created_at, status")
        .eq("doctor_id", doctor_id)
        .in("status", ["completed", "done", "scheduled"]);

      if (!apptError && appts) {
        appointments = appts;
      }
    } catch (e) {
      console.warn("Could not fetch appointments for earnings:", e);
    }

    let totalEarnings = 0;
    let thisMonthEarnings = 0;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const recentTransactions = [];

    appointments.forEach(appt => {
      totalEarnings += fee;
      const apptDate = new Date(appt.created_at);
      if (apptDate.getMonth() === currentMonth && apptDate.getFullYear() === currentYear) {
        thisMonthEarnings += fee;
      }
      recentTransactions.push({
        id: appt.id,
        type: appt.appointment_type || "Consultation",
        amount: fee,
        date: appt.created_at.split('T')[0]
      });
    });

    // Sort recent descending
    recentTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const earningsData = {
      totalEarnings,
      thisMonth: thisMonthEarnings,
      pendingPayout: 0,
      recentTransactions: recentTransactions.slice(0, 10)
    };

    return success("Earnings fetched successfully", earningsData, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Earnings API Error:", error);
    return failure("Internal Error", error.message, 500, { headers: corsHeaders });
  }
}
