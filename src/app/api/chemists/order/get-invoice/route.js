import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { buildInvoiceHtml } from "@/lib/buildInvoiceHtml";



export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { order_id, chemist_id } = await req.json();

    if (!order_id || !chemist_id) {
      return failure("order_id and chemist_id required", null, 400, {
        headers: corsHeaders,
      });
    }

    /* ------------------------------------------------
       1️⃣ FETCH INVOICE
    ------------------------------------------------ */
    const { data: invoice, error } = await supabase
      .from("medicine_order_invoices")
      .select(`
        id,
        order_id,
        chemist_id,
        patient_id,
        invoice_number,
        invoice_date,
        subtotal,
        tax_amount,
        total_amount,
        invoice_data,
        download_url,
        status,
        created_at
      `)
      .eq("order_id", order_id)
      .eq("chemist_id", chemist_id)
      .single();

    if (error || !invoice) {
      return failure("Invoice not found", error, 404, {
        headers: corsHeaders,
      });
    }

    /* ------------------------------------------------
       2️⃣ IF PDF ALREADY EXISTS → RETURN SAME DATA
    ------------------------------------------------ */
    if (invoice.download_url) {
      return success("Invoice fetched successfully", invoice, 200, {
        headers: corsHeaders,
      });
    }

    /* ------------------------------------------------
       3️⃣ BUILD INVOICE HTML
    ------------------------------------------------ */
    const html = buildInvoiceHtml(invoice.invoice_data);

    /* ------------------------------------------------
       4️⃣ GENERATE PDF (THIRD-PARTY API)
    ------------------------------------------------ */
    const pdfRes = await fetch(
      "https://argosmob.uk/dhillon/public/api/v1/pdf/generate-pdf",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      }
    );

    if (!pdfRes.ok) {
      const errText = await pdfRes.text();
      throw new Error(`PDF service error: ${errText}`);
    }

    const pdfJson = await pdfRes.json();

    if (!pdfJson?.url) {
      throw new Error("PDF URL not returned by service");
    }

    /* ------------------------------------------------
       5️⃣ UPDATE download_url IN DB
    ------------------------------------------------ */
    const { data: updatedInvoice, error: updateErr } = await supabase
      .from("medicine_order_invoices")
      .update({
        download_url: pdfJson.url,
        status: "pdf_generated",
      })
      .eq("id", invoice.id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    /* ------------------------------------------------
       6️⃣ RETURN SAME RESPONSE AS GENERATE INVOICE API
    ------------------------------------------------ */
    return success(
      "Invoice PDF generated successfully",
      updatedInvoice,
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
