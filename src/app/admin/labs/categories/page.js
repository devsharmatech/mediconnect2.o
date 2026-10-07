"use client";

import { useState, useEffect } from "react";
import { 
  Percent, 
  ShieldCheck, 
  Layers, 
  Microscope, 
  Edit3, 
  Check, 
  X, 
  ExternalLink, 
  TrendingUp, 
  Coins, 
  Lock, 
  Info, 
  Sparkles, 
  RefreshCw,
  Calculator,
  ChevronRight,
  Database
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

export default function AdminLabCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Modal State
  const [selectedCat, setSelectedCat] = useState(null);
  const [editCommission, setEditCommission] = useState("");
  const [saving, setSaving] = useState(false);

  // Interactive Calculator Simulation State
  const [samplePrice, setSamplePrice] = useState(1000);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await fetch("/api/admin/labs/categories");
      const result = await response.json();
      if (result.success) {
        setCategories(result.data || []);
      } else {
        toast.error(result.message || "Failed to load categories");
      }
    } catch (error) {
      toast.error("Failed to fetch commission categories");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleOpenEdit = (cat) => {
    setSelectedCat(cat);
    setEditCommission(parseFloat(cat.commission_percentage || 0).toString());
  };

  const handleSaveCommission = async (e) => {
    e.preventDefault();
    if (!selectedCat) return;

    const numPct = parseFloat(editCommission);
    if (isNaN(numPct) || numPct < 0 || numPct > 100) {
      toast.error("Please enter a valid percentage between 0 and 100");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/labs/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedCat.id,
          commission_percentage: numPct,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Commission for ${selectedCat.name} updated to ${numPct}%!`);
        setSelectedCat(null);
        fetchCategories();
      } else {
        toast.error(data.message || data.error || "Failed to update commission");
      }
    } catch (err) {
      toast.error("An error occurred while saving commission");
    } finally {
      setSaving(false);
    }
  };

  // Badge styling matching theme
  const getTierTheme = (name) => {
    if (name.includes("1")) {
      return {
        badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
        accentText: "text-emerald-600 dark:text-emerald-400",
        tag: "Tier 1 — High Yield"
      };
    }
    if (name.includes("2")) {
      return {
        badgeBg: "bg-[#0067A1]/10 text-[#0067A1] border-[#0067A1]/20 dark:bg-[#0067A1]/20 dark:text-sky-300 dark:border-[#0067A1]/40",
        accentText: "text-[#0067A1] dark:text-sky-400",
        tag: "Tier 2 — Standard"
      };
    }
    if (name.includes("3")) {
      return {
        badgeBg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
        accentText: "text-amber-600 dark:text-amber-400",
        tag: "Tier 3 — High Volume"
      };
    }
    if (name.includes("4")) {
      return {
        badgeBg: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800",
        accentText: "text-rose-600 dark:text-rose-400",
        tag: "Tier 4 — Specialized"
      };
    }
    return {
      badgeBg: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800",
      accentText: "text-purple-600 dark:text-purple-400",
      tag: "All Test Packages"
    };
  };

  return (
    <div className="p-5 mt-10 w-full mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Section - Matches Other Admin Pages */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-3 bg-[#0067A1] rounded-2xl shadow-sm shadow-[#0067A1]/20">
              <Coins className="w-8 h-8 text-white" />
            </div>
            Commission Categories & Tiers
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
            Internal system commission classification for lab tests and partner payouts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => fetchCategories(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-50 dark:hover:bg-gray-750 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={18} className={refreshing ? "animate-spin text-[#0067A1]" : ""} />
            <span>{refreshing ? "Refreshing..." : "Sync Rates"}</span>
          </button>
          <Link
            href="/admin/cms/lab-tests"
            className="flex items-center gap-2 px-6 py-2.5 bg-[#0067A1] text-white rounded-xl font-bold hover:bg-[#0067A1]/90 transition-all shadow-sm shadow-[#0067A1]/20"
          >
            <Microscope size={18} />
            <span>View All Tests Catalog</span>
          </Link>
        </div>
      </div>

      {/* Internal Confidentiality Notice - Theme-aligned */}
      <div className="p-4 rounded-2xl bg-[#0067A1]/5 dark:bg-[#0067A1]/10 border border-[#0067A1]/20 flex items-start gap-3">
        <div className="p-2 rounded-xl bg-[#0067A1]/10 text-[#0067A1] shrink-0 mt-0.5">
          <Lock className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0067A1] dark:text-sky-300">
              CONFIDENTIAL • INTERNAL SYSTEM COMMISSION CALCULATION ONLY
            </span>
          </div>
          <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            These categories (<strong>Category 1, Category 2, Category 3, Category 4, All Test Packages</strong>) are exclusively used by the backend system to compute platform revenue and partner payouts. <strong>They are never shown to patients or visitors anywhere on the public site.</strong>
          </p>
        </div>
      </div>

      {/* Stats Quick View - Same as other pages */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            label: "Commission Tiers", 
            value: `${categories.length} Tiers`, 
            subtext: "Cat 1, 2, 3, 4 & Packages", 
            icon: Layers, 
            color: "text-[#0067A1] bg-[#0067A1]/10" 
          },
          { 
            label: "Catalog Tests Linked", 
            value: "1,453 Tests", 
            subtext: "5,812 instances across 4 labs", 
            icon: Database, 
            color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" 
          },
          { 
            label: "Commission Range", 
            value: "5% — 50%", 
            subtext: "Admin editable dynamically", 
            icon: Percent, 
            color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40" 
          },
          { 
            label: "Patient Privacy", 
            value: "100% Isolated", 
            subtext: "Hidden from public side", 
            icon: ShieldCheck, 
            color: "text-sky-600 bg-sky-50 dark:bg-sky-950/40" 
          },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{stat.subtext}</p>
              </div>
              <div className={`p-3 rounded-2xl ${stat.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Commission Categories Table */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#0067A1]" />
              Configured Commission Tiers ({categories.length})
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Admin / system commission percentage taken on each test order
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                <th className="px-6 py-4 text-sm font-bold text-gray-400 capitalize tracking-wider w-16">S.No</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-400 capitalize tracking-wider">Category / Tier</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-400 capitalize tracking-wider">System Commission</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-400 capitalize tracking-wider">Lab Payout Share</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-400 capitalize tracking-wider">Linked Tests</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-400 capitalize tracking-wider">MRP Range</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-400 capitalize tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="7" className="px-6 py-6">
                      <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500 italic">
                    No categories found
                  </td>
                </tr>
              ) : (
                categories.map((cat, index) => {
                  const theme = getTierTheme(cat.name);
                  const pct = parseFloat(cat.commission_percentage || 0);
                  const partnerPct = (100 - pct).toFixed(1);

                  return (
                    <tr 
                      key={cat.id} 
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors group"
                    >
                      <td className="px-6 py-4 text-base font-bold text-gray-400">
                        {index + 1}
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 dark:text-white text-base">
                              {cat.name}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${theme.badgeBg}`}>
                              {theme.tag}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 font-mono">
                            slug: {cat.slug}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-extrabold text-lg">
                          <span>{pct}%</span>
                          <span className="text-xs font-semibold text-emerald-600/70">Cut</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-base font-bold text-gray-700 dark:text-gray-300">
                          {partnerPct}%
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                            {cat.tests_count || 0}
                          </span>
                          <span className="text-xs text-gray-400">
                            tests
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {cat.min_price > 0 ? `₹${cat.min_price} — ₹${cat.max_price}` : "Packages / Custom"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/cms/lab-tests?category=${encodeURIComponent(cat.name)}`}
                            className="p-2 text-gray-500 hover:text-[#0067A1] hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                            title="View tests in this category"
                          >
                            <ExternalLink size={18} />
                          </Link>
                          <button
                            onClick={() => handleOpenEdit(cat)}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0067A1] text-white rounded-lg text-xs font-bold hover:bg-[#0067A1]/90 transition-all shadow-sm shadow-[#0067A1]/20"
                          >
                            <Edit3 size={14} />
                            <span>Edit Rate</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Commission Simulator */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#0067A1]/10 text-[#0067A1]">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Live Commission Payout Simulator
              </h3>
              <p className="text-xs text-gray-500">
                Simulate how test revenue is split between Admin Commission and Lab Partner Payout.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="test-mrp-input" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Test Price:
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold">₹</span>
              <input
                id="test-mrp-input"
                type="number"
                value={samplePrice}
                onChange={(e) => setSamplePrice(Math.max(0, Number(e.target.value)))}
                className="w-32 pl-7 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0067A1]"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          {categories.map((cat) => {
            const pct = parseFloat(cat.commission_percentage || 0);
            const adminCut = ((samplePrice * pct) / 100).toFixed(0);
            const labCut = (samplePrice - adminCut).toFixed(0);

            return (
              <div
                key={cat.id}
                className="p-4 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/40 text-center space-y-1.5"
              >
                <div className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                  {cat.name} ({pct}%)
                </div>
                <div className="text-base font-extrabold text-[#0067A1] dark:text-sky-400">
                  +₹{adminCut} <span className="text-[11px] font-normal text-gray-400">Admin Cut</span>
                </div>
                <div className="text-xs font-semibold text-gray-500">
                  ₹{labCut} <span className="text-[10px] text-gray-400">Lab Payout</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Commission Modal - Theme Aligned */}
      {selectedCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedCat(null)}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-[#0067A1]/10 text-[#0067A1]">
                <Percent className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Edit Commission Percentage
                </h3>
                <p className="text-xs text-gray-500">
                  Updating {selectedCat.name}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveCommission} className="space-y-5">
              <div>
                <label htmlFor="commission-rate-input" className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  System Commission (%)
                </label>
                <div className="relative">
                  <input
                    id="commission-rate-input"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={editCommission}
                    onChange={(e) => setEditCommission(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-bold text-xl focus:outline-none focus:ring-2 focus:ring-[#0067A1]"
                    placeholder="e.g. 50"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-lg">
                    %
                  </span>
                </div>
              </div>

              {/* Dynamic preview */}
              {!isNaN(parseFloat(editCommission)) && (
                <div className="p-4 rounded-2xl bg-[#0067A1]/5 border border-[#0067A1]/20 text-xs space-y-2">
                  <div className="font-bold text-[#003358] dark:text-sky-200 flex items-center justify-between">
                    <span>Example ₹1,000 Order</span>
                    <span className="font-mono">{editCommission}% Cut</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                    <span>Admin Platform Cut:</span>
                    <span className="font-bold text-[#0067A1]">₹{((1000 * parseFloat(editCommission || 0)) / 100).toFixed(1)}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                    <span>Lab Partner Payout:</span>
                    <span className="font-bold text-gray-900 dark:text-white">₹{(1000 - (1000 * parseFloat(editCommission || 0)) / 100).toFixed(1)}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCat(null)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-[#0067A1] hover:bg-[#0067A1]/90 transition-all shadow-sm shadow-[#0067A1]/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Commission</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
