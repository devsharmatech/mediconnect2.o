import { supabase } from "@/lib/supabaseAdmin";
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

        // Verify the lab is approved
        const { data: labData, error: labError } = await supabase
            .from("lab_details")
            .select("id, lab_name")
            .eq("id", id)
            .eq("onboarding_status", "approved")
            .single();

        if (labError || !labData) {
            return failure("Lab not found or not approved", null, 404, { headers: corsHeaders });
        }

        // Fetch active tests
        let query = supabase
            .from("lab_tests")
            .select(`
                id,
                test_code,
                test_name,
                price,
                specimen_type,
                container,
                temperature,
                turnaround_time,
                schedule,
                reporting_schedule,
                remarks,
                clinical_history_required,
                category:lab_test_categories (
                    id,
                    name,
                    icon
                )
            `)
            .eq("lab_id", id)
            .eq("is_active", true)
            .order("test_name", { ascending: true });

        if (search) query = query.ilike("test_name", `%${search}%`);
        if (category_id) query = query.eq("category_id", category_id);

        const { data: tests, error } = await query;
        if (error) throw error;

        // Fetch categories available at this lab
        const categoryIds = [...new Set(tests.filter(t => t.category).map(t => t.category.id))];
        let categories = [];
        if (categoryIds.length > 0) {
            const { data: catData } = await supabase
                .from("lab_test_categories")
                .select("id, name, icon")
                .in("id", categoryIds)
                .eq("status", true)
                .order("name");
            categories = catData || [];
        }

        // Log activity
        const patient_id = searchParams.get("patient_id");
        if (patient_id) {
            await supabase.from("lab_activity_logs").insert({
                lab_id: id,
                action: "PATIENT_VIEW_TESTS",
                details: { patient_id, tests_count: tests.length },
            });
        }

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
