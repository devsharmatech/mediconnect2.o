import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

const safeUuid = (val) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ? val : null);

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const labId = safeUuid(searchParams.get("lab_id"));

    if (!labId) {
      return failure("Valid lab_id is required", null, 400, { headers: corsHeaders });
    }

    const collectors = await sql`
      SELECT 
        id,
        unid,
        lab_id,
        name,
        phone,
        email,
        vehicle_info,
        employee_id,
        is_active,
        notes,
        created_at,
        updated_at,
        (
          SELECT COUNT(*)::int 
          FROM lab_test_orders 
          WHERE technician_id = lab_sample_collectors.id 
            AND status IN ('technician_assigned', 'approved')
        ) as active_assignments_count,
        (
          SELECT COUNT(*)::int 
          FROM lab_test_orders 
          WHERE technician_id = lab_sample_collectors.id
        ) as total_completed_count
      FROM lab_sample_collectors
      WHERE lab_id = ${labId}
      ORDER BY created_at DESC
    `;

    return success("Sample collectors fetched successfully", collectors, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("GET /api/lab/collectors error:", err);
    return failure("Failed to fetch collectors", err.message, 500, { headers: corsHeaders });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { lab_id, name, phone, email, vehicle_info, employee_id, notes } = body;

    const cleanLabId = safeUuid(lab_id);
    if (!cleanLabId) {
      return failure("Valid lab_id is required", null, 400, { headers: corsHeaders });
    }

    if (!name?.trim()) {
      return failure("Collector name is required", null, 400, { headers: corsHeaders });
    }

    if (!phone?.trim()) {
      return failure("Collector phone number is required", null, 400, { headers: corsHeaders });
    }

    const inserted = await sql`
      INSERT INTO lab_sample_collectors (
        lab_id,
        name,
        phone,
        email,
        vehicle_info,
        employee_id,
        notes,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        ${cleanLabId},
        ${name.trim()},
        ${phone.trim()},
        ${email?.trim() || null},
        ${vehicle_info?.trim() || null},
        ${employee_id?.trim() || null},
        ${notes?.trim() || null},
        TRUE,
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    return success("Sample collector added successfully", inserted[0], 201, { headers: corsHeaders });
  } catch (err) {
    console.error("POST /api/lab/collectors error:", err);
    return failure("Failed to add collector", err.message, 500, { headers: corsHeaders });
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json();
    const { id, lab_id, name, phone, email, vehicle_info, employee_id, notes, is_active } = body;

    const cleanId = safeUuid(id);
    const cleanLabId = safeUuid(lab_id);

    if (!cleanId || !cleanLabId) {
      return failure("Valid collector id and lab_id are required", null, 400, { headers: corsHeaders });
    }

    const updated = await sql`
      UPDATE lab_sample_collectors
      SET
        name = COALESCE(${name?.trim() || null}, name),
        phone = COALESCE(${phone?.trim() || null}, phone),
        email = ${email !== undefined ? (email?.trim() || null) : sql`email`},
        vehicle_info = ${vehicle_info !== undefined ? (vehicle_info?.trim() || null) : sql`vehicle_info`},
        employee_id = ${employee_id !== undefined ? (employee_id?.trim() || null) : sql`employee_id`},
        notes = ${notes !== undefined ? (notes?.trim() || null) : sql`notes`},
        is_active = ${is_active !== undefined ? Boolean(is_active) : sql`is_active`},
        updated_at = NOW()
      WHERE id = ${cleanId} AND lab_id = ${cleanLabId}
      RETURNING *
    `;

    if (!updated.length) {
      return failure("Collector not found or unauthorized", null, 404, { headers: corsHeaders });
    }

    return success("Sample collector updated successfully", updated[0], 200, { headers: corsHeaders });
  } catch (err) {
    console.error("PATCH /api/lab/collectors error:", err);
    return failure("Failed to update collector", err.message, 500, { headers: corsHeaders });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = safeUuid(searchParams.get("id"));
    const labId = safeUuid(searchParams.get("lab_id"));

    if (!id || !labId) {
      return failure("Valid id and lab_id are required", null, 400, { headers: corsHeaders });
    }

    const deleted = await sql`
      DELETE FROM lab_sample_collectors
      WHERE id = ${id} AND lab_id = ${labId}
      RETURNING id, name
    `;

    if (!deleted.length) {
      return failure("Collector not found or unauthorized", null, 404, { headers: corsHeaders });
    }

    return success("Collector removed successfully", deleted[0], 200, { headers: corsHeaders });
  } catch (err) {
    console.error("DELETE /api/lab/collectors error:", err);
    return failure("Failed to delete collector", err.message, 500, { headers: corsHeaders });
  }
}
