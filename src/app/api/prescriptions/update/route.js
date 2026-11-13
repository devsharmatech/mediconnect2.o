import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { logAudit } from "@/lib/layer1/auditLogger";
import { logActivity } from "@/lib/layer1/activityLogger";
import { postAppointmentCompletionLedger } from "@/lib/doctorFinancialEngine";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      prescription_id, // REQUIRED

      doctor_id,
      patient_id,
      appointment_id,

      appointment_type = "clinic_visit",
      specialization = "general_medicine",

      diagnosis = {},
      medicines = [],
      lab_tests = [],
      investigations = {},
      vital_signs = {},
      examination_findings = {},
      follow_up = {},
      special_instructions = {},
      template_data = {},
      ai_analysis = {},

      special_message = "",
      action = "save" // save | sign
    } = body;

    /* ---------------------------------
       BASIC VALIDATION
    ---------------------------------- */
    if (!prescription_id || !doctor_id || !patient_id) {
      return failure(
        "prescription_id, doctor_id and patient_id are required",
        null,
        400,
        { headers: corsHeaders }
      );
    }

    if (!["save", "sign"].includes(action)) {
      return failure("Invalid action", null, 422, {
        headers: corsHeaders
      });
    }

    /* ---------------------------------
       FETCH PRESCRIPTION FROM RDS
    ---------------------------------- */
    const rdsRows = await sql`
      SELECT * FROM prescriptions
      WHERE id = ${prescription_id}
      LIMIT 1
    `;

    if (!rdsRows || rdsRows.length === 0) {
      return failure("Prescription not found", null, 404, {
        headers: corsHeaders
      });
    }

    const prescription = rdsRows[0];

    /* ---------------------------------
       OWNERSHIP VALIDATION
    ---------------------------------- */
    if (prescription.doctor_id !== doctor_id) {
      return failure("Unauthorized doctor", null, 403, {
        headers: corsHeaders
      });
    }

    if (prescription.patient_id !== patient_id) {
      return failure("Patient mismatch", null, 403, {
        headers: corsHeaders
      });
    }

    /* ---------------------------------
       PREVENT UPDATE AFTER SIGN
       Once signed, a clinical prescription is immutable.
    ---------------------------------- */
    const isAlreadySigned = Boolean(
      prescription.signed_at ||
      prescription.completed_at ||
      prescription.status === "completed" ||
      prescription.status === "signed" ||
      prescription.is_draft === false
    );

    if (isAlreadySigned) {
      return failure(
        "This prescription has already been signed and finalized. Signed clinical records cannot be modified.",
        null,
        409,
        { headers: corsHeaders }
      );
    }

    /* ---------------------------------
       SIGN VALIDATION
    ---------------------------------- */
    if (action === "sign") {
      if (!Array.isArray(medicines) || medicines.length === 0) {
        return failure("Medicines required to sign", null, 422, {
          headers: corsHeaders
        });
      }

      if (!diagnosis || (typeof diagnosis === "object" && Object.keys(diagnosis).length === 0 && !diagnosis.primary)) {
        return failure("Diagnosis required to sign", null, 422, {
          headers: corsHeaders
        });
      }
    }

    /* ---------------------------------
       PREPARE UPDATE DATA
    ---------------------------------- */
    const now = new Date().toISOString();

    let normalizedLabTests = lab_tests !== undefined ? lab_tests : prescription.lab_tests;
    if (Array.isArray(normalizedLabTests)) {
      normalizedLabTests = normalizedLabTests.map((item) => {
        if (typeof item === "string") {
          return { test_name: item.trim(), instructions: "" };
        }
        if (item && typeof item === "object") {
          return {
            test_name: (item.test_name || item.name || "").trim(),
            instructions: (item.instructions || "").trim(),
            urgency: (item.urgency || "").trim() || undefined,
          };
        }
        return null;
      }).filter(Boolean);
    }

    let normalizedAptType = "clinic_visit";
    if (appointment_type) {
      const lower = String(appointment_type).toLowerCase().trim();
      if (lower.includes("video")) normalizedAptType = "video_call";
      else if (lower.includes("home")) normalizedAptType = "home_visit";
      else normalizedAptType = "clinic_visit";
    }

    const isDraft = action === "save";
    const rxStatus = action === "sign" ? "completed" : prescription.status;
    const signedBy = action === "sign" ? doctor_id : (prescription.signed_by || null);
    const signedAt = action === "sign" ? now : (prescription.signed_at || null);
    const completedAt = action === "sign" ? now : (prescription.completed_at || null);

    /* ---------------------------------
       UPDATE PRESCRIPTION IN RDS
    ---------------------------------- */
    const updatedRows = await sql`
      UPDATE prescriptions
      SET 
        appointment_type = ${normalizedAptType},
        specialization = ${specialization || prescription.specialization || "general_medicine"},
        diagnosis = ${sql.json(typeof diagnosis === "object" ? diagnosis : { primary: diagnosis })},
        medicines = ${sql.json(medicines || [])},
        lab_tests = ${sql.json(normalizedLabTests || [])},
        investigations = ${sql.json(investigations || {})},
        vital_signs = ${sql.json(vital_signs || {})},
        examination_findings = ${sql.json(examination_findings || {})},
        follow_up = ${sql.json(follow_up || {})},
        special_instructions = ${sql.json(special_instructions || {})},
        template_data = ${sql.json(template_data || {})},
        ai_analysis = ${sql.json(ai_analysis || {})},
        special_message = ${special_message || ""},
        is_draft = ${isDraft},
        status = ${rxStatus},
        signed_by = ${signedBy},
        signed_at = ${signedAt},
        completed_at = ${completedAt},
        updated_at = ${now}
      WHERE id = ${prescription_id}
      RETURNING *
    `;

    const updatedPrescription = updatedRows[0];
    if (!updatedPrescription) {
      throw new Error("Failed to update prescription in RDS PostgreSQL.");
    }

    /* ---------------------------------
       UPDATE APPOINTMENT IF SIGNED
    ---------------------------------- */
    if (action === "sign" && (appointment_id || prescription.appointment_id)) {
      const targetApptId = appointment_id || prescription.appointment_id;
      try {
        await sql`
          UPDATE appointments
          SET status = 'completed', completed_at = ${now}, updated_at = ${now}
          WHERE id = ${targetApptId}
        `;
        // Post immutable financial ledger entries for Doctor Financial Engine
        await postAppointmentCompletionLedger(targetApptId);
      } catch (sqlErr) {
        console.warn("[Prescription Update] RDS appointment update warning:", sqlErr.message);
      }
    }

    /* ---------------------------------
       AUDIT AND ACTIVITY LOGGING (fire-and-forget)
    ---------------------------------- */
    const changeDesc = action === "sign" 
      ? "Prescription signed and completed" 
      : "Prescription updated as draft";

    logAudit({
      entity_type: "prescription",
      entity_id: prescription_id,
      previous_state: prescription,
      new_state: updatedPrescription,
      change_description: changeDesc,
      changed_by: doctor_id,
    }).catch(() => {});

    logActivity({
      patient_id: patient_id,
      actor_id: doctor_id,
      module_type: "prescription",
      action_type: action === "sign" ? "signed" : "updated",
      reference_id: prescription_id,
      description: changeDesc,
    }).catch(() => {});

    return success(
      action === "sign"
        ? "Prescription updated and signed successfully"
        : "Prescription updated successfully",
      { prescription: updatedPrescription },
      200,
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("Update prescription error:", err);
    return failure(
      "Failed to update prescription",
      err.message,
      500,
      { headers: corsHeaders }
    );
  }
}
