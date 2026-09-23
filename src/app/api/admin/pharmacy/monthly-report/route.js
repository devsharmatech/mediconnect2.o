import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders() });
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1), 10);
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);

  return generatePlatformMonthlyReport({ month, year });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const month = parseInt(body.month || String(new Date().getMonth() + 1), 10);
    const year = parseInt(body.year || String(new Date().getFullYear()), 10);

    return generatePlatformMonthlyReport({ month, year });
  } catch (err) {
    return failure("Invalid request body", err.message, 400);
  }
}

async function generatePlatformMonthlyReport({ month, year }) {
  try {
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const periodLabel = `${monthNames[month - 1]} ${year}`;

    // 1. Query all orders within period
    const { data: orders, error: ordersErr } = await supabase
      .from("medicine_orders")
      .select(`
        id,
        unid,
        patient_id,
        chemist_id,
        status,
        total_amount,
        sla_status,
        created_at,
        actual_delivery_at,
        chemist:chemist_id(
          id,
          pharmacy_name
        )
      `)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    if (ordersErr) throw ordersErr;

    const allOrders = orders || [];

    // 2. Metrics Calculation
    const completedStatuses = ["delivered", "completed"];
    const completedOrders = allOrders.filter(o => completedStatuses.includes(String(o.status).toLowerCase()));
    
    // Distinct patients served across completed orders
    const distinctPatients = new Set(completedOrders.map(o => o.patient_id).filter(Boolean));

    // Gross Transaction Value (Total Transaction Value)
    const totalTransactionValue = completedOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    // Refunds
    const refundedOrders = allOrders.filter(o => String(o.status).toLowerCase() === "refunded");
    const totalRefunds = refundedOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    // Commission & Settlement
    const commissionRate = 0.05; // 5% MediConnect revenue
    const totalMediConnectRevenue = parseFloat((totalTransactionValue * commissionRate).toFixed(2));
    const totalPharmacySettlement = parseFloat((totalTransactionValue - totalRefunds - totalMediConnectRevenue).toFixed(2));

    // SLA Breaches
    const totalSlaBreaches = allOrders.filter(o => o.sla_status === "SLA_BREACHED").length;

    // 3. Pharmacy Breakdown
    const pharmacyMap = {};
    for (const order of completedOrders) {
      const chemId = order.chemist_id || "unassigned";
      const chemName = order.chemist?.pharmacy_name || "Unknown Pharmacy";

      if (!pharmacyMap[chemId]) {
        pharmacyMap[chemId] = {
          chemist_id: chemId,
          pharmacy_name: chemName,
          completed_orders_count: 0,
          gross_amount: 0,
          commission: 0,
          net_settlement: 0,
          sla_breaches: 0,
        };
      }
      const amt = Number(order.total_amount || 0);
      pharmacyMap[chemId].completed_orders_count += 1;
      pharmacyMap[chemId].gross_amount += amt;
    }

    // Add SLA breaches to pharmacy breakdown
    for (const order of allOrders) {
      if (order.sla_status === "SLA_BREACHED" && order.chemist_id && pharmacyMap[order.chemist_id]) {
        pharmacyMap[order.chemist_id].sla_breaches += 1;
      }
    }

    const pharmacyBreakdown = Object.values(pharmacyMap).map(p => {
      const commission = parseFloat((p.gross_amount * commissionRate).toFixed(2));
      const net = parseFloat((p.gross_amount - commission).toFixed(2));
      return {
        ...p,
        gross_amount: parseFloat(p.gross_amount.toFixed(2)),
        commission,
        net_settlement: net
      };
    });

    // 4. Assemble Platform Totals per Section 12
    const report = {
      report_type: "PLATFORM_MONTHLY_PHARMACY_SETTLEMENT_TOTALS",
      compliance: "V3_MASTER_SPECIFICATION_SECTION_12",
      report_period: {
        month,
        year,
        label: periodLabel,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      },
      platform_monthly_totals: {
        total_patients_served: distinctPatients.size,
        total_e_pharmacy_orders: allOrders.length,
        total_completed_orders: completedOrders.length,
        total_transaction_value: parseFloat(totalTransactionValue.toFixed(2)),
        total_refunds: parseFloat(totalRefunds.toFixed(2)),
        total_pharmacy_settlement: totalPharmacySettlement,
        total_mediconnect_revenue: totalMediConnectRevenue,
        total_sla_breaches: totalSlaBreaches,
        currency: "INR"
      },
      pharmacy_breakdown: pharmacyBreakdown
    };

    return success("Platform monthly pharmacy report generated successfully", report, 200, {
      headers: corsHeaders()
    });

  } catch (err) {
    console.error("Platform monthly report error:", err);
    return failure("Failed to generate platform report", err.message, 500, {
      headers: corsHeaders()
    });
  }
}
