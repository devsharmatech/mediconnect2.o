import sql from "@/lib/db";
import { success, failure } from "@/lib/response";

export const dynamic = 'force-dynamic';

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

    // Check the doctor exists
    const doctorRows = await sql`
      SELECT id, full_name, onboarding_status, registration_verified
      FROM doctor_details
      WHERE id = ${id}
      LIMIT 1
    `;

    if (!doctorRows || doctorRows.length === 0) {
      return failure("Doctor not found", "not_found", 404);
    }

    const doctor = doctorRows[0];

    // Update registration_verified, kyc_status, onboarding_status in doctor_details
    const updatedRows = await sql`
      UPDATE doctor_details
      SET 
        registration_verified = true,
        kyc_status = 'verified',
        onboarding_status = 'approved',
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    // Also ensure the user account is active
    await sql`
      UPDATE users
      SET status = 1, updated_at = NOW()
      WHERE id = ${id}
    `;

    console.log(`[Admin] Prescription rights fixed for doctor ${id} (${doctor.full_name})`);

    return success("Prescription rights enabled successfully.", updatedRows[0] || null, 200);
  } catch (error) {
    console.error("Fix prescription rights error:", error);
    return failure("Failed to fix prescription rights: " + error.message, "fix_failed", 500);
  }
}
