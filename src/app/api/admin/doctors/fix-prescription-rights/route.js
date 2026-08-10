import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";

/**
 * POST /api/admin/doctors/fix-prescription-rights
 * Directly enables prescription rights for a doctor who is approved
 * but still has registration_verified = false.
 */
export async function POST(req) {
  try {
    const { id } = await req.json();

    if (!id) {
      return failure("Doctor ID is required", "validation_error", 400);
    }

    // Check the doctor exists and is approved
    const { data: doctor, error: fetchError } = await supabase
      .from("doctor_details")
      .select("id, full_name, onboarding_status, registration_verified")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !doctor) {
      return failure("Doctor not found", "not_found", 404);
    }

    // Update registration_verified and kyc_status
    const { data, error } = await supabase
      .from("doctor_details")
      .update({
        registration_verified: true,
        kyc_status: "verified",
        onboarding_status: "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Also ensure the user account is active
    await supabase
      .from("users")
      .update({ status: 1, updated_at: new Date().toISOString() })
      .eq("id", id);

    console.log(`[Admin] Prescription rights fixed for doctor ${id} (${doctor.full_name})`);

    return success("Prescription rights enabled successfully.", data, 200);
  } catch (error) {
    console.error("Fix prescription rights error:", error);
    return failure("Failed to fix prescription rights: " + error.message, "fix_failed", 500);
  }
}
