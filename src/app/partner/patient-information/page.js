"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Users, Search, Phone, MapPin, Mail, ExternalLink,
  MessageSquare, Heart, Package, Navigation, Clock,
  CheckCircle2, AlertCircle, ShieldCheck, RefreshCw
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

export default function PatientInformationPage() {
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
        toast.error("Failed to load patient records");
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

  const allPatients = [...leads.nursing, ...leads.equipment].sort((a, b) => {
    const dateA = new Date(a.assigned_at || a.created_at || 0).getTime();
    const dateB = new Date(b.assigned_at || b.created_at || 0).getTime();
    return dateB - dateA;
  });

  const filtered = allPatients.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const reqStr = String(l.care_types || l.equipment_types || "");
    const addressStr = [l.address, l.locality, l.city, l.state, l.pincode].filter(Boolean).join(" ");

    return (
      (l.name || "").toLowerCase().includes(q) ||
      (l.phone || "").includes(q) ||
      (l.email || "").toLowerCase().includes(q) ||
      (l.lead_id || "").toLowerCase().includes(q) ||
      addressStr.toLowerCase().includes(q) ||
      reqStr.toLowerCase().includes(q)
    );
  });

  const distinctCities = Array.from(new Set(allPatients.map(p => p.city).filter(Boolean)));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Patient Information &amp; Geography
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Detailed directory of patient identities ("Kon Hai"), exact delivery locations ("Kaha Se Hai"), and clinical requirements
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            Total Patients: {allPatients.length}
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200">
            Service Cities: {distinctCities.length || 1}
          </span>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-sm flex items-center justify-between">
        <div className="relative flex-1 max-w-lg">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient name, phone, city, street, or requirement..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1]"
          />
        </div>

        <span className="text-xs text-slate-400 hidden sm:inline">
          Showing {filtered.length} of {allPatients.length} records
        </span>
      </div>

      {/* Patients Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[#0067A1]" />
          <p className="text-xs">Loading patient records...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="text-base font-semibold text-slate-700">No Patient Records Found</p>
          <p className="text-xs text-slate-400 mt-1">
            {search ? "Try adjusting your search criteria" : "No patient leads have been assigned yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((patient) => {
            const isEquip = patient.type === "equipment" || !!patient.equipment_types;
            const statusCfg = STATUS_BADGES[patient.lead_status] || {
              label: patient.lead_status || "Assigned",
              color: "bg-slate-100 text-slate-700 border-slate-200",
            };
            const cleanPhone = String(patient.phone || "").replace(/\D/g, "").slice(-10);

            const requirement = isEquip
              ? (Array.isArray(patient.equipment_types) ? patient.equipment_types.join(", ") : patient.equipment_types || "Equipment")
              : (Array.isArray(patient.care_types) ? patient.care_types.join(", ") : patient.care_types || "Nursing Care");

            const fullAddress = [
              patient.address,
              patient.locality,
              patient.city,
              patient.state,
              patient.pincode,
            ].filter(Boolean).join(", ");

            const mapQuery = encodeURIComponent(fullAddress || patient.city || "India");

            return (
              <div
                key={`${patient.type}-${patient.lead_id}`}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
              >
                {/* Header: Name, Lead ID, and Type */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {patient.lead_id}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        isEquip ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-sky-50 text-[#0067A1] border-sky-200"
                      }`}>
                        {isEquip ? <Package className="w-3 h-3" /> : <Heart className="w-3 h-3" />}
                        <span>{isEquip ? "Equipment" : "Nursing Care"}</span>
                      </span>
                    </div>

                    <h3
                      className="text-base font-bold text-slate-900 hover:text-[#0067A1] cursor-pointer mt-1"
                      onClick={() => setSelectedLead(patient)}
                    >
                      {patient.name}
                    </h3>
                  </div>

                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shrink-0 ${statusCfg.color}`}>
                    {statusCfg.label}
                  </span>
                </div>

                {/* Patient Information Sections */}
                <div className="space-y-3 text-xs">
                  {/* Kon Hai (Contact) */}
                  <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Patient Contact (Kon Hai)
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-slate-700 pt-0.5">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Phone className="w-3.5 h-3.5 text-[#0067A1]" />
                        <a href={`tel:${cleanPhone}`} className="hover:underline">
                          +91 {cleanPhone}
                        </a>
                      </div>
                      {patient.email && (
                        <div className="flex items-center gap-1.5 text-slate-500 truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{patient.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Kaha Se Hai (Address & Google Maps) */}
                  <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Patient Address &amp; Area (Kaha Se Hai)
                      </p>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[#0067A1] hover:underline font-semibold inline-flex items-center gap-1"
                      >
                        <Navigation className="w-3 h-3" />
                        <span>Maps</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>

                    <div className="text-slate-800 font-medium pt-0.5">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <p className="leading-snug">
                          {fullAddress || "City and address to be confirmed with patient"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Requirement Details */}
                  <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Requirement Details
                    </p>
                    <p className="text-sm font-semibold text-slate-900 pt-0.5">
                      {requirement}
                    </p>
                    {patient.notes && (
                      <p className="text-slate-600 italic text-xs pt-0.5">
                        "{patient.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {cleanPhone && (
                      <a
                        href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hello ${patient.name || ""}, regarding your request on MediConnect for ${requirement}, our partner team is ready to serve you.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}

                    <a
                      href={`tel:${cleanPhone}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call</span>
                    </a>
                  </div>

                  <button
                    onClick={() => setSelectedLead(patient)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0067A1] hover:bg-[#004F7C] rounded-lg transition-colors shadow-xs cursor-pointer"
                  >
                    <span>Full Profile &amp; Status</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
