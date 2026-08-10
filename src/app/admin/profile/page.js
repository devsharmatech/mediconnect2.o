"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Save,
  RefreshCw,
  User,
  Mail,
  Phone,
  Shield,
  Camera,
  Upload,
  CheckCircle,
  Settings,
  Building,
  Calendar,
  Key,
  Smartphone,
  Server,
  Database,
  Bell,
  Globe,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";

export default function AdminProfilePage() {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [permissions, setPermissions] = useState({
    users: true,
    content: true,
    settings: true,
    analytics: true,
  });

  // OTP States
  const [otp, setOtp] = useState("");
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  // Form states - initialize with empty strings instead of undefined
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    profile_picture: "",
  });

  const [selectedFile, setSelectedFile] = useState(null);

  // Initialize form data with proper defaults
  const initializeFormData = (adminData) => {
    setFormData({
      full_name: adminData?.admin_details?.full_name || "",
      email: adminData?.admin_details?.email || "",
      phone_number: adminData?.phone_number || "",
      profile_picture: adminData?.profile_picture || "",
    });
  };

  const getAdminId = () => {
    if (typeof window === "undefined") return null;

    try {
      const storedAdmin = localStorage.getItem("adminUser");
      if (storedAdmin) {
        const admin = JSON.parse(storedAdmin);
        return admin?.id || null;
      }
      const adminId = localStorage.getItem("adminId");
      return adminId || null;
    } catch (error) {
      console.error("Failed to read admin ID:", error);
      return null;
    }
  };

  // Fetch admin details
  const fetchAdminDetails = async () => {
    setLoading(true);
    try {
      const adminId = getAdminId();
      const response = await fetch(`/api/admin/details/${adminId}`);
      const result = await response.json();

      if (result.success) {
        setAdmin(result.data);
        initializeFormData(result.data);

        if (result.data.admin_details?.permissions) {
          setPermissions(result.data.admin_details.permissions);
        }

        toast.success("Profile loaded successfully!");
      } else {
        toast.error(result.message || "Failed to load profile");
        // Initialize with empty data even on error
        initializeFormData({});
      }
    } catch (error) {
      console.error("Error fetching admin details:", error);
      toast.error("Failed to load profile");
      // Initialize with empty data even on error
      initializeFormData({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminDetails();
  }, []);

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value || "", // Ensure value is never undefined
    }));
  };

  // Update profile using POST method
  const updateProfile = async () => {
    setSaving(true);
    try {
      const adminId = getAdminId();

      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append("id", adminId);
      formDataToSend.append("full_name", formData.full_name || "");
      formDataToSend.append("email", formData.email || "");
      formDataToSend.append("permissions", JSON.stringify(permissions));

      if (selectedFile) {
        formDataToSend.append("profile_picture", selectedFile);
      }

      const response = await fetch("/api/admin/update", {
        method: "POST",
        body: formDataToSend,
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Profile updated successfully!");
        setSelectedFile(null);
        fetchAdminDetails(); // Refresh data
      } else {
        toast.error(result.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // Handle profile picture upload
  const handleProfilePictureUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setSelectedFile(file);
    const imageUrl = URL.createObjectURL(file);
    handleInputChange("profile_picture", imageUrl);
    toast.success("Profile picture selected! Click Save to update.");
  };

  // Request OTP using your existing API
  const requestPhoneOTP = async () => {
    if (!formData.phone_number) {
      toast.error("Please enter your phone number first");
      return;
    }

    setSendingOtp(true);
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone_number: formData.phone_number,
          role: "admin", // Assuming admin role for profile verification
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`OTP sent successfully! Use: ${result.data.otp}`);
        setShowOtpModal(true);
      } else {
        toast.error(result.message || "Failed to send OTP");
      }
    } catch (error) {
      console.error("Error requesting OTP:", error);
      toast.error("Failed to send OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  // Verify OTP using your existing validation API
  const verifyOTP = async () => {
    if (!otp) {
      toast.error("Please enter the OTP");
      return;
    }
    const adminId = getAdminId();
    setVerifying(true);
    try {
      const response = await fetch("/api/auth/validate-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: adminId || undefined,
          phone_number: formData.phone_number,
          role: "admin",
          otp: otp,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Phone number verified successfully!");
        setShowOtpModal(false);
        setOtp("");
        // Update phone verification status
        setAdmin((prev) => (prev ? { ...prev, phone_verified: true } : null));
      } else {
        toast.error(result.message || "Invalid OTP");
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      toast.error("Failed to verify OTP");
    } finally {
      setVerifying(false);
    }
  };

  const handlePermissionChange = (permission, value) => {
    setPermissions((prev) => ({
      ...prev,
      [permission]: value,
    }));
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
      },
    },
  };

  const cardVariants = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
      },
    },
    hover: {
      scale: 1.02,
      transition: {
        type: "spring",
        stiffness: 400,
      },
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center bg-white/80 dark:bg-gray-800/80 rounded-2xl p-8 shadow-xl border border-gray-200/50 dark:border-gray-700/50"
        >
          <RefreshCw className="w-12 h-12 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
            Loading profile...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <main className="flex-1 overflow-auto relative z-0">
        <div className="p-2 md:p-4 bg-transparent">
          <div className="bg-white/90 dark:bg-gray-800/90 rounded-3xl shadow-md border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 p-6 md:p-8">
              {/* Header Section */}
              <motion.div
                className="mb-8"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <motion.h1
                      className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      Admin Profile
                    </motion.h1>
                    <motion.p
                      className="text-gray-600 dark:text-gray-400 text-lg"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      Manage your account settings and preferences
                    </motion.p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05, backgroundColor: "#000000" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => fetchAdminDetails()}
                    disabled={loading}
                    className="flex items-center space-x-3 px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-black transition-all duration-300 shadow-sm cursor-pointer mt-4 sm:mt-0 border border-gray-700"
                  >
                    <RefreshCw
                      size={18}
                      className={loading ? "animate-spin" : ""}
                    />
                    <span className="font-medium">Refresh</span>
                  </motion.button>
                </div>
              </motion.div>

              {/* Stats Cards */}
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {[
                  {
                    label: "Account Status",
                    value: "Active",
                    icon: CheckCircle,
                    color: "from-green-500 to-green-600",
                  },
                  {
                    label: "Role",
                    value: "Administrator",
                    icon: Shield,
                    color: "from-[#0067A1] to-[#004F7C]",
                  },
                  {
                    label: "Member Since",
                    value: admin?.created_at
                      ? new Date(admin.created_at).toLocaleDateString()
                      : "2024",
                    icon: Calendar,
                    color: "from-[#004F7C] to-[#003358]",
                  },
                  {
                    label: "Phone Verified",
                    value: admin?.is_verified ? "Verified" : "Pending",
                    icon: Smartphone,
                    color: admin?.is_verified
                      ? "from-green-500 to-green-600"
                      : "from-amber-500 to-amber-600",
                  },
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    variants={cardVariants}
                    whileHover="hover"
                    className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 shadow-sm border border-gray-200/50 dark:border-gray-700/50 hover:shadow-md transition-all duration-300 group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {stat.label}
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                          {stat.value}
                        </p>
                      </div>
                      <motion.div
                        whileHover={{ rotate: 5, scale: 1.1 }}
                        className={`p-3 bg-gradient-to-r ${stat.color} rounded-xl shadow-sm group-hover:shadow-xl transition-all duration-300`}
                      >
                        <stat.icon className="w-6 h-6 text-white" />
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Main Content */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar */}
                <motion.div
                  className="lg:col-span-1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="bg-white/80 dark:bg-gray-800/80 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6 sticky top-6">
                    {/* Profile Card */}
                    <div className="text-center mb-6">
                      <div className="relative inline-block mb-4">
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="w-28 h-28 rounded-full bg-gradient-to-br from-[#0067A1] to-[#004F7C] flex items-center justify-center text-white text-2xl font-bold relative overflow-hidden shadow-2xl border-4 border-white dark:border-gray-800"
                        >
                          {formData.profile_picture ? (
                            <img
                              src={formData.profile_picture}
                              alt="Profile"
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <User size={36} />
                          )}
                        </motion.div>
                        <motion.label
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          htmlFor="profile-upload"
                          className="absolute bottom-1 right-1 bg-gradient-to-r from-gray-900 to-black text-white p-2 rounded-full cursor-pointer hover:from-black hover:to-gray-900 transition-all duration-300 shadow-sm border border-gray-700"
                        >
                          <Camera size={16} />
                          <input
                            id="profile-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleProfilePictureUpload}
                            className="hidden"
                          />
                        </motion.label>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                        {formData.full_name || "Admin User"}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {admin?.role || "Administrator"}
                      </p>
                      {selectedFile && (
                        <motion.p
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-green-600 dark:text-green-400 text-xs mt-2 font-medium"
                        >
                          New photo selected
                        </motion.p>
                      )}
                    </div>

                    {/* Navigation */}
                    <nav className="space-y-3">
                      {[
                        {
                          id: "profile",
                          name: "Profile Information",
                          icon: User,
                        },
                        { id: "security", name: "Security", icon: Shield },
                        {
                          id: "preferences",
                          name: "Preferences",
                          icon: Settings,
                        },
                        { id: "permissions", name: "Permissions", icon: Key },
                      ].map((tab) => (
                        <motion.button
                          key={tab.id}
                          whileHover={{ scale: 1.02, x: 5 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setActiveTab(tab.id)}
                          className={`w-full flex items-center space-x-4 px-4 py-3 text-left rounded-xl transition-all duration-300 cursor-pointer ${
                            activeTab === tab.id
                              ? "bg-gradient-to-r from-gray-900 to-black text-white shadow-sm border border-gray-700"
                              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:shadow-md border border-transparent"
                          }`}
                        >
                          <tab.icon size={20} />
                          <span className="font-medium">{tab.name}</span>
                        </motion.button>
                      ))}
                    </nav>
                  </div>
                </motion.div>

                {/* Main Content Area */}
                <motion.div
                  className="lg:col-span-3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <div className="bg-white/80 dark:bg-gray-800/80 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                    <div className="p-6 md:p-8">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={activeTab}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.3 }}
                        >
                          {/* Profile Information Tab */}
                          {activeTab === "profile" && (
                            <div className="space-y-8">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Profile Information
                                  </h3>
                                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                                    Update your personal information and contact
                                    details
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    Full Name *
                                  </label>
                                  <input
                                    type="text"
                                    value={formData.full_name || ""}
                                    onChange={(e) =>
                                      handleInputChange(
                                        "full_name",
                                        e.target.value
                                      )
                                    }
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/70 dark:bg-gray-700/70 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-300"
                                    placeholder="Enter your full name"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    Email Address *
                                  </label>
                                  <input
                                    type="email"
                                    value={formData.email || ""}
                                    onChange={(e) =>
                                      handleInputChange("email", e.target.value)
                                    }
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/70 dark:bg-gray-700/70 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-300"
                                    placeholder="your.email@example.com"
                                  />
                                </div>

                                <div className="md:col-span-2 space-y-2">
                                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    Phone Number *
                                  </label>
                                  <div className="flex flex-col sm:flex-row gap-3">
                                    <input
                                      type="tel"
                                      value={formData.phone_number || ""}
                                      onChange={(e) =>
                                        handleInputChange(
                                          "phone_number",
                                          e.target.value
                                        )
                                      }
                                      className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/70 dark:bg-gray-700/70 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-300"
                                      placeholder="+91 9876543210"
                                    />
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={requestPhoneOTP}
                                      disabled={
                                        sendingOtp || !formData.phone_number
                                      }
                                      className="px-4 py-2 text-sm bg-gradient-to-r from-gray-900 to-black text-white rounded-lg hover:from-black hover:to-gray-900 disabled:opacity-50 transition-all duration-300 flex items-center space-x-2 cursor-pointer shadow-sm border border-gray-700"
                                    >
                                      <Smartphone size={18} />
                                      <span className="font-medium">
                                        {sendingOtp
                                          ? "Sending..."
                                          : "Verify Phone"}
                                      </span>
                                    </motion.button>
                                  </div>
                                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                    OTP will be sent for phone number
                                    verification
                                  </p>
                                  {admin?.is_verified && (
                                    <motion.p
                                      initial={{ opacity: 0, scale: 0.8 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      className="text-green-600 dark:text-green-400 text-sm font-medium flex items-center space-x-1"
                                    >
                                      <CheckCircle size={16} />
                                      <span>Phone number verified</span>
                                    </motion.p>
                                  )}
                                </div>
                              </div>

                              <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={updateProfile}
                                  disabled={saving}
                                  className="px-8 py-3 bg-gradient-to-r from-gray-900 to-black text-white rounded-xl hover:from-black hover:to-gray-900 disabled:opacity-50 transition-all duration-300 flex items-center space-x-3 cursor-pointer shadow-xl border border-gray-700"
                                >
                                  <Save size={18} />
                                  <span className="font-semibold">
                                    {saving
                                      ? "Saving Changes..."
                                      : "Save Changes"}
                                  </span>
                                </motion.button>
                              </div>
                            </div>
                          )}

                          {/* Security Tab */}
                          {activeTab === "security" && (
                            <div className="space-y-8">
                              <div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                                  Security Settings
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                  Manage your account security and OTP
                                  preferences
                                </p>
                              </div>

                              <div className="space-y-6">
                                {[
                                  {
                                    title: "OTP Login",
                                    description:
                                      "Secure login with One-Time Password",
                                    status: "Active",
                                    icon: Shield,
                                    color: "green",
                                  },
                                  {
                                    title: "Phone Verification",
                                    description:
                                      "Your phone number is used for OTP authentication",
                                    status: admin?.is_verified
                                      ? "Verified"
                                      : "Not Verified",
                                    icon: Smartphone,
                                    color: admin?.is_verified
                                      ? "green"
                                      : "amber",
                                    action: !admin?.is_verified
                                      ? requestPhoneOTP
                                      : null,
                                  }
                                  
                                ].map((item, index) => (
                                  <motion.div
                                    key={item.title}
                                    whileHover={{ scale: 1.02 }}
                                    className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all duration-300"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-4">
                                        <div
                                          className={`p-3 rounded-lg ${
                                            item.color === "green"
                                              ? "bg-green-100 dark:bg-green-900/30"
                                              : item.color === "amber"
                                              ? "bg-amber-100 dark:bg-amber-900/30"
                                              : "bg-teal-100 dark:bg-[#003358]/30"
                                          }`}
                                        >
                                          <item.icon
                                            className={`w-6 h-6 ${
                                              item.color === "green"
                                                ? "text-green-600 dark:text-green-400"
                                                : item.color === "amber"
                                                ? "text-amber-600 dark:text-amber-400"
                                                : "text-[#0067A1] dark:text-[#0080C6]"
                                            }`}
                                          />
                                        </div>
                                        <div>
                                          <p className="font-semibold text-gray-900 dark:text-white">
                                            {item.title}
                                          </p>
                                          <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {item.description}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <span
                                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                            item.color === "green"
                                              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                                              : item.color === "amber"
                                              ? "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300"
                                              : "bg-teal-100 dark:bg-[#003358]/30 text-[#004F7C] dark:text-teal-300"
                                          }`}
                                        >
                                          {item.status}
                                        </span>
                                        {item.action && (
                                          <button
                                            onClick={item.action}
                                            className="block text-sm text-gray-900 dark:text-gray-100 hover:underline mt-1 font-medium"
                                          >
                                            Verify Now
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Permissions Tab */}
                          {activeTab === "permissions" && (
                            <div className="space-y-8">
                              <div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                                  Admin Permissions
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                  Manage your access permissions and privileges
                                </p>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[
                                  {
                                    key: "users",
                                    label: "User Management",
                                    icon: User,
                                    description: "Manage users and their roles",
                                  },
                                  {
                                    key: "content",
                                    label: "Content Management",
                                    icon: Database,
                                    description: "Create and edit content",
                                  },
                                  {
                                    key: "settings",
                                    label: "System Settings",
                                    icon: Settings,
                                    description: "Configure system preferences",
                                  },
                                  {
                                    key: "analytics",
                                    label: "Analytics",
                                    icon: Server,
                                    description:
                                      "View system analytics and reports",
                                  },
                                ].map((permission) => (
                                  <motion.div
                                    key={permission.key}
                                    whileHover={{ scale: 1.02 }}
                                    className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all duration-300"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-4">
                                        <div className="p-3 bg-teal-100 dark:bg-[#003358]/30 rounded-lg">
                                          <permission.icon className="w-6 h-6 text-[#0067A1] dark:text-[#0080C6]" />
                                        </div>
                                        <div>
                                          <p className="font-semibold text-gray-900 dark:text-white">
                                            {permission.label}
                                          </p>
                                          <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {permission.description}
                                          </p>
                                        </div>
                                      </div>
                                      <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={
                                            permissions[permission.key] || false
                                          }
                                          onChange={(e) =>
                                            handlePermissionChange(
                                              permission.key,
                                              e.target.checked
                                            )
                                          }
                                          className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 dark:peer-focus:ring-gray-600 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-gray-900"></div>
                                      </label>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>

                              <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={updateProfile}
                                  disabled={saving}
                                  className="px-8 py-3 bg-gradient-to-r from-gray-900 to-black text-white rounded-xl hover:from-black hover:to-gray-900 disabled:opacity-50 transition-all duration-300 flex items-center space-x-3 cursor-pointer shadow-xl border border-gray-700"
                                >
                                  <Save size={18} />
                                  <span className="font-semibold">
                                    {saving
                                      ? "Updating..."
                                      : "Update Permissions"}
                                  </span>
                                </motion.button>
                              </div>
                            </div>
                          )}

                          {/* Preferences Tab */}
                          {activeTab === "preferences" && (
                            <div className="space-y-8">
                              <div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                                  Account Preferences
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                  Customize your account settings and
                                  preferences
                                </p>
                              </div>

                              <div className="space-y-6">
                                {[
                                  {
                                    label: "Language",
                                    description:
                                      "Choose your preferred language",
                                    type: "select",
                                    options: [
                                      { value: "en", label: "English" },
                                      { value: "hi", label: "Hindi" },
                                      { value: "es", label: "Spanish" },
                                    ],
                                    icon: Globe,
                                  },
                                  {
                                    label: "Timezone",
                                    description: "Set your local timezone",
                                    type: "select",
                                    options: [
                                      {
                                        value: "Asia/Kolkata",
                                        label: "India (IST)",
                                      },
                                      {
                                        value: "America/New_York",
                                        label: "Eastern Time",
                                      },
                                      {
                                        value: "Europe/London",
                                        label: "London",
                                      },
                                    ],
                                    icon: Calendar,
                                  },
                                  {
                                    label: "Notifications",
                                    description:
                                      "Manage your notification preferences",
                                    type: "button",
                                    icon: Bell,
                                  },
                                ].map((pref, index) => (
                                  <motion.div
                                    key={pref.label}
                                    whileHover={{ scale: 1.01 }}
                                    className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-4">
                                        <div className="p-3 bg-teal-100 dark:bg-[#003358]/30 rounded-lg">
                                          <pref.icon className="w-6 h-6 text-[#0067A1] dark:text-[#0080C6]" />
                                        </div>
                                        <div>
                                          <p className="font-semibold text-gray-900 dark:text-white">
                                            {pref.label}
                                          </p>
                                          <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {pref.description}
                                          </p>
                                        </div>
                                      </div>
                                      {pref.type === "select" ? (
                                        <select
                                          defaultValue="en"
                                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/70 dark:bg-gray-700/70 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900 focus:border-transparent cursor-pointer transition-all duration-300"
                                        >
                                          {pref.options.map((option) => (
                                            <option
                                              key={option.value}
                                              value={option.value}
                                            >
                                              {option.label}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <motion.button
                                          whileHover={{ scale: 1.05 }}
                                          whileTap={{ scale: 0.95 }}
                                          className="px-6 py-2 bg-gradient-to-r from-gray-900 to-black text-white rounded-lg hover:from-black hover:to-gray-900 transition-all duration-300 cursor-pointer border border-gray-700"
                                        >
                                          Configure
                                        </motion.button>
                                      )}
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <AnimatePresence>
        {showOtpModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-700"
            >
              <div className="text-center mb-6">
                <Smartphone className="w-12 h-12 text-[#0067A1] mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Verify Phone Number
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Enter the OTP sent to {formData.phone_number}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    OTP Code
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="Enter 6-digit OTP"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900 focus:border-transparent text-center text-lg font-semibold"
                    maxLength={6}
                  />
                </div>

                <div className="flex space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setShowOtpModal(false);
                      setOtp("");
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={verifyOTP}
                    disabled={verifying || otp.length !== 6}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-gray-900 to-black text-white rounded-xl hover:from-black hover:to-gray-900 disabled:opacity-50 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    {verifying ? (
                      <RefreshCw size={18} className="animate-spin" />
                    ) : (
                      <CheckCircle size={18} />
                    )}
                    <span>{verifying ? "Verifying..." : "Verify"}</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
