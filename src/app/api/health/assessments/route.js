import sql from "@/lib/db";
import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { analyzeHealthData, generateHealthRecommendations } from "@/lib/openai";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

// Get user's health assessments
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    let userId = searchParams.get("user_id") || searchParams.get("userId");
    if (userId === "guest" || userId === "undefined" || userId === "null") {
      userId = null;
    }
    const assessmentType = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit"), 10) || 10;
    const page = parseInt(searchParams.get("page"), 10) || 1;
    const offset = (page - 1) * limit;

    if (!userId) {
      try {
        let topQuery;
        if (assessmentType) {
          topQuery = await sql`
            SELECT user_id, count(*) as count
            FROM health_assessments
            WHERE assessment_type = ${assessmentType}
            GROUP BY user_id
            ORDER BY count DESC
            LIMIT 1;
          `;
        } else {
          topQuery = await sql`
            SELECT user_id, count(*) as count
            FROM health_assessments
            GROUP BY user_id
            ORDER BY count DESC
            LIMIT 1;
          `;
        }
        if (topQuery && topQuery.length > 0 && topQuery[0].user_id) {
          userId = topQuery[0].user_id;
        }
      } catch (findErr) {
        console.warn("[Assessments API] Could not resolve default user from RDS:", findErr.message);
      }
    }

    let assessments = [];
    let totalCount = 0;

    if (userId) {
      if (assessmentType) {
        const countRes = await sql`
          SELECT count(*)::int as cnt
          FROM health_assessments
          WHERE (user_id = ${userId}::uuid OR user_id = ${String(userId)})
            AND assessment_type = ${assessmentType};
        `;
        totalCount = countRes[0]?.cnt || 0;

        assessments = await sql`
          SELECT *
          FROM health_assessments
          WHERE (user_id = ${userId}::uuid OR user_id = ${String(userId)})
            AND assessment_type = ${assessmentType}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset};
        `;
      } else {
        const countRes = await sql`
          SELECT count(*)::int as cnt
          FROM health_assessments
          WHERE (user_id = ${userId}::uuid OR user_id = ${String(userId)});
        `;
        totalCount = countRes[0]?.cnt || 0;

        assessments = await sql`
          SELECT *
          FROM health_assessments
          WHERE (user_id = ${userId}::uuid OR user_id = ${String(userId)})
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset};
        `;
      }
    }

    if (assessments.length > 0) {
      const assessmentIds = assessments.map((a) => a.id);
      let heartInputs = [];
      let lungInputs = [];

      try {
        heartInputs = await sql`
          SELECT * FROM heart_health_inputs
          WHERE assessment_id = ANY(${assessmentIds});
        `;
      } catch (_) {}

      try {
        lungInputs = await sql`
          SELECT * FROM lung_health_inputs
          WHERE assessment_id = ANY(${assessmentIds});
        `;
      } catch (_) {}

      const heartMap = {};
      heartInputs.forEach((h) => {
        heartMap[h.assessment_id] = h;
      });
      const lungMap = {};
      lungInputs.forEach((l) => {
        lungMap[l.assessment_id] = l;
      });

      assessments = assessments.map((a) => ({
        ...a,
        heart_health_inputs: heartMap[a.id] ? [heartMap[a.id]] : [],
        lung_health_inputs: lungMap[a.id] ? [lungMap[a.id]] : [],
      }));
    }

    return success(
      "Health assessments fetched successfully.",
      {
        assessments,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit) || 1,
        },
      },
      200,
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("GET Health Assessments Error:", error);
    return failure(
      "Failed to fetch health assessments. " + error.message,
      "fetch_failed",
      500,
      {
        headers: corsHeaders,
      }
    );
  }
}


// Create new health assessment with assistive analysis
export async function POST(req) {
  try {
    const { user_id, assessment_type, inputs } = await req.json();

    if (!user_id || !assessment_type || !inputs) {
      return failure(
        "Missing required fields: user_id, assessment_type, inputs",
        "validation_error",
        400,
        {
          headers: corsHeaders,
        }
      );
    }

    // Validate assessment type
    if (!["heart", "lung"].includes(assessment_type)) {
      return failure(
        "Invalid assessment type. Must be 'heart' or 'lung'",
        "validation_error",
        400,
        {
          headers: corsHeaders,
        }
      );
    }

    // 0. Canonical Age Derivation (SP-07 P0-02 & SP-06 LC-02): Age derives from canonical DOB
    try {
      const { data: profile } = await supabase
        .from("patient_details")
        .select("date_of_birth")
        .eq("id", user_id)
        .maybeSingle();

      if (profile?.date_of_birth) {
        const dob = new Date(profile.date_of_birth);
        if (!isNaN(dob.getTime())) {
          const today = new Date();
          let canonicalAge = today.getFullYear() - dob.getFullYear();
          const m = today.getMonth() - dob.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
            canonicalAge--;
          }
          if (canonicalAge > 0) {
            inputs.age = canonicalAge;
          }
        }
      }
    } catch (dobErr) {
      console.warn("Could not query DOB for canonical age:", dobErr.message);
    }

    // Calculate health score based on assessment type
    let healthScore, calculatedAge, riskLevel, riskFactors;

    if (assessment_type === "heart") {
      const result = calculateHeartHealth(inputs);
      healthScore = result.healthScore;
      calculatedAge = result.calculatedAge;
      riskLevel = result.riskLevel;
      riskFactors = result.riskFactors;
    } else {
      const result = calculateLungHealth(inputs);
      healthScore = result.healthScore;
      calculatedAge = result.calculatedAge;
      riskLevel = result.riskLevel;
      riskFactors = result.riskFactors;
    }

    // Generate assistive analysis and recommendations
    const [aiAnalysis, recommendations] = await Promise.all([
      analyzeHealthData(assessment_type, inputs, healthScore, riskFactors),
      generateHealthRecommendations(assessment_type, inputs, riskFactors),
    ]);

    // Create health assessment record (with safe non-null calculated_age)
    const safeCalculatedAge = (calculatedAge !== null && calculatedAge !== undefined)
      ? Number(calculatedAge)
      : (parseInt(inputs.age) || 45);

    const { data: assessment, error: assessmentError } = await supabase
      .from("health_assessments")
      .insert([
        {
          user_id,
          assessment_type,
          health_score: healthScore,
          calculated_age: safeCalculatedAge,
          risk_level: riskLevel,
          ai_analysis: aiAnalysis,
          recommendations: recommendations,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (assessmentError) throw assessmentError;

    // Create specific input record
    const inputTable =
      assessment_type === "heart"
        ? "heart_health_inputs"
        : "lung_health_inputs";
    const cleanInputs = { ...inputs };
    delete cleanInputs.bmi;
    delete cleanInputs.calculated_bmi;
    const { error: inputError } = await supabase.from(inputTable).insert([
      {
        assessment_id: assessment.id,
        ...cleanInputs,
        created_at: new Date().toISOString(),
      },
    ]);

    if (inputError) throw inputError;

    // Check and award badges
    await checkAndAwardBadges(user_id, assessment_type, healthScore);

    // Get complete assessment with inputs
    const { data: completeAssessment, error: fetchError } = await supabase
      .from("health_assessments")
      .select(
        `
        *,
        heart_health_inputs(*),
        lung_health_inputs(*)
      `
      )
      .eq("id", assessment.id)
      .single();

    if (fetchError) throw fetchError;

    const serialPrefix = assessment_type === "lung" ? "LCN" : "CCN";
    const serialYear = new Date(completeAssessment.created_at || Date.now()).getFullYear();
    const serialCode = (completeAssessment.id || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();
    completeAssessment.serial_no = `${serialPrefix}-${serialYear}-${serialCode}`;

    return success(
      "Health assessment created successfully with assistive analysis.",
      completeAssessment,
      201,
      {
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error("POST Health Assessment Error:", error);
    return failure(
      "Failed to create health assessment. " + error.message,
      "creation_failed",
      500,
      {
        headers: corsHeaders,
      }
    );
  }
}

// Health calculation algorithms
function calculateHeartHealth(inputs) {
  let score = 100;
  const riskFactors = [];

  // BMI
  const bmi =
    inputs.height_cm && inputs.weight_kg
      ? inputs.weight_kg / (inputs.height_cm / 100) ** 2
      : null;

  inputs.bmi = bmi ? Number(bmi.toFixed(1)) : null;

  if (bmi >= 30) {
    score -= 15;
    riskFactors.push("Obesity");
  } else if (bmi >= 25) {
    score -= 10;
    riskFactors.push("Overweight");
  }

  // Blood Pressure (2024 ESC guidelines: 120/80 is NOT hypertension)
  const sys = parseInt(inputs.systolic_bp) || 120;
  const dia = parseInt(inputs.diastolic_bp) || 80;
  if (sys >= 140 || dia >= 90) {
    score -= 18;
    riskFactors.push("Elevated Blood Pressure (Clinical confirmation recommended)");
  } else if (sys >= 130 || dia >= 85) {
    score -= 8;
    riskFactors.push("Elevated Blood Pressure");
  }

  // Cholesterol
  if (inputs.ldl_cholesterol > 160) {
    score -= 15;
    riskFactors.push("High LDL");
  } else if (inputs.ldl_cholesterol > 130) {
    score -= 10;
  }

  if (inputs.hdl_cholesterol < 40) {
    score -= 10;
    riskFactors.push("Low HDL");
  }

  if (inputs.triglycerides > 200) {
    score -= 8;
    riskFactors.push("High Triglycerides");
  }

  // Blood Sugar
  if (inputs.hba1c >= 6.5) {
    score -= 12;
    riskFactors.push("Elevated Blood Sugar");
  } else if (inputs.hba1c >= 5.7) {
    score -= 6;
    riskFactors.push("Borderline Blood Sugar");
  }

  // Heart Rate
  if (inputs.resting_heart_rate > 100) {
    score -= 12;
    riskFactors.push("Elevated resting heart rate");
  } else if (inputs.resting_heart_rate > 80) score -= 5;

  // Lifestyle
  if (inputs.smoking_status === "current") {
    score -= 25;
    riskFactors.push("Smoking");
  }

  if (inputs.physical_activity_minutes < 120) {
    score -= 10;
    riskFactors.push("Low physical activity (<150 mins/week)");
  }

  // Symptoms
  if (inputs.chest_pain) {
    score -= 25;
    riskFactors.push("Chest discomfort (Urgent evaluation advised)");
  }

  score = Math.max(0, Math.min(100, score));

  // Phase-1 Rule (P0-03): Heart Age is NOT an approved Phase-1 output.
  const calculatedAge = null;

  let riskLevel =
    score >= 80
      ? "low"
      : score >= 60
      ? "moderate"
      : score >= 40
      ? "high"
      : "critical";

  return {
    healthScore: Math.round(score),
    calculatedAge,
    riskLevel,
    riskFactors,
  };
}

function calculateLungHealth(inputs) {
  let score = 100;
  const riskFactors = [];

  // BMI
  const bmi = inputs.weight_kg / (inputs.height_cm / 100) ** 2;
  inputs.bmi = bmi;

  if (bmi > 30) {
    score -= 10;
    riskFactors.push("Obesity");
  }

  // Smoking
  if (inputs.smoking_status === "current") {
    score -= 30;
    riskFactors.push("Smoking");
  } else if (inputs.smoking_status === "former") {
    score -= 12;
  }

  // Peak Flow (Optional)
  if (inputs.peak_flow && inputs.peak_flow < 350) {
    score -= 20;
    riskFactors.push("Lower peak expiratory flow");
  } else if (inputs.peak_flow && inputs.peak_flow < 450) {
    score -= 8;
  }

  // AQI Context (Environmental observation sidecar - strictly does NOT mutate Score/Risk/Lung Age per SP-06 / LC-05)
  // AQI is an environmental sidecar and does not deduct points or affect clinical category.

  // Symptoms & Safety Precedence (SP-06 / LC-06 / LC-09)
  let hasConcerningSymptom = false;
  if (inputs.breathlessness === "severe") {
    score -= 20;
    riskFactors.push("Severe breathlessness");
    hasConcerningSymptom = true;
  } else if (inputs.breathlessness === "moderate") {
    score -= 12;
  }

  if (inputs.cough_frequency === "constant") {
    score -= 18;
    riskFactors.push("Frequent cough");
    hasConcerningSymptom = true;
  }

  if (inputs.wheezing) {
    score -= 12;
    riskFactors.push("Wheezing");
    hasConcerningSymptom = true;
  }

  // Breath Holding (Factual input, not diagnostic capacity)
  if (inputs.breath_holding_time && inputs.breath_holding_time < 20) {
    score -= 15;
    riskFactors.push("Reduced breath-holding time");
  } else if (inputs.breath_holding_time && inputs.breath_holding_time < 35) {
    score -= 8;
  }

  score = Math.max(0, Math.min(100, score));
  const lungAge = inputs.age ? Math.round(inputs.age + Math.floor((100 - score) / 2.5)) : null;
  
  // Safety precedence: concerning symptoms trigger clinical notice that cannot be overridden by favorable score
  let riskLevel = score >= 80 ? "low" : score >= 60 ? "moderate" : score >= 40 ? "high" : "critical";
  if (hasConcerningSymptom && riskLevel === "low") {
    riskLevel = "moderate";
  }

  return {
    healthScore: Math.round(score),
    calculatedAge: lungAge,
    riskLevel,
    riskFactors,
  };
}

async function checkAndAwardBadges(userId, assessmentType, score) {
  const badgesToAward = [];

  // First assessment badge
  const { count } = await supabase
    .from("health_assessments")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("assessment_type", assessmentType);

  if (count === 1) {
    badgesToAward.push({
      badge_name: `${
        assessmentType === "heart" ? "Heart" : "Lung"
      } Health Starter`,
      badge_type: assessmentType,
      description: `Completed first ${assessmentType} health assessment`,
    });
  }

  // Score-based badges
  if (score >= 80) {
    badgesToAward.push({
      badge_name: `${assessmentType === "heart" ? "Heart" : "Lung"} Champion`,
      badge_type: assessmentType,
      description: `Achieved excellent ${assessmentType} health score`,
    });
  }

  // Award badges
  for (const badge of badgesToAward) {
    await supabase.from("user_badges").insert([
      {
        user_id: userId,
        ...badge,
        earned_at: new Date().toISOString(),
      },
    ]);
  }
}
