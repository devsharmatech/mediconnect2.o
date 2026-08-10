import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const doctor_id = searchParams.get("doctor_id");

    if (!doctor_id) {
      return failure("doctor_id is required", null, 400);
    }

    const { data, error } = await supabase
      .from("doctor_details")
      .select("kyc_status")
      .eq("id", doctor_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        return success("KYC Status fetched", { kyc_status: "not_started" }, 200);
      }
      throw error;
    }

    return success("KYC Status fetched", { kyc_status: data.kyc_status || "not_started" }, 200);
  } catch (error) {
    console.error("KYC API Error:", error);
    return failure("Internal Server Error", error.message, 500);
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { doctor_id, document_type, document_url, id_number } = body;

    if (!doctor_id || !document_type || !document_url || !id_number) {
      return failure("Missing required fields", null, 400);
    }

    const { data, error } = await supabase
      .from("doctor_details")
      .update({
        kyc_status: "pending_verification",
        kyc_document_type: document_type,
        kyc_document_url: document_url,
        kyc_id_number: id_number
      })
      .eq("id", doctor_id)
      .select()
      .single();

    if (error) throw error;

    return success("KYC Documents submitted successfully", data, 200);
  } catch (error) {
    console.error("KYC Submission API Error:", error);
    return failure("Internal Server Error", error.message, 500);
  }
}
