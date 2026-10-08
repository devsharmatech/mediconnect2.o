"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  FlaskConical,
  Search,
  Filter,
  Eye,
  RefreshCw,
  Percent,
  CheckCircle,
  Clock,
  XCircle,
  ArrowRight,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Building2,
  User,
  Shield,
  FileText,
  Truck,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  CreditCard,
  Stethoscope,
  Activity,
  AlertCircle,
  Receipt,
  Download
} from "lucide-react";

dayjs.extend(relativeTime);

export default function AdminLabOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [visitTypeFilter, setVisitTypeFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Inspection Modal / Detail Drawer
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Updating Order State
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [editStatus, setEditStatus] = useState("");
  const [editPaymentStatus, setEditPaymentStatus] = useState("");
  const [editTechName, setEditTechName] = useState("");
  const [editTechPhone, setEditTechPhone] = useState("");
  const [editTechStatus, setEditTechStatus] = useState("");
  const [editLabNotes, setEditLabNotes] = useState("");

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        search: search.trim(),
        status: statusFilter,
        payment_status: paymentFilter,
        visit_type: visitTypeFilter,
        dateRange: dateRangeFilter,
      });

      const res = await fetch(`/api/admin/labs/orders?${params.toString()}`);
      const data = await res.json();

      if (data.success && data.data) {
        setOrders(data.data.orders || []);
        setSummary(data.data.summary || null);
        setPagination(data.data.pagination || { total: 0, totalPages: 1 });
      } else {
        toast.error(data.message || "Failed to load lab orders");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error while loading lab orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, search, statusFilter, paymentFilter, visitTypeFilter, dateRangeFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleOpenDetail = async (orderId) => {
    setSelectedOrderId(orderId);
    setLoadingDetail(true);
    setOrderDetail(null);

    try {
      const res = await fetch(`/api/admin/labs/orders/${orderId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setOrderDetail(data.data);
        setEditStatus(data.data.order.status || "");
        setEditPaymentStatus(data.data.order.payment_status || "");
        setEditTechName(data.data.order.technician?.name || "");
        setEditTechPhone(data.data.order.technician?.phone || "");
        setEditTechStatus(data.data.order.technician?.status || "unassigned");
        setEditLabNotes(data.data.order.lab_notes || "");
      } else {
        toast.error(data.message || "Failed to fetch order details");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error loading order inspection");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleUpdateOrder = async (e) => {
    e?.preventDefault();
    if (!selectedOrderId) return;
    setUpdatingStatus(true);

    try {
      const res = await fetch(`/api/admin/labs/orders/${selectedOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          payment_status: editPaymentStatus,
          technician_name: editTechName,
          technician_phone: editTechPhone,
          technician_status: editTechStatus,
          lab_notes: editLabNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Order updated successfully");
        // Refresh details and order list
        handleOpenDetail(selectedOrderId);
        fetchOrders(true);
      } else {
        toast.error(data.message || "Failed to update order");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error while updating order");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "completed":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"><CheckCircle className="w-3 h-3" /> Completed</span>;
      case "in_progress":
      case "sample_collected":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800"><Clock className="w-3 h-3" /> Processing</span>;
      case "sent_to_lab":
      case "booked":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"><Building2 className="w-3 h-3" /> Sent to Lab</span>;
      case "cancelled":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800"><XCircle className="w-3 h-3" /> Cancelled</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800"><Clock className="w-3 h-3" /> Pending</span>;
    }
  };

  const getPaymentBadge = (status) => {
    switch (status) {
      case "paid":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">Paid</span>;
      case "failed":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-300 dark:border-rose-800">Failed</span>;
      case "refunded":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-300 dark:border-purple-800">Refunded</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800">Payment Pending</span>;
    }
  };

  const getCategoryBadge = (catName, pct) => {
    let color = "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300";
    if (String(catName).includes("1")) color = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300";
    if (String(catName).includes("2")) color = "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300";
    if (String(catName).includes("3")) color = "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300";
    if (String(catName).includes("4")) color = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300";
    if (String(catName).toLowerCase().includes("package")) color = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300";

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${color}`}>
        <span>{catName}</span>
        <span className="font-mono text-[10px] opacity-80">({pct}%)</span>
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 text-slate-900 dark:text-slate-100">
      {/* Header & Breadcrumb */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <Link href="/admin/dashboard" className="hover:underline">Admin</Link>
              <span>/</span>
              <Link href="/admin/labs" className="hover:underline">Labs Manager</Link>
              <span>/</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">Orders & Commission</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#0067A1]/10 text-[#0067A1]">
                <FlaskConical className="w-6 h-6" />
              </div>
              <span>Lab Test Orders & Commission Audit</span>
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Manage patient lab bookings, monitor category commissions (Cat 1: 50%, Cat 2: 40%, Cat 3: 30%, Cat 4: 5%, Packages: 50%), and audit lab partner payouts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/labs/categories"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
            >
              <Percent className="w-3.5 h-3.5 text-[#0067A1]" />
              <span>Commission Tiers</span>
            </Link>
            <Link
              href="/admin/labs"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
            >
              <Building2 className="w-3.5 h-3.5 text-[#0067A1]" />
              <span>All Labs</span>
            </Link>
            <button
              onClick={() => fetchOrders(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-[#0067A1] hover:bg-[#005282] text-white transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Aggregate KPI Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Orders Card */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Lab Orders</span>
                <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <Receipt className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                {summary.totalOrders}
              </p>
              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                <span className="text-emerald-600 font-bold">{summary.paidOrdersCount} Paid</span>
                <span>•</span>
                <span className="text-amber-600 font-bold">{summary.pendingOrdersCount} Pending</span>
              </div>
            </div>

            {/* Gross Order Volume */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Gross Paid Volume</span>
                <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <CreditCard className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                ₹{Number(summary.grossVolume || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Total gross patient collections
              </p>
            </div>

            {/* Admin Platform Commission Revenue (Net) */}
            <div className="bg-emerald-50/70 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Admin Lab Revenue</span>
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-200 px-1.5 py-0.5 rounded font-bold">
                  Category Cut
                </span>
              </div>
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-2">
                ₹{Number(summary.adminCommissionRevenue || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1.5 font-medium">
                Realized platform commission
              </p>
            </div>

            {/* Partner Lab Payouts */}
            <div className="bg-blue-50/70 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-200 dark:border-blue-900/40 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-800 dark:text-blue-300">Partner Lab Payouts</span>
                <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                  <Building2 className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-2">
                ₹{Number(summary.labPayouts || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1.5 font-medium">
                Payable to diagnostic labs
              </p>
            </div>

            {/* Home Collection vs Walk-in */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Collection Methods</span>
                <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <Truck className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                {summary.homeCollectionCount}
                <span className="text-xs font-normal text-slate-500 ml-1.5">Home (+₹150)</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1.5">
                {summary.walkInCount} Walk-in center visits
              </p>
            </div>
          </div>
        )}

        {/* Filters Toolbar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by order #, patient name, phone, lab name, technician, razorpay ID..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0067A1]"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Order Status */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="all">Status: All</option>
                <option value="pending">Pending</option>
                <option value="booked">Booked</option>
                <option value="sent_to_lab">Sent to Lab</option>
                <option value="sample_collected">Sample Collected</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              {/* Payment Status */}
              <select
                value={paymentFilter}
                onChange={(e) => {
                  setPaymentFilter(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="all">Payment: All</option>
                <option value="paid">Paid</option>
                <option value="pending">Payment Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>

              {/* Visit Type */}
              <select
                value={visitTypeFilter}
                onChange={(e) => {
                  setVisitTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="all">Visit: All Types</option>
                <option value="home_collection">Home Collection</option>
                <option value="walk_in">Walk-in Visit</option>
              </select>

              {/* Time Range */}
              <select
                value={dateRangeFilter}
                onChange={(e) => {
                  setDateRangeFilter(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="all">Time: All Time</option>
                <option value="today">Today</option>
                <option value="week">Past 7 Days</option>
                <option value="month">Past 30 Days</option>
                <option value="quarter">Past 90 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Order # & Placed</th>
                  <th className="py-3.5 px-4">Patient Profile</th>
                  <th className="py-3.5 px-4">Assigned Lab</th>
                  <th className="py-3.5 px-4">Tests Ordered</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Total (₹)</th>
                  <th className="py-3.5 px-4">Commission Breakdown</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#0067A1] mb-2" />
                      <span>Loading lab orders with category commission...</span>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500">
                      <FlaskConical className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-60" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300">No lab orders found</p>
                      <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters.</p>
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr
                      key={o.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                      onClick={() => handleOpenDetail(o.id)}
                    >
                      {/* Order # & Date */}
                      <td className="py-3 px-4 font-mono">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>#{o.unid || o.id.slice(0, 8)}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {dayjs(o.created_at).format("DD MMM, hh:mm A")}
                        </div>
                      </td>

                      {/* Patient */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {o.patient.full_name}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{o.patient.phone_number}</span>
                        </div>
                      </td>

                      {/* Lab Partner */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px]" title={o.lab.lab_name}>
                          {o.lab.lab_name}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[150px]">
                          {o.lab.city || o.lab.address || "Partner Lab"}
                        </div>
                      </td>

                      {/* Tests ordered */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {o.items && o.items.length > 0 ? (
                            o.items.slice(0, 2).map((item, idx) => (
                              <span
                                key={idx}
                                className="inline-block bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] truncate max-w-[120px]"
                                title={item.test_name}
                              >
                                {item.test_name}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400">1 investigation</span>
                          )}
                          {o.items && o.items.length > 2 && (
                            <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                              +{o.items.length - 2} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Visit Type */}
                      <td className="py-3 px-4">
                        {o.visit_type === "home_collection" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800/40">
                            <Truck className="w-3 h-3" /> Home
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            <Building2 className="w-3 h-3" /> Walk-in
                          </span>
                        )}
                      </td>

                      {/* Total Amount */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        ₹{Number(o.total_amount).toLocaleString()}
                      </td>

                      {/* Commission Breakdown */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold font-mono">
                            Admin: ₹{Number(o.admin_commission).toFixed(2)}
                            <span className="text-[10px] text-emerald-600 font-normal ml-1">
                              ({o.effective_commission_rate}%)
                            </span>
                          </span>
                          <span className="text-blue-700 dark:text-blue-400 font-medium font-mono text-[11px]">
                            Lab: ₹{Number(o.lab_payout).toFixed(2)}
                          </span>
                        </div>
                      </td>

                      {/* Payment Status */}
                      <td className="py-3 px-4">
                        {getPaymentBadge(o.payment_status)}
                      </td>

                      {/* Order Status */}
                      <td className="py-3 px-4">
                        {getStatusBadge(o.status)}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenDetail(o.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-[#0067A1] hover:bg-[#0067A1]/10 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-500">
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total orders)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full Order Inspection Modal / Drawer */}
      {selectedOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl my-6 flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#0067A1]/10 text-[#0067A1]">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      Order #{orderDetail?.order?.unid || selectedOrderId?.slice(0, 8)}
                    </h2>
                    {orderDetail && getPaymentBadge(orderDetail.order.payment_status)}
                    {orderDetail && getStatusBadge(orderDetail.order.status)}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Order ID: <span className="font-mono">{orderDetail?.order?.id}</span> • Placed {orderDetail?.order?.created_at ? dayjs(orderDetail.order.created_at).format("DD MMMM YYYY, hh:mm A") : ""}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedOrderId(null);
                  setOrderDetail(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {loadingDetail ? (
                <div className="py-20 text-center text-slate-500">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#0067A1] mb-3" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Fetching order audit details...</p>
                  <p className="text-xs text-slate-400 mt-1">Retrieving category commission, clinical prescriptions & legal consents</p>
                </div>
              ) : orderDetail ? (
                <>
                  {/* Financial & Category Commission Summary Banner */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-5 gap-4">
                    <div>
                      <span className="text-[11px] text-slate-500 font-medium">Tests Subtotal</span>
                      <p className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">
                        ₹{Number(orderDetail.financials.items_subtotal).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 font-medium">Collection Fee</span>
                      <p className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">
                        ₹{Number(orderDetail.financials.home_collection_fee).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 font-medium">Total Paid / Billed</span>
                      <p className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">
                        ₹{Number(orderDetail.financials.gross_total).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-emerald-100/60 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-300 dark:border-emerald-800">
                      <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold">Admin Platform Cut</span>
                      <p className="text-lg font-black text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
                        ₹{Number(orderDetail.financials.total_admin_commission).toFixed(2)}
                      </p>
                      <span className="text-[10px] text-emerald-600 font-semibold">
                        ({orderDetail.financials.effective_commission_rate}% effective)
                      </span>
                    </div>
                    <div className="bg-blue-100/60 dark:bg-blue-950/40 p-2.5 rounded-lg border border-blue-300 dark:border-blue-800">
                      <span className="text-[11px] text-blue-800 dark:text-blue-300 font-bold">Lab Partner Share</span>
                      <p className="text-lg font-black text-blue-700 dark:text-blue-400 font-mono mt-0.5">
                        ₹{Number(orderDetail.financials.total_lab_payout).toFixed(2)}
                      </p>
                      <span className="text-[10px] text-blue-600 font-semibold">Partner Disbursal</span>
                    </div>
                  </div>

                  {/* Test Items & Category Commission Table */}
                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-[#0067A1]" />
                      <span>Ordered Investigations & Category Commission</span>
                    </h3>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                          <tr>
                            <th className="py-2.5 px-3">#</th>
                            <th className="py-2.5 px-3">Test Investigation</th>
                            <th className="py-2.5 px-3">Internal Category Tier</th>
                            <th className="py-2.5 px-3">Price (₹)</th>
                            <th className="py-2.5 px-3">Commission %</th>
                            <th className="py-2.5 px-3">Admin Commission</th>
                            <th className="py-2.5 px-3">Lab Partner Cut</th>
                            <th className="py-2.5 px-3">Item Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {orderDetail.items.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                              <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">
                                {item.test_name}
                              </td>
                              <td className="py-2 px-3">
                                {getCategoryBadge(item.category_name, item.commission_percentage)}
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                                ₹{Number(item.price).toLocaleString()}
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-slate-600 dark:text-slate-400">
                                {item.commission_percentage}%
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                ₹{Number(item.admin_commission).toFixed(2)}
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                                ₹{Number(item.lab_share).toFixed(2)}
                              </td>
                              <td className="py-2 px-3">
                                <span className="capitalize text-slate-600 dark:text-slate-300 font-medium">
                                  {item.status || "pending"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 2-Column Info Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Patient Card */}
                    <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-2.5">
                      <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <User className="w-4 h-4 text-[#0067A1]" />
                        <span>Patient Information</span>
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Full Name</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{orderDetail.patient.full_name}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Phone Number</span>
                          <span className="font-mono text-slate-800 dark:text-slate-200">{orderDetail.patient.phone_number}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Email</span>
                          <span className="text-slate-800 dark:text-slate-200 truncate block">{orderDetail.patient.email}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Demographics</span>
                          <span className="text-slate-800 dark:text-slate-200 capitalize">
                            {orderDetail.patient.gender || "N/A"}, {orderDetail.patient.age ? `${orderDetail.patient.age} yrs` : "N/A"}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 block text-[11px]">Registered Address</span>
                          <span className="text-slate-800 dark:text-slate-200">{orderDetail.patient.address || "N/A"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Laboratory Card */}
                    <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-2.5">
                      <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#0067A1]" />
                        <span>Diagnostic Laboratory Partner</span>
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Lab Name</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{orderDetail.lab.lab_name}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Contact Phone</span>
                          <span className="font-mono text-slate-800 dark:text-slate-200">{orderDetail.lab.phone_number || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">License / Accreditation</span>
                          <span className="font-mono text-slate-800 dark:text-slate-200">{orderDetail.lab.license_number || "Verified Partner"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Rating</span>
                          <span className="font-semibold text-amber-600">★ {orderDetail.lab.rating || "4.8"} / 5.0</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 block text-[11px]">Facility Address</span>
                          <span className="text-slate-800 dark:text-slate-200">{orderDetail.lab.address || "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Address & Sample Collection Logistics */}
                  <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Truck className="w-4 h-4 text-[#0067A1]" />
                      <span>Fulfillment & Phlebotomist Tracking</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Fulfillment Type</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">
                          {orderDetail.order.visit_type === "home_collection" ? "Home Sample Collection (+₹150)" : "Walk-in Center Visit"}
                        </span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-slate-400 block text-[11px]">Collection / Visit Address</span>
                        <span className="text-slate-800 dark:text-slate-200">
                          {orderDetail.order.delivery_address?.full_address || orderDetail.order.delivery_address?.address || "Walk-in Lab Visit"}
                          {orderDetail.order.delivery_address?.city && `, ${orderDetail.order.delivery_address.city}`}
                          {orderDetail.order.delivery_address?.pincode && ` - ${orderDetail.order.delivery_address.pincode}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Prescribing Doctor & Clinical Details (if attached) */}
                  {orderDetail.prescription && (
                    <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-2.5">
                      <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-[#0067A1]" />
                        <span>Prescribing Physician & Clinical Context</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Doctor</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            Dr. {orderDetail.prescription.doctor_name || "Assigned Doctor"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Specialization</span>
                          <span className="text-slate-800 dark:text-slate-200">
                            {orderDetail.prescription.doctor_specialization || "General Medicine"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Primary Diagnosis</span>
                          <span className="text-slate-800 dark:text-slate-200 font-medium">
                            {typeof orderDetail.prescription.diagnosis === "object"
                              ? orderDetail.prescription.diagnosis?.primary || JSON.stringify(orderDetail.prescription.diagnosis)
                              : orderDetail.prescription.diagnosis || "Clinical investigation"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payment & Razorpay Audit */}
                  <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[#0067A1]" />
                      <span>Payment Gateway Audit</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                      <div>
                        <span className="text-slate-400 block text-[11px] font-sans">Razorpay Order ID</span>
                        <span className="text-slate-800 dark:text-slate-200">{orderDetail.order.razorpay_order_id || "Direct Order"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px] font-sans">Razorpay Payment ID</span>
                        <span className="text-slate-800 dark:text-slate-200">{orderDetail.order.razorpay_payment_id || "Pending Verification"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px] font-sans">Payment Status</span>
                        <span className="font-bold capitalize">{orderDetail.order.payment_status}</span>
                      </div>
                    </div>
                  </div>

                  {/* Legal Medical Law Consents */}
                  {orderDetail.consents && orderDetail.consents.length > 0 && (
                    <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-2">
                      <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-600" />
                        <span>Compliance & Legal Consents Logged</span>
                      </h4>
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600" /> Sample Collection Consent Granted
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600" /> Medical Data Sharing Consent Granted
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600" /> Clinical Terms Accepted
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Logged on: {dayjs(orderDetail.consents[0].consent_timestamp).format("DD MMM YYYY, hh:mm:ss A")} • Device: {orderDetail.consents[0].device_type || "web"}
                      </p>
                    </div>
                  )}

                  {/* Admin Order Modification Controls */}
                  <form onSubmit={handleUpdateOrder} className="bg-slate-100/60 dark:bg-slate-800/80 rounded-xl p-4 border border-slate-300 dark:border-slate-700 space-y-3">
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#0067A1]" />
                        <span>Administrative Order Control</span>
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal">Update status & technician assignment</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Order Fulfillment Status</label>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                        >
                          <option value="pending">Pending</option>
                          <option value="booked">Booked</option>
                          <option value="sent_to_lab">Sent to Lab</option>
                          <option value="sample_collected">Sample Collected</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Payment Status</label>
                        <select
                          value={editPaymentStatus}
                          onChange={(e) => setEditPaymentStatus(e.target.value)}
                          className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                        >
                          <option value="pending">Payment Pending</option>
                          <option value="paid">Paid</option>
                          <option value="failed">Failed</option>
                          <option value="refunded">Refunded</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Phlebotomist / Tech Status</label>
                        <select
                          value={editTechStatus}
                          onChange={(e) => setEditTechStatus(e.target.value)}
                          className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                        >
                          <option value="unassigned">Unassigned</option>
                          <option value="assigned">Assigned</option>
                          <option value="en_route">En Route to Patient</option>
                          <option value="sample_collected">Sample Collected</option>
                          <option value="delivered_to_lab">Delivered to Lab</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Technician Name</label>
                        <input
                          type="text"
                          value={editTechName}
                          onChange={(e) => setEditTechName(e.target.value)}
                          placeholder="e.g. Rahul Sharma"
                          className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Technician Phone</label>
                        <input
                          type="text"
                          value={editTechPhone}
                          onChange={(e) => setEditTechPhone(e.target.value)}
                          placeholder="e.g. 9876543210"
                          className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Admin / Lab Observation Notes</label>
                        <input
                          type="text"
                          value={editLabNotes}
                          onChange={(e) => setEditLabNotes(e.target.value)}
                          placeholder="Notes for order..."
                          className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={updatingStatus}
                        className="px-4 py-2 bg-[#0067A1] hover:bg-[#005282] text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                      >
                        {updatingStatus ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>Save Order Updates</span>
                      </button>
                    </div>
                  </form>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
