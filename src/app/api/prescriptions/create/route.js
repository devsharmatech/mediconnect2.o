import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { logActivity } from "@/lib/layer1/activityLogger";
import { logAudit } from "@/lib/layer1/auditLogger";
import { syncClinicalData } from "@/lib/layer1/consultationSync";
import crypto from "crypto";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const body = await req.json();

    const {
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

    /* -------------------------------------------------
       BASIC VALIDATION
    -------------------------------------------------- */
    if (!doctor_id || !patient_id) {
      return failure("doctor_id and patient_id are required", null, 400, {
        headers: corsHeaders
      });
    }

    const allowedAppointmentTypes = [
      "video_call",
      "video_consultation",
      "video",
      "home_visit",
      "clinic_visit"
    ];

    if (!allowedAppointmentTypes.includes(appointment_type)) {
      return failure("Invalid appointment_type", null, 422, {
        headers: corsHeaders
      });
    }

    if (!["save", "sign"].includes(action)) {
      return failure("Invalid action", null, 422, {
        headers: corsHeaders
      });
    }

    /* -------------------------------------------------
       VALIDATE DOCTOR
    -------------------------------------------------- */
    /* -------------------------------------------------
       VALIDATE DOCTOR & ONBOARDING GATE
    -------------------------------------------------- */
    const { data: doctor } = await supabase
      .from("doctor_details")
      .select("id, onboarding_status")
      .eq("id", doctor_id)
      .maybeSingle();

    if (!doctor) {
      return failure("Invalid doctor_id", null, 404, {
        headers: corsHeaders
      });
    }

    const { data: onboarding } = await supabase
      .from("doctor_onboarding_status")
      .select("allowed_to_consult, registration_verified, agreement_accepted, otp_verified")
      .eq("doctor_id", doctor_id)
      .maybeSingle();

    // Enforce access control rules based on main doctor profile
    const isApproved = doctor.onboarding_status && ["approved", "active"].includes(doctor.onboarding_status.toLowerCase());
    if (!isApproved) {
      return failure(
        "Consultation access blocked. Doctor account is inactive or pending verification.",
        null,
        403,
        { headers: corsHeaders }
      );
    }

    // Only block if explicitly revoked by admin via status flag
    if (doctor.onboarding_status === "revoked" || doctor.onboarding_status === "suspended") {
      return failure(
        "Consultation access explicitly revoked by admin.",
        null,
        403,
        { headers: corsHeaders }
      );
    }


    /* -------------------------------------------------
       VALIDATE PATIENT
    -------------------------------------------------- */
    const { data: patient } = await supabase
      .from("patient_details")
      .select("id")
      .eq("id", patient_id)
      .maybeSingle();

    if (!patient) {
      return failure("Invalid patient_id", null, 404, {
        headers: corsHeaders
      });
    }

    /* -------------------------------------------------
       VALIDATE APPOINTMENT (OPTIONAL)
    -------------------------------------------------- */
    let appointment = null;

    if (appointment_id) {
      const { data } = await supabase
        .from("appointments")
        .select(`
          id,
          doctor_id,
          patient_id,
          status,
          appointment_type
        `)
        .eq("id", appointment_id)
        .maybeSingle();

      if (!data) {
        return failure("Invalid appointment_id", null, 404, {
          headers: corsHeaders
        });
      }

      if (data.doctor_id !== doctor_id) {
        return failure("Appointment does not belong to this doctor", null, 403, {
          headers: corsHeaders
        });
      }

      if (data.patient_id !== patient_id) {
        return failure("Appointment does not belong to this patient", null, 403, {
          headers: corsHeaders
        });
      }

      if (data.prescription_id) {
        return failure("Prescription already exists for this appointment", null, 409, {
          headers: corsHeaders
        });
      }

      // if (
      //   data.appointment_type &&
      //   data.appointment_type !== appointment_type
      // ) {
      //   return failure(
      //     "appointment_type does not match appointment",
      //     null,
      //     422,
      //     { headers: corsHeaders }
      //   );
      // }

      appointment = data;
    }

    /* -------------------------------------------------
       STRICT DUPLICATE CHECK (USER-FRIENDLY)
    -------------------------------------------------- */
    if (appointment_id) {
      const { data: existing } = await supabase
        .from("prescriptions")
        .select("id")
        .eq("appointment_id", appointment_id)
        .limit(1)
        .maybeSingle();

      if (existing) {
        return failure(
          "Prescription already exists for this appointment",
          null,
          409,
          { headers: corsHeaders }
        );
      }
    }

    /* -------------------------------------------------
       SIGN VALIDATION
    -------------------------------------------------- */
    if (action === "sign") {
      if (!Array.isArray(medicines) || medicines.length === 0) {
        return failure(
          "Medicines are required to sign prescription",
          null,
          422,
          { headers: corsHeaders }
        );
      }

      if (!diagnosis || Object.keys(diagnosis).length === 0) {
        return failure(
          "Diagnosis is required to sign prescription",
          null,
          422,
          { headers: corsHeaders }
        );
      }
    }

    /* -------------------------------------------------
       DRUG MASTER / CLINICAL SAFETY CHECK
    -------------------------------------------------- */
    if (medicines && Array.isArray(medicines) && medicines.length > 0) {
        const drugNames = medicines.map(m => m.name?.toUpperCase().trim()).filter(Boolean);
        
        if (drugNames.length > 0) {
            const { data: drugMasterData } = await supabase
                .from("drug_master")
                .select("name, category, is_active")
                .in("name", drugNames);
            
            if (drugMasterData) {
                const prohibited = drugMasterData.filter(d => d.category === 'PROHIBITED');
                if (prohibited.length > 0) {
                    const msg = `Clinical Safety Violation: The following drugs are PROHIBITED: ${prohibited.map(p => p.name).join(", ")}`;
                    if (action === "sign") {
                        await supabase.from("prescription_validation_log").insert([{
                            consultation_id: appointment_id,
                            doctor_id: doctor_id,
                            consultation_mode: appointment_type,
                            validation_status: "BLOCKED",
                            violations: [msg]
                        }]);
                    }
                    return failure(
                        msg,
                        null,
                        403,
                        { headers: corsHeaders }
                    );
                }

                const inactive = drugMasterData.filter(d => d.is_active === false);
                if (inactive.length > 0) {
                    const msg = `Clinical Safety Violation: The following drugs are currently inactive in the master catalog: ${inactive.map(p => p.name).join(", ")}`;
                    if (action === "sign") {
                        await supabase.from("prescription_validation_log").insert([{
                            consultation_id: appointment_id,
                            doctor_id: doctor_id,
                            consultation_mode: appointment_type,
                            validation_status: "BLOCKED",
                            violations: [msg]
                        }]);
                    }
                    return failure(
                        msg,
                        null,
                        403,
                        { headers: corsHeaders }
                    );
                }
            }
        }
    }

    /* -------------------------------------------------
       PREPARE INSERT DATA
    -------------------------------------------------- */
    const now = new Date().toISOString();

    const prescriptionData = {
      doctor_id,
      patient_id,
      appointment_id,
      appointment_type,
      specialization,

      diagnosis,
      medicines,
      lab_tests,
      investigations,
      vital_signs,
      examination_findings,
      follow_up,
      special_instructions,
      template_data,
      ai_analysis,

      special_message,

      is_draft: action === "save",
      status: action === "sign" ? "completed" : "active",
      updated_at: now
    };

    if (action === "sign") {
      prescriptionData.signed_by = doctor_id;
      prescriptionData.signed_at = now;
      prescriptionData.completed_at = now;
    }

    /* -------------------------------------------------
       INSERT PRESCRIPTION (DB-LEVEL SAFETY)
    -------------------------------------------------- */
    const { data: prescription, error } = await supabase
      .from("prescriptions")
      .insert(prescriptionData)
      .select("*")
      .single();

    if (error) {
      // PostgreSQL unique constraint violation
      if (error.code === "23505") {
        return failure(
          "Prescription already exists for this appointment",
          null,
          409,
          { headers: corsHeaders }
        );
      }
      throw error;
    }

    // Sync structured tables (consultation_medications, consultation_symptoms)
    if (prescription) {
      await syncClinicalData(
        appointment_id || prescription.appointment_id,
        medicines || null,
        body.symptoms || null
      ).catch(err => console.error("[Sync Prescription Create Error]:", err.message));
    }

    /* -------------------------------------------------
       UPDATE APPOINTMENT IF SIGNED
    -------------------------------------------------- */
    if (action === "sign" && appointment_id) {
      await supabase
        .from("appointments")
        .update({
          status: "completed",
          updated_at: now
        })
        .eq("id", appointment_id);

      await supabase
        .from("consultations")
        .update({
          case_status: "COMPLETED",
          completed_at: now,
          updated_at: now
        })
        .eq("appointment_id", appointment_id);

      // Create Legal Snapshot
      const snapshotPayload = { prescription };
      const snapshotHash = crypto.createHash('sha256').update(JSON.stringify(snapshotPayload)).digest('hex');
      
      const careEpId = appointment?.care_episode_id || "00000000-0000-0000-0000-000000000000";
      
      const { data: snapshot } = await supabase.from("prescription_snapshot").insert([{
          consultation_id: appointment_id,
          care_episode_id: careEpId,
          snapshot_hash: snapshotHash,
          snapshot_payload: snapshotPayload
      }]).select().single();
      
      if (snapshot) {
          await supabase.from("legal_snapshot_index").insert([{
              consultation_id: appointment_id,
              care_episode_id: careEpId,
              prescription_snapshot_id: snapshot.id,
          }]);
      }
      
      // ✅ Create Validation Log on successful sign
      await supabase.from("prescription_validation_log").insert([{
          consultation_id: appointment_id,
          doctor_id: doctor_id,
          consultation_mode: appointment_type,
          validation_status: "PASSED",
          violations: []
      }]);

      // Removed financial ledger insertion for prescriptions as they are clinical records
    }

    // ✅ LAYER-1: Audit log for prescription (fire-and-forget)
    logAudit({
      entity_type: "prescription",
      entity_id: prescription.id,
      previous_state: null,
      new_state: { status: prescription.status, is_draft: prescription.is_draft, diagnosis: !!diagnosis, medicines_count: medicines?.length },
      changed_by: doctor_id,
      change_description: `Prescription ${action === "sign" ? "signed and completed" : "saved as draft"}`,
    }).then(null, () => {});

    // ✅ LAYER-1: Activity log (fire-and-forget)
    logActivity({
      patient_id,
      care_episode_id: appointment?.care_episode_id || null,
      actor_id: doctor_id,
      module_type: "pharmacy",
      action_type: action === "sign" ? "prescription_created" : "prescription_drafted",
      reference_id: prescription.id,
      description: `Doctor ${action === "sign" ? "signed" : "drafted"} a prescription`,
      metadata: { appointment_id, specialization },
    }).then(null, () => {});

    /* -------------------------------------------------
       FETCH RELATED DATA
    -------------------------------------------------- */
    const [doctorData, patientData] = await Promise.all([
      supabase
        .from("doctor_details")
        .select("id, full_name, specialization, clinic_name, signature_url")
        .eq("id", doctor_id)
        .single(),

      supabase
        .from("patient_details")
        .select("id, full_name, gender, date_of_birth, users(phone_number)")
        .eq("id", patient_id)
        .single()
    ]);

    return success(
      action === "sign"
        ? "Prescription created and signed successfully"
        : "Prescription saved successfully",
      {
        prescription: {
          ...prescription,
          doctor: doctorData.data || {},
          patient: patientData.data || {},
          appointment: appointment || {}
        },
        action
      },
      201,
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("Create prescription error:", err);
    return failure(
      "Failed to create prescription",
      err.message,
      500,
      { headers: corsHeaders }
    );
  }
}
