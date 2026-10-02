import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req) {
  try {
    const { lab_id, time_range = "30d" } = await req.json();

    if (!lab_id || !UUID_REGEX.test(lab_id)) {
      return failure("valid lab_id required", null, 400, { headers: corsHeaders });
    }

    // Calculate date ranges
    const endDate = new Date();
    const startDate = new Date();
    
    switch (time_range) {
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(startDate.getDate() - 90);
        break;
      case "1y":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // 1. Get Lab Info and User Info
    const [labData] = await sql`
      SELECT l.*, u.profile_picture
      FROM lab_details l
      LEFT JOIN users u ON u.id = l.id
      WHERE l.id = ${lab_id}
      LIMIT 1
    `;

    if (!labData) return failure("Lab not found", null, 404, { headers: corsHeaders });

    // 3. Get Orders and status counts
    const ordersByStatus = await sql`
      SELECT id, status, total_amount, created_at
      FROM lab_test_orders
      WHERE lab_id = ${lab_id}
        AND created_at >= ${startDate.toISOString()}
        AND created_at <= ${endDate.toISOString()}
    `;

    const totalOrders = ordersByStatus.length;

    const statusCounts = {
      pending: 0,
      sent_to_lab: 0,
      approved: 0,
      partially_approved: 0,
      rejected: 0,
      sample_collected: 0,
      processing: 0,
      completed: 0,
      cancelled: 0
    };

    ordersByStatus.forEach(order => {
      if (statusCounts[order.status] !== undefined) {
        statusCounts[order.status]++;
      }
    });

    // 5. Get Recent Orders with Patient Names
    const recentOrders = await sql`
      SELECT 
        o.*,
        p.full_name as patient_name,
        u.phone_number as patient_phone,
        (SELECT count(*)::int FROM lab_test_order_items i WHERE i.order_id = o.id) as tests_count
      FROM lab_test_orders o
      LEFT JOIN patient_details p ON p.id = o.patient_id
      LEFT JOIN users u ON u.id = o.patient_id
      WHERE o.lab_id = ${lab_id}
      ORDER BY o.created_at DESC
      LIMIT 10
    `;

    const enhancedRecentOrders = recentOrders.map(order => ({
      ...order,
      patient_details: {
        full_name: order.patient_name || 'Unknown Patient',
        phone_number: order.patient_phone || null,
      },
      tests_count: order.tests_count || 0,
    }));

    // 7. Get Revenue Data (Completed Orders)
    const completedOrders = ordersByStatus.filter(o => o.status === 'completed');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    // 8. Generate Daily Revenue Data for Chart
    const dailyRevenue = [];
    const daysCount = time_range === "7d" ? 7 : time_range === "30d" ? 30 : time_range === "90d" ? 90 : 365;
    
    for (let i = daysCount - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      const formattedDate = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      
      const revenueForDate = completedOrders
        .filter(order => {
          const orderDate = new Date(order.created_at).toISOString().split('T')[0];
          return orderDate === dateString;
        })
        .reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

      dailyRevenue.push({
        date: formattedDate,
        fullDate: dateString,
        amount: revenueForDate
      });
    }

    // 9. Previous Period Comparison
    const previousStartDate = new Date(startDate);
    const previousEndDate = new Date(startDate);
    const periodDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    previousStartDate.setDate(previousStartDate.getDate() - periodDays);
    previousEndDate.setDate(previousEndDate.getDate() - 1);

    const previousOrders = await sql`
      SELECT total_amount
      FROM lab_test_orders
      WHERE lab_id = ${lab_id}
        AND status = 'completed'
        AND created_at >= ${previousStartDate.toISOString()}
        AND created_at <= ${previousEndDate.toISOString()}
    `;

    const previousRevenue = (previousOrders || []).reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const revenueChange = previousRevenue > 0 
      ? parseFloat(((totalRevenue - previousRevenue) / previousRevenue * 100).toFixed(1))
      : totalRevenue > 0 ? 100 : 0;

    // 10. Test Distribution
    const recentOrderIds = recentOrders.map(o => o.id);
    let allOrderItems = [];
    if (recentOrderIds.length > 0) {
      allOrderItems = await sql`
        SELECT test_name
        FROM lab_test_order_items
        WHERE order_id = ANY(${recentOrderIds})
      `;
    }

    const testCategories = {};
    allOrderItems.forEach(item => {
      const testName = (item.test_name || '').toLowerCase();
      let category = 'Other Tests';
      
      if (testName.includes('blood') || testName.includes('cbc') || testName.includes('hemoglobin') || testName.includes('platelet')) {
        category = 'Blood Tests';
      } else if (testName.includes('urine') || testName.includes('urinalysis')) {
        category = 'Urine Tests';
      } else if (testName.includes('liver') || testName.includes('kidney') || testName.includes('creatinine') || testName.includes('sgot') || testName.includes('sgpt')) {
        category = 'Biochemistry';
      } else if (testName.includes('hormone') || testName.includes('thyroid') || testName.includes('t3') || testName.includes('t4') || testName.includes('tsh')) {
        category = 'Hormone Tests';
      } else if (testName.includes('sugar') || testName.includes('glucose') || testName.includes('diabetes') || testName.includes('hba1c')) {
        category = 'Diabetes Tests';
      } else if (testName.includes('lipid') || testName.includes('cholesterol')) {
        category = 'Lipid Profile';
      }
      
      testCategories[category] = (testCategories[category] || 0) + 1;
    });

    const testDistribution = Object.entries(testCategories).map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / (allOrderItems.length || 1)) * 100)
    })).sort((a, b) => b.value - a.value);

    const dashboardData = {
      lab: labData,
      stats: {
        total_orders: totalOrders,
        pending_orders: statusCounts.pending + statusCounts.sent_to_lab,
        completed_orders: statusCounts.completed,
        revenue_30_days: totalRevenue,
        revenue_change: revenueChange,
        avg_order_value: totalOrders > 0 ? parseFloat((totalRevenue / totalOrders).toFixed(2)) : 0,
        processing_orders: statusCounts.processing + statusCounts.sample_collected,
        rejected_orders: statusCounts.rejected + statusCounts.cancelled
      },
      status_distribution: statusCounts,
      recent_orders: enhancedRecentOrders,
      daily_revenue: dailyRevenue,
      test_distribution: testDistribution,
      time_period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        range: time_range,
        days: daysCount
      }
    };

    return success("Dashboard data fetched successfully", dashboardData, 200, {
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("Dashboard API Error:", err);
    return failure("Failed to fetch dashboard data", err.message, 500, { headers: corsHeaders });
  }
}