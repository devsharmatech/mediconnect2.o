import { openai, supabase } from "@/lib/supabaseAdmin";
import { LUNA_CONFIG } from "@/lib/ai/v2/config";
import { finalAnalysis } from "@/lib/ai/v2/lunaScreening";

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

    let aiData;
    if (LUNA_CONFIG.ENABLED) {
      const lunaResult = await finalAnalysis({
        initialSymptoms: screening.initial_symptoms,
        answers: answers.map((a) => ({ answer: `${a.question_id}: ${a.answer}` })),
      });
      if (lunaResult.ok) {
        aiData = lunaResult.data;
      }
    }

    if (!aiData) {
      const isModern = (process.env.AI_LUNA_MODEL || "gpt-6-luna").startsWith("gpt-5") || (process.env.AI_LUNA_MODEL || "gpt-6-luna").startsWith("gpt-6");
      const payload = {
        model: process.env.AI_LUNA_MODEL || "gpt-6-luna",
        messages: [{ role: "system", content: analysisPrompt }],
        response_format: { type: "json_object" },
      };
      if (isModern) {
        payload.max_completion_tokens = 600;
      } else {
        payload.max_tokens = 600;
      }

      try {
        const aiRes = await openai.chat.completions.create(payload);
        aiData = JSON.parse(aiRes.choices[0].message.content);
      } catch (err) {
        console.warn("[Screening Analysis] Luna error, fallback to mini:", err.message);
        const fallbackRes = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: analysisPrompt }],
          response_format: { type: "json_object" },
          max_tokens: 600,
        });
        aiData = JSON.parse(fallbackRes.choices[0].message.content);
      }
    }

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
