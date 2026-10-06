import { openai } from "@/lib/supabaseAdmin";

const LUNA_MODEL = process.env.AI_LUNA_MODEL || "gpt-6-luna";

/**
 * Execute structured JSON completion via OpenAI with modern parameter support (gpt-6-luna).
 * Complies with V2.6 §14/§25: max 1 retry for transient errors; no active fallback to obsolete models.
 */
async function executeOpenAIJsonCompletion({ messages, maxTokens = 1500 }) {
  const model = LUNA_MODEL;
  const isModern = model.startsWith("gpt-5") || model.startsWith("gpt-6") || model.startsWith("o1") || model.startsWith("o3");

  const payload = {
    model,
    messages,
    response_format: { type: "json_object" },
  };

  if (isModern) {
    payload.max_completion_tokens = maxTokens;
  } else {
    payload.max_tokens = maxTokens;
  }

  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      const completion = await openai.chat.completions.create(payload);
      return JSON.parse(completion.choices[0].message.content);
    } catch (err) {
      if (attempt === 0) {
        console.warn(`[OpenAI] ${model} attempt 1 failed (${err.message}), retrying once...`);
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      console.error(`[OpenAI] ${model} execution failed after retry:`, err.message);
      throw err;
    }
  }
}

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

    const response = await executeOpenAIJsonCompletion({
      messages: [{ role: "system", content: prompt }],
      maxTokens: 750,
    });
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
7. Plain Layperson Language: NEVER use intimidating clinical/medical jargon such as "Bronchial Recovery", "FEV1 vital capacity", "PEEP effect", "bronchiolar collapse", "arterial oxygen saturation", or "bronchial mucosa". Always use simple, clear, everyday wellness terms (e.g. "airway comfort", "gentle breathing", "throat ease", "clean air habits", "belly breathing").

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
- Smoking: ${inputs?.smoking_status || "never"} (${inputs?.smoking_pack_years || inputs?.pack_years || 0} pack-years)
- Breathing Capacity: ${inputs?.breath_holding_time || 35}s hold, ${inputs?.breaths_per_minute || 16} breaths/min, Peak Flow: ${inputs?.peak_flow || 450} L/min
- Reported Symptoms: Wheezing: ${Boolean(inputs?.wheezing || inputs?.Wheezing)}, Breathlessness: ${inputs?.breathlessness || 'none'}, Cough Frequency: ${inputs?.cough_frequency || 'none'}
- Environmental: Local AQI: ${inputs?.aqi || 60}, Pollution Exposure: ${inputs?.pollution_exposure || 'moderate'}
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

    const response = await executeOpenAIJsonCompletion({
      messages: [
        {
          role: "system",
          content: "You are a wellness specialist providing non-diagnostic health guidance in valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      maxTokens: 1500,
    });
    return response.recommendations;
  } catch (error) {
    console.error("OpenAI Recommendations Error:", error);
    return generateFallbackRecommendations(assessmentType, riskFactors, inputs);
  }
}

function generateFallbackAnalysis(assessmentType, healthScore, riskFactors, inputs = {}) {
  const isHeart = assessmentType === "heart";
  const findings = [];
  const improvements = [];
  const positives = ["Completed structured health assessment", "Proactive health monitoring"];

  if (isHeart) {
    const sys = Number(inputs.systolic_bp) || 120;
    const dia = Number(inputs.diastolic_bp) || 80;
    const hr = Number(inputs.resting_heart_rate) || 72;
    const isSmoker = inputs.smoking_status === "current" || inputs.smoking_status === "smoker";

    findings.push(`Blood pressure recorded at ${sys}/${dia} mmHg`);
    findings.push(`Resting heart rate: ${hr} bpm`);
    if (sys >= 140 || dia >= 90) {
      improvements.push("Blood pressure exceeds optimal resting band; schedule clinical evaluation");
    }
    if (isSmoker) {
      findings.push("Active smoking history reported");
      improvements.push("Enroll in evidence-based cardiovascular smoking cessation program");
    } else {
      positives.push("Non-smoker status supports vascular endothelial health");
    }
    if (inputs.chest_pain === "true" || inputs.chest_pain === true) {
      findings.push("Self-reported chest discomfort episodes");
      improvements.push("Prompt physician consultation for cardiac symptom evaluation");
    }
  } else {
    const bht = Number(inputs.breath_holding_time) || 35;
    const rr = Number(inputs.breaths_per_minute) || 16;
    const packYears = Number(inputs.smoking_pack_years) || 0;
    const isSmoker = inputs.smoking_status === "current" || inputs.smoking_status === "smoker" || packYears > 0;
    const aqi = Number(inputs.aqi) || 60;
    const dyspnea = inputs.breathlessness || inputs.symptoms_breathlessness;
    const wheezing = inputs.wheezing === "true" || inputs.wheezing === true || inputs.symptoms_wheezing;
    const cough = inputs.cough_frequency || inputs.CoughFrequency;

    findings.push(`Breath-holding capacity: ${bht}s`);
    findings.push(`Respiratory rate: ${rr} breaths/min`);

    if (isSmoker) {
      findings.push(`Smoking history reported (${packYears > 0 ? `${packYears} pack-years` : 'active smoker'})`);
      improvements.push("Active smoking poses significant respiratory risk; prioritize cessation guidance");
    } else {
      positives.push("Never-smoked profile preserves long-term vital lung capacity");
    }

    if (wheezing) {
      findings.push("Expiratory wheezing symptoms reported");
      improvements.push("Discuss wheezing patterns with a pulmonologist to screen for airway reactivity");
    }

    if (dyspnea && dyspnea !== "none") {
      findings.push(`Exertional dyspnea: ${dyspnea}`);
      improvements.push("Monitor progression of breathlessness during standard daily activities");
    }

    if (cough && cough !== "none") {
      findings.push(`Cough frequency: ${cough}`);
    }

    if (aqi > 150) {
      findings.push(`High ambient air pollution exposure (AQI ${aqi})`);
      improvements.push("Adopt outdoor N95 particulate mask protocol during high-pollution periods");
    }
  }

  if (riskFactors.length > 0) {
    riskFactors.forEach(rf => {
      if (!findings.includes(rf)) findings.push(rf);
    });
  }

  if (improvements.length === 0) {
    improvements.push("Maintain routine physical activity and follow seasonal respiratory precautions.");
  }

  return {
    analysis: `Assessment summary: Based on patient responses recorded during this screening, vital capacity indicators include ${
      isHeart
        ? `blood pressure of ${inputs.systolic_bp || 120}/${inputs.diastolic_bp || 80} mmHg and resting heart rate of ${inputs.resting_heart_rate || 72} bpm.`
        : `breath-holding duration of ${inputs.breath_holding_time || 35} seconds and respiratory rate of ${inputs.breaths_per_minute || 16} breaths/min, evaluated in ambient AQI of ${inputs.aqi || 60}.`
    } Clinical guidance is customized to these inputs and provides preventive wellness insight without replacing direct doctor evaluation.`,
    key_findings: findings,
    positive_aspects: positives,
    improvement_areas: improvements,
    medical_attention:
      "Discuss persistent, recurring, or worsening symptoms with a qualified physician. Seek emergency clinical care immediately for severe acute shortness of breath or radiating chest tightness.",
  };
}

function generateFallbackRecommendations(assessmentType, riskFactors, inputs = {}) {
  const isHeart = assessmentType === "heart";

  if (isHeart) {
    const sys = Number(inputs.systolic_bp) || 120;
    const isSmoker = inputs.smoking_status === "current" || inputs.smoking_status === "smoker";

    const recs = [
      {
        category: "Physical Activity",
        title: "Aerobic Physical Activity Band",
        description:
          "Engage in 150–300 minutes per week of moderate-intensity aerobic exercise (e.g. brisk walking, swimming, light cycling) tailored to your individual baseline fitness.",
        priority: "General health action",
        action_steps: [
          "Start with 20–30 minutes of brisk walking 5 days per week.",
          "Incorporate light resistance and flexibility training twice weekly.",
        ],
        timeframe: "Next 1–4 weeks: build activity gradually",
        indian_context:
          "Content is adapted for common Indian food and activity contexts. It is general health information and not individualized medical advice.",
      },
      {
        category: "Nutrition",
        title: sys >= 130 ? "Cardiovascular Sodium & Lipid Control" : "Heart-Healthy Dietary Pattern",
        description:
          sys >= 130
            ? "Adopt a reduced-sodium, potassium-rich dietary pattern (DASH/Mediterranean principles adapted for Indian meals) with minimal deep-fried preparations and trans fats."
            : "Choose whole grains, pulses, legumes, nuts and abundant vegetables; prefer unsaturated plant oils in moderation and limit ultra-processed snacks.",
        priority: sys >= 140 ? "Recommended priority" : "General health action",
        action_steps: [
          "Reduce added table salt and avoid high-sodium pickles/processed papads.",
          "Include high-fiber lentils, leafy greens, and seasonal vegetables in every meal.",
        ],
        timeframe: "Next 2–4 weeks",
        indian_context:
          "Content is adapted for common Indian food and activity contexts. It is general health information and not individualized medical advice.",
      },
    ];

    if (isSmoker) {
      recs.unshift({
        category: "Lifestyle Cessation",
        title: "Cardiovascular Smoking Cessation Protocol",
        description:
          "Tobacco smoking accelerates arterial plaque deposition and arterial stiffening. Complete cessation significantly drops cardiovascular incident risk within months.",
        priority: "High priority",
        action_steps: [
          "Consult a clinician regarding nicotine replacement therapies and behavioral support.",
          "Set a definitive quit date within the next 14 days and identify personal trigger routines.",
        ],
        timeframe: "Immediate action: next 1–2 weeks",
        indian_context:
          "Content is adapted for common Indian food and activity contexts. It is general health information and not individualized medical advice.",
      });
    }

    return recs;
  }

  // Lung health fallbacks
  const packYears = Number(inputs.smoking_pack_years || inputs.pack_years) || 0;
  const isSmoker = inputs.smoking_status === "current" || inputs.smoking_status === "smoker" || packYears > 0;
  const aqi = Number(inputs.aqi) || 60;
  const wheezing = inputs.wheezing === "true" || inputs.wheezing === true || inputs.Wheezing === true || inputs.Wheezing === "true" || inputs.symptoms_wheezing;
  const breathlessness = inputs.breathlessness === "moderate" || inputs.breathlessness === "severe";
  const cough = inputs.cough_frequency === "daily" || inputs.cough_frequency === "constant";

  const lungRecs = [];

  // 1. Pursed-Lip Breathing if wheezing or breathlessness
  if (wheezing || breathlessness) {
    lungRecs.push({
      category: "Airway Relief",
      title: "Pursed-Lip Breathing for Easy Airflow",
      description:
        "Keeps your airways gently open longer when breathing out, easing chest tightness and wheezing tension in a calm, natural way.",
      priority: "Recommended priority",
      action_steps: [
        "Inhale gently through your nose for 2 counts with relaxed shoulders.",
        "Pucker your lips as if gently blowing across hot tea; exhale smoothly for 4 counts without forcing air.",
        "Practice 5–8 minutes 2–3 times daily, especially when experiencing chest tightness or after physical exertion."
      ],
      timeframe: "Immediate daily practice",
      indian_context:
        "Content is adapted for common Indian food and activity contexts. It is general health information and not individualized medical advice."
    });
  }

  // 2. Diaphragmatic Deep Breathing
  lungRecs.push({
    category: "Breathing Ease",
    title: "Deep Belly Breathing for Relaxation",
    description:
      "Encourages deep, natural belly breaths instead of shallow chest breathing, helping you take in fresh air and feel calm and refreshed.",
    priority: "General health action",
    action_steps: [
      "Place one hand on your upper chest and the other on your belly just below the ribs.",
      "Inhale slowly through your nose for 4 seconds, allowing your belly to push outward gently.",
      "Exhale slowly through your mouth for 6 seconds as your belly relaxes inward. Practice 5 to 10 minutes morning & evening."
    ],
    timeframe: "Next 1–2 weeks: daily practice",
    indian_context:
      "Content is adapted for common Indian food and activity contexts. It is general health information and not individualized medical advice."
  });

  // 3. Environmental AQI Defense
  lungRecs.push({
    category: "Air Quality Care",
    title: aqi > 150 ? `Clean Air Protection (Local AQI ${aqi})` : "Ambient Air Quality Protection",
    description:
      aqi > 150
        ? `Current local air quality (${aqi} AQI) has elevated dust and smog. Wearing a protective mask outdoors prevents throat irritation and keeps breathing comfortable.`
        : "Check daily air quality before outdoor workouts or morning walks to keep breathing comfortable.",
    priority: aqi > 150 ? "Recommended priority" : "General health action",
    action_steps: [
      aqi > 150 ? "Wear a certified N95 or particulate face mask during high-traffic or dusty commutes." : "Plan outdoor activities when air pollution levels are lowest (typically late afternoon).",
      "Shift workouts indoors and avoid heavy outdoor exertion during morning smog peaks (6 AM – 9 AM).",
      "Keep living and sleeping areas sealed during peak pollution and use air filtration if available."
    ],
    timeframe: "Continuous daily practice",
    indian_context:
      "Content is adapted for common Indian food and activity contexts. It is general health information and not individualized medical advice."
  });

  // 4. Airway Hydration & Steam
  if (wheezing || cough || aqi > 100) {
    lungRecs.push({
      category: "Airway Soothing",
      title: "Warm Airway Hydration & Gentle Steam Routine",
      description:
        "Warm steam gently moisturizes dry or irritated throat passages, soothes scratchiness, and helps you breathe easily without strain.",
      priority: "General health action",
      action_steps: [
        "Inhale gentle warm water steam for 5–7 minutes in the evening (plain water without harsh additives or essential oils).",
        "Maintain adequate fluid intake of 2 to 2.5 liters of warm or room-temperature water daily.",
        "Avoid abrupt transitions between heavy air-conditioned rooms and hot or dusty outdoor environments."
      ],
      timeframe: "Evening routine: 5–7 minutes daily",
      indian_context:
        "Content is adapted for common Indian food and activity contexts. It is general health information and not individualized medical advice."
    });
  }

  // 5. Thoracic Mobility & Posture Opening
  lungRecs.push({
    category: "Posture & Comfort",
    title: "Gentle Chest Opening & Posture Habits",
    description:
      "Gently eases tightness in your shoulders and upper chest, making it easier to take full, comfortable breaths throughout the day.",
    priority: "General health action",
    action_steps: [
      "Sit upright, gently place hands behind your head, and draw elbows backward while inhaling deeply to open your chest comfortably.",
      "Perform gentle seated shoulder rolls and light spinal stretches twice daily."
    ],
    timeframe: "5 minutes daily",
    indian_context:
      "Content is adapted for common Indian food and activity contexts. It is general health information and not individualized medical advice."
  });

  // 6. Smoker cessation if smoker
  if (isSmoker) {
    lungRecs.unshift({
      category: "Healthy Habits",
      title: "Gentle Airway Ease & Healthy Lifestyle Support",
      description:
        "Helps clear throat secretions naturally and supports steady, relaxed breathing without straining your chest.",
      priority: "High priority",
      action_steps: [
        "Practice gentle breathing coughs: exhale twice with an open mouth (like fogging a mirror) to clear your throat comfortably.",
        "Consult a healthcare professional for personalized guidance and a step-by-step quit plan."
      ],
      timeframe: "Immediate: next 7–14 days",
      indian_context:
        "Content is adapted for common Indian food and activity contexts. It is general health information and not individualized medical advice."
    });
  }

  // 7. Physical Conditioning
  lungRecs.push({
    category: "Active Living",
    title: "Daily Gentle Walking for Stamina",
    description:
      "Builds healthy stamina, keeps your body energized, and supports good breathing at a comfortable, natural pace.",
    priority: "General health action",
    action_steps: [
      "Start with 20–30 minutes of brisk walking 5 days per week at a comfortable conversational pace.",
      "Exercise indoors on days with elevated air pollution or extreme seasonal weather."
    ],
    timeframe: "Next 1–4 weeks: build activity gradually",
    indian_context:
      "Content is adapted for common Indian food and activity contexts. It is general health information and not individualized medical advice."
  });

  return lungRecs;
}

