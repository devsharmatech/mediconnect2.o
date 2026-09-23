import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders() });
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const chemist_id = searchParams.get("chemist_id");
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1), 10);
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);

  return generateMonthlyReport({ chemist_id, month, year });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const chemist_id = body.chemist_id;
    const month = parseInt(body.month || String(new Date().getMonth() + 1), 10);
    const year = parseInt(body.year || String(new Date().getFullYear()), 10);

    return generateMonthlyReport({ chemist_id, month, year });
  } catch (err) {
    return failure("Invalid request body", err.message, 400);
  }
}

async function generateMonthlyReport({ chemist_id, month, year }) {
  if (!chemist_id) {
    return failure("chemist_id is required", null, 400);
  }

  try {
    // 1. Fetch Chemist Profile
    const { data: chemist, error: chemistErr } = await supabase
      .from("chemist_details")
      .select("id, pharmacy_name, owner_name, gstin, address, rating, total_reviews")
      .eq("id", chemist_id)
      .maybeSingle();

    if (chemistErr || !chemist) {
      return failure("Chemist profile not found", null, 404);
    }

    // 2. Define Date Range (UTC)
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const periodLabel = `${monthNames[month - 1]} ${year}`;

    // 3. Fetch all orders for this chemist in the time window
    const { data: orders, error: ordersErr } = await supabase
      .from("medicine_orders")
      .select(`
        id,
        unid,
        status,
        total_amount,
        medicine_subtotal,
        delivery_charge,
        discount,
        sla_status,
        prescription_id,
        created_at,
        actual_delivery_at
      `)
      .eq("chemist_id", chemist_id)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    if (ordersErr) throw ordersErr;

    const allOrders = orders || [];

    // 4. Calculate Fulfilled vs Exception Metrics
    const completedStatuses = ["delivered", "completed"];
    const exceptionStatuses = [
      "cancelled",
      "rejected",
      "pharmacy_unable_to_fulfil",
      "delivery_failed",
      "refunded"
    ];

    const completedOrders = allOrders.filter(o => completedStatuses.includes(String(o.status).toLowerCase()));
    const prescriptionLinkedOrders = completedOrders.filter(o => !!o.prescription_id);
    const exceptionOrders = allOrders.filter(o => exceptionStatuses.includes(String(o.status).toLowerCase()));

    // Gross Transaction Value (GTV) - Only actual fulfilled transactions per Section 12
    const grossTransactionValue = completedOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    // Refunds Calculation
    const refundedOrders = allOrders.filter(o => String(o.status).toLowerCase() === "refunded");
    const refundsAmount = refundedOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    // Platform Commission (Agreed rate: 5% default, non-selected excluded)
    const commissionRate = 0.05; // 5% MediConnect service commission
    const mediconnectRevenue = parseFloat((grossTransactionValue * commissionRate).toFixed(2));

    // Net Pharmacy Settlement Amount (Gross - Refunds - Platform Commission)
    const pharmacySettlementAmount = parseFloat((grossTransactionValue - refundsAmount - mediconnectRevenue).toFixed(2));

    // SLA Breaches
    const slaBreachesCount = allOrders.filter(o => o.sla_status === "SLA_BREACHED").length;

    // 5. Query Non-Selected Quotes (Audit only - strictly excluded from revenue/settlement)
    const { count: nonSelectedQuotesCount } = await supabase
      .from("medicine_order_quotes")
      .select("id", { count: "exact", head: true })
      .eq("chemist_id", chemist_id)
      .eq("status", "not_selected")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    // 6. Assemble Financial Report Payload
    const report = {
      report_type: "CHEMIST_MONTHLY_FINANCIAL_SETTLEMENT",
      compliance: "V3_MASTER_SPECIFICATION_SECTION_12",
      report_period: {
        month,
        year,
        label: periodLabel,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      },
      pharmacy: {
        id: chemist.id,
        pharmacy_name: chemist.pharmacy_name,
        owner_name: chemist.owner_name,
        gstin: chemist.gstin || "N/A",
        address: chemist.address
      },
      financial_reconciliation: {
        completed_e_pharmacy_orders: completedOrders.length,
        completed_prescription_linked_orders: prescriptionLinkedOrders.length,
        gross_transaction_value: parseFloat(grossTransactionValue.toFixed(2)),
        refunds_count: refundedOrders.length,
        refunds_amount: parseFloat(refundsAmount.toFixed(2)),
        commission_rate_percentage: commissionRate * 100,
        mediconnect_commission_revenue: mediconnectRevenue,
        pharmacy_net_settlement_amount: pharmacySettlementAmount,
        currency: "INR"
      },
      operational_quality: {
        sla_breaches_count: slaBreachesCount,
        cancellations_and_exceptions_count: exceptionOrders.length,
        patient_satisfaction_rating: chemist.rating || 5.0,
        total_reviews_count: chemist.total_reviews || 0
      },
      audit_records: {
        non_selected_offers_retained: nonSelectedQuotesCount || 0,
        note: "Non-selected offers are preserved for auditability and strictly excluded from gross value, pharmacy sales, and settlement."
      }
    };

    return success("Monthly pharmacy report generated successfully", report, 200, {
      headers: corsHeaders()
    });

  } catch (err) {
    console.error("Monthly report error:", err);
    return failure("Failed to generate monthly report", err.message, 500, {
      headers: corsHeaders()
    });
  }
}
