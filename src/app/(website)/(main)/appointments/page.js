"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaCalendarAlt,
  FaClock,
  FaMapMarkerAlt,
  FaEye,
  FaTimes,
  FaCalendarCheck,
  FaHistory,
  FaBan,
  FaVideo,
  FaHome,
  FaHospital,
  FaFileMedical,
  FaPaperPlane,
  FaExclamationTriangle,
  FaFilePdf,
  FaUserMd,
  FaDownload,
  FaShareAlt,
  FaLock,
  FaCheck,
  FaRupeeSign,
  FaPills,
  FaFlask,
} from "react-icons/fa";
import { loadRazorpayScript } from "@/lib/razorpay";
import AppointmentDetailsModal from "@/components/public-site/appointments/AppointmentDetailsModal";
import OutcomeTrackerModal from "@/components/public-site/appointments/OutcomeTrackerModal";
import ServiceRecommendationModal from "@/components/public-site/appointments/ServiceRecommendationModal";
import PrescriptionViewerModal from "@/components/public-site/appointments/PrescriptionViewerModal";
import SharePrescriptionMenuModal from "@/components/public-site/appointments/SharePrescriptionMenuModal";
import { toast } from "react-hot-toast";
import { LoadingScreen } from "@/components/public-site/ui/LoadingStates";
import { Activity, ShieldAlert, ClipboardList, Stethoscope, CalendarPlus, CheckCircle2, AlertCircle, Clock } from "lucide-react";

const normalizeStatus = (status) => {
  if (!status) return "pending";
  const s = String(status).toLowerCase();
  if (["booked", "approved", "freezed", "confirmed"].includes(s)) return "confirmed";
  if (s.includes("cancel") || ["rejected", "declined"].includes(s)) return "cancelled";
  return s;
};

const parseTimeTo24H = (timeStr) => {
  if (!timeStr) return null;
  const trimmed = String(timeStr).trim();
  const isPM = /pm/i.test(trimmed);
  const isAM = /am/i.test(trimmed);
  const clean = trimmed.replace(/[^\d:]/g, "");
  const [hStr, mStr] = clean.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr || "0", 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  return { hours: h, minutes: m };
};

const getDateTime = (apt) => {
  const dateStr = apt.date || apt.appointment_date;
  const timeStr = apt.time || (apt.appointment_time ? apt.appointment_time.slice(0, 5) : "");
  const dateObj = (() => {
    if (!dateStr) return null;
    // If it's a pure YYYY-MM-DD date string, parse as *local* midnight.
    // `new Date('YYYY-MM-DD')` is parsed as UTC and can shift the local day.
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))) {
      return new Date(`${dateStr}T00:00:00`);
    }
    return new Date(dateStr);
  })();
  return { dateStr, timeStr, dateObj };
};

const getAppointmentStart = (apt) => {
  const { dateObj, timeStr } = getDateTime(apt);
  if (!dateObj) return null;
  const rawTime = timeStr || apt.time || apt.appointment_time;
  const parsed = parseTimeTo24H(rawTime);
  if (!parsed) return null;
  const start = new Date(dateObj);
  start.setHours(parsed.hours, parsed.minutes, 0, 0);
  return start;
};

const getAppointmentEnd = (apt) => {
  const start = getAppointmentStart(apt);
  if (!start) return null;
  // Consultation window is active up to 30 minutes from start
  return new Date(start.getTime() + 30 * 60 * 1000);
};

const getEffectiveStatus = (apt, now = new Date()) => {
  const base = normalizeStatus(apt.status);
  if (base === "expired") return "expired";
  if (!["confirmed", "pending"].includes(base)) return base;

  const start = getAppointmentStart(apt);
  if (!start) return base;

  // After 30 minutes past start time, appointment is expired
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  if (now > end) return "expired";
  return base;
};

const getLocalTodayString = () => {
  // YYYY-MM-DD in user's local timezone
  return new Date().toLocaleDateString("en-CA");
};

const isSameLocalDay = (aDateString, bDateString) => {
  return !!aDateString && !!bDateString && String(aDateString) === String(bDateString);
};

const getAppointmentBucket = (apt, now = new Date()) => {
  const normalized = normalizeStatus(apt.status);
  if (normalized === "cancelled") return "cancelled";

  const effective = getEffectiveStatus(apt, now);
  if (effective === "completed" || effective === "expired") return "past";

  const end = getAppointmentEnd(apt);
  if (end && now > end) return "past";

  // Anything else that is not cancelled/completed/expired is considered active/upcoming
  return "active";
};

const canModifyAppointment = (apt, now = new Date()) => {
  const status = getEffectiveStatus(apt, now);
  if (!["confirmed", "pending"].includes(status)) return false;
  const start = getAppointmentStart(apt);
  if (!start) return false;
  const diffMs = start.getTime() - now.getTime();
  return diffMs >= 4 * 60 * 60 * 1000;
};

const isVideoAppointment = (apt) => {
  const t = apt.appointment_type || apt.type || "";
  return ["video", "video_consultation", "video_call", "teleconsultation", "instant_call", "telemedicine", "instant"].includes(t.toLowerCase());
};

const getVideoCallTiming = (apt, now = new Date()) => {
  if (!isVideoAppointment(apt)) {
    return { isVideo: false, canJoin: false };
  }

  const normStatus = normalizeStatus(apt.status);
  if (!["confirmed", "pending"].includes(normStatus)) {
    return { isVideo: true, canJoin: false, label: "Call Unavailable", disabledReason: "invalid_status", tooltip: "Appointment is not confirmed" };
  }

  const start = getAppointmentStart(apt);
  if (!start) {
    return { isVideo: true, canJoin: false, label: "Join Call", disabledReason: "no_time", tooltip: "Appointment time not set" };
  }

  const nowMs = now.getTime();
  const startMs = start.getTime();
  const windowStartMs = startMs - 5 * 60 * 1000; // Enabled 5 minutes before start
  const windowEndMs = startMs + 30 * 60 * 1000;  // Disabled after 30 minutes

  if (nowMs < windowStartMs) {
    const diffMs = windowStartMs - nowMs;
    const diffMins = Math.ceil(diffMs / (60 * 1000));
    const label = diffMins <= 60 ? `Opens in ${diffMins}m` : "Opens 5m before";
    return {
      isVideo: true,
      canJoin: false,
      isTooEarly: true,
      label,
      disabledReason: "too_early",
      tooltip: `Video call button will automatically enable 5 minutes before ${formatTimeTo12Hour(apt.appointment_time || apt.time)}`,
    };
  }

  if (nowMs > windowEndMs) {
    return {
      isVideo: true,
      canJoin: false,
      isExpired: true,
      label: "Expired",
      disabledReason: "expired",
      tooltip: "Appointment time expired (30 minutes after appointment start time)",
    };
  }

  return {
    isVideo: true,
    canJoin: true,
    isOpen: true,
    label: "Join Call",
    tooltip: "Video call is ready - click to join",
  };
};

const canJoinVideoCall = (apt, now = new Date()) => {
  const timing = getVideoCallTiming(apt, now);
  return timing.canJoin;
};

const isLiveVideoCall = (apt, now = new Date()) => {
  const timing = getVideoCallTiming(apt, now);
  return timing.canJoin;
};

const APPOINTMENT_TYPE_ICONS = {
  video: FaVideo,
  home: FaHome,
  clinic: FaHospital,
};

const getAppointmentTypeKey = (apt) => {
  const t = apt.appointment_type || apt.type || "clinic_visit";
  const val = String(t).toLowerCase();
  if (["video", "video_consultation", "video_call", "teleconsultation", "instant_call", "telemedicine", "instant"].includes(val)) return "video";
  if (["home", "home_visit"].includes(val)) return "home";
  return "clinic";
};

const getAppointmentTypeLabel = (apt) => {
  const key = getAppointmentTypeKey(apt);
  if (key === "video") return "Video";
  if (key === "home") return "Home";
  return "Clinic";
};

const formatTimeTo12Hour = (timeStr) => {
  if (!timeStr) return "";
  const base = timeStr.length > 5 ? timeStr.slice(0, 5) : timeStr;
  const [hStr, mStr] = base.split(":");
  const hNum = parseInt(hStr, 10);
  if (Number.isNaN(hNum)) return base;
  const suffix = hNum >= 12 ? "PM" : "AM";
  const displayHour = ((hNum + 11) % 12) + 1;
  return `${displayHour}:${mStr} ${suffix}`;
};

function formatSpecialMessage(text) {
  if (!text) return null;
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;
        
        // Match [SECTION NAME]
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
          const sectionTitle = trimmed.slice(1, -1).replace(/_/g, " ").toUpperCase();
          return (
            <div
              key={idx}
              className="font-bold text-gray-800 border-b border-gray-150 pb-0.5 mb-1.5 mt-3 first:mt-0 text-xs tracking-wider uppercase"
            >
              {sectionTitle}
            </div>
          );
        }
        
        // Match key: value
        const colonIdx = trimmed.indexOf(":");
        if (colonIdx > 0) {
          const key = trimmed.slice(0, colonIdx).trim();
          const val = trimmed.slice(colonIdx + 1).trim();
          return (
            <div key={idx} className="py-0.5 flex gap-2 text-xs sm:text-sm">
              <span className="text-gray-500 font-semibold shrink-0">{key}:</span>
              <span className="text-gray-900 font-bold">{val}</span>
            </div>
          );
        }
        
        // Plain text line
        return (
          <div key={idx} className="text-gray-700 text-xs sm:text-sm leading-relaxed">
            {trimmed}
          </div>
        );
      })}
    </div>
  );
}

export default function AppointmentsPage() {
  const router = useRouter();
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Reschedule modal state
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleType, setRescheduleType] = useState("clinic_visit");
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleQuote, setRescheduleQuote] = useState({
    loading: false,
    needs_payment: false,
    amount: 0,
    reason: "",
    error: null,
  });

  // Cancel modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Prescription modal state
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [autoSaveDigiLockerModal, setAutoSaveDigiLockerModal] = useState(false);
  const [prescriptionData, setPrescriptionData] = useState(null);
  const [prescriptionLoading, setPrescriptionLoading] = useState(false);

  const combinedLabs = (() => {
    if (!prescriptionData) return [];
    const rawLabs = prescriptionData.lab_tests || [];
    const rawInvs = prescriptionData.investigations || [];
    const invArray = Array.isArray(rawInvs) 
      ? rawInvs 
      : (rawInvs?.requested || (typeof rawInvs === 'string' ? [rawInvs] : []));
    return [
      ...rawLabs.map(t => typeof t === "string" ? t : (t.test_name || t.name || "")),
      ...invArray.map(inv => typeof inv === "string" ? inv : (inv.name || inv.test_name || ""))
    ].filter(Boolean);
  })();

  // Outcome modal state
  const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);
  const [appointmentForOutcome, setAppointmentForOutcome] = useState(null);

  // Service Recommendations Modal state
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [appointmentForService, setAppointmentForService] = useState(null);

  // Share Prescription Menu Modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedAppointmentForShare, setSelectedAppointmentForShare] = useState(null);

  // FOLLOW_UP_PENDING — pending recovery actions from /api/patient/followup-actions
  const [pendingFollowUps, setPendingFollowUps] = useState([]);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpActionLoading, setFollowUpActionLoading] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [appointments, setAppointments] = useState([]);
  // Map of appointmentId -> boolean: true if a prescription exists for that appointment (or its episode)
  const [prescriptionExistsMap, setPrescriptionExistsMap] = useState({});

  // Track which appointment has an active video call (via notification)
  const [activeCallAppointmentId, setActiveCallAppointmentId] = useState(null);
  const [activeCallTick, setActiveCallTick] = useState(Date.now());
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time clock tick every 5 seconds to automatically enable/disable Join Call button
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isDetailsModalOpen || isRescheduleModalOpen || isCancelModalOpen || isPrescriptionModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isDetailsModalOpen, isRescheduleModalOpen, isCancelModalOpen, isPrescriptionModalOpen]);

  const fetchAppointments = async (isBackground = false) => {
    try {
      if (!isBackground) {
        setLoading(true);
        setError("");
      }

      let patientId =
        typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      if (!patientId || patientId === "undefined" || patientId === "null") {
        try {
          const userData = JSON.parse(localStorage.getItem("userData") || sessionStorage.getItem("userData") || "{}");
          patientId = userData?.id || userData?.user?.id || null;
        } catch (_) {}
      }
      if (!patientId || patientId === "undefined" || patientId === "null") {
        const roles = ["patientUser", "doctorUser", "chemistUser", "labUser", "adminUser"];
        for (const r of roles) {
          try {
            const u = JSON.parse(localStorage.getItem(r) || "{}");
            if (u?.id) {
              patientId = u.id;
              break;
            }
          } catch (_) {}
        }
      }

      if (patientId) {
        try {
          localStorage.setItem("userId", String(patientId));
          document.cookie = `session_id=${patientId}; path=/; max-age=2592000; SameSite=Lax`;
        } catch (_) {}
      }

      if (!patientId || patientId === "undefined" || patientId === "null") {
        setAppointments([]);
        if (!isBackground) setLoading(false);
        return;
      }

      const res = await fetch("/api/appointment/patient-appointment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: patientId, date_filter: "all", page: 1 }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to fetch appointments");

      const retrievedAppointments = data.data?.appointments || [];
      setAppointments(retrievedAppointments);

      // ── Bulk-check which appointments have prescriptions ──
      const allIds = retrievedAppointments.map(a => a.id).filter(Boolean);

      if (allIds.length > 0) {
        try {
          const checkRes = await fetch("/api/prescriptions/exists-bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ appointment_ids: allIds }),
          });
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            setPrescriptionExistsMap(checkData.data || {});
          }
        } catch (e) {
          console.warn("[PRESCRIPTIONS] Bulk exists check failed:", e);
        }
      }
    } catch (e) {
      if (!isBackground) {
        console.error("[DEBUG APPOINTMENTS] Fetch appointments error:", e);
        setError(e.message || "Failed to fetch appointments");
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchAppointments(false);

    // Real-time polling for appointments every 8 seconds
    const pollInterval = setInterval(() => {
      fetchAppointments(true);
    }, 8000);

    return () => clearInterval(pollInterval);
  }, []);

  // Fetch FOLLOW_UP_PENDING consultations (recoveries doctor is monitoring)
  useEffect(() => {
    const fetchPendingFollowUps = async () => {
      let patientId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      if (!patientId || patientId === "undefined" || patientId === "null") {
        try {
          const userData = JSON.parse(localStorage.getItem("userData") || "{}");
          patientId = userData?.id || null;
        } catch (_) {}
      }
      if (!patientId) return;
      try {
        setFollowUpLoading(true);
        const res = await fetch(`/api/patient/followup-actions?patient_id=${patientId}`);
        const data = await res.json();
        if (data.success) {
          setPendingFollowUps(data.data?.actions || []);
        }
      } catch (e) {
        console.error("Follow-up actions fetch error:", e);
      } finally {
        setFollowUpLoading(false);
      }
    };
    fetchPendingFollowUps();
  }, []);

  // Poll for active video-call notifications so we can highlight the right appointment
  useEffect(() => {
    let patientId =
      typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    if (!patientId || patientId === "undefined" || patientId === "null") {
      try {
        const userData = JSON.parse(localStorage.getItem("userData") || "{}");
        patientId = userData?.id || null;
      } catch (_) {}
    }
    if (!patientId) return;

    const checkActiveCall = async () => {
      try {
        const res = await fetch("/api/notifications/get", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: patientId, unread: true, page: 1 }),
        });
        const data = await res.json();
        const notifs = data?.data?.notifications || data?.data || [];
        const videoNotif = notifs.find((n) => {
          if (!n || n.read) return false;
          if (n.type !== "video_call_started") return false;
          const meta =
            typeof n.metadata === "string"
              ? (() => { try { return JSON.parse(n.metadata); } catch { return null; } })()
              : n.metadata;
          return !!meta?.appointment_id;
        });
        if (videoNotif) {
          const meta =
            typeof videoNotif.metadata === "string"
              ? JSON.parse(videoNotif.metadata)
              : videoNotif.metadata;
          setActiveCallAppointmentId(meta.appointment_id);
        } else {
          setActiveCallAppointmentId(null);
        }
      } catch { }
    };

    checkActiveCall();
    const interval = setInterval(checkActiveCall, 8000);
    return () => clearInterval(interval);
  }, []);

  // Update live-call visibility every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCallTick(Date.now());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch slots when date or type changes in reschedule modal
  useEffect(() => {
    if (!isRescheduleModalOpen || !appointmentToReschedule || !rescheduleDate) {
      setRescheduleSlots([]);
      return;
    }

    const fetchSlots = async () => {
      try {
        setRescheduleSlotsLoading(true);
        setRescheduleSlots([]);
        setSelectedRescheduleSlot(null);

        const res = await fetch("/api/doctors/slots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doctor_id: appointmentToReschedule.doctor_id,
            date: rescheduleDate,
          }),
        });

        const json = await res.json();
        if (!json.success) throw new Error(json.message || "Failed to fetch slots");

        setRescheduleSlots(Array.isArray(json.data) ? json.data : []);
      } catch (e) {
        console.error("Slots fetch error:", e);
        toast.error("Failed to load available slots.");
      } finally {
        setRescheduleSlotsLoading(false);
      }
    };

    fetchSlots();
  }, [isRescheduleModalOpen, appointmentToReschedule, rescheduleDate]);

  // Evaluate reschedule fee requirement whenever modal opens or rescheduleType changes
  useEffect(() => {
    if (!isRescheduleModalOpen || !appointmentToReschedule) {
      setRescheduleQuote({ loading: false, needs_payment: false, amount: 0, reason: "", error: null });
      return;
    }

    const checkFee = async () => {
      try {
        setRescheduleQuote((prev) => ({ ...prev, loading: true, error: null }));
        const res = await fetch(
          `/api/appointment/reschedule?appointment_id=${appointmentToReschedule.id}&new_type=${rescheduleType}`
        );
        const json = await res.json();
        if (json.success && json.data) {
          setRescheduleQuote({
            loading: false,
            needs_payment: !!json.data.needs_payment,
            amount: Number(json.data.amount || 0),
            reason: json.data.reason || "",
            error: null,
          });
        } else {
          setRescheduleQuote((prev) => ({ ...prev, loading: false }));
        }
      } catch (err) {
        console.warn("Fee quote evaluation error:", err);
        setRescheduleQuote((prev) => ({ ...prev, loading: false, error: err.message }));
      }
    };

    checkFee();
  }, [isRescheduleModalOpen, appointmentToReschedule, rescheduleType]);

  const getFilteredAppointments = () => {
    const now = currentTime;
    const todayStr = getLocalTodayString();

    // Separate appointments with and without time data
    const withTime = [];
    const withoutTime = [];

    appointments.forEach((apt) => {
      const start = getAppointmentStart(apt);
      const end = getAppointmentEnd(apt);
      const effectiveStatus = getEffectiveStatus(apt, now);
      const { dateStr } = getDateTime(apt);
      const row = {
        apt,
        start,
        end,
        effectiveStatus,
        dateStr,
        bucket: getAppointmentBucket(apt, now),
        isToday: isSameLocalDay(dateStr, todayStr),
      };
      if (start && end) withTime.push(row);
      else withoutTime.push(row);
    });

    const byStartAsc = (a, b) => a.start.getTime() - b.start.getTime();
    const byStartDesc = (a, b) => b.start.getTime() - a.start.getTime();

    if (dateFilter === "today") {
      return withTime
        .filter((row) => row.isToday && row.bucket === "active" && row.end >= now && row.effectiveStatus !== "expired")
        .sort(byStartAsc)
        .map((row) => row.apt);
    }

    if (dateFilter === "upcoming") {
      return withTime
        .filter((row) => row.bucket === "active" && row.end >= now && row.effectiveStatus !== "expired")
        .sort(byStartAsc)
        .map((row) => row.apt);
    }

    if (dateFilter === "past") {
      return withTime
        .filter((row) => row.bucket === "past" || row.effectiveStatus === "expired" || row.effectiveStatus === "completed" || row.end < now)
        .sort(byStartDesc)
        .map((row) => row.apt);
    }

    if (dateFilter === "cancelled") {
      return appointments.filter((apt) => normalizeStatus(apt.status) === "cancelled");
    }

    // "all" — upcoming/today first (soonest first), then past (newest first), then cancelled, then no-time
    const activeToday = withTime.filter((row) => row.bucket === "active" && row.isToday && row.end >= now && row.effectiveStatus !== "expired");
    const activeFuture = withTime.filter((row) => row.bucket === "active" && !row.isToday && row.end >= now && row.effectiveStatus !== "expired");
    const pastItems = withTime.filter((row) => row.bucket === "past" || row.effectiveStatus === "expired" || row.effectiveStatus === "completed" || row.end < now);
    const cancelledItems = appointments.filter((apt) => normalizeStatus(apt.status) === "cancelled");
    const noTimeItems = withoutTime.map((row) => row.apt);

    return [
      ...activeToday.sort(byStartAsc).map((row) => row.apt),
      ...activeFuture.sort(byStartAsc).map((row) => row.apt),
      ...pastItems.sort(byStartDesc).map((row) => row.apt),
      ...cancelledItems,
      ...noTimeItems,
    ];
  };

  const handleViewDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setIsDetailsModalOpen(true);
  };

  const handleRescheduleClick = (appointment) => {
    if (!canModifyAppointment(appointment)) {
      toast.error("You can reschedule only up to 4 hours before the appointment time.");
      return;
    }

    const { dateStr } = getDateTime(appointment);
    setAppointmentToReschedule(appointment);
    setRescheduleDate(dateStr || new Date().toISOString().split("T")[0]);
    setRescheduleType(appointment.appointment_type || "clinic_visit");
    setSelectedRescheduleSlot(null);
    setIsRescheduleModalOpen(true);
  };

  const handleCancelClick = (appointment) => {
    if (!canModifyAppointment(appointment)) {
      toast.error("You can cancel only up to 4 hours before the appointment time.");
      return;
    }
    setAppointmentToCancel(appointment);
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!appointmentToCancel) return;

    try {
      setCancelLoading(true);
      const userId =
        typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      if (!userId) {
        toast.error("Please login as a patient to cancel appointments.");
        return;
      }

      const res = await fetch("/api/appointment/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointment_id: appointmentToCancel.id, user_id: userId }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to cancel appointment.");
      }

      toast.success("Appointment cancelled successfully.");
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === appointmentToCancel.id
            ? { ...apt, status: "cancelled" }
            : apt
        )
      );
      setIsCancelModalOpen(false);
      setAppointmentToCancel(null);
    } catch (e) {
      console.error("Cancel appointment error:", e);
      toast.error(e.message || "Failed to cancel appointment. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!appointmentToReschedule || !rescheduleDate || !selectedRescheduleSlot) {
      toast.error("Please select a date and time slot.");
      return;
    }

    try {
      setRescheduleLoading(true);
      const userId =
        typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      if (!userId) {
        toast.error("Please login as a patient to reschedule appointments.");
        return;
      }

      const cleanTime = selectedRescheduleSlot.slice(0, 5);

      // Check if payment is required
      if (rescheduleQuote.needs_payment && rescheduleQuote.amount > 0) {
        // 1. Ensure Razorpay SDK is loaded
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
          toast.error("Failed to load Razorpay payment gateway.");
          setRescheduleLoading(false);
          return;
        }

        // 2. Create Razorpay order
        const idempotencyKey = `reschedule-order-${appointmentToReschedule.id}-${Date.now()}`;
        const orderRes = await fetch("/api/payment/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: rescheduleQuote.amount,
            currency: "INR",
            patient_id: userId,
            doctor_id: appointmentToReschedule.doctor_id,
            appointment_type: rescheduleType,
            care_episode_id: appointmentToReschedule.care_episode_id,
            idempotency_key: idempotencyKey,
          }),
        });

        const orderJson = await orderRes.json();
        if (!orderRes.ok || !orderJson.success) {
          throw new Error(orderJson.message || orderJson.error || "Failed to initialize payment.");
        }

        const orderData = orderJson.data?.order || orderJson.order;
        const razorpayKey = orderJson.data?.razorpay_key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

        // 3. Open Razorpay checkout
        const options = {
          key: razorpayKey,
          amount: orderData.amount,
          currency: orderData.currency || "INR",
          name: "MediConnect",
          description: `Consultation Fee for Dr. ${appointmentToReschedule.doctor?.full_name || appointmentToReschedule.doctor_full_name || "Doctor"}`,
          image: `${window.location.origin}/real-logo.png`,
          order_id: orderData.id,
          handler: async function (response) {
            try {
              // 4. Confirm reschedule with verified payment_id
              const confirmRes = await fetch("/api/appointment/reschedule", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  appointment_id: appointmentToReschedule.id,
                  new_date: rescheduleDate,
                  new_time: cleanTime,
                  new_type: rescheduleType,
                  user_id: userId,
                  payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                }),
              });

              const confirmJson = await confirmRes.json();
              if (!confirmJson.success) {
                throw new Error(confirmJson.message || "Failed to reschedule appointment.");
              }

              toast.success("Payment completed & appointment rescheduled!");
              setAppointments((prev) =>
                prev.map((apt) =>
                  apt.id === appointmentToReschedule.id
                    ? {
                        ...apt,
                        appointment_date: rescheduleDate,
                        appointment_time: `${cleanTime}:00`,
                        appointment_type: rescheduleType,
                        payment_status: "paid",
                        status: "booked",
                      }
                    : apt
                )
              );
              setIsRescheduleModalOpen(false);
              setAppointmentToReschedule(null);
            } catch (payConfirmErr) {
              console.error("Reschedule payment confirmation error:", payConfirmErr);
              toast.error(payConfirmErr.message || "Error finalizing reschedule after payment.");
            } finally {
              setRescheduleLoading(false);
            }
          },
          modal: {
            ondismiss: function () {
              setRescheduleLoading(false);
              toast.error("Payment cancelled. Appointment was not rescheduled.");
            },
          },
          prefill: {
            name: "",
            email: "",
            contact: "",
          },
          theme: {
            color: "#0067A1",
          },
        };

        const razorpayObj = new window.Razorpay(options);
        razorpayObj.open();
        return;
      }

      // ── Free / Already paid reschedule flow ──
      const res = await fetch("/api/appointment/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_id: appointmentToReschedule.id,
          new_date: rescheduleDate,
          new_time: cleanTime,
          new_type: rescheduleType,
          user_id: userId,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to reschedule appointment.");
      }

      toast.success("Appointment rescheduled successfully.");
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === appointmentToReschedule.id
            ? {
              ...apt,
              appointment_date: rescheduleDate,
              appointment_time: `${cleanTime}:00`,
              appointment_type: rescheduleType,
              status: "booked",
            }
            : apt
        )
      );
      setIsRescheduleModalOpen(false);
      setAppointmentToReschedule(null);
    } catch (e) {
      console.error("Reschedule error:", e);
      toast.error(e.message || "Failed to reschedule appointment. Please try again.");
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handleJoinVideoCall = (appointment) => {
    const userId =
      typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    router.push(`/appointments/${appointment.id}/video?userId=${userId}&role=patient`);
  };

  const handleViewPrescription = async (appointment) => {
    try {
      setPrescriptionLoading(true);
      setIsPrescriptionModalOpen(true);

      const patientId =
        typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      if (!patientId) {
        throw new Error("Patient is not logged in.");
      }

      const res = await fetch("/api/prescriptions/by-patient-appointment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${patientId}`,
          "x-user-id": patientId,
        },
        body: JSON.stringify({
          patient_id: patientId,
          appointment_id: appointment.id,
        }),
      });
      const data = await res.json();

      if (!data.success || !data.data) {
        setPrescriptionData(null);
      } else {
        setPrescriptionData({
          ...data.data,
          notes: data.data?.notes ?? data.data?.special_message ?? "",
        });
      }
    } catch (e) {
      console.error("Fetch prescription error:", e);
      setPrescriptionData(null);
    } finally {
      setPrescriptionLoading(false);
    }
  };

  const handleSendToLab = async () => {
    setIsPrescriptionModalOpen(false);
    const consultId = prescriptionData?.appointment_id || selectedAppointment?.id;
    if (consultId) {
      router.push(`/dashboard/lab-booking/prescription?consultation_id=${consultId}`);
    } else {
      router.push("/dashboard/lab-booking");
    }
  };

  const handleSendToChemist = async () => {
    setIsPrescriptionModalOpen(false);
    const rxId = prescriptionData?.id || selectedAppointment?.prescription_id;
    if (rxId) {
      router.push(`/medicine-order?prescription_id=${rxId}`);
    } else {
      router.push("/medicine-order");
    }
  };

  const handleCardSendToChemist = (appointment) => {
    const rxId = appointment?.prescription?.id || appointment?.prescription_id;
    if (rxId) {
      router.push(`/medicine-order?prescription_id=${rxId}`);
    } else {
      handleViewPrescription(appointment);
    }
  };

  const handleCardSendToLab = (appointment) => {
    if (appointment?.id) {
      router.push(`/dashboard/lab-booking/prescription?consultation_id=${appointment.id}`);
    } else {
      router.push("/dashboard/lab-booking");
    }
  };

  const handleSharePrescription = (appointment) => {
    setSelectedAppointmentForShare(appointment);
    setIsShareModalOpen(true);
  };

  const handleDownloadPrescription = (appointment) => {
    handleViewPrescription(appointment);
  };

  const handleSaveToDigiLocker = (appointment) => {
    setAutoSaveDigiLockerModal(true);
    handleViewPrescription(appointment);
  };

  const handleOutcomeClick = (appointment) => {
    setAppointmentForOutcome(appointment);
    setIsOutcomeModalOpen(true);
  };

  const handleOutcomeSuccess = (appointmentId, improvementStatus) => {
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === appointmentId
          ? {
            ...apt,
            case_status: improvementStatus === "better" ? "CLOSED_RESOLVED" : apt.case_status,
            has_submitted_outcome: true,
          }
          : apt
      )
    );
  };

  // ── FOLLOW_UP_PENDING action handlers ──
  const handleFollowUpAction = async (consultation_id, care_episode_id, action) => {
    const patientId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    if (!patientId) return;

    if (action === "book_followup") {
      router.push("/appointments/book");
      return;
    }

    if (action === "update_symptoms") {
      // Open the outcome tracker for this consultation
      const fakeAppt = { id: consultation_id, care_episode_id };
      setAppointmentForOutcome(fakeAppt);
      setIsOutcomeModalOpen(true);
      return;
    }

    // mark_resolved
    try {
      setFollowUpActionLoading(prev => ({ ...prev, [consultation_id]: action }));
      const res = await fetch("/api/patient/followup-actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${patientId}`,
        },
        body: JSON.stringify({ consultation_id, care_episode_id, action }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Action failed");
      toast.success("Your recovery status has been updated! Great news! 🎉");
      setPendingFollowUps(prev => prev.filter(f => f.consultation_id !== consultation_id));
    } catch (e) {
      toast.error(e.message || "Failed to update recovery status.");
    } finally {
      setFollowUpActionLoading(prev => ({ ...prev, [consultation_id]: null }));
    }
  };

  const handleServiceClick = (appointment) => {
    setAppointmentForService(appointment);
    setIsServiceModalOpen(true);
  };

  const isPastSlot = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return false;
    const [hStr, mStr] = timeStr.split(":");
    const hNum = parseInt(hStr, 10);
    const mNum = parseInt(mStr, 10);
    if (Number.isNaN(hNum) || Number.isNaN(mNum)) return false;
    const slotDate = new Date(dateStr);
    slotDate.setHours(hNum, mNum, 0, 0);
    return slotDate < new Date();
  };

  const filteredAppointments = getFilteredAppointments();
  const activeCallAppointment = appointments.find(
    (apt) => String(apt.id) === String(activeCallAppointmentId)
  );
  const activeCallIdToShow =
    activeCallAppointment && isLiveVideoCall(activeCallAppointment, new Date(activeCallTick))
      ? activeCallAppointment.id
      : null;

  return (
    <>
      <AppointmentDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        appointment={selectedAppointment}
        onViewPrescription={handleViewPrescription}
        onDownloadPrescription={handleDownloadPrescription}
        onSharePrescription={handleSharePrescription}
        onSaveToDigiLocker={handleSaveToDigiLocker}
        onSendToChemist={handleCardSendToChemist}
        onSendToLab={handleCardSendToLab}
      />

      {/* Reschedule Modal */}
      {isRescheduleModalOpen && appointmentToReschedule && (
        <div className="fixed inset-0 z-9999 flex sm:items-center sm:justify-center p-0 sm:p-6 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setIsRescheduleModalOpen(false)}
          />
          <div className="relative bg-white rounded-none sm:rounded-2xl shadow-2xl w-full h-full sm:h-auto sm:max-w-lg sm:max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-200 shrink-0">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Reschedule Appointment</h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Select a new date, type, and available time slot.
              </p>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 flex-1 overflow-y-auto">
              {/* Appointment Type */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700">
                  Appointment Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "video_consultation", label: "Video", icon: FaVideo },
                    { id: "clinic_visit", label: "Clinic", icon: FaHospital },
                    { id: "home_visit", label: "Home", icon: FaHome },
                  ].map((opt) => {
                    const active = rescheduleType === opt.id;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setRescheduleType(opt.id)}
                        className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors ${active
                          ? "border-[#0067A1] bg-[#0067A1] text-white shadow-sm"
                          : "border-gray-200 bg-white text-gray-700 hover:border-[#0067A1]/70"
                          }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payment / Fee Status Notice */}
              {rescheduleQuote.loading ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-500">
                  <div className="w-3.5 h-3.5 border-2 border-[#0067A1] border-t-transparent rounded-full animate-spin" />
                  <span>Checking consultation fee...</span>
                </div>
              ) : rescheduleQuote.needs_payment && rescheduleQuote.amount > 0 ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-xs text-amber-900 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-md bg-amber-100 text-amber-700">
                      <FaRupeeSign className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-semibold text-amber-900">Payment Required</p>
                      <p className="text-[11px] text-amber-700">{rescheduleQuote.reason || "Consultation fee required"}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-amber-900 px-2 py-0.5 rounded bg-amber-100">
                    ₹{rescheduleQuote.amount}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-medium">Free Reschedule</span>
                    <span className="text-[11px] text-emerald-700">({rescheduleQuote.reason || "Already paid"})</span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700">₹0 Fee</span>
                </div>
              )}

              {/* Date Picker */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700">
                  <FaCalendarAlt className="inline w-3 h-3 mr-1 text-[#0067A1]" />
                  New Date
                </label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0067A1] focus:border-transparent"
                  value={rescheduleDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                />
              </div>

              {/* Time Slots */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700">
                  <FaClock className="inline w-3 h-3 mr-1 text-[#0067A1]" />
                  Available Slots
                </label>
                {rescheduleSlotsLoading ? (
                  <p className="text-xs text-gray-500">Loading available slots...</p>
                ) : rescheduleSlots.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    No slots available for this date. Try another date.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1">
                    {rescheduleSlots.map((slot) => {
                      const rawTime = slot.time?.slice(0, 5) || slot.time;
                      const isBooked =
                        slot.slot_booked ||
                        ["booked", "approved", "completed", "freezed"].includes(slot.status);
                      const isPast = isPastSlot(rescheduleDate, rawTime);
                      const disabled = isBooked || isPast;
                      const isSelected = selectedRescheduleSlot === rawTime;

                      return (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={disabled}
                          onClick={() => setSelectedRescheduleSlot(rawTime)}
                          className={`text-[11px] px-2 py-1.5 rounded-full border transition-colors shadow-sm ${disabled
                            ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                            : isSelected
                              ? "border-[#0067A1] bg-[#0067A1] text-white shadow"
                              : "border-emerald-100 bg-emerald-50 text-gray-800 hover:border-[#0067A1] hover:bg-[#0067A1]/10"
                            }`}
                        >
                          {formatTimeTo12Hour(rawTime)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 shrink-0 pb-safe">
              <button
                type="button"
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                onClick={() => setIsRescheduleModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rescheduleLoading || !selectedRescheduleSlot || rescheduleQuote.loading}
                onClick={handleConfirmReschedule}
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-[#0067A1] text-white hover:bg-[#004F7C] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {rescheduleLoading
                  ? "Processing..."
                  : rescheduleQuote.needs_payment && rescheduleQuote.amount > 0
                    ? `Pay ₹${rescheduleQuote.amount}`
                    : "Reschedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {isCancelModalOpen && appointmentToCancel && (
        <div className="fixed inset-0 z-[9999] flex sm:items-center sm:justify-center p-0 sm:p-6 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setIsCancelModalOpen(false)}
          />
          <div className="relative bg-white rounded-none sm:rounded-2xl shadow-2xl w-full h-full sm:h-auto sm:max-w-md p-6 flex flex-col justify-between overflow-y-auto pb-safe z-10">
            <div className="space-y-4 my-auto">
              <div className="flex items-center gap-3 text-amber-600">
                <div className="p-3 bg-amber-50 rounded-full shrink-0">
                  <FaExclamationTriangle className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Cancel Appointment?</h2>
              </div>

              <p className="text-sm text-gray-600">
                Are you sure you want to cancel this appointment? If you need to change the date or time,
                consider <span className="font-medium text-[#0067A1]">rescheduling</span> instead.
              </p>

              <div className="bg-gray-50 rounded-lg p-3 text-sm border border-gray-100">
                <p className="font-medium text-gray-900">
                  {appointmentToCancel.doctor?.full_name || appointmentToCancel.doctor?.name || "Doctor"}
                </p>
                <p className="text-gray-600">
                  {getDateTime(appointmentToCancel).dateObj?.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  at {formatTimeTo12Hour(getDateTime(appointmentToCancel).timeStr)}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-6 border-t border-gray-100 mt-4">
              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsCancelModalOpen(false);
                    handleRescheduleClick(appointmentToCancel);
                  }}
                  className="w-full sm:flex-1 py-2.5 px-4 text-sm font-medium rounded-lg border border-[#0067A1] text-[#0067A1] hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  Reschedule Instead
                </button>
                <button
                  type="button"
                  disabled={cancelLoading}
                  onClick={handleConfirmCancel}
                  className="w-full sm:flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  {cancelLoading ? "Cancelling..." : "Yes, Cancel"}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="w-full text-center py-2 text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                Keep Appointment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prescription Modal */}
      {isPrescriptionModalOpen && (
        <PrescriptionViewerModal
          data={prescriptionData}
          combinedLabs={combinedLabs}
          autoSaveDigiLocker={autoSaveDigiLockerModal}
          onClose={() => {
            setIsPrescriptionModalOpen(false);
            setAutoSaveDigiLockerModal(false);
          }}
          onSendToLab={combinedLabs.length > 0 ? handleSendToLab : undefined}
          onSendToChemist={(prescriptionData?.medicines && prescriptionData.medicines.length > 0) ? handleSendToChemist : undefined}
        />
      )}

      <div className="min-h-screen ">
        <div className="w-full mx-auto">
          {/* Active Video Call Alert */}
          {activeCallIdToShow && (
            <div className="mb-6 rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-4 shadow-lg animate-pulse">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                  </span>
                  <div>
                    <p className="text-base font-bold text-emerald-900">Doctor has started your video consultation!</p>
                    <p className="text-sm text-emerald-700">Click the button to join the same call.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
                    router.push(`/appointments/${activeCallIdToShow}/video?userId=${userId}&role=patient`);
                  }}
                  className="shrink-0 px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <span className="flex items-center gap-2"><FaVideo className="w-4 h-4" /> Join Call Now</span>
                </button>
              </div>
            </div>
          )}

          {/* ── FOLLOW_UP_PENDING — Recovery Monitoring Banners ── */}
          {followUpLoading && (
            <div className="mb-6 flex items-center gap-3 text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-[#0067A1] border-t-transparent rounded-full animate-spin" />
              Checking your recovery status...
            </div>
          )}
          {!followUpLoading && pendingFollowUps.length > 0 && (
            <div className="mb-8 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Stethoscope className="w-5 h-5 text-[#0067A1]" />
                <h2 className="text-lg font-semibold text-gray-900">Recovery Check-ins</h2>
                <span className="ml-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-md text-xs font-medium">
                  {pendingFollowUps.length} pending
                </span>
              </div>
              {pendingFollowUps.map((followUp) => {
                const urgencyConfig = {
                  HIGH: { bg: "bg-red-50", border: "border-red-300", badge: "bg-red-100 text-red-700", icon: AlertCircle, iconColor: "text-red-500", dot: "bg-red-500" },
                  MEDIUM: { bg: "bg-amber-50", border: "border-amber-300", badge: "bg-amber-100 text-amber-700", icon: Clock, iconColor: "text-amber-500", dot: "bg-amber-500" },
                  LOW: { bg: "bg-blue-50", border: "border-[#0067A1]/30", badge: "bg-blue-100 text-[#004F7C]", icon: ClipboardList, iconColor: "text-[#0067A1]", dot: "bg-[#0067A1]" },
                };
                const cfg = urgencyConfig[followUp.urgency] || urgencyConfig.LOW;
                const UrgencyIcon = cfg.icon;
                const isProcessing = followUpActionLoading[followUp.consultation_id];

                return (
                  <div
                    key={followUp.consultation_id}
                    className={`rounded-lg border-2 ${cfg.border} ${cfg.bg} p-5 shadow-sm`}
                  >
                    {/* Banner Header */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-md bg-white shadow-sm`}>
                          <UrgencyIcon className={`w-5 h-5 ${cfg.iconColor}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900 text-sm">Your doctor is monitoring your recovery</p>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${cfg.badge}`}>
                              {followUp.urgency} PRIORITY
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            {followUp.message}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`inline-block w-2 h-2 rounded-full ${cfg.dot}`} />
                        <span className="text-xs text-gray-500 font-medium">
                          {followUp.days_pending === 0 ? "Today" : `${followUp.days_pending}d ago`}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {/* Update Symptoms */}
                      <button
                        onClick={() => handleFollowUpAction(
                          followUp.consultation_id,
                          followUp.care_episode_id,
                          "update_symptoms"
                        )}
                        disabled={!!isProcessing}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-[#0067A1] text-[#0067A1] bg-white text-sm font-medium hover:bg-[#0067A1]/5 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <ClipboardList className="w-4 h-4" />
                        Update Symptoms
                      </button>

                      {/* Book Follow-up */}
                      <button
                        onClick={() => handleFollowUpAction(
                          followUp.consultation_id,
                          followUp.care_episode_id,
                          "book_followup"
                        )}
                        disabled={!!isProcessing}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-blue-500 text-[#0067A1] bg-white text-sm font-medium hover:bg-blue-50 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <CalendarPlus className="w-4 h-4" />
                        Book Follow-up
                      </button>

                      {/* I'm Feeling Better */}
                      <button
                        onClick={() => handleFollowUpAction(
                          followUp.consultation_id,
                          followUp.care_episode_id,
                          "mark_resolved"
                        )}
                        disabled={!!isProcessing}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[#0067A1] hover:bg-[#004F7C] text-white text-sm font-medium shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isProcessing === "mark_resolved" ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        I&apos;m Feeling Better!
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">My Appointments</h1>
            <p className="text-sm text-slate-500">All clinical and virtual consultations in one place</p>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1 mb-6 border-b border-slate-200 overflow-x-auto no-scrollbar">
            {[
              { value: "today", label: "Today" },
              { value: "upcoming", label: "Upcoming" },
              { value: "past", label: "Past" },
              { value: "cancelled", label: "Cancelled" },
              { value: "all", label: "All" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setDateFilter(tab.value)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  dateFilter === tab.value
                    ? "border-[#0067A1] text-[#0067A1]"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Appointments Grid */}
          {loading ? (
            <LoadingScreen message="Loading your appointments..." submessage="Fetching your consultation schedule" />
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : filteredAppointments.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
              {filteredAppointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  currentTime={currentTime}
                  isActiveCall={appointment.id === activeCallIdToShow}
                  hasPrescription={appointment.has_prescription || !!prescriptionExistsMap[appointment.id]}
                  onViewDetails={handleViewDetails}
                  onCancel={handleCancelClick}
                  onReschedule={handleRescheduleClick}
                  onJoinCall={handleJoinVideoCall}
                  onViewPrescription={handleViewPrescription}
                  onDownloadPrescription={handleDownloadPrescription}
                  onSharePrescription={handleSharePrescription}
                  onSaveToDigiLocker={handleSaveToDigiLocker}
                  onSendToChemist={handleCardSendToChemist}
                  onSendToLab={handleCardSendToLab}
                  onOutcomeTracker={handleOutcomeClick}
                  onServiceRecommendations={handleServiceClick}
                />
              ))}
            </div>
          ) : (
            <EmptyState dateFilter={dateFilter} />
          )}
          {/* Outcome Modal Component Here */}
          <OutcomeTrackerModal
            isOpen={isOutcomeModalOpen}
            onClose={() => setIsOutcomeModalOpen(false)}
            appointment={appointmentForOutcome}
            onSuccess={handleOutcomeSuccess}
          />
          {/* Share Prescription Menu Modal */}
          {isShareModalOpen && selectedAppointmentForShare && (
            <SharePrescriptionMenuModal
              isOpen={isShareModalOpen}
              onClose={() => {
                setIsShareModalOpen(false);
                setSelectedAppointmentForShare(null);
              }}
              prescription={selectedAppointmentForShare.prescription || { id: selectedAppointmentForShare.prescription_id }}
              doctorName={selectedAppointmentForShare.doctor?.full_name || selectedAppointmentForShare.doctor?.name}
              diagnosis={selectedAppointmentForShare.disease_info?.summary || selectedAppointmentForShare.diagnosis}
              date={getDateTime(selectedAppointmentForShare).dateObj?.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              onOpenChemistShare={() => {
                handleViewPrescription(selectedAppointmentForShare);
              }}
              onOpenLabShare={() => {
                handleViewPrescription(selectedAppointmentForShare);
              }}
              onSaveToDigiLocker={() => handleSaveToDigiLocker(selectedAppointmentForShare)}
              isSavedInDigiLocker={selectedAppointmentForShare.prescription_saved_in_digilocker || selectedAppointmentForShare.prescription?.is_saved_in_digilocker}
            />
          )}

          {/* Service Recommendations Modal */}
          <ServiceRecommendationModal
            isOpen={isServiceModalOpen}
            onClose={() => setIsServiceModalOpen(false)}
            appointment={appointmentForService}
          />
        </div>
      </div>
    </>
  );
}

// Appointment Card Component
const AppointmentCard = ({
  appointment,
  currentTime = new Date(),
  isActiveCall,
  hasPrescription,
  onViewDetails,
  onCancel,
  onReschedule,
  onJoinCall,
  onViewPrescription,
  onDownloadPrescription,
  onSharePrescription,
  onSaveToDigiLocker,
  onSendToChemist,
  onSendToLab,
  onOutcomeTracker,
  onServiceRecommendations,
}) => {
  const [orchestrator, setOrchestrator] = useState({ loading: false, data: null });
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!["COMPLETED", "FOLLOW_UP_PENDING", "CLOSED_NO_RESPONSE"].includes(appointment.case_status)) return;

    let isMounted = true;
    const fetchNextSteps = async () => {
      setOrchestrator({ loading: true, data: null });
      try {
        const res = await fetch(`/api/patient/next-step?consultation_id=${appointment.id}`);
        const json = await res.json();
        if (isMounted && json.success) {
          setOrchestrator({ loading: false, data: json.data });
        } else if (isMounted) {
          setOrchestrator({ loading: false, data: null });
        }
      } catch (e) {
        if (isMounted) setOrchestrator({ loading: false, data: null });
      }
    };

    fetchNextSteps();
    return () => { isMounted = false; };
  }, [appointment.id, appointment.case_status, appointment.has_submitted_outcome]);

  const getStatusConfig = (status) => {
    switch (status) {
      case "confirmed":   return { cls: "bg-green-100 text-green-700 border-green-200",   dot: "bg-green-500",  label: "Confirmed" };
      case "pending":     return { cls: "bg-amber-100 text-amber-700 border-amber-200",   dot: "bg-amber-500",  label: "Pending" };
      case "completed":   return { cls: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", label: "Completed" };
      case "expired":     return { cls: "bg-gray-100 text-gray-500 border-gray-200",      dot: "bg-gray-400",   label: "Expired" };
      case "cancelled":   return { cls: "bg-red-100 text-red-700 border-red-200",         dot: "bg-red-500",    label: "Cancelled" };
      default:            return { cls: "bg-gray-100 text-gray-600 border-gray-200",      dot: "bg-gray-400",   label: status };
    }
  };

  const effectiveStatus   = getEffectiveStatus(appointment, currentTime);
  const statusCfg         = getStatusConfig(effectiveStatus);
  const canModify         = canModifyAppointment(appointment, currentTime);
  const timing            = getVideoCallTiming(appointment, currentTime);
  const appointmentTypeKey = getAppointmentTypeKey(appointment);
  const TypeIcon          = APPOINTMENT_TYPE_ICONS[appointmentTypeKey] || FaHospital;
  const isExpired         = effectiveStatus === "expired" || normalizeStatus(appointment.status) === "expired";
  const isPast            = effectiveStatus === "completed" || isExpired;
  const isCompleted       = effectiveStatus === "completed" || normalizeStatus(appointment.status) === "completed";
  const hasRx             = hasPrescription || appointment.has_prescription || !!appointment.prescription_id || isCompleted;
  const isDigiLockerSaved = !!(appointment.prescription_saved_in_digilocker || appointment.prescription?.is_saved_in_digilocker);
  const showVideoButton   = timing.isVideo && !isCompleted && !isPast && !isExpired;

  // Doctor image resolution
  const doctorImageUrl = (() => {
    const doc = appointment.doctor;
    if (!doc) return null;
    if (doc.profile_image_url) return doc.profile_image_url;
    if (doc.profile_image) return doc.profile_image;
    if (doc.profile_picture) return doc.profile_picture;
    if (doc.photo_url) return doc.photo_url;
    if (doc.avatar_url) return doc.avatar_url;

    // Check passport_photo (array or JSON string)
    const pp = doc.passport_photo;
    if (Array.isArray(pp) && pp.length > 0 && typeof pp[0] === "string") return pp[0];
    if (typeof pp === "string") {
      try {
        const parsed = JSON.parse(pp);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
        if (typeof parsed === "string") return parsed;
      } catch (_) {}
      if (pp.startsWith("http")) return pp;
    }
    return null;
  })();

  useEffect(() => {
    setImgError(false);
  }, [doctorImageUrl]);

  const doctorName =
    appointment.doctor?.full_name ||
    appointment.doctor?.name ||
    "Doctor";

  const specialty = (() => {
    const raw =
      appointment.doctor?.specialty ||
      appointment.doctor?.specialization ||
      "";
    if (Array.isArray(raw)) return raw.join(", ");
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (!trimmed) return "";
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.join(", ");
      } catch { }
      return trimmed.replace(/^[\[\"']+|[\]"']+$/g, "");
    }
    return String(raw);
  })();

  const typeColorCls =
    appointmentTypeKey === "video"
      ? "bg-blue-50 text-blue-700 border-blue-100"
      : appointmentTypeKey === "home"
        ? "bg-purple-50 text-purple-700 border-purple-100"
        : "bg-teal-50 text-teal-700 border-teal-100";

  return (
    <div
      className={`bg-white border rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md flex flex-col justify-between ${
        isActiveCall
          ? "border-emerald-400 shadow-sm shadow-emerald-100/50 ring-1 ring-emerald-300"
          : "border-slate-200/90 shadow-xs hover:border-[#0067A1]/40"
      }`}
    >
      {/* Active Call Alert Banner */}
      {isActiveCall && (
        <div className="bg-emerald-600 text-white px-2.5 py-1 text-[11px] font-semibold text-center flex items-center justify-center gap-1.5 animate-pulse">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
          Doctor waiting in consultation
        </div>
      )}

      <div className="p-3 sm:p-3.5 flex flex-col flex-1 justify-between gap-2.5">
        <div>
          {/* Top Row — Consultation Type & Status Badges */}
          <div className="flex items-center justify-between gap-1.5 mb-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10.5px] font-semibold border rounded-md ${typeColorCls}`}>
              <TypeIcon className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{getAppointmentTypeLabel(appointment)}</span>
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10.5px] font-semibold border rounded-md shrink-0 ${statusCfg.cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
              {statusCfg.label}
            </span>
          </div>

          {/* Doctor Info Row */}
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200/80 ring-1 ring-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
              {doctorImageUrl && !imgError ? (
                <img
                  src={doctorImageUrl}
                  alt={doctorName}
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <FaUserMd className="w-4 h-4 text-[#0067A1]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs sm:text-[13px] font-bold text-slate-800 truncate leading-snug">
                {doctorName}
              </h3>
              {specialty && (
                <p className="text-[10.5px] text-[#0067A1] font-medium truncate leading-tight mt-0.5">
                  {specialty}
                </p>
              )}
            </div>
          </div>

          {/* Date / Time / Location Block — Compact Medical Standard */}
          <div className="bg-slate-50/80 border border-slate-100/90 rounded-lg p-2 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-700">
              <div className="flex items-center gap-1.5 min-w-0 font-medium">
                <FaCalendarAlt className="w-3 h-3 text-[#0067A1] shrink-0" />
                <span className="truncate">
                  {getDateTime(appointment).dateObj?.toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }) || "—"}
                </span>
              </div>
              <div className="flex items-center gap-1 text-slate-600 font-semibold text-[10.5px] shrink-0 bg-white/90 px-1.5 py-0.5 rounded border border-slate-200/60">
                <FaClock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                <span>{formatTimeTo12Hour(getDateTime(appointment).timeStr) || "—"}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500">
              <FaMapMarkerAlt className="w-2.5 h-2.5 text-slate-400 shrink-0" />
              <span className="truncate">
                {appointment.location || appointment.doctor?.clinic_name || (appointmentTypeKey === "video" ? "Video Consultation" : "MediConnect Clinic")}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons Section */}
        <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
          {/* Primary Action Row */}
          <div className={`grid gap-1.5 ${showVideoButton || hasRx || (timing.isVideo && isExpired) ? "grid-cols-2" : "grid-cols-1"}`}>
            <button
              type="button"
              onClick={() => onViewDetails(appointment)}
              className="h-8 w-full flex items-center justify-center gap-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-[11px] font-semibold border border-slate-200/80 transition-all cursor-pointer"
            >
              <FaEye className="h-3 w-3 text-slate-600 shrink-0" />
              Details
            </button>

            {/* Video Call Button */}
            {showVideoButton && (
              <button
                type="button"
                onClick={() => timing.canJoin && onJoinCall(appointment)}
                disabled={!timing.canJoin}
                title={timing.tooltip || (timing.canJoin ? "Join video consultation" : "Call unavailable")}
                className={`h-8 w-full flex items-center justify-center gap-1 px-2 rounded-lg text-[11px] font-semibold transition-all ${
                  timing.canJoin
                    ? isActiveCall
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs ring-1 ring-emerald-400 cursor-pointer animate-pulse"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                    : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed select-none"
                }`}
              >
                <FaVideo className={`h-3 w-3 shrink-0 ${!timing.canJoin ? "opacity-40" : "text-white"}`} />
                <span className="truncate">{isActiveCall && timing.canJoin ? "Join" : timing.label}</span>
              </button>
            )}

            {/* Expired Video Call Label (when video appointment expired and no prescription) */}
            {timing.isVideo && isExpired && !hasRx && (
              <button
                type="button"
                disabled
                title="Appointment time expired (30 minutes after scheduled slot)"
                className="h-8 w-full flex items-center justify-center gap-1 px-2 rounded-lg bg-slate-100 text-slate-400 border border-slate-200 text-[11px] font-semibold cursor-not-allowed select-none"
              >
                <FaVideo className="h-3 w-3 shrink-0 opacity-40" />
                <span className="truncate">Expired</span>
              </button>
            )}

            {/* Prescription Primary View Button */}
            {hasRx && (
              <button
                type="button"
                onClick={() => onViewPrescription(appointment)}
                className="h-8 w-full flex items-center justify-center gap-1 px-2 rounded-lg bg-[#0067A1] hover:bg-[#004F7C] text-white text-[11px] font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer"
                title="View medical prescription"
              >
                <FaFileMedical className="h-3 w-3 shrink-0" />
                Prescription
              </button>
            )}
          </div>

          {/* DigiLocker Quick Action */}
          {hasRx && (
            <div className="pt-1 border-t border-slate-100/80 flex items-center justify-end">
              <button
                type="button"
                onClick={() => onSaveToDigiLocker ? onSaveToDigiLocker(appointment) : null}
                title={isDigiLockerSaved ? "Saved in DigiLocker" : "Save to DigiLocker"}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-semibold transition-all cursor-pointer border ${
                  isDigiLockerSaved
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-sky-50 text-[#0067A1] hover:bg-sky-100 border-sky-200/80"
                }`}
              >
                {isDigiLockerSaved ? (
                  <>
                    <FaCheck className="w-2.5 h-2.5 text-emerald-600" />
                    <span>In DigiLocker</span>
                  </>
                ) : (
                  <>
                    <FaLock className="w-2.5 h-2.5 text-[#0067A1]" />
                    <span>DigiLocker</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Reschedule & Cancel Row */}
          {canModify && (
            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100/80">
              <button
                type="button"
                onClick={() => onReschedule(appointment)}
                className="flex-1 h-7.5 px-2 rounded-lg text-[11px] font-semibold text-[#0067A1] bg-sky-50 hover:bg-sky-100 border border-sky-200/80 transition-all flex items-center justify-center gap-1 cursor-pointer"
                title="Reschedule appointment"
              >
                <FaCalendarAlt className="w-2.5 h-2.5 text-[#0067A1]" />
                <span>Reschedule</span>
              </button>
              <button
                type="button"
                onClick={() => onCancel(appointment)}
                className="h-7.5 px-2.5 rounded-lg text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 transition-all flex items-center justify-center gap-1 cursor-pointer"
                title="Cancel appointment"
              >
                <FaTimes className="w-2.5 h-2.5 text-rose-500" />
                <span>Cancel</span>
              </button>
            </div>
          )}

          {/* Orchestrator Next Steps */}
          {orchestrator.loading ? (
            <div className="flex justify-center items-center py-1.5 bg-slate-50 border border-slate-100 rounded-lg">
              <div className="w-2.5 h-2.5 border-2 border-[#0067A1] border-t-transparent rounded-full animate-spin" />
              <span className="ml-1.5 text-[10.5px] text-slate-500 font-medium">Checking actions...</span>
            </div>
          ) : orchestrator.data?.type === "ACTION" && orchestrator.data.actions.length > 0 ? (
            <div className="flex flex-col gap-1 pt-1 border-t border-slate-100">
              {orchestrator.data.actions.map((action, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (action.action_id === "SUBMIT_OUTCOME") onOutcomeTracker(appointment);
                    else if (action.action_id === "BOOK_FOLLOWUP" || action.action_id === "CONFIRM_FOLLOWUP") onReschedule(appointment);
                    else if (action.action_id?.startsWith("ORDER_")) onServiceRecommendations(appointment);
                  }}
                  className={`h-7.5 w-full flex items-center justify-center gap-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                    action.priority === 1
                      ? "bg-[#0067A1] hover:bg-[#004F7C] text-white shadow-xs"
                      : "bg-sky-50 hover:bg-sky-100 text-[#004F7C] border border-sky-200"
                  }`}
                  title={action.description}
                >
                  {action.action_id === "SUBMIT_OUTCOME" ? <Activity className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                  <span className="truncate">{action.label}</span>
                </button>
              ))}
            </div>
          ) : orchestrator.data?.type === "MONITOR" ? (
            <div className="w-full bg-slate-50 border border-slate-200/80 text-slate-500 py-1 text-center text-[10px] font-medium tracking-wide rounded-lg">
              Monitoring — Awaiting Doctor Action
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};




// Empty State Component
const EmptyState = ({ dateFilter }) => {
  const messages = {
    today: {
      title: "Nothing scheduled today",
      description: "No consultations are booked for today. Book an appointment to get started.",
      hint: "Your schedule is clear",
    },
    upcoming: {
      title: "No upcoming appointments",
      description: "You don't have any consultations coming up. Find a doctor and book a slot.",
      hint: "Book when you're ready",
    },
    past: {
      title: "No past consultations",
      description: "Your past appointments will appear here once you've had a consultation.",
      hint: "Your history will show here",
    },
    cancelled: {
      title: "No cancelled appointments",
      description: "You haven't cancelled any appointments. That's a good sign.",
      hint: "All clear here",
    },
    all: {
      title: "No appointments yet",
      description: "You haven't booked any consultations. Use Find Doctors to get started.",
      hint: "Start your health journey",
    },
  };

  const message = messages[dateFilter] || messages.all;

  return (
    <div className="py-16 px-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">{message.hint}</p>
      <h3 className="text-xl font-semibold text-slate-800 mb-2">{message.title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mx-auto">{message.description}</p>
    </div>
  );
};
