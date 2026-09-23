import { supabase } from "@/lib/supabaseAdmin";
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
    const now = new Date().toISOString();
    const { data: broadcasts, error: broadcastsErr } = await supabase
      .from("medicine_order_broadcasts")
      .select(`
        id,
        delivery_address,
        created_at,
        expires_at,
        status,
        prescription:prescription_id(
          id,
          medicines
        ),
        patient:patient_id(
          id,
          phone_number,
          patient_details(
            full_name
          )
        )
      `)
      .eq("status", "broadcasting")
      .gt("expires_at", now);

    if (broadcastsErr) throw broadcastsErr;

    // 2. Fetch quotes submitted by this chemist to see which ones are already answered
    const { data: quotes, error: quotesErr } = await supabase
      .from("medicine_order_quotes")
      .select("broadcast_id, estimated_cost, delivery_time_minutes")
      .eq("chemist_id", chemist_id);

    if (quotesErr) throw quotesErr;

    const quotesMap = {};
    if (quotes) {
      quotes.forEach(q => {
        quotesMap[q.broadcast_id] = q;
      });
    }

    // 3. Map broadcasts, masking exact delivery address & shielding phone number (V3 DPDP Rule)
    const result = broadcasts.map(b => {
      const rawAddr = b.delivery_address || "";
      const pinMatch = rawAddr.match(/\b\d{6}\b/);
      const delivery_pincode = pinMatch ? pinMatch[0] : null;
      const parts = rawAddr.split(',').map(s => s.trim()).filter(Boolean);
      const delivery_area = parts.length > 1 ? parts.slice(-2).join(', ') : (parts[0] || "Local Delivery Area");

      return {
        id: b.id,
        delivery_area: delivery_area,
        delivery_pincode: delivery_pincode,
        // Shielded address representation for bidding pharmacies
        delivery_address: delivery_pincode ? `${delivery_area} (PIN: ${delivery_pincode})` : delivery_area,
        created_at: b.created_at,
        expires_at: b.expires_at,
        medicines: typeof b.prescription?.medicines === "string" 
          ? JSON.parse(b.prescription.medicines) 
          : b.prescription?.medicines || [],
        // Shield patient phone number completely during bidding phase
        patient_name: b.patient?.patient_details?.full_name || "Patient",
        already_quoted: !!quotesMap[b.id],
        submitted_quote: quotesMap[b.id] || null,
        seconds_remaining: Math.max(0, Math.floor((new Date(b.expires_at) - new Date()) / 1000))
      };
    });

    return success("Broadcasts fetched successfully", result, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Error fetching chemist broadcasts:", err);
    return failure("Failed to fetch chemist broadcasts", err.message, 500, { headers: corsHeaders });
  }
}
