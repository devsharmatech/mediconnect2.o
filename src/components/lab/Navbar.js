"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { getLoggedInUser, logoutUser } from "@/lib/authHelpers";
import {
  Bell,
  Sun,
  Moon,
  Building2,
  LogOut,
  Menu,
  Beaker,
  AlertCircle,
  FileText,
  TestTube,
  FlaskConical,
  Activity,
  Check,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

const formatMessageText = (message) => {
  if (!message) return "";
  try {
    const dateRegex = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
    let formattedMessage = message.replace(dateRegex, (match, y, m, d) => {
      const date = new Date(Number(y), Number(m) - 1, Number(d));
      if (isNaN(date.getTime())) return match;
      return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    });

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

    formattedMessage = formattedMessage
      .replace(/(AM|PM|am|pm):(\d{2})/g, '$1')
      .replace(/(AM|PM|am|pm):00/g, '$1');

    return formattedMessage;
  } catch (err) {
    return message;
  }
};

export default function LabNavbar({ onMenuClick, sidebarOpen }) {
  const [labName, setLabName] = useState("");
  const [labId, setLabId] = useState(null);
  const [theme, setTheme] = useState("light");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const notificationsRef = useRef(null);
  const profileRef = useRef(null);
  const pathname = usePathname();
  const router = useRouter();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = () => {
    logoutUser("lab");
    router.push("/lab/login");
  };

  const getInitials = (name) => {
    if (!name) return "LB";
    const parts = String(name).trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  // Fetch notifications from API
  const fetchNotifications = useCallback(async (userId) => {
    if (!userId) return;
    try {
      setNotificationsLoading(true);
      const res = await fetch("/api/notifications/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, unread: false, page: 1 }),
      });
      const data = await res.json();
      if (data?.success && Array.isArray(data.data)) {
        setNotifications(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch lab notifications:", error);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  const markAllAsRead = async () => {
    if (!labId || unreadCount === 0) return;
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: labId }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
    }
  };

  const markAsRead = async (notificationId) => {
    if (!labId) return;
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: labId, notification_ids: [notificationId] }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const deleteNotification = async (notificationId) => {
    if (!labId) return;
    try {
      await fetch("/api/notifications/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: labId, notification_ids: [notificationId] }),
      });
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    setNotificationsOpen(false);

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
      type === "order" ||
      type === "collection" ||
      type === "payment" ||
      type === "payment_success"
    ) {
      router.push("/lab/orders");
    } else if (type === "service") {
      router.push("/lab/tests");
    } else {
      router.push("/lab/dashboard");
    }
  };

  const formatTime = (createdAt) => {
    if (!createdAt) return "Just now";
    const date = new Date(createdAt);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  useEffect(() => {
    const user = getLoggedInUser("lab");
    if (user) {
      setLabId(user.id);
      (async () => {
        try {
          const nameRes = await fetch("/api/lab/my-name", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id }),
          });
          const nameData = await nameRes.json();
          if (nameData.success && nameData.lab_name) {
            setLabName(nameData.lab_name);
          } else {
            setLabName(user.details?.lab_name || user.details?.full_name || "Diagnostic Lab");
          }
        } catch {
          setLabName(user.details?.lab_name || user.details?.full_name || "Diagnostic Lab");
        }
      })();

      fetchNotifications(user.id);
    }

    const storedTheme = localStorage.getItem("theme") || "light";
    setTheme(storedTheme);
    document.documentElement.classList.toggle("dark", storedTheme === "dark");

    const handleClickOutside = (event) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!labId) return;
    const interval = setInterval(() => {
      fetchNotifications(labId);
    }, 60000);

    const handleRefresh = () => fetchNotifications(labId);
    window.addEventListener("refresh-lab-notifications", handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener("refresh-lab-notifications", handleRefresh);
    };
  }, [labId, fetchNotifications]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem("theme", newTheme);
  };

  const getPageTitle = () => {
    const path = pathname;
    if (path.includes("/dashboard")) return "Dashboard Overview";
    if (path.includes("/orders")) return "Lab Test Orders";
    if (path.includes("/tests")) return "My Test Catalog";
    if (path.includes("/profile")) return "Laboratory Profile";
    return "Laboratory Portal";
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'order': return <Beaker className="w-4 h-4 text-[#0067A1]" />;
      case 'collection': return <Activity className="w-4 h-4 text-amber-600" />;
      case 'report': return <FileText className="w-4 h-4 text-green-600" />;
      case 'equipment': return <AlertCircle className="w-4 h-4 text-rose-600" />;
      case 'service': return <TestTube className="w-4 h-4 text-indigo-600" />;
      default: return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] shrink-0">
      {/* Left Section: Mobile Menu + Title */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 hover:text-[#0067A1] transition-all flex items-center justify-center cursor-pointer shrink-0"
          title={sidebarOpen ? "Collapse sidebar" : "Open sidebar"}
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white tracking-tight">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* Right Section: Controls */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center cursor-pointer"
          title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        >
          {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => {
              const next = !notificationsOpen;
              setNotificationsOpen(next);
              if (next && unreadCount > 0) {
                markAllAsRead();
              }
            }}
            className="relative w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold border-2 border-white dark:border-slate-900 animate-pulse">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                    Notifications
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Recent lab order alerts and test updates
                  </p>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#0067A1] dark:text-sky-300 bg-blue-50 dark:bg-sky-950/40 rounded-full hover:bg-blue-100 transition-colors"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
                {notificationsLoading ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    Loading notifications...
                  </div>
                ) : notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group flex items-start gap-3 ${
                        !notification.read ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        {notification.title && (
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                            {notification.title}
                          </p>
                        )}
                        <p className="text-xs text-slate-800 dark:text-slate-200 font-medium line-clamp-2">
                          {formatMessageText(notification.message)}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300"
                            title="Mark as read"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="p-1 rounded-md hover:bg-rose-100 text-rose-500"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      No notifications yet
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown (Clean, No "Patient Mode") */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer shadow-xs"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0067A1] to-[#0095E8] text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
              {getInitials(labName)}
            </div>
            <div className="hidden md:block text-left max-w-[130px] lg:max-w-[170px]">
              <p className="text-xs font-bold text-slate-800 dark:text-white truncate leading-tight">
                {labName || "Diagnostic Lab"}
              </p>
              <p className="text-[10px] text-[#0067A1] dark:text-sky-400 font-medium flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 bg-[#0067A1] dark:bg-sky-400 rounded-full"></span>
                Verified Lab
              </p>
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50">
                <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                  {labName || "Diagnostic Lab"}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Laboratory Diagnostic Portal
                </p>
              </div>

              <div className="p-1.5 space-y-0.5">
                <Link
                  href="/lab/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                >
                  <Building2 size={16} className="text-[#0067A1]" />
                  <span>Lab Profile & Settings</span>
                </Link>

                <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors w-full text-left cursor-pointer"
                >
                  <LogOut size={16} className="text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
