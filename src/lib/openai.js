import { openai } from "@/lib/supabaseAdmin";

export async function analyzeHealthData(
  assessmentType,
  inputs,
  healthScore,
  riskFactors
) {
  try {
    const isHeart = assessmentType === "heart";
    const prompt = `
You are a ${isHeart ? "cardiovascular wellness" : "respiratory wellness"} specialist.
Analyze this self-reported wellness screening data and provide a non-diagnostic screening summary.

CLINICAL & COMPLIANCE RULES:
1. SEMANTIC FIREWALL: This is a wellness assessment screening summary, NOT an autonomous medical diagnosis.
2. NEVER diagnose hypertension, cardiovascular disease, or respiratory disease from this single assessment.
3. If blood pressure is around 120/80 mmHg, do NOT diagnose hypertension or Stage 1 Hypertension. State: "Blood pressure recorded: ${inputs.systolic_bp || 120}/${inputs.diastolic_bp || 80} mmHg. This single reading does not diagnose hypertension. Blood-pressure classification depends on the guideline framework (such as 2024 ESC) and repeated, properly measured readings."
4. OPENING SENTENCE: Begin the analysis text with: "Assessment summary: Based on the information entered for this screening, the recorded measures include..."
5. Replace strong predictive/preventive claims with: "These findings may be relevant to ${isHeart ? "cardiovascular" : "respiratory"} health. Consider repeat measurement and discuss persistent concerns with a qualified healthcare professional."
6. Do NOT output any unfinished placeholders like "?? Specifically tailored for Indian context".

ASSESSMENT TYPE: ${assessmentType.toUpperCase()} HEALTH SCREENING
RECORDED RISK FACTORS: ${riskFactors.join(", ") || "None"}

PATIENT DATA:
${
  isHeart
    ? `
- Age: ${inputs.age} years (Derived from DOB)
- Gender: ${inputs.gender}
- Blood Pressure: ${inputs.systolic_bp}/${inputs.diastolic_bp} mmHg (Guideline: 2024 ESC)
- Resting Heart Rate: ${inputs.resting_heart_rate} bpm
- BMI: ${inputs.bmi ? inputs.bmi.toFixed(1) : "Not provided"} kg/m²
- Smoking: ${inputs.smoking_status}
- Physical Activity: ${inputs.physical_activity_minutes} minutes/week
- Medical History: ${inputs.hypertension_history ? "Hypertension history, " : ""}${
        inputs.diabetes_history ? "Diabetes history, " : ""
      }${inputs.family_cardiac_history ? "Family cardiac history" : "None"}
- Symptoms: ${inputs.chest_pain ? "Chest pain (Urgent attention advised), " : ""}${
        inputs.breathlessness ? "Breathlessness, " : ""
      }${inputs.palpitations ? "Palpitations" : "None"}
`
    : `
- Age: ${inputs.age} years (Derived from DOB)
- Gender: ${inputs.gender}
- Height: ${inputs.height_cm} cm, Weight: ${inputs.weight_kg} kg
- Smoking: ${inputs.smoking_status} (${
        inputs.smoking_pack_years || 0
      } pack-years)
- Pollution Exposure: ${inputs.pollution_exposure}
- Breath Holding Time: ${inputs.breath_holding_time} seconds (Self-reported)
- Breathing Rate: ${inputs.breaths_per_minute} breaths/min
- Symptoms: ${inputs.cough_frequency} cough, ${
        inputs.breathlessness
      } breathlessness, ${inputs.wheezing ? "Wheezing" : "No wheezing"}
- AQI Context: ${inputs.aqi || "Not provided"}
`
}

Provide:
1. Overall assessment summary (non-diagnostic, starting with "Assessment summary: Based on the information entered for this screening, the recorded measures include...")
2. Key observed factors
3. Positive markers (factual and input-grounded)
4. Areas to monitor (neutral, evidence-safe)
5. Suggested follow-up / When to seek medical attention (clear red flag safety guidance)

Return ONLY valid JSON format:
{
  "analysis": "Assessment summary: Based on the information entered for this screening, the recorded measures include...",
  "key_findings": ["finding1", "finding2"],
  "positive_aspects": ["positive1", "positive2"],
  "improvement_areas": ["area1", "area2"],
  "medical_attention": "Discuss persistent or worsening concerns with a qualified doctor. If you experience severe chest pain or breathlessness, seek emergency medical care immediately."
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
    return generateFallbackAnalysis(assessmentType, healthScore, riskFactors, inputs);
  }
}

export async function generateHealthRecommendations(
  assessmentType,
  inputs,
  riskFactors
) {
  try {
    const isHeart = assessmentType === "heart";
    const prompt = `
Generate non-diagnostic wellness guidance for ${assessmentType} health.

COMPLIANCE REQUIREMENTS:
1. Physical Activity: Use the 150–300 minutes/week moderate aerobic activity public-health reference band. Do not impose fixed daily minimums.
2. Diet: Recommend evidence-safe dietary patterns rich in vegetables, fruits, whole grains, pulses/legumes, nuts and minimally processed foods. Avoid universal substitution advice or claiming that specific spices (e.g. turmeric) or specific oils cure or prevent disease.
3. Stress: Recommend stress-management practices such as breathing exercises, mindfulness, or yoga for general wellbeing.
4. Priority: Use "General health action" rather than "High" unless an approved clinical rule warrants urgent action.
5. Timeframe: Use action-specific timeframes such as "Next 1–4 weeks: build activity gradually".
6. Context: Explicitly label Indian context as: "Content is adapted for common Indian food and activity contexts. It is general health information and not individualized medical advice." NEVER output "?? Specifically tailored for Indian context".

CONTEXT:
${
  isHeart
    ? `
- Blood Pressure: ${inputs?.systolic_bp || 120}/${inputs?.diastolic_bp || 80} mmHg
- Lifestyle: ${inputs?.smoking_status || "never"} smoking, ${
        inputs?.physical_activity_minutes || 60
      } mins/week activity
- Risk Factors: ${riskFactors.join(", ")}
`
    : `
- Smoking: ${inputs?.smoking_status || "never"}
- Breathing: ${inputs?.breath_holding_time || 35}s hold, ${
        inputs?.breaths_per_minute || 16
      } bpm
- Risk Factors: ${riskFactors.join(", ")}
`
}

Return ONLY valid JSON format:
{
  "recommendations": [
    {
      "category": "lifestyle/diet/exercise/wellness",
      "title": "recommendation title",
      "description": "evidence-safe explanation",
      "priority": "General health action",
      "action_steps": ["step 1", "step 2"],
      "timeframe": "Next 1–4 weeks",
      "indian_context": "Content is adapted for common Indian food and activity contexts. It is general health information and not individualized medical advice."
    }
  ]
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a wellness specialist providing non-diagnostic health guidance in valid JSON.",
        },
        { role: "user", content: prompt },
      ],
    });

    const response = JSON.parse(completion.choices[0].message.content);
    return response.recommendations;
  } catch (error) {
    console.error("OpenAI Recommendations Error:", error);
    return generateFallbackRecommendations(assessmentType, riskFactors, inputs);
  }
}

function generateFallbackAnalysis(assessmentType, healthScore, riskFactors, inputs = {}) {
  const isHeart = assessmentType === "heart";
  return {
    analysis: `Assessment summary: Based on the information entered for this screening, the recorded measures include ${
      isHeart
        ? `blood pressure of ${inputs.systolic_bp || 120}/${inputs.diastolic_bp || 80} mmHg and resting heart rate of ${inputs.resting_heart_rate || 72} bpm.`
        : `breath-holding time of ${inputs.breath_holding_time || 35}s and breathing rate of ${inputs.breaths_per_minute || 16} breaths/min.`
    } These findings provide general wellness insight and do not diagnose cardiovascular or respiratory disease.`,
    key_findings: riskFactors.length > 0 ? riskFactors : ["Self-reported values within standard wellness reference ranges."],
    positive_aspects: ["Completed health screening", "Proactive health monitoring"],
    improvement_areas: riskFactors.length > 0 ? riskFactors : ["Maintain consistent physical activity and balanced nutrition."],
    medical_attention:
      "These findings may be relevant to health. Consider repeat measurement and discuss persistent concerns with a qualified healthcare professional.",
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
