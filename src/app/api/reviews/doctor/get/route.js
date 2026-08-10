import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { supabase } from "@/lib/supabaseAdmin";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get('doctor_id');

    if (!doctorId) {
      return failure("doctor_id is required", null, 400, { headers: corsHeaders });
    }

    const { data: reviews, error } = await supabase
      .from("doctor_reviews")
      .select("*, patient_details(full_name, profile_picture)")
      .eq("doctor_id", doctorId)
      .order('created_at', { ascending: false });

    if (error) {
       console.log("Error fetching reviews:", error);
       return success("Fetched reviews", [], 200, { headers: corsHeaders });
    }

    return success("Fetched reviews successfully", reviews || [], 200, { headers: corsHeaders });
  } catch (error) {
    console.error("GET /api/reviews/doctor/get error:", error);
    return failure("Failed to fetch reviews.", error.message, 500, { headers: corsHeaders });
  }
}
