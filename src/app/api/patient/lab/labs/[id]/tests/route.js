import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// GET — All active tests for a specific lab (patient/public view)
export async function GET(req, { params }) {
    try {
        const { id } = await params;

        if (!id) {
            return failure("Lab ID is required", null, 400, { headers: corsHeaders });
        }

        const { searchParams } = new URL(req.url);
        const search = (searchParams.get("search") || "").trim();
        const category_id = searchParams.get("category_id");

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

        // Fetch active tests for this lab
        let tests = [];
        if (search && category_id) {
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
                  AND (lt.test_name ILIKE ${'%' + search + '%'} OR lt.test_code ILIKE ${'%' + search + '%'})
                ORDER BY lt.test_name ASC
            `;
        } else if (search) {
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
                  AND (lt.test_name ILIKE ${'%' + search + '%'} OR lt.test_code ILIKE ${'%' + search + '%'})
                ORDER BY lt.test_name ASC
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
                ORDER BY lt.test_name ASC
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
        }, 200, { headers: corsHeaders });
    } catch (error) {
        console.error("Patient lab tests error:", error);
        return failure("Failed to fetch lab tests", error.message, 500, { headers: corsHeaders });
    }
}
