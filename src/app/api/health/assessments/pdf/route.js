import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

// Generate PDF from screening details
export async function POST(req) {
  try {
    const { user_id, assessment_id } = await req.json();

    if (!user_id) {
      return failure("User ID is required", "validation_error", 400, {
        headers: corsHeaders,
      });
    }

    // Get health assessments
    const { data: assessments, error: fetchError } = await supabase
      .from("health_assessments")
      .select(
        `
        *,
        heart_health_inputs(*),
        lung_health_inputs(*)
      `
      )
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });

    if (fetchError) throw fetchError;

    if (!assessments || assessments.length === 0) {
      return failure("No health assessments found", "not_found", 404, {
        headers: corsHeaders,
      });
    }

    // If specific assessment_id provided, filter for that assessment
    const targetAssessment = assessment_id
      ? assessments.find((assessment) => assessment.id === assessment_id)
      : assessments[0]; // Get the latest one if no specific ID

    if (!targetAssessment) {
      return failure("Assessment not found", "not_found", 404, {
        headers: corsHeaders,
      });
    }

    // Read local real-logo.png and convert to base64 Data URI
    let logoDataUri = "https://mediconnect.fit/real-logo.png"; // fallback
    try {
      const fs = require("fs");
      const path = require("path");
      const logoPath = path.join(process.cwd(), "public", "real-logo.png");
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        logoDataUri = `data:image/png;base64,${logoBuffer.toString("base64")}`;
      }
    } catch (err) {
      console.error("Failed to load local logo for PDF:", err);
    }

    // Generate HTML based on assessment type
    let html;
    if (targetAssessment.assessment_type === "heart") {
      html = buildHeartHealthHtml(targetAssessment, logoDataUri);
    } else if (targetAssessment.assessment_type === "lung") {
      html = buildLungHealthHtml(targetAssessment, logoDataUri);
    } else {
      return failure("Invalid assessment type", "validation_error", 400, {
        headers: corsHeaders,
      });
    }

    // Generate PDF using your external API
    const pdfResponse = await fetch(
      "https://argosmob.uk/dhillon/public/api/v1/pdf/generate-pdf",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ html }),
      }
    );

    if (!pdfResponse.ok) {
      const errText = await pdfResponse.text();
      throw new Error(`PDF service error: ${pdfResponse.status} — ${errText}`);
    }

    const pdfJson = await pdfResponse.json();
    console.log("PDF API result:", pdfJson);

    return success(
      "PDF generated successfully",
      {
        url: pdfJson.url || "",
        assessment_id: targetAssessment.id,
        assessment_type: targetAssessment.assessment_type,
        success: true,
        message: `${targetAssessment.assessment_type} health PDF generated successfully.`,
      },
      200,
      {
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error("PDF Generation Error:", error);
    return failure(
      "Failed to generate PDF. " + error.message,
      "pdf_generation_failed",
      500,
      {
        headers: corsHeaders,
      }
    );
  }
}

// Build HTML for Heart Health Assessment with table structure
function buildHeartHealthHtml(assessment, logoDataUri) {
  const {
    health_score,
    calculated_age,
    risk_level,
    ai_analysis,
    recommendations,
    created_at,
  } = assessment;

  const inputs = assessment.heart_health_inputs[0] || {};

  const formattedDate = new Date(created_at).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Format values for display
  const formatValue = (value) => {
    if (value === null || value === undefined || value === "")
      return "Not Provided";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "number") {
      if (value % 1 === 0) return value.toString();
      return value.toFixed(2);
    }
    return value;
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Heart Health Assessment Report</title>
    <style>
    @page { size: A4; margin: 0; }
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
        }
        .container {
            max-width: 1000px;
            margin: 0 auto;
        }
        .header {
            text-align: left;
            border-bottom: 3px solid #dc3545;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #dc3545;
            margin: 0;
            font-size: 28px;
        }
        .header .subtitle {
            color: #666;
            font-size: 16px;
            margin: 5px 0;
        }
        .summary-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            background: #f8f9fa;
        }
        .summary-table th {
            background: #dc3545;
            color: white;
            padding: 15px;
            text-align: left;
            font-size: 16px;
        }
        .summary-table td {
            padding: 12px 15px;
            border-bottom: 1px solid #ddd;
        }
        .summary-table .score {
            font-size: 24px;
            font-weight: bold;
            color: #dc3545;
        }
        .section {
            margin-bottom: 30px;
        }
        .section-title {
            background: #2c3e50;
            color: white;
            padding: 12px 15px;
            font-size: 18px;
            margin-bottom: 15px;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .data-table th {
            background: #34495e;
            color: white;
            padding: 12px 15px;
            text-align: left;
            font-weight: bold;
            border: 1px solid #ddd;
        }
        .data-table td {
            padding: 10px 15px;
            border: 1px solid #ddd;
        }
        .data-table tr:nth-child(even) {
            background: #f8f9fa;
        }
        .risk-indicator {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            font-weight: bold;
            color: white;
        }
        .risk-low { background: #28a745; }
        .risk-moderate { background: #ffc107; color: #000; }
        .risk-high { background: #fd7e14; }
        .risk-critical { background: #dc3545; }
        .recommendation-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        .recommendation-table th {
            background: #17a2b8;
            color: white;
            padding: 10px;
            text-align: left;
        }
        .recommendation-table td {
            padding: 10px;
            border: 1px solid #ddd;
            vertical-align: top;
        }
        .priority-high { border-left: 4px solid #dc3545; background: #f8d7da; }
        .priority-medium { border-left: 4px solid #ffc107; background: #fff3cd; }
        .priority-low { border-left: 4px solid #28a745; background: #d4edda; }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #ddd;
            color: #666;
            font-size: 12px;
        }
        .analysis-section {
            background: #e8f4f8;
            padding: 15px;
            margin-bottom: 20px;
            border-left: 4px solid #17a2b8;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header" style="border-bottom: 3px solid #dc3545; padding-bottom: 15px; margin-bottom: 30px;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; table-layout: fixed;">
                <tr>
                    <td style="width: 25%; text-align: left; vertical-align: middle;">
                        <img src="${logoDataUri}" alt="Mediconnect.fit Logo" style="height: 60px; width: auto; vertical-align: middle;" />
                    </td>
                    <td style="width: 50%; text-align: center; vertical-align: middle;">
                        <span style="font-size: 32px; font-weight: bold; color: #0067A1; font-family: Arial, sans-serif; letter-spacing: 0.5px;">Mediconnect.fit</span>
                    </td>
                    <td style="width: 25%; text-align: right; vertical-align: middle; color: #666; font-size: 13px; line-height: 1.4;">
                        <strong>Generated on:</strong><br/>${formattedDate}
                    </td>
                </tr>
            </table>
            <h1 style="color: #dc3545; margin: 0; font-size: 26px; text-align: left;">HEART HEALTH ASSESSMENT REPORT</h1>
            <div class="subtitle" style="color: #666; font-size: 15px; margin-top: 5px; text-align: left;">Comprehensive Cardiovascular Health Analysis</div>
        </div>

        <!-- Summary Table -->
        <table class="summary-table">
            <tr>
                <th colspan="4">ASSESSMENT SUMMARY</th>
            </tr>
            <tr>
                <td><strong>Health Score</strong></td>
                <td class="score">${health_score}/100</td>
                <td><strong>Heart Age</strong></td>
                <td>${calculated_age} years</td>
            </tr>
            <tr>
                <td><strong>Risk Level</strong></td>
                <td>
                    <span class="risk-indicator risk-${risk_level}">
                        ${risk_level.toUpperCase()}
                    </span>
                </td>
                <td><strong>Assessment Type</strong></td>
                <td>Heart Health Screening</td>
            </tr>
        </table>

        <!-- Personal Information -->
        <div class="section">
            <div class="section-title">PERSONAL INFORMATION</div>
            <table class="data-table">
                <tr>
                    <th style="width: 25%;">Parameter</th>
                    <th style="width: 25%;">Value</th>
                    <th style="width: 25%;">Parameter</th>
                    <th style="width: 25%;">Value</th>
                </tr>
                <tr>
                    <td><strong>Age</strong></td>
                    <td>${formatValue(inputs.age)} years</td>
                    <td><strong>Gender</strong></td>
                    <td>${formatValue(inputs.gender)}</td>
                </tr>
                <tr>
                    <td><strong>Height</strong></td>
                    <td>${formatValue(inputs.height_cm)} cm</td>
                    <td><strong>Weight</strong></td>
                    <td>${formatValue(inputs.weight_kg)} kg</td>
                </tr>
                <tr>
                    <td><strong>BMI</strong></td>
                    <td>${formatValue(inputs.bmi)}</td>
                    <td><strong>Smoking Status</strong></td>
                    <td>${formatValue(inputs.smoking_status)}</td>
                </tr>
            </table>
        </div>

        <!-- Vital Signs -->
        <div class="section">
            <div class="section-title">VITAL SIGNS & BLOOD PRESSURE</div>
            <table class="data-table">
                <tr>
                    <th style="width: 25%;">Parameter</th>
                    <th style="width: 25%;">Value</th>
                    <th style="width: 25%;">Parameter</th>
                    <th style="width: 25%;">Value</th>
                </tr>
                <tr>
                    <td><strong>Systolic BP</strong></td>
                    <td>${formatValue(inputs.systolic_bp)} mmHg</td>
                    <td><strong>Diastolic BP</strong></td>
                    <td>${formatValue(inputs.diastolic_bp)} mmHg</td>
                </tr>
                <tr>
                    <td><strong>Resting Heart Rate</strong></td>
                    <td>${formatValue(inputs.resting_heart_rate)} bpm</td>
                    <td><strong>Physical Activity</strong></td>
                    <td>${formatValue(
                      inputs.physical_activity_minutes
                    )} min/week</td>
                </tr>
            </table>
        </div>

        <!-- Blood Tests -->
        <div class="section">
            <div class="section-title">BLOOD TEST RESULTS</div>
            <table class="data-table">
                <tr>
                    <th style="width: 25%;">Parameter</th>
                    <th style="width: 25%;">Value</th>
                    <th style="width: 25%;">Parameter</th>
                    <th style="width: 25%;">Value</th>
                </tr>
                <tr>
                    <td><strong>Total Cholesterol</strong></td>
                    <td>${formatValue(inputs.total_cholesterol)} mg/dL</td>
                    <td><strong>HDL Cholesterol</strong></td>
                    <td>${formatValue(inputs.hdl_cholesterol)} mg/dL</td>
                </tr>
                <tr>
                    <td><strong>LDL Cholesterol</strong></td>
                    <td>${formatValue(inputs.ldl_cholesterol)} mg/dL</td>
                    <td><strong>Triglycerides</strong></td>
                    <td>${formatValue(inputs.triglycerides)} mg/dL</td>
                </tr>
                <tr>
                    <td><strong>Fasting Glucose</strong></td>
                    <td>${formatValue(inputs.fasting_glucose)} mg/dL</td>
                    <td><strong>HbA1c</strong></td>
                    <td>${formatValue(inputs.hba1c)} %</td>
                </tr>
            </table>
        </div>

        <!-- Lifestyle & History -->
        <div class="section">
            <div class="section-title">LIFESTYLE & MEDICAL HISTORY</div>
            <table class="data-table">
                <tr>
                    <th style="width: 25%;">Parameter</th>
                    <th style="width: 25%;">Value</th>
                    <th style="width: 25%;">Parameter</th>
                    <th style="width: 25%;">Value</th>
                </tr>
                <tr>
                    <td><strong>Alcohol Consumption</strong></td>
                    <td>${formatValue(inputs.alcohol_consumption)}</td>
                    <td><strong>Family Cardiac History</strong></td>
                    <td>${formatValue(inputs.family_cardiac_history)}</td>
                </tr>
                <tr>
                    <td><strong>Hypertension History</strong></td>
                    <td>${formatValue(inputs.hypertension_history)}</td>
                    <td><strong>Diabetes History</strong></td>
                    <td>${formatValue(inputs.diabetes_history)}</td>
                </tr>
                <tr>
                    <td><strong>Chest Pain</strong></td>
                    <td>${formatValue(inputs.chest_pain)}</td>
                    <td><strong>Breathlessness</strong></td>
                    <td>${formatValue(inputs.breathlessness)}</td>
                </tr>
                <tr>
                    <td><strong>Palpitations</strong></td>
                    <td>${formatValue(inputs.palpitations)}</td>
                    <td></td>
                    <td></td>
                </tr>
            </table>
        </div>

        <!-- Assistive Analysis -->
        ${
          ai_analysis
            ? `
        <div class="section">
            <div class="section-title">MEDICAL ANALYSIS</div>
            <div class="analysis-section">
                <p><strong>Overall Assessment:</strong> ${
                  ai_analysis.analysis ||
                  "Comprehensive heart health assessment completed."
                }</p>
                
                ${
                  ai_analysis.key_findings &&
                  ai_analysis.key_findings.length > 0
                    ? `
                <p><strong>Key Findings:</strong></p>
                <ul>
                    ${ai_analysis.key_findings
                      .map((finding) => `<li>${finding}</li>`)
                      .join("")}
                </ul>
                `
                    : ""
                }
                
                ${
                  ai_analysis.positive_aspects &&
                  ai_analysis.positive_aspects.length > 0
                    ? `
                <p><strong>Positive Aspects:</strong></p>
                <ul>
                    ${ai_analysis.positive_aspects
                      .map((aspect) => `<li>${aspect}</li>`)
                      .join("")}
                </ul>
                `
                    : ""
                }
                
                ${
                  ai_analysis.improvement_areas &&
                  ai_analysis.improvement_areas.length > 0
                    ? `
                <p><strong>Areas for Improvement:</strong></p>
                <ul>
                    ${ai_analysis.improvement_areas
                      .map((area) => `<li>${area}</li>`)
                      .join("")}
                </ul>
                `
                    : ""
                }
            </div>
        </div>
        `
            : ""
        }

        <!-- Recommendations -->
        ${
          recommendations && recommendations.length > 0
            ? `
        <div class="section">
            <div class="section-title">HEALTH RECOMMENDATIONS</div>
            ${recommendations
              .map(
                (rec) => `
                <table class="recommendation-table priority-${
                  rec.priority || "medium"
                }">
                    <tr>
                        <th style="width: 20%;">Title</th>
                        <td style="width: 80%;"><strong>${
                          rec.title || "Heart Health Recommendation"
                        }</strong></td>
                    </tr>
                    <tr>
                        <th>Category</th>
                        <td>${rec.category || "General"}</td>
                    </tr>
                    <tr>
                        <th>Priority</th>
                        <td>${rec.priority || "Medium"}</td>
                    </tr>
                    <tr>
                        <th>Timeframe</th>
                        <td>${rec.timeframe || "Ongoing"}</td>
                    </tr>
                    <tr>
                        <th>Description</th>
                        <td>${
                          rec.description ||
                          "Follow these action steps to improve your heart health."
                        }</td>
                    </tr>
                    ${
                      rec.action_steps && rec.action_steps.length > 0
                        ? `
                    <tr>
                        <th>Action Steps</th>
                        <td>
                            <ol>
                                ${rec.action_steps
                                  .map((step) => `<li>${step}</li>`)
                                  .join("")}
                            </ol>
                        </td>
                    </tr>
                    `
                        : ""
                    }
                    ${
                      rec.indian_context
                        ? `
                    <tr>
                        <th>Context</th>
                        <td>🇮🇳 Specifically tailored for Indian context</td>
                    </tr>
                    `
                        : ""
                    }
                </table>
            `
              )
              .join("")}
        </div>
        `
            : ""
        }

        <!-- Footer -->
        <div class="footer">
            <p><strong>Confidential Medical Report - For Personal Use Only</strong></p>
            <p>This report is generated based on the information provided and should not replace professional medical consultation.</p>
            <p>Always consult with qualified healthcare providers for medical concerns.</p>
            <p>Generated by Health Assessment System | ${new Date().getFullYear()}</p>
        </div>
    </div>
</body>
</html>
  `;
}

// Build HTML for Lung Health Assessment with table structure
function buildLungHealthHtml(assessment, logoDataUri) {
  const {
    health_score,
    calculated_age,
    risk_level,
    ai_analysis,
    recommendations,
    created_at,
  } = assessment;

  const inputs = assessment.lung_health_inputs[0] || {};

  const formattedDate = new Date(created_at).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Format values for display
  const formatValue = (value) => {
    if (value === null || value === undefined || value === "")
      return "Not Provided";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "number") {
      if (value % 1 === 0) return value.toString();
      return value.toFixed(2);
    }
    return value;
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lung Health Assessment Report</title>
    <style>
       @page { size: A4; margin: 0; }
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
        }
        .container {
            max-width: 1000px;
            margin: 0 auto;
        }
        .header {
            text-align: left;
            border-bottom: 3px solid #17a2b8;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #17a2b8;
            margin: 0;
            font-size: 28px;
        }
        .header .subtitle {
            color: #666;
            font-size: 16px;
            margin: 5px 0;
        }
        .summary-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            background: #f8f9fa;
        }
        .summary-table th {
            background: #17a2b8;
            color: white;
            padding: 15px;
            text-align: left;
            font-size: 16px;
        }
        .summary-table td {
            padding: 12px 15px;
            border-bottom: 1px solid #ddd;
        }
        .summary-table .score {
            font-size: 24px;
            font-weight: bold;
            color: #17a2b8;
        }
        .section {
            margin-bottom: 30px;
        }
        .section-title {
            background: #2c3e50;
            color: white;
            padding: 12px 15px;
            font-size: 18px;
            margin-bottom: 15px;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .data-table th {
            background: #34495e;
            color: white;
            padding: 12px 15px;
            text-align: left;
            font-weight: bold;
            border: 1px solid #ddd;
        }
        .data-table td {
            padding: 10px 15px;
            border: 1px solid #ddd;
        }
        .data-table tr:nth-child(even) {
            background: #f8f9fa;
        }
        .risk-indicator {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            font-weight: bold;
            color: white;
        }
        .risk-low { background: #28a745; }
        .risk-moderate { background: #ffc107; color: #000; }
        .risk-high { background: #fd7e14; }
        .risk-critical { background: #dc3545; }
        .recommendation-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        .recommendation-table th {
            background: #6f42c1;
            color: white;
            padding: 10px;
            text-align: left;
        }
        .recommendation-table td {
            padding: 10px;
            border: 1px solid #ddd;
            vertical-align: top;
        }
        .priority-high { border-left: 4px solid #dc3545; background: #f8d7da; }
        .priority-medium { border-left: 4px solid #ffc107; background: #fff3cd; }
        .priority-low { border-left: 4px solid #28a745; background: #d4edda; }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #ddd;
            color: #666;
            font-size: 12px;
        }
        .analysis-section {
            background: #e8f4f8;
            padding: 15px;
            margin-bottom: 20px;
            border-left: 4px solid #17a2b8;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header" style="border-bottom: 3px solid #17a2b8; padding-bottom: 15px; margin-bottom: 30px;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; table-layout: fixed;">
                <tr>
                    <td style="width: 25%; text-align: left; vertical-align: middle;">
                        <img src="${logoDataUri}" alt="Mediconnect.fit Logo" style="height: 60px; width: auto; vertical-align: middle;" />
                    </td>
                    <td style="width: 50%; text-align: center; vertical-align: middle;">
                        <span style="font-size: 32px; font-weight: bold; color: #0067A1; font-family: Arial, sans-serif; letter-spacing: 0.5px;">Mediconnect.fit</span>
                    </td>
                    <td style="width: 25%; text-align: right; vertical-align: middle; color: #666; font-size: 13px; line-height: 1.4;">
                        <strong>Generated on:</strong><br/>${formattedDate}
                    </td>
                </tr>
            </table>
            <h1 style="color: #17a2b8; margin: 0; font-size: 26px; text-align: left;">LUNG HEALTH ASSESSMENT REPORT</h1>
            <div class="subtitle" style="color: #666; font-size: 15px; margin-top: 5px; text-align: left;">Comprehensive Respiratory Health Analysis</div>
        </div>

        <!-- Summary Table -->
        <table class="summary-table">
            <tr>
                <th colspan="4">ASSESSMENT SUMMARY</th>
            </tr>
            <tr>
                <td><strong>Health Score</strong></td>
                <td class="score">${health_score}/100</td>
                <td><strong>Lung Age</strong></td>
                <td>${calculated_age} years</td>
            </tr>
            <tr>
                <td><strong>Risk Level</strong></td>
                <td>
                    <span class="risk-indicator risk-${risk_level}">
                        ${risk_level.toUpperCase()}
                    </span>
                </td>
                <td><strong>Assessment Type</strong></td>
                <td>Lung Health Screening</td>
            </tr>
        </table>

        <!-- Personal Information -->
        <div class="section">
            <div class="section-title">PERSONAL INFORMATION</div>
            <table class="data-table">
                <tr>
                    <th style="width: 25%;">Parameter</th>
                    <th style="width: 25%;">Value</th>
                    <th style="width: 25%;">Parameter</th>
                    <th style="width: 25%;">Value</th>
                </tr>
                <tr>
                    <td><strong>Age</strong></td>
                    <td>${formatValue(inputs.age)} years</td>
                    <td><strong>Gender</strong></td>
                    <td>${formatValue(inputs.gender)}</td>
                </tr>
                <tr>
                    <td><strong>Height</strong></td>
                    <td>${formatValue(inputs.height_cm)} cm</td>
                    <td><strong>Weight</strong></td>
                    <td>${formatValue(inputs.weight_kg)} kg</td>
                </tr>
                <tr>
                    <td><strong>BMI</strong></td>
                    <td>${
                      inputs.weight_kg && inputs.height_cm
                        ? formatValue(
                            inputs.weight_kg / (inputs.height_cm / 100) ** 2
                          )
                        : "N/A"
                    }</td>
                    <td><strong>Location</strong></td>
                    <td>${formatValue(inputs.location)}</td>
                </tr>
            </table>
        </div>

        <!-- Smoking & Exposure -->
        <div class="section">
            <div class="section-title">SMOKING HISTORY & EXPOSURE</div>
            <table class="data-table">
                <tr>
                    <th style="width: 25%;">Parameter</th>
                    <th style="width: 25%;">Value</th>
                    <th style="width: 25%;">Parameter</th>
                    <th style="width: 25%;">Value</th>
                </tr>
                <tr>
                    <td><strong>Smoking Status</strong></td>
                    <td>${formatValue(inputs.smoking_status)}</td>
                    <td><strong>Smoking Pack Years</strong></td>
                    <td>${formatValue(inputs.smoking_pack_years)}</td>
                </tr>
                <tr>
                    <td><strong>Pollution Exposure</strong></td>
                    <td>${formatValue(inputs.pollution_exposure)}</td>
                    <td><strong>Occupational Risk</strong></td>
                    <td>${formatValue(inputs.occupational_risk)}</td>
                </tr>
            </table>
        </div>

        <!-- Lung Function Tests -->
        <div class="section">
            <div class="section-title">LUNG FUNCTION TESTS</div>
            <table class="data-table">
                <tr>
                    <th style="width: 25%;">Parameter</th>
                    <th style="width: 25%;">Value</th>
                    <th style="width: 25%;">Parameter</th>
                    <th style="width: 25%;">Value</th>
                </tr>
                <tr>
                    <td><strong>Breath Holding Time</strong></td>
                    <td>${formatValue(inputs.breath_holding_time)} seconds</td>
                    <td><strong>Breaths Per Minute</strong></td>
                    <td>${formatValue(
                      inputs.breaths_per_minute
                    )} breaths/min</td>
                </tr>
                <tr>
                    <td><strong>Peak Flow</strong></td>
                    <td>${formatValue(inputs.peak_flow)} L/min</td>
                    <td><strong>Air Quality Index</strong></td>
                    <td>${formatValue(inputs.aqi)}</td>
                </tr>
            </table>
        </div>

        <!-- Symptoms -->
        <div class="section">
            <div class="section-title">SYMPTOMS ASSESSMENT</div>
            <table class="data-table">
                <tr>
                    <th style="width: 25%;">Parameter</th>
                    <th style="width: 25%;">Value</th>
                    <th style="width: 25%;">Parameter</th>
                    <th style="width: 25%;">Value</th>
                </tr>
                <tr>
                    <td><strong>Cough Frequency</strong></td>
                    <td>${formatValue(inputs.cough_frequency)}</td>
                    <td><strong>Breathlessness</strong></td>
                    <td>${formatValue(inputs.breathlessness)}</td>
                </tr>
                <tr>
                    <td><strong>Wheezing</strong></td>
                    <td>${formatValue(inputs.wheezing)}</td>
                    <td></td>
                    <td></td>
                </tr>
            </table>
        </div>

        <!-- Assistive Analysis -->
        ${
          ai_analysis
            ? `
        <div class="section">
            <div class="section-title">MEDICAL ANALYSIS</div>
            <div class="analysis-section">
                <p><strong>Overall Assessment:</strong> ${
                  ai_analysis.analysis ||
                  "Comprehensive lung health assessment completed."
                }</p>
                
                ${
                  ai_analysis.key_findings &&
                  ai_analysis.key_findings.length > 0
                    ? `
                <p><strong>Key Findings:</strong></p>
                <ul>
                    ${ai_analysis.key_findings
                      .map((finding) => `<li>${finding}</li>`)
                      .join("")}
                </ul>
                `
                    : ""
                }
                
                ${
                  ai_analysis.positive_aspects &&
                  ai_analysis.positive_aspects.length > 0
                    ? `
                <p><strong>Positive Aspects:</strong></p>
                <ul>
                    ${ai_analysis.positive_aspects
                      .map((aspect) => `<li>${aspect}</li>`)
                      .join("")}
                </ul>
                `
                    : ""
                }
                
                ${
                  ai_analysis.improvement_areas &&
                  ai_analysis.improvement_areas.length > 0
                    ? `
                <p><strong>Areas for Improvement:</strong></p>
                <ul>
                    ${ai_analysis.improvement_areas
                      .map((area) => `<li>${area}</li>`)
                      .join("")}
                </ul>
                `
                    : ""
                }
            </div>
        </div>
        `
            : ""
        }

        <!-- Recommendations -->
        ${
          recommendations && recommendations.length > 0
            ? `
        <div class="section">
            <div class="section-title">HEALTH RECOMMENDATIONS</div>
            ${recommendations
              .map(
                (rec) => `
                <table class="recommendation-table priority-${
                  rec.priority || "medium"
                }">
                    <tr>
                        <th style="width: 20%;">Title</th>
                        <td style="width: 80%;"><strong>${
                          rec.title || "Lung Health Recommendation"
                        }</strong></td>
                    </tr>
                    <tr>
                        <th>Category</th>
                        <td>${rec.category || "General"}</td>
                    </tr>
                    <tr>
                        <th>Priority</th>
                        <td>${rec.priority || "Medium"}</td>
                    </tr>
                    <tr>
                        <th>Timeframe</th>
                        <td>${rec.timeframe || "Ongoing"}</td>
                    </tr>
                    <tr>
                        <th>Description</th>
                        <td>${
                          rec.description ||
                          "Follow these action steps to improve your lung health."
                        }</td>
                    </tr>
                    ${
                      rec.action_steps && rec.action_steps.length > 0
                        ? `
                    <tr>
                        <th>Action Steps</th>
                        <td>
                            <ol>
                                ${rec.action_steps
                                  .map((step) => `<li>${step}</li>`)
                                  .join("")}
                            </ol>
                        </td>
                    </tr>
                    `
                        : ""
                    }
                    ${
                      rec.indian_context
                        ? `
                    <tr>
                        <th>Context</th>
                        <td>🇮🇳 Specifically tailored for Indian context</td>
                    </tr>
                    `
                        : ""
                    }
                </table>
            `
              )
              .join("")}
        </div>
        `
            : ""
        }

        <!-- Footer -->
        <div class="footer">
            <p><strong>Confidential Medical Report - For Personal Use Only</strong></p>
            <p>This report is generated based on the information provided and should not replace professional medical consultation.</p>
            <p>Always consult with qualified healthcare providers for medical concerns.</p>
            <p>Generated by Health Assessment System | ${new Date().getFullYear()}</p>
        </div>
    </div>
</body>
</html>
  `;
}

// GET endpoint for information
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const assessmentId = searchParams.get("id") || searchParams.get("assessment_id");
    const userId = searchParams.get("user_id");

    if (!assessmentId && !userId) {
      return failure("Assessment ID or User ID is required", "validation_error", 400, {
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
      `
      );

    if (assessmentId) {
      query = query.eq("id", assessmentId);
    } else if (userId) {
      query = query.eq("user_id", userId).order("created_at", { ascending: false });
    }

    const { data: assessments, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    const targetAssessment = Array.isArray(assessments) ? assessments[0] : assessments;

    if (!targetAssessment) {
      return failure("Health assessment record not found", "not_found", 404, {
        headers: corsHeaders,
      });
    }

    // Read local real-logo.png and convert to base64 Data URI
    let logoDataUri = "https://mediconnect.fit/real-logo.png";
    try {
      const fs = require("fs");
      const path = require("path");
      const logoPath = path.join(process.cwd(), "public", "real-logo.png");
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        logoDataUri = `data:image/png;base64,${logoBuffer.toString("base64")}`;
      }
    } catch (err) {
      console.error("Failed to load local logo for PDF:", err);
    }

    // Generate HTML based on assessment type
    let html;
    if (targetAssessment.assessment_type === "heart") {
      html = buildHeartHealthHtml(targetAssessment, logoDataUri);
    } else if (targetAssessment.assessment_type === "lung") {
      html = buildLungHealthHtml(targetAssessment, logoDataUri);
    } else {
      return failure("Invalid assessment type", "validation_error", 400, {
        headers: corsHeaders,
      });
    }

    // Generate PDF using external API
    const pdfResponse = await fetch(
      "https://argosmob.uk/dhillon/public/api/v1/pdf/generate-pdf",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ html }),
      }
    );

    if (!pdfResponse.ok) {
      const errText = await pdfResponse.text();
      throw new Error(`PDF service error: ${pdfResponse.status} — ${errText}`);
    }

    const pdfJson = await pdfResponse.json();

    if (searchParams.get("redirect") === "true" && pdfJson.url) {
      return NextResponse.redirect(pdfJson.url);
    }

    return success(
      "PDF generated successfully",
      {
        url: pdfJson.url || "",
        assessment_id: targetAssessment.id,
        assessment_type: targetAssessment.assessment_type,
        success: true,
        message: `${targetAssessment.assessment_type} health PDF generated successfully.`,
      },
      200,
      {
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error("GET PDF Error:", error);
    return failure(
      "Failed to process PDF request. " + error.message,
      "pdf_request_failed",
      500,
      {
        headers: corsHeaders,
      }
    );
  }
}
