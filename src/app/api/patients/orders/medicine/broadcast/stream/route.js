import sql from "@/lib/db";
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
      // 1. Fetch initial quotes upon connection (single DB read from AWS RDS)
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
          cd.address,
          cd.mobile,
          cd.rating,
          cd.total_reviews
        FROM medicine_order_quotes q
        LEFT JOIN chemist_details cd ON cd.id = q.chemist_id
        WHERE q.broadcast_id = ${broadcast_id} AND q.status != 'withdrawn'
        ORDER BY q.created_at DESC
      `;

      const safeNum = (val, fb = 0) => {
        const n = Number(val);
        return isNaN(n) ? fb : n;
      };

      initialQuotes = quoteRows.map((q) => {
        const pharmacyName = q.pharmacy_name || q.store_name || "Partner Pharmacy";
        const pharmacyAddress = q.address || "Local Partner Pharmacy";
        const ratingVal = (q.rating && Number(q.total_reviews || 0) > 0) ? Number(q.rating) : null;
        const finAmt = safeNum(q.final_amount, safeNum(q.estimated_cost, 0));
        return {
          id: q.id,
          broadcast_id: q.broadcast_id,
          chemist_id: q.chemist_id,
          estimated_cost: finAmt,
          medicine_subtotal: safeNum(q.medicine_subtotal, finAmt),
          delivery_charge: safeNum(q.delivery_charge, 0),
          discount: safeNum(q.discount, 0),
          final_amount: finAmt,
          delivery_time_minutes: safeNum(q.delivery_time_minutes, 30),
          items_breakdown: q.items_breakdown || [],
          bid_notes: q.bid_notes || "",
          status: q.status,
          created_at: q.created_at,
          pharmacy_name: pharmacyName,
          address: pharmacyAddress,
          rating: ratingVal,
          chemist: {
            pharmacy_name: pharmacyName,
            address: pharmacyAddress,
            mobile: q.mobile || "",
            rating: ratingVal
          }
        };
      });

      // 2. Fetch broadcast remaining time
      const broadcastRows = await sql`
        SELECT expires_at, status FROM medicine_order_broadcasts
        WHERE id = ${broadcast_id} LIMIT 1
      `;
      broadcast = broadcastRows[0] || null;
    } catch (err) {
      console.warn("SSE initial fetch error:", err?.message);
    }
  }

  const secondsRemaining = broadcast?.expires_at 
    ? Math.max(0, Math.min(900, Math.floor((new Date(broadcast.expires_at) - new Date()) / 1000)))
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

      // Track seen quote versions to send updates when edited or newly created
      const safeNum = (val, fb = 0) => {
        const n = Number(val);
        return isNaN(n) ? fb : n;
      };

      const seenQuoteVersions = new Map();
      (initialQuotes || []).forEach(q => {
        seenQuoteVersions.set(q.id, `${q.final_amount}_${q.status}_${q.medicine_subtotal}_${q.delivery_time_minutes}`);
      });

      // Listener for real-time quotes pushed by chemists
      const quoteListener = (newQuote) => {
        if (newQuote?.id) {
          const versionKey = `${newQuote.final_amount}_${newQuote.status}_${newQuote.medicine_subtotal}_${newQuote.delivery_time_minutes}`;
          seenQuoteVersions.set(newQuote.id, versionKey);
        }
        sendEvent({
          type: "NEW_QUOTE",
          broadcast_id,
          quote: newQuote
        });
      };

      // Listener for broadcast status updates (e.g. completed, expired, withdrawn)
      const statusListener = (statusUpdate) => {
        sendEvent({
          type: statusUpdate?.type || "BROADCAST_STATUS",
          broadcast_id,
          ...statusUpdate
        });
      };

      broadcastEmitter.on(`quote:${broadcast_id}`, quoteListener);
      broadcastEmitter.on(`status:${broadcast_id}`, statusListener);

      // Lightweight 3-second database sync loop from AWS RDS
      const syncInterval = setInterval(async () => {
        if (!isUuid) return;
        try {
          const latestQuoteRows = await sql`
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
              cd.address,
              cd.mobile,
              cd.rating,
              cd.total_reviews
            FROM medicine_order_quotes q
            LEFT JOIN chemist_details cd ON cd.id = q.chemist_id
            WHERE q.broadcast_id = ${broadcast_id} AND q.status != 'withdrawn'
            ORDER BY q.created_at DESC
          `;

          if (latestQuoteRows && latestQuoteRows.length > 0) {
            for (const q of latestQuoteRows) {
              const finAmt = safeNum(q.final_amount, safeNum(q.estimated_cost, 0));
              const versionKey = `${finAmt}_${q.status}_${safeNum(q.medicine_subtotal, finAmt)}_${safeNum(q.delivery_time_minutes, 30)}`;
              
              if (seenQuoteVersions.get(q.id) !== versionKey) {
                seenQuoteVersions.set(q.id, versionKey);
                const pharmacyName = q.pharmacy_name || q.store_name || "Partner Pharmacy";
                const pharmacyAddress = q.address || "Local Partner Pharmacy";
                const ratingVal = (q.rating && Number(q.total_reviews || 0) > 0) ? Number(q.rating) : null;
                const formatted = {
                  id: q.id,
                  broadcast_id: q.broadcast_id,
                  chemist_id: q.chemist_id,
                  estimated_cost: finAmt,
                  medicine_subtotal: safeNum(q.medicine_subtotal, finAmt),
                  delivery_charge: safeNum(q.delivery_charge, 0),
                  discount: safeNum(q.discount, 0),
                  final_amount: finAmt,
                  delivery_time_minutes: safeNum(q.delivery_time_minutes, 30),
                  items_breakdown: q.items_breakdown || [],
                  bid_notes: q.bid_notes || "",
                  status: q.status,
                  created_at: q.created_at,
                  pharmacy_name: pharmacyName,
                  address: pharmacyAddress,
                  rating: ratingVal,
                  chemist: {
                    pharmacy_name: pharmacyName,
                    address: pharmacyAddress,
                    mobile: q.mobile || "",
                    rating: ratingVal
                  }
                };
                sendEvent({
                  type: "NEW_QUOTE",
                  broadcast_id,
                  quote: formatted
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
