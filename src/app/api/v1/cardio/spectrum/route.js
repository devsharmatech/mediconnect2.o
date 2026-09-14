import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { supabase } from "@/lib/supabaseAdmin";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * CC-08 / CC-08B: Heart Health Spectrum API
 * Factor-based matrix (11 factors in Phase-1).
 * CRITICAL RULE (P0-06 / B2 V1.1 Handover):
 * NO COMPOSITE CARDIOVASCULAR SCORE.
 * Missing factors remain explicitly unavailable. No synthetic values or artificial risk tiers.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");

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

    let userInputs = null;
    let previousInputs = null;

    if (userId) {
      try {
        const { data: assessments } = await supabase
          .from("health_assessments")
          .select("*, heart_health_inputs(*)")
          .eq("user_id", userId)
          .eq("assessment_type", "heart")
          .order("created_at", { ascending: false })
          .limit(2);

        if (assessments && assessments.length > 0) {
          userInputs = {
            ...assessments[0].heart_health_inputs?.[0],
            created_at: assessments[0].created_at
          };
          if (assessments.length > 1) {
            previousInputs = {
              ...assessments[1].heart_health_inputs?.[0],
              created_at: assessments[1].created_at
            };
          }
        }
      } catch (err) {
        console.warn("Could not query user assessments for spectrum:", err.message);
      }
    }

    // Build 11-factor objects conforming to CC-08B schema
    const spectrum = baseFactors.map((f) => {
      let currentVal = null;
      let prevVal = null;
      let curDate = userInputs?.created_at ? new Date(userInputs.created_at).toISOString().split('T')[0] : null;
      let prevDate = previousInputs?.created_at ? new Date(previousInputs.created_at).toISOString().split('T')[0] : null;
      let source = userInputs ? "Self-reported" : null;

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
        if (userInputs?.height_cm && userInputs?.weight_kg) {
          currentVal = Number((userInputs.weight_kg / ((userInputs.height_cm / 100) ** 2)).toFixed(1));
        }
        if (previousInputs?.height_cm && previousInputs?.weight_kg) {
          prevVal = Number((previousInputs.weight_kg / ((previousInputs.height_cm / 100) ** 2)).toFixed(1));
        }
      } else if (f.id === "activity") {
        currentVal = userInputs?.physical_activity_minutes ? Number(userInputs.physical_activity_minutes) : null;
        prevVal = previousInputs?.physical_activity_minutes ? Number(previousInputs.physical_activity_minutes) : null;
      } else if (f.id === "steps") {
        currentVal = userInputs?.daily_steps ? Number(userInputs.daily_steps) : null;
        prevVal = previousInputs?.daily_steps ? Number(previousInputs.daily_steps) : null;
      } else if (f.id === "resting_hr") {
        currentVal = userInputs?.resting_heart_rate ? Number(userInputs.resting_heart_rate) : null;
        prevVal = previousInputs?.resting_heart_rate ? Number(previousInputs.resting_heart_rate) : null;
      } else if (f.id === "sleep") {
        currentVal = userInputs?.sleep_hours ? Number(userInputs.sleep_hours) : null;
        prevVal = previousInputs?.sleep_hours ? Number(previousInputs.sleep_hours) : null;
      } else if (f.id === "smoking") {
        currentVal = userInputs?.smoking_status || null;
        prevVal = previousInputs?.smoking_status || null;
      } else if (f.id === "glucose") {
        currentVal = userInputs?.hba1c ? Number(userInputs.hba1c) : (userInputs?.blood_glucose ? Number(userInputs.blood_glucose) : null);
        prevVal = previousInputs?.hba1c ? Number(previousInputs.hba1c) : null;
      } else if (f.id === "lipids") {
        currentVal = userInputs?.ldl_cholesterol ? Number(userInputs.ldl_cholesterol) : null;
        prevVal = previousInputs?.ldl_cholesterol ? Number(previousInputs.ldl_cholesterol) : null;
      } else if (f.id === "diet") {
        currentVal = userInputs?.diet_pattern || null;
        prevVal = previousInputs?.diet_pattern || null;
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

    return success("Heart Health Spectrum fetched successfully.", spectrum, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("GET /api/v1/cardio/spectrum error:", error);
    return failure("Failed to fetch Heart Health Spectrum: " + error.message, "spectrum_fetch_failed", 500, {
      headers: corsHeaders,
    });
  }
}
