import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { consultationId } = body;

    if (!consultationId) {
      return failure("consultationId is required", null, 400, { headers: corsHeaders });
    }

    const { error } = await supabase
      .from("appointments")
      .update({ status: "completed" })
      .eq("id", consultationId);

    if (error) throw error;

    return success("Consultation ended successfully", { consultationId, status: "completed" }, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("End consultation error:", error);
    return failure("Internal Error", error.message, 500, { headers: corsHeaders });
  }
}
