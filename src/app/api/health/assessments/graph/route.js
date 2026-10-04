import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    let userId = searchParams.get("user_id") || searchParams.get("userId");
    if (userId === "guest" || userId === "undefined" || userId === "null") {
      userId = null;
    }
    const assessmentType = searchParams.get("type"); // 'heart', 'lung', or undefined for both
    const timeframe = searchParams.get("timeframe") || "all"; // 'week', 'month', '3months', 'year', 'all'
    const limit = parseInt(searchParams.get("limit"), 10) || 50;
    const includeHistory = searchParams.get("include_history") !== "false"; // Default true

    // If user ID is not provided, do not hijack another patient's records
    if (!userId) {
      console.log("[Assessments Graph] No user_id provided, returning empty history.");
    }

    if (!userId) {
      return success("No assessment history found.", {
        graphData: {
          labels: [],
          healthScoreTrend: [],
          systolicTrend: [],
          diastolicTrend: [],
          heartRateTrend: [],
          bmiTrend: [],
          lungCapacityTrend: [],
          riskDistribution: { low: 0, moderate: 0, high: 0, critical: 0 },
        },
        summary: {
          totalAssessments: 0,
          averageHealthScore: 0,
          latestScore: 0,
          riskLevel: "none",
          improvementRate: 0,
        },
        history: [],
      }, 200, { headers: corsHeaders });
    }

    const dateFilter = getDateFilter(timeframe);

    // Query health_assessments from AWS RDS PostgreSQL with real patient identity
    let assessments = [];
    try {
      if (assessmentType && assessmentType !== "all") {
        if (dateFilter) {
          assessments = await sql`
            SELECT a.*, p.full_name as patient_name, p.gender as patient_gender, p.date_of_birth as patient_dob, p.blood_group as patient_blood_group
            FROM health_assessments a
            LEFT JOIN patient_details p ON p.id = a.user_id
            WHERE (a.user_id = ${userId}::uuid OR a.user_id = ${String(userId)})
              AND a.assessment_type = ${assessmentType}
              AND a.created_at >= ${dateFilter}::timestamptz
            ORDER BY a.created_at DESC
            LIMIT ${limit};
          `;
        } else {
          assessments = await sql`
            SELECT a.*, p.full_name as patient_name, p.gender as patient_gender, p.date_of_birth as patient_dob, p.blood_group as patient_blood_group
            FROM health_assessments a
            LEFT JOIN patient_details p ON p.id = a.user_id
            WHERE (a.user_id = ${userId}::uuid OR a.user_id = ${String(userId)})
              AND a.assessment_type = ${assessmentType}
            ORDER BY a.created_at DESC
            LIMIT ${limit};
          `;
        }
      } else {
        if (dateFilter) {
          assessments = await sql`
            SELECT a.*, p.full_name as patient_name, p.gender as patient_gender, p.date_of_birth as patient_dob, p.blood_group as patient_blood_group
            FROM health_assessments a
            LEFT JOIN patient_details p ON p.id = a.user_id
            WHERE (a.user_id = ${userId}::uuid OR a.user_id = ${String(userId)})
              AND a.created_at >= ${dateFilter}::timestamptz
            ORDER BY a.created_at DESC
            LIMIT ${limit};
          `;
        } else {
          assessments = await sql`
            SELECT a.*, p.full_name as patient_name, p.gender as patient_gender, p.date_of_birth as patient_dob, p.blood_group as patient_blood_group
            FROM health_assessments a
            LEFT JOIN patient_details p ON p.id = a.user_id
            WHERE (a.user_id = ${userId}::uuid OR a.user_id = ${String(userId)})
            ORDER BY a.created_at DESC
            LIMIT ${limit};
          `;
        }
      }
    } catch (dbErr) {
      console.warn("[Assessments Graph] DB query failed (timeout or connection error):", dbErr.message);
      // Return empty data gracefully — do not surface raw DB errors to the client
      return success("No assessment history available right now.", {
        graphData: {
          labels: [],
          healthScoreTrend: [],
          riskLevelDistribution: [],
          organAgeComparison: [],
          detailedMetrics: [],
          improvementTimeline: []
        },
        summary: getSummary([]),
        history: []
      }, 200, { headers: corsHeaders });
    }

    if (!assessments || assessments.length === 0) {
      return success("No assessment history found.", {
        graphData: {
          labels: [],
          healthScoreTrend: [],
          riskLevelDistribution: [],
          organAgeComparison: [],
          detailedMetrics: [],
          improvementTimeline: []
        },
        summary: getSummary([]),
        history: []
      }, 200, { headers: corsHeaders });
    }

    // Fetch related inputs for these assessments from AWS RDS
    const assessmentIds = assessments.map(a => a.id);
    let heartInputs = [];
    let lungInputs = [];

    try {
      heartInputs = await sql`
        SELECT * FROM heart_health_inputs
        WHERE assessment_id = ANY(${assessmentIds});
      `;
    } catch (hErr) {
      console.warn("[Assessments Graph] Could not query heart_health_inputs:", hErr.message);
    }

    try {
      lungInputs = await sql`
        SELECT * FROM lung_health_inputs
        WHERE assessment_id = ANY(${assessmentIds});
      `;
    } catch (lErr) {
      console.warn("[Assessments Graph] Could not query lung_health_inputs:", lErr.message);
    }

    const heartMap = {};
    heartInputs.forEach(h => {
      heartMap[h.assessment_id] = h;
    });
    const lungMap = {};
    lungInputs.forEach(l => {
      lungMap[l.assessment_id] = l;
    });

    // Attach inputs to assessment records
    const fullAssessments = assessments.map(a => ({
      ...a,
      heart_health_inputs: heartMap[a.id] ? [heartMap[a.id]] : [],
      lung_health_inputs: lungMap[a.id] ? [lungMap[a.id]] : []
    }));

    // Format data for graphs and history
    const responseData = {
      graphData: formatGraphData(fullAssessments, assessmentType),
      summary: getSummary(fullAssessments),
      ...(includeHistory && { history: formatHistoryData(fullAssessments) })
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
    case '7d':
    case 'week':
      return new Date(now.setDate(now.getDate() - 7)).toISOString();
    case '1m':
    case 'month':
      return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
    case '3months':
    case '3m':
      return new Date(now.setMonth(now.getMonth() - 3)).toISOString();
    case '6m':
    case '6months':
      return new Date(now.setMonth(now.getMonth() - 6)).toISOString();
    case 'year':
    case '1y':
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

  return assessments.map(assessment => {
    const rawId = String(assessment.id || '');
    const cleanId = rawId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
    const fallbackSerial = assessment.assessment_type === 'heart'
      ? `CCN-${new Date(assessment.created_at).getFullYear()}-${cleanId || '0920'}`
      : `LCN-${new Date(assessment.created_at).getFullYear()}-${cleanId || '0920'}`;

    return {
      id: assessment.id,
      serialNo: assessment.serial_no || fallbackSerial,
      patientName: assessment.patient_name || null,
      patientData: {
        full_name: assessment.patient_name,
        name: assessment.patient_name,
        gender: assessment.patient_gender,
        date_of_birth: assessment.patient_dob,
        blood_group: assessment.patient_blood_group,
      },
      type: assessment.assessment_type,
      date: assessment.created_at,
      healthScore: assessment.health_score,
      riskLevel: assessment.risk_level,
      calculatedAge: assessment.calculated_age,
      aiAnalysis: typeof assessment.ai_analysis === 'string'
        ? (() => {
            try {
              return JSON.parse(assessment.ai_analysis);
            } catch (_) {
              return assessment.ai_analysis;
            }
          })()
        : assessment.ai_analysis,
      recommendations: assessment.recommendations,
      rawAssessment: assessment,
      inputs: assessment.assessment_type === 'heart' 
        ? formatHeartInputs(assessment.heart_health_inputs?.[0])
        : formatLungInputs(assessment.lung_health_inputs?.[0])
    };
  });
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
      age: Number(lungInput.age) || 0,
      gender: lungInput.gender,
      height: Number(lungInput.height_cm) || 0,
      weight: Number(lungInput.weight_kg) || 0
    },
    lifestyle: {
      smokingStatus: lungInput.smoking_status,
      smokingPackYears: Number(lungInput.smoking_pack_years) || 0,
      pollutionExposure: lungInput.pollution_exposure,
      occupationalRisk: lungInput.occupational_risk
    },
    respiratoryTests: {
      breathHoldingTime: Number(lungInput.breath_holding_time) || 0,
      breathsPerMinute: Number(lungInput.breaths_per_minute) || 0,
      peakFlow: Number(lungInput.peak_flow) || 0
    },
    symptoms: {
      coughFrequency: lungInput.cough_frequency,
      breathlessness: lungInput.breathlessness,
      wheezing: lungInput.wheezing
    },
    environment: {
      aqi: Number(lungInput.aqi) || 0,
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
          ageDifference: (assessment.calculated_age || 0) - (heartInput.age || 0),
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
          ageDifference: (assessment.calculated_age || 0) - (lungInput.age || 0),
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
      bestScore: assessments.length > 0 ? Math.max(...assessments.map(a => a.health_score)) : 0,
      worstScore: assessments.length > 0 ? Math.min(...assessments.map(a => a.health_score)) : 0
    }
  };
}