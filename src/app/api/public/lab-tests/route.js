import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// GET all active tests across all active categories for the public marketplace
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const searchQuery = searchParams.get('q');
        const categoryFilter = searchParams.get('category');

        let tests = [];

        if (searchQuery && categoryFilter) {
            tests = await sql`
                SELECT 
                    lt.*,
                    json_build_object(
                        'id', c.id,
                        'name', c.name,
                        'slug', c.slug,
                        'icon', c.icon,
                        'status', c.status
                    ) as category,
                    ld.lab_name,
                    ld.address as lab_address
                FROM lab_tests lt
                JOIN lab_test_categories c ON c.id = lt.category_id AND c.status = true
                JOIN lab_details ld ON ld.id = lt.lab_id
                WHERE lt.is_active = true
                  AND c.slug = ${categoryFilter}
                  AND (lt.test_name ILIKE ${'%' + searchQuery + '%'} OR lt.test_code ILIKE ${'%' + searchQuery + '%'})
                ORDER BY lt.created_at DESC
            `;
        } else if (searchQuery) {
            tests = await sql`
                SELECT 
                    lt.*,
                    json_build_object(
                        'id', c.id,
                        'name', c.name,
                        'slug', c.slug,
                        'icon', c.icon,
                        'status', c.status
                    ) as category,
                    ld.lab_name,
                    ld.address as lab_address
                FROM lab_tests lt
                LEFT JOIN lab_test_categories c ON c.id = lt.category_id
                LEFT JOIN lab_details ld ON ld.id = lt.lab_id
                WHERE lt.is_active = true
                  AND (c.status = true OR c.status IS NULL)
                  AND (lt.test_name ILIKE ${'%' + searchQuery + '%'} OR lt.test_code ILIKE ${'%' + searchQuery + '%'})
                ORDER BY lt.created_at DESC
            `;
        } else if (categoryFilter) {
            tests = await sql`
                SELECT 
                    lt.*,
                    json_build_object(
                        'id', c.id,
                        'name', c.name,
                        'slug', c.slug,
                        'icon', c.icon,
                        'status', c.status
                    ) as category,
                    ld.lab_name,
                    ld.address as lab_address
                FROM lab_tests lt
                JOIN lab_test_categories c ON c.id = lt.category_id AND c.status = true
                LEFT JOIN lab_details ld ON ld.id = lt.lab_id
                WHERE lt.is_active = true
                  AND c.slug = ${categoryFilter}
                ORDER BY lt.created_at DESC
            `;
        } else {
            tests = await sql`
                SELECT 
                    lt.*,
                    json_build_object(
                        'id', c.id,
                        'name', c.name,
                        'slug', c.slug,
                        'icon', c.icon,
                        'status', c.status
                    ) as category,
                    ld.lab_name,
                    ld.address as lab_address
                FROM lab_tests lt
                LEFT JOIN lab_test_categories c ON c.id = lt.category_id
                LEFT JOIN lab_details ld ON ld.id = lt.lab_id
                WHERE lt.is_active = true
                  AND (c.status = true OR c.status IS NULL)
                ORDER BY lt.created_at DESC
            `;
        }

        const formattedData = tests.map(test => ({
            ...test,
            lab_name: test.lab_name || "Independent Lab",
            lab_address: test.lab_address || "",
        }));

        return success("Lab tests fetched successfully", formattedData, 200, { headers: corsHeaders });
    } catch (error) {
        console.error("Error fetching public lab tests:", error);
        return failure("Failed to fetch lab tests", error.message, 500, { headers: corsHeaders });
    }
}
