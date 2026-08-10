import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/* -----------------------------------------------------
    CREATE A STOCK LOG ENTRY
----------------------------------------------------- */
async function writeLog({ chemist_id, medicine_id, batch_id, change_type, qty, reason }) {
  await supabase.from("chemist_stock_logs").insert({
    chemist_id,
    medicine_id,
    batch_id,
    change_type,
    qty_changed: qty,
    reason,
  });
}

/* -----------------------------------------------------
    POST → CREATE BATCH
----------------------------------------------------- */
export async function POST(req) {
  try {
    const body = await req.json();
    const { chemist_id, medicine_id, batch_no, expiry_date, stock_qty, purchase_price, selling_price } = body;

    if (!chemist_id || !medicine_id) return failure("chemist_id and medicine_id required");

    const payload = {
      chemist_id,
      medicine_id,
      batch_no,
      expiry_date,
      stock_qty: stock_qty || 0,
      purchase_price,
      selling_price,
    };

    const { data, error } = await supabase
      .from("chemist_inventory_batches")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    if (stock_qty > 0) {
      await writeLog({
        chemist_id,
        medicine_id,
        batch_id: data.id,
        change_type: "stock_in",
        qty: stock_qty,
        reason: "initial_stock",
      });
    }

    return success("Batch created", { batch: data });
  } catch (err) {
    return failure("Failed to create batch", err.message);
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

    if (!chemist_id) return failure("chemist_id required");

    // ----------------------------------------------
    // GET SINGLE BATCH (with medicine info)
    // ----------------------------------------------
    if (id) {
      const { data, error } = await supabase
        .from("chemist_inventory_batches")
        .select(
          `
            *,
            medicine:chemist_medicines (
              id,
              name,
              brand,
              category,
              strength,
              type
            )
          `
        )
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;

      return success("Batch fetched", { batch: data });
    }

    // ----------------------------------------------
    // GET LIST OF BATCHES (with medicine info)
    // ----------------------------------------------
    let query = supabase
      .from("chemist_inventory_batches")
      .select(
        `
          *,
          medicine:chemist_medicines (
            id,
            name,
            brand,
            category,
            strength,
            type
          )
        `,
        { count: "exact" }
      )
      .eq("chemist_id", chemist_id)
      .range(offset, offset + limit - 1)
      .order("expiry_date", { ascending: true });

    if (medicine_id) query = query.eq("medicine_id", medicine_id);
    if (search) query = query.ilike("batch_no", `%${search}%`);

    const { data, error, count } = await query;
    if (error) throw error;

    return success("Batches loaded", {
      pagination: {
        page,
        limit,
        total: count,
        total_pages: Math.ceil(count / limit),
      },
      data,
    });
  } catch (err) {
    return failure("Failed to fetch batches", err.message);
  }
}


/* -----------------------------------------------------
    PUT → UPDATE BATCH + LOG STOCK CHANGE
----------------------------------------------------- */
export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, chemist_id, stock_qty, reason } = body;

    if (!id || !chemist_id) return failure("id and chemist_id required");

    const { data: old, error: e1 } = await supabase
      .from("chemist_inventory_batches")
      .select()
      .eq("id", id)
      .single();

    if (e1) throw e1;

    const payload = { ...body };
    delete payload.id;

    const { data, error } = await supabase
      .from("chemist_inventory_batches")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Stock difference → log it
    if (typeof stock_qty === "number") {
      const diff = stock_qty - old.stock_qty;

      if (diff !== 0) {
        await writeLog({
          chemist_id,
          medicine_id: old.medicine_id,
          batch_id: id,
          change_type: diff > 0 ? "stock_in" : "stock_out",
          qty: Math.abs(diff),
          reason: reason || "manual_update",
        });
      }
    }

    return success("Batch updated", { batch: data });
  } catch (err) {
    return failure("Failed to update batch", err.message);
  }
}

/* -----------------------------------------------------
    DELETE → REMOVE BATCH + LOG STOCK REMOVAL
----------------------------------------------------- */
export async function DELETE(req) {
  try {
    const body = await req.json();
    const { id, chemist_id } = body;

    if (!id || !chemist_id) return failure("id and chemist_id required");

    const { data: old, error: e1 } = await supabase
      .from("chemist_inventory_batches")
      .select()
      .eq("id", id)
      .single();

    if (e1) throw e1;

    const { error } = await supabase
      .from("chemist_inventory_batches")
      .delete()
      .eq("id", id);

    if (error) throw error;

    // Log termination of stock
    if (old.stock_qty > 0) {
      await writeLog({
        chemist_id,
        medicine_id: old.medicine_id,
        batch_id: id,
        change_type: "adjustment",
        qty: old.stock_qty,
        reason: "batch_deleted",
      });
    }

    return success("Batch deleted");
  } catch (err) {
    return failure("Failed to delete batch", err.message);
  }
}
