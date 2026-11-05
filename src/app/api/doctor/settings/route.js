import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { doctor_id, ...settings } = body;

    if (!doctor_id) {
      return failure("doctor_id is required", null, 400, { headers: corsHeaders });
    }

    const keys = Object.keys(settings);
    if (keys.length === 0) {
      return success("No settings provided to update", null, 200, { headers: corsHeaders });
    }

    const [data] = await sql`
      UPDATE doctor_details
      SET ${sql(settings, ...keys)}, updated_at = NOW()
      WHERE id = ${doctor_id}
      RETURNING *
    `;

    return success("Doctor settings updated successfully", data, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Doctor Settings API Error:", error);
    return failure("Internal Server Error", error.message, 500, { headers: corsHeaders });
  }
}
