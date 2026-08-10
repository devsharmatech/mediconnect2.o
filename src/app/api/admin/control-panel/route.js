import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";

/**
 * GET /api/admin/control-panel
 * Fetches current engagement and fatigue thresholds from system_config.
 */
export async function GET() {
    try {
        const { data: configs } = await supabase.from("system_config").select("*");
        
        const responseData = {};
        if (configs) {
            configs.forEach(c => {
                responseData[c.config_key] = c.config_value;
            });
        }

        return success("Control panel configurations fetched", responseData);
    } catch (err) {
        console.error("GET /api/admin/control-panel error:", err);
        return failure("Internal server error", err.message, 500);
    }
}

/**
 * POST /api/admin/control-panel
 * Updates system thresholds (Engagement, Fatigue, Flags).
 */
export async function POST(req) {
    try {
        const body = await req.json();
        const { config_key, config_value, admin_id, reason } = body;

        if (!config_key || !config_value || !admin_id || !reason) {
            return failure("Missing required fields (config_key, config_value, admin_id, reason)", null, 400);
        }

        // 1. Update Config
        const { error: updateErr } = await supabase
            .from("system_config")
            .upsert({ 
                config_key, 
                config_value, 
                updated_at: new Date().toISOString(),
                updated_by: admin_id
            });

        if (updateErr) throw updateErr;

        // 2. Log Admin Action
        await supabase.from("admin_action_log").insert([{
            admin_id,
            action_type: "UPDATE_CONFIG",
            target_type: "SYSTEM_CONFIG",
            target_id: null,
            reason: `Updated ${config_key} to ${JSON.stringify(config_value)}. Reason: ${reason}`
        }]);

        return success("Configuration updated and logged successfully", { config_key, config_value });

    } catch (err) {
        console.error("POST /api/admin/control-panel error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
