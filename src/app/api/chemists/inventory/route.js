import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/* -----------------------------------------------------
    GET → INVENTORY LIST (GENERATED FROM BATCHES)
----------------------------------------------------- */
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const chemist_id = url.searchParams.get("chemist_id");
    const search = url.searchParams.get("search") || "";
    const page = Number(url.searchParams.get("page")) || 1;
    const limit = Number(url.searchParams.get("limit")) || 10;
    const offset = (page - 1) * limit;

    if (!chemist_id) return failure("chemist_id is required");

    // Step 1: Select total stock per medicine
    const { data: inventory, error } = await supabase
      .rpc("chemist_inventory_view", {
        chemist_id_input: chemist_id,
        search_input: search,
        offset_input: offset,
        limit_input: limit
      });

    if (error) throw error;

    // Step 2: Count total items
    const { count, error: countErr } = await supabase
      .from("chemist_medicines")
      .select("*", { count: "exact", head: true })
      .eq("chemist_id", chemist_id)
      .ilike("name", `%${search}%`);

    if (countErr) throw countErr;

    return success("Inventory loaded", {
      pagination: {
        page,
        limit,
        total: count,
        total_pages: Math.ceil(count / limit),
      },
      data: inventory,
    });
  } catch (err) {
    return failure("Failed to load inventory", err.message);
  }
}

/* -----------------------------------------------------
    POST, PUT, DELETE → NOT USED FOR INVENTORY
----------------------------------------------------- */
export function POST() {
  return failure("Inventory can't be created manually");
}
export function PUT() {
  return failure("Inventory can't be updated directly");
}
export function DELETE() {
  return failure("Inventory can't be deleted");
}
