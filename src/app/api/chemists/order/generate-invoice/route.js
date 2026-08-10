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

    /* =====================================================
       1️⃣ FETCH ORDER + FULL RELATIONS
    ===================================================== */
    const { data: order, error: orderErr } = await supabase
      .from("medicine_orders")
      .select(`
        id,
        unid,
        status,
        patient_id,

        chemist:chemist_id(
          pharmacy_name,
          owner_name,
          mobile,
          address,
          gstin,
          registration_no
        ),

        patient:patient_id(
          phone_number,
          patient_details(full_name, address)
        ),

        prescription:prescription_id(
          id,
          unid,
          created_at,
          medicines,
          investigations,
          special_message,
          doctor:doctor_id(
            full_name,
            specialization,
            qualification,
            clinic_name,
            signature_url
          )
        ),

        medicine_order_items(
          medicine_name,
          quantity,
          price
        )
      `)
      .eq("id", order_id)
      .eq("chemist_id", chemist_id)
      .single();

    if (orderErr || !order) {
      return failure("Order not found", null, 404, {
        headers: corsHeaders,
      });
    }



    /* =====================================================
       2️⃣ CHECK EXISTING INVOICE
    ===================================================== */
    let { data: invoice } = await supabase
      .from("medicine_order_invoices")
      .select("*")
      .eq("order_id", order_id)
      .eq("chemist_id", chemist_id)
      .maybeSingle();

    /* =====================================================
       3️⃣ CREATE INVOICE IF NOT EXISTS
    ===================================================== */
    if (!invoice) {
      const items = order.medicine_order_items.map((i) => ({
        name: i.medicine_name,
        quantity: i.quantity,
        unit_price: Number(i.price || 0),
        total: Number(i.price || 0) * Number(i.quantity || 1),
      }));

      const subtotal = items.reduce((s, i) => s + i.total, 0);
      const taxAmount = 0;
      const grandTotal = subtotal;

      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
      const invoiceNumber = `INV-${chemist_id.slice(0, 4)}-${dateStr}-${order.unid}`;

      const invoiceData = {
        invoice: {
          number: invoiceNumber,
          date: today.toISOString().slice(0, 10),
          order_unid: order.unid,
          payment_mode: "UPI",
        },

        seller: {
          pharmacy_name: order.chemist.pharmacy_name,
          owner_name: order.chemist.owner_name,
          mobile: order.chemist.mobile,
          address: order.chemist.address,
          gstin: order.chemist.gstin,
          registration_no: order.chemist.registration_no,
        },

        buyer: {
          name: order.patient.patient_details?.full_name || "",
          phone: order.patient.phone_number,
          address: order.patient.patient_details?.address || "",
        },

        doctor: order.prescription?.doctor || null,

        prescription: {
          id: order.prescription?.id,
          unid: order.prescription?.unid,
          created_at: order.prescription?.created_at,
          medicines: order.prescription?.medicines || [],
          investigations: order.prescription?.investigations || [],
          special_message: order.prescription?.special_message,
        },

        items,

        amounts: {
          subtotal,
          tax: taxAmount,
          grand_total: grandTotal,
        },
      };

      const { data: created, error: invErr } = await supabase
        .from("medicine_order_invoices")
        .insert({
          order_id,
          chemist_id,
          patient_id: order.patient_id,
          invoice_number: invoiceNumber,
          subtotal,
          tax_amount: taxAmount,
          total_amount: grandTotal,
          invoice_data: invoiceData,
          status: "generated",
        })
        .select()
        .single();

      if (invErr) throw invErr;

      // Update the main order row total amount, and conditionally status
      const updatePayload = {
        total_amount: grandTotal,
        updated_at: new Date(),
      };

      if (["sent_to_chemist", "waiting_for_bill"].includes(order.status)) {
        updatePayload.status = "waiting_for_payment";
      }

      const { error: orderUpdateErr } = await supabase
        .from("medicine_orders")
        .update(updatePayload)
        .eq("id", order_id);

      if (orderUpdateErr) throw orderUpdateErr;

      invoice = created;
    }

    /* =====================================================
       4️⃣ GENERATE PDF IF NOT EXISTS
    ===================================================== */
    if (!invoice.download_url) {
      const html = buildInvoiceHtml(invoice.invoice_data);

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
        throw new Error("PDF URL missing from service");
      }

      const { data: updated } = await supabase
        .from("medicine_order_invoices")
        .update({
          download_url: pdfJson.url,
          status: "pdf_generated",
        })
        .eq("id", invoice.id)
        .select()
        .single();

      invoice = updated;
    }

    /* =====================================================
       5️⃣ FINAL RESPONSE (ALWAYS SAME)
    ===================================================== */
    return success("E-invoice ready", invoice, 200, {
      headers: corsHeaders,
    });

  } catch (err) {
    console.error("Invoice API error:", err);
    return failure("Failed to process invoice", err.message, 500, {
      headers: corsHeaders,
    });
  }
}
