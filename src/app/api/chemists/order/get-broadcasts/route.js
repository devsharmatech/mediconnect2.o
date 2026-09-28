import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { chemist_id } = await req.json();

    if (!chemist_id) {
      return failure("chemist_id is required", null, 400, { headers: corsHeaders });
    }

    // 1. Fetch active broadcasts (broadcasting and not yet expired)
    const broadcasts = await sql`
      SELECT 
        mob.id,
        mob.delivery_address,
        mob.created_at,
        mob.expires_at,
        mob.status,
        p.id as prescription_id,
        p.medicines,
        u.id as patient_id,
        u.phone_number as patient_phone,
        pd.full_name as patient_name
      FROM medicine_order_broadcasts mob
      LEFT JOIN prescriptions p ON p.id = mob.prescription_id
      LEFT JOIN users u ON u.id = mob.patient_id
      LEFT JOIN patient_details pd ON pd.id = mob.patient_id
      WHERE mob.status = 'broadcasting' AND mob.expires_at > NOW()
      ORDER BY mob.created_at DESC
    `;

    // 2. Fetch quotes submitted by this chemist
    let quotesMap = {};
    if (broadcasts.length > 0) {
      const broadcastIds = broadcasts.map((b) => b.id);
      const quotes = await sql`
        SELECT broadcast_id, estimated_cost, delivery_time_minutes, final_amount, status
        FROM medicine_order_quotes
        WHERE chemist_id = ${chemist_id} AND broadcast_id = ANY(${broadcastIds})
      `;
      quotes.forEach((q) => {
        quotesMap[q.broadcast_id] = q;
      });
    }

    // 3. Map broadcasts, masking exact delivery address & shielding phone number (V3 DPDP Rule)
    const result = broadcasts.map((b) => {
      const rawAddr = b.delivery_address || "";
      const pinMatch = rawAddr.match(/\b\d{6}\b/);
      const delivery_pincode = pinMatch ? pinMatch[0] : null;
      const parts = rawAddr.split(",").map((s) => s.trim()).filter(Boolean);
      const delivery_area =
        parts.length > 1
          ? parts.slice(-2).join(", ")
          : parts[0] || "Local Delivery Area";

      let parsedMedicines = [];
      try {
        parsedMedicines =
          typeof b.medicines === "string" ? JSON.parse(b.medicines) : b.medicines || [];
      } catch (e) {
        parsedMedicines = [];
      }

      const secondsRemaining = Math.max(
        0,
        Math.floor((new Date(b.expires_at).getTime() - Date.now()) / 1000)
      );

      return {
        id: b.id,
        delivery_area,
        delivery_pincode,
        delivery_address: delivery_pincode
          ? `${delivery_area} (PIN: ${delivery_pincode})`
          : delivery_area,
        created_at: b.created_at,
        expires_at: b.expires_at,
        medicines: parsedMedicines,
        patient_name: b.patient_name || "Verified Patient",
        already_quoted: !!quotesMap[b.id],
        submitted_quote: quotesMap[b.id] || null,
        seconds_remaining: secondsRemaining,
      };
    });

    return success("Broadcasts fetched successfully", result, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Error fetching chemist broadcasts:", err);
    return failure("Failed to fetch chemist broadcasts", err.message, 500, { headers: corsHeaders });
  }
}
