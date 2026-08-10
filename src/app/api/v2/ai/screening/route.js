import { NextResponse } from "next/server";
import { openai, supabase } from "@/lib/supabaseAdmin";
import { v4 as uuidv4 } from "uuid";

// V2 Safety Engines
import { detectEmergency } from "@/lib/ai/v2/emergencyEngine";
import { moderateAIOutput } from "@/lib/ai/v2/moderationEngine";
import { logAIToolInteraction } from "@/lib/ai/v2/logging";

export async function POST(req) {
    try {
        const body = await req.json();
        const { patient_id, initial_symptoms } = body;

        if (!patient_id || !initial_symptoms) {
            return NextResponse.json(
                {
                    status: false,
                    message: `Missing required fields: patient_id, initial_symptoms`,
                },
                { status: 400 }
            );
        }

        // V2 SAFETY: Pre-LLM Emergency Detection
        const emergencyCheck = detectEmergency(initial_symptoms);
        if (emergencyCheck.isEmergency) {
            await logAIToolInteraction({
                userId: patient_id,
                toolName: "screening_flow_start",
                inputJson: { initial_symptoms },
                riskLevel: "critical",
                urgencyClassification: "URGENT",
                recommendation: emergencyCheck.response
            });

            return NextResponse.json({
                status: false,
                message: emergencyCheck.response,
                isEmergency: true
            });
        }

        // Step 1: Strict intent filter
        const checkPrompt = `
You are a strict classifier for a healthcare assistant.

Determine if the user's message is **medical-related** — meaning it involves
symptoms, diseases, body parts, pain, health issues, medications, or treatment.

If it is **not clearly medical or disease-related**, mark it as false.

Examples of valid (is_medical = true):
- "I have a headache and fever"
- "My stomach hurts"
- "I feel dizzy"
- "What causes diabetes?"
- "Is chest pain serious?"

Examples of invalid (is_medical = false):
- "Who won the cricket match?"
- "Tell me a joke"
- "What time is it?"
- "Play a song"
- "Who is the Prime Minister?"
- "Open Google"

Return **only JSON**:
{
  "is_medical": true | false
}

User message: "${initial_symptoms}"
`;

        const checkRes = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: checkPrompt }],
        });

        let classification;
        try {
            classification = JSON.parse(checkRes.choices?.[0]?.message?.content || "{}");
        } catch {
            classification = { is_medical: false };
        }

        // Step 2: Block all non-medical inputs
        if (!classification.is_medical) {
            return NextResponse.json({
                status: false,
                message: "Sorry, I can only answer medical or disease-related questions.",
            });
        }

        // Step 3: Proceed for medical inputs only
        const screening_id = uuidv4();

        const prompt = `
You are Mediconnect AI — a professional medical triage assistant.

The patient says: "${initial_symptoms}".

Ask ONE short, clear, medically-relevant follow-up question to understand more about their symptoms.
Do NOT answer non-medical questions.

Return strictly JSON:
{
  "question": { "id": "q1", "text": "string", "type": "text" }
}
`;

        const aiRes = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: prompt }],
        });

        let aiData;
        try {
            aiData = JSON.parse(aiRes.choices?.[0]?.message?.content || "{}");
        } catch {
            aiData = {
                question: { id: "q1", text: "Can you tell me more about your symptoms?", type: "text" },
            };
        }

        // V2 SAFETY: Post-LLM Moderation on the generated question
        const moderationResult = moderateAIOutput(aiData.question.text);
        if (!moderationResult.isSafe) {
            aiData.question.text = moderationResult.cleanResponse;
        }

        // Step 4: Store in Supabase
        await supabase.from("screening_sessions").insert([
            {
                id: screening_id,
                patient_id,
                stage: 0, // always starts at stage 0
                initial_symptoms,
                questions: [aiData.question],
                answers: [{ question_id: "q0", answer: initial_symptoms }],
                status: "in_progress",
                created_at: new Date(),
                updated_at: new Date(),
            },
        ]);

        // V2 SAFETY: Immutable Tool Logging
        await logAIToolInteraction({
            userId: patient_id,
            toolName: "screening_flow_start",
            inputJson: { initial_symptoms, screening_id },
            riskLevel: "low",
            urgencyClassification: "ROUTINE",
            recommendation: aiData.question.text
        });

        return NextResponse.json({
            status: true,
            screening_id,
            stage: 0,
            next_question: aiData.question,
        });
    } catch (error) {
        console.error("V2 Screening Start Error:", error);

        const isQuotaError =
            error?.status === 429 ||
            (typeof error?.message === "string" &&
                error.message.includes("You exceeded your current quota"));

        const message = isQuotaError
            ? "The screening assistant is temporarily unavailable. Please try again later, or describe your concern directly to a doctor."
            : "Something went wrong while starting your screening. Please try again.";

        return NextResponse.json(
            {
                status: false,
                message,
                ...(isQuotaError ? { code: "OPENAI_QUOTA_EXCEEDED" } : {}),
            },
            { status: isQuotaError ? 503 : 500 }
        );
    }
}
