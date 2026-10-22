import sql from './db.js';

/**
 * MEDICONNECT.FIT | DOCTOR FINANCIAL ENGINE
 * Implementation Brief: Commission • GST/TDS • Dashboard • 10-Day Settlement
 *
 * Rules:
 * 1. Single backend financial calculation and ledger is the source of truth.
 * 2. Commercial rules:
 *    - Migrated patient: In-clinic 5%, Video 20%, Home visit 20%
 *    - Discovery first clinic visit: In-clinic 18%, Video 20%, Home visit 20%
 *    - Discovery clinic follow-up (< 6 months): In-clinic 10%, Video 20%, Home visit 20%
 *    - Discovery clinic follow-up (>= 6 months): In-clinic 18%, Video 20%, Home visit 20%
 * 3. Taxes: Configurable GST 18% on platform commission, TDS 10% at payout.
 * 4. 10-Day settlement cycles: 1–10, 11–20, 21–month end.
 */

// Helper to sanitize numeric currency values
export function toFixed2(val) {
  const num = Number(val) || 0;
  return Math.round(num * 100) / 100;
}

/**
 * Fetch active tax and financial configuration from database.
 */
export async function getFinancialTaxSettings() {
  try {
    const rows = await sql`
      SELECT gst_rate, is_gst_applicable, tds_rate, is_tds_applicable, rule_version
      FROM financial_tax_settings
      ORDER BY effective_from DESC
      LIMIT 1;
    `;
    if (rows && rows.length > 0) {
      return {
        gst_rate: Number(rows[0].gst_rate) || 18.00,
        is_gst_applicable: rows[0].is_gst_applicable ?? true,
        tds_rate: Number(rows[0].tds_rate) || 10.00,
        is_tds_applicable: rows[0].is_tds_applicable ?? true,
        rule_version: rows[0].rule_version || 'v1.2',
      };
    }
  } catch (err) {
    console.warn("Could not fetch financial_tax_settings, using fallback v1.2:", err.message);
  }

  return {
    gst_rate: 18.00,
    is_gst_applicable: true,
    tds_rate: 10.00,
    is_tds_applicable: true,
    rule_version: 'v1.2',
  };
}

/**
 * Resolve commercial commission rate based on service mode, migration, and clinic history.
 */
export async function resolveCommercialCommission({
  doctor_id,
  patient_id,
  appointment_type = 'clinic_visit',
  doctor_migration_code = null,
}) {
  if (!doctor_id) {
    throw new Error("doctor_id is required for commission resolution");
  }

  const mode = String(appointment_type || '').toLowerCase();
  const isVideo = mode.includes('video');
  const isHome = mode.includes('home');
  const isClinic = !isVideo && !isHome; // clinic_visit, clinic_follow_up, etc.

  // 1. Video and Home Visit flat commercial rule = 20%
  if (isVideo) {
    return {
      commission_rate: 20.00,
      category: 'video_consultation',
      is_migrated: false,
      is_followup: mode.includes('follow'),
      six_month_window_active: false,
      first_clinic_visit_date: null,
      description: 'Video consultation (flat 20%)',
    };
  }

  if (isHome) {
    return {
      commission_rate: 20.00,
      category: 'home_visit',
      is_migrated: false,
      is_followup: mode.includes('follow'),
      six_month_window_active: false,
      first_clinic_visit_date: null,
      description: 'Home visit consultation (flat 20%)',
    };
  }

  // 2. In-Clinic Visit: Evaluate Migrated vs Discovery & 6-month History
  let isMigrated = Boolean(doctor_migration_code);
  let firstClinicVisitAt = null;

  if (patient_id) {
    try {
      // Check existing relationship record
      const relRows = await sql`
        SELECT acquisition_source, migration_verified_at, first_completed_clinic_visit_at
        FROM patient_doctor_relationships
        WHERE patient_id = ${patient_id} AND doctor_id = ${doctor_id}
        LIMIT 1;
      `;

      if (relRows.length > 0) {
        const rel = relRows[0];
        if (rel.acquisition_source === 'migrated' && rel.migration_verified_at) {
          isMigrated = true;
        }
        firstClinicVisitAt = rel.first_completed_clinic_visit_at;
      }

      // If firstClinicVisitAt not yet cached in relationship, check completed clinic appointments
      if (!firstClinicVisitAt) {
        const pastClinicRows = await sql`
          SELECT completed_at, appointment_date
          FROM appointments
          WHERE doctor_id = ${doctor_id}
            AND patient_id = ${patient_id}
            AND status = 'completed'
            AND appointment_type IN ('clinic_visit', 'clinic_follow_up', 'in_clinic')
          ORDER BY completed_at ASC NULLS LAST, appointment_date ASC
          LIMIT 1;
        `;
        if (pastClinicRows.length > 0) {
          firstClinicVisitAt = pastClinicRows[0].completed_at || pastClinicRows[0].appointment_date;
        }
      }
    } catch (dbErr) {
      console.warn("Error querying patient_doctor_relationships:", dbErr.message);
    }
  }

  // Rule: Verified doctor-migrated existing patient for In-Clinic = 5%
  if (isMigrated) {
    return {
      commission_rate: 5.00,
      category: 'verified_migrated_clinic',
      is_migrated: true,
      is_followup: Boolean(firstClinicVisitAt),
      six_month_window_active: false,
      first_clinic_visit_date: firstClinicVisitAt,
      description: 'Verified doctor-migrated patient (In-clinic 5%)',
    };
  }

  // Rule: Discovery patient In-Clinic evaluation
  if (firstClinicVisitAt) {
    const firstDate = new Date(firstClinicVisitAt);
    const now = new Date();
    // 6-month window evaluation (183 calendar days)
    const diffDays = Math.floor((now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    const isWithin6Months = diffDays >= 0 && diffDays <= 183;

    if (isWithin6Months) {
      return {
        commission_rate: 10.00,
        category: 'discovery_clinic_followup_under_6m',
        is_migrated: false,
        is_followup: true,
        six_month_window_active: true,
        days_since_first_clinic: diffDays,
        first_clinic_visit_date: firstDate.toISOString(),
        description: 'Discovery clinic follow-up before 6-month anniversary (10%)',
      };
    } else {
      return {
        commission_rate: 18.00,
        category: 'discovery_clinic_followup_over_6m',
        is_migrated: false,
        is_followup: true,
        six_month_window_active: false,
        days_since_first_clinic: diffDays,
        first_clinic_visit_date: firstDate.toISOString(),
        description: 'Discovery clinic follow-up on/after 6-month anniversary (18%)',
      };
    }
  }

  // First qualifying clinic visit through MediConnect Discovery = 18%
  return {
    commission_rate: 18.00,
    category: 'discovery_clinic_first_visit',
    is_migrated: false,
    is_followup: false,
    six_month_window_active: false,
    first_clinic_visit_date: null,
    description: 'MediConnect Discovery: first qualifying clinic visit (18%)',
  };
}

/**
 * Calculate complete, itemized financial quote for a consultation.
 */
export async function calculateBookingFinancialQuote({
  doctor_id,
  patient_id,
  appointment_type = 'clinic_visit',
  professional_fee = 0,
  doctor_migration_code = null,
}) {
  const fee = toFixed2(professional_fee);
  const [commissionResolution, taxSettings] = await Promise.all([
    resolveCommercialCommission({
      doctor_id,
      patient_id,
      appointment_type,
      doctor_migration_code,
    }),
    getFinancialTaxSettings(),
  ]);

  const commissionRate = commissionResolution.commission_rate;
  const commissionAmount = toFixed2(fee * (commissionRate / 100));

  // GST on platform commission (18% default)
  const gstRate = taxSettings.is_gst_applicable ? taxSettings.gst_rate : 0.00;
  const gstAmount = taxSettings.is_gst_applicable ? toFixed2(commissionAmount * (gstRate / 100)) : 0.00;

  // Doctor amount before TDS
  const doctorAmountBeforeTds = toFixed2(fee - commissionAmount);

  // TDS at payout (10% default on CA-confirmed base)
  const tdsRate = taxSettings.is_tds_applicable ? taxSettings.tds_rate : 0.00;
  const tdsAmount = taxSettings.is_tds_applicable ? toFixed2(doctorAmountBeforeTds * (tdsRate / 100)) : 0.00;

  // Net Doctor Payout
  const netDoctorPayout = toFixed2(doctorAmountBeforeTds - tdsAmount);

  const snapshot = {
    professional_fee: fee,
    service_mode: appointment_type,
    commission_category: commissionResolution.category,
    commission_description: commissionResolution.description,
    commission_rate: commissionRate,
    commission_base: fee,
    commission_amount: commissionAmount,
    commission_gst_rate: gstRate,
    commission_gst_amount: gstAmount,
    doctor_amount_before_tds: doctorAmountBeforeTds,
    doctor_tds_rate: tdsRate,
    doctor_tds_amount: tdsAmount,
    doctor_net_payable: netDoctorPayout,
    travel_charge: 0.00,
    rule_version: taxSettings.rule_version,
    snapshot_created_at: new Date().toISOString(),
    is_migrated: commissionResolution.is_migrated,
    is_followup: commissionResolution.is_followup,
  };

  return {
    success: true,
    data: snapshot,
  };
}

/**
 * Freeze financial calculation snapshot onto an appointment record.
 */
export async function freezeBookingFinancialSnapshot(appointment_id, snapshot) {
  if (!appointment_id || !snapshot) {
    throw new Error("appointment_id and snapshot are required");
  }

  const updatedRows = await sql`
    UPDATE appointments
    SET
      commission_rate = ${snapshot.commission_rate},
      commission_base = ${snapshot.commission_base},
      commission_amount = ${snapshot.commission_amount},
      commission_gst_rate = ${snapshot.commission_gst_rate},
      commission_gst_amount = ${snapshot.commission_gst_amount},
      doctor_tds_rate = ${snapshot.doctor_tds_rate},
      doctor_tds_amount = ${snapshot.doctor_tds_amount},
      doctor_net_payable = ${snapshot.doctor_net_payable},
      financial_rule_version = ${snapshot.rule_version},
      financial_snapshot = ${JSON.stringify(snapshot)},
      updated_at = NOW()
    WHERE id = ${appointment_id}
    RETURNING id, doctor_id, patient_id, appointment_type, status;
  `;

  if (updatedRows.length === 0) {
    throw new Error(`Appointment ${appointment_id} not found to freeze snapshot`);
  }

  const appt = updatedRows[0];

  // Track / ensure patient-doctor relationship record exists
  if (appt.patient_id && appt.doctor_id) {
    try {
      const source = snapshot.is_migrated ? 'migrated' : 'discovery';
      await sql`
        INSERT INTO patient_doctor_relationships (
          patient_id, doctor_id, acquisition_source, migration_verified_at, created_at, updated_at
        ) VALUES (
          ${appt.patient_id},
          ${appt.doctor_id},
          ${source},
          ${snapshot.is_migrated ? sql`NOW()` : null},
          NOW(),
          NOW()
        )
        ON CONFLICT (patient_id, doctor_id) DO UPDATE
        SET 
          acquisition_source = CASE 
            WHEN patient_doctor_relationships.acquisition_source = 'migrated' THEN 'migrated' 
            ELSE EXCLUDED.acquisition_source 
          END,
          migration_verified_at = COALESCE(patient_doctor_relationships.migration_verified_at, EXCLUDED.migration_verified_at),
          updated_at = NOW();
      `;
    } catch (relErr) {
      console.warn("Could not upsert patient_doctor_relationships:", relErr.message);
    }
  }

  return { success: true, appointment: appt };
}

/**
 * Idempotently post ledger entries when an appointment is completed.
 */
export async function postAppointmentCompletionLedger(appointment_id) {
  if (!appointment_id) return { success: false, error: "appointment_id is required" };

  const apptRows = await sql`
    SELECT * FROM appointments WHERE id = ${appointment_id} LIMIT 1;
  `;
  if (apptRows.length === 0) return { success: false, error: "Appointment not found" };

  const appt = apptRows[0];
  let snapshot = appt.financial_snapshot;
  if (typeof snapshot === 'string') {
    try { snapshot = JSON.parse(snapshot); } catch { snapshot = null; }
  }

  // If no snapshot exists yet, compute and freeze it now
  if (!snapshot) {
    const fee = Number(appt.final_fee || appt.original_fee || 0);
    const quoteRes = await calculateBookingFinancialQuote({
      doctor_id: appt.doctor_id,
      patient_id: appt.patient_id,
      appointment_type: appt.appointment_type,
      professional_fee: fee,
      doctor_migration_code: appt.doctor_migration_code,
    });
    snapshot = quoteRes.data;
    await freezeBookingFinancialSnapshot(appointment_id, snapshot);
  }

  const doctorId = appt.doctor_id;
  const fee = toFixed2(snapshot.professional_fee);
  const comm = toFixed2(snapshot.commission_amount);
  const gst = toFixed2(snapshot.commission_gst_amount);
  const tds = toFixed2(snapshot.doctor_tds_amount);

  // 1. Credit Doctor Gross Fee to DOCTOR_PAYABLE
  await sql`
    INSERT INTO doctor_financial_ledger (
      booking_id, doctor_id, entry_type, account_code, debit, credit, description, idempotency_key
    ) VALUES (
      ${appointment_id},
      ${doctorId},
      'consultation_fee',
      'DOCTOR_PAYABLE',
      0.00,
      ${fee},
      ${'Gross consultation fee for booking #' + String(appointment_id).slice(0, 8)},
      ${`appt_${appointment_id}_consultation_fee`}
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  `;

  // 2. Debit Platform Commission from DOCTOR_PAYABLE, Credit to PLATFORM_REVENUE
  if (comm > 0) {
    await sql`
      INSERT INTO doctor_financial_ledger (
        booking_id, doctor_id, entry_type, account_code, debit, credit, description, idempotency_key
      ) VALUES (
        ${appointment_id},
        ${doctorId},
        'platform_commission',
        'DOCTOR_PAYABLE',
        ${comm},
        0.00,
        ${`Platform commission deduction (${snapshot.commission_rate}%)`},
        ${`appt_${appointment_id}_platform_commission`}
      )
      ON CONFLICT (idempotency_key) DO NOTHING;
    `;

    await sql`
      INSERT INTO doctor_financial_ledger (
        booking_id, doctor_id, entry_type, account_code, debit, credit, description, idempotency_key
      ) VALUES (
        ${appointment_id},
        ${doctorId},
        'platform_commission_income',
        'PLATFORM_REVENUE',
        0.00,
        ${comm},
        ${`Platform commission revenue (${snapshot.commission_rate}%)`},
        ${`appt_${appointment_id}_platform_rev`}
      )
      ON CONFLICT (idempotency_key) DO NOTHING;
    `;
  }

  // 3. Post GST on platform commission to separate GST_LIABILITY account
  if (gst > 0) {
    await sql`
      INSERT INTO doctor_financial_ledger (
        booking_id, doctor_id, entry_type, account_code, debit, credit, description, idempotency_key
      ) VALUES (
        ${appointment_id},
        ${doctorId},
        'gst_on_commission',
        'GST_LIABILITY',
        0.00,
        ${gst},
        ${`GST (${snapshot.commission_gst_rate}%) on platform fee`},
        ${`appt_${appointment_id}_gst`}
      )
      ON CONFLICT (idempotency_key) DO NOTHING;
    `;
  }

  // 4. Post TDS Withholding (Section 194J - 10%)
  if (tds > 0) {
    await sql`
      INSERT INTO doctor_financial_ledger (
        booking_id, doctor_id, entry_type, account_code, debit, credit, description, idempotency_key
      ) VALUES (
        ${appointment_id},
        ${doctorId},
        'tds_withholding',
        'DOCTOR_PAYABLE',
        ${tds},
        0.00,
        ${`TDS withholding (10% u/s 194J) on consultation`},
        ${`appt_${appointment_id}_tds_deduction`}
      )
      ON CONFLICT (idempotency_key) DO NOTHING;
    `;

    await sql`
      INSERT INTO doctor_financial_ledger (
        booking_id, doctor_id, entry_type, account_code, debit, credit, description, idempotency_key
      ) VALUES (
        ${appointment_id},
        ${doctorId},
        'tds_liability',
        'TDS_PAYABLE_194J',
        0.00,
        ${tds},
        ${`TDS liability (10% u/s 194J) for booking #${String(appointment_id).slice(0, 8)}`},
        ${`appt_${appointment_id}_tds_liability`}
      )
      ON CONFLICT (idempotency_key) DO NOTHING;
    `;
  }

  // 4. Update first completed clinic visit date if applicable
  const mode = String(appt.appointment_type || '').toLowerCase();
  const isClinic = !mode.includes('video') && !mode.includes('home');
  if (isClinic && appt.patient_id && appt.doctor_id) {
    try {
      await sql`
        UPDATE patient_doctor_relationships
        SET 
          first_completed_clinic_visit_at = COALESCE(first_completed_clinic_visit_at, NOW()),
          updated_at = NOW()
        WHERE patient_id = ${appt.patient_id} AND doctor_id = ${appt.doctor_id};
      `;
    } catch (visitErr) {
      console.warn("Could not update first_completed_clinic_visit_at:", visitErr.message);
    }
  }

  return { success: true };
}

/**
 * Generate 10-day settlement batch periods:
 * Cycle 1: Day 1 - Day 10
 * Cycle 2: Day 11 - Day 20
 * Cycle 3: Day 21 - Month End
 */
export function get10DayPeriodBounds(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-indexed
  const day = date.getDate();

  let cycle = 1;
  let startDay = 1;
  let endDay = 10;

  if (day >= 1 && day <= 10) {
    cycle = 1;
    startDay = 1;
    endDay = 10;
  } else if (day >= 11 && day <= 20) {
    cycle = 2;
    startDay = 11;
    endDay = 20;
  } else {
    cycle = 3;
    startDay = 21;
    // Last day of month
    endDay = new Date(y, m + 1, 0).getDate();
  }

  const pad = (n) => String(n).padStart(2, '0');
  const monthStr = pad(m + 1);
  const batchPeriod = `${y}-${monthStr}-CYCLE-${cycle}`;
  const periodStart = `${y}-${monthStr}-${pad(startDay)}`;
  const periodEnd = `${y}-${monthStr}-${pad(endDay)}`;

  return {
    cycle,
    batchPeriod,
    periodStart,
    periodEnd,
    year: y,
    month: m + 1,
  };
}

/**
 * Orchestrate 10-day settlement batches for all doctors with completed unsettled bookings.
 */
export async function generate10DayPayoutBatches({ periodBounds = null, doctorId = null } = {}) {
  const bounds = periodBounds || get10DayPeriodBounds();
  const { batchPeriod, periodStart, periodEnd } = bounds;

  console.log(`Generating settlement batch for period: ${batchPeriod} (${periodStart} to ${periodEnd})${doctorId ? ` for doctor ${doctorId}` : ''}`);

  // Find all completed appointments in this period that are unsettled
  const appts = doctorId
    ? await sql`
        SELECT *
        FROM appointments
        WHERE doctor_id = ${doctorId}
          AND (status = 'completed' OR payment_status = 'paid')
          AND (settlement_status IS NULL OR settlement_status IN ('unsettled', 'queued'))
          AND (
            (completed_at IS NOT NULL AND completed_at::date >= ${periodStart}::date AND completed_at::date <= ${periodEnd}::date)
            OR
            (completed_at IS NULL AND appointment_date >= ${periodStart}::date AND appointment_date <= ${periodEnd}::date)
          );
      `
    : await sql`
        SELECT *
        FROM appointments
        WHERE (status = 'completed' OR payment_status = 'paid')
          AND (settlement_status IS NULL OR settlement_status IN ('unsettled', 'queued'))
          AND (
            (completed_at IS NOT NULL AND completed_at::date >= ${periodStart}::date AND completed_at::date <= ${periodEnd}::date)
            OR
            (completed_at IS NULL AND appointment_date >= ${periodStart}::date AND appointment_date <= ${periodEnd}::date)
          );
      `;

  if (appts.length === 0) {
    return {
      success: true,
      batchPeriod,
      batchesCreated: 0,
      message: `No eligible completed appointments found for period ${batchPeriod}`,
    };
  }

  // Group by doctor_id
  const doctorGroups = {};
  for (const a of appts) {
    if (!doctorGroups[a.doctor_id]) {
      doctorGroups[a.doctor_id] = [];
    }
    doctorGroups[a.doctor_id].push(a);
  }

  const createdBatches = [];

  for (const [docId, docAppts] of Object.entries(doctorGroups)) {
    let grossFees = 0;
    let totalComm = 0;
    let totalGst = 0;
    let totalTds = 0;
    let netPayout = 0;

    for (const a of docAppts) {
      let snap = a.financial_snapshot;
      if (typeof snap === 'string') {
        try { snap = JSON.parse(snap); } catch { snap = null; }
      }
      if (!snap) {
        const fee = Number(a.final_fee || a.original_fee || 0);
        const comm = fee * 0.18;
        const gst = comm * 0.18;
        const tds = (fee - comm) * 0.10;
        const net = (fee - comm) - tds;
        grossFees += fee;
        totalComm += comm;
        totalGst += gst;
        totalTds += tds;
        netPayout += net;
      } else {
        grossFees += Number(snap.professional_fee || 0);
        totalComm += Number(snap.commission_amount || 0);
        totalGst += Number(snap.commission_gst_amount || 0);
        totalTds += Number(snap.doctor_tds_amount || 0);
        netPayout += Number(snap.doctor_net_payable || 0);
      }
    }

    grossFees = toFixed2(grossFees);
    totalComm = toFixed2(totalComm);
    totalGst = toFixed2(totalGst);
    totalTds = toFixed2(totalTds);
    netPayout = toFixed2(netPayout);

    // Fetch doctor bank snapshot
    const docRows = await sql`
      SELECT id, full_name, email, bank_account_details
      FROM doctor_details
      WHERE id = ${docId}
      LIMIT 1;
    `;
    const doc = docRows[0] || {};
    const bankSnapshot = doc.bank_account_details || {};

    // Upsert doctor_payout_batches
    const batchRow = await sql`
      INSERT INTO doctor_payout_batches (
        batch_period, period_start, period_end, doctor_id, total_bookings,
        gross_consultation_fees, total_platform_commission, total_gst, total_tds,
        total_adjustments, net_payout, status, bank_snapshot, created_at, updated_at
      ) VALUES (
        ${batchPeriod},
        ${periodStart}::date,
        ${periodEnd}::date,
        ${docId},
        ${docAppts.length},
        ${grossFees},
        ${totalComm},
        ${totalGst},
        ${totalTds},
        0.00,
        ${netPayout},
        'reconciled',
        ${JSON.stringify(bankSnapshot)},
        NOW(),
        NOW()
      )
      ON CONFLICT (doctor_id, batch_period) DO UPDATE
      SET
        total_bookings = EXCLUDED.total_bookings,
        gross_consultation_fees = EXCLUDED.gross_consultation_fees,
        total_platform_commission = EXCLUDED.total_platform_commission,
        total_gst = EXCLUDED.total_gst,
        total_tds = EXCLUDED.total_tds,
        net_payout = EXCLUDED.net_payout,
        status = CASE WHEN doctor_payout_batches.status = 'paid' THEN 'paid' ELSE 'reconciled' END,
        bank_snapshot = EXCLUDED.bank_snapshot,
        updated_at = NOW()
      RETURNING *;
    `;

    const savedBatch = batchRow[0];
    createdBatches.push(savedBatch);

    // Link appointments to this batch
    const apptIds = docAppts.map(a => a.id);
    await sql`
      UPDATE appointments
      SET 
        settlement_batch_id = ${savedBatch.id},
        settlement_status = 'queued',
        updated_at = NOW()
      WHERE id = ANY(${apptIds});
    `;
  }

  return {
    success: true,
    batchPeriod,
    batchesCreated: createdBatches.length,
    batches: createdBatches,
  };
}

/**
 * Get comprehensive doctor revenue dashboard summary.
 */
export async function getDoctorRevenueSummary(doctorId, { startDate = null, endDate = null } = {}) {
  if (!doctorId) throw new Error("doctorId is required");

  // 1. Auto-post ledger entries for any completed or paid appointments that don't have them yet
  try {
    const unposted = await sql`
      SELECT id FROM appointments
      WHERE doctor_id = ${doctorId}
        AND (status = 'completed' OR payment_status = 'paid')
        AND NOT EXISTS (
          SELECT 1 FROM doctor_financial_ledger
          WHERE booking_id = appointments.id
        )
      LIMIT 25;
    `;
    for (const u of unposted) {
      await postAppointmentCompletionLedger(u.id);
    }
  } catch (err) {
    console.warn("Auto ledger posting warning:", err.message);
  }

  // 2. Ensure current 10-day settlement batch is reconciled with latest appointments
  try {
    await generate10DayPayoutBatches({ doctorId });
  } catch (batchErr) {
    console.warn("Auto batch reconciliation warning:", batchErr.message);
  }

  // 3. Query appointments ordered chronologically newest first
  let query = sql`
    SELECT 
      id, appointment_date, appointment_time, appointment_type, status,
      payment_status, final_fee, original_fee, commission_rate, commission_amount,
      commission_gst_amount, doctor_tds_amount, doctor_net_payable,
      financial_snapshot, settlement_status, completed_at, created_at
    FROM appointments
    WHERE doctor_id = ${doctorId}
    ORDER BY created_at DESC
  `;

  const rows = await query;
  const completed = rows.filter(r => r.status === 'completed' || r.payment_status === 'paid');

  let grossFees = 0;
  let totalCommission = 0;
  let totalTds = 0;
  let totalGst = 0;
  let netAccrued = 0;
  let totalSettled = 0;
  let pendingPayout = 0;

  const modeBreakdown = {
    clinic: { key: 'clinic', label: 'Clinic Visit', count: 0, gross: 0, commission: 0, tds: 0, gst: 0, net: 0 },
    video: { key: 'video', label: 'Video Consultation', count: 0, gross: 0, commission: 0, tds: 0, gst: 0, net: 0 },
    home_visit: { key: 'home_visit', label: 'Home Visit', count: 0, gross: 0, commission: 0, tds: 0, gst: 0, net: 0 },
  };

  const paidCompleted = [];

  completed.forEach(r => {
    let snap = r.financial_snapshot;
    if (typeof snap === 'string') {
      try { snap = JSON.parse(snap); } catch { snap = null; }
    }
    const fee = Number(snap?.professional_fee ?? (r.final_fee || r.original_fee || 0));
    const comm = Number(snap?.commission_amount ?? (r.commission_amount || fee * 0.18));
    const tds = Number(snap?.doctor_tds_amount ?? (r.doctor_tds_amount || (fee - comm) * 0.10));
    const gst = Number(snap?.commission_gst_amount ?? (r.commission_gst_amount || 0));
    const net = Number(snap?.doctor_net_payable ?? (r.doctor_net_payable || (fee - comm - tds)));

    // User rule: Exclude 0 or free consultations from financial earnings and transactions
    if (fee <= 0 && net <= 0) return;

    paidCompleted.push(r);

    grossFees += fee;
    totalCommission += comm;
    totalTds += tds;
    totalGst += gst;
    netAccrued += net;

    if (r.settlement_status === 'settled') {
      totalSettled += net;
    } else {
      pendingPayout += net;
    }

    const typeStr = String(r.appointment_type || '').toLowerCase();
    let modeKey = 'video';
    if (typeStr.includes('clinic') || typeStr.includes('person') || typeStr.includes('offline') || typeStr.includes('in_clinic')) {
      modeKey = 'clinic';
    } else if (typeStr.includes('home')) {
      modeKey = 'home_visit';
    }

    modeBreakdown[modeKey].count += 1;
    modeBreakdown[modeKey].gross += fee;
    modeBreakdown[modeKey].commission += comm;
    modeBreakdown[modeKey].tds += tds;
    modeBreakdown[modeKey].gst += gst;
    modeBreakdown[modeKey].net += net;
  });

  for (const k of ['clinic', 'video', 'home_visit']) {
    modeBreakdown[k].gross = toFixed2(modeBreakdown[k].gross);
    modeBreakdown[k].commission = toFixed2(modeBreakdown[k].commission);
    modeBreakdown[k].tds = toFixed2(modeBreakdown[k].tds);
    modeBreakdown[k].gst = toFixed2(modeBreakdown[k].gst);
    modeBreakdown[k].net = toFixed2(modeBreakdown[k].net);
  }

  // Fetch recent payout batches for this doctor
  const batches = await sql`
    SELECT *
    FROM doctor_payout_batches
    WHERE doctor_id = ${doctorId}
    ORDER BY period_start DESC
    LIMIT 20;
  `;

  // Fetch ledger entries for audit
  const ledgerEntries = await sql`
    SELECT *
    FROM doctor_financial_ledger
    WHERE doctor_id = ${doctorId}
    ORDER BY created_at DESC
    LIMIT 500;
  `;

  const [ledgerCountRow] = await sql`
    SELECT COUNT(*)::int as count
    FROM doctor_financial_ledger
    WHERE doctor_id = ${doctorId};
  `;
  const totalLedgerCount = ledgerCountRow?.count || 0;

  // Fetch doctor profile and verified bank information
  const [docProfile] = await sql`
    SELECT id, full_name, email, specialization, bank_account_details, consultation_fee, video_consultation_fee, clinic_consultation_fee
    FROM doctor_details
    WHERE id = ${doctorId}
    LIMIT 1;
  `;

  let doctorBank = docProfile?.bank_account_details;
  if (typeof doctorBank === 'string') {
    try { doctorBank = JSON.parse(doctorBank); } catch { doctorBank = null; }
  }
  if (!doctorBank && batches.length > 0 && batches[0].bank_snapshot) {
    try {
      doctorBank = typeof batches[0].bank_snapshot === 'string'
        ? JSON.parse(batches[0].bank_snapshot)
        : batches[0].bank_snapshot;
    } catch { doctorBank = null; }
  }

  return {
    success: true,
    data: {
      doctor: {
        id: docProfile?.id || doctorId,
        full_name: docProfile?.full_name || "Doctor",
        specialization: docProfile?.specialization || "General Physician",
        bank_details: doctorBank,
      },
      metrics: {
        gross_consultation_fees: toFixed2(grossFees),
        total_platform_commission: toFixed2(totalCommission),
        total_tds_withheld: toFixed2(totalTds),
        total_gst_on_platform_fee: toFixed2(totalGst),
        net_accrued_balance: toFixed2(netAccrued),
        total_settled_paid: toFixed2(totalSettled),
        pending_payout_balance: toFixed2(pendingPayout),
        total_completed_consultations: paidCompleted.length,
        mode_breakdown: modeBreakdown,
      },
      payout_batches: batches,
      recent_ledger_entries: ledgerEntries,
      total_ledger_count: totalLedgerCount,
      recent_bookings: paidCompleted.slice(0, 50),
    },
  };
}

/**
 * Get role-restricted admin platform financial report with 3-mode audit breakdown.
 */
export async function getAdminFinancialReport({
  startDate = null,
  endDate = null,
  doctorId = null,
  batchPeriod = null,
} = {}) {
  // Aggregate all completed appointments
  const appts = await sql`
    SELECT 
      a.id, a.doctor_id, a.patient_id, a.appointment_date, a.appointment_type, a.status,
      a.final_fee, a.commission_rate, a.commission_amount, a.commission_gst_amount,
      a.doctor_tds_amount, a.doctor_net_payable, a.settlement_status, a.financial_snapshot,
      d.full_name as doctor_name, d.specialization as doctor_specialization
    FROM appointments a
    LEFT JOIN doctor_details d ON d.id = a.doctor_id
    WHERE (a.status = 'completed' OR a.payment_status = 'paid')
      AND (${doctorId ? sql`a.doctor_id = ${doctorId}` : sql`1=1`})
      AND (${startDate ? sql`a.appointment_date >= ${startDate}::date` : sql`1=1`})
      AND (${endDate ? sql`a.appointment_date <= ${endDate}::date` : sql`1=1`})
    ORDER BY a.appointment_date DESC;
  `;

  let totalGross = 0;
  let totalCommission = 0;
  let totalGst = 0;
  let totalTds = 0;
  let totalDoctorPayable = 0;
  let totalSettled = 0;
  let totalOutstanding = 0;
  let totalPaidConsultations = 0;

  // 3-Mode Audit Module: Clinic Visit, Video Consultation, Home Visit
  const modeAudit = {
    clinic: { key: 'clinic', label: 'Clinic Visit', count: 0, gross: 0, commission: 0, gst: 0, tds: 0, net: 0 },
    video: { key: 'video', label: 'Video Consultation', count: 0, gross: 0, commission: 0, gst: 0, tds: 0, net: 0 },
    home_visit: { key: 'home_visit', label: 'Home Visit', count: 0, gross: 0, commission: 0, tds: 0, gst: 0, net: 0 },
  };

  appts.forEach(r => {
    let snap = r.financial_snapshot;
    if (typeof snap === 'string') {
      try { snap = JSON.parse(snap); } catch { snap = null; }
    }
    const fee = Number(snap?.professional_fee ?? (r.final_fee || 0));
    const comm = Number(snap?.commission_amount ?? (fee * 0.18));
    const gst = Number(snap?.commission_gst_amount ?? (comm * 0.18));
    const tds = Number(snap?.doctor_tds_amount ?? ((fee - comm) * 0.10));
    const net = Number(snap?.doctor_net_payable ?? (fee - comm - tds));

    // Exclude ₹0 / free appointments from paid financial audit calculations
    if (fee <= 0 && net <= 0) return;

    totalPaidConsultations += 1;
    totalGross += fee;
    totalCommission += comm;
    totalGst += gst;
    totalTds += tds;
    totalDoctorPayable += net;

    if (r.settlement_status === 'settled') {
      totalSettled += net;
    } else {
      totalOutstanding += net;
    }

    const typeStr = String(r.appointment_type || '').toLowerCase();
    let modeKey = 'video';
    if (typeStr.includes('clinic') || typeStr.includes('person') || typeStr.includes('offline') || typeStr.includes('in_clinic')) {
      modeKey = 'clinic';
    } else if (typeStr.includes('home')) {
      modeKey = 'home_visit';
    }

    modeAudit[modeKey].count += 1;
    modeAudit[modeKey].gross += fee;
    modeAudit[modeKey].commission += comm;
    modeAudit[modeKey].gst += gst;
    modeAudit[modeKey].tds += tds;
    modeAudit[modeKey].net += net;
  });

  // Precise 2-decimal rounding for audit
  for (const k of ['clinic', 'video', 'home_visit']) {
    modeAudit[k].gross = toFixed2(modeAudit[k].gross);
    modeAudit[k].commission = toFixed2(modeAudit[k].commission);
    modeAudit[k].gst = toFixed2(modeAudit[k].gst);
    modeAudit[k].tds = toFixed2(modeAudit[k].tds);
    modeAudit[k].net = toFixed2(modeAudit[k].net);
  }

  // Exact paisa audit reconciliation: Gross Volume = Platform Commission + GST (if charged on comm) + TDS + Doctor Net
  const auditReconciliation = {
    total_gross: toFixed2(totalGross),
    total_commission: toFixed2(totalCommission),
    total_gst: toFixed2(totalGst),
    total_tds: toFixed2(totalTds),
    total_net_payable: toFixed2(totalDoctorPayable),
    reconciled_sum: toFixed2(totalDoctorPayable + totalCommission + totalTds),
    variance_amount: toFixed2(totalGross - (totalDoctorPayable + totalCommission + totalTds)),
  };

  // Fetch batches with settlement proof details
  const batches = await sql`
    SELECT b.*, d.full_name as doctor_name
    FROM doctor_payout_batches b
    LEFT JOIN doctor_details d ON d.id = b.doctor_id
    WHERE (${doctorId ? sql`b.doctor_id = ${doctorId}` : sql`1=1`})
      AND (${batchPeriod ? sql`b.batch_period = ${batchPeriod}` : sql`1=1`})
    ORDER BY b.period_start DESC
    LIMIT 50;
  `;

  return {
    success: true,
    data: {
      platform_summary: {
        total_gross_volume: toFixed2(totalGross),
        net_platform_revenue: toFixed2(totalCommission),
        gst_collected: toFixed2(totalGst),
        tds_withheld: toFixed2(totalTds),
        total_doctor_payable: toFixed2(totalDoctorPayable),
        total_settled_paid: toFixed2(totalSettled),
        total_outstanding_payable: toFixed2(totalOutstanding),
        total_consultations: totalPaidConsultations,
      },
      mode_audit: modeAudit,
      audit_reconciliation: auditReconciliation,
      batches,
      transactions: appts.filter(a => Number(a.final_fee || 0) > 0).slice(0, 50),
    },
  };
}
