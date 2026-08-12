import { NextResponse } from "next/server";
import OpenAI from "openai";
import { corsHeaders } from "@/lib/cors";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

import { CHATBOT_CONFIG } from "@/lib/ai/v2/config";
import { validateChatSession } from "@/lib/ai/v2/sessionControl";
import { detectEmergency } from "@/lib/ai/v2/emergencyEngine";
import { moderateAIOutput } from "@/lib/ai/v2/moderationEngine";
import { logAIChatInteraction } from "@/lib/ai/v2/logging";

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req) {
    try {
        const { messages, userId = "anonymous", sessionId, source = "website" } = await req.json();
        console.log(`[Website Chatbot] Request received | userId=${userId} | sessionId=${sessionId} | messages=${messages?.length} | source=${source}`);

        if (!sessionId || !messages || !Array.isArray(messages)) {
            console.warn(`[Website Chatbot] Missing required fields | sessionId=${sessionId}`);
            return NextResponse.json(
                { success: false, message: "Missing required fields." },
                { status: 400, headers: corsHeaders }
            );
        }

        // 1. Session Control (Rate limits, token limits, timeouts) using CHATBOT_CONFIG
        const sessionCheck = await validateChatSession(userId, sessionId, CHATBOT_CONFIG);
        console.log(`[Website Chatbot] Session check result: allowed=${sessionCheck.allowed} reason=${sessionCheck.reason || 'OK'}`);
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

        // 2. Pre-LLM Misuse Filter (Basic checks)
        const lowerText = rawUserText.toLowerCase();
        const offTopicKeywords = [
            "write me a python script", "write me code", "write a poem", "who won", "president", 
            "sports", "weather in", "recipe", "ignore previous instructions", "act as dan", "pretend you are"
        ];
        const isOffTopic = offTopicKeywords.some(kw => lowerText.includes(kw));
        
        if (isOffTopic) {
            const declineMsg = "I'm the MediConnect Assistant and can only help with health-related and platform-related questions. How can I assist you with MediConnect today?";
            await logAIChatInteraction({
                userId,
                sessionId,
                userMessage: rawUserText,
                aiResponse: declineMsg,
                eventType: "AI_MISUSE_PREVENTION",
            });
            return NextResponse.json(
                { success: true, response: declineMsg },
                { status: 200, headers: corsHeaders }
            );
        }

        // 3. Emergency Detection Engine (Pre-LLM)
        const emergencyCheck = detectEmergency(rawUserText);
        console.log(`[Website Chatbot] Emergency check: isEmergency=${emergencyCheck.isEmergency}`);
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

        // 4. System Prompt for Mediconnect Website Assistant
        const systemPromptMessage = {
            role: "system",
            content: `IDENTITY:
You are the MediConnect Assistant — a helpful, friendly, and professional AI guide for the MediConnect healthcare platform in India. Your name is "MediConnect Assistant".

STRICT SCOPE RULES (MUST FOLLOW):
1. You ONLY answer questions related to MediConnect platform, its services, healthcare navigation, and general health awareness.
2. If a user asks ANYTHING unrelated (e.g., coding help, weather, politics, sports, recipes, general knowledge), you MUST politely decline and redirect. Example: "I'm the MediConnect Assistant and can only help with health-related and platform-related questions. Can I help you find a doctor or learn about ABHA?"
3. You CANNOT diagnose medical conditions.
4. You CANNOT recommend specific medications or dosages.
5. You CANNOT give probability percentages for any disease.
6. ALWAYS suggest consulting a real doctor for medical concerns.
7. For emergencies, immediately direct to 112 or 108.
8. You represent MediConnect professionally. Be warm but concise.

MEDICONNECT KNOWLEDGE BASE:

--- PLATFORM ---
• MediConnect is India's digital health platform connecting patients with verified doctors, pharmacies (chemists), labs, and health services.
• Website: mediconnect.fit
• Support hours: 9 AM to 9 PM, all days.
• For emergencies: Call 112 (Emergency) or 108 (Ambulance). MediConnect is NOT an emergency service.

--- APPOINTMENTS ---
• Patients can book Video Consultations and In-Clinic Consultations.
• Filter doctors by speciality, location, or availability.
• Doctor fees are displayed upfront on each profile.
• All doctors on MediConnect are verified with valid medical registrations.
• To book: Visit mediconnect.fit/website/doctors
• Specialities include: Cardiology, Dermatology, Orthopedics, Neurology, Pediatrics, Gynecology, ENT, Ophthalmology, Psychiatry, General Medicine, and more (15+ total).

--- ABHA (Ayushman Bharat Health Account) ---
• ABHA is a free, unique 14-digit digital health ID issued by the Government of India.
• Patients can store prescriptions, lab reports, and health records digitally.
• Can be created using Aadhaar, Mobile number, or Driving License.
• MediConnect helps you create your ABHA for free.
• Link: mediconnect.fit/website/abha

--- CHEMIST / PHARMACY ---
• MediConnect partners with verified local chemists.
• Patients can access pharmacy services through the platform.
• Chemists can also register/onboard to the platform at: mediconnect.fit/chemist/login

--- DOCTOR ONBOARDING ---
• Doctors can self-onboard to expand their digital practice.
• The onboarding is simple and requires medical registration details + KYC.
• Link: mediconnect.fit/doctor/onboarding

--- PRICING & PAYMENTS ---
• ABHA creation is completely FREE.
• Consultation fees vary per doctor and are shown on their profile before booking.
• Accepted payments: UPI, Credit/Debit Cards, Net Banking, Digital Wallets.
• All transactions use bank-grade encryption.

--- HEALTH RECORDS & PRIVACY ---
• All health data is encrypted and stored securely.
• Data is only shared with the patient's explicit consent.
• Follows ABDM (Ayushman Bharat Digital Mission) guidelines.

--- CANCELLATIONS & REFUNDS ---
• Appointments can be cancelled or rescheduled from the patient dashboard.
• Refund eligibility depends on the cancellation timeframe.
• For specific refund queries, contact support at mediconnect.fit/website/contact

--- MOBILE APP ---
• The MediConnect Patient App is available for mobile users.
• Features: book appointments, AI health assistant, health records, order medicines.

RESPONSE FORMAT RULES:
- Keep responses concise (max 3-4 sentences for simple queries).
- Use bullet points only when listing 3+ items.
- Always end symptom-related queries by asking if the user would like to consult a doctor.
- Respond in the same language the user writes in (Hindi or English).
- If you suggest navigating somewhere, include a JSON action block at the VERY END of your response in this exact format:
  {"action": {"label": "Browse Doctors", "url": "/website/doctors"}}
  (Ensure the JSON is on a new line and formatted exactly like this. Available URLs: /website/doctors, /website/abha, /chemist/login, /doctor/onboarding, /website/contact)`,
        };

        // Construct safe message array
        const safeMessages = [systemPromptMessage, ...messages];

        // 5. OpenAI Call
        const completion = await openai.chat.completions.create({
            model: CHATBOT_CONFIG.MODEL_NAME,
            messages: safeMessages,
            temperature: 0.5,
            max_tokens: 500,
        });

        let rawAIResponse = completion.choices[0]?.message?.content || "";
        let action = null;

        // Try to parse action block at the end
        try {
            const actionMatch = rawAIResponse.match(/\{"action":\s*\{.*\}\}/s);
            if (actionMatch) {
                const actionJson = JSON.parse(actionMatch[0]);
                if (actionJson.action) {
                    action = actionJson.action;
                }
                rawAIResponse = rawAIResponse.replace(actionMatch[0], '').trim();
            }
        } catch (e) {
            console.warn("Failed to parse action block from AI response", e);
        }

        // 6. Post-LLM Moderation Engine
        const moderationResult = moderateAIOutput(rawAIResponse);

        if (!moderationResult.isSafe) {
            console.warn(`[Website Chatbot] Moderation triggered | userId=${userId}`);
            await logAIChatInteraction({
                userId,
                sessionId,
                userMessage: rawUserText,
                aiResponse: moderationResult.cleanResponse,
                blockedResponse: rawAIResponse,
                eventType: "AI_OUTPUT_MODERATION_TRIGGER",
            });

            return NextResponse.json(
                { success: true, response: moderationResult.cleanResponse, moderated: true },
                { status: 200, headers: corsHeaders }
            );
        }

        // 7. Normal Logging & Response
        const { error: logError } = await logAIChatInteraction({
            userId,
            sessionId,
            userMessage: rawUserText,
            aiResponse: rawAIResponse,
            eventType: "NORMAL",
        });
        if (logError) {
            console.error(`[Website Chatbot] ⚠️ Log insert FAILED | userId=${userId} | error=${JSON.stringify(logError)}`);
        }

        return NextResponse.json(
            { success: true, response: rawAIResponse, action: action },
            { status: 200, headers: corsHeaders }
        );

    } catch (error) {
        console.error("Website Chatbot Error:", error);
        
        // Intelligent fallback response engine when AI or external service fails
        const fallbackText = "I'm here to help you navigate MediConnect! You can search for verified doctors, book video or in-clinic consultations, view your lab reports, or order medicines. Would you like to connect with a doctor now?";
        
        return NextResponse.json(
            { 
              success: true, 
              response: fallbackText,
              action: { label: "Browse Verified Doctors", url: "/website/doctors" } 
            },
            { status: 200, headers: corsHeaders }
        );
    }
}
