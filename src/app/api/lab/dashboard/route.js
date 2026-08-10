import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { lab_id, time_range = "30d" } = await req.json();

    if (!lab_id) {
      return failure("lab_id required", null, 400, { headers: corsHeaders });
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

    // 1. Get Lab Info
    const { data: labData, error: labError } = await supabase
      .from("lab_details")
      .select("*")
      .eq("id", lab_id)
      .single();

    if (labError) throw labError;

    // 2. Get User Info for profile picture
    const { data: userData } = await supabase
      .from("users")
      .select("profile_picture")
      .eq("id", lab_id)
      .single();

    // 3. Get Total Orders Count
    const { count: totalOrders, error: totalError } = await supabase
      .from("lab_test_orders")
      .select("*", { count: 'exact', head: true })
      .eq("lab_id", lab_id)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    if (totalError) throw totalError;

    // 4. Get Orders by Status
    const { data: ordersByStatus } = await supabase
      .from("lab_test_orders")
      .select("status")
      .eq("lab_id", lab_id)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    // Calculate status counts
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

    ordersByStatus?.forEach(order => {
      if (statusCounts[order.status] !== undefined) {
        statusCounts[order.status]++;
      }
    });

    // 5. Get Recent Orders - FIXED: Correct relationship query
    const { data: recentOrders, error: recentError } = await supabase
      .from("lab_test_orders")
      .select(`
        *,
        patient:patient_id (
          id,
          phone_number
        )
      `)
      .eq("lab_id", lab_id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (recentError) throw recentError;

    // Get patient details separately for patient names
    const patientIds = [...new Set(recentOrders?.map(order => order.patient_id).filter(id => id))];
    
    let patientDetailsMap = {};
    if (patientIds.length > 0) {
      const { data: patientDetails } = await supabase
        .from("patient_details")
        .select("id, full_name")
        .in("id", patientIds);

      if (patientDetails) {
        patientDetailsMap = patientDetails.reduce((map, patient) => {
          map[patient.id] = patient.full_name;
          return map;
        }, {});
      }
    }

    // 6. Get Order Items Count for Recent Orders
    const orderIds = recentOrders?.map(order => order.id) || [];
    let orderItemsCount = {};
    
    if (orderIds.length > 0) {
      const { data: orderItems } = await supabase
        .from("lab_test_order_items")
        .select("order_id")
        .in("order_id", orderIds);

      if (orderItems) {
        orderItemsCount = orderItems.reduce((count, item) => {
          count[item.order_id] = (count[item.order_id] || 0) + 1;
          return count;
        }, {});
      }
    }

    // 7. Get Revenue Data (Completed Orders)
    const { data: completedOrders, error: revenueError } = await supabase
      .from("lab_test_orders")
      .select("total_amount, created_at")
      .eq("lab_id", lab_id)
      .eq("status", "completed")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    if (revenueError) throw revenueError;

    // Calculate total revenue
    const totalRevenue = completedOrders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

    // 8. Generate Daily Revenue Data for Chart
    const dailyRevenue = [];
    const daysCount = time_range === "7d" ? 7 : time_range === "30d" ? 30 : time_range === "90d" ? 90 : 365;
    
    // Create array of dates for the selected period
    for (let i = daysCount - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      const formattedDate = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      
      // Find revenue for this date
      const revenueForDate = completedOrders
        ?.filter(order => {
          const orderDate = new Date(order.created_at).toISOString().split('T')[0];
          return orderDate === dateString;
        })
        .reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

      dailyRevenue.push({
        date: formattedDate,
        fullDate: dateString,
        amount: revenueForDate
      });
    }

    // 9. Get Previous Period for Comparison
    const previousStartDate = new Date(startDate);
    const previousEndDate = new Date(startDate);
    const periodDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    previousStartDate.setDate(previousStartDate.getDate() - periodDays);
    previousEndDate.setDate(previousEndDate.getDate() - 1);

    const { data: previousOrders } = await supabase
      .from("lab_test_orders")
      .select("total_amount")
      .eq("lab_id", lab_id)
      .eq("status", "completed")
      .gte("created_at", previousStartDate.toISOString())
      .lte("created_at", previousEndDate.toISOString());

    const previousRevenue = previousOrders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
    const revenueChange = previousRevenue > 0 
      ? parseFloat(((totalRevenue - previousRevenue) / previousRevenue * 100).toFixed(1))
      : totalRevenue > 0 ? 100 : 0;

    // 10. Get Test Distribution from Order Items
    const { data: allOrderItems } = await supabase
      .from("lab_test_order_items")
      .select("test_name")
      .in("order_id", orderIds);

    // Analyze test types
    const testCategories = {};
    allOrderItems?.forEach(item => {
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

    // Convert to array for chart
    const testDistribution = Object.entries(testCategories).map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / (allOrderItems?.length || 1)) * 100)
    })).sort((a, b) => b.value - a.value);

    // 11. Prepare Recent Orders with Patient Names
    const enhancedRecentOrders = recentOrders?.map(order => ({
      ...order,
      patient_details: {
        full_name: patientDetailsMap[order.patient_id] || 'Unknown Patient',
        phone_number: order.patient?.phone_number
      },
      tests_count: orderItemsCount[order.id] || 0
    })) || [];

    // 12. Prepare Dashboard Data
    const dashboardData = {
      lab: {
        ...labData,
        profile_picture: userData?.profile_picture
      },
      stats: {
        total_orders: totalOrders || 0,
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
    return failure(
      "Failed to fetch dashboard data",
      err.message,
      500,
      { headers: corsHeaders }
    );
  }
}