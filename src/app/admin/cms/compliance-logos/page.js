"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Edit2, Trash2, Plus, Save, X, Image as ImageIcon, ExternalLink } from "lucide-react";

export default function ComplianceLogosCMS() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/cms/compliance-logos?includeHidden=true");
      const result = await res.json();
      if (result.success) {
        setItems(result.data || []);
      }
    } catch (err) {
      toast.error("Failed to load compliance logos");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingItem(item);
    } else {
      setEditingItem({
        name: "",
        title: "",
        link: "",
        image: "",
        display_order: 0,
        status: "published"
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
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

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const isNew = !editingItem.id;
      const res = await fetch("/api/cms/compliance-logos", {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingItem)
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      
      toast.success(isNew ? "Added successfully!" : "Updated successfully!");
      handleCloseModal();
      fetchData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this logo?")) return;
    
    try {
      const res = await fetch(`/api/cms/compliance-logos?id=${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast.success("Deleted successfully!");
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <main className="flex-1 overflow-auto p-2 md:p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
            Compliance Logos
          </h2>
          <p className="text-gray-500 mt-1">Manage global compliance banners displayed before the footer.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()} 
          className="bg-[#0067A1] hover:bg-[#073834] text-white px-5 py-2.5 rounded-lg font-medium flex items-center transition shadow-md"
        >
          <Plus size={18} className="mr-2" /> Add Logo
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#0067A1] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
          <ImageIcon className="h-12 w-12 text-gray-400 mb-3" />
          <p className="text-gray-500 font-medium">No logos found.</p>
          <p className="text-sm text-gray-400 mt-1">Click the button above to add a new compliance logo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map(item => (
            <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition group flex flex-col relative">
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button onClick={() => handleOpenModal(item)} className="bg-white text-[#0067A1] p-2 shadow-sm rounded-full hover:bg-gray-50"><Edit2 size={14}/></button>
                <button onClick={() => handleDelete(item.id)} className="bg-white text-red-600 p-2 shadow-sm rounded-full hover:bg-gray-50"><Trash2 size={14}/></button>
              </div>

              <div className="w-full h-32 bg-gray-50 dark:bg-gray-900 rounded-lg mb-4 flex items-center justify-center p-4 border border-gray-100 dark:border-gray-700">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="max-h-full max-w-full object-contain" />
                ) : (
                  <ImageIcon className="text-gray-300 h-8 w-8" />
                )}
              </div>

              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1">{item.name}</h3>
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${item.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {item.status}
                  </span>
                </div>
                {item.title && <p className="text-xs text-gray-500 mb-2">{item.title}</p>}
                {item.link && (
                  <a href={item.link} target="_blank" rel="noreferrer" className="text-xs flex items-center text-[#0067A1] hover:underline">
                    <ExternalLink size={12} className="mr-1" /> View Link
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h3 className="text-xl font-bold dark:text-white">{editingItem.id ? "Edit Logo" : "Add New Logo"}</h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 pointer"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 <div>
                   <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Company / Organization Name *</label>
                   <input required type="text" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} className="w-full border p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-[#0067A1]" />
                 </div>
                 <div>
                   <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Subtitle / Tagline</label>
                   <input type="text" value={editingItem.title} onChange={e => setEditingItem({...editingItem, title: e.target.value})} placeholder="e.g. Certified Partner" className="w-full border p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-[#0067A1]" />
                 </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Link URL</label>
                <input type="url" value={editingItem.link} onChange={e => setEditingItem({...editingItem, link: e.target.value})} placeholder="https://..." className="w-full border p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-[#0067A1]" />
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                  <label className="block text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Logo Image</label>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="h-24 w-40 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm p-2">
                       {editingItem.image ? (
                          <img src={editingItem.image} className="max-h-full max-w-full object-contain" alt="Preview"/>
                       ) : (
                          <ImageIcon className="text-gray-300 h-8 w-8" />
                       )}
                    </div>
                    <label className="cursor-pointer bg-[#0067A1] hover:bg-[#073834] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center transition shadow-sm h-10">
                      <ImageIcon className="w-4 h-4 mr-2" /> {uploading ? "Uploading..." : "Upload Image"}
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                    </label>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 <div>
                   <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Display Order</label>
                   <input type="number" value={editingItem.display_order} onChange={e => setEditingItem({...editingItem, display_order: parseInt(e.target.value) || 0})} className="w-full border p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-[#0067A1]" />
                 </div>
                 <div>
                   <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Status</label>
                   <select value={editingItem.status} onChange={e => setEditingItem({...editingItem, status: e.target.value})} className="w-full border p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-[#0067A1]">
                     <option value="published">Published</option>
                     <option value="draft">Draft (Hidden)</option>
                   </select>
                 </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t dark:border-gray-700">
                <button type="button" onClick={handleCloseModal} className="px-5 py-2 rounded-lg font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving || uploading} className="bg-[#0067A1] hover:bg-[#073834] text-white px-6 py-2 rounded-lg font-medium flex items-center justify-center disabled:opacity-50">
                  <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Logo"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </main>
  );
}
