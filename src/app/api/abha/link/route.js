import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { sanitizeProfile } from "@/lib/abha/abhaService";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
    try {
        const { user_id, abha_profile } = await req.json();

        if (!user_id || !abha_profile) {
            return failure("User ID and ABHA Profile are required.", null, 400, { headers: corsHeaders });
        }

        const profile = sanitizeProfile(abha_profile);

        const { data, error } = await supabase
            .from("patient_abha")
            .upsert(
                {
                    user_id,
                    abha_number: profile.abhaNumber,
                    abha_address: profile.preferredAbhaAddress,
                    status: profile.status || "active",
                    verification_status: profile.verificationStatus || null,
                    linked_at: new Date().toISOString(),
                },
                { onConflict: "user_id" }
            )
            .select()
            .single();

        if (error) throw error;

        return success("ABHA linked successfully.", data, 200, { headers: corsHeaders });
    } catch (error) {
        console.error("ABHA Link Error:", error);
        return failure("Failed to link ABHA.", error.message, 500, { headers: corsHeaders });
    }
}
