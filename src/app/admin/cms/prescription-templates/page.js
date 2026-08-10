"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Plus, Trash2, Edit2, Save, X, GripVertical, Settings } from "lucide-react";

export default function PrescriptionTemplatesCMS() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Editor State
  const defaultTemplate = {
    specialization: "",
    name: "",
    appointment_type: "clinic_visit",
    template_structure: [],
    default_values: {}
  };
  const [editingTemplate, setEditingTemplate] = useState(defaultTemplate);
  const [complaintSuggestions, setComplaintSuggestions] = useState([]);

  useEffect(() => { 
    fetchData();
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const res = await fetch("/api/admin/clinical-repository?table=cr_complaint_master&limit=1000");
      const result = await res.json();
      if (result.success && result.data) {
        const uniqueComplaints = [...new Set(result.data.map(d => d.canonical_complaint).filter(Boolean))];
        setComplaintSuggestions(uniqueComplaints.sort());
      }
    } catch (err) {
      console.error("Failed to fetch complaints", err);
    }
  };

  const fetchData = async () => {
    try {
      const res = await fetch("/api/cms/prescription-templates");
      const result = await res.json();
      if (result.success) setTemplates(result.data || []);
    } catch (err) { toast.error("Failed to load templates"); }
    finally { setLoading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Basic validation
      if (!editingTemplate.specialization || !editingTemplate.name || !editingTemplate.appointment_type) {
        toast.error("Please fill all basic template details.");
        return;
      }

      const method = editingTemplate.id ? "PUT" : "POST";
      const url = editingTemplate.id ? `/api/cms/prescription-templates/${editingTemplate.id}` : "/api/cms/prescription-templates";
      const res = await fetch(url, {
        method, 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingTemplate)
      });
      const result = await res.json();
      
      if (!result.success) throw new Error(result.error);
      
      toast.success(editingTemplate.id ? "Template updated successfully!" : "Template created successfully!");
      setIsModalOpen(false);
      fetchData();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this template? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/cms/prescription-templates/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast.success("Deleted successfully!");
      fetchData();
    } catch (err) { toast.error(err.message); }
  };

  const openNewTemplateModal = () => {
    setEditingTemplate(defaultTemplate);
    setIsModalOpen(true);
  };

  const openEditModal = (template) => {
    let normalizedSchema = [];

    // Check if the template structure uses the old format {"sections": {...}}
    if (template.template_structure && typeof template.template_structure === 'object' && !Array.isArray(template.template_structure) && template.template_structure.sections) {
      // Convert legacy object format to the new array-based schema builder format
      const legacySections = template.template_structure.sections;
      Object.keys(legacySections).forEach(secKey => {
        const secData = legacySections[secKey];
        const newSection = {
           section: secKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
           fields: []
        };
        
        if (secData.fields && Array.isArray(secData.fields)) {
           // Array of fields
           secData.fields.forEach(f => {
              newSection.fields.push({
                 label: f.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                 name: f,
                 type: "text",
                 required: false
              });
           });
        } else if (secData.type === 'textarea') {
           newSection.fields.push({
              label: secData.label || secKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              name: secKey,
              type: "textarea",
              required: false
           });
        } else if (secData.type === 'medicines') {
           newSection.fields.push({
              label: "Medicines (RX)",
              name: "medicines",
              type: "textarea",
              required: false
           });
        }
        
        normalizedSchema.push(newSection);
      });
    } else {
      normalizedSchema = Array.isArray(template.template_structure) ? template.template_structure : [];
    }

    setEditingTemplate({
      ...template,
      template_structure: normalizedSchema,
      default_values: template.default_values || {}
    });
    setIsModalOpen(true);
  };

  // --- BUILDER HELPERS ---
  const addSection = () => {
    setEditingTemplate(prev => ({
      ...prev,
      template_structure: [
        ...prev.template_structure,
        { section: "New Section", fields: [] }
      ]
    }));
  };

  const updateSectionName = (index, newName) => {
    setEditingTemplate(prev => {
      const newSchema = [...prev.template_structure];
      newSchema[index] = { ...newSchema[index], section: newName };
      return { ...prev, template_structure: newSchema };
    });
  };

  const removeSection = (index) => {
    if (!confirm("Remove this entire section?")) return;
    setEditingTemplate(prev => {
      const newSchema = [...prev.template_structure];
      newSchema.splice(index, 1);
      return { ...prev, template_structure: newSchema };
    });
  };

  const addField = (sectionIndex) => {
    setEditingTemplate(prev => {
      const newSchema = [...prev.template_structure];
      const newSection = { ...newSchema[sectionIndex] };
      newSection.fields = [
        ...(newSection.fields || []),
        {
          label: "New Field",
          name: "new_field",
          type: "text",
          required: false
        }
      ];
      newSchema[sectionIndex] = newSection;
      return { ...prev, template_structure: newSchema };
    });
  };

  const updateField = (sIndex, fIndex, key, value) => {
    setEditingTemplate(prev => {
      const newSchema = [...prev.template_structure];
      const newFields = [...newSchema[sIndex].fields];
      
      const updatedField = { ...newFields[fIndex], [key]: value };
      
      // Auto-generate JSON key when editing the label
      if (key === 'label') {
          updatedField.name = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
      }
      
      newFields[fIndex] = updatedField;
      newSchema[sIndex] = { ...newSchema[sIndex], fields: newFields };
      return { ...prev, template_structure: newSchema };
    });
  };

  const removeField = (sIndex, fIndex) => {
    setEditingTemplate(prev => {
      const newSchema = [...prev.template_structure];
      const newFields = [...newSchema[sIndex].fields];
      newFields.splice(fIndex, 1);
      newSchema[sIndex] = { ...newSchema[sIndex], fields: newFields };
      return { ...prev, template_structure: newSchema };
    });
  };

  // --- Checkbox Helpers ---
  const hasFixedSection = (name1, name2, name3) => {
    return editingTemplate.template_structure.some(s => {
      const n = (s.section || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      return n.includes(name1) || (name2 && n.includes(name2)) || (name3 && n.includes(name3));
    });
  };

  const toggleFixedSection = (checked, sectionName, keyword1, keyword2, keyword3) => {
    setEditingTemplate(prev => {
      let newSchema = [...prev.template_structure];
      let newDefaults = { ...(prev.default_values || {}) };

      if (keyword1 === "presenting complaints") {
        if (checked) {
          newDefaults._dynamic_complaints = [{ complaint: "", details: "" }];
        } else {
          delete newDefaults._dynamic_complaints;
        }
        return { ...prev, default_values: newDefaults };
      }

      if (checked) {
        if (!newSchema.some(s => {
          const n = (s.section || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          return n.includes(keyword1) || (keyword2 && n.includes(keyword2)) || (keyword3 && n.includes(keyword3));
        })) {
          newSchema.push({ section: sectionName, fields: [] });
        }
      } else {
        newSchema = newSchema.filter(s => {
          const n = (s.section || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          return !(n.includes(keyword1) || (keyword2 && n.includes(keyword2)) || (keyword3 && n.includes(keyword3)));
        });
      }
      return { ...prev, template_structure: newSchema };
    });
  };

  const hasPresentingComplaints = () => {
    return !!editingTemplate.default_values?._dynamic_complaints;
  };

  const addDefaultComplaint = () => {
    setEditingTemplate(prev => {
      const arr = prev.default_values?._dynamic_complaints || [];
      return {
        ...prev,
        default_values: { ...prev.default_values, _dynamic_complaints: [...arr, { complaint: "", details: "" }] }
      };
    });
  };

  const removeDefaultComplaint = (idx) => {
    setEditingTemplate(prev => {
      const arr = prev.default_values?._dynamic_complaints || [];
      return {
        ...prev,
        default_values: { ...prev.default_values, _dynamic_complaints: arr.filter((_, i) => i !== idx) }
      };
    });
  };

  const updateDefaultComplaint = (idx, field, value) => {
    setEditingTemplate(prev => {
      const arr = prev.default_values?._dynamic_complaints || [];
      const newArr = arr.map((c, i) => i === idx ? { ...c, [field]: value } : c);
      return {
        ...prev,
        default_values: { ...prev.default_values, _dynamic_complaints: newArr }
      };
    });
  };

  return (
    <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 min-h-screen relative">
      <div className="w-full max-w-7xl mx-auto p-2 md:p-4">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Prescription Templates
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-2xl text-sm">
              Build and manage dynamic JSON-driven prescription schemas tailored for different medical specialties and appointment types.
            </p>
          </div>
          <button 
            onClick={openNewTemplateModal} 
            className="bg-[#0067A1] hover:bg-[#004F7C] text-white px-5 py-2 rounded-xl flex items-center shadow-sm font-medium transition-colors"
          >
            <Plus size={18} className="mr-2" /> 
            Create Template
          </button>
        </div>

        {/* LIST VIEW */}
        {loading ? (
           <div className="py-32 flex flex-col items-center justify-center">
             <div className="relative">
               <div className="w-16 h-16 border-4 border-[#0067A1]/20 rounded-full"></div>
               <div className="w-16 h-16 border-4 border-[#0067A1] border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
             </div>
             <p className="mt-6 text-gray-500 font-medium animate-pulse">Loading templates...</p>
           </div>
        ) : templates.length === 0 ? (
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="bg-white/80 dark:bg-gray-800/80 rounded-2xl shadow-sm border border-gray-100/50 dark:border-gray-700/50 p-12 text-center flex flex-col items-center max-w-2xl mx-auto mt-12"
           >
             <div className="w-16 h-16 bg-[#0067A1]/10 rounded-full flex items-center justify-center mb-4 border border-teal-100/50 dark:border-teal-900/50">
               <Settings className="w-8 h-8 text-[#0067A1] dark:text-[#0080C6]" />
             </div>
             <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Templates Built Yet</h3>
             <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">Start building dynamic JSON schema templates for specialties like Cardiology, Dermatology, etc.</p>
             <button onClick={openNewTemplateModal} className="bg-[#0067A1] text-white px-6 py-2.5 rounded-lg font-medium shadow-sm hover:bg-[#004F7C] transition-colors">
               Create Your First Template
             </button>
           </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8">
            {templates.map((tmp, index) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={tmp.id} 
                className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 p-6 flex flex-col transition-all duration-300"
              >
                
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex px-3 py-1 bg-teal-50 dark:bg-[#003358]/30 text-[#004F7C] dark:text-[#0080C6] text-xs font-black rounded-lg uppercase tracking-wider border border-teal-100/50 dark:border-teal-800/50">
                      {tmp.appointment_type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button onClick={() => openEditModal(tmp)} className="p-2 text-[#0067A1] bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-xl transition-colors shadow-sm"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(tmp.id)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-xl transition-colors shadow-sm"><Trash2 size={16} /></button>
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-[#0067A1] dark:group-hover:text-[#0080C6] transition-colors">{tmp.name}</h3>
                
                <div className="flex items-center text-sm font-semibold text-[#0067A1]/80 dark:text-teal-500/80 mb-6 bg-[#0067A1]/5 dark:bg-[#003358]/20 w-fit px-3 py-1 rounded-lg">
                  {tmp.specialization}
                </div>
                
                <div className="mt-auto pt-5 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center border border-gray-200 dark:border-gray-600">
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{(tmp.template_structure || []).length}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Sections</span>
                  </div>
                  
                  {/* Action prompt on mobile / always visible button on hover */}
                  <button onClick={() => openEditModal(tmp)} className="hidden sm:group-hover:flex items-center gap-1 text-sm font-bold text-[#0067A1] dark:text-[#0080C6] transition-all">
                    Edit <span className="text-lg">→</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL - TEMPLATE BUILDER */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-50 p-4 sm:p-6 overflow-y-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-50 dark:bg-gray-800 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col my-auto max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-6 md:px-8 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-900 rounded-t-3xl shrink-0">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingTemplate.id ? "Edit Schema Template" : "Build New Template"}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1">
              <form id="templateForm" onSubmit={handleSave} className="space-y-8">
                
                {/* Basic Details */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4">
                  <h4 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">Core Settings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Specialization</label>
                      <input required type="text" value={editingTemplate.specialization} onChange={e => setEditingTemplate({...editingTemplate, specialization: e.target.value})} placeholder="e.g. Cardiology" className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] outline-none transition" />
                      <p className="text-xs text-gray-400 mt-1">Must exactly match specialty list.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Template Name</label>
                      <input required type="text" value={editingTemplate.name} onChange={e => setEditingTemplate({...editingTemplate, name: e.target.value})} placeholder="e.g. Cardio Detailed form" className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] outline-none transition" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Appointment Type</label>
                      <select value={editingTemplate.appointment_type} onChange={e => setEditingTemplate({...editingTemplate, appointment_type: e.target.value})} className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-[#0067A1]/20 outline-none">
                        <option value="clinic_visit">Clinic Visit / OPD</option>
                        <option value="video_consultation">Video Consultation / Tele</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Fixed Sections Config */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4">
                  <h4 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">Fixed Sections</h4>
                  <p className="text-sm text-gray-500 mb-4">Note: Medicines, Lab Tests, and Diagnosis fields are fixed in the doctor's interface. Use these checkboxes to enable them for this template.</p>
                  <div className="flex flex-wrap items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={hasFixedSection("diagnosis")} 
                        onChange={(e) => toggleFixedSection(e.target.checked, "DIAGNOSIS", "diagnosis")}
                        className="w-5 h-5 text-[#0067A1] rounded border-gray-300 focus:ring-[#0067A1]" 
                      />
                      <span className="text-sm font-bold text-gray-700">Include Diagnosis</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={hasPresentingComplaints()} 
                        onChange={(e) => toggleFixedSection(e.target.checked, "PRESENTING COMPLAINTS", "presenting complaints")}
                        className="w-5 h-5 text-[#0067A1] rounded border-gray-300 focus:ring-[#0067A1]" 
                      />
                      <span className="text-sm font-bold text-gray-700">Include Presenting Complaints</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={hasFixedSection("treatment", "rx", "medicines")} 
                        onChange={(e) => toggleFixedSection(e.target.checked, "TREATMENT (Rx)", "treatment", "rx", "medicines")} 
                        className="w-5 h-5 text-[#0067A1] rounded border-gray-300 focus:ring-[#0067A1]"
                      />
                      <span className="text-sm font-bold text-gray-700">Include Medicines</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={hasFixedSection("investigation", "lab")} 
                        onChange={(e) => toggleFixedSection(e.target.checked, "INVESTIGATIONS", "investigation", "lab")}
                        className="w-5 h-5 text-[#0067A1] rounded border-gray-300 focus:ring-[#0067A1]" 
                      />
                      <span className="text-sm font-bold text-gray-700">Include Investigations/Lab Tests</span>
                    </label>
                  </div>
                  
                  {hasPresentingComplaints() && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-bold text-gray-800 text-sm">Default Presenting Complaints</h5>
                        <button
                          type="button"
                          onClick={addDefaultComplaint}
                          className="text-xs bg-teal-50 text-[#004F7C] px-3 py-1.5 rounded-md font-semibold hover:bg-teal-100 transition flex items-center gap-1"
                        >
                          <Plus size={14} /> Add Default Row
                        </button>
                      </div>
                      <div className="space-y-2">
                        {editingTemplate.default_values?._dynamic_complaints?.map((comp, idx) => (
                          <div key={idx} className="flex flex-col sm:flex-row items-center gap-2">
                            <select
                              value={comp.complaint}
                              onChange={(e) => updateDefaultComplaint(idx, "complaint", e.target.value)}
                              className="w-full sm:w-1/2 border border-gray-300 p-2 rounded-md focus:ring-[#0067A1] focus:border-[#0067A1] outline-none text-sm"
                            >
                              <option value="">Select Symptom...</option>
                              {complaintSuggestions.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <input
                              type="text"
                              placeholder="Default Details (Optional)"
                              value={comp.details}
                              onChange={(e) => updateDefaultComplaint(idx, "details", e.target.value)}
                              className="w-full sm:w-1/2 border border-gray-300 p-2 rounded-md focus:ring-[#0067A1] focus:border-[#0067A1] outline-none text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => removeDefaultComplaint(idx)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-md transition"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">These will be pre-filled when a doctor selects this template.</p>
                    </div>
                  )}
                </div>

                {/* Schema Builder */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between mt-8 mb-4">
                    <h4 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                       Template Schema (Sections & Fields)
                    </h4>
                    <button type="button" onClick={addSection} className="text-sm bg-teal-50 text-[#004F7C] hover:bg-teal-100 px-4 py-2 rounded-lg font-bold transition flex items-center">
                      <Plus size={16} className="mr-1" /> Add Section
                    </button>
                  </div>

                  {editingTemplate.template_structure.length === 0 && (
                    <div className="text-center p-8 border-2 border-dashed border-gray-200 rounded-2xl bg-white">
                      <p className="text-gray-500 mb-2">No sections defined yet. Click "Add Section" to begin building the template.</p>
                    </div>
                  )}

                  <div className="space-y-6">
                    {editingTemplate.template_structure.map((sectionObject, sIndex) => (
                      <div key={sIndex} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                        
                        {/* Section Header */}
                        <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 max-w-md">
                            <GripVertical size={18} className="text-gray-400 cursor-move" />
                            <input 
                               type="text" 
                               value={sectionObject.section} 
                               onChange={e => updateSectionName(sIndex, e.target.value)}
                               className="font-bold text-gray-800 bg-transparent border-b border-gray-300 focus:border-[#0067A1] outline-none px-1 py-1 w-full"
                               placeholder="Section Name (e.g. Vitals)"
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <button type="button" onClick={() => addField(sIndex)} className="text-sm text-[#004F7C] hover:bg-teal-50 px-3 py-1.5 rounded border border-teal-200 bg-white font-semibold transition">
                              + Add Field
                            </button>
                            <button type="button" onClick={() => removeSection(sIndex)} className="text-red-500 hover:bg-red-50 p-2 rounded transition">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Section Fields */}
                        <div className="p-4 bg-white">
                           {(!sectionObject.fields || sectionObject.fields.length === 0) ? (
                             <p className="text-sm text-gray-400 italic text-center py-2">No fields added to this section.</p>
                           ) : (
                             <table className="w-full text-left text-sm border-collapse">
                               <thead>
                                 <tr className="border-b border-gray-100 text-gray-500">
                                   <th className="font-semibold pb-2 w-1/4">Label (Display)</th>
                                   <th className="font-semibold pb-2 w-1/4">JSON Key</th>
                                   <th className="font-semibold pb-2 w-1/5">Input Type</th>
                                   <th className="font-semibold pb-2 text-center w-1/6">Required?</th>
                                   <th className="pb-2"></th>
                                 </tr>
                               </thead>
                               <tbody className="divide-y divide-gray-50">
                                 {sectionObject.fields.map((field, fIndex) => (
                                   <tr key={fIndex} className="hover:bg-gray-50">
                                     <td className="py-2 pr-2">
                                       <input type="text" value={field.label} onChange={e => updateField(sIndex, fIndex, 'label', e.target.value)} placeholder="e.g. Blood Pressure" className="w-full border border-gray-200 p-1.5 rounded focus:ring-1 focus:ring-[#0067A1] outline-none" />
                                     </td>
                                     <td className="py-2 pr-2">
                                       <input type="text" value={field.name} onChange={e => updateField(sIndex, fIndex, 'name', e.target.value)} placeholder="e.g. bp" className="w-full border border-gray-200 bg-gray-50 font-mono text-xs p-1.5 rounded focus:ring-1 focus:ring-[#0067A1] outline-none" />
                                     </td>
                                     <td className="py-2 pr-2">
                                       <select value={field.type} onChange={e => updateField(sIndex, fIndex, 'type', e.target.value)} className="w-full border border-gray-200 p-1.5 rounded focus:ring-1 focus:ring-[#0067A1] outline-none">
                                         <option value="text">Short Text</option>
                                         <option value="textarea">Long Text / Paragraph</option>
                                         <option value="number">Number</option>
                                       </select>
                                     </td>
                                     <td className="py-2 text-center">
                                       <input type="checkbox" checked={field.required} onChange={e => updateField(sIndex, fIndex, 'required', e.target.checked)} className="w-4 h-4 text-[#0067A1] rounded border-gray-300 focus:ring-[#0067A1]" />
                                     </td>
                                     <td className="py-2 text-right">
                                       <button type="button" onClick={() => removeField(sIndex, fIndex)} className="text-gray-400 hover:text-red-500 p-1">
                                         <Trash2 size={14} />
                                       </button>
                                     </td>
                                   </tr>
                                 ))}
                               </tbody>
                             </table>
                           )}
                        </div>

                      </div>
                    ))}
                  </div>

                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 rounded-b-3xl flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition">
                Cancel
              </button>
              <button type="submit" form="templateForm" disabled={saving} className="bg-[#0067A1] hover:bg-[#004F7C] text-white px-6 py-2.5 rounded-xl flex items-center shadow-sm font-bold transition-colors disabled:opacity-75 disabled:cursor-not-allowed">
                {saving ? (
                  <><div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Saving Schema...</>
                ) : (
                  <><Save size={18} className="mr-2" /> Save JSON Schema</>
                )}
              </button>
            </div>

          </motion.div>
        </div>
      )}

    </main>
  );
}
