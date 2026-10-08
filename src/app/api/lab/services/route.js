import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

const safeUuid = (val) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ? val : null);

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { lab_id, services } = await req.json();

    const cleanLabId = safeUuid(lab_id);
    if (!cleanLabId) {
      return failure("Valid lab_id required", null, 400, { headers: corsHeaders });
    }

    if (!services || !Array.isArray(services)) {
      return failure("services array required", null, 400, { headers: corsHeaders });
    }

    // Validate services structure
    const validServices = services.filter(service => 
      service.service_name && 
      typeof service.service_name === 'string' &&
      service.price && 
      typeof service.price === 'number'
    );

    if (validServices.length === 0) {
      return failure("Valid services required", null, 400, { headers: corsHeaders });
    }

    // Update lab services in RDS
    const updated = await sql`
      UPDATE lab_details
      SET services = ${sql.json(validServices)},
          updated_at = NOW()
      WHERE id = ${cleanLabId}
      RETURNING *
    `;

    if (!updated.length) {
      return failure("Lab not found", null, 404, { headers: corsHeaders });
    }

    return success("Services updated successfully", updated[0], 200, { headers: corsHeaders });
  } catch (err) {
    console.error("POST /api/lab/services error:", err);
    return failure("Failed to update services", err.message, 500, { headers: corsHeaders });
  }
}

// GET - Get lab services
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const lab_id = searchParams.get('lab_id');

    const cleanLabId = safeUuid(lab_id);
    if (!cleanLabId) {
      return failure("Valid lab_id required", null, 400, { headers: corsHeaders });
    }

    // Get lab services from lab_details
    const rows = await sql`
      SELECT services
      FROM lab_details
      WHERE id = ${cleanLabId}
      LIMIT 1
    `;

    return success("Services fetched", rows[0]?.services || [], 200, { headers: corsHeaders });
  } catch (err) {
    console.error("GET /api/lab/services error:", err);
    return failure("Failed fetching services", err.message, 500, { headers: corsHeaders });
  }
}