"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Save } from "lucide-react";

export default function ContactCMS() {
  const [data, setData] = useState({
    support_email: "",
    support_phone: "",
    support_phone_2: "",
    support_hours: "",
    consultation_support_text: "",
    grievance_name: "",
    grievance_email: "",
    grievance_response_time: "",
    medical_notice: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Section Header State
  const [headerData, setHeaderData] = useState({ title: "", heading: "", subheading: "" });
  const [savingHeader, setSavingHeader] = useState(false);

  useEffect(() => {
    fetchData();
    fetchHeader();
  }, []);

  const fetchHeader = async () => {
    try {
      const res = await fetch("/api/cms/section-headers?page=contact");
      const result = await res.json();
      if (result.success && result.data) {
        setHeaderData({
           title: result.data.title || "",
           heading: result.data.heading || "",
           subheading: result.data.subheading || ""
        });
      }
    } catch (err) { console.error("Failed to load header"); }
  };

  const saveHeader = async (e) => {
    e.preventDefault();
    setSavingHeader(true);
    try {
      const res = await fetch("/api/cms/section-headers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_identifier: "contact", ...headerData })
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast.success("Page headers updated!");
    } catch (err) { toast.error(err.message); }
    finally { setSavingHeader(false); }
  };

  const fetchData = async () => {
    try {
      const res = await fetch("/api/cms/contact");
      const result = await res.json();
      if (result.success && result.data) {
        const parts = result.data.support_phone ? result.data.support_phone.split('\n') : [];
        setData((prev) => ({ 
           ...prev, 
           ...result.data,
           support_phone: parts[0] || "",
           support_phone_2: parts[1] || ""
        }));
      }
    } catch (err) {
      toast.error("Failed to load contact data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...data };
      payload.support_phone = [data.support_phone, data.support_phone_2].filter(p => p && p.trim() !== "").join('\n');
      delete payload.support_phone_2; // Don't send this virtual field to the API

      const res = await fetch("/api/cms/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast.success("Contact Information updated successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex-1 overflow-auto p-6 flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-3 border-[#0067A1] border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm text-gray-500 mt-3">Loading contact data...</p>
    </div>
  );

  return (
    <main className="flex-1 overflow-auto relative z-0 p-2 md:p-4">
      <div className="w-full">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Contact Page CMS</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage contact details, grievances, and notices displayed on the contact page.</p>
        </motion.div>

        {/* --- PAGE HEADER SETTINGS --- */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border dark:border-gray-700 mb-8 mt-4">
           <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b pb-2 dark:border-gray-700">Page Header Settings</h3>
           <form onSubmit={saveHeader} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium mb-1 dark:text-white">Small Title (Eyebrow)</label>
                    <input type="text" value={headerData.title} onChange={e => setHeaderData({...headerData, title: e.target.value})} placeholder="e.g. GET IN TOUCH" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
                 </div>
                 <div>
                    <label className="block text-sm font-medium mb-1 dark:text-white">Main Heading</label>
                    <input type="text" value={headerData.heading} onChange={e => setHeaderData({...headerData, heading: e.target.value})} placeholder="e.g. Contact Us" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
                 </div>
                 <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1 dark:text-white">Subheading (Description)</label>
                    <textarea value={headerData.subheading} onChange={e => setHeaderData({...headerData, subheading: e.target.value})} placeholder="e.g. We are here to help you..." className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" rows="2" />
                 </div>
              </div>
              <div className="flex justify-end">
                 <button type="submit" disabled={savingHeader} className="bg-[#0067A1] hover:bg-[#073834] text-white px-4 py-2 rounded-lg flex items-center shadow pointer disabled:opacity-50 transition">
                    <Save size={18} className="mr-2" /> {savingHeader ? "Saving..." : "Save Headers"}
                 </button>
              </div>
           </form>
        </div>
        {/* --------------------------- */}

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSave} className="space-y-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Support Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Support Email</label>
                <input required type="email" value={data.support_email} onChange={(e) => setData({ ...data, support_email: e.target.value })} placeholder="e.g. support@mediconnect.fit" className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Support Phone 1</label>
                <input required type="text" value={data.support_phone} onChange={(e) => setData({ ...data, support_phone: e.target.value })} placeholder="e.g. +91 9876543210" className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Support Phone 2 (Optional)</label>
                <input type="text" value={data.support_phone_2} onChange={(e) => setData({ ...data, support_phone_2: e.target.value })} placeholder="e.g. +91 9876543211" className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Support Hours</label>
                <input type="text" value={data.support_hours} onChange={(e) => setData({ ...data, support_hours: e.target.value })} placeholder="e.g. Mon-Sat, 9AM-8PM" className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Consultation Support Text</label>
                <textarea rows="2" value={data.consultation_support_text} onChange={(e) => setData({ ...data, consultation_support_text: e.target.value })} placeholder="e.g. Need help booking a doctor?" className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400"></textarea>
              </div>

              <div className="col-span-1 md:col-span-2 mt-4"><hr className="border-gray-200 dark:border-gray-700"/><h3 className="text-xl font-semibold mt-4 text-gray-800 dark:text-white">Grievance Info</h3></div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Grievance Officer Name</label>
                <input type="text" value={data.grievance_name} onChange={(e) => setData({ ...data, grievance_name: e.target.value })} placeholder="e.g. Dr. A. Sharma" className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Grievance Email</label>
                <input type="email" value={data.grievance_email} onChange={(e) => setData({ ...data, grievance_email: e.target.value })} placeholder="e.g. grievance@mediconnect.fit" className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expected Response Time</label>
                <input type="text" value={data.grievance_response_time} onChange={(e) => setData({ ...data, grievance_response_time: e.target.value })} placeholder="e.g. Within 48 hours" className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
              </div>

              <div className="col-span-1 md:col-span-2 mt-4"><hr className="border-gray-200 dark:border-gray-700"/><h3 className="text-xl font-semibold mt-4 text-gray-800 dark:text-white">Medical Notice</h3></div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Medical Warning/Notice</label>
                <textarea rows="2" value={data.medical_notice} onChange={(e) => setData({ ...data, medical_notice: e.target.value })} placeholder="e.g. In case of emergency, please dial 108." className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400"></textarea>
              </div>

            </div>

            <div className="flex justify-end pt-4 border-t dark:border-gray-700">
              <button type="submit" disabled={saving} className="bg-[#0067A1] hover:bg-[#073834] text-white px-6 py-2 rounded-lg font-medium flex items-center transition disabled:opacity-50 pointer">
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
