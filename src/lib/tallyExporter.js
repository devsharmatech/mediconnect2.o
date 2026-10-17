import sql from '@/lib/db';

/**
 * Fetch active Tally ledger mapping configuration.
 */
export async function getTallyMapping() {
  const [mapping] = await sql`
    SELECT * 
    FROM tally_ledger_mappings 
    WHERE is_active = true 
    ORDER BY updated_at DESC 
    LIMIT 1;
  `;
  if (mapping) return mapping;

  return {
    company_name: 'MediConnect Healthtech Solutions Pvt Ltd',
    lab_payable_ledger: 'PRL Laboratory / Diagnostic Payables',
    commission_income_ledger: 'MediConnect Platform Commission',
    tds_ledger: 'TDS Payable u/s 194C/194J',
    bank_ledger: 'HDFC Bank Ltd - Main Disbursal',
    journal_voucher_type: 'Journal',
    payment_voucher_type: 'Payment',
  };
}

/**
 * Save or update Tally ledger mapping configuration.
 */
export async function saveTallyMapping(config) {
  const {
    company_name,
    lab_payable_ledger,
    commission_income_ledger,
    tds_ledger,
    bank_ledger,
    journal_voucher_type,
    payment_voucher_type,
  } = config;

  const [existing] = await sql`SELECT id FROM tally_ledger_mappings LIMIT 1;`;
  if (existing) {
    const [updated] = await sql`
      UPDATE tally_ledger_mappings
      SET
        company_name = ${company_name || 'MediConnect Healthtech Solutions Pvt Ltd'},
        lab_payable_ledger = ${lab_payable_ledger || 'PRL Laboratory / Diagnostic Payables'},
        commission_income_ledger = ${commission_income_ledger || 'MediConnect Platform Commission'},
        tds_ledger = ${tds_ledger || 'TDS Payable u/s 194C/194J'},
        bank_ledger = ${bank_ledger || 'HDFC Bank Ltd - Main Disbursal'},
        journal_voucher_type = ${journal_voucher_type || 'Journal'},
        payment_voucher_type = ${payment_voucher_type || 'Payment'},
        updated_at = NOW()
      WHERE id = ${existing.id}
      RETURNING *;
    `;
    return updated;
  } else {
    const [inserted] = await sql`
      INSERT INTO tally_ledger_mappings (
        company_name, lab_payable_ledger, commission_income_ledger, tds_ledger,
        bank_ledger, journal_voucher_type, payment_voucher_type
      ) VALUES (
        ${company_name || 'MediConnect Healthtech Solutions Pvt Ltd'},
        ${lab_payable_ledger || 'PRL Laboratory / Diagnostic Payables'},
        ${commission_income_ledger || 'MediConnect Platform Commission'},
        ${tds_ledger || 'TDS Payable u/s 194C/194J'},
        ${bank_ledger || 'HDFC Bank Ltd - Main Disbursal'},
        ${journal_voucher_type || 'Journal'},
        ${payment_voucher_type || 'Payment'}
      )
      RETURNING *;
    `;
    return inserted;
  }
}

/**
 * Format Date as YYYYMMDD for Tally XML
 */
function toTallyDate(dateVal) {
  try {
    const d = new Date(dateVal || Date.now());
    if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  } catch {
    return '20261017';
  }
}

/**
 * Escape XML special characters
 */
function escapeXml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate TallyPrime-compliant XML for a settlement batch.
 * Strictly ignores GST per user instructions.
 */
export function generateTallyVoucherXml({ batch, mapping, orders = [] }) {
  const map = mapping || {};
  const company = escapeXml(map.company_name || 'MediConnect Healthtech Solutions Pvt Ltd');
  const labPayable = escapeXml(map.lab_payable_ledger || 'PRL Laboratory / Diagnostic Payables');
  const commIncome = escapeXml(map.commission_income_ledger || 'MediConnect Platform Commission');
  const tdsLedger = escapeXml(map.tds_ledger || 'TDS Payable u/s 194C/194J');
  const bankLedger = escapeXml(map.bank_ledger || 'HDFC Bank Ltd - Main Disbursal');
  const journalType = escapeXml(map.journal_voucher_type || 'Journal');
  const paymentType = escapeXml(map.payment_voucher_type || 'Payment');

  const vchDate = toTallyDate(batch.period_end || batch.completed_at || batch.created_at);
  const vchNumber = escapeXml(batch.batch_period || `BATCH-${String(batch.id).slice(0, 8)}`);
  const labName = escapeXml(batch.lab_name || 'Diagnostic Partner');
  const utr = escapeXml(batch.utr_number || batch.payout_reference || '');

  const gross = Number(batch.gross_orders_amount ?? batch.total_order_amount ?? 0).toFixed(2);
  const comm = Number(batch.total_platform_commission ?? batch.total_commission_amount ?? 0).toFixed(2);
  const tds = Number(batch.total_tds ?? batch.tds_amount ?? 0).toFixed(2);
  const net = Number(batch.net_payout ?? batch.net_payable_amount ?? 0).toFixed(2);

  const isPaid = batch.status === 'paid';

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <!-- ── VOUCHER 1: DIAGNOSTIC SETTLEMENT JOURNAL ENTRY ── -->
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="${journalType}" ACTION="Create" OBJVIEW="Accounting Voucher View">
            <DATE>${vchDate}</DATE>
            <VOUCHERTYPENAME>${journalType}</VOUCHERTYPENAME>
            <VOUCHERNUMBER>MC-JRN-${vchNumber}</VOUCHERNUMBER>
            <REFERENCE>${vchNumber}</REFERENCE>
            <NARRATION>Diagnostic Lab Settlement for ${labName} (${vchNumber}). Gross: Rs.${gross}, Platform Fee: Rs.${comm}, TDS 2%: Rs.${tds}, Disbursable: Rs.${net}. Reviewed by ${escapeXml(batch.reviewed_by || 'Finance')}, Approved by ${escapeXml(batch.approved_by || 'Admin')}.</NARRATION>
            <PARTYLEDGERNAME>${labPayable}</PARTYLEDGERNAME>
            <EFFECTIVEDATE>${vchDate}</EFFECTIVEDATE>

            <!-- Debit: Partner Diagnostic Payables (Gross Volume) -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${labPayable}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${gross}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>

            <!-- Credit: MediConnect Platform Commission Income -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${commIncome}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${comm}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>

            <!-- Credit: TDS Payable under Section 194C/194J (2%) -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${tdsLedger}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${tds}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>

            <!-- Credit: Settlement Clearing / Net Payable -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Partner Settlement Clearing</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${net}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
`;

  // If paid, append Bank Disbursement Payment Voucher
  if (isPaid && Number(net) > 0) {
    const payDate = toTallyDate(batch.completed_at || batch.updated_at);
    xml += `
        <!-- ── VOUCHER 2: BANK DISBURSEMENT PAYMENT VOUCHER ── -->
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="${paymentType}" ACTION="Create" OBJVIEW="Accounting Voucher View">
            <DATE>${payDate}</DATE>
            <VOUCHERTYPENAME>${paymentType}</VOUCHERTYPENAME>
            <VOUCHERNUMBER>MC-PAY-${vchNumber}</VOUCHERNUMBER>
            <REFERENCE>${utr || vchNumber}</REFERENCE>
            <NARRATION>Bank Disbursement to ${labName} for ${vchNumber} via ${escapeXml(batch.payment_mode || 'NEFT')}. Bank UTR: ${utr}. Settled by ${escapeXml(batch.settled_by || 'Finance')}.</NARRATION>
            <PARTYLEDGERNAME>Partner Settlement Clearing</PARTYLEDGERNAME>
            <EFFECTIVEDATE>${payDate}</EFFECTIVEDATE>

            <!-- Debit: Partner Settlement Clearing -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Partner Settlement Clearing</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${net}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>

            <!-- Credit: Bank Account -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${bankLedger}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${net}</AMOUNT>
              <BANKPAYMENTDETAILS.LIST>
                <PAYMENTFAVOURING>${labName}</PAYMENTFAVOURING>
                <TRANSACTIONTYPE>${escapeXml(batch.payment_mode || 'NEFT')}</TRANSACTIONTYPE>
                <INSTRUMENTNUMBER>${utr}</INSTRUMENTNUMBER>
                <INSTRUMENTDATE>${payDate}</INSTRUMENTDATE>
              </BANKPAYMENTDETAILS.LIST>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
`;
  }

  xml += `      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

  return xml;
}

/**
 * Generate Tally Standard CSV fallback for direct spreadsheet or Tally import.
 */
export function generateTallyVoucherCsv({ batch, mapping }) {
  const map = mapping || {};
  const labPayable = map.lab_payable_ledger || 'PRL Laboratory / Diagnostic Payables';
  const commIncome = map.commission_income_ledger || 'MediConnect Platform Commission';
  const tdsLedger = map.tds_ledger || 'TDS Payable u/s 194C/194J';
  const bankLedger = map.bank_ledger || 'HDFC Bank Ltd - Main Disbursal';

  const dateStr = batch.period_end || new Date().toISOString().slice(0, 10);
  const vchNum = batch.batch_period || `BATCH-${String(batch.id).slice(0, 8)}`;
  const labName = (batch.lab_name || 'Diagnostic Partner').replace(/,/g, ' ');
  const utr = batch.utr_number || batch.payout_reference || '';

  const gross = Number(batch.gross_orders_amount ?? batch.total_order_amount ?? 0).toFixed(2);
  const comm = Number(batch.total_platform_commission ?? batch.total_commission_amount ?? 0).toFixed(2);
  const tds = Number(batch.total_tds ?? batch.tds_amount ?? 0).toFixed(2);
  const net = Number(batch.net_payout ?? batch.net_payable_amount ?? 0).toFixed(2);

  const rows = [
    ['Date', 'Voucher Type', 'Voucher Number', 'Debit Ledger', 'Credit Ledger', 'Amount', 'Narration', 'Reference / UTR', 'Partner Name'],
    [dateStr, 'Journal', `MC-JRN-${vchNum}`, labPayable, commIncome, comm, `Platform commission fee for ${vchNum}`, vchNum, labName],
    [dateStr, 'Journal', `MC-JRN-${vchNum}`, labPayable, tdsLedger, tds, `TDS 2% deduction for ${vchNum}`, vchNum, labName],
    [dateStr, 'Journal', `MC-JRN-${vchNum}`, labPayable, 'Partner Settlement Clearing', net, `Net settlement payable for ${vchNum}`, vchNum, labName],
  ];

  if (batch.status === 'paid' && Number(net) > 0) {
    const payDate = batch.completed_at ? new Date(batch.completed_at).toISOString().slice(0, 10) : dateStr;
    rows.push([
      payDate,
      'Payment',
      `MC-PAY-${vchNum}`,
      'Partner Settlement Clearing',
      bankLedger,
      net,
      `Payout disbursed via ${batch.payment_mode || 'NEFT'} UTR: ${utr}`,
      utr,
      labName,
    ]);
  }

  return rows.map(r => r.join(',')).join('\n');
}

/**
 * Record a Tally export job in AWS RDS PostgreSQL.
 */
export async function recordTallyExportJob({
  batchId,
  format = 'XML',
  voucherType = 'Combined',
  totalVouchers = 1,
  totalAmount = 0.00,
  fileContent,
  exportedBy = 'Admin',
}) {
  const idempotencyKey = `tally_exp_${batchId}_${format.toLowerCase()}_${Date.now()}`;
  const [job] = await sql`
    INSERT INTO tally_export_jobs (
      batch_id, export_format, voucher_type, total_vouchers,
      total_amount, file_content, status, idempotency_key, exported_by,
      created_at, updated_at
    ) VALUES (
      ${batchId}, ${format}, ${voucherType}, ${totalVouchers},
      ${totalAmount}, ${fileContent}, 'exported', ${idempotencyKey}, ${exportedBy},
      NOW(), NOW()
    )
    RETURNING *;
  `;
  return job;
}
