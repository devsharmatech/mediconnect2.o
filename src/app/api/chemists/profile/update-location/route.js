import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req) {
  try {
    const { chemist_id, latitude, longitude } = await req.json();

    if (!chemist_id || !UUID_REGEX.test(chemist_id) || latitude === undefined || longitude === undefined)
      return failure("valid chemist_id, latitude & longitude required", null, 400, { headers: corsHeaders });

    const [data] = await sql`
      UPDATE chemist_details
      SET latitude = ${latitude}, longitude = ${longitude}, updated_at = NOW()
      WHERE id = ${chemist_id}
      RETURNING *
    `;

    if (!data) return failure("Chemist not found", null, 404, { headers: corsHeaders });

    return success("Location updated", data, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Error updating chemist location:", err);
    return failure("Error updating location", err.message, 500, { headers: corsHeaders });
  }
}
