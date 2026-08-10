import { supabase } from "@/lib/supabaseAdmin";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { lab_id } = await req.json();

    if (!lab_id)
      return new Response(
        JSON.stringify({ status: false, message: "lab_id required" }),
        { headers: corsHeaders }
      );

    // GET LAB DETAILS + USER DETAILS
    const { data, error } = await supabase
      .from("lab_details")
      .select(`
        *,
        user:users (
          id,
          phone_number,
          profile_picture,
          role,
          status
        )
      `)
      .eq("id", lab_id)
      .maybeSingle();

    if (error) throw error;

    return new Response(
      JSON.stringify({
        status: true,
        message: "Lab profile fetched",
        data,
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
