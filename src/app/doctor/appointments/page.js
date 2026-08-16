"use client";

import { useEffect, useMemo, useState } from "react";
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
  Stethoscope
} from "lucide-react";
import toast from "react-hot-toast";
import ConsultationWorkspace from "@/components/doctor/ConsultationWorkspace";
import SessionAgreementModal from "@/components/doctor/SessionAgreementModal";
import DoctorAnalyticsWidget from "@/components/doctor/DoctorAnalyticsWidget";

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState("overview");
  const [isOffline, setIsOffline] = useState(false);

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

      const dt = new Date(apt.appointment_date + "T" + apt.appointment_time);
      if (dt < now) continue;

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

  const loadAppointments = async (pageToLoad = 1, date = dateFilter) => {
    try {
      setIsLoading(true);
      setError("");

      const userId =
        typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      const role =
        typeof window !== "undefined" ? localStorage.getItem("userRole") : null;

      if (!userId || role !== "doctor") {
        setError("Please login as a doctor to view appointments.");
        setAppointments([]);
        setPagination(null);
        return;
      }

      const res = await api.post("/appointment/doctor-appointments-detailed", {
        doctor_id: userId,
        date_filter: date,
        page: pageToLoad,
      });

      if (!res.success || !res.data?.appointments) {
        setError(res.error || "Unable to load appointments.");
        setAppointments([]);
        setPagination(null);
        return;
      }

      setAppointments(res.data.appointments || []);
      setPagination(res.data.pagination || null);
      setPage(pageToLoad);
    } catch (err) {
      console.error("Error loading appointments", err);
      setError("Unable to load appointments. Please try again.");
      setAppointments([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments(1, dateFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  const updateAppointmentStatus = async (appointmentId, newStatus) => {
    try {
      setIsLoading(true);
      setError("");

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

    // Sort by date and time
    // If dateFilter is "all", sort descending (latest first). Otherwise, sort ascending (chronological).
    return filtered.sort((a, b) => {
      const dateA = a.appointment_date || "";
      const dateB = b.appointment_date || "";
      if (dateA !== dateB) {
        return dateFilter === "all" ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
      }
      const timeA = a.appointment_time || "";
      const timeB = b.appointment_time || "";
      return dateFilter === "all" ? timeB.localeCompare(timeA) : timeA.localeCompare(timeB);
    });
  }, [appointments, statusFilter, typeFilter, searchQuery, dateFilter]);

  function isVideoAppointment(apt) {
    const t = String(apt.appointment_type || apt.type || "").toLowerCase();
    return ["video", "video_consultation", "video_call", "teleconsultation", "instant_call", "telemedicine", "instant"].includes(t);
  }

  function isWithinSlot(apt) {
    if (!apt.appointment_date || !apt.appointment_time) return false;

    try {
      const start = new Date(apt.appointment_date + "T" + apt.appointment_time);
      // Allow starting 15 min before and up to 2 hours after the slot start
      const earlyStart = new Date(start.getTime() - 15 * 60 * 1000);
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
      const now = new Date();
      return now >= earlyStart && now <= end;
    } catch {
      return false;
    }
  }

  function isExpiredOneDayBefore(dateStr) {
    if (!dateStr) return false;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [year, month, day] = dateStr.split("-").map(Number);
      const aptDate = new Date(year, month - 1, day);
      aptDate.setHours(0, 0, 0, 0);
      return aptDate < today;
    } catch {
      return false;
    }
  }

  const handleStartCall = async (apt) => {
    // No blocking – doctor can always start a call
    const doctorId =
      typeof window !== "undefined" ? localStorage.getItem("userId") : null;

    if (!doctorId) {
      toast.error("Please login as a doctor to start call.");
      return;
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

      <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] to-[#F0F7F6]">
      <div className="w-full mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-[#0067A1] shadow-lg">
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
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] transition-all shadow-sm"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 rounded-xl border transition-all ${
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
        <div className={`bg-white rounded-2xl shadow-lg border border-slate-100 p-5 transition-all duration-300 ${
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
                className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] transition-all"
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
                className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] transition-all"
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
                className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] transition-all"
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
          <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
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

        {/* Appointments List */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Appointments List</h3>
                <p className="text-sm text-slate-500">
                  Showing {filteredAppointments.length} of {appointments.length} appointments
                </p>
              </div>
              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </div>
              )}
            </div>
          </div>

          {isLoading && appointments.length === 0 ? (
            <div className="py-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#0067A1]/10 mb-4">
                <Loader2 className="w-8 h-8 text-[#0067A1] animate-spin" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">Loading Appointments</h3>
              <p className="text-sm text-slate-500">Fetching your consultation details...</p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="py-16 text-center">
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
            <div className="divide-y divide-slate-100">
              {filteredAppointments.map((apt) => {
                const isNext = nextUpcomingId && apt.id === nextUpcomingId;
                return (
                <div
                  key={apt.id}
                  className={`px-5 py-4 transition-colors group ${
                    isNext
                      ? "bg-emerald-50/60 border-l-4 border-emerald-500"
                      : "hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Patient Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0067A1]/10 to-[#0067A1]/5 flex items-center justify-center">
                            <User className="w-6 h-6 text-[#0067A1]" />
                          </div>
                          {isWithinSlot(apt) && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white"></div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h4 className="text-base font-semibold text-slate-800 truncate">
                              {apt.patient?.full_name || "Patient"}
                            </h4>
                            {isNext && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-semibold uppercase tracking-wide">
                                <Clock className="w-3 h-3" />
                                Next
                              </span>
                            )}
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              TYPE_COLORS[apt.appointment_type] || "bg-slate-100 text-slate-700"
                            }`}>
                              {(() => {
                                 const tKey = String(apt.appointment_type || apt.type || "").toLowerCase();
                                 if (["video", "video_consultation", "video_call", "teleconsultation", "instant_call", "telemedicine", "instant"].includes(tKey)) return "Video";
                                 if (["home", "home_visit"].includes(tKey)) return "Home";
                                 return "Clinic";
                               })()}
                            </span>
                          </div>

                          {/* Patient Details */}
                          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-4 h-4 text-slate-400" />
                              <span>{apt.patient?.phone || "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-4 h-4 text-slate-400" />
                              <span className="truncate max-w-[200px]">{apt.patient?.email || "N/A"}</span>
                            </div>
                            {apt.patient?.blood_group && (
                              <div className="flex items-center gap-1.5">
                                <Droplet className="w-4 h-4 text-red-400" />
                                <span className="font-medium">{apt.patient.blood_group}</span>
                              </div>
                            )}
                          </div>

                          {/* Appointment Details */}
                          <div className="flex flex-wrap items-center gap-4 mt-3">
                            <div className="flex items-center gap-1.5 text-sm text-slate-500">
                              <Calendar className="w-4 h-4" />
                              <span>{apt.appointment_date}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-slate-500">
                              <Clock className="w-4 h-4" />
                              <span>{formatTime(apt.appointment_time)}</span>
                            </div>
                            {apt.reason && (
                              <div className="flex items-start gap-1.5 text-sm text-slate-600">
                                <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span className="line-clamp-1">{apt.reason}</span>
                              </div>
                            )}
                            {apt.screening?.analysis?.summary && (
                              <div className="flex items-start gap-1.5 text-sm text-slate-600">
                                <BarChart3 className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#0067A1]" />
                                <span className="line-clamp-1">
                                  {apt.screening.analysis.summary}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex flex-col items-start lg:items-end gap-3">
                      <div className="flex items-center gap-2">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium ${
                          STATUS_COLORS[apt.status] || "bg-slate-100 text-slate-700 border-slate-200"
                        }`}>
                          {getStatusIcon(apt.status)}
                          <span className="capitalize">{apt.status || "unknown"}</span>
                        </div>
                        
                        <button
                          onClick={() => setSelectedAppointment(apt)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#0067A1] hover:bg-[#0067A1]/5 transition-colors"
                          title="View Details"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {!isExpiredOneDayBefore(apt.appointment_date) ? (
                          <>
                            {isVideoAppointment(apt) && (
                              <button
                                onClick={() => handleStartCall(apt)}
                                disabled={isLoading}
                                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                  isWithinSlot(apt)
                                    ? "bg-[#0067A1] text-white hover:bg-[#004F7C]"
                                    : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-100"
                                }`}
                              >
                                <PhoneCall className="w-4 h-4" />
                                Start Call
                              </button>
                            )}
                            
                            <button
                              onClick={() => handleNotifyPatient(apt)}
                              disabled={isLoading}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                            >
                              <Bell className="w-4 h-4" />
                              Notify
                            </button>

                            {apt.status === "booked" && (
                              <>
                                <button
                                  onClick={() => updateAppointmentStatus(apt.id, "approved")}
                                  disabled={isLoading}
                                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                                >
                                  <CheckSquare className="w-4 h-4" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => updateAppointmentStatus(apt.id, "rejected")}
                                  disabled={isLoading}
                                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 border border-red-100 hover:bg-red-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                                >
                                  <XCircle className="w-4 h-4" />
                                  Reject
                                </button>
                              </>
                            )}
                          </>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200/60 inline-flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5" />
                            Expired Slot (actions unavailable)
                          </span>
                        )}
                      </div>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white rounded-2xl shadow-lg border border-slate-100 p-5">
            <div className="text-sm text-slate-600">
              Showing page {pagination.currentPage} of {pagination.totalPages} •{" "}
              {(pagination.totalItems ?? pagination.total ?? 0)} total appointments
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1 || isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-all"
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
                      className={`w-10 h-10 rounded-xl text-sm font-medium transition-all ${
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-all"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 max-h-[90vh] overflow-hidden">
            <div className="sticky top-0 bg-white border-b border-slate-100 z-10 p-0">
              <div className="px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    Appointment Details
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[selectedAppointment.status] || "bg-slate-100 text-slate-700"}`}>
                      {getStatusIcon(selectedAppointment.status)}
                      <span className="capitalize">{selectedAppointment.status}</span>
                    </span>
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">ID: {selectedAppointment.id}</p>
                </div>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="flex border-t border-slate-100 px-6 mt-2">
                <button
                  onClick={() => setActiveModalTab("overview")}
                  className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
                    activeModalTab === "overview" ? "border-[#0067A1] text-[#0067A1]" : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2"><User className="w-4 h-4"/> Overview</div>
                </button>
                <button
                  onClick={() => setActiveModalTab("workspace")}
                  className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
                    activeModalTab === "workspace" ? "border-[#0067A1] text-[#0067A1]" : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2"><Stethoscope className="w-4 h-4"/> Clinical Workspace</div>
                </button>
              </div>
            </div>
            
            <div className="overflow-y-auto px-6 py-5 max-h-[60vh]">
              {activeModalTab === "overview" ? (
                <div className="space-y-6">
              {/* Patient Info */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#0067A1]/10 to-[#0067A1]/5 flex items-center justify-center">
                  <User className="w-8 h-8 text-[#0067A1]" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-slate-800">
                    {selectedAppointment.patient?.full_name || "Patient"}
                  </h4>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-600">
                    {selectedAppointment.patient?.gender && (
                      <span className="capitalize">• {selectedAppointment.patient.gender}</span>
                    )}
                    {selectedAppointment.patient?.age && (
                      <span>• {selectedAppointment.patient.age} years</span>
                    )}
                    {selectedAppointment.patient?.blood_group && (
                      <span className="inline-flex items-center gap-1.5 font-medium text-red-600">
                        <Droplet className="w-4 h-4" />
                        {selectedAppointment.patient.blood_group}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedAppointment.patient?.phone && (
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white">
                        <Phone className="w-4 h-4 text-[#0067A1]" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Phone Number</p>
                        <p className="font-medium text-slate-800">{selectedAppointment.patient.phone}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {selectedAppointment.patient?.email && (
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white">
                        <Mail className="w-4 h-4 text-[#0067A1]" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Email Address</p>
                        <p className="font-medium text-slate-800 break-all">{selectedAppointment.patient.email}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Appointment Details */}
              <div className="bg-gradient-to-r from-[#0067A1]/5 to-transparent rounded-xl p-5">
                <h5 className="text-sm font-semibold text-[#0067A1] mb-3">Appointment Information</h5>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Date</p>
                    <p className="font-medium text-slate-800">{selectedAppointment.appointment_date}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Time</p>
                    <p className="font-medium text-slate-800">{formatTime(selectedAppointment.appointment_time)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Type</p>
                    <p className="font-medium text-slate-800 capitalize">
                      {selectedAppointment.appointment_type?.replace('_', ' ') || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Status</p>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                      STATUS_COLORS[selectedAppointment.status] || "bg-slate-100 text-slate-700"
                    }`}>
                      {getStatusIcon(selectedAppointment.status)}
                      <span className="capitalize">{selectedAppointment.status}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Address & Reason */}
              <div className="space-y-4">
                {selectedAppointment.screening && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-4 h-4 text-slate-400" />
                      <p className="text-sm font-medium text-slate-700">Screening Summary</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3 text-sm text-slate-700">
                      {selectedAppointment.screening.initial_symptoms && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 mb-1">Commonly reported symptoms (optional). Doctor may add or modify.</p>
                          <p className="whitespace-pre-line">
                            {selectedAppointment.screening.initial_symptoms}
                          </p>
                        </div>
                      )}
                      {selectedAppointment.screening.analysis?.summary && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 mb-1">Assistive Assessment</p>
                          <p className="whitespace-pre-line">
                            {selectedAppointment.screening.analysis.summary}
                          </p>
                        </div>
                      )}
                      {(selectedAppointment.screening.analysis?.urgency ||
                        selectedAppointment.screening.analysis?.recommended_specialties?.length ||
                        selectedAppointment.screening.analysis?.recommended_lab_tests?.length) && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                          {selectedAppointment.screening.analysis?.urgency && (
                            <div>
                              <p className="text-[11px] font-semibold text-slate-500 mb-1">Urgency</p>
                              <p className="text-slate-800 capitalize">
                                {selectedAppointment.screening.analysis.urgency}
                              </p>
                            </div>
                          )}
                          {selectedAppointment.screening.analysis?.recommended_specialties?.length && (
                            <div>
                              <p className="text-[11px] font-semibold text-slate-500 mb-1">
                                Suggested Specialties
                              </p>
                              <p className="text-slate-800">
                                {selectedAppointment.screening.analysis.recommended_specialties.join(", ")}
                              </p>
                            </div>
                          )}
                          {selectedAppointment.screening.analysis?.recommended_lab_tests?.length && (
                            <div>
                              <p className="text-[11px] font-semibold text-slate-500 mb-1">
                                Suggested Lab Tests
                              </p>
                              <p className="text-slate-800">
                                {selectedAppointment.screening.analysis.recommended_lab_tests.join(", ")}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {selectedAppointment.appointment_type === 'clinic_visit' && selectedAppointment.doctor?.clinic_address && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <p className="text-sm font-medium text-slate-700">Clinic Location</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-sm font-medium text-slate-800">
                        {selectedAppointment.doctor.clinic_name}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        {selectedAppointment.doctor.clinic_address}
                      </p>
                      {selectedAppointment.doctor.latitude && selectedAppointment.doctor.longitude && (
                        <a
                          href={`https://www.google.com/maps?q=${selectedAppointment.doctor.latitude},${selectedAppointment.doctor.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center mt-3 text-sm font-medium text-[#0067A1] hover:text-[#004F7C] transition-colors"
                        >
                          <MapPin className="w-4 h-4 mr-1.5" />
                          View on Map
                        </a>
                      )}
                    </div>
                  </div>
                )}
                {selectedAppointment.patient?.address && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <p className="text-sm font-medium text-slate-700">Address</p>
                    </div>
                    <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-4">
                      {selectedAppointment.patient.address}
                    </p>
                  </div>
                )}

                {selectedAppointment.reason && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-slate-400" />
                      <p className="text-sm font-medium text-slate-700">Consultation Reason</p>
                    </div>
                    <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-4 whitespace-pre-line">
                      {selectedAppointment.reason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <ConsultationWorkspace 
              appointment={selectedAppointment} 
              onConsultationUpdate={() => {
                // Refresh list
                loadAppointments(page, dateFilter);
              }} 
            />
          )}
        </div>
        
        {activeModalTab === "overview" && (
            <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex justify-end gap-3 z-10">
              <button
                onClick={() => setSelectedAppointment(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors text-sm font-medium"
              >
                Close
              </button>
              {selectedAppointment.screening?.id && (
                <button
                  onClick={() => {
                    window.open(`/api/screening/${selectedAppointment.screening.id}/doctors`, "_blank");
                  }}
                  className="px-4 py-2 rounded-xl border border-[#0067A1]/20 text-[#0067A1] bg-white hover:bg-[#0067A1]/5 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Full Screening
                </button>
              )}
              {isVideoAppointment(selectedAppointment) && !isExpiredOneDayBefore(selectedAppointment.appointment_date) && (
                <button
                  onClick={() => {
                    handleStartCall(selectedAppointment);
                    setSelectedAppointment(null);
                  }}
                  disabled={!isWithinSlot(selectedAppointment)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    isWithinSlot(selectedAppointment)
                      ? "bg-[#0067A1] text-white hover:bg-[#004F7C]"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  Start Video Call
                </button>
              )}
            </div>
        )}
          </div>
        </div>
      )}
      </div>
    </>
  );
}