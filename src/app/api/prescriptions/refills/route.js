import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const patient_id = searchParams.get("patient_id");

    if (!patient_id) {
      return failure("patient_id is required", null, 400);
    }

    const { data: prescriptions, error } = await supabase
      .from("prescriptions")
      .select("id, medicines, created_at")
      .eq("patient_id", patient_id);

    if (error) throw error;

    const refills = [];
    
    // Parse duration strings to get integers. Assuming format like "4 Days" or "1 Month"
    const parseDuration = (durStr) => {
      if (!durStr) return 0;
      const lower = durStr.toLowerCase();
      const numMatch = lower.match(/\d+/);
      const num = numMatch ? parseInt(numMatch[0]) : 0;
      if (lower.includes('month')) return num * 30;
      if (lower.includes('week')) return num * 7;
      return num;
    };

    prescriptions.forEach(p => {
      if (p.medicines && Array.isArray(p.medicines)) {
        p.medicines.forEach((med, idx) => {
          const durationDays = parseDuration(med.duration);
          const createdAt = new Date(p.created_at);
          const today = new Date();
          const diffTime = Math.abs(today - createdAt);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          const daysLeft = durationDays - diffDays;

          if (durationDays > 0 && daysLeft <= 14) { // Only suggest refills for running low meds
            refills.push({
              id: `${p.id}-${idx}`,
              medication_name: med.name,
              dosage: med.dosage,
              days_left: daysLeft > 0 ? daysLeft : 0,
              last_refill_days_ago: diffDays,
              status: daysLeft <= 3 ? "critical" : "pending"
            });
          }
        });
      }
    });

    return success("Refills fetched successfully", { refills }, 200);
  } catch (error) {
    console.error("Refills API Error:", error);
    return failure("Internal Server Error", error.message, 500);
  }
}
