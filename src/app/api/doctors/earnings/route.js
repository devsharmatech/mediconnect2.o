import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const doctor_id = searchParams.get('doctor_id');

    if (!doctor_id) {
      return failure("doctor_id is required", null, 400);
    }

    // Example logic: fetch all completed appointments and sum up the consultation fees
    // In a real scenario, you might have a payments/transactions table
    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("id, amount, status, created_at")
      .eq("doctor_id", doctor_id)
      .eq("status", "completed");

    if (error) {
      console.error("[Earnings API] DB Error:", error);
      return failure("Failed to fetch earnings", error.message, 500);
    }

    let totalEarnings = 0;
    let currentMonthEarnings = 0;
    const now = new Date();

    if (appointments && appointments.length > 0) {
      appointments.forEach(apt => {
        const amt = Number(apt.amount) || 0;
        totalEarnings += amt;
        
        const aptDate = new Date(apt.created_at);
        if (aptDate.getMonth() === now.getMonth() && aptDate.getFullYear() === now.getFullYear()) {
          currentMonthEarnings += amt;
        }
      });
    }

    return success("Earnings fetched successfully", {
      total: totalEarnings,
      current_month: currentMonthEarnings,
      transactions: appointments || []
    }, 200);

  } catch (err) {
    console.error("[Earnings API] Exception:", err);
    return failure("Internal Server Error", err.message, 500);
  }
}
