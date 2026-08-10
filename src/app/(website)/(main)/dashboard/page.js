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
  const [showInstantModal, setShowInstantModal] = useState(false);
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
    const userData = localStorage.getItem("userData");
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error("Failed to parse user data:", e);
      }
    }
  }, []);

  useEffect(() => {
    const userId = user?.user_id || user?.user?.id || user?.id;
    if (userId) {
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

          const datePart = a.appointment_date.includes("T")
            ? a.appointment_date.split("T")[0]
            : a.appointment_date;
          const apptDateTime = new Date(`${datePart}T${a.appointment_time}`);

          // Filter out appointments that started more than 1 hour in the past
          const diffMs = now.getTime() - apptDateTime.getTime();
          return diffMs <= 60 * 60 * 1000;
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
    { label: "Instant Doctor", sub: "Talk now", onClick: () => setShowInstantModal(true), icon: FaVideo, gradient: "from-[#0067A1] to-[#0080C6]", bg: "bg-teal-50", text: "text-[#004F7C]", pulse: true },
    { label: "Medicines", sub: "Order online", href: "/website/medicine-order", icon: FaPills, gradient: "from-amber-500 to-orange-600", bg: "bg-amber-50", text: "text-amber-700" },
    { label: "Lab Reports", sub: "View results", href: "/website/lab-reports", icon: FaFileMedical, gradient: "from-purple-500 to-violet-600", bg: "bg-purple-50", text: "text-purple-700" },
    { label: "Nursing Status", sub: "Track request", href: "/website/nursing-care/status", icon: FaHandHoldingHeart, gradient: "from-fuchsia-500 to-purple-600", bg: "bg-fuchsia-50", text: "text-fuchsia-700" },
    { label: "Digital Locker", sub: "Your records", href: "/website/digital-locker", icon: FaLock, gradient: "from-slate-500 to-gray-700", bg: "bg-slate-50", text: "text-slate-700" },
    { label: "Lab Tests", sub: "Book now", href: "/website/dashboard/lab-booking", icon: FaFlask, gradient: "from-blue-500 to-indigo-600", bg: "bg-blue-50", text: "text-[#004F7C]" },
    { label: "Breathing Exercises", sub: "Relax & restore", href: "/website/dashboard/breathing", icon: FaWind, gradient: "from-teal-400 to-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
    { label: "Health Assistant", sub: "Chat for help", onClick: () => window.dispatchEvent(new CustomEvent("open-dr-mediconnect-chat")), icon: FaUserMd, gradient: "from-emerald-500 to-teal-600", bg: "bg-emerald-50", text: "text-emerald-700" },
  ];

  return (
    <div className="min-h-screen ">
      {/* Hero / Greeting */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0067A1] via-[#0080C6] to-[#0067A1] rounded-3xl px-4 sm:px-6 pt-6 pb-10 sm:pb-14 mb-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24" />
        <div className="absolute top-1/2 right-1/4 w-20 h-20 bg-white/5 rounded-full" />
        <div className="relative max-w-full mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-white/60 text-sm font-medium tracking-wide">{greeting}</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                {firstName ? `${firstName} ` : "Welcome! "}{String.fromCodePoint(0x1F44B)}
              </h1>
              <p className="text-white/70 text-sm mt-1.5">Here is your health overview for today</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowInstantModal(true)}
              className="flex items-center gap-3 px-5 py-3 bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl text-white hover:bg-white/25 transition-all self-start sm:self-auto"
            >
              <div className="relative">
                <FaVideo className="w-5 h-5" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold leading-tight">Instant Doctor</p>
                <p className="text-[10px] text-white/60">Available now</p>
              </div>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full mx-auto space-y-8 pb-12">
        {/* Engagement CTA Banner */}
        {nextActionData && nextActionData.decision !== "SUPPRESS" && (
          <section>
            <div className={`p-5 sm:p-6 rounded-2xl text-white shadow-lg relative overflow-hidden ${nextActionData.intensity === "STRONG" ? "bg-gradient-to-r from-red-600 to-rose-600 animate-pulse" :
                nextActionData.intensity === "MEDIUM" ? "bg-gradient-to-r from-amber-500 to-orange-500" :
                  "bg-gradient-to-r from-[#0067A1] to-[#0080C6]"
              }`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10" />
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
                  className="px-6 py-2.5 bg-white text-gray-900 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors shrink-0"
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
                  className="group relative bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-lg hover:border-gray-200 transition-all duration-300 text-left overflow-hidden">
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${action.gradient} opacity-0 group-hover:opacity-100 transition-opacity rounded-t-2xl`} />
                  <div className={`w-11 h-11 ${action.bg} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <action.icon className={`w-5 h-5 ${action.text}`} />
                    {action.pulse && <span className="absolute top-3.5 right-3.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800">{action.label}</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">{action.sub}</p>
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
                  className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col justify-between hover:border-teal-200 transition-all duration-300 relative overflow-hidden"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                      <FaStethoscope className="w-5 h-5 text-[#0067A1]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1.5 ${appt.status === "approved" ? "bg-green-50 text-green-700" :
                          appt.status === "booked" ? "bg-amber-50 text-amber-700" :
                            "bg-gray-50 text-gray-600"
                        }`}>
                        {appt.status === "approved" ? "Confirmed" : appt.status === "booked" ? "Pending" : appt.status}
                      </span>
                      <h4 className="text-base font-bold text-gray-900 truncate">
                        {appt.doctor?.full_name || appt.doctor_name || "Doctor"}
                      </h4>
                      <p className="text-xs text-gray-500 font-medium truncate mt-0.5">
                        {appt.doctor?.specialization || appt.appointment_type || "Consultation"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                      <FaClock className="w-3.5 h-3.5 text-gray-400" />
                      {formatTime12h(appt.appointment_time)}
                    </span>

                    {activeCallAppointmentId === appt.id ? (
                      <button
                        onClick={() => router.push(`/appointments/${appt.id}/video?userId=${user?.id}&role=patient`)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-xl animate-pulse shadow-md transition-all"
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
              className="bg-white rounded-2xl border border-gray-100 border-dashed p-8 text-center flex flex-col items-center justify-center gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-[#0067A1]">
                <FaCalendarAlt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800">No Appointments Today</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">Schedule a consultation with our experienced specialists for personalized care.</p>
              </div>
              <Link href="/website/appointments" className="px-4 py-2 bg-[#0067A1] text-white rounded-xl text-xs font-semibold hover:bg-[#004F7C] transition-colors mt-1">
                Book Appointment
              </Link>
            </motion.div>
          )}
        </section>

        {/* Health Programs Section (Heart & Lung Health) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">Cardio & Respiratory Programs</h2>
            {assessments.length > 0 && (
              <Link href="/website/dashboard/assessments" className="text-sm text-[#0067A1] hover:text-[#004F7C] font-medium flex items-center gap-1">
                <FaHistory className="w-3.5 h-3.5" />
                History
              </Link>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Heart Health Card */}
            <motion.div
              whileHover={{ y: -6, boxShadow: "0 20px 25px -5px rgba(239,68,68,0.1), 0 10px 10px -5px rgba(239,68,68,0.04)" }}
              transition={{ duration: 0.3 }}
              className="relative overflow-hidden bg-gradient-to-br from-red-50 to-red-100 rounded-3xl p-6 border border-red-100/40 shadow-sm flex flex-col justify-between min-h-[200px]"
            >
              {/* Abstract Background Elements */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-500/15 rounded-full blur-xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-500/10 rounded-full blur-lg pointer-events-none" />

              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <motion.div
                      className="w-14 h-14 bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20"
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <FaHeartbeat className="w-6 h-6 text-white" />
                    </motion.div>
                    <div>
                      <h3 className="text-lg font-extrabold text-gray-900">Cardio Connect</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Heart Health Analyzer</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-rose-50 text-rose-600 px-2.5 py-1 rounded-full uppercase tracking-wider">Active</span>
                </div>

                <p className="text-sm text-gray-600 mt-4 leading-relaxed">
                  Track cardiovascular vitals, assess coronary risks, and get personalized insights instantly.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between gap-3 flex-wrap">
                {(() => {
                  const ha = assessments.filter((a) => a.assessment_type === "heart");
                  return ha.length > 0 ? (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                      <FaChartLine className="w-3.5 h-3.5 text-green-500" />
                      <span>Last: {new Date(ha[0].created_at).toLocaleDateString()} (Score: {ha[0].health_score || ha[0].overall_score}/100)</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic font-medium">No assessment completed yet</span>
                  );
                })()}

                <div className="flex items-center gap-2 grow sm:grow-0">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push("/website/heart-health")}
                    className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-500/10 transition-colors grow text-center"
                  >
                    Start Assessment
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push("/website/heart-health-statistics")}
                    className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors border border-gray-100"
                    title="View Statistics"
                  >
                    <FaChartLine className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Lung Health Card */}
            <motion.div
              whileHover={{ y: -6, boxShadow: "0 20px 25px -5px rgba(20,184,166,0.1), 0 10px 10px -5px rgba(20,184,166,0.04)" }}
              transition={{ duration: 0.3 }}
              className="relative overflow-hidden bg-gradient-to-br from-teal-50 to-teal-100 rounded-3xl p-6 border border-teal-100/40 shadow-sm flex flex-col justify-between min-h-[200px]"
            >
              {/* Abstract Background Elements */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#0080C6]/15 rounded-full blur-xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#0080C6]/10 rounded-full blur-lg pointer-events-none" />

              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <motion.div
                      className="w-14 h-14 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-teal-500/20"
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <TbLungsFilled className="w-6 h-6 text-white" />
                    </motion.div>
                    <div>
                      <h3 className="text-lg font-extrabold text-gray-900">Lung Connect</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Respiratory Health Evaluation</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-teal-50 text-[#0067A1] px-2.5 py-1 rounded-full uppercase tracking-wider">Active</span>
                </div>

                <p className="text-sm text-gray-600 mt-4 leading-relaxed">
                  Evaluate respiratory efficiency, breath duration, and screen for potential pulmonary risks.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between gap-3 flex-wrap">
                {(() => {
                  const la = assessments.filter((a) => a.assessment_type === "lung");
                  return la.length > 0 ? (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                      <FaChartLine className="w-3.5 h-3.5 text-green-500" />
                      <span>Last: {new Date(la[0].created_at).toLocaleDateString()} (Score: {la[0].health_score || la[0].overall_score}/100)</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic font-medium">No assessment completed yet</span>
                  );
                })()}

                <div className="flex items-center gap-2 grow sm:grow-0">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push("/website/lung-assessment")}
                    className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-[#0067A1] hover:to-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-teal-500/10 transition-colors grow text-center"
                  >
                    Start Assessment
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push("/website/lung-health-statistics")}
                    className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors border border-gray-100"
                    title="View Statistics"
                  >
                    <FaChartLine className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Instant Doctor Banner */}
        <section>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden bg-gradient-to-r from-[#0067A1] via-[#0080C6] to-[#0067A1] rounded-2xl p-5 sm:p-6 text-white cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => setShowInstantModal(true)}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-1/3 w-24 h-24 bg-white/5 rounded-full -mb-12" />
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                  <FaVideo className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold">Talk to a Doctor Now</h3>
                  <p className="text-white/70 text-sm mt-0.5">Connect instantly with available doctors for a video consultation</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-5 py-3 rounded-xl hover:bg-white/30 transition-colors self-start sm:self-auto">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
                </span>
                <span className="text-sm font-semibold whitespace-nowrap">Doctors Online</span>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Nursing / Home Care Banner */}
        <section>
          <Link href="/website/nursing-care">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="group relative overflow-hidden rounded-2xl p-5 sm:p-6 cursor-pointer hover:shadow-xl transition-shadow"
              style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 40%, #c084fc 100%)" }}
            >
              {/* Decorative blobs */}
              <div className="absolute -top-10 -right-10 w-44 h-44 bg-white/10 rounded-full blur-sm" />
              <div className="absolute bottom-0 left-1/4 w-28 h-28 bg-white/5 rounded-full -mb-14" />
              <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-white/5 rounded-full" />

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
                    className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shrink-0 border border-white/10"
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <FaHandHoldingHeart className="w-6 h-6 text-white" />
                  </motion.div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg sm:text-xl font-bold text-white">Nursing & Home Care</h3>
                      <span className="text-[10px] font-bold bg-white/25 text-white px-2 py-0.5 rounded-full tracking-wide uppercase">New</span>
                    </div>
                    <p className="text-white/70 text-sm mt-0.5">Request trained caregivers for home visits, elderly care & post-operative support</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-5 py-3 rounded-xl group-hover:bg-white/30 transition-colors self-start sm:self-auto border border-white/10">
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
              <FaHistory className="w-3.5 h-3.5 text-gray-400" />
              Recent Assessments
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {assessments.slice(0, 3).map((a) => (
                <div key={a.id} className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-sm transition-all">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      {a.assessment_type === "heart" ? (
                        <div className="w-7 h-7 bg-rose-50 rounded-lg flex items-center justify-center"><FaHeartbeat className="w-3.5 h-3.5 text-rose-500" /></div>
                      ) : (
                        <div className="w-7 h-7 bg-teal-50 rounded-lg flex items-center justify-center"><TbLungsFilled className="w-3.5 h-3.5 text-teal-500" /></div>
                      )}
                      <span className="text-sm font-medium text-gray-700 capitalize">{a.assessment_type} Health</span>
                    </div>
                    <span className="text-[10px] text-gray-400">{new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Risk Level</span>
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${a.risk_level === "low" ? "bg-green-50 text-green-600" :
                        a.risk_level === "moderate" ? "bg-amber-50 text-amber-600" :
                          "bg-red-50 text-red-600"
                      }`}>
                      {a.risk_level ? a.risk_level.charAt(0).toUpperCase() + a.risk_level.slice(1) : "N/A"}
                    </span>
                  </div>
                  {(a.health_score || a.overall_score) && (
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-gray-500">Score</span>
                      <span className="text-xs font-semibold text-gray-700">{a.health_score || a.overall_score}/100</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Health Assistant Banner */}
        <section>
          <div className="bg-gradient-to-br from-[#003358] to-[#1a3a4d] rounded-2xl p-5 sm:p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mb-16" />
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center shrink-0">
                  <FaUserMd className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Health Assistant</h3>
                  <p className="text-white/70 text-sm">Describe symptoms & get instant guidance</p>
                </div>
              </div>
              <button type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("open-dr-mediconnect-chat"))}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#0067A1] rounded-xl font-semibold hover:bg-gray-100 transition-all shadow-lg self-start sm:self-auto">
                Start Chat
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Instant Doctors Modal */}
      <AnimatePresence>
        {showInstantModal && <InstantDoctorsModal patientId={user?.id} onClose={() => setShowInstantModal(false)} />}
      </AnimatePresence>

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

function InstantDoctorsModal({ patientId, onClose }) {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [booked, setBooked] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("All Specialties");
  const [specialties, setSpecialties] = useState(["All Specialties"]);
  const router = useRouter();

  useEffect(() => {
    async function fetchSpecialties() {
      try {
        const res = await fetch("/api/cms/specialties");
        const json = await res.json();
        if (json.success && json.data?.length > 0) {
          const active = json.data.filter(s => s.is_active !== false).sort((a, b) => a.display_order - b.display_order);
          setSpecialties(["All Specialties", ...active.map(s => s.name)]);
        } else {
          setSpecialties(["All Specialties", "Cardiology", "Dermatology", "Pediatrics", "Neurology", "Orthopedics", "Ophthalmology", "Dentistry", "General Physician", "Gynecology"]);
        }
      } catch (error) {
        console.error("Error fetching specialties:", error);
        setSpecialties(["All Specialties", "Cardiology", "Dermatology", "Pediatrics", "Neurology", "Orthopedics", "Ophthalmology", "Dentistry", "General Physician", "Gynecology"]);
      }
    }
    fetchSpecialties();
  }, []);

  const filteredDoctors = doctors.filter(doc => {
    const matchesSearch = (() => {
      if (!searchQuery.trim()) return true;
      const lowerQuery = searchQuery.toLowerCase();
      const name = (doc.full_name || doc.doctor_name || "").toLowerCase();
      const spec = (doc.specialization || "").toLowerCase();
      const clinic = (doc.clinic_name || "").toLowerCase();
      return name.includes(lowerQuery) || spec.includes(lowerQuery) || clinic.includes(lowerQuery);
    })();
    
    const matchesSpecialty = (() => {
      if (!selectedSpecialty || selectedSpecialty === "All Specialties") return true;
      const spec = (doc.specialization || "").toLowerCase().trim();
      const target = selectedSpecialty.toLowerCase().trim();
      if (target === "urology" && spec.includes("neurology")) return false;
      if (target === "neurology" && spec.includes("urology") && !spec.includes("neurology")) return false;
      return spec.includes(target);
    })();
    
    return matchesSearch && matchesSpecialty;
  });

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/doctors/instant/get", { cache: "no-store", next: { revalidate: 0 } });
      const data = await res.json();
      if (data.success) setDoctors(data.data || []);
      else setDoctors([]);
    } catch {
      toast.error("Failed to load available doctors");
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDoctors(); }, [fetchDoctors]);

  const [showConsentGate, setShowConsentGate] = useState(false);
  const [confirmingDoctor, setConfirmingDoctor] = useState(null);
  const [dataSharingConsent, setDataSharingConsent] = useState(false);
  const [teleconsultConsent, setTeleconsultConsent] = useState(false);
  const [pendingDoctor, setPendingDoctor] = useState(null);

  const startBookingFlow = (doctor) => {
    if (!patientId) { toast.error("Please log in first"); return; }
    setConfirmingDoctor(doctor);
    setDataSharingConsent(false);
    setTeleconsultConsent(false);
  };

  const handleBook = async (doctor) => {
    // Check global DPDP consent first
    const tid = toast.loading("Verifying consents...");
    try {
      const consentRes = await fetch("/api/user/consent/grant", {
        headers: { Authorization: `Bearer ${patientId}` },
      });
      const consentData = await consentRes.json();
      toast.dismiss(tid);

      if (!consentData?.data?.all_required_consented) {
        setPendingDoctor(doctor);
        setShowConsentGate(true);
        return;
      }
      
      await proceedWithBooking(doctor);
    } catch (e) {
      toast.dismiss(tid);
      toast.error("Failed to verify consents. Please try again.");
    }
  };

  const proceedWithBooking = async (doctor) => {
    setBooking(doctor.id);
    const tid = toast.loading("Processing...");
    try {
      const rawFee = doctor.video_consultation_fee ?? doctor.consultation_fee ?? doctor.clinic_consultation_fee ?? 0;
      const fee = parseFloat(rawFee) || 0;

      if (fee > 0) {
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
          throw new Error("Failed to load payment gateway. Please check your connection.");
        }

        const idempotencyKey = crypto.randomUUID();

        const orderRes = await fetch("/api/payment/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: fee,
            patient_id: patientId,
            doctor_id: doctor.id,
            appointment_type: "instant",
            idempotency_key: idempotencyKey,
          }),
        });

        const orderJson = await orderRes.json();
        if (!orderRes.ok) throw new Error(orderJson.error || "Failed to create payment order");

        const careEpisodeId = orderJson.data?.care_episode_id || orderJson.care_episode_id;

        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: orderJson.data?.order?.amount || orderJson.order?.amount,
          currency: orderJson.data?.order?.currency || orderJson.order?.currency,
          name: "MediConnect",
          description: `Instant Consultation with ${doctor.full_name || doctor.doctor_name || "Doctor"}`,
          image: `${window.location.origin}/real-logo.png`,
          order_id: orderJson.data?.order?.id || orderJson.order?.id,
          handler: async function (response) {
            const paymentDetails = {
              payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
            };
            await finalizeInstantCall(doctor, tid, paymentDetails, careEpisodeId);
          },
          theme: { color: "#0067A1" },
        };

        const paymentObject = new window.Razorpay(options);
        toast.dismiss(tid);
        paymentObject.open();
        
        paymentObject.on('payment.failed', function (response) {
          toast.error("Payment failed. Please try again.");
          setBooking(null);
        });

      } else {
        await finalizeInstantCall(doctor, tid, null, null);
      }
    } catch (e) {
      toast.dismiss(tid);
      toast.error(e.message || "Something went wrong. Please try again.");
      setBooking(null);
    }
  };

  const finalizeInstantCall = async (doctor, tid, paymentDetails, careEpisodeId) => {
    toast.loading("Connecting to doctor...", { id: tid });
    try {
      const res = await fetch("/api/instant-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          doctor_id: doctor.id, 
          patient_id: patientId,
          payment_id: paymentDetails?.payment_id,
          razorpay_order_id: paymentDetails?.razorpay_order_id,
          care_episode_id: careEpisodeId
        }),
      });
      const data = await res.json();
      toast.dismiss(tid);
      if (res.ok && data.success) {
        toast.success("Appointment booked! Doctor will be notified.");
        setBooked({ doctor, appointment: data.data?.appointment || data.data, roomId: data.data?.call_room_id || data.data?.appointment?.id });
      } else {
        toast.error(data.message || "Failed to book instant call");
      }
    } catch (e) {
      toast.dismiss(tid);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBooking(null);
    }
  };

  const joinCall = () => {
    if (booked?.roomId) {
      router.push(`/appointments/${booked.roomId}/video?userId=${patientId}&role=patient`);
      onClose();
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0067A1] via-[#0080C6] to-[#0067A1] px-6 py-5 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><FaVideo className="w-5 h-5" /></div>
              <div>
                <h3 className="text-base font-bold">Instant Consultation</h3>
                <p className="text-[11px] text-white/60">Available doctors right now</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/20 transition-colors"><FaTimes className="w-4 h-4" /></button>
          </div>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {booked ? (
            <div className="flex flex-col items-center justify-center p-8 text-center gap-5">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-200">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <h4 className="text-xl font-bold text-gray-900">Booking Confirmed!</h4>
                <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">
                  Your instant consultation with <span className="font-semibold text-[#0067A1]">{booked.doctor.full_name || booked.doctor.doctor_name || "Doctor"}</span> has been booked. The doctor will be notified immediately.
                </p>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex flex-col gap-3 w-full max-w-xs">
                <button onClick={joinCall}
                  className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#0067A1] to-[#0080C6] hover:from-[#094440] hover:to-[#0a5c56] transition-all shadow-lg flex items-center justify-center gap-2">
                  <FaVideo className="w-4 h-4" />
                  Join Video Call
                </button>
                <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors">Close</button>
              </motion.div>
            </div>
          ) : confirmingDoctor ? (
            <div className="flex flex-col p-6 sm:p-8 gap-5 max-w-lg mx-auto w-full">
              <div className="flex items-center gap-4 bg-teal-50 rounded-2xl p-4">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0">
                  <FaUserMd className="w-6 h-6 text-[#0067A1]" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{confirmingDoctor.full_name || confirmingDoctor.doctor_name || "Doctor"}</h4>
                  <p className="text-xs text-[#0067A1] font-medium">{confirmingDoctor.specialization || "General Physician"}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Consultation Fee</span>
                  <span className="font-bold text-gray-900">{"\u20B9"}{parseFloat(confirmingDoctor.video_consultation_fee ?? confirmingDoctor.consultation_fee ?? confirmingDoctor.clinic_consultation_fee ?? 0).toFixed(2)}</span>
                </div>
                <div className="h-px bg-gray-200" />
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" checked={dataSharingConsent} onChange={(e) => setDataSharingConsent(e.target.checked)} className="mt-1 w-4 h-4 rounded border-gray-300 text-[#0067A1] focus:ring-[#0067A1]" />
                    <span className="text-xs text-gray-600 group-hover:text-gray-900 transition-colors">
                      I consent to the sharing of my medical data and previous records with this doctor for consultation purposes under DPDP guidelines.
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" checked={teleconsultConsent} onChange={(e) => setTeleconsultConsent(e.target.checked)} className="mt-1 w-4 h-4 rounded border-gray-300 text-[#0067A1] focus:ring-[#0067A1]" />
                    <span className="text-xs text-gray-600 group-hover:text-gray-900 transition-colors">
                      I consent to a video/audio consultation as per the Telemedicine Practice Guidelines.
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setConfirmingDoctor(null)} className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button 
                  onClick={() => handleBook(confirmingDoctor)} 
                  disabled={!dataSharingConsent || !teleconsultConsent || !!booking}
                  className="flex-[1.5] py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#0067A1] to-[#0080C6] hover:from-[#094440] hover:to-[#0a5c56] disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {booking ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Processing...</> : "Proceed to Payment"}
                </button>
              </div>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-teal-100 rounded-full" />
                <div className="w-12 h-12 border-4 border-[#0067A1] border-t-transparent rounded-full animate-spin absolute inset-0" />
              </div>
              <p className="text-sm text-gray-500">Finding available doctors\u2026</p>
            </div>
          ) : doctors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center"><FaUserMd className="w-7 h-7 text-gray-400" /></div>
              <div>
                <h4 className="text-lg font-semibold text-gray-700">No Doctors Available</h4>
                <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">No doctors are available for instant consultation right now. Please try again in a few minutes.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={fetchDoctors} className="px-5 py-2.5 bg-teal-50 text-[#0067A1] rounded-xl text-sm font-semibold hover:bg-teal-100 transition-colors">Refresh</button>
                <Link href="/find-doctors" onClick={onClose} className="px-5 py-2.5 bg-gray-50 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors">Book Later</Link>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-3 flex flex-col h-full overflow-hidden">
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <div className="relative flex-1">
                  <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by doctor name, specialty, or clinic..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 font-medium text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="relative shrink-0 sm:w-48">
                  <FaFilter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                  <select
                    value={selectedSpecialty}
                    onChange={(e) => setSelectedSpecialty(e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all bg-white text-gray-900 appearance-none cursor-pointer"
                  >
                    {specialties.map(spec => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-1 shrink-0">
                <p className="text-xs font-medium text-gray-500">
                  {searchQuery ? (
                    <>
                      Found <span className="text-[#0067A1] font-bold">{filteredDoctors.length}</span> doctor{filteredDoctors.length !== 1 ? "s" : ""}
                    </>
                  ) : (
                    <>
                      <span className="text-green-600 font-bold">{doctors.length}</span> doctor{doctors.length !== 1 ? "s" : ""} online
                    </>
                  )}
                </p>
                <button onClick={fetchDoctors} className="text-xs text-[#0067A1] hover:text-[#094440] font-medium flex items-center gap-1">
                  <FaClock className="w-3.5 h-3.5" />
                  Refresh
                </button>
              </div>

              <div className="space-y-2.5 max-h-[45vh] sm:max-h-[50vh] overflow-y-auto pr-1 flex-1">
                {filteredDoctors.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center text-gray-500 gap-3">
                    <FaUserMd className="w-8 h-8 text-gray-350" />
                    <div>
                      <p className="text-sm font-bold text-gray-700">No Online Doctors Match Your Search</p>
                      <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">There are no doctors online right now matching your criteria. You can book an appointment with them for a later time.</p>
                    </div>
                    <Link
                      href={(() => {
                        const params = [];
                        if (selectedSpecialty && selectedSpecialty !== "All Specialties") {
                          params.push(`specialty=${encodeURIComponent(selectedSpecialty)}`);
                        }
                        if (searchQuery) {
                          params.push(`search=${encodeURIComponent(searchQuery)}`);
                        }
                        return params.length > 0 ? `/find-doctors?${params.join("&")}` : "/find-doctors";
                      })()}
                      onClick={onClose}
                      className="mt-2 px-5 py-2.5 bg-[#0067A1] hover:bg-[#094440] text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-1.5"
                    >
                      <FaCalendarAlt className="w-3.5 h-3.5" />
                      Book Later {selectedSpecialty && selectedSpecialty !== "All Specialties" ? `for ${selectedSpecialty}` : ""}
                    </Link>
                  </div>
                ) : (
                  filteredDoctors.map((doc) => {
                    const name = doc.full_name || doc.doctor_name || "Doctor";
                    const spec = doc.specialization || "General Physician";
                    const exp = doc.experience_years || doc.experience;
                    const rawFee = doc.video_consultation_fee ?? doc.consultation_fee ?? doc.clinic_consultation_fee ?? 0;
                    const fee = parseFloat(rawFee) > 0 ? parseFloat(rawFee).toFixed(2) : "0.00";
                    const avatar = doc.profile_picture || doc.avatar;
                    const isBooking = booking === doc.id;
                    return (
                      <motion.div key={doc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-teal-200 transition-all">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center shrink-0 overflow-hidden">
                            {avatar ? <img src={avatar} alt={name} className="w-full h-full object-cover rounded-xl" /> : <FaUserMd className="w-5 h-5 text-[#0067A1]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="text-sm font-bold text-gray-900">{name}</h4>
                                <p className="text-xs text-[#0067A1] font-medium mt-0.5">{spec}</p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                                </span>
                                <span className="text-[10px] text-green-600 font-medium">Online</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-gray-500">
                              {exp && <span className="flex items-center gap-1"><FaClock className="w-3 h-3 text-gray-400" />{exp} yrs exp</span>}
                              {fee && <span className="flex items-center gap-1"><span className="text-gray-400 font-medium">{"\u20B9"}</span>{fee}</span>}
                              {doc.clinic_name && <span className="flex items-center gap-1 truncate"><FaMapMarkerAlt className="w-3 h-3 text-gray-400 shrink-0" /><span className="truncate">{doc.clinic_name}</span></span>}
                            </div>
                            <div className="mt-3.5 grid grid-cols-2 gap-3">
                              <button onClick={() => startBookingFlow(doc)} disabled={!!booking}
                                className="py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#0067A1] to-[#0080C6] hover:from-[#094440] hover:to-[#0a5c56] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-1.5">
                                {isBooking ? (
                                  <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Connecting{"\u2026"}</>
                                ) : (
                                  <><FaPhoneAlt className="w-3 h-3" />Instant Call</>
                                )}
                              </button>
                              <button onClick={() => { onClose(); router.push(`/website/doctor/${doc.id}`); }}
                                className="py-2.5 rounded-xl text-xs font-bold text-[#0067A1] border border-[#0067A1] hover:bg-teal-50/50 transition-all flex items-center justify-center gap-1.5">
                                <FaCalendarAlt className="w-3 h-3" />Book for Later
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
      <ConsentGate
        isOpen={showConsentGate}
        onConsentGranted={() => {
          setShowConsentGate(false);
          if (pendingDoctor) {
            proceedWithBooking(pendingDoctor);
          }
        }}
        onClose={() => setShowConsentGate(false)}
      />
    </motion.div>
  );
}

export default Dashboard;
