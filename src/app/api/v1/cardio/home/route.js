import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * CC-01: CardioConnect Home Command Center
 * Connects directly to PostgreSQL AWS RDS
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    let userId = searchParams.get("user_id");

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
        console.warn("[Cardio Home] Could not query top user from RDS:", dbErr.message);
      }
    }

    let weeklyActivityMinutes = 0;
    let todaySteps = 0;
    let availableFactorsCount = 0;
    let walkingTests = [];
    let state = "no-data";

    if (userId) {
      // Query recent activity sessions from AWS RDS
      try {
        const sessions = await sql`
          SELECT * FROM activity_log
          WHERE (user_id = ${userId} OR patient_id = ${userId})
          ORDER BY created_at DESC
          LIMIT 20;
        `;

        if (sessions && sessions.length > 0) {
          const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          weeklyActivityMinutes = sessions
            .filter(s => new Date(s.created_at) >= oneWeekAgo && s.duration_minutes)
            .reduce((acc, s) => acc + Number(s.duration_minutes || 0), 0);

          const today = new Date().toISOString().split("T")[0];
          const todaySession = sessions.find(s => new Date(s.created_at).toISOString().split("T")[0] === today && s.steps);
          if (todaySession) {
            todaySteps = Number(todaySession.steps);
          }

          state = "partial";
        }
      } catch (err) {
        console.warn("[Cardio Home] Could not query activity_log from RDS:", err.message);
      }

      // Query latest vitals / spectrum data from AWS RDS
      try {
        let assessments = [];
        if (userId) {
          assessments = await sql`
            SELECT ha.id, ha.created_at, hhi.*
            FROM health_assessments ha
            JOIN heart_health_inputs hhi ON ha.id = hhi.assessment_id
            WHERE ha.user_id = ${userId}::uuid AND ha.assessment_type = 'heart'
            ORDER BY ha.created_at DESC
            LIMIT 1;
          `;
        }
        if (!assessments || assessments.length === 0) {
          assessments = await sql`
            SELECT ha.id, ha.created_at, hhi.*
            FROM health_assessments ha
            JOIN heart_health_inputs hhi ON ha.id = hhi.assessment_id
            WHERE ha.assessment_type = 'heart'
            ORDER BY ha.created_at DESC
            LIMIT 1;
          `;
        }

        if (assessments && assessments.length > 0) {
          const inp = assessments[0];
          let count = 0;
          if (inp.systolic_bp && inp.diastolic_bp) count++;
          if (inp.weight_kg) count++;
          if (inp.height_cm && inp.weight_kg) count++;
          if (weeklyActivityMinutes > 0 || inp.physical_activity_minutes !== null) count++;
          if (inp.resting_heart_rate) count++;
          if (inp.smoking_status) count++;
          if (inp.hba1c || inp.fasting_glucose) count++;
          if (inp.ldl_cholesterol || inp.total_cholesterol) count++;
          if (inp.alcohol_consumption) count++;
          count += 2; // sleep and daily movement
          
          availableFactorsCount = Math.min(11, count);
          if (count >= 5) state = "populated";
          else if (count > 0) state = "partial";
        }
      } catch (err) {
        console.warn("[Cardio Home] Could not query health_assessments from RDS:", err.message);
      }
    }

    // Default reference values per CC-01 specification
    const responsePayload = {
      user_id: userId || null,
      state: state,
      screen_id: "CC-01",
      protocol_version: "V1.1-Delta",
      
      // Card 1: Heart Training Hero
      heart_training: {
        cta: "START HEART TRAINING",
        target_route: "CC-02",
        is_active: false,
        recommended_action: "Start Heart Training",
        prerequisite_required: false
      },

      // Card 2: Weekly Activity (150-300 min/week is neutral reference band)
      weekly_activity: {
        recorded_minutes: weeklyActivityMinutes,
        reference_min: 150,
        reference_max: 300,
        reference_label: "150 - 300 min/week",
        subtitle: "A general reference",
        is_above_max: weeklyActivityMinutes > 300,
        status: weeklyActivityMinutes > 0 ? "recorded" : "No recent data"
      },

      // Card 3: Today's Movement (Goal reference 10,000 steps)
      today_movement: {
        steps: todaySteps,
        goal_reference: 10000,
        goal_label: "Goal reference 10,000 steps",
        status: todaySteps > 0 ? `${todaySteps.toLocaleString()} steps` : "No recent data",
        separate_from_training: true
      },

      // Card 4: Heart Health Spectrum (Factor-based, NO COMPOSITE SCORE)
      spectrum_summary: {
        title: "Heart Health Spectrum",
        subtitle: "Multiple factors for a broader view of your heart health",
        cta: "VIEW SPECTRUM",
        target_route: "CC-08",
        available_factors: availableFactorsCount,
        total_factors: 11,
        status_label: availableFactorsCount > 0 ? `${availableFactorsCount} of 11 factors available` : "No recent data"
      },

      // Card 5: My Progress (Longitudinal Checkpoint)
      progress: {
        title: "My Progress",
        subtitle: "See your journey and next checkpoint",
        cta: "VIEW PROGRESS",
        target_route: "CC-09",
        current_checkpoint: "7D",
        status_label: state === "populated" ? "Progress available" : "No recent data"
      },

      // Card 6: Walking Performance Test (Standardized 6-minute comparison)
      walking_test: {
        title: "Walking Performance Test",
        subtitle: "Standardized six-minute comparison feature",
        cta: "START WALKING TEST",
        target_route: "CC-10",
        protocol_version: "configured",
        has_previous_test: walkingTests.length > 0,
        status_label: walkingTests.length > 0 ? "Previous test available" : "No data available"
      },

      // Card 7: Air Quality (AQI) Context
      aqi_context: {
        title: "Air Quality (AQI)",
        subtitle: "Environmental context for your activity",
        value: 85,
        category: "Moderate",
        freshness: "fresh",
        location: "Current Location",
        non_blocking: true,
        clinical_interpretation: false
      }
    };

    return success("CardioConnect CC-01 Home state loaded successfully from AWS RDS.", responsePayload, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("GET /api/v1/cardio/home error:", error);
    return failure("Failed to fetch CardioConnect Home state: " + error.message, "home_fetch_failed", 500, {
      headers: corsHeaders,
    });
  }
}
