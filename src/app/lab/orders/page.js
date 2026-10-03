"use client";

import { useEffect, useState } from "react";
import {
  ClipboardList,
  Search,
  User,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  Calendar,
  DollarSign,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { getLoggedInUser } from "@/lib/authHelpers";
import { useRouter } from "next/navigation";

export default function LabOrdersPage() {
  const router = useRouter();

  const [lab, setLab] = useState(null);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({
    key: "created_at",
    direction: "desc",
  });

  // Pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    const u = getLoggedInUser("lab");
    if (u) setLab(u);
  }, []);

  const fetchOrders = async (page = 1) => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        lab_id: lab.id,
        page,
        limit: pagination.limit,
      });
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/lab/order/get?${params.toString()}`);

      const json = await res.json();
      if (json.status) {
        setOrders(json.orders);
        setPagination({
          currentPage: page,
          limit: pagination.limit,
          total: json.total,
          totalPages: Math.ceil(json.total / pagination.limit),
        });
      }
    } catch (error) {
      console.log("ERROR:", error);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (lab?.id) fetchOrders(pagination.currentPage);
  }, [lab]);

  // search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (lab?.id) fetchOrders(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  // Status UI config
  const statusConfig = {
    pending: {
      text: "Pending",
      color: "text-yellow-700 dark:text-yellow-300",
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      border: "border-yellow-200 dark:border-yellow-800",
      icon: Clock,
    },
    approved: {
      text: "Approved",
      color: "text-green-700 dark:text-green-300",
      bg: "bg-green-100 dark:bg-green-900/30",
      border: "border-green-200 dark:border-green-800",
      icon: CheckCircle2,
    },
    sample_collected: {
      text: "Sample Collected",
      color: "text-[#004F7C] dark:text-blue-300",
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
      border: "border-emerald-200 dark:border-emerald-800",
      icon: Filter,
    },
    processing: {
      text: "Processing",
      color: "text-indigo-700 dark:text-indigo-300",
      bg: "bg-indigo-100 dark:bg-indigo-900/30",
      border: "border-indigo-200 dark:border-indigo-800",
      icon: Clock,
    },
    completed: {
      text: "Completed",
      color: "text-emerald-700 dark:text-emerald-300",
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
      border: "border-emerald-200 dark:border-emerald-800",
      icon: CheckCircle2,
    },
    rejected: {
      text: "Rejected",
      color: "text-red-700 dark:text-red-300",
      bg: "bg-red-100 dark:bg-red-900/30",
      border: "border-red-200 dark:border-red-800",
      icon: XCircle,
    },
    sent_to_lab: {
      text: "Sent to Lab",
      color: "text-cyan-700 dark:text-cyan-300",
      bg: "bg-cyan-100 dark:bg-cyan-900/30",
      border: "border-cyan-200 dark:border-cyan-800",
      icon: Clock,
    },
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey)
      return <ChevronDown className="w-4 h-4 opacity-50" />;
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  const sortedOrders = [...orders].sort((a, b) => {
    const direction = sortConfig.direction === "asc" ? 1 : -1;

    if (sortConfig.key === "created_at") {
      return (
        (new Date(a.created_at) - new Date(b.created_at)) * direction
      );
    }

    if (sortConfig.key === "total_amount") {
      return (
        ((a.total_amount || 0) - (b.total_amount || 0)) * direction
      );
    }

    return 0;
  });

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchOrders(page);
    }
  };

  const generatePageNumbers = () => {
    const pages = [];
    const total = pagination.totalPages;
    const current = pagination.currentPage;

    pages.push(1);

    let start = Math.max(2, current - 1);
    let end = Math.min(total - 1, current + 1);

    if (current <= 3) end = Math.min(5, total - 1);
    if (current >= total - 2) start = Math.max(2, total - 4);

    if (start > 2) pages.push("...");

    for (let i = start; i <= end; i++) pages.push(i);

    if (end < total - 1) pages.push("...");

    if (total > 1) pages.push(total);
    return pages;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 bg-[#0067A1]/10 text-[#0067A1] dark:bg-[#0067A1]/20 dark:text-blue-400 rounded-2xl flex items-center justify-center border border-[#0067A1]/20 shadow-xs">
            <ClipboardList size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Lab Test Orders
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">
              Manage and review patient diagnostic test bookings & statuses
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-4 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Total Orders</p>
            <p className="text-lg font-bold text-slate-800 dark:text-white">{pagination.total}</p>
          </div>
        </div>
      </div>

        {/* Search + Filters Card */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800">
          <div className="flex flex-col lg:flex-row gap-3.5">
            {/* Search */}
            <div className="relative flex-1">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <Search className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type="text"
                className="w-full pl-11 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl 
                         bg-slate-50/60 dark:bg-slate-800/60 text-slate-800 dark:text-white text-sm
                         focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] outline-none
                         transition-all"
                placeholder="Search patient name, phone, order ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Status filter */}
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                <Filter className="w-4 h-4 text-slate-400" />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full lg:w-56 pl-10 pr-9 py-2.5 border border-slate-200 dark:border-slate-700 
                         rounded-xl bg-slate-50/60 dark:bg-slate-800/60 text-slate-800 dark:text-white text-sm
                         focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] appearance-none cursor-pointer outline-none"
              >
                <option value="all">All Status</option>
                {Object.keys(statusConfig).map((key) => (
                  <option key={key} value={key}>
                    {statusConfig[key].text}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-3 border-[#0067A1] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-3 text-slate-500 dark:text-slate-400 text-sm font-medium">Loading orders...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && orders.length === 0 && (
          <div className="bg-white dark:bg-slate-900 p-10 md:p-12 rounded-2xl text-center shadow-xs border border-slate-200/80 dark:border-slate-800">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
              <ClipboardList className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white">No Orders Found</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm mt-1.5 max-w-md mx-auto">
              No lab test orders match your current filters. Try adjusting your search criteria.
            </p>
          </div>
        )}

        {/* Orders Table */}
        {!loading && orders.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 overflow-hidden">
            {/* Table Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">All Orders</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Showing {orders.length} of {pagination.total} orders
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-slate-500">Sort by</span>
                <div className="relative">
                  <select
                    value={sortConfig.key}
                    onChange={(e) => handleSort(e.target.value)}
                    className="pl-3 pr-8 py-1.5 border border-slate-200 dark:border-slate-700 
                             rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white
                             focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] appearance-none cursor-pointer text-xs font-medium outline-none"
                  >
                    <option value="created_at">Order Date</option>
                    <option value="total_amount">Amount</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/80">
                  <tr>
                    <th className="p-3.5 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort("unid")}
                        className="flex items-center space-x-1 hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        <span>Order ID</span>
                        <SortIcon columnKey="unid" />
                      </button>
                    </th>
                    <th className="p-3.5 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="p-3.5 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="p-3.5 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort("total_amount")}
                        className="flex items-center space-x-1 hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        <span>Amount</span>
                        <SortIcon columnKey="total_amount" />
                      </button>
                    </th>
                    <th className="p-3.5 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort("created_at")}
                        className="flex items-center space-x-1 hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        <span>Order Date</span>
                        <SortIcon columnKey="created_at" />
                      </button>
                    </th>
                    <th className="p-3.5 px-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sortedOrders.map((o) => {
                    const statusKey = o.status?.toLowerCase() || "pending";
                    const config = statusConfig[statusKey] || {
                      text: o.status ? o.status.replace(/_/g, " ").toUpperCase() : "PENDING",
                      color: "text-slate-700 dark:text-slate-300",
                      bg: "bg-slate-100 dark:bg-slate-800",
                      border: "border-slate-200 dark:border-slate-700",
                      icon: Clock,
                    };
                    const StatusIcon = config.icon || Clock;
                    return (
                      <tr
                        key={o.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors duration-150"
                      >
                        <td className="p-3.5 px-4">
                          <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                            #{o.unid}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Order
                          </div>
                        </td>

                        <td className="p-3.5 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-[#0067A1]/10 dark:bg-[#0067A1]/20 flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-[#0067A1]" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white text-sm">
                                {o.patient?.patient_details?.full_name || "N/A"}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {o.patient?.phone_number || "No phone"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.color} border ${config.border}`}>
                            <StatusIcon className="w-3 h-3" />
                            {config.text}
                          </span>
                        </td>

                        <td className="p-3.5 px-4">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            ₹{o.total_amount}
                          </span>
                        </td>

                        <td className="p-3.5 px-4">
                          <div className="flex items-center space-x-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{new Date(o.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        <td className="p-3.5 px-4 text-right">
                          <button
                            onClick={() => router.push(`/lab/orders/${o.id}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0067A1] hover:bg-[#005585] 
                                     text-white rounded-xl text-xs font-semibold transition-all shadow-xs hover:shadow-sm cursor-pointer"
                          >
                            <Eye size={14} />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Page {pagination.currentPage} of {pagination.totalPages} • {pagination.total} total orders
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => goToPage(1)}
                    disabled={pagination.currentPage === 1}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 
                             bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 
                             hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed
                             transition-colors"
                  >
                    <ChevronsLeft size={16} />
                  </button>

                  <button
                    onClick={() => goToPage(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 
                             bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 
                             hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed
                             transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="flex items-center space-x-1">
                    {generatePageNumbers().map((page, i) =>
                      page === "..." ? (
                        <span key={i} className="px-2 text-xs text-slate-400">...</span>
                      ) : (
                        <button
                          key={i}
                          onClick={() => goToPage(page)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                            page === pagination.currentPage
                              ? "bg-[#0067A1] text-white shadow-xs"
                              : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          {page}
                        </button>
                      )
                    )}
                  </div>

                  <button
                    onClick={() => goToPage(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 
                             bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 
                             hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed
                             transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>

                  <button
                    onClick={() => goToPage(pagination.totalPages)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className="p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 
                             bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 
                             hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed
                             transition-colors"
                  >
                    <ChevronsRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
