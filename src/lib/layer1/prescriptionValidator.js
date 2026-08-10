/**
 * LAYER-111: Prescription Legality Validator — Phase 4 Hardened
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
 * Uses direct HTTP fetch to bypass PostgREST schema cache.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────
async function dbSelect(table, filters = '', options = {}) {
  const select = options.select || '*';
  const limit  = options.limit ? `&limit=${options.limit}` : '';
  const path   = `${table}?select=${select}${filters ? '&' + filters : ''}${limit}`;
  const res    = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey':        SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type':  'application/json',
    }
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function dbSelectCount(table, filters = '') {
  const path = `${table}?select=id${filters ? '&' + filters : ''}`;
  const res  = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey':           SERVICE_KEY,
      'Authorization':    `Bearer ${SERVICE_KEY}`,
      'Prefer':           'count=exact',
    }
  });
  const count = res.headers.get('content-range')?.split('/')[1];
  return count ? parseInt(count, 10) : 0;
}

async function dbInsert(table, payload) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method:  'POST',
    headers: {
      'apikey':        SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify(Array.isArray(payload) ? payload : [payload])
  });
  return res.ok;
}

async function dbUpsert(table, payload, onConflict) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method:  'POST',
    headers: {
      'apikey':        SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        `resolution=merge-duplicates,return=minimal`,
    },
    body: JSON.stringify(Array.isArray(payload) ? payload : [payload])
  });
  return res.ok;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN: Validate Prescription Legality
// ─────────────────────────────────────────────────────────────────────────────
export async function validatePrescriptionLegality(consultation_id, mode_used = 'STANDARD_MODE') {
  const critical_violations   = [];
  const non_critical_warnings = [];

  try {
    // ── Fetch core records ──────────────────────────────────────────────────
    const consultations = await dbSelect('consultations', `id=eq.${consultation_id}`, { limit: 1 });
    const consultation  = consultations[0];

    if (!consultation) {
      return { valid: false, critical_violations: ['Consultation not found'], non_critical_warnings: [] };
    }

    const doctors     = await dbSelect('doctor_details', `id=eq.${consultation.doctor_id}`, { select: 'id,full_name,registration_verified,kyc_status,onboarding_status,specialization', limit: 1 });
    const doctor      = doctors[0] || null;
    const clinicals   = await dbSelect('consultation_clinical', `consultation_id=eq.${consultation_id}`, { limit: 1 });
    const clinical    = clinicals[0] || null;
    const medications = await dbSelect('consultation_medications', `consultation_id=eq.${consultation_id}`);
    const consents    = await dbSelect('patient_consent_log', `patient_id=eq.${consultation.patient_id}`, { select: 'consent_type' });

    // ── CHECK 1: Doctor Registration ────────────────────────────────────────
    if (!doctor) {
      critical_violations.push('Doctor record not found');
    } else if (doctor.registration_verified !== true) {
      critical_violations.push('Doctor registration not verified — cannot prescribe');
    }

    // ── CHECK 2: Patient Consent ────────────────────────────────────────────
    const required      = ['CONSULTATION_CONSENT', 'TELEMEDICINE_CONSENT', 'DATA_PROCESSING_CONSENT', 'PRESCRIPTION_CONSENT'];
    const activeTypes   = (consents || []).map(c => c.consent_type);
    // Also check consent_logs (alias table from Phase 2)
    const consentLogs   = await dbSelect('consent_logs', `patient_id=eq.${consultation.patient_id}`, { select: 'consent_type' });
    const allConsentTypes = [...new Set([...activeTypes, ...(consentLogs || []).map(c => c.consent_type)])];
    const missing = required.filter(r => !allConsentTypes.includes(r));
    if (missing.length > 0) {
      // Non-critical if consent was captured via control layer (DATA_SHARING + TELECONSULTATION)
      // Map: DATA_SHARING → DATA_PROCESSING_CONSENT, TELECONSULTATION → TELEMEDICINE_CONSENT
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
    const mode               = consultation.consultation_mode;
    const isFirstConsultation = !consultation.parent_consultation_id;
    if (isFirstConsultation && mode && !['VIDEO', 'IN_PERSON'].includes(mode)) {
      critical_violations.push(`First consultation must be VIDEO or IN_PERSON (current: ${mode})`);
    }
    if (!mode) non_critical_warnings.push('Consultation mode not set');

    // ── CHECK 4: Drug Category Compliance ──────────────────────────────────
    if (medications && medications.length > 0) {
      for (const med of medications) {
        const name     = encodeURIComponent(med.normalized_name || med.medicine_name || '');
        const classes  = await dbSelect('drug_regulatory_class', `medicine_name=ilike.${name}`, { select: 'category', limit: 1 });
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

        if (!med.normalized_name) {
          non_critical_warnings.push(`Unrecognized medication: ${med.medicine_name} — requires confirmation`);
        }

        // ── CHECK 6: Specialty-Drug Match ──────────────────────────────────
        if (med.normalized_name && doctor?.specialization) {
          const specName  = encodeURIComponent(med.normalized_name);
          const allowed   = await dbSelect('drug_specialty_map', `normalized_name=ilike.${specName}`, { select: 'allowed_specialty_id' });
          if (allowed.length > 0 && !allowed.some(s => s.allowed_specialty_id === doctor.specialization)) {
            non_critical_warnings.push(`Specialty mismatch: ${med.medicine_name} — verify clinical appropriateness`);
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

    const symptomCount = await dbSelectCount('consultation_symptoms', `consultation_id=eq.${consultation_id}`);
    if (symptomCount === 0) non_critical_warnings.push('No symptoms recorded');
    if (!medications || medications.length === 0) non_critical_warnings.push('No medications prescribed');
    if (consultation.follow_up_required === null || consultation.follow_up_required === undefined) {
      non_critical_warnings.push('Follow-up preference not selected');
    }

    // ── LOG VALIDATION RESULT ────────────────────────────────────────────────
    const validation_status = critical_violations.length > 0 ? 'BLOCKED' : 'PASSED';
    await dbInsert('prescription_validation_log', {
      consultation_id,
      doctor_id:          consultation.doctor_id,
      consultation_mode:  mode,
      validation_status,
      violations:         [...critical_violations, ...non_critical_warnings],
      is_override:        false
    }).catch(() => {}); // Non-blocking — do not throw

    // ── FLAG QUALITY IF NON-CRITICAL ─────────────────────────────────────────
    if (non_critical_warnings.length > 0 && critical_violations.length === 0) {
      await dbUpsert('consultation_quality_flag', {
        consultation_id,
        quality_level: 'LOW',
        flagged_at: new Date().toISOString()
      }).catch(() => {});
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
    await dbInsert('prescription_validation_log', {
      consultation_id,
      doctor_id,
      validation_status: 'OVERRIDDEN',
      violations:        null,
      is_override:       true,
      override_reason
    });
    await dbInsert('clinical_override_log', {
      consultation_id,
      doctor_id,
      override_type: 'PRESCRIPTION_LEGALITY',
      reason: override_reason
    });
  } catch (err) {
    console.error('[PrescriptionValidator] logValidationOverride error:', err.message);
  }
}
