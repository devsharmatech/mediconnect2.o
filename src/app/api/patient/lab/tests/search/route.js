import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { expandLabSearchTerms } from "@/lib/labSearchHelper";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// GET — Autocomplete / Instant search for lab tests across the network
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const query = (searchParams.get("q") || "").trim();

        if (!query || query.length < 2) {
            return success("Please provide at least 2 characters", { tests: [] });
        }

        const terms = expandLabSearchTerms(query);
        const likeConditions = terms.map((t) => `%${t}%`);
        const exactPattern = `%${query}%`;

        const tests = await sql`
            SELECT 
                lt.test_name,
                MIN(lt.test_code) as test_code,
                MIN(lt.price)::numeric as min_price,
                MAX(lt.price)::numeric as max_price,
                COUNT(DISTINCT lt.lab_id)::int as labs_count,
                COALESCE(c.name, 'General Diagnostic') as category_name,
                c.id as category_id
            FROM lab_tests lt
            LEFT JOIN lab_test_categories c ON c.id = lt.category_id
            JOIN lab_details ld ON ld.id = lt.lab_id AND ld.onboarding_status = 'approved'
            WHERE lt.is_active = true
              AND (
                  lt.test_name ILIKE ANY(${likeConditions})
                  OR lt.test_code ILIKE ANY(${likeConditions})
              )
            GROUP BY lt.test_name, c.name, c.id
            ORDER BY 
                CASE 
                    WHEN lt.test_name ILIKE ${exactPattern} THEN 1
                    WHEN lt.test_name ILIKE ${exactPattern.replace(/%/g, '') + '%'} THEN 2
                    ELSE 3
                END,
                labs_count DESC,
                min_price ASC
            LIMIT 8
        `;

        return success("Tests matched successfully", {
            tests: tests.map((t) => ({
                test_name: t.test_name,
                test_code: t.test_code,
                min_price: Number(t.min_price),
                max_price: Number(t.max_price),
                labs_count: t.labs_count,
                category_name: t.category_name,
                category_id: t.category_id,
            })),
        });
    } catch (error) {
        console.error("Lab test search autocomplete error:", error);
        return failure("Failed to search tests", error.message, 500);
    }
}
