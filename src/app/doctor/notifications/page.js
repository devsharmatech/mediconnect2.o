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

    try {
      await api.post("/notifications/delete", {
        user_id: userId,
        all: true,
      });
      setNotifications([]);
    } catch (err) {
      console.error("Failed to clear notifications", err);
    }
  };

  const deleteSingle = async (notificationId) => {
    if (typeof window === "undefined") return;
    const userId = localStorage.getItem("userId");
    if (!userId || !notificationId) return;

    try {
      await api.post("/notifications/delete", {
        user_id: userId,
        notification_ids: [notificationId],
      });
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (err) {
      console.error("Failed to delete notification", err);
    }
  };

  const markSingleAsRead = async (notificationId) => {
    if (typeof window === "undefined") return;
    const userId = localStorage.getItem("userId");
    if (!userId || !notificationId) return;

    try {
      await api.post("/notifications/read", {
        user_id: userId,
        notification_ids: [notificationId],
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Handle notification click — mark read + route to relevant page
  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markSingleAsRead(notification.id);
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

    let metaObj = null;
    try {
      metaObj = typeof notification.metadata === "string"
        ? JSON.parse(notification.metadata)
        : notification.metadata;
    } catch { }

    const appointmentId = metaObj?.appointment_id || metaObj?.id || metaObj?.consultation_id || notification.appointment_id;

    const type = (notification.type || "").toLowerCase();
    if (
      type === "appointment" ||
      type === "appointment_status" ||
      type === "appointment_reminder" ||
      type === "appointment_reschedule" ||
      type === "appointment_booked"
    ) {
      if (appointmentId) {
        router.push(`/doctor/appointments?id=${appointmentId}&date=all&status=all`);
      } else {
        router.push("/doctor/appointments?date=all&status=all");
      }
    } else if (
      type === "instant_call" ||
      type === "instant_request" ||
      type === "instant"
    ) {
      router.push("/doctor/appointments?date=all&status=all");
    } else if (
      type === "consultation" ||
      type === "teleconsultation" ||
      type === "video_call_started"
    ) {
      if (appointmentId) {
        router.push(`/doctor/appointments?id=${appointmentId}&date=all&status=all`);
      } else {
        router.push("/doctor/appointments?date=all&status=all");
      }
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
    <div className="min-h-screen bg-slate-50 py-4 sm:py-6">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-[#0067A1] flex items-center justify-center text-white shrink-0">
              <FaBell className="w-5 h-5" />
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

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                filter === "all"
                  ? "bg-[#0067A1] text-white border-[#0067A1]"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                filter === "unread"
                  ? "bg-[#0067A1] text-white border-[#0067A1]"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Unread
              {unreadCount > 0 && (
                <span className="ml-0.5 inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-rose-500 text-white text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FaCheckCircle className="w-3 h-3" />
              Mark all read
            </button>
            <button
              onClick={clearAll}
              disabled={notifications.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FaTrash className="w-3 h-3" />
              Clear all
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs sm:text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center gap-3 px-4">
              <div className="w-12 h-12 rounded-md bg-slate-100 flex items-center justify-center text-slate-400">
                <FaBell className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-slate-700">
                No notifications found
              </p>
              <p className="text-xs text-slate-400 max-w-md">
                Appointment updates, consultation requests, and other alerts will appear here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`px-4 sm:px-5 py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                    !n.read ? "bg-sky-50/30 border-l-[3px] border-l-[#0067A1]" : "bg-white border-l-[3px] border-l-transparent"
                  }`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className="flex items-start gap-3 sm:gap-4 max-w-full flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-md bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0067A1] shrink-0 mt-0.5">
                      <FaBell className="w-3.5 h-3.5" />
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                        {n.type || "Notification"}
                      </p>
                      <p className="text-sm font-medium text-slate-800 break-words">
                        {formatMessageText(n.title || n.message)}
                      </p>
                      {n.message && n.title && (
                        <p className="text-xs text-slate-600 break-words">
                          {formatMessageText(n.message)}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1">
                        <span className="inline-flex items-center gap-1">
                          <FaCalendarAlt className="w-3 h-3 text-slate-400" />
                          {formatTime(n.created_at)}
                        </span>
                        {!n.read && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                            Unread
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                    {!n.read && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          markSingleAsRead(n.id);
                        }}
                        className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="Mark as read"
                      >
                        <FaCheckCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSingle(n.id);
                      }}
                      className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete notification"
                    >
                      <FaTrash className="w-3.5 h-3.5" />
                    </button>
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
