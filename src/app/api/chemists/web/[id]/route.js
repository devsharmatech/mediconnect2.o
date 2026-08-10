import { supabase } from "@/lib/supabaseAdmin";
import { uploadToS3 } from "@/lib/s3";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import sql from "@/lib/db";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from("chemist_details")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return failure("Chemist not found.", null, 404, { headers: corsHeaders });
      }
      throw error;
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
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || updateData[key] === null) {
        delete updateData[key];
      }
    });

    const phone_number = formData.get("phone_number");
    if (phone_number) {
      const { data: chemistData } = await supabase
        .from("chemist_details")
        .select("user_id")
        .eq("id", id)
        .single();
        
      if (chemistData?.user_id) {
        await supabase
          .from("users")
          .update({ phone_number })
          .eq("id", chemistData.user_id);
      }
    }

    // Handle file uploads with folder organization
    const uploadFile = async (fieldName, file) => {
      if (!file || file.size === 0) return null;

      const fileExt = file.name.split(".").pop();
      // Organize by user ID and document type folder
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

    const { error } = await supabase
      .from("chemist_details")
      .update(updateData)
      .eq("id", id);

    if (error) throw error;

    return success("Chemist details updated successfully.", null, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Update Chemist Error:", error);
    return failure("Failed to update chemist details.", error.message, 500, { headers: corsHeaders });
  }
}

export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const { status } = await req.json();

    const { error } = await supabase.from("users").update({ status }).eq("id", id);
    if (error) throw error;

    return success("Chemist status updated successfully.", null, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Update Status Error:", error);
    return failure("Failed to change status.", error.message, 500, { headers: corsHeaders });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const ids = [id];

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

    return success("Chemist deleted successfully.", null, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Delete Chemist Error:", error);
    return failure("Failed to delete chemist. " + error.message, "chemist_delete_failed", 500, { headers: corsHeaders });
  }
}
