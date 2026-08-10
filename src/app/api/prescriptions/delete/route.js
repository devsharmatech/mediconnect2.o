import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function DELETE(req) {
  try {
    const body = await req.json();
    const { prescription_id, doctor_id } = body;

    if (!prescription_id || !doctor_id) {
      return failure("prescription_id and doctor_id are required", null, 400, {
        headers: corsHeaders
      });
    }

    // Check if prescription exists and belongs to doctor
    const { data: existingPrescription } = await supabase
      .from("prescriptions")
      .select("id, doctor_id, appointment_id")
      .eq("id", prescription_id)
      .maybeSingle();

    if (!existingPrescription) {
      return failure("Prescription not found", null, 404, {
        headers: corsHeaders
      });
    }

    if (existingPrescription.doctor_id !== doctor_id) {
      return failure("You are not authorized to delete this prescription", null, 403, {
        headers: corsHeaders
      });
    }

    // Soft delete by updating status
    const { error } = await supabase
      .from("prescriptions")
      .update({
        status: "archived",
        updated_at: new Date().toISOString()
      })
      .eq("id", prescription_id);

    if (error) throw error;

    // Remove prescription_id from appointment if exists
    if (existingPrescription.appointment_id) {
      await supabase
        .from("appointments")
        .update({
          prescription_id: null,
          status: "confirmed",
          updated_at: new Date().toISOString()
        })
        .eq("id", existingPrescription.appointment_id);
    }

    return success(
      "Prescription archived successfully",
      { prescription_id },
      200,
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Delete prescription error:", error);
    return failure("Failed to delete prescription", error.message, 500, {
      headers: corsHeaders
    });
  }
}