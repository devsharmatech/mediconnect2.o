import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";

/**
 * POST /api/user/data/anonymize
 * DPDP Compliant Anonymization. Removes PII but retains clinical data for aggregate analytics.
 */
export async function POST(req) {
    try {
        const body = await req.json();
        const { user_id, reason } = body;

        if (!user_id) {
            return failure("user_id is required", null, 400);
        }

        // 1. Verify User Exists and Get Role
        const { data: user } = await supabase.from("users").select("id, role").eq("id", user_id).single();
        if (!user) return failure("User not found", null, 404);

        // 2. Anonymize Base User (Mask phone_number, profile_picture)
        const { error: userErr } = await supabase
            .from("users")
            .update({
                phone_number: "ANONYMIZED_" + user_id.substring(0, 8),
                profile_picture: null,
            })
            .eq("id", user_id);

        if (userErr) throw userErr;

        // 3. Anonymize Role-Specific Details Table
        const roleTables = {
            admin: "admin_details",
            doctor: "doctor_details",
            patient: "patient_details",
            chemist: "chemist_details",
            pharmacist: "pharmacist_details",
            lab: "lab_details",
        };

        const detailsTable = roleTables[user.role];
        if (detailsTable) {
            const updatePayload = {
                full_name: user.role === "doctor" ? "DE-IDENTIFIED CLINICIAN" : "DE-IDENTIFIED USER",
                email: `anonymized_${user_id.substring(0, 8)}@mediconnect.fit`,
            };

            // Only update columns that actually exist in details schemas
            if (user.role === "patient") {
                updatePayload.address = "ANONYMIZED";
                updatePayload.date_of_birth = "1970-01-01"; // Mask birthdate safely
            } else if (user.role === "doctor") {
                updatePayload.clinic_address = "ANONYMIZED";
                updatePayload.clinic_name = "ANONYMIZED";
                updatePayload.license_number = "ANONYMIZED";
            }

            const { error: detailsErr } = await supabase
                .from(detailsTable)
                .update(updatePayload)
                .eq("id", user_id);

            if (detailsErr) throw detailsErr;
        }

        // 4. Log Anonymization Action (Safely caught)
        try {
            await supabase.from("data_access_log").insert([{
                user_id,
                patient_id: user_id,
                action: "ANONYMIZE_DATA",
                action_type: "anonymize",
                resource_type: "USER_PROFILE",
                status: "completed",
                metadata: { reason: reason || "USER_REQUEST" }
            }]);
        } catch (logErr) {
            console.warn("Anonymization logging warning:", logErr.message);
        }

        return success("User data anonymized successfully. Clinical records de-identified but retained for research.", {
            user_id,
            anonymized_at: new Date().toISOString()
        });

    } catch (err) {
        console.error("POST /api/user/data/anonymize error:", err);
        return failure("Internal server error", err.message, 500);
    }
}


