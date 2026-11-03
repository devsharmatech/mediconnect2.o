"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  CreditCard,
  Search,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Pill,
  Download,
  IndianRupee,
  Layers,
  ArrowRight,
  Check,
  ShieldCheck,
  ExternalLink,
  Copy
} from "lucide-react";

dayjs.extend(relativeTime);

export default function AdminChemistPaymentsPage() {
  const [activeTab, setActiveTab] = useState("transactions"); // "transactions" | "payouts"
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [chemistsList, setChemistsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters state
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [chemistFilter, setChemistFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Record Settlement Modal
  const [selectedBatchForSettlement, setSelectedBatchForSettlement] = useState(null);
  const [settlementUtr, setSettlementUtr] = useState("");
  const [settlementMode, setSettlementMode] = useState("NEFT");
  const [settlementNotes, setSettlementNotes] = useState("");
  const [settling, setSettling] = useState(false);

  // View Payment Audit Modal
  const [selectedTransactionAudit, setSelectedTransactionAudit] = useState(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams({
        tab: activeTab,
        page: page.toString(),
        limit: "15",
        search: search.trim(),
        status: statusFilter,
        chemist_id: chemistFilter,
      });

      const res = await fetch(`/api/admin/chemists/payments?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        if (activeTab === "transactions") {
          setItems(data.data.transactions || []);
        } else {
          setItems(data.data.payouts || []);
        }
        setSummary(data.data.summary || null);
        setChemistsList(data.data.chemists || []);
        setPagination(data.data.pagination || { total: 0, totalPages: 1 });
      } else {
        toast.error(data.error || "Failed to load chemist payments");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error while loading payments");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, page, search, statusFilter, chemistFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
    setStatusFilter("all");
  };

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatusFilter("all");
    setChemistFilter("all");
    setPage(1);
  };

  const handleRecordSettlement = async (e) => {
    e.preventDefault();
    if (!settlementUtr.trim()) {
      toast.error("Please enter a valid UTR or payment reference");
      return;
    }
    setSettling(true);
    try {
      const res = await fetch("/api/admin/chemists/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: selectedBatchForSettlement?.id,
          utrNumber: settlementUtr.trim(),
          paymentMode: settlementMode,
          notes: settlementNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Settlement recorded successfully");
        setSelectedBatchForSettlement(null);
        setSettlementUtr("");
        setSettlementNotes("");
        fetchData(true);
      } else {
        toast.error(data.error || "Settlement recording failed");
      }
    } catch {
      toast.error("Network error during settlement");
    } finally {
      setSettling(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const exportCSV = () => {
    if (!items || items.length === 0) {
      toast.error("No records to export");
      return;
    }
    let headers = [];
    let rows = [];

    if (activeTab === "transactions") {
      headers = ["Order UNID", "Date", "Pharmacy Name", "Chemist Owner", "Patient", "Total Amount", "Chemist Payout", "Platform Fee", "Payment Method", "Payment Status", "Txn ID", "UTR"];
      rows = items.map(t => [
        `"${t.unid || ""}"`,
        `"${dayjs(t.created_at).format("YYYY-MM-DD HH:mm")}"`,
        `"${(t.pharmacy_name || "").replace(/"/g, '""')}"`,
        `"${(t.chemist_owner || "").replace(/"/g, '""')}"`,
        `"${(t.patient_name || "").replace(/"/g, '""')}"`,
        t.total_amount || 0,
        t.chemist_payout_amount || 0,
        t.platform_commission_amount || 0,
        `"${t.payment_method || ""}"`,
        `"${t.payment_status || ""}"`,
        `"${t.payu_txnid || t.razorpay_payment_id || ""}"`,
        `"${t.utr_number || ""}"`,
      ]);
    } else {
      headers = ["Batch Period", "Start Date", "End Date", "Pharmacy Name", "Chemist Owner", "Total Orders", "Gross Value", "Platform Commission", "Net Payout", "Status", "UTR", "Bank Name", "Account Number", "UPI ID"];
      rows = items.map(p => [
        `"${p.batch_period || ""}"`,
        `"${dayjs(p.period_start).format("YYYY-MM-DD")}"`,
        `"${dayjs(p.period_end).format("YYYY-MM-DD")}"`,
        `"${(p.pharmacy_name || "").replace(/"/g, '""')}"`,
        `"${(p.owner_name || "").replace(/"/g, '""')}"`,
        p.total_orders || 0,
        p.gross_orders_amount || 0,
        p.total_platform_commission || 0,
        p.net_payout || 0,
        `"${p.status || ""}"`,
        `"${p.utr_number || ""}"`,
        `"${p.bank_name || ""}"`,
        `"${p.bank_account_number || ""}"`,
        `"${p.upi_id || ""}"`,
      ]);
    }

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `chemist_${activeTab}_${dayjs().format("YYYYMMDD_HHmm")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Payments exported to CSV");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full min-h-screen">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-md bg-[#0067A1]/10 flex items-center justify-center text-[#0067A1]">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Chemist Payments & Settlements
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Track patient payments, gateway reconciliations, and pharmacy payouts
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/chemists/orders"
            className="px-3 py-1.5 rounded-[5px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200 transition-colors flex items-center gap-1.5"
          >
            <Pill className="w-3.5 h-3.5 text-slate-500" />
            <span>Chemist Orders</span>
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
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="px-3 py-1.5 rounded-[5px] bg-[#0067A1] hover:bg-[#005282] text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ─── Financial KPI Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-md border border-slate-200 p-4 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase">Total Collected</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            ₹{Number(summary?.total_collected || 0).toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Paid / Verified patient orders</p>
        </div>

        <div className="bg-white rounded-md border border-slate-200 p-4 shadow-2xs">
          <p className="text-[11px] font-medium text-emerald-700 uppercase">Settled to Chemists</p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-800 mt-1">
            ₹{Number(summary?.total_settled || 0).toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Completed bank payouts</p>
        </div>

        <div className="bg-white rounded-md border border-slate-200 p-4 shadow-2xs">
          <p className="text-[11px] font-medium text-amber-700 uppercase">Pending Payouts</p>
          <p className="text-xl sm:text-2xl font-bold text-amber-800 mt-1">
            ₹{Number(summary?.pending_payout || 0).toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-amber-600 mt-0.5">Awaiting bank settlement</p>
        </div>

        <div className="bg-white rounded-md border border-slate-200 p-4 shadow-2xs">
          <p className="text-[11px] font-medium text-[#0067A1] uppercase">Platform Revenue</p>
          <p className="text-xl sm:text-2xl font-bold text-[#0067A1] mt-1">
            ₹{Number(summary?.platform_commission || 0).toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">MediConnect commission</p>
        </div>
      </div>

      {/* ─── Tab Switcher ─── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => handleTabChange("transactions")}
          className={`px-4 py-2 rounded-[5px] text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "transactions"
              ? "bg-[#0067A1] text-white shadow-2xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Order Transactions</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("payouts")}
          className={`px-4 py-2 rounded-[5px] text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "payouts"
              ? "bg-[#0067A1] text-white shadow-2xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Chemist Settlement Batches</span>
        </button>
      </div>

      {/* ─── Filter Bar ─── */}
      <div className="bg-white rounded-md border border-slate-200 p-3 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder={
              activeTab === "transactions"
                ? "Search by Order UNID, Pharmacy, Txn ID, UTR..."
                : "Search by Batch Period, Pharmacy, UTR, UPI ID..."
            }
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

        <div className="flex items-center gap-2">
          {activeTab === "transactions" ? (
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 rounded-[5px] bg-slate-50 border border-slate-200 text-slate-700 text-xs focus:outline-none focus:border-[#0067A1] cursor-pointer"
            >
              <option value="all">All Payment Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          ) : (
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 rounded-[5px] bg-slate-50 border border-slate-200 text-slate-700 text-xs focus:outline-none focus:border-[#0067A1] cursor-pointer"
            >
              <option value="all">All Settlement Statuses</option>
              <option value="reconciled">Reconciled</option>
              <option value="pending">Pending</option>
              <option value="settled">Settled</option>
              <option value="completed">Completed</option>
            </select>
          )}

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

          {(searchInput || statusFilter !== "all" || chemistFilter !== "all") && (
            <button
              type="button"
              onClick={resetFilters}
              className="px-2.5 py-1.5 rounded-[5px] bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-medium transition-colors cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ─── Table Content ─── */}
      <div className="bg-white rounded-md border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin text-[#0067A1] mx-auto mb-2" />
            <p className="text-xs font-medium">Loading payments data...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-800">No Records Found</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              No matching {activeTab === "transactions" ? "payment transactions" : "settlement batches"} found.
            </p>
          </div>
        ) : activeTab === "transactions" ? (
          /* ─── Tab 1: Order Transactions Table ─── */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">Order</th>
                  <th className="py-3 px-3.5">Chemist / Pharmacy</th>
                  <th className="py-3 px-3.5">Patient</th>
                  <th className="py-3 px-3.5">Gross Amount</th>
                  <th className="py-3 px-3.5">Chemist Share</th>
                  <th className="py-3 px-3.5">Platform Fee</th>
                  <th className="py-3 px-3.5">Payment Status</th>
                  <th className="py-3 px-3.5">Gateway / UTR</th>
                  <th className="py-3 px-3.5 text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(t => {
                  const isPaid = (t.payment_status || "").toLowerCase() === "paid";
                  return (
                    <tr key={t.order_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3.5 align-top">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 font-mono">
                            #{t.unid || t.order_id.slice(0, 8)}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            {dayjs(t.created_at).format("DD MMM YYYY, hh:mm A")}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3.5 align-top max-w-[200px]">
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-slate-800 truncate" title={t.pharmacy_name}>
                            {t.pharmacy_name || "Unassigned"}
                          </span>
                          <span className="text-[10px] text-slate-500 truncate">{t.chemist_owner}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3.5 align-top max-w-[180px]">
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-slate-800 truncate">{t.patient_name || "Patient"}</span>
                          <span className="text-[10px] text-slate-400">{t.patient_phone}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3.5 align-top">
                        <span className="font-bold text-slate-900 text-[13px]">
                          ₹{Number(t.total_amount || 0).toLocaleString("en-IN")}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 align-top">
                        <span className="font-medium text-emerald-700">
                          ₹{Number(t.chemist_payout_amount || 0).toLocaleString("en-IN")}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 align-top">
                        <span className="font-medium text-[#0067A1]">
                          ₹{Number(t.platform_commission_amount || 0).toLocaleString("en-IN")}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 align-top">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] text-[10px] font-medium border ${
                          isPaid
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}>
                          {isPaid ? <CheckCircle className="w-2.5 h-2.5 text-emerald-600" /> : <Clock className="w-2.5 h-2.5 text-amber-600" />}
                          <span className="capitalize">{t.payment_status || "Pending"}</span>
                        </span>
                      </td>

                      <td className="py-3 px-3.5 align-top">
                        <div className="flex flex-col text-[10px]">
                          <span className="uppercase text-slate-500 font-medium">{t.payment_method || "Online"}</span>
                          {(t.utr_number || t.payu_txnid || t.razorpay_payment_id) && (
                            <span className="font-mono text-slate-400 truncate max-w-[120px]" title={t.utr_number || t.payu_txnid || t.razorpay_payment_id}>
                              {t.utr_number ? `UTR: ${t.utr_number}` : t.payu_txnid || t.razorpay_payment_id}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3.5 align-top text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedTransactionAudit(t)}
                          className="px-2.5 py-1 rounded-[4px] bg-slate-100 hover:bg-[#0067A1] text-slate-700 hover:text-white font-medium text-xs transition-colors cursor-pointer"
                        >
                          Audit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ─── Tab 2: Settlement Batches Table ─── */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">Batch Period</th>
                  <th className="py-3 px-3.5">Chemist / Pharmacy</th>
                  <th className="py-3 px-3.5">Orders</th>
                  <th className="py-3 px-3.5">Gross Orders</th>
                  <th className="py-3 px-3.5">Commission</th>
                  <th className="py-3 px-3.5">Net Payout</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5">Bank / UPI</th>
                  <th className="py-3 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(p => {
                  const isSettled = p.status === "settled" || p.status === "completed";
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3.5 align-top">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 font-mono">
                            {p.batch_period || "Batch"}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            {dayjs(p.period_start).format("DD MMM")} – {dayjs(p.period_end).format("DD MMM, YYYY")}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3.5 align-top max-w-[200px]">
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-slate-800 truncate" title={p.pharmacy_name}>
                            {p.pharmacy_name}
                          </span>
                          <span className="text-[10px] text-slate-500 truncate">{p.owner_name}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3.5 align-top">
                        <span className="font-medium text-slate-700">
                          {p.total_orders} Orders
                        </span>
                      </td>

                      <td className="py-3 px-3.5 align-top">
                        <span className="font-medium text-slate-800">
                          ₹{Number(p.gross_orders_amount || 0).toLocaleString("en-IN")}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 align-top">
                        <span className="text-[11px] text-[#0067A1]">
                          ₹{Number(p.total_platform_commission || 0).toLocaleString("en-IN")}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 align-top">
                        <span className="font-bold text-emerald-800 text-[13px]">
                          ₹{Number(p.net_payout || 0).toLocaleString("en-IN")}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 align-top">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10px] font-medium border ${
                          isSettled
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}>
                          {isSettled ? <CheckCircle className="w-2.5 h-2.5 text-emerald-600" /> : <Clock className="w-2.5 h-2.5 text-amber-600" />}
                          <span className="capitalize">{p.status || "Pending"}</span>
                        </span>
                        {p.utr_number && (
                          <p className="text-[9px] font-mono text-slate-400 mt-0.5">
                            UTR: {p.utr_number}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-3.5 align-top max-w-[180px]">
                        <div className="flex flex-col text-[10px] min-w-0">
                          {p.upi_id ? (
                            <span className="font-mono text-slate-700 truncate" title={p.upi_id}>
                              UPI: {p.upi_id}
                            </span>
                          ) : p.bank_name ? (
                            <span className="text-slate-600 truncate" title={`${p.bank_name} - ${p.bank_account_number}`}>
                              {p.bank_name} ({p.bank_account_number?.slice(-4) ? `...${p.bank_account_number.slice(-4)}` : "—"})
                            </span>
                          ) : (
                            <span className="text-slate-400">Not configured</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3.5 align-top text-right">
                        {!isSettled ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBatchForSettlement(p);
                              setSettlementUtr(p.utr_number || "");
                              setSettlementMode(p.payment_mode || "NEFT");
                            }}
                            className="px-2.5 py-1 rounded-[4px] bg-[#0067A1] hover:bg-[#005282] text-white font-medium text-xs transition-colors cursor-pointer"
                          >
                            Settle
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-700 font-medium">
                            Completed
                          </span>
                        )}
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
            Showing <span className="font-medium text-slate-900">{items.length}</span> of{" "}
            <span className="font-medium text-slate-900">{pagination.total}</span> records
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

      {/* ─── RECORD SETTLEMENT MODAL ─── */}
      {selectedBatchForSettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden border border-slate-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 bg-[#0067A1] text-white flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Record Chemist Settlement</h3>
                <p className="text-[11px] text-white/80">
                  {selectedBatchForSettlement.pharmacy_name} ({selectedBatchForSettlement.batch_period})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBatchForSettlement(null)}
                className="w-7 h-7 rounded-[4px] bg-white/20 hover:bg-white/30 flex items-center justify-center text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleRecordSettlement} className="p-4 space-y-3.5 text-xs">
              <div className="bg-emerald-50/80 p-3 rounded-md border border-emerald-200 flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-emerald-800 font-semibold uppercase">Net Payable Amount</p>
                  <p className="text-xl font-bold text-emerald-800">
                    ₹{Number(selectedBatchForSettlement.net_payout || 0).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="text-right text-[11px] text-slate-600">
                  <p>{selectedBatchForSettlement.total_orders} Orders included</p>
                  <p className="text-[10px] text-slate-400">Gross: ₹{selectedBatchForSettlement.gross_orders_amount}</p>
                </div>
              </div>

              {/* Chemist Bank Details Snapshot */}
              <div className="bg-slate-50 p-2.5 rounded-[4px] border border-slate-200 space-y-1">
                <p className="text-[10px] font-semibold text-slate-500 uppercase">Payout Destination</p>
                {selectedBatchForSettlement.upi_id && (
                  <p className="font-mono text-slate-800 text-[11px] flex items-center justify-between">
                    <span>UPI: {selectedBatchForSettlement.upi_id}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedBatchForSettlement.upi_id, "UPI ID")}
                      className="text-[#0067A1] hover:underline flex items-center gap-0.5 text-[10px]"
                    >
                      <Copy className="w-2.5 h-2.5" /> Copy
                    </button>
                  </p>
                )}
                {selectedBatchForSettlement.bank_account_number && (
                  <div className="text-slate-700 text-[11px] space-y-0.5">
                    <p>Bank: {selectedBatchForSettlement.bank_name}</p>
                    <p className="font-mono">A/C: {selectedBatchForSettlement.bank_account_number}</p>
                    <p className="font-mono">IFSC: {selectedBatchForSettlement.bank_ifsc_code}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Bank Reference / UTR Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={settlementUtr}
                  onChange={e => setSettlementUtr(e.target.value)}
                  placeholder="e.g. CMS298374928374"
                  className="w-full px-2.5 py-1.5 rounded-[5px] border border-slate-300 font-mono text-xs focus:outline-none focus:border-[#0067A1]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Payment Mode
                </label>
                <select
                  value={settlementMode}
                  onChange={e => setSettlementMode(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-[5px] border border-slate-300 text-xs focus:outline-none focus:border-[#0067A1]"
                >
                  <option value="NEFT">NEFT Transfer</option>
                  <option value="IMPS">IMPS Instant</option>
                  <option value="RTGS">RTGS Transfer</option>
                  <option value="UPI">UPI Instant</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Settlement Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={settlementNotes}
                  onChange={e => setSettlementNotes(e.target.value)}
                  placeholder="e.g. Processed via HDFC Corporate Netbanking"
                  className="w-full px-2.5 py-1.5 rounded-[5px] border border-slate-300 text-xs focus:outline-none focus:border-[#0067A1]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedBatchForSettlement(null)}
                  className="px-3 py-1.5 rounded-[5px] text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settling}
                  className="px-4 py-1.5 rounded-[5px] bg-[#0067A1] hover:bg-[#005282] text-white text-xs font-medium flex items-center gap-1.5 disabled:opacity-60 cursor-pointer shadow-2xs"
                >
                  {settling ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Confirm Settlement</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── TRANSACTION AUDIT MODAL ─── */}
      {selectedTransactionAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden border border-slate-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 bg-[#0067A1] text-white flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">
                  Transaction Audit #{selectedTransactionAudit.unid || selectedTransactionAudit.order_id.slice(0, 8)}
                </h3>
                <p className="text-[11px] text-white/80">
                  {selectedTransactionAudit.pharmacy_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTransactionAudit(null)}
                className="w-7 h-7 rounded-[4px] bg-white/20 hover:bg-white/30 flex items-center justify-center text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-md border border-slate-200">
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase">Gross Collected</p>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">₹{selectedTransactionAudit.total_amount}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase">Payment Status</p>
                  <p className="font-semibold text-emerald-700 capitalize mt-0.5">{selectedTransactionAudit.payment_status}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase">Chemist Payout Share</p>
                  <p className="font-medium text-slate-800 mt-0.5">₹{selectedTransactionAudit.chemist_payout_amount || 0}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase">MediConnect Fee</p>
                  <p className="font-medium text-[#0067A1] mt-0.5">₹{selectedTransactionAudit.platform_commission_amount || 0}</p>
                </div>
              </div>

              <div className="space-y-1 bg-slate-50 p-2.5 rounded-[4px] border border-slate-200 font-mono text-[11px]">
                <p className="text-slate-500 font-sans font-semibold uppercase text-[10px]">Gateway References</p>
                {selectedTransactionAudit.payu_txnid && (
                  <p><span className="text-slate-400 font-sans">PayU Txn ID:</span> {selectedTransactionAudit.payu_txnid}</p>
                )}
                {selectedTransactionAudit.payu_mihpayid && (
                  <p><span className="text-slate-400 font-sans">PayU MIH ID:</span> {selectedTransactionAudit.payu_mihpayid}</p>
                )}
                {selectedTransactionAudit.razorpay_payment_id && (
                  <p><span className="text-slate-400 font-sans">Razorpay ID:</span> {selectedTransactionAudit.razorpay_payment_id}</p>
                )}
                {selectedTransactionAudit.utr_number && (
                  <p><span className="text-slate-400 font-sans">Bank UTR:</span> {selectedTransactionAudit.utr_number}</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <Link
                  href={`/admin/chemists/orders`}
                  className="text-[#0067A1] hover:underline font-medium text-xs flex items-center gap-1"
                >
                  <span>Go to Chemist Orders</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>

                <button
                  type="button"
                  onClick={() => setSelectedTransactionAudit(null)}
                  className="px-3.5 py-1.5 rounded-[5px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

