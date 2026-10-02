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
    GET → LIST LOGS
----------------------------------------------------- */
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const chemist_id = url.searchParams.get("chemist_id");
    const medicine_id = url.searchParams.get("medicine_id");
    const batch_id = url.searchParams.get("batch_id");
    const change_type = url.searchParams.get("change_type");
    const page = Number(url.searchParams.get("page")) || 1;
    const limit = Number(url.searchParams.get("limit")) || 20;
    const offset = (page - 1) * limit;

    const chemUuid = safeUuid(chemist_id);
    if (!chemUuid) return failure("valid chemist_id required", null, 400, { headers: corsHeaders });

    const conditions = [sql`l.chemist_id = ${chemUuid}`];
    if (safeUuid(medicine_id)) conditions.push(sql`l.medicine_id = ${safeUuid(medicine_id)}`);
    if (safeUuid(batch_id)) conditions.push(sql`l.batch_id = ${safeUuid(batch_id)}`);
    if (change_type) conditions.push(sql`l.change_type = ${change_type}`);

    const whereClause = sql`WHERE ${conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}`;

    const [countRes, logs] = await Promise.all([
      sql`SELECT count(*)::int as count FROM chemist_stock_logs l ${whereClause}`,
      sql`
        SELECT 
          l.*,
          json_build_object('id', m.id, 'name', m.name, 'brand', m.brand, 'strength', m.strength, 'type', m.type) as medicine,
          json_build_object('id', b.id, 'batch_no', b.batch_no, 'expiry_date', b.expiry_date) as batch
        FROM chemist_stock_logs l
        LEFT JOIN chemist_medicines m ON m.id = l.medicine_id
        LEFT JOIN chemist_inventory_batches b ON b.id = l.batch_id
        ${whereClause}
        ORDER BY l.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    ]);

    const count = countRes[0]?.count || 0;

    return success("Logs loaded", {
      pagination: {
        page,
        limit,
        total: count,
        total_pages: Math.ceil(count / limit),
      },
      logs,
    }, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("GET chemist logs error:", err);
    return failure("Failed to fetch logs", err.message, 500, { headers: corsHeaders });
  }
}

/* -----------------------------------------------------
    POST → OPTIONAL MANUAL LOG
----------------------------------------------------- */
export async function POST(req) {
  try {
    const body = await req.json();

    const chemUuid = safeUuid(body.chemist_id);
    const medUuid = safeUuid(body.medicine_id);
    const batchUuid = safeUuid(body.batch_id);

    if (!chemUuid || !medUuid || !body.change_type || typeof body.qty_changed !== "number") {
      return failure("Required fields missing", null, 400, { headers: corsHeaders });
    }

    const [data] = await sql`
      INSERT INTO chemist_stock_logs (chemist_id, medicine_id, batch_id, change_type, qty_changed, reason, created_at)
      VALUES (${chemUuid}, ${medUuid}, ${batchUuid}, ${body.change_type}, ${body.qty_changed}, ${body.reason || null}, NOW())
      RETURNING *
    `;

    return success("Log created", { log: data }, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("POST chemist logs error:", err);
    return failure("Failed to create log", err.message, 500, { headers: corsHeaders });
  }
}
