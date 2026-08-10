import { supabase } from "@/lib/supabaseAdmin";
import { AI_CONFIG } from "./config";

/**
 * Enforce Session Controls (Rate Limiting, Max Messages)
 * Since Vercel Edge/Serverless functions are stateless, we use Supabase to check counts.
 */
export async function validateChatSession(userId, sessionId, config = AI_CONFIG) {
    try {
        // 1. Check total messages in this session
        const { count: sessionMessageCount, error: sessionError } = await supabase
            .from("ai_chat_logs")
            .select("*", { count: 'exact', head: true })
            .eq("user_id", userId)
            .eq("session_id", sessionId);

        if (sessionError) {
            console.warn("[sessionControl] Could not query ai_chat_logs – allowing request:", sessionError.message);
            return { allowed: true };
        }

        if (sessionMessageCount >= config.MAX_MESSAGES_PER_SESSION) {
            return {
                allowed: false,
                reason: `Session message limit (${config.MAX_MESSAGES_PER_SESSION}) reached. Please start a new consultation.`
            };
        }

        // 2. Timeout check
        if (sessionMessageCount > 0) {
            const { data: firstMessage } = await supabase
                .from("ai_chat_logs")
                .select("timestamp")
                .eq("user_id", userId)
                .eq("session_id", sessionId)
                .order("timestamp", { ascending: true })
                .limit(1)
                .single();

            if (firstMessage) {
                const startTime = new Date(firstMessage.timestamp).getTime();
                const now = new Date().getTime();
                const diffMinutes = (now - startTime) / (1000 * 60);

                if (diffMinutes > config.SESSION_TIMEOUT_MINUTES) {
                    return {
                        allowed: false,
                        reason: `Session timed out after ${config.SESSION_TIMEOUT_MINUTES} minutes. Please start a new chat.`
                    };
                }
            }
        }

        // 3. Count unique sessions created by this user today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: recentSessions, error: recentError } = await supabase
            .from("ai_chat_logs")
            .select("session_id")
            .eq("user_id", userId)
            .gte("timestamp", today.toISOString());

        if (!recentError && recentSessions) {
            const uniqueSessions = new Set(recentSessions.map(r => r.session_id));
            if (!uniqueSessions.has(sessionId) && uniqueSessions.size >= config.MAX_SESSIONS_PER_DAY) {
                return {
                    allowed: false,
                    reason: `Daily limit of ${config.MAX_SESSIONS_PER_DAY} consultations reached. Try again tomorrow.`
                };
            }
        }

        return { allowed: true };

    } catch (err) {
        console.error("[sessionControl] Exception - allowing request:", err);
        return { allowed: true };
    }
}
