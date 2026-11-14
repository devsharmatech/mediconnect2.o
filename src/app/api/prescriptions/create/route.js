import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { logActivity } from "@/lib/layer1/activityLogger";
import { logAudit } from "@/lib/layer1/auditLogger";
import { postAppointmentCompletionLedger } from "@/lib/doctorFinancialEngine";
import { parseFamilyMember } from "@/lib/familyMemberHelper";

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

    let normalizedAptType = "clinic_visit";
    if (appointment_type) {
      const lower = String(appointment_type).toLowerCase().trim();
      if (lower.includes("video")) normalizedAptType = "video_call";
      else if (lower.includes("home")) normalizedAptType = "home_visit";
      else normalizedAptType = "clinic_visit";
    }

    if (!["save", "sign"].includes(action)) {
      return failure("Invalid action", null, 422, {
        headers: corsHeaders
      });
    }

    /* -------------------------------------------------
       VALIDATE DOCTOR VIA RDS POSTGRESQL
    -------------------------------------------------- */
    const docRows = await sql`
      SELECT id, full_name, onboarding_status, specialization, clinic_name, signature_url
      FROM doctor_details
      WHERE id = ${doctor_id}
      LIMIT 1
    `;

    if (!docRows || docRows.length === 0) {
      return failure("Doctor profile not found in system records.", null, 404, {
        headers: corsHeaders
      });
    }

    const doctor = docRows[0];

    /* -------------------------------------------------
       VALIDATE PATIENT VIA RDS POSTGRESQL
    -------------------------------------------------- */
    const patRows = await sql`
      SELECT pd.id, pd.full_name, pd.gender, pd.date_of_birth, u.phone_number
      FROM patient_details pd
      LEFT JOIN users u ON u.id = pd.id
      WHERE pd.id = ${patient_id}
      LIMIT 1
    `;

    if (!patRows || patRows.length === 0) {
      return failure("Patient profile not found in system records.", null, 404, {
        headers: corsHeaders
      });
    }

    const patient = patRows[0];

    /* -------------------------------------------------
       VALIDATE APPOINTMENT (OPTIONAL) VIA RDS POSTGRESQL
    -------------------------------------------------- */
    let appointment = null;

    if (appointment_id) {
      const apptRows = await sql`
        SELECT 
          id, doctor_id, patient_id, status, appointment_type, care_episode_id,
          booked_for, family_member_id, family_member_details, disease_info
        FROM appointments
        WHERE id = ${appointment_id}
        LIMIT 1
      `;

      if (!apptRows || apptRows.length === 0) {
        return failure("Invalid appointment_id", null, 404, {
          headers: corsHeaders
        });
      }

      appointment = apptRows[0];

      if (appointment.doctor_id !== doctor_id) {
        return failure("Appointment does not belong to this doctor", null, 403, {
          headers: corsHeaders
        });
      }

      if (appointment.patient_id !== patient_id) {
        return failure("Appointment does not belong to this patient", null, 403, {
          headers: corsHeaders
        });
      }
    }

    /* -------------------------------------------------
       CHECK FOR EXISTING PRESCRIPTION FOR THIS APPOINTMENT
    -------------------------------------------------- */
    if (appointment_id) {
      const existingPrescriptions = await sql`
        SELECT id, status, is_draft
        FROM prescriptions
        WHERE appointment_id = ${appointment_id}
        LIMIT 1
      `;

      if (existingPrescriptions.length > 0) {
        const existing = existingPrescriptions[0];
        if (!existing.is_draft && action === "sign") {
          return failure("Prescription already signed for this appointment", null, 409, {
            headers: corsHeaders
          });
        }
      }
    }

    /* -------------------------------------------------
       SIGN VALIDATION
    -------------------------------------------------- */
    if (action === "sign") {
      if (!Array.isArray(medicines) || medicines.length === 0) {
        return failure("Medicines are required to sign prescription", null, 422, {
          headers: corsHeaders
        });
      }

      if (!diagnosis || (typeof diagnosis === "object" && Object.keys(diagnosis).length === 0 && !diagnosis.primary)) {
        return failure("Diagnosis is required to sign prescription", null, 422, {
          headers: corsHeaders
        });
      }
    }

    /* -------------------------------------------------
       PREPARE INSERT DATA
    -------------------------------------------------- */
    const now = new Date().toISOString();

    let normalizedLabTests = [];
    if (Array.isArray(lab_tests)) {
      normalizedLabTests = lab_tests.map((item) => {
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

    const isDraft = action === "save";
    const rxStatus = action === "sign" ? "completed" : "active";
    const signedBy = action === "sign" ? doctor_id : null;
    const signedAt = action === "sign" ? now : null;
    const completedAt = action === "sign" ? now : null;

    let fam = parseFamilyMember(body.family_member || template_data?.family_member, null);
    if (!fam && appointment) {
      fam = parseFamilyMember(appointment.family_member_details, appointment.disease_info);
    }
    const finalTemplateData = {
      ...(template_data || {}),
      ...(fam ? { family_member: fam, booked_for: "family_member" } : {}),
    };

    /* -------------------------------------------------
       INSERT PRESCRIPTION INTO RDS POSTGRESQL
    -------------------------------------------------- */
    const insertedRows = await sql`
      INSERT INTO prescriptions (
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
        is_draft,
        status,
        signed_by,
        signed_at,
        completed_at,
        created_at,
        updated_at
      ) VALUES (
        ${doctor_id},
        ${patient_id},
        ${appointment_id || null},
        ${normalizedAptType},
        ${specialization || "general_medicine"},
        ${sql.json(typeof diagnosis === "object" ? diagnosis : { primary: diagnosis })},
        ${sql.json(medicines || [])},
        ${sql.json(normalizedLabTests)},
        ${sql.json(investigations || {})},
        ${sql.json(vital_signs || {})},
        ${sql.json(examination_findings || {})},
        ${sql.json(follow_up || {})},
        ${sql.json(special_instructions || {})},
        ${sql.json(finalTemplateData)},
        ${sql.json(ai_analysis || {})},
        ${special_message || ""},
        ${isDraft},
        ${rxStatus},
        ${signedBy},
        ${signedAt},
        ${completedAt},
        ${now},
        ${now}
      )
      RETURNING *
    `;

    const prescription = insertedRows[0];
    if (!prescription) {
      throw new Error("Failed to insert prescription into AWS RDS PostgreSQL.");
    }

    /* -------------------------------------------------
       UPDATE APPOINTMENT STATUS IF SIGNED
    -------------------------------------------------- */
    if (action === "sign" && appointment_id) {
      try {
        await sql`
          UPDATE appointments
          SET status = 'completed', completed_at = ${now}, updated_at = ${now}
          WHERE id = ${appointment_id}
        `;
        // Post immutable financial ledger entries for Doctor Financial Engine
        await postAppointmentCompletionLedger(appointment_id);
      } catch (sqlErr) {
        console.warn("[Prescription Create] RDS direct appointment update warning:", sqlErr.message);
      }
    }

    // Audit and Activity Logging (fire-and-forget)
    logAudit({
      entity_type: "prescription",
      entity_id: prescription.id,
      previous_state: null,
      new_state: { status: prescription.status, is_draft: prescription.is_draft, medicines_count: medicines?.length },
      changed_by: doctor_id,
      change_description: `Prescription ${action === "sign" ? "signed and completed" : "saved as draft"}`,
    }).catch(() => {});

    logActivity({
      patient_id,
      care_episode_id: appointment?.care_episode_id || null,
      actor_id: doctor_id,
      module_type: "pharmacy",
      action_type: action === "sign" ? "prescription_created" : "prescription_drafted",
      reference_id: prescription.id,
      description: `Doctor ${action === "sign" ? "signed" : "drafted"} a prescription`,
      metadata: { appointment_id, specialization },
    }).catch(() => {});

    return success(
      action === "sign"
        ? "Prescription created and signed successfully"
        : "Prescription saved successfully",
      {
        prescription: {
          ...prescription,
          doctor: doctor || {},
          patient: patient || {},
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
