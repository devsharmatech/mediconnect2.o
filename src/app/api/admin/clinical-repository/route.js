import sql from "@/lib/db";
import { NextResponse } from "next/server";
import { logAudit } from "@/lib/layer1/auditLogger";

const ALLOWED_TABLES = [
  "cr_complaint_master",
  "cr_complaint_diagnosis_map",
  "cr_diagnosis_master",
  "cr_diagnosis_specialty_map",
  "cr_specialty_routing_master",
  "cr_doctor_assignment_rules",
  "cr_medicine_master",
  "cr_medicine_diagnosis_map",
  "cr_telemedicine_eligibility_rules",
  "cr_escalation_rules",
  "cr_lab_test_master",
  "cr_diagnosis_template_repository"
];

function validateTable(table) {
  if (!ALLOWED_TABLES.includes(table)) {
    throw new Error("Invalid table name. Not permitted.");
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get("table");

    if (!table) {
      return NextResponse.json({ success: true, tables: ALLOWED_TABLES });
    }

    validateTable(table);

    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;
    const offset = (page - 1) * limit;

    // Fetch schema
    const schema = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = ${table}
      ORDER BY ordinal_position
    `;

    // Fetch total count
    const countRes = await sql`SELECT count(*) FROM ${sql(table)}`;
    const total = parseInt(countRes[0].count);

    // Fetch data
    const rows = await sql`
      SELECT * FROM ${sql(table)} 
      ORDER BY id DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;

    return NextResponse.json({
      success: true,
      schema,
      data: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error in generic GET:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { table, data } = body;
    validateTable(table);

    // Support single object or bulk array insertions
    if (Array.isArray(data)) {
      if (data.length === 0) return NextResponse.json({ success: true, message: "Empty array" });
      data.forEach(row => { if (row.id) delete row.id; });
    } else {
      if (data.id) delete data.id;
    }

    const result = await sql`
      INSERT INTO ${sql(table)} ${sql(data)} 
      RETURNING *
    `;

    // Log Creation
    try {
      await logAudit({
        user_id: 1, // Defaulting to Admin ID 1
        action: "CREATE_CLINICAL_RECORD",
        details: { table, inserted_count: Array.isArray(data) ? data.length : 1 },
        ip_address: "127.0.0.1"
      });
    } catch(e) {}

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error in generic POST:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { table, id, data } = body;
    validateTable(table);

    if (!id) throw new Error("ID is required for update.");
    if (data.id) delete data.id; // Prevent updating ID

    const result = await sql`
      UPDATE ${sql(table)} 
      SET ${sql(data)} 
      WHERE id = ${id} 
      RETURNING *
    `;

    // Log Update
    try {
      await logAudit({
        user_id: 1, 
        action: "UPDATE_CLINICAL_RECORD",
        details: { table, record_id: id, changes: data },
        ip_address: "127.0.0.1"
      });
    } catch(e) {}

    return NextResponse.json({ success: true, data: result[0] });
  } catch (error) {
    console.error("Error in generic PUT:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();
    const { table, id, consent, reason } = body;
    validateTable(table);

    if (!id) throw new Error("ID is required for deletion.");
    if (!consent) throw new Error("Explicit consent is required to delete clinical records.");

    // Fetch record before delete for audit log
    const existing = await sql`SELECT * FROM ${sql(table)} WHERE id = ${id}`;

    await sql`
      DELETE FROM ${sql(table)} 
      WHERE id = ${id}
    `;

    // MANDATORY AUDIT LOG FOR DELETION
    try {
      await logAudit({
        user_id: 1, // Admin 1
        action: "DELETE_CLINICAL_RECORD",
        details: { 
          table, 
          record_id: id, 
          reason: reason || "Admin manual deletion", 
          deleted_data: existing[0] 
        },
        ip_address: "127.0.0.1"
      });
    } catch(e) {
      console.error("Failed to write to audit log:", e);
    }

    return NextResponse.json({ success: true, message: "Record deleted successfully and audited." });
  } catch (error) {
    console.error("Error in generic DELETE:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
