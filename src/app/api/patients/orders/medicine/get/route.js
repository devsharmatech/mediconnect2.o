import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const patient_id = searchParams.get("patient_id");
    const order_id = searchParams.get("order_id");
    const prescription_id = searchParams.get("prescription_id");

    if (!patient_id && !order_id && !prescription_id) {
      return failure("patient_id, order_id, or prescription_id is required", null, 400, { headers: corsHeaders });
    }

    let filterCondition = sql``;
    if (order_id) {
      filterCondition = sql`WHERE mo.id = ${order_id}`;
    } else if (prescription_id && patient_id) {
      filterCondition = sql`WHERE mo.prescription_id = ${prescription_id} AND mo.patient_id = ${patient_id}`;
    } else if (prescription_id) {
      filterCondition = sql`WHERE mo.prescription_id = ${prescription_id}`;
    } else {
      filterCondition = sql`WHERE mo.patient_id = ${patient_id}`;
    }

    const orderRows = await sql`
      SELECT 
        mo.*,
        cd.pharmacy_name,
        cd.pharmacy_name as store_name,
        cd.owner_name,
        cd.address as chemist_address,
        cd.mobile as chemist_mobile,
        cd.upi_id as chemist_upi_id,
        cd.payment_qr_url as chemist_payment_qr_url,
        cd.payment_qr_payload as chemist_payment_qr_payload,
        cd.rating as chemist_rating,
        cd.total_reviews as chemist_total_reviews
      FROM medicine_orders mo
      LEFT JOIN chemist_details cd ON cd.id = mo.chemist_id
      ${filterCondition}
      ORDER BY mo.created_at DESC
    `;

    // Fetch items for all retrieved orders
    const orderIds = orderRows.map((o) => o.id);
    let itemsByOrder = {};
    if (orderIds.length > 0) {
      const itemRows = await sql`
        SELECT * FROM medicine_order_items 
        WHERE order_id = ANY(${orderIds})
        ORDER BY created_at ASC
      `;
      itemRows.forEach((item) => {
        if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
        itemsByOrder[item.order_id].push(item);
      });
    }

    const result = orderRows.map((o) => {
      const pharmacyName = o.pharmacy_name || o.store_name || "Partner Pharmacy";
      const chemistDetails = o.chemist_id ? {
        id: o.chemist_id,
        pharmacy_name: pharmacyName,
        owner_name: o.owner_name || "Licensed Pharmacist",
        address: o.chemist_address || "Registered Pharmacy Partner",
        mobile: o.chemist_mobile || "",
        upi_id: o.chemist_upi_id || o.payment_qr_payload || "pay@mediconnect.fit",
        payment_qr_url: o.chemist_payment_qr_url || o.payment_qr_url || "",
        rating: o.chemist_rating ? Number(o.chemist_rating) : 4.8,
        total_reviews: o.chemist_total_reviews ? Number(o.chemist_total_reviews) : 24,
      } : null;

      return {
        ...o,
        chemist_details: chemistDetails,
        medicine_order_items: itemsByOrder[o.id] || [],
      };
    });

    return success("Medicine orders fetched successfully", result, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Error fetching patient medicine orders:", err);
    return failure("Failed to fetch medicine orders", err.message, 500, { headers: corsHeaders });
  }
}
