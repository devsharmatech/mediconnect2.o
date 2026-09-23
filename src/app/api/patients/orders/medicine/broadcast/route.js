import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { 
      prescription_id, 
      patient_id, 
      delivery_address, 
      delivery_area,
      delivery_pincode,
      latitude, 
      longitude,
      consent_version = "v3.0",
      consent_timestamp = new Date().toISOString(),
      channel = "web"
    } = await req.json();

    if (!prescription_id || !patient_id) {
      return failure("prescription_id & patient_id are required", null, 400, { headers: corsHeaders });
    }

    // Set expiration to 2 minutes from now
    const expires_at = new Date(Date.now() + 2 * 60 * 1000).toISOString();

    // Auto-resolve pincode and area if not explicitly passed
    const pinMatch = (delivery_address || "").match(/\b\d{6}\b/);
    const resolvedPincode = delivery_pincode || (pinMatch ? pinMatch[0] : null);
    const parts = (delivery_address || "").split(',').map(s => s.trim()).filter(Boolean);
    const resolvedArea = delivery_area || (parts.length > 1 ? parts.slice(-2).join(', ') : (parts[0] || "Local Delivery Area"));

    // Create the broadcast entry
    const { data: broadcast, error: broadcastErr } = await supabase
      .from("medicine_order_broadcasts")
      .insert([
        {
          prescription_id,
          patient_id,
          delivery_address,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          status: "broadcasting",
          expires_at,
        },
      ])
      .select()
      .single();

    if (broadcastErr) throw broadcastErr;

    // Record DPDP Consent & Intent Event (Page 5 of V3 Spec)
    try {
      await supabase.from("notifications").insert([
        {
          user_id: patient_id,
          title: "Medicine Request Created 💊",
          message: "Your medicine request has been created under DPDP Consent v3.0. We are finding available pharmacies.",
          type: "e_pharmacy_consent",
          metadata: {
            broadcast_id: broadcast.id,
            prescription_id,
            consent_version,
            consent_timestamp,
            channel,
            purchase_intent: true,
            delivery_area: resolvedArea,
            delivery_pincode: resolvedPincode
          }
        }
      ]);
    } catch (consentErr) {
      console.warn("Could not log consent notification:", consentErr.message);
    }

    // Fetch all active/onboarded chemists to notify
    const { data: chemists, error: chemistsErr } = await supabase
      .from("chemist_details")
      .select("id, pharmacy_name");

    if (chemistsErr) console.error("Error fetching chemists to broadcast:", chemistsErr.message);

    // Create notifications for chemists (without exposing patient exact address or phone)
    if (chemists && chemists.length > 0) {
      const notifications = chemists.map((c) => ({
        user_id: c.id,
        title: "New Medicine Request 💊",
        message: `A patient in ${resolvedArea} (${resolvedPincode || 'Nearby'}) is looking for medicines. Review prescription items and submit your quote!`,
        type: "medicine_broadcast",
        metadata: {
          broadcast_id: broadcast.id,
          prescription_id,
          patient_id,
          delivery_area: resolvedArea,
          delivery_pincode: resolvedPincode
        },
      }));

      const { error: notifErr } = await supabase.from("notifications").insert(notifications);
      if (notifErr) console.error("Error inserting broadcast notifications:", notifErr.message);
    }

    return success("Broadcast initiated successfully", broadcast, 201, { headers: corsHeaders });
  } catch (err) {
    console.error("Error creating broadcast:", err);
    return failure("Failed to create broadcast", err.message, 500, { headers: corsHeaders });
  }
}
