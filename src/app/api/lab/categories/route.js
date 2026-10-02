import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// GET all active categories for the Lab dropdown
export async function GET(req) {
    try {
        const data = await sql`
            SELECT id, name, slug, icon, description
            FROM lab_test_categories
            WHERE status = true
            ORDER BY name ASC
        `;

        return success("Categories fetched successfully", data, 200, { headers: corsHeaders });
    } catch (error) {
        console.error("Error fetching lab categories:", error);
        return failure("Failed to fetch categories", error.message, 500, { headers: corsHeaders });
    }
}
