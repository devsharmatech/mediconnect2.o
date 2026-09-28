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

    const qLower = query.toLowerCase().trim();

    if (query) {
      if (qLower === "ent" || qLower === "ent doctor" || qLower === "ent specialist") {
        dbQuery = dbQuery
          .or("specialization.ilike.%ENT%,specialization.ilike.%Otorhinolaryngol%,specialization.ilike.%Otolaryngol%")
          .not("specialization", "ilike", "%dent%")
          .not("specialization", "ilike", "%cardio%")
          .not("specialization", "ilike", "%heart%")
          .not("specialization", "ilike", "%psychiat%");
      } else if (
        qLower === "uro/neuro" ||
        qLower === "uro / neuro" ||
        (qLower.includes("uro") && qLower.includes("neuro"))
      ) {
        dbQuery = dbQuery
          .or("specialization.ilike.%urology%,specialization.ilike.%neurology%,specialization.ilike.%urologist%,specialization.ilike.%neurologist%")
          .not("specialization", "ilike", "%psychiat%");
      } else {
        dbQuery = dbQuery.or(`full_name.ilike.%${query}%,specialization.ilike.%${query}%`);
      }
    }
    
    if (specialty && specialty !== "All Specialties" && specialty !== "all") {
      const specLower = specialty.toLowerCase().trim();
      if (
        specLower === "uro/neuro" ||
        specLower === "uro / neuro" ||
        specLower === "urology/neurology" ||
        specLower === "urology / neurology" ||
        (specLower.includes("uro") && specLower.includes("neuro"))
      ) {
        dbQuery = dbQuery
          .or("specialization.ilike.%urology%,specialization.ilike.%neurology%,specialization.ilike.%urologist%,specialization.ilike.%neurologist%,specialization.ilike.%neurosurg%")
          .not("specialization", "ilike", "%psychiat%");
      } else if (specLower === "urology" || specLower.includes("urolog")) {
        dbQuery = dbQuery
          .or("specialization.ilike.%urology%,specialization.ilike.%urologist%")
          .not("specialization", "ilike", "%neurology%")
          .not("specialization", "ilike", "%psychiat%");
      } else if (specLower === "neurology" || (specLower.includes("neuro") && !specLower.includes("uro"))) {
        dbQuery = dbQuery
          .or("specialization.ilike.%neurology%,specialization.ilike.%neurologist%,specialization.ilike.%neurosurg%")
          .not("specialization", "ilike", "%urology%")
          .not("specialization", "ilike", "%psychiat%");
      } else if (
        specLower === "ent" ||
        specLower === "ent doctor" ||
        specLower.includes("otorhinolaryngol") ||
        specLower.includes("otolaryngol") ||
        specLower.includes("ear, nose") ||
        specLower.includes("ear nose")
      ) {
        dbQuery = dbQuery
          .or("specialization.ilike.%ENT%,specialization.ilike.%Otorhinolaryngology%,specialization.ilike.%Otolaryngology%")
          .not("specialization", "ilike", "%dent%")
          .not("specialization", "ilike", "%cardio%")
          .not("specialization", "ilike", "%heart%")
          .not("specialization", "ilike", "%psychiat%");
      } else if (specLower.includes("psychiat") || specLower.includes("mental")) {
        dbQuery = dbQuery
          .or("specialization.ilike.%psychiat%,specialization.ilike.%mental%")
          .not("specialization", "ilike", "%urology%")
          .not("specialization", "ilike", "%neurology%");
      } else if (specLower.includes("gastro")) {
        dbQuery = dbQuery.ilike("specialization", "%gastro%");
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
