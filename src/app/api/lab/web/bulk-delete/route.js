import { supabase } from "@/lib/supabaseAdmin";
import { deleteMultipleFromS3, extractKeyFromUrl } from "@/lib/s3";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import sql from "@/lib/db";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { ids } = await req.json();
    if (!Array.isArray(ids) || !ids.length)
      return failure("No lab IDs provided.", "validation_error", 400, {
        headers: corsHeaders,
      });

    const { data: labs, error: fetchErr } = await supabase
      .from("lab_details")
      .select("pan_card_url, aadhaar_card_url, lab_license_url, gst_certificate_url, owner_photo_url, signature_url")
      .in("id", ids);
    if (fetchErr) throw fetchErr;

    await sql.begin(async (sqlTrans) => {
      // 1. Temporarily disable audit log triggers
      await sqlTrans`ALTER TABLE audit_log DISABLE TRIGGER prevent_audit_log_delete`;
      await sqlTrans`ALTER TABLE audit_log DISABLE TRIGGER prevent_audit_log_update`;

      // 2. Find and delete lab test orders
      const orders = await sqlTrans`SELECT id FROM lab_test_orders WHERE lab_id = ANY(${ids})`;
      if (orders.length > 0) {
        const orderIds = orders.map(o => o.id);
        // Delete lab_test_order_items
        await sqlTrans`DELETE FROM lab_test_order_items WHERE order_id = ANY(${orderIds})`;
        // Delete lab_payment_logs (associated with orders)
        await sqlTrans`DELETE FROM lab_payment_logs WHERE order_id = ANY(${orderIds})`;
        // Delete lab_test_orders (lab_order_consents will cascade delete)
        await sqlTrans`DELETE FROM lab_test_orders WHERE id = ANY(${orderIds})`;
      }

      // 3. Delete other lab-related records with NO ACTION / RESTRICT
      await sqlTrans`DELETE FROM lab_reports WHERE lab_id = ANY(${ids})`;
      await sqlTrans`DELETE FROM lab_payment_logs WHERE lab_id = ANY(${ids})`;

      // 4. Delete from users (will cascade to lab_details, lab_tests, lab_activity_logs)
      await sqlTrans`DELETE FROM users WHERE id = ANY(${ids})`;

      // 5. Re-enable audit log triggers
      await sqlTrans`ALTER TABLE audit_log ENABLE TRIGGER prevent_audit_log_delete`;
      await sqlTrans`ALTER TABLE audit_log ENABLE TRIGGER prevent_audit_log_update`;
    });

    const paths = labs
      .flatMap((lab) =>
        Object.values(lab)
          .filter((url) => url)
          .map((url) => url.split("/lab-documents/")[1])
      )
      .filter(Boolean);

    if (paths.length)
      await deleteMultipleFromS3((paths || []).map(p => `lab-documents/${p}`));

    return success("Labs and documents deleted successfully.", { deleted: ids }, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    return failure("Failed to delete labs. " + error.message, "lab_bulk_delete_failed", 500, {
      headers: corsHeaders,
    });
  }
}
