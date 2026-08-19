import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// GET — List approved labs for patients to browse
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page")) || 1;
        const limit = parseInt(searchParams.get("limit")) || 20;
        const search = (searchParams.get("search") || "").trim();
        const city = (searchParams.get("city") || "").trim();
        const home_collection = searchParams.get("home_collection");
        const offset = (page - 1) * limit;

        let query = supabase
            .from("lab_details")
            .select(`
                id,
                lab_name,
                owner_name,
                address,
                latitude,
                longitude,
                rating,
                total_reviews,
                opening_hours,
                services,
                accepts_home_collection,
                general_turnaround,
                users!inner(
                    id,
                    profile_picture,
                    role
                )
            `, { count: "exact" })
            .eq("users.role", "lab")
            .eq("onboarding_status", "approved")
            .range(offset, offset + limit - 1)
            .order("rating", { ascending: false });

        if (search) query = query.ilike("lab_name", `%${search}%`);
        if (city) query = query.ilike("address", `%${city}%`);
        if (home_collection === "true") query = query.eq("accepts_home_collection", true);

        const { data, count, error } = await query;
        if (error) throw error;

        const sanitizedLabs = (data || []).map((lab) => ({
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
