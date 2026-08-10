"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Search, Eye, RefreshCw, ChevronLeft, ChevronRight,
  X, Shield, Star, Loader2, CheckCircle, IndianRupee
} from "lucide-react";

const STATUS_COLORS = {
  true: "bg-green-100 text-green-700",
  false: "bg-red-100 text-red-700",
  active: "bg-green-100 text-green-700",
  inactive: "bg-red-100 text-red-700",
};

const POLICY_TYPES = [
  { value: "", label: "All Types" },
  { value: "individual", label: "Individual" },
  { value: "family", label: "Family" },
  { value: "senior_citizen", label: "Senior Citizen" },
  { value: "critical_illness", label: "Critical Illness" },
  { value: "top_up", label: "Top-Up" },
  { value: "super_top_up", label: "Super Top-Up" },
  { value: "maternity", label: "Maternity" },
  { value: "group", label: "Group" },
];

export default function StaffInsurancePage() {
  const [activeTab, setActiveTab] = useState("policies");
  const [providers, setProviders] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [pagination, setPagination] = useState({
    currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10
  });

  const fetchProviders = async () => {
    try {
      const res = await fetch("/api/insurance/providers");
      const data = await res.json();
      if (data.success) setProviders(data.data.providers || []);
    } catch { /* ignore */ }
  };

  const fetchPolicies = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(), limit: "10",
        ...(searchTerm && { search: searchTerm }),
        ...(typeFilter && { type: typeFilter }),
        ...(providerFilter && { provider_id: providerFilter }),
      });
      const res = await fetch(`/api/insurance/policies?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to load");
      setPolicies(data.data.policies || []);
      const pg = data.data.pagination || {};
      setPagination({
        currentPage: pg.page || 1,
        totalPages: pg.totalPages || 1,
        totalItems: pg.total || 0,
        itemsPerPage: pg.limit || 10,
      });
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProviders(); }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchPolicies(1), 400);
    return () => clearTimeout(t);
  }, [searchTerm, typeFilter, providerFilter]);

  const formatCurrency = (v) => {
    if (!v) return "—";
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
  };

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#0067A1]" /> Insurance
          </h1>
          <p className="text-sm text-gray-500 mt-1">View providers and policies</p>
        </div>
        <button onClick={() => { fetchProviders(); fetchPolicies(pagination.currentPage); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#0067A1] text-white rounded-xl hover:bg-[#004F7C] cursor-pointer">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[{ key: "policies", label: "Policies" }, { key: "providers", label: "Providers" }].map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${activeTab === tab.key ? "bg-[#0067A1] text-white shadow-md" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Policies Tab */}
      {activeTab === "policies" && (
        <>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by policy name..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30" />
              </div>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm">
                {POLICY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm">
                <option value="">All Providers</option>
                {providers.map(p => <option key={p.id} value={p.id}>{p.provider_name}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" /> Loading...</div>
            ) : policies.length === 0 ? (
              <div className="p-12 text-center text-gray-400">No policies found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Policy</th>
                      <th className="text-left px-4 py-3 font-medium">Provider</th>
                      <th className="text-left px-4 py-3 font-medium">Coverage</th>
                      <th className="text-left px-4 py-3 font-medium">Premium</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-left px-4 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {policies.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{p.policy_name || "—"}</p>
                          <p className="text-xs text-gray-400 capitalize">{p.policy_type?.replace(/_/g, " ") || ""} • {formatCurrency(p.sum_insured)}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{p.health_insurance_providers?.provider_name || p.provider_name || "—"}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {p.min_age && p.max_age ? `${p.min_age}-${p.max_age} yrs` : "—"}
                          {p.cashless_facility && <span className="ml-1 text-green-600">• Cashless</span>}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{formatCurrency(p.premium_amount)}<span className="text-xs text-gray-400">/{p.premium_type || "yr"}</span></td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {p.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => setViewItem({ ...p, _type: "policy" })}
                            className="p-2 bg-[#0067A1]/10 text-[#0067A1] rounded-lg hover:bg-[#0067A1]/20 cursor-pointer"><Eye className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalItems} total)</p>
                <div className="flex gap-2">
                  <button disabled={pagination.currentPage <= 1} onClick={() => fetchPolicies(pagination.currentPage - 1)}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
                  <button disabled={pagination.currentPage >= pagination.totalPages} onClick={() => fetchPolicies(pagination.currentPage + 1)}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Providers Tab */}
      {activeTab === "providers" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.length === 0 ? (
            <div className="col-span-full p-12 text-center text-gray-400 bg-white rounded-xl border border-gray-200">No providers found.</div>
          ) : providers.map((prov) => (
            <div key={prov.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {prov.logo_url ? (
                    <img src={prov.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#0067A1]/10 flex items-center justify-center"><Shield className="w-5 h-5 text-[#0067A1]" /></div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-800">{prov.provider_name}</p>
                    <div className="flex items-center gap-1 text-xs text-amber-500">
                      <Star className="w-3 h-3 fill-current" /> {prov.rating || "—"} <span className="text-gray-400">({prov.total_reviews || 0} reviews)</span>
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${prov.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {prov.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-xs text-gray-500 line-clamp-2 mb-3">{prov.description || "No description"}</p>
              <div className="space-y-1 text-xs text-gray-500">
                <p>{prov.contact_email}</p>
                <p>{prov.contact_phone}</p>
                {prov.website_url && <p className="text-[#0067A1] truncate">{prov.website_url}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Policy Detail Modal */}
      <AnimatePresence>
        {viewItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setViewItem(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-800">Policy Details</h2>
                <button onClick={() => setViewItem(null)} className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div><p className="text-xs text-gray-400">Policy Name</p><p className="text-sm font-medium text-gray-800">{viewItem.policy_name || "—"}</p></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-gray-400">Type</p><p className="text-sm text-gray-800 capitalize">{viewItem.policy_type?.replace(/_/g, " ") || "—"}</p></div>
                  <div><p className="text-xs text-gray-400">Provider</p><p className="text-sm text-gray-800">{viewItem.health_insurance_providers?.provider_name || "—"}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-gray-400">Sum Insured</p><p className="text-sm font-semibold text-gray-800">{formatCurrency(viewItem.sum_insured)}</p></div>
                  <div><p className="text-xs text-gray-400">Premium</p><p className="text-sm font-semibold text-gray-800">{formatCurrency(viewItem.premium_amount)} <span className="text-xs text-gray-400">/{viewItem.premium_type || "yr"}</span></p></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-gray-400">Age Range</p><p className="text-sm text-gray-800">{viewItem.min_age}–{viewItem.max_age} yrs</p></div>
                  <div><p className="text-xs text-gray-400">Waiting Period</p><p className="text-sm text-gray-800">{viewItem.waiting_period || "—"}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-gray-400">Cashless</p><p className="text-sm text-gray-800">{viewItem.cashless_facility ? "Yes" : "No"}</p></div>
                  <div><p className="text-xs text-gray-400">Co-Payment</p><p className="text-sm text-gray-800">{viewItem.co_payment || "—"}</p></div>
                </div>
                <div><p className="text-xs text-gray-400">Claim Settlement Ratio</p><p className="text-sm text-gray-800">{viewItem.claim_settlement_ratio ? `${viewItem.claim_settlement_ratio}%` : "—"}</p></div>
                {viewItem.description && (
                  <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-400 mb-1">Description</p><p className="text-sm text-gray-700">{viewItem.description}</p></div>
                )}
                {viewItem.features && viewItem.features.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Features</p>
                    <div className="flex flex-wrap gap-1.5">
                      {viewItem.features.map((f, i) => (
                        <span key={i} className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {viewItem.exclusions && viewItem.exclusions.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Exclusions</p>
                    <div className="flex flex-wrap gap-1.5">
                      {viewItem.exclusions.map((e, i) => (
                        <span key={i} className="px-2 py-1 bg-red-50 text-red-600 rounded-full text-xs">{e}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
