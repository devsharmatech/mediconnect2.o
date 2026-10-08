"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TbLungsFilled } from "react-icons/tb";
import {
  FaHeartbeat,
  FaCalendarAlt,
  FaFileMedical,
  FaPills,
  FaRobot,
  FaHistory,
  FaChartLine,
  FaUserMd,
  FaVideo,
  FaTimes,
  FaPhoneAlt,
  FaStar,
  FaMapMarkerAlt,
  FaClock,
  FaSearch,
  FaLock,
  FaStethoscope,
  FaHandHoldingHeart,
  FaFlask,
  FaExclamationTriangle,
  FaWind,
  FaFilter,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";
import ConsentGate from "@/components/public-site/auth/ConsentGate";
import { loadRazorpayScript } from "@/lib/razorpay";

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [activeCallAppointmentId, setActiveCallAppointmentId] = useState(null);
  const [nextActionData, setNextActionData] = useState(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const router = useRouter();

  // Convert "HH:MM:SS" or "HH:MM" to "12:30 PM" format
  const formatTime12h = (timeStr) => {
    if (!timeStr) return "—";
    const base = String(timeStr).slice(0, 5); // "HH:MM"
    const [hStr, mStr] = base.split(":");
    const h = parseInt(hStr, 10);
    if (isNaN(h)) return timeStr;
    const suffix = h >= 12 ? "PM" : "AM";
    const displayH = ((h + 11) % 12) + 1;
    return `${displayH}:${mStr} ${suffix}`;
  };

  useEffect(() => {
    let parsed = null;
    const userData = localStorage.getItem("userData");
    if (userData) {
      try {
        parsed = JSON.parse(userData);
      } catch (e) {
        console.error("Failed to parse user data:", e);
      }
    }
    if (!parsed) {
      const docData = localStorage.getItem("doctorUser");
      if (docData) {
        try { parsed = JSON.parse(docData); } catch (e) {}
      }
    }
    if (!parsed && localStorage.getItem("userId")) {
      parsed = { id: localStorage.getItem("userId") };
    }
    if (parsed) setUser(parsed);
  }, []);

  useEffect(() => {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const userId = user?.user_id || user?.user?.id || user?.id;
    if (userId) {
      // Skip if stale / non-UUID value (prevents 22P02 Postgres error)
      if (!UUID_RE.test(userId)) return;

      fetchAssessments(userId);
      fetchUpcomingAppointments(userId);
      fetchNextAction(userId);
      // Poll for active video call notification every 10s
      const pollActiveCall = async () => {
        try {
          const res = await fetch("/api/notifications/get", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId, unread: false, page: 1 }),
          });
          const data = await res.json();
          const notifs = Array.isArray(data?.data) ? data.data : [];
          const callNotif = notifs.find((n) => !n.read && n.type === "video_call_started");
          if (callNotif) {
            const meta = typeof callNotif.metadata === "string" ? JSON.parse(callNotif.metadata) : callNotif.metadata;
            setActiveCallAppointmentId(meta?.appointment_id || null);
          } else {
            setActiveCallAppointmentId(null);
          }
        } catch { /* silent */ }
      };
      pollActiveCall();
      const interval = setInterval(pollActiveCall, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchAssessments = async (userId) => {
    try {
      const response = await fetch(`/api/health/assessments?user_id=${userId}&limit=5`);
      const data = await response.json();
      if (data.success) setAssessments(data.data.assessments || []);
    } catch (error) {
      console.error("Failed to fetch assessments:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingAppointments = async (userId) => {
    try {
      const res = await fetch("/api/appointment/patient-appointment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: userId, date_filter: "today" }),
      });
      const data = await res.json();
      if (data.success) {
        const list = data.data?.appointments || data.data || [];
        const now = new Date();
        const filtered = list.filter((a) => {
          if (a.status === "rejected" || a.status === "cancelled") return false;
          if (!a.appointment_date || !a.appointment_time) return true;

          const rawDateStr = typeof a.appointment_date === "string" 
            ? a.appointment_date 
            : a.appointment_date instanceof Date 
            ? a.appointment_date.toISOString().split("T")[0]
            : String(a.appointment_date || "");
          const datePart = rawDateStr.includes("T")
            ? rawDateStr.split("T")[0]
            : rawDateStr;
          const apptDateTime = new Date(`${datePart}T${a.appointment_time}`);

          // Filter out appointments that started more than 1 hour in the past
          const diffMs = now.getTime() - apptDateTime.getTime();
          return isNaN(diffMs) || diffMs <= 60 * 60 * 1000;
        });
        setUpcomingAppointments(filtered.slice(0, 3));
      }
    } catch { /* silent */ }
  };

  const fetchNextAction = async (userId) => {
    try {
      const res = await fetch(`/api/user/next-step?user_id=${userId}`);
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.next_action !== "NONE") {
          setNextActionData(data.data);
        } else {
          setNextActionData(null);
        }
      } else {
        setNextActionData(null);
      }
    } catch {
      setNextActionData(null);
    }
  };

  const firstName = (() => {
    const details = user?.user?.details || user?.details;
    const name = details?.full_name || user?.user?.full_name || user?.full_name || user?.name;
    if (!name) return "";
    return name.split(" ")[0];
  })();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  })();

  const quickActions = [
    { label: "Appointments", sub: "Book & manage", href: "/website/appointments", icon: FaCalendarAlt, gradient: "from-teal-500 to-emerald-600", bg: "bg-teal-50", text: "text-[#004F7C]" },
    { label: "LungConnect", sub: "Respiratory Hub", href: "/lung-connect", icon: TbLungsFilled, gradient: "from-teal-500 to-emerald-600", bg: "bg-teal-50", text: "text-[#0067A1]" },
    { label: "CardioConnect", sub: "Heart Vitals & Hub", href: "/website/cardio-connect", icon: FaHeartbeat, gradient: "from-rose-500 to-pink-600", bg: "bg-rose-50", text: "text-rose-600" },
    { label: "Medicines", sub: "Order online", href: "/website/medicine-order", icon: FaPills, gradient: "from-amber-500 to-orange-600", bg: "bg-amber-50", text: "text-amber-700" },
    { label: "Lab Reports", sub: "View results", href: "/website/lab-reports", icon: FaFileMedical, gradient: "from-purple-500 to-violet-600", bg: "bg-purple-50", text: "text-purple-700" },
    { label: "Nursing Status", sub: "Track request", href: "/website/nursing-care/status", icon: FaHandHoldingHeart, gradient: "from-fuchsia-500 to-purple-600", bg: "bg-fuchsia-50", text: "text-fuchsia-700" },
    { label: "Digital Locker", sub: "Your records", href: "/website/digital-locker", icon: FaLock, gradient: "from-slate-500 to-gray-700", bg: "bg-slate-50", text: "text-slate-700" },
    { label: "Lab Tests", sub: "Book now", href: "/website/dashboard/lab-booking", icon: FaFlask, gradient: "from-blue-500 to-indigo-600", bg: "bg-blue-50", text: "text-[#004F7C]" },
    { label: "Breathing Exercises", sub: "Relax & restore", href: "/lung-connect?action=breathing", icon: FaWind, gradient: "from-teal-400 to-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
    { label: "Health Assistant", sub: "Chat for help", onClick: () => window.dispatchEvent(new CustomEvent("open-dr-mediconnect-chat")), icon: FaUserMd, gradient: "from-emerald-500 to-teal-600", bg: "bg-emerald-50", text: "text-emerald-700" },
  ];

  return (
    <div className="min-h-screen ">
      {/* Hero / Greeting */}
      <div className="relative overflow-hidden bg-[#0067A1] rounded-[5px] px-4 sm:px-6 pt-6 pb-10 sm:pb-14 mb-6 shadow-md">
        <div className="relative max-w-full mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-white/60 text-sm font-medium tracking-wide">{greeting}</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                {firstName ? `${firstName} ` : "Welcome! "}{String.fromCodePoint(0x1F44B)}
              </h1>
              <p className="text-white/70 text-sm mt-1.5">Here is your health overview for today</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full mx-auto space-y-8 pb-12">
        {/* Engagement CTA Banner */}
        {nextActionData && nextActionData.decision !== "SUPPRESS" && (
          <section>
            <div className={`p-5 sm:p-6 rounded-[5px] text-white shadow-lg relative overflow-hidden ${nextActionData.intensity === "STRONG" ? "bg-red-600 animate-pulse" :
                nextActionData.intensity === "MEDIUM" ? "bg-amber-500" :
                  "bg-[#0067A1]"
              }`}>
              <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <FaExclamationTriangle className="w-5 h-5 text-white shrink-0" /> Action Required
                  </h2>
                  <p className="text-white/80 mt-1">
                    {nextActionData.next_action === "CONSENT_REQUIRED" && "Please grant DPDP consents to continue using services."}
                    {nextActionData.next_action === "WAIT_FOR_DOCTOR" && "A doctor will be assigned to your consultation shortly."}
                    {nextActionData.next_action === "RESUME_SESSION" && "You have an active consultation session."}
                    {nextActionData.next_action === "COMPLETE_PAYMENT" && "Your consultation is complete. Please process the pending payment."}
                    {nextActionData.next_action === "START_CONSULTATION" && "Payment received. Start your consultation now."}
                    {nextActionData.next_action === "ORDER_PHARMACY" && "Doctor has recommended medicines. Order them online easily."}
                    {nextActionData.next_action === "BOOK_LAB" && "Doctor has recommended lab tests. Book a home collection."}
                    {nextActionData.next_action === "BOOK_FOLLOWUP" && "Doctor has requested a follow-up appointment."}
                    {nextActionData.next_action === "VIEW_PRESCRIPTION" && "Your consultation is complete. View your prescription."}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (nextActionData.next_action === "CONSENT_REQUIRED") {
                      setShowConsentModal(true);
                    }
                    else if (nextActionData.next_action === "ORDER_PHARMACY") router.push("/website/medicine-order");
                    else if (nextActionData.next_action === "BOOK_LAB") router.push("/website/dashboard/lab-booking");
                    else if (nextActionData.next_action === "BOOK_FOLLOWUP") router.push("/website/appointments");
                    else if (nextActionData.next_action === "VIEW_PRESCRIPTION") router.push("/website/appointments");
                    else if (nextActionData.next_action === "COMPLETE_PAYMENT") router.push("/website/appointments");
                    else if (nextActionData.next_action === "START_CONSULTATION") {
                      if (nextActionData.consultation_id) {
                        router.push(`/appointments/${nextActionData.consultation_id}/video?userId=${user?.id}&role=patient`);
                      } else if (nextActionData.appointment_id) {
                        router.push(`/appointments/${nextActionData.appointment_id}/video?userId=${user?.id}&role=patient`);
                      } else {
                        router.push("/website/appointments");
                      }
                    }
                    else if (nextActionData.next_action === "RESUME_SESSION" && nextActionData.consultation_id) {
                      router.push(`/appointments/${nextActionData.consultation_id}/video?userId=${user?.id}&role=patient`);
                    }
                    else if (nextActionData.consultation_id) {
                      router.push(`/appointments/${nextActionData.consultation_id}/video?userId=${user?.id}&role=patient`);
                    }
                  }}
                  className="px-6 py-2.5 bg-white text-gray-900 rounded-[5px] font-bold text-sm hover:bg-gray-50 transition-colors shrink-0"
                >
                  {nextActionData.next_action === "WAIT_FOR_DOCTOR" ? "View Status" : "Take Action"}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Quick Actions */}
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {quickActions.map((action) => {
              const Wrapper = action.href ? Link : "button";
              const wrapperProps = action.href ? { href: action.href } : { type: "button", onClick: action.onClick };
              return (
                <Wrapper key={action.label} {...wrapperProps}
                  className="group relative bg-white rounded-[5px] border border-gray-100 p-4 hover:shadow-lg hover:border-gray-200 transition-all duration-300 text-left overflow-hidden">
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${action.gradient} opacity-0 group-hover:opacity-100 transition-opacity rounded-t-2xl`} />
                  <div className={`w-11 h-11 ${action.bg} rounded-[5px] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <action.icon className={`w-5 h-5 ${action.text}`} />
                    {action.pulse && <span className="absolute top-3.5 right-3.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800">{action.label}</h3>
                  <p className="text-[11px] text-gray-800 mt-0.5">{action.sub}</p>
                </Wrapper>
              );
            })}
          </div>
        </section>

        {/* Today's & Upcoming Appointments */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">Today&apos;s & Upcoming Appointments</h2>
            <Link href="/website/appointments" className="text-sm text-[#0067A1] hover:text-[#004F7C] font-semibold">
              View All
            </Link>
          </div>

          {upcomingAppointments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingAppointments.map((appt) => (
                <motion.div
                  key={appt.id}
                  whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}
                  className="bg-white rounded-[5px] border border-gray-100 p-5 flex flex-col justify-between hover:border-teal-200 transition-all duration-300 relative overflow-hidden"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-[5px] bg-teal-50 flex items-center justify-center shrink-0">
                      <FaStethoscope className="w-5 h-5 text-[#0067A1]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-[5px] mb-1.5 ${appt.status === "approved" ? "bg-green-50 text-green-700" :
                          appt.status === "booked" ? "bg-amber-50 text-amber-700" :
                            "bg-gray-50 text-gray-950"
                        }`}>
                        {appt.status === "approved" ? "Confirmed" : appt.status === "booked" ? "Pending" : appt.status}
                      </span>
                      <h4 className="text-base font-bold text-gray-900 truncate">
                        {appt.doctor?.full_name || appt.doctor_name || "Doctor"}
                      </h4>
                      <p className="text-xs text-gray-900 font-medium truncate mt-0.5">
                        {appt.doctor?.specialization || appt.appointment_type || "Consultation"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                    <span className="text-xs text-gray-900 font-medium flex items-center gap-1.5">
                      <FaClock className="w-3.5 h-3.5 text-gray-800" />
                      {formatTime12h(appt.appointment_time)}
                    </span>

                    {activeCallAppointmentId === appt.id ? (
                      <button
                        onClick={() => router.push(`/appointments/${appt.id}/video?userId=${user?.id}&role=patient`)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-[5px] animate-pulse shadow-md transition-all"
                      >
                        <FaVideo className="w-3.5 h-3.5" />
                        Join Call
                      </button>
                    ) : (
                      <Link
                        href="/website/appointments"
                        className="text-xs text-[#0067A1] hover:text-[#004F7C] font-semibold flex items-center gap-1"
                      >
                        Details →
                      </Link>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              whileHover={{ y: -2 }}
              className="bg-white rounded-[5px] border border-gray-100 border-dashed p-8 text-center flex flex-col items-center justify-center gap-3"
            >
              <div className="w-12 h-12 rounded-[5px] bg-teal-50 flex items-center justify-center text-[#0067A1]">
                <FaCalendarAlt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800">No Appointments Today</h3>
                <p className="text-xs text-gray-900 mt-1 max-w-xs mx-auto">Schedule a consultation with our experienced specialists for personalized care.</p>
              </div>
              <Link href="/website/appointments" className="px-4 py-2 bg-[#0067A1] text-white rounded-[5px] text-xs font-semibold hover:bg-[#004F7C] transition-colors mt-1">
                Book Appointment
              </Link>
            </motion.div>
          )}
        </section>

        {/* Specialized Health Programs Section (LungConnect & CardioConnect) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Specialized Health Programs</h2>
              <p className="text-xs text-gray-800 mt-0.5">Comprehensive lifestyle health tracking and guided assessments</p>
            </div>
            {assessments.length > 0 && (
              <Link href="/website/dashboard/assessments" className="text-sm text-[#0067A1] hover:text-[#004F7C] font-medium flex items-center gap-1">
                <FaHistory className="w-3.5 h-3.5" />
                History
              </Link>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LC-18 LungConnect Card */}
            <motion.div
              whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.08)" }}
              transition={{ duration: 0.2 }}
              className="relative overflow-hidden bg-white rounded-[5px] p-6 border border-slate-200 shadow-sm flex flex-col justify-between min-h-[210px]"
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-[#0067A1] rounded-[5px] flex items-center justify-center shrink-0 shadow-md">
                      <TbLungsFilled className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-gray-900">LungConnect</h3>
                      <p className="text-xs text-[#0067A1] font-semibold mt-0.5">Respiratory Wellness & Activity Hub (Open Access)</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-[5px] uppercase tracking-wider">No Prerequisite</span>
                </div>

                <p className="text-sm text-gray-950 mt-4 leading-relaxed">
                  All feature activities are open to everyone without prior assessment. Directly launch functional Move sessions, 6-minute walk tests, guided breathing, and monitor live AQI.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                {(() => {
                  const la = assessments.filter((a) => a.assessment_type === "lung");
                  return la.length > 0 ? (
                    <div className="flex items-center gap-1.5 text-xs text-gray-950 font-medium">
                      <FaChartLine className="w-3.5 h-3.5 text-[#0067A1]" />
                      <span>Last: {new Date(la[0].created_at).toLocaleDateString()} (Recorded Difference Tracked)</span>
                    </div>
                  ) : (
                    <span className="text-xs text-emerald-600 font-medium">✓ Activities Ready to Launch</span>
                  );
                })()}

                <div className="flex items-center gap-2 grow sm:grow-0">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push("/website/lung-connect")}
                    className="px-4 py-2 bg-[#0067A1] hover:bg-[#004F7C] text-white text-xs font-bold rounded-[5px] shadow-sm transition-colors grow text-center whitespace-nowrap"
                  >
                    Enter Hub
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push("/lung-connect?action=move")}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[5px] text-xs font-bold transition-colors shadow-2xs text-center whitespace-nowrap"
                  >
                    Launch Move
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push("/lung-connect?action=breathing")}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 text-[#003358] rounded-[5px] text-xs font-bold transition-colors border border-slate-200 shadow-2xs text-center whitespace-nowrap"
                  >
                    Breathing Studio
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* CardioConnect Card */}
            <motion.div
              whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.08)" }}
              transition={{ duration: 0.2 }}
              className="relative overflow-hidden bg-white rounded-[5px] p-6 border border-slate-200 shadow-sm flex flex-col justify-between min-h-[210px]"
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-[#003358] rounded-[5px] flex items-center justify-center shrink-0 shadow-md">
                      <FaHeartbeat className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-gray-900">CardioConnect</h3>
                      <p className="text-xs text-[#003358] font-semibold mt-0.5">Heart Wellness & Training Hub (Open Access)</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-[5px] uppercase tracking-wider">No Prerequisite</span>
                </div>

                <p className="text-sm text-gray-950 mt-4 leading-relaxed">
                  No compulsory assessment required. Engage directly in Heart Training sessions, 6-minute Walking Performance Tests, track your 11-factor Spectrum, and log longitudinal progress.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                {(() => {
                  const ha = assessments.filter((a) => a.assessment_type === "heart");
                  return ha.length > 0 ? (
                    <div className="flex items-center gap-1.5 text-xs text-gray-950 font-medium">
                      <FaChartLine className="w-3.5 h-3.5 text-[#003358]" />
                      <span>Last: {new Date(ha[0].created_at).toLocaleDateString()} (11 Spectrum Factors Tracked)</span>
                    </div>
                  ) : (
                    <span className="text-xs text-emerald-600 font-medium">✓ Training & Walking Tests Ready</span>
                  );
                })()}

                <div className="flex items-center gap-2 grow sm:grow-0">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push("/website/cardio-connect")}
                    className="px-4 py-2 bg-[#003358] hover:bg-[#00223d] text-white text-xs font-bold rounded-[5px] shadow-sm transition-colors grow text-center whitespace-nowrap"
                  >
                    Enter CardioConnect
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push("/website/cardio-connect?action=training")}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[5px] text-xs font-bold transition-colors shadow-2xs text-center whitespace-nowrap"
                  >
                    Heart Training
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push("/website/cardio-connect?action=walking")}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 text-[#003358] rounded-[5px] text-xs font-bold transition-colors border border-slate-200 shadow-2xs text-center whitespace-nowrap"
                  >
                    Walking Test
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>



        {/* Nursing / Home Care Banner */}
        <section>
          <Link href="/website/nursing-care">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="group relative overflow-hidden rounded-[5px] p-5 sm:p-6 cursor-pointer hover:shadow-xl transition-shadow"
              style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 40%, #c084fc 100%)" }}
            >
              {/* Decorative blobs */}
              {/* Animated floating crosses */}
              <motion.span
                className="absolute top-3 right-16 text-white/10 text-2xl font-bold select-none"
                animate={{ y: [0, -6, 0], opacity: [0.1, 0.2, 0.1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >+</motion.span>
              <motion.span
                className="absolute bottom-4 right-1/3 text-white/10 text-lg font-bold select-none"
                animate={{ y: [0, -4, 0], opacity: [0.08, 0.15, 0.08] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              >+</motion.span>

              <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <motion.div
                    className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-[5px] flex items-center justify-center shrink-0 border border-white/10"
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <FaHandHoldingHeart className="w-6 h-6 text-white" />
                  </motion.div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg sm:text-xl font-bold text-white">Nursing & Home Care</h3>
                      <span className="text-[10px] font-bold bg-white/25 text-white px-2 py-0.5 rounded-[5px] tracking-wide uppercase">New</span>
                    </div>
                    <p className="text-white/70 text-sm mt-0.5">Request trained caregivers for home visits, elderly care & post-operative support</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-5 py-3 rounded-[5px] group-hover:bg-white/30 transition-colors self-start sm:self-auto border border-white/10">
                  <span className="text-sm font-semibold text-white whitespace-nowrap">Request Now</span>
                  <motion.span
                    className="text-white text-lg"
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  >→</motion.span>
                </div>
              </div>
            </motion.div>
          </Link>
        </section>

        {/* Recent Assessments History */}
        {assessments.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-650 flex items-center gap-2">
              <FaHistory className="w-3.5 h-3.5 text-gray-800" />
              Recent Assessments
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {assessments.slice(0, 3).map((a) => (
                <div key={a.id} className="bg-white rounded-[5px] p-4 border border-gray-100 hover:shadow-sm transition-all">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      {a.assessment_type === "heart" ? (
                        <div className="w-7 h-7 bg-rose-50 rounded-[5px] flex items-center justify-center"><FaHeartbeat className="w-3.5 h-3.5 text-rose-500" /></div>
                      ) : (
                        <div className="w-7 h-7 bg-teal-50 rounded-[5px] flex items-center justify-center"><TbLungsFilled className="w-3.5 h-3.5 text-teal-500" /></div>
                      )}
                      <span className="text-sm font-medium text-gray-700 capitalize">{a.assessment_type} Health</span>
                    </div>
                    <span className="text-[10px] text-gray-800">{new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-900">Assessment Status</span>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-[5px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Verified
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs text-gray-900">Record Type</span>
                    <span className="text-xs font-medium text-gray-600">Self-Reported Telemetry</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Health Assistant Banner */}
        <section>
          <div className="bg-[#003358] rounded-[5px] p-5 sm:p-6 text-white relative overflow-hidden">
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/15 rounded-[5px] flex items-center justify-center shrink-0">
                  <FaUserMd className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Health Assistant</h3>
                  <p className="text-white/70 text-sm">Describe symptoms & get instant guidance</p>
                </div>
              </div>
              <button type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("open-dr-mediconnect-chat"))}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#0067A1] rounded-[5px] font-semibold hover:bg-gray-100 transition-all shadow-lg self-start sm:self-auto">
                Start Chat
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </section>
      </div>



      {/* DPDP Consent Modal */}
      <ConsentGate
        isOpen={showConsentModal}
        actionLabel="I Agree — Grant Consents"
        onClose={() => setShowConsentModal(false)}
        onConsentGranted={() => {
          setShowConsentModal(false);
          const userId = user?.user_id || user?.user?.id || user?.id;
          if (userId) fetchNextAction(userId); // Refresh state to hide banner
          toast.success("DPDP Consents updated successfully!");
        }}
      />
    </div>
  );
};

export default Dashboard;
