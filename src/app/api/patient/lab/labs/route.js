import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { expandLabSearchTerms } from "@/lib/labSearchHelper";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// GET — List approved labs with comprehensive lab test search across AWS RDS PostgreSQL
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page")) || 1;
        const limit = parseInt(searchParams.get("limit")) || 24;
        const search = (searchParams.get("search") || "").trim();
        const category_id = (searchParams.get("category_id") || "").trim() || null;
        const city = (searchParams.get("city") || "").trim();
        const area = (searchParams.get("area") || "").trim();
        const home_collection = searchParams.get("home_collection") === "true";
        const offset = (page - 1) * limit;

        const cityPattern = city ? `%${city}%` : null;
        const areaPattern = area ? `%${area}%` : null;
        const searchPattern = search ? `%${search}%` : null;

        // Expand medical synonyms (e.g. Sugar -> Glucose, LFT -> Liver, CBC -> Complete Blood Count)
        const terms = search ? expandLabSearchTerms(search) : [];
        const likeConditions = terms.length > 0 ? terms.map((t) => `%${t}%`) : null;

        // Count total matching labs in AWS RDS
        const countResult = await sql`
            SELECT COUNT(*)::int as count
            FROM lab_details ld
            LEFT JOIN users u ON u.id = ld.id
            WHERE ld.onboarding_status = 'approved'
              ${cityPattern ? sql`AND ld.address ILIKE ${cityPattern}` : sql``}
              ${areaPattern ? sql`AND ld.address ILIKE ${areaPattern}` : sql``}
              ${home_collection ? sql`AND ld.accepts_home_collection = true` : sql``}
              ${likeConditions ? sql`
                AND (
                    ld.lab_name ILIKE ${searchPattern}
                    OR ld.address ILIKE ${searchPattern}
                    OR EXISTS (
                        SELECT 1 FROM lab_tests lt
                        WHERE lt.lab_id = ld.id
                          AND lt.is_active = true
                          AND (
                              lt.test_name ILIKE ANY(${likeConditions})
                              OR lt.test_code ILIKE ANY(${likeConditions})
                          )
                          ${category_id ? sql`AND lt.category_id = ${category_id}` : sql``}
                    )
                )
              ` : category_id ? sql`
                AND EXISTS (
                    SELECT 1 FROM lab_tests lt
                    WHERE lt.lab_id = ld.id
                      AND lt.is_active = true
                      AND lt.category_id = ${category_id}
                )
              ` : sql``}
        `;
        const count = countResult[0]?.count || 0;

        // Fetch labs with matched tests from AWS RDS
        const labs = await sql`
            SELECT 
                ld.id,
                ld.lab_name,
                ld.owner_name,
                ld.address,
                ld.latitude,
                ld.longitude,
                ld.rating,
                ld.total_reviews,
                ld.opening_hours,
                ld.services,
                ld.accepts_home_collection,
                ld.general_turnaround,
                COALESCE(ld.phone_number, u.phone_number) as phone_number,
                u.id as user_id,
                u.profile_picture,
                u.role,
                (SELECT COUNT(*)::int FROM lab_tests lt WHERE lt.lab_id = ld.id AND lt.is_active = true) as total_tests_count,
                (SELECT MIN(price)::numeric FROM lab_tests lt WHERE lt.lab_id = ld.id AND lt.is_active = true AND lt.price > 0) as min_test_price,
                ${likeConditions ? sql`
                    COALESCE((
                        SELECT json_agg(json_build_object(
                            'id', lt.id, 
                            'test_name', lt.test_name, 
                            'test_code', lt.test_code,
                            'price', lt.price,
                            'specimen_type', lt.specimen_type,
                            'turnaround_time', lt.turnaround_time
                        ))
                        FROM (
                            SELECT lt.id, lt.test_name, lt.test_code, lt.price, lt.specimen_type, lt.turnaround_time
                            FROM lab_tests lt
                            WHERE lt.lab_id = ld.id
                              AND lt.is_active = true
                              AND (
                                  lt.test_name ILIKE ANY(${likeConditions})
                                  OR lt.test_code ILIKE ANY(${likeConditions})
                              )
                              ${category_id ? sql`AND lt.category_id = ${category_id}` : sql``}
                            ORDER BY 
                              CASE 
                                WHEN lt.test_name ILIKE ${searchPattern} THEN 1
                                WHEN lt.test_name ILIKE ${exactFirst(search)} THEN 2
                                ELSE 3
                              END,
                              lt.price ASC
                            LIMIT 4
                        ) lt
                    ), '[]'::json) as matched_tests
                ` : category_id ? sql`
                    COALESCE((
                        SELECT json_agg(json_build_object(
                            'id', lt.id, 
                            'test_name', lt.test_name, 
                            'test_code', lt.test_code,
                            'price', lt.price,
                            'specimen_type', lt.specimen_type,
                            'turnaround_time', lt.turnaround_time
                        ))
                        FROM (
                            SELECT lt.id, lt.test_name, lt.test_code, lt.price, lt.specimen_type, lt.turnaround_time
                            FROM lab_tests lt
                            WHERE lt.lab_id = ld.id
                              AND lt.is_active = true
                              AND lt.category_id = ${category_id}
                            ORDER BY lt.price ASC
                            LIMIT 4
                        ) lt
                    ), '[]'::json) as matched_tests
                ` : sql`
                    COALESCE((
                        SELECT json_agg(json_build_object(
                            'id', lt.id, 
                            'test_name', lt.test_name, 
                            'test_code', lt.test_code,
                            'price', lt.price,
                            'specimen_type', lt.specimen_type,
                            'turnaround_time', lt.turnaround_time
                        ))
                        FROM (
                            SELECT lt.id, lt.test_name, lt.test_code, lt.price, lt.specimen_type, lt.turnaround_time
                            FROM lab_tests lt
                            WHERE lt.lab_id = ld.id
                              AND lt.is_active = true
                              AND lt.test_name ILIKE ANY(ARRAY['%CBC%', '%Thyroid%', '%Lipid%', '%Glucose%'])
                            ORDER BY lt.price ASC
                            LIMIT 3
                        ) lt
                    ), '[]'::json) as matched_tests
                `}
            FROM lab_details ld
            LEFT JOIN users u ON u.id = ld.id
            WHERE ld.onboarding_status = 'approved'
              ${cityPattern ? sql`AND ld.address ILIKE ${cityPattern}` : sql``}
              ${areaPattern ? sql`AND ld.address ILIKE ${areaPattern}` : sql``}
              ${home_collection ? sql`AND ld.accepts_home_collection = true` : sql``}
              ${likeConditions ? sql`
                AND (
                    ld.lab_name ILIKE ${searchPattern}
                    OR ld.address ILIKE ${searchPattern}
                    OR EXISTS (
                        SELECT 1 FROM lab_tests lt
                        WHERE lt.lab_id = ld.id
                          AND lt.is_active = true
                          AND (
                              lt.test_name ILIKE ANY(${likeConditions})
                              OR lt.test_code ILIKE ANY(${likeConditions})
                          )
                          ${category_id ? sql`AND lt.category_id = ${category_id}` : sql``}
                    )
                )
              ` : category_id ? sql`
                AND EXISTS (
                    SELECT 1 FROM lab_tests lt
                    WHERE lt.lab_id = ld.id
                      AND lt.is_active = true
                      AND lt.category_id = ${category_id}
                )
              ` : sql``}
            ORDER BY ld.rating DESC NULLS LAST, ld.id DESC
            LIMIT ${limit} OFFSET ${offset}
        `;

        const sanitizedLabs = labs.map((lab) => ({
            ...lab,
            total_tests_count: Number(lab.total_tests_count || 0),
            min_test_price: lab.min_test_price !== null ? Number(lab.min_test_price) : null,
            rating: (lab.total_reviews && Number(lab.total_reviews) > 0) ? lab.rating : null,
            total_reviews: lab.total_reviews || 0,
            has_search_match: Boolean(likeConditions || category_id),
        }));

        return success("Labs fetched successfully", {
            labs: sanitizedLabs,
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit),
            },
            query: {
                search,
                category_id,
                city,
                area,
                home_collection,
            }
        }, 200, { headers: corsHeaders });
    } catch (error) {
        console.error("Patient labs list error:", error);
        return failure("Failed to fetch labs", error.message, 500, { headers: corsHeaders });
    }
}

function exactFirst(term) {
    if (!term) return "%%";
    return `${term}%`;
}
