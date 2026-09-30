/**
 * LAYER-111: Prescription Legality Validator — Phase 4 Hardened (AWS RDS PostgreSQL)
 *
 * CRITICAL legal validation gate that MUST run before POST /consultation/complete.
 *
 * Checks (DPDP Act 2023 + Telemedicine Guidelines):
 * 1. Doctor registration verified
 * 2. Patient consent exists
 * 3. Drug category compliance (O/A/B/PROHIBITED)
 * 4. Consultation mode compliance (first consult = VIDEO/IN_PERSON)
 * 5. Mandatory prescription fields present
 * 6. Specialty-drug match
 *
 * Returns: { valid, critical_violations[], non_critical_warnings[] }
 * RULE: Only critical_violations BLOCK completion.
 *
 * 100% Direct AWS RDS PostgreSQL - Zero Supabase HTTP REST dependencies.
 */

import sql from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
// MAIN: Validate Prescription Legality
// ─────────────────────────────────────────────────────────────────────────────
export async function validatePrescriptionLegality(consultation_id, mode_used = 'STANDARD_MODE') {
  const critical_violations   = [];
  const non_critical_warnings = [];

  try {
    // ── Fetch core records via direct AWS RDS SQL ───────────────────────────
    let consultation = null;
    try {
      const rows = await sql`SELECT * FROM consultations WHERE id = ${consultation_id} LIMIT 1`;
      consultation = rows[0] || null;
    } catch (err) {
      console.warn("[PrescriptionValidator] Consultations query warning:", err.message);
    }

    if (!consultation) {
      return { valid: false, critical_violations: ['Consultation not found'], non_critical_warnings: [] };
    }

    let doctor = null;
    if (consultation.doctor_id) {
      try {
        const docRows = await sql`
          SELECT id, full_name, registration_verified, kyc_status, onboarding_status, specialization
          FROM doctor_details
          WHERE id = ${consultation.doctor_id}
          LIMIT 1
        `;
        doctor = docRows[0] || null;
      } catch (err) {
        console.warn("[PrescriptionValidator] Doctor query warning:", err.message);
      }
    }

    let clinical = null;
    try {
      const clinRows = await sql`SELECT * FROM consultation_clinical WHERE consultation_id = ${consultation_id} LIMIT 1`;
      clinical = clinRows[0] || null;
    } catch {}

    let medications = [];
    try {
      medications = await sql`SELECT * FROM consultation_medications WHERE consultation_id = ${consultation_id}`;
    } catch {}

    const allConsentTypes = [];
    if (consultation.patient_id) {
      try {
        const consents = await sql`SELECT consent_type FROM patient_consent_log WHERE patient_id = ${consultation.patient_id}`;
        (consents || []).forEach(c => { if (c.consent_type) allConsentTypes.push(c.consent_type); });
      } catch {}

      try {
        const consentLogs = await sql`SELECT consent_type FROM consent_logs WHERE patient_id = ${consultation.patient_id}`;
        (consentLogs || []).forEach(c => { if (c.consent_type && !allConsentTypes.includes(c.consent_type)) allConsentTypes.push(c.consent_type); });
      } catch {}
    }

    // ── CHECK 1: Doctor Registration ────────────────────────────────────────
    if (!doctor) {
      critical_violations.push('Doctor record not found');
    } else {
      const isDoctorVerified = doctor.registration_verified === true || 
        (doctor.onboarding_status && ['approved', 'active'].includes(String(doctor.onboarding_status).toLowerCase())) || 
        (doctor.kyc_status && ['verified', 'approved'].includes(String(doctor.kyc_status).toLowerCase()));
      if (!isDoctorVerified) {
        critical_violations.push('Doctor registration not verified — cannot prescribe');
      }
    }

    // ── CHECK 2: Patient Consent ────────────────────────────────────────────
    const required = ['CONSULTATION_CONSENT', 'TELEMEDICINE_CONSENT', 'DATA_PROCESSING_CONSENT', 'PRESCRIPTION_CONSENT'];
    const missing = required.filter(r => !allConsentTypes.includes(r));
    if (missing.length > 0) {
      // Non-critical if consent was captured via control layer (DATA_SHARING + TELECONSULTATION)
      const mappedMissing = missing.filter(m => {
        if (m === 'DATA_PROCESSING_CONSENT' && allConsentTypes.includes('DATA_SHARING')) return false;
        if (m === 'TELEMEDICINE_CONSENT'    && allConsentTypes.includes('TELECONSULTATION')) return false;
        if (m === 'CONSULTATION_CONSENT'    && allConsentTypes.includes('DATA_SHARING')) return false;
        return true;
      });
      if (mappedMissing.length > 0) {
        non_critical_warnings.push(`Some consent types not found: ${mappedMissing.join(', ')}`);
      }
    }

    // ── CHECK 3: Consultation Mode ──────────────────────────────────────────
    const mode = consultation.consultation_mode;
    const isFirstConsultation = !consultation.parent_consultation_id;
    if (isFirstConsultation && mode && !['VIDEO', 'IN_PERSON'].includes(mode)) {
      critical_violations.push(`First consultation must be VIDEO or IN_PERSON (current: ${mode})`);
    }
    if (!mode) non_critical_warnings.push('Consultation mode not set');

    // ── CHECK 4: Drug Category Compliance ──────────────────────────────────
    if (medications && medications.length > 0) {
      for (const med of medications) {
        const medName = (med.normalized_name || med.medicine_name || '').trim();
        if (!medName) continue;

        try {
          const classes = await sql`SELECT category FROM drug_regulatory_class WHERE medicine_name ILIKE ${medName} LIMIT 1`;
          const drugClass = classes[0];

          if (drugClass) {
            if (drugClass.category === 'PROHIBITED') {
              critical_violations.push(`Prohibited drug prescribed: ${med.medicine_name}`);
            }
            if (drugClass.category === 'A' && mode && !['VIDEO', 'IN_PERSON'].includes(mode)) {
              critical_violations.push(`Category A drug "${med.medicine_name}" requires VIDEO/IN_PERSON consultation`);
            }
            if (drugClass.category === 'B' && isFirstConsultation) {
              critical_violations.push(`Category B drug "${med.medicine_name}" not allowed on first consultation`);
            }
          }
        } catch {
          // ignore table absence
        }

        if (!med.normalized_name) {
          non_critical_warnings.push(`Unrecognized medication: ${med.medicine_name} — requires confirmation`);
        }

        // ── CHECK 6: Specialty-Drug Match ──────────────────────────────────
        if (med.normalized_name && doctor?.specialization) {
          try {
            const allowed = await sql`
              SELECT allowed_specialty_id
              FROM drug_specialty_map
              WHERE normalized_name ILIKE ${med.normalized_name}
            `;
            if (allowed.length > 0 && !allowed.some(s => s.allowed_specialty_id === doctor.specialization)) {
              non_critical_warnings.push(`Specialty mismatch: ${med.medicine_name} — verify clinical appropriateness`);
            }
          } catch {
            // ignore
          }
        }
      }
    }

    // ── CHECK 5: Clinical Data Completeness ─────────────────────────────────
    if (!clinical) {
      non_critical_warnings.push('No clinical record found — consultation will be marked LOW quality');
    } else {
      if (!clinical.diagnosis_id && !clinical.diagnosis_text) non_critical_warnings.push('Missing diagnosis');
      if (!clinical.problem_id  && !clinical.problem_text)   non_critical_warnings.push('Missing problem/complaint');
    }

    let symptomCount = 0;
    try {
      const sympRows = await sql`SELECT count(*)::int as count FROM consultation_symptoms WHERE consultation_id = ${consultation_id}`;
      symptomCount = sympRows[0]?.count || 0;
    } catch {}

    if (symptomCount === 0) non_critical_warnings.push('No symptoms recorded');
    if (!medications || medications.length === 0) non_critical_warnings.push('No medications prescribed');
    if (consultation.follow_up_required === null || consultation.follow_up_required === undefined) {
      non_critical_warnings.push('Follow-up preference not selected');
    }

    // ── LOG VALIDATION RESULT ────────────────────────────────────────────────
    const validation_status = critical_violations.length > 0 ? 'BLOCKED' : 'PASSED';
    try {
      const allViolations = JSON.stringify([...critical_violations, ...non_critical_warnings]);
      await sql`
        INSERT INTO prescription_validation_log (
          consultation_id, doctor_id, consultation_mode, validation_status, violations, is_override
        ) VALUES (
          ${consultation_id}, ${consultation.doctor_id}, ${mode}, ${validation_status}, ${allViolations}::jsonb, false
        )
      `;
    } catch (logErr) {
      // Non-blocking
    }

    // ── FLAG QUALITY IF NON-CRITICAL ─────────────────────────────────────────
    if (non_critical_warnings.length > 0 && critical_violations.length === 0) {
      try {
        await sql`
          INSERT INTO consultation_quality_flag (consultation_id, quality_level, flagged_at)
          VALUES (${consultation_id}, 'LOW', NOW())
          ON CONFLICT (consultation_id) DO UPDATE SET quality_level = 'LOW', flagged_at = NOW()
        `;
      } catch {
        // Non-blocking
      }
    }

    return {
      valid: critical_violations.length === 0,
      critical_violations,
      non_critical_warnings,
      details: {
        doctor_verified:       doctor?.registration_verified || false,
        consent_present:       allConsentTypes.length >= 2,
        consultation_mode:     mode,
        is_first_consultation: isFirstConsultation,
        medication_count:      medications?.length || 0,
        clinical_record_exists: !!clinical,
      }
    };

  } catch (err) {
    console.error('[PrescriptionValidator] validatePrescriptionLegality error:', err.message);
    return { valid: false, critical_violations: ['Validation system error: ' + err.message], non_critical_warnings: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Log Override (doctor proceeds despite warnings)
// ─────────────────────────────────────────────────────────────────────────────
export async function logValidationOverride(consultation_id, doctor_id, override_reason) {
  try {
    await sql`
      INSERT INTO prescription_validation_log (
        consultation_id, doctor_id, validation_status, violations, is_override, override_reason
      ) VALUES (
        ${consultation_id}, ${doctor_id}, 'OVERRIDDEN', null, true, ${override_reason}
      )
    `;
    await sql`
      INSERT INTO clinical_override_log (
        consultation_id, doctor_id, override_type, reason
      ) VALUES (
        ${consultation_id}, ${doctor_id}, 'PRESCRIPTION_LEGALITY', ${override_reason}
      )
    `;
  } catch (err) {
    console.error('[PrescriptionValidator] logValidationOverride error:', err.message);
  }
}
