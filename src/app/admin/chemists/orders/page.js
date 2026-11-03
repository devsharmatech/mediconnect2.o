"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  Pill,
  Search,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  Truck,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Building2,
  User,
  Shield,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  CreditCard,
  AlertCircle,
  Download,
  IndianRupee,
  ShoppingBag,
  Package,
  Layers,
  ArrowRight
} from "lucide-react";

dayjs.extend(relativeTime);

export default function AdminChemistOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [chemistsList, setChemistsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters state
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [chemistFilter, setChemistFilter] = useState("all");
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
  const [editChemistNotes, setEditChemistNotes] = useState("");

  // Debounce search input and reset page to 1
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

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
        chemist_id: chemistFilter,
        dateRange: dateRangeFilter,
      });

      const res = await fetch(`/api/admin/chemists/orders?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setOrders(data.data.orders || []);
        setSummary(data.data.summary || null);
        setChemistsList(data.data.chemists || []);
        setPagination(data.data.pagination || { total: 0, totalPages: 1 });
      } else {
        toast.error(data.error || "Failed to fetch chemist orders");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error while fetching orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, search, statusFilter, paymentFilter, chemistFilter, dateRangeFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Fetch single order details when opened
  const openOrderDetail = async (orderId) => {
    setSelectedOrderId(orderId);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/chemists/orders/${orderId}`);
      const data = await res.json();
      if (data.success) {
        setOrderDetail(data.data);
        setEditStatus(data.data.order?.status || "");
        setEditPaymentStatus(data.data.order?.payment_status || "");
        setEditChemistNotes(data.data.order?.chemist_notes || "");
      } else {
        toast.error(data.error || "Failed to load order details");
      }
    } catch {
      toast.error("Failed to load order inspection");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleUpdateOrder = async () => {
    if (!orderDetail?.order?.id) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/admin/chemists/orders`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderDetail.order.id,
          status: editStatus,
          payment_status: editPaymentStatus,
          chemist_notes: editChemistNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Order updated successfully");
        setOrderDetail(prev => ({
          ...prev,
          order: {
            ...prev.order,
            status: editStatus,
            payment_status: editPaymentStatus,
            chemist_notes: editChemistNotes,
          }
        }));
        fetchOrders(true);
      } else {
        toast.error(data.error || "Update failed");
      }
    } catch {
      toast.error("Failed to update order");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setChemistFilter("all");
    setDateRangeFilter("all");
    setPage(1);
  };

  const exportCSV = () => {
    if (!orders || orders.length === 0) {
      toast.error("No orders to export");
      return;
    }
    const headers = [
      "Order UNID",
      "Order ID",
      "Date",
      "Pharmacy Name",
      "Chemist Owner",
      "Chemist Phone",
      "Patient Name",
      "Patient Phone",
      "Delivery Address",
      "Status",
      "Payment Status",
      "Payment Method",
      "Total Amount",
      "Chemist Payout",
      "Platform Fee",
      "Items Count",
    ];
    const rows = orders.map(o => [
      `"${o.unid || o.id.slice(0, 8)}"`,
      `"${o.id}"`,
      `"${dayjs(o.created_at).format("YYYY-MM-DD HH:mm")}"`,
      `"${(o.pharmacy_name || "").replace(/"/g, '""')}"`,
      `"${(o.chemist_owner || "").replace(/"/g, '""')}"`,
      `"${o.chemist_mobile || ""}"`,
      `"${(o.patient_name || "").replace(/"/g, '""')}"`,
      `"${o.patient_phone || ""}"`,
      `"${(o.patient_address || "").replace(/"/g, '""')}"`,
      `"${o.status || ""}"`,
      `"${o.payment_status || ""}"`,
      `"${o.payment_method || ""}"`,
      o.total_amount || 0,
      o.chemist_payout_amount || 0,
      o.platform_commission_amount || 0,
      o.item_count || 0,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `chemist_orders_${dayjs().format("YYYYMMDD_HHmm")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Orders exported to CSV");
  };

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "delivered" || s === "completed") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle className="w-3 h-3 text-emerald-600" />
          <span className="capitalize">{s}</span>
        </span>
      );
    }
    if (s === "dispatched" || s === "out_for_delivery") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-sky-50 text-[#0067A1] border border-sky-200">
          <Truck className="w-3 h-3" />
          <span>Dispatched</span>
        </span>
      );
    }
    if (s === "preparing" || s === "accepted" || s === "processing") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Package className="w-3 h-3" />
          <span>Preparing</span>
        </span>
      );
    }
    if (s === "payment_submitted" || s === "payment_verified") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-teal-50 text-teal-700 border border-teal-200">
          <CreditCard className="w-3 h-3" />
          <span>Pay Verified</span>
        </span>
      );
    }
    if (s === "payment_pending" || s === "pending" || s === "quoted") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>Pending</span>
        </span>
      );
    }
    if (s === "cancelled" || s === "rejected") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-3 h-3 text-rose-600" />
          <span className="capitalize">{s}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
        <span className="capitalize">{status || "Unknown"}</span>
      </span>
    );
  };

  const getPaymentBadge = (status, method) => {
    const s = (status || "").toLowerCase();
    const isPaid = s === "paid" || s === "success" || s === "settled";
    return (
      <div className="flex flex-col gap-0.5">
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-[3px] text-[10px] font-medium w-fit border ${
          isPaid
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : s === "failed"
            ? "bg-rose-50 text-rose-700 border-rose-200"
            : "bg-amber-50 text-amber-800 border-amber-200"
        }`}>
          {isPaid ? <CheckCircle className="w-2.5 h-2.5 text-emerald-600" /> : <Clock className="w-2.5 h-2.5 text-amber-600" />}
          <span className="capitalize">{status || "Pending"}</span>
        </span>
        {method && (
          <span className="text-[10px] text-slate-500 font-normal uppercase tracking-wider">
            {method.replace("_", " ")}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full min-h-screen">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-md bg-[#0067A1]/10 flex items-center justify-center text-[#0067A1]">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Chemist Medicine Orders
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Monitor prescription & OTC medicine orders dispatched across partner pharmacies
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/chemists/payments"
            className="px-3 py-1.5 rounded-[5px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200 transition-colors flex items-center gap-1.5"
          >
            <CreditCard className="w-3.5 h-3.5 text-slate-500" />
            <span>Chemist Payments</span>
          </Link>
          <button
            type="button"
            onClick={exportCSV}
            className="px-3 py-1.5 rounded-[5px] bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            className="px-3 py-1.5 rounded-[5px] bg-[#0067A1] hover:bg-[#005282] text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ─── KPI Summary Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-md border border-slate-200 p-3.5 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase">Total Orders</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {summary?.total_orders || 0}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Lifetime platform orders</p>
        </div>

        <div className="bg-white rounded-md border border-slate-200 p-3.5 shadow-2xs">
          <p className="text-[11px] font-medium text-amber-700 uppercase">In Progress</p>
          <p className="text-xl sm:text-2xl font-bold text-amber-800 mt-1">
            {summary?.active_orders || 0}
          </p>
          <p className="text-[10px] text-amber-600 mt-0.5">Preparing / In Transit</p>
        </div>

        <div className="bg-white rounded-md border border-slate-200 p-3.5 shadow-2xs">
          <p className="text-[11px] font-medium text-emerald-700 uppercase">Delivered</p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-800 mt-1">
            {summary?.delivered_orders || 0}
          </p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Completed deliveries</p>
        </div>

        <div className="bg-white rounded-md border border-slate-200 p-3.5 shadow-2xs">
          <p className="text-[11px] font-medium text-rose-700 uppercase">Cancelled</p>
          <p className="text-xl sm:text-2xl font-bold text-rose-800 mt-1">
            {summary?.cancelled_orders || 0}
          </p>
          <p className="text-[10px] text-rose-600 mt-0.5">Rejected / Cancelled</p>
        </div>

        <div className="bg-white rounded-md border border-slate-200 p-3.5 shadow-2xs">
          <p className="text-[11px] font-medium text-[#0067A1] uppercase">Total Revenue</p>
          <p className="text-xl sm:text-2xl font-bold text-[#0067A1] mt-1">
            ₹{Number(summary?.total_revenue || 0).toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Delivered / Paid volume</p>
        </div>

        <div className="bg-white rounded-md border border-slate-200 p-3.5 shadow-2xs">
          <p className="text-[11px] font-medium text-emerald-700 uppercase">Paid Orders</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {summary?.paid_orders || 0}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {summary?.pending_payments || 0} pending payment
          </p>
        </div>
      </div>

      {/* ─── Filter Bar ─── */}
      <div className="bg-white rounded-md border border-slate-200 p-3 space-y-3 shadow-2xs">
        <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search by Order UNID, Pharmacy, Chemist, Patient Name, Phone, Txn ID..."
              className="w-full pl-9 pr-8 py-1.5 rounded-[5px] bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 text-xs focus:bg-white focus:border-[#0067A1] focus:outline-none transition-colors"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 rounded-[5px] bg-slate-50 border border-slate-200 text-slate-700 text-xs focus:outline-none focus:border-[#0067A1] cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="delivered">Delivered</option>
              <option value="completed">Completed</option>
              <option value="dispatched">Dispatched</option>
              <option value="preparing">Preparing</option>
              <option value="payment_submitted">Payment Submitted</option>
              <option value="payment_pending">Payment Pending</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Payment Filter */}
            <select
              value={paymentFilter}
              onChange={e => { setPaymentFilter(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 rounded-[5px] bg-slate-50 border border-slate-200 text-slate-700 text-xs focus:outline-none focus:border-[#0067A1] cursor-pointer"
            >
              <option value="all">All Payments</option>
              <option value="paid">Paid</option>
              <option value="pending">Payment Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>

            {/* Chemist Filter */}
            <select
              value={chemistFilter}
              onChange={e => { setChemistFilter(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 rounded-[5px] bg-slate-50 border border-slate-200 text-slate-700 text-xs focus:outline-none focus:border-[#0067A1] cursor-pointer max-w-[180px] truncate"
            >
              <option value="all">All Pharmacies</option>
              {chemistsList.map(c => (
                <option key={c.id} value={c.id}>
                  {c.pharmacy_name || c.owner_name}
                </option>
              ))}
            </select>

            {/* Date Range */}
            <select
              value={dateRangeFilter}
              onChange={e => { setDateRangeFilter(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 rounded-[5px] bg-slate-50 border border-slate-200 text-slate-700 text-xs focus:outline-none focus:border-[#0067A1] cursor-pointer"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="this_month">This Month</option>
            </select>

            {(searchInput || statusFilter !== "all" || paymentFilter !== "all" || chemistFilter !== "all" || dateRangeFilter !== "all") && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-2.5 py-1.5 rounded-[5px] bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-medium transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Orders Table & Content ─── */}
      <div className="bg-white rounded-md border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin text-[#0067A1] mx-auto mb-2" />
            <p className="text-xs font-medium">Loading chemist orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-800">No Chemist Orders Found</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Try adjusting your search criteria, status, or date range.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">Order</th>
                  <th className="py-3 px-3.5">Chemist / Pharmacy</th>
                  <th className="py-3 px-3.5">Patient Details</th>
                  <th className="py-3 px-3.5">Items Summary</th>
                  <th className="py-3 px-3.5">Total & Payout</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5">Payment</th>
                  <th className="py-3 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map(order => {
                  const items = Array.isArray(order.items) ? order.items : [];
                  const medicinePreview = items.map(i => i.medicine_name).filter(Boolean).slice(0, 2).join(", ");
                  const remainingCount = items.length > 2 ? items.length - 2 : 0;

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Order UNID & Date */}
                      <td className="py-3 px-3.5 align-top">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 font-mono">
                            #{order.unid || order.id.slice(0, 8)}
                          </span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-2.5 h-2.5 text-slate-400" />
                            {dayjs(order.created_at).format("DD MMM, YYYY")}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {dayjs(order.created_at).format("hh:mm A")}
                          </span>
                        </div>
                      </td>

                      {/* Chemist / Pharmacy */}
                      <td className="py-3 px-3.5 align-top max-w-[220px]">
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-slate-800 truncate" title={order.pharmacy_name}>
                            {order.pharmacy_name || "Unassigned"}
                          </span>
                          {order.chemist_owner && (
                            <span className="text-[11px] text-slate-500 truncate">
                              {order.chemist_owner}
                            </span>
                          )}
                          {order.chemist_mobile && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Phone className="w-2.5 h-2.5" /> {order.chemist_mobile}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Patient Details */}
                      <td className="py-3 px-3.5 align-top max-w-[220px]">
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-slate-800 truncate">
                            {order.patient_name || "Patient"}
                          </span>
                          {order.patient_phone && (
                            <span className="text-[11px] text-slate-500">
                              {order.patient_phone}
                            </span>
                          )}
                          {order.patient_address && (
                            <span className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5" title={order.patient_address}>
                              <MapPin className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{order.patient_address}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Items Summary */}
                      <td className="py-3 px-3.5 align-top max-w-[220px]">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-medium text-slate-700">
                            {order.item_count || items.length} {order.item_count === 1 ? "Medicine" : "Medicines"}
                          </span>
                          {medicinePreview && (
                            <p className="text-[10px] text-slate-500 truncate mt-0.5" title={items.map(i => i.medicine_name).join(", ")}>
                              {medicinePreview}
                              {remainingCount > 0 && ` +${remainingCount} more`}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Total & Payout */}
                      <td className="py-3 px-3.5 align-top">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 text-[13px]">
                            ₹{Number(order.total_amount || 0).toLocaleString("en-IN")}
                          </span>
                          {order.chemist_payout_amount && (
                            <span className="text-[10px] text-emerald-700 font-normal">
                              Chemist: ₹{Number(order.chemist_payout_amount).toLocaleString("en-IN")}
                            </span>
                          )}
                          {order.delivery_charge > 0 && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              Delivery: ₹{order.delivery_charge}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Order Status */}
                      <td className="py-3 px-3.5 align-top">
                        {getStatusBadge(order.status)}
                      </td>

                      {/* Payment Status */}
                      <td className="py-3 px-3.5 align-top">
                        {getPaymentBadge(order.payment_status, order.payment_method)}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3.5 align-top text-right">
                        <button
                          type="button"
                          onClick={() => openOrderDetail(order.id)}
                          className="px-2.5 py-1 rounded-[4px] bg-[#0067A1]/10 hover:bg-[#0067A1] text-[#0067A1] hover:text-white font-medium text-xs transition-colors cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── Pagination Footer ─── */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing <span className="font-medium text-slate-900">{orders.length}</span> of{" "}
            <span className="font-medium text-slate-900">{pagination.total}</span> orders
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2.5 py-1 rounded-[4px] bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-50 text-slate-700 cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5 inline mr-0.5" />
              <span>Prev</span>
            </button>
            <span className="px-2 text-slate-600 font-medium">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="px-2.5 py-1 rounded-[4px] bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-50 text-slate-700 cursor-pointer transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5 inline ml-0.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── ORDER DETAIL / INSPECTION DRAWER ─── */}
      {selectedOrderId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 transition-opacity">
          <div
            className="fixed inset-0"
            onClick={() => { setSelectedOrderId(null); setOrderDetail(null); }}
          />

          <div className="relative z-10 w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden">
            {/* Header */}
            <div className="px-5 py-3.5 bg-[#0067A1] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-white" />
                <div>
                  <h3 className="font-semibold text-sm">
                    Order #{orderDetail?.order?.unid || selectedOrderId.slice(0, 8)}
                  </h3>
                  <p className="text-[11px] text-white/80">
                    Placed {dayjs(orderDetail?.order?.created_at).format("DD MMM YYYY, hh:mm A")}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setSelectedOrderId(null); setOrderDetail(null); }}
                className="w-7 h-7 rounded-[4px] bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs bg-slate-50/50">
              {loadingDetail ? (
                <div className="p-16 text-center text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#0067A1] mx-auto mb-2" />
                  <p>Loading order details...</p>
                </div>
              ) : orderDetail?.order ? (
                <>
                  {/* Status & Payment Overview Banner */}
                  <div className="bg-white rounded-md border border-slate-200 p-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-slate-400">Current Order Status</p>
                      <div className="mt-1">
                        {getStatusBadge(orderDetail.order.status)}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase font-semibold text-slate-400">Payment Status</p>
                      <div className="mt-1">
                        {getPaymentBadge(orderDetail.order.payment_status, orderDetail.order.payment_method)}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase font-semibold text-slate-400">Total Order Value</p>
                      <p className="text-base font-bold text-[#0067A1] mt-0.5">
                        ₹{Number(orderDetail.order.total_amount || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  {/* Medicines / Items List */}
                  <div className="bg-white rounded-md border border-slate-200 p-4 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-[#0067A1]" />
                        <span>Prescribed Medicines ({orderDetail.items?.length || 0})</span>
                      </h4>
                      <span className="text-[10px] text-slate-500 font-normal">
                        Subtotal: ₹{Number(orderDetail.order.medicine_subtotal || orderDetail.order.total_amount || 0).toLocaleString("en-IN")}
                      </span>
                    </div>

                    {orderDetail.items && orderDetail.items.length > 0 ? (
                      <div className="divide-y divide-slate-100">
                        {orderDetail.items.map((item, idx) => (
                          <div key={item.id || idx} className="py-2 flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-slate-800 text-xs">{item.medicine_name}</p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                {item.dosage && <span>Dosage: {item.dosage}</span>}
                                {item.frequency && <span>Freq: {item.frequency}</span>}
                                {item.duration && <span>Duration: {item.duration}</span>}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-medium text-slate-700">
                                Qty: {item.quantity || 1}
                              </span>
                              {Number(item.price) > 0 && (
                                <p className="text-[11px] font-semibold text-slate-900 mt-0.5">
                                  ₹{Number(item.price).toLocaleString("en-IN")}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-xs py-2">No itemized breakdown recorded for this order.</p>
                    )}
                  </div>

                  {/* Chemist Pharmacy Info */}
                  <div className="bg-white rounded-md border border-slate-200 p-4 space-y-2">
                    <h4 className="font-semibold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <Building2 className="w-3.5 h-3.5 text-[#0067A1]" />
                      <span>Fulfilling Pharmacy</span>
                    </h4>

                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium uppercase">Pharmacy Name</p>
                        <p className="font-medium text-slate-800 mt-0.5">{orderDetail.order.pharmacy_name || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium uppercase">Owner / Pharmacist</p>
                        <p className="font-medium text-slate-800 mt-0.5">{orderDetail.order.chemist_owner || orderDetail.order.pharmacist_name || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium uppercase">Contact Phone</p>
                        <p className="font-medium text-slate-800 mt-0.5">{orderDetail.order.chemist_mobile || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium uppercase">Drug License</p>
                        <p className="font-mono text-slate-700 mt-0.5">{orderDetail.order.drug_license_no || "—"}</p>
                      </div>
                      {orderDetail.order.chemist_upi && (
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium uppercase">Chemist UPI ID</p>
                          <p className="font-mono text-slate-800 mt-0.5">{orderDetail.order.chemist_upi}</p>
                        </div>
                      )}
                      {orderDetail.order.chemist_bank_name && (
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium uppercase">Bank Account</p>
                          <p className="font-mono text-slate-800 mt-0.5">
                            {orderDetail.order.chemist_bank_name} ({orderDetail.order.chemist_account_no})
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Patient & Delivery Address */}
                  <div className="bg-white rounded-md border border-slate-200 p-4 space-y-2">
                    <h4 className="font-semibold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <User className="w-3.5 h-3.5 text-[#0067A1]" />
                      <span>Patient & Delivery Details</span>
                    </h4>

                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium uppercase">Patient Name</p>
                        <p className="font-medium text-slate-800 mt-0.5">{orderDetail.order.patient_name || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium uppercase">Phone Number</p>
                        <p className="font-medium text-slate-800 mt-0.5">{orderDetail.order.patient_phone || "—"}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] text-slate-400 font-medium uppercase">Delivery Address</p>
                        <p className="font-normal text-slate-700 mt-0.5">{orderDetail.order.patient_address || "No delivery address specified"}</p>
                      </div>
                      {orderDetail.order.patient_notes && (
                        <div className="col-span-2 bg-amber-50/70 p-2 rounded-[4px] border border-amber-200/80">
                          <p className="text-[10px] font-medium text-amber-800 uppercase">Patient Instructions</p>
                          <p className="text-slate-700 mt-0.5">{orderDetail.order.patient_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment & Gateway Breakdown */}
                  <div className="bg-white rounded-md border border-slate-200 p-4 space-y-2.5">
                    <h4 className="font-semibold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <CreditCard className="w-3.5 h-3.5 text-[#0067A1]" />
                      <span>Financial & Gateway Audit</span>
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium uppercase">Medicine Total</p>
                        <p className="font-semibold text-slate-800 mt-0.5">₹{orderDetail.order.medicine_subtotal || orderDetail.order.total_amount || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium uppercase">Delivery Fee</p>
                        <p className="font-medium text-slate-800 mt-0.5">₹{orderDetail.order.delivery_charge || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium uppercase">Discount</p>
                        <p className="font-medium text-slate-800 mt-0.5">₹{orderDetail.order.discount || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium uppercase">Chemist Payout</p>
                        <p className="font-semibold text-emerald-700 mt-0.5">₹{orderDetail.order.chemist_payout_amount || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium uppercase">Platform Fee</p>
                        <p className="font-medium text-[#0067A1] mt-0.5">₹{orderDetail.order.platform_commission_amount || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium uppercase">Settlement</p>
                        <p className="font-medium text-slate-700 mt-0.5 capitalize">{orderDetail.order.settlement_status || "Pending"}</p>
                      </div>
                    </div>

                    {(orderDetail.order.utr_number || orderDetail.order.payu_txnid || orderDetail.order.razorpay_payment_id) && (
                      <div className="bg-slate-50 p-2.5 rounded-[4px] border border-slate-200 mt-2 space-y-1">
                        {orderDetail.order.utr_number && (
                          <p className="text-[11px] font-mono">
                            <span className="text-slate-400">UTR:</span> {orderDetail.order.utr_number}
                          </p>
                        )}
                        {orderDetail.order.payu_txnid && (
                          <p className="text-[11px] font-mono">
                            <span className="text-slate-400">PayU Txn ID:</span> {orderDetail.order.payu_txnid}
                          </p>
                        )}
                        {orderDetail.order.razorpay_payment_id && (
                          <p className="text-[11px] font-mono">
                            <span className="text-slate-400">Razorpay ID:</span> {orderDetail.order.razorpay_payment_id}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Payment Proof Receipt (if uploaded by patient) */}
                  {orderDetail.order.payment_proof_url && (
                    <div className="bg-white rounded-md border border-slate-200 p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-emerald-600" />
                          <div>
                            <p className="font-semibold text-slate-800 text-xs">Payment Proof Receipt</p>
                            <p className="text-[10px] text-slate-400">Uploaded by patient for verification</p>
                          </div>
                        </div>
                        <a
                          href={orderDetail.order.payment_proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-[4px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>View Full Image</span>
                        </a>
                      </div>
                      <div className="w-full max-h-48 rounded-[4px] overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                        <img
                          src={orderDetail.order.payment_proof_url}
                          alt="Payment Proof"
                          className="w-full h-full object-contain max-h-48"
                        />
                      </div>
                    </div>
                  )}

                  {/* Prescription Information */}
                  {(orderDetail.order.prescription_file_url || orderDetail.order.prescription_record_id) && (
                    <div className="bg-white rounded-md border border-slate-200 p-4 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#0067A1]" />
                          <div>
                            <span className="font-semibold text-slate-900 text-xs">
                              Medical Prescription {orderDetail.order.prescription_unid ? `#${orderDetail.order.prescription_unid}` : ""}
                            </span>
                            {orderDetail.order.prescription_date && (
                              <span className="text-[10px] text-slate-400 ml-2">
                                {dayjs(orderDetail.order.prescription_date).format("DD MMM YYYY")}
                              </span>
                            )}
                          </div>
                        </div>

                        {orderDetail.order.prescription_file_url ? (
                          <a
                            href={orderDetail.order.prescription_file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-[4px] bg-[#0067A1]/10 hover:bg-[#0067A1] text-[#0067A1] hover:text-white text-xs font-medium flex items-center gap-1 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>View PDF</span>
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-[4px]">
                            <CheckCircle className="w-2.5 h-2.5 text-emerald-600" />
                            <span>Digitally Verified</span>
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                        <div className="bg-slate-50 p-2.5 rounded-[4px] border border-slate-200/80">
                          <p className="text-[10px] text-slate-400 font-medium uppercase">Consulting Doctor</p>
                          <p className="font-semibold text-slate-800 text-xs mt-0.5">
                            {orderDetail.order.doctor_name
                              ? orderDetail.order.doctor_name.toLowerCase().startsWith("dr")
                                ? orderDetail.order.doctor_name
                                : `Dr. ${orderDetail.order.doctor_name}`
                              : "Verified Clinical Doctor"}
                          </p>
                          {orderDetail.order.prescription_specialization && (
                            <p className="text-[10px] text-[#0067A1] font-medium mt-0.5">
                              {orderDetail.order.prescription_specialization}
                            </p>
                          )}
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-[4px] border border-slate-200/80">
                          <p className="text-[10px] text-slate-400 font-medium uppercase">Clinical Diagnosis</p>
                          <p className="font-medium text-slate-800 text-xs mt-0.5">
                            {orderDetail.order.prescription_diagnosis || "General Consultation"}
                          </p>
                          {orderDetail.order.doctor_phone && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Doctor Contact: {orderDetail.order.doctor_phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Admin Status Overwrite Controls */}
                  <div className="bg-sky-50/60 rounded-md border border-sky-200 p-4 space-y-3">
                    <h4 className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#0067A1]" />
                      <span>Admin Status & Notes Overwrite</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-medium text-slate-600 block mb-1">
                          Update Order Status
                        </label>
                        <select
                          value={editStatus}
                          onChange={e => setEditStatus(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-[5px] bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-[#0067A1]"
                        >
                          <option value="pending">Pending</option>
                          <option value="payment_pending">Payment Pending</option>
                          <option value="payment_submitted">Payment Submitted</option>
                          <option value="preparing">Preparing</option>
                          <option value="dispatched">Dispatched</option>
                          <option value="delivered">Delivered</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-medium text-slate-600 block mb-1">
                          Update Payment Status
                        </label>
                        <select
                          value={editPaymentStatus}
                          onChange={e => setEditPaymentStatus(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-[5px] bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-[#0067A1]"
                        >
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="failed">Failed</option>
                          <option value="refunded">Refunded</option>
                        </select>
                      </div>

                      <div className="col-span-full">
                        <label className="text-[10px] font-medium text-slate-600 block mb-1">
                          Internal Notes / Remarks
                        </label>
                        <textarea
                          rows={2}
                          value={editChemistNotes}
                          onChange={e => setEditChemistNotes(e.target.value)}
                          placeholder="Add any internal fulfillment or resolution remarks..."
                          className="w-full px-2.5 py-1.5 rounded-[5px] bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-[#0067A1]"
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Footer Actions */}
            <div className="p-3.5 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => { setSelectedOrderId(null); setOrderDetail(null); }}
                className="px-3.5 py-1.5 rounded-[5px] text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleUpdateOrder}
                disabled={updatingStatus}
                className="px-4 py-1.5 rounded-[5px] bg-[#0067A1] hover:bg-[#005282] text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-1.5 shadow-2xs"
              >
                {updatingStatus ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Update Order</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

