import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const prescription_id = searchParams.get("prescription_id");

    if (!prescription_id) {
      return failure("prescription_id is required", null, 400, { headers: corsHeaders });
    }

    const broadcastRows = await sql`
      SELECT 
        mob.*,
        GREATEST(0, EXTRACT(EPOCH FROM (mob.expires_at - NOW())))::int as seconds_remaining
      FROM medicine_order_broadcasts mob
      WHERE mob.prescription_id = ${prescription_id}
      ORDER BY mob.created_at DESC
      LIMIT 1
    `;

    const orderRows = await sql`
      SELECT 
        mo.id, 
        mo.unid, 
        mo.status, 
        mo.total_amount, 
        mo.payment_method, 
        mo.payu_status,
        mo.payment_qr_url,
        mo.payment_qr_payload,
        mo.utr_number,
        mo.payment_declaration_by_patient,
        cd.pharmacy_name,
        cd.upi_id,
        cd.payment_qr_url AS chemist_payment_qr_url,
        cd.payment_qr_payload AS chemist_payment_qr_payload,
        cd.address AS chemist_address,
        cd.mobile AS chemist_mobile
      FROM medicine_orders mo
      LEFT JOIN chemist_details cd ON cd.id = mo.chemist_id
      WHERE mo.prescription_id = ${prescription_id}
      ORDER BY mo.created_at DESC
      LIMIT 1
    `;
    let existingOrder = orderRows[0] || null;
    if (existingOrder) {
      const chemistUpi = existingOrder.payment_qr_payload || existingOrder.upi_id || "mediconnect@upi";
      const pharmacyName = existingOrder.pharmacy_name || "Partner Pharmacy";
      const finalAmount = parseFloat(existingOrder.total_amount || 0);
      const upiLink = `upi://pay?pa=${encodeURIComponent(chemistUpi)}&pn=${encodeURIComponent(pharmacyName)}&am=${finalAmount}&cu=INR&tn=Order-${existingOrder.unid || existingOrder.id.slice(0, 8)}`;
      const dynamicQrUrl = existingOrder.payment_qr_url || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(upiLink)}`;
      existingOrder = {
        ...existingOrder,
        chemist_upi: chemistUpi,
        dynamic_qr_url: dynamicQrUrl,
        upi_link: upiLink,
      };
    }

    if (!broadcast) {
      return success("No broadcast found for this prescription", { broadcast: null, quotes: [], existing_order: existingOrder }, 200, {
        headers: corsHeaders,
      });
    }

    const quoteRows = await sql`
      SELECT 
        q.id,
        q.broadcast_id,
        q.chemist_id,
        q.estimated_cost,
        q.medicine_subtotal,
        q.delivery_charge,
        q.discount,
        q.final_amount,
        q.delivery_time_minutes,
        q.status,
        q.created_at,
        q.items_breakdown,
        q.bid_notes,
        cd.pharmacy_name,
        cd.pharmacy_name as store_name,
        cd.owner_name,
        cd.address,
        cd.mobile,
        cd.upi_id,
        cd.payment_qr_url,
        cd.rating,
        cd.total_reviews
      FROM medicine_order_quotes q
      LEFT JOIN chemist_details cd ON cd.id = q.chemist_id
      WHERE q.broadcast_id = ${broadcast.id}
        AND q.status != 'withdrawn'
      ORDER BY q.final_amount ASC, q.created_at DESC
    `;

    const safeNum = (val, fb = 0) => {
      const n = Number(val);
      return isNaN(n) ? fb : n;
    };

    const formattedQuotes = quoteRows.map((q) => {
      const pharmacyName = q.pharmacy_name || q.store_name || "Partner Pharmacy";
      const pharmacyAddress = q.address || "Local Partner Pharmacy";
      const ratingVal = (q.rating && Number(q.total_reviews || 0) > 0) ? Number(q.rating) : 4.5;
      const totalReviews = Number(q.total_reviews || 12);
      const finAmt = safeNum(q.final_amount, safeNum(q.estimated_cost, 0));

      return {
        id: q.id,
        broadcast_id: q.broadcast_id,
        chemist_id: q.chemist_id,
        pharmacy_name: pharmacyName,
        owner_name: q.owner_name || "Licensed Pharmacist",
        address: pharmacyAddress,
        mobile: q.mobile || "",
        upi_id: q.upi_id || "",
        payment_qr_url: q.payment_qr_url || "",
        estimated_cost: finAmt,
        medicine_subtotal: safeNum(q.medicine_subtotal, finAmt),
        delivery_charge: safeNum(q.delivery_charge, 0),
        discount: safeNum(q.discount, 0),
        final_amount: finAmt,
        delivery_time_minutes: safeNum(q.delivery_time_minutes, 30),
        items_breakdown: q.items_breakdown || [],
        bid_notes: q.bid_notes || "",
        rating: ratingVal,
        total_reviews: totalReviews,
        status: q.status,
        created_at: q.created_at,
        chemist: {
          id: q.chemist_id,
          pharmacy_name: pharmacyName,
          owner_name: q.owner_name || "Licensed Pharmacist",
          address: pharmacyAddress,
          mobile: q.mobile || "",
          upi_id: q.upi_id || "",
          payment_qr_url: q.payment_qr_url || "",
          rating: ratingVal,
          total_reviews: totalReviews
        }
      };
    });

    return success("Active broadcast details fetched", {
      broadcast: {
        ...broadcast,
        seconds_remaining: broadcast.seconds_remaining || 0,
      },
      quotes: formattedQuotes,
      existing_order: existingOrder,
    }, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Error fetching active broadcast:", err);
    return failure("Failed to fetch active broadcast", err.message, 500, { headers: corsHeaders });
  }
}
