import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { chemist_id, store_timings } = await req.json();

    if (!chemist_id || !store_timings)
      return failure("chemist_id & store_timings required", null, 400, { headers: corsHeaders });

    const { data, error } = await supabase
      .from("chemist_details")
      .update({ store_timings, updated_at: new Date() })
      .eq("id", chemist_id)
      .select()
      .maybeSingle();

    if (error) throw error;

    return success("Store timings updated", data, 200, { headers: corsHeaders });
  } catch (err) {
    return failure("Error updating store timings", err.message, 500, { headers: corsHeaders });
  }
}
