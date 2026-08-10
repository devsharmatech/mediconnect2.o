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

      const res = await fetch(
        `/api/lab/order/get?lab_id=${lab.id}&page=${page}&limit=${pagination.limit}`
      );

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
    <div className="min-h-screen dark:from-gray-900 dark:to-gray-800">
      {/* Page Header */}
      <div className="mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-gradient-to-br from-[#0067A1] to-emerald-700 dark:from-[#0067A1] dark:to-[#004F7C] text-white rounded-2xl flex items-center justify-center shadow-lg">
              <ClipboardList size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
                Lab Test Orders
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base">
                Manage & review laboratory test orders
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="px-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Orders</p>
              <p className="text-xl font-bold text-gray-800 dark:text-white">{pagination.total}</p>
            </div>
          </div>
        </div>

        {/* Search + Filters Card */}
        <div className="bg-white dark:bg-gray-800 p-5 md:p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <Search className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                className="w-full pl-12 pr-4 py-3.5 border border-gray-300 dark:border-gray-600 rounded-xl 
                         bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white
                         focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                         transition-all duration-200"
                placeholder="Search patient name, phone, order ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Status filter */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <Filter className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full lg:w-64 pl-12 pr-4 py-3.5 border border-gray-300 dark:border-gray-600 
                         rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white
                         focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none cursor-pointer"
              >
                <option value="all">All Status</option>
                {Object.keys(statusConfig).map((key) => (
                  <option key={key} value={key}>
                    {statusConfig[key].text}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-20 text-center">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium">Loading orders...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && orders.length === 0 && (
          <div className="bg-white dark:bg-gray-800 p-10 md:p-12 rounded-2xl text-center shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 dark:bg-gray-900 rounded-2xl flex items-center justify-center">
              <ClipboardList className="w-10 h-10 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">No Orders Found</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-md mx-auto">
              No lab test orders match your current filters. Try adjusting your search criteria.
            </p>
          </div>
        )}

        {/* Orders Table */}
        {!loading && orders.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Table Header */}
            <div className="p-5 md:p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">All Orders</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Showing {orders.length} of {pagination.total} orders
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">Sort by</span>
                <div className="relative">
                  <select
                    value={sortConfig.key}
                    onChange={(e) => handleSort(e.target.value)}
                    className="pl-4 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 
                             rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white
                             focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none cursor-pointer text-sm"
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
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <button
                        onClick={() => handleSort("unid")}
                        className="flex items-center space-x-1 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        <span>Order ID</span>
                        <SortIcon columnKey="unid" />
                      </button>
                    </th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Patient
                    </th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Status
                    </th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <button
                        onClick={() => handleSort("total_amount")}
                        className="flex items-center space-x-1 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        <span>Amount</span>
                        <SortIcon columnKey="total_amount" />
                      </button>
                    </th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <button
                        onClick={() => handleSort("created_at")}
                        className="flex items-center space-x-1 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        <span>Order Date</span>
                        <SortIcon columnKey="created_at" />
                      </button>
                    </th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {sortedOrders.map((o) => {
                    const statusKey = o.status?.toLowerCase() || "pending";
                    const config = statusConfig[statusKey] || {
                      text: o.status ? o.status.replace(/_/g, " ").toUpperCase() : "PENDING",
                      color: "text-gray-700 dark:text-gray-300",
                      bg: "bg-gray-100 dark:bg-gray-800",
                      border: "border-gray-200 dark:border-gray-700",
                      icon: Clock,
                    };
                    const StatusIcon = config.icon || Clock;
                    return (
                      <tr
                        key={o.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors duration-150"
                      >
                        <td className="p-4">
                          <div className="font-semibold text-gray-800 dark:text-white">
                            #{o.unid}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Order
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                              <User className="w-4 h-4 text-[#0067A1] dark:text-emerald-400" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-800 dark:text-white">
                                {o.patient?.patient_details?.full_name || "N/A"}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {o.patient?.phone_number || "No phone"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <div className={`p-1.5 rounded-lg ${config.bg} border ${config.border}`}>
                              <StatusIcon className={`w-3.5 h-3.5 ${config.color}`} />
                            </div>
                            <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${config.bg} ${config.color} border ${config.border}`}>
                              {config.text}
                            </span>
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-green-700 dark:text-green-300">
                              ₹{o.total_amount}
                            </span>
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            <span className="text-gray-700 dark:text-gray-300">
                              {new Date(o.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        <td className="p-4">
                          <button
                            onClick={() => router.push(`/lab/orders/${o.id}`)}
                            className="px-4 py-2.5 bg-gradient-to-r from-[#0067A1] to-emerald-700 hover:from-[#004F7C] hover:to-[#004F7C] 
                                     text-white rounded-lg flex items-center space-x-2 transition-all duration-200 
                                     hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                          >
                            <Eye size={16} />
                            <span className="text-sm font-medium">View</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-5 md:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Page {pagination.currentPage} of {pagination.totalPages} • {pagination.total} total orders
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => goToPage(1)}
                    disabled={pagination.currentPage === 1}
                    className="p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 
                             bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 
                             hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed
                             transition-colors"
                  >
                    <ChevronsLeft size={18} />
                  </button>

                  <button
                    onClick={() => goToPage(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className="p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 
                             bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 
                             hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed
                             transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <div className="flex items-center space-x-1">
                    {generatePageNumbers().map((page, i) =>
                      page === "..." ? (
                        <span key={i} className="px-3 py-2 text-gray-400">...</span>
                      ) : (
                        <button
                          key={i}
                          onClick={() => goToPage(page)}
                          className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${page === pagination.currentPage
                              ? "bg-gradient-to-r from-[#0067A1] to-emerald-700 text-white shadow-lg"
                              : "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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
                    className="p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 
                             bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 
                             hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed
                             transition-colors"
                  >
                    <ChevronRight size={18} />
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
    </div>
  );
}
