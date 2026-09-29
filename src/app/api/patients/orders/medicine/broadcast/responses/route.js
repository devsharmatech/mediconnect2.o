import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const broadcast_id = searchParams.get("broadcast_id");
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "cheapest"; // cheapest | fastest | highest_rated | latest
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get("pageSize") || "20", 10)));
    const offset = (page - 1) * pageSize;

    if (!broadcast_id) {
      return failure("broadcast_id is required", null, 400, { headers: corsHeaders });
    }

    // 1. Fetch broadcast details
    const broadcastRows = await sql`
      SELECT 
        mob.*,
        p.medicines as prescription_medicines,
        p.file_url as prescription_file_url
      FROM medicine_order_broadcasts mob
      LEFT JOIN prescriptions p ON p.id = mob.prescription_id
      WHERE mob.id = ${broadcast_id} 
      LIMIT 1
    `;
    const broadcast = broadcastRows[0];

    if (!broadcast) {
      return failure("Broadcast not found", null, 404, { headers: corsHeaders });
    }

    // Parse medicines
    let parsedMedicines = [];
    try {
      parsedMedicines = typeof broadcast.prescription_medicines === "string" 
        ? JSON.parse(broadcast.prescription_medicines) 
        : broadcast.prescription_medicines || [];
    } catch {
      parsedMedicines = [];
    }

    // Auto-expire if time has passed and still broadcasting
    const isExpired = new Date() > new Date(broadcast.expires_at);
    if (broadcast.status === "broadcasting" && isExpired) {
      await sql`
        UPDATE medicine_order_broadcasts
        SET status = 'expired'
        WHERE id = ${broadcast_id}
      `;
      broadcast.status = "expired";
    }

    // 2. Build search filter
    let searchCondition = sql``;
    if (search.trim()) {
      const s = `%${search.trim()}%`;
      searchCondition = sql`AND (cd.pharmacy_name ILIKE ${s} OR cd.address ILIKE ${s})`;
    }

    // 3. Count total matching quotes (UNLIMITED CAPACITY)
    const countRows = await sql`
      SELECT COUNT(*)::int as total
      FROM medicine_order_quotes q
      LEFT JOIN chemist_details cd ON cd.id = q.chemist_id
      WHERE q.broadcast_id = ${broadcast_id}
        AND q.status != 'withdrawn'
        ${searchCondition}
    `;
    const totalCount = countRows[0]?.total || 0;

    // 4. Fetch quotes with sorting and pagination
    let orderClause = sql`ORDER BY q.final_amount ASC, q.delivery_time_minutes ASC`;
    if (sortBy === "fastest") {
      orderClause = sql`ORDER BY q.delivery_time_minutes ASC, q.final_amount ASC`;
    } else if (sortBy === "highest_rated") {
      orderClause = sql`ORDER BY COALESCE(cd.rating, 0) DESC, q.final_amount ASC`;
    } else if (sortBy === "latest") {
      orderClause = sql`ORDER BY q.created_at DESC`;
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
      WHERE q.broadcast_id = ${broadcast_id}
        AND q.status != 'withdrawn'
        ${searchCondition}
      ${orderClause}
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    const formattedQuotes = quoteRows.map((q) => {
      const pharmacyName = q.pharmacy_name || q.store_name || "Partner Pharmacy";
      const pharmacyAddress = q.address || "Local Partner Pharmacy";
      const ratingVal = (q.rating && Number(q.total_reviews || 0) > 0) ? Number(q.rating) : 4.5;
      const totalReviews = Number(q.total_reviews || 12);

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
        estimated_cost: Number(q.estimated_cost || q.final_amount || 0),
        medicine_subtotal: Number(q.medicine_subtotal || q.estimated_cost || 0),
        delivery_charge: Number(q.delivery_charge || 0),
        discount: Number(q.discount || 0),
        final_amount: Number(q.final_amount || q.estimated_cost || 0),
        delivery_time_minutes: Number(q.delivery_time_minutes || 30),
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

    const secondsRemaining = Math.max(
      0,
      Math.floor((new Date(broadcast.expires_at).getTime() - Date.now()) / 1000)
    );

    return success("Broadcast quotes fetched successfully", {
      broadcast: {
        ...broadcast,
        medicines: parsedMedicines,
        seconds_remaining: secondsRemaining
      },
      pagination: {
        total: totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize) || 1,
        hasMore: offset + quoteRows.length < totalCount
      },
      quotes: formattedQuotes,
    }, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Error fetching broadcast responses:", err);
    return failure("Failed to fetch broadcast responses", err.message, 500, { headers: corsHeaders });
  }
}
