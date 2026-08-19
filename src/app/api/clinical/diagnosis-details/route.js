import sql from "@/lib/db";
import { supabase } from "@/lib/supabaseAdmin";
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

    let specialtyResult = [];
    let telemedicineResult = [];
    let medicinesResult = [];
    let templateResult = [];

    try {
      // Execute queries concurrently for maximum performance
      const [
        sRes,
        tRes,
        mRes,
        tmpRes
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

      specialtyResult = sRes;
      telemedicineResult = tRes;
      medicinesResult = mRes;
      templateResult = tmpRes;
    } catch (sqlErr) {
      console.warn("SQL diagnosis-details fallback to Supabase client:", sqlErr.message);

      const [sRes, tRes, mRes, tmpRes] = await Promise.all([
        supabase.from("cr_diagnosis_specialty_map").select("primary_specialty, secondary_specialty").eq("diagnosis_id", diagnosis_id).eq("active_status", "true").limit(1),
        supabase.from("cr_telemedicine_eligibility_rules").select("telemedicine_allowed, video_required, physical_exam_required, emergency_referral_required, home_visit_recommended, hospital_referral_required, rule_reason").eq("diagnosis_id", diagnosis_id).eq("active_status", "true").limit(1),
        supabase.from("cr_medicine_diagnosis_map").select("medicine_id, therapy_role, cr_medicine_master(medicine_id, generic_name, strength, dosage_form, route, schedule)").eq("diagnosis_id", diagnosis_id).eq("active_status", "true"),
        supabase.from("cr_diagnosis_template_repository").select("followup_days, doctor_advice_template, patient_advice_template, recommended_test_group, escalation_required, severity_level").eq("diagnosis_id", diagnosis_id).eq("active_status", "true").limit(1),
      ]);

      specialtyResult = sRes.data || [];
      telemedicineResult = tRes.data || [];
      medicinesResult = (mRes.data || []).map(row => ({
        medicine_id: row.medicine_id,
        generic_name: row.cr_medicine_master?.generic_name || row.medicine_id,
        strength: row.cr_medicine_master?.strength || "",
        dosage_form: row.cr_medicine_master?.dosage_form || "",
        route: row.cr_medicine_master?.route || "",
        schedule: row.cr_medicine_master?.schedule || "",
        therapy_role: row.therapy_role || "",
      }));
      templateResult = tmpRes.data || [];
    }

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
