import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function POST(req) {
  try {
    const { order_id, user_id } = await req.json();

    if (!order_id) {
      return failure("order_id is required", null, 400, { headers: corsHeaders });
    }

    // 1. Try fetching existing invoice from medicine_order_invoices
    const { data: existingInvoice } = await supabase
      .from("medicine_order_invoices")
      .select("*")
      .eq("order_id", order_id)
      .maybeSingle();

    if (existingInvoice) {
      return success("Invoice fetched", existingInvoice, 200, { headers: corsHeaders });
    }

    // 2. Fallback: Fetch medicine order details dynamically
    const { data: order, error: orderErr } = await supabase
      .from("medicine_orders")
      .select("*, chemist_details(store_name, pharmacy_name, full_name, phone_number, address), patient_details(full_name, email, phone_number, address)")
      .eq("id", order_id)
      .maybeSingle();

    if (orderErr || !order) {
      return failure("Medicine order not found", null, 404, { headers: corsHeaders });
    }

    const items = order.items || order.medicines || [];
    const total_amount = order.total_amount || order.amount || 0;
    const subtotal = order.subtotal || total_amount;

    const dynamicInvoice = {
      id: `inv-${order_id}`,
      order_id,
      invoice_number: `INV-MED-${String(order.id).slice(0, 8).toUpperCase()}`,
      subtotal,
      tax: order.tax || 0,
      total_amount,
      status: "PAID",
      created_at: order.created_at || new Date().toISOString(),
      items,
      chemist_details: order.chemist_details || { pharmacy_name: "MediConnect Pharmacy" },
      patient_details: order.patient_details || {},
      download_url: `/api/patients/orders/medicine/invoice/download?order_id=${order_id}`,
    };

    return success("Invoice generated successfully", dynamicInvoice, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Medicine Order Invoice Error:", err);
    return failure("Internal Error", err.message, 500, { headers: corsHeaders });
  }
}
