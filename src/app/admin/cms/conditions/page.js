"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Plus, Trash2, Edit2, X, Image as ImageIcon, Save, Stethoscope, Check } from "lucide-react";
import RichTextEditor from "@/components/ui/RichTextEditor";
import { uploadCmsMedia } from "@/lib/cmsUpload";

const COMMON_SPECIALTIES = [
  "General Physician",
  "Dermatology",
  "Trichology",
  "Cardiology",
  "Endocrinology",
  "Pulmonology",
  "Gynecology",
  "Orthopedics",
  "ENT",
  "Pediatrics",
  "Psychiatry",
  "Neurology",
  "Gastroenterology",
  "Urology",
  "Dentistry"
];

export default function ConditionsCMS() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedSpecialties, setSelectedSpecialties] = useState([]);
  const [customSpecialtyInput, setCustomSpecialtyInput] = useState("");
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

  const openModal = (item = null) => {
    if (item) {
      setEditingItem({ ...item });
      const specs = Array.isArray(item.specialties) && item.specialties.length > 0
        ? item.specialties
        : item.recommended_specialty
        ? item.recommended_specialty.split(",").map(s => s.trim()).filter(Boolean)
        : [];
      setSelectedSpecialties(specs);
    } else {
      setEditingItem({
        title: "", seo_title: "", slug: "", short_description: "", icon_name: "", detailed_content: "", 
        recommended_specialty: "", display_order: 0, status: 'active' 
      });
      setSelectedSpecialties(["General Physician"]);
    }
    setCustomSpecialtyInput("");
    setIsModalOpen(true);
  };

  const handleAddSpecialty = (spec) => {
    const trimmed = (spec || "").trim();
    if (!trimmed) return;
    if (selectedSpecialties.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`"${trimmed}" is already added.`);
      return;
    }
    setSelectedSpecialties(prev => [...prev, trimmed]);
    setCustomSpecialtyInput("");
  };

  const handleRemoveSpecialty = (specToRemove) => {
    setSelectedSpecialties(prev => prev.filter(s => s !== specToRemove));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (selectedSpecialties.length === 0) {
        toast.error("Please add at least one specialty for this condition.");
        return;
      }

      const payload = {
        ...editingItem,
        recommended_specialty: selectedSpecialties.join(", "),
      };

      const method = editingItem.id ? "PUT" : "POST";
      const url = editingItem.id ? `/api/cms/conditions/${editingItem.id}` : "/api/cms/conditions";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast.success(editingItem.id ? "Condition updated!" : "Condition created!");
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
    try {
      const result = await uploadCmsMedia(file);
      setEditingItem(prev => ({ ...prev, icon_name: result.url }));
      toast.success("Icon uploaded");
    } catch (err) { toast.error("Upload failed: " + err.message); }
    finally { setUploading(false); }
  };

  return (
    <main className="flex-1 overflow-auto p-2 md:p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-slate-200 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0B3A5B]">Health Conditions CMS</h1>
            <p className="text-sm text-slate-500 mt-1">Manage health concerns, assign multiple medical specialties &amp; configure SEO pages.</p>
          </div>
          <button 
            type="button"
            onClick={() => openModal()} 
            className="bg-[#0067A1] hover:bg-[#004F7C] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-semibold shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Plus size={18} /> Add Condition
          </button>
        </div>

        {loading ? (
            <div className="py-16 flex flex-col items-center justify-center">
              <div className="w-9 h-9 border-3 border-[#0067A1] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-slate-500 mt-3 font-medium">Loading conditions...</p>
            </div>
        ) : items.length === 0 ? (
            <div className="py-16 text-center text-slate-500 bg-white rounded-2xl shadow-xs border border-slate-200 p-8">
              <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-base font-semibold text-slate-700">No health conditions found</p>
              <p className="text-xs text-slate-400 mt-1">Add a condition with multiple specialties to display on the website.</p>
            </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(item => {
              const specs = Array.isArray(item.specialties) && item.specialties.length > 0
                ? item.specialties
                : item.recommended_specialty
                ? item.recommended_specialty.split(",").map(s => s.trim()).filter(Boolean)
                : ["General Physician"];

              return (
                <div key={item.id} className="bg-white rounded-2xl shadow-xs p-5 sm:p-6 border border-slate-200 relative hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-2 shrink-0">
                        {item.icon_name ? (
                          <img src={item.icon_name} alt="icon" className="w-full h-full object-contain" />
                        ) : (
                          <Stethoscope className="w-6 h-6 text-[#0067A1]" />
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          type="button"
                          onClick={() => openModal(item)} 
                          className="p-1.5 text-slate-600 hover:text-[#0067A1] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit Condition"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDelete(item.id)} 
                          className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Condition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-bold text-lg text-slate-900">{item.title}</h3>
                    
                    {/* Multiple Specialties Pills */}
                    <div className="mt-2.5">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Assigned Specialties ({specs.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {specs.map((spec) => (
                          <span 
                            key={spec} 
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#0067A1]/10 text-[#0067A1] border border-[#0067A1]/20"
                          >
                            <Stethoscope className="w-2.5 h-2.5" />
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 mt-3 leading-relaxed">
                      {item.short_description}
                    </p>
                  </div>
                  
                  <div className="mt-5 flex items-center justify-between text-xs font-medium border-t border-slate-100 pt-3">
                     <span className="text-slate-400 font-mono text-[11px]">/{item.slug}</span>
                     <span className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] border ${item.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                         {item.status === 'active' ? 'Active' : 'Inactive'}
                     </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Add / Edit Condition */}
        {isModalOpen && editingItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col relative shadow-xl border border-slate-200">
              
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-slate-200 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {editingItem.id ? "Edit Health Condition" : "Add Health Condition"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Assign multiple specialties and configure public CTA buttons.</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)} 
                  className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full cursor-pointer transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 overflow-y-auto scrollbar-thin">
                <form onSubmit={handleSave} className="space-y-6">
                  
                  {/* Name & Slug */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                            Condition Name (For Cards) <span className="text-red-500">*</span>
                          </label>
                          <input 
                            required 
                            type="text" 
                            value={editingItem.title} 
                            onChange={e => setEditingItem({...editingItem, title: e.target.value})} 
                            placeholder="e.g. Hair Loss" 
                            className="w-full border border-slate-300 p-2.5 rounded-[6px] text-sm focus:border-[#0067A1] focus:ring-2 focus:ring-[#0067A1]/20 outline-none transition-all" 
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                            URL Slug (Optional)
                          </label>
                          <input 
                            type="text" 
                            value={editingItem.slug} 
                            onChange={e => setEditingItem({...editingItem, slug: e.target.value})} 
                            placeholder="e.g. hair-loss (auto-generated if empty)" 
                            className="w-full border border-slate-300 p-2.5 rounded-[6px] text-sm focus:border-[#0067A1] focus:ring-2 focus:ring-[#0067A1]/20 outline-none transition-all" 
                          />
                      </div>
                  </div>

                  {/* SEO Hero Title */}
                  <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        SEO Hero Title (Full H1)
                      </label>
                      <input 
                        type="text" 
                        value={editingItem.seo_title || ""} 
                        onChange={e => setEditingItem({...editingItem, seo_title: e.target.value})} 
                        placeholder="e.g. Hair Loss Treatment in Dwarka, Delhi" 
                        className="w-full border border-slate-300 p-2.5 rounded-[6px] text-sm focus:border-[#0067A1] focus:ring-2 focus:ring-[#0067A1]/20 outline-none transition-all" 
                      />
                      <p className="text-[11px] text-slate-500 mt-1">Leave empty to use condition name as the H1 title.</p>
                  </div>

                  {/* MULTIPLE SPECIALTIES SECTION */}
                  <div className="bg-[#F8FAFC] border border-[#DCE6EB] rounded-[8px] p-4 sm:p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#0B3A5B]">
                          Suggested Specialties (Multiple) <span className="text-red-500">*</span>
                        </label>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Add all specialties relevant to this condition. Each specialty will receive its own CTA button on the website.
                        </p>
                      </div>
                      <span className="text-xs font-bold text-[#0067A1] bg-white px-2.5 py-1 rounded-[5px] border border-[#DCE6EB] self-start sm:self-auto">
                        {selectedSpecialties.length} Selected
                      </span>
                    </div>

                    {/* Active Selected Specialties Tags */}
                    <div className="min-h-[46px] p-2 bg-white rounded-[6px] border border-slate-200 flex flex-wrap gap-2 items-center">
                      {selectedSpecialties.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">No specialties selected yet. Add one below.</span>
                      ) : (
                        selectedSpecialties.map((spec) => (
                          <span
                            key={spec}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] text-xs font-semibold bg-[#0067A1] text-white shadow-2xs"
                          >
                            <Stethoscope className="w-3 h-3 text-white/80" />
                            <span>{spec}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSpecialty(spec)}
                              className="hover:bg-white/20 p-0.5 rounded-[4px] transition-colors cursor-pointer ml-1"
                              title={`Remove ${spec}`}
                            >
                              <X size={13} />
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    {/* Add Custom Specialty Input */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={customSpecialtyInput}
                          onChange={(e) => setCustomSpecialtyInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddSpecialty(customSpecialtyInput);
                            }
                          }}
                          placeholder="Type a specialty name and press Enter (e.g. Trichology, Dermatology, Cosmetology)"
                          className="w-full bg-white border border-slate-300 pl-3 pr-3 py-2 rounded-[6px] text-xs sm:text-sm focus:border-[#0067A1] focus:ring-2 focus:ring-[#0067A1]/20 outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddSpecialty(customSpecialtyInput)}
                        className="bg-[#0067A1] hover:bg-[#004F7C] text-white px-4 py-2 rounded-[6px] text-xs font-bold transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <Plus size={14} /> Add
                      </button>
                    </div>

                    {/* Quick Pick Specialties Tray */}
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Quick Add Common Specialties:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {COMMON_SPECIALTIES.map((spec) => {
                          const isSelected = selectedSpecialties.some(
                            (s) => s.toLowerCase() === spec.toLowerCase()
                          );
                          return (
                            <button
                              key={spec}
                              type="button"
                              onClick={() => (isSelected ? handleRemoveSpecialty(spec) : handleAddSpecialty(spec))}
                              className={`px-2.5 py-1 rounded-[5px] text-xs font-medium transition-all flex items-center gap-1 cursor-pointer border ${
                                isSelected
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                  : "bg-white border-slate-200 text-slate-700 hover:border-[#0067A1] hover:text-[#0067A1]"
                              }`}
                            >
                              {isSelected ? <Check size={12} className="text-emerald-600" /> : <Plus size={12} />}
                              <span>{spec}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Icon & Display Order */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                         <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                           Condition Icon
                         </label>
                         <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-[6px] bg-slate-50 border border-slate-200 flex items-center justify-center p-2 shrink-0">
                              {editingItem.icon_name ? (
                                <img src={editingItem.icon_name} className="w-full h-full object-contain" alt=""/>
                              ) : (
                                <ImageIcon className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                            <label className="cursor-pointer bg-white border border-slate-300 hover:bg-slate-50 px-3.5 py-2 rounded-[6px] text-xs font-semibold flex items-center transition text-slate-700 shadow-2xs">
                              <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-slate-500" /> 
                              {uploading ? "Uploading..." : "Choose Image"}
                              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                            </label>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                         <div>
                             <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                               Display Order
                             </label>
                             <input 
                               type="number" 
                               value={editingItem.display_order} 
                               onChange={e => setEditingItem({...editingItem, display_order: parseInt(e.target.value) || 0})} 
                               className="w-full border border-slate-300 p-2.5 rounded-[6px] text-sm focus:border-[#0067A1] focus:ring-2 focus:ring-[#0067A1]/20 outline-none" 
                             />
                         </div>
                         <div>
                             <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                               Status
                             </label>
                             <select 
                               value={editingItem.status} 
                               onChange={e => setEditingItem({...editingItem, status: e.target.value})} 
                               className="w-full border border-slate-300 p-2.5 rounded-[6px] text-sm focus:border-[#0067A1] focus:ring-2 focus:ring-[#0067A1]/20 outline-none bg-white cursor-pointer"
                             >
                                 <option value="active">Active</option>
                                 <option value="inactive">Inactive</option>
                             </select>
                         </div>
                      </div>
                  </div>

                  {/* Short Description */}
                  <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Short Description (for Cards) <span className="text-red-500">*</span>
                      </label>
                      <textarea 
                        required 
                        value={editingItem.short_description} 
                        onChange={e => setEditingItem({...editingItem, short_description: e.target.value})} 
                        placeholder="e.g. Thinning hair or excessive shedding is a common condition that requires proper clinical evaluation..." 
                        className="w-full border border-slate-300 p-2.5 rounded-[6px] text-sm focus:border-[#0067A1] focus:ring-2 focus:ring-[#0067A1]/20 outline-none leading-relaxed" 
                        rows="2"
                      />
                  </div>

                  {/* Detailed Rich Content */}
                  <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Detailed Education Content (SEO Page)
                      </label>
                      <div className="bg-white border border-slate-300 rounded-[6px] overflow-hidden">
                          <RichTextEditor 
                            value={editingItem.detailed_content || ""} 
                            onChange={content => setEditingItem({...editingItem, detailed_content: content})} 
                            placeholder="Enter educational sections like 'Common Symptoms', 'Causes', 'Specialist Treatment', etc." 
                          />
                      </div>
                  </div>

                  {/* Modal Footer Actions */}
                  <div className="pt-4 border-t border-slate-200 mt-6 flex justify-end items-center gap-3">
                      <button 
                        type="button" 
                        onClick={() => setIsModalOpen(false)} 
                        className="px-5 py-2.5 rounded-[6px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="bg-[#0067A1] hover:bg-[#004F7C] text-white px-6 py-2.5 rounded-[6px] font-bold shadow-xs transition-colors flex items-center gap-2 text-xs cursor-pointer"
                      >
                          <Save size={16} /> Save Condition
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
