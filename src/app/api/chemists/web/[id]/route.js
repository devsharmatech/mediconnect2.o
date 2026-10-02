import { uploadToS3 } from "@/lib/s3";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import sql from "@/lib/db";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    if (!id || !UUID_REGEX.test(id)) {
      return failure("Chemist not found.", null, 404, { headers: corsHeaders });
    }

    const [data] = await sql`
      SELECT c.*, json_build_object('id', u.id, 'phone_number', u.phone_number, 'role', u.role, 'status', u.status) as user
      FROM chemist_details c
      LEFT JOIN users u ON u.id = c.id
      WHERE c.id = ${id}
      LIMIT 1
    `;

    if (!data) {
      return failure("Chemist not found.", null, 404, { headers: corsHeaders });
    }

    return success("Chemist details fetched successfully.", data, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Fetch Chemist Details Error:", error);
    return failure("Failed to fetch chemist details.", error.message, 500, { headers: corsHeaders });
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    if (!id || !UUID_REGEX.test(id)) {
      return failure("Invalid chemist ID.", null, 400, { headers: corsHeaders });
    }

    const formData = await req.formData();

    const updateData = {
      owner_name: formData.get("owner_name"),
      email: formData.get("email"),
      pharmacy_name: formData.get("pharmacy_name"),
      address: formData.get("address"),
      mobile: formData.get("mobile"),
      whatsapp: formData.get("whatsapp"),
      registration_no: formData.get("registration_no"),
      consent_terms: formData.get("consent_terms") === "true",
      upi_id: formData.get("upi_id"),
      updated_at: new Date(),
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || updateData[key] === null) {
        delete updateData[key];
      }
    });

    const phone_number = formData.get("phone_number");
    if (phone_number) {
      await sql`
        UPDATE users
        SET phone_number = ${phone_number}, updated_at = NOW()
        WHERE id = ${id}
      `;
    }

    // Handle file uploads with folder organization
    const uploadFile = async (fieldName, file) => {
      if (!file || file.size === 0) return null;

      const fileExt = file.name.split(".").pop();
      const fileName = `${fieldName}/${fieldName}-${Date.now()}.${fileExt}`;

      try {
        const { url } = await uploadToS3(file, `chemist-documents/${fileName}`, "application/octet-stream");
        return url;
      } catch (err) {
        console.error(`Upload error for field ${fieldName}:`, err);
        throw err;
      }
    };

    const documentFields = [
      "drug_license",
      "pharmacist_certificate",
      "pan_aadhaar",
      "gstin_certificate",
      "store_photo",
      "consent_form",
      "declaration_form",
      "digital_signature",
      "mou",
    ];

    for (const field of documentFields) {
      const file = formData.get(`${field}_file`);
      if (file && file.size > 0) {
        updateData[field] = await uploadFile(field, file);
      }
    }

    const keys = Object.keys(updateData);
    await sql`
      UPDATE chemist_details
      SET ${sql(updateData, ...keys)}
      WHERE id = ${id}
    `;

    return success("Chemist details updated successfully.", null, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Update Chemist Error:", error);
    return failure("Failed to update chemist details.", error.message, 500, { headers: corsHeaders });
  }
}

export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    if (!id || !UUID_REGEX.test(id)) {
      return failure("Invalid chemist ID.", null, 400, { headers: corsHeaders });
    }

    const { status } = await req.json();

    await sql`
      UPDATE users
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${id}
    `;

    return success("Chemist status updated successfully.", null, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Update Status Error:", error);
    return failure("Failed to change status.", error.message, 500, { headers: corsHeaders });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    if (!id || !UUID_REGEX.test(id)) {
      return failure("Invalid chemist ID.", null, 400, { headers: corsHeaders });
    }
    const ids = [id];

    await sql.begin(async (sqlTrans) => {
      // 1. Temporarily disable audit log triggers
      await sqlTrans`ALTER TABLE audit_log DISABLE TRIGGER prevent_audit_log_delete`;
      await sqlTrans`ALTER TABLE audit_log DISABLE TRIGGER prevent_audit_log_update`;

      // 2. Delete chemist stock logs
      await sqlTrans`DELETE FROM chemist_stock_logs WHERE chemist_id = ANY(${ids})`;

      // 3. Delete chemist inventory batches
      await sqlTrans`DELETE FROM chemist_inventory_batches WHERE chemist_id = ANY(${ids})`;

      // 4. Delete chemist medicines
      await sqlTrans`DELETE FROM chemist_medicines WHERE chemist_id = ANY(${ids})`;

      // 5. Delete medicine orders
      const orders = await sqlTrans`SELECT id FROM medicine_orders WHERE chemist_id = ANY(${ids})`;
      if (orders.length > 0) {
        const orderIds = orders.map(o => o.id);
        await sqlTrans`DELETE FROM medicine_order_items WHERE order_id = ANY(${orderIds})`;
        await sqlTrans`DELETE FROM medicine_orders WHERE id = ANY(${orderIds})`;
      }

      // 6. Delete medicine_order_price_history
      await sqlTrans`DELETE FROM medicine_order_price_history WHERE chemist_id = ANY(${ids})`;

      // 7. Delete from users (cascades to chemist_details)
      await sqlTrans`DELETE FROM users WHERE id = ANY(${ids})`;

      // 8. Re-enable audit log triggers
      await sqlTrans`ALTER TABLE audit_log ENABLE TRIGGER prevent_audit_log_delete`;
      await sqlTrans`ALTER TABLE audit_log ENABLE TRIGGER prevent_audit_log_update`;
    });

    return success("Chemist deleted successfully.", null, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Delete Chemist Error:", error);
    return failure("Failed to delete chemist. " + error.message, "chemist_delete_failed", 500, { headers: corsHeaders });
  }
}
