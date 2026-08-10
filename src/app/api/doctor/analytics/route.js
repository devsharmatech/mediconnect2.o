import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const doctor_id = searchParams.get("doctor_id");

    if (!doctor_id) {
      return failure("doctor_id is required", null, 400);
    }

    // Fetch appointments
    const { data: appointments, error: aptError } = await supabase
      .from("appointments")
      .select("id, status, appointment_date")
      .eq("doctor_id", doctor_id);

    if (aptError) throw aptError;

    const totalPatients = appointments.length;
    const completed = appointments.filter(a => a.status === 'completed').length;
    
    // For demo purposes, fake trends
    const analytics = {
      totalPatients: totalPatients || 0,
      patientTrend: "+12%",
      consultations: completed || 0,
      consultationTrend: "+8%",
      revenue: completed * 500 || 0,
      revenueTrend: "+15%",
      rating: 4.8,
      ratingTrend: "+0.2"
    };

    return success("Analytics fetched successfully", analytics, 200);
  } catch (error) {
    console.error("Analytics GET Error:", error);
    return failure("Internal Error", error.message, 500);
  }
}
