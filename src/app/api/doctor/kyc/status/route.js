import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const doctor_id = searchParams.get("doctor_id");

    if (!doctor_id) {
      return failure("doctor_id is required.", null, 400, { headers: corsHeaders });
    }

    const { data, error } = await supabase
      .from("doctor_details")
      .select("kyc_status")
      .eq("id", doctor_id)
      .maybeSingle();

    if (error && error.code !== '42P01') throw error;

    // If table doesn't exist yet, we'll pretend it's pending
    const status = data ? data.kyc_status : 'pending';

    return success("KYC status fetched successfully", { status }, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("KYC Status Error:", error);
    return failure("Failed to fetch status.", error.message, 500, { headers: corsHeaders });
  }
}
