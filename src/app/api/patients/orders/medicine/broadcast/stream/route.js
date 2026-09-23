import { supabase } from "@/lib/supabaseAdmin";
import { broadcastEmitter } from "@/lib/broadcastEmitter";

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const broadcast_id = searchParams.get('broadcast_id');

  if (!broadcast_id) {
    return new Response(JSON.stringify({ error: "broadcast_id is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Check if broadcast_id is valid UUID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(broadcast_id);

  let initialQuotes = [];
  let broadcast = null;

  if (isUuid) {
    try {
      // 1. Fetch initial quotes upon connection (single DB read)
      const { data } = await supabase
        .from("medicine_order_quotes")
        .select(`
          id,
          broadcast_id,
          chemist_id,
          estimated_cost,
          medicine_subtotal,
          delivery_charge,
          discount,
          final_amount,
          delivery_time_minutes,
          status,
          created_at,
          chemist:chemist_id(
            pharmacy_name,
            address,
            mobile
          )
        `)
        .eq("broadcast_id", broadcast_id)
        .order("created_at", { ascending: false });
      initialQuotes = data || [];

      // 2. Fetch broadcast remaining time
      const { data: bData } = await supabase
        .from("medicine_order_broadcasts")
        .select("expires_at, status")
        .eq("id", broadcast_id)
        .maybeSingle();
      broadcast = bData;
    } catch (err) {
      console.warn("SSE initial fetch error:", err?.message);
    }
  }

  const secondsRemaining = broadcast?.expires_at 
    ? Math.max(0, Math.floor((new Date(broadcast.expires_at) - new Date()) / 1000))
    : 0;

  // 3. Create a ReadableStream for SSE real-time push
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (eventData) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`));
        } catch (e) {
          console.warn("SSE send warning, stream closed:", e?.message);
        }
      };

      // Send initial quotes immediately
      sendEvent({
        type: "INITIAL_QUOTES",
        broadcast_id,
        status: broadcast?.status || "broadcasting",
        seconds_remaining: secondsRemaining,
        quotes: initialQuotes || []
      });

      // Track seen quote IDs to prevent duplicates
      const seenQuoteIds = new Set((initialQuotes || []).map(q => q.id));

      // Listener for real-time quotes pushed by chemists (instant in-process push)
      const quoteListener = (newQuote) => {
        if (newQuote?.id) {
          if (seenQuoteIds.has(newQuote.id)) return;
          seenQuoteIds.add(newQuote.id);
        }
        sendEvent({
          type: "NEW_QUOTE",
          broadcast_id,
          quote: newQuote
        });
      };

      // Listener for broadcast status updates (e.g. completed, expired)
      const statusListener = (statusUpdate) => {
        sendEvent({
          type: "BROADCAST_STATUS",
          broadcast_id,
          ...statusUpdate
        });
      };

      broadcastEmitter.on(`quote:${broadcast_id}`, quoteListener);
      broadcastEmitter.on(`status:${broadcast_id}`, statusListener);

      // Lightweight 3-second database sync loop as a cross-worker/cross-instance fallback
      // Ensures quotes are never lost even if chemists submit on a different worker process
      const syncInterval = setInterval(async () => {
        if (!isUuid) return;
        try {
          const { data: latestQuotes } = await supabase
            .from("medicine_order_quotes")
            .select(`
              id,
              broadcast_id,
              chemist_id,
              estimated_cost,
              medicine_subtotal,
              delivery_charge,
              discount,
              final_amount,
              delivery_time_minutes,
              status,
              created_at,
              chemist:chemist_id(
                pharmacy_name,
                address,
                mobile
              )
            `)
            .eq("broadcast_id", broadcast_id);

          if (latestQuotes && latestQuotes.length > 0) {
            for (const q of latestQuotes) {
              if (!seenQuoteIds.has(q.id)) {
                seenQuoteIds.add(q.id);
                sendEvent({
                  type: "NEW_QUOTE",
                  broadcast_id,
                  quote: q
                });
              }
            }
          }
        } catch {
          // ignore stream sync error
        }
      }, 3000);

      // Keep-alive heartbeat ping every 15 seconds
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(":ping\n\n"));
        } catch {
          clearInterval(pingInterval);
        }
      }, 15000);

      // Clean up when client disconnects or navigates away
      req.signal.addEventListener("abort", () => {
        clearInterval(syncInterval);
        clearInterval(pingInterval);
        broadcastEmitter.off(`quote:${broadcast_id}`, quoteListener);
        broadcastEmitter.off(`status:${broadcast_id}`, statusListener);
        try {
          controller.close();
        } catch {}
      });
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
    }
  });
}
