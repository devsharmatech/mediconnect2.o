import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

const safeUuid = (val) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ? val : null);

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { id, onboarding_status } = await req.json();
    const cleanId = safeUuid(id);

    if (!cleanId || !onboarding_status) {
      return failure("Valid id and onboarding_status are required.", "validation_error", 400, {
        headers: corsHeaders,
      });
    }

    const updated = await sql`
      UPDATE lab_details
      SET onboarding_status = ${onboarding_status},
          approved_at = ${onboarding_status === 'approved' ? sql`NOW()` : null},
          updated_at = NOW()
      WHERE id = ${cleanId}
      RETURNING *
    `;

    if (!updated.length) {
      return failure("Lab not found.", "not_found", 404, { headers: corsHeaders });
    }

    return success("Lab onboarding status updated.", updated[0], 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Lab status update error:", error);
    return failure("Failed to update status. " + error.message, "status_update_failed", 500, {
      headers: corsHeaders,
    });
  }
}
