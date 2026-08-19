import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import OpenAI from "openai";

// V2 Safety Engines
import { detectEmergency } from "@/lib/ai/v2/emergencyEngine";
import { moderateAIOutput } from "@/lib/ai/v2/moderationEngine";
import { logAIChatInteraction } from "@/lib/ai/v2/logging";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
    try {
        const { messages, userId } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return failure("Messages array is required.", null, 400, { headers: corsHeaders });
        }

        // Get the latest user message for V2 safety checks
        const lastUserMessageNode = [...messages].reverse().find(msg => msg.sender === 'user');
        const rawUserText = lastUserMessageNode ? lastUserMessageNode.text : "";

        // V2 SAFETY: Pre-LLM Emergency Detection
        if (rawUserText) {
            const emergencyCheck = detectEmergency(rawUserText);
            if (emergencyCheck.isEmergency) {
                await logAIChatInteraction({
                    userId: userId || "anonymous",
                    sessionId: "screening-chat-" + Date.now(),
                    userMessage: rawUserText,
                    aiResponse: emergencyCheck.response,
                    eventType: "AI_EMERGENCY_ESCALATION",
                });

                return success("Response generated successfully.", {
                    response: emergencyCheck.response,
                    isEmergency: true
                }, 200, { headers: corsHeaders });
            }
        }

        const systemPrompt = `You are an AI Health Assistant for MediConnect, a healthcare platform in Delhi NCR, India. Your role is to:

1. Help patients describe and understand their symptoms
2. Ask clarifying questions to better understand their condition
3. Provide general health information and guidance
4. Suggest when they should see a doctor and what type of specialist might be appropriate
5. Never diagnose conditions - always recommend consulting a healthcare professional for diagnosis

Guidelines:
- Be empathetic and supportive
- Ask one question at a time
- Use simple, easy-to-understand language
- If symptoms sound serious or emergency (chest pain, difficulty breathing, severe bleeding, etc.), immediately recommend going to emergency services
- Collect information about: symptom duration, severity, associated symptoms, any medications taken
- At the end of the conversation, provide a summary and recommendation

Remember: You are NOT a replacement for professional medical advice. Always encourage users to consult with qualified healthcare providers.`;

        const chatMessages = [
            { role: "system", content: systemPrompt },
            ...messages.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.text
            }))
        ];

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: chatMessages,
            max_tokens: 500,
            temperature: 0.7,
        });

        const rawAiResponse = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process your request. Please try again.";

        // V2 SAFETY: Post-LLM Moderation Engine
        const moderationResult = moderateAIOutput(rawAiResponse);
        let finalResponse = rawAiResponse;

        if (!moderationResult.isSafe) {
            finalResponse = moderationResult.cleanResponse;

            await logAIChatInteraction({
                userId: userId || "anonymous",
                sessionId: "screening-chat-" + Date.now(),
                userMessage: rawUserText,
                aiResponse: moderationResult.cleanResponse,
                blockedResponse: rawAiResponse,
                eventType: "AI_OUTPUT_MODERATION_TRIGGER",
            });
        } else {
            await logAIChatInteraction({
                userId: userId || "anonymous",
                sessionId: "screening-chat-" + Date.now(),
                userMessage: rawUserText,
                aiResponse: finalResponse,
                eventType: "NORMAL",
            });
        }

        return success("Response generated successfully.", {
            response: finalResponse,
            moderated: !moderationResult.isSafe
        }, 200, { headers: corsHeaders });

    } catch (error) {
        console.error("V2 AI Health Chat Error:", error);

        // Fallback response if OpenAI fails
        const fallbackResponse = "I apologize, but I'm having trouble connecting right now. For immediate health concerns, please contact your healthcare provider or visit the nearest hospital. You can also try again in a few moments.";

        return success("Response generated with fallback.", {
            response: fallbackResponse,
            error: true
        }, 200, { headers: corsHeaders });
    }
}
