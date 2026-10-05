import sql from "@/lib/db";
import { AI_CONFIG } from "./config";

function isValidUuid(val) {
    return typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

/**
 * Log an AI Chat interaction securely into AWS RDS PostgreSQL.
 * Automatically injects the precise configuration versions used for compliance.
 */
export async function logAIChatInteraction({
    userId,
    sessionId,
    userMessage,
    aiResponse = null,
    blockedResponse = null,
    eventType = "NORMAL",
    requestId = null,
    routeId = null,
    routeDecision = null,
    knowledgeVersion = "V2.6",
    reasonCode = null,
    auditMetadata = null,
}) {
    try {
        console.log(`[AI Logging] Inserting ai_chat_log to AWS RDS | userId=${userId} | sessionId=${sessionId} | routeId=${routeId} | eventType=${eventType}`);

        const validUserId = isValidUuid(userId) ? userId : null;
        const serializedAiResponse = typeof aiResponse === "object" && aiResponse !== null ? JSON.stringify(aiResponse) : (aiResponse ? String(aiResponse) : null);
        const serializedBlocked = typeof blockedResponse === "object" && blockedResponse !== null ? JSON.stringify(blockedResponse) : (blockedResponse ? String(blockedResponse) : null);
        const serializedMetadata = auditMetadata ? JSON.stringify(auditMetadata) : null;

        const rows = await sql`
            INSERT INTO ai_chat_logs (
                user_id,
                session_id,
                user_message,
                ai_response,
                blocked_response,
                model_name,
                model_version,
                system_prompt_version,
                moderation_rules_version,
                emergency_rules_version,
                event_type,
                request_id,
                route_id,
                route_decision,
                knowledge_version,
                reason_code,
                audit_metadata
            ) VALUES (
                ${validUserId},
                ${sessionId || null},
                ${userMessage || null},
                ${serializedAiResponse},
                ${serializedBlocked},
                ${AI_CONFIG.MODEL_NAME},
                ${AI_CONFIG.MODEL_VERSION},
                ${AI_CONFIG.SYSTEM_PROMPT_VERSION},
                ${AI_CONFIG.MODERATION_RULES_VERSION},
                ${AI_CONFIG.EMERGENCY_RULES_VERSION},
                ${eventType},
                ${requestId || null},
                ${routeId || null},
                ${routeDecision || null},
                ${knowledgeVersion || "V2.6"},
                ${reasonCode || null},
                ${serializedMetadata}::jsonb
            )
            RETURNING id, timestamp;
        `;

        const record = rows[0] || null;
        console.log("[AI Logging] ✅ RDS INSERT SUCCESS:", record?.id);
        return { data: record, error: null };
    } catch (err) {
        console.error("[AI Logging] ❌ RDS INSERT EXCEPTION:", err);
        return { data: null, error: err };
    }
}

/**
 * Log a Lung/Cardio tool interaction into AWS RDS PostgreSQL.
 */
export async function logAIToolInteraction({
    userId,
    toolName,
    inputJson,
    riskLevel,
    urgencyClassification,
    recommendation,
}) {
    try {
        const validUserId = isValidUuid(userId) ? userId : null;
        const serializedInput = typeof inputJson === "object" && inputJson !== null ? JSON.stringify(inputJson) : (inputJson || "{}");

        const rows = await sql`
            INSERT INTO ai_tool_interactions (
                user_id,
                tool_name,
                input_json,
                risk_level,
                urgency_classification,
                recommendation,
                model_version
            ) VALUES (
                ${validUserId},
                ${toolName},
                ${serializedInput}::jsonb,
                ${riskLevel || null},
                ${urgencyClassification || null},
                ${recommendation || null},
                ${`${AI_CONFIG.MODEL_NAME}-${AI_CONFIG.MODEL_VERSION}`}
            )
            RETURNING *;
        `;

        return rows[0] || null;
    } catch (err) {
        console.error("[CRITICAL] Failed to log AI tool interaction to AWS RDS:", err);
        return null;
    }
}

/**
 * Audit log a doctor's manual override of an AI tool's output in AWS RDS PostgreSQL.
 */
export async function logDoctorOverride({
    interactionId,
    doctorId,
    status,
    notes,
}) {
    try {
        const validDoctorId = isValidUuid(doctorId) ? doctorId : null;
        await sql`
            UPDATE ai_tool_interactions
            SET 
                doctor_id = ${validDoctorId},
                ai_output_status = ${status},
                doctor_override_notes = ${notes || null},
                confirmation_timestamp = NOW()
            WHERE id = ${interactionId}::uuid;
        `;
    } catch (err) {
        console.error("[CRITICAL] System exception during doctor override logging to AWS RDS:", err);
    }
}

