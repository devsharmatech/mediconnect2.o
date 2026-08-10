"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Edit2, Save, X, Image as ImageIcon, LayoutTemplate } from "lucide-react";
import RichTextEditor from "@/components/ui/RichTextEditor";

export default function PageBlocksCMS() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { 
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/cms/page-blocks");
      const result = await res.json();
      if (result.success) {
        setItems(result.data || []);
      } else {
        toast.error("Failed to load blocks: " + result.error);
      }
    } catch (err) { 
      toast.error("Failed to load page blocks");
    } finally { 
      setLoading(false); 
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/cms/page-blocks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingItem)
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast.success("Content updated successfully!");
      setIsModalOpen(false);
      fetchData();
    } catch (err) { 
      toast.error(err.message); 
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
      const res = await fetch("/api/cms/upload", { method: "POST", body: formData });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      setEditingItem({ ...editingItem, image: result.url });
      toast.success("Image uploaded!");
    } catch (err) { 
      toast.error("Upload failed: " + err.message); 
    } finally { 
      setUploading(false); 
    }
  };

  return (
    <main className="flex-1 overflow-auto p-2 md:p-4">
      <div className="w-full">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
              Page Contents Manager
            </h2>
            <p className="text-gray-500 mt-2">Edit images and text for the main components on the home page and other pages.</p>
          </div>
        </div>

        {loading ? (
             <div className="py-12 flex flex-col items-center justify-center">
               <div className="w-8 h-8 border-3 border-[#0067A1] border-t-transparent rounded-full animate-spin"></div>
               <p className="text-sm text-gray-500 mt-3">Loading content blocks...</p>
             </div>
        ) : items.length === 0 ? (
             <div className="py-12 flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
               <LayoutTemplate className="h-12 w-12 text-gray-400 mb-3" />
               <p className="text-gray-500 font-medium">No blocks found.</p>
               <p className="text-sm text-gray-400 mt-1">Please make sure the SQL seed script was executed on the database to setup the predefined blocks.</p>
             </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(item => (
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 border dark:border-gray-700 flex flex-col relative hover:shadow-lg transition">
                <div className="absolute top-4 right-4 z-10">
                  <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="text-[#0067A1] hover:text-[#073834] bg-white p-2 shadow-md hover:shadow-lg rounded-full pointer transition">
                    <Edit2 size={16} />
                  </button>
                </div>
                {item.image ? (
                  <div className="w-full h-40 bg-gray-100 rounded-lg mb-4 overflow-hidden relative group">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover transition duration-300 group-hover:scale-105" />
                  </div>
                ) : (
                   <div className="w-full h-40 bg-gray-100 rounded-lg mb-4 border border-dashed border-gray-300 flex items-center justify-center">
                     <ImageIcon className="text-gray-400 h-8 w-8" />
                   </div>
                )}
                <div className="flex-1 flex flex-col">
                  <div className="inline-block mt-1 mb-2">
                    <span className="px-2 py-1 bg-[#0067A1]/10 text-[#0067A1] text-[10px] font-bold uppercase rounded tracking-wide border border-[#0067A1]/20">Page: {item.page_identifier}</span>
                  </div>
                  <p className="text-xs font-semibold text-[#0067A1] uppercase tracking-wide mb-1">{item.eyebrow}</p>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 leading-tight">{item.title}</h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4" dangerouslySetInnerHTML={{ __html: item.content }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {isModalOpen && editingItem && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative shadow-2xl">
              <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-xl font-bold dark:text-white">Edit Layout Block</h3>
                  <p className="text-sm text-gray-500">Editing <span className="font-mono text-xs bg-gray-100 p-1 rounded">{editingItem.block_key}</span></p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 pointer bg-gray-100 p-2 rounded-full cursor-pointer"><X size={20}/></button>
              </div>
              <div className="p-6 overflow-y-auto">
                <form onSubmit={handleSave} className="space-y-5">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                     <div>
                        <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-white">Eyebrow Text (Small Uppercase Title)</label>
                        <input type="text" value={editingItem.eyebrow} onChange={e => setEditingItem({...editingItem, eyebrow: e.target.value})} placeholder="e.g. Connected Care Ecosystem" className="w-full border p-3 rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#0067A1] outline-none transition" />
                     </div>
                     <div>
                        <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-white">Main Title</label>
                        <input required type="text" value={editingItem.title} onChange={e => setEditingItem({...editingItem, title: e.target.value})} placeholder="e.g. Care That Works Together" className="w-full border p-3 rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#0067A1] outline-none transition" />
                     </div>
                  </div>

                  <div>
                     <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-white">Main Content (Paragraphs and lists)</label>
                     <div className="border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#0067A1] transition">
                       <RichTextEditor value={editingItem.content || ""} onChange={content => setEditingItem({...editingItem, content})} placeholder="Enter the section content here..." />
                     </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <label className="block text-sm font-semibold mb-3 text-gray-700 dark:text-white">Section Image / Render</label>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                        <div className="relative">
                          {editingItem.image ? (
                            <img src={editingItem.image} className="h-32 w-48 object-cover rounded-lg shadow-sm border border-gray-200" alt=""/>
                          ) : (
                            <div className="h-32 w-48 bg-gray-200 rounded-lg flex items-center justify-center border border-dashed border-gray-300">
                               <ImageIcon className="text-gray-400 h-8 w-8" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <p className="text-sm text-gray-600 mb-2">Upload a high-quality image. Recommended size based on the layout.</p>
                          <label className="cursor-pointer bg-[#0067A1] hover:bg-[#073834] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center transition shadow-sm w-max">
                            <ImageIcon className="w-4 h-4 mr-2" /> {uploading ? "Uploading..." : "Browse New Image"}
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                          </label>
                        </div>
                      </div>
                  </div>

                  <div className="pt-4 mt-6 border-t dark:border-gray-700 flex justify-end gap-3">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-lg font-medium border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition">Cancel</button>
                    <button type="submit" disabled={saving || uploading} className="bg-[#0067A1] hover:bg-[#073834] text-white px-8 py-2.5 rounded-lg font-medium flex items-center justify-center transition shadow-md disabled:opacity-50">
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}

      </div>
    </main>
  );
}
