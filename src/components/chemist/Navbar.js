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
  Package,
  Pill,
  Beaker,
  AlertCircle,
  Check,
  Trash2,
  RefreshCw,
  X,
  Loader2,
  Filter,
  CheckCircle,
  Clock,
  ExternalLink,
  Eye,
  ChevronRight,
  Sparkles,
  Zap,
  MessageSquare,
  ShoppingCart,
  TrendingUp,
  Award,
  Star,
  Heart,
  Info,
  Shield,
  CreditCard,
  FileText,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { generateDeviceToken, onForegroundMessage } from "@/lib/firebaseClient";
import toast, { Toaster } from "react-hot-toast";

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

// Custom Toast Notification Component
function CustomNotificationToast({ notification, onClose, onClick }) {
  const router = useRouter();

  const getIcon = () => {
    switch (notification.type) {
      case "order":
        return <ShoppingCart className="w-8 h-8 text-white" />;
      case "payment":
        return <CreditCard className="w-8 h-8 text-white" />;
      case "stock":
      case "inventory":
        return <AlertCircle className="w-8 h-8 text-white" />;
      case "prescription":
        return <Pill className="w-8 h-8 text-white" />;
      case "report":
        return <TrendingUp className="w-8 h-8 text-white" />;
      case "success":
        return <Award className="w-8 h-8 text-white" />;
      case "important":
        return <Star className="w-8 h-8 text-white" />;
      case "urgent":
        return <Zap className="w-8 h-8 text-white" />;
      case "info":
        return <Info className="w-8 h-8 text-white" />;
      case "security":
        return <Shield className="w-8 h-8 text-white" />;
      default:
        return <Bell className="w-8 h-8 text-white" />;
    }
  };

  const getGradient = () => {
    switch (notification.type) {
      case "order":
        return "from-blue-500 via-blue-600 to-[#004F7C]";
      case "payment":
        return "from-green-500 via-green-600 to-green-700";
      case "stock":
      case "inventory":
        return "from-amber-500 via-amber-600 to-amber-700";
      case "prescription":
        return "from-emerald-500 via-emerald-600 to-emerald-700";
      case "report":
        return "from-purple-500 via-purple-600 to-purple-700";
      case "success":
        return "from-teal-500 via-teal-600 to-[#004F7C]";
      case "important":
        return "from-orange-500 via-orange-600 to-orange-700";
      case "urgent":
        return "from-red-500 via-red-600 to-red-700";
      case "info":
        return "from-cyan-500 via-cyan-600 to-cyan-700";
      case "security":
        return "from-violet-500 via-violet-600 to-violet-700";
      default:
        return "from-indigo-500 via-indigo-600 to-indigo-700";
    }
  };

  const getTypeLabel = () => {
    switch (notification.type) {
      case "order": return "New Order";
      case "payment": return "Payment";
      case "stock": return "Stock Alert";
      case "inventory": return "Inventory";
      case "prescription": return "Prescription";
      case "report": return "Report";
      case "success": return "Success";
      case "important": return "Important";
      case "urgent": return "Urgent";
      case "info": return "Information";
      case "security": return "Security";
      default: return "Notification";
    }
  };

  const handleViewDetails = () => {
    if (notification.action_url) {
      router.push(notification.action_url);
    } else {
      switch (notification.type) {
        case "order":
        case "payment":
          router.push("/chemist/orders");
          break;
        case "stock":
        case "inventory":
          router.push("/chemist/inventory");
          break;
        case "prescription":
          router.push("/chemist/prescriptions");
          break;
        case "report":
          router.push("/chemist/reports");
          break;
      }
    }
    onClose();
  };

  return (
    <div className="w-full max-w-md bg-[#0067A1] shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden cursor-pointer transform transition-all duration-500 hover:scale-[1.02] hover:shadow-3xl backdrop-blur-sm">
      {/* Animated border */}
      <div className="h-1 bg-transparent animate-[pulse_2s_ease-in-out_infinite]" />

      {/* Main content */}
      <div className="p-5">
        <div className="flex items-start space-x-4">
          {/* Icon with glow effect */}
          <div className="relative">
            <div className={`absolute inset-0 bg-gradient-to-br ${getGradient()} opacity-20 blur-xl rounded-full`} />
            <div className={`relative bg-gradient-to-br ${getGradient()} p-3 rounded-xl shadow-lg`}>
              {getIcon()}
            </div>
          </div>

          {/* Text content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {notification.title || getTypeLabel()}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${notification.priority === "high"
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-blue-100 text-[#004F7C] dark:bg-blue-900/30 dark:text-blue-400"
                  }`}>
                  {notification.priority === "high" ? "HIGH PRIORITY" : "STANDARD"}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <p className="text-gray-700 dark:text-gray-300 mb-3">
              {formatMessageText(notification.body || notification.message)}
            </p>

            {/* Metadata */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  <Clock className="w-3 h-3 mr-1" />
                  Just now
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-[#004F7C] dark:bg-gray-800">
                  {getTypeLabel()}
                </span>
              </div>
              <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-5 pb-5">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleViewDetails}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-[#0067A1] hover:bg-[#004F7C] transition-all duration-300 hover:shadow-lg transform hover:-translate-y-0.5 text-white"
          >
            <ExternalLink className="w-4 h-4" />
            <span>View Details</span>
          </button>
          <button
            onClick={onClose}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-300"
          >
            <Check className="w-4 h-4" />
            <span>Dismiss</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Notification Modal Component
function NotificationsModal({ isOpen, onClose, onNotificationUpdate }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalNotifications, setTotalNotifications] = useState(0);
  const [filter, setFilter] = useState("all"); // all, unread, read
  const [typeFilter, setTypeFilter] = useState("all");
  const modalRef = useRef(null);
  const listRef = useRef(null);
  const router = useRouter();

  // Get logged in chemist
  const getChemist = () => {
    return getLoggedInUser("chemist");
  };

  // Fetch all notifications for modal
  const fetchModalNotifications = useCallback(
    async (pageNum = 1, append = false) => {
      try {
        const chemist = getChemist();
        if (!chemist?.id) return;

        setLoading(true);

        const params = new URLSearchParams({
          user_id: chemist.id,
          page: pageNum.toString(),
          limit: "20",
        });

        // Apply filters
        if (filter !== "all") {
          params.append("read", filter === "unread" ? "false" : "true");
        }

        if (typeFilter !== "all") {
          params.append("type", typeFilter);
        }

        const response = await fetch(`/api/chemists/notifications?${params}`);
        const data = await response.json();

        if (data.success) {
          if (append) {
            setNotifications((prev) => [...prev, ...data.notifications]);
          } else {
            setNotifications(data.notifications);
          }
          setTotalNotifications(data.total || 0);
          setHasMore(data.notifications?.length === 20);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setLoading(false);
      }
    },
    [filter, typeFilter]
  );

  // Load more notifications
  const loadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchModalNotifications(nextPage, true);
    }
  };

  // Mark as read
  const markAsRead = async (notificationId) => {
    try {
      setLoadingAction(notificationId);
      const chemist = getChemist();

      const response = await fetch("/api/chemists/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: chemist.id,
          notification_id: notificationId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === notificationId ? { ...notif, read: true } : notif
          )
        );
        // Notify parent component
        onNotificationUpdate?.();
      }
    } catch (error) {
      console.error("Error marking as read:", error);
    } finally {
      setLoadingAction(null);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      setLoadingAction("all");
      const chemist = getChemist();

      const response = await fetch("/api/chemists/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: chemist.id,
          mark_all: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNotifications((prev) =>
          prev.map((notif) => ({ ...notif, read: true }))
        );
        setFilter("all");
        // Notify parent component
        onNotificationUpdate?.();
        toast.success("All notifications marked as read");
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    } finally {
      setLoadingAction(null);
    }
  };

  // Delete notification - FIXED VERSION
  const deleteNotification = async (notificationId) => {
    try {
      setLoadingAction(`delete-${notificationId}`);
      const chemist = getChemist();

      const response = await fetch("/api/chemists/notifications/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: chemist.id,
          notification_id: notificationId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNotifications((prev) =>
          prev.filter((notif) => notif.id !== notificationId)
        );
        setTotalNotifications((prev) => prev - 1);
        // Notify parent component
        onNotificationUpdate?.();
        toast.success("Notification deleted successfully");
      } else {
        toast.error(data.message || "Failed to delete notification");
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("Failed to delete notification");
    } finally {
      setLoadingAction(null);
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    if (!confirm("Are you sure you want to clear all notifications?")) return;

    try {
      setLoadingAction("clear-all");
      const chemist = getChemist();

      const response = await fetch("/api/chemists/notifications/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: chemist.id,
          clear_all: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNotifications([]);
        setTotalNotifications(0);
        // Notify parent component
        onNotificationUpdate?.();
        toast.success("All notifications cleared");
      }
    } catch (error) {
      console.error("Error clearing all notifications:", error);
    } finally {
      setLoadingAction(null);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    if (notification.action_url) {
      router.push(notification.action_url);
      onClose();
    } else {
      switch (notification.type) {
        case "order":
        case "payment":
          router.push("/chemist/orders");
          break;
        case "stock":
        case "inventory":
          router.push("/chemist/inventory");
          break;
        case "prescription":
          router.push("/chemist/prescriptions");
          break;
        case "report":
          router.push("/chemist/reports");
          break;
      }
      onClose();
    }
  };

  // Get notification icon
  const getNotificationIcon = (type) => {
    switch (type) {
      case "order":
        return <ShoppingCart className="w-5 h-5 text-[#0067A1] dark:text-blue-400" />;
      case "payment":
        return <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case "stock":
      case "inventory":
        return (
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        );
      case "prescription":
        return <Pill className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case "report":
        return (
          <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        );
      case "success":
        return <Award className="w-5 h-5 text-[#0067A1] dark:text-[#0080C6]" />;
      case "important":
        return <Star className="w-5 h-5 text-orange-600 dark:text-orange-400" />;
      case "urgent":
        return <Zap className="w-5 h-5 text-red-600 dark:text-red-400" />;
      default:
        return <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
    }
  };

  // Format time
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
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

    return date.toLocaleDateString();
  };

  // Initialize modal
  useEffect(() => {
    if (isOpen) {
      setPage(1);
      fetchModalNotifications(1, false);
    }
  }, [isOpen, filter, typeFilter, fetchModalNotifications]);

  // Setup infinite scroll
  useEffect(() => {
    const listElement = listRef.current;
    if (!listElement) return;

    const handleScroll = () => {
      if (
        listElement.scrollTop + listElement.clientHeight >=
        listElement.scrollHeight - 10
      ) {
        loadMore();
      }
    };

    listElement.addEventListener("scroll", handleScroll);
    return () => listElement.removeEventListener("scroll", handleScroll);
  }, [hasMore, loading]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="relative w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-[#0067A1]/20 dark:border-gray-700 overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#0067A1]/20 dark:border-gray-700 bg-[#0067A1]/5 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[#0067A1] dark:text-teal-300">
                All Notifications
              </h2>
              <p className="text-sm text-[#0067A1]/80 dark:text-[#0080C6] mt-1">
                {totalNotifications} total notifications
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={markAllAsRead}
                disabled={loadingAction === "all"}
                className="flex items-center space-x-2 px-4 py-2 bg-[#0067A1] hover:bg-[#004F7C] text-white transition-all duration-200 disabled:opacity-50 shadow-lg rounded-xl"
              >
                {loadingAction === "all" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span>Mark All Read</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-[#0067A1]/10 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="flex items-center space-x-2 bg-[#0067A1]/10 dark:bg-gray-800 rounded-xl p-2">
              <Filter className="w-4 h-4 text-[#0067A1] dark:text-[#0080C6]" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-transparent text-sm border-none focus:outline-none cursor-pointer text-gray-800 dark:text-gray-200"
              >
                <option
                  value="all"
                  className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                >
                  All
                </option>
                <option
                  value="unread"
                  className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                >
                  Unread
                </option>
                <option
                  value="read"
                  className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                >
                  Read
                </option>
              </select>
            </div>

            <div className="flex items-center space-x-2 bg-[#0067A1]/10 dark:bg-gray-800 rounded-xl p-2">
              <Package className="w-4 h-4 text-[#0067A1] dark:text-[#0080C6]" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-transparent text-sm border-none focus:outline-none cursor-pointer text-gray-800 dark:text-gray-200"
              >
                <option
                  value="all"
                  className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                >
                  All Types
                </option>
                <option
                  value="order"
                  className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                >
                  Orders
                </option>
                <option
                  value="payment"
                  className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                >
                  Payments
                </option>
                <option
                  value="stock"
                  className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                >
                  Stock Alerts
                </option>
                <option
                  value="prescription"
                  className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                >
                  Prescriptions
                </option>
                <option
                  value="report"
                  className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                >
                  Reports
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div ref={listRef} className="h-[500px] overflow-y-auto">
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="relative inline-block">
                  <Bell className="w-16 h-16 text-[#0067A1] dark:text-[#0080C6] animate-bounce mb-4" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#0067A1] rounded-full animate-ping"></div>
                </div>
                <p className="text-gray-600 dark:text-gray-400">Loading notifications...</p>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-16">
              <div className="relative inline-block mb-4">
                <Bell className="w-20 h-20 text-gray-400 dark:text-gray-500" />
                <div className="absolute inset-0 bg-[#0067A1]"></div>
              </div>
              <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300">
                No notifications found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                {filter !== "all" || typeFilter !== "all"
                  ? "Try changing your filters"
                  : "You're all caught up!"}
              </p>
              {filter === "all" && typeFilter === "all" && (
                <div className="mt-4 inline-flex items-center px-4 py-2 bg-[#0067A1]/5 dark:bg-gray-800 rounded-xl">
                  <Heart className="w-4 h-4 text-[#0067A1] dark:text-[#0080C6] mr-2" />
                  <span className="text-sm text-[#0067A1] dark:text-[#0080C6]">All clear!</span>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#0067A1]/10 dark:divide-gray-700">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-[#0067A1]/5 dark:hover:bg-gray-800 cursor-pointer transition-all duration-300 group ${!notification.read
                    ? "bg-[#0067A1]/10 dark:bg-gray-800"
                    : ""
                    }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start space-x-4">
                    <div className="relative mt-1">
                      {getNotificationIcon(notification.type)}
                      {!notification.read && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#0067A1] dark:bg-teal-400 rounded-full animate-pulse"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {notification.title || "Notification"}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {formatMessageText(notification.message || notification.description)}
                          </p>
                          <div className="flex items-center space-x-3 mt-2">
                            <span className="text-xs text-[#0067A1] dark:text-[#0080C6]">
                              {formatTime(notification.created_at)}
                            </span>
                            {!notification.read && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#0067A1]/10 text-[#0067A1] dark:bg-[#003358]/30 dark:text-[#0080C6]">
                                <Zap className="w-3 h-3 mr-1" />
                                Unread
                              </span>
                            )}
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                              {notification.type || "general"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              disabled={loadingAction === notification.id}
                              className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/20 text-gray-700 dark:text-gray-300 transition-all duration-200 hover:scale-110"
                              title="Mark as read"
                            >
                              {loadingAction === notification.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                              )}
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            disabled={
                              loadingAction === `delete-${notification.id}`
                            }
                            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-700 dark:text-gray-300 transition-all duration-200 hover:scale-110"
                            title="Delete"
                          >
                            {loadingAction === `delete-${notification.id}` ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                            )}
                          </button>
                          <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {hasMore && (
                <div className="p-4 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-[#0067A1] dark:text-[#0080C6] hover:text-[#004F7C] dark:hover:text-teal-300 disabled:opacity-50 transition-all duration-200 hover:scale-105"
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Loading...
                      </span>
                    ) : (
                      "Load More Notifications"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#0067A1]/20 dark:border-gray-700 bg-[#0067A1]/5 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <button
              onClick={clearAllNotifications}
              disabled={
                notifications.length === 0 || loadingAction === "clear-all"
              }
              className="flex items-center space-x-2 px-4 py-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50 transition-all duration-200 hover:scale-105"
            >
              {loadingAction === "clear-all" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span>Clear All</span>
            </button>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {notifications.length} of {totalNotifications}{" "}
              notifications
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChemistNavbar({ onMenuClick, sidebarOpen }) {
  const [chemistName, setChemistName] = useState("");
  const [chemistId, setChemistId] = useState(null);
  const [theme, setTheme] = useState("light");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(null);
  const [showAllModal, setShowAllModal] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const notificationsRef = useRef(null);
  const profileRef = useRef(null);
  const pathname = usePathname();
  const router = useRouter();

  // Get logged in chemist
  const getChemist = () => {
    return getLoggedInUser("chemist");
  };

  const handleLogout = () => {
    logoutUser("chemist");
    router.push("/chemist/login");
  };

  // Show custom notification toast
  const showCustomNotification = useCallback((notification) => {
    toast.custom(
      (t) => (
        <CustomNotificationToast
          notification={notification}
          onClose={() => toast.dismiss(t.id)}
          onClick={() => {
            // Handle click to navigate
            if (notification.action_url) {
              router.push(notification.action_url);
            } else {
              switch (notification.type) {
                case "order":
                case "payment":
                  router.push("/chemist/orders");
                  break;
                case "stock":
                case "inventory":
                  router.push("/chemist/inventory");
                  break;
                case "prescription":
                  router.push("/chemist/prescriptions");
                  break;
                case "report":
                  router.push("/chemist/reports");
                  break;
              }
            }
            toast.dismiss(t.id);
            fetchNotificationCount();
          }}
        />
      ),
      {
        duration: 8000,
        position: "top-right",
      }
    );
  }, [router]);

  // Fetch unread count and recent notifications
  const fetchNotificationCount = useCallback(async () => {
    try {
      const chemist = getChemist();
      if (!chemist?.id) return;

      setLoading(true);

      // Get unread count
      const countResponse = await fetch(
        `/api/chemists/notifications?user_id=${chemist.id}&read=false&limit=1`
      );
      const countData = await countResponse.json();

      if (countData.success) {
        const newUnreadCount = countData.unread_count || 0;
        // If unread count increased, show notification badge animation
        if (newUnreadCount > unreadCount && unreadCount > 0) {
          // Trigger bell animation
          const bellBtn = document.querySelector('[data-bell-button]');
          if (bellBtn) {
            bellBtn.classList.add('animate-shake');
            setTimeout(() => bellBtn.classList.remove('animate-shake'), 500);
          }
        }
        setUnreadCount(newUnreadCount);
      }

      // Get recent notifications (5 most recent)
      const recentResponse = await fetch(
        `/api/chemists/notifications?user_id=${chemist.id}&limit=5`
      );
      const recentData = await recentResponse.json();

      if (recentData.success) {
        setRecentNotifications(recentData.notifications || []);
      }
    } catch (error) {
      console.error("Error fetching notification count:", error);
    } finally {
      setLoading(false);
    }
  }, [unreadCount]);

  // Delete notification from dropdown - FIXED VERSION
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      setLoadingAction(`delete-dropdown-${notificationId}`);
      const chemist = getChemist();

      const response = await fetch("/api/chemists/notifications/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: chemist.id,
          notification_id: notificationId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Remove from local state
        setRecentNotifications((prev) =>
          prev.filter((notif) => notif.id !== notificationId)
        );

        // Update unread count if notification was unread
        const deletedNotification = recentNotifications.find(n => n.id === notificationId);
        if (deletedNotification && !deletedNotification.read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }

        toast.success("Notification deleted");
      } else {
        toast.error(data.message || "Failed to delete notification");
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("Failed to delete notification");
    } finally {
      setLoadingAction(null);
    }
  }, [recentNotifications]);

  // Mark all as read from dropdown
  const markAllAsRead = async () => {
    try {
      setLoadingAction("all");
      const chemist = getChemist();

      const response = await fetch("/api/chemists/notifications/read", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: chemist.id,
          mark_all: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setUnreadCount(0);
        setRecentNotifications((prev) =>
          prev.map((notif) => ({ ...notif, read: true }))
        );
        toast.success("All notifications marked as read");
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    } finally {
      setLoadingAction(null);
    }
  };

  // Handle notification click from dropdown
  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      // Optimistically update UI
      setRecentNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    // Navigate
    if (notification.action_url) {
      router.push(notification.action_url);
    } else {
      switch (notification.type) {
        case "order":
        case "payment":
          router.push("/chemist/orders");
          break;
        case "stock":
        case "inventory":
          router.push("/chemist/inventory");
          break;
        case "prescription":
          router.push("/chemist/prescriptions");
          break;
        case "report":
          router.push("/chemist/reports");
          break;
      }
    }

    setNotificationsOpen(false);
  };

  // Get notification icon
  const getNotificationIcon = (type) => {
    switch (type) {
      case "order":
        return <ShoppingCart className="w-4 h-4 text-[#0067A1] dark:text-blue-400" />;
      case "payment":
        return <CreditCard className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case "stock":
      case "inventory":
        return (
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        );
      case "prescription":
        return <Pill className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case "report":
        return (
          <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        );
      default:
        return <Bell className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  // Format time for dropdown
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
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

    return date.toLocaleDateString();
  };

  // Initialize FCM and setup listeners
  const initializeFCM = useCallback(async () => {
    try {
      const chemist = getChemist();
      if (!chemist?.id) return;

      console.log("Initializing FCM...");

      // Register service worker
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        console.log("Service Worker registered:", registration);
        setIsConnected(true);
      }

      // Get FCM token
      const token = await generateDeviceToken();
      if (token) {
        console.log("FCM Token generated:", token.substring(0, 20) + "...");

        // Save token to backend
        const saveResponse = await fetch("/api/save-fcm-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: chemist.id,
            fcm_token: token,
            platform: "web",
          }),
        });

        if (saveResponse.ok) {
          console.log("FCM Token saved successfully");
        } else {
          console.error("Failed to save FCM token");
        }
      }

      // Listen for foreground messages
      onForegroundMessage((payload) => {
        console.log("📱 Foreground FCM message received:", payload);

        // Create clear notification object
        const notificationData = {
          title: payload.notification?.title || "New Notification",
          body: payload.notification?.body || "You have a new notification",
          type: payload.data?.type || payload.notification?.title?.toLowerCase() || "info",
          priority: payload.data?.priority || "normal",
          message: payload.notification?.body || payload.data?.message,
          action_url: payload.data?.action_url,
          data: payload.data || {},
        };

        console.log("Processed notification:", notificationData);

        // Show custom notification toast
        showCustomNotification(notificationData);

        // Refresh notification count
        fetchNotificationCount();

        // Play notification sound
        if (typeof Audio !== 'undefined') {
          try {
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.3;
            audio.play().catch(e => console.log("Audio play failed:", e));
          } catch (audioError) {
            console.log("Audio initialization error:", audioError);
          }
        }
      });

      console.log("FCM initialization complete");

    } catch (error) {
      console.error("❌ Error initializing FCM:", error);
      setIsConnected(false);
      toast.error("Failed to connect to notification service");
    }
  }, [fetchNotificationCount, showCustomNotification]);

  // Initialize
  useEffect(() => {
    const chemist = getChemist();
    if (chemist?.details?.pharmacist_name) {
      setChemistName(chemist.details.pharmacist_name);
    }
    setChemistId(chemist?.id || null);

    const storedTheme = localStorage.getItem("theme") || "light";
    setTheme(storedTheme);
    document.documentElement.classList.toggle("dark", storedTheme === "dark");

    // Fetch notification count
    if (chemist?.id) {
      fetchNotificationCount();
    }

    // Initialize FCM
    initializeFCM();

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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [fetchNotificationCount, initializeFCM]);

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
    if (path.includes("/orders")) return "Medicine Orders";
    if (path.includes("/medicines")) return "Medicines Management";
    if (path.includes("/inventory")) return "Inventory Management";
    if (path.includes("/profile")) return "Profile Settings";
    if (path.includes("/settings")) return "System Settings";
    return "Chemist Portal";
  };

  // Setup WebSocket/SSE for real-time notifications
  useEffect(() => {
    const chemist = getChemist();
    if (!chemist?.id) return;

    // Polling mechanism as fallback
    const pollingInterval = setInterval(() => {
      fetchNotificationCount();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(pollingInterval);
  }, [fetchNotificationCount]);

  // Handle notification updates from modal
  const handleNotificationUpdate = () => {
    fetchNotificationCount();
  };

  return (
    <>
      <header className="sticky top-0 z-20 bg-[#0067A1] border-b border-white/10 px-4 lg:px-6 py-4 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between">
          {/* Left Section - Menu Button & Title */}
          <div className="flex items-center space-x-4">
            {/* Mobile Menu Button - Only show on mobile */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all duration-200 cursor-pointer"
            >
              <Menu size={20} />
            </button>


          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-2 lg:space-x-4">

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all duration-200 cursor-pointer"
              title={
                theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode"
              }
            >
              {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            {/* Connection Status */}
            {isConnected && (
              <div className="relative group hidden lg:block">
                <div className="flex items-center space-x-1 px-2.5 py-1 bg-white/10 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-300 font-medium">
                    Live
                  </span>
                </div>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Connected to real-time notifications
                </div>
              </div>
            )}

            {/* Notifications Dropdown */}
            <div className="relative" ref={notificationsRef}>
              <button
                data-bell-button
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  if (!notificationsOpen) {
                    fetchNotificationCount();
                  }
                }}
                className="relative p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all duration-200 cursor-pointer group"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold animate-pulse shadow-lg">
                    {unreadCount}
                  </span>
                )}
                {/* Hover tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </div>
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-12 w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-[#0067A1]/20 dark:border-gray-700 z-50 overflow-hidden">
                  <div className="p-4 border-b border-[#0067A1]/20 dark:border-gray-700 bg-[#0067A1]/5 dark:bg-gray-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-[#0067A1] dark:text-teal-300">
                          Recent Notifications
                        </h3>
                        <p className="text-sm text-[#0067A1]/80 dark:text-[#0080C6]/80">
                          {unreadCount} unread • {recentNotifications.length} recent
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={fetchNotificationCount}
                          disabled={loading}
                          className="p-1.5 rounded-lg hover:bg-[#0067A1]/10 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
                          title="Refresh"
                        >
                          <RefreshCw
                            className={`w-4 h-4 ${loading ? "animate-spin" : ""
                              }`}
                          />
                        </button>
                        <button
                          onClick={markAllAsRead}
                          disabled={
                            unreadCount === 0 || loadingAction === "all"
                          }
                          className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50 text-gray-700 dark:text-gray-300"
                          title="Mark all as read"
                        >
                          {loadingAction === "all" ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                          )}
                        </button>
                        <div className="px-3 py-1 bg-[#0067A1]/10 dark:bg-gray-800">
                          <span className="text-xs font-medium text-[#0067A1] dark:text-[#0080C6]">
                            Live
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {loading && recentNotifications.length === 0 ? (
                      <div className="flex items-center justify-center p-8">
                        <div className="text-center">
                          <Loader2 className="w-8 h-8 animate-spin text-[#0067A1] dark:text-[#0080C6] mx-auto mb-3" />
                          <p className="text-gray-600 dark:text-gray-400">Loading notifications...</p>
                        </div>
                      </div>
                    ) : recentNotifications.length === 0 ? (
                      <div className="text-center p-8">
                        <Bell className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
                        <p className="text-gray-500 dark:text-gray-400">
                          No notifications yet
                        </p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                          You're all caught up!
                        </p>
                      </div>
                    ) : (
                      <div>
                        {recentNotifications.map((notification) => (
                          <div
                            key={notification.id}
                            onClick={() =>
                              handleNotificationClick(notification)
                            }
                            className={`p-4 border-b border-[#0067A1]/10 dark:border-gray-700 hover:bg-[#0067A1]/5 dark:hover:bg-gray-800 cursor-pointer transition-all duration-300 group relative ${!notification.read
                              ? "bg-[#0067A1]/10 dark:bg-gray-800"
                              : ""
                              }`}
                          >
                            <div className="flex items-start space-x-3">
                              <div className="mt-0.5 relative">
                                {getNotificationIcon(notification.type)}
                                {!notification.read && (
                                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#0067A1] dark:bg-teal-400 rounded-full animate-pulse"></div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-800 dark:text-gray-200 font-medium truncate">
                                  {notification.title || "New Notification"}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-[#0067A1] dark:text-[#0080C6] mt-1">
                                  {formatTime(notification.created_at)}
                                </p>
                              </div>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-[#0067A1] dark:bg-teal-400 rounded-full mt-1 flex-shrink-0 animate-pulse"></div>
                              )}
                            </div>

                            {/* Hover actions - FIXED DELETE FUNCTION */}
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex space-x-1">
                              {!notification.read && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Optimistically update UI
                                    setRecentNotifications((prev) =>
                                      prev.map((n) =>
                                        n.id === notification.id
                                          ? { ...n, read: true }
                                          : n
                                      )
                                    );
                                    setUnreadCount((prev) =>
                                      Math.max(0, prev - 1)
                                    );
                                    // Call API
                                    markAsRead(notification.id);
                                  }}
                                  className="p-1.5 rounded-full hover:bg-green-100 dark:hover:bg-green-900/20 text-gray-700 dark:text-gray-300 transition-all duration-200 hover:scale-110"
                                  title="Mark as read"
                                >
                                  <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Optimistically remove from UI
                                  setRecentNotifications((prev) =>
                                    prev.filter(
                                      (notif) => notif.id !== notification.id
                                    )
                                  );
                                  // Update unread count if needed
                                  if (!notification.read) {
                                    setUnreadCount((prev) =>
                                      Math.max(0, prev - 1)
                                    );
                                  }
                                  // Call API
                                  deleteNotification(notification.id);
                                }}
                                disabled={loadingAction === `delete-dropdown-${notification.id}`}
                                className="p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-700 dark:text-gray-300 transition-all duration-200 hover:scale-110"
                                title="Delete"
                              >
                                {loadingAction === `delete-dropdown-${notification.id}` ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t border-[#0067A1]/20 dark:border-gray-700">
                    <button
                      onClick={() => {
                        setNotificationsOpen(false);
                        setShowAllModal(true);
                      }}
                      className="w-full flex items-center justify-center py-2.5 text-sm font-medium text-[#0067A1] dark:text-[#0080C6] hover:bg-[#0067A1]/5 dark:hover:bg-gray-800 rounded-lg transition-all duration-200 hover:scale-[1.02] group"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="relative">
                          <Eye className="w-4 h-4 text-[#0067A1] dark:text-[#0080C6]" />
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-teal-400 rounded-full animate-ping"></div>
                        </div>
                        <span>View All Notifications</span>
                        <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-[#0067A1] dark:text-[#0080C6]" />
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center space-x-2 lg:space-x-3 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200 cursor-pointer border border-white/15"
              >
                <div className="w-9 h-9 bg-white/25 rounded-full flex items-center justify-center shadow-md">
                  <User className="w-5 h-5 text-white" />
                </div>
                {/* Hide user info on mobile, show on desktop */}
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-white">
                    {chemistName || "Chemist User"}
                  </p>
                  <p className="text-xs text-teal-200 flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-1.5 animate-pulse"></span>
                    Verified Chemist
                  </p>
                </div>
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-12 w-56 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-[#0067A1]/20 dark:border-gray-700 z-50 overflow-hidden">
                  <div className="p-3 border-b border-[#0067A1]/20 dark:border-gray-700 bg-[#0067A1]/5 dark:bg-gray-800">
                    <p className="text-sm font-medium text-[#0067A1] dark:text-teal-300">
                      {chemistName || "Chemist User"}
                    </p>
                    <p className="text-xs text-[#0067A1]/80 dark:text-[#0080C6]">
                      Pharmacy Account
                    </p>
                  </div>
                  <div className="p-2">
                    <Link
                      href="/chemist/profile"
                      className="flex items-center space-x-3 w-full p-3 rounded-xl hover:bg-[#0067A1]/5 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                      <User
                        size={18}
                        className="text-[#0067A1] dark:text-[#0080C6]"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        My Profile
                      </span>
                    </Link>

                    <div className="border-t border-[#0067A1]/15 dark:border-gray-700 my-1"></div>
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

      </header>

      {/* All Notifications Modal */}
      <NotificationsModal
        isOpen={showAllModal}
        onClose={() => setShowAllModal(false)}
        onNotificationUpdate={handleNotificationUpdate}
      />
    </>
  );
}