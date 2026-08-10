import { supabase } from "@/lib/supabaseAdmin";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { lab_id, services } = await req.json();

    if (!lab_id)
      return new Response(
        JSON.stringify({ status: false, message: "lab_id required" }),
        { headers: corsHeaders }
      );

    if (!Array.isArray(services))
      return new Response(
        JSON.stringify({ status: false, message: "services must be array" }),
        { headers: corsHeaders }
      );

    const { error } = await supabase
      .from("lab_details")
      .update({
        services: services,
        updated_at: new Date(),
      })
      .eq("id", lab_id);

    if (error) throw error;

    return new Response(
      JSON.stringify({
        status: true,
        message: "Services updated successfully",
        services,
      }),
      { headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ status: false, message: err.message }),
      { headers: corsHeaders }
    );
  }
}
