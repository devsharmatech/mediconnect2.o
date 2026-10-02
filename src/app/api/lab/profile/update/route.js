import sql from "@/lib/db";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req) {
  try {
    const body = await req.json();
    const { lab_id, services } = body;

    if (!lab_id || !UUID_REGEX.test(lab_id))
      return new Response(
        JSON.stringify({ status: false, message: "valid lab_id required" }),
        { headers: corsHeaders }
      );

    if (!Array.isArray(services)) {
      return new Response(
        JSON.stringify({ status: false, message: "Services must be an array" }),
        { headers: corsHeaders }
      );
    }

    await sql`
      UPDATE lab_details
      SET services = ${sql.json(services)}, updated_at = NOW()
      WHERE id = ${lab_id}
    `;

    return new Response(
      JSON.stringify({ 
        status: true, 
        message: "Services updated successfully" 
      }),
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("Services update error:", err);
    return new Response(
      JSON.stringify({ status: false, message: err.message }),
      { headers: corsHeaders }
    );
  }
}