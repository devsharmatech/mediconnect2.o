"use client";
import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { AlertTriangle, RefreshCw, RotateCcw, CheckCircle, Activity, Zap, Inbox, Radio, Eye, X } from "lucide-react";

const TAB_CONFIG = [
  { id: "dlq",       label: "Dead Letter Queue", icon: Inbox },
  { id: "incidents", label: "Incidents",          icon: AlertTriangle },
  { id: "health",    label: "Queue Health",       icon: Activity },
  { id: "signals",   label: "Signal Phases",      icon: Radio },
];

const PRIORITY_STYLES = { P1: "bg-red-100 text-red-700 border-red-200", P2: "bg-orange-100 text-orange-700 border-orange-200", P3: "bg-yellow-100 text-yellow-700 border-yellow-200" };
const STATUS_STYLES   = { OPEN: "bg-red-50 text-red-600", RESOLVED: "bg-green-50 text-green-600", INVESTIGATING: "bg-blue-50 text-[#0067A1]" };

function StatCard({ label, value, sub, color = "teal" }) {
  const colors = { teal: "bg-[#0067A1]/10 text-[#0067A1]", red: "bg-red-50 text-red-600", orange: "bg-orange-50 text-orange-600", green: "bg-green-50 text-green-600" };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">{label}</p>
      <p className={`text-2xl font-black ${colors[color]?.split(" ")[1] || "text-gray-800"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function Spinner() { return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#0067A1] border-t-transparent rounded-full animate-spin" /></div>; }

// ── DLQ TAB ──────────────────────────────────────────────────────────────────
function DLQTab() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("false"); // replayed filter
  const [replaying, setReplaying] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [replayItemId, setReplayItemId] = useState(null);
  const [replayReason, setReplayReason] = useState("");

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/dlq?replayed=${filter}&limit=20`);
      const json = await res.json();
      if (json.success) setData(json.data);
      else throw new Error(json.message);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const handleReplaySubmit = async (e) => {
    e.preventDefault();
    if (!replayItemId) return;
    if (!replayReason.trim()) {
      toast.error("Please enter a reason for replay");
      return;
    }
    const id = replayItemId;
    setReplaying(id);
    try {
      const res  = await fetch("/api/admin/dlq", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dlq_id: id, admin_id: "admin", reason: replayReason.trim() }) });
      const json = await res.json();
      if (json.success) {
        toast.success("Item replayed successfully!");
        setReplayItemId(null);
        fetch_();
      } else {
        throw new Error(json.message);
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setReplaying(null);
    }
  };

  return (
    <div className="space-y-5">
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Unreplayed"      value={data.summary.pending}        color="red" />
          <StatCard label="Payment Events"  value={data.summary.payment_events} color="orange" />
          <StatCard label="Replayed"        value={data.summary.replayed}       color="green" />
        </div>
      )}
      <div className="flex gap-2">
        {["false","true",""].map(v => (
          <button key={v} onClick={() => setFilter(v)} className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${filter===v?"bg-[#0067A1] text-white border-[#0067A1]":"bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-500"}`}>
            {v==="false"?"Pending":v==="true"?"Replayed":"All"}
          </button>
        ))}
        <button onClick={fetch_} className="ml-auto p-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"><RefreshCw size={14} /></button>
      </div>
      {loading ? <Spinner /> : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>{["Event Type","Failure Reason","Attempts","Payment","Replayed","Action"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {data?.items?.length===0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-gray-400">No items</td></tr>
              ) : data?.items?.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-[#0067A1] font-bold">{item.event_type}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-xs truncate text-xs">{item.failure_reason}</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 bg-orange-50 text-orange-700 rounded-md text-xs font-bold">{item.total_attempts}x</span></td>
                  <td className="px-4 py-3">{item.is_payment_event?<span className="px-2 py-1 bg-red-50 text-red-600 rounded-md text-xs font-bold">YES</span>:<span className="text-gray-300 text-xs">—</span>}</td>
                  <td className="px-4 py-3">{item.replayed?<span className="text-green-600 text-xs font-bold">✓</span>:<span className="text-gray-300 text-xs">—</span>}</td>
                  <td className="px-4 py-3 flex items-center gap-2">
                    <button onClick={()=>setSelectedItem(item)} className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-[#0067A1] dark:text-[#0080C6] rounded-md text-xs font-bold transition-all border border-gray-100 dark:border-gray-600">
                      <Eye size={12} />Details
                    </button>
                    {!item.replayed && (
                      <button onClick={()=>{ setReplayItemId(item.id); setReplayReason("Manual administrative replay trigger."); }} disabled={replaying===item.id} className="flex items-center gap-1 px-3 py-1.5 bg-[#0067A1] text-white rounded-md text-xs font-bold hover:bg-[#073834] transition-all disabled:opacity-50">
                        <RotateCcw size={12} />{replaying===item.id?"...":"Replay"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DLQ Details Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
              <div>
                <h3 className="font-extrabold text-gray-800 dark:text-gray-200 text-lg tracking-tight">Dead Letter Item Details</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{selectedItem.id}</p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={18} />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-2xl">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Event Type</span>
                  <span className="text-xs font-mono font-bold text-[#0067A1] dark:text-[#0080C6] break-all">{selectedItem.event_type}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Attempts</span>
                  <span className="px-2 py-0.5 bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded-md text-xs font-bold inline-block mt-0.5">{selectedItem.total_attempts}x</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Payment Event</span>
                  <span className={`px-2 py-0.5 rounded-md text-xs font-bold inline-block mt-0.5 ${selectedItem.is_payment_event ? "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500"}`}>{selectedItem.is_payment_event ? "YES" : "NO"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Status</span>
                  <span className={`px-2 py-0.5 rounded-md text-xs font-bold inline-block mt-0.5 ${selectedItem.replayed ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"}`}>{selectedItem.replayed ? "Replayed" : "Pending"}</span>
                </div>
              </div>

              {/* Created At */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Created At</h4>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/20 px-3 py-2 rounded-xl border border-gray-100/50 dark:border-gray-700/50">
                  {new Date(selectedItem.created_at).toLocaleString("en-IN")}
                </p>
              </div>

              {/* Failure Reason */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Failure Reason</h4>
                <div className="bg-red-50/50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/50 rounded-2xl p-4 text-xs font-mono break-words whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {selectedItem.failure_reason || "No failure reason provided."}
                </div>
              </div>

              {/* Payload JSON */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">Event Payload</h4>
                  <button onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(selectedItem.payload, null, 2));
                    toast.success("Payload copied!");
                  }} className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold px-2.5 py-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                    Copy JSON
                  </button>
                </div>
                <pre className="bg-slate-900 text-[#0080C6] font-mono text-xs p-4 rounded-2xl overflow-x-auto max-h-80 overflow-y-auto shadow-inner border border-slate-950/20">
                  {selectedItem.payload ? JSON.stringify(selectedItem.payload, null, 2) : "// No payload data"}
                </pre>
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-2">
              <button onClick={() => setSelectedItem(null)} className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-md text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                Close
              </button>
              {!selectedItem.replayed && (
                <button onClick={() => { setReplayItemId(selectedItem.id); setReplayReason("Manual administrative replay trigger."); setSelectedItem(null); }} className="flex items-center gap-1.5 px-4 py-2 bg-[#0067A1] hover:bg-[#073834] text-white rounded-md text-xs font-bold transition-colors">
                  <RotateCcw size={12} />Replay Item
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Replay Confirmation Modal */}
      {replayItemId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-md overflow-hidden transform scale-100 transition-all duration-300 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0067A1] to-[#126b64] text-white px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <RotateCcw className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg leading-tight">Replay DLQ Item</h3>
                  <p className="text-emerald-100 text-xs mt-0.5">Re-trigger failed queue execution</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setReplayItemId(null)}
                className="text-white/80 hover:text-white transition-colors p-1 bg-white/5 rounded-lg hover:bg-white/10"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content Form */}
            <form onSubmit={handleReplaySubmit} className="p-6 space-y-5">
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-100 dark:border-slate-800 text-xs">
                <p className="text-gray-400 font-bold uppercase tracking-wider">Target DLQ ID</p>
                <p className="font-mono text-gray-700 dark:text-gray-200 mt-1 font-semibold break-all">
                  {replayItemId}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Reason for Replay <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide clinical/operational justification..."
                  value={replayReason}
                  onChange={(e) => setReplayReason(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0067A1]/50 focus:border-[#0067A1] transition-all"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReplayItemId(null)}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 rounded-lg text-sm font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={replaying === replayItemId}
                  className="flex-1 px-4 py-3 bg-[#0067A1] hover:bg-[#073834] text-white rounded-lg text-sm font-bold transition-all shadow-md shadow-[#0067A1]/10 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {replaying === replayItemId ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : null}
                  {replaying === replayItemId ? "Replaying..." : "Confirm Replay"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── INCIDENTS TAB ─────────────────────────────────────────────────────────────
function IncidentsTab() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [priority, setPriority] = useState("");
  const [status, setStatus]   = useState("OPEN");
  const [resolving, setResolving] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const p   = new URLSearchParams({ limit: 20, ...(priority&&{priority}), ...(status&&{status}) });
      const res = await fetch(`/api/admin/incidents?${p}`);
      const json = await res.json();
      if (json.success) setData(json.data);
      else throw new Error(json.message);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [priority, status]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const updateStatus = async (id, newStatus) => {
    const reason = prompt(`Reason for marking as ${newStatus}:`);
    if (!reason) return;
    setResolving(id);
    try {
      const res  = await fetch("/api/admin/incidents", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ incident_id: id, status: newStatus, admin_id: "admin", reason }) });
      const json = await res.json();
      if (json.success) { toast.success(`Incident ${newStatus.toLowerCase()}`); fetch_(); }
      else throw new Error(json.message);
    } catch (e) { toast.error(e.message); }
    finally { setResolving(null); }
  };

  return (
    <div className="space-y-5">
      {data && (
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="P1 Open"    value={data.summary.p1_open}        color="red" />
          <StatCard label="P2 Open"    value={data.summary.p2_open}        color="orange" />
          <StatCard label="Total Open" value={data.summary.total_open}     color="teal" />
          <StatCard label="Resolved"   value={data.summary.total_resolved} color="green" />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {["","P1","P2","P3"].map(p=><button key={p} onClick={()=>setPriority(p)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${priority===p?"bg-[#0067A1] text-white border-[#0067A1]":"bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-500"}`}>{p||"All Priority"}</button>)}
        <div className="w-px bg-gray-200 dark:bg-gray-600 mx-1"/>
        {["","OPEN","INVESTIGATING","RESOLVED"].map(s=><button key={s} onClick={()=>setStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${status===s?"bg-[#0067A1] text-white border-[#0067A1]":"bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-500"}`}>{s||"All Status"}</button>)}
        <button onClick={fetch_} className="ml-auto p-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"><RefreshCw size={14} /></button>
      </div>
      {loading ? <Spinner /> : (
        <div className="space-y-3">
          {data?.items?.length===0 ? <p className="text-center text-gray-400 py-12">No incidents</p> : data?.items?.map(inc=>(
            <div key={inc.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 flex items-start justify-between gap-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${PRIORITY_STYLES[inc.priority]||""}`}>{inc.priority}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{inc.source}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{inc.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => setSelectedIncident(inc)} className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-md text-xs font-bold transition-all border border-gray-100 dark:border-gray-600">
                  <Eye size={12} />Details
                </button>
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${STATUS_STYLES[inc.status]||""}`}>{inc.status}</span>
                {inc.status==="OPEN" && (
                  <>
                    <button onClick={()=>updateStatus(inc.id,"INVESTIGATING")} disabled={resolving===inc.id} className="px-3 py-1.5 bg-blue-50 text-[#0067A1] rounded-md text-xs font-bold hover:bg-blue-100 transition-colors">Investigate</button>
                    <button onClick={()=>updateStatus(inc.id,"RESOLVED")}     disabled={resolving===inc.id} className="px-3 py-1.5 bg-green-50 text-green-600 rounded-md text-xs font-bold hover:bg-green-100 transition-colors flex items-center gap-1"><CheckCircle size={12}/>Resolve</button>
                  </>
                )}
                {inc.status==="INVESTIGATING" && (
                  <button onClick={()=>updateStatus(inc.id,"RESOLVED")} disabled={resolving===inc.id} className="px-3 py-1.5 bg-green-50 text-green-600 rounded-md text-xs font-bold hover:bg-green-100 transition-colors flex items-center gap-1"><CheckCircle size={12}/>Resolve</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Incident Details Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedIncident(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${PRIORITY_STYLES[selectedIncident.priority]||""}`}>{selectedIncident.priority}</span>
                  <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${STATUS_STYLES[selectedIncident.status]||""}`}>{selectedIncident.status}</span>
                </div>
                <p className="text-xs text-gray-400 font-mono mt-1">{selectedIncident.id}</p>
              </div>
              <button onClick={() => setSelectedIncident(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={18} />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Source & Timeline */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-2xl border border-gray-100/50 dark:border-gray-700/50">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Incident Source</span>
                  <span className="text-sm font-extrabold text-[#0067A1] dark:text-[#0080C6] mt-0.5 block">{selectedIncident.source}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Timestamp (IST)</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-0.5 block">
                    {new Date(selectedIncident.created_at).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Full Description */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Description</h4>
                <div className="bg-gray-50 dark:bg-gray-700/20 text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {selectedIncident.description || "No description provided."}
                </div>
              </div>

              {/* Diagnostic Data JSON (if it exists) */}
              {selectedIncident.diagnostic_data && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">Diagnostic Data / Logs</h4>
                    <button onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(selectedIncident.diagnostic_data, null, 2));
                      toast.success("Diagnostics copied!");
                    }} className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold px-2.5 py-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                      Copy JSON
                    </button>
                  </div>
                  <pre className="bg-slate-900 text-[#0080C6] font-mono text-xs p-4 rounded-2xl overflow-x-auto max-h-60 overflow-y-auto shadow-inner border border-slate-950/20">
                    {JSON.stringify(selectedIncident.diagnostic_data, null, 2)}
                  </pre>
                </div>
              )}
              
              {/* Custom Status History or Action Logs if fields like resolved_by / resolution_notes exist */}
              {selectedIncident.status === "RESOLVED" && selectedIncident.resolved_at && (
                <div className="bg-green-50/50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/50 rounded-2xl p-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-green-800 dark:text-green-400 mb-1">Resolution Info</h4>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    <span className="font-semibold">Resolved At:</span> {new Date(selectedIncident.resolved_at).toLocaleString("en-IN")}
                  </p>
                  {selectedIncident.resolution_notes && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 whitespace-pre-wrap font-mono">
                      <span className="font-semibold font-sans">Notes:</span> {selectedIncident.resolution_notes}
                    </p>
                  )}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-2">
              <button onClick={() => setSelectedIncident(null)} className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                Close
              </button>
              {selectedIncident.status === "OPEN" && (
                <>
                  <button onClick={() => { updateStatus(selectedIncident.id, "INVESTIGATING"); setSelectedIncident(null); }} className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-[#0067A1] rounded-lg text-xs font-bold transition-colors">
                    Investigate
                  </button>
                  <button onClick={() => { updateStatus(selectedIncident.id, "RESOLVED"); setSelectedIncident(null); }} className="flex items-center gap-1.5 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg text-xs font-bold transition-colors">
                    <CheckCircle size={12} />Resolve
                  </button>
                </>
              )}
              {selectedIncident.status === "INVESTIGATING" && (
                <button onClick={() => { updateStatus(selectedIncident.id, "RESOLVED"); setSelectedIncident(null); }} className="flex items-center gap-1.5 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg text-xs font-bold transition-colors">
                  <CheckCircle size={12} />Resolve
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── QUEUE HEALTH TAB ─────────────────────────────────────────────────────────
function HealthTab() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/admin/queue-health");
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch_(); }, []);

  const statusColor = { HEALTHY:"bg-green-100 text-green-700", DEGRADED:"bg-orange-100 text-orange-700", CRITICAL:"bg-red-100 text-red-700" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {data && <span className={`px-4 py-2 rounded-lg text-sm font-bold ${statusColor[data.status]||""}`}>System: {data.status}</span>}
        <button onClick={fetch_} className="ml-auto p-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"><RefreshCw size={14}/></button>
      </div>
      {loading ? <Spinner /> : data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Outbox Pending" value={data.outbox.pending} color="teal"/>
            <StatCard label="Outbox Delayed" value={data.outbox.delayed} color={data.outbox.delayed>5?"red":"green"}/>
            <StatCard label="Outbox Failed"  value={data.outbox.failed}  color={data.outbox.failed>0?"red":"green"}/>
            <StatCard label="Retry Pending"  value={data.retry_queue.pending} color="orange"/>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="DLQ Unreplayed"  value={data.dead_letter_queue.unreplayed} color={data.dead_letter_queue.unreplayed>0?"red":"green"}/>
            <StatCard label="DLQ Payment Crit" value={data.dead_letter_queue.payment_critical} color={data.dead_letter_queue.payment_critical>0?"red":"green"}/>
            <StatCard label="Notifications"   value={data.notifications.pending} color="teal"/>
            <StatCard label="P1 Open"         value={data.incidents.p1_open} color={data.incidents.p1_open>0?"red":"green"}/>
          </div>
          {data.worker_logs?.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-700"><h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">Recent Worker Runs</h3></div>
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>{["Worker","Run At","Duration","Processed","Succeeded","Failed","Status"].map(h=><th key={h} className="px-4 py-2 text-left font-bold text-gray-400 uppercase tracking-wider">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {data.worker_logs.map(log=>(
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-2.5 font-mono font-bold text-[#0067A1]">{log.worker_name}</td>
                      <td className="px-4 py-2.5 text-gray-500">{new Date(log.run_at).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-2.5">{log.duration_ms}ms</td>
                      <td className="px-4 py-2.5">{log.items_processed}</td>
                      <td className="px-4 py-2.5 text-green-600 font-bold">{log.items_succeeded}</td>
                      <td className="px-4 py-2.5 text-red-600 font-bold">{log.items_failed}</td>
                      <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-md font-bold ${log.status==="SUCCESS"?"bg-green-50 text-green-700":log.status==="PARTIAL"?"bg-orange-50 text-orange-700":"bg-red-50 text-red-700"}`}>{log.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── SIGNAL PHASES TAB ─────────────────────────────────────────────────────────
function SignalsTab() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/admin/queue-health");
      const json = await res.json();
      if (json.success) setData(json.data.signal_phases || []);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch_(); }, []);

  const PHASE_DESCRIPTIONS = {
    A: "Collection Only — Passive signal logging, no user-facing actions",
    B: "Signal-based reminders to patients",
    C: "Auto care pathways triggered by engagement signals",
    D: "Proactive engagement flows and outreach",
    E: "Auto monetization flows and upsell triggers",
  };

  return (
    <div className="space-y-5">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <p className="text-sm font-bold text-amber-800">⚠️ Signal Phase Config is read-only in this view. Modify via the database console to prevent unintended patient-facing actions.</p>
      </div>
      {loading ? <Spinner /> : (
        <div className="grid gap-4">
          {data?.map(phase=>(
            <div key={phase.phase} className={`rounded-2xl border p-5 flex items-center justify-between transition-all ${phase.is_enabled?"border-[#0067A1]/30 bg-[#0067A1]/5":"border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800"}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black ${phase.is_enabled?"bg-[#0067A1] text-white":"bg-gray-100 dark:bg-gray-700 text-gray-400"}`}>
                  {phase.phase}
                </div>
                <div>
                  <p className="font-bold text-gray-800 dark:text-gray-200">Phase {phase.phase}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{PHASE_DESCRIPTIONS[phase.phase]}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {phase.is_enabled ? (
                  <span className="flex items-center gap-1.5 px-2 py-1 bg-[#0067A1] text-white rounded text-xs font-bold"><span className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse"/>ACTIVE</span>
                ) : (
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-400 rounded text-xs font-bold">DISABLED</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function OperationsPage() {
  const [tab, setTab] = useState("dlq");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam && ["dlq", "incidents", "health", "signals"].includes(tabParam)) {
        setTab(tabParam);
      }
    }
  }, []);

  const TABS = { dlq: <DLQTab/>, incidents: <IncidentsTab/>, health: <HealthTab/>, signals: <SignalsTab/> };

  return (
    <main className="flex-1 overflow-auto">
      <div className="p-2 md:p-4 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#0067A1] rounded-2xl shadow-sm shadow-[#0067A1]/20">
            <Zap className="text-white w-6 h-6"/>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-800 dark:text-gray-200 tracking-tight">Operations Center</h1>
            <p className="text-sm text-gray-500 mt-0.5">Layer-111 system health, incidents, and queue management</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
          {TAB_CONFIG.map(t=>{
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={()=>setTab(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab===t.id?"bg-white dark:bg-gray-700 text-[#0067A1] dark:text-[#0080C6] shadow-sm":"text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                <Icon size={16}/>{t.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div>{TABS[tab]}</div>
      </div>
    </main>
  );
}
