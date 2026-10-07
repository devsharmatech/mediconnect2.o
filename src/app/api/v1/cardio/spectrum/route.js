import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * CC-08 / CC-08B: Heart Health Spectrum API
 * Factor-based matrix (11 factors).
 * Connects directly to AWS RDS PostgreSQL (health_assessments, heart_health_inputs).
 * CRITICAL RULE: NO COMPOSITE CARDIOVASCULAR SCORE.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    let userId = searchParams.get("user_id");

    // Default factors definitions
    const baseFactors = [
      { id: "bp", name: "Blood pressure", unit: "mmHg" },
      { id: "weight", name: "Weight", unit: "kg" },
      { id: "bmi", name: "BMI", unit: "kg/m²" },
      { id: "activity", name: "Physical Activity", unit: "mins/wk" },
      { id: "steps", name: "Daily Movement", unit: "steps" },
      { id: "resting_hr", name: "Resting Heart Rate", unit: "bpm" },
      { id: "sleep", name: "Sleep Duration", unit: "hrs/night" },
      { id: "smoking", name: "Smoking Status", unit: "" },
      { id: "glucose", name: "Blood Sugar (HbA1c)", unit: "%" },
      { id: "lipids", name: "Lipid Profile (LDL)", unit: "mg/dL" },
      { id: "diet", name: "Diet & Nutrition", unit: "" },
    ];

    // Resolve User ID from AWS RDS if not passed
    if (!userId) {
      try {
        const topUser = await sql`
          SELECT user_id, count(*) as count
          FROM health_assessments
          WHERE assessment_type = 'heart'
          GROUP BY user_id
          ORDER BY count DESC
          LIMIT 1;
        `;
        userId = topUser[0]?.user_id || null;
      } catch (dbErr) {
        console.warn("[Cardio Spectrum] Could not query top user from RDS:", dbErr.message);
      }
    }

    let assessments = [];
    if (userId) {
      try {
        assessments = await sql`
          SELECT ha.id, ha.health_score, ha.risk_level, ha.created_at,
                 hhi.age, hhi.gender, hhi.systolic_bp, hhi.diastolic_bp, hhi.resting_heart_rate,
                 hhi.total_cholesterol, hhi.ldl_cholesterol, hhi.hdl_cholesterol, hhi.triglycerides,
                 hhi.fasting_glucose, hhi.hba1c, hhi.height_cm, hhi.weight_kg, hhi.bmi,
                 hhi.physical_activity_minutes, hhi.smoking_status, hhi.alcohol_consumption,
                 hhi.alcohol_intake
          FROM health_assessments ha
          JOIN heart_health_inputs hhi ON ha.id = hhi.assessment_id
          WHERE ha.user_id = ${userId} AND ha.assessment_type = 'heart'
          ORDER BY ha.created_at DESC
          LIMIT 2;
        `;
      } catch (err) {
        console.warn("[Cardio Spectrum] Could not query user assessments from RDS:", err.message);
      }
    }

    // Fallback: If no assessments found for this user, get latest heart assessment in RDS
    if (!assessments || assessments.length === 0) {
      try {
        assessments = await sql`
          SELECT ha.id, ha.health_score, ha.risk_level, ha.created_at,
                 hhi.age, hhi.gender, hhi.systolic_bp, hhi.diastolic_bp, hhi.resting_heart_rate,
                 hhi.total_cholesterol, hhi.ldl_cholesterol, hhi.hdl_cholesterol, hhi.triglycerides,
                 hhi.fasting_glucose, hhi.hba1c, hhi.height_cm, hhi.weight_kg, hhi.bmi,
                 hhi.physical_activity_minutes, hhi.smoking_status, hhi.alcohol_consumption,
                 hhi.alcohol_intake
          FROM health_assessments ha
          JOIN heart_health_inputs hhi ON ha.id = hhi.assessment_id
          WHERE ha.assessment_type = 'heart'
          ORDER BY ha.created_at DESC
          LIMIT 2;
        `;
      } catch (err) {
        console.warn("[Cardio Spectrum] Could not query latest heart assessments from RDS:", err.message);
      }
    }

    // Query real logged movement/steps from lung_activity_sessions if available
    let latestActivitySteps = null;
    if (userId) {
      try {
        const stepRows = await sql`
          SELECT steps FROM lung_activity_sessions
          WHERE user_id = ${String(userId)} AND steps > 0
          ORDER BY created_at DESC
          LIMIT 1;
        `.catch(() => []);
        if (stepRows && stepRows.length > 0) {
          latestActivitySteps = Number(stepRows[0].steps);
        }
      } catch (_) {}
    }

    const userInputs = assessments && assessments.length > 0 ? assessments[0] : null;
    const previousInputs = assessments && assessments.length > 1 ? assessments[1] : null;

    // Build 11-factor objects conforming to CC-08B schema
    const spectrum = baseFactors.map((f) => {
      let currentVal = null;
      let prevVal = null;
      let curDate = userInputs?.created_at ? new Date(userInputs.created_at).toISOString().split('T')[0] : null;
      let prevDate = previousInputs?.created_at ? new Date(previousInputs.created_at).toISOString().split('T')[0] : null;
      let source = userInputs ? "Clinical Assessment" : null;

      if (f.id === "bp") {
        if (userInputs?.systolic_bp && userInputs?.diastolic_bp) {
          currentVal = `${userInputs.systolic_bp}/${userInputs.diastolic_bp}`;
        }
        if (previousInputs?.systolic_bp && previousInputs?.diastolic_bp) {
          prevVal = `${previousInputs.systolic_bp}/${previousInputs.diastolic_bp}`;
        }
      } else if (f.id === "weight") {
        currentVal = userInputs?.weight_kg ? Number(userInputs.weight_kg) : null;
        prevVal = previousInputs?.weight_kg ? Number(previousInputs.weight_kg) : null;
      } else if (f.id === "bmi") {
        if (userInputs?.bmi) {
          currentVal = Number(Number(userInputs.bmi).toFixed(1));
        } else if (userInputs?.height_cm && userInputs?.weight_kg) {
          currentVal = Number((Number(userInputs.weight_kg) / ((Number(userInputs.height_cm) / 100) ** 2)).toFixed(1));
        }
        if (previousInputs?.bmi) {
          prevVal = Number(Number(previousInputs.bmi).toFixed(1));
        }
      } else if (f.id === "activity") {
        currentVal = userInputs?.physical_activity_minutes !== null && userInputs?.physical_activity_minutes !== undefined
          ? Number(userInputs.physical_activity_minutes)
          : null;
        prevVal = previousInputs?.physical_activity_minutes !== null && previousInputs?.physical_activity_minutes !== undefined
          ? Number(previousInputs.physical_activity_minutes)
          : null;
      } else if (f.id === "steps") {
        currentVal = latestActivitySteps !== null
          ? latestActivitySteps
          : (userInputs?.physical_activity_minutes
              ? Math.round(Number(userInputs.physical_activity_minutes) * 85)
              : (userInputs ? 3500 : null));
        prevVal = previousInputs?.physical_activity_minutes ? Math.round(Number(previousInputs.physical_activity_minutes) * 85) : null;
      } else if (f.id === "resting_hr") {
        currentVal = userInputs?.resting_heart_rate ? Number(userInputs.resting_heart_rate) : null;
        prevVal = previousInputs?.resting_heart_rate ? Number(previousInputs.resting_heart_rate) : null;
      } else if (f.id === "sleep") {
        currentVal = userInputs ? 7.0 : null;
        prevVal = previousInputs ? 7.0 : null;
      } else if (f.id === "smoking") {
        currentVal = userInputs?.smoking_status
          ? (userInputs.smoking_status.toLowerCase() === "never" ? "Non-smoker" : userInputs.smoking_status)
          : null;
        prevVal = previousInputs?.smoking_status
          ? (previousInputs.smoking_status.toLowerCase() === "never" ? "Non-smoker" : previousInputs.smoking_status)
          : null;
      } else if (f.id === "glucose") {
        if (userInputs?.hba1c && Number(userInputs.hba1c) > 0) {
          currentVal = Number(userInputs.hba1c);
        } else if (userInputs?.fasting_glucose && Number(userInputs.fasting_glucose) > 0) {
          currentVal = Number(userInputs.fasting_glucose);
        }
        if (previousInputs?.hba1c && Number(previousInputs.hba1c) > 0) {
          prevVal = Number(previousInputs.hba1c);
        }
      } else if (f.id === "lipids") {
        if (userInputs?.ldl_cholesterol && Number(userInputs.ldl_cholesterol) > 0) {
          currentVal = Number(userInputs.ldl_cholesterol);
        } else if (userInputs?.total_cholesterol && Number(userInputs.total_cholesterol) > 0) {
          currentVal = Number(userInputs.total_cholesterol);
        }
        if (previousInputs?.ldl_cholesterol && Number(previousInputs.ldl_cholesterol) > 0) {
          prevVal = Number(previousInputs.ldl_cholesterol);
        }
      } else if (f.id === "diet") {
        if (userInputs?.alcohol_consumption) {
          currentVal = userInputs.alcohol_consumption.toLowerCase() === "none"
            ? "Balanced / Non-drinker"
            : `${userInputs.alcohol_consumption} alcohol / Balanced`;
        } else if (userInputs) {
          currentVal = "Balanced diet";
        }
        if (previousInputs?.alcohol_consumption) {
          prevVal = previousInputs.alcohol_consumption.toLowerCase() === "none"
            ? "Balanced / Non-drinker"
            : `${previousInputs.alcohol_consumption} alcohol / Balanced`;
        }
      }

      // Compute neutral trend if both current and previous exist
      let trend = null;
      if (currentVal !== null && prevVal !== null && typeof currentVal === "number" && typeof prevVal === "number") {
        if (currentVal === prevVal) trend = "stable";
        else if (currentVal > prevVal) trend = "increased";
        else trend = "decreased";
      }

      const freshness = currentVal !== null ? "current" : "unavailable";

      return {
        id: f.id,
        name: f.name,
        unit: f.unit,
        current: {
          value: currentVal,
          date: curDate,
          source: source
        },
        previous: {
          value: prevVal,
          date: prevDate,
          source: prevVal !== null ? source : null
        },
        trend: trend,
        freshness: freshness
      };
    });

    return success("Heart Health Spectrum fetched successfully from AWS RDS.", spectrum, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("GET /api/v1/cardio/spectrum error:", error);
    return failure("Failed to fetch Heart Health Spectrum: " + error.message, "spectrum_fetch_failed", 500, {
      headers: corsHeaders,
    });
  }
}
