import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const order_id = searchParams.get("order_id");

    if (!order_id) {
      return new Response("order_id parameter is required", { status: 400 });
    }

    const { data: order } = await supabase
      .from("medicine_orders")
      .select("*, chemist_details(*), patient_details(*)")
      .eq("id", order_id)
      .maybeSingle();

    if (!order) {
      return new Response("Medicine Order Not Found", { status: 404 });
    }

    const pharmacyName = order.chemist_details?.pharmacy_name || order.chemist_details?.store_name || "MediConnect Pharmacy";
    const patientName = order.patient_details?.full_name || "Patient";
    const patientAddress = typeof order.patient_details?.address === "string" ? order.patient_details.address : "India";
    const orderDate = new Date(order.created_at || Date.now()).toLocaleDateString("en-IN", { dateStyle: "medium" });
    const items = Array.isArray(order.items) ? order.items : Array.isArray(order.medicines) ? order.medicines : [];
    const totalAmount = order.total_amount || order.amount || 0;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Invoice - ${pharmacyName} - Order #${String(order_id).slice(0, 8)}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0067A1; padding-bottom: 20px; }
    .title { font-size: 24px; font-weight: bold; color: #0067A1; }
    .details { margin: 20px 0; display: flex; justify-content: space-between; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background: #f4f6f8; }
    .total { text-align: right; margin-top: 20px; font-size: 18px; font-weight: bold; color: #0067A1; }
    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #888; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px;">
    <button onclick="window.print()" style="padding: 10px 20px; background: #0067A1; color: white; border: none; border-radius: 6px; cursor: pointer;">Print / Save PDF</button>
  </div>
  <div class="header">
    <div>
      <div class="title">${pharmacyName}</div>
      <p style="margin: 5px 0;">Official Medicine Invoice</p>
    </div>
    <div style="text-align: right;">
      <h3>INVOICE</h3>
      <p>Date: ${orderDate}</p>
      <p>Order ID: #${String(order_id).slice(0, 8).toUpperCase()}</p>
    </div>
  </div>
  <div class="details">
    <div>
      <strong>Billed To:</strong>
      <p>${patientName}</p>
      <p>${patientAddress}</p>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Item Description</th>
        <th>Qty</th>
        <th>Price</th>
      </tr>
    </thead>
    <tbody>
      ${items.length > 0 ? items.map((item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${item.name || item.medicine_name || 'Medicine'}</td>
          <td>${item.quantity || 1}</td>
          <td>₹${item.price || item.unit_price || 0}</td>
        </tr>
      `).join('') : `
        <tr>
          <td>1</td>
          <td>Prescribed Medicine Order</td>
          <td>1</td>
          <td>₹${totalAmount}</td>
        </tr>
      `}
    </tbody>
  </table>
  <div class="total">
    Total Paid: ₹${totalAmount}
  </div>
  <div class="footer">
    <p>This is a computer-generated invoice from MediConnect. No physical signature required.</p>
  </div>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (err) {
    return new Response(`Invoice Error: ${err.message}`, { status: 500 });
  }
}
