import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req) {
  try {
    const { chemist_id, store_timings } = await req.json();

    if (!chemist_id || !UUID_REGEX.test(chemist_id) || !store_timings)
      return failure("valid chemist_id & store_timings required", null, 400, { headers: corsHeaders });

    const [data] = await sql`
      UPDATE chemist_details
      SET store_timings = ${sql.json(store_timings)}, updated_at = NOW()
      WHERE id = ${chemist_id}
      RETURNING *
    `;

    if (!data) return failure("Chemist not found", null, 404, { headers: corsHeaders });

    return success("Store timings updated", data, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Error updating chemist store timings:", err);
    return failure("Error updating store timings", err.message, 500, { headers: corsHeaders });
  }
}
