import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { prescription_id, patient_id, delivery_address, latitude, longitude } = await req.json();

    if (!prescription_id || !patient_id) {
      return failure("prescription_id & patient_id are required", null, 400, { headers: corsHeaders });
    }

    // Set expiration to 2 minutes from now
    const expires_at = new Date(Date.now() + 2 * 60 * 1000).toISOString();

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

    // Fetch all active/onboarded chemists to notify
    const { data: chemists, error: chemistsErr } = await supabase
      .from("chemist_details")
      .select("id, pharmacy_name");

    if (chemistsErr) console.error("Error fetching chemists to broadcast:", chemistsErr.message);

    // Create notifications for chemists
    if (chemists && chemists.length > 0) {
      const notifications = chemists.map((c) => ({
        user_id: c.id,
        title: "New Medicine Request 💊",
        message: `A patient is looking for medicines. Review prescription and submit your quote!`,
        type: "medicine_broadcast",
        metadata: {
          broadcast_id: broadcast.id,
          prescription_id,
          patient_id,
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
