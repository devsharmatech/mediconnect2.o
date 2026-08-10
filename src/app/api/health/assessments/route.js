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
    const userId = searchParams.get("user_id");
    const assessmentType = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit")) || 10;
    const page = parseInt(searchParams.get("page")) || 1;
    const offset = (page - 1) * limit;

    if (!userId) {
      return failure("User ID is required", "validation_error", 400, {
        headers: corsHeaders,
      });
    }

    let query = supabase
      .from("health_assessments")
      .select(
        `
        *,
        heart_health_inputs(*),
        lung_health_inputs(*)
      `,
        { count: "exact" }
      )
      .eq("user_id", userId)
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (assessmentType) {
      query = query.eq("assessment_type", assessmentType);
    }

    const { data, count, error } = await query;

    if (error) throw error;

    return success(
      "Health assessments fetched successfully.",
      {
        assessments: data,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
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

    // Create health assessment record
    const { data: assessment, error: assessmentError } = await supabase
      .from("health_assessments")
      .insert([
        {
          user_id,
          assessment_type,
          health_score: healthScore,
          calculated_age: calculatedAge,
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

  // Blood Pressure
  if (inputs.systolic_bp >= 140 || inputs.diastolic_bp >= 90) {
    score -= 20;
    riskFactors.push("Stage 2 Hypertension");
  } else if (inputs.systolic_bp >= 130 || inputs.diastolic_bp >= 80) {
    score -= 12;
    riskFactors.push("Elevated BP");
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
    riskFactors.push("Diabetes");
  } else if (inputs.hba1c >= 5.7) {
    score -= 6;
    riskFactors.push("Prediabetes");
  }

  // Heart Rate
  if (inputs.resting_heart_rate > 100) {
    score -= 12;
    riskFactors.push("Tachycardia");
  } else if (inputs.resting_heart_rate > 80) score -= 5;

  // Lifestyle
  if (inputs.smoking_status === "current") {
    score -= 25;
    riskFactors.push("Smoking");
  }

  if (inputs.physical_activity_minutes < 120) {
    score -= 10;
    riskFactors.push("Low physical activity");
  }

  // Symptoms
  if (inputs.chest_pain) {
    score -= 25;
    riskFactors.push("Chest pain – urgent");
  }

  score = Math.max(0, Math.min(100, score));

  const heartAge = inputs.age + Math.floor((100 - score) / 3);

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
    calculatedAge: heartAge,
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
    riskFactors.push("Obesity affecting breathing");
  }

  // Smoking
  if (inputs.smoking_status === "current") {
    score -= 30;
    riskFactors.push("Smoking");
  } else if (inputs.smoking_status === "former") {
    score -= 12;
  }

  // Peak Flow (Lung power)
  if (inputs.peak_flow < 350) {
    score -= 25;
    riskFactors.push("Low peak flow (possible asthma/COPD)");
  } else if (inputs.peak_flow < 450) {
    score -= 10;
  }

  // AQI Impact
  if (inputs.aqi > 200) {
    score -= 20;
    riskFactors.push("Severe pollution exposure");
  } else if (inputs.aqi > 120) {
    score -= 10;
  }

  // Symptoms
  if (inputs.breathlessness === "severe") {
    score -= 20;
    riskFactors.push("Severe breathlessness");
  } else if (inputs.breathlessness === "moderate") {
    score -= 12;
  }

  if (inputs.cough_frequency === "constant") {
    score -= 18;
    riskFactors.push("Chronic cough");
  }

  if (inputs.wheezing) {
    score -= 12;
    riskFactors.push("Wheezing (possible asthma)");
  }

  // Breath Holding
  if (inputs.breath_holding_time < 20) {
    score -= 20;
    riskFactors.push("Low lung capacity");
  } else if (inputs.breath_holding_time < 40) {
    score -= 10;
  }

  score = Math.max(0, Math.min(100, score));

  const lungAge = inputs.age + Math.floor((100 - score) / 2.5);

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
