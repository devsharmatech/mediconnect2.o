import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const broadcast_id = searchParams.get("broadcast_id");

    if (!broadcast_id) {
      return failure("broadcast_id is required", null, 400, { headers: corsHeaders });
    }

    // 1. Fetch broadcast details
    const { data: broadcast, error: broadcastErr } = await supabase
      .from("medicine_order_broadcasts")
      .select("*")
      .eq("id", broadcast_id)
      .single();

    if (broadcastErr || !broadcast) {
      return failure("Broadcast not found", null, 404, { headers: corsHeaders });
    }

    // 2. Fetch quotes submitted for this broadcast
    const { data: quotes, error: quotesErr } = await supabase
      .from("medicine_order_quotes")
      .select("*")
      .eq("broadcast_id", broadcast_id);

    if (quotesErr) throw quotesErr;

    // Fetch chemist details and user profiles for these quotes
    let chemistsMap = {};
    let usersMap = {};

    if (quotes && quotes.length > 0) {
      const chemistIds = quotes.map(q => q.chemist_id);
      
      const formattedIds = chemistIds.map(id => `"${id}"`).join(',');

      const { data: chemists, error: chemistsErr } = await supabase
        .from("chemist_details")
        .select("id, user_id, store_name, pharmacy_name, address, upi_id, rating, total_reviews")
        .or(`id.in.(${formattedIds}),user_id.in.(${formattedIds})`);
      
      if (chemistsErr) {
        console.error("Error fetching chemist details for quotes:", chemistsErr.message);
      } else if (chemists) {
        chemists.forEach(c => {
          if (c.id) chemistsMap[c.id] = c;
          if (c.user_id) chemistsMap[c.user_id] = c;
        });
      }

      const { data: users, error: usersErr } = await supabase
        .from("users")
        .select("id, full_name, phone_number")
        .in("id", chemistIds);

      if (usersErr) {
        console.error("Error fetching user profiles for quotes:", usersErr.message);
      } else if (users) {
        users.forEach(u => {
          usersMap[u.id] = u;
        });
      }
    }

    // 3. Evaluate if we need to auto-expire or mark completed
    const isExpired = new Date() > new Date(broadcast.expires_at);
    const hasThreeQuotes = quotes.length >= 3;

    if (broadcast.status === "broadcasting" && (isExpired || hasThreeQuotes)) {
      const newStatus = hasThreeQuotes ? "completed" : "expired";
      await supabase
        .from("medicine_order_broadcasts")
        .update({ status: newStatus })
        .eq("id", broadcast_id);
      broadcast.status = newStatus;
    }

    return success("Broadcast quotes fetched successfully", {
      broadcast,
      quotes: quotes.map(q => {
        const chemist = chemistsMap[q.chemist_id];
        const user = usersMap[q.chemist_id];
        const pharmacyName = chemist?.pharmacy_name || chemist?.store_name || user?.full_name || "Partner Pharmacy";
        const pharmacyAddress = chemist?.address || "Local Partner Pharmacy";
        const ratingVal = (chemist?.rating && Number(chemist?.total_reviews || 0) > 0) ? Number(chemist.rating) : null;

        return {
          id: q.id,
          chemist_id: q.chemist_id,
          pharmacy_name: pharmacyName,
          address: pharmacyAddress,
          upi_id: chemist?.upi_id || "",
          estimated_cost: Number(q.estimated_cost || 0),
          delivery_time_minutes: Number(q.delivery_time_minutes || 30),
          status: q.status,
          rating: ratingVal,
        };
      })
    }, 200, { headers: corsHeaders });

  } catch (err) {
    console.error("Error fetching broadcast responses:", err);
    return failure("Failed to fetch broadcast responses", err.message, 500, { headers: corsHeaders });
  }
}
