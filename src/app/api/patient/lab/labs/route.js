import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// GET — List approved labs for patients to browse (search by lab name, city, OR test name/code in AWS RDS)
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page")) || 1;
        const limit = parseInt(searchParams.get("limit")) || 20;
        const search = (searchParams.get("search") || "").trim();
        const city = (searchParams.get("city") || "").trim();
        const area = (searchParams.get("area") || "").trim();
        const home_collection = searchParams.get("home_collection") === "true";
        const offset = (page - 1) * limit;

        const searchPattern = search ? `%${search}%` : null;
        const cityPattern = city ? `%${city}%` : null;
        const areaPattern = area ? `%${area}%` : null;

        // Count total matching labs in AWS RDS
        const countResult = await sql`
            SELECT COUNT(*)::int as count
            FROM lab_details ld
            LEFT JOIN users u ON u.id = ld.id
            WHERE ld.onboarding_status = 'approved'
              ${cityPattern ? sql`AND ld.address ILIKE ${cityPattern}` : sql``}
              ${areaPattern ? sql`AND ld.address ILIKE ${areaPattern}` : sql``}
              ${home_collection ? sql`AND ld.accepts_home_collection = true` : sql``}
              ${searchPattern ? sql`
                AND (
                    ld.lab_name ILIKE ${searchPattern}
                    OR ld.address ILIKE ${searchPattern}
                    OR EXISTS (
                        SELECT 1 FROM lab_tests lt
                        WHERE lt.lab_id = ld.id
                          AND lt.is_active = true
                          AND (lt.test_name ILIKE ${searchPattern} OR lt.test_code ILIKE ${searchPattern})
                    )
                )
              ` : sql``}
        `;
        const count = countResult[0]?.count || 0;

        // Fetch labs with matched tests if searched
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
                ${searchPattern ? sql`
                    COALESCE((
                        SELECT json_agg(json_build_object('id', lt.id, 'test_name', lt.test_name, 'price', lt.price))
                        FROM (
                            SELECT lt.id, lt.test_name, lt.price
                            FROM lab_tests lt
                            WHERE lt.lab_id = ld.id
                              AND lt.is_active = true
                              AND (lt.test_name ILIKE ${searchPattern} OR lt.test_code ILIKE ${searchPattern})
                            LIMIT 3
                        ) lt
                    ), '[]'::json) as matched_tests
                ` : sql`'[]'::json as matched_tests`}
            FROM lab_details ld
            LEFT JOIN users u ON u.id = ld.id
            WHERE ld.onboarding_status = 'approved'
              ${cityPattern ? sql`AND ld.address ILIKE ${cityPattern}` : sql``}
              ${areaPattern ? sql`AND ld.address ILIKE ${areaPattern}` : sql``}
              ${home_collection ? sql`AND ld.accepts_home_collection = true` : sql``}
              ${searchPattern ? sql`
                AND (
                    ld.lab_name ILIKE ${searchPattern}
                    OR ld.address ILIKE ${searchPattern}
                    OR EXISTS (
                        SELECT 1 FROM lab_tests lt
                        WHERE lt.lab_id = ld.id
                          AND lt.is_active = true
                          AND (lt.test_name ILIKE ${searchPattern} OR lt.test_code ILIKE ${searchPattern})
                    )
                )
              ` : sql``}
            ORDER BY ld.rating DESC NULLS LAST, ld.id DESC
            LIMIT ${limit} OFFSET ${offset}
        `;

        const sanitizedLabs = labs.map((lab) => ({
            ...lab,
            rating: (lab.total_reviews && Number(lab.total_reviews) > 0) ? lab.rating : null,
            total_reviews: lab.total_reviews || 0,
        }));

        return success("Labs fetched successfully", {
            labs: sanitizedLabs,
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit),
            }
        }, 200, { headers: corsHeaders });
    } catch (error) {
        console.error("Patient labs list error:", error);
        return failure("Failed to fetch labs", error.message, 500, { headers: corsHeaders });
    }
}
