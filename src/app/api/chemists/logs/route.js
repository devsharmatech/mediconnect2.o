import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
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

    if (!chemist_id) return failure("chemist_id required");

    // Main query with JOINS
    let q = supabase
      .from("chemist_stock_logs")
      .select(
        `
          *,
          medicine:chemist_medicines (
            id,
            name,
            brand,
            strength,
            type
          ),
          batch:chemist_inventory_batches (
            id,
            batch_no,
            expiry_date
          )
        `,
        { count: "exact" }
      )
      .eq("chemist_id", chemist_id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (medicine_id) q = q.eq("medicine_id", medicine_id);
    if (batch_id) q = q.eq("batch_id", batch_id);
    if (change_type) q = q.eq("change_type", change_type);

    const { data, error, count } = await q;
    if (error) throw error;

    return success("Logs loaded", {
      pagination: {
        page,
        limit,
        total: count,
        total_pages: Math.ceil(count / limit),
      },
      logs: data,
    });
  } catch (err) {
    return failure("Failed to fetch logs", err.message);
  }
}

/* -----------------------------------------------------
    POST → OPTIONAL MANUAL LOG
----------------------------------------------------- */
export async function POST(req) {
  try {
    const body = await req.json();

    if (
      !body.chemist_id ||
      !body.medicine_id ||
      !body.change_type ||
      typeof body.qty_changed !== "number"
    ) {
      return failure("Required fields missing");
    }

    const { data, error } = await supabase
      .from("chemist_stock_logs")
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    return success("Log created", { log: data });
  } catch (err) {
    return failure("Failed to create log", err.message);
  }
}
