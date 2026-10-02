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

/* ---------------------------
   POST → Create medicine
----------------------------*/
export async function POST(req) {
  try {
    const body = await req.json();
    const chemUuid = safeUuid(body.chemist_id);

    if (!chemUuid) return failure("valid chemist_id is required", null, 400, { headers: corsHeaders });

    const [data] = await sql`
      INSERT INTO chemist_medicines (
        chemist_id, name, brand, category, strength, type, description, created_at, updated_at
      )
      VALUES (
        ${chemUuid}, ${body.name || ''}, ${body.brand ?? null}, ${body.category ?? null},
        ${body.strength ?? null}, ${body.type ?? null}, ${body.description ?? null}, NOW(), NOW()
      )
      RETURNING *
    `;

    return success("Medicine created", { medicine: data }, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("POST chemist medicine error:", err);
    return failure("Failed to create medicine", err.message, 500, { headers: corsHeaders });
  }
}

/* ---------------------------
   GET → LIST or FETCH SINGLE
----------------------------*/
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams;

    const chemist_id = q.get("chemist_id");
    const id = q.get("id");

    if (!chemist_id && !id)
      return failure("chemist_id or id is required", null, 400, { headers: corsHeaders });

    // Get single item
    if (id) {
      const medUuid = safeUuid(id);
      if (!medUuid) return failure("Invalid medicine ID", null, 400, { headers: corsHeaders });

      const [data] = await sql`
        SELECT * FROM chemist_medicines WHERE id = ${medUuid} LIMIT 1
      `;

      if (!data) return failure("Medicine not found", null, 404, { headers: corsHeaders });

      return success("Medicine fetched", { medicine: data }, 200, { headers: corsHeaders });
    }

    const chemUuid = safeUuid(chemist_id);
    if (!chemUuid) return failure("Invalid chemist_id", null, 400, { headers: corsHeaders });

    // Pagination + filters
    const page = Number(q.get("page")) || 1;
    const limit = Number(q.get("limit")) || 20;
    const offset = (page - 1) * limit;

    const search = q.get("search");
    const category = q.get("category");
    const type = q.get("type");

    const conditions = [sql`chemist_id = ${chemUuid}`];
    if (search) conditions.push(sql`name ILIKE ${'%' + search + '%'}`);
    if (category) conditions.push(sql`category = ${category}`);
    if (type) conditions.push(sql`type = ${type}`);

    const whereClause = sql`WHERE ${conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}`;

    const [countRes, data] = await Promise.all([
      sql`SELECT count(*)::int as count FROM chemist_medicines ${whereClause}`,
      sql`
        SELECT * FROM chemist_medicines
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    ]);

    const count = countRes[0]?.count || 0;

    return success("Medicines list", {
      pagination: {
        page,
        limit,
        total: count,
        total_pages: Math.ceil(count / limit),
      },
      data,
    }, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("GET chemist medicines error:", err);
    return failure("Failed to fetch medicines", err.message, 500, { headers: corsHeaders });
  }
}

/* ---------------------------
   PUT → Update
----------------------------*/
export async function PUT(req) {
  try {
    const body = await req.json();
    const id = safeUuid(body.id);
    const chemist_id = safeUuid(body.chemist_id);

    if (!id || !chemist_id)
      return failure("valid id and chemist_id are required", null, 400, { headers: corsHeaders });

    const updatePayload = { updated_at: new Date() };
    ["name", "brand", "category", "strength", "type", "description"].forEach((k) => {
      if (k in body) updatePayload[k] = body[k];
    });

    const keys = Object.keys(updatePayload);
    const [data] = await sql`
      UPDATE chemist_medicines
      SET ${sql(updatePayload, ...keys)}
      WHERE id = ${id} AND chemist_id = ${chemist_id}
      RETURNING *
    `;

    if (!data) return failure("Medicine not found", null, 404, { headers: corsHeaders });

    return success("Medicine updated", { medicine: data }, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("PUT chemist medicine error:", err);
    return failure("Failed to update medicine", err.message, 500, { headers: corsHeaders });
  }
}

/* ---------------------------
   DELETE → id from body or url
----------------------------*/
export async function DELETE(req) {
  try {
    const url = new URL(req.url);
    let body = {};

    try {
      body = await req.json();
    } catch {}

    const id = safeUuid(body.id || url.searchParams.get("id"));
    const chemist_id = safeUuid(body.chemist_id || url.searchParams.get("chemist_id"));

    if (!id || !chemist_id)
      return failure("valid id and chemist_id are required", null, 400, { headers: corsHeaders });

    const [data] = await sql`
      DELETE FROM chemist_medicines
      WHERE id = ${id} AND chemist_id = ${chemist_id}
      RETURNING *
    `;

    return success("Medicine deleted", { medicine: data || null }, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("DELETE chemist medicine error:", err);
    return failure("Failed to delete medicine", err.message, 500, { headers: corsHeaders });
  }
}
