"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Plus, Trash2, Edit2, Save, X } from "lucide-react";

export default function FaqsCMS() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Section Header State
  const [headerData, setHeaderData] = useState({ title: "", heading: "", subheading: "" });
  const [savingHeader, setSavingHeader] = useState(false);

  // Categories
  const defaultCategories = ["General", "Consultations", "Lab Tests & Medicines", "Privacy & Security", "Other"];
  const existingCategories = Array.from(new Set(items.map(i => i.category).filter(Boolean)));
  const allCategories = Array.from(new Set([...defaultCategories, ...existingCategories]));

  useEffect(() => { 
    fetchData();
    fetchHeader();
  }, []);

  const fetchHeader = async () => {
    try {
      const res = await fetch("/api/cms/section-headers?page=faqs");
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
        body: JSON.stringify({ page_identifier: "faqs", ...headerData })
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast.success("Page headers updated!");
    } catch (err) { toast.error(err.message); }
    finally { setSavingHeader(false); }
  };

  const fetchData = async () => {
    try {
      const res = await fetch("/api/cms/faqs");
      const result = await res.json();
      if (result.success) setItems(result.data || []);
    } catch (err) { toast.error("Failed to load FAQs"); }
    finally { setLoading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const method = editingItem.id ? "PUT" : "POST";
      const res = await fetch("/api/cms/faqs", {
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
    if (!confirm("Are you sure you want to delete this FAQ?")) return;
    try {
      const res = await fetch(`/api/cms/faqs?id=${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast.success("Deleted successfully!");
      fetchData();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <main className="flex-1 overflow-auto p-2 md:p-4">
      <div className="w-full">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">FAQs CMS</h2>
            <p className="text-gray-500 mt-2">Manage the Frequently Asked Questions.</p>
          </div>
          <button onClick={() => { setEditingItem({ category: "General", question: "", answer: "", display_order: 0, status: "active" }); setIsModalOpen(true); }} className="bg-[#0067A1] text-white px-4 py-2 rounded-lg flex items-center shadow pointer transition hover:scale-105">
            <Plus size={18} className="mr-2" /> Add FAQ
          </button>
        </div>

        {/* --- PAGE HEADER SETTINGS --- */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border dark:border-gray-700 mb-8">
           <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b pb-2 dark:border-gray-700">Page Header Settings</h3>
           <form onSubmit={saveHeader} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Small Title (Eyebrow)</label>
                    <input type="text" value={headerData.title} onChange={e => setHeaderData({...headerData, title: e.target.value})} placeholder="e.g. Got Questions?" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
                 </div>
                 <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Main Heading</label>
                    <input type="text" value={headerData.heading} onChange={e => setHeaderData({...headerData, heading: e.target.value})} placeholder="e.g. Frequently Asked Questions" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
                 </div>
                 <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Subheading (Description)</label>
                    <textarea value={headerData.subheading} onChange={e => setHeaderData({...headerData, subheading: e.target.value})} placeholder="e.g. Find answers to common questions about mediconnect.fit..." className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" rows="2" />
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

        {loading ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-3 border-[#0067A1] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-500 mt-3">Loading FAQs...</p>
            </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(
              items.reduce((acc, item) => {
                const cat = item.category || "General";
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(item);
                return acc;
              }, {})
            ).map(([category, categoryItems]) => (
              <div key={category} className="space-y-4">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 border-b pb-2 dark:border-gray-700">{category}</h3>
                <div className="grid gap-4">
                  {categoryItems.map(item => (
                    <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border dark:border-gray-700 relative hover:shadow-lg transition">
                      <div className="absolute top-4 right-4 flex space-x-2">
                        <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="text-blue-500 hover:text-[#004F7C] pointer"><Edit2 size={18} /></button>
                        <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 pointer"><Trash2 size={18} /></button>
                      </div>
                      <h3 className="font-bold text-lg dark:text-white pr-16">{item.question}</h3>
                      <p className="text-gray-600 dark:text-gray-400 mt-2">{item.answer}</p>
                      <div className="mt-4 flex items-center text-xs text-gray-400 space-x-4">
                         <span>Order: {item.display_order}</span>
                         <span className={`px-2 py-1 rounded ${item.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{item.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {items.length === 0 && (
               <div className="text-center py-12 text-gray-500 border border-dashed rounded-xl dark:border-gray-700">No FAQs found. Add one to get started!</div>
            )}
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative">
              <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-bold dark:text-white">{editingItem.id ? "Edit FAQ" : "Add FAQ"}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 pointer"><X size={20}/></button>
              </div>
              <div className="p-6 overflow-y-auto">
                <form onSubmit={handleSave} className="space-y-4">
                  <div><label className="block text-sm font-medium mb-1 dark:text-white">Question</label><input required type="text" value={editingItem.question} onChange={e => setEditingItem({...editingItem, question: e.target.value})} placeholder="e.g. How do I book an appointment?" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" /></div>
                  <div><label className="block text-sm font-medium mb-1 dark:text-white">Answer</label><textarea required value={editingItem.answer} onChange={e => setEditingItem({...editingItem, answer: e.target.value})} placeholder="e.g. You can tap the 'Book' button on the homepage..." className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" rows="5"/></div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div>
                        <label className="block text-sm font-medium mb-1 dark:text-white">Category</label>
                        <input 
                           type="text" 
                           list="faq-categories"
                           value={editingItem.category || ""} 
                           onChange={e => setEditingItem({...editingItem, category: e.target.value})} 
                           placeholder="Type or select category"
                           className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" 
                        />
                        <datalist id="faq-categories">
                           {allCategories.map(cat => (
                              <option key={cat} value={cat} />
                           ))}
                        </datalist>
                     </div>
                     <div><label className="block text-sm font-medium mb-1 dark:text-white">Display Order</label><input type="number" value={editingItem.display_order} onChange={e => setEditingItem({...editingItem, display_order: parseInt(e.target.value)})} placeholder="e.g. 1" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" /></div>
                     <div><label className="block text-sm font-medium mb-1 dark:text-white">Status</label><select value={editingItem.status} onChange={e => setEditingItem({...editingItem, status: e.target.value})} className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
                  </div>

                  <button type="submit" className="w-full bg-[#0067A1] hover:bg-[#073834] text-white py-2 rounded font-medium mt-4 pointer transition">Save FAQ</button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </main>
  );
}
