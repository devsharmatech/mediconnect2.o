import { supabase } from "@/lib/supabaseAdmin";
import { AI_CONFIG } from "./config";

/**
 * Log an AI Chat interaction securely.
 * Automatically injects the precise configuration versions used for compliance.
 */
export async function logAIChatInteraction({
    userId,
    sessionId,
    userMessage,
    aiResponse = null,
    blockedResponse = null,
    eventType = "NORMAL"
}) {
    try {
        console.log(`[AI Logging] Attempting to insert ai_chat_log | userId=${userId} | sessionId=${sessionId} | eventType=${eventType}`);

        const { data, error } = await supabase.from("ai_chat_logs").insert([
            {
                user_id: userId,
                session_id: sessionId,
                user_message: userMessage,
                ai_response: aiResponse,
                blocked_response: blockedResponse,
                model_name: AI_CONFIG.MODEL_NAME,
                model_version: AI_CONFIG.MODEL_VERSION,
                system_prompt_version: AI_CONFIG.SYSTEM_PROMPT_VERSION,
                moderation_rules_version: AI_CONFIG.MODERATION_RULES_VERSION,
                emergency_rules_version: AI_CONFIG.EMERGENCY_RULES_VERSION,
                event_type: eventType,
            },
        ]);

        if (error) {
            console.error("[AI Logging] ❌ INSERT FAILED:", JSON.stringify(error, null, 2));
        } else {
            console.log("[AI Logging] ✅ INSERT SUCCESS:", data);
        }

        return { data, error };
    } catch (err) {
        console.error("[AI Logging] ❌ EXCEPTION during insert:", err);
        return { data: null, error: err };
    }
}

/**
 * Log a Lung/Cardio tool interaction.
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
        const { data, error } = await supabase.from("ai_tool_interactions").insert([
            {
                user_id: userId,
                tool_name: toolName,
                input_json: inputJson,
                risk_level: riskLevel,
                urgency_classification: urgencyClassification,
                recommendation: recommendation,
                model_version: `${AI_CONFIG.MODEL_NAME}-${AI_CONFIG.MODEL_VERSION}`,
            },
        ]).select().single();

        if (error) {
            console.error("[CRITICAL] Failed to log AI tool interaction:", error);
        }

        return data;
    } catch (err) {
        console.error("[CRITICAL] System exception during AI tool logging:", err);
        return null;
    }
}

/**
 * Audit log a doctor's manual override of an AI tool's output.
 */
export async function logDoctorOverride({
    interactionId,
    doctorId,
    status,
    notes,
}) {
    try {
        const { error } = await supabase
            .from("ai_tool_interactions")
            .update({
                doctor_id: doctorId,
                ai_output_status: status, // ACKNOWLEDGED, OVERRIDDEN, IGNORED
                doctor_override_notes: notes,
                confirmation_timestamp: new Date().toISOString(),
            })
            .eq("id", interactionId);

        if (error) {
            console.error("[CRITICAL] Failed to log doctor override:", error);
        }
    } catch (err) {
        console.error("[CRITICAL] System exception during doctor override logging:", err);
    }
}
