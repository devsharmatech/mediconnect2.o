"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ClipboardList, Search, Phone, MapPin, Clock,
  Heart, Package, MessageSquare, Users, CheckCircle2,
  RefreshCw, Filter, ExternalLink, ShieldCheck
} from "lucide-react";
import PatientDetailModal from "@/components/partner/PatientDetailModal";

const STATUS_BADGES = {
  NEW: { label: "New Lead", color: "bg-blue-50 text-blue-700 border-blue-200" },
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

export default function AssignedLeadsPage() {
  const router = useRouter();

  const [partner, setPartner] = useState(null);
  const [leads, setLeads] = useState({ nursing: [], equipment: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'nursing' | 'equipment'
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const tab = new URLSearchParams(window.location.search).get("tab");
      if (tab && ["all", "nursing", "equipment"].includes(tab)) {
        setActiveTab(tab);
      }
    }
  }, []);

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
      toast.error("Network error");
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

  // Combined list based on tab
  const getListByTab = () => {
    if (activeTab === "nursing") return leads.nursing;
    if (activeTab === "equipment") return leads.equipment;
    return [...leads.nursing, ...leads.equipment].sort((a, b) => {
      const dateA = new Date(a.assigned_at || a.created_at || 0).getTime();
      const dateB = new Date(b.assigned_at || b.created_at || 0).getTime();
      return dateB - dateA;
    });
  };

  const rawList = getListByTab();

  const filtered = rawList.filter(l => {
    if (statusFilter !== "all" && l.lead_status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const reqStr = String(l.care_types || l.equipment_types || "");
    return (
      (l.name || "").toLowerCase().includes(q) ||
      (l.phone || "").includes(q) ||
      (l.city || "").toLowerCase().includes(q) ||
      (l.locality || "").toLowerCase().includes(q) ||
      (l.lead_id || "").toLowerCase().includes(q) ||
      reqStr.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-[#0067A1] flex items-center justify-center font-bold">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Assigned Leads Directory
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                All clinical nursing care and medical equipment patient requests allocated to your account
              </p>
            </div>
          </div>
        </div>

        {/* Tab Badges */}
        <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-white shadow-xs text-xs font-semibold">
          {[
            { key: "all", label: `All Leads (${leads.nursing.length + leads.equipment.length})` },
            { key: "nursing", label: `Nursing (${leads.nursing.length})` },
            { key: "equipment", label: `Equipment (${leads.equipment.length})` },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === t.key
                  ? "bg-[#0067A1] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient name, phone, city, requirement..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { key: "all", label: "All Status" },
            { key: "NEW", label: "New" },
            { key: "CONTACTED", label: "Contacted" },
            { key: "SERVICE_STARTED", label: "Active Service" },
            { key: "CLOSED", label: "Closed" },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                statusFilter === s.key
                  ? "bg-slate-900 text-white shadow-xs font-semibold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leads List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[#0067A1]" />
            <p className="text-xs">Loading assigned leads...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-base font-semibold text-slate-700">No Leads Found</p>
            <p className="text-xs text-slate-400 mt-1">
              {search || statusFilter !== "all"
                ? "Try clearing filters or search term"
                : "No leads are currently assigned in this category"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((lead) => {
              const isEquip = lead.type === "equipment" || !!lead.equipment_types;
              const statusCfg = STATUS_BADGES[lead.lead_status] || {
                label: lead.lead_status || "Assigned",
                color: "bg-slate-100 text-slate-700 border-slate-200",
              };
              const cleanPhone = String(lead.phone || "").replace(/\D/g, "").slice(-10);
              const requirement = isEquip
                ? (Array.isArray(lead.equipment_types) ? lead.equipment_types.join(", ") : lead.equipment_types || "Equipment")
                : (Array.isArray(lead.care_types) ? lead.care_types.join(", ") : lead.care_types || "Nursing Care");

              return (
                <div
                  key={`${lead.type}-${lead.lead_id}`}
                  className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Left: Lead Overview */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {lead.lead_id}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        isEquip ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-sky-50 text-[#0067A1] border-sky-200"
                      }`}>
                        {isEquip ? <Package className="w-3 h-3" /> : <Heart className="w-3 h-3" />}
                        <span>{isEquip ? "Equipment" : "Nursing Care"}</span>
                      </span>
                      <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </div>

                    <h3
                      className="text-base font-bold text-slate-900 hover:text-[#0067A1] cursor-pointer"
                      onClick={() => setSelectedLead(lead)}
                    >
                      {lead.name}
                    </h3>

                    {/* Metadata & Location ("Kaha se hai") */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs text-slate-600 pt-1">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Phone className="w-3.5 h-3.5 text-[#0067A1] shrink-0" />
                        <a href={`tel:${cleanPhone}`} className="hover:underline">
                          +91 {cleanPhone}
                        </a>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-600 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate" title={lead.address || lead.locality || lead.city}>
                          {[lead.locality, lead.city].filter(Boolean).join(", ") || "City not set"}
                        </span>
                      </div>

                      <div className="font-medium truncate text-slate-700">
                        Need: <span className="font-semibold">{requirement}</span>
                      </div>
                    </div>

                    {lead.notes && (
                      <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                        "{lead.notes}"
                      </p>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    {cleanPhone && (
                      <a
                        href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hello ${lead.name || ""}, this is regarding your request on MediConnect for ${requirement}. How can we assist you?`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}

                    <a
                      href={`tel:${cleanPhone}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call</span>
                    </a>

                    <button
                      onClick={() => setSelectedLead(lead)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0067A1] hover:bg-[#004F7C] rounded-lg transition-colors shadow-xs cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Patient Info</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Patient Detail Modal */}
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
