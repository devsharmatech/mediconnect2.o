import sql from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const diagnosis_id = searchParams.get("diagnosis_id");

    if (!diagnosis_id) {
      return NextResponse.json(
        { success: false, error: "Missing 'diagnosis_id' parameter." },
        { status: 400 }
      );
    }

    // Execute queries concurrently for maximum performance
    const [
      specialtyResult,
      telemedicineResult,
      medicinesResult,
      templateResult
    ] = await Promise.all([
      // 1. Diagnosis Specialty Map
      sql`
        SELECT primary_specialty, secondary_specialty 
        FROM cr_diagnosis_specialty_map 
        WHERE diagnosis_id = ${diagnosis_id} AND active_status = 'true'
        LIMIT 1
      `,
      
      // 2. Telemedicine Eligibility Rules
      sql`
        SELECT telemedicine_allowed, video_required, physical_exam_required, 
               emergency_referral_required, home_visit_recommended, 
               hospital_referral_required, rule_reason
        FROM cr_telemedicine_eligibility_rules 
        WHERE diagnosis_id = ${diagnosis_id} AND active_status = 'true'
        LIMIT 1
      `,

      // 3. Medicine Recommendations
      sql`
        SELECT 
          mm.medicine_id,
          mm.generic_name,
          mm.strength,
          mm.dosage_form,
          mm.route,
          mm.schedule,
          mdm.therapy_role
        FROM cr_medicine_diagnosis_map mdm
        JOIN cr_medicine_master mm ON mdm.medicine_id = mm.medicine_id
        WHERE mdm.diagnosis_id = ${diagnosis_id} 
          AND mdm.active_status = 'true' 
          AND mm.active_status = 'true'
      `,

      // 4. Clinical Template (Advice, Follow-up, Tests)
      sql`
        SELECT 
          followup_days, 
          doctor_advice_template, 
          patient_advice_template, 
          recommended_test_group,
          escalation_required,
          severity_level
        FROM cr_diagnosis_template_repository 
        WHERE diagnosis_id = ${diagnosis_id} AND active_status = 'true'
        LIMIT 1
      `
    ]);

    // Construct the unified response payload
    const payload = {
      diagnosis_id,
      routing: specialtyResult.length > 0 ? specialtyResult[0] : null,
      telemedicine_rules: telemedicineResult.length > 0 ? telemedicineResult[0] : null,
      recommended_medicines: medicinesResult,
      clinical_template: templateResult.length > 0 ? templateResult[0] : null,
    };

    return NextResponse.json({
      success: true,
      data: payload
    });

  } catch (error) {
    console.error("Error in diagnosis-details API:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
