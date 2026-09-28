import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));

    const {
      specialization,
      min_rating,
      available_day,
      city
    } = body || {};

    // Base query for mobile API - querying AWS RDS via supabaseAdmin
    let query = supabase
      .from("doctor_details")
      .select(`
        id,
        full_name,
        email,
        specialization,
        experience_years,
        license_number,
        clinic_name,
        clinic_address,
        consultation_fee,
        video_consultation_fee,
        clinic_consultation_fee,
        home_visit_fee,
        qualification,
        indemnity_insurance,
        dmc_mci_certificate,
        aadhaar_pan_license,
        address_proof,
        passport_photo,
        bank_account_details,
        digital_consent,
        onboarding_status,
        signature_url,
        meta,
        clinic_photos,
        rating,
        total_reviews,
        available_days,
        available_time,
        latitude,
        longitude,
        users:users!inner(
          id,
          profile_picture,
          role,
          is_verified,
          phone_number
        )
      `)
      .eq("users.role", "doctor")
      .eq("users.is_verified", true)
      .eq("onboarding_status", "approved");

    if (specialization && specialization !== "All Specialties" && specialization !== "all") {
      const specLower = specialization.toLowerCase().trim();
      if (
        specLower === "uro/neuro" ||
        specLower === "uro / neuro" ||
        specLower === "urology/neurology" ||
        specLower === "urology / neurology" ||
        (specLower.includes("uro") && specLower.includes("neuro"))
      ) {
        query = query
          .or("specialization.ilike.%urology%,specialization.ilike.%neurology%,specialization.ilike.%urologist%,specialization.ilike.%neurologist%,specialization.ilike.%neurosurg%")
          .not("specialization", "ilike", "%psychiat%");
      } else if (specLower === "urology" || specLower.includes("urolog")) {
        query = query
          .or("specialization.ilike.%urology%,specialization.ilike.%urologist%")
          .not("specialization", "ilike", "%neurology%")
          .not("specialization", "ilike", "%psychiat%");
      } else if (specLower === "neurology" || (specLower.includes("neuro") && !specLower.includes("uro"))) {
        query = query
          .or("specialization.ilike.%neurology%,specialization.ilike.%neurologist%,specialization.ilike.%neurosurg%,specialization.ilike.%pediatric neurology%")
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
        query = query
          .or("specialization.ilike.%ENT%,specialization.ilike.%Otorhinolaryngol%,specialization.ilike.%Otolaryngol%")
          .not("specialization", "ilike", "%dent%")
          .not("specialization", "ilike", "%cardio%")
          .not("specialization", "ilike", "%heart%")
          .not("specialization", "ilike", "%derma%")
          .not("specialization", "ilike", "%psychiat%")
          .not("specialization", "ilike", "%gastro%");
      } else if (specLower.includes("psychiat") || specLower.includes("mental")) {
        query = query
          .or("specialization.ilike.%psychiat%,specialization.ilike.%mental%")
          .not("specialization", "ilike", "%urology%")
          .not("specialization", "ilike", "%neurology%");
      } else {
        query = query.ilike("specialization", `%${specialization}%`);
      }
    }
    if (min_rating) query = query.gte("rating", Number(min_rating));
    if (available_day) query = query.contains("available_days", [available_day]);

    query = query.order("rating", { ascending: false });

    const { data: doctors, error } = await query;
    if (error) throw error;

    let filteredDoctors = doctors || [];
    if (city && doctors) {
      filteredDoctors = doctors.filter(doc => {
        const matchesPrimary = doc.clinic_address?.toLowerCase().includes(city.toLowerCase());
        const matchesAdditional = doc.meta?.additional_clinics && Array.isArray(doc.meta.additional_clinics) && doc.meta.additional_clinics.some(c => 
          c.clinic_address?.toLowerCase().includes(city.toLowerCase())
        );
        return matchesPrimary || matchesAdditional;
      });
    }

    const hasAnyFilter = Boolean(specialization || city || min_rating || available_day);

    if (filteredDoctors.length === 0 && !hasAnyFilter) {
      const { data: allDoctors, error: allError } = await supabase
        .from("doctor_details")
        .select(`
          id,
          full_name,
          email,
          specialization,
          experience_years,
          license_number,
          clinic_name,
          clinic_address,
          consultation_fee,
          video_consultation_fee,
          clinic_consultation_fee,
          home_visit_fee,
          qualification,
          indemnity_insurance,
          dmc_mci_certificate,
          aadhaar_pan_license,
          address_proof,
          passport_photo,
          bank_account_details,
          digital_consent,
          onboarding_status,
          signature_url,
          meta,
          clinic_photos,
          rating,
          total_reviews,
          available_days,
          available_time,
          latitude,
          longitude,
          users:users!inner(
            id,
            profile_picture,
            role,
            is_verified,
            phone_number
          )
        `)
        .eq("users.role", "doctor")
        .eq("users.is_verified", true)
        .eq("onboarding_status", "approved")
        .order("rating", { ascending: false });

      if (allError) throw allError;

      return success(
        "No filters applied or no match found — returning all doctors.",
        allDoctors,
        200,
        { headers: corsHeaders }
      );
    }

    return success("Doctors fetched successfully.", filteredDoctors, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Fetch mobile doctors error:", error);
    return failure("Failed to fetch doctor list.", error.message, 500, { headers: corsHeaders });
  }
}
