import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { chemist_id, time_range = "30d" } = await req.json();

    if (!chemist_id) {
      return failure("chemist_id required", null, 400, { headers: corsHeaders });
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

    // 1. Get Chemist Info
    const { data: chemistData, error: chemistError } = await supabase
      .from("chemist_details")
      .select("*")
      .eq("id", chemist_id)
      .single();

    if (chemistError) throw chemistError;

    // 2. Get User Info for profile picture
    const { data: userData } = await supabase
      .from("users")
      .select("profile_picture")
      .eq("id", chemist_id)
      .single();

    // 3. Get Total Orders Count
    const { count: totalOrders, error: totalError } = await supabase
      .from("medicine_orders")
      .select("*", { count: 'exact', head: true })
      .eq("chemist_id", chemist_id)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    if (totalError) throw totalError;

    // 4. Get Orders by Status
    const { data: ordersByStatus } = await supabase
      .from("medicine_orders")
      .select("status")
      .eq("chemist_id", chemist_id)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    // Calculate status counts
    const statusCounts = {
      pending: 0,
      sent_to_chemist: 0,
      approved: 0,
      partially_approved: 0,
      rejected: 0,
      ready_for_pickup: 0,
      out_for_delivery: 0,
      completed: 0,
      cancelled: 0
    };

    ordersByStatus?.forEach(order => {
      if (statusCounts[order.status] !== undefined) {
        statusCounts[order.status]++;
      }
    });

    // 5. Get Recent Orders with Patient Details
    const { data: recentOrders, error: recentError } = await supabase
      .from("medicine_orders")
      .select(`
        *,
        patient:patient_id (
          id,
          phone_number
        )
      `)
      .eq("chemist_id", chemist_id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (recentError) throw recentError;

    // Get patient details separately
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
        .from("medicine_order_items")
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
      .from("medicine_orders")
      .select("total_amount, created_at")
      .eq("chemist_id", chemist_id)
      .in("status", ["completed", "ready_for_pickup", "out_for_delivery", "payment_submitted"])
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    if (revenueError) throw revenueError;

    // Calculate total revenue
    const totalRevenue = completedOrders?.reduce((sum, order) => sum + Number(order.total_amount || 0), 0) || 0;

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
        .reduce((sum, order) => sum + Number(order.total_amount || 0), 0) || 0;

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
      .from("medicine_orders")
      .select("total_amount")
      .eq("chemist_id", chemist_id)
      .in("status", ["completed", "ready_for_pickup", "out_for_delivery", "payment_submitted"])
      .gte("created_at", previousStartDate.toISOString())
      .lte("created_at", previousEndDate.toISOString());

    const previousRevenue = previousOrders?.reduce((sum, order) => sum + Number(order.total_amount || 0), 0) || 0;
    const revenueChange = previousRevenue > 0 
      ? parseFloat(((totalRevenue - previousRevenue) / previousRevenue * 100).toFixed(1))
      : totalRevenue > 0 ? 100 : 0;

    // 10. Get Medicine Categories Distribution
    const { data: allOrderItems } = await supabase
      .from("medicine_order_items")
      .select("medicine_name")
      .in("order_id", orderIds);

    // Analyze medicine types
    const medicineCategories = {};
    allOrderItems?.forEach(item => {
      const medicineName = (item.medicine_name || '').toLowerCase();
      let category = 'Other Medicines';
      
      if (medicineName.includes('antibiotic') || medicineName.includes('amoxicillin') || medicineName.includes('azithromycin')) {
        category = 'Antibiotics';
      } else if (medicineName.includes('pain') || medicineName.includes('paracetamol') || medicineName.includes('ibuprofen')) {
        category = 'Pain Relief';
      } else if (medicineName.includes('cough') || medicineName.includes('cold') || medicineName.includes('syrup')) {
        category = 'Cough & Cold';
      } else if (medicineName.includes('fever') || medicineName.includes('temperature')) {
        category = 'Fever';
      } else if (medicineName.includes('vitamin') || medicineName.includes('supplement')) {
        category = 'Vitamins';
      } else if (medicineName.includes('chronic') || medicineName.includes('diabetes') || medicineName.includes('blood pressure')) {
        category = 'Chronic Care';
      }
      
      medicineCategories[category] = (medicineCategories[category] || 0) + 1;
    });

    // Convert to array for chart
    const medicineDistribution = Object.entries(medicineCategories).map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / (allOrderItems?.length || 1)) * 100)
    })).sort((a, b) => b.value - a.value);

    // 11. Get Inventory Statistics
    const { count: totalMedicines, error: inventoryError } = await supabase
      .from("chemist_inventory")
      .select("*", { count: 'exact', head: true })
      .eq("chemist_id", chemist_id);

    if (inventoryError) throw inventoryError;

    // 12. Get Low Stock Medicines
    const { data: lowStockMedicines } = await supabase
      .from("chemist_inventory")
      .select(`
        *,
        medicine:chemist_medicines!inner(name, brand)
      `)
      .eq("chemist_id", chemist_id)
      .lt("total_stock", 10)
      .limit(5);

    // 13. Prepare Recent Orders with Patient Names
    const enhancedRecentOrders = recentOrders?.map(order => ({
      ...order,
      patient_details: {
        full_name: patientDetailsMap[order.patient_id] || 'Unknown Customer',
        phone_number: order.patient?.phone_number
      },
      items_count: orderItemsCount[order.id] || 0
    })) || [];

    // 14. Prepare Dashboard Data
    const dashboardData = {
      chemist: {
        ...chemistData,
        profile_picture: userData?.profile_picture
      },
      stats: {
        total_orders: totalOrders || 0,
        pending_orders: statusCounts.pending + statusCounts.sent_to_chemist,
        completed_orders: statusCounts.completed,
        revenue_30_days: totalRevenue,
        revenue_change: revenueChange,
        avg_order_value: totalOrders > 0 ? parseFloat((totalRevenue / totalOrders).toFixed(2)) : 0,
        processing_orders: statusCounts.processing + statusCounts.ready_for_pickup + statusCounts.out_for_delivery,
        rejected_orders: statusCounts.rejected + statusCounts.cancelled,
        total_medicines: totalMedicines || 0,
        low_stock_count: lowStockMedicines?.length || 0
      },
      status_distribution: statusCounts,
      recent_orders: enhancedRecentOrders,
      daily_revenue: dailyRevenue,
      medicine_distribution: medicineDistribution,
      low_stock_medicines: lowStockMedicines || [],
      time_period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        range: time_range,
        days: daysCount
      }
    };

    return success("Chemist dashboard data fetched successfully", dashboardData, 200, {
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("Chemist Dashboard API Error:", err);
    return failure(
      "Failed to fetch chemist dashboard data",
      err.message,
      500,
      { headers: corsHeaders }
    );
  }
}