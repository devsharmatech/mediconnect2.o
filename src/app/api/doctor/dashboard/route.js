import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const doctor_id = searchParams.get("doctor_id");

    if (!doctor_id) {
      return failure("doctor_id is required", null, 400);
    }

    const todayIST = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );
    const yyyy = todayIST.getFullYear();
    const mm = String(todayIST.getMonth() + 1).padStart(2, "0");
    const dd = String(todayIST.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("id, status")
      .eq("doctor_id", doctor_id)
      .eq("appointment_date", todayStr);

    if (error) throw error;

    const { data: doctor } = await supabase
      .from("doctor_details")
      .select("videoConsultFee, inPersonVisitFee")
      .eq("id", doctor_id)
      .maybeSingle();

    const fee = doctor?.videoConsultFee || doctor?.inPersonVisitFee || 500;

    const stats = {
      total_appointments: appointments.length,
      completed: appointments.filter(a => a.status === 'completed').length,
      pending: appointments.filter(a => ['booked', 'approved', 'checked_in', 'waiting'].includes(a.status)).length,
      earnings: 0 
    };

    // Calculate real earnings based on doctor's fee
    stats.earnings = stats.completed * fee;

    return success("Dashboard stats fetched", { stats }, 200);
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return failure("Internal Server Error", error.message, 500);
  }
}
