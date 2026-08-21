"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  FaUser, 
  FaVideo, 
  FaClock, 
  FaCheck, 
  FaTimes, 
  FaInfoCircle, 
  FaPhone, 
  FaCalendarAlt,
  FaStethoscope,
  FaNotesMedical,
  FaChevronRight,
  FaUserMd,
  FaExclamationCircle
} from "react-icons/fa";
import { useRouter } from "next/navigation";
import api from "@/utils/websiteApi";

export default function InstantRequest() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const filteredRequests =
    activeTab === "all"
      ? requests
      : requests.filter((req) => req.status === activeTab);

  const fetchRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const userId =
        typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      const role =
        typeof window !== "undefined" ? localStorage.getItem("userRole") : null;

      if (!userId || role !== "doctor") {
        setError("Please log in as a doctor to view requests.");
        setIsLoading(false);
        return;
      }

      const res = await api.post("/appointment/doctor-appointment", {
        doctor_id: userId,
        date_filter: "today",
        page: 1,
      });

      if (!res.success || !res.data?.appointments) {
        setError(res.error || "Failed to load instant requests.");
        setRequests([]);
      } else {
        // Get current IST time in minutes from midnight
        const nowIST = new Date(
          new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
        );
        const nowMinutes = nowIST.getHours() * 60 + nowIST.getMinutes();

        const mapped = res.data.appointments
          .filter((apt) => {
            // Include non-booked statuses (e.g. accepted/completed) so they don't disappear from history tabs
            if (apt.status !== "booked") return true; 
            
            // For 'booked' (pending) requests, check 30-min window
            if (!apt.appointment_time) return true;
            const [h, m] = apt.appointment_time.split(":").map(Number);
            const aptMinutes = h * 60 + m;
            const minutesPast = nowMinutes - aptMinutes;
            return minutesPast <= 30;
          })
          .map((apt) => {
            let minutesLeft = undefined;
            if (apt.status === "booked" && apt.appointment_time) {
              const [h, m] = apt.appointment_time.split(":").map(Number);
              const aptMinutes = h * 60 + m;
              minutesLeft = Math.max(0, 30 - (nowMinutes - aptMinutes));
            }

            let formattedDuration = "Scheduled (15 mins)";
            const cons = apt.consultations?.[0];
            if (cons) {
              let durationSec = cons.call_duration_seconds;
              if (!durationSec && cons.started_at && cons.ended_at) {
                durationSec = Math.max(0, Math.round((new Date(cons.ended_at).getTime() - new Date(cons.started_at).getTime()) / 1000));
              }
              if (durationSec && durationSec > 0) {
                const mins = Math.floor(durationSec / 60);
                const secs = durationSec % 60;
                formattedDuration = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
              } else if (cons.duration_minutes) {
                formattedDuration = `${cons.duration_minutes} mins`;
              }
            } else if (apt.consultation_duration || apt.duration) {
              formattedDuration = `${apt.consultation_duration || apt.duration} mins`;
            }

            return {
              id: apt.id,
              patientName: apt.patient?.full_name || "Patient",
              age: apt.patient?.age || null,
              gender: apt.patient?.gender || "",
              type: "Video Consultation",
              date: apt.appointment_date,
              time: apt.appointment_time?.slice(0, 5) || "",
              status: apt.status,
              symptoms:
                apt.reason ||
                apt.chief_complaint ||
                "Instant consultation request from patient.",
              medicalHistory: apt.patient?.medical_history || "",
              duration: formattedDuration,
              priority: apt.priority || "normal",
              minutesLeft,
            };
          });
        setRequests(mapped);
      }
    } catch (err) {
      console.error("Error loading instant requests", err);
      setError("Unable to load consultation requests. Please try again.");
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleAccept = async (id) => {
    try {
      setIsLoading(true);
      const doctorId =
        typeof window !== "undefined"
          ? localStorage.getItem("userId")
          : null;

      if (!doctorId) {
        setError("Please log in as a doctor to accept requests.");
        setIsLoading(false);
        return;
      }

      const res = await api.post("/instant-call/accept", {
        appointment_id: id,
        doctor_id: doctorId,
      });

      if (!res.success) {
        throw new Error(res.error || "Failed to accept call");
      }

      setRequests((prev) =>
        prev.map((req) =>
          req.id === id ? { ...req, status: "accepted" } : req
        )
      );
      setSelectedRequest((prev) =>
        prev && prev.id === id ? { ...prev, status: "accepted" } : prev
      );
    } catch (err) {
      console.error("Error accepting instant call", err);
      setError("Unable to accept this request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async (id) => {
    try {
      setIsLoading(true);
      const doctorId =
        typeof window !== "undefined"
          ? localStorage.getItem("userId")
          : null;

      if (!doctorId) {
        setError("Please log in as a doctor to reject requests.");
        setIsLoading(false);
        return;
      }

      const res = await api.post("/instant-call/reject", {
        appointment_id: id,
        doctor_id: doctorId,
      });

      if (!res.success) {
        throw new Error(res.error || "Failed to reject call");
      }

      setRequests((prev) =>
        prev.map((req) =>
          req.id === id ? { ...req, status: "rejected" } : req
        )
      );
      setSelectedRequest((prev) =>
        prev && prev.id === id ? { ...prev, status: "rejected" } : prev
      );
    } catch (err) {
      console.error("Error rejecting instant call", err);
      setError("Unable to reject this request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
        icon: "🔔"
      },
      accepted: {
        bg: "bg-[#0067A1]/5",
        text: "text-[#0067A1]",
        border: "border-[#0067A1]/20",
        icon: "✅"
      },
      rejected: {
        bg: "bg-rose-50",
        text: "text-rose-700",
        border: "border-rose-200",
        icon: "❌"
      },
      completed: {
        bg: "bg-[#0067A1]/5",
        text: "text-[#0067A1]",
        border: "border-[#0067A1]/20",
        icon: "✔️"
      }
    };

    const config = statusClasses[status] || {
      bg: "bg-slate-50",
      text: "text-slate-700",
      border: "border-slate-200",
      icon: "📋"
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}>
        <span className="text-xs">{config.icon}</span>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      high: "bg-rose-500",
      medium: "bg-amber-500",
      normal: "bg-[#0067A1]",
      low: "bg-slate-400"
    };

    return (
      <div className={`w-2 h-2 rounded-full ${colors[priority] || colors.normal}`} />
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F6F8FA] p-4 md:p-6 lg:p-8">
        <div className="w-full mx-auto">
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-[#0067A1]/20 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <FaUserMd className="w-10 h-10 text-[#0067A1] animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-slate-700">Loading Consultation Requests</h3>
              <p className="text-sm text-slate-500">Fetching real-time patient requests...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FA]">
      <div className="w-full mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-[#0067A1] shadow-md">
                <FaPhone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-800">Instant Consultations</h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">Real-time video consultation requests from patients</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[11px] text-slate-500">Total Requests</div>
              <div className="text-base md:text-lg font-bold text-slate-800">{requests.length}</div>
            </div>
            <button
              onClick={fetchRequests}
              className="px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 animate-fadeIn">
            <FaExclamationCircle className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-rose-700 font-medium">{error}</p>
            </div>
            <button 
              onClick={() => setError("")}
              className="text-rose-500 hover:text-rose-700"
            >
              <FaTimes className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
          <div className="border-b border-slate-100">
            <nav className="flex flex-wrap">
              {["all", "pending", "accepted", "rejected", "completed"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 md:flex-none px-3 md:px-5 py-3 text-xs sm:text-sm font-medium transition-all duration-200 relative group ${activeTab === tab ? 'text-[#0067A1]' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="capitalize">
                      {tab === "all" ? "All Requests" : tab}
                    </span>
                    {tab !== "all" && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${
                        activeTab === tab 
                          ? 'bg-[#0067A1]/10 text-[#0067A1]' 
                          : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                      }`}>
                        {requests.filter(r => r.status === tab).length}
                      </span>
                    )}
                  </div>
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0067A1]"></div>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Request List */}
          <div className="divide-y divide-slate-100">
            {filteredRequests.length > 0 ? (
              filteredRequests.map((request) => (
                <div 
                  key={request.id} 
                  className="p-4 md:p-6 hover:bg-slate-50/50 transition-all duration-200 group relative"
                >
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {/* Patient Avatar & Priority */}
                    <div className="flex-shrink-0 relative">
                      <div className="w-16 h-16 rounded-2xl bg-[#0067A1]/5 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                        <FaUser className="w-8 h-8 text-[#0067A1]" />
                      </div>
                      <div className="absolute -top-1 -right-1">
                        {getPriorityBadge(request.priority)}
                      </div>
                      {request.status === 'pending' && (
                        <div className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full bg-amber-400 animate-pulse border-2 border-white"></div>
                      )}
                    </div>

                    {/* Patient Details */}
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div>
                          <div className="flex items-center flex-wrap gap-2 mb-1">
                            <h3 className="text-base sm:text-lg font-semibold text-slate-800">{request.patientName}</h3>
                            <div className="flex items-center gap-1 text-sm text-slate-500">
                              <span>{request.age} yrs</span>
                              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                              <span>{request.gender}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-slate-500">
                            <span className="flex items-center gap-1.5">
                              <FaVideo className="w-3.5 h-3.5 text-[#0067A1]" />
                              {request.type}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <FaClock className="w-3.5 h-3.5 text-slate-400" />
                              {request.duration}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(request.status)}
                            <button
                              onClick={() => setSelectedRequest(request)}
                              className="p-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                            >
                              <FaChevronRight className="w-4 h-4 text-slate-500" />
                            </button>
                          </div>
                          {request.minutesLeft !== undefined && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${request.minutesLeft <= 5 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
                              Expires in {request.minutesLeft}m
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Symptoms & Time */}
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <FaStethoscope className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-slate-600 line-clamp-2">{request.symptoms}</p>
                        </div>
                        <div className="flex items-center gap-3 text-xs sm:text-sm">
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <FaCalendarAlt className="w-3.5 h-3.5" />
                            {request.date}
                          </span>
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <FaClock className="w-3.5 h-3.5" />
                            {request.time}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleAccept(request.id)}
                              disabled={isLoading}
                              className="inline-flex items-center gap-2 px-3 md:px-4 py-2 bg-[#0067A1] text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-[#004F7C] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <FaCheck className="w-4 h-4" />
                              Accept & Start Call
                            </button>
                            <button
                              onClick={() => handleReject(request.id)}
                              disabled={isLoading}
                              className="inline-flex items-center gap-2 px-3 md:px-4 py-2 bg-white border border-slate-200 text-xs sm:text-sm text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <FaTimes className="w-4 h-4" />
                              Reject
                            </button>
                          </>
                        )}
                        {request.status === 'accepted' && (
                          <button
                            onClick={() => {
                              const doctorId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
                              router.push(`/appointments/${request.id}/video?userId=${doctorId}&role=doctor`);
                            }}
                            className="inline-flex items-center gap-2 px-3 md:px-4 py-2 bg-[#0067A1] text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-[#004F7C] transition-all duration-200"
                          >
                            <FaVideo className="w-4 h-4" />
                            Start Video Consultation
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="inline-flex items-center gap-2 px-3 md:px-4 py-2 bg-white border border-slate-200 text-xs sm:text-sm text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all duration-200"
                        >
                          <FaInfoCircle className="w-4 h-4" />
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 md:py-16">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-slate-50 flex items-center justify-center shadow-sm">
                  <FaVideo className="w-12 h-12 text-slate-300" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">
                  No {activeTab === 'all' ? '' : activeTab} consultation requests
                </h3>
                <p className="text-slate-500 max-w-md mx-auto">
                  {activeTab === 'pending' 
                    ? "All pending requests have been processed. Check back later for new requests."
                    : "No consultation requests match the selected filter."
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Request Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-slate-800">Patient Consultation Request</h3>
                  <p className="text-sm text-slate-500">Request ID: #{selectedRequest.id}</p>
                </div>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <FaTimes className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Patient Overview */}
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-[#0067A1]/5 flex items-center justify-center shadow-sm">
                    <FaUser className="w-10 h-10 text-[#0067A1]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold text-slate-800">{selectedRequest.patientName}</h4>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(selectedRequest.status)}
                        {getPriorityBadge(selectedRequest.priority)}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-slate-500">Age</p>
                        <p className="font-medium text-slate-700">{selectedRequest.age} years</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Gender</p>
                        <p className="font-medium text-slate-700">{selectedRequest.gender}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Duration</p>
                        <p className="font-medium text-slate-700">{selectedRequest.duration}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Type</p>
                        <p className="font-medium text-slate-700">{selectedRequest.type}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Consultation Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h5 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <FaCalendarAlt className="w-4 h-4 text-slate-400" />
                      Consultation Schedule
                    </h5>
                    <div className="bg-slate-50 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-500">Date</p>
                          <p className="font-medium text-slate-800">{selectedRequest.date}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Time</p>
                          <p className="font-medium text-slate-800">{selectedRequest.time}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h5 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <FaNotesMedical className="w-4 h-4 text-slate-400" />
                      Medical Details
                    </h5>
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-xs text-slate-500 mb-1">Priority</p>
                      <p className="font-medium text-slate-800 capitalize">{selectedRequest.priority}</p>
                    </div>
                  </div>
                </div>

                {/* Symptoms & History */}
                <div className="space-y-4">
                  <div>
                    <h5 className="text-sm font-semibold text-slate-700 mb-2">Commonly reported symptoms (optional). Doctor may add or modify.</h5>
                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                      <p className="text-slate-600">{selectedRequest.symptoms}</p>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm font-semibold text-slate-700 mb-2">Medical History</h5>
                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                      <p className="text-slate-600">
                        {selectedRequest.medicalHistory || 'No significant medical history provided by the patient.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50">
              <div className="flex flex-wrap gap-3 justify-end">
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="px-5 py-2.5 border border-slate-300 rounded-xl font-medium text-slate-700 hover:bg-white hover:shadow-sm transition-all"
                >
                  Close
                </button>
                
                {selectedRequest.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        handleReject(selectedRequest.id);
                        setSelectedRequest(null);
                      }}
                      className="px-5 py-2.5 bg-white border border-rose-200 text-rose-700 rounded-xl font-medium hover:bg-rose-50 hover:border-rose-300 transition-all"
                    >
                      Reject Request
                    </button>
                    <button
                      onClick={async () => {
                        await handleAccept(selectedRequest.id);
                        const doctorId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
                        router.push(`/appointments/${selectedRequest.id}/video?userId=${doctorId}&role=doctor`);
                      }}
                      className="px-5 py-2.5 bg-[#0067A1] text-white rounded-xl text-sm font-medium hover:bg-[#004F7C] transition-all"
                    >
                      Accept & Start Consultation
                    </button>
                  </>
                )}
                {selectedRequest.status === 'accepted' && (
                  <button
                    onClick={() => {
                      const doctorId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
                      router.push(`/appointments/${selectedRequest.id}/video?userId=${doctorId}&role=doctor`);
                    }}
                    className="px-5 py-2.5 bg-[#0067A1] text-white rounded-xl text-sm font-medium hover:bg-[#004F7C] transition-all"
                  >
                    Start Video Consultation
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}