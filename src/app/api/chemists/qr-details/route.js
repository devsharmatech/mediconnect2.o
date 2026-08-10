import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { chemist_id } = await req.json();

    if (!chemist_id) {
      return failure("chemist_id required", null, 400, {
        headers: corsHeaders,
      });
    }

    /* ---------------------------------------
       1️⃣ FETCH CHEMIST QR DETAILS
    --------------------------------------- */
    const { data: chemist, error } = await supabase
      .from("chemist_details")
      .select(`
        id,
        payment_qr_url,
        payment_qr_payload,
        payment_qr_label
      `)
      .eq("id", chemist_id)
      .single();

    if (error || !chemist) {
      return failure("Chemist not found", null, 404, {
        headers: corsHeaders,
      });
    }

    /* ---------------------------------------
       2️⃣ CHECK IF QR EXISTS
    --------------------------------------- */
    if (!chemist.payment_qr_payload) {
      return success(
        "No saved QR found",
        { has_saved_qr: false },
        200,
        { headers: corsHeaders }
      );
    }

    /* ---------------------------------------
       3️⃣ RETURN QR DETAILS
    --------------------------------------- */
    return success(
      "QR details fetched",
      {
        has_saved_qr: true,
        payment_qr_url: chemist.payment_qr_url,
        payment_qr_payload: chemist.payment_qr_payload,
        payment_qr_label: chemist.payment_qr_label || "UPI",
      },
      200,
      { headers: corsHeaders }
    );

  } catch (err) {
    console.error("QR details error:", err);
    return failure(
      "Failed to fetch QR details",
      err.message,
      500,
      { headers: corsHeaders }
    );
  }
}
