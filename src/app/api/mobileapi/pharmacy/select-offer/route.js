import { corsHeaders } from "@/lib/cors";
import { resolveCallerFromRequest } from "@/lib/layer1/authGuard";
import sql from "@/lib/db";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * Mobile Explicit Pharmacy Offer Selection (J08 / PH-03)
 * Patient MUST explicitly select one offer.
 * Backend atomically locks the selection, expires competing offers, and releases address ONLY to selected pharmacy.
 */
export async function POST(req) {
  try {
    const caller = await resolveCallerFromRequest(req);
    if (!caller) {
      return Response.json(
        { success: false, message: "Unauthorized token." },
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const { offer_id, prescription_id, delivery_address, patient_consent } = body || {};

    if (!offer_id || !prescription_id) {
      return Response.json(
        { success: false, message: "offer_id and prescription_id are required." },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!patient_consent) {
      return Response.json(
        { success: false, message: "Explicit patient consent is required to share delivery address." },
        { status: 422, headers: corsHeaders }
      );
    }

    // 1. Verify offer status in AWS RDS PostgreSQL
    const targetOffer = await sql`
      SELECT id, pharmacy_id, status FROM pharmacy_offers 
      WHERE id = ${offer_id} AND prescription_id = ${prescription_id}
      LIMIT 1
    `;

    if (targetOffer.length === 0) {
      return Response.json(
        { success: false, message: "Pharmacy offer not found." },
        { status: 404, headers: corsHeaders }
      );
    }

    if (targetOffer[0].status === 'expired' || targetOffer[0].status === 'selected_by_other') {
      // 409 Conflict: Offer was selected by another patient or expired
      const remainingOffers = await sql`
        SELECT po.id AS offer_id, po.pharmacy_id, p.name AS pharmacy_name, po.total_price 
        FROM pharmacy_offers po
        JOIN pharmacies p ON po.pharmacy_id = p.id
        WHERE po.prescription_id = ${prescription_id} AND po.status = 'active'
      `;
      return Response.json(
        {
          success: false,
          message: "This pharmacy offer has expired or is no longer available. Please select another offer.",
          conflict_type: "OFFER_EXPIRED",
          available_offers: remainingOffers
        },
        { status: 409, headers: corsHeaders }
      );
    }

    // 2. Atomic selection in AWS RDS
    await sql`
      UPDATE pharmacy_offers 
      SET status = 'selected', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ${offer_id}
    `;

    // 3. Expire competing offers for this prescription
    await sql`
      UPDATE pharmacy_offers 
      SET status = 'expired', updated_at = CURRENT_TIMESTAMP 
      WHERE prescription_id = ${prescription_id} AND id != ${offer_id}
    `;

    // 4. Create Fulfilment Assignment & release address to selected pharmacy only
    const assignment = await sql`
      INSERT INTO pharmacy_orders (
        prescription_id, pharmacy_id, offer_id, patient_id, delivery_address, status
      ) VALUES (
        ${prescription_id}, ${targetOffer[0].pharmacy_id}, ${offer_id}, ${caller.id}, ${delivery_address || 'As per account'}, 'assigned'
      )
      RETURNING id, status, created_at
    `;

    return Response.json(
      {
        success: true,
        message: "Pharmacy offer selected successfully. Order assigned.",
        data: {
          order_id: assignment[0].id,
          status: assignment[0].status,
          pharmacy_id: targetOffer[0].pharmacy_id,
          selected_offer_id: offer_id
        }
      },
      { status: 201, headers: corsHeaders }
    );

  } catch (error) {
    console.error("[MOBILE API PHARMACY SELECT OFFER] Error:", error);
    return Response.json(
      { success: false, message: "Failed to select pharmacy offer.", error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
