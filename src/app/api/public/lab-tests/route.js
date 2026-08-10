import { supabase } from "@/lib/supabaseAdmin";
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

        // Start query on lab_tests joining with active categories and the lab details
        let query = supabase
            .from("lab_tests")
            .select(`
        *,
        category:lab_test_categories!inner (
          id,
          name,
          slug,
          icon,
          status
        ),
        lab:users!inner (
          id,
          phone_number,
          lab_details:lab_details!inner (
            lab_name,
            address
          )
        )
      `)
            .eq("is_active", true)
            .eq("category.status", true);

        // Apply strict text search if provided
        if (searchQuery) {
            query = query.or(`test_name.ilike.%${searchQuery}%,test_code.ilike.%${searchQuery}%`);
        }

        // Apply category filter if provided
        if (categoryFilter) {
            query = query.eq("category.slug", categoryFilter);
        }

        // Order by newest or popular
        query = query.order("created_at", { ascending: false });

        const { data, error } = await query;

        if (error) throw error;

        // Clean up the nested structure slightly for the UI
        const formattedData = data.map(test => ({
            ...test,
            lab_name: test.lab?.lab_details?.[0]?.lab_name || "Independent Lab",
            lab_address: test.lab?.lab_details?.[0]?.address || "",
        }));

        return success("Lab tests fetched successfully", formattedData, 200, { headers: corsHeaders });
    } catch (error) {
        console.error("Error fetching public lab tests:", error);
        return failure("Failed to fetch lab tests", error.message, 500, { headers: corsHeaders });
    }
}
