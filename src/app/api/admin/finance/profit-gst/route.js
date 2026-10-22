import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { resolveCallerFromRequest } from '@/lib/layer1/authGuard';

export const dynamic = 'force-dynamic';

function toFixed2(val) {
  const num = Number(val) || 0;
  return Math.round(num * 100) / 100;
}

/**
 * Resolve start and end dates based on period preset.
 */
function resolveDateRange(period, dateFrom, dateTo) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed

  if (period === 'this_month') {
    const pad = (n) => String(n).padStart(2, '0');
    const start = `${y}-${pad(m + 1)}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const end = `${y}-${pad(m + 1)}-${pad(lastDay)}`;
    return { startDate: start, endDate: end, label: `This Month (${now.toLocaleString('default', { month: 'short' })} ${y})` };
  }

  if (period === 'last_month') {
    const pad = (n) => String(n).padStart(2, '0');
    const prevMonthDate = new Date(y, m - 1, 1);
    const prevY = prevMonthDate.getFullYear();
    const prevM = prevMonthDate.getMonth();
    const start = `${prevY}-${pad(prevM + 1)}-01`;
    const lastDay = new Date(prevY, prevM + 1, 0).getDate();
    const end = `${prevY}-${pad(prevM + 1)}-${pad(lastDay)}`;
    return { startDate: start, endDate: end, label: `Last Month (${prevMonthDate.toLocaleString('default', { month: 'short' })} ${prevY})` };
  }

  if (period === 'this_quarter') {
    const q = Math.floor(m / 3);
    const startM = q * 3;
    const endM = startM + 2;
    const pad = (n) => String(n).padStart(2, '0');
    const start = `${y}-${pad(startM + 1)}-01`;
    const lastDay = new Date(y, endM + 1, 0).getDate();
    const end = `${y}-${pad(endM + 1)}-${pad(lastDay)}`;
    return { startDate: start, endDate: end, label: `Q${q + 1} (${start} to ${end})` };
  }

  if (period === 'fy_current') {
    // Indian Financial Year: April 1 to March 31
    const fyStartYear = m >= 3 ? y : y - 1;
    const fyEndYear = fyStartYear + 1;
    const start = `${fyStartYear}-04-01`;
    const end = `${fyEndYear}-03-31`;
    return { startDate: start, endDate: end, label: `FY ${fyStartYear}-${String(fyEndYear).slice(2)}` };
  }

  if (period === 'fy_previous') {
    const fyStartYear = (m >= 3 ? y : y - 1) - 1;
    const fyEndYear = fyStartYear + 1;
    const start = `${fyStartYear}-04-01`;
    const end = `${fyEndYear}-03-31`;
    return { startDate: start, endDate: end, label: `FY ${fyStartYear}-${String(fyEndYear).slice(2)}` };
  }

  if (dateFrom && dateTo) {
    return { startDate: dateFrom, endDate: dateTo, label: `${dateFrom} to ${dateTo}` };
  }

  return { startDate: null, endDate: null, label: 'All Time' };
}

export async function GET(req) {
  try {
    const caller = await resolveCallerFromRequest(req);
    if (caller && caller.role !== 'admin') {
      return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'this_month';
    const dateFrom = searchParams.get('date_from') || null;
    const dateTo = searchParams.get('date_to') || null;
    const moduleFilter = searchParams.get('module') || 'all'; // 'all' | 'doctor' | 'lab' | 'chemist'

    const { startDate, endDate, label: periodLabel } = resolveDateRange(period, dateFrom, dateTo);

    // ── 1. DOCTOR DATA & PROFIT ───────────────────────────────────────────
    let doctorAppts = [];
    if (moduleFilter === 'all' || moduleFilter === 'doctor') {
      doctorAppts = await sql`
        SELECT 
          a.id, a.doctor_id, a.patient_id, a.appointment_date, a.appointment_type, a.status,
          a.final_fee, a.original_fee, a.commission_rate, a.commission_amount,
          a.commission_gst_amount, a.doctor_tds_amount, a.doctor_net_payable,
          a.settlement_status, a.financial_snapshot, a.created_at,
          d.full_name as doctor_name, d.specialization as doctor_specialization,
          p.full_name as patient_name
        FROM appointments a
        LEFT JOIN doctor_details d ON d.id = a.doctor_id
        LEFT JOIN patient_details p ON p.id = a.patient_id
        WHERE (a.status = 'completed' OR a.payment_status = 'paid')
          AND (${startDate ? sql`a.appointment_date >= ${startDate}::date` : sql`1=1`})
          AND (${endDate ? sql`a.appointment_date <= ${endDate}::date` : sql`1=1`})
        ORDER BY a.appointment_date DESC;
      `;
    }

    let docGmv = 0;
    let docProfit = 0;
    let docGst = 0;
    let docTds = 0;
    let docNetPayable = 0;
    let docSettledPaid = 0;
    let docPending = 0;
    let docCount = 0;

    const doctorTxns = [];

    doctorAppts.forEach(r => {
      let snap = r.financial_snapshot;
      if (typeof snap === 'string') {
        try { snap = JSON.parse(snap); } catch { snap = null; }
      }
      const fee = Number(snap?.professional_fee ?? (r.final_fee || r.original_fee || 0));
      if (fee <= 0) return; // Exclude free consults from commercial profit

      const comm = Number(snap?.commission_amount ?? (r.commission_amount || fee * 0.18));
      const gst = Number(snap?.commission_gst_amount ?? (comm * 0.18));
      const tds = Number(snap?.doctor_tds_amount ?? ((fee - comm) * 0.10));
      const net = Number(snap?.doctor_net_payable ?? (fee - comm - tds));

      docCount++;
      docGmv += fee;
      docProfit += comm;
      docGst += gst;
      docTds += tds;
      docNetPayable += net;

      const isSettled = r.settlement_status === 'settled';
      if (isSettled) {
        docSettledPaid += net;
      } else {
        docPending += net;
      }

      doctorTxns.push({
        id: r.id,
        module: 'Doctor',
        reference_type: 'Appointment',
        date: r.appointment_date || r.created_at,
        partner_name: r.doctor_name || 'Doctor',
        patient_name: r.patient_name || 'Patient',
        gross_gmv: toFixed2(fee),
        platform_profit: toFixed2(comm),
        gst_on_profit: toFixed2(gst),
        cgst_9: toFixed2(gst / 2),
        sgst_9: toFixed2(gst / 2),
        tds_withheld: toFixed2(tds),
        tds_section: '194J (10%)',
        net_partner_share: toFixed2(net),
        settlement_status: r.settlement_status || 'unsettled',
      });
    });

    // ── 2. LAB DATA & PROFIT ──────────────────────────────────────────────
    let labOrders = [];
    if (moduleFilter === 'all' || moduleFilter === 'lab') {
      labOrders = await sql`
        SELECT 
          o.id, o.lab_id, o.patient_id, o.status, o.payment_status, o.total_amount,
          o.settlement_status, o.created_at, o.scheduled_at,
          l.lab_name, l.phone_number as lab_phone, l.gst_number as lab_gst,
          p.full_name as patient_name,
          (
            SELECT COALESCE(json_agg(json_build_object(
              'price', oi.price,
              'commission_percentage', COALESCE(cat.commission_percentage, 20.00)
            )), '[]'::json)
            FROM lab_test_order_items oi
            LEFT JOIN lab_tests lt ON lt.id = oi.test_id
            LEFT JOIN lab_test_categories cat ON cat.id = lt.category_id
            WHERE oi.order_id = o.id
          ) as items
        FROM lab_test_orders o
        LEFT JOIN lab_details l ON l.id = o.lab_id
        LEFT JOIN patient_details p ON p.id = o.patient_id
        WHERE (o.status = 'delivered' OR o.status = 'completed' OR o.payment_status = 'paid')
          AND (${startDate ? sql`o.created_at::date >= ${startDate}::date` : sql`1=1`})
          AND (${endDate ? sql`o.created_at::date <= ${endDate}::date` : sql`1=1`})
        ORDER BY o.created_at DESC;
      `;
    }

    let labGmv = 0;
    let labProfit = 0;
    let labGst = 0;
    let labTds = 0;
    let labNetPayable = 0;
    let labSettledPaid = 0;
    let labPending = 0;
    let labCount = 0;

    const labTxns = [];

    labOrders.forEach(o => {
      const gross = Number(o.total_amount || 0);
      if (gross <= 0) return;

      let items = o.items || [];
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch { items = []; }
      }

      let comm = 0;
      if (items.length > 0) {
        for (const it of items) {
          const p = Number(it.price || 0);
          const r = Number(it.commission_percentage || 20.00);
          comm += Math.round((p * (r / 100)) * 100) / 100;
        }
      } else {
        comm = Math.round((gross * 0.20) * 100) / 100;
      }

      // Under Indian GST Law (Notification 12/2017-CT Rate Entry 74, Heading 9993), clinical diagnostic services are EXEMPT from GST (0%).
      // Direct consumer diagnostic bookings are also exempt from TDS under Indian Income Tax Act.
      const gst = 0.00;
      const tds = 0.00;
      const net = toFixed2(gross - comm);

      labCount++;
      labGmv += gross;
      labProfit += comm;
      labGst += gst;
      labTds += tds;
      labNetPayable += net;

      const isSettled = o.settlement_status === 'settled';
      if (isSettled) {
        labSettledPaid += net;
      } else {
        labPending += net;
      }

      labTxns.push({
        id: o.id,
        module: 'Diagnostic Lab',
        reference_type: 'Lab Test Order',
        date: o.created_at,
        partner_name: o.lab_name || 'Diagnostic Center',
        patient_name: o.patient_name || 'Patient',
        gross_gmv: toFixed2(gross),
        platform_profit: toFixed2(comm),
        gst_on_profit: 0.00,
        cgst_9: 0.00,
        sgst_9: 0.00,
        tds_withheld: 0.00,
        tds_section: 'Exempt (0%)',
        net_partner_share: toFixed2(net),
        settlement_status: o.settlement_status || 'unsettled',
      });
    });

    // ── 3. CHEMIST DATA & PROFIT ──────────────────────────────────────────
    let medOrders = [];
    if (moduleFilter === 'all' || moduleFilter === 'chemist') {
      medOrders = await sql`
        SELECT 
          o.id, o.chemist_id, o.patient_id, o.status, o.payment_status, o.total_amount,
          o.chemist_payout_amount, o.platform_commission_amount, o.settlement_status,
          o.created_at,
          c.pharmacy_name, c.mobile as chemist_phone,
          p.full_name as patient_name
        FROM medicine_orders o
        LEFT JOIN chemist_details c ON c.id = o.chemist_id
        LEFT JOIN patient_details p ON p.id = o.patient_id
        WHERE (o.status = 'delivered' OR o.status = 'approved' OR o.status = 'completed' OR o.payment_status = 'paid')
          AND (${startDate ? sql`o.created_at::date >= ${startDate}::date` : sql`1=1`})
          AND (${endDate ? sql`o.created_at::date <= ${endDate}::date` : sql`1=1`})
        ORDER BY o.created_at DESC;
      `;
    }

    let chemGmv = 0;
    let chemProfit = 0;
    let chemGst = 0;
    let chemTds = 0;
    let chemNetPayable = 0;
    let chemSettledPaid = 0;
    let chemPending = 0;
    let chemCount = 0;

    const chemTxns = [];

    medOrders.forEach(o => {
      const gross = Number(o.total_amount || 0);
      if (gross <= 0) return;

      const comm = Number(o.platform_commission_amount || (gross * 0.10));
      // Under Indian Tax laws, retail pharmacy sales have GST pre-levied at MRP.
      // Platform payouts to pharmacies are retail disbursements with 0% GST and 0% TDS.
      const gst = 0.00;
      const tds = 0.00;
      const net = toFixed2(gross - comm);

      chemCount++;
      chemGmv += gross;
      chemProfit += comm;
      chemGst += gst;
      chemTds += tds;
      chemNetPayable += net;

      const isSettled = o.settlement_status === 'settled';
      if (isSettled) {
        chemSettledPaid += net;
      } else {
        chemPending += net;
      }

      chemTxns.push({
        id: o.id,
        module: 'Pharmacy Chemist',
        reference_type: 'Medicine Order',
        date: o.created_at,
        partner_name: o.pharmacy_name || 'Retail Pharmacy',
        patient_name: o.patient_name || 'Patient',
        gross_gmv: toFixed2(gross),
        platform_profit: toFixed2(comm),
        gst_on_profit: 0.00,
        cgst_9: 0.00,
        sgst_9: 0.00,
        tds_withheld: 0.00,
        tds_section: 'Exempt (0%)',
        net_partner_share: toFixed2(net),
        settlement_status: o.settlement_status || 'unsettled',
      });
    });

    // ── 4. OVERALL PLATFORM CONSOLIDATION ──────────────────────────────────
    const totalGmv = toFixed2(docGmv + labGmv + chemGmv);
    const totalProfit = toFixed2(docProfit + labProfit + chemProfit);
    const totalGst = toFixed2(docGst); // Only Doctor platform fee has 18% GST; Lab & Chemist are 0%
    const totalCgst = toFixed2(totalGst / 2);
    const totalSgst = toFixed2(totalGst / 2);
    const totalTds = toFixed2(docTds); // Only Doctor professional fee has 10% TDS (Sec 194J); Lab & Chemist are 0%
    const totalNetPayable = toFixed2(docNetPayable + labNetPayable + chemNetPayable);
    const totalSettledPaid = toFixed2(docSettledPaid + labSettledPaid + chemSettledPaid);
    const totalPendingPayout = toFixed2(docPending + labPending + chemPending);
    const totalTxnCount = docCount + labCount + chemCount;

    // Fetch verified bank settlement history across modules
    const [docSettledBatches, labSettledBatches, chemSettledBatches] = await Promise.all([
      sql`
        SELECT b.*, d.full_name as partner_name, 'Doctor' as module
        FROM doctor_payout_batches b
        LEFT JOIN doctor_details d ON d.id = b.doctor_id
        WHERE (${startDate ? sql`b.period_start >= ${startDate}::date` : sql`1=1`})
          AND (${endDate ? sql`b.period_end <= ${endDate}::date` : sql`1=1`})
        ORDER BY b.period_start DESC LIMIT 20;
      `,
      sql`
        SELECT b.*, l.lab_name as partner_name, 'Diagnostic Lab' as module
        FROM lab_payout_batches b
        LEFT JOIN lab_details l ON l.id = b.lab_id
        WHERE (${startDate ? sql`b.period_start >= ${startDate}::date` : sql`1=1`})
          AND (${endDate ? sql`b.period_end <= ${endDate}::date` : sql`1=1`})
        ORDER BY b.period_start DESC LIMIT 20;
      `,
      sql`
        SELECT b.*, c.pharmacy_name as partner_name, 'Pharmacy Chemist' as module
        FROM chemist_payout_batches b
        LEFT JOIN chemist_details c ON c.id = b.chemist_id
        WHERE (${startDate ? sql`b.period_start >= ${startDate}::date` : sql`1=1`})
          AND (${endDate ? sql`b.period_end <= ${endDate}::date` : sql`1=1`})
        ORDER BY b.period_start DESC LIMIT 20;
      `,
    ]);

    // Combine transactions chronologically newest first
    const allTransactions = [...doctorTxns, ...labTxns, ...chemTxns].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return NextResponse.json({
      success: true,
      data: {
        filter: {
          period,
          date_from: startDate,
          date_to: endDate,
          label: periodLabel,
          module: moduleFilter,
        },
        kpis: {
          total_platform_profit: totalProfit,
          total_gst_liability: totalGst,
          total_cgst: totalCgst,
          total_sgst: totalSgst,
          total_taxable_value: toFixed2(docProfit),
          total_exempt_turnover: toFixed2(labGmv + chemGmv),
          total_invoice_with_gst: toFixed2(totalProfit + totalGst),
          total_gross_gmv: totalGmv,
          total_tds_withheld: totalTds,
          total_partner_payable: totalNetPayable,
          total_disbursed_paid: totalSettledPaid,
          total_pending_payout: totalPendingPayout,
          total_transactions: totalTxnCount,
        },
        ca_tax_summary: {
          sac_code: "998399",
          service_description: "Healthcare Technology Intermediation & Doctor Teleconsultation Aggregator Services",
          gst_rate: "18%",
          cgst_rate: "9%",
          sgst_rate: "9%",
          taxable_turnover: toFixed2(docProfit),
          exempt_turnover: toFixed2(labGmv + chemGmv),
          cgst_amount: totalCgst,
          sgst_amount: totalSgst,
          total_output_gst: totalGst,
          tds_breakdown: {
            section_194J_doctor: { rate: "10%", base: toFixed2(docGmv - docProfit), tds: toFixed2(docTds), status: "Active (Section 194J Compliant)" },
            diagnostic_lab: { rate: "0%", base: toFixed2(labGmv), tds: 0.00, status: "Exempt (SAC 9993 / Notif 12/2017)" },
            pharmacy_chemist: { rate: "0%", base: toFixed2(chemGmv), tds: 0.00, status: "Exempt (Retail Supply Fulfillment)" },
            total_tds: totalTds,
          },
          statutory_notes: [
            "Diagnostic Laboratories: 100% EXEMPT from GST under Heading 9993 / Notification No. 12/2017-Central Tax (Rate) Entry 74 (Healthcare services by clinical establishments).",
            "Pharmacy Chemists: Supply of medicines is covered by retailer/manufacturer GST at MRP. Payout disbursements are exempt from platform GST and TDS.",
            "Doctor Consultations: Professional fees covered under Section 194J (10% TDS). Platform technology fee attracts 18% GST under SAC 998399."
          ]
        },
        module_breakdown: {
          doctor: {
            module_name: "Doctor Consultations",
            count: docCount,
            gmv: toFixed2(docGmv),
            profit: toFixed2(docProfit),
            gst: toFixed2(docGst),
            cgst: toFixed2(docGst / 2),
            sgst: toFixed2(docGst / 2),
            gst_status: "18% Output GST on Platform Fee",
            tds: toFixed2(docTds),
            tds_section: "194J (10%)",
            net_payable: toFixed2(docNetPayable),
            settled_paid: toFixed2(docSettledPaid),
            pending: toFixed2(docPending),
          },
          lab: {
            module_name: "Diagnostic Labs",
            count: labCount,
            gmv: toFixed2(labGmv),
            profit: toFixed2(labProfit),
            gst: 0.00,
            cgst: 0.00,
            sgst: 0.00,
            gst_status: "Exempt (0% - Notif 12/2017 SAC 9993)",
            tds: 0.00,
            tds_section: "Exempt (0%)",
            net_payable: toFixed2(labNetPayable),
            settled_paid: toFixed2(labSettledPaid),
            pending: toFixed2(labPending),
          },
          chemist: {
            module_name: "Pharmacy Chemists",
            count: chemCount,
            gmv: toFixed2(chemGmv),
            profit: toFixed2(chemProfit),
            gst: 0.00,
            cgst: 0.00,
            sgst: 0.00,
            gst_status: "Exempt (0% - Retail Medicine Supply)",
            tds: 0.00,
            tds_section: "Exempt (0%)",
            net_payable: toFixed2(chemNetPayable),
            settled_paid: toFixed2(chemSettledPaid),
            pending: toFixed2(chemPending),
          },
        },
        settled_batches: [
          ...docSettledBatches,
          ...labSettledBatches,
          ...chemSettledBatches,
        ].sort((a, b) => new Date(b.period_start).getTime() - new Date(a.period_start).getTime()),
        transactions: allTransactions.slice(0, 100),
      },
    }, { status: 200 });

  } catch (error) {
    console.error("GET /api/admin/finance/profit-gst error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
