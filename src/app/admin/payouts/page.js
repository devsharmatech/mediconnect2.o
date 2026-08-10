"use client";
import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { RefreshCw, Wallet, CheckCircle2, Clock } from "lucide-react";

function StatCard({ label, value, sub, highlight }) {
  return (
    <div className={`rounded-2xl p-5 border shadow-sm ${highlight ? "bg-[#0067A1] border-[#0067A1] text-white" : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700"}`}>
      <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${highlight ? "text-emerald-200" : "text-gray-400"}`}>{label}</p>
      <p className={`text-2xl font-black ${highlight ? "text-white" : "text-gray-800 dark:text-gray-200"}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${highlight ? "text-emerald-200" : "text-gray-400"}`}>{sub}</p>}
    </div>
  );
}

const formatUserUnId = (unId, role) => {
  if (!unId && unId !== 0) return "No UNID";
  const clean = String(unId).toUpperCase().trim();
  
  let prefix = "MEDP";
  if (role) {
    const r = String(role).toLowerCase();
    if (r === "doctor" || r === "provider") prefix = "MEDD";
    else if (r === "chemist") prefix = "MEDC";
    else if (r === "lab") prefix = "MEDL";
    else if (r === "admin") prefix = "MEDA";
  }
  
  if (clean.startsWith("MED")) return clean;
  if (/^\d+$/.test(clean)) {
    return `${prefix}${clean.padStart(2, "0")}`;
  }
  return `${prefix}${clean}`;
};

export default function PayoutsPage() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus]   = useState("");
  const [page, setPage]       = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [razorpayPayoutId, setRazorpayPayoutId] = useState("");
  const [settlementReason, setSettlementReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const p   = new URLSearchParams({ page, limit: 20, ...(status && { status }) });
      const res = await fetch(`/api/admin/payouts?${p}`);
      const json = await res.json();
      if (json.success) setData(json.data);
      else throw new Error(json.message);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [page, status]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const handleOpenSettleModal = (payout) => {
    setSelectedPayout(payout);
    setRazorpayPayoutId("");
    setSettlementReason("Razorpay payout processed successfully.");
    setIsModalOpen(true);
  };

  const handleSettleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPayout) return;
    if (!settlementReason.trim()) {
      toast.error("Please enter a settlement reason");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/payouts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payout_id: selectedPayout.id,
          razorpay_payout_id: razorpayPayoutId.trim() || null,
          admin_id: "admin",
          reason: settlementReason.trim()
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Payout settled successfully!");
        setIsModalOpen(false);
        fetch_();
      } else {
        throw new Error(json.message);
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex-1 overflow-auto">
      <div className="p-2 md:p-4 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#0067A1] rounded-xl shadow-sm shadow-[#0067A1]/20"><Wallet className="text-white w-6 h-6"/></div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-800 dark:text-gray-200">Provider Payout Ledger</h1>
              <p className="text-sm text-gray-500">Doctor commission payouts — 10% platform fee deducted</p>
            </div>
          </div>
          <button onClick={fetch_} className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"><RefreshCw size={16}/></button>
        </div>

        {/* Summary */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Pending Count"    value={data.summary.pending_count}  />
            <StatCard label="Total Pending"    value={`₹${(data.summary.total_pending||0).toLocaleString("en-IN",{maximumFractionDigits:0})}`} />
            <StatCard label="Total Settled"    value={`₹${(data.summary.total_settled||0).toLocaleString("en-IN",{maximumFractionDigits:0})}`} highlight />
            <StatCard label="Platform Fees"    value={`₹${(data.summary.total_platform_fees||0).toLocaleString("en-IN",{maximumFractionDigits:0})}`} />
            <StatCard label="Settled Count"    value={data.summary.settled_count}  />
          </div>
        )}

        {/* Platform fee note */}
        <div className="bg-[#0067A1]/5 border border-[#0067A1]/20 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 size={18} className="text-[#0067A1] flex-shrink-0"/>
          <p className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-[#0067A1]">Platform Fee: 10%</span> — Net payout = Gross amount × 0.90. Settle pending payouts after Razorpay fund transfer.</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {["","PENDING","SETTLED"].map(s=>(
            <button key={s} onClick={()=>{setStatus(s);setPage(1);}} className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${status===s?"bg-[#0067A1] text-white border-[#0067A1]":"bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-500"}`}>
              {s||"All"}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#0067A1] border-t-transparent rounded-full animate-spin"/></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>{["Date","Provider ID","Episode ID","Gross","Platform Fee","Net Payout","Status","Action"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {!data?.items ? (
                  <tr><td colSpan={8} className="py-12 text-center text-gray-400">Loading payouts...</td></tr>
                ) : data.items.length === 0 ? (
                  <tr><td colSpan={8} className="py-12 text-center text-gray-400">No payouts found</td></tr>
                ) : (
                  data.items.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                        {formatUserUnId(item.provider_un_id, item.provider_role)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {item.care_episode_id ? `${item.care_episode_id.slice(0, 12)}…` : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-semibold">
                        ₹{Number(item.gross_amount || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-orange-600 font-semibold">
                        ₹{Number(item.platform_fee || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 font-black text-[#0067A1] dark:text-[#0080C6]">
                        ₹{Number(item.net_payout || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3">
                        {item.status === "SETTLED" ? (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-green-50 text-green-700 border border-green-200 w-fit">
                            <CheckCircle2 size={11} />Settled
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-yellow-50 text-yellow-700 border border-yellow-200 w-fit">
                            <Clock size={11} />Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {item.status === "PENDING" && (
                          <button
                            onClick={() => handleOpenSettleModal(item)}
                            className="px-3 py-1.5 bg-[#0067A1] text-white rounded-md text-xs font-bold hover:bg-[#073834] transition-all"
                          >
                            Settle
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
          {data?.pagination && (
            <div className="px-4 py-3 border-t border-gray-50 dark:border-gray-700 flex items-center justify-between">
              <p className="text-xs text-gray-400">{data.pagination.total} total records</p>
              <div className="flex gap-2">
                <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 rounded-md border border-gray-200 dark:border-gray-600 text-xs disabled:opacity-30">Prev</button>
                <span className="px-3 py-1 text-xs text-gray-500">Page {page} / {data.pagination.totalPages||1}</span>
                <button disabled={page>=data.pagination.totalPages} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 rounded-md border border-gray-200 dark:border-gray-600 text-xs disabled:opacity-30">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settlement Details Custom Modal */}
      {isModalOpen && selectedPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fadeIn">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-md overflow-hidden transform scale-100 transition-all duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0067A1] to-[#126b64] text-white px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg leading-tight">Settle Payout</h3>
                  <p className="text-emerald-100 text-xs mt-0.5">Settle commission logs manually</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white transition-colors p-1 bg-white/5 rounded-lg hover:bg-white/10"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content Form */}
            <form onSubmit={handleSettleSubmit} className="p-6 space-y-5">
              {/* Info Grid */}
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-gray-400 font-bold uppercase tracking-wider">Provider ID</p>
                  <p className="font-mono text-gray-700 dark:text-gray-200 mt-1 font-semibold">
                    {formatUserUnId(selectedPayout.provider_un_id, selectedPayout.provider_role)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 font-bold uppercase tracking-wider">Net Payout</p>
                  <p className="text-emerald-600 dark:text-emerald-400 font-black text-sm mt-0.5">
                    ₹{Number(selectedPayout.net_payout || 0).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {/* Form Inputs */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Razorpay Payout ID <span className="text-gray-400 font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. pout_FP7u8y78d"
                    value={razorpayPayoutId}
                    onChange={(e) => setRazorpayPayoutId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0067A1]/50 focus:border-[#0067A1] transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Settlement Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Provide a clear description of this payout settlement..."
                    value={settlementReason}
                    onChange={(e) => setSettlementReason(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0067A1]/50 focus:border-[#0067A1] transition-all"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 rounded-lg text-sm font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-[#0067A1] hover:bg-[#073834] text-white rounded-lg text-sm font-bold transition-all shadow-md shadow-[#0067A1]/10 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : null}
                  {submitting ? "Settling..." : "Confirm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
