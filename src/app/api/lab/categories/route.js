import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// GET all active categories for the Lab dropdown
export async function GET(req) {
    try {
        const { data, error } = await supabase
            .from("lab_test_categories")
            .select("id, name, slug, icon, description")
            .eq("status", true)
            .order("name", { ascending: true });

        if (error) throw error;

        return success("Categories fetched successfully", data, 200, { headers: corsHeaders });
    } catch (error) {
        console.error("Error fetching lab categories:", error);
        return failure("Failed to fetch categories", error.message, 500, { headers: corsHeaders });
    }
}
