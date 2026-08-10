"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Plus, Trash2, Edit2, Save, X, Image as ImageIcon } from "lucide-react";

import RichTextEditor from "@/components/ui/RichTextEditor";

export default function ServicesCMS() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Section Header State
  const [headerData, setHeaderData] = useState({ title: "", heading: "", subheading: "" });
  const [savingHeader, setSavingHeader] = useState(false);

  useEffect(() => { 
    fetchData();
    fetchHeader();
  }, []);

  const fetchHeader = async () => {
    try {
      const res = await fetch("/api/cms/section-headers?page=services");
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
        body: JSON.stringify({ page_identifier: "services", ...headerData })
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast.success("Page headers updated!");
    } catch (err) { toast.error(err.message); }
    finally { setSavingHeader(false); }
  };

  const fetchData = async () => {
    try {
      const res = await fetch("/api/cms/services");
      const result = await res.json();
      if (result.success) setItems(result.data || []);
    } catch (err) { toast.error("Failed to load services"); }
    finally { setLoading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const method = editingItem.id ? "PUT" : "POST";
      const url = editingItem.id ? `/api/cms/services/${editingItem.id}` : "/api/cms/services";
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
    if (!confirm("Are you sure you want to delete this service?")) return;
    try {
      const res = await fetch(`/api/cms/services/${id}`, { method: "DELETE" });
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
      setEditingItem({ ...editingItem, icon: result.url });
      toast.success("Icon uploaded");
    } catch (err) { toast.error("Upload failed: " + err.message); }
    finally { setUploading(false); }
  };

  return (
    <main className="flex-1 overflow-auto p-2 md:p-4">
      <div className="w-full">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">Services CMS</h2>
            <p className="text-gray-500 mt-2">Manage the services offered on your website.</p>
          </div>
          <button onClick={() => { setEditingItem({ title: "", slug: "", description: "", detailed_content: "", icon: "", icon_name: "", link: "", display_order: 0, status: "active" }); setIsModalOpen(true); }} className="bg-[#0067A1] text-white px-4 py-2 rounded-lg flex items-center shadow pointer">
            <Plus size={18} className="mr-2" /> Add Service
          </button>
        </div>

        {/* --- PAGE HEADER SETTINGS --- */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border dark:border-gray-700 mb-8">
           <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b pb-2 dark:border-gray-700">Page Header Settings</h3>
           <form onSubmit={saveHeader} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Small Title (Eyebrow)</label>
                    <input type="text" value={headerData.title} onChange={e => setHeaderData({...headerData, title: e.target.value})} placeholder="e.g. COMPLETE CARE ECOSYSTEM" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
                 </div>
                 <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Main Heading</label>
                    <input type="text" value={headerData.heading} onChange={e => setHeaderData({...headerData, heading: e.target.value})} placeholder="e.g. Practical Care, Organised Clearly" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
                 </div>
                 <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Subheading (Description)</label>
                    <textarea value={headerData.subheading} onChange={e => setHeaderData({...headerData, subheading: e.target.value})} placeholder="e.g. Doctor consultations, lab tests..." className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" rows="2" />
                 </div>
              </div>
              <div className="flex justify-end">
                 <button type="submit" disabled={savingHeader} className="bg-[#0067A1] hover:bg-[#073834] text-white px-4 py-2 rounded-lg flex items-center shadow pointer disabled:opacity-50 transition">
                    <Save size={18} className="mr-2" /> {savingHeader ? "Saving..." : "Save Headers"}
                 </button>
              </div>
           </form>
        </div>

        {loading ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-3 border-[#0067A1] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-500 mt-3">Loading services...</p>
            </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(item => (
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border dark:border-gray-700 relative hover:shadow-lg transition">
                <div className="absolute top-4 right-4 flex space-x-2">
                  <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="text-blue-500 hover:text-[#004F7C] pointer"><Edit2 size={18} /></button>
                  <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 pointer"><Trash2 size={18} /></button>
                </div>
                {item.icon && <img src={item.icon} alt="icon" className="h-12 w-12 object-contain mb-4 rounded bg-gray-50 dark:bg-gray-700 p-2" />}
                <h3 className="font-bold text-lg dark:text-white">{item.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mt-2">{item.description}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                   <span>/{item.slug}</span>
                   <span className={`px-2 py-1 rounded ${item.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col relative">
              <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-bold dark:text-white">{editingItem.id ? "Edit Service" : "Add Service"}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 pointer"><X size={20}/></button>
              </div>
              <div className="p-6 overflow-y-auto">
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-1 dark:text-white">Title</label><input required type="text" value={editingItem.title} onChange={e => setEditingItem({...editingItem, title: e.target.value})} placeholder="e.g. Doctor Consultations" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" /></div>
                    <div><label className="block text-sm font-medium mb-1 dark:text-white">URL Slug (auto if empty)</label><input type="text" value={editingItem.slug || ""} onChange={e => setEditingItem({...editingItem, slug: e.target.value})} placeholder="e.g. doctor-consultations" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" /></div>
                  </div>
                  <div><label className="block text-sm font-medium mb-1 dark:text-white">Short Description</label><textarea required value={editingItem.description} onChange={e => setEditingItem({...editingItem, description: e.target.value})} placeholder="e.g. Consult with top doctors..." className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" rows="3"/></div>
                  <div><label className="block text-sm font-medium mb-1 dark:text-white">Page Link</label><input type="text" value={editingItem.link || ""} onChange={e => setEditingItem({...editingItem, link: e.target.value})} placeholder="/website/services/doctor-consultations" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" /></div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-white">Detailed Content (Service Page)</label>
                    <RichTextEditor value={editingItem.detailed_content || ""} onChange={(content) => setEditingItem({...editingItem, detailed_content: content})} placeholder="Enter full service page content with H2 sections."/>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-medium mb-1 dark:text-white">Icon (Image)</label>
                       <div className="flex items-center space-x-4">
                         {editingItem.icon && <img src={editingItem.icon} className="h-10 w-10 object-contain" alt=""/>}
                         <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 px-3 py-1 rounded text-sm flex items-center transition dark:text-white">
                           <ImageIcon className="w-4 h-4 mr-1" /> {uploading ? "..." : "Upload"}
                           <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                         </label>
                       </div>
                    </div>
                    <div><label className="block text-sm font-medium mb-1 dark:text-white">Icon Name (e.g. FaUserMd)</label><input type="text" value={editingItem.icon_name || ""} onChange={e => setEditingItem({...editingItem, icon_name: e.target.value})} placeholder="e.g. FaUserMd" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" /></div>
                  </div>
                  <div className="flex space-x-4">
                     <div className="flex-1"><label className="block text-sm font-medium mb-1 dark:text-white">Display Order</label><input type="number" value={editingItem.display_order} onChange={e => setEditingItem({...editingItem, display_order: parseInt(e.target.value)})} placeholder="1" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" /></div>
                     <div className="flex-1"><label className="block text-sm font-medium mb-1 dark:text-white">Status</label><select value={editingItem.status} onChange={e => setEditingItem({...editingItem, status: e.target.value})} className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
                  </div>
                  <button type="submit" className="w-full bg-[#0067A1] hover:bg-[#073834] text-white py-2 rounded font-medium mt-4 pointer transition">Save Service</button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </main>
  );
}
