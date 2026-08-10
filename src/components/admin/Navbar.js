"use client";

import { useEffect, useState, useRef } from "react";
import { getLoggedInUser, logoutUser } from "@/lib/authHelpers";
import {
  Bell,
  Sun,
  Moon,
  User,
  Settings,
  LogOut,
  Menu,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const formatNotificationTime = (dateInput) => {
  if (!dateInput) return "";
  try {
    const date = new Date(dateInput);
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

export default function Navbar({ onMenuClick, sidebarOpen }) {
  const [role, setRole] = useState("admin");
  const [theme, setTheme] = useState("light");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [allNotificationsOpen, setAllNotificationsOpen] = useState(false);
  const notificationsRef = useRef(null);
  const profileRef = useRef(null);
  const router = useRouter();


  const handleLogout = (role) => {
    logoutUser(role);
  };
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const user = getLoggedInUser("admin");
    if (user?.role) setRole(user.role);
    if (user?.id) fetchNotifications(user.id);

    const storedTheme = localStorage.getItem("theme") || "light";
    setTheme(storedTheme);

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
  }, []);

  const fetchNotifications = async (userId) => {
    try {
      const res = await fetch("/api/notifications/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, limit: 10 }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setNotifications(
          data.data.map((n) => ({
            id: n.id,
            message: n.title,
            time: formatNotificationTime(n.created_at),
            read: n.read || false,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem("theme", newTheme);
  };

  const handleMarkAllRead = async () => {
    const user = getLoggedInUser("admin");
    if (!user || unreadCount === 0) return;
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    const user = getLoggedInUser("admin");
    if (!user) return;
    try {
      const res = await fetch("/api/notifications/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, notification_ids: [id] }),
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(notifications.filter(n => n.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle notification click — mark read + route to relevant page
  const handleNotificationClick = (notification) => {
    // Mark read optimistically
    if (!notification.read) {
      const user = getLoggedInUser("admin");
      if (user) {
        fetch("/api/notifications/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: user.id, notification_ids: [notification.id] }),
        }).catch(() => { });
      }
      setNotifications((prev) =>
        prev.map((n) => n.id === notification.id ? { ...n, read: true } : n)
      );
    }
    setNotificationsOpen(false);
    setAllNotificationsOpen(false);

    // Check for metadata action_url
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

    // Fallback routing by keyword in message/title
    const text = ((notification.message || "") + " " + (notification.title || "")).toLowerCase();
    if (text.includes("doctor")) {
      router.push("/admin/doctors");
    } else if (text.includes("patient")) {
      router.push("/admin/patients");
    } else if (text.includes("appointment")) {
      router.push("/admin/appointments");
    } else if (text.includes("lab")) {
      router.push("/admin/labs");
    } else if (text.includes("chemist") || text.includes("pharmacy")) {
      router.push("/admin/chemists");
    } else {
      router.push("/admin");
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 px-4 lg:px-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex-shrink-0 h-[73px] flex items-center transition-all duration-300">
        <div className="flex items-center justify-between w-full">
          {/* Left Section - Menu Button & Title */}
          <div className="flex items-center space-x-4">
            {/* Mobile Menu Button - Only show on mobile */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 border border-gray-100 dark:border-gray-700 transition-all duration-200 cursor-pointer"
            >
              <Menu size={20} />
            </button>


          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-3 lg:space-x-5">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-[#0067A1] border border-gray-100 dark:border-gray-700 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md"
              title={
                theme === "light" ? "Switch to dark mode" : "Switch to light mode"
              }
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* Notifications Dropdown */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => {
                  const nextOpen = !notificationsOpen;
                  setNotificationsOpen(nextOpen);
                  if (nextOpen) handleMarkAllRead();
                }}
                className="relative p-2.5 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-[#0067A1] border border-gray-100 dark:border-gray-700 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-12 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                      Notifications
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {unreadCount} unread
                    </p>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? notifications.slice(0, 10).map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-100/70 dark:hover:bg-gray-750 transition-colors cursor-pointer flex justify-between items-start group ${!notification.read
                          ? "bg-blue-50 dark:bg-blue-900/20"
                          : ""
                          }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex-1">
                          <p className="text-sm text-gray-800 dark:text-gray-200 font-medium break-words">
                            {formatMessageText(notification.message)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {notification.time}
                          </p>
                        </div>
                        <button onClick={(e) => handleDelete(e, notification.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )) : (
                      <div className="p-4 text-center text-sm text-gray-500">
                        No recent notifications
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <button onClick={() => { setNotificationsOpen(false); setAllNotificationsOpen(true); }} className="w-full text-center py-2 text-sm text-[#0067A1] dark:text-[#0080C6] font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 scrollbar-hide rounded-lg transition-colors cursor-pointer">
                      View All Notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center space-x-3 p-1.5 pr-4 rounded-full bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#0067A1] to-teal-500 flex items-center justify-center p-[2px] shadow-sm">
                  <div className="w-full h-full bg-white dark:bg-gray-900 rounded-full flex items-center justify-center border border-transparent">
                    <User className="w-4 h-4 text-[#0067A1]" />
                  </div>
                </div>
                {/* Hide user info on mobile, show on desktop */}
                <div className="hidden md:block text-left">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100 group-hover:text-[#0067A1] transition-colors">
                    Admin User
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium tracking-wide uppercase mt-0.5">
                    {role
                      ? role.charAt(0).toUpperCase() + role.slice(1)
                      : "Admin"}
                  </p>
                </div>
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-12 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50">
                  <div className="p-2">
                    <Link href="/admin/profile" className="flex items-center space-x-3 w-full p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                      <User size={18} />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Profile
                      </span>
                    </Link>
                    <Link href="/admin/settings" className="flex items-center space-x-3 w-full p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                      <Settings size={18} />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Settings
                      </span>
                    </Link>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                    <button
                      onClick={() => {
                        handleLogout("admin");
                      }}
                      className="flex items-center space-x-3 w-full p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors cursor-pointer"
                    >
                      <LogOut size={18} />
                      <span className="text-sm">Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* All Notifications Modal - Rendered outside header to avoid being trapped by backdrop-blur */}
      {allNotificationsOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 pointer-events-auto" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">All Notifications</h2>
                <p className="text-sm text-gray-500">View and manage your entire notification history.</p>
              </div>
              <button onClick={() => setAllNotificationsOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {notifications.length > 0 ? (
                <div className="space-y-4">
                  {notifications.map(notification => (
                    <div
                      key={notification.id}
                      className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 flex justify-between items-start cursor-pointer hover:bg-gray-100/70 dark:hover:bg-gray-700/70 transition-colors"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div>
                        <div className="flex items-center mb-1">
                          <h4 className="font-semibold text-gray-800 dark:text-gray-200">{formatMessageText(notification.message)}</h4>
                          {!notification.read && <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full"></span>}
                        </div>
                        <p className="text-sm text-gray-500 mb-2">{notification.time}</p>
                      </div>
                      <button onClick={(e) => handleDelete(e, notification.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete Notification">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No notifications found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
