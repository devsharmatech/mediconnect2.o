export const dynamic = 'force-dynamic';

import sql from "@/lib/db";
import { corsHeaders } from "@/lib/cors";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

let memoryCache = { data: null, timestamp: 0, key: '' };
const CACHE_DURATION = 10 * 1000; // 10 seconds cache for snappy responsiveness

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || 'all';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const cacheKey = `${dateRange}_${startDate || ''}_${endDate || ''}`;
    if (memoryCache.data && memoryCache.key === cacheKey && Date.now() - memoryCache.timestamp < CACHE_DURATION) {
      return new Response(JSON.stringify({ success: true, data: memoryCache.data }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Determine date boundaries based on dateRange filter
    let start = null;
    let end = dayjs().endOf('day');
    const today = dayjs();

    switch (dateRange) {
      case 'today':
        start = today.startOf('day');
        break;
      case 'week':
        start = today.subtract(7, 'day').startOf('day');
        break;
      case 'month':
        start = today.subtract(1, 'month').startOf('day');
        break;
      case 'quarter':
        start = today.subtract(3, 'month').startOf('day');
        break;
      case 'year':
        start = today.subtract(1, 'year').startOf('day');
        break;
      case 'custom':
        start = startDate ? dayjs(startDate).startOf('day') : today.subtract(7, 'day').startOf('day');
        end = endDate ? dayjs(endDate).endOf('day') : today.endOf('day');
        break;
      case 'all':
      default:
        start = null;
        break;
    }

    const sevenDaysAgo = dayjs().subtract(6, 'day').startOf('day');
    const sevenMonthsAgo = dayjs().subtract(6, 'month').startOf('month');
    const todayStr = dayjs().format('YYYY-MM-DD');

    // 1. Base counts & metrics executed concurrently in AWS RDS PostgreSQL
    const [
      [{ count: totalPatients }],
      [{ count: totalDoctors }],
      [{ count: totalLabs }],
      [{ count: totalChemists }],
      [{ count: totalPharmacists }],
      appointmentsCountRes,
      revenueRes,
      todayApptsRes,
      pendingRxRes,
      todayRxRes,
      todayLabRxRes,
      followUpRes,
      emergencyApptsRes,
      callDurationsRes,
      ratingsRes,
      labMetricsRes,
      popularTestsRes,
      patientsDOBRes,
      weeklyApptsRes,
      monthlyTxRes,
      recentLogsRes
    ] = await Promise.all([
      // Total registered entities (Cumulative platform counts)
      sql`SELECT count(*)::int as count FROM patient_details`,
      sql`SELECT count(*)::int as count FROM doctor_details`,
      sql`SELECT count(*)::int as count FROM lab_details`,
      sql`SELECT count(*)::int as count FROM chemist_details`,
      sql`SELECT count(*)::int as count FROM pharmacist_details`,

      // Appointments count based on selected filter
      start
        ? sql`
            SELECT count(*)::int as count 
            FROM appointments 
            WHERE (created_at >= ${start.toISOString()} AND created_at <= ${end.toISOString()})
               OR (appointment_date >= ${start.format('YYYY-MM-DD')}::date AND appointment_date <= ${end.format('YYYY-MM-DD')}::date)
          `
        : sql`SELECT count(*)::int as count FROM appointments`,

      // Revenue based on selected filter
      start
        ? sql`
            SELECT COALESCE(SUM(amount), 0)::numeric as total
            FROM financial_transaction_log
            WHERE status IN ('success', 'completed')
              AND created_at >= ${start.toISOString()}
              AND created_at <= ${end.toISOString()}
          `
        : sql`
            SELECT COALESCE(SUM(amount), 0)::numeric as total
            FROM financial_transaction_log
            WHERE status IN ('success', 'completed')
          `,

      // Today's appointments
      sql`
        SELECT count(*)::int as count 
        FROM appointments 
        WHERE appointment_date = ${todayStr}::date OR created_at::date = ${todayStr}::date
      `,

      // Prescriptions pending
      sql`SELECT count(*)::int as count FROM prescriptions WHERE status IN ('draft', 'active') OR is_draft = true`,

      // Prescriptions today
      sql`SELECT count(*)::int as count FROM prescriptions WHERE created_at::date = ${todayStr}::date`,

      // Prescriptions with lab tests today
      sql`
        SELECT count(*)::int as count 
        FROM prescriptions 
        WHERE created_at::date = ${todayStr}::date 
          AND lab_tests IS NOT NULL 
          AND jsonb_array_length(CASE WHEN jsonb_typeof(lab_tests) = 'array' THEN lab_tests ELSE '[]'::jsonb END) > 0
      `,

      // Follow-up compliance stats
      sql`
        SELECT 
          count(*) filter (where follow_up is not null and follow_up::text != '{}' and follow_up::text != 'null' and follow_up::text != '""')::int as followup_count,
          count(*)::int as total_rx
        FROM prescriptions
      `,

      // Emergency / High urgency appointments
      sql`
        SELECT count(*)::int as count 
        FROM appointments 
        WHERE disease_info::text ILIKE '%emergency%' OR disease_info::text ILIKE '%high%'
      `,

      // Average call duration
      sql`
        SELECT AVG(EXTRACT(EPOCH FROM (call_ended_at - call_started_at))/60)::numeric as avg_mins
        FROM appointments 
        WHERE call_started_at IS NOT NULL AND call_ended_at IS NOT NULL AND call_ended_at > call_started_at
      `,

      // Doctor satisfaction / ratings
      sql`
        SELECT AVG(rating)::numeric as avg_rating
        FROM doctor_details 
        WHERE rating IS NOT NULL AND rating > 0
      `,

      // Diagnostic Lab Analytics & Category-Based Commission Revenue
      sql`
        WITH item_categories AS (
          SELECT 
            oi.id as item_id,
            oi.order_id,
            COALESCE(oi.price, 0)::numeric as item_price,
            COALESCE(
              c_by_id.commission_percentage,
              c_by_name.commission_percentage,
              50.00
            )::numeric as commission_percentage
          FROM lab_test_order_items oi
          LEFT JOIN lab_tests t_by_id ON oi.test_id = t_by_id.id
          LEFT JOIN lab_test_categories c_by_id ON t_by_id.category_id = c_by_id.id
          LEFT JOIN LATERAL (
            SELECT t2.category_id 
            FROM lab_tests t2 
            WHERE LOWER(TRIM(t2.test_name)) = LOWER(TRIM(oi.test_name))
               OR t2.test_name ILIKE ('%' || oi.test_name || '%')
               OR oi.test_name ILIKE ('%' || t2.test_name || '%')
            LIMIT 1
          ) t_by_name ON t_by_id.id IS NULL
          LEFT JOIN lab_test_categories c_by_name ON t_by_name.category_id = c_by_name.id
        ),
        order_commissions AS (
          SELECT 
            order_id,
            ROUND(SUM(item_price * commission_percentage / 100.0), 2) as order_admin_commission
          FROM item_categories
          GROUP BY order_id
        )
        SELECT 
          COUNT(o.id)::int as total_orders,
          COUNT(o.id) FILTER (WHERE o.visit_type = 'home_collection')::int as home_collection_count,
          COUNT(o.id) FILTER (WHERE o.visit_type = 'walk_in')::int as walk_in_count,
          COUNT(o.id) FILTER (WHERE o.payment_status = 'paid' OR o.status = 'completed')::int as paid_orders_count,
          COALESCE(SUM(o.total_amount) FILTER (WHERE o.payment_status = 'paid' OR o.status = 'completed'), 0)::numeric as paid_gross_volume,
          COALESCE(SUM(oc.order_admin_commission) FILTER (WHERE o.payment_status = 'paid' OR o.status = 'completed'), 0)::numeric as paid_admin_commission,
          COALESCE(SUM(o.total_amount), 0)::numeric as all_gross_volume,
          COALESCE(SUM(oc.order_admin_commission), 0)::numeric as all_admin_commission
        FROM lab_test_orders o
        LEFT JOIN order_commissions oc ON o.id = oc.order_id
        ${start ? sql`WHERE o.created_at >= ${start.toISOString()} AND o.created_at <= ${end.toISOString()}` : sql``}
      `,
      sql`
        SELECT test_name as name, count(*)::int as count 
        FROM lab_test_order_items 
        WHERE test_name IS NOT NULL AND test_name != ''
        GROUP BY test_name 
        ORDER BY count DESC 
        LIMIT 5
      `,

      // Demographic age data
      sql`SELECT date_of_birth FROM patient_details WHERE date_of_birth IS NOT NULL`,

      // Weekly appointments chart (last 7 days)
      sql`
        SELECT 
          DATE(COALESCE(appointment_date, created_at::date)) as appt_date,
          count(*)::int as total,
          count(*) filter (where status = 'completed')::int as completed
        FROM appointments
        WHERE created_at >= ${sevenDaysAgo.toISOString()} OR appointment_date >= ${sevenDaysAgo.format('YYYY-MM-DD')}::date
        GROUP BY DATE(COALESCE(appointment_date, created_at::date))
      `,

      // Monthly revenue chart (last 6 months)
      sql`
        SELECT 
          TO_CHAR(created_at, 'YYYY-MM') as month_str,
          COALESCE(SUM(amount), 0)::numeric as rev
        FROM financial_transaction_log
        WHERE status IN ('success', 'completed')
          AND created_at >= ${sevenMonthsAgo.toISOString()}
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      `,

      // Recent Activity Log with actor and patient names resolved
      sql`
        SELECT 
          a.id,
          a.patient_id,
          a.actor_id,
          a.module_type,
          a.action_type,
          a.description,
          a.created_at,
          COALESCE(d.full_name, c.pharmacy_name, c.owner_name, l.lab_name, l.owner_name, ad.full_name, p.full_name, 'System') as actor_name,
          COALESCE(p.full_name, 'Patient') as patient_name
        FROM activity_log a
        LEFT JOIN doctor_details d ON a.actor_id = d.id
        LEFT JOIN chemist_details c ON a.actor_id = c.id
        LEFT JOIN lab_details l ON a.actor_id = l.id
        LEFT JOIN admin_details ad ON a.actor_id = ad.id
        LEFT JOIN patient_details p ON (a.patient_id = p.id OR a.actor_id = p.id)
        WHERE a.module_type NOT IN ('integration')
        ORDER BY a.created_at DESC
        LIMIT 6
      `
    ]);

    // Process Appointments Count & Revenue
    const totalAppointments = appointmentsCountRes[0]?.count || 0;
    let totalRevenue = Number(revenueRes[0]?.total) || 0;

    // Fallback revenue calculation if financial_transaction_log was 0 for period:
    // Compute from completed appointments in date range
    if (totalRevenue === 0 && start) {
      const apptRev = await sql`
        SELECT COALESCE(SUM(COALESCE(d.consultation_fee, 500)), 0)::numeric as total
        FROM appointments a
        LEFT JOIN doctor_details d ON a.doctor_id = d.id
        WHERE a.status = 'completed'
          AND a.created_at >= ${start.toISOString()}
          AND a.created_at <= ${end.toISOString()}
      `;
      totalRevenue = Number(apptRev[0]?.total) || 0;
    }

    // Process Diagnostic Lab Metrics & Category-Based Commission
    const labRow = labMetricsRes[0] || {};
    const labPaidGross = Number(labRow.paid_gross_volume || 0);
    const labPaidCommission = Number(labRow.paid_admin_commission || 0);
    const labPayouts = Math.max(0, parseFloat((labPaidGross - labPaidCommission).toFixed(2)));

    // Realized Lab Commission directly added to Admin's Total Platform Revenue
    totalRevenue += labPaidCommission;

    // Process Quick Stats
    const todayAppointments = todayApptsRes[0]?.count || 0;
    const pendingPrescriptions = pendingRxRes[0]?.count || 0;
    const todayPrescriptions = todayRxRes[0]?.count || 0;
    const todayLabReports = todayLabRxRes[0]?.count || 0;
    const followUpCount = followUpRes[0]?.followup_count || 0;
    const totalRx = followUpRes[0]?.total_rx || 0;
    const emergencyCases = emergencyApptsRes[0]?.count || 0;

    const followUpRate = totalRx > 0 ? `${Math.round((followUpCount / totalRx) * 100)}%` : "76%";
    const avgDurationMins = callDurationsRes[0]?.avg_mins ? Math.round(Number(callDurationsRes[0].avg_mins)) : null;
    const avgDuration = avgDurationMins ? `${avgDurationMins} mins` : "18 mins";
    const patientSatisfaction = ratingsRes[0]?.avg_rating ? `${Math.round((Number(ratingsRes[0].avg_rating) / 5) * 100)}%` : "94%";

    // Process Age Distribution
    const ageGroups = { "0-18": 0, "19-35": 0, "36-50": 0, "51-65": 0, "65+": 0 };
    const currentYear = new Date().getFullYear();
    patientsDOBRes.forEach(p => {
      if (!p.date_of_birth) return;
      const age = currentYear - new Date(p.date_of_birth).getFullYear();
      if (age <= 18) ageGroups["0-18"]++;
      else if (age <= 35) ageGroups["19-35"]++;
      else if (age <= 50) ageGroups["36-50"]++;
      else if (age <= 65) ageGroups["51-65"]++;
      else ageGroups["65+"]++;
    });
    const ageDistribution = Object.entries(ageGroups).map(([name, value]) => ({
      name,
      value,
      percentage: patientsDOBRes.length ? Math.round((value / patientsDOBRes.length) * 100) : 0
    }));

    // Process Weekly Appointments Chart (7 days)
    const weeklyMap = {};
    weeklyApptsRes.forEach(r => {
      const key = dayjs(r.appt_date).format('YYYY-MM-DD');
      weeklyMap[key] = { appointments: r.total, completed: r.completed };
    });

    const appointmentChart = Array.from({ length: 7 }).map((_, i) => {
      const d = dayjs().subtract(6 - i, 'day');
      const key = d.format('YYYY-MM-DD');
      const item = weeklyMap[key] || { appointments: 0, completed: 0 };
      return {
        day: d.format('ddd'),
        appointments: item.appointments,
        completed: item.completed
      };
    });

    // Process Monthly Revenue Chart (6 months)
    const monthlyRevMap = {};
    for (let i = 0; i < 7; i++) {
      monthlyRevMap[dayjs().subtract(6 - i, 'month').format('YYYY-MM')] = 0;
    }
    monthlyTxRes.forEach(m => {
      if (monthlyRevMap[m.month_str] !== undefined) {
        monthlyRevMap[m.month_str] = Number(m.rev) || 0;
      }
    });

    const monthlyRevenue = Array.from({ length: 6 }).map((_, i) => {
      const targetMonth = dayjs().subtract(5 - i, 'month');
      const targetMonthStr = targetMonth.format('YYYY-MM');
      const prevMonthStr = targetMonth.subtract(1, 'month').format('YYYY-MM');
      const currentRev = monthlyRevMap[targetMonthStr] || 0;
      const prevRev = monthlyRevMap[prevMonthStr] || 0;
      const growth = prevRev > 0 ? Math.round(((currentRev - prevRev) / prevRev) * 100) : (currentRev > 0 ? 100 : 0);
      return { month: targetMonth.format('MMM'), revenue: currentRev, growth };
    });

    // Process Recent Activity
    let recentActivity = recentLogsRes.map(l => {
      const patientName = l.patient_name || "Patient";
      const actorName = l.actor_name || "System";
      let link = "/admin/audit-logs";
      if (["consultation", "appointment"].includes(l.module_type)) link = "/admin/appointments";
      else if (l.module_type === "lab") link = "/admin/labs";
      else if (["pharmacy", "medicine", "prescriptions", "prescription"].includes(l.module_type)) link = "/admin/prescriptions";
      else if (["patient"].includes(l.module_type)) link = "/admin/patients";
      else if (["doctor"].includes(l.module_type)) link = "/admin/doctors";
      else if (["staff"].includes(l.module_type)) link = "/admin/staff";

      let actionText = l.description || `${l.module_type} ${l.action_type}`;
      if (actionText.length > 0) actionText = actionText.charAt(0).toUpperCase() + actionText.slice(1);

      let status = "info";
      const actionLower = (l.action_type || "") + " " + (l.description || "");
      if (actionLower.match(/fail|error|reject|cancel/i)) status = "cancelled";
      else if (actionLower.match(/success|complete|approve|signed/i)) status = "completed";
      else if (actionLower.match(/book|create|initiate/i)) status = "booked";

      return {
        id: l.id,
        action: actionText,
        time: dayjs(l.created_at).fromNow(),
        type: l.module_type,
        user: actorName !== "System" ? actorName : (patientName !== "Patient" ? patientName : "System"),
        status,
        link
      };
    });

    // Fallback to recent appointments if no activity logs
    if (recentActivity.length === 0) {
      const fallbackAppts = await sql`
        SELECT a.id, a.status, a.created_at, d.full_name as doc_name, p.full_name as pat_name
        FROM appointments a
        LEFT JOIN doctor_details d ON a.doctor_id = d.id
        LEFT JOIN patient_details p ON a.patient_id = p.id
        ORDER BY a.created_at DESC
        LIMIT 5
      `;
      recentActivity = fallbackAppts.map(a => ({
        id: a.id,
        action: `Appointment ${a.status} - ${a.doc_name || 'Doctor'} with ${a.pat_name || 'Patient'}`,
        time: dayjs(a.created_at).fromNow(),
        type: "appointment",
        user: a.doc_name || "System",
        status: a.status === "completed" ? "completed" : (a.status === "booked" ? "booked" : (a.status === "cancelled" ? "cancelled" : "info")),
        link: "/admin/appointments"
      }));
    }

    const payload = {
      stats: {
        totalPatients: totalPatients || 0,
        totalDoctors: totalDoctors || 0,
        totalAppointments: totalAppointments || 0,
        totalLabs: totalLabs || 0,
        totalChemists: totalChemists || 0,
        totalPharmacists: totalPharmacists || 0,
        totalRevenue: totalRevenue || 0,
        todayAppointments,
        pendingPrescriptions,
        todayLabReports
      },
      charts: {
        appointmentChart,
        monthlyRevenue,
        ageDistribution
      },
      activity: recentActivity,
      quickStats: {
        avgAppointmentDuration: avgDuration,
        patientSatisfaction,
        followUpRate,
        emergencyCases: emergencyCases.toString(),
        labTestsToday: todayLabReports,
        prescriptionsToday: todayPrescriptions
      },
      labAnalytics: {
        totalOrders: labRow.total_orders || 0,
        homeCollectionCount: labRow.home_collection_count || 0,
        walkInCount: labRow.walk_in_count || 0,
        paidOrdersCount: labRow.paid_orders_count || 0,
        revenue: labPaidCommission, // Admin-side earned lab revenue!
        grossRevenue: labPaidGross, // Total customer gross spend
        labPayouts: labPayouts,     // Amount to disburse to partner labs
        allGrossVolume: Number(labRow.all_gross_volume || 0),
        allPotentialCommission: Number(labRow.all_admin_commission || 0),
        popularTests: popularTestsRes || []
      }
    };

    memoryCache = { data: payload, timestamp: Date.now(), key: cacheKey };

    return new Response(JSON.stringify({ success: true, data: payload }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Admin Dashboard Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Failed to fetch dashboard data",
        error: error.message
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
}