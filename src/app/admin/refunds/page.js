"use client";
import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { RefreshCw, IndianRupee, Plus, X, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";

const STATUS_CONFIG = {
  PENDING:    { label: "Pending",    cls: "bg-yellow-50 text-yellow-700 border-yellow-200",  icon: Clock },
  PROCESSING: { label: "Processing", cls: "bg-blue-50 text-[#004F7C] border-blue-200",        icon: AlertCircle },
  COMPLETED:  { label: "Completed",  cls: "bg-green-50 text-green-700 border-green-200",     icon: CheckCircle2 },
  FAILED:     { label: "Failed",     cls: "bg-red-50 text-red-700 border-red-200",           icon: XCircle },
};

function StatCard({ label, value, sub, highlight }) {
  return (
    <div className={`rounded-2xl p-5 border shadow-sm ${highlight ? "bg-[#0067A1] border-[#0067A1] text-white" : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700"}`}>
      <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${highlight ? "text-emerald-200" : "text-gray-400"}`}>{label}</p>
      <p className={`text-2xl font-black ${highlight ? "text-white" : "text-gray-800 dark:text-gray-200"}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${highlight ? "text-emerald-200" : "text-gray-400"}`}>{sub}</p>}
    </div>
  );
}

const formatPatientUnId = (unId) => {
  if (!unId && unId !== 0) return "No UNID";
  const clean = String(unId).replace(/\D/g, "");
  return `PAT-${clean.padStart(4, "0")}`;
};

function ManualRefundModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ patient_id: "", original_payment_id: "", amount: "", reason: "" });
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [fetchingPatients, setFetchingPatients] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const selectedPatient = patients.find(p => p.id === form.patient_id);
  const filteredPatients = patients.filter(p => {
    const name = String(p.patient_details?.full_name || "").toLowerCase();
    const unId = formatPatientUnId(p.un_id).toLowerCase();
    const q = patientSearch.toLowerCase();
    return name.includes(q) || unId.includes(q);
  });

  useEffect(() => {
    const fetchPatients = async () => {
      setFetchingPatients(true);
      try {
        const res = await fetch("/api/patients?limit=500");
        const json = await res.json();
        if (json.success) {
          setPatients(json.data || []);
        }
      } catch (err) {
        console.error("Failed to load patients for selector:", err);
      } finally {
        setFetchingPatients(false);
      }
    };
    fetchPatients();
  }, []);

  const submit = async () => {
    if (!form.patient_id || !form.original_payment_id || !form.amount || !form.reason) { toast.error("All fields required"); return; }
    setLoading(true);
    try {
      const res  = await fetch("/api/admin/refunds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, amount: parseFloat(form.amount), admin_id: "admin" }) });
      const json = await res.json();
      if (json.success) { toast.success(`Refund ₹${form.amount} initiated!`); onSuccess(); onClose(); }
      else throw new Error(json.message);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-gray-800 dark:text-gray-200">Manual Refund</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X size={18}/></button>
        </div>
        {[
          { key: "patient_id",          label: "Select Patient (Name & UN_ID)" },
          { key: "original_payment_id", label: "Payment / Order ID",   placeholder: "pay_xxx or order_xxx" },
          { key: "amount",              label: "Refund Amount (₹)",    placeholder: "0.00", type: "number" },
          { key: "reason",              label: "Reason",               placeholder: "Doctor no-show, Service failure..." },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-xs font-bold text-gray-500 mb-1">{f.label}</label>
            {f.key === "patient_id" ? (
              <div className="relative">
                <input
                  type="text"
                  readOnly={!!selectedPatient && !patientSearch}
                  placeholder={fetchingPatients ? "Loading patients..." : "Search patient name or UN_ID..."}
                  value={selectedPatient && !patientSearch ? `${selectedPatient.patient_details?.full_name || "Unknown"} (${formatPatientUnId(selectedPatient.un_id)})` : patientSearch}
                  onFocus={() => setIsOpen(true)}
                  onChange={e => {
                    setPatientSearch(e.target.value);
                    if (form.patient_id) {
                      set("patient_id", "");
                    }
                  }}
                  className="w-full px-4 py-2.5 pr-10 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-[#0067A1]/20 cursor-pointer"
                />
                {selectedPatient && (
                  <button
                    type="button"
                    onClick={() => {
                      set("patient_id", "");
                      setPatientSearch("");
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                  >
                    <X size={14} />
                  </button>
                )}
                {isOpen && (
                  <>
                    <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsOpen(false)} />
                    <div className="absolute z-50 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-h-48 overflow-y-auto mt-1 divide-y divide-gray-100 dark:divide-gray-600">
                      {filteredPatients.length === 0 ? (
                        <div className="px-4 py-3 text-xs text-gray-400">No patients found</div>
                      ) : (
                        filteredPatients.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              set("patient_id", p.id);
                              setPatientSearch("");
                              setIsOpen(false);
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-[#0067A1]/5 dark:hover:bg-[#0067A1]/20 text-sm text-gray-700 dark:text-gray-200 flex flex-col transition-colors cursor-pointer"
                          >
                            <span className="font-bold">{p.patient_details?.full_name || "Unknown"}</span>
                            <span className="text-xs text-gray-400 font-mono mt-0.5">{formatPatientUnId(p.un_id)}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <input value={form[f.key]} onChange={e=>set(f.key,e.target.value)} type={f.type||"text"} placeholder={f.placeholder}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-[#0067A1]/20"/>
            )}
          </div>
        ))}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
          <button onClick={submit} disabled={loading} className="flex-1 py-2.5 rounded-lg bg-[#0067A1] text-white text-sm font-bold hover:bg-[#073834] transition-all disabled:opacity-50">
            {loading ? "Processing..." : "Initiate Refund"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RefundsPage() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus]   = useState("");
  const [page, setPage]       = useState(1);
  const [showModal, setShowModal] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const p   = new URLSearchParams({ page, limit: 20, ...(status && { status }) });
      const res = await fetch(`/api/admin/refunds?${p}`);
      const json = await res.json();
      if (json.success) setData(json.data);
      else throw new Error(json.message);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [page, status]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return (
    <main className="flex-1 overflow-auto">
      <div className="p-2 md:p-4 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#0067A1] rounded-xl shadow-sm shadow-[#0067A1]/20"><IndianRupee className="text-white w-6 h-6"/></div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-800 dark:text-gray-200">Refund Management</h1>
              <p className="text-sm text-gray-500">All refund requests — automated and manual</p>
            </div>
          </div>
          <button onClick={()=>setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-[#0067A1] text-white rounded-lg font-bold text-sm hover:bg-[#073834] transition-all shadow-sm shadow-[#0067A1]/20">
            <Plus size={16}/>Manual Refund
          </button>
        </div>

        {/* Summary */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Pending"   value={data.summary.pending}                 />
            <StatCard label="Completed" value={data.summary.completed} highlight     />
            <StatCard label="Failed"    value={data.summary.failed}                  />
            <StatCard label="Total Refunded" value={`₹${(data.summary.total_refunded||0).toLocaleString("en-IN",{maximumFractionDigits:0})}`} />
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {["","PENDING","PROCESSING","COMPLETED","FAILED"].map(s=>(
            <button key={s} onClick={()=>{setStatus(s);setPage(1);}} className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${status===s?"bg-[#0067A1] text-white border-[#0067A1]":"bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-500"}`}>
              {s||"All Status"}
            </button>
          ))}
          <button onClick={fetch_} className="ml-auto p-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"><RefreshCw size={14}/></button>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#0067A1] border-t-transparent rounded-full animate-spin"/></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>{["Date","Patient ID","Payment ID","Amount","Reason","Status"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {!data?.items ? (
                  <tr><td colSpan={6} className="py-12 text-center text-gray-400">Loading refunds...</td></tr>
                ) : data.items.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-gray-400">No refund requests</td></tr>
                ) : (
                  data.items.map(item => {
                    const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
                    const Icon = cfg.icon;
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN") : "—"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                          {formatPatientUnId(item.patient_un_id)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[#0067A1]">
                          {item.original_payment_id || "—"}
                        </td>
                        <td className="px-4 py-3 font-black text-gray-800 dark:text-gray-200">
                          ₹{Number(item.amount || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                          {item.reason || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border w-fit ${cfg.cls}`}>
                            <Icon size={11} />{cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
          {/* Pagination */}
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
      {showModal && <ManualRefundModal onClose={()=>setShowModal(false)} onSuccess={fetch_}/>}
    </main>
  );
}
