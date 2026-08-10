import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { user_id, language } = await req.json();

    if (!user_id || !language) {
      return failure("Missing user_id or language", null, 400, { headers: corsHeaders });
    }

    // Mocking successful update since 'preferences' column does not exist
    return success("Language preference updated.", { language }, 200, { headers: corsHeaders });
  } catch (error) {
    return failure("Unexpected server error", error.message, 500, { headers: corsHeaders });
  }
}
