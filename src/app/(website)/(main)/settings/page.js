"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FaUser, FaBell, FaShieldAlt, FaTrash,
  FaChevronRight, FaCheckCircle,
  FaExclamationTriangle, FaTimes, FaPhone,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

// ─── Delete Account Modal ─────────────────────────────────────────────────────
function DeleteAccountModal({ userId, onClose }) {
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (confirm !== "DELETE") { toast.error('Please type "DELETE" to confirm'); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/patient/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Account deleted successfully");
        localStorage.clear();
        sessionStorage.clear();
        router.push("/");
      } else {
        toast.error(data.error || "Failed to delete account");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <FaExclamationTriangle className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-white font-bold text-base">Delete Account</h3>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><FaTimes className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-700 font-medium mb-2">⚠️ This action is permanent and cannot be undone.</p>
            <ul className="text-sm text-red-600 space-y-1 list-disc pl-4">
              <li>All your medical records will be deleted</li>
              <li>All your appointments will be cancelled</li>
              <li>Your digital locker data will be removed</li>
            </ul>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Type <span className="font-bold text-red-600">DELETE</span> to confirm
            </label>
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder="Type DELETE here"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={handleDelete} disabled={loading || confirm !== "DELETE"}
              className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-40 transition-all flex items-center justify-center gap-2">
              {loading ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Deleting...</> : <><FaTrash className="w-3.5 h-3.5" />Delete Account</>}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [userPhone, setUserPhone] = useState("");
  const [notifications, setNotifications] = useState({ email: true, sms: true, appointment_reminders: true, health_tips: false });
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const notifTimerRef = useRef(null);

  useEffect(() => {
    const id = localStorage.getItem("userId");
    const phone = localStorage.getItem("userPhone") || "";
    if (id) { setUserId(id); setUserPhone(phone); }

    // Load saved notification preferences
    const saved = localStorage.getItem("notificationPrefs");
    if (saved) {
      try { setNotifications(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  const handleToggleNotification = (key) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);

    // Debounce save
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    notifTimerRef.current = setTimeout(async () => {
      setSavingNotifications(true);
      try {
        localStorage.setItem("notificationPrefs", JSON.stringify(updated));
        // Also persist to DB if user is logged in
        if (userId) {
          await fetch("/api/user/preferences", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId, preferences: { notifications: updated } }),
          });
        }
        toast.success("Notification preferences saved");
      } catch {
        // non-critical – localStorage already saved
      } finally {
        setSavingNotifications(false);
      }
    }, 800);
  };

  const Section = ({ title, children, borderColor = "border-gray-100" }) => (
    <div className={`bg-white rounded-2xl shadow-sm border ${borderColor} mb-5 overflow-hidden`}>
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  );

  const ActionRow = ({ icon: Icon, iconBg, title, description, onClick, children, disabled }) => (
    <button onClick={onClick} disabled={disabled}
      className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-default group">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-4.5 h-4.5 text-white" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{title}</p>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {children || <FaChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />}
    </button>
  );

  const Toggle = ({ enabled, onChange, saving }) => (
    <button onClick={onChange}
      className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none ${enabled ? "bg-[#0067A1]" : "bg-gray-200"} ${saving ? "opacity-70" : ""}`}>
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${enabled ? "left-7" : "left-1"}`} />
    </button>
  );

  return (
    <>
      <AnimatePresence>
        {showDeleteModal && <DeleteAccountModal userId={userId} onClose={() => setShowDeleteModal(false)} />}
      </AnimatePresence>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your account and preferences</p>
        </div>

        {/* Profile */}
        <Section title="Profile">
          <ActionRow
            icon={FaUser} iconBg="bg-[#0067A1]"
            title="Edit Profile"
            description="Update your name, email, photo and personal info"
            onClick={() => router.push("/website/profile")}
          />
          {userPhone && (
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FaPhone className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Phone Number</p>
                  <p className="text-xs text-gray-500 mt-0.5">{userPhone}</p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-2.5 py-1 rounded-full">
                <FaCheckCircle className="w-3 h-3" /> Verified
              </span>
            </div>
          )}
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          {[
            { key: "email", title: "Email Notifications", desc: "Appointment confirmations & updates via email" },
            { key: "sms", title: "SMS Notifications", desc: "Reminders and alerts via text message" },
            { key: "appointment_reminders", title: "Appointment Reminders", desc: "Get notified 1 hour before your appointment" },
            { key: "health_tips", title: "Health Tips & Articles", desc: "Weekly personalised health content" },
          ].map(({ key, title, desc }) => (
            <div key={key} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FaBell className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                </div>
              </div>
              <Toggle enabled={notifications[key]} onChange={() => handleToggleNotification(key)} saving={savingNotifications} />
            </div>
          ))}
        </Section>

        {/* Security */}
        <Section title="Security & Authentication">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <FaShieldAlt className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Passwordless Mobile OTP Login</p>
                <p className="text-xs text-gray-500 mt-0.5">Instant & secure login via mobile OTP enabled</p>
              </div>
            </div>
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-2.5 py-1 rounded-full">
              <FaCheckCircle className="w-3 h-3" /> Active
            </span>
          </div>
        </Section>

        {/* Privacy */}
        <Section title="Privacy & Data">
          <ActionRow
            icon={FaShieldAlt} iconBg="bg-purple-600"
            title="Consent Preferences"
            description="Manage your DPDP & telemedicine consents"
            onClick={() => router.push("/website/profile?tab=consent")}
          />
          <ActionRow
            icon={FaUser} iconBg="bg-[#0080C6]"
            title="Digital Health Locker"
            description="Access and manage your uploaded medical records"
            onClick={() => router.push("/website/digital-locker")}
          />
        </Section>

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-red-100">
            <h2 className="text-base font-semibold text-red-600">Danger Zone</h2>
          </div>
          <div className="px-6 py-5">
            <p className="text-sm text-gray-500 mb-4">
              Permanently delete your MediConnect account and all associated data. This action cannot be undone.
            </p>
            <button onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors">
              <FaTrash className="w-3.5 h-3.5" />
              Delete My Account
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
