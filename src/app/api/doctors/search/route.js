import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const specialty = searchParams.get("specialty") || "";

    let dbQuery = supabase
      .from("doctor_details")
      .select("*, users!inner(profile_picture)");

    if (query) {
      dbQuery = dbQuery.ilike("full_name", `%${query}%`);
    }
    
    if (specialty) {
      if (specialty.toLowerCase() === "urology") {
        dbQuery = dbQuery.ilike("specialization", "%urology%").not("specialization", "ilike", "%neurology%");
      } else {
        dbQuery = dbQuery.ilike("specialization", `%${specialty}%`);
      }
    }

    const { data: doctors, error } = await dbQuery.limit(20);

    if (error) throw error;

    return success("Doctors fetched successfully", { doctors }, 200);
  } catch (error) {
    console.error("Doctor Search Error:", error);
    return failure("Internal Server Error", error.message, 500);
  }
}
