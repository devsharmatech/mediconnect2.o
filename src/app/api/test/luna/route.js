import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function GET(request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "OPENAI_API_KEY is not configured" }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey });

    const startTime = Date.now();
    const completion = await openai.chat.completions.create({
      model: "gpt-6-luna",
      messages: [
        {
          role: "system",
          content: "You are a specialized medical wellness assistant for MediConnect. Respond in JSON format only with fields: status, message, model_tested, sample_medical_advice."
        },
        {
          role: "user",
          content: "Run a diagnostic check and provide a short wellness tip."
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 300,
    });

    const elapsed = Date.now() - startTime;
    const data = JSON.parse(completion.choices[0].message.content);

    return NextResponse.json({
      success: true,
      model: "gpt-6-luna",
      responseTimeMs: elapsed,
      result: data
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      model: "gpt-6-luna",
      error: error.message
    }, { status: 500 });
  }
}
