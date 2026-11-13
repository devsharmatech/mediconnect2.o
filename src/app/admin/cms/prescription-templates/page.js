"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  GripVertical,
  Settings,
  Search,
  Filter,
  Video,
  Building2,
  Stethoscope,
  Eye,
  Copy,
  Layers,
  Activity,
  CheckCircle2,
  FileText,
  RotateCcw,
  Sparkles,
  ArrowUpDown,
  Check
} from "lucide-react";

export default function PrescriptionTemplatesCMS() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search, Filter & Sort State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [sortBy, setSortBy] = useState("name_asc");

  // Preview Modal State
  const [previewTemplate, setPreviewTemplate] = useState(null);

  // Editor Modal State
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
    } catch (err) { 
      toast.error("Failed to load templates"); 
    } finally { 
      setLoading(false); 
    }
  };

  // Extract distinct specialties
  const specialties = useMemo(() => {
    const set = new Set();
    templates.forEach(t => {
      if (t.specialization) set.add(t.specialization.trim());
    });
    return Array.from(set).sort();
  }, [templates]);

  // Overall Statistics / KPI
  const stats = useMemo(() => {
    const total = templates.length;
    const specialtiesCount = new Set(templates.map(t => t.specialization?.trim()).filter(Boolean)).size;
    const teleCount = templates.filter(t => t.appointment_type === "video_consultation").length;
    const opdCount = templates.filter(t => t.appointment_type === "clinic_visit").length;
    return { total, specialtiesCount, teleCount, opdCount };
  }, [templates]);

  // Filtered & Sorted Templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      if (selectedSpecialty !== "all" && t.specialization?.toLowerCase() !== selectedSpecialty.toLowerCase()) {
        return false;
      }
      if (selectedType !== "all" && t.appointment_type !== selectedType) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (t.name || "").toLowerCase().includes(q);
        const specMatch = (t.specialization || "").toLowerCase().includes(q);
        const typeMatch = (t.appointment_type || "").replace(/_/g, " ").toLowerCase().includes(q);
        const sectionMatch = Array.isArray(t.template_structure) && t.template_structure.some(s => (s.section || "").toLowerCase().includes(q));
        if (!nameMatch && !specMatch && !typeMatch && !sectionMatch) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === "name_asc") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "name_desc") return (b.name || "").localeCompare(a.name || "");
      if (sortBy === "specialty") return (a.specialization || "").localeCompare(b.specialization || "");
      if (sortBy === "sections_desc") {
        const aSecs = Array.isArray(a.template_structure) ? a.template_structure.length : 0;
        const bSecs = Array.isArray(b.template_structure) ? b.template_structure.length : 0;
        return bSecs - aSecs;
      }
      return 0;
    });
  }, [templates, selectedSpecialty, selectedType, searchQuery, sortBy]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (!editingTemplate.specialization || !editingTemplate.name || !editingTemplate.appointment_type) {
        toast.error("Please fill all required template fields.");
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
    } catch (err) { 
      toast.error(err.message); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete template "${name || "this template"}"? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/cms/prescription-templates/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast.success("Template deleted successfully!");
      fetchData();
    } catch (err) { 
      toast.error(err.message); 
    }
  };

  const handleDuplicate = (template) => {
    let normalizedSchema = [];
    if (template.template_structure && typeof template.template_structure === 'object' && !Array.isArray(template.template_structure) && template.template_structure.sections) {
      const legacySections = template.template_structure.sections;
      Object.keys(legacySections).forEach(secKey => {
        const secData = legacySections[secKey];
        const newSection = {
          section: secKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          fields: []
        };
        if (secData.fields && Array.isArray(secData.fields)) {
          secData.fields.forEach(f => {
            newSection.fields.push({
              label: f.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              name: f,
              type: "text",
              required: false
            });
          });
        }
        normalizedSchema.push(newSection);
      });
    } else {
      normalizedSchema = Array.isArray(template.template_structure) ? JSON.parse(JSON.stringify(template.template_structure)) : [];
    }

    setEditingTemplate({
      specialization: template.specialization,
      name: `${template.name} (Copy)`,
      appointment_type: template.appointment_type,
      template_structure: normalizedSchema,
      default_values: template.default_values ? JSON.parse(JSON.stringify(template.default_values)) : {}
    });
    setIsModalOpen(true);
    toast.success("Template cloned. Modify and save!");
  };

  const openNewTemplateModal = () => {
    setEditingTemplate(defaultTemplate);
    setIsModalOpen(true);
  };

  const openEditModal = (template) => {
    let normalizedSchema = [];

    if (template.template_structure && typeof template.template_structure === 'object' && !Array.isArray(template.template_structure) && template.template_structure.sections) {
      const legacySections = template.template_structure.sections;
      Object.keys(legacySections).forEach(secKey => {
        const secData = legacySections[secKey];
        const newSection = {
          section: secKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          fields: []
        };
        
        if (secData.fields && Array.isArray(secData.fields)) {
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
        { section: "New Clinical Section", fields: [] }
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
          label: "New Parameter",
          name: "new_param",
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

  // --- Fixed Sections Checkbox Helpers ---
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
    <main className="flex-1 bg-slate-50 dark:bg-slate-900 min-h-screen relative w-full">
      {/* Fluid full-width container taking 100% of available screen real-estate */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Top Header & Breadcrumb */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0067A1] mb-1">
              <span>Clinical Practice</span>
              <span>/</span>
              <span>Clinical Records</span>
              <span>/</span>
              <span className="text-slate-500">Prescription Templates</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              Prescription Templates
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#0067A1]/10 text-[#0067A1] border border-[#0067A1]/20">
                EHR Schemas
              </span>
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
              Build and manage dynamic JSON-driven prescription schemas tailored for different medical specialties and appointment types.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={openNewTemplateModal} 
              className="bg-[#0067A1] hover:bg-[#004F7C] text-white px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-xs font-semibold text-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> 
              Create Template
            </button>
          </div>
        </div>

        {/* Clinical KPI Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Schemas
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#0067A1]/10 text-[#0067A1] flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
              {stats.total}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Active prescription forms</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Specialties
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Stethoscope className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
              {stats.specialtiesCount}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Clinical disciplines covered</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Telemedicine
              </span>
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0067A1] flex items-center justify-center">
                <Video className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
              {stats.teleCount}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Video consultation protocols</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Clinic Visit / OPD
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
              {stats.opdCount}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">In-person physical protocols</p>
          </div>
        </div>

        {/* Filter, Search & Controls Bar */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 sm:p-4 shadow-2xs">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates by specialty, name, or clinical section..."
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Controls Row */}
            <div className="flex flex-wrap items-center gap-2.5">
              
              {/* Specialty Dropdown */}
              <div className="flex items-center gap-1.5 min-w-[170px]">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="w-full py-2 px-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0067A1]"
                >
                  <option value="all">All Specialties ({templates.length})</option>
                  {specialties.map((spec) => (
                    <option key={spec} value={spec}>
                      {spec} ({templates.filter(t => t.specialization?.trim() === spec).length})
                    </option>
                  ))}
                </select>
              </div>

              {/* Consultation Type Pills */}
              <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-900 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setSelectedType("all")}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                    selectedType === "all"
                      ? "bg-white dark:bg-slate-800 text-[#0067A1] shadow-xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  All ({templates.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType("video_consultation")}
                  className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                    selectedType === "video_consultation"
                      ? "bg-white dark:bg-slate-800 text-[#0067A1] shadow-xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <Video className="w-3 h-3 text-[#0067A1]" />
                  Tele ({stats.teleCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType("clinic_visit")}
                  className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                    selectedType === "clinic_visit"
                      ? "bg-white dark:bg-slate-800 text-[#0067A1] shadow-xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <Building2 className="w-3 h-3 text-emerald-600" />
                  OPD ({stats.opdCount})
                </button>
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-1 text-xs">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="py-2 px-2 text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0067A1]"
                >
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="name_desc">Name (Z-A)</option>
                  <option value="specialty">Specialty</option>
                  <option value="sections_desc">Most Sections</option>
                </select>
              </div>

              {/* Reset Button (only if filters applied) */}
              {(searchQuery || selectedSpecialty !== "all" || selectedType !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedSpecialty("all");
                    setSelectedType("all");
                  }}
                  className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-500">
            <span>
              Showing <strong className="text-slate-800 dark:text-slate-200">{filteredTemplates.length}</strong> of {templates.length} clinical templates
            </span>
            {selectedSpecialty !== "all" && (
              <span className="font-semibold text-[#0067A1]">
                Specialty: {selectedSpecialty}
              </span>
            )}
          </div>
        </div>

        {/* LIST VIEW (Responsive Full-Width Grid: 1 col on mobile, 2 on sm, 3 on lg, 4 on xl/2xl) */}
        {loading ? (
          <div className="py-28 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-[#0067A1]/20 border-t-[#0067A1] rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-600 font-semibold text-sm">Loading prescription templates...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center flex flex-col items-center max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
              <Search className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              No Matching Templates
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-sm">
              No clinical schemas matched your current search and filters. Try clearing your search or filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedSpecialty("all");
                setSelectedType("all");
              }}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#0067A1] text-white hover:bg-[#004F7C] transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4 sm:gap-5">
            {filteredTemplates.map((tmp) => {
              const isTele = tmp.appointment_type === "video_consultation";
              const sections = Array.isArray(tmp.template_structure) ? tmp.template_structure : [];
              const sectionCount = sections.length;

              return (
                <div
                  key={tmp.id}
                  className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#0067A1]/50 hover:shadow-md transition-all p-4 flex flex-col justify-between"
                >
                  <div>
                    {/* Top Type & Status Row */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10.5px] font-bold uppercase tracking-wider border ${
                          isTele
                            ? "bg-sky-50 text-[#0067A1] border-sky-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {isTele ? <Video className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                        {isTele ? "Telemedicine" : "Clinic Visit"}
                      </span>

                      <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Active
                      </span>
                    </div>

                    {/* Template Name */}
                    <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-[#0067A1] transition-colors mb-2">
                      {tmp.name}
                    </h3>

                    {/* Specialty Pill */}
                    <div className="mb-3">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0067A1] bg-[#0067A1]/10 px-2 py-0.5 rounded border border-[#0067A1]/20">
                        <Stethoscope className="w-3 h-3 text-[#0067A1]" />
                        {tmp.specialization}
                      </span>
                    </div>

                    {/* Section Breakdown Pills */}
                    <div className="bg-slate-50 dark:bg-slate-900/60 rounded-lg p-2.5 border border-slate-100 dark:border-slate-700/60 mb-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Layers className="w-3 h-3 text-[#0067A1]" />
                          {sectionCount} Sections
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Schema Fields</span>
                      </div>
                      
                      {/* First few section badges */}
                      <div className="flex flex-wrap gap-1 text-[10px]">
                        {sections.slice(0, 3).map((sec, idx) => (
                          <span
                            key={idx}
                            className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 truncate max-w-[120px]"
                            title={sec.section}
                          >
                            {sec.section}
                          </span>
                        ))}
                        {sections.length > 3 && (
                          <span className="text-slate-400 font-semibold px-1 py-0.5">
                            +{sections.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Toolbar on Bottom */}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(tmp)}
                        className="px-2.5 py-1 text-xs font-semibold text-[#0067A1] bg-[#0067A1]/10 hover:bg-[#0067A1]/20 rounded border border-[#0067A1]/20 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Edit schema structure"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreviewTemplate(tmp)}
                        className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 rounded transition-colors flex items-center gap-1 cursor-pointer"
                        title="Preview form layout"
                      >
                        <Eye className="w-3 h-3" />
                        Preview
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDuplicate(tmp)}
                        className="p-1 text-slate-400 hover:text-[#0067A1] hover:bg-slate-100 rounded transition-colors cursor-pointer"
                        title="Duplicate as new template"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(tmp.id, tmp.name)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                      title="Delete template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PREVIEW MODAL */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-2xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0067A1]/10 text-[#0067A1] flex items-center justify-center">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {previewTemplate.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{previewTemplate.specialization}</span>
                    <span>•</span>
                    <span className="capitalize">{['clinic', 'clinic_visit', 'in_person'].includes(String(previewTemplate.appointment_type).toLowerCase()) ? 'Clinic' : previewTemplate.appointment_type.replace(/_/g, " ")}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
              <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 text-slate-700">
                <p className="font-semibold text-[#0067A1] mb-0.5">Template Schema Overview</p>
                <p className="text-[11px] text-slate-600">
                  This schema defines the fields rendered inside the doctor's prescription workspace when selecting this template.
                </p>
              </div>

              {previewTemplate.default_values?._dynamic_complaints && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5">
                  <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Default Presenting Complaints ({previewTemplate.default_values._dynamic_complaints.length})
                  </p>
                  <div className="space-y-1">
                    {previewTemplate.default_values._dynamic_complaints.map((c, i) => (
                      <div key={i} className="flex items-center justify-between bg-white px-2.5 py-1 rounded border border-slate-200 text-xs">
                        <span className="font-medium text-slate-800">{c.complaint || "Unspecified Symptom"}</span>
                        <span className="text-slate-500 italic text-[11px]">{c.details || "No default notes"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(previewTemplate.template_structure) && previewTemplate.template_structure.length > 0 ? (
                <div className="space-y-3">
                  {previewTemplate.template_structure.map((sec, sIdx) => (
                    <div key={sIdx} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                      <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 font-bold text-slate-800 flex items-center justify-between text-xs">
                        <span>{sIdx + 1}. {sec.section}</span>
                        <span className="text-[10px] text-slate-500 font-normal">{(sec.fields || []).length} fields</span>
                      </div>
                      <div className="p-3">
                        {(!sec.fields || sec.fields.length === 0) ? (
                          <p className="text-[11px] text-slate-400 italic">No custom fields (Clinical text block / standard input)</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {sec.fields.map((f, fIdx) => (
                              <div key={fIdx} className="bg-slate-50/80 p-2 rounded border border-slate-100 flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-slate-800">{f.label}</p>
                                  <p className="text-[10px] font-mono text-slate-400">key: {f.name}</p>
                                </div>
                                <span className="text-[10px] uppercase font-bold text-slate-500 px-1.5 py-0.5 rounded bg-white border border-slate-200">
                                  {f.type}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-400 py-6 italic">No custom sections defined in this template.</p>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const t = previewTemplate;
                  setPreviewTemplate(null);
                  openEditModal(t);
                }}
                className="px-4 py-1.5 rounded-lg bg-[#0067A1] text-white hover:bg-[#004F7C] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BUILDER / EDITOR MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl w-full max-w-5xl shadow-2xl flex flex-col my-auto max-h-[92vh] overflow-hidden border border-slate-200 dark:border-slate-700">
            
            {/* Modal Header */}
            <div className="p-4 sm:px-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-900 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#0067A1]/10 text-[#0067A1] flex items-center justify-center">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {editingTemplate.id ? "Edit Schema Template" : "Build New Clinical Template"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Define medical parameters, fixed clinical blocks, and dynamic sections
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
              <form id="templateForm" onSubmit={handleSave} className="space-y-6">
                
                {/* Basic Details */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold text-[#0067A1] uppercase tracking-wider border-b border-slate-100 pb-2">
                    Core Template Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Specialization *
                      </label>
                      <input
                        required
                        type="text"
                        value={editingTemplate.specialization}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, specialization: e.target.value })}
                        placeholder="e.g. Cardiology, Dermatology"
                        className="w-full border border-slate-300 dark:border-slate-600 p-2 text-xs rounded-lg focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] outline-none"
                      />
                      <p className="text-[10.5px] text-slate-400 mt-1">Must match doctor's specialty.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Template Name *
                      </label>
                      <input
                        required
                        type="text"
                        value={editingTemplate.name}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                        placeholder="e.g. CARDIOLOGY TELE TEMPLATE"
                        className="w-full border border-slate-300 dark:border-slate-600 p-2 text-xs rounded-lg focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Appointment Type *
                      </label>
                      <select
                        value={editingTemplate.appointment_type}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, appointment_type: e.target.value })}
                        className="w-full border border-slate-300 dark:border-slate-600 p-2 text-xs rounded-lg focus:ring-1 focus:ring-[#0067A1] outline-none"
                      >
                        <option value="clinic_visit">Clinic Visit / In-Person OPD</option>
                        <option value="video_consultation">Video Consultation / Telemedicine</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Fixed Clinical Sections Toggle */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold text-[#0067A1] uppercase tracking-wider border-b border-slate-100 pb-2">
                    Standard Medical Sections
                  </h4>
                  <p className="text-xs text-slate-500">
                    Enable standard prescription components. When active, these automatically integrate into the clinical workspace.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={hasFixedSection("diagnosis")} 
                        onChange={(e) => toggleFixedSection(e.target.checked, "DIAGNOSIS", "diagnosis")}
                        className="w-4 h-4 text-[#0067A1] rounded border-slate-300 focus:ring-[#0067A1]" 
                      />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Include Diagnosis</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={hasPresentingComplaints()} 
                        onChange={(e) => toggleFixedSection(e.target.checked, "PRESENTING COMPLAINTS", "presenting complaints")}
                        className="w-4 h-4 text-[#0067A1] rounded border-slate-300 focus:ring-[#0067A1]" 
                      />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Presenting Complaints</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={hasFixedSection("treatment", "rx", "medicines")} 
                        onChange={(e) => toggleFixedSection(e.target.checked, "TREATMENT (Rx)", "treatment", "rx", "medicines")} 
                        className="w-4 h-4 text-[#0067A1] rounded border-slate-300 focus:ring-[#0067A1]"
                      />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Include Medicines (Rx)</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={hasFixedSection("investigation", "lab")} 
                        onChange={(e) => toggleFixedSection(e.target.checked, "INVESTIGATIONS", "investigation", "lab")}
                        className="w-4 h-4 text-[#0067A1] rounded border-slate-300 focus:ring-[#0067A1]" 
                      />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Lab / Investigations</span>
                    </label>
                  </div>
                  
                  {hasPresentingComplaints() && (
                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900/80 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                          Default Presenting Complaints
                        </span>
                        <button
                          type="button"
                          onClick={addDefaultComplaint}
                          className="text-xs bg-[#0067A1]/10 text-[#0067A1] px-2.5 py-1 rounded font-semibold hover:bg-[#0067A1]/20 transition flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Default Row
                        </button>
                      </div>
                      <div className="space-y-2">
                        {editingTemplate.default_values?._dynamic_complaints?.map((comp, idx) => (
                          <div key={idx} className="flex flex-col sm:flex-row items-center gap-2">
                            <select
                              value={comp.complaint}
                              onChange={(e) => updateDefaultComplaint(idx, "complaint", e.target.value)}
                              className="w-full sm:w-1/2 border border-slate-300 dark:border-slate-600 p-1.5 rounded-md focus:ring-[#0067A1] focus:border-[#0067A1] outline-none text-xs"
                            >
                              <option value="">Select Symptom...</option>
                              {complaintSuggestions.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <input
                              type="text"
                              placeholder="Default Details (Optional)"
                              value={comp.details}
                              onChange={(e) => updateDefaultComplaint(idx, "details", e.target.value)}
                              className="w-full sm:w-1/2 border border-slate-300 dark:border-slate-600 p-1.5 rounded-md focus:ring-[#0067A1] focus:border-[#0067A1] outline-none text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => removeDefaultComplaint(idx)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-500">These will be pre-filled automatically when a doctor opens this template.</p>
                    </div>
                  )}
                </div>

                {/* Schema Builder */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#0067A1]" />
                        Template Schema (Custom Sections & Fields)
                      </h4>
                      <p className="text-xs text-slate-500">
                        Add specialty-specific sections (e.g. Vitals, Examination Findings, Dermoscopy, Diet Advice).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addSection}
                      className="text-xs bg-[#0067A1] text-white hover:bg-[#004F7C] px-3.5 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Section
                    </button>
                  </div>

                  {editingTemplate.template_structure.length === 0 && (
                    <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-xl bg-white dark:bg-slate-900">
                      <p className="text-xs text-slate-500 mb-2">No custom sections defined yet.</p>
                      <button
                        type="button"
                        onClick={addSection}
                        className="text-xs font-semibold text-[#0067A1] hover:underline cursor-pointer"
                      >
                        + Click to Add First Section
                      </button>
                    </div>
                  )}

                  <div className="space-y-4">
                    {editingTemplate.template_structure.map((sectionObject, sIndex) => (
                      <div key={sIndex} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xs">
                        
                        {/* Section Header */}
                        <div className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 px-4 py-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-2.5 flex-1 max-w-md">
                            <GripVertical className="w-4 h-4 text-slate-400 cursor-move" />
                            <input 
                              type="text" 
                              value={sectionObject.section} 
                              onChange={(e) => updateSectionName(sIndex, e.target.value)}
                              className="font-bold text-xs text-slate-800 dark:text-white bg-transparent border-b border-slate-300 focus:border-[#0067A1] outline-none px-1 py-0.5 w-full"
                              placeholder="Section Name (e.g. Vitals, Examination)"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => addField(sIndex)}
                              className="text-xs text-[#0067A1] hover:bg-blue-50 px-2.5 py-1 rounded border border-[#0067A1]/20 bg-white font-semibold transition cursor-pointer"
                            >
                              + Add Field
                            </button>
                            <button
                              type="button"
                              onClick={() => removeSection(sIndex)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 rounded transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Section Fields */}
                        <div className="p-3 bg-white dark:bg-slate-900">
                          {(!sectionObject.fields || sectionObject.fields.length === 0) ? (
                            <p className="text-xs text-slate-400 italic text-center py-2">No fields in this section. Click "+ Add Field" above.</p>
                          ) : (
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-slate-100 text-slate-500 text-[10.5px]">
                                  <th className="font-semibold pb-1.5 w-1/4">Label (Display)</th>
                                  <th className="font-semibold pb-1.5 w-1/4">JSON Key</th>
                                  <th className="font-semibold pb-1.5 w-1/5">Input Type</th>
                                  <th className="font-semibold pb-1.5 text-center w-1/6">Required?</th>
                                  <th className="pb-1.5"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {sectionObject.fields.map((field, fIndex) => (
                                  <tr key={fIndex} className="hover:bg-slate-50/60">
                                    <td className="py-1.5 pr-2">
                                      <input
                                        type="text"
                                        value={field.label}
                                        onChange={(e) => updateField(sIndex, fIndex, 'label', e.target.value)}
                                        placeholder="e.g. Blood Pressure"
                                        className="w-full border border-slate-200 p-1.5 rounded text-xs focus:ring-1 focus:ring-[#0067A1] outline-none"
                                      />
                                    </td>
                                    <td className="py-1.5 pr-2">
                                      <input
                                        type="text"
                                        value={field.name}
                                        onChange={(e) => updateField(sIndex, fIndex, 'name', e.target.value)}
                                        placeholder="e.g. bp"
                                        className="w-full border border-slate-200 bg-slate-50 font-mono text-[11px] p-1.5 rounded focus:ring-1 focus:ring-[#0067A1] outline-none"
                                      />
                                    </td>
                                    <td className="py-1.5 pr-2">
                                      <select
                                        value={field.type}
                                        onChange={(e) => updateField(sIndex, fIndex, 'type', e.target.value)}
                                        className="w-full border border-slate-200 p-1.5 rounded text-xs focus:ring-1 focus:ring-[#0067A1] outline-none"
                                      >
                                        <option value="text">Short Text</option>
                                        <option value="textarea">Long Text / Notes</option>
                                        <option value="number">Number</option>
                                      </select>
                                    </td>
                                    <td className="py-1.5 text-center">
                                      <input
                                        type="checkbox"
                                        checked={field.required}
                                        onChange={(e) => updateField(sIndex, fIndex, 'required', e.target.checked)}
                                        className="w-3.5 h-3.5 text-[#0067A1] rounded border-slate-300 focus:ring-[#0067A1]"
                                      />
                                    </td>
                                    <td className="py-1.5 text-right">
                                      <button
                                        type="button"
                                        onClick={() => removeField(sIndex, fIndex)}
                                        className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
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
            <div className="p-4 sm:px-6 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="templateForm"
                disabled={saving}
                className="bg-[#0067A1] hover:bg-[#004F7C] text-white px-5 py-2 rounded-lg flex items-center gap-1.5 text-xs font-semibold shadow-xs transition-colors disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Saving Schema...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Save Schema
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </main>
  );
}
