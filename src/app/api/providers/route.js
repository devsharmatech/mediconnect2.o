import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { role } = body || {};

    if (!role) {
      return failure("Role is required (doctor, chemist, pharmacist, lab).", null, 400, { headers: corsHeaders });
    }

    let query;
    let table;
    let filters = {};

    // 🩺 DOCTOR
    if (role === "doctor") {
      const { specialization, min_rating, available_day, city } = body;
      table = "doctor_details";

      query = supabase
        .from(table)
        .select(`
          id,
          full_name,
          email,
          specialization,
          experience_years,
          clinic_name,
          clinic_address,
          consultation_fee,
          qualification,
          rating,
          total_reviews,
          available_days,
          available_time,
          users:users!inner(id, profile_picture, role)
        `)
        .eq("users.role", "doctor");

      if (specialization) {
        if (specialization.toLowerCase() === "urology") {
          query = query.ilike("specialization", "%urology%").not("specialization", "ilike", "%neurology%");
        } else {
          query = query.ilike("specialization", `%${specialization}%`);
        }
      }
      if (min_rating) query = query.gte("rating", Number(min_rating));
      if (available_day) query = query.contains("available_days", [available_day]);
      if (city) query = query.ilike("clinic_address", `%${city}%`);
    }

    // 💊 CHEMIST
    else if (role === "chemist") {
      const { min_rating, city } = body;
      table = "chemist_details";

      query = supabase
        .from(table)
        .select(`
          id,
          store_name,
          owner_name,
          email,
          address,
          license_number,
          rating,
          total_reviews,
          opening_hours,
          users:users!inner(id, profile_picture, role)
        `)
        .eq("users.role", "chemist");

      if (min_rating) query = query.gte("rating", Number(min_rating));
      if (city) query = query.ilike("address", `%${city}%`);
    }

    // ⚗️ PHARMACIST
    else if (role === "pharmacist") {
      const { min_rating, city } = body;
      table = "pharmacist_details";

      query = supabase
        .from(table)
        .select(`
          id,
          full_name,
          email,
          license_number,
          experience_years,
          pharmacy_name,
          address,
          rating,
          users:users!inner(id, profile_picture, role)
        `)
        .eq("users.role", "pharmacist");

      if (min_rating) query = query.gte("rating", Number(min_rating));
      if (city) query = query.ilike("address", `%${city}%`);
    }

    // 🧪 LAB
    else if (role === "lab") {
      const { min_rating, city } = body;
      table = "lab_details";

      query = supabase
        .from(table)
        .select(`
          id,
          lab_name,
          owner_name,
          email,
          license_number,
          address,
          rating,
          total_reviews,
          opening_hours,
          users:users!inner(id, profile_picture, role)
        `)
        .eq("users.role", "lab");

      if (min_rating) query = query.gte("rating", Number(min_rating));
      if (city) query = query.ilike("address", `%${city}%`);
    }

    else {
      return failure("Invalid role specified.", null, 400, { headers: corsHeaders });
    }

    // 📊 Execute main query
    query = query.order("rating", { ascending: false });
    const { data, error } = await query;

    if (error) throw error;

    // 🪄 If no data, fetch all providers for fallback
    if (!data || data.length === 0) {
      const { data: all, error: allError } = await supabase
        .from(table)
        .select(`
          *,
          users:users!inner(id, profile_picture, role)
        `)
        .eq("users.role", role)
        .order("rating", { ascending: false });

      if (allError) throw allError;

      return success(`No filters or matches — returning all ${role}s.`, all, 200, { headers: corsHeaders });
    }

    return success(`${role}s fetched successfully.`, data, 200, { headers: corsHeaders });

  } catch (error) {
    console.error("Fetch provider list error:", error);
    return failure("Failed to fetch providers.", error.message, 500, { headers: corsHeaders });
  }
}
