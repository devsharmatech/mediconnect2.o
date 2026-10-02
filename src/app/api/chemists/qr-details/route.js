import sql from "@/lib/db";
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

    const [chemist] = await sql`
      SELECT id, payment_qr_url, payment_qr_payload, payment_qr_label
      FROM chemist_details
      WHERE id = ${chemist_id}
      LIMIT 1
    `;

    if (!chemist) {
      return failure("Chemist not found", null, 404, {
        headers: corsHeaders,
      });
    }

    if (!chemist.payment_qr_payload) {
      return success(
        "No saved QR found",
        { has_saved_qr: false },
        200,
        { headers: corsHeaders }
      );
    }

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
