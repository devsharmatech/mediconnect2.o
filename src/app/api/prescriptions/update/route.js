import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { syncClinicalData } from "@/lib/layer1/consultationSync";
import { logAudit } from "@/lib/layer1/auditLogger";
import { logActivity } from "@/lib/layer1/activityLogger";
import crypto from "crypto";
import sql from "@/lib/db";
import { postAppointmentCompletionLedger } from "@/lib/doctorFinancialEngine";

// Helper: treat zero-UUID as missing
const isValidUUID = (id) => id && id !== '00000000-0000-0000-0000-000000000000';

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
       FETCH PRESCRIPTION (RDS + Fallback)
    ---------------------------------- */
    let prescription = null;
    try {
      const rdsRows = await sql`
        SELECT * FROM prescriptions
        WHERE id = ${prescription_id}
        LIMIT 1
      `;
      if (rdsRows.length > 0) {
        prescription = rdsRows[0];
      }
    } catch (rdsErr) {
      console.warn("[Prescription Update] RDS fetch error:", rdsErr.message);
    }

    if (!prescription) {
      const { data } = await supabase
        .from("prescriptions")
        .select("*")
        .eq("id", prescription_id)
        .maybeSingle();
      prescription = data;
    }

    if (!prescription) {
      return failure("Prescription not found", null, 404, {
        headers: corsHeaders
      });
    }

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
       Once signed, a clinical prescription is legally immutable.
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
       VALIDATE DOCTOR
    ---------------------------------- */
    const { data: doctor } = await supabase
      .from("doctor_details")
      .select("id, onboarding_status")
      .eq("id", doctor_id)
      .maybeSingle();

    if (!doctor || ["pending", "rejected"].includes(doctor.onboarding_status)) {
      return failure("Doctor account inactive", null, 403, {
        headers: corsHeaders
      });
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

      if (!diagnosis || Object.keys(diagnosis).length === 0) {
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

    const updateData = {
      appointment_type,
      specialization,

      diagnosis,
      medicines,
      lab_tests: normalizedLabTests,
      investigations,
      vital_signs,
      examination_findings,
      follow_up,
      special_instructions,
      template_data,
      ai_analysis,

      special_message,

      is_draft: action === "save",
      status: action === "sign" ? "completed" : prescription.status,
      updated_at: now
    };

    if (action === "sign") {
      updateData.signed_by = doctor_id;
      updateData.signed_at = now;
      updateData.completed_at = now;
    }

    /* ---------------------------------
       UPDATE PRESCRIPTION
    ---------------------------------- */
    const { data: updatedPrescription, error } = await supabase
      .from("prescriptions")
      .update(updateData)
      .eq("id", prescription_id)
      .select("*")
      .single();

    if (error) throw error;

    // Direct AWS RDS PostgreSQL update
    try {
      await sql`
        UPDATE prescriptions
        SET 
          appointment_type = ${appointment_type},
          specialization = ${specialization},
          diagnosis = ${JSON.stringify(diagnosis)},
          medicines = ${JSON.stringify(medicines)},
          lab_tests = ${JSON.stringify(normalizedLabTests)},
          investigations = ${JSON.stringify(investigations)},
          vital_signs = ${JSON.stringify(vital_signs)},
          examination_findings = ${JSON.stringify(examination_findings)},
          follow_up = ${JSON.stringify(follow_up)},
          special_instructions = ${JSON.stringify(special_instructions)},
          template_data = ${JSON.stringify(template_data)},
          ai_analysis = ${JSON.stringify(ai_analysis)},
          special_message = ${special_message},
          is_draft = ${action === "save"},
          status = ${action === "sign" ? "completed" : prescription.status},
          signed_by = ${action === "sign" ? doctor_id : (prescription.signed_by || null)},
          signed_at = ${action === "sign" ? now : (prescription.signed_at || null)},
          completed_at = ${action === "sign" ? now : (prescription.completed_at || null)},
          updated_at = ${now}
        WHERE id = ${prescription_id}
      `;
    } catch (sqlErr) {
      console.warn("[Prescription Update] RDS direct prescription update warning:", sqlErr.message);
    }

    // Sync structured tables (consultation_medications, consultation_symptoms)
    if (updatedPrescription) {
      const apptId = appointment_id || updatedPrescription.appointment_id;
      if (apptId) {
        // Resolve the actual consultation_id linked to this appointment to avoid FK errors
        const { data: linkedConsult } = await supabase
          .from("consultations")
          .select("id")
          .eq("appointment_id", apptId)
          .maybeSingle();

        if (linkedConsult?.id) {
          await syncClinicalData(
            linkedConsult.id,
            medicines || null,
            body.symptoms || null
          ).catch(err => console.error("[Sync Prescription Update Error]:", err.message));
        } else {
          console.warn("[Sync] Skipped syncClinicalData because no consultation found for appointment_id:", apptId);
        }
      }
    }

    /* ---------------------------------
       UPDATE APPOINTMENT (IF SIGNED)
    ---------------------------------- */
    let effectiveCareEpisodeId = null;

    if (action === "sign" && appointment_id) {
      await supabase
        .from("appointments")
        .update({
          status: "completed",
          completed_at: now,
          updated_at: now
        })
        .eq("id", appointment_id);

      try {
        await sql`
          UPDATE appointments
          SET status = 'completed', completed_at = ${now}, updated_at = ${now}
          WHERE id = ${appointment_id}
        `;
        // Post immutable financial ledger entries for Doctor Financial Engine
        await postAppointmentCompletionLedger(appointment_id);
      } catch (sqlErr) {
        console.warn("[Prescription Update] RDS direct appointment update warning:", sqlErr.message);
      }

      await supabase
        .from("consultations")
        .update({
          case_status: "COMPLETED",
          completed_at: now,
          updated_at: now
        })
        .eq("appointment_id", appointment_id);

      // Create Legal Snapshot
      const snapshotPayload = { prescription: updatedPrescription };
      const snapshotHash = crypto.createHash('sha256').update(JSON.stringify(snapshotPayload)).digest('hex');
      
      const { data: appointment } = await supabase.from("appointments").select("care_episode_id").eq("id", appointment_id).maybeSingle();
      const rawCareEpId = appointment?.care_episode_id;
      effectiveCareEpisodeId = isValidUUID(rawCareEpId) ? rawCareEpId : null;

      const { data: snapshot, error: snapshotErr } = await supabase.from("prescription_snapshot").insert([{
          consultation_id: appointment_id,
          care_episode_id: effectiveCareEpisodeId,
          snapshot_hash: snapshotHash,
          snapshot_payload: snapshotPayload
      }]).select().single();
      
      if (snapshotErr) {
          console.error("[Snapshot] prescription_snapshot insert error:", snapshotErr.message);
      }

      if (snapshot) {
          const { error: indexErr } = await supabase.from("legal_snapshot_index").insert([{
              consultation_id: appointment_id,
              care_episode_id: effectiveCareEpisodeId,
              prescription_snapshot_id: snapshot.id,
          }]);
          if (indexErr) {
              console.error("[Snapshot] legal_snapshot_index insert error:", indexErr.message);
          }
      }

      // ✅ Create Validation Log on successful sign
      await supabase.from("prescription_validation_log").insert([{
          consultation_id: appointment_id,
          doctor_id: doctor_id,
          consultation_mode: appointment_type,
          validation_status: "PASSED",
          violations: []
      }]);
    }

    /* ---------------------------------
       AUDIT AND ACTIVITY LOGGING
    ---------------------------------- */
    const changeDesc = action === "sign" 
      ? "Prescription signed and completed" 
      : "Prescription updated as draft";

    await logAudit({
      entity_type: "prescription",
      entity_id: prescription_id,
      previous_state: prescription,
      new_state: updatedPrescription,
      change_description: changeDesc,
      changed_by: doctor_id,
    });

    await logActivity({
      patient_id: patient_id,
      care_episode_id: effectiveCareEpisodeId,
      actor_id: doctor_id,
      module_type: "prescription",
      action_type: action === "sign" ? "signed" : "updated",
      reference_id: prescription_id,
      description: changeDesc,
    });

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
