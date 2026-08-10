/**
 * LAYER-111: Financial Ledger — Phase 5 Hardened
 *
 * Append-only financial transaction log with:
 * - Direct HTTP fetch (schema cache bypass)
 * - Immutability enforced at DB trigger level
 * - Full audit trail integration
 * - Multi-service type support
 */

import { supabase } from '../supabaseAdmin';

// ─────────────────────────────────────────────────────────────────────────────
// Utility: wrapper around supabaseAdmin
// ─────────────────────────────────────────────────────────────────────────────
async function dbInsert(table, payload) {
  const { data, error } = await supabase.from(table).insert(payload).select();
  if (error) {
    throw new Error(`dbInsert ${table} failed: ${error.message}`);
  }
  return Array.isArray(data) ? data[0] : data;
}

async function dbSelect(table, filters = '', options = {}) {
  // Simplified since financialLedger queries are simple
  let query = supabase.from(table).select(options.select || '*', options.count ? { count: 'exact' } : {});
  
  if (filters) {
    // Basic filter parser for simple use cases like "patient_id=eq.123"
    const parts = filters.split('&');
    for (const part of parts) {
      const [col, opVal] = part.split('=');
      if (opVal && opVal.startsWith('eq.')) {
        query = query.eq(col, opVal.substring(3));
      }
    }
  }

  if (options.order) {
    const [col, dir] = options.order.split('.');
    query = query.order(col, { ascending: dir === 'asc' });
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error, count } = await query;
  if (error) {
    console.error(`dbSelect ${table} error:`, error.message);
    return options.count ? { data: [], count: 0 } : [];
  }

  if (options.count) {
    return { data: Array.isArray(data) ? data : [], count: count || 0 };
  }
  return Array.isArray(data) ? data : [];
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Create Ledger Entry (append-only)
// ─────────────────────────────────────────────────────────────────────────────
export async function createLedgerEntry({
  patient_id,
  care_episode_id = null,
  service_type,
  reference_id = null,
  debit_credit,
  amount,
  payment_mode = null,
  payment_gateway_id = null,
  status = 'initiated',
  description = null,
  metadata = null,
}) {
  try {
    if (!patient_id || !service_type || !debit_credit || amount === undefined) {
      return { success: false, error: 'patient_id, service_type, debit_credit, and amount are required' };
    }
    if (!['debit', 'credit'].includes(debit_credit)) {
      return { success: false, error: "debit_credit must be 'debit' or 'credit'" };
    }
    if (amount < 0) {
      return { success: false, error: 'amount must be >= 0' };
    }

    const data = await dbInsert('financial_transaction_log', {
      patient_id, care_episode_id, service_type, reference_id,
      debit_credit, amount, payment_mode, payment_gateway_id,
      status, description, metadata
    });

    // Non-blocking financial audit trail
    dbInsert('financial_audit_log', {
      entity_type:         'financial_transaction_log',
      entity_id:           data?.id || 'unknown',
      previous_state:      null,
      new_state:           { status, amount, debit_credit, service_type },
      change_description:  description || 'Ledger entry created'
    }, 'return=minimal').catch(() => {});

    return { success: true, data };
  } catch (err) {
    console.error('[FinancialLedger] createLedgerEntry error:', err.message);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Get Ledger by Care Episode
// ─────────────────────────────────────────────────────────────────────────────
export async function getLedgerByEpisode(care_episode_id) {
  try {
    const data = await dbSelect('financial_transaction_log', `care_episode_id=eq.${care_episode_id}`, { order: 'created_at.desc' });
    return { success: true, data };
  } catch (err) {
    console.error('[FinancialLedger] getLedgerByEpisode error:', err.message);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Get Ledger by Patient (paginated)
// ─────────────────────────────────────────────────────────────────────────────
export async function getLedgerByPatient(patient_id, options = {}) {
  try {
    const { service_type, status, page = 1, limit = 50 } = options;
    let filters = `patient_id=eq.${patient_id}`;
    if (service_type) filters += `&service_type=eq.${service_type}`;
    if (status)       filters += `&status=eq.${status}`;

    const { data, count } = await dbSelect('financial_transaction_log', filters, {
      order: 'created_at.desc',
      limit,
      count: true
    });

    return {
      success: true,
      data,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) }
    };
  } catch (err) {
    console.error('[FinancialLedger] getLedgerByPatient error:', err.message);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Enforce Ledger Presence (compliance gate before service dispatch)
// ─────────────────────────────────────────────────────────────────────────────
export async function enforceLedgerPresence(care_episode_id) {
  const rows = await dbSelect('financial_transaction_log',
    `care_episode_id=eq.${care_episode_id}&status=eq.success`,
    { select: 'id,status', limit: 1 }
  );
  if (!rows.length) {
    throw new Error('LEDGER_VIOLATION: Service dispatch blocked — no successful financial transaction found for this episode.');
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Record Refund Entry (creates credit entry in ledger)
// ─────────────────────────────────────────────────────────────────────────────
export async function recordRefundEntry({
  patient_id,
  care_episode_id,
  service_type,
  reference_id,
  amount,
  razorpay_refund_id,
  reason
}) {
  return createLedgerEntry({
    patient_id,
    care_episode_id,
    service_type,
    reference_id,
    debit_credit: 'debit',    // Debit = money going back to patient
    amount,
    payment_mode:         'razorpay_refund',
    payment_gateway_id:   razorpay_refund_id,
    status:               'refunded',
    description:          `Refund: ${reason}`,
    metadata:             { refund_id: razorpay_refund_id, reason }
  });
}
