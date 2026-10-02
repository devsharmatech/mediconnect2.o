"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Package, Search, Phone, MapPin, Clock, ExternalLink,
  MessageSquare, Users, CheckCircle2, AlertCircle,
  RefreshCw, Navigation, ShieldCheck
} from "lucide-react";
import PatientDetailModal from "@/components/partner/PatientDetailModal";

const STATUS_BADGES = {
  NEW: { label: "New Request", color: "bg-blue-50 text-blue-700 border-blue-200" },
  CONTACTED: { label: "Contacted Patient", color: "bg-amber-50 text-amber-700 border-amber-200" },
  QUALIFIED: { label: "Machine Verified", color: "bg-purple-50 text-purple-700 border-purple-200" },
  SHARED_WITH_PARTNER: { label: "Allocated", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  SERVICE_STARTED: { label: "Delivered & Active", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  NOT_CONVERTED: { label: "Cancelled", color: "bg-rose-50 text-rose-700 border-rose-200" },
  CLOSED: { label: "Returned / Closed", color: "bg-slate-100 text-slate-700 border-slate-200" },
};

function getPartner() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem("partnerUser") || "null"); } catch { return null; }
}

export default function EquipmentRequestsPage() {
  const router = useRouter();
  const [partner, setPartner] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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
      const res = await fetch(`/api/partner/leads?partner_id=${p.id}&type=equipment`);
      const data = await res.json();
      if (data.success) {
        setLeads(data.data.equipment || []);
      } else {
        toast.error("Failed to load equipment requests");
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

  const filtered = leads.filter(l => {
    if (statusFilter !== "all" && l.lead_status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const equipStr = Array.isArray(l.equipment_types) ? l.equipment_types.join(" ") : String(l.equipment_types || "");
    return (
      (l.name || "").toLowerCase().includes(q) ||
      (l.phone || "").includes(q) ||
      (l.city || "").toLowerCase().includes(q) ||
      (l.locality || "").toLowerCase().includes(q) ||
      (l.lead_id || "").toLowerCase().includes(q) ||
      equipStr.toLowerCase().includes(q)
    );
  });

  const activeCount = leads.filter(l => l.lead_status === "SERVICE_STARTED").length;
  const newCount = leads.filter(l => l.lead_status === "NEW" || l.lead_status === "SHARED_WITH_PARTNER").length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Top Banner / Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Medical Equipment Requests
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Patient orders for oxygen concentrators, hospital beds, ventilators, and ICU setups
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
            Total Orders: {leads.length}
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            Active Deliveries: {activeCount}
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient, device, city, address..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { key: "all", label: "All Requests" },
            { key: "NEW", label: `New (${newCount})` },
            { key: "CONTACTED", label: "Contacted" },
            { key: "SERVICE_STARTED", label: `Active (${activeCount})` },
            { key: "CLOSED", label: "Completed" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                statusFilter === f.key
                  ? "bg-[#0067A1] text-white shadow-xs font-semibold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Equipment Requests List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[#0067A1]" />
            <p className="text-xs">Loading equipment requests...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-base font-semibold text-slate-700">No Equipment Requests Found</p>
            <p className="text-xs text-slate-400 mt-1">
              {search || statusFilter !== "all"
                ? "Try clearing your filters or search keyword"
                : "No equipment requests have been allocated to your partner account yet"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((lead) => {
              const statusCfg = STATUS_BADGES[lead.lead_status] || {
                label: lead.lead_status || "New",
                color: "bg-slate-100 text-slate-700 border-slate-200",
              };
              const cleanPhone = String(lead.phone || "").replace(/\D/g, "").slice(-10);
              const devices = Array.isArray(lead.equipment_types)
                ? lead.equipment_types.join(", ")
                : lead.equipment_types || "Medical Equipment";

              return (
                <div
                  key={lead.lead_id}
                  className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Left: Device & Patient Info */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {lead.lead_id}
                      </span>
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                      {lead.duration && (
                        <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          Duration: {lead.duration}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3
                        className="text-base font-bold text-slate-900 hover:text-[#0067A1] cursor-pointer inline-flex items-center gap-2"
                        onClick={() => setSelectedLead(lead)}
                      >
                        {lead.name}
                      </h3>
                      <p className="text-sm font-semibold text-purple-700 mt-0.5">
                        📦 {devices}
                      </p>
                    </div>

                    {/* Location & Contact Grid ("Kaha se hai") */}
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

                      {lead.assigned_at && (
                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Assigned {new Date(lead.assigned_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
                        </div>
                      )}
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
                        href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hello ${lead.name || ""}, regarding your request on MediConnect for ${devices}, we are processing your delivery.`)}`}
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
