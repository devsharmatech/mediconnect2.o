"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Save } from "lucide-react";
import RichTextEditor from "@/components/ui/RichTextEditor";

export default function LegalCMS() {
  const [data, setData] = useState({
    page_type: "privacy_policy",
    title: "",
    content: "",
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData(data.page_type);
  }, [data.page_type]);

  const fetchData = async (type) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cms/legal?type=${type}`);
      const result = await res.json();
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setData({ page_type: type, title: "", content: "" });
      }
    } catch (err) {
      toast.error("Failed to load legal page data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/cms/legal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast.success("Saved successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex-1 overflow-auto p-2 md:p-4">
      <div className="w-full">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Legal Pages CMS</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage terms, privacy policies, and refund policies.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
          
          <div className="mb-6 flex overflow-x-auto space-x-2 pb-2">
            {[
              { id: 'privacy_policy', label: 'Privacy Policy' },
              { id: 'terms_of_use', label: 'Terms of Use' },
              { id: 'telemedicine_policy', label: 'Telemedicine Policy' },
              { id: 'refund_policy', label: 'Refund Policy' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setData(prev => ({ ...prev, page_type: tab.id }))}
                className={`px-4 py-2 rounded-full whitespace-nowrap font-medium text-sm transition ${data.page_type === tab.id ? 'bg-[#0067A1] text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-3 border-[#0067A1] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-gray-500 mt-3">Loading policy content...</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Page Title</label>
                  <input required type="text" value={data.title} onChange={(e) => setData({ ...data, title: e.target.value })} placeholder="e.g. Terms and Conditions" className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Content (HTML or Text)</label>
                  <RichTextEditor value={data.content || ""} onChange={content => setData({ ...data, content })} placeholder="Enter your full legal policy text or HTML here..." />
                </div>

                <div className="flex justify-end pt-4 border-t dark:border-gray-700">
                  <button type="submit" disabled={saving} className="bg-[#0067A1] hover:bg-[#073834] text-white px-6 py-2 rounded-lg font-medium flex items-center transition disabled:opacity-50">
                    <Save className="w-5 h-5 mr-2" />
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </>
            )}

          </form>
        </motion.div>
      </div>
    </main>
  );
}
