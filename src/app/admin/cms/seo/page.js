"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Globe,
  Share2,
  Twitter,
  Code,
  Eye,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Save,
  Upload,
  Search,
  ExternalLink,
  Sparkles,
  Smartphone,
  Monitor,
  Copy,
  Plus,
  Trash2,
  Layers,
  Settings,
  HelpCircle,
} from "lucide-react";
import toast from "react-hot-toast";

const CATEGORIES = ["All", "Core", "Clinical", "Services", "Programs", "Legal", "Customized", "Inherited"];

const SCHEMA_TYPES = [
  "WebPage",
  "MedicalWebPage",
  "AboutPage",
  "ContactPage",
  "CollectionPage",
  "Article",
  "FAQPage",
  "MedicalBusiness",
  "Organization",
];

export default function SeoManagementPage() {
  const [activeView, setActiveView] = useState("pages"); // 'pages' | 'global'
  const [activeTab, setActiveTab] = useState("basic"); // 'basic' | 'og' | 'twitter' | 'schema' | 'preview'
  const [pages, setPages] = useState([]);
  const [selectedKey, setSelectedKey] = useState("home");
  const [stats, setStats] = useState({ total_pages: 0, customized: 0, inherited: 0, avg_score: 0 });
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewDevice, setPreviewDevice] = useState("desktop"); // 'desktop' | 'mobile'

  // Form states for Selected Page
  const [pageData, setPageData] = useState({
    meta_title: "",
    meta_description: "",
    meta_keywords: "",
    meta_author: "",
    canonical_url: "",
    robots: "index, follow",
    googlebot: "index, follow, max-snippet:-1, max-image-preview:large",
    og_title: "",
    og_description: "",
    og_image: "",
    og_type: "website",
    og_url: "",
    og_site_name: "MediConnect",
    og_locale: "en_US",
    twitter_card: "summary_large_image",
    twitter_title: "",
    twitter_description: "",
    twitter_image: "",
    twitter_site: "@mediconnectfit",
    schema_type: "WebPage",
    schema_json: "",
    breadcrumb_schema: "",
    article_published_time: "",
    article_modified_time: "",
    article_author: "",
    hreflang: [],
    custom_meta_tags: [],
    is_customized: false,
  });

  // Effective values (page value OR global fallback)
  const [effectiveData, setEffectiveData] = useState({});

  // Global SEO Settings
  const [globalSettings, setGlobalSettings] = useState({
    site_name: "MediConnect",
    default_meta_title: "",
    default_meta_description: "",
    default_meta_keywords: "",
    default_meta_author: "MediConnect Medical Team",
    default_og_image: "",
    default_robots: "index, follow",
    default_googlebot: "index, follow, max-snippet:-1, max-image-preview:large",
    default_og_site_name: "MediConnect",
    twitter_site: "@mediconnectfit",
    default_language: "en_US",
    default_canonical_base: "https://mediconnect.fit",
    organization_schema: "",
    website_schema: "",
  });

  const [schemaError, setSchemaError] = useState("");
  const [globalOrgSchemaError, setGlobalOrgSchemaError] = useState("");
  const [globalWebSchemaError, setGlobalWebSchemaError] = useState("");
  const fileInputRef = useRef(null);
  const globalFileInputRef = useRef(null);

  // 1. Fetch Pages List & Stats
  const fetchPageList = async () => {
    try {
      const res = await fetch(`/api/seo/list?category=${categoryFilter.toLowerCase()}&search=${encodeURIComponent(searchQuery)}`);
      const json = await res.json();
      if (json.success) {
        setPages(json.pages || []);
        if (json.stats) setStats(json.stats);
      }
    } catch (err) {
      console.error("Failed to fetch SEO pages list:", err);
    }
  };

  // 2. Fetch Selected Page Data
  const fetchSelectedPage = async (key) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/seo?page_key=${encodeURIComponent(key)}`);
      const json = await res.json();
      if (json.success) {
        const d = json.data || {};
        const eff = json.effective || {};
        setEffectiveData(eff);

        setPageData({
          meta_title: d.meta_title || "",
          meta_description: d.meta_description || "",
          meta_keywords: d.meta_keywords || "",
          meta_author: d.meta_author || "",
          canonical_url: d.canonical_url || "",
          robots: d.robots || "index, follow",
          googlebot: d.googlebot || "index, follow, max-snippet:-1, max-image-preview:large",
          og_title: d.og_title || "",
          og_description: d.og_description || "",
          og_image: d.og_image || "",
          og_type: d.og_type || "website",
          og_url: d.og_url || "",
          og_site_name: d.og_site_name || "MediConnect",
          og_locale: d.og_locale || "en_US",
          twitter_card: d.twitter_card || "summary_large_image",
          twitter_title: d.twitter_title || "",
          twitter_description: d.twitter_description || "",
          twitter_image: d.twitter_image || "",
          twitter_site: d.twitter_site || "@mediconnectfit",
          schema_type: d.schema_type || "WebPage",
          schema_json: d.schema_json ? JSON.stringify(d.schema_json, null, 2) : "",
          breadcrumb_schema: d.breadcrumb_schema ? JSON.stringify(d.breadcrumb_schema, null, 2) : "",
          article_published_time: d.article_published_time ? new Date(d.article_published_time).toISOString().slice(0, 10) : "",
          article_modified_time: d.article_modified_time ? new Date(d.article_modified_time).toISOString().slice(0, 10) : "",
          article_author: d.article_author || "",
          hreflang: Array.isArray(d.hreflang) ? d.hreflang : [],
          custom_meta_tags: Array.isArray(d.custom_meta_tags) ? d.custom_meta_tags : [],
          is_customized: Boolean(json.is_customized),
        });
      }
    } catch (err) {
      console.error("Failed to load page SEO data:", err);
      toast.error("Failed to load page SEO data.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Fetch Global Settings
  const fetchGlobalSettings = async () => {
    try {
      const res = await fetch("/api/seo/global");
      const json = await res.json();
      if (json.success && json.data) {
        const g = json.data;
        setGlobalSettings({
          site_name: g.site_name || "MediConnect",
          default_meta_title: g.default_meta_title || "",
          default_meta_description: g.default_meta_description || "",
          default_meta_keywords: g.default_meta_keywords || "",
          default_meta_author: g.default_meta_author || "MediConnect Medical Team",
          default_og_image: g.default_og_image || "",
          default_robots: g.default_robots || "index, follow",
          default_googlebot: g.default_googlebot || "index, follow, max-snippet:-1, max-image-preview:large",
          default_og_site_name: g.default_og_site_name || "MediConnect",
          twitter_site: g.twitter_site || "@mediconnectfit",
          default_language: g.default_language || "en_US",
          default_canonical_base: g.default_canonical_base || "https://mediconnect.fit",
          organization_schema: g.organization_schema ? JSON.stringify(g.organization_schema, null, 2) : "",
          website_schema: g.website_schema ? JSON.stringify(g.website_schema, null, 2) : "",
        });
      }
    } catch (err) {
      console.error("Failed to load global SEO settings:", err);
    }
  };

  useEffect(() => {
    fetchPageList();
    fetchGlobalSettings();
  }, [categoryFilter, searchQuery]);

  useEffect(() => {
    if (selectedKey) {
      fetchSelectedPage(selectedKey);
    }
  }, [selectedKey]);

  // Handle Form Change
  const handleChange = (field, value) => {
    setPageData((prev) => ({ ...prev, [field]: value }));
  };

  // Validate JSON schema
  const validateSchemaJson = (jsonString) => {
    if (!jsonString?.trim()) {
      setSchemaError("");
      return true;
    }
    try {
      JSON.parse(jsonString);
      setSchemaError("");
      return true;
    } catch (err) {
      setSchemaError(err.message);
      return false;
    }
  };

  // Image Upload Handler
  const handleImageUpload = async (e, targetField = "og_image") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, WebP).");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      toast.loading("Uploading image...", { id: "upload" });
      const res = await fetch("/api/cms/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      toast.dismiss("upload");

      if (data.success && data.url) {
        if (activeView === "global") {
          setGlobalSettings((prev) => ({ ...prev, default_og_image: data.url }));
        } else {
          handleChange(targetField, data.url);
          if (targetField === "og_image" && !pageData.twitter_image) {
            handleChange("twitter_image", data.url);
          }
        }
        toast.success("Image uploaded successfully.");
      } else {
        toast.error(data.error || "Failed to upload image.");
      }
    } catch (err) {
      toast.dismiss("upload");
      console.error("Upload error:", err);
      toast.error("Failed to upload image.");
    }
  };

  // Save Page SEO
  const handleSavePage = async () => {
    if (pageData.schema_json && !validateSchemaJson(pageData.schema_json)) {
      toast.error("Please fix invalid JSON syntax in Schema Editor.");
      setActiveTab("schema");
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        page_key: selectedKey,
        ...pageData,
      };

      const res = await fetch("/api/seo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("SEO metadata saved successfully.");
        await fetchSelectedPage(selectedKey);
        await fetchPageList();
      } else {
        toast.error(json.error || "Failed to save SEO metadata.");
      }
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save SEO metadata.");
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to Defaults
  const handleResetToDefault = async () => {
    if (!confirm("Are you sure you want to reset this page's SEO to inherit from Global Defaults?")) return;

    try {
      setIsSaving(true);
      const res = await fetch("/api/seo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_key: selectedKey, reset_to_default: true }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("SEO reset to global defaults.");
        await fetchSelectedPage(selectedKey);
        await fetchPageList();
      } else {
        toast.error(json.error || "Failed to reset SEO metadata.");
      }
    } catch (err) {
      console.error("Reset error:", err);
      toast.error("Failed to reset SEO metadata.");
    } finally {
      setIsSaving(false);
    }
  };

  // Save Global Settings
  const handleSaveGlobal = async () => {
    if (globalSettings.organization_schema) {
      try {
        JSON.parse(globalSettings.organization_schema);
        setGlobalOrgSchemaError("");
      } catch (e) {
        setGlobalOrgSchemaError(e.message);
        toast.error("Invalid Organization Schema JSON.");
        return;
      }
    }
    if (globalSettings.website_schema) {
      try {
        JSON.parse(globalSettings.website_schema);
        setGlobalWebSchemaError("");
      } catch (e) {
        setGlobalWebSchemaError(e.message);
        toast.error("Invalid Website Schema JSON.");
        return;
      }
    }

    try {
      setIsSaving(true);
      const res = await fetch("/api/seo/global", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(globalSettings),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Global SEO settings updated successfully.");
        await fetchGlobalSettings();
        await fetchPageList();
      } else {
        toast.error(json.error || "Failed to update global settings.");
      }
    } catch (err) {
      console.error("Save global error:", err);
      toast.error("Failed to update global settings.");
    } finally {
      setIsSaving(false);
    }
  };

  // Quick Copy Helpers
  const copyTitleToOg = () => {
    handleChange("og_title", pageData.meta_title || effectiveData.meta_title);
    toast.success("Copied to OG Title");
  };
  const copyDescToOg = () => {
    handleChange("og_description", pageData.meta_description || effectiveData.meta_description);
    toast.success("Copied to OG Description");
  };
  const copyOgToTwitter = () => {
    handleChange("twitter_title", pageData.og_title || pageData.meta_title);
    handleChange("twitter_description", pageData.og_description || pageData.meta_description);
    handleChange("twitter_image", pageData.og_image);
    toast.success("Copied OG Social tags to Twitter");
  };
  const generateCanonical = () => {
    const base = globalSettings.default_canonical_base || "https://mediconnect.fit";
    const path = selectedKey === "home" ? "" : `/${selectedKey}`;
    handleChange("canonical_url", `${base}${path}`);
    toast.success("Canonical URL auto-generated");
  };

  // Character Counts & Status
  const titleLen = (pageData.meta_title || effectiveData.meta_title || "").length;
  const descLen = (pageData.meta_description || effectiveData.meta_description || "").length;

  const titleStatus = titleLen === 0 ? "empty" : titleLen >= 50 && titleLen <= 60 ? "optimal" : titleLen < 50 ? "short" : "long";
  const descStatus = descLen === 0 ? "empty" : descLen >= 150 && descLen <= 160 ? "optimal" : descLen < 150 ? "short" : "long";

  // Selected Page Object from catalog
  const selectedPageObj = useMemo(() => {
    return pages.find((p) => p.key === selectedKey) || { name: selectedKey, route: `/${selectedKey}` };
  }, [pages, selectedKey]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-6 sm:pt-8 space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner / Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-[#0067A1] text-white flex items-center justify-center shadow-xs">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">SEO Management System</h1>
              <p className="text-xs text-slate-500">
                Manage metadata, social cards, JSON-LD schemas, and search appearance for every page
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher: Pages vs Global */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveView("pages")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeView === "pages" ? "bg-white text-[#0067A1] shadow-2xs border border-slate-200/60" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Page-Level SEO
          </button>
          <button
            type="button"
            onClick={() => setActiveView("global")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeView === "global" ? "bg-white text-[#0067A1] shadow-2xs border border-slate-200/60" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Global Settings
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Total Static Pages</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total_pages || pages.length}</p>
          <span className="text-[11px] text-slate-400">Indexed & manageable</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Customized Pages</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.customized}</p>
          <span className="text-[11px] text-emerald-600">Tailored metadata</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Inherited Defaults</p>
          <p className="text-2xl font-bold text-sky-600 mt-1">{stats.inherited}</p>
          <span className="text-[11px] text-sky-600">Using global settings</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Avg SEO Health Score</p>
          <p className="text-2xl font-bold text-[#0067A1] mt-1">{stats.avg_score || 85}%</p>
          <span className="text-[11px] text-slate-400">Content readiness</span>
        </div>
      </div>

      {/* VIEW 1: PAGE-LEVEL SEO EDITOR */}
      {activeView === "pages" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Page Catalog / Selector */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Select Website Page</span>
              <span className="text-[11px] font-semibold text-slate-400">{pages.length} Pages</span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search page name, route..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0067A1]"
              />
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border transition-colors ${
                    categoryFilter === cat
                      ? "bg-[#0067A1] text-white border-[#0067A1]"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Page List */}
            <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1">
              {pages.map((p) => {
                const isSelected = p.key === selectedKey;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setSelectedKey(p.key)}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex items-start justify-between gap-2 ${
                      isSelected
                        ? "bg-sky-50/60 border-[#0067A1] shadow-2xs"
                        : "bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 truncate">{p.name}</span>
                        {p.is_customized ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                            Custom
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500 shrink-0">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">{p.route}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-bold text-slate-700">{p.score}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Tab-based SEO Editor for selected page */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            {/* Editor Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">{selectedPageObj.name}</h2>
                  <span className="text-xs font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {selectedPageObj.route}
                  </span>
                  {pageData.is_customized ? (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Customized SEO
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                      Inheriting Global Defaults
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">Configure search snippet, Open Graph tags, and structured JSON-LD schema</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {pageData.is_customized && (
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    disabled={isSaving}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSavePage}
                  disabled={isSaving}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#0067A1] text-white hover:bg-[#005282] transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>

            {/* Editor Navigation Tabs */}
            <div className="border-b border-slate-200 px-5 flex items-center gap-2 overflow-x-auto bg-white">
              {[
                { id: "basic", label: "Basic SEO", icon: <Globe className="w-3.5 h-3.5" /> },
                { id: "og", label: "Open Graph", icon: <Share2 className="w-3.5 h-3.5" /> },
                { id: "twitter", label: "Twitter / X", icon: <Twitter className="w-3.5 h-3.5" /> },
                { id: "schema", label: "Schema & JSON-LD", icon: <Code className="w-3.5 h-3.5" /> },
                { id: "preview", label: "Live Previews", icon: <Eye className="w-3.5 h-3.5" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-[#0067A1] text-[#0067A1]"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB CONTENTS */}
            <div className="p-6">
              {isLoading ? (
                <div className="py-16 text-center text-slate-400 text-xs">Loading SEO details...</div>
              ) : (
                <>
                  {/* TAB 1: BASIC SEO */}
                  {activeTab === "basic" && (
                    <div className="space-y-5">
                      {/* SEO Title */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            SEO Title <span className="text-rose-500">*</span>
                          </label>
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                              titleStatus === "optimal"
                                ? "bg-emerald-100 text-emerald-700"
                                : titleStatus === "short"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {titleLen} / 60 chars {titleStatus === "optimal" ? "(Optimal)" : "(Recommended: 50–60)"}
                          </span>
                        </div>
                        <input
                          type="text"
                          value={pageData.meta_title}
                          onChange={(e) => handleChange("meta_title", e.target.value)}
                          placeholder={effectiveData.meta_title || "Enter title for search engines..."}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0067A1]"
                        />
                        <p className="text-[11px] text-slate-400">
                          Appears as the primary clickable headline in Google and Bing search results.
                        </p>
                      </div>

                      {/* Meta Description */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            Meta Description <span className="text-rose-500">*</span>
                          </label>
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                              descStatus === "optimal"
                                ? "bg-emerald-100 text-emerald-700"
                                : descStatus === "short"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {descLen} / 160 chars {descStatus === "optimal" ? "(Optimal)" : "(Recommended: 150–160)"}
                          </span>
                        </div>
                        <textarea
                          rows={3}
                          value={pageData.meta_description}
                          onChange={(e) => handleChange("meta_description", e.target.value)}
                          placeholder={effectiveData.meta_description || "Enter concise description..."}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0067A1]"
                        />
                        <p className="text-[11px] text-slate-400">
                          Summary snippet displayed under the title in search listings to encourage user click-throughs.
                        </p>
                      </div>

                      {/* Keywords & Meta Author */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-800">Meta Keywords (Optional)</label>
                          <input
                            type="text"
                            value={pageData.meta_keywords}
                            onChange={(e) => handleChange("meta_keywords", e.target.value)}
                            placeholder="e.g. doctors, lab tests, online consultation"
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0067A1]"
                          />
                          <p className="text-[11px] text-slate-400">Comma-separated keywords.</p>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-800">Meta Author</label>
                          <input
                            type="text"
                            value={pageData.meta_author}
                            onChange={(e) => handleChange("meta_author", e.target.value)}
                            placeholder={effectiveData.meta_author || "MediConnect Medical Team"}
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0067A1]"
                          />
                          <p className="text-[11px] text-slate-400">Author or organization credit.</p>
                        </div>
                      </div>

                      {/* Canonical URL */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800">Canonical URL</label>
                          <button
                            type="button"
                            onClick={generateCanonical}
                            className="text-[11px] text-[#0067A1] hover:underline font-semibold flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3" /> Auto-Fill
                          </button>
                        </div>
                        <input
                          type="url"
                          value={pageData.canonical_url}
                          onChange={(e) => handleChange("canonical_url", e.target.value)}
                          placeholder={effectiveData.canonical_url || "https://mediconnect.fit/..."}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0067A1]"
                        />
                        <p className="text-[11px] text-slate-400">
                          Specifies the definitive URL to prevent duplicate content indexing.
                        </p>
                      </div>

                      {/* Robots & Googlebot Directives */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-800">Robots Indexing</label>
                          <select
                            value={pageData.robots}
                            onChange={(e) => handleChange("robots", e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0067A1]"
                          >
                            <option value="index, follow">index, follow (Standard)</option>
                            <option value="noindex, follow">noindex, follow (Do not show in search, follow links)</option>
                            <option value="index, nofollow">index, nofollow (Index page, do not follow links)</option>
                            <option value="noindex, nofollow">noindex, nofollow (Completely hide from search)</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-800">Googlebot Instructions</label>
                          <input
                            type="text"
                            value={pageData.googlebot}
                            onChange={(e) => handleChange("googlebot", e.target.value)}
                            placeholder="index, follow, max-snippet:-1, max-image-preview:large"
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0067A1]"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: OPEN GRAPH (SOCIAL) */}
                  {activeTab === "og" && (
                    <div className="space-y-5">
                      <div className="bg-sky-50/60 border border-sky-100 rounded-lg p-3 text-xs text-sky-800 flex items-center justify-between">
                        <span>Used by WhatsApp, Facebook, LinkedIn, Slack when this link is shared.</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={copyTitleToOg}
                            className="text-[11px] bg-white px-2 py-1 rounded border border-sky-200 font-semibold hover:bg-sky-50"
                          >
                            Copy SEO Title
                          </button>
                          <button
                            type="button"
                            onClick={copyDescToOg}
                            className="text-[11px] bg-white px-2 py-1 rounded border border-sky-200 font-semibold hover:bg-sky-50"
                          >
                            Copy Description
                          </button>
                        </div>
                      </div>

                      {/* OG Title & Description */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">Open Graph Title</label>
                        <input
                          type="text"
                          value={pageData.og_title}
                          onChange={(e) => handleChange("og_title", e.target.value)}
                          placeholder={effectiveData.og_title || pageData.meta_title || "Social title..."}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0067A1]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">Open Graph Description</label>
                        <textarea
                          rows={2}
                          value={pageData.og_description}
                          onChange={(e) => handleChange("og_description", e.target.value)}
                          placeholder={effectiveData.og_description || pageData.meta_description || "Social description..."}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0067A1]"
                        />
                      </div>

                      {/* OG Image Upload & Preview */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                          <span>OG Social Share Image (1200 x 630 px recommended)</span>
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="url"
                            value={pageData.og_image}
                            onChange={(e) => handleChange("og_image", e.target.value)}
                            placeholder="https://.../og-image.png"
                            className="flex-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0067A1]"
                          />
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={(e) => handleImageUpload(e, "og_image")}
                            accept="image/*"
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3.5 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            Upload
                          </button>
                        </div>

                        {/* Image Preview */}
                        {(pageData.og_image || effectiveData.og_image) && (
                          <div className="mt-2 p-2 border border-slate-200 rounded-lg bg-slate-50 flex items-center gap-4">
                            <img
                              src={pageData.og_image || effectiveData.og_image}
                              alt="OG Preview"
                              className="w-24 h-16 object-cover rounded border border-slate-200"
                            />
                            <div className="text-[11px] text-slate-500">
                              <p className="font-semibold text-slate-800">Current Share Thumbnail</p>
                              <p className="truncate max-w-md">{pageData.og_image || effectiveData.og_image}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* OG Type & Site Name & Locale */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-800">OG Type</label>
                          <select
                            value={pageData.og_type}
                            onChange={(e) => handleChange("og_type", e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0067A1]"
                          >
                            <option value="website">website</option>
                            <option value="article">article</option>
                            <option value="profile">profile</option>
                            <option value="product">product</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-800">OG Site Name</label>
                          <input
                            type="text"
                            value={pageData.og_site_name}
                            onChange={(e) => handleChange("og_site_name", e.target.value)}
                            placeholder="MediConnect"
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0067A1]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-800">OG Locale</label>
                          <input
                            type="text"
                            value={pageData.og_locale}
                            onChange={(e) => handleChange("og_locale", e.target.value)}
                            placeholder="en_US"
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0067A1]"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: TWITTER / X */}
                  {activeTab === "twitter" && (
                    <div className="space-y-5">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 flex items-center justify-between">
                        <span>Twitter / X summary and large image card specifications.</span>
                        <button
                          type="button"
                          onClick={copyOgToTwitter}
                          className="text-[11px] bg-white px-2 py-1 rounded border border-slate-200 font-semibold hover:bg-slate-50"
                        >
                          Sync from Open Graph
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-800">Twitter Card Type</label>
                          <select
                            value={pageData.twitter_card}
                            onChange={(e) => handleChange("twitter_card", e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0067A1]"
                          >
                            <option value="summary_large_image">summary_large_image (Large Hero Card)</option>
                            <option value="summary">summary (Compact Square Thumbnail)</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-800">Twitter Site Handle</label>
                          <input
                            type="text"
                            value={pageData.twitter_site}
                            onChange={(e) => handleChange("twitter_site", e.target.value)}
                            placeholder="@mediconnectfit"
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0067A1]"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">Twitter Title</label>
                        <input
                          type="text"
                          value={pageData.twitter_title}
                          onChange={(e) => handleChange("twitter_title", e.target.value)}
                          placeholder={pageData.og_title || pageData.meta_title || "Twitter headline..."}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0067A1]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">Twitter Description</label>
                        <textarea
                          rows={2}
                          value={pageData.twitter_description}
                          onChange={(e) => handleChange("twitter_description", e.target.value)}
                          placeholder={pageData.og_description || pageData.meta_description || "Twitter post description..."}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0067A1]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">Twitter Image URL</label>
                        <input
                          type="url"
                          value={pageData.twitter_image}
                          onChange={(e) => handleChange("twitter_image", e.target.value)}
                          placeholder={pageData.og_image || "https://.../twitter-card.png"}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0067A1]"
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB 4: SCHEMA & ADVANCED */}
                  {activeTab === "schema" && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-800">Schema.org Primary Type</label>
                          <select
                            value={pageData.schema_type}
                            onChange={(e) => handleChange("schema_type", e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0067A1]"
                          >
                            {SCHEMA_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-800">Article Author (If applicable)</label>
                          <input
                            type="text"
                            value={pageData.article_author}
                            onChange={(e) => handleChange("article_author", e.target.value)}
                            placeholder="Dr. Medical Reviewer"
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0067A1]"
                          />
                        </div>
                      </div>

                      {/* Custom JSON-LD Schema Editor */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Code className="w-3.5 h-3.5 text-[#0067A1]" /> Custom JSON-LD Structured Data
                          </label>
                          <div className="flex items-center gap-2">
                            {schemaError ? (
                              <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Syntax Error
                              </span>
                            ) : pageData.schema_json ? (
                              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Valid JSON
                              </span>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => {
                                const sample = {
                                  "@context": "https://schema.org",
                                  "@type": pageData.schema_type || "WebPage",
                                  name: pageData.meta_title || effectiveData.meta_title,
                                  description: pageData.meta_description || effectiveData.meta_description,
                                  url: pageData.canonical_url || effectiveData.canonical_url,
                                };
                                handleChange("schema_json", JSON.stringify(sample, null, 2));
                                setSchemaError("");
                              }}
                              className="text-[11px] text-[#0067A1] font-semibold hover:underline"
                            >
                              Generate Sample
                            </button>
                          </div>
                        </div>
                        <textarea
                          rows={7}
                          value={pageData.schema_json}
                          onChange={(e) => {
                            handleChange("schema_json", e.target.value);
                            validateSchemaJson(e.target.value);
                          }}
                          placeholder='{"@context": "https://schema.org", "@type": "WebPage", ...}'
                          className="w-full px-3 py-2 text-xs font-mono bg-slate-900 text-emerald-400 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0067A1]"
                        />
                        {schemaError && (
                          <p className="text-[11px] text-rose-600 font-mono bg-rose-50 p-2 rounded border border-rose-200">
                            {schemaError}
                          </p>
                        )}
                      </div>

                      {/* Breadcrumb Schema */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">Breadcrumb Schema (Optional JSON)</label>
                        <textarea
                          rows={4}
                          value={pageData.breadcrumb_schema}
                          onChange={(e) => handleChange("breadcrumb_schema", e.target.value)}
                          placeholder='{"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [...]}'
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0067A1]"
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB 5: PREVIEWS & HEALTH CHECKLIST */}
                  {activeTab === "preview" && (
                    <div className="space-y-8">
                      {/* 1. Google Snippet Preview */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-[#0067A1]" /> Google Search Result Snippet
                          </h3>
                          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded border border-slate-200">
                            <button
                              type="button"
                              onClick={() => setPreviewDevice("desktop")}
                              className={`p-1 rounded text-xs ${
                                previewDevice === "desktop" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                              }`}
                            >
                              <Monitor className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewDevice("mobile")}
                              className={`p-1 rounded text-xs ${
                                previewDevice === "mobile" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                              }`}
                            >
                              <Smartphone className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Google Card Mockup */}
                        <div
                          className={`p-4 bg-white border border-slate-200 rounded-xl shadow-xs transition-all ${
                            previewDevice === "mobile" ? "max-w-md mx-auto" : "w-full"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 rounded-full bg-[#0067A1] text-white flex items-center justify-center text-[10px] font-bold">
                              M
                            </div>
                            <div className="text-[11px] text-slate-700 leading-tight">
                              <p className="font-medium text-slate-900">MediConnect</p>
                              <p className="text-slate-500 font-mono text-[10px]">
                                {pageData.canonical_url || effectiveData.canonical_url || `https://mediconnect.fit/${selectedKey}`}
                              </p>
                            </div>
                          </div>
                          <h4 className="text-base text-[#1a0dab] font-medium hover:underline cursor-pointer leading-snug line-clamp-1">
                            {pageData.meta_title || effectiveData.meta_title || "Page Title"}
                          </h4>
                          <p className="text-xs text-[#4d5156] mt-1 leading-relaxed line-clamp-2">
                            {pageData.meta_description || effectiveData.meta_description || "Add a meta description to see preview here."}
                          </p>
                        </div>
                      </div>

                      {/* 2. Open Graph / Facebook Share Preview */}
                      <div className="space-y-3">
                        <div className="pb-1 border-b border-slate-200">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <Share2 className="w-3.5 h-3.5 text-blue-600" /> Facebook & WhatsApp Social Card
                          </h3>
                        </div>

                        <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                          {pageData.og_image || effectiveData.og_image ? (
                            <img
                              src={pageData.og_image || effectiveData.og_image}
                              alt="Social preview"
                              className="w-full h-48 object-cover bg-slate-100"
                            />
                          ) : (
                            <div className="w-full h-44 bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-medium">
                              No OG Image uploaded
                            </div>
                          )}
                          <div className="p-3 bg-slate-50 border-t border-slate-100 space-y-1">
                            <p className="text-[10px] uppercase font-semibold text-slate-400 font-mono">
                              MEDICONNECT.FIT
                            </p>
                            <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-1">
                              {pageData.og_title || pageData.meta_title || effectiveData.meta_title || "Title"}
                            </h4>
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                              {pageData.og_description || pageData.meta_description || effectiveData.meta_description || "Description"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 3. SEO Health Checklist */}
                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">SEO Health Checklist</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                            <span className="text-slate-700">SEO Title Length (50–60 chars)</span>
                            {titleStatus === "optimal" ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> Optimal ({titleLen})
                              </span>
                            ) : (
                              <span className="text-amber-700 font-bold flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" /> {titleLen} chars
                              </span>
                            )}
                          </div>

                          <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                            <span className="text-slate-700">Meta Description (150–160 chars)</span>
                            {descStatus === "optimal" ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> Optimal ({descLen})
                              </span>
                            ) : (
                              <span className="text-amber-700 font-bold flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" /> {descLen} chars
                              </span>
                            )}
                          </div>

                          <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                            <span className="text-slate-700">Canonical Tag</span>
                            {pageData.canonical_url || effectiveData.canonical_url ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> Set
                              </span>
                            ) : (
                              <span className="text-rose-600 font-bold flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" /> Missing
                              </span>
                            )}
                          </div>

                          <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                            <span className="text-slate-700">Open Graph Social Image</span>
                            {pageData.og_image || effectiveData.og_image ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> Set
                              </span>
                            ) : (
                              <span className="text-amber-700 font-bold flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" /> Recommended
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: GLOBAL SEO SETTINGS */}
      {activeView === "global" && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-6">
          <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Global Website SEO Configuration</h2>
              <p className="text-xs text-slate-500">
                These defaults automatically apply whenever individual page metadata is not explicitly defined.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveGlobal}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-[#0067A1] text-white hover:bg-[#005282] transition-colors shadow-xs flex items-center gap-1.5 self-start"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? "Saving..." : "Save Global Settings"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Website Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">Website Name</label>
              <input
                type="text"
                value={globalSettings.site_name}
                onChange={(e) => setGlobalSettings({ ...globalSettings, site_name: e.target.value })}
                placeholder="MediConnect"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0067A1]"
              />
            </div>

            {/* Default Canonical Base URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">Default Canonical Base URL</label>
              <input
                type="url"
                value={globalSettings.default_canonical_base}
                onChange={(e) => setGlobalSettings({ ...globalSettings, default_canonical_base: e.target.value })}
                placeholder="https://mediconnect.fit"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0067A1]"
              />
            </div>

            {/* Default SEO Title */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-800">Default SEO Title</label>
              <input
                type="text"
                value={globalSettings.default_meta_title}
                onChange={(e) => setGlobalSettings({ ...globalSettings, default_meta_title: e.target.value })}
                placeholder="MediConnect | Trusted Healthcare & Telemedicine Platform"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0067A1]"
              />
            </div>

            {/* Default Meta Description */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-800">Default Meta Description</label>
              <textarea
                rows={3}
                value={globalSettings.default_meta_description}
                onChange={(e) => setGlobalSettings({ ...globalSettings, default_meta_description: e.target.value })}
                placeholder="Book verified doctors, lab tests, medicine delivery, and digital health records..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0067A1]"
              />
            </div>

            {/* Default Keywords & Author */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">Default Meta Keywords</label>
              <input
                type="text"
                value={globalSettings.default_meta_keywords}
                onChange={(e) => setGlobalSettings({ ...globalSettings, default_meta_keywords: e.target.value })}
                placeholder="healthcare, doctor consultation, lab tests, ABHA"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0067A1]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">Default Meta Author</label>
              <input
                type="text"
                value={globalSettings.default_meta_author}
                onChange={(e) => setGlobalSettings({ ...globalSettings, default_meta_author: e.target.value })}
                placeholder="MediConnect Medical Team"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0067A1]"
              />
            </div>

            {/* Default OG Image */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-800">Default OG Social Image</label>
              <div className="flex items-center gap-3">
                <input
                  type="url"
                  value={globalSettings.default_og_image}
                  onChange={(e) => setGlobalSettings({ ...globalSettings, default_og_image: e.target.value })}
                  placeholder="https://mediconnect.fit/images/og-default.png"
                  className="flex-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0067A1]"
                />
                <input
                  type="file"
                  ref={globalFileInputRef}
                  onChange={(e) => handleImageUpload(e, "default_og_image")}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => globalFileInputRef.current?.click()}
                  className="px-3.5 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload
                </button>
              </div>
            </div>

            {/* Default Robots Policy & Twitter Handle */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">Default Robots Policy</label>
              <input
                type="text"
                value={globalSettings.default_robots}
                onChange={(e) => setGlobalSettings({ ...globalSettings, default_robots: e.target.value })}
                placeholder="index, follow"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0067A1]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">Twitter / X Site Handle</label>
              <input
                type="text"
                value={globalSettings.twitter_site}
                onChange={(e) => setGlobalSettings({ ...globalSettings, twitter_site: e.target.value })}
                placeholder="@mediconnectfit"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0067A1]"
              />
            </div>

            {/* Organization Schema */}
            <div className="space-y-1.5 md:col-span-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">Organization Schema (JSON-LD)</label>
                {globalOrgSchemaError && (
                  <span className="text-[11px] text-rose-600 font-bold">{globalOrgSchemaError}</span>
                )}
              </div>
              <textarea
                rows={6}
                value={globalSettings.organization_schema}
                onChange={(e) => setGlobalSettings({ ...globalSettings, organization_schema: e.target.value })}
                placeholder='{"@context": "https://schema.org", "@type": "MedicalOrganization", ...}'
                className="w-full px-3 py-2 text-xs font-mono bg-slate-900 text-emerald-400 rounded-lg border border-slate-700 focus:outline-none focus:border-[#0067A1]"
              />
            </div>

            {/* Website Schema */}
            <div className="space-y-1.5 md:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">Website Schema (JSON-LD)</label>
                {globalWebSchemaError && (
                  <span className="text-[11px] text-rose-600 font-bold">{globalWebSchemaError}</span>
                )}
              </div>
              <textarea
                rows={6}
                value={globalSettings.website_schema}
                onChange={(e) => setGlobalSettings({ ...globalSettings, website_schema: e.target.value })}
                placeholder='{"@context": "https://schema.org", "@type": "WebSite", ...}'
                className="w-full px-3 py-2 text-xs font-mono bg-slate-900 text-emerald-400 rounded-lg border border-slate-700 focus:outline-none focus:border-[#0067A1]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
