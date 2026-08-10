import { NextResponse } from "next/server";
import { openai, supabase } from "@/lib/supabaseAdmin";

// V2 Safety Engines
import { detectEmergency } from "@/lib/ai/v2/emergencyEngine";
import { moderateAIOutput } from "@/lib/ai/v2/moderationEngine";
import { logAIToolInteraction } from "@/lib/ai/v2/logging";
import { logActivity } from "@/lib/layer1/activityLogger";
import { createCareEpisode } from "@/lib/layer1/careEpisodeService";

/* -------------------- HELPERS -------------------- */

function safeJSONParse(str, fallback = {}) {
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error("JSON parse failed:", str);
    return fallback;
  }
}

function cleanInput(text) {
  return text?.trim().slice(0, 500) || "";
}

/* -------------------- AI VALIDATE ANSWER -------------------- */

async function validateAnswerAI({ question, answer }) {
  const prompt = `
You are Mediconnect AI.

QUESTION ASKED TO PATIENT:
"${question}"

PATIENT ANSWER:
"${answer}"

TASK:
1. Decide if the answer is appropriate and meaningful for this medical question.
2. If NOT appropriate, explain politely what kind of answer is expected.
3. Do NOT diagnose here.

Return STRICT JSON:
{
  "is_valid": true | false,
  "message": "patient-friendly clarification message"
}
`;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }],
      temperature: 0.2,
      max_tokens: 120,
    });

    return safeJSONParse(res.choices[0].message.content, {
      is_valid: true,
    });
  } catch (e) {
    console.error("AI validation failed:", e);
    return { is_valid: true }; // fail-safe
  }
}

/* -------------------- AI NEXT QUESTION -------------------- */

async function generateNextQuestion({ screening, answers, stage }) {
  const prompt = `
You are Mediconnect AI — a professional medical screening assistant.

INITIAL SYMPTOMS:
"${screening.initial_symptoms}"

CONVERSATION SO FAR:
${screening.questions?.map((q, i) => `${i + 1}. Q: ${q.text}`).join("\n")}

PATIENT ANSWERS:
${answers.map((a, i) => `${i + 1}. A: ${a.answer}`).join("\n")}

IMPORTANT RULES:
- The patient may deny symptoms using ANY language or tone
  (e.g. no, naa, nahi, nahi hai, nope, nothing, kuch nahi, not really, etc.)
- If the patient has DENIED a symptom:
  → DO NOT rephrase or repeat the same question
  → Move to a DIFFERENT symptom or medical factor
- Always ask a NEW question
- Ask ONLY ONE question
- Do NOT diagnose


Return STRICT JSON:
{
  "question": {
    "id": "q${stage + 1}",
    "text": "question text",
    "type": "text"
  }
}
`;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }],
      temperature: 0.7,
      max_tokens: 150,
    });

    return safeJSONParse(res.choices[0].message.content, null);
  } catch (e) {
    console.error("AI question error:", e);
    return {
      question: {
        id: `q${stage + 1}`,
        text: "Can you describe your symptoms in more detail?",
        type: "text",
      },
    };
  }
}

/* -------------------- AI FINAL ANALYSIS -------------------- */

async function generateFinalAnalysis({ screening, answers }) {
  const prompt = `
You are Mediconnect AI — a clinical decision support system.

INITIAL SYMPTOMS:
"${screening.initial_symptoms}"

PATIENT ANSWERS:
${answers.map((a, i) => `${i + 1}. ${a.answer}`).join("\n")}

RULES:
- If urgency is "routine", recommend at least "General Physician"
- recommended_specialties MUST NOT be empty
- specializations MUST NOT be empty
- Do NOT diagnose with certainty

Generate a medical screening analysis.

Return STRICT JSON:
{
  "summary": "",
  "probable_diagnoses": [
    { "name": "", "confidence": 0.7, "notes": "" }
  ],
  "recommended_specialties": [],
  "specializations": [],
  "recommended_lab_tests": [],
  "recommended_medicines": [],
  "urgency": "routine|urgent|emergency",
  "home_care_advice": [],
  "warning_signs": []
}
`;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
    });

    return safeJSONParse(res.choices[0].message.content, {});
  } catch (e) {
    console.error("AI analysis error:", e);
    return {
      summary: "Preliminary assessment completed.",
      probable_diagnoses: [],
      recommended_specialties: ["General Physician"],
      urgency: "routine",
      home_care_advice: ["Please consult a doctor if symptoms persist"],
      warning_signs: [],
    };
  }
}

/* -------------------- MAIN API -------------------- */

export async function POST(req) {
  try {
    const { screening_id, answer } = await req.json();
    const cleanAnswer = cleanInput(answer);

    console.log(
      `[Screening Answer] Request | screening_id=${screening_id} | answer length=${cleanAnswer?.length}`,
    );

    if (!screening_id || !cleanAnswer) {
      return NextResponse.json(
        { status: false, message: "screening_id and answer are required" },
        { status: 400 },
      );
    }

    const { data: screening, error: screeningError } = await supabase
      .from("screening_sessions")
      .select("*")
      .eq("id", screening_id)
      .single();

    if (screeningError) {
      console.error(
        `[Screening Answer] Failed to fetch session | error=${JSON.stringify(screeningError)}`,
      );
    }

    if (!screening) {
      console.warn(
        `[Screening Answer] Session not found | screening_id=${screening_id}`,
      );
      return NextResponse.json(
        { status: false, message: "Screening session not found" },
        { status: 404 },
      );
    }

    console.log(
      `[Screening Answer] Session found | patient_id=${screening.patient_id} | stage=${screening.stage} | status=${screening.status}`,
    );

    if (screening.status === "complete") {
      return NextResponse.json({
        status: false,
        message: "This health screening has already been completed.",
      });
    }

    const stage = screening.stage || 0;
    const lastQuestion =
      screening.questions?.[screening.questions.length - 1]?.text ||
      "Describe your symptoms";

    // V2 SAFETY: Pre-LLM Emergency Detection on answer
    const emergencyCheck = detectEmergency(cleanAnswer);
    if (emergencyCheck.isEmergency) {
      await logAIToolInteraction({
        userId: screening.patient_id,
        toolName: "screening_flow_answer",
        inputJson: { screening_id, stage, answer: cleanAnswer },
        riskLevel: "critical",
        urgencyClassification: "URGENT",
        recommendation: emergencyCheck.response,
      });

      return NextResponse.json({
        status: false,
        message: emergencyCheck.response,
        isEmergency: true,
      });
    }

    /* -------- AI ANSWER VALIDATION -------- */

    const aiValidation = await validateAnswerAI({
      question: lastQuestion,
      answer: cleanAnswer,
    });

    if (!aiValidation.is_valid) {
      return NextResponse.json({
        status: false,
        message: aiValidation.message,
        requires_clarification: true,
        user_response: cleanAnswer,
      });
    }

    /* -------- SAVE ANSWER -------- */

    const answers = [
      ...(screening.answers || []),
      {
        question_id: `q${stage}`,
        answer: cleanAnswer,
        timestamp: new Date().toISOString(),
      },
    ];

    /* -------- NEXT QUESTION -------- */

    if (stage < 3) {
      const aiData = await generateNextQuestion({
        screening,
        answers,
        stage,
      });

      // V2 SAFETY: Post-LLM Moderation on next question
      const moderationResult = moderateAIOutput(aiData.question.text);
      if (!moderationResult.isSafe) {
        aiData.question.text = moderationResult.cleanResponse;
      }

      await supabase
        .from("screening_sessions")
        .update({
          stage: stage + 1,
          answers,
          questions: [...(screening.questions || []), aiData.question],
          updated_at: new Date().toISOString(),
        })
        .eq("id", screening_id);

      await logAIToolInteraction({
        userId: screening.patient_id,
        toolName: "screening_flow_question",
        inputJson: { screening_id, stage: stage + 1, answer: cleanAnswer },
        riskLevel: "low",
        urgencyClassification: "ROUTINE",
        recommendation: aiData.question.text,
      });

      return NextResponse.json({
        status: true,
        stage: stage + 1,
        screening_id,
        next_question: aiData.question,
        progress: {
          current: stage + 1,
          total: 4,
          percentage: Math.round(((stage + 1) / 4) * 100),
        },
      });
    }

    /* -------- FINAL ANALYSIS -------- */

    let analysis = await generateFinalAnalysis({
      screening,
      answers,
    });

    // V2 SAFETY: Post-LLM Moderation on final analysis summary
    if (analysis && analysis.summary) {
      const moderationResult = moderateAIOutput(analysis.summary);
      if (!moderationResult.isSafe) {
        analysis.summary = moderationResult.cleanResponse;
      }
    }

    await supabase
      .from("screening_sessions")
      .update({
        status: "complete",
        answers,
        analysis,
        stage: stage + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", screening_id);

    // ✅ LAYER-1: Create a Care Episode for this completed screening
    let careEpisodeId = null;
    if (screening.patient_id) {
      console.log(
        `[Screening Answer] Creating care episode for patient_id=${screening.patient_id}`,
      );
      const episodeResult = await createCareEpisode(
        screening.patient_id,
        "consultation",
      );
      if (episodeResult.success) {
        careEpisodeId = episodeResult.data.id;
        console.log(
          `[Screening Answer] ✅ Care episode created: id=${careEpisodeId}`,
        );
        // Link care_episode_id back to the screening session for traceability
        const { error: linkErr } = await supabase
          .from("screening_sessions")
          .update({ care_episode_id: careEpisodeId })
          .eq("id", screening_id);
        if (linkErr) {
          console.warn(
            "[Screening Answer] Could not link care_episode_id to session:",
            linkErr.message,
          );
        }
      } else {
        console.error(
          `[Screening Answer] ❌ Care episode creation failed: ${episodeResult.error}`,
        );
      }
    } else {
      console.warn(
        `[Screening Answer] No patient_id on session — care episode skipped | screening_id=${screening_id}`,
      );
    }

    await logAIToolInteraction({
      userId: screening.patient_id,
      toolName: "screening_flow_complete",
      inputJson: {
        screening_id,
        stage: stage + 1,
        total_answers: answers.length,
      },
      riskLevel:
        analysis.urgency === "urgent" || analysis.urgency === "emergency"
          ? "high"
          : "low",
      urgencyClassification: (analysis.urgency || "routine").toUpperCase(),
      recommendation: analysis.summary,
    });

    // ✅ LAYER-1: Activity log for screening completion (fire-and-forget)
    logActivity({
      patient_id: screening.patient_id,
      care_episode_id: careEpisodeId,
      actor_id: screening.patient_id,
      module_type: "consultation",
      action_type: "screening_completed",
      reference_id: screening_id,
      description: `Health screening completed with urgency: ${analysis.urgency}`,
      metadata: {
        urgency: analysis.urgency,
        recommended_specialties: analysis.recommended_specialties,
        stage: stage + 1,
      },
    }).then(null, () => {});

    return NextResponse.json({
      status: true,
      screening_id,
      stage: stage + 1,
      analysis,
      message: "Health screening completed successfully",
      next_steps: {
        consult_specialist: analysis.recommended_specialties,
        urgency: analysis.urgency,
        lab_tests: analysis.recommended_lab_tests,
      },
    });
  } catch (error) {
    console.error("V2 Screening API Error:", error);

    return NextResponse.json(
      {
        status: false,
        message: "Our medical analysis service is temporarily unavailable.",
      },
      { status: 503 },
    );
  }
}
