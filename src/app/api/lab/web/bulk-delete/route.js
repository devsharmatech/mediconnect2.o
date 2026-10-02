import sql from "@/lib/db";
import { deleteMultipleFromS3 } from "@/lib/s3";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

const safeUuid = (val) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ? val : null);

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { ids } = await req.json();
    if (!Array.isArray(ids) || !ids.length) {
      return failure("No lab IDs provided.", "validation_error", 400, {
        headers: corsHeaders,
      });
    }

    const cleanIds = ids.map(safeUuid).filter(Boolean);
    if (!cleanIds.length) {
      return failure("No valid lab IDs provided.", "validation_error", 400, {
        headers: corsHeaders,
      });
    }

    const labs = await sql`
      SELECT pan_card_url, aadhaar_card_url, lab_license_url, gst_certificate_url, owner_photo_url, signature_url
      FROM lab_details
      WHERE id = ANY(${cleanIds})
    `;

    // Perform database deletions in transaction
    await sql.begin(async (tx) => {
      // 1. Find orders for these labs
      const orders = await tx`SELECT id FROM lab_test_orders WHERE lab_id = ANY(${cleanIds})`;
      if (orders.length > 0) {
        const orderIds = orders.map(o => o.id);
        await tx`DELETE FROM lab_test_order_items WHERE order_id = ANY(${orderIds})`;
        await tx`DELETE FROM lab_payment_logs WHERE order_id = ANY(${orderIds})`;
        await tx`DELETE FROM lab_test_orders WHERE id = ANY(${orderIds})`;
      }

      await tx`DELETE FROM lab_reports WHERE lab_id = ANY(${cleanIds})`;
      await tx`DELETE FROM lab_payment_logs WHERE lab_id = ANY(${cleanIds})`;
      await tx`DELETE FROM lab_tests WHERE lab_id = ANY(${cleanIds})`;
      await tx`DELETE FROM lab_details WHERE id = ANY(${cleanIds})`;
      await tx`DELETE FROM users WHERE id = ANY(${cleanIds})`;
    });

    const paths = labs
      .flatMap((lab) =>
        Object.values(lab)
          .filter((url) => url && typeof url === "string" && url.includes("/lab-documents/"))
          .map((url) => url.split("/lab-documents/")[1])
      )
      .filter(Boolean);

    if (paths.length) {
      await deleteMultipleFromS3(paths.map(p => `lab-documents/${p}`)).catch(() => {});
    }

    return success("Labs and documents deleted successfully.", { deleted: cleanIds }, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Lab bulk delete error:", error);
    return failure("Failed to delete labs. " + error.message, "lab_bulk_delete_failed", 500, {
      headers: corsHeaders,
    });
  }
}
