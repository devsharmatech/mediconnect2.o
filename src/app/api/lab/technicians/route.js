import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

const safeUuid = (val) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ? val : null);

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const labId = safeUuid(searchParams.get("lab_id"));

    if (labId) {
      const dbTechs = await sql`
        SELECT 
          id, 
          name, 
          phone, 
          COALESCE(vehicle_info, '') as vehicle,
          employee_id,
          is_active
        FROM lab_sample_collectors
        WHERE lab_id = ${labId} AND is_active = TRUE
        ORDER BY name ASC
      `;

      return success("Technicians fetched successfully", dbTechs, 200, { headers: corsHeaders });
    }

    // Default fallback
    return success("Technicians fetched successfully", [], 200, { headers: corsHeaders });
  } catch (err) {
    console.error("GET /api/lab/technicians error:", err);
    return failure("Failed to fetch technicians", err.message, 500, { headers: corsHeaders });
  }
}

