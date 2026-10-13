"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  LifeBuoy,
  MessageSquare,
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  User,
  Shield,
  X,
  ExternalLink,
} from "lucide-react";
import { toast } from "react-hot-toast";

const STATUS_BADGES = {
  open: { label: "Open", color: "bg-amber-100 text-amber-800 border-amber-200" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-800 border-blue-200" },
  resolved: { label: "Resolved", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  closed: { label: "Closed", color: "bg-slate-100 text-slate-700 border-slate-200" },
};

const PRIORITY_BADGES = {
  urgent: { label: "Urgent", color: "bg-rose-100 text-rose-700 font-bold" },
  high: { label: "High", color: "bg-orange-100 text-orange-700" },
  normal: { label: "Normal", color: "bg-slate-100 text-slate-700" },
  low: { label: "Low", color: "bg-slate-50 text-slate-500" },
};

const ROLE_BADGES = {
  doctor: "bg-sky-100 text-[#0067A1]",
  patient: "bg-emerald-100 text-emerald-700",
  chemist: "bg-purple-100 text-purple-700",
  lab: "bg-indigo-100 text-indigo-700",
  admin: "bg-rose-100 text-rose-700",
};

export default function AdminSupportPage() {
  const [activeTab, setActiveTab] = useState("tickets"); // "tickets" | "contact"
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [messages, setMessages] = useState([]);
  const [summary, setSummary] = useState({
    total_tickets: 0,
    open_tickets: 0,
    in_progress_tickets: 0,
    resolved_tickets: 0,
    total_contact_messages: 0,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        tab: activeTab,
        page: String(page),
        limit: "15",
      });
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter && activeTab === "tickets") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/support?${params.toString()}`);
      const json = await res.json();

      if (!json.success) throw new Error(json.message || "Failed to load support data");

      setSummary(json.data.summary);
      setTotalPages(json.data.pagination.totalPages || 1);

      if (activeTab === "tickets") {
        setTickets(json.data.tickets || []);
      } else {
        setMessages(json.data.messages || []);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, search, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusUpdate = async (ticketId, status) => {
    try {
      setUpdatingStatus(true);
      const res = await fetch("/api/admin/support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_id: ticketId, status }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to update ticket status");

      toast.success("Ticket status updated");
      setSelectedItem((prev) => (prev ? { ...prev, status } : null));
      fetchData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-[#0067A1]/10 text-[#0067A1]">
              <LifeBuoy className="w-6 h-6" />
            </span>
            Help & Support
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage inquiries, support tickets, and contact requests from doctors, patients, and visitors.
          </p>
        </div>
        <button
          onClick={() => fetchData()}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#0067A1]" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Tickets</p>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{summary.total_tickets}</p>
          <p className="text-[11px] text-slate-400 mt-1">All registered user requests</p>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs">
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> Open Tickets
          </p>
          <p className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">{summary.open_tickets}</p>
          <p className="text-[11px] text-slate-400 mt-1">Needs attention</p>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs">
          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" /> Resolved Tickets
          </p>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">{summary.resolved_tickets}</p>
          <p className="text-[11px] text-slate-400 mt-1">Closed successfully</p>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs">
          <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> Contact Inquiries
          </p>
          <p className="text-2xl sm:text-3xl font-black text-blue-600 mt-1">{summary.total_contact_messages}</p>
          <p className="text-[11px] text-slate-400 mt-1">From public contact form</p>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Navigation Tabs and Filters */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50/50">
          {/* Tabs */}
          <div className="flex items-center gap-2 bg-slate-200/60 p-1 rounded-lg self-start">
            <button
              onClick={() => {
                setActiveTab("tickets");
                setPage(1);
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                activeTab === "tickets"
                  ? "bg-white text-[#0067A1] shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Support Tickets ({summary.total_tickets})
            </button>
            <button
              onClick={() => {
                setActiveTab("contact");
                setPage(1);
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                activeTab === "contact"
                  ? "bg-white text-[#0067A1] shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Contact Messages ({summary.total_contact_messages})
            </button>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            {activeTab === "tickets" && (
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#0067A1]/20 cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={activeTab === "tickets" ? "Search ticket, user, phone..." : "Search name, email, query..."}
                className="pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#0067A1]/20 w-full sm:w-60"
              />
            </div>
          </div>
        </div>

        {/* Content Table / List */}
        {activeTab === "tickets" ? (
          /* SUPPORT TICKETS TABLE */
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-3.5">Ticket #</th>
                  <th className="px-4 py-3.5">User / Contact</th>
                  <th className="px-4 py-3.5">Subject & Description</th>
                  <th className="px-4 py-3.5">Priority</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Created At</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-6 py-4">
                        <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400 font-medium">
                      No support tickets found
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => {
                    const statusObj = STATUS_BADGES[t.status] || STATUS_BADGES.open;
                    const priorityObj = PRIORITY_BADGES[t.priority] || PRIORITY_BADGES.normal;
                    const roleColor = ROLE_BADGES[t.user_role] || "bg-slate-100 text-slate-700";

                    return (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-slate-900">
                          {t.ticket_number || `TICK-${t.id.slice(0, 6)}`}
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            {t.user_name}
                            {t.user_role && (
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${roleColor}`}>
                                {t.user_role}
                              </span>
                            )}
                          </div>
                          {t.phone_number && (
                            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                              <Phone className="w-2.5 h-2.5" /> {t.phone_number}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 max-w-xs">
                          <p className="font-bold text-slate-900 truncate">{t.subject}</p>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{t.description}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${priorityObj.color}`}>
                            {priorityObj.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusObj.color}`}>
                            {statusObj.label}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-500 text-[11px]">
                          {new Date(t.created_at).toLocaleDateString("en-IN")}
                          <br />
                          <span className="text-[10px] text-slate-400">
                            {new Date(t.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedItem({ ...t, type: "ticket" });
                              setNewStatus(t.status);
                            }}
                            className="px-3 py-1.5 rounded-md text-xs font-bold text-[#0067A1] bg-sky-50 hover:bg-sky-100 transition-colors cursor-pointer"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* WEBSITE CONTACT INQUIRIES TABLE */
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-4 py-3.5">Email</th>
                  <th className="px-4 py-3.5">Subject</th>
                  <th className="px-4 py-3.5">Message Preview</th>
                  <th className="px-4 py-3.5">Date Received</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-6 py-4">
                        <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : messages.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400 font-medium">
                      No contact messages found
                    </td>
                  </tr>
                ) : (
                  messages.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{m.name}</td>
                      <td className="px-4 py-4 text-slate-600 font-mono text-[11px] flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <a href={`mailto:${m.email}`} className="text-[#0067A1] hover:underline">
                          {m.email}
                        </a>
                      </td>
                      <td className="px-4 py-4 font-bold text-slate-800">{m.subject}</td>
                      <td className="px-4 py-4 text-slate-600 max-w-sm">
                        <p className="line-clamp-2 text-[11px]">{m.message}</p>
                      </td>
                      <td className="px-4 py-4 text-slate-500 text-[11px]">
                        {new Date(m.created_at).toLocaleDateString("en-IN")}
                        <br />
                        <span className="text-[10px] text-slate-400">
                          {new Date(m.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedItem({ ...m, type: "contact" })}
                          className="px-3 py-1.5 rounded-md text-xs font-bold text-[#0067A1] bg-sky-50 hover:bg-sky-100 transition-colors cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold disabled:opacity-50 hover:bg-slate-50 cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold disabled:opacity-50 hover:bg-slate-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {selectedItem.type === "ticket" ? "Support Ticket Details" : "Contact Inquiry Details"}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedItem.ticket_number || selectedItem.subject}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedItem.type === "ticket" ? (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">User Name</p>
                    <p className="font-bold text-slate-800 mt-0.5">{selectedItem.user_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Role</p>
                    <p className="font-bold text-slate-800 mt-0.5 uppercase">{selectedItem.user_role || "User"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Phone</p>
                    <p className="font-mono text-slate-700 mt-0.5">{selectedItem.phone_number || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Created</p>
                    <p className="text-slate-700 mt-0.5">
                      {new Date(selectedItem.created_at).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Subject</label>
                  <p className="p-2.5 bg-slate-50 rounded-lg text-slate-900 font-semibold border border-slate-200/60">
                    {selectedItem.subject}
                  </p>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Description</label>
                  <div className="p-3 bg-slate-50 rounded-lg text-slate-700 leading-relaxed whitespace-pre-wrap border border-slate-200/60">
                    {selectedItem.description}
                  </div>
                </div>

                {/* Status Update Form */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600">Status:</span>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[#0067A1]/20 cursor-pointer"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedItem(null)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      disabled={updatingStatus || newStatus === selectedItem.status}
                      onClick={() => handleStatusUpdate(selectedItem.id, newStatus)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#0067A1] text-white text-xs font-bold hover:bg-[#004F7C] disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {updatingStatus ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 space-y-2">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">From</p>
                      <p className="font-bold text-slate-800 mt-0.5">{selectedItem.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Received</p>
                      <p className="text-slate-600 mt-0.5">
                        {new Date(selectedItem.created_at).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Email</p>
                    <a
                      href={`mailto:${selectedItem.email}`}
                      className="font-mono text-[#0067A1] hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <Mail className="w-3 h-3" /> {selectedItem.email}
                    </a>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Subject</label>
                  <p className="p-2.5 bg-slate-50 rounded-lg text-slate-900 font-semibold border border-slate-200/60">
                    {selectedItem.subject}
                  </p>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Message</label>
                  <div className="p-3 bg-slate-50 rounded-lg text-slate-700 leading-relaxed whitespace-pre-wrap border border-slate-200/60">
                    {selectedItem.message}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Close
                  </button>
                  <a
                    href={`mailto:${selectedItem.email}?subject=Re: ${encodeURIComponent(selectedItem.subject)}`}
                    className="px-3.5 py-1.5 rounded-lg bg-[#0067A1] text-white text-xs font-bold hover:bg-[#004F7C] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" /> Reply
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
