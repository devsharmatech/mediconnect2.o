"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { FaUserMd, FaClock, FaTimes, FaCheck, FaFileMedical, FaPhone, FaHistory, FaUser, FaVideo, FaCalendarAlt, FaUsers, FaChevronRight, FaStethoscope, FaPhoneAlt, FaBrain, FaBell } from "react-icons/fa";
import { TrendingUp, ShieldCheck, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import api from "@/utils/websiteApi";
import toast from "react-hot-toast";

export default function DoctorDashboard() {
  const [doctor, setDoctor] = useState(null);
  const [doctorId, setDoctorId] = useState(null);
  const [stats, setStats] = useState({
    totalAppointments: 0,
    completed: 0,
    pending: 0,
    cancelled: 0,
    rejected: 0,
    totalPrescriptions: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [recentPrescriptions, setRecentPrescriptions] = useState([]);
  const [aiAlerts, setAiAlerts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [scorecard, setScorecard] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    const userRole = localStorage.getItem("userRole");
    const userData = localStorage.getItem("userData");

    if (!userId || userRole !== "doctor") {
      router.push("/website");
      return;
    }

    setDoctorId(userId);

    if (userData) {
      try {
        setDoctor(JSON.parse(userData));
      } catch (e) {
        console.error("Failed to parse user data:", e);
      }
    }

    fetchDashboardData(userId);
  }, [router]);

  const formatTimeString = (timeStr) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":");
    const d = new Date();
    d.setHours(parseInt(h, 10));
    d.setMinutes(parseInt(m, 10));
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
  };

  const fetchDashboardData = async (userId) => {
    try {
      setIsLoading(true);

      const appointmentsRes = await api.post("/appointment/doctor-appointment", {
        doctor_id: userId,
        date_filter: "today",
        page: 1,
      });

      const appointments =
        appointmentsRes.success && appointmentsRes.data?.appointments
          ? appointmentsRes.data.appointments
          : [];

      const prescriptionsRes = await api.post("/prescriptions/by-doctor", {
        doctor_id: userId,
      });

      const prescriptions =
        prescriptionsRes.success && Array.isArray(prescriptionsRes.data)
          ? prescriptionsRes.data
          : [];

      // Fetch AI Interactions needing review
      try {
        const scoreRes = await fetch(`/api/doctors/analytics/scorecard?doctor_id=${userId}`);
        const scoreData = await scoreRes.json();
        if (scoreData.success) setScorecard(scoreData.data);

        const aiRes = await fetch("/api/v2/ai/doctor-review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doctor_id: userId, action: "FETCH" })
        });
        const aiData = await aiRes.json();
        if (aiData.success && aiData.data) {
          setAiAlerts(aiData.data.filter(a => a.ai_output_status === "PENDING_REVIEW" || !a.ai_output_status));
        }
      } catch (err) {
        console.error("Failed to fetch AI alerts", err);
      }

      const completed = appointments.filter((a) => a.status === "completed").length;
      const pending = appointments.filter((a) => ["booked", "approved"].includes(a.status)).length;
      const cancelled = appointments.filter((a) => a.status === "cancelled").length;
      const rejected = appointments.filter((a) => a.status === "rejected").length;

      setStats({
        totalAppointments: appointments.length,
        completed,
        pending,
        cancelled,
        rejected,
        totalPrescriptions: prescriptions.length,
      });

      setRecentAppointments(
        appointments.slice(0, 5).map((apt) => ({
          id: apt.id,
          patient: apt.patient?.full_name || "Patient",
          patient_id: apt.patient_id,
          date: apt.appointment_date,
          time: apt.appointment_time ? formatTimeString(apt.appointment_time) : "",
          status: apt.status,
          type: apt.appointment_type || "Consultation",
        }))
      );

      setRecentPrescriptions(
        prescriptions.slice(0, 5).map((p) => ({
          id: p.id,
          patient: p.patient_details?.full_name || "Patient",
          date: p.created_at?.slice(0, 10) || "",
          medicines: Array.isArray(p.medicines)
            ? p.medicines.length
            : Array.isArray(p.medicines_list)
              ? p.medicines_list.length
              : 0,
        }))
      );



      const logsFromAppointments = appointments.slice(0, 5).map((a) => ({
        id: `apt-${a.id}`,
        action: `Appointment ${a.status} for ${a.patient?.full_name || "patient"}`,
        date: a.appointment_date,
        time: a.appointment_time ? formatTimeString(a.appointment_time) : "",
      }));
      const logsFromPrescriptions = prescriptions.slice(0, 5).map((p) => ({
        id: `rx-${p.id}`,
        action: `Prescription created for ${p.patient_details?.full_name || "patient"}`,
        date: p.created_at?.slice(0, 10) || "",
        time: "",
      }));
      setLogs([...logsFromAppointments, ...logsFromPrescriptions]);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartCall = async (apt) => {
    if (!doctorId) return;

    const url = `/appointments/${apt.id}/video?userId=${doctorId}&role=doctor`;
    window.open(url, "_blank");

    try {
      const res = await api.post("/appointment/video-call/start", {
        appointment_id: apt.id,
        doctor_id: doctorId,
      });
      // Also update status to approved if it was booked
      if (apt.status === "booked") {
        await api.post("/appointment/status", {
          appointment_id: apt.id,
          status: "approved",
          doctor_id: doctorId,
        });
        fetchDashboardData(doctorId);
      }
    } catch (err) {
      console.error("Failed to notify patient", err);
    }
  };

  const handleNotifyPatient = async (apt) => {
    try {
      setIsLoading(true);
      const res = await api.post("/notifications/send", {
        user_id: apt.patient_id,
        title: "Appointment Reminder",
        message: `Your doctor is ready for the consultation. Please join now.`,
        type: "appointment_reminder",
        metadata: {
          appointment_id: apt.id,
          doctor_id: doctorId,
        },
      });

      if (!res.success) {
        toast.error(res.message || "Failed to notify patient.");
        return;
      }

      toast.success("Patient has been notified successfully!");
    } catch (err) {
      console.error("Notify patient error", err);
      toast.error("Failed to notify patient.");
    } finally {
      setIsLoading(false);
    }
  };

  const isAppointmentExpired = (apt) => {
    if (["completed", "cancelled", "rejected"].includes(String(apt?.status).toLowerCase())) return false;
    const dateStr = apt?.date || apt?.appointment_date;
    if (!dateStr) return false;
    try {
      const timeStr = apt?.time || apt?.appointment_time || "23:59";
      const timePart = timeStr.slice(0, 5);
      const [year, month, day] = dateStr.split("-").map(Number);
      const [hours, minutes] = timePart.split(":").map(Number);
      const aptDateTime = new Date(year, month - 1, day, hours || 0, minutes || 0, 0);
      const now = new Date();
      return now.getTime() > aptDateTime.getTime() + 30 * 60 * 1000;
    } catch {
      return false;
    }
  };

  const formatTime = (date) =>
    date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

  const formatDate = (date) =>
    date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-50/60 min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#0067A1]/20 border-t-[#0067A1] rounded-full animate-spin" />
          <p className="text-xs sm:text-sm font-medium text-slate-500">Loading your dashboard&hellip;</p>
        </div>
      </div>
    );
  }

  const rawDoctorName = doctor?.details?.full_name || doctor?.full_name || "Doctor";
  const cleanDoctorName = rawDoctorName.replace(/^Dr\.?\s+/i, "");

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  })();

  const statCards = [
    { title: "Total Appointments", value: stats.totalAppointments, icon: FaCalendarAlt, color: "text-[#0067A1] bg-sky-50 border-sky-100", href: "/doctor/appointments" },
    { title: "Completed", value: stats.completed, icon: FaCheck, color: "text-emerald-700 bg-emerald-50 border-emerald-100", href: "/doctor/appointments?status=completed" },
    { title: "Pending", value: stats.pending, icon: FaClock, color: "text-amber-700 bg-amber-50 border-amber-100", href: "/doctor/appointments?status=booked" },
    { title: "Cancelled", value: stats.cancelled, icon: FaTimes, color: "text-rose-700 bg-rose-50 border-rose-100", href: "/doctor/appointments?status=cancelled" },
    { title: "Prescriptions", value: stats.totalPrescriptions, icon: FaFileMedical, color: "text-indigo-700 bg-indigo-50 border-indigo-100", href: "/doctor/prescriptions" },
  ];

  return (
    <div className="min-h-screen bg-slate-50/60 pb-8">
      <div className="w-full mx-auto space-y-4 sm:space-y-5">
        {/* Hero Header Banner */}
        <div className="bg-[#0067A1] border border-[#005a8e] rounded-lg px-4 sm:px-6 py-4 sm:py-5 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] sm:text-xs font-medium text-sky-100 uppercase tracking-wider">{greeting}</span>
                <span className="text-sky-300">•</span>
                <span className="text-[11px] sm:text-xs text-sky-100 font-medium">Doctor Portal</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight mt-1">
                {cleanDoctorName}
              </h1>
              <p className="text-xs sm:text-sm text-sky-100/85 mt-0.5">
                Practice overview for {formatDate(currentTime)}
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-auto shrink-0">
              <div className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-md text-white text-left sm:text-right">
                <p className="text-sm sm:text-base font-semibold leading-tight">{formatTime(currentTime)}</p>
                <p className="text-[10px] text-sky-200">Local Time</p>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/10 border border-white/20 rounded-md">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-white font-medium">Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <section>
          <h2 className="text-sm sm:text-base font-semibold text-slate-800 mb-2.5">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <Link
              href="/doctor/my-patients"
              className="bg-white rounded-lg border border-slate-200 p-3.5 hover:border-[#0067A1]/50 hover:bg-slate-50/60 transition-colors text-left group"
            >
              <div className="w-9 h-9 bg-sky-50 text-[#0067A1] border border-sky-100 rounded-md flex items-center justify-center mb-2.5">
                <FaUserMd className="w-4 h-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-[#0067A1] transition-colors">My Patients</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Patient records</p>
            </Link>

            <Link
              href="/doctor/appointments"
              className="bg-white rounded-lg border border-slate-200 p-3.5 hover:border-[#0067A1]/50 hover:bg-slate-50/60 transition-colors text-left group"
            >
              <div className="w-9 h-9 bg-amber-50 text-amber-700 border border-amber-100 rounded-md flex items-center justify-center mb-2.5">
                <FaCalendarAlt className="w-4 h-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-[#0067A1] transition-colors">Appointments</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Manage schedule</p>
            </Link>

            <Link
              href="/doctor/prescriptions"
              className="bg-white rounded-lg border border-slate-200 p-3.5 hover:border-[#0067A1]/50 hover:bg-slate-50/60 transition-colors text-left group"
            >
              <div className="w-9 h-9 bg-violet-50 text-violet-700 border border-violet-100 rounded-md flex items-center justify-center mb-2.5">
                <FaFileMedical className="w-4 h-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-[#0067A1] transition-colors">Prescriptions</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Medical records</p>
            </Link>

            <Link
              href="/doctor/manage-slots"
              className="bg-white rounded-lg border border-slate-200 p-3.5 hover:border-[#0067A1]/50 hover:bg-slate-50/60 transition-colors text-left group"
            >
              <div className="w-9 h-9 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md flex items-center justify-center mb-2.5">
                <FaClock className="w-4 h-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-[#0067A1] transition-colors">Manage Slots</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Availability</p>
            </Link>
          </div>
        </section>

        {/* Stats Grid */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
            <h2 className="text-sm sm:text-base font-semibold text-slate-800">Today&apos;s Statistics</h2>
            {scorecard && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-md self-start sm:self-auto">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="text-[10px] sm:text-[11px] font-medium text-emerald-800 uppercase tracking-wide">
                  Clinical Safety Audit: {scorecard.safety_score === 'N/A' ? 'No Data' : scorecard.safety_score}
                </span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
            {statCards.map((s) => (
              <Link
                key={s.title}
                href={s.href}
                className="bg-white rounded-lg border border-slate-200 p-3.5 hover:border-slate-300 transition-colors block text-left group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-md border flex items-center justify-center ${s.color}`}>
                    <s.icon className="w-3.5 h-3.5" />
                  </div>
                  <FaChevronRight className="w-2.5 h-2.5 text-slate-300 group-hover:text-[#0067A1] group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-xl sm:text-2xl font-semibold text-slate-800 leading-tight">{s.value}</p>
                <p className="text-xs text-slate-500 font-medium mt-1 truncate">{s.title}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Clinical Performance Scorecard (M8) */}
        {scorecard && (
          <section>
            <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-[#0067A1] text-white rounded-md flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-semibold text-slate-900 tracking-tight">Clinical Performance Scorecard</h2>
                  <p className="text-xs text-slate-500">Compliance & safety metrics from your last {scorecard.total_consultations} sessions</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 pt-3 border-t border-slate-100">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600 uppercase tracking-wider">Safety Compliance</span>
                    <span className="text-sm font-semibold text-[#0067A1]">{scorecard.safety_score}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-sm overflow-hidden">
                    <div className="h-full bg-[#0067A1] rounded-sm transition-all duration-700" style={{ width: scorecard.safety_score === 'N/A' ? '0%' : scorecard.safety_score }}></div>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">Percentage of high-severity alerts acknowledged with valid clinical justification.</p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600 uppercase tracking-wider">Doc Quality</span>
                    <span className="text-sm font-semibold text-emerald-700">{scorecard.quality_score}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-sm overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-sm transition-all duration-700" style={{ width: scorecard.quality_score === 'N/A' ? '0%' : scorecard.quality_score }}></div>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">Ratio of manual vs auto-populated entries. Indicates depth of clinical documentation.</p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600 uppercase tracking-wider">Patient Impact</span>
                    <span className="text-sm font-semibold text-indigo-700">{scorecard.patient_impact}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-sm overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-sm transition-all duration-700" style={{ width: scorecard.patient_impact === 'N/A' ? '0%' : scorecard.patient_impact }}></div>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">Aggregate improvement score based on patient follow-up feedback.</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* AI Smart Tool Alerts */}
        {aiAlerts.length > 0 && (
          <section>
            <div className="bg-white rounded-lg border border-rose-200 border-l-4 border-l-rose-500 p-4 sm:p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-rose-50 border border-rose-100 rounded-md flex items-center justify-center shrink-0">
                  <FaBrain className="w-4 h-4 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-slate-800">Clinical Risk Alert</h3>
                  <p className="text-xs text-rose-600 font-medium">{aiAlerts.length} patient assessment(s) require review</p>
                </div>
              </div>
              <div className="space-y-2.5">
                {aiAlerts.map(alert => (
                  <div key={alert.id} className="bg-slate-50 rounded-md p-3 sm:p-3.5 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-semibold text-slate-600 uppercase">{alert.tool_name === "lung_connect" ? "Lung Report" : "Cardio Report"}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${alert.risk_level === "critical" || alert.risk_level === "high" ? "bg-rose-100 text-rose-800 border border-rose-200" : "bg-amber-100 text-amber-800 border border-amber-200"}`}>
                          {alert.risk_level?.toUpperCase()} RISK
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700">{alert.recommendation ? alert.recommendation.substring(0, 120) + "..." : "Preliminary assessment completed."}</p>
                      <p className="text-[11px] text-slate-400 mt-1">Logged: {new Date(alert.timestamp).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        onClick={async () => {
                          const toastId = toast.loading("Logging override...");
                          try {
                            const res = await fetch("/api/v2/ai/doctor-review", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ doctor_id: doctorId, action: "OVERRIDE", interaction_id: alert.id, status: "OVERRIDDEN", notes: "Doctor reviewed and disagreed with AI severity." })
                            });
                            if (res.ok) {
                              toast.success("Override Logged", { id: toastId });
                              setAiAlerts(prev => prev.filter(a => a.id !== alert.id));
                            }
                          } catch (e) { toast.error("Failed to log", { id: toastId }) }
                        }}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-xs font-medium transition-colors cursor-pointer">
                        Override
                      </button>
                      <button
                        onClick={async () => {
                          const toastId = toast.loading("Acknowledging...");
                          try {
                            const res = await fetch("/api/v2/ai/doctor-review", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ doctor_id: doctorId, action: "OVERRIDE", interaction_id: alert.id, status: "ACKNOWLEDGED", notes: "Reviewed and agree." })
                            });
                            if (res.ok) {
                              toast.success("Acknowledged", { id: toastId });
                              setAiAlerts(prev => prev.filter(a => a.id !== alert.id));
                            }
                          } catch (e) { toast.error("Failed to log", { id: toastId }) }
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-md text-xs font-medium transition-colors cursor-pointer">
                        Acknowledge
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Main Grid: Appointments + Prescriptions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Recent Appointments */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3.5">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-slate-800">Recent Appointments</h3>
                  <p className="text-xs text-slate-500">Today&apos;s schedule</p>
                </div>
                <Link
                  href="/doctor/appointments"
                  className="text-xs text-[#0067A1] hover:text-[#004F7C] font-medium flex items-center gap-1"
                >
                  View All <FaChevronRight className="w-2.5 h-2.5" />
                </Link>
              </div>
              {recentAppointments.length > 0 ? (
                <div className="space-y-2">
                  {recentAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-md border border-slate-100 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-md bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
                          <FaUser className="w-3.5 h-3.5 text-[#0067A1]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{apt.patient}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <FaClock className="w-3 h-3 text-slate-400" />
                            <span>{apt.date} &bull; {apt.time}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
                        <StatusBadge status={apt.status} />
                        {["rejected", "cancelled"].includes(apt.status) ? (
                          <span className="text-[11px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                            {apt.status === "rejected" ? "Rejected" : "Cancelled"}
                          </span>
                        ) : isAppointmentExpired(apt) ? (
                          <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            Expired
                          </span>
                        ) : (apt.status === "booked" || apt.status === "approved") ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleStartCall(apt)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0067A1] hover:bg-[#004F7C] text-white text-xs font-medium rounded-md transition-colors cursor-pointer"
                            >
                              <FaVideo className="w-3 h-3" />
                              <span>Join Call</span>
                            </button>
                            <button
                              onClick={() => handleNotifyPatient(apt)}
                              disabled={isLoading}
                              className="inline-flex items-center gap-1 px-2.5 py-1 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-md text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
                              title="Notify Patient"
                            >
                              <FaBell className="w-3 h-3" />
                              <span>Notify</span>
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={FaCalendarAlt} title="No appointments today" sub="Scheduled appointments will appear here" />
              )}
            </div>
          </div>

          {/* Recent Prescriptions */}
          <div>
            <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3.5">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-slate-800">Recent Prescriptions</h3>
                  <p className="text-xs text-slate-500">Latest records</p>
                </div>
                <Link
                  href="/doctor/prescriptions"
                  className="text-xs text-[#0067A1] hover:text-[#004F7C] font-medium flex items-center gap-1"
                >
                  View All <FaChevronRight className="w-2.5 h-2.5" />
                </Link>
              </div>
              {recentPrescriptions.length > 0 ? (
                <div className="space-y-2">
                  {recentPrescriptions.map((rx) => (
                    <div
                      key={rx.id}
                      className="flex items-center gap-3 p-3 rounded-md border border-slate-100 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                        <FaFileMedical className="w-3.5 h-3.5 text-indigo-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{rx.patient}</p>
                        <div className="flex items-center justify-between text-xs text-slate-500 mt-0.5">
                          <span>{rx.medicines} medicine{rx.medicines !== 1 ? "s" : ""}</span>
                          <span>{rx.date}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={FaFileMedical} title="No prescriptions" sub="Prescription history will appear here" />
              )}
            </div>
          </div>
        </div>

        {/* Activity Logs */}
        <section>
          <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-slate-800">Activity Log</h3>
                <p className="text-xs text-slate-500">Recent clinical actions</p>
              </div>
            </div>
            {logs.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {logs.slice(0, 6).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 py-2.5 hover:bg-slate-50/70 rounded-md px-1 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                      <FaHistory className="w-3 h-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-slate-700 font-normal">{log.action}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <FaCalendarAlt className="w-2.5 h-2.5" />
                          {log.date}
                        </span>
                        {log.time && (
                          <span className="flex items-center gap-1">
                            <FaClock className="w-2.5 h-2.5" />
                            {log.time}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={FaHistory} title="No recent activity" sub="Activity will be logged here" />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = {
    completed: { text: "Completed", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    booked: { text: "Booked", cls: "bg-amber-50 text-amber-800 border-amber-200" },
    approved: { text: "Approved", cls: "bg-sky-50 text-sky-800 border-sky-200" },
    pending: { text: "Pending", cls: "bg-amber-50 text-amber-800 border-amber-200" },
    cancelled: { text: "Cancelled", cls: "bg-rose-50 text-rose-800 border-rose-200" },
    rejected: { text: "Rejected", cls: "bg-rose-50 text-rose-800 border-rose-200" },
  };
  const c = cfg[status] || { text: status, cls: "bg-slate-50 text-slate-700 border-slate-200" };
  return (
    <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${c.cls}`}>
      {c.text}
    </span>
  );
}

function EmptyState({ icon: Icon, title, sub }) {
  return (
    <div className="text-center py-6 px-4 bg-slate-50/50 rounded-md border border-dashed border-slate-200">
      <div className="w-10 h-10 bg-white border border-slate-200 rounded-md flex items-center justify-center mx-auto mb-2 text-slate-400">
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xs sm:text-sm text-slate-700 font-medium">{title}</p>
      <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
    </div>
  );
}
