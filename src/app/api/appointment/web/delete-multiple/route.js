import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { ids } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return failure("No appointment IDs provided.", null, 400, { headers: corsHeaders });
    }

    const result = await sql`
      DELETE FROM appointments
      WHERE id = ANY(${ids}::uuid[])
      RETURNING id
    `;

    return success(
      `${result.length} appointment(s) deleted successfully.`,
      { deletedCount: result.length },
      200,
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error deleting appointments:', error);
    return failure("Failed to delete appointments.", error.message, 500, { headers: corsHeaders });
  }
}