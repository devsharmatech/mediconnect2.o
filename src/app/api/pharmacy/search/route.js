import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    
    let dbQuery = supabase
      .from("chemist_details")
      .select("*")
      .eq("onboarding_status", "approved")
      .order("rating", { ascending: false });

    if (query) {
      dbQuery = dbQuery.ilike("pharmacy_name", `%${query}%`);
    }

    const { data: pharmacies, error } = await dbQuery.limit(20);

    if (error) throw error;

    return success("Pharmacies fetched successfully", { pharmacies }, 200);
  } catch (error) {
    console.error("Pharmacy Search Error:", error);
    return failure("Internal Server Error", error.message, 500);
  }
}
