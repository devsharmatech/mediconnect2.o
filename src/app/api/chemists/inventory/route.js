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
    GET → INVENTORY LIST (AGGREGATED FROM BATCHES)
----------------------------------------------------- */
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const chemist_id = url.searchParams.get("chemist_id");
    const search = url.searchParams.get("search") || "";
    const page = Number(url.searchParams.get("page")) || 1;
    const limit = Number(url.searchParams.get("limit")) || 10;
    const offset = (page - 1) * limit;

    const chemUuid = safeUuid(chemist_id);
    if (!chemUuid) return failure("valid chemist_id is required", null, 400, { headers: corsHeaders });

    const conditions = [sql`m.chemist_id = ${chemUuid}`];
    if (search) {
      conditions.push(sql`m.name ILIKE ${'%' + search + '%'}`);
    }

    const whereClause = sql`WHERE ${conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}`;

    const [countRes, inventory] = await Promise.all([
      sql`SELECT count(*)::int as count FROM chemist_medicines m ${whereClause}`,
      sql`
        SELECT 
          m.id,
          m.name,
          m.brand,
          m.category,
          m.strength,
          m.type,
          m.description,
          COALESCE(SUM(b.stock_qty), 0)::int as total_stock,
          COUNT(b.id)::int as batch_count,
          MIN(b.expiry_date) as nearest_expiry,
          MIN(b.selling_price) as min_price,
          MAX(b.selling_price) as max_price
        FROM chemist_medicines m
        LEFT JOIN chemist_inventory_batches b ON b.medicine_id = m.id AND b.chemist_id = m.chemist_id
        ${whereClause}
        GROUP BY m.id
        ORDER BY m.name ASC
        LIMIT ${limit} OFFSET ${offset}
      `
    ]);

    const count = countRes[0]?.count || 0;

    return success("Inventory loaded", {
      pagination: {
        page,
        limit,
        total: count,
        total_pages: Math.ceil(count / limit),
      },
      data: inventory,
    }, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("GET chemist inventory error:", err);
    return failure("Failed to load inventory", err.message, 500, { headers: corsHeaders });
  }
}

export function POST() {
  return failure("Inventory can't be created manually", null, 400, { headers: corsHeaders });
}
export function PUT() {
  return failure("Inventory can't be updated directly", null, 400, { headers: corsHeaders });
}
export function DELETE() {
  return failure("Inventory can't be deleted", null, 400, { headers: corsHeaders });
}
