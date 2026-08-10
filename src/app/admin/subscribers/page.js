"use client";

import { useState, useEffect } from "react";
import { Mail, Users, Clock, Download, Search, Trash2, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

export default function SubscribersPage() {
    const [subscribers, setSubscribers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchSubscribers = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/subscribers");
            const data = await res.json();
            setSubscribers(data.subscribers || []);
        } catch (err) {
            toast.error("Failed to load subscribers");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubscribers();
    }, []);

    const filteredSubscribers = subscribers.filter((s) =>
        s.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const exportCSV = () => {
        const csvContent =
            "data:text/csv;charset=utf-8," +
            "Email,Subscribed At\n" +
            subscribers.map((s) => `${s.email},${s.subscribed_at}`).join("\n");

        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `subscribers_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success("CSV exported successfully!");
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "N/A";
        return new Date(dateStr).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <main className="flex-1 p-2 md:p-4 overflow-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">
                    Newsletter Subscribers
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Manage subscribers from the &quot;Stay informed about your care&quot; section
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#0067A1]/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-[#0067A1]" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{subscribers.length}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Total Subscribers</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                                {subscribers.filter((s) => {
                                    const d = new Date(s.subscribed_at);
                                    const now = new Date();
                                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                                }).length}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">This Month</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                            <Mail className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                                {subscribers.filter((s) => {
                                    const d = new Date(s.subscribed_at);
                                    const now = new Date();
                                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                                    return d >= weekAgo;
                                }).length}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">This Week</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by email..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1]"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchSubscribers}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <button
                        onClick={exportCSV}
                        disabled={subscribers.length === 0}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-[#0067A1] text-white rounded-lg hover:bg-[#004F7C] transition-colors disabled:opacity-50"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Subscribers Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-12 flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-3 border-[#0067A1] border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-gray-500">Loading subscribers...</p>
                    </div>
                ) : filteredSubscribers.length === 0 ? (
                    <div className="p-12 text-center">
                        <Mail className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 font-medium">
                            {searchQuery ? "No subscribers match your search" : "No subscribers yet"}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            Subscribers will appear here once visitors subscribe from the footer
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        #
                                    </th>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Email Address
                                    </th>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Subscribed At
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredSubscribers.map((sub, idx) => (
                                    <tr
                                        key={sub.id || idx}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                    >
                                        <td className="px-4 py-3 text-sm text-gray-400">{idx + 1}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-[#0067A1]/10 flex items-center justify-center flex-shrink-0">
                                                    <Mail className="w-4 h-4 text-[#0067A1]" />
                                                </div>
                                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                    {sub.email}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                            {formatDate(sub.subscribed_at)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </main>
    );
}
