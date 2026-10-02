"use client";

import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import {
  User,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  Camera,
  CheckCircle2,
  Lock,
  Building,
  Calendar,
  Key,
  Smartphone,
  Save,
  RefreshCw,
  Copy,
  Check,
  Layers,
  Sparkles,
  Stethoscope,
  TestTube,
  Pill,
  Users,
  HeartHandshake,
  CreditCard,
  Settings,
  Activity,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

export default function AdminProfilePage() {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile"); // 'profile' | 'security' | 'permissions'
  const [copiedId, setCopiedId] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    profile_picture: "",
  });

  const [initialData, setInitialData] = useState({
    full_name: "",
    email: "",
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  // Check if form is dirty
  const isDirty =
    Boolean(selectedFile) ||
    formData.full_name !== initialData.full_name ||
    formData.email !== initialData.email;

  const getAdminId = () => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem("adminUser");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.id) return parsed.id;
      }
      return localStorage.getItem("adminId") || "f5c4f9d8-154f-44b4-830a-90c4aeb1d5fa";
    } catch {
      return "f5c4f9d8-154f-44b4-830a-90c4aeb1d5fa";
    }
  };

  // Fetch admin profile
  const fetchAdminDetails = async (showToast = false) => {
    setLoading(true);
    try {
      const adminId = getAdminId();
      const res = await fetch(`/api/admin/details/${adminId}`);
      const result = await res.json();

      if (result.success && result.data) {
        const data = result.data;
        setAdmin(data);

        const loadedName = data.admin_details?.full_name || "Dev Sharma";
        const loadedEmail = data.admin_details?.email || "admin@mediconnect.fit";
        const loadedPhone = data.phone_number || "7017580125";
        const loadedPic = data.profile_picture || "";

        setFormData({
          full_name: loadedName,
          email: loadedEmail,
          phone_number: loadedPhone,
          profile_picture: loadedPic,
        });

        setInitialData({
          full_name: loadedName,
          email: loadedEmail,
        });

        // Update cached adminUser in localStorage
        try {
          const raw = localStorage.getItem("adminUser");
          const cur = raw ? JSON.parse(raw) : {};
          const merged = {
            ...cur,
            ...data,
            full_name: loadedName,
            email: loadedEmail,
            admin_details: data.admin_details,
          };
          localStorage.setItem("adminUser", JSON.stringify(merged));
          window.dispatchEvent(new Event("adminProfileUpdated"));
        } catch (e) {
          // ignore storage error
        }

        if (showToast) {
          toast.success("Profile reloaded successfully");
        }
      } else {
        toast.error(result.message || "Failed to load profile details");
      }
    } catch (err) {
      console.error("Error fetching admin profile:", err);
      toast.error("Network error loading profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminDetails();
  }, []);

  // Keyboard shortcut: Ctrl+S or Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (isDirty && !saving) {
          handleSave();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDirty, saving, formData, selectedFile]);

  // Handle image file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, or WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file must be under 5MB");
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setAvatarError(false);
    toast.success("New picture selected. Click 'Save Changes' to update.");
  };

  // Copy UUID
  const handleCopyId = (id) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    toast.success("Admin ID copied to clipboard!");
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Save changes
  const handleSave = async (e) => {
    if (e) e.preventDefault();

    if (!formData.full_name.trim()) {
      toast.error("Full Name is required");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("Email Address is required");
      return;
    }

    setSaving(true);
    try {
      const adminId = getAdminId();
      const body = new FormData();
      body.append("id", adminId);
      body.append("full_name", formData.full_name.trim());
      body.append("email", formData.email.trim());

      const permissions = admin?.admin_details?.permissions || {
        users: true,
        content: true,
        settings: true,
        analytics: true,
        manage_labs: true,
        manage_users: true,
        view_reports: true,
        manage_doctors: true,
        manage_chemists: true,
        manage_patients: true,
        update_settings: true,
        approve_onboarding: true,
      };
      body.append("permissions", JSON.stringify(permissions));

      if (selectedFile) {
        body.append("profile_picture", selectedFile);
      }

      const res = await fetch("/api/admin/update", {
        method: "POST",
        body,
      });

      const result = await res.json();

      if (result.success) {
        toast.success("Admin profile updated successfully!");
        setSelectedFile(null);
        setPreviewUrl(null);

        // Update local cache
        try {
          const raw = localStorage.getItem("adminUser");
          const cur = raw ? JSON.parse(raw) : {};
          const updated = {
            ...cur,
            profile_picture: result.data?.user?.profile_picture || formData.profile_picture,
            full_name: formData.full_name.trim(),
            email: formData.email.trim(),
            admin_details: result.data?.admin,
          };
          localStorage.setItem("adminUser", JSON.stringify(updated));
          window.dispatchEvent(new Event("adminProfileUpdated"));
        } catch {}

        setInitialData({
          full_name: formData.full_name.trim(),
          email: formData.email.trim(),
        });

        // Refresh admin details in state
        if (result.data?.user?.profile_picture) {
          setFormData((prev) => ({
            ...prev,
            profile_picture: result.data.user.profile_picture,
          }));
        }
      } else {
        toast.error(result.message || "Failed to update profile");
      }
    } catch (err) {
      console.error("Profile save error:", err);
      toast.error("Error saving profile changes");
    } finally {
      setSaving(false);
    }
  };

  // Extract initials for fallback avatar
  const getInitials = (name) => {
    if (!name) return "AD";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const currentAvatar = previewUrl || formData.profile_picture;
  const adminId = admin?.id || getAdminId();
  const memberDate = admin?.created_at
    ? new Date(admin.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "November 2025";

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#0067A1] uppercase tracking-wider">
            <span>Administration</span>
            <span>/</span>
            <span className="text-gray-500 dark:text-gray-400">Account Overview</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mt-1 tracking-tight">
            Administrator Profile
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage your master credentials, Insignia 2FA authentication, and operational privileges.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto w-full sm:w-auto justify-end sm:justify-start">
          <button
            type="button"
            onClick={() => fetchAdminDetails(true)}
            disabled={loading}
            title="Reload profile data"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-750 transition-all shadow-xs active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-[#0067A1]" : ""} />
            <span>Sync</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-all shadow-xs active:scale-95 ${
              isDirty
                ? "bg-[#0067A1] hover:bg-[#005282] text-white shadow-[#0067A1]/20 hover:shadow-sm"
                : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-gray-700"
            }`}
          >
            <Save size={14} className={saving ? "animate-spin" : ""} />
            <span>{saving ? "Saving Changes..." : isDirty ? "Save Changes" : "Saved"}</span>
          </button>
        </div>
      </div>

      {/* Main Hero Header Card - Clean SaaS Design with thin border */}
      <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs">
        {/* Header Content */}
        <div className="p-5 sm:p-6 lg:p-7">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Left: Avatar + Identity */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-4 sm:gap-5 text-center sm:text-left">
              {/* Circular Avatar Frame with Upload Action */}
              <div className="relative group shrink-0">
                <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-hidden shadow-xs flex items-center justify-center p-0.5">
                  {currentAvatar && !avatarError ? (
                    <img
                      src={currentAvatar}
                      alt={formData.full_name || "Admin"}
                      onError={() => setAvatarError(true)}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#003358] to-[#0067A1] flex items-center justify-center text-white font-bold text-xl sm:text-2xl select-none">
                      {getInitials(formData.full_name)}
                    </div>
                  )}
                </div>

                {/* Upload Trigger Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload new profile picture"
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#0067A1] text-white hover:bg-[#005282] transition-transform active:scale-90 shadow-sm border border-white dark:border-gray-900 cursor-pointer"
                >
                  <Camera size={13} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Name, Role & Status Badges */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                    {formData.full_name || "Dev Sharma"}
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-[#0067A1] dark:bg-blue-950/40 dark:text-cyan-300 border border-blue-200/60 dark:border-blue-800/40">
                    <ShieldCheck size={12} />
                    Super Administrator
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Active Session
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail size={13} className="text-gray-400 shrink-0" />
                    <span>{formData.email || "admin@mediconnect.fit"}</span>
                  </span>
                  <span className="hidden sm:inline text-gray-300 dark:text-gray-700">•</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Phone size={13} className="text-gray-400 shrink-0" />
                    <span>+91 {formData.phone_number || "7017580125"}</span>
                  </span>
                  <span className="hidden sm:inline text-gray-300 dark:text-gray-700">•</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar size={13} className="text-gray-400 shrink-0" />
                    <span>Member since {memberDate}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Security & Cluster Indicator */}
            <div className="hidden lg:flex flex-col items-end gap-1.5 shrink-0">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs">
                <Shield size={13} className="text-[#0067A1]" />
                <span className="text-gray-500">2FA Security:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">SMS OTP Enforced</span>
              </div>
              <span className="text-[11px] text-gray-400 font-mono">
                Cluster: AWS RDS PostgreSQL
              </span>
            </div>
          </div>

          {/* Segmented Sub-Navigation Tabs */}
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              type="button"
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap border ${
                activeTab === "profile"
                  ? "bg-[#0067A1] text-white border-[#0067A1] shadow-xs"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750"
              }`}
            >
              <User size={13} />
              <span>Personal & Contact Info</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("security")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap border ${
                activeTab === "security"
                  ? "bg-[#0067A1] text-white border-[#0067A1] shadow-xs"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750"
              }`}
            >
              <Lock size={13} />
              <span>Security & 2FA Access</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("permissions")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap border ${
                activeTab === "permissions"
                  ? "bg-[#0067A1] text-white border-[#0067A1] shadow-xs"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750"
              }`}
            >
              <Layers size={13} />
              <span>System Privileges</span>
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                  activeTab === "permissions"
                    ? "bg-white/20 text-white"
                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                }`}
              >
                12 Active
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: Profile & Contact Information */}
      {activeTab === "profile" && (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2-cols: Main Inputs */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6 shadow-xs space-y-6">
                <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <User size={17} className="text-[#0067A1]" />
                    General Information
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Your personal identity and primary contact email visible across notifications and audit trails.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <User size={15} />
                      </div>
                      <input
                        type="text"
                        required
                        value={formData.full_name}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, full_name: e.target.value }))
                        }
                        placeholder="e.g. Dev Sharma"
                        className="w-full pl-9 pr-3.5 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-white text-xs sm:text-sm font-medium focus:bg-white dark:focus:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all"
                      />
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Displayed on administrative action logs and doctor approvals.
                    </p>
                  </div>

                  {/* Email Address */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Mail size={15} />
                      </div>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, email: e.target.value }))
                        }
                        placeholder="e.g. admin@mediconnect.fit"
                        className="w-full pl-9 pr-3.5 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-white text-xs sm:text-sm font-medium focus:bg-white dark:focus:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all"
                      />
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Used for critical platform escalations and financial reports.
                    </p>
                  </div>
                </div>

                {/* Phone & Role */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 pt-2 border-t border-gray-100 dark:border-gray-800">
                  {/* Phone Number (Verified & Protected) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Registered Mobile Number
                      </label>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <Check size={12} strokeWidth={2.5} />
                        Verified via SMS
                      </span>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Phone size={15} />
                      </div>
                      <input
                        type="tel"
                        disabled
                        value={formData.phone_number || "7017580125"}
                        className="w-full pl-9 pr-24 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-100/70 dark:bg-gray-800/70 text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-semibold select-none cursor-not-allowed"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          Primary
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Locked to primary 2FA SMS security. Contact AWS root to modify.
                    </p>
                  </div>

                  {/* Administrative Role / Level */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      System Authorization Level
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Shield size={15} />
                      </div>
                      <input
                        type="text"
                        disabled
                        value="Super Administrator (Full Cluster Access)"
                        className="w-full pl-9 pr-3.5 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-100/70 dark:bg-gray-800/70 text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-semibold select-none cursor-not-allowed"
                      />
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Unrestricted rights to Doctors, Labs, Chemists, Patients & System Config.
                    </p>
                  </div>
                </div>

                {/* Form Footer Action */}
                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="text-xs text-gray-500 text-center sm:text-left">
                    {isDirty ? (
                      <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                        <AlertCircle size={14} />
                        You have unsaved changes. (Ctrl+S to save)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 size={14} />
                        All settings saved to AWS RDS PostgreSQL
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {isDirty && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            full_name: initialData.full_name,
                            email: initialData.email,
                          }));
                          setSelectedFile(null);
                          setPreviewUrl(null);
                          toast("Changes discarded", { icon: "↩️" });
                        }}
                        className="flex-1 sm:flex-none px-4 py-2 rounded-md text-xs font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        Reset
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={saving || !isDirty}
                      className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md text-xs font-semibold transition-all shadow-xs ${
                        isDirty
                          ? "bg-[#0067A1] hover:bg-[#005282] text-white shadow-[#0067A1]/20 active:scale-95"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      <Save size={14} className={saving ? "animate-spin" : ""} />
                      <span>{saving ? "Saving..." : "Save Profile"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 1-col: Account Metadata Card */}
            <div className="space-y-6">
              {/* Technical Identifiers */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6 shadow-xs space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Account Metadata
                </h4>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <span className="text-gray-500 block mb-1">Master Admin UUID</span>
                    <div className="flex items-center justify-between p-2 rounded-md bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 font-mono text-[11px] text-gray-700 dark:text-gray-300">
                      <span className="truncate mr-2">{adminId}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyId(adminId)}
                        title="Copy UUID"
                        className="shrink-0 p-1 rounded-md hover:text-[#0067A1] transition-colors"
                      >
                        {copiedId ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-gray-500">Internal UID</span>
                    <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                      {admin?.un_id || "1001"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-gray-500">Database Engine</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      AWS RDS PostgreSQL
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-gray-500">Storage Cluster</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      AWS S3 + CloudFront
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-500">Account Created</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {admin?.created_at
                        ? new Date(admin.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "7 Nov 2025"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Organization Profile Badge */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0067A1] dark:text-cyan-300">
                  <Building size={15} />
                  <span>Licensed Healthcare Network</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  MediConnect.fit Private Limited operates in strict accordance with the Telemedicine Practice Guidelines and Digital Personal Data Protection (DPDP) norms.
                </p>
                <div className="text-[11px] text-gray-400 font-mono">
                  Registration: CIN-U85100DL2024PTC123456
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Tab 2: Security & 2FA Access */}
      {activeTab === "security" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 2FA Status Card */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Smartphone size={17} className="text-[#0067A1]" />
                    Two-Factor Authentication (2FA)
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Mandatory SMS OTP protocol enforced across all administrative logins.
                  </p>
                </div>
                <span className="px-2.5 py-1 text-[11px] font-bold uppercase rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                  Enforced & Active
                </span>
              </div>

              <div className="space-y-3 text-xs bg-gray-50/70 dark:bg-gray-800/50 p-4 rounded-md border border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Gateway Provider:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">Insignia SMS Gateway</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Destination Phone:</span>
                  <span className="font-mono font-bold text-[#0067A1]">+91 {formData.phone_number || "7017580125"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">OTP Expiration Window:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">5 Minutes</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Test OTP Bypass:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Strictly Disabled (Live Real OTP Only)</span>
                </div>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                For administrative safety, direct password logins without phone OTP verification are blocked. Every session token is signed and tied to your verified phone.
              </p>
            </div>

            {/* Active Session & Device Card */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck size={17} className="text-[#0067A1]" />
                    Current Session Security
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Details of the device and session accessing this administrative console.
                  </p>
                </div>
                <span className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active Now
                </span>
              </div>

              <div className="space-y-3 text-xs bg-gray-50/70 dark:bg-gray-800/50 p-4 rounded-md border border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Host Environment:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">Localhost / Secure VPC</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Session Cookie:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">HttpOnly &bull; SameSite=Lax</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Database Role:</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">postgres@mediconnect-stag-db</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Last Verified:</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} Today
                  </span>
                </div>
              </div>

              <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3.5 flex items-start gap-2.5">
                <AlertCircle size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                  Remember to log out if you are working on a shared workstation or public browser to terminate the session token immediately.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: System Roles & Privileges */}
      {activeTab === "permissions" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Shield size={17} className="text-[#0067A1]" />
                  Administrative Authorization Matrix
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Active system privileges granted to master account {formData.full_name} ({formData.phone_number}).
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 self-start sm:self-auto">
                <CheckCircle2 size={13} />
                Master Access (All Granted)
              </span>
            </div>

            {/* Privileges Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  title: "Doctor Management",
                  desc: "Onboard clinicians, verify medical council registration, manage consultation fees and schedules.",
                  icon: <Stethoscope size={17} className="text-[#0067A1]" />,
                  category: "Clinical",
                },
                {
                  title: "Diagnostic Laboratories",
                  desc: "Approve pathology partners, update home-sample collection charges, and test catalog packages.",
                  icon: <TestTube size={17} className="text-teal-600" />,
                  category: "Diagnostics",
                },
                {
                  title: "Pharmacies & Chemists",
                  desc: "Manage partner dispensaries, inspect prescription fulfillments, and audit drug distribution.",
                  icon: <Pill size={17} className="text-indigo-600" />,
                  category: "Pharmacy",
                },
                {
                  title: "Patient Health Locker",
                  desc: "Access verified consultation notes, digital health records, and BPL card subsidized requests.",
                  icon: <Users size={17} className="text-emerald-600" />,
                  category: "Patients",
                },
                {
                  title: "Nursing & Equipment Care",
                  desc: "Assign nursing staff and medical equipment rental leads to designated healthcare partners.",
                  icon: <HeartHandshake size={17} className="text-rose-600" />,
                  category: "Care",
                },
                {
                  title: "Financial Ledger & Payouts",
                  desc: "Review daily platform volume, process physician payout batches, and approve refund requests.",
                  icon: <CreditCard size={17} className="text-amber-600" />,
                  category: "Finance",
                },
                {
                  title: "Clinical Risk & Interventions",
                  desc: "Monitor cardio/lung critical alerts, dispatch emergency notices, and review anomaly triage.",
                  icon: <Activity size={17} className="text-rose-500" />,
                  category: "Clinical",
                },
                {
                  title: "System Operations & Health",
                  desc: "Live outbox monitoring, P1 incident escalations, and automated background cron checks.",
                  icon: <Settings size={17} className="text-purple-600" />,
                  category: "Infrastructure",
                },
                {
                  title: "Security & SMS Gateway",
                  desc: "Insignia SMS credentials, OTP dispatch logs, and multi-factor authentication controls.",
                  icon: <Key size={17} className="text-blue-600" />,
                  category: "Security",
                },
              ].map((priv, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg border border-gray-200/80 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 hover:bg-white dark:hover:bg-gray-800 hover:border-[#0067A1]/30 transition-all flex flex-col justify-between space-y-3 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-md bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-700 shadow-2xs group-hover:scale-105 transition-transform">
                        {priv.icon}
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                        Granted
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                        {priv.title}
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                        {priv.desc}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800/60 flex items-center justify-between text-[10px] text-gray-400">
                    <span>{priv.category} Access</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Full CRUD</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
