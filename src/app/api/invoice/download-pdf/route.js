import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { buildInvoiceHtml } from "@/lib/buildInvoiceHtml";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}


export async function POST(req) {
  try {
    const { invoice_id, chemist_id } = await req.json();

    if (!invoice_id || !chemist_id) {
      return failure("invoice_id and chemist_id required", null, 400, {
        headers: corsHeaders,
      });
    }

    /* ---------------------------------------
       1️⃣ FETCH INVOICE (OWNERSHIP CHECK)
    --------------------------------------- */
    const { data: invoice, error } = await supabase
      .from("medicine_order_invoices")
      .select(
        `
        id,
        download_url,
        invoice_data,
        invoice_number,
        created_at
      `
      )
      .eq("id", invoice_id)
      .eq("chemist_id", chemist_id)
      .single();

    if (error || !invoice) {
      return failure("Invoice not found", null, 404, {
        headers: corsHeaders,
      });
    }

    /* ---------------------------------------
       2️⃣ RETURN EXISTING PDF (IDEMPOTENT)
    --------------------------------------- */
    if (invoice.download_url) {
      return success(
        "Invoice PDF already generated",
        { url: invoice.download_url },
        200,
        { headers: corsHeaders }
      );
    }

    /* ---------------------------------------
       3️⃣ BUILD HTML FROM INVOICE_DATA
    --------------------------------------- */
    const html = buildInvoiceHtml(invoice.invoice_data);

    /* ---------------------------------------
       4️⃣ GENERATE PDF (THIRD PARTY)
    --------------------------------------- */
    const pdfResponse = await fetch(
      "https://argosmob.uk/dhillon/public/api/v1/pdf/generate-pdf",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      }
    );

    if (!pdfResponse.ok) {
      const errText = await pdfResponse.text();
      throw new Error(`PDF service error: ${pdfResponse.status} — ${errText}`);
    }

    const pdfJson = await pdfResponse.json();

    if (!pdfJson?.url) {
      throw new Error("PDF service did not return URL");
    }

    /* ---------------------------------------
       5️⃣ SAVE DOWNLOAD URL
    --------------------------------------- */
    await supabase
      .from("medicine_order_invoices")
      .update({
        download_url: pdfJson.url,
      })
      .eq("id", invoice_id);

    /* ---------------------------------------
       6️⃣ RESPONSE
    --------------------------------------- */
    return success(
      "Invoice PDF generated successfully",
      { url: pdfJson.url },
      200,
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("Invoice PDF error:", err);
    return failure("Failed to generate invoice PDF", err.message, 500, {
      headers: corsHeaders,
    });
  }
}
