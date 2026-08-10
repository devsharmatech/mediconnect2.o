"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { getLoggedInUser, logoutUser } from "@/lib/authHelpers";
import {
  Bell,
  Search,
  Sun,
  Moon,
  User,
  Settings,
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
  CheckCircle,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

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

export default function LabNavbar({ onMenuClick, sidebarOpen }) {
  const [labName, setLabName] = useState("");
  const [labId, setLabId] = useState(null);
  const [theme, setTheme] = useState("light");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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

  // Mark all notifications as read
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

  // Mark single notification as read
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

  // Delete notification
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

  // Handle notification click — mark read + route to relevant page
  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    setNotificationsOpen(false);

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
      type === "order" ||
      type === "collection" ||
      type === "payment" ||
      type === "payment_success"
    ) {
      router.push("/lab/orders");
    } else if (type === "report") {
      router.push("/lab/reports");
    } else if (type === "service") {
      router.push("/lab/tests");
    } else {
      router.push("/lab/dashboard");
    }
  };

  // Format time as relative
  const formatTime = (createdAt) => {
    if (!createdAt) return "Just now";
    const date = new Date(createdAt);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString();
  };

  useEffect(() => {
    const user = getLoggedInUser("lab");
    if (user) {
      setLabId(user.id);
      // Fetch real lab name from lab_details
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
            setLabName(user.details?.full_name || "Lab Admin");
          }
        } catch {
          setLabName(user.details?.full_name || "Lab Admin");
        }
      })();

      // Fetch real notifications
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

  // Poll notifications every 20 seconds
  useEffect(() => {
    if (!labId) return;
    const interval = setInterval(() => {
      fetchNotifications(labId);
    }, 60000); // Changed from 20s to 60s to reduce API load

    // Listen for FCM foreground event to refresh immediately
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

  // Get page title based on pathname
  const getPageTitle = () => {
    const path = pathname;
    if (path.includes("/dashboard")) return "Dashboard";
    if (path.includes("/orders")) return "Test Orders";
    if (path.includes("/tests") || path.includes("/services")) return "Test Services";
    if (path.includes("/reports")) return "Lab Reports";
    if (path.includes("/patients")) return "Patients Management";
    if (path.includes("/profile")) return "Profile Settings";
    if (path.includes("/settings")) return "System Settings";
    return "Laboratory Portal";
  };

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'order': return <Beaker className="w-4 h-4 text-[#0067A1]" />;
      case 'collection': return <Activity className="w-4 h-4 text-amber-600" />;
      case 'report': return <FileText className="w-4 h-4 text-green-600" />;
      case 'performance': return <FlaskConical className="w-4 h-4 text-purple-600" />;
      case 'equipment': return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'service': return <TestTube className="w-4 h-4 text-indigo-600" />;
      default: return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <header className="sticky top-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-emerald-200 dark:border-gray-700 px-3 lg:px-5 py-2.5 lg:py-3 shadow-sm shadow-emerald-100/50 dark:shadow-gray-900 flex-shrink-0">
      <div className="flex items-center justify-between">
        {/* Left Section - Menu Button & Title */}
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button - Only show on mobile */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl bg-emerald-50 dark:bg-gray-800 text-[#0067A1] dark:text-emerald-500 hover:bg-emerald-100 dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer"
          >
            <Menu size={20} />
          </button>


        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2 lg:space-x-4">




          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-emerald-50 dark:bg-gray-800 text-[#0067A1] dark:text-emerald-500 hover:bg-emerald-100 dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer"
            title={
              theme === "light" ? "Switch to dark mode" : "Switch to light mode"
            }
          >
            {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
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
              className="relative p-2.5 rounded-xl bg-emerald-50 dark:bg-gray-800 text-[#0067A1] dark:text-emerald-500 hover:bg-emerald-100 dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-emerald-200 dark:border-gray-700 z-50 overflow-hidden">
                <div className="p-4 border-b border-emerald-200 dark:border-gray-700 bg-gradient-to-r from-emerald-50 to-white dark:from-gray-800 dark:to-gray-900">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-[#0067A1] dark:text-emerald-300">
                        Notifications
                      </h3>
                      <p className="text-xs text-[#0067A1] dark:text-emerald-500">
                        {notifications.length > 0
                          ? `${notifications.length} notifications`
                          : "No notifications"}
                      </p>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#0067A1] bg-emerald-100 dark:bg-emerald-900/30 rounded-full hover:bg-emerald-200 transition-colors"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Mark all read
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notificationsLoading ? (
                    <div className="p-6 text-center text-xs text-gray-500">
                      Loading notifications...
                    </div>
                  ) : notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 border-b border-emerald-100 dark:border-gray-700 hover:bg-emerald-100/70 dark:hover:bg-gray-700 transition-colors cursor-pointer group ${!notification.read
                          ? "bg-emerald-50/70 dark:bg-emerald-900/20"
                          : ""
                          }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            {notification.title && (
                              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                                {notification.title}
                              </p>
                            )}
                            <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                              {formatMessageText(notification.message)}
                            </p>
                            <p className="text-xs text-[#0067A1] dark:text-emerald-500 mt-1">
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
                                className="p-1 rounded-full hover:bg-emerald-100 text-emerald-600"
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
                              className="p-1 rounded-full hover:bg-red-100 text-red-500"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <Bell className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">No notifications yet</p>
                      <p className="text-xs text-gray-400 mt-1">
                        New orders and updates will appear here
                      </p>
                    </div>
                  )}
                </div>
                <div className="p-3 border-t border-emerald-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-center">
                  <p className="text-xs text-gray-500">
                    Showing {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center space-x-2 lg:space-x-3 p-2 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-50/50 dark:from-gray-800 dark:to-gray-900 hover:bg-emerald-100 dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer border border-emerald-200 dark:border-gray-700"
            >
              <div className="w-7 h-7 lg:w-8 lg:h-8 bg-gradient-to-br from-[#0067A1] to-emerald-600 rounded-full flex items-center justify-center shadow-md">
                <User className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-white" />
              </div>
              {/* Hide user info on mobile, show on desktop */}
              <div className="hidden md:block text-left">
                <p className="text-xs lg:text-sm font-semibold text-[#0067A1] dark:text-emerald-300 truncate max-w-[120px] lg:max-w-[160px]">
                  {labName}
                </p>
                <p className="text-[10px] lg:text-xs text-[#0067A1] dark:text-emerald-500 flex items-center">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>
                  Verified Lab
                </p>
              </div>
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-12 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-emerald-200 dark:border-gray-700 z-50 overflow-hidden">
                <div className="p-3 border-b border-emerald-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-white dark:from-gray-800 dark:to-gray-900">
                  <p className="text-sm font-medium text-[#0067A1] dark:text-emerald-300">
                    {labName}
                  </p>
                  <p className="text-xs text-[#0067A1] dark:text-emerald-500">
                    Laboratory Account
                  </p>
                </div>
                <div className="p-2">
                  <Link
                    href="/lab/profile"
                    className="flex items-center space-x-3 w-full p-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    <User size={18} className="text-[#0067A1] dark:text-emerald-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Lab Profile
                    </span>
                  </Link>
                  <Link
                    href="/lab/settings"
                    className="flex items-center space-x-3 w-full p-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    <Settings size={18} className="text-[#0067A1] dark:text-emerald-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Lab Settings
                    </span>
                  </Link>
                  <div className="border-t border-emerald-200 dark:border-gray-700 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center space-x-3">
                      <LogOut size={18} />
                      <span className="text-sm font-medium">Sign Out</span>
                    </div>
                    <div className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-full group-hover:bg-red-200 dark:group-hover:bg-red-900/50">
                      Exit
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search Bar - Shows when needed */}
      <div className="lg:hidden mt-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-emerald-500 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tests, orders, patients..."
            className="w-full pl-12 pr-4 py-3 bg-emerald-50 dark:bg-gray-800 border border-emerald-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 cursor-text text-gray-800 dark:text-gray-200 placeholder-emerald-400 dark:placeholder-emerald-500"
          />
        </div>
      </div>
    </header>
  );
}
