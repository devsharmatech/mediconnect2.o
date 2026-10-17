import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { resolveCallerFromRequest } from '@/lib/layer1/authGuard';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const caller = await resolveCallerFromRequest(req);
    if (caller && caller.role !== 'admin') {
      return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const category = (searchParams.get('category') || '').trim();
    const labId = (searchParams.get('lab_id') || '').trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const all = searchParams.get('all') === 'true';
    const offset = (page - 1) * limit;

    // Fetch distinct categories with count
    const categories = await sql`
      SELECT 
        category as name,
        COUNT(*)::int as count
      FROM lab_test_master
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC;
    `;

    // Filter conditions for master tests
    const searchPattern = q ? `%${q}%` : null;

    const [totalRow] = await sql`
      SELECT COUNT(*)::int as total
      FROM lab_test_master m
      WHERE (${category ? sql`m.category = ${category}` : sql`1=1`})
        AND (${searchPattern ? sql`(m.test_name ILIKE ${searchPattern} OR m.test_code ILIKE ${searchPattern})` : sql`1=1`});
    `;

    const total = totalRow?.total || 0;

    const tests = all
      ? await sql`
          SELECT 
            m.id,
            m.test_code,
            m.test_name,
            m.category,
            m.mrp,
            m.sample_type,
            m.container,
            m.temp,
            m.remarks,
            m.schedule,
            m.reporting_schedule,
            m.department,
            COALESCE(m.is_package, false) as is_package,
            COALESCE(c.id, NULL) as category_id,
            ${labId ? sql`EXISTS(SELECT 1 FROM lab_tests lt WHERE lt.lab_id = ${labId} AND lt.test_code = m.test_code)` : sql`false`} as is_assigned
          FROM lab_test_master m
          LEFT JOIN lab_test_categories c ON LOWER(TRIM(c.name)) = LOWER(TRIM(m.category))
          WHERE (${category ? sql`m.category = ${category}` : sql`1=1`})
            AND (${searchPattern ? sql`(m.test_name ILIKE ${searchPattern} OR m.test_code ILIKE ${searchPattern})` : sql`1=1`})
          ORDER BY m.category ASC, m.test_name ASC;
        `
      : await sql`
          SELECT 
            m.id,
            m.test_code,
            m.test_name,
            m.category,
            m.mrp,
            m.sample_type,
            m.container,
            m.temp,
            m.remarks,
            m.schedule,
            m.reporting_schedule,
            m.department,
            COALESCE(m.is_package, false) as is_package,
            COALESCE(c.id, NULL) as category_id,
            ${labId ? sql`EXISTS(SELECT 1 FROM lab_tests lt WHERE lt.lab_id = ${labId} AND lt.test_code = m.test_code)` : sql`false`} as is_assigned
          FROM lab_test_master m
          LEFT JOIN lab_test_categories c ON LOWER(TRIM(c.name)) = LOWER(TRIM(m.category))
          WHERE (${category ? sql`m.category = ${category}` : sql`1=1`})
            AND (${searchPattern ? sql`(m.test_name ILIKE ${searchPattern} OR m.test_code ILIKE ${searchPattern})` : sql`1=1`})
          ORDER BY m.category ASC, m.test_name ASC
          LIMIT ${limit} OFFSET ${offset};
        `;

    return NextResponse.json({
      success: true,
      data: {
        tests,
        categories,
        pagination: {
          page,
          limit: all ? total : limit,
          total,
          totalPages: all ? 1 : Math.ceil(total / limit),
        },
      },
    }, { status: 200 });

  } catch (error) {
    console.error("GET /api/admin/master-tests error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const caller = await resolveCallerFromRequest(req);
    if (caller && caller.role !== 'admin') {
      return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { lab_id, assign_all, test_codes } = body;

    if (!lab_id) {
      return NextResponse.json({ success: false, error: "Lab ID is required" }, { status: 400 });
    }

    // Verify lab exists
    const [lab] = await sql`SELECT id, lab_name FROM lab_details WHERE id = ${lab_id} LIMIT 1;`;
    if (!lab) {
      return NextResponse.json({ success: false, error: "Lab not found" }, { status: 404 });
    }

    let insertQuery;

    if (assign_all) {
      // Assign ALL tests from lab_test_master that aren't already in lab_tests for this lab
      insertQuery = await sql`
        INSERT INTO lab_tests (
          id,
          lab_id,
          category_id,
          test_code,
          test_name,
          price,
          specimen_type,
          container,
          temperature,
          remarks,
          schedule,
          reporting_schedule,
          requires_fasting,
          collection_type,
          commission_category,
          discount_percentage,
          offer_price,
          department,
          is_package,
          is_active,
          created_at,
          updated_at
        )
        SELECT
          gen_random_uuid(),
          ${lab_id},
          c.id,
          m.test_code,
          m.test_name,
          COALESCE(NULLIF(REGEXP_REPLACE(m.mrp, '[^0-9.]', '', 'g'), '')::numeric, 0),
          m.sample_type,
          m.container,
          m.temp,
          m.remarks,
          m.schedule,
          m.reporting_schedule,
          COALESCE(m.requires_fasting, false),
          'lab',
          m.category,
          COALESCE(m.discount_percentage, 0),
          m.offer_price,
          m.department,
          COALESCE(m.is_package, false),
          true,
          NOW(),
          NOW()
        FROM lab_test_master m
        LEFT JOIN lab_test_categories c ON LOWER(TRIM(c.name)) = LOWER(TRIM(m.category))
        WHERE NOT EXISTS (
          SELECT 1 FROM lab_tests lt WHERE lt.lab_id = ${lab_id} AND lt.test_code = m.test_code
        )
        RETURNING id;
      `;
    } else if (Array.isArray(test_codes) && test_codes.length > 0) {
      // Assign only specified test_codes
      insertQuery = await sql`
        INSERT INTO lab_tests (
          id,
          lab_id,
          category_id,
          test_code,
          test_name,
          price,
          specimen_type,
          container,
          temperature,
          remarks,
          schedule,
          reporting_schedule,
          requires_fasting,
          collection_type,
          commission_category,
          discount_percentage,
          offer_price,
          department,
          is_package,
          is_active,
          created_at,
          updated_at
        )
        SELECT
          gen_random_uuid(),
          ${lab_id},
          c.id,
          m.test_code,
          m.test_name,
          COALESCE(NULLIF(REGEXP_REPLACE(m.mrp, '[^0-9.]', '', 'g'), '')::numeric, 0),
          m.sample_type,
          m.container,
          m.temp,
          m.remarks,
          m.schedule,
          m.reporting_schedule,
          COALESCE(m.requires_fasting, false),
          'lab',
          m.category,
          COALESCE(m.discount_percentage, 0),
          m.offer_price,
          m.department,
          COALESCE(m.is_package, false),
          true,
          NOW(),
          NOW()
        FROM lab_test_master m
        LEFT JOIN lab_test_categories c ON LOWER(TRIM(c.name)) = LOWER(TRIM(m.category))
        WHERE m.test_code = ANY(${test_codes})
          AND NOT EXISTS (
            SELECT 1 FROM lab_tests lt WHERE lt.lab_id = ${lab_id} AND lt.test_code = m.test_code
          )
        RETURNING id;
      `;
    } else {
      return NextResponse.json({ success: false, error: "Either assign_all must be true or test_codes array must be provided" }, { status: 400 });
    }

    const assignedCount = insertQuery?.length || 0;

    return NextResponse.json({
      success: true,
      data: {
        assigned_count: assignedCount,
        lab_id,
        lab_name: lab.lab_name,
      },
      message: `Successfully assigned ${assignedCount} tests to ${lab.lab_name}`,
    }, { status: 200 });

  } catch (error) {
    console.error("POST /api/admin/master-tests error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
