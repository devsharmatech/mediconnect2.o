import { supabase } from "@/lib/supabaseAdmin";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const lab_id = searchParams.get("lab_id");
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);

    if (!lab_id) {
      return new Response(
        JSON.stringify({ status: false, message: "lab_id missing" }),
        {
          headers: corsHeaders,
        }
      );
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Count total orders
    const { count } = await supabase
      .from("lab_test_orders")
      .select("*", { count: "exact", head: true })
      .eq("lab_id", lab_id);

    // Fetch orders
    const { data, error } = await supabase
      .from("lab_test_orders")
      .select(
        `
      id,
      unid,
      status,
      total_amount,
      created_at,
      patient:patient_id (
          phone_number,
          patient_details:patient_details (
              full_name,
              email,
              gender,
              address
          )
      )
  `
      )
      .eq("lab_id", lab_id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    return new Response(
      JSON.stringify({
        status: true,
        total: count,
        page,
        limit,
        orders: data,
      }),
      { headers: corsHeaders }
    );
  } catch (err) {
    console.log(err);
    return new Response(
      JSON.stringify({ status: false, message: err.message }),
      {
        headers: corsHeaders,
      }
    );
  }
}
