import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { buildInvoiceHtml } from "@/lib/buildInvoiceHtml";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req) {
  try {
    const { order_id, chemist_id } = await req.json();

    if (!order_id || !chemist_id || !UUID_REGEX.test(order_id) || !UUID_REGEX.test(chemist_id)) {
      return failure("valid order_id and chemist_id required", null, 400, {
        headers: corsHeaders,
      });
    }

    /* =====================================================
       1️⃣ FETCH ORDER + RELATIONS
    ===================================================== */
    const [order] = await sql`
      SELECT 
        o.id, o.unid, o.status, o.patient_id, o.prescription_id, o.chemist_id,
        c.pharmacy_name, c.owner_name, c.mobile, c.address as chemist_address, c.gstin, c.registration_no,
        p.full_name as patient_name, p.address as patient_address, u.phone_number as patient_phone,
        pr.created_at as prescription_created_at, pr.medicines as prescription_medicines,
        pr.investigations as prescription_investigations, pr.special_message as prescription_special_message,
        d.full_name as doctor_name, d.specialization as doctor_specialization,
        d.qualification as doctor_qualification, d.clinic_name as doctor_clinic_name,
        d.signature_url as doctor_signature_url
      FROM medicine_orders o
      LEFT JOIN chemist_details c ON c.id = o.chemist_id
      LEFT JOIN patient_details p ON p.id = o.patient_id
      LEFT JOIN users u ON u.id = o.patient_id
      LEFT JOIN prescriptions pr ON pr.id = o.prescription_id
      LEFT JOIN doctor_details d ON d.id = pr.doctor_id
      WHERE o.id = ${order_id} AND o.chemist_id = ${chemist_id}
      LIMIT 1
    `;

    if (!order) {
      return failure("Order not found", null, 404, {
        headers: corsHeaders,
      });
    }

    const orderItems = await sql`
      SELECT medicine_name, quantity, price
      FROM medicine_order_items
      WHERE order_id = ${order_id}
    `;

    /* =====================================================
       2️⃣ CHECK EXISTING INVOICE
    ===================================================== */
    let [invoice] = await sql`
      SELECT * FROM medicine_order_invoices
      WHERE order_id = ${order_id} AND chemist_id = ${chemist_id}
      LIMIT 1
    `;

    /* =====================================================
       3️⃣ CREATE INVOICE IF NOT EXISTS
    ===================================================== */
    if (!invoice) {
      const items = (orderItems || []).map((i) => ({
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
      const invoiceNumber = `INV-${chemist_id.slice(0, 4)}-${dateStr}-${order.unid || '0'}`;

      let parsedMedicines = [];
      if (typeof order.prescription_medicines === "string") {
        try { parsedMedicines = JSON.parse(order.prescription_medicines); } catch {}
      } else if (Array.isArray(order.prescription_medicines)) {
        parsedMedicines = order.prescription_medicines;
      }

      let parsedInvestigations = [];
      if (typeof order.prescription_investigations === "string") {
        try { parsedInvestigations = JSON.parse(order.prescription_investigations); } catch {}
      } else if (Array.isArray(order.prescription_investigations)) {
        parsedInvestigations = order.prescription_investigations;
      }

      const invoiceData = {
        invoice: {
          number: invoiceNumber,
          date: today.toISOString().slice(0, 10),
          order_unid: order.unid,
          payment_mode: "UPI",
        },

        seller: {
          pharmacy_name: order.pharmacy_name,
          owner_name: order.owner_name,
          mobile: order.mobile,
          address: order.chemist_address,
          gstin: order.gstin,
          registration_no: order.registration_no,
        },

        buyer: {
          name: order.patient_name || "",
          phone: order.patient_phone,
          address: order.patient_address || "",
        },

        doctor: order.doctor_name ? {
          full_name: order.doctor_name,
          specialization: order.doctor_specialization,
          qualification: order.doctor_qualification,
          clinic_name: order.doctor_clinic_name,
          signature_url: order.doctor_signature_url,
        } : null,

        prescription: {
          id: order.prescription_id,
          unid: order.unid,
          created_at: order.prescription_created_at,
          medicines: parsedMedicines,
          investigations: parsedInvestigations,
          special_message: order.prescription_special_message,
        },

        items,

        amounts: {
          subtotal,
          tax: taxAmount,
          grand_total: grandTotal,
        },
      };

      const [created] = await sql`
        INSERT INTO medicine_order_invoices (
          order_id, chemist_id, patient_id, invoice_number, subtotal, tax_amount, total_amount, invoice_data, status
        )
        VALUES (
          ${order_id}, ${chemist_id}, ${order.patient_id}, ${invoiceNumber},
          ${subtotal}, ${taxAmount}, ${grandTotal}, ${sql.json(invoiceData)}, 'generated'
        )
        RETURNING *
      `;

      // Update the main order row total amount, and conditionally status
      const nextStatus = ["sent_to_chemist", "waiting_for_bill"].includes(order.status)
        ? "waiting_for_payment"
        : order.status;

      await sql`
        UPDATE medicine_orders
        SET total_amount = ${grandTotal}, status = ${nextStatus}, updated_at = NOW()
        WHERE id = ${order_id}
      `;

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

      const [updated] = await sql`
        UPDATE medicine_order_invoices
        SET download_url = ${pdfJson.url}, status = 'pdf_generated'
        WHERE id = ${invoice.id}
        RETURNING *
      `;

      invoice = updated;
    }

    /* =====================================================
       5️⃣ FINAL RESPONSE
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
