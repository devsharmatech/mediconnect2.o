import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// GET all internal commission categories with test counts and pricing stats
export async function GET(req) {
    try {
        const data = await sql`
            SELECT 
                c.id,
                c.name,
                c.slug,
                COALESCE(c.commission_percentage, 0)::numeric(5,2) as commission_percentage,
                c.description,
                c.status,
                c.created_at,
                c.updated_at,
                COUNT(lt.id)::int as tests_count,
                COALESCE(ROUND(AVG(lt.price::numeric), 2), 0) as avg_price,
                COALESCE(ROUND(MIN(lt.price::numeric), 2), 0) as min_price,
                COALESCE(ROUND(MAX(lt.price::numeric), 2), 0) as max_price
            FROM lab_test_categories c
            LEFT JOIN lab_tests lt ON lt.category_id = c.id
            GROUP BY c.id, c.name, c.slug, c.commission_percentage, c.description, c.status, c.created_at, c.updated_at
            ORDER BY 
                CASE 
                    WHEN c.name = 'Category 1' THEN 1
                    WHEN c.name = 'Category 2' THEN 2
                    WHEN c.name = 'Category 3' THEN 3
                    WHEN c.name = 'Category 4' THEN 4
                    ELSE 5
                END ASC
        `;

        return success("Commission categories fetched successfully", data, 200, { headers: corsHeaders });
    } catch (error) {
        console.error("Error fetching lab categories:", error);
        return failure("Failed to fetch categories", error.message, 500, { headers: corsHeaders });
    }
}

// PUT / POST update category commission percentage or details
export async function PUT(req) {
    try {
        const body = await req.json().catch(() => ({}));
        const { id, commission_percentage, description, status } = body;

        if (!id) {
            return failure("Category ID is required", null, 400, { headers: corsHeaders });
        }

        const pct = parseFloat(commission_percentage);
        if (isNaN(pct) || pct < 0 || pct > 100) {
            return failure("Commission percentage must be between 0 and 100", null, 400, { headers: corsHeaders });
        }

        // Update in lab_test_categories
        const updated = await sql`
            UPDATE lab_test_categories
            SET 
                commission_percentage = ${pct},
                description = COALESCE(${description}, description),
                status = COALESCE(${status}, status),
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING *
        `;

        if (!updated || updated.length === 0) {
            return failure("Category not found", null, 404, { headers: corsHeaders });
        }

        const cat = updated[0];

        // Also sync with lab_commission_settings
        let catKey = "category_1";
        if (cat.name.includes("1")) catKey = "category_1";
        else if (cat.name.includes("2")) catKey = "category_2";
        else if (cat.name.includes("3")) catKey = "category_3";
        else if (cat.name.includes("4")) catKey = "category_4";
        else if (cat.name.toLowerCase().includes("package")) catKey = "package";

        await sql`
            UPDATE lab_commission_settings
            SET 
                commission_percentage = ${pct},
                updated_at = NOW()
            WHERE category_key = ${catKey}
        `;

        // Update lab_master commission_percentage for tests belonging to this category
        await sql`
            UPDATE lab_master
            SET commission_percentage = ${pct}
            WHERE category = ${cat.name}
        `;

        return success("Commission percentage updated successfully", cat, 200, { headers: corsHeaders });
    } catch (error) {
        console.error("Error updating category commission:", error);
        return failure("Failed to update commission", error.message, 500, { headers: corsHeaders });
    }
}
