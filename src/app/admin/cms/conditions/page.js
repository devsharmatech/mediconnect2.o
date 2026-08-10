"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Plus, Trash2, Edit2, X, Image as ImageIcon, Save } from "lucide-react";
import RichTextEditor from "@/components/ui/RichTextEditor";

export default function ConditionsCMS() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { 
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/cms/conditions");
      const result = await res.json();
      if (result.success) setItems(result.data || []);
    } catch (err) { toast.error("Failed to load conditions"); }
    finally { setLoading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const method = editingItem.id ? "PUT" : "POST";
      const url = editingItem.id ? `/api/cms/conditions/${editingItem.id}` : "/api/cms/conditions";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingItem)
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast.success(editingItem.id ? "Updated successfully!" : "Added successfully!");
      setIsModalOpen(false);
      fetchData();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this condition?")) return;
    try {
      const res = await fetch(`/api/cms/conditions/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast.success("Deleted successfully!");
      fetchData();
    } catch (err) { toast.error(err.message); }
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
      setEditingItem({ ...editingItem, icon_name: result.url });
      toast.success("Icon uploaded");
    } catch (err) { toast.error("Upload failed: " + err.message); }
    finally { setUploading(false); }
  };

  const emptyItem = { 
     title: "", seo_title: "", slug: "", short_description: "", icon_name: "", detailed_content: "", 
     recommended_specialty: "", display_order: 0, status: 'active' 
  };

  return (
    <main className="flex-1 overflow-auto p-2 md:p-4">
      <div className="w-full">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">Health Conditions CMS</h2>
            <p className="text-gray-500 mt-2">Manage medical conditions and problem education SEO pages.</p>
          </div>
          <button onClick={() => { setEditingItem(emptyItem); setIsModalOpen(true); }} className="bg-[#0067A1] hover:bg-[#004F7C] text-white px-4 py-2 rounded-lg flex items-center shadow pointer transition">
            <Plus size={18} className="mr-2" /> Add Condition
          </button>
        </div>

        {loading ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-3 border-[#0067A1] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-500 mt-3">Loading conditions...</p>
            </div>
        ) : items.length === 0 ? (
            <div className="py-12 text-center text-gray-500 bg-white dark:bg-gray-800 rounded-xl shadow border dark:border-gray-700">
                No health conditions found. Add one to get started!
            </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(item => (
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border dark:border-gray-700 relative hover:shadow-lg transition flex flex-col">
                <div className="absolute top-4 right-4 flex space-x-2">
                  <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="text-blue-500 hover:text-[#004F7C] pointer"><Edit2 size={18} /></button>
                  <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 pointer"><Trash2 size={18} /></button>
                </div>
                {item.icon_name && <img src={item.icon_name} alt="icon" className="h-12 w-12 object-contain mb-4 rounded bg-[#0067A1]/5 dark:bg-gray-700 p-2" />}
                <h3 className="font-bold text-lg dark:text-white">{item.title}</h3>
                <p className="text-sm text-[#0067A1] font-medium mt-1">Specialty: {item.recommended_specialty || 'General Physician'}</p>
                <p className="text-sm text-gray-500 line-clamp-2 mt-2 flex-1">{item.short_description}</p>
                
                <div className="mt-4 flex items-center justify-between text-xs font-medium border-t dark:border-gray-700 pt-4">
                   <span className="text-gray-500">Slug: /{item.slug}</span>
                   <span className={`px-2 py-1 rounded ${item.status === 'active' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-gray-100 text-gray-800 border border-gray-200'}`}>
                       {item.status === 'active' ? 'Active' : 'Inactive'}
                   </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {isModalOpen && editingItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col relative shadow-2xl">
              <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-bold dark:text-white">{editingItem.id ? "Edit Health Condition" : "Add Health Condition"}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 pointer bg-gray-100 dark:bg-gray-700 p-1.5 rounded-full"><X size={20}/></button>
              </div>
              <div className="p-6 overflow-y-auto scrollbar-thin">
              <form onSubmit={handleSave} className="space-y-5">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-white">Condition Name (For Cards)</label>
                        <input required type="text" value={editingItem.title} onChange={e => setEditingItem({...editingItem, title: e.target.value})} placeholder="e.g. Hair Loss" className="w-full border p-2.5 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#0067A1]/30 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-white">URL Slug (Optional)</label>
                        <input type="text" value={editingItem.slug} onChange={e => setEditingItem({...editingItem, slug: e.target.value})} placeholder="e.g. hair-loss (auto-generated if empty)" className="w-full border p-2.5 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#0067A1]/30 outline-none" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-white">SEO Hero Title (Full H1)</label>
                    <input type="text" value={editingItem.seo_title || ""} onChange={e => setEditingItem({...editingItem, seo_title: e.target.value})} placeholder="e.g. Hair Loss Treatment in Dwarka, Delhi" className="w-full border p-2.5 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#0067A1]/30 outline-none" />
                    <p className="text-xs text-gray-400 mt-1">Leave empty to just use the Condition Name.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-white">Suggested Specialty</label>
                        <input required type="text" value={editingItem.recommended_specialty} onChange={e => setEditingItem({...editingItem, recommended_specialty: e.target.value})} placeholder="e.g. Dermatology" className="w-full border p-2.5 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#0067A1]/30 outline-none" />
                    </div>
                    <div>
                       <label className="block text-sm font-medium mb-1 dark:text-white">Condition Icon</label>
                       <div className="flex items-center space-x-4">
                          {editingItem.icon_name && <img src={editingItem.icon_name} className="h-12 w-12 object-contain bg-[#0067A1]/5 p-2 rounded-lg border border-[#0067A1]/10" alt=""/>}
                          <label className="cursor-pointer bg-white border border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center transition dark:text-white shadow-sm">
                            <ImageIcon className="w-4 h-4 mr-2 text-gray-500" /> {uploading ? "Uploading..." : "Choose Image"}
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                          </label>
                       </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-white">Short Description (for Cards)</label>
                    <textarea required value={editingItem.short_description} onChange={e => setEditingItem({...editingItem, short_description: e.target.value})} placeholder="e.g. Thinning hair or excessive shedding is a common condition..." className="w-full border p-2.5 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#0067A1]/30 outline-none" rows="2"/>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2 dark:text-white text-lg">Detailed Education Content (SEO Page)</label>
                    <div className="bg-white dark:bg-gray-900 border dark:border-gray-600 rounded-lg overflow-hidden">
                        <RichTextEditor value={editingItem.detailed_content || ""} onChange={content => setEditingItem({...editingItem, detailed_content: content})} placeholder="Enter H2 Sections like 'Common Symptoms', 'Causes', etc." />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                   <div>
                       <label className="block text-sm font-medium mb-1 dark:text-white">Display Order</label>
                       <input type="number" value={editingItem.display_order} onChange={e => setEditingItem({...editingItem, display_order: parseInt(e.target.value)})} className="w-full border p-2.5 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-[#0067A1]/30 outline-none" />
                   </div>
                   <div>
                       <label className="block text-sm font-medium mb-1 dark:text-white">Status</label>
                       <select value={editingItem.status} onChange={e => setEditingItem({...editingItem, status: e.target.value})} className="w-full border p-2.5 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-[#0067A1]/30 outline-none">
                           <option value="active">Active</option>
                           <option value="inactive">Inactive</option>
                       </select>
                   </div>
                </div>

                <div className="pt-4 border-t dark:border-gray-700 mt-6 flex justify-end">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-lg font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 mr-3 transition">Cancel</button>
                    <button type="submit" className="bg-[#0067A1] hover:bg-[#004F7C] text-white px-8 py-2.5 rounded-lg font-medium shadow-md transition pointer flex items-center">
                        <Save size={18} className="mr-2" /> Save Condition
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
