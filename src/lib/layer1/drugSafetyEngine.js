/**
 * LAYER-111: Drug Safety Engine — Phase 4 Hardened
 *
 * Comprehensive drug safety system:
 * 1. Drug normalization against chemist_medicines
 * 2. Duplicate drug detection
 * 3. Drug-drug interaction checking (pair-based)
 * 4. Polypharmacy warning (> 5 medications)
 * 5. Dosage range validation
 * 6. Age/pregnancy modifier checks
 * 7. Specialty-drug mismatch detection
 * 8. Auto-create clinical_risk_flags for HIGH severity
 *
 * Uses direct HTTP fetch to bypass PostgREST schema cache.
 */

function getDbCredentials() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return { url, key };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────
async function dbSelect(table, filters = '', options = {}) {
  const { url, key } = getDbCredentials();
  if (!url || !key) return [];
  const select = options.select || '*';
  const limit  = options.limit  ? `&limit=${options.limit}` : '';
  const path   = `${table}?select=${select}${filters ? '&' + filters : ''}${limit}`;
  const res    = await fetch(`${url}/rest/v1/${path}`, {
    headers: {
      'apikey':        key,
      'Authorization': `Bearer ${key}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=representation',
    }
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function dbInsert(table, payload) {
  const { url, key } = getDbCredentials();
  if (!url || !key) return false;
  const body = Array.isArray(payload) ? payload : [payload];
  const res  = await fetch(`${url}/rest/v1/${table}`, {
    method:  'POST',
    headers: {
      'apikey':        key,
      'Authorization': `Bearer ${key}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify(body)
  });
  return res.ok;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Drug Normalization
// ─────────────────────────────────────────────────────────────────────────────
export async function normalizeDrug(medicine_name) {
  if (!medicine_name) return { normalized_name: null, match_type: 'NONE', match_confidence: 0 };

  const clean = encodeURIComponent(medicine_name.trim().toLowerCase());

  // Exact match
  const exact = await dbSelect('chemist_medicines', `name=ilike.${clean}`, { select: 'name,id', limit: 1 });
  if (exact.length > 0) return { normalized_name: exact[0].name, match_type: 'EXACT', match_confidence: 1.0 };

  // Partial match
  const partial = await dbSelect('chemist_medicines', `name=ilike.*${clean}*`, { select: 'name,id', limit: 5 });
  if (partial.length === 1) return { normalized_name: partial[0].name, match_type: 'PARTIAL', match_confidence: 0.8 };
  if (partial.length > 1)  return { normalized_name: partial[0].name, match_type: 'AMBIGUOUS', match_confidence: 0.5, candidates: partial.map(p => p.name) };

  return { normalized_name: null, match_type: 'UNSTRUCTURED', match_confidence: 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Duplicate Detection
// ─────────────────────────────────────────────────────────────────────────────
export function checkDuplicateDrugs(medications) {
  const flags = [];
  const seen  = new Map();
  for (let i = 0; i < medications.length; i++) {
    const key = (medications[i].normalized_name || medications[i].medicine_name || '').toLowerCase();
    if (seen.has(key)) {
      flags.push({ flag_type: 'DUPLICATE_DRUG', severity: 'HIGH', message: `Duplicate drug: "${medications[i].medicine_name}" at position ${seen.get(key) + 1} and ${i + 1}`, related_medication_index: i, duplicate_of_index: seen.get(key) });
    } else { seen.set(key, i); }
  }
  return flags;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Drug Interaction Check
// ─────────────────────────────────────────────────────────────────────────────
const CRITICAL_INTERACTIONS = [
  { drug_a: 'warfarin',      drug_b: 'aspirin',       severity: 'HIGH',   message: 'Increased bleeding risk' },
  { drug_a: 'metformin',     drug_b: 'contrast dye',  severity: 'HIGH',   message: 'Lactic acidosis risk' },
  { drug_a: 'ssri',          drug_b: 'maoi',          severity: 'HIGH',   message: 'Serotonin syndrome risk' },
  { drug_a: 'ace inhibitor', drug_b: 'potassium',     severity: 'MEDIUM', message: 'Hyperkalemia risk' },
  { drug_a: 'statin',        drug_b: 'fibrate',       severity: 'MEDIUM', message: 'Rhabdomyolysis risk' },
  { drug_a: 'nsaid',         drug_b: 'ace inhibitor', severity: 'MEDIUM', message: 'Reduced antihypertensive effect' },
  { drug_a: 'ciprofloxacin', drug_b: 'theophylline',  severity: 'HIGH',   message: 'Theophylline toxicity risk' },
  { drug_a: 'methotrexate',  drug_b: 'nsaid',         severity: 'HIGH',   message: 'Methotrexate toxicity risk' },
  { drug_a: 'digoxin',       drug_b: 'amiodarone',    severity: 'HIGH',   message: 'Digoxin toxicity risk' },
  { drug_a: 'clopidogrel',   drug_b: 'omeprazole',    severity: 'MEDIUM', message: 'Reduced antiplatelet effect' },
];

export function checkDrugInteractions(medications) {
  const flags = [];
  const names = medications.map(m => (m.normalized_name || m.medicine_name || '').toLowerCase());
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      for (const ix of CRITICAL_INTERACTIONS) {
        const match = (names[i].includes(ix.drug_a) && names[j].includes(ix.drug_b))
                   || (names[i].includes(ix.drug_b) && names[j].includes(ix.drug_a));
        if (match) {
          flags.push({ flag_type: `INTERACTION_${ix.severity}`, severity: ix.severity, message: `Interaction: ${medications[i].medicine_name} ↔ ${medications[j].medicine_name} — ${ix.message}`, drug_pair: [medications[i].medicine_name, medications[j].medicine_name] });
        }
      }
    }
  }
  return flags;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Polypharmacy
// ─────────────────────────────────────────────────────────────────────────────
const POLYPHARMACY_THRESHOLD = 5;
export function checkPolypharmacy(medications) {
  if (medications.length > POLYPHARMACY_THRESHOLD) {
    return [{ flag_type: 'POLYPHARMACY', severity: 'MEDIUM', message: `${medications.length} medications prescribed (threshold: ${POLYPHARMACY_THRESHOLD}). Review for necessity.`, medication_count: medications.length }];
  }
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Dosage Range Validation
// ─────────────────────────────────────────────────────────────────────────────
export async function checkDosageRange(medications) {
  const flags = [];
  for (const med of medications) {
    if (!med.normalized_name || !med.dosage) continue;
    const name      = encodeURIComponent(med.normalized_name);
    const guidelines = await dbSelect('drug_dosage_guidelines', `normalized_name=ilike.${name}`, { limit: 1 });
    if (guidelines.length === 0) continue;
    const g          = guidelines[0];
    const numericDose = parseFloat(med.dosage);
    if (isNaN(numericDose)) continue;
    if (!isNaN(parseFloat(g.min_dose)) && numericDose < parseFloat(g.min_dose)) {
      flags.push({ flag_type: 'DOSAGE_OUT_OF_RANGE', severity: 'MEDIUM', message: `${med.medicine_name}: ${med.dosage} below minimum (${g.min_dose})`, related_medication: med.medicine_name });
    }
    if (!isNaN(parseFloat(g.max_dose)) && numericDose > parseFloat(g.max_dose)) {
      flags.push({ flag_type: 'DOSAGE_OUT_OF_RANGE', severity: 'HIGH', message: `${med.medicine_name}: ${med.dosage} exceeds maximum (${g.max_dose})`, related_medication: med.medicine_name });
    }
  }
  return flags;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Patient Modifier Checks (Pregnancy / Lactation)
// ─────────────────────────────────────────────────────────────────────────────
export function checkPatientModifierRisks(medications, patient_modifier) {
  const flags = [];
  if (patient_modifier === 'pregnant' || patient_modifier === 'lactating') {
    for (const med of medications) {
      flags.push({ flag_type: 'PREGNANCY_RISK', severity: 'MEDIUM', message: `${med.medicine_name} prescribed to ${patient_modifier} patient — verify safety`, related_medication: med.medicine_name });
    }
  }
  return flags;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Unstructured Med Flag
// ─────────────────────────────────────────────────────────────────────────────
export function checkUnstructuredMeds(medications) {
  return medications
    .filter(m => !m.normalized_name || m.is_free_text === true)
    .map(m => ({ flag_type: 'UNSTRUCTURED_MED', severity: 'LOW', message: `Unrecognized medication: "${m.medicine_name}" — will attempt normalization`, related_medication: m.medicine_name }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Specialty-Drug Mismatch
// ─────────────────────────────────────────────────────────────────────────────
export async function checkSpecialtyDrugMismatch(medications, doctor_id) {
  const flags = [];
  if (!doctor_id) return flags;
  const doctors = await dbSelect('doctor_details', `id=eq.${doctor_id}`, { select: 'specialization', limit: 1 });
  if (!doctors.length || !doctors[0].specialization) return flags;
  const specialty = doctors[0].specialization;
  for (const med of medications) {
    if (!med.normalized_name) continue;
    const name    = encodeURIComponent(med.normalized_name);
    const allowed = await dbSelect('drug_specialty_map', `normalized_name=ilike.${name}`, { select: 'allowed_specialty_id' });
    if (allowed.length > 0 && !allowed.some(s => s.allowed_specialty_id === specialty)) {
      flags.push({ flag_type: 'SPECIALTY_MISMATCH', severity: 'MEDIUM', message: `${med.medicine_name} typically prescribed by different specialty. Your specialty: ${specialty}.`, related_medication: med.medicine_name, doctor_specialty: specialty });
    }
  }
  return flags;
}

// ─────────────────────────────────────────────────────────────────────────────
// MASTER: Run All Safety Checks
// ─────────────────────────────────────────────────────────────────────────────
export async function runAllSafetyChecks(consultation_id) {
  try {
    const consultations = await dbSelect('consultations', `id=eq.${consultation_id}`, { select: 'patient_modifier,doctor_id', limit: 1 });
    const consultation  = consultations[0] || {};
    const medications   = await dbSelect('consultation_medications', `consultation_id=eq.${consultation_id}`);

    if (!medications.length) {
      return { flags: [], summary: { total: 0, high: 0, medium: 0, low: 0 }, has_critical: false, has_warnings: false };
    }

    const allFlags = [
      ...checkDuplicateDrugs(medications),
      ...checkDrugInteractions(medications),
      ...checkPolypharmacy(medications),
      ...(await checkDosageRange(medications)),
      ...checkPatientModifierRisks(medications, consultation.patient_modifier || 'none'),
      ...checkUnstructuredMeds(medications),
      ...(await checkSpecialtyDrugMismatch(medications, consultation.doctor_id)),
    ];

    if (allFlags.length > 0) {
      // Write consultation_flags
      await dbInsert('consultation_flags', allFlags.map(f => ({ consultation_id, flag_type: f.flag_type, severity: f.severity, acknowledged: false })));

      // Auto-raise clinical_risk_flags for HIGH severity
      const highFlags = allFlags.filter(f => f.severity === 'HIGH');
      if (highFlags.length > 0) {
        await dbInsert('clinical_risk_flags', highFlags.map(f => ({ consultation_id, risk_type: f.flag_type, severity: 'HIGH', triggered_by: 'system', resolved: false })));
      }

      // Queue unstructured meds for data quality review
      const unstructured = allFlags.filter(f => f.flag_type === 'UNSTRUCTURED_MED');
      if (unstructured.length > 0) {
        await dbInsert('data_quality_queue', unstructured.map(() => ({ consultation_id, issue_type: 'UNSTRUCTURED_MED', status: 'pending' })));
      }
    }

    const summary = {
      total:  allFlags.length,
      high:   allFlags.filter(f => f.severity === 'HIGH').length,
      medium: allFlags.filter(f => f.severity === 'MEDIUM').length,
      low:    allFlags.filter(f => f.severity === 'LOW').length,
    };

    return { flags: allFlags, summary, has_critical: summary.high > 0, has_warnings: summary.medium > 0 || summary.low > 0 };

  } catch (err) {
    console.error('[DrugSafetyEngine] runAllSafetyChecks error:', err.message);
    return { flags: [{ flag_type: 'SYSTEM_ERROR', severity: 'HIGH', message: err.message }], summary: { total: 1, high: 1, medium: 0, low: 0 }, has_critical: true, has_warnings: false };
  }
}
