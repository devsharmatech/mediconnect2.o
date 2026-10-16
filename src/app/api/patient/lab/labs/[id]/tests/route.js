import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { expandLabSearchTerms } from "@/lib/labSearchHelper";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// GET — All active tests for a specific lab (patient/public view) with synonym-aware search
export async function GET(req, { params }) {
    try {
        const { id } = await params;

        if (!id) {
            return failure("Lab ID is required", null, 400, { headers: corsHeaders });
        }

        const { searchParams } = new URL(req.url);
        const search = (searchParams.get("search") || "").trim();
        const category_id = (searchParams.get("category_id") || "").trim();

        // Verify the lab is approved (or exists)
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
        const likeConditions = terms.length > 0 ? terms.map((t) => `%${t}%`) : null;
        const exactPattern = search ? `%${search}%` : null;

        // Fetch active tests for this lab
        let tests = [];
        if (likeConditions && category_id) {
            tests = await sql`
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
                    json_build_object('id', c.id, 'name', c.name, 'icon', c.icon) as category
                FROM lab_tests lt
                LEFT JOIN lab_test_categories c ON c.id = lt.category_id
                WHERE lt.lab_id = ${id}
                  AND lt.is_active = true
                  AND lt.category_id = ${category_id}
                  AND (
                      lt.test_name ILIKE ANY(${likeConditions})
                      OR lt.test_code ILIKE ANY(${likeConditions})
                  )
                ORDER BY 
                  CASE 
                    WHEN lt.test_name ILIKE ${exactPattern} THEN 1
                    ELSE 2
                  END,
                  lt.price ASC,
                  lt.test_name ASC
            `;
        } else if (likeConditions) {
            tests = await sql`
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
                    json_build_object('id', c.id, 'name', c.name, 'icon', c.icon) as category
                FROM lab_tests lt
                LEFT JOIN lab_test_categories c ON c.id = lt.category_id
                WHERE lt.lab_id = ${id}
                  AND lt.is_active = true
                  AND (
                      lt.test_name ILIKE ANY(${likeConditions})
                      OR lt.test_code ILIKE ANY(${likeConditions})
                  )
                ORDER BY 
                  CASE 
                    WHEN lt.test_name ILIKE ${exactPattern} THEN 1
                    ELSE 2
                  END,
                  lt.price ASC,
                  lt.test_name ASC
            `;
        } else if (category_id) {
            tests = await sql`
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
                    json_build_object('id', c.id, 'name', c.name, 'icon', c.icon) as category
                FROM lab_tests lt
                LEFT JOIN lab_test_categories c ON c.id = lt.category_id
                WHERE lt.lab_id = ${id}
                  AND lt.is_active = true
                  AND lt.category_id = ${category_id}
                ORDER BY lt.price ASC, lt.test_name ASC
            `;
        } else {
            tests = await sql`
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
                    json_build_object('id', c.id, 'name', c.name, 'icon', c.icon) as category
                FROM lab_tests lt
                LEFT JOIN lab_test_categories c ON c.id = lt.category_id
                WHERE lt.lab_id = ${id}
                  AND lt.is_active = true
                ORDER BY lt.test_name ASC
            `;
        }

        // Fetch categories available at this lab
        const categories = await sql`
            SELECT DISTINCT c.id, c.name, c.icon
            FROM lab_tests lt
            JOIN lab_test_categories c ON c.id = lt.category_id
            WHERE lt.lab_id = ${id} AND lt.is_active = true
            ORDER BY c.name ASC
        `;

        return success("Tests fetched successfully", {
            lab: { id: labData.id, name: labData.lab_name },
            categories,
            tests,
            total: tests.length,
        }, 200);
    } catch (error) {
        console.error("Patient lab tests error:", error);
        return failure("Failed to fetch lab tests", error.message, 500);
    }
}
