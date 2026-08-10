import { openai } from "@/lib/supabaseAdmin";

export async function analyzeHealthData(
  assessmentType,
  inputs,
  healthScore,
  riskFactors
) {
  try {
    const prompt = `
You are a ${
      assessmentType === "heart" ? "cardiology" : "pulmonology"
    } health expert. Analyze the health data and provide comprehensive medical analysis.

ASSESSMENT TYPE: ${assessmentType.toUpperCase()} HEALTH
HEALTH SCORE: ${healthScore}/100
RISK FACTORS: ${riskFactors.join(", ")}

PATIENT DATA:
${
  assessmentType === "heart"
    ? `
- Age: ${inputs.age}
- Gender: ${inputs.gender}
- Blood Pressure: ${inputs.systolic_bp}/${inputs.diastolic_bp} mmHg
- Resting Heart Rate: ${inputs.resting_heart_rate} bpm
- BMI: ${inputs.bmi ? inputs.bmi.toFixed(1) : "Not provided"}
- Smoking: ${inputs.smoking_status}
- Physical Activity: ${inputs.physical_activity_minutes} minutes/week
- Medical History: ${inputs.hypertension_history ? "Hypertension, " : ""}${
        inputs.diabetes_history ? "Diabetes, " : ""
      }${inputs.family_cardiac_history ? "Family History" : "None"}
- Symptoms: ${inputs.chest_pain ? "Chest pain, " : ""}${
        inputs.breathlessness ? "Breathlessness, " : ""
      }${inputs.palpitations ? "Palpitations" : "None"}
`
    : `
- Age: ${inputs.age}
- Gender: ${inputs.gender}
- Height: ${inputs.height_cm} cm, Weight: ${inputs.weight_kg} kg
- Smoking: ${inputs.smoking_status} (${
        inputs.smoking_pack_years || 0
      } pack-years)
- Pollution Exposure: ${inputs.pollution_exposure}
- Breath Holding: ${inputs.breath_holding_time} seconds
- Breathing Rate: ${inputs.breaths_per_minute} breaths/min
- Symptoms: ${inputs.cough_frequency} cough, ${
        inputs.breathlessness
      } breathlessness, ${inputs.wheezing ? "Wheezing" : "No wheezing"}
- AQI: ${inputs.aqi || "Not provided"}
`
}

Provide a comprehensive analysis including:
1. Overall health assessment
2. Key risk factors explanation
3. Positive aspects to maintain
4. Areas needing improvement
5. When to seek medical attention

Return ONLY JSON format:
{
  "analysis": "comprehensive medical analysis text",
  "key_findings": ["finding1", "finding2", "finding3"],
  "positive_aspects": ["aspect1", "aspect2"],
  "improvement_areas": ["area1", "area2"],
  "medical_attention": "when to seek help guidance"
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }],
    });

    const response = JSON.parse(completion.choices[0].message.content);
    return response;
  } catch (error) {
    console.error("OpenAI Analysis Error:", error);
    return generateFallbackAnalysis(assessmentType, healthScore, riskFactors);
  }
}

export async function generateHealthRecommendations(
  assessmentType,
  inputs,
  riskFactors
) {
  try {
    const prompt = `
Generate specific, actionable health recommendations for ${assessmentType} health.

CONTEXT:
${
  assessmentType === "heart"
    ? `
- Blood Pressure: ${inputs.systolic_bp}/${inputs.diastolic_bp} mmHg
- Lifestyle: ${inputs.smoking_status} smoking, ${
        inputs.physical_activity_minutes
      } mins/week activity
- Risk Factors: ${riskFactors.join(", ")}
- Indian Context: Provide culturally appropriate advice for Indian users
`
    : `
- Smoking: ${inputs.smoking_status}, ${
        inputs.smoking_pack_years || 0
      } pack-years
- Pollution: ${inputs.pollution_exposure} exposure, AQI: ${inputs.aqi}
- Breathing: ${inputs.breath_holding_time}s hold, ${
        inputs.breaths_per_minute
      } bpm
- Risk Factors: ${riskFactors.join(", ")}
- Indian Context: Provide culturally appropriate advice for Indian users
`
}

Return ONLY JSON format with exactly this structure:
{
  "recommendations": [
    {
      "category": "lifestyle/diet/exercise/medical",
      "title": "specific recommendation title",
      "description": "detailed explanation",
      "priority": "high/medium/low",
      "action_steps": ["step1", "step2", "step3"],
      "timeframe": "immediate/1-week/1-month/3-months",
      "indian_context": true/false
    }
  ]
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a medical expert. Provide output ONLY in JSON.",
        },
        { role: "user", content: prompt },
      ],
    });

    const response = JSON.parse(completion.choices[0].message.content);
    return response.recommendations;
  } catch (error) {
    console.error("OpenAI Recommendations Error:", error);
    return generateFallbackRecommendations(assessmentType, riskFactors);
  }
}

function generateFallbackAnalysis(assessmentType, healthScore, riskFactors) {
  return {
    analysis: `Your ${assessmentType} health score is ${healthScore}/100. ${
      healthScore >= 70
        ? "Excellent health! Maintain your current lifestyle."
        : healthScore >= 50
        ? "Good health with some areas for improvement."
        : "Please focus on improving your health through lifestyle changes."
    }`,
    key_findings: riskFactors,
    positive_aspects: ["Completed health assessment", "Aware of health status"],
    improvement_areas: riskFactors,
    medical_attention:
      "Consult a doctor if you experience persistent symptoms.",
  };
}

function generateFallbackRecommendations(assessmentType, riskFactors) {
  const rec = [];

  const hasBP =
    riskFactors.includes("High blood pressure") ||
    riskFactors.includes("Stage 2 Hypertension") ||
    riskFactors.includes("Elevated BP");

  if (assessmentType === "heart" && hasBP) {
    rec.push({
      category: "lifestyle",
      title: "Control Blood Pressure",
      description:
        "Reduce salt, improve activity, and manage stress to lower BP.",
      priority: "high",
      action_steps: [
        "Lower salt intake",
        "Exercise at least 150 mins/week",
        "Monitor BP regularly",
      ],
      timeframe: "1-week",
      indian_context: true,
    });
  }

  if (assessmentType === "lung" && riskFactors.includes("Smoking")) {
    rec.push({
      category: "lifestyle",
      title: "Stop Smoking",
      description: "Quitting smoking improves lung function significantly.",
      priority: "high",
      action_steps: [
        "Join cessation program",
        "Avoid smoking triggers",
        "Practice breathing exercises",
      ],
      timeframe: "1-week",
      indian_context: true,
    });
  }

  return rec;
}
