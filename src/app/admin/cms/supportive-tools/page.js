"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Plus, Trash2, Edit2, Save, X, Image as ImageIcon } from "lucide-react";

import RichTextEditor from "@/components/ui/RichTextEditor";
import * as FaIcons from "react-icons/fa";

const AVAILABLE_ICONS = [
  "FaHeartbeat", "FaStethoscope", "FaUserMd", "FaHospital", "FaAmbulance", 
  "FaMedkit", "FaPills", "FaVial", "FaNotesMedical", "FaFileMedical", 
  "FaBrain", "FaLungs", "FaTooth", "FaEye", "FaBone", "FaDna", "FaSyringe", 
  "FaMicroscope", "FaWheelchair", "FaLaptopMedical", "FaComments", 
  "FaPhoneAlt", "FaEnvelope", "FaCalendarCheck", "FaVideo", "FaClipboardList", 
  "FaFileAlt", "FaCheckCircle", "FaInfoCircle", "FaArrowRight", "FaQuestionCircle"
];

const IconPicker = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const SelectedIcon = FaIcons[value] || FaIcons["FaHeartbeat"];

  return (
    <div className="relative">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center space-x-2">
          <SelectedIcon className="w-5 h-5 text-[#0067A1] dark:text-[#0080C6]" />
          <span>{value || "Select Icon"}</span>
        </div>
        <span className="text-gray-400">▼</span>
      </div>
      
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-60 overflow-auto grid grid-cols-4 sm:grid-cols-5 gap-2 p-3">
          {AVAILABLE_ICONS.map(iconName => {
            const IconComponent = FaIcons[iconName];
            return (
              <div 
                key={iconName}
                onClick={() => {
                  onChange(iconName);
                  setIsOpen(false);
                }}
                className={`flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition ${value === iconName ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'border border-transparent'}`}
                title={iconName}
              >
                <IconComponent className="w-6 h-6 text-gray-700 dark:text-gray-200 mb-1" />
                <span className="text-[10px] text-gray-500 truncate w-full text-center">{iconName.replace('Fa', '')}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
};

export default function SupportiveToolsCMS() {
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
      const res = await fetch("/api/cms/supportive-tools");
      const result = await res.json();
      if (result.success) setItems(result.data || []);
    } catch (err) { toast.error("Failed to load supportive tools"); }
    finally { setLoading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const method = editingItem.id ? "PUT" : "POST";
      const res = await fetch("/api/cms/supportive-tools", {
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
    if (!confirm("Are you sure you want to delete this tool?")) return;
    try {
      const res = await fetch(`/api/cms/supportive-tools?id=${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast.success("Deleted successfully!");
      fetchData();
    } catch (err) { toast.error(err.message); }
  };

  const handleImageUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/cms/upload", { method: "POST", body: formData });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      setEditingItem({ ...editingItem, [field]: result.url });
      toast.success("Uploaded successfully");
    } catch (err) { toast.error("Upload failed: " + err.message); }
    finally { setUploading(false); }
  };

  // Generate slug automatically based on title
  const generateSlug = (title) => {
      return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  };

  return (
    <main className="flex-1 overflow-auto p-2 md:p-4">
      <div className="w-full">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">Supportive Tools CMS</h2>
            <p className="text-gray-500 mt-2">Manage supportive tools featured on the services page.</p>
          </div>
          <button onClick={() => { setEditingItem({ title: "", slug: "", description: "", detailed_content: "", image: "", icon_name: "FaHeartbeat", display_order: 0, status: "active" }); setIsModalOpen(true); }} className="bg-[#0067A1] text-white px-4 py-2 rounded-lg flex items-center shadow pointer cursor-pointer hover:bg-[#073834] transition">
            <Plus size={18} className="mr-2" /> Add Tool
          </button>
        </div>

        {loading ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-3 border-[#0067A1] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-500 mt-3">Loading tools...</p>
            </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(item => (
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border dark:border-gray-700 relative hover:shadow-lg transition">
                <div className="absolute top-4 right-4 flex space-x-2">
                  <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="text-blue-500 hover:text-[#004F7C] pointer cursor-pointer"><Edit2 size={18} /></button>
                  <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 pointer cursor-pointer"><Trash2 size={18} /></button>
                </div>
                {item.image ? (
                   <img src={item.image} alt="tool display" className="h-16 w-full object-cover mb-4 rounded bg-gray-50 dark:bg-gray-700" />
                ) : (
                   <div className="h-12 w-12 bg-gray-100 dark:bg-gray-700 flex items-center justify-center rounded mb-4">
                     {(() => {
                        const IconComp = FaIcons[item.icon_name];
                        return IconComp ? <IconComp className="w-6 h-6 text-[#0067A1] dark:text-[#0080C6]" /> : <span className="text-gray-400 text-xs">{item.icon_name}</span>;
                     })()}
                   </div>
                )}
                
                <h3 className="font-bold text-lg dark:text-white">{item.title}</h3>
                <p className="text-xs text-gray-400 font-mono mb-2">/{item.slug}</p>
                <p className="text-sm text-gray-500 line-clamp-2 mt-2">{item.description}</p>
                
                <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                   <span>Order: {item.display_order}</span>
                   <span className={`px-2 py-1 rounded ${item.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{item.status}</span>
                </div>
              </div>
            ))}
            {items.length === 0 && (
               <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-12 text-gray-500">
                  No supportive tools found. Click "Add Tool" to create one.
               </div>
            )}
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col relative">
              <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-bold dark:text-white">{editingItem.id ? "Edit Supportive Tool" : "Add Supportive Tool"}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 pointer cursor-pointer"><X size={20}/></button>
              </div>
              <div className="p-6 overflow-y-auto">
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm font-medium mb-1 dark:text-white">Title</label>
                          <input required type="text" value={editingItem.title} 
                             onChange={e => {
                                const newTitle = e.target.value;
                                setEditingItem({...editingItem, title: newTitle, slug: editingItem.id ? editingItem.slug : generateSlug(newTitle)});
                             }} 
                             placeholder="e.g. Guided Symptom Check" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" />
                      </div>
                      <div>
                          <label className="block text-sm font-medium mb-1 dark:text-white">Slug (URL)</label>
                          <input required type="text" value={editingItem.slug} onChange={e => setEditingItem({...editingItem, slug: e.target.value})} placeholder="e.g. guided-symptom-check" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400 font-mono text-sm" />
                      </div>
                  </div>

                  <div><label className="block text-sm font-medium mb-1 dark:text-white">Short Description</label><textarea required value={editingItem.description || ''} onChange={e => setEditingItem({...editingItem, description: e.target.value})} placeholder="Snippet shown on services page grid" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" rows="2"/></div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-white">Detailed Content (For Detail Page)</label>
                    <RichTextEditor value={editingItem.detailed_content || ""} onChange={(content) => setEditingItem({...editingItem, detailed_content: content})} placeholder="Enter full page content here. HTML text styling is supported."/>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-white">Icon (Features Grid)</label>
                        <IconPicker value={editingItem.icon_name} onChange={(val) => setEditingItem({...editingItem, icon_name: val})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-white">Image (For Detail Page)</label>
                        <div className="flex items-center space-x-4">
                            {editingItem.image && <img src={editingItem.image} className="h-10 w-16 object-cover" alt=""/>}
                            <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 px-3 py-2 rounded text-sm flex items-center transition dark:text-white">
                            <ImageIcon className="w-4 h-4 mr-2" /> {uploading ? "Uploading..." : "Upload Image"}
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'image')} disabled={uploading} />
                            </label>
                        </div>
                    </div>
                  </div>

                  <div className="flex space-x-4">
                     <div className="flex-1"><label className="block text-sm font-medium mb-1 dark:text-white">Display Order</label><input type="number" value={editingItem.display_order} onChange={e => setEditingItem({...editingItem, display_order: parseInt(e.target.value)})} placeholder="e.g. 1" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400" /></div>
                     <div className="flex-1"><label className="block text-sm font-medium mb-1 dark:text-white">Status</label><select value={editingItem.status} onChange={e => setEditingItem({...editingItem, status: e.target.value})} className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
                  </div>

                  <button type="submit" className="w-full bg-[#0067A1] hover:bg-[#073834] text-white py-3 rounded font-medium mt-6 cursor-pointer transition">Save Tool</button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </main>
  );
}
