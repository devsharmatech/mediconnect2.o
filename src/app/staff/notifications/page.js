"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Bell, RefreshCw, X, Eye, Clock, Users, CheckCircle2, Loader2
} from "lucide-react";

export default function StaffNotificationsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications/logs?limit=300");
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to load");
      setLogs(data.data || []);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, []);

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#0067A1]" /> Notification History
          </h1>
          <p className="text-sm text-gray-500 mt-1">View sent notifications</p>
        </div>
        <button onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2 bg-[#0067A1] text-white rounded-xl hover:bg-[#004F7C] cursor-pointer">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats */}
      {logs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><Bell className="w-5 h-5 text-[#0067A1]" /></div>
              <div><p className="text-xs text-gray-400">Total Sent</p><p className="text-xl font-bold text-gray-800">{logs.length}</p></div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center"><Users className="w-5 h-5 text-green-600" /></div>
              <div><p className="text-xs text-gray-400">Total Recipients</p><p className="text-xl font-bold text-gray-800">{logs.reduce((s, l) => s + (l.total || 0), 0).toLocaleString()}</p></div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-amber-600" /></div>
              <div><p className="text-xs text-gray-400">Push Delivered</p><p className="text-xl font-bold text-gray-800">{logs.reduce((s, l) => s + (l.push_sent || 0), 0).toLocaleString()}</p></div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" /> Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No notifications sent yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Date & Time</th>
                  <th className="text-left px-4 py-3 font-medium">Title</th>
                  <th className="text-left px-4 py-3 font-medium">Audience</th>
                  <th className="text-left px-4 py-3 font-medium">Recipients</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log, i) => (
                  <tr key={log.batch_id || i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-[200px] truncate">{log.title || "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 capitalize">{log.audience || "All"}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{log.total || 0}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${(log.push_sent || 0) > 0 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {(log.push_sent || 0) > 0 ? "Delivered" : "Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelectedLog(log)}
                        className="p-2 bg-[#0067A1]/10 text-[#0067A1] rounded-lg hover:bg-[#0067A1]/20 cursor-pointer"><Eye className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelectedLog(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-800">Notification Details</h2>
                <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div><p className="text-xs text-gray-400">Title</p><p className="text-sm font-medium text-gray-800">{selectedLog.title || "—"}</p></div>
                <div><p className="text-xs text-gray-400">Message</p><p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedLog.message || "—"}</p></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-gray-400">Sent At</p><p className="text-sm text-gray-800">{formatDate(selectedLog.created_at)}</p></div>
                  <div><p className="text-xs text-gray-400">Audience</p><p className="text-sm text-gray-800 capitalize">{selectedLog.audience || "All"}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-gray-400">Total Recipients</p><p className="text-sm font-semibold text-gray-800">{selectedLog.total || 0}</p></div>
                  <div><p className="text-xs text-gray-400">Push Sent</p><p className="text-sm font-semibold text-green-700">{selectedLog.push_sent || 0}</p></div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
