import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { broadcastEmitter } from "@/lib/broadcastEmitter";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { broadcast_id, chemist_id, quote_id } = await req.json();

    if (!broadcast_id || !chemist_id) {
      return failure("broadcast_id and chemist_id are required", null, 400, { headers: corsHeaders });
    }

    // 1. Fetch quote
    const quoteRows = await sql`
      SELECT * FROM medicine_order_quotes 
      WHERE broadcast_id = ${broadcast_id} 
        AND chemist_id = ${chemist_id}
        ${quote_id ? sql`AND id = ${quote_id}` : sql``}
      LIMIT 1
    `;
    const quote = quoteRows[0];

    if (!quote) {
      return failure("Quote not found", null, 404, { headers: corsHeaders });
    }

    if (quote.status === "selected") {
      return failure("Cannot withdraw quote: This offer has already been accepted by the patient", null, 409, { headers: corsHeaders });
    }

    // 2. Mark quote as withdrawn
    await sql`
      UPDATE medicine_order_quotes 
      SET status = 'withdrawn'
      WHERE id = ${quote.id}
    `;

    try {
      broadcastEmitter.emit(`status:${broadcast_id}`, {
        type: "QUOTE_WITHDRAWN",
        quote_id: quote.id,
        chemist_id,
      });
    } catch (e) {
      console.warn("Emitter warning:", e.message);
    }

    return success("Quote withdrawn successfully", { quote_id: quote.id }, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Error withdrawing quote:", err);
    return failure("Failed to withdraw quote", err.message, 500, { headers: corsHeaders });
  }
}
