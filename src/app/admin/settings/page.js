"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Search,
  Filter,
  Eye,
  Trash2,
  Download,
  Plus,
  RefreshCw,
  User,
  Phone,
  Mail,
  Calendar,
  Droplets,
  MapPin,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  Save,
  Shield,
  Bot,
  Bell,
  Globe,
  CreditCard,
  Database,
  Server,
  Lock,
  EyeOff,
  CheckCircle,
  XCircle,
  Settings as SettingsIcon,
  Key,
  Users as UsersIcon,
  Building,
  TestTube,
  FileText,
  Cpu,
  Network,
} from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("smtp");
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Initialize default settings structure
  const defaultSettings = {
    smtp: {
      host: "",
      port: 587,
      secure: false,
      auth: {
        user: "",
        pass: ""
      }
    },
    openai: {
      apiKey: "",
      model: "gpt-4",
      maxTokens: 1000,
      temperature: 0.7
    },
    notifications: {
      email: true,
      push: true,
      sms: false,
      labApprovals: true,
      newRegistrations: true,
      resultsReady: true,
      emergencyAlerts: true
    },
    app: {
      name: "Lab Management System",
      version: "1.0.0",
      maintenance: false,
      debug: false,
      maxFileSize: 5,
      allowedFileTypes: ["jpg", "jpeg", "png", "pdf", "doc", "docx"],
      sessionTimeout: 30,
      maxLoginAttempts: 5
    },
    business: {
      companyName: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      taxId: "",
      currency: "INR",
      timezone: "Asia/Kolkata",
      workingHours: "9:00 AM - 6:00 PM"
    },
    security: {
      require2FA: false,
      passwordMinLength: 8,
      passwordRequireSpecial: true,
      sessionLifetime: 24,
      enableAuditLog: true
    },
    lab: {
      autoApproveResults: false,
      resultValidityDays: 30,
      backupFrequency: "daily",
      retentionPeriod: 365
    }
  };

  // Fetch settings on component mount
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/settings");
      const result = await response.json();
      
      if (result.success) {
        // Merge with default settings to ensure all keys exist
        const mergedSettings = { ...defaultSettings, ...result.data };
        setSettings(mergedSettings);
        toast.success("Settings loaded successfully!");
      } else {
        toast.error(result.message || "Failed to fetch settings");
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Save individual setting group
  const saveSettings = async (key, data) => {
    setSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key,
          value: data
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`${key.toUpperCase()} settings saved successfully!`);
        // Update local state
        setSettings(prev => ({
          ...prev,
          [key]: data
        }));
      } else {
        toast.error(result.message || `Failed to save ${key} settings`);
      }
    } catch (error) {
      console.error(`Error saving ${key} settings:`, error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Handle input changes
  const handleInputChange = (section, field, value, subField = null) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      if (subField) {
        newSettings[section] = {
          ...newSettings[section],
          [field]: {
            ...newSettings[section][field],
            [subField]: value
          }
        };
      } else {
        newSettings[section] = {
          ...newSettings[section],
          [field]: value
        };
      }
      return newSettings;
    });
  };

  // Test SMTP connection
  const testSmtpConnection = async () => {
    try {
      const response = await fetch("/api/settings/test-smtp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings.smtp),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success("SMTP connection test successful!");
      } else {
        toast.error(result.message || "SMTP connection test failed");
      }
    } catch (error) {
      console.error("Error testing SMTP:", error);
      toast.error("Failed to test SMTP connection");
    }
  };

  // Test OpenAI connection
  const testOpenaiConnection = async () => {
    try {
      const response = await fetch("/api/settings/test-openai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings.openai),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success("OpenAI connection test successful!");
      } else {
        toast.error(result.message || "OpenAI connection test failed");
      }
    } catch (error) {
      console.error("Error testing OpenAI:", error);
      toast.error("Failed to test OpenAI connection");
    }
  };

  // Toggle maintenance mode
  const toggleMaintenance = async () => {
    const newMaintenance = !settings.app?.maintenance;
    await saveSettings("app", {
      ...settings.app,
      maintenance: newMaintenance
    });
  };

  // Export settings
  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `settings-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Settings exported successfully!');
  };

  // Reset settings to defaults
  const resetSettings = async () => {
    if (confirm("Are you sure you want to reset all settings to defaults?")) {
      setSettings(defaultSettings);
      toast.success("Settings reset to defaults!");
    }
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

  // Tab configuration
  const tabs = [
    { id: "smtp", name: "Email", icon: Mail },
    { id: "openai", name: "AI", icon: Bot },
    { id: "notifications", name: "Notifications", icon: Bell },
    { id: "app", name: "Application", icon: SettingsIcon },
    { id: "business", name: "Business", icon: Building },
    { id: "security", name: "Security", icon: Shield },
    { id: "lab", name: "Lab", icon: TestTube },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
          <p className="text-gray-800 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <main className="flex-1 overflow-auto relative z-0">
        <div className="p-4 md:p-4 lg:p-4 bg-transparent">
          <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50">
            <div className="min-h-screen bg-gradient-to-br from-gray-50 rounded-2xl to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 lg:p-6">
              {/* Header Section */}
              <motion.div
                className="mb-8"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <motion.h4
                      className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      System Settings
                    </motion.h4>
                    <motion.p
                      className="text-gray-800 dark:text-gray-400 mt-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      Manage your application configuration and preferences
                    </motion.p>
                  </div>
                  <div className="flex items-center space-x-3 mt-4 sm:mt-0">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={exportSettings}
                      className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 cursor-pointer"
                    >
                      <Download size={16} />
                      <span>Export</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={resetSettings}
                      className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-700 text-white rounded-lg transition-all duration-200 cursor-pointer"
                    >
                      <RefreshCw size={16} />
                      <span>Reset Defaults</span>
                    </motion.button>
                  </div>
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
                    label: "Active Services",
                    value: "5/7",
                    icon: Server,
                    color: "from-[#0067A1] to-[#004F7C] dark:from-[#003358] dark:to-[#003358] text-gray-50",
                  },
                  {
                    label: "Security Level",
                    value: "High",
                    icon: Shield,
                    color: "from-gray-500 to-gray-800 dark:from-gray-800 dark:to-gray-900 text-gray-50",
                  },
                  {
                    label: "System Status",
                    value: settings.app?.maintenance ? "Maintenance" : "Active",
                    icon: settings.app?.maintenance ? AlertTriangle : CheckCircle,
                    color: settings.app?.maintenance 
                      ? "from-yellow-500 to-yellow-600 dark:from-yellow-800 dark:to-yellow-900 text-gray-50"
                      : "from-gray-500 to-gray-800 dark:from-[#003358] dark:to-[#003358] text-gray-50",
                  },
                  {
                    label: "Last Backup",
                    value: "Today",
                    icon: Database,
                    color: "from-[#004F7C] to-[#003358] dark:from-[#003358] dark:to-[#003358] text-gray-50",
                  },
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    variants={cardVariants}
                    whileHover="hover"
                    className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 shadow-sm border border-gray-200/50 dark:border-gray-700/50 hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-400">
                          {stat.label}
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                          {stat.value}
                        </p>
                      </div>
                      <div
                        className={`p-3 bg-gradient-to-r ${stat.color} rounded-xl shadow-sm`}
                      >
                        <stat.icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Controls Section */}
              <motion.div
                className="bg-white/80 dark:bg-gray-800/80 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-end  gap-4">
                 

                  {/* Tabs and Actions */}
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    {/* Tabs */}
                    <div className="flex items-center space-x-1 bg-gray-100/50 dark:bg-gray-700/50 rounded-xl p-1">
                      {tabs.map((tab) => (
                        <motion.button
                          key={tab.id}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
                            activeTab === tab.id
                              ? "bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white"
                              : "text-gray-800 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                          }`}
                        >
                          <tab.icon size={16} />
                          <span className="hidden sm:inline">{tab.name}</span>
                        </motion.button>
                      ))}
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => fetchSettings()}
                      disabled={loading}
                      className="p-2 border border-gray-300 dark:border-gray-800 rounded-lg bg-white/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <RefreshCw
                        size={20}
                        className={loading ? "animate-spin" : ""}
                      />
                    </motion.button>
                  </div>
                </div>
              </motion.div>

              {/* Settings Content */}
              <motion.div
                className="bg-white/80 dark:bg-gray-800/80 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <div className="p-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* SMTP Settings */}
                      {activeTab === "smtp" && (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                SMTP Email Configuration
                              </h3>
                              <p className="text-sm text-gray-800 dark:text-gray-400">
                                Configure your email server for sending notifications
                              </p>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => testSmtpConnection()}
                              className="px-4 py-2 bg-gradient-to-r from-[#0067A1] to-[#004F7C] text-white rounded-lg hover:from-[#004F7C] hover:to-[#003358] transition-all duration-200 flex items-center space-x-2 cursor-pointer shadow-sm"
                            >
                              <Mail size={16} />
                              <span>Test Connection</span>
                            </motion.button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                SMTP Host *
                              </label>
                              <input
                                type="text"
                                value={settings.smtp?.host || ""}
                                onChange={(e) => handleInputChange("smtp", "host", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all duration-300"
                                placeholder="smtp.gmail.com"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                SMTP Port *
                              </label>
                              <input
                                type="number"
                                value={settings.smtp?.port || 587}
                                onChange={(e) => handleInputChange("smtp", "port", parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all duration-300"
                                placeholder="587"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Username *
                              </label>
                              <input
                                type="text"
                                value={settings.smtp?.auth?.user || ""}
                                onChange={(e) => handleInputChange("smtp", "auth", e.target.value, "user")}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all duration-300"
                                placeholder="your-email@gmail.com"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Password *
                              </label>
                              <div className="relative group">
                                <input
                                  type={showSmtpPassword ? "text" : "password"}
                                  value={settings.smtp?.auth?.pass || ""}
                                  onChange={(e) => handleInputChange("smtp", "auth", e.target.value, "pass")}
                                  className="w-full px-3 py-2 pr-11 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all duration-300"
                                  placeholder="Your SMTP password"
                                />
                                <motion.button
                                  type="button"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-all duration-300 cursor-pointer"
                                  title={showSmtpPassword ? "Hide password" : "Show password"}
                                >
                                  {showSmtpPassword ? (
                                    <EyeOff size={18} className="text-[#0067A1]" />
                                  ) : (
                                    <Eye size={18} className="text-gray-400" />
                                  )}
                                </motion.button>
                              </div>
                            </div>

                            <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-800">
                              <input
                                type="checkbox"
                                id="secure"
                                checked={settings.smtp?.secure || false}
                                onChange={(e) => handleInputChange("smtp", "secure", e.target.checked)}
                                className="rounded border-gray-300 dark:border-gray-800 text-[#0067A1] focus:ring-[#0067A1] bg-white dark:bg-gray-700 cursor-pointer transition-all duration-300"
                              />
                              <label htmlFor="secure" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                                Use SSL/TLS (Secure)
                              </label>
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => saveSettings("smtp", settings.smtp)}
                              disabled={saving}
                              className="px-6 py-2 bg-gradient-to-r from-gray-800 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 disabled:opacity-50 transition-all duration-200 flex items-center space-x-2 cursor-pointer shadow-sm"
                            >
                              <Save size={16} />
                              <span>{saving ? "Saving..." : "Save SMTP Settings"}</span>
                            </motion.button>
                          </div>
                        </div>
                      )}

                      {/* OpenAI Settings */}
                      {activeTab === "openai" && (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                OpenAI API Configuration
                              </h3>
                              <p className="text-sm text-gray-800 dark:text-gray-400">
                                Configure OpenAI API for assistive features
                              </p>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => testOpenaiConnection()}
                              className="px-4 py-2 bg-gradient-to-r from-[#0067A1] to-[#004F7C] text-white rounded-lg hover:from-[#004F7C] hover:to-[#003358] transition-all duration-200 flex items-center space-x-2 cursor-pointer shadow-sm"
                            >
                              <Bot size={16} />
                              <span>Test Connection</span>
                            </motion.button>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                API Key *
                              </label>
                              <div className="relative group">
                                <input
                                  type={showOpenaiKey ? "text" : "password"}
                                  value={settings.openai?.apiKey || ""}
                                  onChange={(e) => handleInputChange("openai", "apiKey", e.target.value)}
                                  className="w-full px-3 py-2 pr-11 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all duration-300"
                                  placeholder="sk-..."
                                />
                                <motion.button
                                  type="button"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-all duration-300 cursor-pointer"
                                  title={showOpenaiKey ? "Hide API key" : "Show API key"}
                                >
                                  {showOpenaiKey ? (
                                    <EyeOff size={18} className="text-[#0067A1]" />
                                  ) : (
                                    <Eye size={18} className="text-gray-400" />
                                  )}
                                </motion.button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Model
                                </label>
                                <select
                                  value={settings.openai?.model || "gpt-4"}
                                  onChange={(e) => handleInputChange("openai", "model", e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0067A1] focus:border-transparent cursor-pointer transition-all duration-300"
                                >
                                  <option value="gpt-4">GPT-4</option>
                                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Max Tokens
                                </label>
                                <input
                                  type="number"
                                  value={settings.openai?.maxTokens || 1000}
                                  onChange={(e) => handleInputChange("openai", "maxTokens", parseInt(e.target.value))}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all duration-300"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Temperature
                                </label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="1"
                                  value={settings.openai?.temperature || 0.7}
                                  onChange={(e) => handleInputChange("openai", "temperature", parseFloat(e.target.value))}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all duration-300"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => saveSettings("openai", settings.openai)}
                              disabled={saving}
                              className="px-6 py-2 bg-gradient-to-r from-gray-800 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 disabled:opacity-50 transition-all duration-200 flex items-center space-x-2 cursor-pointer shadow-sm"
                            >
                              <Save size={16} />
                              <span>{saving ? "Saving..." : "Save AI Settings"}</span>
                            </motion.button>
                          </div>
                        </div>
                      )}

                      {/* Notifications Settings */}
                      {activeTab === "notifications" && (
                        <div className="space-y-6">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                              Notification Preferences
                            </h3>
                            <p className="text-sm text-gray-800 dark:text-gray-400">
                              Configure how you receive notifications
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <h4 className="font-medium text-gray-900 dark:text-white">Notification Channels</h4>
                              
                              {[
                                { key: "email", label: "Email Notifications", description: "Receive notifications via email" },
                                { key: "push", label: "Push Notifications", description: "Browser push notifications" },
                                { key: "sms", label: "SMS Notifications", description: "Text message notifications" },
                              ].map((channel) => (
                                <div key={channel.key} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all duration-300">
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{channel.label}</p>
                                    <p className="text-sm text-gray-800 dark:text-gray-400">{channel.description}</p>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={settings.notifications?.[channel.key] || false}
                                    onChange={(e) => handleInputChange("notifications", channel.key, e.target.checked)}
                                    className="rounded border-gray-300 dark:border-gray-800 text-[#0067A1] focus:ring-[#0067A1] bg-white dark:bg-gray-700 cursor-pointer transition-all duration-300"
                                  />
                                </div>
                              ))}
                            </div>

                            <div className="space-y-4">
                              <h4 className="font-medium text-gray-900 dark:text-white">Notification Types</h4>
                              
                              {[
                                { key: "labApprovals", label: "Lab Approvals", description: "Notify when labs need approval" },
                                { key: "newRegistrations", label: "New Registrations", description: "Notify for new user registrations" },
                                { key: "resultsReady", label: "Results Ready", description: "Notify when test results are ready" },
                                { key: "emergencyAlerts", label: "Emergency Alerts", description: "Critical system alerts" },
                              ].map((type) => (
                                <div key={type.key} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all duration-300">
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{type.label}</p>
                                    <p className="text-sm text-gray-800 dark:text-gray-400">{type.description}</p>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={settings.notifications?.[type.key] || false}
                                    onChange={(e) => handleInputChange("notifications", type.key, e.target.checked)}
                                    className="rounded border-gray-300 dark:border-gray-800 text-[#0067A1] focus:ring-[#0067A1] bg-white dark:bg-gray-700 cursor-pointer transition-all duration-300"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => saveSettings("notifications", settings.notifications)}
                              disabled={saving}
                              className="px-6 py-2 bg-gradient-to-r from-gray-800 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 disabled:opacity-50 transition-all duration-200 flex items-center space-x-2 cursor-pointer shadow-sm"
                            >
                              <Save size={16} />
                              <span>{saving ? "Saving..." : "Save Notification Settings"}</span>
                            </motion.button>
                          </div>
                        </div>
                      )}

                      {/* Application Settings */}
                      {activeTab === "app" && (
                        <div className="space-y-6">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                              Application Settings
                            </h3>
                            <p className="text-sm text-gray-800 dark:text-gray-400">
                              Configure general application behavior
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Application Name
                              </label>
                              <input
                                type="text"
                                value={settings.app?.name || ""}
                                onChange={(e) => handleInputChange("app", "name", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all duration-300"
                                placeholder="Lab Management System"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Version
                              </label>
                              <input
                                type="text"
                                value={settings.app?.version || ""}
                                onChange={(e) => handleInputChange("app", "version", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all duration-300"
                                placeholder="1.0.0"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Max File Size (MB)
                              </label>
                              <input
                                type="number"
                                value={settings.app?.maxFileSize || 5}
                                onChange={(e) => handleInputChange("app", "maxFileSize", parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all duration-300"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Session Timeout (minutes)
                              </label>
                              <input
                                type="number"
                                value={settings.app?.sessionTimeout || 30}
                                onChange={(e) => handleInputChange("app", "sessionTimeout", parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all duration-300"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Allowed File Types
                              </label>
                              <input
                                type="text"
                                value={Array.isArray(settings.app?.allowedFileTypes) ? settings.app.allowedFileTypes.join(", ") : ""}
                                onChange={(e) => handleInputChange("app", "allowedFileTypes", e.target.value.split(",").map(s => s.trim()))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all duration-300"
                                placeholder="jpg, jpeg, png, pdf"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all duration-300">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">Maintenance Mode</p>
                                <p className="text-sm text-gray-800 dark:text-gray-400">Put the application in maintenance mode</p>
                              </div>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={toggleMaintenance}
                                className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 cursor-pointer shadow-sm ${
                                  settings.app?.maintenance 
                                    ? "bg-red-600 text-white" 
                                    : "bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white"
                                }`}
                              >
                                {settings.app?.maintenance ? <XCircle size={16} /> : <CheckCircle size={16} />}
                                <span>{settings.app?.maintenance ? "Disable" : "Enable"}</span>
                              </motion.button>
                            </div>

                            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all duration-300">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">Debug Mode</p>
                                <p className="text-sm text-gray-800 dark:text-gray-400">Enable debug logging</p>
                              </div>
                              <input
                                type="checkbox"
                                checked={settings.app?.debug || false}
                                onChange={(e) => handleInputChange("app", "debug", e.target.checked)}
                                className="rounded border-gray-300 dark:border-gray-800 text-[#0067A1] focus:ring-[#0067A1] bg-white dark:bg-gray-700 cursor-pointer transition-all duration-300"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => saveSettings("app", settings.app)}
                              disabled={saving}
                              className="px-6 py-2 bg-gradient-to-r from-gray-800 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 disabled:opacity-50 transition-all duration-200 flex items-center space-x-2 cursor-pointer shadow-sm"
                            >
                              <Save size={16} />
                              <span>{saving ? "Saving..." : "Save App Settings"}</span>
                            </motion.button>
                          </div>
                        </div>
                      )}

                      {/* Business Settings */}
                      {activeTab === "business" && (
                        <div className="space-y-6">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                              Business Information
                            </h3>
                            <p className="text-sm text-gray-800 dark:text-gray-400">
                              Configure your business details
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Company Name *
                              </label>
                              <input
                                type="text"
                                value={settings.business?.companyName || ""}
                                onChange={(e) => handleInputChange("business", "companyName", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all duration-300"
                                placeholder="Your Company Name"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Email *
                              </label>
                              <input
                                type="email"
                                value={settings.business?.email || ""}
                                onChange={(e) => handleInputChange("business", "email", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all duration-300"
                                placeholder="contact@company.com"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Phone *
                              </label>
                              <input
                                type="text"
                                value={settings.business?.phone || ""}
                                onChange={(e) => handleInputChange("business", "phone", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all duration-300"
                                placeholder="+91 9876543210"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Website
                              </label>
                              <input
                                type="url"
                                value={settings.business?.website || ""}
                                onChange={(e) => handleInputChange("business", "website", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all duration-300"
                                placeholder="https://company.com"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Address *
                              </label>
                              <textarea
                                value={settings.business?.address || ""}
                                onChange={(e) => handleInputChange("business", "address", e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all duration-300"
                                placeholder="Full business address"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Tax ID
                              </label>
                              <input
                                type="text"
                                value={settings.business?.taxId || ""}
                                onChange={(e) => handleInputChange("business", "taxId", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all duration-300"
                                placeholder="GSTIN/Tax ID"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Currency
                              </label>
                              <select
                                value={settings.business?.currency || "INR"}
                                onChange={(e) => handleInputChange("business", "currency", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0067A1] focus:border-transparent cursor-pointer transition-all duration-300"
                              >
                                <option value="INR">Indian Rupee (₹)</option>
                                <option value="USD">US Dollar ($)</option>
                                <option value="EUR">Euro (€)</option>
                                <option value="GBP">British Pound (£)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Timezone
                              </label>
                              <select
                                value={settings.business?.timezone || "Asia/Kolkata"}
                                onChange={(e) => handleInputChange("business", "timezone", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0067A1] focus:border-transparent cursor-pointer transition-all duration-300"
                              >
                                <option value="Asia/Kolkata">India (IST)</option>
                                <option value="America/New_York">Eastern Time (ET)</option>
                                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                                <option value="Europe/London">London (GMT)</option>
                                <option value="Europe/Paris">Paris (CET)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Working Hours
                              </label>
                              <input
                                type="text"
                                value={settings.business?.workingHours || ""}
                                onChange={(e) => handleInputChange("business", "workingHours", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all duration-300"
                                placeholder="9:00 AM - 6:00 PM"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => saveSettings("business", settings.business)}
                              disabled={saving}
                              className="px-6 py-2 bg-gradient-to-r from-gray-800 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 disabled:opacity-50 transition-all duration-200 flex items-center space-x-2 cursor-pointer shadow-sm"
                            >
                              <Save size={16} />
                              <span>{saving ? "Saving..." : "Save Business Settings"}</span>
                            </motion.button>
                          </div>
                        </div>
                      )}

                      {/* Security Settings */}
                      {activeTab === "security" && (
                        <div className="space-y-6">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                              Security Settings
                            </h3>
                            <p className="text-sm text-gray-800 dark:text-gray-400">
                              Configure security and access control
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                              { key: "require2FA", label: "Require Two-Factor Authentication", description: "Enable 2FA for all users" },
                              { key: "enableAuditLog", label: "Enable Audit Log", description: "Log all system activities" },
                            ].map((setting) => (
                              <div key={setting.key} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all duration-300">
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">{setting.label}</p>
                                  <p className="text-sm text-gray-800 dark:text-gray-400">{setting.description}</p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={settings.security?.[setting.key] || false}
                                  onChange={(e) => handleInputChange("security", setting.key, e.target.checked)}
                                  className="rounded border-gray-300 dark:border-gray-800 text-[#0067A1] focus:ring-[#0067A1] bg-white dark:bg-gray-700 cursor-pointer transition-all duration-300"
                                />
                              </div>
                            ))}

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Password Minimum Length
                              </label>
                              <input
                                type="number"
                                value={settings.security?.passwordMinLength || 8}
                                onChange={(e) => handleInputChange("security", "passwordMinLength", parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all duration-300"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Session Lifetime (hours)
                              </label>
                              <input
                                type="number"
                                value={settings.security?.sessionLifetime || 24}
                                onChange={(e) => handleInputChange("security", "sessionLifetime", parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all duration-300"
                              />
                            </div>

                            <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-800">
                              <input
                                type="checkbox"
                                id="passwordRequireSpecial"
                                checked={settings.security?.passwordRequireSpecial || false}
                                onChange={(e) => handleInputChange("security", "passwordRequireSpecial", e.target.checked)}
                                className="rounded border-gray-300 dark:border-gray-800 text-[#0067A1] focus:ring-[#0067A1] bg-white dark:bg-gray-700 cursor-pointer transition-all duration-300"
                              />
                              <label htmlFor="passwordRequireSpecial" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                                Require Special Characters in Passwords
                              </label>
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => saveSettings("security", settings.security)}
                              disabled={saving}
                              className="px-6 py-2 bg-gradient-to-r from-gray-800 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 disabled:opacity-50 transition-all duration-200 flex items-center space-x-2 cursor-pointer shadow-sm"
                            >
                              <Save size={16} />
                              <span>{saving ? "Saving..." : "Save Security Settings"}</span>
                            </motion.button>
                          </div>
                        </div>
                      )}

                      {/* Lab Settings */}
                      {activeTab === "lab" && (
                        <div className="space-y-6">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                              Laboratory Settings
                            </h3>
                            <p className="text-sm text-gray-800 dark:text-gray-400">
                              Configure laboratory-specific settings
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all duration-300">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">Auto-approve Results</p>
                                <p className="text-sm text-gray-800 dark:text-gray-400">Automatically approve lab results</p>
                              </div>
                              <input
                                type="checkbox"
                                checked={settings.lab?.autoApproveResults || false}
                                onChange={(e) => handleInputChange("lab", "autoApproveResults", e.target.checked)}
                                className="rounded border-gray-300 dark:border-gray-800 text-[#0067A1] focus:ring-[#0067A1] bg-white dark:bg-gray-700 cursor-pointer transition-all duration-300"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Result Validity (days)
                              </label>
                              <input
                                type="number"
                                value={settings.lab?.resultValidityDays || 30}
                                onChange={(e) => handleInputChange("lab", "resultValidityDays", parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all duration-300"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Backup Frequency
                              </label>
                              <select
                                value={settings.lab?.backupFrequency || "daily"}
                                onChange={(e) => handleInputChange("lab", "backupFrequency", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0067A1] focus:border-transparent cursor-pointer transition-all duration-300"
                              >
                                <option value="hourly">Hourly</option>
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Data Retention (days)
                              </label>
                              <input
                                type="number"
                                value={settings.lab?.retentionPeriod || 365}
                                onChange={(e) => handleInputChange("lab", "retentionPeriod", parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all duration-300"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => saveSettings("lab", settings.lab)}
                              disabled={saving}
                              className="px-6 py-2 bg-gradient-to-r from-gray-800 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 disabled:opacity-50 transition-all duration-200 flex items-center space-x-2 cursor-pointer shadow-sm"
                            >
                              <Save size={16} />
                              <span>{saving ? "Saving..." : "Save Lab Settings"}</span>
                            </motion.button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}