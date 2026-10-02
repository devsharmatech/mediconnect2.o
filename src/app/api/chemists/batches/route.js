import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function safeUuid(val) {
  if (!val || typeof val !== "string") return null;
  return UUID_REGEX.test(val.trim()) ? val.trim() : null;
}

/* -----------------------------------------------------
    CREATE A STOCK LOG ENTRY
----------------------------------------------------- */
async function writeLog({ chemist_id, medicine_id, batch_id, change_type, qty, reason }) {
  try {
    await sql`
      INSERT INTO chemist_stock_logs (chemist_id, medicine_id, batch_id, change_type, qty_changed, reason, created_at)
      VALUES (${chemist_id}, ${medicine_id}, ${batch_id}, ${change_type}, ${qty}, ${reason || null}, NOW())
    `;
  } catch (err) {
    console.warn("Failed to write stock log:", err.message);
  }
}

/* -----------------------------------------------------
    POST → CREATE BATCH
----------------------------------------------------- */
export async function POST(req) {
  try {
    const body = await req.json();
    const { chemist_id, medicine_id, batch_no, expiry_date, stock_qty, purchase_price, selling_price } = body;

    const chemUuid = safeUuid(chemist_id);
    const medUuid = safeUuid(medicine_id);

    if (!chemUuid || !medUuid) return failure("valid chemist_id and medicine_id required", null, 400, { headers: corsHeaders });

    const [data] = await sql`
      INSERT INTO chemist_inventory_batches (
        chemist_id, medicine_id, batch_no, expiry_date, stock_qty, purchase_price, selling_price, created_at, updated_at
      )
      VALUES (
        ${chemUuid}, ${medUuid}, ${batch_no || null}, ${expiry_date || null},
        ${stock_qty || 0}, ${purchase_price || null}, ${selling_price || null}, NOW(), NOW()
      )
      RETURNING *
    `;

    if (stock_qty > 0 && data?.id) {
      await writeLog({
        chemist_id: chemUuid,
        medicine_id: medUuid,
        batch_id: data.id,
        change_type: "stock_in",
        qty: stock_qty,
        reason: "initial_stock",
      });
    }

    return success("Batch created", { batch: data }, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("POST batch error:", err);
    return failure("Failed to create batch", err.message, 500, { headers: corsHeaders });
  }
}

/* -----------------------------------------------------
    GET → LIST BATCHES OR SINGLE
----------------------------------------------------- */
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const chemist_id = url.searchParams.get("chemist_id");
    const id = url.searchParams.get("id");
    const search = url.searchParams.get("search") || "";
    const medicine_id = url.searchParams.get("medicine_id");
    const page = Number(url.searchParams.get("page")) || 1;
    const limit = Number(url.searchParams.get("limit")) || 10;
    const offset = (page - 1) * limit;

    const chemUuid = safeUuid(chemist_id);
    if (!chemUuid && !id) return failure("chemist_id required", null, 400, { headers: corsHeaders });

    // Single batch
    if (id) {
      const batchUuid = safeUuid(id);
      if (!batchUuid) return failure("Invalid batch id", null, 400, { headers: corsHeaders });

      const [data] = await sql`
        SELECT 
          b.*,
          json_build_object('id', m.id, 'name', m.name, 'brand', m.brand, 'category', m.category, 'strength', m.strength, 'type', m.type) as medicine
        FROM chemist_inventory_batches b
        LEFT JOIN chemist_medicines m ON m.id = b.medicine_id
        WHERE b.id = ${batchUuid}
        LIMIT 1
      `;

      return success("Batch fetched", { batch: data || null }, 200, { headers: corsHeaders });
    }

    const conditions = [sql`b.chemist_id = ${chemUuid}`];
    if (safeUuid(medicine_id)) conditions.push(sql`b.medicine_id = ${safeUuid(medicine_id)}`);
    if (search) conditions.push(sql`b.batch_no ILIKE ${'%' + search + '%'}`);

    const whereClause = sql`WHERE ${conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}`;

    const [countRes, data] = await Promise.all([
      sql`SELECT count(*)::int as count FROM chemist_inventory_batches b ${whereClause}`,
      sql`
        SELECT 
          b.*,
          json_build_object('id', m.id, 'name', m.name, 'brand', m.brand, 'category', m.category, 'strength', m.strength, 'type', m.type) as medicine
        FROM chemist_inventory_batches b
        LEFT JOIN chemist_medicines m ON m.id = b.medicine_id
        ${whereClause}
        ORDER BY b.expiry_date ASC NULLS LAST
        LIMIT ${limit} OFFSET ${offset}
      `
    ]);

    const count = countRes[0]?.count || 0;

    return success("Batches loaded", {
      pagination: {
        page,
        limit,
        total: count,
        total_pages: Math.ceil(count / limit),
      },
      data,
    }, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("GET batches error:", err);
    return failure("Failed to fetch batches", err.message, 500, { headers: corsHeaders });
  }
}

/* -----------------------------------------------------
    PUT → UPDATE BATCH + LOG STOCK CHANGE
----------------------------------------------------- */
export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, chemist_id, stock_qty, reason } = body;

    const batchUuid = safeUuid(id);
    const chemUuid = safeUuid(chemist_id);

    if (!batchUuid || !chemUuid) return failure("valid id and chemist_id required", null, 400, { headers: corsHeaders });

    const [old] = await sql`
      SELECT * FROM chemist_inventory_batches
      WHERE id = ${batchUuid} AND chemist_id = ${chemUuid}
      LIMIT 1
    `;

    if (!old) return failure("Batch not found", null, 404, { headers: corsHeaders });

    const updatePayload = { updated_at: new Date() };
    ["batch_no", "expiry_date", "stock_qty", "purchase_price", "selling_price"].forEach(k => {
      if (k in body) updatePayload[k] = body[k];
    });

    const keys = Object.keys(updatePayload);
    const [data] = await sql`
      UPDATE chemist_inventory_batches
      SET ${sql(updatePayload, ...keys)}
      WHERE id = ${batchUuid} AND chemist_id = ${chemUuid}
      RETURNING *
    `;

    if (typeof stock_qty === "number") {
      const diff = stock_qty - old.stock_qty;
      if (diff !== 0) {
        await writeLog({
          chemist_id: chemUuid,
          medicine_id: old.medicine_id,
          batch_id: batchUuid,
          change_type: diff > 0 ? "stock_in" : "stock_out",
          qty: Math.abs(diff),
          reason: reason || "manual_update",
        });
      }
    }

    return success("Batch updated", { batch: data }, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("PUT batch error:", err);
    return failure("Failed to update batch", err.message, 500, { headers: corsHeaders });
  }
}

/* -----------------------------------------------------
    DELETE → REMOVE BATCH + LOG STOCK REMOVAL
----------------------------------------------------- */
export async function DELETE(req) {
  try {
    const body = await req.json();
    const { id, chemist_id } = body;

    const batchUuid = safeUuid(id);
    const chemUuid = safeUuid(chemist_id);

    if (!batchUuid || !chemUuid) return failure("valid id and chemist_id required", null, 400, { headers: corsHeaders });

    const [old] = await sql`
      SELECT * FROM chemist_inventory_batches
      WHERE id = ${batchUuid} AND chemist_id = ${chemUuid}
      LIMIT 1
    `;

    if (!old) return failure("Batch not found", null, 404, { headers: corsHeaders });

    await sql`
      DELETE FROM chemist_inventory_batches
      WHERE id = ${batchUuid} AND chemist_id = ${chemUuid}
    `;

    if (old.stock_qty > 0) {
      await writeLog({
        chemist_id: chemUuid,
        medicine_id: old.medicine_id,
        batch_id: batchUuid,
        change_type: "adjustment",
        qty: old.stock_qty,
        reason: "batch_deleted",
      });
    }

    return success("Batch deleted", null, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("DELETE batch error:", err);
    return failure("Failed to delete batch", err.message, 500, { headers: corsHeaders });
  }
}
