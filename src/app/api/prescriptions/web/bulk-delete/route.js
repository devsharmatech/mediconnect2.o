import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const ids = body?.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return failure("ids (array) is required", null, 400, {
        headers: corsHeaders,
      });
    }

    const { data, error } = await supabase
      .from("prescriptions")
      .delete()
      .in("id", ids);

    if (error) throw error;

    return success(
      "Prescriptions deleted successfully",
      { deleted: data.length },
      200,
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Bulk delete error:", error);
    return failure("Failed to delete prescriptions", error.message, 500, {
      headers: corsHeaders,
    });
  }
}
