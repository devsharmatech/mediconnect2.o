import { supabase } from "@/lib/supabaseAdmin";
import { corsHeaders } from "@/lib/cors";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

let memoryCache = { data: null, timestamp: 0, key: '' };
const CACHE_DURATION = 60 * 1000; // 60 seconds

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || 'week';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const cacheKey = dateRange + '_' + (startDate || '') + '_' + (endDate || '');
    if (memoryCache.data && memoryCache.key === cacheKey && Date.now() - memoryCache.timestamp < CACHE_DURATION) {
        return NextResponse.json({ success: true, data: memoryCache.data });
    }

    // Calculate date range based on filter
    let start, end;
    const today = dayjs();
    
    switch (dateRange) {
      case 'today':
        start = today.startOf('day');
        end = today.endOf('day');
        break;
      case 'week':
        start = today.subtract(7, 'day').startOf('day');
        end = today.endOf('day');
        break;
      case 'month':
        start = today.subtract(1, 'month').startOf('day');
        end = today.endOf('day');
        break;
      case 'quarter':
        start = today.subtract(3, 'month').startOf('day');
        end = today.endOf('day');
        break;
      case 'year':
        start = today.subtract(1, 'year').startOf('day');
        end = today.endOf('day');
        break;
      case 'custom':
        start = startDate ? dayjs(startDate) : today.subtract(7, 'day');
        end = endDate ? dayjs(endDate) : today;
        break;
      default:
        start = today.subtract(7, 'day');
        end = today;
    }


    // Fetch all independent base data concurrently
    const sevenDaysAgo = dayjs().subtract(6, 'day').startOf('day');
    const sevenMonthsAgo = dayjs().subtract(6, 'month').startOf('month');
    const todayStr = dayjs().format('YYYY-MM-DD');

    const [
      { count: totalPatients }, { count: totalDoctors }, { count: totalAppointments },
      { count: totalLabs }, { count: totalChemists }, { count: totalPharmacists },
      { data: completedAppointments }, { data: chartAppointments }, { data: revenueAppointments },
      { data: patientsDOB }, { data: logs },
      { data: todayAppointments }, { data: pendingPrescriptions }, { data: todayPrescriptions },
      { data: allPrescriptions }, { count: labOrdersCount }, { count: homeCount },
      { count: walkinCount }, { data: paidLabOrders }, { data: popularTestsData },
      { data: fallbackAppointments }
    ] = await Promise.all([
      supabase.from("patient_details").select("id", { count: "exact", head: true }).gte("created_at", start.toISOString()).lte("created_at", end.toISOString()),
      supabase.from("doctor_details").select("id", { count: "exact", head: true }).gte("created_at", start.toISOString()).lte("created_at", end.toISOString()),
      supabase.from("appointments").select("id", { count: "exact", head: true }).gte("created_at", start.toISOString()).lte("created_at", end.toISOString()),
      supabase.from("lab_details").select("id", { count: "exact", head: true }).gte("created_at", start.toISOString()).lte("created_at", end.toISOString()),
      supabase.from("chemist_details").select("id", { count: "exact", head: true }).gte("created_at", start.toISOString()).lte("created_at", end.toISOString()),
      supabase.from("pharmacist_details").select("id", { count: "exact", head: true }).gte("created_at", start.toISOString()).lte("created_at", end.toISOString()),
      
      supabase.from("appointments").select("doctor_id, created_at").eq("status", "completed").gte("created_at", start.toISOString()).lte("created_at", end.toISOString()),
      supabase.from("appointments").select("status, created_at").gte("created_at", sevenDaysAgo.toISOString()),
      supabase.from("appointments").select("doctor_id, created_at").eq("status", "completed").gte("created_at", sevenMonthsAgo.toISOString()),
      
      supabase.from("patient_details").select("date_of_birth"),
      supabase.from("activity_log").select("*").neq("module_type", "integration").order("created_at", { ascending: false }).limit(5),
      
      supabase.from("appointments").select("id, disease_info, call_started_at, call_ended_at").eq("appointment_date", todayStr),
      supabase.from("prescriptions").select("id").in("status", ["draft", "active"]),
      supabase.from("prescriptions").select("id, lab_tests").gte("created_at", dayjs().startOf('day').toISOString()),
      supabase.from("prescriptions").select("id, follow_up"),
      
      supabase.from("lab_test_orders").select("id", { count: "exact", head: true }),
      supabase.from("lab_test_orders").select("id", { count: "exact", head: true }).eq("visit_type", "home_collection"),
      supabase.from("lab_test_orders").select("id", { count: "exact", head: true }).eq("visit_type", "walk_in"),
      supabase.from("lab_test_orders").select("total_amount").eq("payment_status", "paid"),
      supabase.from("lab_test_order_items").select("test_name"),
      
      supabase.from("appointments").select("id, appointment_date, appointment_time, status, created_at, doctor:doctor_id ( full_name ), patient:patient_id ( full_name )").order("created_at", { ascending: false }).limit(5)
    ]);

    // Gather IDs for dependent queries
    const doctorIdsForFees = [...new Set([
      ...(completedAppointments || []).map(a => a.doctor_id),
      ...(revenueAppointments || []).map(a => a.doctor_id)
    ])];
    
    const userIds = [...new Set(
      (logs || []).flatMap(l => [l.patient_id, l.actor_id]).filter(Boolean)
    )];

    // Fetch dependents concurrently
    const [
      { data: doctorsFeesData },
      { data: usersRolesData }
    ] = await Promise.all([
      doctorIdsForFees.length > 0 ? supabase.from("doctor_details").select("id, consultation_fee").in("id", doctorIdsForFees) : Promise.resolve({ data: [] }),
      userIds.length > 0 ? supabase.from("users").select("id, role").in("id", userIds) : Promise.resolve({ data: [] })
    ]);

    // Process Revenue
    let totalRevenue = 0;
    if (completedAppointments?.length) {
      totalRevenue = completedAppointments.reduce((sum, a) => {
        const doc = doctorsFeesData?.find(d => d.id === a.doctor_id);
        return sum + (Number(doc?.consultation_fee) || 0);
      }, 0);
    }
    
    let doctorFees = {};
    doctorsFeesData?.forEach(d => {
      doctorFees[d.id] = Number(d.consultation_fee) || 0;
    });

    const monthlyRevenuesMap = {};
    for (let i = 0; i < 7; i++) {
      monthlyRevenuesMap[dayjs().subtract(6 - i, 'month').format('YYYY-MM')] = 0;
    }
    revenueAppointments?.forEach(a => {
      const monthStr = dayjs(a.created_at).format('YYYY-MM');
      if (monthlyRevenuesMap[monthStr] !== undefined) {
        monthlyRevenuesMap[monthStr] += doctorFees[a.doctor_id] || 0;
      }
    });

    const monthlyRevenue = Array.from({ length: 6 }).map((_, i) => {
      const targetMonth = dayjs().subtract(5 - i, 'month');
      const targetMonthStr = targetMonth.format('YYYY-MM');
      const prevMonthStr = targetMonth.subtract(1, 'month').format('YYYY-MM');
      const currentRev = monthlyRevenuesMap[targetMonthStr] || 0;
      const prevRev = monthlyRevenuesMap[prevMonthStr] || 0;
      const growth = prevRev > 0 ? Math.round(((currentRev - prevRev) / prevRev) * 100) : (currentRev > 0 ? 100 : 0);
      return { month: targetMonth.format('MMM'), revenue: currentRev, growth };
    });

    // Process Chart Appointments
    const appointmentChart = Array.from({ length: 7 }).map((_, i) => {
      const day = dayjs().subtract(6 - i, 'day');
      const dailyAppts = chartAppointments?.filter(a => dayjs(a.created_at).isSame(day, 'day')) || [];
      return {
        day: day.format('ddd'),
        appointments: dailyAppts.length,
        completed: dailyAppts.filter(a => a.status === 'completed').length
      };
    });

    // Process Age Distribution
    const ageGroups = { "0-18": 0, "19-35": 0, "36-50": 0, "51-65": 0, "65+": 0 };
    const currentYear = new Date().getFullYear();
    patientsDOB?.forEach(p => {
      if (!p.date_of_birth) return;
      const age = currentYear - new Date(p.date_of_birth).getFullYear();
      if (age <= 18) ageGroups["0-18"]++;
      else if (age <= 35) ageGroups["19-35"]++;
      else if (age <= 50) ageGroups["36-50"]++;
      else if (age <= 65) ageGroups["51-65"]++;
      else ageGroups["65+"]++;
    });
    const ageDistribution = Object.entries(ageGroups).map(([name, value]) => ({
      name, value, percentage: patientsDOB?.length ? Math.round((value / patientsDOB.length) * 100) : 0
    }));

    // Process Logs and fetch names
    let recentActivity = [];
    if (logs && logs.length > 0) {
      const roleGroups = { patient: [], doctor: [], admin: [], chemist: [], lab: [] };
      usersRolesData?.forEach(u => { if (roleGroups[u.role]) roleGroups[u.role].push(u.id); });
      
      const [pData, dData, aData, cData, lData] = await Promise.all([
        roleGroups.patient.length > 0 ? supabase.from("patient_details").select("id, full_name").in("id", roleGroups.patient) : Promise.resolve({ data: [] }),
        roleGroups.doctor.length > 0 ? supabase.from("doctor_details").select("id, full_name").in("id", roleGroups.doctor) : Promise.resolve({ data: [] }),
        roleGroups.admin.length > 0 ? supabase.from("admin_details").select("id, full_name").in("id", roleGroups.admin) : Promise.resolve({ data: [] }),
        roleGroups.chemist.length > 0 ? supabase.from("chemist_details").select("id, full_name").in("id", roleGroups.chemist) : Promise.resolve({ data: [] }),
        roleGroups.lab.length > 0 ? supabase.from("lab_details").select("id, full_name").in("id", roleGroups.lab) : Promise.resolve({ data: [] })
      ]);
      
      const nameMap = {};
      [...(pData.data||[]), ...(dData.data||[]), ...(aData.data||[]), ...(cData.data||[]), ...(lData.data||[])].forEach(u => {
        nameMap[u.id] = u.full_name;
      });

      recentActivity = logs.map(l => {
        const patientName = nameMap[l.patient_id] || "Patient";
        const actorName = nameMap[l.actor_id] || "System";
        let link = "/admin/audit-logs";
        if (["consultation", "appointment"].includes(l.module_type)) link = "/admin/appointments";
        else if (l.module_type === "lab") link = "/admin/labs";
        else if (["pharmacy", "medicine", "prescriptions"].includes(l.module_type)) link = "/admin/prescriptions";
        else if (["integration", "system"].includes(l.module_type)) link = "/admin/operations";
        else if (l.module_type === "patient") link = "/admin/patients";
        else if (l.module_type === "doctor") link = "/admin/doctors";
        else if (l.module_type === "staff") link = "/admin/staff";

        let actionText = l.description || `${l.module_type} ${l.action_type}`;
        if (actionText.length > 0) actionText = actionText.charAt(0).toUpperCase() + actionText.slice(1);

        let status = "info";
        const actionLower = l.action_type?.toLowerCase() || "";
        if (actionLower.match(/fail|error|reject|cancel/)) status = "cancelled";
        else if (actionLower.match(/success|complete|approve/)) status = "completed";
        else if (actionLower.match(/book|create|initiate/)) status = "booked";

        return { id: l.id, action: actionText, time: dayjs(l.created_at).fromNow(), type: l.module_type, user: actorName !== "System" ? actorName : (patientName !== "Patient" ? patientName : "System"), status, link };
      });
    }

    if (recentActivity.length === 0) {
      recentActivity = fallbackAppointments?.map((a) => ({
        id: a.id,
        action: `Appointment ${a.status} - ${a.doctor?.full_name || 'Unknown'} with ${a.patient?.full_name || 'Patient'}`,
        time: dayjs(a.created_at).fromNow(),
        type: "appointment",
        user: a.doctor?.full_name || "System",
        status: a.status === "completed" ? "completed" : (a.status === "booked" ? "booked" : (a.status === "cancelled" ? "cancelled" : "info")),
        link: "/admin/appointments"
      })) || [];
    }

    // Process Quick Stats
    let totalDurationMinutes = 0, validCallsCount = 0, emergencyCount = 0;
    todayAppointments?.forEach(app => {
      if (app.call_started_at && app.call_ended_at) {
        const diff = dayjs(app.call_ended_at).diff(dayjs(app.call_started_at), 'minute');
        if (diff > 0) { totalDurationMinutes += diff; validCallsCount++; }
      }
      const urgency = app.disease_info?.urgency?.toLowerCase();
      if (urgency === 'emergency' || urgency === 'high') emergencyCount++;
    });

    const avgDuration = validCallsCount > 0 ? `${Math.round(totalDurationMinutes / validCallsCount)} mins` : "N/A";
    const totalRx = allPrescriptions?.length || 0;
    const followUpRx = allPrescriptions?.filter(rx => rx.follow_up && Object.keys(rx.follow_up).length > 0).length || 0;
    const followUpRate = totalRx > 0 ? `${Math.round((followUpRx / totalRx) * 100)}%` : "N/A";
    const labTestsToday = todayPrescriptions?.filter(p => Array.isArray(p.lab_tests) && p.lab_tests.length > 0).length || 0;

    const labRevenue = (paidLabOrders || []).reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
    const testCounts = {};
    (popularTestsData || []).forEach(item => { testCounts[item.test_name] = (testCounts[item.test_name] || 0) + 1; });
    const popularTests = Object.entries(testCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);

    const result = {
      stats: {
        totalPatients: totalPatients || 0,
        totalDoctors: totalDoctors || 0,
        totalAppointments: totalAppointments || 0,
        totalLabs: totalLabs || 0,
        totalChemists: totalChemists || 0,
        totalPharmacists: totalPharmacists || 0,
        totalRevenue: totalRevenue || 0,
        todayAppointments: todayAppointments?.length || 0,
        pendingPrescriptions: pendingPrescriptions?.length || 0,
        todayLabReports: labTestsToday
      },
      charts: { appointmentChart, monthlyRevenue, ageDistribution },
      activity: recentActivity,
      quickStats: {
        avgAppointmentDuration: avgDuration,
        patientSatisfaction: "N/A",
        followUpRate: followUpRate,
        emergencyCases: emergencyCount.toString(),
        labTestsToday: labTestsToday,
        prescriptionsToday: todayPrescriptions?.length || 0
      },
      labAnalytics: {
        totalOrders: labOrdersCount || 0,
        homeCollectionCount: homeCount || 0,
        walkInCount: walkinCount || 0,
        revenue: labRevenue,
        popularTests: popularTests
      }
    };
    return new Response(JSON.stringify({ success: true, data: result }), {
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