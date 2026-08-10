import { NextResponse } from "next/server";
import { openai, supabase } from "@/lib/supabaseAdmin";
import { v4 as uuidv4 } from "uuid";

export async function POST(req) {
  try {
    const body = await req.json();
    const { patient_id, initial_symptoms } = body;

    if (!patient_id || !initial_symptoms) {
      return NextResponse.json(
        {
          status: false,
          message: "Missing required fields: patient_id, initial_symptoms",
        },
        { status: 400 }
      );
    }

    const screening_id = uuidv4();

    const systemPrompt = `
You are Mediconnect AI — a friendly medical screening assistant.
The patient reports: "${initial_symptoms}".
Ask 4–5 short, simple, follow-up questions to learn more.
Return valid JSON only in this format:
{
  "questions": [
    { "id": "q1", "text": "question text", "type": "text" },
    { "id": "q2", "text": "question text", "type": "choice", "choices": ["yes", "no"] },
    { "id": "q3", "text": "question text", "type": "text" },
    { "id": "q4", "text": "question text", "type": "text" }
  ]
}`;

    const aiRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }],
    });
    const content = aiRes?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned empty content");
    }

    let aiData;
    try {
      aiData = JSON.parse(content);
    } catch (err) {
      console.error("AI JSON Parse Error:", content);
      throw new Error("AI returned invalid JSON format");
    }

    if (!aiData.questions) {
      throw new Error("AI response missing 'questions' field");
    }

    const { error: dbError } = await supabase
      .from("screening_sessions")
      .insert([
        {
          id: screening_id,
          patient_id,
          status: "in_progress",
          initial_symptoms,
          questions: aiData.questions,
          created_at: new Date(),
        },
      ]);

    if (dbError) {
      console.error("Supabase insert error:", dbError);
      throw new Error(`Supabase error: ${dbError.message}`);
    }

    return NextResponse.json({
      screening_id,
      status: "in_progress",
      next_questions: aiData.questions,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      {
        status: false,
        message: error.message || "Unknown Server Error",
      },
      { status: 500 }
    );
  }
}
