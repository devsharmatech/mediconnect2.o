import { corsHeaders } from "@/lib/cors";
import { resolveCallerFromRequest } from "@/lib/layer1/authGuard";
import sql from "@/lib/db";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * Mobile Pharmacy Offers Endpoint (J08)
 * Returns independent pharmacy bids/offers WITHOUT broadcasting patient home address/phone.
 */
export async function GET(req) {
  try {
    const caller = await resolveCallerFromRequest(req);
    if (!caller) {
      return Response.json(
        { success: false, message: "Unauthorized token." },
        { status: 401, headers: corsHeaders }
      );
    }

    const { searchParams } = new URL(req.url);
    const prescriptionId = searchParams.get("prescription_id");

    if (!prescriptionId) {
      return Response.json(
        { success: false, message: "prescription_id is required." },
        { status: 400, headers: corsHeaders }
      );
    }

    // Query independent pharmacy offers from AWS RDS PostgreSQL
    const offers = await sql`
      SELECT 
        po.id AS offer_id,
        po.pharmacy_id,
        p.name AS pharmacy_name,
        p.rating AS pharmacy_rating,
        po.total_price,
        po.delivery_fee,
        po.discount_amount,
        po.estimated_delivery_time,
        po.status,
        po.created_at
      FROM pharmacy_offers po
      JOIN pharmacies p ON po.pharmacy_id = p.id
      WHERE po.prescription_id = ${prescriptionId} AND po.status = 'active'
      ORDER BY po.total_price ASC
    `;

    return Response.json(
      {
        success: true,
        message: "Independent pharmacy offers fetched successfully.",
        data: {
          prescription_id: prescriptionId,
          offers: offers,
          note: "Patient must explicitly select one offer. Auto-selection is disabled per PDF J08 rules."
        }
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("[MOBILE API PHARMACY OFFERS] Error:", error);
    return Response.json(
      { success: false, message: "Failed to fetch pharmacy offers.", error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
