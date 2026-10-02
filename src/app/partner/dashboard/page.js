"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Heart, Package, Users, ClipboardList, Phone,
  MapPin, Clock, Search, ExternalLink, ArrowRight,
  CheckCircle2, AlertCircle, MessageSquare, ChevronRight,
  ShieldCheck, FileText, Activity
} from "lucide-react";
import PatientDetailModal from "@/components/partner/PatientDetailModal";

const STATUS_BADGES = {
  NEW: { label: "New", color: "bg-blue-50 text-blue-700 border-blue-200" },
  CONTACTED: { label: "Contacted", color: "bg-amber-50 text-amber-700 border-amber-200" },
  QUALIFIED: { label: "Qualified", color: "bg-purple-50 text-purple-700 border-purple-200" },
  SHARED_WITH_PARTNER: { label: "Assigned", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  SERVICE_STARTED: { label: "Active Service", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  NOT_CONVERTED: { label: "Not Converted", color: "bg-rose-50 text-rose-700 border-rose-200" },
  CLOSED: { label: "Completed", color: "bg-slate-100 text-slate-700 border-slate-200" },
};

function getPartner() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem("partnerUser") || "null"); } catch { return null; }
}

export default function PartnerDashboardPage() {
  const router = useRouter();
  const [partner, setPartner] = useState(null);
  const [leads, setLeads] = useState({ nursing: [], equipment: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState(null);

  useEffect(() => {
    const p = getPartner();
    if (!p) { router.replace("/partner/login"); return; }
    setPartner(p);
  }, [router]);

  const loadLeads = useCallback(async () => {
    const p = getPartner();
    if (!p) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/partner/leads?partner_id=${p.id}`);
      const data = await res.json();
      if (data.success) {
        setLeads({ nursing: data.data.nursing || [], equipment: data.data.equipment || [] });
      } else {
        toast.error("Failed to load leads");
      }
    } catch {
      toast.error("Network error while loading leads");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeads();
    const handleRefresh = () => loadLeads();
    window.addEventListener("partner-refresh-leads", handleRefresh);
    return () => window.removeEventListener("partner-refresh-leads", handleRefresh);
  }, [loadLeads]);

  const allLeads = [...leads.nursing, ...leads.equipment].sort((a, b) => {
    const dateA = new Date(a.assigned_at || a.created_at || 0).getTime();
    const dateB = new Date(b.assigned_at || b.created_at || 0).getTime();
    return dateB - dateA;
  });

  const totalLeads = allLeads.length;
  const equipmentCount = leads.equipment.length;
  const nursingCount = leads.nursing.length;
  const activeCount = allLeads.filter(l => l.lead_status === "SERVICE_STARTED").length;

  const filteredRecentLeads = allLeads.filter(l => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (l.name || "").toLowerCase().includes(q) ||
      (l.phone || "").includes(q) ||
      (l.city || "").toLowerCase().includes(q) ||
      (l.lead_id || "").toLowerCase().includes(q)
    );
  }).slice(0, 8);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#003358] via-[#004f7c] to-[#0067A1] rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-sky-200 mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Authorized Healthcare Service Partner</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome, {partner?.name || "Partner"} 👋
            </h2>
            <p className="text-sky-100 text-xs sm:text-sm mt-1 max-w-xl">
              Manage patient allocations, deliver medical equipment, deploy clinical nursing care, and update lead execution statuses in real time.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href="/partner/equipment-requests"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold bg-white text-[#003358] hover:bg-sky-50 rounded-xl transition-all shadow-sm"
            >
              <Package className="w-4 h-4 text-[#0067A1]" />
              <span>Equipment ({equipmentCount})</span>
            </Link>

            <Link
              href="/partner/assigned-leads"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl transition-all backdrop-blur-md"
            >
              <ClipboardList className="w-4 h-4 text-sky-300" />
              <span>All Leads ({totalLeads})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Leads */}
        <Link
          href="/partner/assigned-leads"
          className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:border-slate-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Leads Assigned</span>
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-[#0067A1]/10 group-hover:text-[#0067A1] transition-colors">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">{totalLeads}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            <span>View all leads</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </Link>

        {/* Equipment Requests */}
        <Link
          href="/partner/equipment-requests"
          className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:border-purple-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Equipment Requests</span>
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-purple-700 mt-2">{equipmentCount}</p>
          <p className="text-[11px] text-purple-600/70 mt-0.5 flex items-center gap-1">
            <span>Machines &amp; ICU setup</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </Link>

        {/* Home Nursing Leads */}
        <Link
          href="/partner/assigned-leads?tab=nursing"
          className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:border-sky-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Home Nursing Leads</span>
            <div className="w-9 h-9 rounded-lg bg-sky-50 text-[#0067A1] flex items-center justify-center group-hover:bg-sky-100 transition-colors">
              <Heart className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#0067A1] mt-2">{nursingCount}</p>
          <p className="text-[11px] text-[#0067A1]/70 mt-0.5 flex items-center gap-1">
            <span>In-home caregivers &amp; nurses</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </Link>

        {/* Active In-Service */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active In-Service</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-2">{activeCount}</p>
          <p className="text-[11px] text-emerald-700/70 mt-0.5">Currently active on ground</p>
        </div>
      </div>

      {/* Quick Access Menu Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/partner/equipment-requests"
          className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-[#0067A1] hover:shadow-md transition-all flex items-start justify-between group"
        >
          <div className="space-y-1">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-2">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-[#0067A1] transition-colors">
              Equipment Requests
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Fulfill patient requests for oxygen concentrators, hospital beds, BiPAP, and ICU setups.
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-[#0067A1] group-hover:translate-x-1 transition-all mt-1" />
        </Link>

        <Link
          href="/partner/assigned-leads"
          className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-[#0067A1] hover:shadow-md transition-all flex items-start justify-between group"
        >
          <div className="space-y-1">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-[#0067A1] flex items-center justify-center mb-2">
              <ClipboardList className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-[#0067A1] transition-colors">
              Assigned Leads Directory
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Track all clinical nursing and equipment leads, manage updates, and view status history.
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-[#0067A1] group-hover:translate-x-1 transition-all mt-1" />
        </Link>

        <Link
          href="/partner/patient-information"
          className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-[#0067A1] hover:shadow-md transition-all flex items-start justify-between group"
        >
          <div className="space-y-1">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-[#0067A1] transition-colors">
              Patient Information
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Find complete patient identity, delivery address, caregiver requirements, and Google Maps.
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-[#0067A1] group-hover:translate-x-1 transition-all mt-1" />
        </Link>
      </div>

      {/* Recent Assigned Leads Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        
        {/* Section Header with Search */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#0067A1]" />
              Recent Assigned Patient Leads
            </h3>
            <p className="text-xs text-slate-500">
              Showing your latest allocated patient leads. Click any lead to view full patient information &amp; update status.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient, phone, city..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1]"
              />
            </div>
            <Link
              href="/partner/assigned-leads"
              className="text-xs font-semibold text-[#0067A1] hover:underline whitespace-nowrap"
            >
              View All &rarr;
            </Link>
          </div>
        </div>

        {/* Leads Table / Cards */}
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-8 h-8 border-3 border-slate-200 border-t-[#0067A1] rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs">Loading patient leads...</p>
          </div>
        ) : filteredRecentLeads.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No Patient Leads Found</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {search ? "No leads matched your search query" : "You have no assigned leads at this time"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredRecentLeads.map((lead) => {
              const isEquip = lead.type === "equipment" || !!lead.equipment_types;
              const statusCfg = STATUS_BADGES[lead.lead_status] || {
                label: lead.lead_status || "Assigned",
                color: "bg-slate-100 text-slate-700 border-slate-200",
              };
              const cleanPhone = String(lead.phone || "").replace(/\D/g, "").slice(-10);

              return (
                <div
                  key={`${lead.type}-${lead.lead_id}`}
                  className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left: Patient & Requirement Info */}
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {lead.lead_id}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        isEquip ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-sky-50 text-[#0067A1] border-sky-200"
                      }`}>
                        {isEquip ? <Package className="w-3 h-3" /> : <Heart className="w-3 h-3" />}
                        <span>{isEquip ? "Equipment" : "Home Nursing"}</span>
                      </span>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-slate-900 hover:text-[#0067A1] cursor-pointer" onClick={() => setSelectedLead(lead)}>
                      {lead.name}
                    </h4>

                    {/* Patient Metadata (Kaha se hai & contact) */}
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600">
                      <div className="flex items-center gap-1 font-medium">
                        <Phone className="w-3.5 h-3.5 text-[#0067A1]" />
                        <a href={`tel:${cleanPhone}`} className="hover:underline">
                          +91 {cleanPhone}
                        </a>
                      </div>

                      <div className="flex items-center gap-1 text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{[lead.locality, lead.city].filter(Boolean).join(", ") || "City not set"}</span>
                      </div>

                      <div className="text-slate-500 font-medium">
                        Requirement: <strong className="text-slate-700">
                          {isEquip
                            ? (Array.isArray(lead.equipment_types) ? lead.equipment_types.join(", ") : lead.equipment_types || "Equipment")
                            : (Array.isArray(lead.care_types) ? lead.care_types.join(", ") : lead.care_types || "Nursing Care")}
                        </strong>
                      </div>
                    </div>

                    {lead.notes && (
                      <p className="text-xs text-slate-500 italic line-clamp-1">
                        "{lead.notes}"
                      </p>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                    {/* Quick WhatsApp */}
                    {cleanPhone && (
                      <a
                        href={`https://wa.me/91${cleanPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-200"
                        title="Chat on WhatsApp"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>
                    )}

                    {/* Quick Call */}
                    <a
                      href={`tel:${cleanPhone}`}
                      className="p-2 text-[#0067A1] hover:bg-sky-50 rounded-lg transition-colors border border-sky-200"
                      title="Call Patient"
                    >
                      <Phone className="w-4 h-4" />
                    </a>

                    {/* View Patient Details modal trigger */}
                    <button
                      onClick={() => setSelectedLead(lead)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0067A1] hover:bg-[#004F7C] rounded-lg transition-colors shadow-xs cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Patient Details</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Patient Information Modal */}
      {selectedLead && (
        <PatientDetailModal
          lead={selectedLead}
          partnerId={partner?.id}
          onClose={() => setSelectedLead(null)}
          onUpdated={() => loadLeads()}
        />
      )}
    </div>
  );
}
