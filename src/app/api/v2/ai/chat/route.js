import { NextResponse } from "next/server";
import OpenAI from "openai";
import { corsHeaders } from "@/lib/cors";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// V2 Engines & Config
import { AI_CONFIG } from "@/lib/ai/v2/config";
import { validateChatSession } from "@/lib/ai/v2/sessionControl";
import { detectEmergency } from "@/lib/ai/v2/emergencyEngine";
import { moderateAIOutput } from "@/lib/ai/v2/moderationEngine";
import { logAIChatInteraction } from "@/lib/ai/v2/logging";

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req) {
    try {
        const { messages, userId, sessionId } = await req.json();
        console.log(`[AI Chat] Request received | userId=${userId} | sessionId=${sessionId} | messages=${messages?.length}`);

        if (!userId || !sessionId || !messages || !Array.isArray(messages)) {
            console.warn(`[AI Chat] Missing required fields | userId=${userId} | sessionId=${sessionId}`);
            return NextResponse.json(
                { success: false, message: "Missing required fields." },
                { status: 400, headers: corsHeaders }
            );
        }

        // 1. Session Control (Rate limits, token limits, timeouts)
        const sessionCheck = await validateChatSession(userId, sessionId);
        console.log(`[AI Chat] Session check result: allowed=${sessionCheck.allowed} reason=${sessionCheck.reason || 'OK'}`);
        if (!sessionCheck.allowed) {
            return NextResponse.json(
                { success: false, message: sessionCheck.reason },
                { status: 429, headers: corsHeaders }
            );
        }

        // Get the latest user message
        const lastMessage = messages[messages.length - 1];
        if (!lastMessage || lastMessage.role !== "user") {
            return NextResponse.json(
                { success: false, message: "Invalid message format." },
                { status: 400, headers: corsHeaders }
            );
        }

        const rawUserText = lastMessage.content;

        // 2. Emergency Detection Engine (Pre-LLM)
        const emergencyCheck = detectEmergency(rawUserText);
        console.log(`[AI Chat] Emergency check: isEmergency=${emergencyCheck.isEmergency}`);
        if (emergencyCheck.isEmergency) {
            // Log emergency and abort OpenAI call
            await logAIChatInteraction({
                userId,
                sessionId,
                userMessage: rawUserText,
                aiResponse: emergencyCheck.response,
                eventType: "AI_EMERGENCY_ESCALATION",
            });

            return NextResponse.json(
                { success: true, response: emergencyCheck.response, isEmergency: true },
                { status: 200, headers: corsHeaders }
            );
        }

        // 3. Locked System Prompt (Governed)
        const systemPromptMessage = {
            role: "system",
            content: `You are an AI Health Assistant. 
RULES:
1. No diagnosis.
2. No treatment plans.
3. No medication suggestions.
4. No dosages.
5. No probability %.
6. No clinical certainty.
7. Advisory tone only.
8. ALWAYS recommend doctor consultation for medical concerns.
9. End symptom conversations by asking if they would like to consult a doctor.`,
        };

        // Construct safe message array
        const safeMessages = [systemPromptMessage, ...messages];

        // 4. OpenAI Call
        const completion = await openai.chat.completions.create({
            model: AI_CONFIG.MODEL_NAME,
            messages: safeMessages,
            temperature: 0.5, // Lower temperature for more deterministic, safer output
            max_tokens: 500,
        });

        const rawAIResponse = completion.choices[0]?.message?.content || "";

        // 5. Post-LLM Moderation Engine
        const moderationResult = moderateAIOutput(rawAIResponse);

        if (!moderationResult.isSafe) {
            console.warn(`[AI Chat] Moderation triggered | userId=${userId}`);
            // Log blocked attempt
            await logAIChatInteraction({
                userId,
                sessionId,
                userMessage: rawUserText,
                aiResponse: moderationResult.cleanResponse,
                blockedResponse: rawAIResponse, // Store what was blocked for audit
                eventType: "AI_OUTPUT_MODERATION_TRIGGER",
            });

            return NextResponse.json(
                { success: true, response: moderationResult.cleanResponse, moderated: true },
                { status: 200, headers: corsHeaders }
            );
        }

        // 6. Normal Logging & Response
        const { error: logError } = await logAIChatInteraction({
            userId,
            sessionId,
            userMessage: rawUserText,
            aiResponse: rawAIResponse,
            eventType: "NORMAL",
        });
        if (logError) {
            console.error(`[AI Chat] ⚠️ Log insert FAILED | userId=${userId} | error=${JSON.stringify(logError)}`);
        } else {
            console.log(`[AI Chat] ✅ Log inserted successfully | userId=${userId}`);
        }

        return NextResponse.json(
            { success: true, response: rawAIResponse },
            { status: 200, headers: corsHeaders }
        );

    } catch (error) {
        console.error("V2 AI Chat Error:", error);
        return NextResponse.json(
            { success: false, message: "System temporarily unavailable." },
            { status: 500, headers: corsHeaders }
        );
    }
}
