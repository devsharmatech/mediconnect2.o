import sql from "@/lib/db";
import { deleteMultipleFromS3 } from "@/lib/s3";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

const safeUuid = (val) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ? val : null);

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/* -------------------- GET Lab Details -------------------- */
export async function GET(_, { params }) {
  try {
    const { id } = await params;
    const cleanId = safeUuid(id);
    if (!cleanId) {
      return failure("Missing or invalid lab ID.", "validation_error", 400, { headers: corsHeaders });
    }

    const rows = await sql`
      SELECT 
        ld.*,
        json_build_object(
          'id', u.id,
          'phone_number', u.phone_number,
          'profile_picture', u.profile_picture,
          'role', u.role
        ) as users
      FROM lab_details ld
      JOIN users u ON u.id = ld.id
      WHERE ld.id = ${cleanId}
      LIMIT 1
    `;

    if (!rows.length) {
      return failure("Lab not found.", "not_found", 404, { headers: corsHeaders });
    }

    return success("Lab details fetched successfully.", rows[0], 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("GET Lab Details Error:", error);
    return failure("Failed to fetch lab details. " + error.message, "lab_details_failed", 500, {
      headers: corsHeaders,
    });
  }
}

/* -------------------- DELETE Lab (remove DB + all docs) -------------------- */
export async function DELETE(_, { params }) {
  try {
    const { id } = await params;
    const cleanId = safeUuid(id);
    if (!cleanId) {
      return failure("Missing or invalid lab ID.", "validation_error", 400, { headers: corsHeaders });
    }

    // Fetch all document URLs before deletion
    const labRows = await sql`
      SELECT pan_card_url, aadhaar_card_url, lab_license_url, gst_certificate_url, owner_photo_url, signature_url
      FROM lab_details
      WHERE id = ${cleanId}
      LIMIT 1
    `;

    if (!labRows.length) {
      return failure("Lab not found.", "not_found", 404, { headers: corsHeaders });
    }

    const lab = labRows[0];

    await sql.begin(async (tx) => {
      const orders = await tx`SELECT id FROM lab_test_orders WHERE lab_id = ${cleanId}`;
      if (orders.length > 0) {
        const orderIds = orders.map(o => o.id);
        await tx`DELETE FROM lab_test_order_items WHERE order_id = ANY(${orderIds})`;
        await tx`DELETE FROM lab_payment_logs WHERE order_id = ANY(${orderIds})`;
        await tx`DELETE FROM lab_test_orders WHERE id = ANY(${orderIds})`;
      }

      await tx`DELETE FROM lab_reports WHERE lab_id = ${cleanId}`;
      await tx`DELETE FROM lab_payment_logs WHERE lab_id = ${cleanId}`;
      await tx`DELETE FROM lab_tests WHERE lab_id = ${cleanId}`;
      await tx`DELETE FROM lab_details WHERE id = ${cleanId}`;
      await tx`DELETE FROM users WHERE id = ${cleanId}`;
    });

    // Remove documents from storage
    const paths = Object.values(lab)
      .filter((url) => url && typeof url === "string" && url.includes("/lab-documents/"))
      .map((url) => url.split("/lab-documents/")[1]);

    if (paths.length) {
      await deleteMultipleFromS3(paths.map(p => `lab-documents/${p}`)).catch(() => {});
    }

    return success("Lab and associated documents deleted.", { id: cleanId }, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Delete lab error:", error);
    return failure("Failed to delete lab. " + error.message, "lab_delete_failed", 500, {
      headers: corsHeaders,
    });
  }
}
