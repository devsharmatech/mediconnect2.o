import { NextResponse } from "next/server";
import { openai, supabase } from "@/lib/supabaseAdmin";

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const screening_id = id;
    const body = await req.json();
    const { answers } = body;

    if (!answers || !answers.length) {
      return NextResponse.json({ status:false, message: "Answers required" }, { status: 400 });
    }

    // Get existing screening
    const { data: screening, error: screeningError } = await supabase
      .from("screening_sessions")
      .select("*")
      .eq("id", screening_id)
      .single();

    if (screeningError || !screening) {
      return NextResponse.json(
        { status:false, message: "Screening not found " },
        { status: 404 }
      );
    }

    const formattedAnswers = answers
      .map((a) => `${a.question_id}: ${a.answer}`)
      .join("\n");

    const analysisPrompt = `
You are Mediconnect AI — a clinical triage bot.
The patient said: "${screening.initial_symptoms}"
Their answers were:
${formattedAnswers}

Now analyze this information and return a JSON object with:
{
  "summary": "",
  "probable_diagnoses": [{"name": "", "confidence": 0.0}],
  "recommended_specialties": ["", ""],
  "recommended_lab_tests": ["", ""],
  "recommended_medicines": [{"name": "", "dose": "", "notes": ""}],
  "urgency": "routine|urgent|emergency"
}`;

    const aiRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: analysisPrompt }],
      response_format: { type: "json_object" },
    });

    const aiData = JSON.parse(aiRes.choices[0].message.content);

    await supabase
      .from("screening_sessions")
      .update({
        status: "complete",
        analysis: aiData,
        answers: answers,
        updated_at: new Date(),
      })
      .eq("id", screening_id);

    return NextResponse.json({
      screening_id,
      status: "complete",
      analysis: aiData,
      next_step: `/api/screening/${screening_id}/doctors`,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ status:false, message: "Server Error" }, { status: 500 });
  }
}
