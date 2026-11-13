"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import api from "@/utils/websiteApi";
import {
  Calendar,
  Clock,
  User,
  AlertCircle,
  Video,
  Bell,
  Info,
  Search,
  Phone,
  Droplet,
  Mail,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  CheckCircle,
  XCircle,
  PhoneCall,
  CalendarDays,
  Users,
  CheckSquare,
  BarChart3,
  MessageSquare,
  ExternalLink,
  Stethoscope,
  Copy,
  ShieldCheck,
  X
} from "lucide-react";
import toast from "react-hot-toast";
import ConsultationWorkspace from "@/components/doctor/ConsultationWorkspace";
import WritePrescriptionModal from "@/components/doctor/WritePrescriptionModal";
import SessionAgreementModal from "@/components/doctor/SessionAgreementModal";
import DoctorAnalyticsWidget from "@/components/doctor/DoctorAnalyticsWidget";
import PatientVerificationCard from "@/components/doctor/PatientVerificationCard";
import PrescriptionViewerModal from "@/components/public-site/appointments/PrescriptionViewerModal";

const STATUS_COLORS = {
  booked: "bg-[#0067A1]/10 text-[#0067A1] border-[#0067A1]/20",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-100",
  completed: "bg-blue-50 text-[#004F7C] border-blue-100",
  cancelled: "bg-red-50 text-red-700 border-red-100",
  rejected: "bg-amber-50 text-amber-700 border-amber-100",
  pending: "bg-slate-50 text-slate-700 border-slate-100",
};

const TYPE_COLORS = {
  clinic: "bg-[#0067A1]/10 text-[#0067A1]",
  clinic_visit: "bg-[#0067A1]/10 text-[#0067A1]",
  in_person: "bg-[#0067A1]/10 text-[#0067A1]",
  video: "bg-blue-50 text-[#004F7C]",
  video_call: "bg-blue-50 text-[#004F7C]",
  video_consultation: "bg-blue-50 text-[#004F7C]",
  instant: "bg-blue-50 text-[#004F7C]",
  instant_call: "bg-blue-50 text-[#004F7C]",
  teleconsultation: "bg-blue-50 text-[#004F7C]",
  telemedicine: "bg-blue-50 text-[#004F7C]",
  home: "bg-purple-50 text-purple-700",
  home_visit: "bg-purple-50 text-purple-700",
};

const formatPatientPhone = (phone) => {
  if (!phone) return "";
  if (String(phone).startsWith("ANONYMIZED_")) return "";
  return phone;
};

const formatPatientEmail = (email) => {
  if (!email) return null;
  if (String(email).startsWith("deleted_") || String(email).startsWith("ANONYMIZED_") || String(email).startsWith("anonymized_")) return null;
  return email;
};

const formatAppointmentId = (id) => {
  if (!id) return "";
  const clean = String(id).replace(/[^a-zA-Z0-9]/g, "");
  return `APT-${clean.slice(0, 8).toUpperCase()}`;
};

export default function DoctorAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [dateFilter, setDateFilter] = useState("today");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlDate = params.get("date") || params.get("date_filter");
      const urlStatus = params.get("status") || params.get("status_filter");
      if (urlDate) setDateFilter(urlDate);
      if (urlStatus) setStatusFilter(urlStatus);
    }
  }, []);
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [joinedCallIds, setJoinedCallIds] = useState([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncJoinedCalls = () => {
      try {
        const stored = JSON.parse(localStorage.getItem("mediconnect_joined_calls") || "[]");
        if (Array.isArray(stored)) setJoinedCallIds(stored.map(String));
      } catch {}
    };
    syncJoinedCalls();
    window.addEventListener("storage", syncJoinedCalls);
    window.addEventListener("focus", syncJoinedCalls);
    return () => {
      window.removeEventListener("storage", syncJoinedCalls);
      window.removeEventListener("focus", syncJoinedCalls);
    };
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState("overview");
  const [showFilters, setShowFilters] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const prevAppointmentsRef = useRef([]);
  const initialTargetIdHandledRef = useRef(false);
  const todayStr = useMemo(() => (currentTime ? currentTime.toLocaleDateString("en-CA") : new Date().toLocaleDateString("en-CA")), [currentTime]);

  const [extendingAppointment, setExtendingAppointment] = useState(null);
  const [prescriptionAppointment, setPrescriptionAppointment] = useState(null);
  const [viewingPrescriptionData, setViewingPrescriptionData] = useState(null);
  const [isFetchingPrescription, setIsFetchingPrescription] = useState(false);
  const [extendMode, setExtendMode] = useState("now");
  const [extendMinutes, setExtendMinutes] = useState(15);
  const [isExtending, setIsExtending] = useState(false);

  const handleCloseModal = () => {
    setSelectedAppointment(null);
    setActiveModalTab("overview");
    initialTargetIdHandledRef.current = true;
    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has("id") || url.searchParams.has("appointment_id")) {
          url.searchParams.delete("id");
          url.searchParams.delete("appointment_id");
          window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
        }
      } catch (_) {}
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    // Set initial state
    if (typeof navigator !== 'undefined') {
      setIsOffline(!navigator.onLine);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const nextUpcomingId = useMemo(() => {
    if (!appointments.length) return null;

    const now = new Date();
    let next = null;

    for (const apt of appointments) {
      if (!apt.appointment_date || !apt.appointment_time) continue;
      if (!["booked", "approved"].includes(apt.status)) continue;

      const dateOnly = String(apt.appointment_date).slice(0, 10);
      const timeOnly = String(apt.appointment_time).slice(0, 5);
      const dt = new Date(dateOnly + "T" + timeOnly);
      if (isNaN(dt.getTime()) || dt < now) continue;

      if (!next || dt < next.time) {
        next = { id: apt.id, time: dt };
      }
    }

    return next ? next.id : null;
  }, [appointments]);

  const stats = useMemo(() => {
    const total = appointments.length;
    const upcoming = appointments.filter(
      (a) => a.status === "booked" || a.status === "approved"
    ).length;
    const completed = appointments.filter((a) => a.status === "completed").length;
    const video = appointments.filter((a) => isVideoAppointment(a)).length;
    const clinic = appointments.filter((a) =>
      ["clinic", "clinic_visit", "in_person"].includes(a.appointment_type)
    ).length;

    return { total, upcoming, completed, video, clinic };
  }, [appointments]);

  const loadAppointments = async (pageToLoad = 1, date = dateFilter, isBackground = false) => {
    try {
      if (!isBackground) {
        setIsLoading(true);
        setError("");
      }

      const userId =
        typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      const role =
        typeof window !== "undefined" ? localStorage.getItem("userRole") : null;

      if (!userId || role !== "doctor") {
        if (!isBackground) {
          setError("Please login as a doctor to view appointments.");
          setAppointments([]);
          setPagination(null);
        }
        return;
      }

      const res = await api.post("/appointment/doctor-appointments-detailed", {
        doctor_id: userId,
        date_filter: date,
        page: pageToLoad,
      });

      if (!res.success || !res.data?.appointments) {
        if (!isBackground) {
          setError(res.error || "Unable to load appointments.");
          setAppointments([]);
          setPagination(null);
        }
        return;
      }

      const loaded = res.data.appointments || [];

      // Detect new appointments in real-time background poll safely outside setState
      if (isBackground && prevAppointmentsRef.current.length > 0) {
        const prevIds = new Set(prevAppointmentsRef.current.map((a) => a.id));
        const newApts = loaded.filter((a) => !prevIds.has(a.id));
        if (newApts.length > 0) {
          const patientName = newApts[0].patient?.full_name || "A patient";
          toast.success(`New appointment from ${patientName}!`, {
            icon: "🔔",
            duration: 5000,
            id: `new-apt-${newApts[0].id}`,
          });
        }
      }
      prevAppointmentsRef.current = loaded;
      setAppointments(loaded);

      setPagination(res.data.pagination || null);
      setPage(pageToLoad);

      if (typeof window !== "undefined" && !isBackground && !initialTargetIdHandledRef.current) {
        const params = new URLSearchParams(window.location.search);
        const targetId = params.get("id") || params.get("appointment_id");
        if (targetId) {
          initialTargetIdHandledRef.current = true;
          const matched = loaded.find((a) => a.id === targetId || String(a.id) === String(targetId));
          if (matched) {
            setSelectedAppointment(matched);
          } else {
            api.post("/appointment/doctor-appointments-detailed", {
              doctor_id: userId,
              date_filter: "all",
              page: 1,
            }).then((r) => {
              const found = r?.data?.appointments?.find((a) => a.id === targetId || String(a.id) === String(targetId));
              if (found) setSelectedAppointment(found);
            }).catch(() => {});
          }
        }
      }
    } catch (err) {
      if (!isBackground) {
        console.error("Error loading appointments", err);
        setError("Unable to load appointments. Please try again.");
        setAppointments([]);
        setPagination(null);
      }
    } finally {
      if (!isBackground) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadAppointments(1, dateFilter, false);

    // Real-time polling every 8 seconds so new appointments reflect immediately
    const pollInterval = setInterval(() => {
      loadAppointments(page, dateFilter, true);
    }, 8000);

    return () => clearInterval(pollInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, page]);

  const updateAppointmentStatus = async (appointmentId, newStatus) => {
    try {
      setIsLoading(true);
      setError("");

      const apt = appointments.find((a) => a.id === appointmentId);
      const isExpired = apt && isAppointmentExpired(apt, new Date());
      if (newStatus === "approved" && isExpired) {
        toast.error("This appointment slot has expired and can no longer be approved.");
        // Immediately mark expired locally so UI reflects Expired Slot and hides Approve button
        setAppointments((prev) =>
          prev.map((a) => (a.id === appointmentId ? { ...a, _forceExpired: true } : a))
        );
        setIsLoading(false);
        return;
      }

      const userId =
        typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      const role =
        typeof window !== "undefined" ? localStorage.getItem("userRole") : null;

      if (!userId || role !== "doctor") {
        toast.error("Please login as a doctor to update appointments.");
        setIsLoading(false);
        return;
      }

      const res = await api.post("/appointment/status", {
        appointment_id: appointmentId,
        status: newStatus,
        doctor_id: userId,
      });

      if (!res.success) {
        toast.error(res.error || "Unable to update appointment status.");
        setIsLoading(false);
        return;
      }

      toast.success(`Appointment ${newStatus} successfully!`);
      await loadAppointments(page, dateFilter);
    } catch (err) {
      console.error("Error updating appointment status", err);
      toast.error("Unable to update appointment status.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExtendSlot = async (apt, minutes = 15, mode = "now") => {
    if (!apt) return;
    try {
      setIsExtending(true);
      const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      if (!userId) {
        toast.error("Please login as doctor.");
        return;
      }

      const res = await api.post("/appointment/extend", {
        appointment_id: apt.id,
        doctor_id: userId || apt.doctor_id,
        minutes,
        mode,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to extend appointment slot.");
        return;
      }

      toast.success("Slot extended successfully! Appointment is now active.");
      setExtendingAppointment(null);
      await loadAppointments(page, dateFilter);

      if (selectedAppointment && selectedAppointment.id === apt.id) {
        setSelectedAppointment((prev) => ({
          ...prev,
          appointment_date: res.data?.appointment?.appointment_date || prev.appointment_date,
          appointment_time: res.data?.appointment?.appointment_time || prev.appointment_time,
          extended_until: res.data?.appointment?.extended_until || prev.extended_until,
          status: res.data?.appointment?.status || "approved",
          _forceExpired: false,
        }));
      }
    } catch (err) {
      console.error("Error extending slot", err);
      toast.error("Failed to extend appointment slot.");
    } finally {
      setIsExtending(false);
    }
  };

  const filteredAppointments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = appointments
      .filter((apt) =>
        statusFilter === "all" ? true : apt.status === statusFilter
      )
      .filter((apt) => {
        if (typeFilter === "all") return true;
        if (typeFilter === "video") return isVideoAppointment(apt);
        if (typeFilter === "clinic")
          return ["clinic", "clinic_visit", "in_person"].includes(
            apt.appointment_type
          );
        if (typeFilter === "home")
          return ["home", "home_visit"].includes(apt.appointment_type);
        return true;
      })
      .filter((apt) => {
        if (!query) return true;

        const name = apt.patient?.full_name || "";
        const email = apt.patient?.email || "";
        const phone = apt.patient?.phone || "";
        const reason = apt.reason || "";
        const id = apt.id ? String(apt.id) : "";

        const haystack = `${name} ${email} ${phone} ${reason} ${id}`.toLowerCase();
        return haystack.includes(query);
      });

    // Normalize date value to YYYY-MM-DD regardless of whether DB returns
    // a plain date string or an ISO timestamp (e.g. 2026-10-13T00:00:00.000Z)
    const normDate = (d) => (d ? String(d).slice(0, 10) : "");

    // Prioritize Today & Upcoming first, then Past (most recent past first)
    return filtered.sort((a, b) => {
      const dateA = normDate(a.appointment_date);
      const dateB = normDate(b.appointment_date);
      const timeA = a.appointment_time || "";
      const timeB = b.appointment_time || "";

      // Group priority:
      // 0: Today
      // 1: Upcoming / Future
      // 2: Past
      const getPriority = (d) => {
        if (!d) return 3;
        if (d === todayStr) return 0;
        if (d > todayStr) return 1;
        return 2;
      };

      const prioA = getPriority(dateA);
      const prioB = getPriority(dateB);

      if (prioA !== prioB) {
        return prioA - prioB;
      }

      // If Today or Upcoming (priority 0 or 1), order chronologically (earliest first)
      if (prioA === 0 || prioA === 1) {
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return timeA.localeCompare(timeB);
      }

      // If Past, order reverse chronologically (most recent past first)
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return timeB.localeCompare(timeA);
    });
  }, [appointments, statusFilter, typeFilter, searchQuery, dateFilter, todayStr]);

  function isVideoAppointment(apt) {
    const t = String(apt?.appointment_type || apt?.type || "").toLowerCase();
    return ["video", "video_consultation", "video_call", "teleconsultation", "instant_call", "telemedicine", "instant"].includes(t);
  }

  function formatAppointmentTypeLabel(aptOrType) {
    const val = typeof aptOrType === "object" && aptOrType !== null
      ? aptOrType.appointment_type || aptOrType.type
      : aptOrType;
    const t = String(val || "").toLowerCase().trim();
    if (["clinic", "clinic_visit", "in_person"].includes(t)) return "Clinic";
    if (["video", "video_consultation", "video_call", "teleconsultation", "instant_call", "telemedicine", "instant"].includes(t)) return "Video";
    if (t === "video_follow_up") return "Video Follow-up";
    if (["home", "home_visit"].includes(t)) return "Home";
    if (t === "home_follow_up") return "Home Follow-up";
    return t ? t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Clinic";
  }

  function getVideoCallTiming(apt, now = currentTime) {
    if (!apt?.appointment_date || !apt?.appointment_time) {
      return { isAvailable: false, label: "Start Call", status: "unavailable" };
    }

    try {
      const timePart = apt.appointment_time ? String(apt.appointment_time).slice(0, 5) : "00:00";
      const dateStr = typeof apt.appointment_date === "string" 
        ? apt.appointment_date 
        : apt.appointment_date instanceof Date 
        ? apt.appointment_date.toISOString().split("T")[0]
        : String(apt.appointment_date || "");
      const dateOnly = dateStr.split("T")[0];
      const [year, month, day] = dateOnly.split("-").map(Number);
      const [hours, minutes] = timePart.split(":").map(Number);
      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        return { isAvailable: false, label: "Start Call", status: "unavailable" };
      }
      const start = new Date(year, month - 1, day, hours || 0, minutes || 0, 0);

      // Call is available from 5 minutes before up to 30 minutes after start (or extended_until)
      const earlyStart = new Date(start.getTime() - 5 * 60 * 1000);
      let end = new Date(start.getTime() + 30 * 60 * 1000);
      if (apt.extended_until) {
        const ext = new Date(apt.extended_until);
        if (!isNaN(ext.getTime()) && ext.getTime() > end.getTime()) {
          end = ext;
        }
      }

      if (now < earlyStart) {
        return { isAvailable: false, label: "Opens 5m before", status: "early", earlyStart };
      } else if (now > end) {
        return { isAvailable: false, label: "Call Ended", status: "expired" };
      } else {
        return { isAvailable: true, label: "Start Call", status: "active" };
      }
    } catch {
      return { isAvailable: false, label: "Start Call", status: "unavailable" };
    }
  }

  function isWithinSlot(apt, now = currentTime) {
    return getVideoCallTiming(apt, now).isAvailable;
  }

  function isAppointmentExpired(apt, now = currentTime) {
    if (!apt?.appointment_date) return false;
    if (["completed", "cancelled", "rejected"].includes(String(apt.status).toLowerCase())) return false;
    if (apt.has_prescription || apt.prescription_id) return false;
    if (apt._forceExpired) return true;

    const checkNow = now instanceof Date ? now : new Date();

    // If appointment slot has an active extension window, it is not expired
    if (apt.extended_until) {
      const ext = new Date(apt.extended_until);
      if (!isNaN(ext.getTime()) && checkNow.getTime() <= ext.getTime()) {
        return false;
      }
    }

    try {
      const isClinic = ["clinic", "clinic_visit", "in_person", "home", "home_visit"].includes(String(apt.appointment_type || apt.type || "").toLowerCase());
      const timePart = apt.appointment_time ? String(apt.appointment_time).slice(0, 5) : "23:59";
      const dateStr = typeof apt.appointment_date === "string" 
        ? apt.appointment_date 
        : apt.appointment_date instanceof Date 
        ? apt.appointment_date.toISOString().split("T")[0]
        : String(apt.appointment_date || "");
      const dateOnly = dateStr.split("T")[0];
      const [year, month, day] = dateOnly.split("-").map(Number);
      const [hours, minutes] = timePart.split(":").map(Number);
      if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
      const aptDateTime = new Date(year, month - 1, day, hours || 0, minutes || 0, 0);

      if (isClinic) {
        // Clinic visits stay active through the end of the scheduled appointment day
        const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
        return checkNow.getTime() > endOfDay.getTime();
      }

      // If video appointment slot start was more than 30 mins ago, it's expired
      return checkNow.getTime() > aptDateTime.getTime() + 30 * 60 * 1000;
    } catch {
      return false;
    }
  }

  function canExtendAppointmentSlot(apt, now = currentTime) {
    if (!apt || !apt.appointment_date) return false;
    if (["completed", "cancelled", "rejected"].includes(String(apt.status).toLowerCase())) return false;
    if (apt.has_prescription || apt.prescription_id) return false;
    if (!isAppointmentExpired(apt, now)) return false;

    const checkNow = now instanceof Date ? now : new Date();

    try {
      const timePart = apt.appointment_time ? String(apt.appointment_time).slice(0, 5) : "23:59";
      const dateStr = typeof apt.appointment_date === "string" 
        ? apt.appointment_date 
        : apt.appointment_date instanceof Date 
        ? apt.appointment_date.toISOString().split("T")[0]
        : String(apt.appointment_date || "");
      const dateOnly = dateStr.split("T")[0];
      const [year, month, day] = dateOnly.split("-").map(Number);
      const [hours, minutes] = timePart.split(":").map(Number);
      if (isNaN(year) || isNaN(month) || isNaN(day)) return false;

      const aptDateTime = new Date(year, month - 1, day, hours || 0, minutes || 0, 0);

      // If appointment was on a past day, do not show Add Time
      const todayDateOnly = new Date(checkNow.getFullYear(), checkNow.getMonth(), checkNow.getDate()).getTime();
      const aptDateOnly = new Date(year, month - 1, day).getTime();
      if (aptDateOnly < todayDateOnly) {
        return false;
      }

      // If more than 1 hour (60 minutes) has passed since appointment slot, do not show Add Time
      const diffMs = checkNow.getTime() - aptDateTime.getTime();
      if (diffMs > 60 * 60 * 1000) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  function isExpiredOneDayBefore(dateVal) {
    if (!dateVal) return false;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dateStr = typeof dateVal === "string" 
        ? dateVal 
        : dateVal instanceof Date 
        ? dateVal.toISOString().split("T")[0]
        : String(dateVal || "");
      const dateOnly = dateStr.split("T")[0];
      const [year, month, day] = dateOnly.split("-").map(Number);
      if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
      const aptDate = new Date(year, month - 1, day);
      aptDate.setHours(0, 0, 0, 0);
      return aptDate < today;
    } catch {
      return false;
    }
  }

  const hasDoctorJoinedVideoCall = (apt) => {
    if (!apt) return false;
    if (!isVideoAppointment(apt)) return true;
    const st = String(apt.status || "").toLowerCase();
    if (st === "completed") return true;
    if (apt.call_started || apt.video_call_started) return true;
    if (joinedCallIds.includes(String(apt.id))) return true;
    if (typeof window !== "undefined") {
      try {
        const stored = JSON.parse(localStorage.getItem("mediconnect_joined_calls") || "[]");
        if (Array.isArray(stored) && stored.map(String).includes(String(apt.id))) return true;
      } catch {}
    }
    return false;
  };

  const handleOpenPrescription = async (apt, forceWrite = false) => {
    if (!apt) return;

    const hasRx = Boolean(apt.has_prescription || apt.prescription_id);

    // If prescription exists and doctor didn't explicitly request to write, open official A4 letterhead viewer
    if (hasRx && !forceWrite) {
      try {
        setIsFetchingPrescription(true);
        const doctorId = typeof window !== "undefined" ? (localStorage.getItem("userId") || localStorage.getItem("user_id")) : null;
        const res = await fetch("/api/prescriptions/by-appointment-doctor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appointment_id: apt.id, doctor_id: doctorId || apt.doctor_id }),
        });
        const json = await res.json().catch(() => null);
        if (json?.success && json?.data?.prescription) {
          setViewingPrescriptionData(json.data.prescription);
          return;
        }
      } catch (err) {
        console.warn("Could not fetch prescription by appointment:", err);
      } finally {
        setIsFetchingPrescription(false);
      }
    }

    // Otherwise, open consultation workspace to write and sign prescription
    if (isVideoAppointment(apt) && apt.status !== "completed" && !hasDoctorJoinedVideoCall(apt)) {
      toast.error("Please join the video consultation call first before writing a prescription.");
      return;
    }
    setPrescriptionAppointment(apt);
  };

  const handleStartCall = async (apt) => {
    // No blocking – doctor can always start a call
    const doctorId =
      typeof window !== "undefined" ? localStorage.getItem("userId") : null;

    if (!doctorId) {
      toast.error("Please login as a doctor to start call.");
      return;
    }

    if (typeof window !== "undefined" && apt?.id) {
      try {
        const existing = JSON.parse(localStorage.getItem("mediconnect_joined_calls") || "[]");
        const next = Array.from(new Set([...(Array.isArray(existing) ? existing : []), String(apt.id)]));
        localStorage.setItem("mediconnect_joined_calls", JSON.stringify(next));
        setJoinedCallIds(next);
      } catch {}
    }

    // Open call screen IMMEDIATELY (synchronous with click) so popup blocker won't block it
    const url = `/appointments/${apt.id}/video?userId=${doctorId}&role=doctor`;
    window.open(url, "_blank");

    // Then notify patient in background (DB + FCM)
    try {
      setIsLoading(true);
      const res = await api.post("/appointment/video-call/start", {
        appointment_id: apt.id,
        doctor_id: doctorId,
      });

      if (!res?.success) {
        toast.error(res?.message || "Failed to notify patient.");
      } else {
        toast.success("Patient notified successfully.");
      }
    } catch (err) {
      console.error("Start call error", err);
      toast.error("Failed to notify patient.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotifyPatient = async (apt) => {
    try {
      setIsLoading(true);
      const res = await api.post("/notifications/send", {
        user_id: apt.patient_user_id || apt.patient_id,
        title: "Appointment Reminder",
        message: `Your doctor is ready for the consultation. Please join now.`,
        type: "appointment_reminder",
        metadata: {
          appointment_id: apt.id,
          doctor_id:
            typeof window !== "undefined"
              ? localStorage.getItem("userId")
              : null,
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

  const handlePageChange = (nextPage) => {
    if (!pagination) return;
    if (nextPage < 1 || nextPage > pagination.totalPages) return;
    loadAppointments(nextPage, dateFilter);
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-3.5 h-3.5" />;
      case 'approved': return <CheckSquare className="w-3.5 h-3.5" />;
      case 'cancelled': return <XCircle className="w-3.5 h-3.5" />;
      case 'rejected': return <XCircle className="w-3.5 h-3.5" />;
      default: return <Clock className="w-3.5 h-3.5" />;
    }
  };

  return (
    <>
      <SessionAgreementModal />
      
      {/* Offline Mode Banner */}
      {isOffline && (
        <div className="bg-red-500 text-white px-4 py-2.5 text-center text-sm font-medium flex items-center justify-center gap-2 sticky top-0 z-50">
          <AlertCircle className="w-4 h-4" />
          ⚠️ Offline Mode — Data will sync later. Please ensure your connection is restored before completing consultations.
        </div>
      )}

      <div className="min-h-screen bg-[#F8FAFC]">
      <div className="w-full mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[#0067A1]">
                <CalendarDays className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Appointments</h1>
                <p className="text-sm text-slate-600">Manage and track all your consultations in one place</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative flex-1 lg:flex-none lg:w-80">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patients, reasons, phone..."
                className="w-full pl-10 pr-4 py-2.5 rounded-md border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] transition-all text-sm"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 rounded-md border transition-all ${
                showFilters 
                  ? "bg-[#0067A1] text-white border-[#0067A1]" 
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Cards Dashboard Widget */}
        <DoctorAnalyticsWidget />

        {/* Filters Section */}
        <div className={`bg-white rounded-lg border border-slate-200 p-4 sm:p-5 transition-all duration-300 ${
          showFilters ? 'block' : 'hidden lg:block'
        }`}>
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-[#0067A1]" />
            <h3 className="text-sm font-semibold text-slate-800">Filters</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                Date Range
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full p-2.5 rounded-md border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] transition-all text-sm"
              >
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="this_week">This Week</option>
                <option value="next_week">Next Week</option>
                <option value="all">All Dates</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600 flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5" />
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2.5 rounded-md border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] transition-all text-sm"
              >
                <option value="all">All Status</option>
                <option value="booked">Booked</option>
                <option value="approved">Approved</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="rejected">Rejected</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600 flex items-center gap-2">
                <Video className="w-3.5 h-3.5" />
                Appointment Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full p-2.5 rounded-md border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] transition-all text-sm"
              >
                <option value="all">All Types</option>
                <option value="clinic">Clinic Visit</option>
                <option value="video">Video Consultation</option>
                <option value="home">Home Visit</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-3 rounded-md bg-red-50 border border-red-100 px-4 py-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError("")}
              className="text-red-500 hover:text-red-700"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Appointments Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white px-5 py-3.5 rounded-xl border border-slate-200">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800">Appointments</h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Showing {filteredAppointments.length} of {pagination?.totalItems ?? pagination?.total ?? appointments.length} appointments • Prioritizing Today & Upcoming
              </p>
            </div>
            {isLoading && (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-[#0067A1]" />
                Refreshing...
              </div>
            )}
          </div>

          {isLoading && appointments.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#0067A1]/10 mb-4">
                <Loader2 className="w-8 h-8 text-[#0067A1] animate-spin" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">Loading Appointments</h3>
              <p className="text-sm text-slate-500">Fetching your consultation details...</p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                <Calendar className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No Appointments Found</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                {searchQuery || statusFilter !== "all" || typeFilter !== "all" 
                  ? "Try changing your search or filter criteria" 
                  : "You don't have any appointments scheduled yet"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
              {filteredAppointments.map((apt) => {
                const isNext = nextUpcomingId && apt.id === nextUpcomingId;
                const isToday = apt.appointment_date && String(apt.appointment_date).slice(0, 10) === todayStr;
                const isExpired = isAppointmentExpired(apt, currentTime);
                const withinSlot = isWithinSlot(apt, currentTime) && !isExpired;

                return (
                  <div
                    key={apt.id}
                    className={`bg-white rounded-xl border transition-all duration-200 hover:shadow-md flex flex-col justify-between p-3.5 sm:p-4 ${
                      isNext
                        ? "border-emerald-400 shadow-sm shadow-emerald-50 ring-1 ring-emerald-300"
                        : isToday
                        ? "border-sky-300/80 shadow-xs hover:border-[#0067A1]"
                        : "border-slate-200/90 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      {/* Top Badges & Actions */}
                      <div className="flex items-center justify-between gap-1.5 mb-2.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold ${
                            TYPE_COLORS[apt.appointment_type] || "bg-slate-100 text-slate-700"
                          }`}>
                            {isVideoAppointment(apt) && <Video className="w-2.5 h-2.5" />}
                            {formatAppointmentTypeLabel(apt)}
                          </span>

                          {isNext && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                              <Clock className="w-2.5 h-2.5" />
                              Next
                            </span>
                          )}

                          {isToday && !isNext && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-100/70 text-[#0067A1] text-[10px] font-bold uppercase tracking-wider">
                              Today
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isExpired && apt.status === "booked" && !apt.has_prescription ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-amber-200 bg-amber-50 text-amber-700 text-[10.5px] font-semibold">
                              <Clock className="w-2.5 h-2.5" />
                              Expired
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10.5px] font-semibold ${
                              apt.has_prescription || apt.status === "completed"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : (STATUS_COLORS[apt.status] || "bg-slate-100 text-slate-700 border-slate-200")
                            }`}>
                              {getStatusIcon(apt.has_prescription ? "completed" : apt.status)}
                              <span className="capitalize">{apt.has_prescription ? "completed" : (apt.status || "unknown")}</span>
                            </span>
                          )}

                          <button
                            onClick={() => {
                              setSelectedAppointment(apt);
                              setActiveModalTab("overview");
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-[#0067A1] hover:bg-[#0067A1]/10 transition-colors cursor-pointer"
                            title="View Details"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Patient Row */}
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <div className="relative shrink-0">
                          <div className="w-9 h-9 rounded-full bg-[#0067A1]/10 flex items-center justify-center border border-[#0067A1]/20">
                            <User className="w-4 h-4 text-[#0067A1]" />
                          </div>
                          {withinSlot && (
                            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white animate-ping" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <h4 className="text-xs sm:text-[13px] font-bold text-slate-800 truncate leading-snug">
                              {apt.patient?.full_name && !apt.patient.full_name.includes("DE-IDENTIFIED")
                                ? apt.patient.full_name
                                : `Patient #${apt.patient?.un_id || "Verified"}`}
                            </h4>
                            {apt.patient?.is_identity_verified && (
                              <span 
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0"
                                title={apt.patient?.identity_verified_at ? `Identity Verified on ${new Date(apt.patient.identity_verified_at).toLocaleDateString()}` : "Identity Verified"}
                              >
                                <CheckCircle className="w-2.5 h-2.5 text-emerald-600" />
                                Verified
                              </span>
                            )}
                            {apt.patient?.blood_group && (
                              <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9.5px] font-semibold bg-rose-50 text-rose-600 border border-rose-100 shrink-0">
                                <Droplet className="w-2.5 h-2.5 text-rose-500" />
                                {apt.patient.blood_group}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10.5px] text-slate-500 truncate mt-0.5">
                            {apt.patient?.phone && !String(apt.patient.phone).startsWith("ANONYMIZED_") ? (
                              <a
                                href={`tel:${apt.patient.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="truncate hover:text-[#0067A1] hover:underline transition-colors"
                                title="Click to call"
                              >
                                {formatPatientPhone(apt.patient.phone)}
                              </a>
                            ) : (
                              <span className="truncate">{formatPatientPhone(apt.patient?.phone)}</span>
                            )}
                            {formatPatientEmail(apt.patient?.email) && (
                              <>
                                <span>•</span>
                                {!String(apt.patient.email).startsWith("deleted_") && !String(apt.patient.email).startsWith("ANONYMIZED_") ? (
                                  <a
                                    href={`mailto:${apt.patient.email}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="truncate hover:text-[#0067A1] hover:underline transition-colors"
                                    title="Click to email"
                                  >
                                    {formatPatientEmail(apt.patient.email)}
                                  </a>
                                ) : (
                                  <span className="truncate">{formatPatientEmail(apt.patient.email)}</span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Schedule & Notes Strip */}
                      <div className="bg-slate-50/80 border border-slate-100/90 rounded-lg p-2 space-y-1 my-2">
                        <div className="flex items-center gap-3 text-[11px] text-slate-700 font-medium flex-wrap">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Calendar className="w-3 h-3 text-[#0067A1] shrink-0" />
                            <span className="truncate">{apt.appointment_date}</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-600 font-semibold text-[10.5px] bg-white/90 px-1.5 py-0.5 rounded border border-slate-200/60">
                            <Clock className="w-2.5 h-2.5 text-[#0067A1] shrink-0" />
                            <span>{formatTime(apt.appointment_time)}</span>
                          </div>
                        </div>

                        {apt.reason && (
                          <div className="flex items-start gap-1 text-[10.5px] text-slate-600 pt-0.5 border-t border-slate-100/80">
                            <MessageSquare className="w-2.5 h-2.5 mt-0.5 text-slate-400 shrink-0" />
                            <span className="line-clamp-1">{apt.reason}</span>
                          </div>
                        )}

                        {apt.screening?.analysis?.summary && (
                          <div className="flex items-start gap-1 text-[10.5px] text-[#0067A1] pt-0.5">
                            <BarChart3 className="w-2.5 h-2.5 mt-0.5 shrink-0" />
                            <span className="line-clamp-1">{apt.screening.analysis.summary}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Action Buttons (Concise per AGENTS.md & Responsive) */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5 mt-1">
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        {["rejected", "cancelled"].includes(apt.status) ? (
                          <span className="text-[10.5px] font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-200/50 inline-flex items-center gap-1">
                            <Info className="w-3 h-3 text-slate-400" />
                            {apt.status === "rejected" ? "Rejected" : "Cancelled"}
                          </span>
                        ) : isExpired && !apt.has_prescription && apt.status !== "completed" ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10.5px] font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200/60">
                              Expired
                            </span>
                            {canExtendAppointmentSlot(apt, currentTime) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setExtendingAppointment(apt);
                                  setExtendMode("now");
                                  setExtendMinutes(15);
                                }}
                                className="h-7 px-2 rounded-md bg-blue-50 text-[#0067A1] hover:bg-blue-100 border border-blue-200/80 text-[10.5px] font-semibold transition-all cursor-pointer flex items-center gap-1"
                                title="Add minutes to expired slot"
                              >
                                <Clock className="w-3 h-3 text-[#0067A1]" />
                                <span>+ Add Time</span>
                              </button>
                            )}
                            {apt.status === "booked" && (
                              <button
                                onClick={() => updateAppointmentStatus(apt.id, "rejected")}
                                disabled={isLoading}
                                className="h-7 px-2 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60 text-[10.5px] font-semibold transition-all cursor-pointer"
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        ) : (
                          <>
                            {isVideoAppointment(apt) && ["approved", "booked"].includes(apt.status) && (() => {
                              const timing = getVideoCallTiming(apt, currentTime);

                              if (timing.status === "early") {
                                return (
                                  <button
                                    type="button"
                                    disabled={true}
                                    className="h-7.5 px-2 rounded-md bg-slate-100 text-slate-400 border border-slate-200 text-[10.5px] font-medium cursor-not-allowed"
                                  >
                                    Opens in 5m
                                  </button>
                                );
                              }

                              return (
                                <button
                                  type="button"
                                  onClick={() => handleStartCall(apt)}
                                  disabled={isLoading || !timing.isAvailable}
                                  className={`h-7.5 px-2.5 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 shrink-0 ${
                                    timing.isAvailable
                                      ? "bg-[#0067A1] text-white hover:bg-[#004F7C] shadow-xs cursor-pointer active:scale-95"
                                      : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                                  }`}
                                >
                                  <PhoneCall className="w-3 h-3" />
                                  Start Call
                                </button>
                              );
                            })()}

                            {(!["rejected", "cancelled"].includes(apt.status)) && (() => {
                              const hasRx = Boolean(apt.has_prescription || apt.prescription_id);
                              const isVideo = isVideoAppointment(apt);
                              const canWriteRx = hasRx || apt.status === "completed" || !isVideo || hasDoctorJoinedVideoCall(apt);

                              // Only show write prescription if approved or already has rx
                              if (!hasRx && apt.status === "booked") return null;

                              return (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPrescription(apt)}
                                  disabled={isFetchingPrescription}
                                  className={`h-7.5 px-2.5 rounded-md text-[11px] font-semibold transition-all shadow-xs flex items-center gap-1 shrink-0 ${
                                    hasRx
                                      ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95"
                                      : canWriteRx
                                      ? "bg-[#0067A1] hover:bg-[#004F7C] text-white cursor-pointer active:scale-95"
                                      : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                                  }`}
                                  title={
                                    hasRx
                                      ? "View official A4 prescription letterhead"
                                      : canWriteRx
                                      ? "Write & sign consultation prescription"
                                      : "Join the video call first before writing a prescription"
                                  }
                                >
                                  <Stethoscope className="w-3 h-3" />
                                  <span>{hasRx ? "Prescription" : "+ Prescription"}</span>
                                </button>
                              );
                            })()}

                            {apt.status === "booked" && !isExpired && (
                              <>
                                <button
                                  onClick={() => updateAppointmentStatus(apt.id, "approved")}
                                  disabled={isLoading || isExpired}
                                  className="h-7.5 px-2.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/70 text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                                >
                                  <CheckSquare className="w-3 h-3" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => updateAppointmentStatus(apt.id, "rejected")}
                                  disabled={isLoading}
                                  className="h-7.5 px-2 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/70 text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                                >
                                  <XCircle className="w-3 h-3" />
                                  Reject
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                        {!["rejected", "cancelled"].includes(apt.status) && (
                          <button
                            type="button"
                            onClick={() => handleNotifyPatient(apt)}
                            disabled={isLoading}
                            className="h-7.5 w-7.5 flex items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#0067A1] transition-all cursor-pointer shrink-0"
                            title="Notify Patient"
                          >
                            <Bell className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAppointment(apt);
                            setActiveModalTab("overview");
                          }}
                          className="h-7.5 px-2.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10.5px] font-semibold border border-slate-200/80 transition-all cursor-pointer shrink-0"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-sm text-slate-600">
              Showing page {pagination.currentPage} of {pagination.totalPages} •{" "}
              {(pagination.totalItems ?? pagination.total ?? 0)} total appointments
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1 || isLoading}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      disabled={isLoading}
                      className={`w-9 h-9 rounded-md text-sm font-medium transition-all ${
                        page === pageNum
                          ? "bg-[#0067A1] text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= pagination.totalPages || isLoading}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-all"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex sm:items-center sm:justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-hidden">
          <div className="w-full h-full sm:h-auto sm:max-w-xl rounded-none sm:rounded-xl bg-white border-0 sm:border border-slate-200 sm:max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 z-10 shrink-0">
              <div className="px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      Appointment Details
                    </h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${STATUS_COLORS[selectedAppointment.status] || "bg-slate-100 text-slate-700"}`}>
                      {getStatusIcon(selectedAppointment.status)}
                      <span className="capitalize">{selectedAppointment.status}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-slate-500">Booking ID:</span>
                    <span className="font-mono text-xs font-bold text-[#0067A1] bg-[#0067A1]/10 px-1.5 py-0.5 rounded border border-[#0067A1]/20">
                      #{formatAppointmentId(selectedAppointment.id)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedAppointment.id);
                        toast.success("Appointment ID copied");
                      }}
                      title={`Full ID: ${selectedAppointment.id}\nClick to copy`}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-[#0067A1] bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded border border-slate-200 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Modal Body - Sleek, Compact, Non-Bulky Clinical Layout */}
            <div className="overflow-y-auto px-4 py-3.5 sm:px-5 sm:py-4 flex-1 min-h-0 space-y-3">
              {/* Unified Patient Profile Card with Verified Highlight */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 sm:p-3.5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0067A1]/10 border border-[#0067A1]/20 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-[#0067A1]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                        {selectedAppointment.patient?.full_name && !selectedAppointment.patient.full_name.includes("DE-IDENTIFIED")
                          ? selectedAppointment.patient.full_name
                          : `Patient #${selectedAppointment.patient?.un_id || "Verified"}`}
                      </h4>
                      {/* Identity Verification Highlight */}
                      {selectedAppointment.patient?.is_identity_verified ? (
                        <span 
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs"
                          title={selectedAppointment.patient?.identity_verified_at ? `Verified on ${new Date(selectedAppointment.patient.identity_verified_at).toLocaleDateString()}` : "Patient identity confirmed"}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Identity Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          Verification Pending
                        </span>
                      )}
                    </div>

                    {/* Patient Attributes Strip */}
                    <div className="flex flex-wrap items-center gap-2.5 mt-1 text-xs text-slate-600">
                      {selectedAppointment.patient?.gender && (
                        <span className="capitalize">{selectedAppointment.patient.gender}</span>
                      )}
                      {(() => {
                        let displayAge = selectedAppointment.patient?.age;
                        if (!displayAge && selectedAppointment.patient?.date_of_birth) {
                          const dob = new Date(selectedAppointment.patient.date_of_birth);
                          if (!isNaN(dob.getTime())) {
                            const today = new Date();
                            let a = today.getFullYear() - dob.getFullYear();
                            const m = today.getMonth() - dob.getMonth();
                            if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) a--;
                            if (a >= 0) displayAge = `${a} years`;
                          }
                        }
                        if (!displayAge) return null;
                        const str = String(displayAge);
                        return <span>• {str.includes("year") ? str : `${str} years`}</span>;
                      })()}
                      {selectedAppointment.patient?.blood_group && (
                        <span className="inline-flex items-center gap-1 font-semibold text-rose-600">
                          <Droplet className="w-3.5 h-3.5" />
                          {selectedAppointment.patient.blood_group}
                        </span>
                      )}
                    </div>

                    {/* Inline Contact & Address Strip */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 pt-2 border-t border-slate-200/70 text-xs text-slate-600">
                      {selectedAppointment.patient?.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#0067A1]" />
                          <a
                            href={`tel:${selectedAppointment.patient.phone}`}
                            className="font-medium text-slate-800 hover:text-[#0067A1] hover:underline"
                          >
                            {formatPatientPhone(selectedAppointment.patient.phone)}
                          </a>
                        </div>
                      )}
                      {formatPatientEmail(selectedAppointment.patient?.email) && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-[#0067A1]" />
                          <a
                            href={`mailto:${selectedAppointment.patient.email}`}
                            className="text-slate-700 hover:text-[#0067A1] hover:underline truncate max-w-[220px]"
                          >
                            {formatPatientEmail(selectedAppointment.patient.email)}
                          </a>
                        </div>
                      )}
                      {selectedAppointment.patient?.address && (
                        <div className="flex items-center gap-1 w-full text-[11px] text-slate-500 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{selectedAppointment.patient.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Compact Appointment Info Strip */}
              <div className="bg-white border border-slate-200 rounded-lg p-2.5 sm:p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Date</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedAppointment.appointment_date}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Time</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{formatTime(selectedAppointment.appointment_time)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Type</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {formatAppointmentTypeLabel(selectedAppointment)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Care Episode</p>
                  <p className="font-mono font-semibold text-[#0067A1] mt-0.5 truncate">
                    {selectedAppointment.care_episode_id 
                      ? `EP-${String(selectedAppointment.care_episode_id).slice(0, 8).toUpperCase()}` 
                      : (selectedAppointment.care_episode?.episode_code || 'EP-ACTIVE')}
                  </p>
                </div>
              </div>

              {/* Patient Identity & Consent Verification */}
              {selectedAppointment && !["cancelled", "rejected"].includes(String(selectedAppointment.status).toLowerCase()) && (
                <PatientVerificationCard
                  appointment={selectedAppointment}
                  doctorUserId={typeof window !== "undefined" ? localStorage.getItem("userId") : null}
                  onVerificationComplete={(newVerification) => {
                    const isVerified = newVerification?.status === "verified";
                    setSelectedAppointment((prev) =>
                      prev
                        ? {
                            ...prev,
                            patient: {
                              ...prev.patient,
                              is_identity_verified: isVerified,
                              identity_verified_at: newVerification?.verified_at || new Date().toISOString(),
                            },
                          }
                        : null
                    );
                    setAppointments((prevList) =>
                      prevList.map((item) => {
                        const pId = item.patient_id || item.patient?.id;
                        const targetId = selectedAppointment.patient_id || selectedAppointment.patient?.id;
                        if (pId && targetId && pId === targetId) {
                          return {
                            ...item,
                            patient: {
                              ...item.patient,
                              is_identity_verified: isVerified,
                              identity_verified_at: newVerification?.verified_at || new Date().toISOString(),
                            },
                          };
                        }
                        return item;
                      })
                    );
                  }}
                />
              )}

              {/* Reason & Screening Summary (Compact) */}
              {(selectedAppointment.reason || selectedAppointment.screening) && (
                <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 sm:p-3 space-y-2 text-xs">
                  {selectedAppointment.reason && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Consultation Reason</p>
                      <p className="text-slate-800 whitespace-pre-line leading-relaxed">{selectedAppointment.reason}</p>
                    </div>
                  )}
                  {selectedAppointment.screening?.initial_symptoms && (
                    <div className="pt-1.5 border-t border-slate-200/60">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Reported Symptoms</p>
                      <p className="text-slate-800">{selectedAppointment.screening.initial_symptoms}</p>
                    </div>
                  )}
                  {selectedAppointment.screening?.analysis?.summary && (
                    <div className="pt-1.5 border-t border-slate-200/60">
                      <p className="text-[10px] font-bold text-[#0067A1] uppercase tracking-wider mb-0.5">Clinical Note / Screening</p>
                      <p className="text-slate-700">{selectedAppointment.screening.analysis.summary}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Clinic Address if clinic visit */}
              {['clinic', 'clinic_visit', 'in_person'].includes(String(selectedAppointment.appointment_type || selectedAppointment.type || "").toLowerCase()) && selectedAppointment.doctor?.clinic_address && (
                <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 text-xs">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Clinic Location</p>
                  <p className="font-semibold text-slate-800">{selectedAppointment.doctor.clinic_name}</p>
                  <p className="text-slate-600 mt-0.5">{selectedAppointment.doctor.clinic_address}</p>
                </div>
              )}
            </div>
            
            <div className="sticky bottom-0 bg-white border-t border-slate-100 px-4 py-3 sm:px-6 sm:py-4 flex flex-wrap justify-end gap-2 sm:gap-3 z-10 shrink-0 pb-safe">
              <button
                onClick={handleCloseModal}
                className="px-3.5 py-2 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              {canExtendAppointmentSlot(selectedAppointment, currentTime) && (
                <button
                  type="button"
                  onClick={() => {
                    setExtendingAppointment(selectedAppointment);
                    setExtendMode("now");
                    setExtendMinutes(15);
                  }}
                  className="px-3 py-2 rounded-md bg-blue-50 text-[#0067A1] hover:bg-blue-100 border border-blue-200 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-[#0067A1]" />
                  + Add Time
                </button>
              )}
              {selectedAppointment.screening?.id && (
                <button
                  onClick={() => {
                    window.open(`/api/screening/${selectedAppointment.screening.id}/doctors`, "_blank");
                  }}
                  className="px-3 py-2 rounded-md border border-[#0067A1]/20 text-[#0067A1] bg-white hover:bg-[#0067A1]/5 transition-colors text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Screening
                </button>
              )}
              {(!["rejected", "cancelled"].includes(String(selectedAppointment.status).toLowerCase())) && (() => {
                const hasRx = Boolean(selectedAppointment.has_prescription || selectedAppointment.prescription_id);
                const isVideo = isVideoAppointment(selectedAppointment);
                const canWriteRx = hasRx || selectedAppointment.status === "completed" || !isVideo || hasDoctorJoinedVideoCall(selectedAppointment);

                return (
                  <button
                    type="button"
                    onClick={() => {
                      const apt = selectedAppointment;
                      handleCloseModal();
                      handleOpenPrescription(apt);
                    }}
                    disabled={isFetchingPrescription}
                    className={`px-3.5 py-2 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs ${
                      hasRx
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95"
                        : canWriteRx
                        ? "bg-[#0067A1] hover:bg-[#004F7C] text-white cursor-pointer active:scale-95"
                        : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                    }`}
                    title={
                      hasRx
                        ? "View official A4 prescription letterhead"
                        : canWriteRx
                        ? "Write and digitally sign prescription"
                        : "Join the video call first before writing a prescription"
                    }
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>{hasRx ? "Prescription" : "+ Prescription"}</span>
                  </button>
                );
              })()}
              {isVideoAppointment(selectedAppointment) && !["rejected", "cancelled", "completed"].includes(String(selectedAppointment.status).toLowerCase()) && !isAppointmentExpired(selectedAppointment, currentTime) && (() => {
                const timing = getVideoCallTiming(selectedAppointment, currentTime);
                return (
                  <button
                    onClick={() => {
                      handleStartCall(selectedAppointment);
                      handleCloseModal();
                    }}
                    disabled={!timing.isAvailable}
                    title={timing.status === "early" ? "Opens 5 minutes before scheduled start time" : undefined}
                    className={`px-3.5 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      timing.isAvailable
                        ? "bg-[#0067A1] text-white hover:bg-[#004F7C] shadow-xs"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                    }`}
                  >
                    {timing.status === "early" ? "Opens in 5m" : "Start Call"}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Extend Appointment Time Modal */}
      {extendingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
          <div className="w-full max-w-md rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0067A1] flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Add Time / Extend Slot</h3>
                  <p className="text-xs text-slate-500">Reactivate expired consultation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExtendingAppointment(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Patient:</span>
                <span className="font-semibold text-slate-800">{extendingAppointment.patient?.full_name || "Patient"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Original Slot:</span>
                <span className="font-medium text-slate-700">{extendingAppointment.appointment_date} • {formatTime(extendingAppointment.appointment_time)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Type:</span>
                <span className="font-medium text-slate-700">{formatAppointmentTypeLabel(extendingAppointment)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Select Extension Option:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setExtendMode("now"); setExtendMinutes(0); }}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    extendMode === "now"
                      ? "border-[#0067A1] bg-sky-50/70 text-[#0067A1] ring-1 ring-[#0067A1]"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle className={`w-3.5 h-3.5 ${extendMode === "now" ? "text-[#0067A1]" : "text-slate-300"}`} />
                    Active Now
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 ml-5">Live immediately for next 40m</p>
                </button>

                <button
                  type="button"
                  onClick={() => { setExtendMode("add"); setExtendMinutes(15); }}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    extendMode === "add" && extendMinutes === 15
                      ? "border-[#0067A1] bg-sky-50/70 text-[#0067A1] ring-1 ring-[#0067A1]"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle className={`w-3.5 h-3.5 ${extendMode === "add" && extendMinutes === 15 ? "text-[#0067A1]" : "text-slate-300"}`} />
                    +15 Mins
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 ml-5">Slot in 15 mins from now</p>
                </button>

                <button
                  type="button"
                  onClick={() => { setExtendMode("add"); setExtendMinutes(30); }}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    extendMode === "add" && extendMinutes === 30
                      ? "border-[#0067A1] bg-sky-50/70 text-[#0067A1] ring-1 ring-[#0067A1]"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle className={`w-3.5 h-3.5 ${extendMode === "add" && extendMinutes === 30 ? "text-[#0067A1]" : "text-slate-300"}`} />
                    +30 Mins
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 ml-5">Slot in 30 mins from now</p>
                </button>

                <button
                  type="button"
                  onClick={() => { setExtendMode("add"); setExtendMinutes(60); }}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    extendMode === "add" && extendMinutes === 60
                      ? "border-[#0067A1] bg-sky-50/70 text-[#0067A1] ring-1 ring-[#0067A1]"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle className={`w-3.5 h-3.5 ${extendMode === "add" && extendMinutes === 60 ? "text-[#0067A1]" : "text-slate-300"}`} />
                    +60 Mins
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 ml-5">Slot in 1 hour from now</p>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setExtendingAppointment(null)}
                disabled={isExtending}
                className="h-8.5 px-3 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleExtendSlot(extendingAppointment, extendMinutes, extendMode)}
                disabled={isExtending}
                className="h-8.5 px-4 rounded-lg bg-[#0067A1] hover:bg-[#004F7C] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isExtending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    Extend Slot
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Clinical Consultation & Prescription Workspace Modal (Same template & interactive design as video call) */}
      {prescriptionAppointment && (
        <WritePrescriptionModal
          appointmentId={prescriptionAppointment.id}
          appointment={prescriptionAppointment}
          onClose={() => setPrescriptionAppointment(null)}
          onViewPrescription={() => {
            const savedApt = prescriptionAppointment;
            setPrescriptionAppointment(null);
            handleOpenPrescription(savedApt);
          }}
          onPrescriptionSaved={async () => {
            const savedApt = prescriptionAppointment;
            setPrescriptionAppointment(null);
            await loadAppointments(page, dateFilter);
            if (savedApt) {
              handleOpenPrescription(savedApt);
            }
          }}
        />
      )}

      {/* Official A4 Medical Prescription Letterhead Modal (exact same format as live video call) */}
      {viewingPrescriptionData && (
        <PrescriptionViewerModal
          data={viewingPrescriptionData}
          onClose={() => setViewingPrescriptionData(null)}
          isDoctor={true}
        />
      )}
      </div>
    </>
  );
}