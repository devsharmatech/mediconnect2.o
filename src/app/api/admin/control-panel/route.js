import { success, failure } from "@/lib/response";
import sql from "@/lib/db";

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function safeUuid(val) {
  if (!val) return null;
  return UUID_REGEX.test(val) ? val : null;
}

/**
 * GET /api/admin/control-panel
 * Fetches current engagement and fatigue thresholds from system_config via AWS RDS.
 */
export async function GET() {
    try {
        const configs = await sql`
            SELECT config_key, config_value
            FROM system_config
        `;
        
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

        const validAdminId = safeUuid(admin_id);

        // 1. Update Config in RDS
        await sql`
            INSERT INTO system_config (
                config_key, config_value, updated_at, updated_by
            ) VALUES (
                ${config_key},
                ${JSON.stringify(config_value)},
                NOW(),
                ${validAdminId}
            )
            ON CONFLICT (config_key)
            DO UPDATE SET
                config_value = EXCLUDED.config_value,
                updated_at = NOW(),
                updated_by = EXCLUDED.updated_by
        `;

        // 2. Log Admin Action
        try {
            await sql`
                INSERT INTO admin_action_log (
                    admin_id, action_type, target_type, target_id, reason, created_at
                ) VALUES (
                    ${validAdminId},
                    'UPDATE_CONFIG',
                    'SYSTEM_CONFIG',
                    null,
                    ${`Updated ${config_key} to ${JSON.stringify(config_value)}. Reason: ${reason}`},
                    NOW()
                )
            `;
        } catch (logErr) {
            console.warn("Failed to write to admin_action_log:", logErr.message);
        }

        return success("Configuration updated and logged successfully", { config_key, config_value });

    } catch (err) {
        console.error("POST /api/admin/control-panel error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
