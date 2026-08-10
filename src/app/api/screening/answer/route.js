import { NextResponse } from "next/server";
import { openai, supabase } from "@/lib/supabaseAdmin";

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
${screening.questions?.map((q, i) => 
  `${i + 1}. Q: ${q.text}`
).join("\n")}

PATIENT ANSWERS:
${answers.map((a, i) => 
  `${i + 1}. A: ${a.answer}`
).join("\n")}

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

    if (!screening_id || !cleanAnswer) {
      return NextResponse.json(
        { status: false, message: "screening_id and answer are required" },
        { status: 400 }
      );
    }

    const { data: screening } = await supabase
      .from("screening_sessions")
      .select("*")
      .eq("id", screening_id)
      .single();

    if (!screening) {
      return NextResponse.json(
        { status: false, message: "Screening session not found" },
        { status: 404 }
      );
    }

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

    if (stage < 5) {
      const aiData = await generateNextQuestion({
        screening,
        answers,
        stage,
      });

      await supabase.from("screening_sessions").update({
        stage: stage + 1,
        answers,
        questions: [...(screening.questions || []), aiData.question],
        updated_at: new Date().toISOString(),
      }).eq("id", screening_id);

      return NextResponse.json({
        status: true,
        stage: stage + 1,
        screening_id,
        next_question: aiData.question,
        progress: {
          current: stage + 1,
          total: 5,
          percentage: Math.round(((stage + 1) / 5) * 100),
        },
      });
    }

    /* -------- FINAL ANALYSIS -------- */

    const analysis = await generateFinalAnalysis({
      screening,
      answers,
    });

    await supabase.from("screening_sessions").update({
      status: "complete",
      answers,
      analysis,
      stage: stage + 1,
      updated_at: new Date().toISOString(),
    }).eq("id", screening_id);

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
    console.error("Screening API Error:", error);

    return NextResponse.json(
      {
        status: false,
        message: "Our medical analysis service is temporarily unavailable.",
      },
      { status: 503 }
    );
  }
}
