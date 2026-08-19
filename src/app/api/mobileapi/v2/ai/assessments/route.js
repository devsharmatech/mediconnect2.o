import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { analyzeHealthData, generateHealthRecommendations } from "@/lib/openai";
import { moderateAIOutput } from "@/lib/ai/v2/moderationEngine";
import { logAIToolInteraction } from "@/lib/ai/v2/logging";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// ─── Health calculation algorithms (exact copy from V1) ──────────────────────

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

    if (inputs.systolic_bp >= 140 || inputs.diastolic_bp >= 90) { score -= 20; riskFactors.push("Stage 2 Hypertension"); }
    else if (inputs.systolic_bp >= 130 || inputs.diastolic_bp >= 80) { score -= 12; riskFactors.push("Elevated BP"); }

    if (inputs.ldl_cholesterol > 160) { score -= 15; riskFactors.push("High LDL"); }
    else if (inputs.ldl_cholesterol > 130) { score -= 10; }

    if (inputs.hdl_cholesterol < 40) { score -= 10; riskFactors.push("Low HDL"); }
    if (inputs.triglycerides > 200) { score -= 8; riskFactors.push("High Triglycerides"); }

    if (inputs.hba1c >= 6.5) { score -= 12; riskFactors.push("Diabetes"); }
    else if (inputs.hba1c >= 5.7) { score -= 6; riskFactors.push("Prediabetes"); }

    if (inputs.resting_heart_rate > 100) { score -= 12; riskFactors.push("Tachycardia"); }
    else if (inputs.resting_heart_rate > 80) score -= 5;

    if (inputs.smoking_status === "current") { score -= 25; riskFactors.push("Smoking"); }
    if (inputs.physical_activity_minutes < 120) { score -= 10; riskFactors.push("Low physical activity"); }
    if (inputs.chest_pain) { score -= 25; riskFactors.push("Chest pain – urgent"); }

    score = Math.max(0, Math.min(100, score));
    const heartAge = inputs.age + Math.floor((100 - score) / 3);
    let riskLevel = score >= 80 ? "low" : score >= 60 ? "moderate" : score >= 40 ? "high" : "critical";

    return { healthScore: Math.round(score), calculatedAge: heartAge, riskLevel, riskFactors };
}

function calculateLungHealth(inputs) {
    let score = 100;
    const riskFactors = [];

    const bmi = inputs.weight_kg / (inputs.height_cm / 100) ** 2;
    inputs.bmi = bmi;

    if (bmi > 30) { score -= 10; riskFactors.push("Obesity affecting breathing"); }

    if (inputs.smoking_status === "current") { score -= 30; riskFactors.push("Smoking"); }
    else if (inputs.smoking_status === "former") { score -= 12; }

    if (inputs.peak_flow < 350) { score -= 25; riskFactors.push("Low peak flow (possible asthma/COPD)"); }
    else if (inputs.peak_flow < 450) { score -= 10; }

    if (inputs.aqi > 200) { score -= 20; riskFactors.push("Severe pollution exposure"); }
    else if (inputs.aqi > 120) { score -= 10; }

    if (inputs.breathlessness === "severe") { score -= 20; riskFactors.push("Severe breathlessness"); }
    else if (inputs.breathlessness === "moderate") { score -= 12; }

    if (inputs.cough_frequency === "constant") { score -= 18; riskFactors.push("Chronic cough"); }
    if (inputs.wheezing) { score -= 12; riskFactors.push("Wheezing (possible asthma)"); }

    if (inputs.breath_holding_time < 20) { score -= 20; riskFactors.push("Low lung capacity"); }
    else if (inputs.breath_holding_time < 40) { score -= 10; }

    score = Math.max(0, Math.min(100, score));
    const lungAge = inputs.age + Math.floor((100 - score) / 2.5);
    let riskLevel = score >= 80 ? "low" : score >= 60 ? "moderate" : score >= 40 ? "high" : "critical";

    return { healthScore: Math.round(score), calculatedAge: lungAge, riskLevel, riskFactors };
}

async function checkAndAwardBadges(userId, assessmentType, score) {
    const badgesToAward = [];

    const { count } = await supabase
        .from("health_assessments")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("assessment_type", assessmentType);

    if (count === 1) {
        badgesToAward.push({
            badge_name: `${assessmentType === "heart" ? "Heart" : "Lung"} Health Starter`,
            badge_type: assessmentType,
            description: `Completed first ${assessmentType} health assessment`,
        });
    }

    if (score >= 80) {
        badgesToAward.push({
            badge_name: `${assessmentType === "heart" ? "Heart" : "Lung"} Champion`,
            badge_type: assessmentType,
            description: `Achieved excellent ${assessmentType} health score`,
        });
    }

    for (const badge of badgesToAward) {
        await supabase.from("user_badges").insert([{
            user_id: userId,
            ...badge,
            earned_at: new Date().toISOString(),
        }]);
    }
}

// ─── Main POST handler ──────────────────────────────────────────────────────

export async function POST(req) {
    try {
        const { user_id, assessment_type, inputs } = await req.json();

        if (!user_id || !assessment_type || !inputs) {
            return failure("Missing required fields: user_id, assessment_type, inputs", "validation_error", 400, { headers: corsHeaders });
        }

        if (!["heart", "lung"].includes(assessment_type)) {
            return failure("Invalid assessment type. Must be 'heart' or 'lung'", "validation_error", 400, { headers: corsHeaders });
        }

        // 1. Calculate health score (identical to V1)
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

        // 2. Generate assistive analysis and recommendations (identical to V1)
        const [rawAiAnalysis, recommendations] = await Promise.all([
            analyzeHealthData(assessment_type, inputs, healthScore, riskFactors),
            generateHealthRecommendations(assessment_type, inputs, riskFactors),
        ]);

        // 3. V2 SAFETY: Post-LLM Moderation on the analysis text
        let aiAnalysis = rawAiAnalysis;
        if (rawAiAnalysis && typeof rawAiAnalysis === "object" && rawAiAnalysis.analysis) {
            const moderationResult = moderateAIOutput(rawAiAnalysis.analysis);
            if (!moderationResult.isSafe) {
                aiAnalysis = { ...rawAiAnalysis, analysis: moderationResult.cleanResponse, moderated: true };
            }
        } else if (typeof rawAiAnalysis === "string") {
            const moderationResult = moderateAIOutput(rawAiAnalysis);
            if (!moderationResult.isSafe) {
                aiAnalysis = moderationResult.cleanResponse;
            }
        }

        // 4. Insert into health_assessments table (identical to V1)
        const { data: assessment, error: assessmentError } = await supabase
            .from("health_assessments")
            .insert([{
                user_id,
                assessment_type,
                health_score: healthScore,
                calculated_age: calculatedAge,
                risk_level: riskLevel,
                ai_analysis: aiAnalysis,
                recommendations: recommendations,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }])
            .select()
            .single();

        if (assessmentError) throw assessmentError;

        // 5. Insert into specific input table (identical to V1)
        const inputTable = assessment_type === "heart" ? "heart_health_inputs" : "lung_health_inputs";
        const cleanInputs = { ...inputs };
        delete cleanInputs.bmi;
        delete cleanInputs.calculated_bmi;

        const { error: inputError } = await supabase.from(inputTable).insert([{
            assessment_id: assessment.id,
            ...cleanInputs,
            created_at: new Date().toISOString(),
        }]);

        if (inputError) throw inputError;

        // 6. Check and award badges (identical to V1)
        await checkAndAwardBadges(user_id, assessment_type, healthScore);

        // 7. V2 EXTRA: Log to immutable ai_tool_interactions table
        try {
            await logAIToolInteraction({
                userId: user_id,
                toolName: `${assessment_type}_connect`,
                inputJson: inputs,
                riskLevel: riskLevel,
                urgencyClassification: riskLevel === "critical" ? "URGENT" : "ROUTINE",
                recommendation: typeof aiAnalysis === "string" ? aiAnalysis : (aiAnalysis?.analysis || ""),
            });
        } catch (logError) {
            // V2 logging failure should not break the main flow
            console.error("V2 AI Tool Logging Error (non-fatal):", logError);
        }

        // 8. Get complete assessment with inputs (identical to V1 response shape)
        const { data: completeAssessment, error: fetchError } = await supabase
            .from("health_assessments")
            .select(`
        *,
        heart_health_inputs(*),
        lung_health_inputs(*)
      `)
            .eq("id", assessment.id)
            .single();

        if (fetchError) throw fetchError;

        // Return EXACT same shape as V1
        return success(
            "Health assessment created successfully with assistive analysis.",
            completeAssessment,
            201
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
