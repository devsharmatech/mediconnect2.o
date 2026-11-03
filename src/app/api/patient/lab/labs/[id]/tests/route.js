import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { expandLabSearchTerms } from "@/lib/labSearchHelper";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// GET — Active tests & packages for a specific lab with server-side filtering & Load More pagination
export async function GET(req, { params }) {
    try {
        const { id } = await params;

        if (!id) {
            return failure("Lab ID is required", null, 400, { headers: corsHeaders });
        }

        const { searchParams } = new URL(req.url);
        const search = (searchParams.get("search") || "").trim();
        const category_id = (searchParams.get("category_id") || "").trim();
        const collection = (searchParams.get("collection") || "all").trim();
        const department = (searchParams.get("department") || "all").trim();
        const price = (searchParams.get("price") || "all").trim();
        const sort = (searchParams.get("sort") || "name_asc").trim();
        const excludePackages = searchParams.get("exclude_packages") === "true";

        const rawPage = searchParams.get("page");
        const rawLimit = searchParams.get("limit");
        const isPaginated = rawPage !== null || rawLimit !== null;
        const page = Math.max(1, parseInt(rawPage || "1", 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(rawLimit || "24", 10) || 24));
        const offset = (page - 1) * limit;

        // Verify the lab exists
        const labRows = await sql`
            SELECT id, lab_name, onboarding_status, address, phone_number, accepts_home_collection
            FROM lab_details
            WHERE id = ${id}
            LIMIT 1
        `;

        if (labRows.length === 0) {
            return failure("Lab not found", null, 404, { headers: corsHeaders });
        }

        const labData = labRows[0];

        // Expand medical synonyms (e.g. Sugar -> Glucose, CBC, LFT, etc.)
        const terms = search ? expandLabSearchTerms(search) : [];
        const likeConditions = terms.length > 0 ? terms.map((t) => `%${t}%`) : (search ? [`%${search}%`] : null);
        const exactPattern = search ? `%${search}%` : null;

        // Build dynamic WHERE conditions for paginated test list
        const conditions = [
            sql`lt.lab_id = ${id}`,
            sql`lt.is_active = true`,
        ];

        if (category_id) {
            conditions.push(sql`lt.category_id = ${category_id}`);
        }

        if (collection === "home") {
            conditions.push(sql`lt.collection_type IN ('home', 'both')`);
        } else if (collection === "lab") {
            conditions.push(sql`lt.collection_type IN ('lab', 'both')`);
        } else if (collection === "packages") {
            conditions.push(sql`lt.is_package = true`);
        }

        if (excludePackages && collection !== "packages" && department !== "Health Packages") {
            conditions.push(sql`COALESCE(lt.is_package, false) = false`);
        }

        if (department && department !== "all") {
            conditions.push(sql`lt.department = ${department}`);
        }

        if (price === "under_500" || price === "under500") {
            conditions.push(sql`lt.price < 500`);
        } else if (price === "500_1500" || price === "500to1500") {
            conditions.push(sql`lt.price >= 500 AND lt.price <= 1500`);
        } else if (price === "1500_3000" || price === "1500to3000") {
            conditions.push(sql`lt.price > 1500 AND lt.price <= 3000`);
        } else if (price === "above_3000" || price === "above3000") {
            conditions.push(sql`lt.price > 3000`);
        }

        if (likeConditions) {
            conditions.push(sql`(
                lt.test_name ILIKE ANY(${likeConditions})
                OR lt.test_code ILIKE ANY(${likeConditions})
                OR lt.specimen_type ILIKE ANY(${likeConditions})
                OR lt.remarks ILIKE ANY(${likeConditions})
                OR lt.department ILIKE ANY(${likeConditions})
            )`);
        }

        const whereClause = conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`);

        // Build ORDER BY clause
        let orderByClause = sql`lt.test_name ASC`;
        if (sort === "price_asc") {
            orderByClause = sql`lt.price ASC, lt.test_name ASC`;
        } else if (sort === "price_desc") {
            orderByClause = sql`lt.price DESC, lt.test_name ASC`;
        } else if (exactPattern) {
            orderByClause = sql`CASE WHEN lt.test_name ILIKE ${exactPattern} THEN 1 ELSE 2 END, lt.test_name ASC`;
        }

        // Count total matching tests for pagination
        const [countRow] = await sql`
            SELECT COUNT(*)::int as total
            FROM lab_tests lt
            WHERE ${whereClause}
        `;
        const totalFiltered = countRow?.total || 0;

        // Fetch tests (paginated if page/limit requested, otherwise all)
        const tests = isPaginated
            ? await sql`
                SELECT 
                    lt.id,
                    lt.test_code,
                    lt.test_name,
                    lt.price,
                    lt.collection_type,
                    lt.specimen_type,
                    lt.container,
                    lt.temperature,
                    lt.turnaround_time,
                    lt.schedule,
                    lt.reporting_schedule,
                    lt.remarks,
                    lt.clinical_history_required,
                    COALESCE(lt.is_package, false) as is_package,
                    lt.department,
                    COALESCE(lt.requires_fasting, false) as requires_fasting,
                    lt.discount_percentage,
                    lt.offer_price,
                    json_build_object('id', c.id, 'name', c.name, 'icon', c.icon) as category
                FROM lab_tests lt
                LEFT JOIN lab_test_categories c ON c.id = lt.category_id
                WHERE ${whereClause}
                ORDER BY ${orderByClause}
                LIMIT ${limit} OFFSET ${offset}
            `
            : await sql`
                SELECT 
                    lt.id,
                    lt.test_code,
                    lt.test_name,
                    lt.price,
                    lt.collection_type,
                    lt.specimen_type,
                    lt.container,
                    lt.temperature,
                    lt.turnaround_time,
                    lt.schedule,
                    lt.reporting_schedule,
                    lt.remarks,
                    lt.clinical_history_required,
                    COALESCE(lt.is_package, false) as is_package,
                    lt.department,
                    COALESCE(lt.requires_fasting, false) as requires_fasting,
                    lt.discount_percentage,
                    lt.offer_price,
                    json_build_object('id', c.id, 'name', c.name, 'icon', c.icon) as category
                FROM lab_tests lt
                LEFT JOIN lab_test_categories c ON c.id = lt.category_id
                WHERE ${whereClause}
                ORDER BY ${orderByClause}
            `;

        // Fetch global counts, department counts, and packages slider data on page 1
        let counts = null;
        let departments = [];
        let packages = [];

        if (page === 1) {
            const [summaryCounts, deptRows, pkgRows] = await Promise.all([
                sql`
                    SELECT
                        COUNT(*)::int as all,
                        COUNT(*) FILTER (WHERE collection_type IN ('home', 'both'))::int as home,
                        COUNT(*) FILTER (WHERE collection_type IN ('lab', 'both'))::int as lab,
                        COUNT(*) FILTER (WHERE is_package = true)::int as packages
                    FROM lab_tests
                    WHERE lab_id = ${id} AND is_active = true
                `,
                sql`
                    SELECT department as name, COUNT(*)::int as count
                    FROM lab_tests
                    WHERE lab_id = ${id}
                      AND is_active = true
                      AND department IS NOT NULL
                      AND (${collection === "home" ? sql`collection_type IN ('home', 'both')` : collection === "lab" ? sql`collection_type IN ('lab', 'both')` : collection === "packages" ? sql`is_package = true` : sql`1=1`})
                    GROUP BY department
                    ORDER BY CASE WHEN department = 'Health Packages' THEN 0 ELSE 1 END, count DESC
                `,
                sql`
                    SELECT 
                        lt.id,
                        lt.test_code,
                        lt.test_name,
                        lt.price,
                        lt.collection_type,
                        lt.specimen_type,
                        lt.turnaround_time,
                        lt.reporting_schedule,
                        lt.remarks,
                        COALESCE(lt.is_package, true) as is_package,
                        lt.department,
                        COALESCE(lt.requires_fasting, false) as requires_fasting
                    FROM lab_tests lt
                    WHERE lt.lab_id = ${id}
                      AND lt.is_active = true
                      AND lt.is_package = true
                      AND (${collection === "home" ? sql`lt.collection_type IN ('home', 'both')` : collection === "lab" ? sql`lt.collection_type IN ('lab', 'both')` : sql`1=1`})
                      AND (${likeConditions ? sql`(lt.test_name ILIKE ANY(${likeConditions}) OR lt.remarks ILIKE ANY(${likeConditions}) OR lt.test_code ILIKE ANY(${likeConditions}))` : sql`1=1`})
                    ORDER BY lt.price ASC, lt.test_name ASC
                `
            ]);

            counts = summaryCounts[0] || { all: 0, home: 0, lab: 0, packages: 0 };
            departments = deptRows || [];
            packages = pkgRows || [];
        }

        return success("Tests fetched successfully", {
            lab: { id: labData.id, name: labData.lab_name },
            tests,
            packages,
            counts,
            departments,
            total: totalFiltered,
            pagination: {
                page,
                limit,
                total: totalFiltered,
                hasMore: isPaginated ? offset + tests.length < totalFiltered : false,
            },
        }, 200);
    } catch (error) {
        console.error("Patient lab tests error:", error);
        return failure("Failed to fetch lab tests", error.message, 500);
    }
}
