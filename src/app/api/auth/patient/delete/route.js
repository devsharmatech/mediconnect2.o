import { anonymizePatientAccount } from "@/lib/patientDeletion";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function DELETE(req) {
  try {
    const { user_id } = await req.json();
    if (!user_id) {
      return failure("Missing required field: user_id.", null, 400, { headers: corsHeaders });
    }

    const result = await anonymizePatientAccount(user_id, "PATIENT_REQUEST_DELETE_ACCOUNT");
    return success("Patient account anonymized and PII erased successfully.", result, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Delete/anonymize patient account error:", error);
    return failure("Failed to process account deletion.", error.message, 500, { headers: corsHeaders });
  }
}

