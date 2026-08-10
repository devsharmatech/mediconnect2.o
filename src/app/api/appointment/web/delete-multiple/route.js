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
      return failure("No appointment IDs provided.", null, 400, { headers: corsHeaders });
    }

    // Delete appointments
    const { error } = await supabase
      .from('appointments')
      .delete()
      .in('id', ids);

    if (error) {
      throw error;
    }

    return success(
      `${ids.length} appointment(s) deleted successfully.`,
      { deletedCount: ids.length },
      200,
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error deleting appointments:', error);
    return failure("Failed to delete appointments.", error.message, 500, { headers: corsHeaders });
  }
}