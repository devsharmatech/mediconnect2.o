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
} from "react-icons/fa";
import AppointmentDetailsModal from "@/components/public-site/appointments/AppointmentDetailsModal";
import OutcomeTrackerModal from "@/components/public-site/appointments/OutcomeTrackerModal";
import ServiceRecommendationModal from "@/components/public-site/appointments/ServiceRecommendationModal";
import PrescriptionViewerModal from "@/components/public-site/appointments/PrescriptionViewerModal";
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

const getEffectiveStatus = (apt) => {
  const base = normalizeStatus(apt.status);
  if (!["confirmed", "pending"].includes(base)) return base;

  const { dateObj, timeStr } = getDateTime(apt);
  if (!dateObj || !timeStr) return base;

  const [hStr, mStr] = timeStr.split(":");
  const hNum = parseInt(hStr, 10);
  const mNum = parseInt(mStr, 10);
  if (Number.isNaN(hNum) || Number.isNaN(mNum)) return base;

  const start = new Date(dateObj);
  start.setHours(hNum, mNum, 0, 0);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const now = new Date();

  if (now > end) return "expired";
  return base;
};

const getAppointmentStart = (apt) => {
  const { dateObj, timeStr } = getDateTime(apt);
  if (!dateObj || !timeStr) return null;
  const [hStr, mStr] = timeStr.split(":");
  const hNum = parseInt(hStr, 10);
  const mNum = parseInt(mStr, 10);
  if (Number.isNaN(hNum) || Number.isNaN(mNum)) return null;
  const start = new Date(dateObj);
  start.setHours(hNum, mNum, 0, 0);
  return start;
};

const getAppointmentEnd = (apt) => {
  const start = getAppointmentStart(apt);
  if (!start) return null;
  return new Date(start.getTime() + 2 * 60 * 60 * 1000);
};

const getLocalTodayString = () => {
  // YYYY-MM-DD in user's local timezone
  return new Date().toLocaleDateString("en-CA");
};

const isSameLocalDay = (aDateString, bDateString) => {
  return !!aDateString && !!bDateString && String(aDateString) === String(bDateString);
};

const getAppointmentBucket = (apt) => {
  const normalized = normalizeStatus(apt.status);
  if (normalized === "cancelled") return "cancelled";

  const effective = getEffectiveStatus(apt);
  if (effective === "completed" || effective === "expired") return "past";

  // Anything else that is not cancelled/completed/expired is considered active/upcoming
  return "active";
};

const canModifyAppointment = (apt) => {
  const status = getEffectiveStatus(apt);
  if (!["confirmed", "pending"].includes(status)) return false;
  const start = getAppointmentStart(apt);
  if (!start) return false;
  const now = new Date();
  const diffMs = start.getTime() - now.getTime();
  return diffMs >= 4 * 60 * 60 * 1000;
};

const isVideoAppointment = (apt) => {
  const t = apt.appointment_type || apt.type || "";
  return ["video", "video_consultation", "video_call", "teleconsultation", "instant_call", "telemedicine", "instant"].includes(t.toLowerCase());
};

const canJoinVideoCall = (apt) => {
  if (!isVideoAppointment(apt)) return false;
  const status = getEffectiveStatus(apt);
  return ["confirmed", "pending"].includes(status);
};


const isLiveVideoCall = (apt, now = new Date()) => {
  if (!isVideoAppointment(apt)) return false;
  const status = getEffectiveStatus(apt);
  if (!["confirmed", "pending"].includes(status)) return false;
  const start = getAppointmentStart(apt);
  if (!start) return false;
  const fifteenMinBefore = new Date(start.getTime() - 15 * 60 * 1000);
  const twoHoursAfter = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return now >= fifteenMinBefore && now <= twoHoursAfter;
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

  // Cancel modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Prescription modal state
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
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

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        setError("");

        const patientId =
          typeof window !== "undefined" ? localStorage.getItem("userId") : null;
        console.log("[DEBUG APPOINTMENTS] patientId retrieved from localStorage:", patientId);

        if (!patientId) {
          console.warn("[DEBUG APPOINTMENTS] No patientId found in localStorage! Setting empty appointments.");
          setAppointments([]);
          setLoading(false);
          return;
        }

        console.log("[DEBUG APPOINTMENTS] Fetching appointments from /api/appointment/patient-appointment for patient_id:", patientId);
        const res = await fetch("/api/appointment/patient-appointment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patient_id: patientId, date_filter: "all", page: 1 }),
        });

        const data = await res.json();
        console.log("[DEBUG APPOINTMENTS] API response data:", data);
        if (!data.success) throw new Error(data.message || "Failed to fetch appointments");

        const retrievedAppointments = data.data?.appointments || [];
        console.log(`[DEBUG APPOINTMENTS] Successfully set ${retrievedAppointments.length} appointments:`, retrievedAppointments);
        setAppointments(retrievedAppointments);

        // ── Bulk-check which appointments have prescriptions ──
        // Send ALL appointment IDs — the API is lightweight (only selects appointment_id column)
        // We can't cheaply replicate getEffectiveStatus here, so let the server do the lookup for all.
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
        console.error("[DEBUG APPOINTMENTS] Fetch appointments error:", e);
        setError(e.message || "Failed to fetch appointments");
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  // Fetch FOLLOW_UP_PENDING consultations (recoveries doctor is monitoring)
  useEffect(() => {
    const fetchPendingFollowUps = async () => {
      const patientId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
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
    const patientId =
      typeof window !== "undefined" ? localStorage.getItem("userId") : null;
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
    const interval = setInterval(checkActiveCall, 60000); // Changed from 10s to 60s to reduce API load
    return () => clearInterval(interval);
  }, []);

  // Update live-call visibility every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCallTick(Date.now());
    }, 60000);
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

  const getFilteredAppointments = () => {
    const now = new Date();
    const todayStr = getLocalTodayString();

    // Separate appointments with and without time data
    const withTime = [];
    const withoutTime = [];

    appointments.forEach((apt) => {
      const start = getAppointmentStart(apt);
      const end = getAppointmentEnd(apt);
      const effectiveStatus = getEffectiveStatus(apt);
      const { dateStr } = getDateTime(apt);
      const row = {
        apt,
        start,
        end,
        effectiveStatus,
        dateStr,
        bucket: getAppointmentBucket(apt),
        isToday: isSameLocalDay(dateStr, todayStr),
      };
      if (start && end) withTime.push(row);
      else withoutTime.push(row);
    });

    const byStartAsc = (a, b) => a.start.getTime() - b.start.getTime();
    const byStartDesc = (a, b) => b.start.getTime() - a.start.getTime();

    if (dateFilter === "today") {
      return withTime
        .filter((row) => row.isToday && row.bucket === "active")
        .sort(byStartAsc)
        .map((row) => row.apt);
    }

    if (dateFilter === "upcoming") {
      return withTime
        .filter((row) => row.bucket === "active" && row.end >= now)
        .sort(byStartAsc)
        .map((row) => row.apt);
    }

    if (dateFilter === "past") {
      return withTime
        .filter((row) => row.bucket === "past" || (row.bucket === "active" && row.end < now))
        .sort(byStartDesc)
        .map((row) => row.apt);
    }

    if (dateFilter === "cancelled") {
      return appointments.filter((apt) => normalizeStatus(apt.status) === "cancelled");
    }

    // "all" — upcoming/today first (soonest first), then past (newest first), then cancelled, then no-time
    const activeToday = withTime.filter((row) => row.bucket === "active" && row.isToday && row.end >= now);
    const activeFuture = withTime.filter((row) => row.bucket === "active" && !row.isToday && row.end >= now);
    const pastItems = withTime.filter((row) => row.bucket === "past" || (row.bucket === "active" && row.end < now));
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
      setAppointments((prev) => prev.filter((apt) => apt.id !== appointmentToCancel.id));
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
        headers: { "Content-Type": "application/json" },
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
    if (!prescriptionData) return;
    toast.success("Prescription sent to lab partner for test booking.");
    setIsPrescriptionModalOpen(false);
  };

  const handleSendToChemist = async () => {
    if (!prescriptionData) return;
    router.push(`/website/medicine-order?prescription_id=${prescriptionData.id}`);
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
      />

      {/* Reschedule Modal */}
      {isRescheduleModalOpen && appointmentToReschedule && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsRescheduleModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Reschedule Appointment</h2>
              <p className="text-sm text-gray-600 mt-1">
                Select a new date, type, and available time slot.
              </p>
            </div>

            <div className="p-6 space-y-5 flex-1 overflow-y-auto">
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

            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                onClick={() => setIsRescheduleModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rescheduleLoading || !selectedRescheduleSlot}
                onClick={handleConfirmReschedule}
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-[#0067A1] text-white hover:bg-[#004F7C] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {rescheduleLoading ? "Rescheduling..." : "Confirm Reschedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {isCancelModalOpen && appointmentToCancel && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsCancelModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-3 bg-amber-50 rounded-full">
                <FaExclamationTriangle className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Cancel Appointment?</h2>
            </div>

            <p className="text-sm text-gray-600">
              Are you sure you want to cancel this appointment? If you need to change the date or time,
              consider <span className="font-medium text-[#0067A1]">rescheduling</span> instead.
            </p>

            <div className="bg-gray-50 rounded-lg p-3 text-sm">
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

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsCancelModalOpen(false);
                  handleRescheduleClick(appointmentToCancel);
                }}
                className="w-full sm:flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-[#0067A1] text-[#0067A1] hover:bg-emerald-50 transition-colors"
              >
                Reschedule Instead
              </button>
              <button
                type="button"
                disabled={cancelLoading}
                onClick={handleConfirmCancel}
                className="w-full sm:flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {cancelLoading ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsCancelModalOpen(false)}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
            >
              Keep Appointment
            </button>
          </div>
        </div>
      )}

      {/* Prescription Modal */}
      {isPrescriptionModalOpen && (
        <PrescriptionViewerModal
          data={prescriptionData}
          combinedLabs={combinedLabs}
          onClose={() => setIsPrescriptionModalOpen(false)}
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
                  className="shrink-0 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors shadow-md"
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
                <h2 className="text-lg font-bold text-gray-900">Recovery Check-ins</h2>
                <span className="ml-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
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
                    className={`rounded-2xl border-2 ${cfg.border} ${cfg.bg} p-5 shadow-md`}
                  >
                    {/* Banner Header */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-xl bg-white shadow-sm`}>
                          <UrgencyIcon className={`w-5 h-5 ${cfg.iconColor}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-gray-900 text-sm">Your doctor is monitoring your recovery</p>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.badge}`}>
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
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-[#0067A1] text-[#0067A1] bg-white text-sm font-semibold hover:bg-[#0067A1]/5 transition-all disabled:opacity-50"
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
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-blue-500 text-[#0067A1] bg-white text-sm font-semibold hover:bg-blue-50 transition-all disabled:opacity-50"
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
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0067A1] to-[#0080C6] text-white text-sm font-bold shadow-md shadow-[#0067A1]/20 hover:shadow-lg transition-all disabled:opacity-50"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAppointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  isActiveCall={appointment.id === activeCallIdToShow}
                  hasPrescription={!!prescriptionExistsMap[appointment.id]}
                  onViewDetails={handleViewDetails}
                  onCancel={handleCancelClick}
                  onReschedule={handleRescheduleClick}
                  onJoinCall={handleJoinVideoCall}
                  onViewPrescription={handleViewPrescription}
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
const AppointmentCard = ({ appointment, isActiveCall, hasPrescription, onViewDetails, onCancel, onReschedule, onJoinCall, onViewPrescription, onOutcomeTracker, onServiceRecommendations }) => {
  const [orchestrator, setOrchestrator] = useState({ loading: false, data: null });

  useEffect(() => {
    // Fetch orchestrator rules only for states that usually have actions or monitoring
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
  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "completed":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "expired":
        return "bg-gray-100 text-gray-700 border-gray-300";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const effectiveStatus = getEffectiveStatus(appointment);
  const canModify = canModifyAppointment(appointment);
  const showVideoButton = canJoinVideoCall(appointment) || isActiveCall;
  const appointmentTypeKey = getAppointmentTypeKey(appointment);
  const TypeIcon = APPOINTMENT_TYPE_ICONS[appointmentTypeKey] || FaHospital;
  const isPast = effectiveStatus === "completed" || effectiveStatus === "expired";

  return (
    <div className={`bg-white/95 backdrop-blur-md rounded-2xl border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgba(11,79,74,0.08)] hover:-translate-y-1 transition-all duration-300 overflow-hidden ${isActiveCall
      ? "border-2 border-emerald-500 ring-4 ring-emerald-50"
      : ""
      }`}>
      {/* Active call indicator */}
      {isActiveCall && (
        <div className="bg-emerald-500 text-white px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 tracking-wide animate-pulse">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          ACTIVE CALL — Doctor is waiting
        </div>
      )}

      <div className="p-5 flex flex-col h-full">
        {/* Top Badges (Type & Status) */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${appointmentTypeKey === "video"
            ? "bg-blue-50 text-[#004F7C] border border-blue-100/60"
            : appointmentTypeKey === "home"
              ? "bg-purple-50 text-purple-700 border border-purple-100/60"
              : "bg-emerald-50 text-[#0067A1] border border-emerald-100/60"
            }`}>
            <TypeIcon className="w-3.5 h-3.5" />
            <span>{getAppointmentTypeLabel(appointment)}</span>
          </span>

          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(effectiveStatus)}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${effectiveStatus === "confirmed" || effectiveStatus === "completed"
              ? "bg-green-500"
              : effectiveStatus === "pending"
                ? "bg-yellow-500"
                : effectiveStatus === "cancelled"
                  ? "bg-red-500"
                  : "bg-gray-400"
              }`} />
            {effectiveStatus.charAt(0).toUpperCase() + effectiveStatus.slice(1)}
          </span>
        </div>

        {/* Doctor Info Row */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-[#0067A1]/5 flex items-center justify-center shrink-0 border border-[#0067A1]/10 shadow-sm">
            <FaUserMd className="w-6 h-6 text-[#0067A1]" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-slate-800 tracking-tight truncate leading-snug">
              {appointment.doctor?.name || appointment.doctor?.full_name || "Doctor"}
            </h3>
            <p className="text-xs font-medium text-slate-500 truncate mt-0.5">
              {(() => {
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
              })()}
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="space-y-2.5 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100/80 mb-5">
          <div className="flex items-center gap-3 text-xs font-medium text-slate-700">
            <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center border border-slate-100/50 shrink-0 shadow-sm">
              <FaCalendarAlt className="h-3.5 w-3.5 text-[#0067A1]" />
            </div>
            <span>
              {getDateTime(appointment).dateObj?.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs font-medium text-slate-700">
            <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center border border-slate-100/50 shrink-0 shadow-sm">
              <FaClock className="h-3.5 w-3.5 text-[#0067A1]" />
            </div>
            <span>{formatTimeTo12Hour(getDateTime(appointment).timeStr)}</span>
          </div>
          <div className="flex items-center gap-3 text-xs font-medium text-slate-700">
            <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center border border-slate-100/50 shrink-0 shadow-sm">
              <FaMapMarkerAlt className="h-3.5 w-3.5 text-[#0067A1]" />
            </div>
            <span className="truncate">
              {appointment.location || appointment.doctor?.clinic_name || "Online consultation"}
            </span>
          </div>
        </div>

        {/* Action Buttons Section */}
        <div className="space-y-3 mt-auto pt-4 border-t border-slate-100">
          {/* Primary Buttons Row */}
          <div className={isPast && hasPrescription ? "grid grid-cols-2 gap-2" : showVideoButton ? "grid grid-cols-2 gap-2" : "grid grid-cols-1"}>
            <button
              onClick={() => onViewDetails(appointment)}
              className="h-10 w-full flex items-center justify-center gap-2 px-3 bg-[#0067A1] hover:bg-[#004F7C] text-white text-xs font-semibold rounded-xl shadow-sm transition-all duration-200"
            >
              <FaEye className="h-3.5 w-3.5 shrink-0" />
              <span>Details</span>
            </button>

            {showVideoButton && (
              <button
                onClick={() => onJoinCall(appointment)}
                className={`h-10 w-full flex items-center justify-center gap-2 px-3 text-white text-xs font-bold rounded-xl transition-all duration-200 ${isActiveCall
                  ? "bg-emerald-500 hover:bg-emerald-600 animate-pulse shadow-md shadow-emerald-200"
                  : "bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                  }`}
              >
                <FaVideo className="h-3.5 w-3.5 shrink-0" />
                <span>{isActiveCall ? "Join Active" : "Join Call"}</span>
              </button>
            )}

            {isPast && hasPrescription && (
              <button
                onClick={() => onViewPrescription(appointment)}
                className="h-10 w-full flex items-center justify-center gap-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-[#0067A1] border border-emerald-200 text-xs font-semibold rounded-xl transition-all duration-200"
              >
                <FaFileMedical className="h-3.5 w-3.5 shrink-0" />
                <span>Rx</span>
              </button>
            )}
          </div>

          {/* Secondary Actions (Reschedule, Cancel, or Orchestrator Outflow) */}
          <div className="w-full">
            {canModify && (
              <div className="grid grid-cols-2 gap-2 w-full">
                <button
                  onClick={() => onReschedule(appointment)}
                  className="h-8 flex items-center justify-center text-xs font-medium text-[#0067A1] bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 rounded-xl transition-all duration-200"
                >
                  Reschedule
                </button>
                <button
                  onClick={() => onCancel(appointment)}
                  className="h-8 flex items-center justify-center text-xs font-medium text-red-600 bg-red-50/10 hover:bg-red-50 border border-red-200/60 rounded-xl transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Orchestrator Actions */}
            {orchestrator.loading ? (
              <div className="flex justify-center items-center py-2 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2 text-[11px] text-gray-500 font-medium">Checking actions...</span>
              </div>
            ) : orchestrator.data?.type === "ACTION" && orchestrator.data.actions.length > 0 ? (
              <div className="flex flex-col gap-1.5 w-full">
                {orchestrator.data.actions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (action.action_id === "SUBMIT_OUTCOME") onOutcomeTracker(appointment);
                      else if (action.action_id === "BOOK_FOLLOWUP" || action.action_id === "CONFIRM_FOLLOWUP") onReschedule(appointment);
                      else if (action.action_id?.startsWith("ORDER_")) onServiceRecommendations(appointment);
                    }}
                    className={`h-9 w-full flex items-center justify-center gap-1.5 text-xs font-bold rounded-xl transition-all duration-200 border ${action.priority === 1
                      ? "bg-[#0067A1] hover:bg-[#004F7C] text-white border-blue-600 shadow-md shadow-blue-100"
                      : "bg-blue-50 hover:bg-blue-100 text-[#004F7C] border-blue-200/60"
                      }`}
                    title={action.description}
                  >
                    {action.action_id === "SUBMIT_OUTCOME" ? <Activity className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            ) : orchestrator.data?.type === "MONITOR" ? (
              <div className="w-full bg-slate-50 border border-slate-200 text-slate-600 rounded-xl py-2 text-center text-[11px] font-semibold tracking-wide">
                Monitoring Status: Awaiting Doctor Action
              </div>
            ) : null}
          </div>
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
