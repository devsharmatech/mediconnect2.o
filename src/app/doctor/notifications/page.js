"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FaBell,
  FaCheckCircle,
  FaTrash,
  FaCalendarAlt,
  FaClock,
} from "react-icons/fa";
import api from "@/utils/websiteApi";

const formatMessageText = (message) => {
  if (!message) return "";
  try {
    // 1. Match YYYY-MM-DD
    const dateRegex = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
    let formattedMessage = message.replace(dateRegex, (match, y, m, d) => {
      const date = new Date(Number(y), Number(m) - 1, Number(d));
      if (isNaN(date.getTime())) return match;
      return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    });

    // 2. Match HH:MM or HH:MM:SS (24-hour format) avoiding already formatted times
    const timeRegex = /\b(\d{2}):(\d{2})(?::(\d{2}))?(?!\s*(?:AM|PM|am|pm))\b/g;
    formattedMessage = formattedMessage.replace(timeRegex, (match, hh, mm, ss) => {
      let hours = Number(hh);
      const minutes = mm;
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      const formattedHours = hours < 10 ? `0${hours}` : hours;
      return `${formattedHours}:${minutes} ${ampm}`;
    });

    // 3. Clean up any trailing seconds/colons after AM/PM indicators (e.g. PM:00 or PM:30)
    formattedMessage = formattedMessage
      .replace(/(AM|PM|am|pm):(\d{2})/g, '$1')
      .replace(/(AM|PM|am|pm):00/g, '$1');

    return formattedMessage;
  } catch (err) {
    console.error("Error formatting message text:", err);
    return message;
  }
};

export default function DoctorNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const userRole = localStorage.getItem("userRole");
    const userId = localStorage.getItem("userId");

    if (!userId || userRole !== "doctor") {
      router.replace("/website");
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.post("/notifications/get", {
          user_id: userId,
          unread: filter === "unread",
          page: 1,
        });

        if (res?.success && Array.isArray(res.data)) {
          setNotifications(res.data);
        } else {
          setNotifications([]);
        }
      } catch (err) {
        console.error("Failed to load notifications", err);
        setError("Unable to load notifications right now.");
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router, filter]);

  const markAllAsRead = async () => {
    if (typeof window === "undefined") return;
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    try {
      await api.post("/notifications/read", { user_id: userId });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Failed to mark notifications as read", err);
    }
  };

  const clearAll = async () => {
    if (typeof window === "undefined") return;
    const userId = localStorage.getItem("userId");
    if (!userId || notifications.length === 0) return;

    if (!window.confirm("Clear all notifications?")) return;

    try {
      await api.post("/notifications/delete", {
        user_id: userId,
        notification_ids: notifications.map((n) => n.id),
      });
      setNotifications([]);
    } catch (err) {
      console.error("Failed to clear notifications", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Handle notification click — mark read + route to relevant page
  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      if (userId) {
        try {
          await api.post("/notifications/read", {
            user_id: userId,
            notification_ids: [notification.id],
          });
          setNotifications((prev) =>
            prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
          );
        } catch { }
      }
    }

    // Try metadata action_url first
    let actionUrl = null;
    try {
      const meta = typeof notification.metadata === "string"
        ? JSON.parse(notification.metadata)
        : notification.metadata;
      actionUrl = meta?.action_url || meta?.redirect_url || null;
    } catch { }
    actionUrl = actionUrl || notification.action_url || notification.redirect_url || null;

    if (actionUrl) {
      router.push(actionUrl);
      return;
    }

    const type = (notification.type || "").toLowerCase();
    if (
      type === "appointment" ||
      type === "appointment_status" ||
      type === "appointment_reminder" ||
      type === "appointment_reschedule" ||
      type === "appointment_booked"
    ) {
      router.push("/doctor/appointments");
    } else if (
      type === "consultation" ||
      type === "teleconsultation" ||
      type === "instant_call" ||
      type === "video_call_started"
    ) {
      router.push("/doctor");
    } else if (type === "prescription") {
      router.push("/doctor/prescriptions");
    } else {
      router.push("/doctor");
    }
  };

  const formatTime = (createdAt) => {
    if (!createdAt) return "";
    try {
      const d = new Date(createdAt);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] to-[#F0F7F6] py-4 sm:py-6">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-0 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#0067A1] shadow-lg">
              <FaBell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
                Notifications
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                All alerts and updates related to your practice
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                filter === "all"
                  ? "bg-[#0067A1] text-white border-[#0067A1]"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                filter === "unread"
                  ? "bg-[#0067A1] text-white border-[#0067A1]"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Unread
              {unreadCount > 0 && (
                <span className="ml-0.5 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaCheckCircle className="w-3 h-3" />
              Mark all read
            </button>
            <button
              onClick={clearAll}
              disabled={notifications.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaTrash className="w-3 h-3" />
              Clear all
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs sm:text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-md border border-slate-100">
          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center justify-center gap-3 px-4">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                <FaBell className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">
                No notifications found
              </p>
              <p className="text-xs text-slate-400 max-w-md">
                Appointment updates, instant call alerts, and other activity will
                appear here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`px-4 sm:px-5 py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 cursor-pointer hover:bg-[#0067A1]/10 transition-colors ${
                    !n.read ? "bg-[#0067A1]/5" : "bg-white"
                  }`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className="flex items-start gap-3 sm:gap-4 max-w-full">
                    <div className="mt-0.5">
                      <FaBell className="w-4 h-4 text-[#0067A1]" />
                    </div>
                    <div className="space-y-1 max-w-full">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {n.type || "Notification"}
                      </p>
                      <p className="text-sm sm:text-[15px] font-medium text-slate-800 break-words">
                        {formatMessageText(n.title || n.message)}
                      </p>
                      {n.message && n.title && (
                        <p className="text-xs text-slate-600 break-words">
                          {formatMessageText(n.message)}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1">
                        <span className="inline-flex items-center gap-1">
                          <FaCalendarAlt className="w-3 h-3" />
                          {formatTime(n.created_at)}
                        </span>
                        {!n.read && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                            New
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-400">
          <span>
            Showing {notifications.length} notification
            {notifications.length === 1 ? "" : "s"}
          </span>
          <Link
            href="/doctor"
            className="text-[#0067A1] font-semibold hover:underline"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
