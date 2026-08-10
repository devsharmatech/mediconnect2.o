"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  RefreshCw,
  User,
  Search,
  Siren,
  Calendar,
  Clock,
  Stethoscope,
  X,
  ChevronRight,
} from "lucide-react";
import { toast } from "react-hot-toast";

/* ── Status badge colours ── */
const STATUS_STYLES = {
  booked:    "bg-blue-100 text-[#004F7C]",
  approved:  "bg-emerald-100 text-emerald-700",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-600",
  rejected:  "bg-orange-100 text-orange-600",
  default:   "bg-amber-100 text-amber-700",
};

function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status?.toLowerCase()] || STATUS_STYLES.default;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {status}
    </span>
  );
}

function getInitials(name) {
  return name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
}

export default function AdminInterventionPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [selected, setSelected] = useState(null);         // selected appointment
  const [consultation, setConsultation] = useState(null); // loaded consultation detail
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  /* ── Live search ── */
  useEffect(() => {
    if (!query.trim()) {
      const fetchInitial = async () => {
        try {
          setSearching(true);
          const res = await fetch("/api/appointment/web?limit=8");
          const data = await res.json();
          if (data.success) {
            setResults(data.data.appointments || []);
          }
        } catch {
          /* silent */
        } finally {
          setSearching(false);
        }
      };
      fetchInitial();
      setShowDropdown(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await fetch(`/api/appointment/web?search=${encodeURIComponent(query)}&limit=8`);
        const data = await res.json();
        if (data.success) {
          setResults(data.data.appointments || []);
          setShowDropdown(true);
        }
      } catch {
        /* silent */
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    const handler = (e) => {
      if (
        !dropdownRef.current?.contains(e.target) &&
        !inputRef.current?.contains(e.target)
      ) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Select an appointment and load consultation detail ── */
  const handleSelect = async (apt) => {
    setSelected(apt);
    setShowDropdown(false);
    setQuery(`${apt.patient?.full_name || "Unknown"} — ${apt.appointment_date}`);
    setConsultation(null);

    try {
      setLoadingDetail(true);
      const res = await fetch(`/api/appointment/web/${apt.id}`);
      const data = await res.json();
      if (data.success) {
        setConsultation(data.data.appointment);
      } else {
        // Fallback: use the appointment data directly as the consultation object
        setConsultation({ ...apt, id: apt.id, case_status: apt.status?.toUpperCase() });
      }
    } catch {
      setConsultation({ ...apt, id: apt.id, case_status: apt.status?.toUpperCase() });
    } finally {
      setLoadingDetail(false);
    }
  };

  /* ── Clear selection ── */
  const handleClear = () => {
    setQuery("");
    setSelected(null);
    setConsultation(null);
    setResults([]);
    inputRef.current?.focus();
  };

  /* ── Intervention actions ── */
  const handleAction = async (actionType) => {
    if (!consultation) return;
    try {
      setActionLoading(actionType);
      const adminId = localStorage.getItem("adminId") || "system-admin";
      const res = await fetch("/api/admin/intervention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultation_id: consultation.id,
          action: actionType,
          admin_id: adminId,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success(data.message);
      setConsultation({
        ...consultation,
        case_status: actionType === "force_resolve" ? "CLOSED_RESOLVED" : consultation.case_status,
      });
    } catch (err) {
      toast.error(err.message || "Intervention failed");
    } finally {
      setActionLoading(null);
    }
  };

  const isResolved =
    consultation?.case_status === "CLOSED_RESOLVED" ||
    consultation?.status === "completed";

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full bg-transparent">
      <div className="w-full space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-red-600 rounded-2xl shadow-xl shadow-red-200">
              <Siren className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                Medical Intervention Panel
              </h1>
              <p className="text-sm text-slate-500 dark:text-gray-400 font-medium mt-0.5">
                Search by patient name, phone, or doctor — select an appointment to intervene
              </p>
            </div>
          </div>
          <span className="self-start sm:self-auto flex items-center gap-1.5 text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-950/25 border border-red-100 dark:border-red-900/30 px-3 py-1.5 rounded-full uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Authorized Access
          </span>
        </div>

        {/* ── Smart Search Card ── */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
          <h2 className="text-sm font-bold text-slate-700 dark:text-gray-300 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            Find Appointment
          </h2>

          {/* Search input */}
          <div className="relative">
            <div className="relative flex items-center">
              {searching ? (
                <RefreshCw className="absolute left-4 w-4 h-4 text-slate-400 animate-spin" />
              ) : (
                <Search className="absolute left-4 w-4 h-4 text-slate-400" />
              )}
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search by patient name, phone number, or doctor name..."
                className="w-full pl-11 pr-10 py-3.5 bg-slate-50 dark:bg-gray-700/50 border border-slate-200 dark:border-gray-600 rounded-2xl text-sm font-medium text-slate-700 dark:text-gray-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30 focus:border-[#0067A1]/50 transition-all"
              />
              {query && (
                <button onClick={handleClear} className="absolute right-4 p-0.5 text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* ── Dropdown Results ── */}
            {showDropdown && (
              <div
                ref={dropdownRef}
                className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xl z-50 overflow-hidden"
              >
                {results.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400 font-semibold">No appointments found</p>
                    <p className="text-xs text-slate-400 mt-1">Try a different name or phone number</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-50 dark:divide-gray-700 max-h-80 overflow-y-auto">
                    {results.map((apt) => (
                      <li key={apt.id}>
                        <button
                          onClick={() => handleSelect(apt)}
                          className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-gray-700/35 transition-colors text-left group"
                        >
                          {/* Patient avatar */}
                          <div className="w-10 h-10 rounded-xl bg-[#0067A1]/10 dark:bg-[#0067A1]/25 flex items-center justify-center shrink-0 font-bold text-[#0067A1] dark:text-[#52beb5] text-xs">
                            {getInitials(apt.patient?.full_name)}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 dark:text-gray-150 truncate">
                              {apt.patient?.full_name || "Unknown Patient"}
                            </p>
                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              <span className="text-xs text-slate-400 dark:text-gray-400 flex items-center gap-1">
                                <Stethoscope className="w-3 h-3" />
                                {apt.doctor?.full_name || "—"}
                              </span>
                              <span className="text-xs text-slate-400 dark:text-gray-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(apt.appointment_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            </div>
                          </div>

                          {/* Status + arrow */}
                          <div className="flex items-center gap-2 shrink-0">
                            <StatusBadge status={apt.status} />
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400 mt-3">
            Start typing to search — results appear automatically across patient names, phone numbers, and doctor names.
          </p>
        </div>

        {/* ── Selected Appointment Detail ── */}
        {loadingDetail && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-12 flex items-center justify-center gap-3">
            <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
            <p className="text-sm text-slate-500 dark:text-gray-400 font-semibold">Loading consultation details...</p>
          </div>
        )}

        {!loadingDetail && consultation && selected && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">

            {/* ── Appointment Overview Bar ── */}
            <div className="px-6 sm:px-8 py-6 border-b border-slate-100 dark:border-gray-750">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Patient avatar */}
                  <div className="w-12 h-12 rounded-2xl bg-[#0067A1]/10 dark:bg-[#0067A1]/25 flex items-center justify-center font-black text-[#0067A1] dark:text-[#52beb5] text-sm shrink-0">
                    {getInitials(selected.patient?.full_name)}
                  </div>
                  <div>
                    <p className="text-base font-black text-slate-900 dark:text-white">
                      {selected.patient?.full_name || "Unknown Patient"}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-gray-400 font-medium mt-0.5">
                      {selected.patient?.phone_number || "—"} &bull; {selected.patient?.email || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={consultation.case_status?.toLowerCase() || selected.status} />
                  <button onClick={handleClear} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quick Info Row */}
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { icon: Calendar, label: "Date", value: new Date(selected.appointment_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) },
                  { icon: Clock, label: "Time", value: selected.appointment_time ? new Date(`1970-01-01T${selected.appointment_time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) : "—" },
                  { icon: Stethoscope, label: "Doctor", value: selected.doctor?.full_name || "—" },
                  { icon: User, label: "Specialization", value: selected.doctor?.specialization || "—" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-slate-50 dark:bg-gray-700/50 rounded-2xl px-4 py-3">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <Icon className="w-3 h-3" />{label}
                    </p>
                    <p className="text-sm font-bold text-slate-700 dark:text-gray-200 truncate">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Intervention Actions ── */}
            <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Manual Nudge */}
              <div className="bg-blue-50/50 dark:bg-blue-950/15 border border-blue-100/50 dark:border-blue-900/30 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <Bell className="w-4 h-4 text-[#0067A1] dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Manual Nudge</h4>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Force send follow-up reminder</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">
                  Push an immediate follow-up reminder to the patient's mobile app and digital locker.
                </p>
                <button
                  onClick={() => handleAction("trigger_nudge")}
                  disabled={actionLoading !== null}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0067A1] text-white font-bold text-xs rounded-xl hover:bg-[#004F7C] transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
                >
                  {actionLoading === "trigger_nudge" ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Bell className="w-3.5 h-3.5" />
                  )}
                  Send Reminder Nudge
                </button>
              </div>

              {/* Force Resolve */}
              <div className={`border rounded-2xl p-5 flex flex-col gap-4 ${isResolved ? "bg-slate-50 dark:bg-gray-750/30 border-slate-100 dark:border-gray-700" : "bg-emerald-50/50 dark:bg-emerald-950/15 border-emerald-100/50 dark:border-emerald-900/30"}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isResolved ? "bg-slate-100 dark:bg-gray-700" : "bg-emerald-100 dark:bg-emerald-900/30"}`}>
                    <CheckCheck className={`w-4 h-4 ${isResolved ? "text-slate-400" : "text-emerald-600 dark:text-emerald-400"}`} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Force Resolve</h4>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Manually close this consultation</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">
                  Permanently mark this appointment as RESOLVED. This is an irreversible medical override.
                </p>
                <button
                  onClick={() => handleAction("force_resolve")}
                  disabled={actionLoading !== null || isResolved}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
                >
                  {actionLoading === "force_resolve" ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCheck className="w-3.5 h-3.5" />
                  )}
                  {isResolved ? "Already Resolved" : "Mark as Resolved"}
                </button>
              </div>
            </div>

            {/* Warning Footer */}
            <div className="mx-6 mb-6 sm:mx-8 sm:mb-8 bg-amber-50/50 dark:bg-amber-950/15 border border-amber-100/50 dark:border-amber-900/30 rounded-2xl px-5 py-3 flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold">
                All interventions are permanently logged in the immutable audit trail and cannot be reversed.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
