import sql from "@/lib/db";
import { AI_CONFIG } from "./config";

function isValidUuid(val) {
    return typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

/**
 * Enforce Session Controls (Rate Limiting, Max Messages) via AWS RDS PostgreSQL.
 */
export async function validateChatSession(userId, sessionId, config = AI_CONFIG) {
    try {
        const validUserId = isValidUuid(userId) ? userId : null;

        // 1. Check total messages in this session
        const countRes = validUserId
            ? await sql`
                SELECT COUNT(*)::int AS count, MIN(timestamp) AS first_timestamp
                FROM ai_chat_logs
                WHERE user_id = ${validUserId} AND session_id = ${sessionId}
            `
            : await sql`
                SELECT COUNT(*)::int AS count, MIN(timestamp) AS first_timestamp
                FROM ai_chat_logs
                WHERE session_id = ${sessionId}
            `;

        const sessionMessageCount = countRes[0]?.count || 0;
        const firstTimestamp = countRes[0]?.first_timestamp;

        if (sessionMessageCount >= config.MAX_MESSAGES_PER_SESSION) {
            return {
                allowed: false,
                reason: `Session message limit (${config.MAX_MESSAGES_PER_SESSION}) reached. Please start a new consultation.`
            };
        }

        // 2. Timeout check
        if (sessionMessageCount > 0 && firstTimestamp) {
            const startTime = new Date(firstTimestamp).getTime();
            const now = Date.now();
            const diffMinutes = (now - startTime) / (1000 * 60);

            if (diffMinutes > config.SESSION_TIMEOUT_MINUTES) {
                return {
                    allowed: false,
                    reason: `Session timed out after ${config.SESSION_TIMEOUT_MINUTES} minutes. Please start a new chat.`
                };
            }
        }

        // 3. Count unique sessions created by this user today (if user is authenticated)
        if (validUserId) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const sessionsRes = await sql`
                SELECT DISTINCT session_id
                FROM ai_chat_logs
                WHERE user_id = ${validUserId}
                  AND timestamp >= ${today.toISOString()}
            `;

            const uniqueSessions = new Set(sessionsRes.map(r => r.session_id));
            if (!uniqueSessions.has(sessionId) && uniqueSessions.size >= config.MAX_SESSIONS_PER_DAY) {
                return {
                    allowed: false,
                    reason: `Daily limit of ${config.MAX_SESSIONS_PER_DAY} consultations reached. Try again tomorrow.`
                };
            }
        }

        return { allowed: true };

    } catch (err) {
        console.error("[sessionControl] AWS RDS Exception - allowing request:", err);
        return { allowed: true };
    }
}

