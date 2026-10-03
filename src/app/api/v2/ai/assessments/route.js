import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { analyzeHealthData, generateHealthRecommendations } from "@/lib/openai";
import { moderateAIOutput } from "@/lib/ai/v2/moderationEngine";
import { logAIToolInteraction } from "@/lib/ai/v2/logging";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

// ─── Health calculation algorithms (SP-06 & SP-07 Frozen Policy) ───

function calculateHeartHealth(inputs) {
  let score = 100;
  const riskFactors = [];

  const bmi =
    inputs.height_cm && inputs.weight_kg
      ? inputs.weight_kg / (inputs.height_cm / 100) ** 2
      : null;

  inputs.bmi = bmi ? Number(bmi.toFixed(1)) : null;

  if (bmi >= 30) { score -= 15; riskFactors.push("Obesity"); }
  else if (bmi >= 25) { score -= 10; riskFactors.push("Overweight"); }

  // Blood Pressure (2024 ESC: 120/80 is NOT hypertension)
  const sys = parseInt(inputs.systolic_bp) || 120;
  const dia = parseInt(inputs.diastolic_bp) || 80;
  if (sys >= 140 || dia >= 90) {
    score -= 18;
    riskFactors.push("Elevated Blood Pressure (Clinical confirmation recommended)");
  } else if (sys >= 130 || dia >= 85) {
    score -= 8;
    riskFactors.push("Elevated Blood Pressure");
  }

  if (inputs.ldl_cholesterol > 160) { score -= 15; riskFactors.push("High LDL"); }
  else if (inputs.ldl_cholesterol > 130) { score -= 10; }

  if (inputs.hdl_cholesterol < 40) { score -= 10; riskFactors.push("Low HDL"); }
  if (inputs.triglycerides > 200) { score -= 8; riskFactors.push("High Triglycerides"); }

  if (inputs.hba1c >= 6.5) { score -= 12; riskFactors.push("Elevated Blood Sugar"); }
  else if (inputs.hba1c >= 5.7) { score -= 6; riskFactors.push("Borderline Blood Sugar"); }

  if (inputs.resting_heart_rate > 100) { score -= 12; riskFactors.push("Elevated resting heart rate"); }
  else if (inputs.resting_heart_rate > 80) score -= 5;

  if (inputs.smoking_status === "current") { score -= 25; riskFactors.push("Smoking"); }
  if (inputs.physical_activity_minutes < 120) { score -= 10; riskFactors.push("Low physical activity (<150 mins/week)"); }
  if (inputs.chest_pain) { score -= 25; riskFactors.push("Chest discomfort (Urgent evaluation advised)"); }

  score = Math.max(0, Math.min(100, score));

  const riskLevel = score >= 80 ? "low" : score >= 60 ? "moderate" : score >= 40 ? "high" : "critical";

  return { healthScore: Math.round(score), calculatedAge: null, riskLevel, riskFactors };
}

function calculateLungHealth(inputs) {
  let score = 100;
  const riskFactors = [];

  const bmi = inputs.weight_kg / (inputs.height_cm / 100) ** 2;
  inputs.bmi = bmi;

  if (bmi > 30) { score -= 10; riskFactors.push("Obesity"); }

  if (inputs.smoking_status === "current") { score -= 30; riskFactors.push("Smoking"); }
  else if (inputs.smoking_status === "former") { score -= 12; }

  if (inputs.peak_flow && inputs.peak_flow < 350) {
    score -= 20;
    riskFactors.push("Lower peak expiratory flow");
  } else if (inputs.peak_flow && inputs.peak_flow < 450) {
    score -= 8;
  }

  if (inputs.breathlessness === "severe") { score -= 20; riskFactors.push("Severe breathlessness"); }
  else if (inputs.breathlessness === "moderate") { score -= 12; }

  if (inputs.cough_frequency === "constant") { score -= 18; riskFactors.push("Frequent cough"); }
  if (inputs.wheezing) { score -= 12; riskFactors.push("Wheezing"); }

  if (inputs.breath_holding_time && inputs.breath_holding_time < 20) {
    score -= 15;
    riskFactors.push("Reduced breath-holding time");
  } else if (inputs.breath_holding_time && inputs.breath_holding_time < 35) {
    score -= 8;
  }

  score = Math.max(0, Math.min(100, score));
  const lungAge = inputs.age ? Math.round(inputs.age + Math.floor((100 - score) / 2.5)) : null;
  const riskLevel = score >= 80 ? "low" : score >= 60 ? "moderate" : score >= 40 ? "high" : "critical";

  return { healthScore: Math.round(score), calculatedAge: lungAge, riskLevel, riskFactors };
}

async function checkAndAwardBadges(userId, assessmentType, score) {
  try {
    const countRows = await sql`
      SELECT COUNT(*)::int AS cnt FROM health_assessments
      WHERE user_id = ${userId} AND assessment_type = ${assessmentType}
    `;
    const count = countRows[0]?.cnt || 0;

    const badges = [];
    if (count === 1) {
      badges.push({
        badge_name: `${assessmentType === "heart" ? "Heart" : "Lung"} Health Starter`,
        badge_type: assessmentType,
        description: `Completed first ${assessmentType} health assessment`,
      });
    }
    if (score >= 80) {
      badges.push({
        badge_name: `${assessmentType === "heart" ? "Heart" : "Lung"} Champion`,
        badge_type: assessmentType,
        description: `Achieved excellent ${assessmentType} health score`,
      });
    }

    for (const badge of badges) {
      await sql`
        INSERT INTO user_badges (user_id, badge_name, badge_type, description, earned_at)
        VALUES (${userId}, ${badge.badge_name}, ${badge.badge_type}, ${badge.description}, NOW())
        ON CONFLICT DO NOTHING
      `.catch(() => {});
    }
  } catch (e) {
    console.warn("Badge award failed (non-fatal):", e.message);
  }
}

// ─── Main POST handler ───────────────────────────────────────────────

export async function POST(req) {
  try {
    const { user_id, assessment_type, inputs } = await req.json();

    if (!user_id || !assessment_type || !inputs) {
      return failure("Missing required fields: user_id, assessment_type, inputs", "validation_error", 400, { headers: corsHeaders });
    }

    if (!["heart", "lung"].includes(assessment_type)) {
      return failure("Invalid assessment type. Must be 'heart' or 'lung'", "validation_error", 400, { headers: corsHeaders });
    }

    // 0. Canonical Age Derivation (SP-07 P0-02) & Patient Profile
    let patientDetailsRow = null;
    try {
      const profileRows = await sql`
        SELECT full_name, date_of_birth, gender, blood_group FROM patient_details
        WHERE (id = ${user_id}::uuid OR id = ${String(user_id)}) LIMIT 1
      `;
      patientDetailsRow = profileRows[0] || null;
      const dob = patientDetailsRow?.date_of_birth;
      if (dob) {
        const dobDate = new Date(dob);
        if (!isNaN(dobDate.getTime())) {
          const today = new Date();
          let canonicalAge = today.getFullYear() - dobDate.getFullYear();
          const m = today.getMonth() - dobDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) canonicalAge--;
          if ((!inputs.age || inputs.age <= 0) && canonicalAge > 0) {
            inputs.age = canonicalAge;
          }
        }
      }
    } catch (dobErr) {
      console.warn("Could not query patient details (non-fatal):", dobErr.message);
    }

    // 1. Calculate health score
    let healthScore, calculatedAge, riskLevel, riskFactors;
    if (assessment_type === "heart") {
      ({ healthScore, calculatedAge, riskLevel, riskFactors } = calculateHeartHealth(inputs));
    } else {
      ({ healthScore, calculatedAge, riskLevel, riskFactors } = calculateLungHealth(inputs));
    }

    // 2. AI analysis (non-fatal — fallback to empty if OpenAI fails)
    let aiAnalysis = null;
    let recommendations = null;
    try {
      const [rawAi, recs] = await Promise.all([
        analyzeHealthData(assessment_type, inputs, healthScore, riskFactors),
        generateHealthRecommendations(assessment_type, inputs, riskFactors),
      ]);
      recommendations = recs;

      // V2 Safety: Post-LLM moderation
      let processed = rawAi;
      if (rawAi && typeof rawAi === "object" && rawAi.analysis) {
        const mod = moderateAIOutput(rawAi.analysis);
        if (!mod.isSafe) processed = { ...rawAi, analysis: mod.cleanResponse, moderated: true };
      } else if (typeof rawAi === "string") {
        const mod = moderateAIOutput(rawAi);
        if (!mod.isSafe) processed = mod.cleanResponse;
      }
      aiAnalysis = processed;
    } catch (aiErr) {
      console.warn("AI analysis failed (non-fatal):", aiErr.message);
      aiAnalysis = { analysis: "AI analysis temporarily unavailable.", moderated: false };
    }

    // 3. Insert into health_assessments (AWS RDS)
    const safeCalculatedAge = (calculatedAge !== null && calculatedAge !== undefined)
      ? Number(calculatedAge)
      : (parseInt(inputs.age) || 45);

    const generatedSerialNo = (assessment_type === "heart" ? "CCN" : "LCN") +
      `-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    const assessmentRows = await sql`
      INSERT INTO health_assessments (
        user_id,
        assessment_type,
        health_score,
        calculated_age,
        risk_level,
        ai_analysis,
        recommendations,
        serial_no,
        created_at,
        updated_at
      ) VALUES (
        ${user_id},
        ${assessment_type},
        ${healthScore},
        ${safeCalculatedAge},
        ${riskLevel},
        ${JSON.stringify(aiAnalysis)},
        ${JSON.stringify(recommendations)},
        ${generatedSerialNo},
        NOW(),
        NOW()
      )
      RETURNING *
    `;
    const assessment = assessmentRows[0];
    if (!assessment) throw new Error("Failed to insert health assessment");

    // 4. Insert into specific input table
    const cleanInputs = { ...inputs };
    delete cleanInputs.calculated_bmi;

    if (assessment_type === "heart") {
      // bmi is GENERATED ALWAYS AS — do NOT insert it
      delete cleanInputs.bmi;

      await sql`
        INSERT INTO heart_health_inputs (
          assessment_id,
          age, gender, height_cm, weight_kg,
          systolic_bp, diastolic_bp, resting_heart_rate,
          total_cholesterol, hdl_cholesterol, ldl_cholesterol,
          triglycerides, fasting_glucose, hba1c,
          smoking_status, physical_activity_minutes, alcohol_consumption,
          family_cardiac_history, hypertension_history, diabetes_history,
          chest_pain, breathlessness, palpitations,
          created_at
        ) VALUES (
          ${assessment.id},
          ${cleanInputs.age || null},
          ${cleanInputs.gender || null},
          ${cleanInputs.height_cm || null},
          ${cleanInputs.weight_kg || null},
          ${cleanInputs.systolic_bp || null},
          ${cleanInputs.diastolic_bp || null},
          ${cleanInputs.resting_heart_rate || null},
          ${cleanInputs.total_cholesterol || null},
          ${cleanInputs.hdl_cholesterol || null},
          ${cleanInputs.ldl_cholesterol || null},
          ${cleanInputs.triglycerides || null},
          ${cleanInputs.fasting_glucose || null},
          ${cleanInputs.hba1c || null},
          ${cleanInputs.smoking_status || null},
          ${cleanInputs.physical_activity_minutes || null},
          ${cleanInputs.alcohol_consumption || null},
          ${cleanInputs.family_cardiac_history ?? false},
          ${cleanInputs.hypertension_history ?? false},
          ${cleanInputs.diabetes_history ?? false},
          ${cleanInputs.chest_pain ?? false},
          ${cleanInputs.breathlessness ?? false},
          ${cleanInputs.palpitations ?? false},
          NOW()
        )
      `.catch((e) => console.warn("heart_health_inputs insert (non-fatal):", e.message));

    } else {
      // Lung inputs
      cleanInputs.lung_age = safeCalculatedAge;
      if (cleanInputs.pack_years !== undefined && cleanInputs.smoking_pack_years === undefined) {
        cleanInputs.smoking_pack_years = cleanInputs.pack_years;
      }

      await sql`
        INSERT INTO lung_health_inputs (
          assessment_id,
          age, gender, height_cm, weight_kg,
          smoking_status, breathlessness, cough_frequency,
          wheezing, peak_flow, breath_holding_time,
          lung_age, created_at
        ) VALUES (
          ${assessment.id},
          ${cleanInputs.age || null},
          ${cleanInputs.gender || null},
          ${cleanInputs.height_cm || null},
          ${cleanInputs.weight_kg || null},
          ${cleanInputs.smoking_status || null},
          ${cleanInputs.breathlessness || null},
          ${cleanInputs.cough_frequency || null},
          ${cleanInputs.wheezing ?? false},
          ${cleanInputs.peak_flow || null},
          ${cleanInputs.breath_holding_time || null},
          ${cleanInputs.lung_age || null},
          NOW()
        )
      `.catch((e) => console.warn("lung_health_inputs insert (non-fatal):", e.message));
    }

    // 5. Award badges (non-fatal)
    await checkAndAwardBadges(user_id, assessment_type, healthScore);

    // 6. V2 Logging (non-fatal)
    try {
      await logAIToolInteraction({
        userId: user_id,
        toolName: `${assessment_type}_connect`,
        inputJson: inputs,
        riskLevel,
        urgencyClassification: riskLevel === "critical" ? "URGENT" : "ROUTINE",
        recommendation: typeof aiAnalysis === "string" ? aiAnalysis : (aiAnalysis?.analysis || ""),
      });
    } catch (logError) {
      console.warn("V2 AI Tool Logging Error (non-fatal):", logError.message);
    }

    // 7. Fetch complete assessment with inputs to return same shape as V1
    let completeAssessment = { ...assessment, inputs: cleanInputs };
    try {
      const inputRows = assessment_type === "heart"
        ? await sql`SELECT * FROM heart_health_inputs WHERE assessment_id = ${assessment.id} LIMIT 1`
        : await sql`SELECT * FROM lung_health_inputs WHERE assessment_id = ${assessment.id} LIMIT 1`;

      const inputKey = assessment_type === "heart" ? "heart_health_inputs" : "lung_health_inputs";
      const dbRow = inputRows[0] || {};
      completeAssessment[inputKey] = [{
        ...cleanInputs,
        ...dbRow,
        aqi: cleanInputs.aqi ?? dbRow.aqi,
        breaths_per_minute: cleanInputs.breaths_per_minute ?? dbRow.breaths_per_minute,
        location: cleanInputs.location ?? dbRow.location,
        pollution_exposure: cleanInputs.pollution_exposure ?? dbRow.pollution_exposure,
        occupational_exposure: cleanInputs.occupational_exposure ?? dbRow.occupational_exposure,
        pack_years: cleanInputs.pack_years ?? dbRow.pack_years,
        bmi: cleanInputs.bmi ?? dbRow.bmi,
      }];
    } catch (fetchErr) {
      console.warn("Could not re-fetch inputs (non-fatal):", fetchErr.message);
      // Fallback — build the shape from what we inserted
      const inputKey = assessment_type === "heart" ? "heart_health_inputs" : "lung_health_inputs";
      completeAssessment[inputKey] = [{ assessment_id: assessment.id, ...cleanInputs }];
    }

    // Ensure serial_no is set on the complete record
    const serialPrefix = assessment_type === "lung" ? "LCN" : "CCN";
    const serialYear = new Date(completeAssessment.created_at || Date.now()).getFullYear();
    const serialCode = (String(completeAssessment.id || "")).replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();
    completeAssessment.serial_no = generatedSerialNo || `${serialPrefix}-${serialYear}-${serialCode}`;

    // Attach patient profile info for reports and UI
    const resolvedName = patientDetailsRow?.full_name || cleanInputs.patient_name || cleanInputs.name || cleanInputs.patientName || null;
    completeAssessment.patient_name = resolvedName;
    completeAssessment.patientName = resolvedName;
    completeAssessment.patient_gender = patientDetailsRow?.gender || cleanInputs.gender || null;
    completeAssessment.patient_dob = patientDetailsRow?.date_of_birth || null;
    completeAssessment.patient_blood_group = patientDetailsRow?.blood_group || null;

    return success(
      "Health assessment created successfully with assistive analysis.",
      completeAssessment,
      201,
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error("V2 AI Assessment Error:", error);
    return failure(
      "Failed to create health assessment. " + error.message,
      "creation_failed",
      500,
      { headers: corsHeaders }
    );
  }
}
