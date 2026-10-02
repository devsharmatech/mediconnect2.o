import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req) {
  try {
    const { chemist_id } = await req.json();

    if (!chemist_id || !UUID_REGEX.test(chemist_id)) {
      return failure("valid chemist_id is required", null, 400, { headers: corsHeaders });
    }

    const [chemist] = await sql`
      SELECT * FROM chemist_details WHERE id = ${chemist_id} LIMIT 1
    `;

    if (!chemist) {
      return failure("Chemist not found", null, 404, { headers: corsHeaders });
    }

    const [user] = await sql`
      SELECT id, phone_number, profile_picture, role, status, created_at
      FROM users
      WHERE id = ${chemist_id}
      LIMIT 1
    `;

    const payload = {
      ...chemist,
      user: user || null,
    };

    return success("Chemist profile fetched", payload, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Error fetching chemist profile:", err);
    return failure("Error fetching chemist profile", err.message, 500, { headers: corsHeaders });
  }
}
