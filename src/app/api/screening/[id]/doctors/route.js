import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const screening_id = id;

    const { data: screening, error: screeningError } = await supabase
      .from("screening_sessions")
      .select("analysis")
      .eq("id", screening_id)
      .single();

    if (screeningError || !screening?.analysis) {
      return failure("No analysis found for this screening", null, 404, {
        headers: corsHeaders,
      });
    }

    const specialties = screening.analysis.recommended_specialties || [];
    if (!specialties.length) {
      return failure("No recommended specialties found", null, 404, {
        headers: corsHeaders,
      });
    }

    const ilikeConditions = specialties.map(
      (spec) => `specialization.ilike.%${spec}%`
    );

    const tagsCondition = specialties.map(
      (spec) => `speciality_tags.cs.{${spec}}`
    );

    const combinedOr = [...ilikeConditions, ...tagsCondition].join(",");
    const { data: doctors, error: doctorsError } = await supabase
      .from("doctor_details")
      .select(
        `
        id,
        full_name,
        email,
        specialization,
        experience_years,
        license_number,
        clinic_name,
        clinic_address,
        consultation_fee,
        qualification,
        indemnity_insurance,
        dmc_mci_certificate,
        aadhaar_pan_license,
        address_proof,
        passport_photo,
        bank_account_details,
        digital_consent,
        onboarding_status,
        rating,
        total_reviews,
        available_days,
        available_time,
        latitude,
        longitude,
        users:users!inner(
          id,
          profile_picture,
          role
        )
      `
      )
      .eq("users.role", "doctor")
      .eq("onboarding_status", "approved")
      .or(combinedOr)
      .order("rating", { ascending: false });

    if (doctorsError) throw doctorsError;

    if (!doctors || !doctors.length) {
      return success(
        "No doctors found matching these specialties",
        {
          screening_id,
          screening,
          recommended_specialties: specialties,
          doctors: [],
        },
        200,
        { headers: corsHeaders }
      );
    }

    const uniqueDoctors = Array.from(
      new Map(doctors.map((doc) => [doc.id, doc])).values()
    );

    return success(
      "Doctors fetched successfully",
      {
        screening_id,
        screening,
        recommended_specialties: specialties,
        total_doctors: uniqueDoctors.length,
        doctors: uniqueDoctors,
      },
      200,
      { headers: corsHeaders }
    );
  } catch (error) {
    return failure("Internal Server Error", error.message, 500, {
      headers: corsHeaders,
    });
  }
}
