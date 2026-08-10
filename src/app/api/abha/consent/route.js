import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
    try {
        const { user_id, purpose, scope, status, details } = await req.json();

        if (!user_id || !purpose || !scope) {
            return failure("Missing required consent fields.", null, 400, { headers: corsHeaders });
        }

        const { data, error } = await supabase
            .from("abha_consent_logs")
            .insert([
                {
                    user_id,
                    purpose,
                    scope, // Array of strings e.g. ['view_profile', 'link_records']
                    status: status || 'granted',
                    details,
                    // ip_address: req.headers.get("x-forwarded-for") || "unknown" // Optional: Capture IP
                }
            ])
            .select()
            .single();

        if (error) throw error;

        return success("Consent recorded successfully.", data, 200, { headers: corsHeaders });

    } catch (error) {
        console.error("ABHA Consent Log Error:", error);
        return failure("Failed to record consent.", error.message, 500, { headers: corsHeaders });
    }
}
