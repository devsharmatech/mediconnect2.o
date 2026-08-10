import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// GET — Single lab details for patient view
export async function GET(req, { params }) {
    try {
        const { id } = await params;

        if (!id) {
            return failure("Lab ID is required", null, 400, { headers: corsHeaders });
        }

        const { data, error } = await supabase
            .from("lab_details")
            .select(`
                id,
                lab_name,
                owner_name,
                email,
                phone_number,
                contact_person,
                address,
                latitude,
                longitude,
                license_number,
                opening_hours,
                services,
                accepts_home_collection,
                general_turnaround,
                rating,
                total_reviews,
                users!inner(
                    id,
                    profile_picture,
                    role
                )
            `)
            .eq("id", id)
            .eq("users.role", "lab")
            .eq("onboarding_status", "approved")
            .single();

        if (error) {
            if (error?.code === "PGRST116" || /Results contain 0 rows/.test(error.message || "")) {
                return failure("Lab not found or not approved", null, 404, { headers: corsHeaders });
            }
            throw error;
        }

        // Log activity
        const patient_id = new URL(req.url).searchParams.get("patient_id");
        if (patient_id) {
            await supabase.from("lab_activity_logs").insert({
                lab_id: id,
                action: "PATIENT_VIEW_LAB",
                details: { patient_id },
            });
        }

        return success("Lab details fetched successfully", data, 200, { headers: corsHeaders });
    } catch (error) {
        console.error("Patient lab detail error:", error);
        return failure("Failed to fetch lab details", error.message, 500, { headers: corsHeaders });
    }
}
