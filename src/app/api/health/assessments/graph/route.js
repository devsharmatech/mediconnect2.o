import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const assessmentType = searchParams.get("type"); // 'heart', 'lung', or undefined for both
    const timeframe = searchParams.get("timeframe") || "all"; // 'week', 'month', '3months', 'year', 'all'
    const limit = parseInt(searchParams.get("limit")) || 50;
    const includeHistory = searchParams.get("include_history") !== "false"; // Default true

    if (!userId) {
      return failure("User ID is required", "validation_error", 400, {
        headers: corsHeaders,
      });
    }

    // Build base query for assessments with all related data
    let query = supabase
      .from("health_assessments")
      .select(`
        id,
        assessment_type,
        health_score,
        calculated_age,
        risk_level,
        ai_analysis,
        recommendations,
        created_at,
        updated_at,
        heart_health_inputs(
          age,
          gender,
          systolic_bp,
          diastolic_bp,
          resting_heart_rate,
          total_cholesterol,
          hdl_cholesterol,
          ldl_cholesterol,
          triglycerides,
          fasting_glucose,
          hba1c,
          height_cm,
          weight_kg,
          bmi,
          smoking_status,
          alcohol_consumption,
          physical_activity_minutes,
          family_cardiac_history,
          hypertension_history,
          diabetes_history,
          chest_pain,
          breathlessness,
          palpitations
        ),
        lung_health_inputs(
          age,
          gender,
          height_cm,
          weight_kg,
          smoking_status,
          smoking_pack_years,
          pollution_exposure,
          occupational_risk,
          breath_holding_time,
          breaths_per_minute,
          peak_flow,
          cough_frequency,
          breathlessness,
          wheezing,
          aqi,
          location,
          pollutant_data
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }) // Most recent first for history
      .limit(limit);

    // Filter by assessment type if specified
    if (assessmentType && assessmentType !== 'all') {
      query = query.eq("assessment_type", assessmentType);
    }

    // Filter by timeframe
    if (timeframe !== 'all') {
      const dateFilter = getDateFilter(timeframe);
      if (dateFilter) {
        query = query.gte("created_at", dateFilter);
      }
    }

    const { data: assessments, error } = await query;

    if (error) throw error;

    // Format data for graphs and history
    const responseData = {
      graphData: formatGraphData(assessments, assessmentType),
      summary: getSummary(assessments),
      ...(includeHistory && { history: formatHistoryData(assessments) })
    };

    return success("Health data fetched successfully.", responseData, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("GET Health Graph Data Error:", error);
    return failure("Failed to fetch health data. " + error.message, "fetch_failed", 500, {
      headers: corsHeaders,
    });
  }
}

function getDateFilter(timeframe) {
  const now = new Date();
  switch (timeframe) {
    case 'week':
      return new Date(now.setDate(now.getDate() - 7)).toISOString();
    case 'month':
      return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
    case '3months':
      return new Date(now.setMonth(now.getMonth() - 3)).toISOString();
    case 'year':
      return new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
    default:
      return null;
  }
}

function formatGraphData(assessments, assessmentType) {
  if (!assessments || assessments.length === 0) {
    return {
      healthScoreTrend: [],
      riskLevelDistribution: [],
      organAgeComparison: [],
      detailedMetrics: [],
      improvementTimeline: []
    };
  }

  // Sort by date for graphs (oldest first)
  const sortedAssessments = [...assessments].sort((a, b) => 
    new Date(a.created_at) - new Date(b.created_at)
  );

  const heartAssessments = sortedAssessments.filter(a => a.assessment_type === 'heart');
  const lungAssessments = sortedAssessments.filter(a => a.assessment_type === 'lung');

  return {
    healthScoreTrend: getHealthScoreTrend(sortedAssessments, assessmentType),
    riskLevelDistribution: getRiskLevelDistribution(sortedAssessments, assessmentType),
    organAgeComparison: getOrganAgeComparison(heartAssessments, lungAssessments, assessmentType),
    detailedMetrics: getDetailedMetrics(heartAssessments, lungAssessments, assessmentType),
    improvementTimeline: getImprovementTimeline(sortedAssessments, assessmentType)
  };
}

function formatHistoryData(assessments) {
  if (!assessments || assessments.length === 0) {
    return [];
  }

  return assessments.map(assessment => ({
    id: assessment.id,
    type: assessment.assessment_type,
    date: assessment.created_at,
    healthScore: assessment.health_score,
    riskLevel: assessment.risk_level,
    calculatedAge: assessment.calculated_age,
    aiAnalysis: assessment.ai_analysis,
    recommendations: assessment.recommendations,
    inputs: assessment.assessment_type === 'heart' 
      ? formatHeartInputs(assessment.heart_health_inputs?.[0])
      : formatLungInputs(assessment.lung_health_inputs?.[0])
  }));
}

function formatHeartInputs(heartInput) {
  if (!heartInput) return null;
  
  return {
    demographics: {
      age: heartInput.age,
      gender: heartInput.gender,
      height: heartInput.height_cm,
      weight: heartInput.weight_kg,
      bmi: heartInput.bmi
    },
    vitals: {
      systolicBP: heartInput.systolic_bp,
      diastolicBP: heartInput.diastolic_bp,
      restingHeartRate: heartInput.resting_heart_rate
    },
    lipids: {
      totalCholesterol: heartInput.total_cholesterol,
      hdlCholesterol: heartInput.hdl_cholesterol,
      ldlCholesterol: heartInput.ldl_cholesterol,
      triglycerides: heartInput.triglycerides
    },
    bloodSugar: {
      fastingGlucose: heartInput.fasting_glucose,
      hba1c: heartInput.hba1c
    },
    lifestyle: {
      smokingStatus: heartInput.smoking_status,
      alcoholConsumption: heartInput.alcohol_consumption,
      physicalActivity: heartInput.physical_activity_minutes
    },
    medicalHistory: {
      familyCardiacHistory: heartInput.family_cardiac_history,
      hypertensionHistory: heartInput.hypertension_history,
      diabetesHistory: heartInput.diabetes_history
    },
    symptoms: {
      chestPain: heartInput.chest_pain,
      breathlessness: heartInput.breathlessness,
      palpitations: heartInput.palpitations
    }
  };
}

function formatLungInputs(lungInput) {
  if (!lungInput) return null;
  
  return {
    demographics: {
      age: lungInput.age,
      gender: lungInput.gender,
      height: lungInput.height_cm,
      weight: lungInput.weight_kg
    },
    lifestyle: {
      smokingStatus: lungInput.smoking_status,
      smokingPackYears: lungInput.smoking_pack_years,
      pollutionExposure: lungInput.pollution_exposure,
      occupationalRisk: lungInput.occupational_risk
    },
    respiratoryTests: {
      breathHoldingTime: lungInput.breath_holding_time,
      breathsPerMinute: lungInput.breaths_per_minute,
      peakFlow: lungInput.peak_flow
    },
    symptoms: {
      coughFrequency: lungInput.cough_frequency,
      breathlessness: lungInput.breathlessness,
      wheezing: lungInput.wheezing
    },
    environment: {
      aqi: lungInput.aqi,
      location: lungInput.location,
      pollutantData: lungInput.pollutant_data
    }
  };
}

function getHealthScoreTrend(assessments, assessmentType) {
  return assessments
    .filter(assessment => !assessmentType || assessmentType === 'all' || assessment.assessment_type === assessmentType)
    .map(assessment => ({
      date: assessment.created_at,
      score: assessment.health_score,
      type: assessment.assessment_type,
      riskLevel: assessment.risk_level,
      assessmentId: assessment.id
    }));
}

function getRiskLevelDistribution(assessments, assessmentType) {
  const distribution = { low: 0, moderate: 0, high: 0, critical: 0 };

  assessments.forEach(assessment => {
    if (assessmentType && assessmentType !== 'all' && assessment.assessment_type !== assessmentType) {
      return;
    }
    if (distribution[assessment.risk_level] !== undefined) {
      distribution[assessment.risk_level]++;
    }
  });

  return Object.entries(distribution).map(([level, count]) => ({
    level,
    count,
    percentage: assessments.length > 0 ? Math.round((count / assessments.length) * 100) : 0
  }));
}

function getOrganAgeComparison(heartAssessments, lungAssessments, assessmentType) {
  const comparisonData = [];

  if (!assessmentType || assessmentType === 'all' || assessmentType === 'heart') {
    heartAssessments.forEach(assessment => {
      const heartInput = assessment.heart_health_inputs?.[0];
      if (heartInput) {
        comparisonData.push({
          date: assessment.created_at,
          type: 'heart',
          actualAge: heartInput.age,
          organAge: assessment.calculated_age,
          ageDifference: assessment.calculated_age - heartInput.age,
          assessmentId: assessment.id
        });
      }
    });
  }

  if (!assessmentType || assessmentType === 'all' || assessmentType === 'lung') {
    lungAssessments.forEach(assessment => {
      const lungInput = assessment.lung_health_inputs?.[0];
      if (lungInput) {
        comparisonData.push({
          date: assessment.created_at,
          type: 'lung',
          actualAge: lungInput.age,
          organAge: assessment.calculated_age,
          ageDifference: assessment.calculated_age - lungInput.age,
          assessmentId: assessment.id
        });
      }
    });
  }

  return comparisonData;
}

function getDetailedMetrics(heartAssessments, lungAssessments, assessmentType) {
  const metrics = [];

  if (!assessmentType || assessmentType === 'all' || assessmentType === 'heart') {
    heartAssessments.forEach(assessment => {
      const heartInput = assessment.heart_health_inputs?.[0];
      if (heartInput) {
        metrics.push({
          date: assessment.created_at,
          type: 'heart',
          systolicBP: heartInput.systolic_bp,
          diastolicBP: heartInput.diastolic_bp,
          heartRate: heartInput.resting_heart_rate,
          bmi: heartInput.bmi,
          healthScore: assessment.health_score,
          assessmentId: assessment.id
        });
      }
    });
  }

  if (!assessmentType || assessmentType === 'all' || assessmentType === 'lung') {
    lungAssessments.forEach(assessment => {
      const lungInput = assessment.lung_health_inputs?.[0];
      if (lungInput) {
        metrics.push({
          date: assessment.created_at,
          type: 'lung',
          breathHoldingTime: lungInput.breath_holding_time,
          breathsPerMinute: lungInput.breaths_per_minute,
          aqi: lungInput.aqi,
          healthScore: assessment.health_score,
          assessmentId: assessment.id
        });
      }
    });
  }

  return metrics;
}

function getImprovementTimeline(assessments, assessmentType) {
  const timeline = [];
  let previousScore = null;

  assessments.forEach(assessment => {
    if (assessmentType && assessmentType !== 'all' && assessment.assessment_type !== assessmentType) {
      return;
    }

    const improvement = previousScore !== null ? assessment.health_score - previousScore : 0;
    
    timeline.push({
      date: assessment.created_at,
      type: assessment.assessment_type,
      score: assessment.health_score,
      improvement: improvement,
      trend: improvement > 0 ? 'improving' : improvement < 0 ? 'declining' : 'stable',
      assessmentId: assessment.id
    });

    previousScore = assessment.health_score;
  });

  return timeline;
}

function getSummary(assessments) {
  const heartAssessments = assessments.filter(a => a.assessment_type === 'heart');
  const lungAssessments = assessments.filter(a => a.assessment_type === 'lung');

  const latestHeart = heartAssessments[0]; // Most recent first
  const latestLung = lungAssessments[0];
  const firstHeart = heartAssessments[heartAssessments.length - 1];
  const firstLung = lungAssessments[lungAssessments.length - 1];

  return {
    totalAssessments: assessments.length,
    heart: {
      total: heartAssessments.length,
      latestScore: latestHeart?.health_score,
      latestRisk: latestHeart?.risk_level,
      improvement: heartAssessments.length > 1 ? 
        latestHeart.health_score - firstHeart.health_score : 0,
      averageScore: heartAssessments.length > 0 ?
        Math.round(heartAssessments.reduce((sum, a) => sum + a.health_score, 0) / heartAssessments.length) : null
    },
    lung: {
      total: lungAssessments.length,
      latestScore: latestLung?.health_score,
      latestRisk: latestLung?.risk_level,
      improvement: lungAssessments.length > 1 ? 
        latestLung.health_score - firstLung.health_score : 0,
      averageScore: lungAssessments.length > 0 ?
        Math.round(lungAssessments.reduce((sum, a) => sum + a.health_score, 0) / lungAssessments.length) : null
    },
    overall: {
      averageScore: assessments.length > 0 ?
        Math.round(assessments.reduce((sum, a) => sum + a.health_score, 0) / assessments.length) : null,
      bestScore: Math.max(...assessments.map(a => a.health_score)),
      worstScore: Math.min(...assessments.map(a => a.health_score))
    }
  };
}