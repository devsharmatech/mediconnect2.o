import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { ids } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return failure("IDs array is required", "validation_error", 400, {
        headers: corsHeaders,
      });
    }

    // Delete hospital details
    const { error: hospitalError } = await supabase
      .from("hospital_details")
      .delete()
      .in("id", ids);

    if (hospitalError) throw hospitalError;

    // Delete associated users
    const { error: userError } = await supabase
      .from("users")
      .delete()
      .in("id", ids);

    if (userError) throw userError;

    return success("Hospitals deleted successfully.", null, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Bulk Delete Hospitals Error:", error);
    return failure(
      "Failed to delete hospitals. " + error.message,
      "hospital_bulk_delete_failed",
      500,
      {
        headers: corsHeaders,
      }
    );
  }
}