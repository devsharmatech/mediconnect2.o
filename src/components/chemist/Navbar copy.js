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
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { generateDeviceToken, onForegroundMessage } from "@/lib/firebaseClient";
import toast, { Toaster } from "react-hot-toast";

// Notification Modal Component
function NotificationsModal({ isOpen, onClose }) {
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
 }
 } catch (error) {
 console.error("Error marking all as read:", error);
 } finally {
 setLoadingAction(null);
 }
 };

 // Delete notification
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
 }
 } catch (error) {
 console.error("Error deleting notification:", error);
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
 case "payment":
 return <Package className="w-4 h-4 text-[#0067A1] dark:text-[#0080C6]" />;
 case "stock":
 case "inventory":
 return (
 <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
 );
 case "prescription":
 return <Pill className="w-4 h-4 text-green-600 dark:text-green-400" />;
 case "report":
 return (
 <Beaker className="w-4 h-4 text-purple-600 dark:text-purple-400" />
 );
 default:
 return <Bell className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
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
 <div className="p-6 border-b border-[#0067A1]/20 dark:border-gray-700 bg-white dark:bg-gray-800">
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-2xl font-bold text-[#004F7C] dark:text-teal-300">
 All Notifications
 </h2>
 <p className="text-sm text-[#0067A1] dark:text-[#0080C6] mt-1">
 {totalNotifications} total notifications
 </p>
 </div>
 <div className="flex items-center space-x-3">
 <button
 onClick={markAllAsRead}
 disabled={loadingAction === "all"}
 className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors disabled:opacity-50"
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
 className="p-2 rounded-xl hover:bg-[#004F7C]/10 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
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
 <option
 value="payment"
 className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
 >
 Payments
 </option>
 </select>
 </div>
 </div>
 </div>

 {/* Notifications List */}
 <div ref={listRef} className="h-[500px] overflow-y-auto">
 {loading && notifications.length === 0 ? (
 <div className="flex items-center justify-center h-64">
 <Loader2 className="w-8 h-8 animate-spin text-teal-500 dark:text-[#0080C6]" />
 </div>
 ) : notifications.length === 0 ? (
 <div className="text-center py-16">
 <Bell className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
 <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300">
 No notifications found
 </h3>
 <p className="text-gray-500 dark:text-gray-400 mt-2">
 {filter !== "all" || typeFilter !== "all"
 ? "Try changing your filters"
 : "You're all caught up!"}
 </p>
 </div>
 ) : (
 <div className="divide-y divide-[#0067A1]/10 dark:divide-gray-700">
 {notifications.map((notification) => (
 <div
 key={notification.id}
 className={`p-4 hover:bg-[#004F7C]/5 dark:hover:bg-gray-800 cursor-pointer transition-colors group ${
 !notification.read
 ? "bg-[#0067A1]/5 dark:bg-[#003358]/10"
 : ""
 }`}
 onClick={() => handleNotificationClick(notification)}
 >
 <div className="flex items-start space-x-4">
 <div className="mt-1">
 {getNotificationIcon(notification.type)}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-start justify-between">
 <div>
 <h4 className="font-medium text-gray-900 dark:text-gray-100">
 {notification.title || "Notification"}
 </h4>
 <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
 {notification.message || notification.description}
 </p>
 <div className="flex items-center space-x-3 mt-2">
 <span className="text-xs text-[#0067A1] dark:text-[#0080C6]">
 {formatTime(notification.created_at)}
 </span>
 {!notification.read && (
 <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#0067A1]/10 text-[#004F7C] dark:bg-[#003358] dark:text-teal-300">
 Unread
 </span>
 )}
 <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
 {notification.type || "general"}
 </span>
 </div>
 </div>
 <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
 {!notification.read && (
 <button
 onClick={(e) => {
 e.stopPropagation();
 markAsRead(notification.id);
 }}
 disabled={loadingAction === notification.id}
 className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/20 text-gray-700 dark:text-gray-300"
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
 className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-700 dark:text-gray-300"
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
 className="px-4 py-2 text-sm font-medium text-[#0067A1] dark:text-[#0080C6] hover:text-[#004F7C] dark:hover:text-teal-300 disabled:opacity-50"
 >
 {loading ? "Loading..." : "Load More Notifications"}
 </button>
 </div>
 )}
 </div>
 )}
 </div>

 {/* Footer */}
 <div className="p-4 border-t border-[#0067A1]/20 dark:border-gray-700 bg-white dark:bg-gray-800">
 <div className="flex items-center justify-between">
 <button
 onClick={clearAllNotifications}
 disabled={
 notifications.length === 0 || loadingAction === "clear-all"
 }
 className="flex items-center space-x-2 px-4 py-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50"
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
 const [searchQuery, setSearchQuery] = useState("");
 const [recentNotifications, setRecentNotifications] = useState([]);
 const [unreadCount, setUnreadCount] = useState(0);
 const [loading, setLoading] = useState(true);
 const [loadingAction, setLoadingAction] = useState(null);
 const [showAllModal, setShowAllModal] = useState(false);
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
 useEffect(() => {
 if ("serviceWorker" in navigator) {
 navigator.serviceWorker
 .register("/firebase-messaging-sw.js")
 .then((registration) => {
 console.log("Service Worker registered:", registration);
 })
 .catch((err) => {
 console.error("Service Worker registration failed:", err);
 });
 }
 }, []);

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
 setUnreadCount(countData.unread_count || 0);
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
 }, []);

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
 case "payment":
 return <Package className="w-4 h-4 text-[#0067A1] dark:text-[#0080C6]" />;
 case "stock":
 case "inventory":
 return (
 <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
 );
 case "prescription":
 return <Pill className="w-4 h-4 text-green-600 dark:text-green-400" />;
 case "report":
 return (
 <Beaker className="w-4 h-4 text-purple-600 dark:text-purple-400" />
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
 }, [fetchNotificationCount]);

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

 const initializeFCM = async () => {
 try {
 const chemist = getChemist();
 if (!chemist?.id) return;
 async function initPush() {
 const token = await generateDeviceToken();
 if (!token) return;

 await fetch("/api/save-fcm-token", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 user_id: chemist.id,
 fcm_token: token,
 }),
 });
 }

 initPush();

 onForegroundMessage((payload) => {
 toast.success(payload.notification?.title || "New notification");
 });
 } catch (error) {
 console.error("Error initializing FCM:", error);
 }
 };

 useEffect(() => {
 initializeFCM();
 }, []);
 return (
 <>
 <header className="sticky top-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-[#0067A1]/20 dark:border-gray-700 px-4 lg:px-6 py-4 shadow-sm shadow-[#0067A1]/10 dark:shadow-gray-900 flex-shrink-0">
 <div className="flex items-center justify-between">
 {/* Left Section - Menu Button & Title */}
 <div className="flex items-center space-x-4">
 {/* Mobile Menu Button - Only show on mobile */}
 <button
 onClick={onMenuClick}
 className="lg:hidden p-2 rounded-xl bg-[#0067A1]/10 dark:bg-gray-800 text-[#0067A1] dark:text-[#0080C6] hover:bg-[#004F7C]/20 dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer"
 >
 <Menu size={20} />
 </button>

 {/* Page Title */}
 <div className="flex flex-col">
 <h1 className="text-xl lg:text-2xl font-bold text-[#004F7C] dark:text-teal-300">
 {getPageTitle()}
 </h1>
 <p className="text-xs lg:text-sm text-[#0067A1] dark:text-[#0080C6] mt-1 hidden sm:block">
 {pathname.includes("/dashboard")
 ? "Welcome back! Here's your pharmacy dashboard summary."
 : `Managing ${getPageTitle().toLowerCase()} in your pharmacy`}
 </p>
 </div>
 </div>

 {/* Right Section */}
 <div className="flex items-center space-x-2 lg:space-x-4">
 {/* Search Bar - Hidden on mobile, visible on desktop */}
 <div className="hidden lg:block relative">
 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#0080C6] dark:text-teal-500 w-5 h-5" />
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Search medicines, orders, suppliers..."
 className="w-64 pl-10 pr-4 py-2.5 bg-[#0067A1]/5 dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all duration-200 cursor-text text-gray-800 dark:text-gray-200 placeholder-teal-400 dark:placeholder-teal-500"
 />
 </div>

 {/* Mobile Search Button */}
 <button className="lg:hidden p-2.5 rounded-xl bg-[#0067A1]/10 dark:bg-gray-800 text-[#0067A1] dark:text-[#0080C6] hover:bg-[#004F7C]/20 dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer">
 <Search size={20} />
 </button>

 {/* Theme Toggle */}
 <button
 onClick={toggleTheme}
 className="p-2.5 rounded-xl bg-[#0067A1]/10 dark:bg-gray-800 text-[#0067A1] dark:text-[#0080C6] hover:bg-[#004F7C]/20 dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer"
 title={
 theme === "light"
 ? "Switch to dark mode"
 : "Switch to light mode"
 }
 >
 {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
 </button>

 {/* Notifications Dropdown */}
 <div className="relative" ref={notificationsRef}>
 <button
 onClick={() => {
 setNotificationsOpen(!notificationsOpen);
 if (!notificationsOpen) {
 fetchNotificationCount();
 }
 }}
 className="relative p-2.5 rounded-xl bg-[#0067A1]/10 dark:bg-gray-800 text-[#0067A1] dark:text-[#0080C6] hover:bg-[#004F7C]/20 dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer"
 >
 <Bell size={20} />
 {unreadCount > 0 && (
 <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold animate-pulse">
 {unreadCount}
 </span>
 )}
 </button>

 {notificationsOpen && (
 <div className="absolute right-0 top-12 w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-[#0067A1]/20 dark:border-gray-700 z-50 overflow-hidden">
 <div className="p-4 border-b border-[#0067A1]/20 dark:border-gray-700 bg-white dark:bg-gray-800">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="font-semibold text-[#004F7C] dark:text-teal-300">
 Recent Notifications
 </h3>
 <p className="text-sm text-[#0067A1] dark:text-[#0080C6]">
 {unreadCount} unread notifications
 </p>
 </div>
 <div className="flex items-center space-x-2">
 <button
 onClick={fetchNotificationCount}
 disabled={loading}
 className="p-1.5 rounded-lg hover:bg-[#004F7C]/10 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
 title="Refresh"
 >
 <RefreshCw
 className={`w-4 h-4 ${
 loading ? "animate-spin" : ""
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
 <div className="px-3 py-1 bg-[#0067A1]/10 dark:bg-[#003358]/30 rounded-full">
 <span className="text-xs font-medium text-[#004F7C] dark:text-[#0080C6]">
 Pharmacy
 </span>
 </div>
 </div>
 </div>
 </div>

 <div className="max-h-96 overflow-y-auto">
 {loading && recentNotifications.length === 0 ? (
 <div className="flex items-center justify-center p-8">
 <Loader2 className="w-6 h-6 animate-spin text-teal-500 dark:text-[#0080C6]" />
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
 className={`p-4 border-b border-[#0067A1]/10 dark:border-gray-700 hover:bg-[#004F7C]/5 dark:hover:bg-gray-800 cursor-pointer transition-colors group relative ${
 !notification.read
 ? "bg-[#0067A1]/5 dark:bg-[#003358]/20"
 : ""
 }`}
 >
 <div className="flex items-start space-x-3">
 <div className="mt-0.5">
 {getNotificationIcon(notification.type)}
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
 <div className="w-2 h-2 bg-[#0080C6] rounded-full mt-1 flex-shrink-0"></div>
 )}
 </div>

 {/* Hover actions - Fixed dark mode visibility */}
 <div className="absolute right-3 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
 {!notification.read && (
 <button
 onClick={(e) => {
 e.stopPropagation();
 // Simulate mark as read
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
 }}
 className="p-1.5 rounded-full hover:bg-green-100 dark:hover:bg-green-900/20 text-gray-700 dark:text-gray-300"
 title="Mark as read"
 >
 <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
 </button>
 )}
 <button
 onClick={(e) => {
 e.stopPropagation();
 // Simulate delete
 setRecentNotifications((prev) =>
 prev.filter(
 (notif) => notif.id !== notification.id
 )
 );
 }}
 className="p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-700 dark:text-gray-300"
 title="Delete"
 >
 <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
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
 className="w-full flex items-center justify-center py-2.5 text-sm font-medium text-[#0067A1] dark:text-[#0080C6] hover:bg-[#004F7C]/5 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
 >
 <Eye className="w-4 h-4 mr-2" />
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
 className="flex items-center space-x-2 lg:space-x-3 p-2 rounded-xl bg-[#0067A1]/10 dark:bg-gray-800 hover:bg-[#004F7C]/20 dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer border border-[#0067A1]/20 dark:border-gray-700"
 >
 <div className="w-9 h-9 bg-[#0067A1] rounded-full flex items-center justify-center shadow-md">
 <User className="w-5 h-5 text-white" />
 </div>
 {/* Hide user info on mobile, show on desktop */}
 <div className="hidden md:block text-left">
 <p className="text-sm font-semibold text-[#004F7C] dark:text-teal-300">
 {chemistName || "Chemist User"}
 </p>
 <p className="text-xs text-[#0067A1] dark:text-[#0080C6] flex items-center">
 <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
 Verified Chemist
 </p>
 </div>
 </button>

 {profileOpen && (
 <div className="absolute right-0 top-12 w-56 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-[#0067A1]/20 dark:border-gray-700 z-50 overflow-hidden">
 <div className="p-3 border-b border-[#0067A1]/20 dark:border-gray-700 bg-white dark:bg-gray-800">
 <p className="text-sm font-medium text-[#004F7C] dark:text-teal-300">
 {chemistName || "Chemist User"}
 </p>
 <p className="text-xs text-[#0067A1] dark:text-[#0080C6]">
 Pharmacy Account
 </p>
 </div>
 <div className="p-2">
 <Link
 href="/chemist/profile"
 className="flex items-center space-x-3 w-full p-3 rounded-xl hover:bg-[#004F7C]/5 dark:hover:bg-gray-800 transition-colors cursor-pointer"
 >
 <User
 size={18}
 className="text-[#0067A1] dark:text-[#0080C6]"
 />
 <span className="text-sm text-gray-700 dark:text-gray-300">
 My Profile
 </span>
 </Link>
 <Link
 href="/chemist/settings"
 className="flex items-center space-x-3 w-full p-3 rounded-xl hover:bg-[#004F7C]/5 dark:hover:bg-gray-800 transition-colors cursor-pointer"
 >
 <Settings
 size={18}
 className="text-[#0067A1] dark:text-[#0080C6]"
 />
 <span className="text-sm text-gray-700 dark:text-gray-300">
 Account Settings
 </span>
 </Link>
 <div className="border-t border-[#0067A1]/20 dark:border-gray-700 my-1"></div>
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
 <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#0080C6] dark:text-teal-500 w-5 h-5" />
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Search medicines, orders..."
 className="w-full pl-12 pr-4 py-3 bg-[#0067A1]/5 dark:bg-gray-800 border border-[#0067A1]/20 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all duration-200 cursor-text text-gray-800 dark:text-gray-200 placeholder-teal-400 dark:placeholder-teal-500"
 />
 </div>
 </div>
 </header>

 {/* All Notifications Modal */}
 <NotificationsModal
 isOpen={showAllModal}
 onClose={() => setShowAllModal(false)}
 />
 </>
 );
}
