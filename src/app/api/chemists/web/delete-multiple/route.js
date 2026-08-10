import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import sql from "@/lib/db";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { ids } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return failure("No chemist IDs provided.", null, 400, { headers: corsHeaders });
    }

    await sql.begin(async (sqlTrans) => {
      // 1. Temporarily disable audit log triggers
      await sqlTrans`ALTER TABLE audit_log DISABLE TRIGGER prevent_audit_log_delete`;
      await sqlTrans`ALTER TABLE audit_log DISABLE TRIGGER prevent_audit_log_update`;

      // 2. Delete chemist stock logs
      await sqlTrans`DELETE FROM chemist_stock_logs WHERE chemist_id = ANY(${ids})`;

      // 3. Delete chemist inventory batches
      await sqlTrans`DELETE FROM chemist_inventory_batches WHERE chemist_id = ANY(${ids})`;

      // 4. Delete chemist inventory
      await sqlTrans`DELETE FROM chemist_inventory WHERE chemist_id = ANY(${ids})`;

      // 5. Delete chemist medicines
      await sqlTrans`DELETE FROM chemist_medicines WHERE chemist_id = ANY(${ids})`;

      // 6. Delete medicine orders
      const orders = await sqlTrans`SELECT id FROM medicine_orders WHERE chemist_id = ANY(${ids})`;
      if (orders.length > 0) {
        const orderIds = orders.map(o => o.id);
        // Delete medicine_order_items
        await sqlTrans`DELETE FROM medicine_order_items WHERE order_id = ANY(${orderIds})`;
        // Delete medicine_orders
        await sqlTrans`DELETE FROM medicine_orders WHERE id = ANY(${orderIds})`;
      }

      // 7. Delete medicine_order_price_history
      await sqlTrans`DELETE FROM medicine_order_price_history WHERE chemist_id = ANY(${ids})`;

      // 8. Delete from users (cascades to chemist_details)
      await sqlTrans`DELETE FROM users WHERE id = ANY(${ids})`;

      // 9. Re-enable audit log triggers
      await sqlTrans`ALTER TABLE audit_log ENABLE TRIGGER prevent_audit_log_delete`;
      await sqlTrans`ALTER TABLE audit_log ENABLE TRIGGER prevent_audit_log_update`;
    });

    return success("Selected chemists deleted successfully.", null, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Bulk Delete Chemists Error:", error);
    return failure("Failed to delete chemists. " + error.message, "chemist_bulk_delete_failed", 500, { headers: corsHeaders });
  }
}
