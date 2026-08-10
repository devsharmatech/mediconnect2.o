import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";

/**
 * GET /api/user/data/export
 * DPDP Compliant Data Export. Aggregates all user data for portability.
 */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const user_id = searchParams.get("user_id");

        if (!user_id) {
            return failure("user_id is required", null, 400);
        }

        // 1. Log Data Access (Compliance Requirement)
        await supabase.from("data_access_log").insert([{
            user_id,
            action: "EXPORT_DATA",
            resource_type: "USER_PROFILE",
            ip_address: req.headers.get("x-forwarded-for") || "unknown"
        }]);

        // 2. Aggregate Data
        // Profile
        const { data: profile } = await supabase.from("users").select("*").eq("id", user_id).single();
        
        // Consultations
        const { data: consultations } = await supabase.from("consultations").select("*").eq("patient_id", user_id);
        
        // Clinical Data (Via join or separate queries)
        const { data: clinical } = await supabase.from("consultation_clinical").select("*").in("consultation_id", consultations?.map(c => c.id) || []);
        
        // Consent Logs
        const { data: consents } = await supabase.from("consent_logs").select("*").eq("patient_id", user_id);
        
        // Activity Logs
        const { data: activity } = await supabase.from("activity_log").select("*").eq("patient_id", user_id);

        const exportPackage = {
            metadata: {
                user_id,
                export_date: new Date().toISOString(),
                format_version: "DPDP-1.0"
            },
            profile,
            medical_history: {
                consultations,
                clinical_records: clinical
            },
            compliance_records: {
                consents
            },
            interaction_history: activity
        };

        return success("Data export package generated", exportPackage);

    } catch (err) {
        console.error("GET /api/user/data/export error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
