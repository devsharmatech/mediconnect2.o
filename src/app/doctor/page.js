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
  const [callRequests, setCallRequests] = useState([]);
  const [aiAlerts, setAiAlerts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [incomingCalls, setIncomingCalls] = useState([]);
  const [acceptingCallId, setAcceptingCallId] = useState(null);
  const [scorecard, setScorecard] = useState(null);
  const router = useRouter();
  const pollRef = useRef(null);

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

  // Play ringtone chime sound when call arrives
  const playRingtone = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      /* ignore audio context restrictions */
    }
  };

  // Poll for incoming instant calls every 5 seconds
  useEffect(() => {
    if (!doctorId) return;
    fetchIncomingCalls(doctorId);
    pollRef.current = setInterval(() => fetchIncomingCalls(doctorId), 5000);
    return () => clearInterval(pollRef.current);
  }, [doctorId]);

  // Listen for FCM instant_call events
  useEffect(() => {
    const handleInstantCall = () => {
      playRingtone();
      if (doctorId) fetchIncomingCalls(doctorId);
    };
    window.addEventListener("instant-call-received", handleInstantCall);
    return () => window.removeEventListener("instant-call-received", handleInstantCall);
  }, [doctorId]);

  const formatTimeString = (timeStr) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":");
    const d = new Date();
    d.setHours(parseInt(h, 10));
    d.setMinutes(parseInt(m, 10));
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
  };

  const fetchIncomingCalls = async (uid) => {
    try {
      const res = await api.post("/appointment/doctor-appointment", {
        doctor_id: uid,
        date_filter: "today",
        page: 1,
      });
      if (res.success && res.data?.appointments) {
        // Get current IST time in minutes from midnight
        const nowIST = new Date(
          new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
        );
        const nowMinutes = nowIST.getHours() * 60 + nowIST.getMinutes();

        const pending = res.data.appointments
          .filter((a) => {
            if (a.status !== "booked") return false;
            // Parse appointment time and check if it's within the 30-min window
            if (!a.appointment_time) return true;
            const [h, m] = a.appointment_time.split(":").map(Number);
            const aptMinutes = h * 60 + m;
            // Show if: appointment time is in the future OR within 30 mins past
            const minutesPast = nowMinutes - aptMinutes;
            return minutesPast <= 30; // expires 30 minutes after the appointment time
          })
          .map((a) => {
            const [h, m] = (a.appointment_time || "00:00").split(":").map(Number);
            const aptMinutes = h * 60 + m;
            const nowIST2 = new Date(
              new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
            );
            const nowMin = nowIST2.getHours() * 60 + nowIST2.getMinutes();
            const minutesLeft = Math.max(0, 30 - (nowMin - aptMinutes));
            return {
              id: a.id,
              patient: a.patient?.full_name || "Patient",
              time: a.appointment_time ? formatTimeString(a.appointment_time) : "",
              date: a.appointment_date,
              reason: a.reason || a.chief_complaint || "",
              minutesLeft, // remaining minutes before expiry
            };
          });
        setIncomingCalls(pending);
      }
    } catch {
      /* silent */
    }
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

      setCallRequests(
        appointments
          .filter((a) => a.status === "booked" && a.appointment_type === "instant")
          .slice(0, 5)
          .map((a) => ({
            id: a.id,
            patient: a.patient?.full_name || "Patient",
            time: `${a.appointment_date} \u2022 ${a.appointment_time ? formatTimeString(a.appointment_time) : ""}`,
            status: "pending",
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

  const handleAcceptAndJoin = async (appointmentId) => {
    if (!doctorId) return;
    setAcceptingCallId(appointmentId);
    const tid = toast.loading("Accepting call\u2026");
    try {
      const res = await api.post("/instant-call/accept", {
        appointment_id: appointmentId,
        doctor_id: doctorId,
      });
      toast.dismiss(tid);
      if (res.success) {
        toast.success("Call accepted! Joining video\u2026");
        router.push(`/appointments/${appointmentId}/video?userId=${doctorId}&role=doctor`);
      } else {
        toast.error(res.message || "Failed to accept call");
      }
    } catch {
      toast.dismiss(tid);
      toast.error("Something went wrong");
    } finally {
      setAcceptingCallId(null);
    }
  };

  const handleStartCall = async (apt) => {
    if (!doctorId) return;
    
    // If it's an instant call, accept it first
    if (apt.type === "instant" && apt.status === "booked") {
      return handleAcceptAndJoin(apt.id);
    }

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
      <div className="h-full w-full flex items-center justify-center bg-gradient-to-b from-gray-50 to-white min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-[#0067A1]/20 rounded-full" />
            <div className="w-16 h-16 border-4 border-[#0067A1] border-t-transparent rounded-full animate-spin absolute inset-0" />
            <div className="absolute inset-0 flex items-center justify-center">
              <FaStethoscope className="w-5 h-5 text-[#0067A1]" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-500">Loading your dashboard&hellip;</p>
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
    { title: "Total Appointments", value: stats.totalAppointments, icon: FaCalendarAlt, gradient: "from-[#0067A1] to-[#0080C6]", href: "/doctor/appointments" },
    { title: "Completed", value: stats.completed, icon: FaCheck, gradient: "from-emerald-500 to-green-600", href: "/doctor/appointments?status=completed" },
    { title: "Pending", value: stats.pending, icon: FaClock, gradient: "from-amber-500 to-orange-500", href: "/doctor/appointments?status=booked" },
    { title: "Cancelled", value: stats.cancelled, icon: FaTimes, gradient: "from-rose-500 to-red-600", href: "/doctor/appointments?status=cancelled" },
    { title: "Prescriptions", value: stats.totalPrescriptions, icon: FaFileMedical, gradient: "from-violet-500 to-purple-600", href: "/doctor/prescriptions" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Incoming Instant Call Strip */}
      <AnimatePresence>
        {incomingCalls.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="mb-4"
          >
            {incomingCalls.map((call) => (
              <div
                key={call.id}
                className="bg-gradient-to-r from-[#0067A1] via-[#0080C6] to-[#0067A1] px-4 sm:px-6 py-3 rounded-2xl mb-2"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <FaPhoneAlt className="w-4 h-4 text-white animate-pulse" />
                      </div>
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-semibold">
                          Incoming Instant Call from {call.patient}
                        </p>
                        {call.minutesLeft !== undefined && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${call.minutesLeft <= 5 ? 'bg-red-500/80 text-white animate-pulse' : 'bg-white/20 text-white'}`}>
                            Expires in {call.minutesLeft}m
                          </span>
                        )}
                      </div>
                      <p className="text-white/60 text-xs">
                        {call.time ? `Requested at ${call.time}` : "Requesting instant video consultation"}
                        {call.reason ? ` • ${call.reason}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleAcceptAndJoin(call.id)}
                      disabled={acceptingCallId === call.id}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-[#0067A1] rounded-xl text-sm font-bold hover:bg-gray-100 transition-all disabled:opacity-50 shadow-lg"
                    >
                      {acceptingCallId === call.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-[#0067A1] border-t-transparent rounded-full animate-spin" />
                          Connecting&hellip;
                        </>
                      ) : (
                        <>
                          <FaVideo className="w-4 h-4" />
                          Accept &amp; Join
                        </>
                      )}
                    </motion.button>
                    <Link
                      href="/doctor/instant-request"
                      className="px-4 py-2.5 bg-white/15 backdrop-blur-sm border border-white/20 text-white rounded-xl text-sm font-medium hover:bg-white/25 transition-all"
                    >
                      View All
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full mx-auto space-y-5 sm:space-y-6">
        {/* Hero Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0067A1] via-[#0080C6] to-[#0067A1] rounded-3xl px-5 sm:px-8 pt-6 pb-8 sm:pb-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24" />
          <div className="absolute top-1/2 right-1/4 w-20 h-20 bg-white/5 rounded-full" />
          <div className="relative">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <p className="text-white/60 text-sm font-medium tracking-wide">{greeting}</p>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                  {cleanDoctorName} &#128075;
                </h1>
                <p className="text-white/70 text-sm mt-1.5">
                  Here&apos;s your practice overview for {formatDate(currentTime)}
                </p>
              </div>
              <div className="flex items-center gap-3 self-start sm:self-auto">
                <div className="px-4 py-2.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl text-white">
                  <p className="text-lg font-bold leading-tight">{formatTime(currentTime)}</p>
                  <p className="text-[10px] text-white/50">Current time</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs text-white/80 font-medium">Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              href="/doctor/instant-request"
              className="group relative bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-lg hover:border-[#0067A1]/20 transition-all duration-300 text-left overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0067A1] to-[#0080C6] opacity-0 group-hover:opacity-100 transition-opacity rounded-t-2xl" />
              <div className="w-11 h-11 bg-[#0067A1]/10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform relative">
                <FaVideo className="w-5 h-5 text-[#0067A1]" />
                {incomingCalls.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {incomingCalls.length}
                  </span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-gray-800">Instant Calls</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {incomingCalls.length > 0 ? `${incomingCalls.length} pending` : "No pending"}
              </p>
            </Link>

            <Link
              href="/doctor/appointments"
              className="group relative bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-lg hover:border-[#0067A1]/20 transition-all duration-300 text-left overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-2xl" />
              <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <FaCalendarAlt className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800">Appointments</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Manage schedule</p>
            </Link>

            <Link
              href="/doctor/prescriptions"
              className="group relative bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-lg hover:border-[#0067A1]/20 transition-all duration-300 text-left overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-2xl" />
              <div className="w-11 h-11 bg-violet-50 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <FaFileMedical className="w-5 h-5 text-violet-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800">Prescriptions</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Medical records</p>
            </Link>

            <Link
              href="/doctor/manage-slots"
              className="group relative bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-lg hover:border-[#0067A1]/20 transition-all duration-300 text-left overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-green-600 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-2xl" />
              <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <FaClock className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800">Manage Slots</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Availability</p>
            </Link>
          </div>
        </section>

        {/* Stats Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
             <h2 className="text-lg font-bold text-gray-800">Today's Statistics</h2>
             {scorecard && (
               <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest leading-none">
                     Clinical Safety Audit: {scorecard.safety_score === 'N/A' ? 'No Data' : scorecard.safety_score}
                  </span>
               </div>
             )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {statCards.map((s) => (
              <Link
                key={s.title}
                href={s.href}
                className="group relative bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-lg hover:border-[#0067A1]/20 transition-all duration-300 block cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <s.icon className="w-4 h-4 text-white" />
                  </div>
                  <FaChevronRight className="w-3 h-3 text-gray-300 group-hover:text-[#0067A1] group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5 font-medium">{s.title}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Clinical Performance Scorecard (M8) */}
        {scorecard && (
          <section className="mt-8">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                 <FaStethoscope size={100} className="text-[#0067A1]" />
              </div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#0067A1] rounded-xl flex items-center justify-center shadow-lg shadow-[#0067A1]/20">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 tracking-tight">Clinical Performance Scorecard</h2>
                  <p className="text-xs text-slate-400 font-medium">Compliance & Safety metrics from your last {scorecard.total_consultations} sessions</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                <div className="space-y-2">
                   <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Safety Compliance</span>
                      <span className="text-sm font-black text-[#0067A1]">{scorecard.safety_score}</span>
                   </div>
                   <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#0067A1] rounded-full transition-all duration-1000" style={{ width: scorecard.safety_score === 'N/A' ? '0%' : scorecard.safety_score }}></div>
                   </div>
                   <p className="text-[10px] text-slate-400 leading-tight">Percentage of high-severity alerts acknowledged with valid clinical justification.</p>
                </div>

                <div className="space-y-2">
                   <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Doc Quality</span>
                      <span className="text-sm font-black text-emerald-600">{scorecard.quality_score}</span>
                   </div>
                   <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: scorecard.quality_score === 'N/A' ? '0%' : scorecard.quality_score }}></div>
                   </div>
                   <p className="text-[10px] text-slate-400 leading-tight">Ratio of manual vs auto-populated entries. Indicates depth of clinical documentation.</p>
                </div>

                <div className="space-y-2">
                   <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Impact</span>
                      <span className="text-sm font-black text-indigo-600">{scorecard.patient_impact}</span>
                   </div>
                   <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: scorecard.patient_impact === 'N/A' ? '0%' : scorecard.patient_impact }}></div>
                   </div>
                   <p className="text-[10px] text-slate-400 leading-tight">Aggregate improvement score based on patient follow-up feedback.</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* AI Smart Tool Alerts */}
        {aiAlerts.length > 0 && (
          <section>
            <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5 border-l-4 border-l-red-500">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                    <FaBrain className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-800">Potential risk detected. Please review before proceeding.</h3>
                    <p className="text-xs text-red-500 font-semibold">{aiAlerts.length} patient assessment(s) require review</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {aiAlerts.map(alert => (
                  <div key={alert.id} className="bg-red-50/50 rounded-xl p-4 border border-red-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-500 uppercase">{alert.tool_name === "lung_connect" ? "Lung Report" : "Cardio Report"}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${alert.risk_level === "critical" || alert.risk_level === "high" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
                          {alert.risk_level?.toUpperCase()} RISK
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{alert.recommendation ? alert.recommendation.substring(0, 100) + "..." : "Preliminary assessment completed."}</p>
                      <p className="text-xs text-gray-400 mt-1">Logged: {new Date(alert.timestamp).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
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
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors">
                        Doctor acknowledges and proceeds with clinical judgment.
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
                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors">
                        Acknowledge
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Instant Call Requests (prominent section) */}
        {callRequests.length > 0 && (
          <section>
            <div className="bg-gradient-to-r from-[#0067A1] via-[#0080C6] to-[#0067A1] rounded-2xl p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <FaPhone className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Pending Call Requests</h3>
                    <p className="text-xs text-white/60">{callRequests.length} patient{callRequests.length !== 1 ? "s" : ""} waiting</p>
                  </div>
                </div>
                <Link
                  href="/doctor/instant-request"
                  className="text-xs text-white/80 hover:text-white font-medium flex items-center gap-1 transition-colors"
                >
                  View All <FaChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-2.5">
                {callRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                        <FaUser className="w-4 h-4 text-white/80" />
                      </div>
                      <div>
                        <p className="text-sm text-white font-semibold">{req.patient}</p>
                        <p className="text-[11px] text-white/50">{req.time}</p>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleAcceptAndJoin(req.id)}
                      disabled={acceptingCallId === req.id}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-[#0067A1] rounded-xl text-sm font-bold hover:bg-gray-100 transition-all disabled:opacity-50 shadow-lg"
                    >
                      {acceptingCallId === req.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-[#0067A1] border-t-transparent rounded-full animate-spin" />
                          Connecting&hellip;
                        </>
                      ) : (
                        <>
                          <FaVideo className="w-3.5 h-3.5" />
                          Accept &amp; Join Call
                        </>
                      )}
                    </motion.button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Main Grid: Appointments + Prescriptions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Recent Appointments */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-800">Recent Appointments</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Today&apos;s schedule</p>
                </div>
                <Link
                  href="/doctor/appointments"
                  className="text-xs text-[#0067A1] hover:text-[#004F7C] font-semibold flex items-center gap-1"
                >
                  View All <FaChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {recentAppointments.length > 0 ? (
                <div className="space-y-2.5">
                  {recentAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-gray-50 hover:bg-gray-50/80 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#0067A1]/10 flex items-center justify-center shrink-0">
                          <FaUser className="w-4 h-4 text-[#0067A1]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{apt.patient}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                            <FaClock className="w-3 h-3" />
                            <span>{apt.date} &bull; {apt.time}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={apt.status} />
                        {["rejected", "cancelled"].includes(apt.status) ? (
                          <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                            {apt.status === "rejected" ? "Rejected" : "Cancelled"}
                          </span>
                        ) : isAppointmentExpired(apt) ? (
                          <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-1 rounded-md">
                            Expired
                          </span>
                        ) : (apt.status === "booked" || apt.status === "approved") ? (
                          <>
                            <button
                              onClick={() => handleStartCall(apt)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0067A1] text-white text-xs font-semibold rounded-lg hover:bg-[#004F7C] transition-colors"
                            >
                              <FaVideo className="w-3 h-3" />
                              {apt.status === "booked" ? "Accept & Join" : "Join Call"}
                            </button>
                            <button
                              onClick={() => handleNotifyPatient(apt)}
                              disabled={isLoading}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                              title="Notify Patient"
                            >
                              <FaBell className="w-3 h-3" />
                              Notify
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={FaCalendarAlt} title="No appointments today" sub="Schedule will appear here" />
              )}
            </div>
          </div>

          {/* Recent Prescriptions */}
          <div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-800">Recent Prescriptions</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Latest records</p>
                </div>
                <Link
                  href="/doctor/prescriptions"
                  className="text-xs text-[#0067A1] hover:text-[#004F7C] font-semibold flex items-center gap-1"
                >
                  View All <FaChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {recentPrescriptions.length > 0 ? (
                <div className="space-y-2.5">
                  {recentPrescriptions.map((rx) => (
                    <div
                      key={rx.id}
                      className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-50 hover:bg-gray-50/80 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                        <FaFileMedical className="w-4 h-4 text-violet-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{rx.patient}</p>
                        <div className="flex items-center justify-between text-xs text-gray-400 mt-0.5">
                          <span>{rx.medicines} medicine{rx.medicines !== 1 ? "s" : ""}</span>
                          <span>{rx.date}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={FaFileMedical} title="No prescriptions" sub="Records appear here" />
              )}
            </div>
          </div>
        </div>

        {/* Activity Logs */}
        <section>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-800">Activity Log</h3>
                <p className="text-xs text-gray-400 mt-0.5">Recent actions</p>
              </div>
            </div>
            {logs.length > 0 ? (
              <div className="space-y-2.5">
                {logs.slice(0, 6).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50/80 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                      <FaHistory className="w-3 h-3 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700">{log.action}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                        <span className="flex items-center gap-1">
                          <FaCalendarAlt className="w-3 h-3" />
                          {log.date}
                        </span>
                        {log.time && (
                          <span className="flex items-center gap-1">
                            <FaClock className="w-3 h-3" />
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
    completed: { text: "Completed", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    booked: { text: "Booked", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    approved: { text: "Approved", cls: "bg-[#0067A1]/8 text-[#0067A1] border-[#0067A1]/20" },
    pending: { text: "Pending", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    cancelled: { text: "Cancelled", cls: "bg-red-50 text-red-600 border-red-200" },
    rejected: { text: "Rejected", cls: "bg-red-50 text-red-600 border-red-200" },
  };
  const c = cfg[status] || { text: status, cls: "bg-gray-50 text-gray-600 border-gray-200" };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${c.cls}`}>
      {c.text}
    </span>
  );
}

function EmptyState({ icon: Icon, title, sub }) {
  return (
    <div className="text-center py-8">
      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <Icon className="w-5 h-5 text-gray-400" />
      </div>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}
