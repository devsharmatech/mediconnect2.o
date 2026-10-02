import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req) {
  try {
    const { lab_id, updates } = await req.json();

    if (!lab_id || !UUID_REGEX.test(lab_id)) {
      return failure("valid lab_id required", null, 400, { headers: corsHeaders });
    }

    if (!updates || typeof updates !== 'object') {
      return failure("updates object required", null, 400, { headers: corsHeaders });
    }

    const payload = { ...updates, updated_at: new Date() };
    const keys = Object.keys(payload);

    const [data] = await sql`
      UPDATE lab_details
      SET ${sql(payload, ...keys)}
      WHERE id = ${lab_id}
      RETURNING *
    `;

    if (!data) return failure("Lab not found", null, 404, { headers: corsHeaders });

    return success("Profile updated successfully", data, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Lab profile update error:", err);
    return failure("Failed to update profile", err.message, 500, { headers: corsHeaders });
  }
}