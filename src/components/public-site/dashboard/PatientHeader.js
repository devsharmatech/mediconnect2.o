"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FaUser,
  FaSignOutAlt,
  FaChevronDown,
  FaBell,
  FaBars,
  FaSearch,
  FaCog,
  FaCalendarAlt,
  FaCalendarCheck,
  FaFileMedical,
  FaExclamationCircle,
  FaCheckCircle,
  FaTrash,
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

const PatientHeader = ({ user, onMenuClick }) => {
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [modalNotifications, setModalNotifications] = useState([]);
  const [modalPage, setModalPage] = useState(1);
  const [modalHasMore, setModalHasMore] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [activeCallAppointmentId, setActiveCallAppointmentId] = useState(null);
  const [showActiveCallBanner, setShowActiveCallBanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const profileRef = useRef(null);
  const notificationRef = useRef(null);

  const handleGlobalSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/website/doctors?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const id = localStorage.getItem("userId");
    const role = localStorage.getItem("userRole");
    if (id && role === "patient") {
      setUserId(id);
      fetchNotifications(id);
    }
  }, []);

  // Poll notifications so "Join Call" alert appears quickly
  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(() => {
      fetchNotifications(userId);
    }, 60000); // Increased interval from 15s to 60s to reduce load

    // Also refresh instantly when a foreground push arrives
    const handleRefresh = () => fetchNotifications(userId);
    window.addEventListener("refresh-notifications", handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener("refresh-notifications", handleRefresh);
    };
  }, [userId]);

  const getVideoCallNotification = () => {
    return notifications.find((n) => {
      if (!n || n.read) return false;
      if (n.type !== "video_call_started") return false;
      const metadata =
        typeof n.metadata === "string"
          ? (() => {
            try {
              return JSON.parse(n.metadata);
            } catch {
              return null;
            }
          })()
          : n.metadata;
      return !!metadata?.appointment_id;
    });
  };

  const activeVideoCall = getVideoCallNotification();

  const parseNotificationMeta = (notification) => {
    if (!notification) return null;
    if (typeof notification.metadata === "string") {
      try {
        return JSON.parse(notification.metadata);
      } catch {
        return null;
      }
    }
    return notification.metadata || null;
  };

  const isAppointmentLiveNow = (appointment) => {
    if (!appointment?.appointment_date || !appointment?.appointment_time) return false;
    const status = String(appointment.status || "").toLowerCase();
    const okStatuses = ["confirmed", "pending", "booked", "approved"];
    if (!okStatuses.includes(status)) return false;
    const dateStr = String(appointment.appointment_date);
    const timeStr = String(appointment.appointment_time).slice(0, 5);
    const start = new Date(`${dateStr}T${timeStr}:00`);
    if (Number.isNaN(start.getTime())) return false;
    const now = new Date();
    const early = new Date(start.getTime() - 15 * 60 * 1000);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    return now >= early && now <= end;
  };

  useEffect(() => {
    const meta = parseNotificationMeta(activeVideoCall);
    const appointmentId = meta?.appointment_id || null;
    setActiveCallAppointmentId(appointmentId);

    if (!appointmentId) {
      setShowActiveCallBanner(false);
      return;
    }

    let canceled = false;
    const validateActiveCall = async () => {
      try {
        const res = await fetch(`/api/appointment/web/${appointmentId}`);
        const data = await res.json().catch(() => null);
        const appointment = data?.data?.appointment || null;
        if (canceled) return;
        if (appointment) {
          setShowActiveCallBanner(isAppointmentLiveNow(appointment));
        } else {
          // If we can't validate the appointment, still show it
          // (better to show a banner the user can click than hide it)
          setShowActiveCallBanner(true);
        }
      } catch {
        if (!canceled) setShowActiveCallBanner(true);
      }
    };

    validateActiveCall();
    const interval = setInterval(validateActiveCall, 60000);
    return () => {
      canceled = true;
      clearInterval(interval);
    };
  }, [activeVideoCall]);

  const handleJoinActiveCall = async () => {
    if (!activeVideoCall || !userId || !showActiveCallBanner || !activeCallAppointmentId) return;

    try {
      await handleMarkNotificationRead(activeVideoCall.id);
    } catch { }

    router.push(`/appointments/${activeCallAppointmentId}/video?userId=${userId}&role=patient`);
  };

  const fetchNotifications = async (id) => {
    if (!id) return;
    try {
      setNotificationsLoading(true);
      const res = await api.post("/notifications/get", {
        user_id: id,
        unread: false,
        page: 1,
      });
      if (res?.success && Array.isArray(res.data)) {
        setNotifications(res.data);
      }
    } catch (error) {
      console.error("Failed to load patient notifications", error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const markAllNotificationsRead = async () => {
    if (!userId || unreadCount === 0) return;
    try {
      await api.post("/notifications/read", {
        user_id: userId,
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error("Failed to mark notifications as read", error);
    }
  };

  const loadModalPage = async (page) => {
    if (!userId) return;
    try {
      setModalLoading(true);
      const res = await api.post("/notifications/get", {
        user_id: userId,
        unread: false,
        page,
      });
      const list = Array.isArray(res?.data) ? res.data : [];
      setModalNotifications(list);
      setModalPage(page);
      setModalHasMore(list.length === 15);
    } catch (error) {
      console.error("Failed to load notifications page", error);
    } finally {
      setModalLoading(false);
    }
  };

  const handleMarkNotificationRead = async (notificationId) => {
    if (!userId || !notificationId) return;
    try {
      await api.post("/notifications/read", {
        user_id: userId,
        notification_ids: [notificationId],
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setModalNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    if (!userId || !notificationId) return;
    try {
      await api.post("/notifications/delete", {
        user_id: userId,
        notification_ids: [notificationId],
      });
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      setModalNotifications((prev) =>
        prev.filter((n) => n.id !== notificationId)
      );
    } catch (error) {
      console.error("Failed to delete notification", error);
    }
  };

  const openNotificationsModal = () => {
    if (!userId) return;
    setShowNotificationsModal(true);
    setModalNotifications(notifications);
    setModalPage(1);
    setModalHasMore(notifications.length === 15);
  };

  // Handle notification click — mark read + route to relevant page
  const handleNotificationClick = (notification, closeDropdown = false) => {
    if (!notification.read) {
      handleMarkNotificationRead(notification.id);
    }

    if (closeDropdown) {
      setIsNotificationOpen(false);
    } else {
      setShowNotificationsModal(false);
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
      router.push("/website/appointments");
    } else if (type === "prescription" || type === "document_shared") {
      router.push("/website/digital-locker");
    } else if (
      type === "payment" ||
      type === "payment_success" ||
      type === "payment_failure"
    ) {
      router.push("/website/billing");
    } else if (
      type === "video_call_started" ||
      type === "consultation" ||
      type === "teleconsultation"
    ) {
      // If there's an appointment id in metadata, go directly to video call
      try {
        const meta = typeof notification.metadata === "string"
          ? JSON.parse(notification.metadata)
          : notification.metadata;
        const aptId = meta?.appointment_id;
        if (aptId && userId) {
          router.push(`/appointments/${aptId}/video?userId=${userId}&role=patient`);
          return;
        }
      } catch { }
      router.push("/website/appointments");
    } else {
      router.push("/website/appointments");
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "consultation":
        return <FaBell className="w-3.5 h-3.5 text-[#0067A1]" />;
      case "appointment":
      case "appointment_status":
        return <FaCalendarCheck className="w-3.5 h-3.5 text-green-500" />;
      case "prescription":
        return <FaFileMedical className="w-3.5 h-3.5 text-purple-500" />;
      default:
        return <FaExclamationCircle className="w-3.5 h-3.5 text-amber-500" />;
    }
  };

  const formatNotificationTime = (createdAt) => {
    if (!createdAt) return "";
    try {
      const date = new Date(createdAt);
      if (isNaN(date.getTime())) return "";

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);

      if (diffSecs < 60) {
        return "Just now";
      }

      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) {
        return `${diffMins} ${diffMins === 1 ? "min" : "mins"} ago`;
      }

      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) {
        const isToday = now.getDate() === date.getDate() &&
                        now.getMonth() === date.getMonth() &&
                        now.getFullYear() === date.getFullYear();
        if (isToday) {
          const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
          return `Today at ${timeStr}`;
        }
      }

      // Check yesterday
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const isYesterday = yesterday.getDate() === date.getDate() &&
                          yesterday.getMonth() === date.getMonth() &&
                          yesterday.getFullYear() === date.getFullYear();
      if (isYesterday) {
        const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
        return `Yesterday at ${timeStr}`;
      }

      // Otherwise show elegant formatted date
      const dateStr = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
      return `${dateStr} • ${timeStr}`;
    } catch (err) {
      console.error("Error formatting notification date:", err);
      return "";
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userData");
    router.push("/website");
  };

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getDisplayName = () => {
    return (
      user?.details?.full_name ||
      user?.full_name ||
      user?.name ||
      "User"
    );
  };

  const getDisplayEmail = () => {
    return user?.details?.email || user?.email || "user@example.com";
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      {activeVideoCall && showActiveCallBanner && (
        <div className="bg-emerald-600 text-white px-4 lg:px-6 py-3 shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-white"></span>
              </span>
              <div>
                <p className="text-sm font-bold">Doctor started your video consultation!</p>
                <p className="text-xs opacity-90">Tap &quot;Join Call&quot; to connect immediately</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleJoinActiveCall}
              className="shrink-0 px-5 py-2 rounded-xl bg-white text-emerald-700 text-sm font-bold hover:bg-gray-100 transition-colors shadow-md animate-pulse"
            >
              Join Call
            </button>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <FaBars className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={async () => {
                const next = !isNotificationOpen;
                setIsNotificationOpen(next);
                if (!isNotificationOpen) {
                  await markAllNotificationsRead();
                }
              }}
              className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <FaBell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {isNotificationOpen && (
              <div className="absolute -right-[52px] sm:right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-[320px] max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col z-50">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-semibold rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto">
                  {notificationsLoading ? (
                    <div className="p-6 text-center text-xs text-gray-500">
                      Loading notifications...
                    </div>
                  ) : notifications.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 hover:bg-gray-100/70 transition-colors cursor-pointer ${!notification.read ? "bg-[#0067A1]/5" : ""
                            }`}
                          onClick={() => handleNotificationClick(notification, true)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                                {notification.title || "Notification"}
                              </p>
                              <p className="text-sm text-gray-800 font-medium">
                                {formatMessageText(notification.message)}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatNotificationTime(notification.created_at)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              {!notification.read && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleMarkNotificationRead(notification.id); }}
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100"
                                >
                                  <FaCheckCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleDeleteNotification(notification.id); }}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
                              >
                                <FaTrash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <FaBell className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">No notifications yet</p>
                    </div>
                  )}
                </div>
                <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3 text-xs">
                  <span className="text-gray-500">
                    Showing {notifications.length} notification
                    {notifications.length === 1 ? "" : "s"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNotificationOpen(false);
                      openNotificationsModal();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0067A1] text-white font-semibold hover:bg-[#004F7C] transition-colors"
                  >
                    Show more
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-3 p-1.5 pr-3 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-[#0067A1] flex items-center justify-center text-white font-semibold shadow-md">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={getDisplayName()}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-sm">
                    {getInitials(getDisplayName())}
                  </span>
                )}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-gray-900 truncate max-w-[120px]">
                  {getDisplayName()}
                </p>
                <p className="text-xs text-gray-500 truncate max-w-[120px]">
                  {getDisplayEmail()}
                </p>
              </div>
              <FaChevronDown
                className={`hidden md:block w-3 h-3 text-gray-400 transition-transform ${isProfileOpen ? "rotate-180" : ""
                  }`}
              />
            </button>

            {/* Profile Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                {/* User Info */}
                <div className="p-4 bg-[#0067A1]/5 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#0067A1] flex items-center justify-center text-white font-semibold shadow-md">
                      {user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt={getDisplayName()}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span>{getInitials(getDisplayName())}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {getDisplayName()}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {getDisplayEmail()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  <Link
                    href="/website/profile"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <FaUser className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">My Profile</span>
                  </Link>
                  <Link
                    href="/website/settings"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <FaCog className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Settings</span>
                  </Link>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                  >
                    <FaSignOutAlt className="w-4 h-4 text-red-400" />
                    <span className="font-medium">Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showNotificationsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg sm:max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 max-h-[80vh] flex flex-col overflow-hidden">
            <div className="px-4 sm:px-6 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#0067A1] flex items-center justify-center text-white">
                  <FaBell className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">All Notifications</p>
                  <p className="text-[11px] text-gray-500">
                    Review your recent alerts with pagination
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNotificationsModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {modalLoading ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  Loading notifications...
                </div>
              ) : modalNotifications.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {modalNotifications.map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 sm:px-6 py-3.5 flex items-start gap-3 sm:gap-4 cursor-pointer hover:bg-gray-50/70 transition-colors ${!n.read ? "bg-[#0067A1]/5" : "bg-white"
                        }`}
                      onClick={() => handleNotificationClick(n, false)}
                    >
                      <div className="mt-0.5">{getNotificationIcon(n.type)}</div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                          {n.type || "Notification"}
                        </p>
                        <p className="text-sm font-medium text-gray-800 break-words">
                          {formatMessageText(n.title || n.message)}
                        </p>
                        {n.message && n.title && (
                          <p className="text-xs text-gray-600 break-words">
                            {formatMessageText(n.message)}
                          </p>
                        )}
                        <p className="text-[11px] text-gray-500 flex items-center gap-1">
                          <FaCalendarAlt className="w-3 h-3" />
                          {formatNotificationTime(n.created_at)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-1">
                        {!n.read && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleMarkNotificationRead(n.id); }}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100"
                          >
                            <FaCheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeleteNotification(n.id); }}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
                        >
                          <FaTrash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <FaBell className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">
                    No notifications found
                  </p>
                  <p className="text-xs text-gray-400 max-w-xs">
                    Appointment updates and other activity will appear here.
                  </p>
                </div>
              )}
            </div>

            <div className="px-4 sm:px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3 text-xs">
              <span className="text-gray-500">Page {modalPage}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={modalPage === 1 || modalLoading}
                  onClick={() => loadModalPage(Math.max(1, modalPage - 1))}
                  className="px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={!modalHasMore || modalLoading}
                  onClick={() => loadModalPage(modalPage + 1)}
                  className="px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default PatientHeader;
