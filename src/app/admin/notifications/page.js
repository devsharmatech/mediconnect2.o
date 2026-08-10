"use client";

import { useEffect, useState } from "react";
import { Bell, Send, RefreshCw, Image, Users, FileText, Calendar, CheckCircle, AlertCircle, X, Upload, Clock, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const roleOptions = [
  { id: "patient", label: "Patients", color: "bg-[#0067A1]", icon: "👤" },
  { id: "doctor", label: "Doctors", color: "bg-emerald-500", icon: "👨‍⚕️" },
  { id: "chemist", label: "Chemists", color: "bg-[#004F7C]", icon: "💊" },
  { id: "lab", label: "Labs", color: "bg-amber-500", icon: "🔬" },
  { id: "hospital", label: "Hospitals", color: "bg-rose-500", icon: "🏥" },
  { id: "insurance", label: "Insurance", color: "bg-[#0080C6]", icon: "🛡️" },
  { id: "admin", label: "Admins", color: "bg-gray-500", icon: "👨‍💼" },
];

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [sendToAll, setSendToAll] = useState(true);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);

  const loadLogs = async () => {
    try {
      const res = await fetch("/api/notifications/logs?limit=300");
      const data = await res.json();
      if (data?.success) {
        setLogs(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load logs", err);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const toggleRole = (roleId) => {
    setRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((role) => role !== roleId)
        : [...prev, roleId]
    );
  };

  const handleImageSelect = async (file) => {
    if (!file) return;
    setImageUploading(true);
    setStatus(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/notifications/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Upload failed");
      }

      setImageUrl(data.data.url);
      setStatus({ 
        type: "success", 
        text: "✅ Image uploaded successfully",
        icon: CheckCircle 
      });
    } catch (err) {
      setStatus({ 
        type: "error", 
        text: err.message,
        icon: AlertCircle 
      });
    } finally {
      setImageUploading(false);
    }
  };

  const handleSend = async (event) => {
    event.preventDefault();
    setStatus(null);

    if (!message.trim()) {
      setStatus({ 
        type: "error", 
        text: "Message is required",
        icon: AlertCircle 
      });
      return;
    }

    if (imageUploading) {
      setStatus({ 
        type: "error", 
        text: "Image upload in progress",
        icon: AlertCircle 
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/notifications/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || "Notification",
          message: message.trim(),
          image_url: imageUrl.trim(),
          sendToAll,
          roles: sendToAll ? [] : roles,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to send");
      }

      setTitle("");
      setMessage("");
      setImageUrl("");
      setRoles([]);
      setSendToAll(true);
      setStatus({
        type: "success",
        text: `✅ Sent to ${data.data.total_users} users successfully`,
        icon: CheckCircle
      });
      await loadLogs();
    } catch (err) {
      setStatus({ 
        type: "error", 
        text: err.message,
        icon: AlertCircle 
      });
    } finally {
      setLoading(false);
    }
  };

  const getAudienceLabel = (log) => {
    if (log.audience === "all" || (Array.isArray(log.audience) && log.audience.length === 0)) {
      return "All Users";
    }
    if (Array.isArray(log.audience)) {
      return roleOptions
        .filter(role => log.audience.includes(role.id))
        .map(role => role.label)
        .join(", ");
    }
    return log.audience || "All";
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const PreviewNotification = () => (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={() => setPreviewMode(false)}
    >
      <div 
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-200 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0067A1] to-[#004F7C] flex items-center justify-center">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Healthcare App</p>
                <p className="text-xs text-gray-500">Now</p>
              </div>
            </div>
            <button
              onClick={() => setPreviewMode(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        
        <div className="p-4">
          {imageUrl && (
            <div className="mb-4 rounded-xl overflow-hidden">
              <img 
                src={imageUrl} 
                alt="Preview" 
                className="w-full h-48 object-cover"
              />
            </div>
          )}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {title || "Notification Title"}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
            {message || "Notification message will appear here..."}
          </p>
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Target: {sendToAll ? "All Users" : roles.map(r => roleOptions.find(ro => ro.id === r)?.label).join(", ")}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/20 to-emerald-50/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="p-2 md:p-4">
        {/* Header */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0067A1] to-[#004F7C] flex items-center justify-center shadow-sm shadow-teal-500/20">
                  <Bell className="w-7 h-7 text-white" />
                </div>
               
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                  Bulk Notifications
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Send broadcast messages to users and monitor delivery logs
                </p>
              </div>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={loadLogs}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Logs
            </motion.button>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Send Notification Card */}
          <motion.div 
            className="lg:col-span-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Send className="w-5 h-5 text-[#0067A1]" />
                  Send New Notification
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  Create and send broadcast messages to selected audiences
                </p>
              </div>

              <form onSubmit={handleSend} className="p-6 space-y-6">
                {/* Title & Audience */}
                <div className="grid md:grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <FileText className="inline w-4 h-4 mr-1" />
                      Notification Title
                    </label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., System Maintenance Alert"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all duration-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <Users className="inline w-4 h-4 mr-1" />
                      Target Audience
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={sendToAll}
                          onChange={(e) => setSendToAll(e.target.checked)}
                          className="w-4 h-4 text-[#0067A1] bg-gray-100 border-gray-300 rounded focus:ring-[#0067A1]"
                        />
                        <span className="text-gray-700 dark:text-gray-300">Send to all users</span>
                      </label>
                      
                      {!sendToAll && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {roleOptions.map((role) => (
                            <motion.button
                              key={role.id}
                              type="button"
                              whileTap={{ scale: 0.95 }}
                              onClick={() => toggleRole(role.id)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-300 ${
                                roles.includes(role.id)
                                  ? `${role.color} text-white border-transparent`
                                  : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
                              }`}
                            >
                              <span>{role.icon}</span>
                              <span>{role.label}</span>
                            </motion.button>
                          ))}
                        </div>
                      )}
                      
                      {!sendToAll && roles.length === 0 && (
                        <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          Select at least one role
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Message Content
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    placeholder="Write your announcement or campaign message here..."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-[#0067A1] focus:border-transparent resize-none transition-all duration-300"
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500">
                      {message.length}/500 characters
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewMode(true)}
                      className="text-sm text-[#0067A1] hover:text-[#004F7C] dark:text-[#0080C6] flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      Preview
                    </button>
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    <Image className="inline w-4 h-4 mr-1" />
                    Notification Image (Optional)
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="flex-1 cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageSelect(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 hover:border-[#0067A1] hover:bg-teal-50/50 dark:hover:bg-[#003358]/20 transition-all duration-300">
                          <div className="flex items-center justify-center gap-2">
                            <Upload className="w-5 h-5" />
                            <span>Click to upload image</span>
                          </div>
                        </div>
                      </label>
                    </div>
                    
                    {imageUploading && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className="w-5 h-5 border-2 border-[#0067A1] border-t-transparent rounded-full animate-spin" />
                        Uploading image...
                      </div>
                    )}
                    
                    {imageUrl && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700"
                      >
                        <img
                          src={imageUrl}
                          alt="Uploaded preview"
                          className="w-full h-48 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setImageUrl("")}
                          className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </motion.div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Recommended size: 1200×628px. Max size: 5MB
                  </p>
                </div>

                {/* Status Message */}
                <AnimatePresence>
                  {status && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`rounded-xl p-4 ${
                        status.type === "success"
                          ? "bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800"
                          : "bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {status.icon && <status.icon className={`w-5 h-5 ${
                          status.type === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        }`} />}
                        <span className={`font-medium ${
                          status.type === "success" ? "text-emerald-800 dark:text-emerald-300" : "text-rose-800 dark:text-rose-300"
                        }`}>
                          {status.text}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <motion.button
                    type="submit"
                    disabled={loading || (!sendToAll && roles.length === 0)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-[#0067A1] to-[#004F7C] hover:from-[#004F7C] hover:to-[#003358] text-white font-semibold rounded-lg shadow-sm shadow-teal-500/25 hover:shadow-teal-500/35 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Send Notification
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>

          {/* Recent Activity & Stats */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
                <Bell className="inline w-5 h-5 mr-2 text-[#0067A1]" />
                Recent Activity
              </h3>
              
              {logs.slice(0, 5).map((log, index) => (
                <motion.div
                  key={log.batch_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="mb-4 last:mb-0"
                >
                  <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
                       onClick={() => setSelectedLog(log)}
                  >
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        log.push_sent > 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
                      }`}>
                        {log.push_sent > 0 ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {log.title || "Notification"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatDate(log.created_at)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-1 bg-teal-100 dark:bg-[#003358]/30 text-[#004F7C] dark:text-teal-300 rounded-full">
                          {log.total} users
                        </span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500 truncate">
                          {getAudienceLabel(log)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {logs.length === 0 && (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No notifications sent yet</p>
                </div>
              )}
              
              <button
                onClick={loadLogs}
                className="w-full mt-4 py-2 text-center text-sm text-[#0067A1] dark:text-[#0080C6] hover:text-[#004F7C] dark:hover:text-teal-300 font-medium hover:bg-teal-50 dark:hover:bg-[#003358]/20 rounded-xl transition-colors duration-200"
              >
                View All Logs
              </button>
            </div>
          </motion.div>
        </div>

        {/* Notification Logs Table */}
        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Notification History
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                    Detailed logs of all sent notifications
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Total: {logs.length} notifications
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={loadLogs}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 transition-colors duration-200"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </motion.button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Audience
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Recipients
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {logs.map((log) => (
                    <tr
                      key={log.batch_id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200 cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(log.created_at)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="max-w-xs">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {log.title || "Untitled"}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {log.message}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {getAudienceLabel(log)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {log.total}
                          </span>
                          <span className="text-xs text-gray-500">
                            sent
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          log.push_sent > 0
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                        }`}>
                          {log.push_sent > 0 ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              Delivered
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              Pending
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                  
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Bell className="w-12 h-12 text-gray-300 dark:text-gray-700 mb-3" />
                          <p className="text-gray-500 dark:text-gray-400">No notification history available</p>
                          <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">
                            Send your first notification to see logs here
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewMode && <PreviewNotification />}
      </AnimatePresence>

      {/* Log Details Modal */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setSelectedLog(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Notification Details
                  </h3>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      Basic Information
                    </h4>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Title</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                            {selectedLog.title || "Untitled"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Sent Date</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                            {new Date(selectedLog.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      Message Content
                    </h4>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {selectedLog.message}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      Delivery Information
                    </h4>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Total Recipients</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                            {selectedLog.total}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Push Notifications Sent</p>
                          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                            {selectedLog.push_sent}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Target Audience</p>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
                            {getAudienceLabel(selectedLog)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}