import { supabase } from "@/lib/supabaseAdmin";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { lab_id, services } = body;

    if (!lab_id)
      return new Response(
        JSON.stringify({ status: false, message: "lab_id required" }),
        { headers: corsHeaders }
      );

    // Validate services is an array
    if (!Array.isArray(services)) {
      return new Response(
        JSON.stringify({ status: false, message: "Services must be an array" }),
        { headers: corsHeaders }
      );
    }

    // Update only services field
    const { error } = await supabase
      .from("lab_details")
      .update({ 
        services,
        updated_at: new Date().toISOString()
      })
      .eq("id", lab_id);

    if (error) throw error;

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