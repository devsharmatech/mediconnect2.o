import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { min_rating, city, license_number, pharmacy_name } = body || {};

    let query = supabase
      .from("pharmacist_details")
      .select(
        `id,
        full_name,
        email,
        license_number,
        experience_years,
        pharmacy_name,
        store_name,
        address,
        latitude,
        longitude,
        rating,
        users:users!inner(
          id,
          profile_picture,
          role
        )
      `
      )
      .eq("users.role", "pharmacist");

    if (min_rating) query = query.gte("rating", Number(min_rating));
    if (city) query = query.ilike("address", `%${city}%`);
    if (license_number)
      query = query.ilike("license_number", `%${license_number}%`);
    if (pharmacy_name)
      query = query.ilike("pharmacy_name", `%${pharmacy_name}%`);

    query = query.order("rating", { ascending: false });

    const { data: pharmacists, error } = await query;
    if (error) throw error;

    if (!pharmacists || pharmacists.length === 0) {
      const { data: allPharmacists, error: allError } = await supabase
        .from("pharmacist_details")
        .select(
          `id,
        full_name,
        email,
        license_number,
        experience_years,
        pharmacy_name,
        store_name,
        address,
        latitude,
        longitude,
        rating,
        users:users!inner(
          id,
          profile_picture,
          role
         )`
        )
        .eq("users.role", "pharmacist")
        .order("rating", { ascending: false });

      if (allError) throw allError;
      return success(
        "No filters or no match — returning all pharmacists.",
        allPharmacists,
        200,
        { headers: corsHeaders }
      );
    }

    return success("Pharmacists fetched successfully.", pharmacists, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Fetch pharmacists error:", error);
    return failure("Failed to fetch pharmacist list.", error.message, 500, {
      headers: corsHeaders,
    });
  }
}
