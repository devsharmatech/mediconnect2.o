import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req) {
  try {
    const { chemist_id, ...fields } = await req.json();

    if (!chemist_id || !UUID_REGEX.test(chemist_id))
      return failure("valid chemist_id required", null, 400, { headers: corsHeaders });

    const updatePayload = { ...fields, updated_at: new Date() };
    const keys = Object.keys(updatePayload);

    if (keys.length === 1) { // only updated_at
      return failure("No fields provided to update", null, 400, { headers: corsHeaders });
    }

    const [data] = await sql`
      UPDATE chemist_details
      SET ${sql(updatePayload, ...keys)}
      WHERE id = ${chemist_id}
      RETURNING *
    `;

    if (!data) return failure("Chemist not found", null, 404, { headers: corsHeaders });

    return success("Profile updated", data, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Error updating chemist basic profile:", err);
    return failure("Error updating profile", err.message, 500, { headers: corsHeaders });
  }
}
