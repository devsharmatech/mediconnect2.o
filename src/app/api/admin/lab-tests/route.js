import sql from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const q = searchParams.get("q") || "";
    const category = searchParams.get("category") || "";
    const labId = searchParams.get("lab_id") || "";

    const offset = (page - 1) * limit;

    // Fetch registered labs list for dropdown
    const labsList = await sql`
      SELECT id, lab_name, owner_name 
      FROM lab_details 
      ORDER BY lab_name ASC
    `;

    let selectedLabInfo = null;
    let data = [];
    let count = 0;
    let activeCount = 0;

    if (labId) {
      // 1. Filter by specific lab from `lab_tests`
      const labInfoRes = await sql`
        SELECT id, lab_name, owner_name 
        FROM lab_details 
        WHERE id = ${labId} 
        LIMIT 1
      `;
      selectedLabInfo = labInfoRes[0] || null;

      const conditions = [sql`lt.lab_id = ${labId}`];
      if (q) {
        conditions.push(sql`(lt.test_name ILIKE ${'%' + q + '%'} OR lt.test_code ILIKE ${'%' + q + '%'})`);
      }
      if (category) {
        conditions.push(sql`lt.commission_category = ${category}`);
      }

      const whereClause = sql`WHERE ${conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}`;

      const [countRes, activeRes, rows] = await Promise.all([
        sql`SELECT count(*)::int as count FROM lab_tests lt ${whereClause}`,
        sql`SELECT count(*)::int as count FROM lab_tests lt ${whereClause} AND lt.is_active = true`,
        sql`
          SELECT 
            lt.id,
            lt.lab_id,
            ld.lab_name,
            lt.test_code,
            lt.test_name,
            lt.price as mrp,
            lt.commission_category as category,
            COALESCE(c.commission_percentage, 50.00)::numeric(5,2) as commission_percentage,
            lt.specimen_type as sample_type,
            lt.container,
            lt.temperature as temp,
            lt.remarks,
            lt.schedule,
            lt.reporting_schedule,
            lt.is_active,
            lt.created_at,
            lt.updated_at
          FROM lab_tests lt
          LEFT JOIN lab_details ld ON ld.id = lt.lab_id
          LEFT JOIN lab_test_categories c ON c.id = lt.category_id
          ${whereClause}
          ORDER BY lt.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      ]);

      count = countRes[0]?.count || 0;
      activeCount = activeRes[0]?.count || 0;
      data = rows;
    } else {
      // 2. Query Master Catalog from `lab_master`
      const conditions = [];
      if (q) {
        conditions.push(sql`(test_name ILIKE ${'%' + q + '%'} OR test_code ILIKE ${'%' + q + '%'})`);
      }
      if (category) {
        conditions.push(sql`category = ${category}`);
      }

      const whereClause = conditions.length > 0
        ? sql`WHERE ${conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}`
        : sql``;

      const activeConditions = [sql`is_active = true`];
      if (q) activeConditions.push(sql`(test_name ILIKE ${'%' + q + '%'} OR test_code ILIKE ${'%' + q + '%'})`);
      if (category) activeConditions.push(sql`category = ${category}`);
      const activeWhere = sql`WHERE ${activeConditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}`;

      const [countRes, activeRes, rows] = await Promise.all([
        sql`SELECT count(*)::int as count FROM lab_master ${whereClause}`,
        sql`SELECT count(*)::int as count FROM lab_master ${activeWhere}`,
        limit < 10000
          ? sql`
              SELECT * 
              FROM lab_master 
              ${whereClause} 
              ORDER BY created_at DESC 
              LIMIT ${limit} OFFSET ${offset}
            `
          : sql`
              SELECT * 
              FROM lab_master 
              ${whereClause} 
              ORDER BY created_at DESC 
              LIMIT 10000
            `
      ]);

      count = countRes[0]?.count || 0;
      activeCount = activeRes[0]?.count || 0;
      data = rows;
    }
    
    return NextResponse.json({ 
      success: true, 
      data,
      labs: labsList,
      selectedLab: selectedLabInfo,
      pagination: {
        page,
        limit,
        total: count,
        activeTotal: activeCount,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error("Error in GET /api/admin/lab-tests:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    // Handle Bulk Import (Array)
    if (Array.isArray(body)) {
      if (body.length === 0) {
        return NextResponse.json({ success: true, data: [], message: "No tests provided." });
      }

      const rowsToInsert = body.map(b => ({
        test_name: b.test_name,
        category: b.category || "Category 1",
        mrp: b.mrp !== undefined ? parseFloat(b.mrp) : 0,
        commission_percentage: b.commission_percentage !== undefined ? parseFloat(b.commission_percentage) : 0,
        instructions: b.instructions || null,
        is_active: b.is_active !== false,
        test_code: b.test_code || null,
        sample_type: b.sample_type || null,
        container: b.container || null,
        temp: b.temp || null,
        remarks: b.remarks || null,
        schedule: b.schedule || null,
        reporting_schedule: b.reporting_schedule || null,
      }));

      const data = await sql`
        INSERT INTO lab_master ${sql(rowsToInsert)}
        RETURNING *
      `;

      await sql`
        INSERT INTO lab_test_master ${sql(rowsToInsert)}
      `.catch(e => console.warn("Failed to sync lab_test_master on bulk import:", e.message));

      return NextResponse.json({ success: true, data, message: `${data.length} lab tests imported successfully.` });
    }

    // Handle Single Insert
    const rows = await sql`
      INSERT INTO lab_master (
        test_name, category, mrp, commission_percentage, instructions, is_active, test_code,
        sample_type, container, temp, remarks, schedule, reporting_schedule
      ) VALUES (
        ${body.test_name},
        ${body.category || "Category 1"},
        ${body.mrp !== undefined ? parseFloat(body.mrp) : 0},
        ${body.commission_percentage !== undefined ? parseFloat(body.commission_percentage) : 0},
        ${body.instructions || null},
        ${body.is_active !== false},
        ${body.test_code || null},
        ${body.sample_type || null},
        ${body.container || null},
        ${body.temp || null},
        ${body.remarks || null},
        ${body.schedule || null},
        ${body.reporting_schedule || null}
      )
      RETURNING *
    `;

    await sql`
      INSERT INTO lab_test_master (
        test_name, category, mrp, commission_percentage, is_active, test_code,
        sample_type, container, temp, remarks, schedule, reporting_schedule
      ) VALUES (
        ${body.test_name},
        ${body.category || "Category 1"},
        ${body.mrp !== undefined ? parseFloat(body.mrp) : 0},
        ${body.commission_percentage !== undefined ? parseFloat(body.commission_percentage) : 0},
        ${body.is_active !== false},
        ${body.test_code || null},
        ${body.sample_type || null},
        ${body.container || null},
        ${body.temp || null},
        ${body.remarks || null},
        ${body.schedule || null},
        ${body.reporting_schedule || null}
      )
    `.catch(e => console.warn("Failed to sync lab_test_master on single insert:", e.message));
    
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, lab_id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }

    if (lab_id) {
      // Update in lab_tests
      const labUpdates = {};
      if (updateData.test_name !== undefined) labUpdates.test_name = updateData.test_name;
      if (updateData.test_code !== undefined) labUpdates.test_code = updateData.test_code;
      if (updateData.mrp !== undefined) labUpdates.price = parseFloat(updateData.mrp);
      if (updateData.category !== undefined) labUpdates.commission_category = updateData.category;
      if (updateData.sample_type !== undefined) labUpdates.specimen_type = updateData.sample_type;
      if (updateData.container !== undefined) labUpdates.container = updateData.container;
      if (updateData.temp !== undefined) labUpdates.temperature = updateData.temp;
      if (updateData.remarks !== undefined) labUpdates.remarks = updateData.remarks;
      if (updateData.schedule !== undefined) labUpdates.schedule = updateData.schedule;
      if (updateData.reporting_schedule !== undefined) labUpdates.reporting_schedule = updateData.reporting_schedule;
      if (updateData.is_active !== undefined) labUpdates.is_active = updateData.is_active;
      labUpdates.updated_at = new Date().toISOString();

      const rows = await sql`
        UPDATE lab_tests
        SET ${sql(labUpdates)}
        WHERE id = ${id}
        RETURNING *
      `;
      return NextResponse.json({ success: true, data: rows[0] });
    }

    // Otherwise update in lab_master
    const updates = { ...updateData, updated_at: new Date().toISOString() };
    const rows = await sql`
      UPDATE lab_master
      SET ${sql(updates)}
      WHERE id = ${id}
      RETURNING *
    `;

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false, error: "Lab test not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const labId = searchParams.get("lab_id");

    if (!id) throw new Error("ID is required");

    if (labId) {
      await sql`
        DELETE FROM lab_tests
        WHERE id = ${id}
      `;
    } else {
      await sql`
        DELETE FROM lab_master
        WHERE id = ${id}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
