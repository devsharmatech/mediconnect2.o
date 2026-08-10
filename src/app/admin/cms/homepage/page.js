"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Save, Image as ImageIcon } from "lucide-react";
import RichTextEditor from "@/components/ui/RichTextEditor";

export default function HomepageCMS() {
  const [data, setData] = useState({
    headline: "",
    base_headline: "",
    subheadline: "",
    description: "",
    hero_image: "",
    hero_image2: "",
    hero_image3: "",
    hero_image4: "",
    primary_button_text: "",
    primary_button_link: "",
    secondary_button_text: "",
    secondary_button_link: "",
    mission_title: "",
    mission_heading: "",
    mission_text: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/cms/homepage");
      const result = await res.json();
      if (result.success && result.data) {
        setData((prev) => ({ ...prev, ...result.data }));
      }
    } catch (err) {
      toast.error("Failed to load homepage data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/cms/homepage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast.success("Homepage content updated successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e, imageField) => {
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
      
      setData({ ...data, [imageField]: result.url });
      toast.success("Image uploaded successfully");
    } catch (err) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return (
    <div className="flex-1 overflow-auto p-6 flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-3 border-[#0067A1] border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm text-gray-500 mt-3">Loading homepage data...</p>
    </div>
  );

  return (
    <main className="flex-1 overflow-auto relative z-0 p-2 md:p-4">
      <div className="w-full">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Homepage CMS</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage the main hero section of your landing page.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Headline</label>
                <input required type="text" value={data.headline} onChange={(e) => setData({ ...data, headline: e.target.value })} placeholder="e.g. Find Your Perfect Doctor" className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Base Headline</label>
                <input type="text" value={data.base_headline || ""} onChange={(e) => setData({ ...data, base_headline: e.target.value })} placeholder="e.g. - Verified, Ethical & Doctor-Led" className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subheadline</label>
                <input type="text" value={data.subheadline} onChange={(e) => setData({ ...data, subheadline: e.target.value })} placeholder="e.g. Top specialists for your health needs." className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea rows="4" value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} placeholder="e.g. Brief text explaining value proposition..." className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400"></textarea>
              </div>

              <div className="col-span-1 md:col-span-2">
                 <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b pb-2 mb-4 dark:border-gray-700">Hero Slider Images (Up to 4)</h3>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { key: 'hero_image', label: 'Image 1 (Main)' },
                      { key: 'hero_image2', label: 'Image 2' },
                      { key: 'hero_image3', label: 'Image 3' },
                      { key: 'hero_image4', label: 'Image 4' }
                    ].map((imgInfo) => (
                      <div key={imgInfo.key} className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                        {data[imgInfo.key] ? (
                          <>
                            <img src={data[imgInfo.key]} alt={imgInfo.label} className="w-full h-32 object-cover rounded-lg mb-2 shadow-sm" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <label className="cursor-pointer bg-white text-gray-900 px-3 py-1 rounded-lg text-xs font-semibold hover:bg-gray-100">
                                Change
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, imgInfo.key)} disabled={uploading} />
                              </label>
                            </div>
                          </>
                        ) : (
                          <label className="cursor-pointer w-full h-32 flex flex-col items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition border-2 border-dashed border-gray-300 dark:border-gray-600">
                            <ImageIcon className="w-6 h-6 text-gray-400 mb-2" />
                            <span className="text-xs text-gray-500 font-medium">{imgInfo.label}</span>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, imgInfo.key)} disabled={uploading} />
                          </label>
                        )}
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-1">{imgInfo.label}</span>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="col-span-1 md:col-span-2 mt-4 pt-4 border-t dark:border-gray-700">
                 <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Call To Action Buttons</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Primary Button Text</label>
                <input type="text" value={data.primary_button_text} onChange={(e) => setData({ ...data, primary_button_text: e.target.value })} placeholder="e.g. Book Appointment" className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Primary Button Link</label>
                <input type="text" value={data.primary_button_link} onChange={(e) => setData({ ...data, primary_button_link: e.target.value })} placeholder="e.g. /website/doctors" className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Secondary Button Text</label>
                <input type="text" value={data.secondary_button_text} onChange={(e) => setData({ ...data, secondary_button_text: e.target.value })} placeholder="e.g. Learn More" className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Secondary Button Link</label>
                <input type="text" value={data.secondary_button_link} onChange={(e) => setData({ ...data, secondary_button_link: e.target.value })} placeholder="e.g. /website/about" className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
              </div>

              <div className="col-span-1 md:col-span-2 mt-4 pt-4 border-t dark:border-gray-700">
                 <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Our Mission Section</h3>
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Eyebrow Title</label>
                <input type="text" value={data.mission_title || ""} onChange={(e) => setData({ ...data, mission_title: e.target.value })} placeholder="e.g. Our Mission" className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Main Heading</label>
                <input type="text" value={data.mission_heading || ""} onChange={(e) => setData({ ...data, mission_heading: e.target.value })} placeholder="e.g. Making Healthcare Easier for Patients" className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mission Text</label>
                <RichTextEditor value={data.mission_text || ""} onChange={content => setData({ ...data, mission_text: content })} placeholder="Enter the mission content here..." />
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
