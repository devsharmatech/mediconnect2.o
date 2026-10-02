"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
  Users, Plus, Search, Phone, MapPin, Mail, Heart, Package,
  ToggleLeft, ToggleRight, Trash2, Eye, X, Check,
  RefreshCw, UserPlus, Edit, Send, FileText, Upload,
  Paperclip, ExternalLink, ShieldCheck, Building2,
  Calendar, CheckCircle2, AlertCircle, FileCheck
} from "lucide-react";

const SERVICE_CONFIG = {
  nursing: {
    label: "Home Nursing",
    sublabel: "Clinical & In-home care",
    badgeBg: "bg-sky-50 border-sky-200 text-sky-700",
    activeCard: "border-[#0067A1] bg-[#0067A1]/5 text-[#0067A1]",
    icon: Heart,
  },
  equipment: {
    label: "Medical Equipment",
    sublabel: "Rental & Distribution",
    badgeBg: "bg-purple-50 border-purple-200 text-purple-700",
    activeCard: "border-purple-600 bg-purple-50/50 text-purple-700",
    icon: Package,
  },
};

export default function AdminPartnersPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [modalTab, setModalTab] = useState("basic"); // 'basic' | 'location' | 'docs'
  const [submitting, setSubmitting] = useState(false);
  const [sendingEmailId, setSendingEmailId] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Form state
  const initialForm = {
    name: "",
    phone: "",
    email: "",
    contact_person: "",
    city: "",
    state: "",
    pincode: "",
    address: "",
    registration_number: "",
    services: ["nursing"],
    notes: "",
    is_active: true,
    documents: [],
    send_email: true,
  };

  const [form, setForm] = useState(initialForm);

  // Manual doc input in modal
  const [customDocName, setCustomDocName] = useState("");
  const [customDocUrl, setCustomDocUrl] = useState("");
  const [showManualDoc, setShowManualDoc] = useState(false);

  // Load partners list from AWS RDS PostgreSQL
  const loadPartners = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (serviceFilter !== "all") params.set("service", serviceFilter);
      const res = await fetch(`/api/admin/partners?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setPartners(data.data.partners || []);
      } else {
        toast.error(data.message || "Failed to load partners");
      }
    } catch (err) {
      console.error("Error loading partners:", err);
      toast.error("Network error while loading partners");
    } finally {
      setLoading(false);
    }
  }, [search, serviceFilter]);

  useEffect(() => {
    loadPartners();
  }, [loadPartners]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setIsEditing(false);
    setEditingId(null);
    setForm(initialForm);
    setModalTab("basic");
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (partner) => {
    setIsEditing(true);
    setEditingId(partner.id);
    let parsedDocs = [];
    try {
      if (Array.isArray(partner.documents)) {
        parsedDocs = partner.documents;
      } else if (typeof partner.documents === "string" && partner.documents.trim()) {
        parsedDocs = JSON.parse(partner.documents);
      }
    } catch {
      parsedDocs = [];
    }

    setForm({
      name: partner.name || "",
      phone: partner.phone || "",
      email: partner.email || "",
      contact_person: partner.contact_person || "",
      city: partner.city || "",
      state: partner.state || "",
      pincode: partner.pincode || "",
      address: partner.address || "",
      registration_number: partner.registration_number || "",
      services: Array.isArray(partner.services) && partner.services.length > 0 ? partner.services : ["nursing"],
      notes: partner.notes || "",
      is_active: partner.is_active !== undefined ? Boolean(partner.is_active) : true,
      documents: Array.isArray(parsedDocs) ? parsedDocs : [],
      send_email: false,
    });
    setModalTab("basic");
    setShowModal(true);
  };

  // Toggle service selection in form
  const toggleService = (svc) => {
    setForm((prev) => {
      const exists = prev.services.includes(svc);
      if (exists) {
        if (prev.services.length === 1) {
          toast.error("At least one service must be selected");
          return prev;
        }
        return { ...prev, services: prev.services.filter((s) => s !== svc) };
      } else {
        return { ...prev, services: [...prev.services, svc] };
      }
    });
  };

  // Document direct upload to S3 via signed URL
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit");
      return;
    }

    setUploadingDoc(true);
    const toastId = toast.loading(`Uploading "${file.name}"...`);

    try {
      // 1. Get presigned upload URL from S3 API
      const res = await fetch("/api/upload/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          bucket: "lab-documents",
          folder: "partner-documents",
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to generate upload URL");
      }

      const { signedUrl, publicUrl } = data.data;

      // 2. Upload file directly to S3
      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload document to cloud storage.");
      }

      // 3. Add to form documents list
      const newDoc = {
        id: "doc_" + Date.now(),
        name: file.name,
        type: file.type || "document",
        size: (file.size / 1024).toFixed(1) + " KB",
        url: publicUrl,
        uploaded_at: new Date().toISOString(),
      };

      setForm((prev) => ({
        ...prev,
        documents: [...(prev.documents || []), newDoc],
      }));

      toast.success("Document attached successfully!", { id: toastId });
    } catch (err) {
      console.error("Document upload failed:", err);
      toast.error(err.message || "Failed to upload document", { id: toastId });
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Add manual doc URL
  const handleAddManualDoc = () => {
    if (!customDocName.trim() || !customDocUrl.trim()) {
      toast.error("Document title and valid URL are required");
      return;
    }

    const newDoc = {
      id: "doc_" + Date.now(),
      name: customDocName.trim(),
      type: "external_link",
      size: "Link",
      url: customDocUrl.trim(),
      uploaded_at: new Date().toISOString(),
    };

    setForm((prev) => ({
      ...prev,
      documents: [...(prev.documents || []), newDoc],
    }));

    setCustomDocName("");
    setCustomDocUrl("");
    setShowManualDoc(false);
    toast.success("Document link added");
  };

  // Remove document from list
  const handleRemoveDoc = (index) => {
    setForm((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, idx) => idx !== index),
    }));
  };

  // Submit Add or Edit Form
  const handleSubmitForm = async (e) => {
    e?.preventDefault();

    if (!form.name.trim()) {
      toast.error("Partner / Agency name is required");
      setModalTab("basic");
      return;
    }

    const digitsOnly = String(form.phone || "").replace(/\D/g, "");
    let cleaned = digitsOnly;
    if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
      cleaned = digitsOnly.slice(2);
    }
    if (cleaned.length !== 10 || !/^[6-9]\d{9}$/.test(cleaned)) {
      toast.error("Please enter a valid 10-digit Indian mobile number");
      setModalTab("basic");
      return;
    }

    if (!form.services || form.services.length === 0) {
      toast.error("Select at least one authorized service category");
      setModalTab("basic");
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading(isEditing ? "Updating partner details..." : "Onboarding partner...");

    try {
      if (isEditing) {
        // PATCH existing partner
        const res = await fetch(`/api/admin/partners/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            phone: cleaned,
            email: form.email,
            contact_person: form.contact_person,
            city: form.city,
            state: form.state,
            pincode: form.pincode,
            address: form.address,
            registration_number: form.registration_number,
            services: form.services,
            notes: form.notes,
            is_active: form.is_active,
            documents: form.documents,
          }),
        });

        const data = await res.json();
        if (data.success) {
          toast.success("Partner profile updated successfully!", { id: toastId });
          setShowModal(false);
          loadPartners();
        } else {
          toast.error(data.message || "Failed to update partner", { id: toastId });
        }
      } else {
        // POST new partner
        const res = await fetch("/api/admin/partners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            phone: cleaned,
            email: form.email,
            contact_person: form.contact_person,
            city: form.city,
            state: form.state,
            pincode: form.pincode,
            address: form.address,
            registration_number: form.registration_number,
            services: form.services,
            notes: form.notes,
            documents: form.documents,
          }),
        });

        const data = await res.json();
        if (data.success) {
          const newPartner = data.data.partner;
          toast.success("Partner onboarded successfully!", { id: toastId });

          // Send welcome email if opted and email is provided
          if (form.send_email && form.email && newPartner?.id) {
            handleSendEmail(newPartner.id, form.email, true);
          }

          setShowModal(false);
          loadPartners();
        } else {
          toast.error(data.message || "Failed to onboard partner", { id: toastId });
        }
      }
    } catch (err) {
      console.error("Save partner error:", err);
      toast.error("Server error while saving partner", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle active/inactive
  const handleToggleActive = async (partner) => {
    const newStatus = !partner.is_active;
    try {
      const res = await fetch(`/api/admin/partners/${partner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(newStatus ? "Partner activated" : "Partner deactivated");
        setPartners((prev) =>
          prev.map((p) => (p.id === partner.id ? { ...p, is_active: newStatus } : p))
        );
      } else {
        toast.error(data.message || "Failed to update status");
      }
    } catch {
      toast.error("Network error");
    }
  };

  // Delete partner
  const handleDelete = async (partner) => {
    if (
      !confirm(
        `Are you sure you want to remove "${partner.name}"?\nThis will remove their profile and all associated lead allocations.`
      )
    ) {
      return;
    }

    const toastId = toast.loading("Removing partner...");
    try {
      const res = await fetch(`/api/admin/partners/${partner.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Partner removed successfully", { id: toastId });
        loadPartners();
      } else {
        toast.error(data.message || "Failed to delete partner", { id: toastId });
      }
    } catch {
      toast.error("Server error while deleting", { id: toastId });
    }
  };

  // Send onboarding email
  const handleSendEmail = async (partnerId, email, silent = false) => {
    if (!email) {
      toast.error("Partner does not have an email address configured. Edit the partner to add an email first.");
      return;
    }

    setSendingEmailId(partnerId);
    const toastId = !silent ? toast.loading(`Sending onboarding email to ${email}...`) : null;

    try {
      const res = await fetch(`/api/admin/partners/${partnerId}/send-email`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        if (!silent) {
          toast.success(`Welcome email sent to ${email}!`, { id: toastId });
        } else {
          toast.success(`Welcome email sent to ${email}!`);
        }
        setPartners((prev) =>
          prev.map((p) => (p.id === partnerId ? { ...p, email_sent_at: new Date().toISOString() } : p))
        );
      } else {
        if (!silent) {
          toast.error(data.message || "Failed to send email", { id: toastId });
        } else {
          toast.error(`Email dispatch notice: ${data.message}`);
        }
      }
    } catch (err) {
      console.error("Email send error:", err);
      if (!silent) toast.error("Server error sending email", { id: toastId });
    } finally {
      setSendingEmailId(null);
    }
  };

  // Filtered partners
  const filteredPartners = partners.filter((p) => {
    if (statusFilter === "active" && !p.is_active) return false;
    if (statusFilter === "inactive" && p.is_active) return false;
    return true;
  });

  // Aggregate stats
  const totalCount = partners.length;
  const activeCount = partners.filter((p) => p.is_active).length;
  const nursingCount = partners.filter((p) => (p.services || []).includes("nursing")).length;
  const equipmentCount = partners.filter((p) => (p.services || []).includes("equipment")).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <Toaster position="top-right" />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#0067A1]/10 text-[#0067A1] flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Service Partners
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Manage home nursing bureaus, medical equipment providers, documents & dispatch status
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={loadPartners}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm cursor-pointer disabled:opacity-60"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#0067A1]" : "text-slate-500"}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[#0067A1] hover:bg-[#004F7C] rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Partner</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Partners */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Partners</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{totalCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Registered agencies</p>
        </div>

        {/* Active Partners */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active & Ready</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl font-bold text-emerald-700">{activeCount}</p>
            <span className="text-xs text-emerald-600 font-medium">
              ({totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Receiving leads</p>
        </div>

        {/* Home Nursing */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Home Nursing</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
              <Heart className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-sky-700 mt-2">{nursingCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Clinical care providers</p>
        </div>

        {/* Medical Equipment */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Equipment</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-purple-700 mt-2">{equipmentCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Devices & rental partners</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search partner by name, phone, city, registration..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] placeholder-slate-400"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
              {[
                { key: "all", label: "All Services" },
                { key: "nursing", label: "Nursing" },
                { key: "equipment", label: "Equipment" },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setServiceFilter(f.key)}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                    serviceFilter === f.key
                      ? "bg-white text-[#0067A1] shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
              {[
                { key: "all", label: "All Status" },
                { key: "active", label: "Active" },
                { key: "inactive", label: "Inactive" },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => setStatusFilter(s.key)}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                    statusFilter === s.key
                      ? "bg-white text-slate-900 shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Status Count helper */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-700">{filteredPartners.length}</strong> of {totalCount} partners
          </span>
          {(search || serviceFilter !== "all" || statusFilter !== "all") && (
            <button
              onClick={() => {
                setSearch("");
                setServiceFilter("all");
                setStatusFilter("all");
              }}
              className="text-[#0067A1] hover:underline cursor-pointer"
            >
              Reset all filters
            </button>
          )}
        </div>
      </div>

      {/* Partners List / Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-[#0067A1]" />
            <p className="text-sm font-medium text-slate-600">Loading partners from AWS database...</p>
            <p className="text-xs text-slate-400 mt-1">Please wait a moment</p>
          </div>
        ) : filteredPartners.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">No Service Partners Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {search || serviceFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your search query or filter tags to find partners."
                : "No service partners have been onboarded yet. Get started by clicking 'Add Partner'."}
            </p>
            <div className="mt-4">
              <button
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[#0067A1] hover:bg-[#004F7C] rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Onboard First Partner</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                    <th className="px-5 py-3.5">Partner / Agency</th>
                    <th className="px-4 py-3.5">Contact Details</th>
                    <th className="px-4 py-3.5">City &amp; Area</th>
                    <th className="px-4 py-3.5">Services</th>
                    <th className="px-3 py-3.5 text-center">Documents</th>
                    <th className="px-3 py-3.5 text-center">Assigned</th>
                    <th className="px-4 py-3.5">Status &amp; Email</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPartners.map((partner) => {
                    const services = Array.isArray(partner.services) ? partner.services : [];
                    let partnerDocs = [];
                    try {
                      if (Array.isArray(partner.documents)) partnerDocs = partner.documents;
                      else if (typeof partner.documents === "string" && partner.documents.trim()) {
                        partnerDocs = JSON.parse(partner.documents);
                      }
                    } catch {
                      partnerDocs = [];
                    }

                    const isSendingEmail = sendingEmailId === partner.id;

                    return (
                      <tr
                        key={partner.id}
                        className="hover:bg-slate-50/60 transition-colors group"
                      >
                        {/* Partner Name & Compliance */}
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                            {partner.name}
                          </div>
                          {partner.contact_person && (
                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                              <span className="text-slate-400">Contact:</span> {partner.contact_person}
                            </div>
                          )}
                          {partner.registration_number && (
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                <ShieldCheck className="w-3 h-3 text-slate-500" />
                                {partner.registration_number}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Contact */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <Phone className="w-3.5 h-3.5 text-[#0067A1]" />
                            <a
                              href={`tel:${partner.phone}`}
                              className="hover:text-[#0067A1] hover:underline"
                            >
                              +91 {partner.phone}
                            </a>
                          </div>
                          {partner.email ? (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <a
                                href={`mailto:${partner.email}`}
                                className="hover:text-[#0067A1] hover:underline truncate max-w-[160px]"
                                title={partner.email}
                              >
                                {partner.email}
                              </a>
                            </div>
                          ) : (
                            <span className="text-xs text-amber-600/80 italic">No email</span>
                          )}
                        </td>

                        {/* City / Location */}
                        <td className="px-4 py-3.5 text-slate-600">
                          <div className="flex items-center gap-1 font-medium text-slate-700">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{partner.city || "Pan-India"}</span>
                          </div>
                          {(partner.state || partner.pincode) && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              {[partner.state, partner.pincode].filter(Boolean).join(" - ")}
                            </p>
                          )}
                        </td>

                        {/* Services */}
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-1 items-start">
                            {services.map((svcKey) => {
                              const cfg = SERVICE_CONFIG[svcKey];
                              if (!cfg) return null;
                              const Icon = cfg.icon;
                              return (
                                <span
                                  key={svcKey}
                                  className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border ${cfg.badgeBg}`}
                                >
                                  <Icon className="w-3 h-3" />
                                  {cfg.label}
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        {/* Documents count */}
                        <td className="px-3 py-3.5 text-center">
                          {partnerDocs.length > 0 ? (
                            <button
                              onClick={() => handleOpenEdit(partner)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-1 rounded-md hover:bg-indigo-100 transition-colors cursor-pointer"
                              title={`${partnerDocs.length} document(s) attached`}
                            >
                              <Paperclip className="w-3 h-3" />
                              <span>{partnerDocs.length}</span>
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>

                        {/* Assigned leads */}
                        <td className="px-3 py-3.5 text-center">
                          <button
                            onClick={() => router.push(`/admin/nursing/partners/${partner.id}`)}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                            title="Click to view assigned patient leads"
                          >
                            <span>{Number(partner.total_assigned) || 0}</span>
                          </button>
                        </td>

                        {/* Status & Email */}
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                partner.is_active
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-red-50 text-red-700 border border-red-200"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  partner.is_active ? "bg-emerald-500" : "bg-red-500"
                                }`}
                              />
                              {partner.is_active ? "Active" : "Inactive"}
                            </span>

                            {partner.email_sent_at ? (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100"
                                title={`Email sent on ${new Date(partner.email_sent_at).toLocaleString("en-IN")}`}
                              >
                                <Mail className="w-2.5 h-2.5 text-sky-500" />
                                <span>Sent</span>
                              </span>
                            ) : partner.email ? (
                              <span className="text-[10px] text-slate-400">Email pending</span>
                            ) : null}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            {/* View / Assign Leads */}
                            <button
                              onClick={() => router.push(`/admin/nursing/partners/${partner.id}`)}
                              className="p-1.5 text-slate-600 hover:text-[#0067A1] hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                              title="View Leads & Assignments"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Edit Partner */}
                            <button
                              onClick={() => handleOpenEdit(partner)}
                              className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Partner Profile & Documents"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {/* Send Welcome Email */}
                            <button
                              onClick={() => handleSendEmail(partner.id, partner.email)}
                              disabled={isSendingEmail || !partner.email}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                !partner.email
                                  ? "text-slate-300 cursor-not-allowed"
                                  : isSendingEmail
                                  ? "text-sky-500 bg-sky-50 animate-pulse"
                                  : "text-slate-600 hover:text-sky-600 hover:bg-sky-50"
                              }`}
                              title={
                                partner.email
                                  ? partner.email_sent_at
                                    ? "Resend Onboarding Welcome Email"
                                    : "Send Onboarding Welcome Email"
                                  : "No email address configured"
                              }
                            >
                              {isSendingEmail ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                            </button>

                            {/* Toggle Active */}
                            <button
                              onClick={() => handleToggleActive(partner)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                partner.is_active
                                  ? "text-emerald-600 hover:bg-emerald-50"
                                  : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                              }`}
                              title={partner.is_active ? "Deactivate Partner" : "Activate Partner"}
                            >
                              {partner.is_active ? (
                                <ToggleRight className="w-4 h-4" />
                              ) : (
                                <ToggleLeft className="w-4 h-4" />
                              )}
                            </button>

                            {/* Delete Partner */}
                            <button
                              onClick={() => handleDelete(partner)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Partner"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Cards View */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredPartners.map((partner) => {
                const services = Array.isArray(partner.services) ? partner.services : [];
                let partnerDocs = [];
                try {
                  if (Array.isArray(partner.documents)) partnerDocs = partner.documents;
                  else if (typeof partner.documents === "string" && partner.documents.trim()) {
                    partnerDocs = JSON.parse(partner.documents);
                  }
                } catch {
                  partnerDocs = [];
                }

                const isSendingEmail = sendingEmailId === partner.id;

                return (
                  <div key={partner.id} className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-slate-800 text-sm">{partner.name}</h4>
                        {partner.contact_person && (
                          <p className="text-xs text-slate-500">Contact: {partner.contact_person}</p>
                        )}
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          partner.is_active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            partner.is_active ? "bg-emerald-500" : "bg-red-500"
                          }`}
                        />
                        {partner.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {/* Services & Reg */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {services.map((s) => {
                        const cfg = SERVICE_CONFIG[s];
                        return (
                          <span
                            key={s}
                            className={`text-[10px] font-medium px-2 py-0.5 rounded border ${cfg?.badgeBg || "bg-slate-100 text-slate-600"}`}
                          >
                            {cfg?.label || s}
                          </span>
                        );
                      })}
                      {partner.registration_number && (
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          Reg: {partner.registration_number}
                        </span>
                      )}
                    </div>

                    {/* Details row */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-[#0067A1]" />
                        <a href={`tel:${partner.phone}`} className="font-medium">
                          {partner.phone}
                        </a>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{partner.city || "Pan-India"}</span>
                      </div>
                      {partner.email && (
                        <div className="col-span-2 flex items-center gap-1 text-slate-500 truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{partner.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>
                          Leads: <strong className="text-slate-700">{partner.total_assigned || 0}</strong>
                        </span>
                        {partnerDocs.length > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-indigo-600">
                            <Paperclip className="w-3 h-3" />
                            {partnerDocs.length} docs
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => router.push(`/admin/nursing/partners/${partner.id}`)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="View Leads"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(partner)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer"
                          title="Edit Partner"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {partner.email && (
                          <button
                            onClick={() => handleSendEmail(partner.id, partner.email)}
                            disabled={isSendingEmail}
                            className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg cursor-pointer"
                            title="Send Welcome Email"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleActive(partner)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="Toggle Status"
                        >
                          {partner.is_active ? (
                            <ToggleRight className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <ToggleLeft className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(partner)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ADD / EDIT PARTNER MODAL (Soft, Responsive, Tabbed SaaS Design)            */}
      {/* ========================================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#0067A1]/10 text-[#0067A1] flex items-center justify-center">
                  {isEditing ? <Edit className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-800">
                    {isEditing ? "Edit Partner Profile" : "Onboard New Partner"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {isEditing
                      ? `Updating details and compliance for ${form.name || "partner"}`
                      : "Register an agency for home nursing or equipment delivery"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 bg-slate-50/30 px-6 text-xs sm:text-sm">
              {[
                { id: "basic", label: "Basic Info & Services", icon: Users },
                { id: "location", label: "Location & Compliance", icon: Building2 },
                { id: "docs", label: `Documents (${form.documents?.length || 0})`, icon: Paperclip },
              ].map((tab) => {
                const TabIcon = tab.icon;
                const active = modalTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setModalTab(tab.id)}
                    className={`flex items-center gap-2 py-3 px-3 font-medium border-b-2 transition-all cursor-pointer ${
                      active
                        ? "border-[#0067A1] text-[#0067A1] font-semibold"
                        : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <TabIcon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitForm}>
              <div className="p-6 max-h-[62vh] overflow-y-auto space-y-5">
                {/* ------------------------------------------------------------- */}
                {/* TAB 1: BASIC INFO & SERVICES                                  */}
                {/* ------------------------------------------------------------- */}
                {modalTab === "basic" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Name */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Partner / Agency Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={form.name}
                          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder="e.g. Apollo HomeCare, CareFirst Agency"
                          className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1]"
                        />
                      </div>

                      {/* Contact Person */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Authorized Contact Person / Manager
                        </label>
                        <input
                          type="text"
                          value={form.contact_person}
                          onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))}
                          placeholder="e.g. Dr. Rajesh Sharma, Operations Head"
                          className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Phone */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Registered Phone (10 digits) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                            +91
                          </span>
                          <input
                            type="tel"
                            maxLength={10}
                            required
                            value={form.phone}
                            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                            placeholder="9876543210"
                            className="w-full pl-11 pr-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1]"
                          />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Used for sending patient leads &amp; WhatsApp dispatches
                        </p>
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Official Email Address
                        </label>
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                          placeholder="partner@example.com"
                          className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1]"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                          Required for automated onboarding email notifications
                        </p>
                      </div>
                    </div>

                    {/* Services Multi-Select */}
                    <div className="pt-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-2">
                        Authorized Services Offered <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Object.entries(SERVICE_CONFIG).map(([key, cfg]) => {
                          const Icon = cfg.icon;
                          const selected = form.services.includes(key);
                          return (
                            <div
                              key={key}
                              onClick={() => toggleService(key)}
                              className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                                selected ? cfg.activeCard : "border-slate-200 bg-white hover:border-slate-300"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                                    selected ? "bg-[#0067A1] text-white" : "bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  <Icon className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold">{cfg.label}</p>
                                  <p className="text-xs text-slate-500">{cfg.sublabel}</p>
                                </div>
                              </div>

                              <div
                                className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                  selected
                                    ? "bg-[#0067A1] border-[#0067A1] text-white"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                {selected && <Check className="w-3 h-3" strokeWidth={3} />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Onboarding Email Checkbox (Only in Add Mode) */}
                    {!isEditing && (
                      <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200/80 flex items-start gap-3 mt-2">
                        <input
                          type="checkbox"
                          id="send_email_chk"
                          checked={form.send_email}
                          onChange={(e) => setForm((f) => ({ ...f, send_email: e.target.checked }))}
                          className="mt-0.5 w-4 h-4 rounded text-[#0067A1] focus:ring-[#0067A1] border-slate-300 cursor-pointer"
                        />
                        <label htmlFor="send_email_chk" className="text-xs text-slate-700 cursor-pointer">
                          <span className="font-semibold text-slate-900 block">
                            Send Welcome &amp; Onboarding Email to Partner
                          </span>
                          Sends official MediConnect welcome credentials, service authorization letter, and
                          partner desk contact details upon saving.
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 2: LOCATION & COMPLIANCE                                  */}
                {/* ------------------------------------------------------------- */}
                {modalTab === "location" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* City */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Operational City
                        </label>
                        <input
                          type="text"
                          value={form.city}
                          onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                          placeholder="e.g. Bareilly, Delhi, Lucknow"
                          className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1]"
                        />
                      </div>

                      {/* State */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">State / UT</label>
                        <input
                          type="text"
                          value={form.state}
                          onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                          placeholder="e.g. Uttar Pradesh"
                          className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1]"
                        />
                      </div>

                      {/* Pin Code */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">PIN Code</label>
                        <input
                          type="text"
                          maxLength={6}
                          value={form.pincode}
                          onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))}
                          placeholder="243001"
                          className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1]"
                        />
                      </div>
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Clinic / Agency Registered Address
                      </label>
                      <textarea
                        rows={2}
                        value={form.address}
                        onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                        placeholder="Street, Landmark, Building name..."
                        className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] resize-none"
                      />
                    </div>

                    {/* Registration / GST Number */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Registration / GSTIN / Clinical License Number
                      </label>
                      <input
                        type="text"
                        value={form.registration_number}
                        onChange={(e) => setForm((f) => ({ ...f, registration_number: e.target.value }))}
                        placeholder="e.g. 09ABCDE1234F1Z5 or REG-NURS-2026-90"
                        className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] font-mono"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Optional official verification number for audit and compliance
                      </p>
                    </div>

                    {/* Active toggle */}
                    {isEditing && (
                      <div className="pt-2 flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Partner Active Status</p>
                          <p className="text-[11px] text-slate-500">
                            When active, this partner is eligible to receive allocated patient leads
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                          className="cursor-pointer"
                        >
                          {form.is_active ? (
                            <ToggleRight className="w-8 h-8 text-emerald-600" />
                          ) : (
                            <ToggleLeft className="w-8 h-8 text-slate-400" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 3: DOCUMENTS & NOTES                                      */}
                {/* ------------------------------------------------------------- */}
                {modalTab === "docs" && (
                  <div className="space-y-4">
                    {/* Document Manager */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-800">
                            Partner Documents &amp; Certificates
                          </label>
                          <p className="text-[11px] text-slate-500">
                            Upload GST, MOU Agreement, Trade License, or Signatory ID proofs
                          </p>
                        </div>

                        {/* Upload trigger */}
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept=".pdf,.png,.jpg,.jpeg,.webp"
                            className="hidden"
                          />
                          <button
                            type="button"
                            disabled={uploadingDoc}
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0067A1] bg-[#0067A1]/10 hover:bg-[#0067A1]/20 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>{uploadingDoc ? "Uploading..." : "Upload File"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowManualDoc((v) => !v)}
                            className="text-xs text-slate-600 hover:text-slate-900 border border-slate-200 px-2.5 py-1.5 rounded-lg cursor-pointer"
                          >
                            + Link URL
                          </button>
                        </div>
                      </div>

                      {/* Manual doc link input */}
                      {showManualDoc && (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-3 space-y-2">
                          <p className="text-xs font-semibold text-slate-700">Attach Document by URL</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={customDocName}
                              onChange={(e) => setCustomDocName(e.target.value)}
                              placeholder="Document Title (e.g. GST Certificate)"
                              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0067A1]"
                            />
                            <input
                              type="url"
                              value={customDocUrl}
                              onChange={(e) => setCustomDocUrl(e.target.value)}
                              placeholder="https://... file URL"
                              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0067A1]"
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setShowManualDoc(false)}
                              className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleAddManualDoc}
                              className="text-xs font-medium text-white bg-[#0067A1] hover:bg-[#004F7C] px-3 py-1 rounded-md"
                            >
                              Add Document
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Documents List */}
                      {form.documents && form.documents.length > 0 ? (
                        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/40">
                          {form.documents.map((doc, idx) => (
                            <div key={doc.id || idx} className="p-3 flex items-center justify-between gap-3 bg-white hover:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-800 truncate" title={doc.name}>
                                    {doc.name}
                                  </p>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                    <span>{doc.size || "Document"}</span>
                                    {doc.uploaded_at && (
                                      <span>
                                        • {new Date(doc.uploaded_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {doc.url && (
                                  <a
                                    href={doc.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 text-[#0067A1] hover:bg-sky-50 rounded-md transition-colors"
                                    title="View / Download Document"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDoc(idx)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                  title="Remove Document"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center">
                          <Paperclip className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs font-medium text-slate-600">No documents attached yet</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Click 'Upload File' above to attach PDF or image documents
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Internal Notes */}
                    <div className="pt-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Internal Administrative Notes
                      </label>
                      <textarea
                        rows={3}
                        value={form.notes}
                        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                        placeholder="Internal notes regarding partner terms, bank account details, equipment stock capacity, staff count..."
                        className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  {modalTab !== "basic" && (
                    <button
                      type="button"
                      onClick={() => setModalTab(modalTab === "docs" ? "location" : "basic")}
                      className="px-3.5 py-2 text-xs sm:text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                      Back
                    </button>
                  )}

                  {modalTab !== "docs" ? (
                    <button
                      type="button"
                      onClick={() => setModalTab(modalTab === "basic" ? "location" : "docs")}
                      className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Next Step &rarr;
                    </button>
                  ) : null}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-[#0067A1] hover:bg-[#004F7C] rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{isEditing ? "Save Changes" : "Onboard Partner"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
