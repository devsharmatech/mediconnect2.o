"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Clock, CheckCircle2, AlertCircle, Loader2,
  Phone, MapPin, RefreshCw, ChevronDown, ChevronUp,
  ArrowLeft, Sparkles, UserCheck, Handshake, PlayCircle, XCircle, Lock
} from "lucide-react";
import Link from "next/link";

const STATUS_PIPELINE = [
  { key: "NEW", label: "Request Submitted", icon: Sparkles, description: "Your request has been received and is in the queue." },
  { key: "CONTACTED", label: "Team Contacted You", icon: Phone, description: "Our team has reached out to discuss your needs." },
  { key: "QUALIFIED", label: "Qualified", icon: UserCheck, description: "Your request has been verified and qualified." },
  { key: "SHARED_WITH_PARTNER", label: "Partner Assigned", icon: Handshake, description: "A nursing care partner has been assigned to your request." },
  { key: "SERVICE_STARTED", label: "Service Started", icon: PlayCircle, description: "Nursing care service is now active." },
  { key: "CLOSED", label: "Completed", icon: CheckCircle2, description: "Service has been completed successfully." },
];

const STATUS_COLORS = {
  NEW: { bg: "bg-blue-50", border: "border-blue-200", text: "text-[#004F7C]", dot: "bg-blue-500", badge: "bg-blue-100 text-[#004F7C]" },
  CONTACTED: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", dot: "bg-yellow-500", badge: "bg-yellow-100 text-yellow-700" },
  QUALIFIED: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", dot: "bg-purple-500", badge: "bg-purple-100 text-purple-700" },
  SHARED_WITH_PARTNER: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", dot: "bg-indigo-500", badge: "bg-indigo-100 text-indigo-700" },
  SERVICE_STARTED: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", dot: "bg-green-500", badge: "bg-green-100 text-green-700" },
  NOT_CONVERTED: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", dot: "bg-red-500", badge: "bg-red-100 text-red-700" },
  CLOSED: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700", dot: "bg-gray-500", badge: "bg-gray-100 text-gray-700" },
};

function StatusTimeline({ currentStatus }) {
  const currentIndex = STATUS_PIPELINE.findIndex((s) => s.key === currentStatus);
  const isNotConverted = currentStatus === "NOT_CONVERTED";

  return (
    <div className="space-y-0">
      {STATUS_PIPELINE.map((step, idx) => {
        const isCompleted = !isNotConverted && idx < currentIndex;
        const isCurrent = step.key === currentStatus;
        const isFuture = !isNotConverted && idx > currentIndex;
        const Icon = step.icon;
        const colors = STATUS_COLORS[step.key] || STATUS_COLORS.NEW;

        return (
          <div key={step.key} className="flex items-start gap-3">
            {/* Vertical line + dot */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                isCompleted ? "bg-green-500 text-white" :
                isCurrent ? `${colors.dot} text-white ring-4 ring-opacity-30 ring-${colors.dot.replace('bg-', '')}` :
                "bg-gray-200 text-gray-400"
              }`}>
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              {idx < STATUS_PIPELINE.length - 1 && (
                <div className={`w-0.5 h-10 ${isCompleted ? "bg-green-400" : "bg-gray-200"}`} />
              )}
            </div>

            {/* Label + description */}
            <div className={`pt-1 pb-4 ${isFuture ? "opacity-40" : ""}`}>
              <p className={`text-sm font-semibold ${
                isCompleted ? "text-green-700" :
                isCurrent ? colors.text :
                "text-gray-400"
              }`}>
                {step.label}
                {isCurrent && (
                  <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full ${colors.badge}`}>
                    Current
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
            </div>
          </div>
        );
      })}

      {/* Not Converted (side track) */}
      {isNotConverted && (
        <div className="flex items-start gap-3 mt-2">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-500 text-white ring-4 ring-red-100">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-1">
            <p className="text-sm font-semibold text-red-700">
              Not Converted
              <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700">Current</span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">This request could not be fulfilled. Please contact support if needed.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NursingStatusPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const resolveCurrentUserId = () => {
    try {
      const idFromStorage = localStorage.getItem("userId");
      if (idFromStorage) return idFromStorage;

      const rawUserData = localStorage.getItem("userData");
      if (rawUserData) {
        const parsed = JSON.parse(rawUserData);
        const fromUserData = parsed?.id || parsed?.user_id || parsed?.details?.id;
        if (fromUserData) return fromUserData;
      }

      const legacyRaw =
        localStorage.getItem("userProfile") ||
        localStorage.getItem("user") ||
        localStorage.getItem("patientUser");
      if (legacyRaw) {
        const parsedLegacy = JSON.parse(legacyRaw);
        const fromLegacy = parsedLegacy?.id || parsedLegacy?.user_id || parsedLegacy?.details?.id;
        if (fromLegacy) return fromLegacy;
      }
    } catch {
      // ignore parsing failures
    }
    return null;
  };

  useEffect(() => {
    const currentUserId = resolveCurrentUserId();
    setUserId(currentUserId);
  }, []);

  const fetchRequests = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try {
      setLoading(true);
      const res = await fetch(`/api/nursing/request?user_id=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (data.success) {
        setRequests(data.data || []);
        // Auto-expand the first request if none expanded
        if (data.data?.length > 0) {
          setExpandedId((prev) => prev || data.data[0].id);
        }
      } else {
        setRequests([]);
      }
    } catch {
      setRequests([]);
    }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  const formatDuration = (d) => {
    const map = { single_visit: "Single Visit", short_term: "Short-term", long_term: "Long-term" };
    return map[d] || d || "—";
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0067A1]" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
        <Lock className="w-12 h-12 text-gray-300 mb-4" />
        <h2 className="text-lg font-bold text-gray-800 mb-2">Login Required</h2>
        <p className="text-sm text-gray-500 mb-6 text-center max-w-sm">
          Please log in to view the status of your nursing care requests.
        </p>
        <Link href="/website/login" className="px-6 py-2.5 bg-[#0067A1] text-white rounded-xl hover:bg-[#004F7C] transition-colors text-sm font-medium">
          Log In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto py-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Heart className="w-6 h-6 text-[#0067A1]" /> My Nursing Requests
          </h1>
          <p className="text-sm text-gray-500 mt-1">Track the status of your nursing care requests</p>
        </div>
        <button
          onClick={fetchRequests}
          className="flex items-center gap-2 px-4 py-2 bg-[#0067A1] text-white rounded-xl hover:bg-[#004F7C] transition-colors text-sm cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* No requests */}
      {requests.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm"
        >
          <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Nursing Requests Yet</h3>
          <p className="text-sm text-gray-500 mb-6">You haven&apos;t submitted any nursing care requests.</p>
          <Link
            href="/website/nursing-care"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0067A1] text-white rounded-xl hover:bg-[#004F7C] transition-colors text-sm font-medium"
          >
            <Heart className="w-4 h-4" /> Request Nursing Care
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {requests.map((req, idx) => {
            const isExpanded = expandedId === req.id;
            const colors = STATUS_COLORS[req.lead_status] || STATUS_COLORS.NEW;
            const statusLabel = STATUS_PIPELINE.find((s) => s.key === req.lead_status)?.label
              || (req.lead_status === "NOT_CONVERTED" ? "Not Converted" : req.lead_status);

            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                  isExpanded ? `${colors.border} border-2` : "border-gray-200"
                }`}
              >
                {/* Card Header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                  className="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4 text-left">
                    <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
                      <Heart className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">
                        {req.lead_id || `REQ-${req.id?.slice(0, 8)}`}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {Array.isArray(req.care_types) ? req.care_types.join(", ") : req.care_types || "Nursing Care"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors.badge}`}>
                      {statusLabel}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 space-y-5 border-t border-gray-100 pt-5">
                        {/* Status Timeline */}
                        <div>
                          <h4 className="text-sm font-bold text-gray-700 mb-4">Status Progress</h4>
                          <StatusTimeline currentStatus={req.lead_status} />
                        </div>

                        {/* Request Details */}
                        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                          <h4 className="text-sm font-bold text-gray-700">Request Received Information</h4>
                          <p className="text-xs text-gray-500">We have received your nursing request and are processing it.</p>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-gray-400">Request ID</p>
                              <p className="text-gray-800 font-medium">{req.lead_id || `REQ-${req.id?.slice(0, 8)}`}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">Current Status</p>
                              <p className="text-gray-800 font-medium">{statusLabel}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">Patient Name</p>
                              <p className="text-gray-800 font-medium">{req.name || "—"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">Duration</p>
                              <p className="text-gray-800 font-medium">{formatDuration(req.duration)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</p>
                              <p className="text-gray-800 font-medium">{[req.locality, req.city].filter(Boolean).join(", ") || "—"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Requested On</p>
                              <p className="text-gray-800 font-medium">{formatDate(req.created_at)}</p>
                            </div>
                          </div>
                          {req.care_types && (
                            <div>
                              <p className="text-xs text-gray-400">Care Types</p>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {(Array.isArray(req.care_types) ? req.care_types : [req.care_types]).map((ct, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-[#0067A1]/10 text-[#0067A1] rounded-md text-xs font-medium">
                                    {ct}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Last updated */}
                        {req.updated_at && req.updated_at !== req.created_at && (
                          <p className="text-xs text-gray-400 text-right">
                            Last updated: {formatDate(req.updated_at)}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Help note */}
      <div className="bg-[#0067A1]/5 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[#0067A1] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-gray-700">Need help with your request?</p>
          <p className="text-xs text-gray-500 mt-0.5">
            If you have questions about your nursing care request, please contact our support team or call us directly.
          </p>
        </div>
      </div>
    </div>
  );
}
