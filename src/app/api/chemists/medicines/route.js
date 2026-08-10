import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/* ---------------------------
   POST → Create medicine
   chemist_id comes from BODY
----------------------------*/
export async function POST(req) {
  try {
    const body = await req.json();
    const chemist_id = body.chemist_id;

    if (!chemist_id) return failure("chemist_id is required");

    const payload = {
      chemist_id,
      name: body.name,
      brand: body.brand ?? null,
      category: body.category ?? null,
      strength: body.strength ?? null,
      type: body.type ?? null,
      description: body.description ?? null,
    };

    const { data, error } = await supabase
      .from("chemist_medicines")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return success("Medicine created", { medicine: data });
  } catch (err) {
    return failure("Failed to create medicine", err.message);
  }
}

/* ---------------------------
   GET → LIST or FETCH SINGLE
   chemist_id must come from URL
----------------------------*/
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams;

    const chemist_id = q.get("chemist_id");
    const id = q.get("id");

    if (!chemist_id && !id)
      return failure("chemist_id or id is required");

    // Get single item
    if (id) {
      const { data, error } = await supabase
        .from("chemist_medicines")
        .select()
        .eq("id", id)
        .single();

      if (error) throw error;

      return success("Medicine fetched", { medicine: data });
    }

    // Pagination + filters
    const page = Number(q.get("page")) || 1;
    const limit = Number(q.get("limit")) || 20;
    const offset = (page - 1) * limit;

    const search = q.get("search");
    const category = q.get("category");
    const type = q.get("type");

    let query = supabase
      .from("chemist_medicines")
      .select("*", { count: "exact" })
      .eq("chemist_id", chemist_id)
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (search) query = query.ilike("name", `%${search}%`);
    if (category) query = query.eq("category", category);
    if (type) query = query.eq("type", type);

    const { data, error, count } = await query;
    if (error) throw error;

    return success("Medicines list", {
      pagination: {
        page,
        limit,
        total: count,
        total_pages: Math.ceil(count / limit),
      },
      data,
    });
  } catch (err) {
    return failure("Failed to fetch medicines", err.message);
  }
}

/* ---------------------------
   PUT → Update
   chemist_id comes from BODY
----------------------------*/
export async function PUT(req) {
  try {
    const body = await req.json();
    const id = body.id;
    const chemist_id = body.chemist_id;

    if (!id || !chemist_id)
      return failure("id and chemist_id are required");

    const updatePayload = {};
    ["name", "brand", "category", "strength", "type", "description"].forEach(
      (k) => {
        if (k in body) updatePayload[k] = body[k];
      }
    );

    updatePayload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("chemist_medicines")
      .update(updatePayload)
      .eq("id", id)
      .eq("chemist_id", chemist_id)
      .select()
      .single();

    if (error) throw error;

    return success("Medicine updated", { medicine: data });
  } catch (err) {
    return failure("Failed to update medicine", err.message);
  }
}

/* ---------------------------
   DELETE → id from body or url
   chemist_id must come from BODY
----------------------------*/
export async function DELETE(req) {
  try {
    const url = new URL(req.url);
    let body = {};

    try {
      body = await req.json();
    } catch {}

    const id = body.id || url.searchParams.get("id");
    const chemist_id = body.chemist_id;

    if (!id || !chemist_id)
      return failure("id and chemist_id are required");

    const { data, error } = await supabase
      .from("chemist_medicines")
      .delete()
      .eq("id", id)
      .eq("chemist_id", chemist_id)
      .select()
      .single();

    if (error) throw error;

    return success("Medicine deleted", { medicine: data });
  } catch (err) {
    return failure("Failed to delete medicine", err.message);
  }
}
