"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Save, Image as ImageIcon } from "lucide-react";

export default function SettingsCMS() {
  const [data, setData] = useState({
    site_name: "",
    logo: "",
    header_tagline: "",
    footer_text: "",
    support_email: "",
    support_phone: "",
    emergency_disclaimer: "",
    whatsapp_number: "",
    whatsapp_message: "",
    social_links: {
      facebook: "",
      twitter: "",
      instagram: "",
      youtube: "",
      linkedin: ""
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/cms/settings");
      const result = await res.json();
      if (result.success && result.data) {
        setData((prev) => ({ 
          ...prev, 
          ...result.data,
          social_links: result.data.social_links || prev.social_links
        }));
      }
    } catch (err) {
      toast.error("Failed to load settings data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/cms/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast.success("Settings updated successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/cms/upload", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      
      setData({ ...data, logo: result.url });
      toast.success("Logo uploaded successfully");
    } catch (err) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSocialLinkChange = (e, platform) => {
    setData((prev) => ({
      ...prev,
      social_links: {
        ...prev.social_links,
        [platform]: e.target.value
      }
    }));
  };

  if (loading) return (
    <div className="flex-1 overflow-auto p-6 flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-3 border-[#0067A1] border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm text-gray-500 mt-3">Loading settings data...</p>
    </div>
  );

  return (
    <main className="flex-1 overflow-auto relative z-0 p-2 md:p-4">
      <div className="w-full">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Website Settings</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage global website settings like logo, email, and tags.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="col-span-1 md:col-span-2">
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Site Logo</label>
                 <div className="flex items-center space-x-4">
                    {data.logo && <img src={data.logo} alt="Logo" className="h-20 w-auto object-contain bg-gray-100 rounded p-2" />}
                    <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 px-4 py-2 rounded-lg flex items-center transition">
                      <ImageIcon className="w-5 h-5 mr-2" />
                      {uploading ? "Uploading..." : "Upload New Logo"}
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                    </label>
                 </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Site Name</label>
                <input required type="text" value={data.site_name} onChange={(e) => setData({ ...data, site_name: e.target.value })} placeholder="e.g. MediConnect" className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Header Tagline</label>
                <input type="text" value={data.header_tagline} onChange={(e) => setData({ ...data, header_tagline: e.target.value })} placeholder="e.g. Your Health, Our Priority" className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Footer Text</label>
                <textarea rows="2" value={data.footer_text} onChange={(e) => setData({ ...data, footer_text: e.target.value })} placeholder="e.g. © 2024 MediConnect. All rights reserved." className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400"></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Support Email</label>
                <input type="email" value={data.support_email} onChange={(e) => setData({ ...data, support_email: e.target.value })} placeholder="e.g. support@mediconnect.fit" className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Support Phone</label>
                <input type="text" value={data.support_phone} onChange={(e) => setData({ ...data, support_phone: e.target.value })} placeholder="e.g. +91 9876543210" className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
              </div>
              
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Emergency Disclaimer Banner</label>
                <textarea rows="2" value={data.emergency_disclaimer} onChange={(e) => setData({ ...data, emergency_disclaimer: e.target.value })} placeholder="e.g. Call 108 for medical emergencies." className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400"></textarea>
              </div>

              <div className="col-span-1 md:col-span-2 mt-4"><hr className="border-gray-200 dark:border-gray-700"/><h3 className="text-xl font-semibold mt-4 text-gray-800 dark:text-white">WhatsApp Integration</h3></div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">WhatsApp Number</label>
                <input type="text" value={data.whatsapp_number} onChange={(e) => setData({ ...data, whatsapp_number: e.target.value })} placeholder="e.g. +919876543210 (include country code)" className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pre-filled Message</label>
                <input type="text" value={data.whatsapp_message} onChange={(e) => setData({ ...data, whatsapp_message: e.target.value })} placeholder="e.g. Hello, I need help with..." className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
              </div>

              <div className="col-span-1 md:col-span-2 mt-4"><hr className="border-gray-200 dark:border-gray-700"/><h3 className="text-xl font-semibold mt-4 text-gray-800 dark:text-white">Social Media Links</h3></div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Facebook URL</label>
                <input type="text" value={data.social_links?.facebook || ''} onChange={(e) => handleSocialLinkChange(e, 'facebook')} placeholder="e.g. https://facebook.com/mediconnect" className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Twitter URL</label>
                <input type="text" value={data.social_links?.twitter || ''} onChange={(e) => handleSocialLinkChange(e, 'twitter')} placeholder="e.g. https://twitter.com/mediconnect" className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Instagram URL</label>
                <input type="text" value={data.social_links?.instagram || ''} onChange={(e) => handleSocialLinkChange(e, 'instagram')} placeholder="e.g. https://instagram.com/mediconnect" className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">YouTube URL</label>
                <input type="text" value={data.social_links?.youtube || ''} onChange={(e) => handleSocialLinkChange(e, 'youtube')} placeholder="e.g. https://youtube.com/mediconnect" className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">LinkedIn URL</label>
                <input type="text" value={data.social_links?.linkedin || ''} onChange={(e) => handleSocialLinkChange(e, 'linkedin')} placeholder="e.g. https://linkedin.com/company/mediconnect" className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t dark:border-gray-700">
              <button type="submit" disabled={saving} className="bg-[#0067A1] hover:bg-[#073834] text-white px-6 py-2 rounded-lg font-medium flex items-center transition disabled:opacity-50">
                <Save className="w-5 h-5 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </main>
  );
}
