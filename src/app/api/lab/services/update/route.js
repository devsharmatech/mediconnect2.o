import sql from "@/lib/db";
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
      return new Response(
        JSON.stringify({ status: false, message: "Valid lab_id required" }),
        { headers: corsHeaders, status: 400 }
      );
    }

    if (!Array.isArray(services)) {
      return new Response(
        JSON.stringify({ status: false, message: "services must be array" }),
        { headers: corsHeaders, status: 400 }
      );
    }

    await sql`
      UPDATE lab_details
      SET services = ${sql.json(services)},
          updated_at = NOW()
      WHERE id = ${cleanLabId}
    `;

    return new Response(
      JSON.stringify({
        status: true,
        message: "Services updated successfully",
        services,
      }),
      { headers: corsHeaders, status: 200 }
    );
  } catch (err) {
    console.error("POST /api/lab/services/update error:", err);
    return new Response(
      JSON.stringify({ status: false, message: err.message }),
      { headers: corsHeaders, status: 500 }
    );
  }
}
