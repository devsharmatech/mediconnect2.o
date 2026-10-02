"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
  ArrowLeft, Users, Phone, MapPin, Mail, Plus,
  Trash2, RefreshCw, Heart, Package, X, Check,
  AlertTriangle, ToggleLeft, ToggleRight, Edit3,
  Send, FileText, Upload, Paperclip, ExternalLink,
  ShieldCheck, Building2
} from "lucide-react";

const SERVICE_CONFIG = {
  nursing: { label: "Nursing Care", color: "bg-blue-100 text-blue-700", icon: Heart },
  equipment: { label: "Medical Equipment", color: "bg-purple-100 text-purple-700", icon: Package },
};

export default function AdminPartnerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const partnerId = params.id;

  const [partner, setPartner] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Available leads to assign
  const [availableLeads, setAvailableLeads] = useState({ nursing: [], equipment: [] });
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignLeadId, setAssignLeadId] = useState("");
  const [assignLeadType, setAssignLeadType] = useState("nursing");
  const [assigning, setAssigning] = useState(false);
  const [activeTab, setActiveTab] = useState("assigned");

  // Edit partner modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTab, setEditTab] = useState("basic");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    email: "",
    contact_person: "",
    city: "",
    state: "",
    pincode: "",
    address: "",
    registration_number: "",
    services: [],
    notes: "",
    documents: [],
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const loadPartner = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/partners/${partnerId}`);
      const data = await res.json();
      if (data.success) {
        setPartner(data.data.partner);
        setAssignments(data.data.partner.assignments || []);
      } else {
        toast.error("Failed to load partner");
        router.back();
      }
    } catch {
      toast.error("Server error");
    } finally {
      setLoading(false);
    }
  }, [partnerId, router]);

  const loadAvailableLeads = async () => {
    try {
      const [nr, eq] = await Promise.all([
        fetch("/api/nursing/leads?limit=100").then(r => r.json()),
        fetch("/api/medical-equipment/leads?limit=100").then(r => r.json()),
      ]);
      setAvailableLeads({
        nursing: nr.success ? (nr.data.leads || []) : [],
        equipment: eq.success ? (eq.data.leads || []) : [],
      });
    } catch {
      console.error("Failed to load available leads");
    }
  };

  useEffect(() => { loadPartner(); }, [loadPartner]);

  const openAssignModal = () => {
    loadAvailableLeads();
    const partnerServices = partner?.services || ["nursing"];
    // Set default lead type to the first service the partner offers
    if (!partnerServices.includes("nursing") && partnerServices.includes("equipment")) {
      setAssignLeadType("equipment");
    } else {
      setAssignLeadType("nursing");
    }
    setAssignLeadId("");
    setShowAssignModal(true);
  };

  const openEditModal = () => {
    if (!partner) return;
    let parsedDocs = [];
    try {
      if (Array.isArray(partner.documents)) parsedDocs = partner.documents;
      else if (typeof partner.documents === "string" && partner.documents.trim()) {
        parsedDocs = JSON.parse(partner.documents);
      }
    } catch {
      parsedDocs = [];
    }

    setEditForm({
      name: partner.name || "",
      phone: partner.phone || "",
      email: partner.email || "",
      contact_person: partner.contact_person || "",
      city: partner.city || "",
      state: partner.state || "",
      pincode: partner.pincode || "",
      address: partner.address || "",
      registration_number: partner.registration_number || "",
      services: partner.services || ["nursing"],
      notes: partner.notes || "",
      documents: Array.isArray(parsedDocs) ? parsedDocs : [],
    });
    setEditTab("basic");
    setShowEditModal(true);
  };

  const handleSendWelcomeEmail = async () => {
    if (!partner?.email) {
      toast.error("Partner has no registered email. Click Edit Partner to add an email address first.");
      return;
    }
    setSendingEmail(true);
    const toastId = toast.loading(`Sending onboarding email to ${partner.email}...`);
    try {
      const res = await fetch(`/api/admin/partners/${partnerId}/send-email`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Welcome email sent to ${partner.email}!`, { id: toastId });
        loadPartner();
      } else {
        toast.error(data.message || "Failed to send email", { id: toastId });
      }
    } catch {
      toast.error("Network error sending email", { id: toastId });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDocUpload = async (file) => {
    if (!file) return;
    setUploadingDoc(true);
    const toastId = toast.loading(`Uploading "${file.name}"...`);
    try {
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
      if (!data.success) throw new Error(data.message || "Upload URL failed");

      const { signedUrl, publicUrl } = data.data;
      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Cloud upload failed");

      const newDoc = {
        id: "doc_" + Date.now(),
        name: file.name,
        type: file.type || "document",
        size: (file.size / 1024).toFixed(1) + " KB",
        url: publicUrl,
        uploaded_at: new Date().toISOString(),
      };

      setEditForm((prev) => ({
        ...prev,
        documents: [...(prev.documents || []), newDoc],
      }));
      toast.success("Document uploaded & attached!", { id: toastId });
    } catch (err) {
      toast.error(err.message || "Failed to upload document", { id: toastId });
    } finally {
      setUploadingDoc(false);
    }
  };

  const toggleEditService = (service) => {
    setEditForm(prev => {
      const exists = prev.services.includes(service);
      if (exists) {
        if (prev.services.length === 1) {
          toast.error("Partner must have at least one service.");
          return prev;
        }
        return { ...prev, services: prev.services.filter(s => s !== service) };
      } else {
        return { ...prev, services: [...prev.services, service] };
      }
    });
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim() || !editForm.phone.trim()) {
      toast.error("Name and phone are required.");
      return;
    }
    if (editForm.services.length === 0) {
      toast.error("Select at least one service.");
      return;
    }

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/partners/${partnerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Partner details updated!");
        setShowEditModal(false);
        loadPartner();
      } else {
        toast.error(data.message || "Failed to update partner.");
      }
    } catch {
      toast.error("Server error");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAssign = async () => {
    if (!assignLeadId.trim()) {
      toast.error("Select or enter a lead ID");
      return;
    }
    setAssigning(true);
    try {
      const res = await fetch(`/api/admin/partners/${partnerId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: assignLeadId.trim(), lead_type: assignLeadType }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Lead assigned!");
        setShowAssignModal(false);
        setAssignLeadId("");
        loadPartner();
      } else {
        toast.error(data.message || "Failed to assign lead");
      }
    } catch {
      toast.error("Server error");
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAssignment = async (leadId, leadType) => {
    if (!confirm("Remove this lead assignment?")) return;
    try {
      const res = await fetch(`/api/admin/partners/${partnerId}/assign?lead_id=${leadId}&lead_type=${leadType}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Assignment removed");
        loadPartner();
      } else {
        toast.error(data.message || "Failed to remove");
      }
    } catch {
      toast.error("Server error");
    }
  };

  const handleToggleActive = async () => {
    try {
      const res = await fetch(`/api/admin/partners/${partnerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !partner.is_active }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(partner.is_active ? "Partner deactivated" : "Partner activated");
        loadPartner();
      } else {
        toast.error(data.message || "Failed to update");
      }
    } catch {
      toast.error("Server error");
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#0067A1]" />
          <p className="text-sm text-gray-500">Loading partner...</p>
        </div>
      </div>
    );
  }

  if (!partner) return null;

  const partnerServices = partner.services || [];
  const nursingAssignments = assignments.filter(a => a.lead_type === "nursing");
  const equipmentAssignments = assignments.filter(a => a.lead_type === "equipment");

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{partner.name}</h1>
            <p className="text-sm text-gray-500">Partner Profile & Lead Assignments</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Send Welcome Email */}
          <button
            onClick={handleSendWelcomeEmail}
            disabled={sendingEmail || !partner.email}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-xl border transition-colors cursor-pointer ${
              !partner.email
                ? "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50"
                : partner.email_sent_at
                ? "border-sky-200 text-sky-700 bg-sky-50 hover:bg-sky-100"
                : "border-[#0067A1] text-[#0067A1] bg-[#0067A1]/5 hover:bg-[#0067A1]/10"
            }`}
            title={partner.email_sent_at ? `Email sent on ${new Date(partner.email_sent_at).toLocaleString("en-IN")}` : "Send Onboarding Email"}
          >
            {sendingEmail ? (
              <RefreshCw className="w-4 h-4 animate-spin text-[#0067A1]" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{partner.email_sent_at ? "Resend Email" : "Send Welcome Email"}</span>
          </button>

          <button
            onClick={openEditModal}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <Edit3 className="w-4 h-4 text-gray-600" />
            Edit Partner
          </button>
          <button
            onClick={handleToggleActive}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-xl border transition-colors cursor-pointer ${
              partner.is_active
                ? "border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100"
                : "border-green-200 text-green-700 bg-green-50 hover:bg-green-100"
            }`}
          >
            {partner.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            {partner.is_active ? "Deactivate" : "Activate"}
          </button>
          <button
            onClick={openAssignModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#0067A1] text-white text-sm font-medium rounded-xl hover:bg-[#004F7C] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Assign Lead
          </button>
        </div>
      </div>

      {/* Partner Info Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-gray-500 mb-1">Phone</p>
            <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-[#0067A1]" /> {partner.phone}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Email</p>
            {partner.email ? (
              <div>
                <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5 truncate">
                  <Mail className="w-4 h-4 text-[#0067A1] shrink-0" /> {partner.email}
                </p>
                {partner.email_sent_at && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded mt-0.5">
                    Welcome email sent
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Not set</p>
            )}
          </div>
          {partner.contact_person && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Contact Person</p>
              <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-500" /> {partner.contact_person}
              </p>
            </div>
          )}
          {partner.registration_number && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Reg / GSTIN No.</p>
              <p className="text-xs font-mono font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded inline-flex items-center gap-1 border border-slate-200">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-500" /> {partner.registration_number}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 mb-1">City / Region</p>
            <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#0067A1]" /> {partner.city || "Pan-India"}
            </p>
            {(partner.state || partner.pincode) && (
              <p className="text-xs text-gray-400 mt-0.5">
                {[partner.state, partner.pincode].filter(Boolean).join(" - ")}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Services Offered</p>
            <div className="flex flex-wrap gap-1.5 mt-0.5">
              {partnerServices.map((s) => {
                const cfg = SERVICE_CONFIG[s];
                const Icon = cfg?.icon || Heart;
                return (
                  <span
                    key={s}
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg capitalize ${
                      cfg?.color || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {cfg?.label || s}
                  </span>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Status</p>
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg ${partner.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${partner.is_active ? "bg-green-500" : "bg-red-500"}`} />
              {partner.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Total Assigned</p>
            <p className="text-sm font-bold text-gray-800">{assignments.length} Leads</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Joined</p>
            <p className="text-sm text-gray-700">
              {new Date(partner.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          </div>
          {partner.address && (
            <div className="col-span-2">
              <p className="text-xs text-gray-500 mb-1">Registered Address</p>
              <p className="text-sm text-gray-700">{partner.address}</p>
            </div>
          )}
          {partner.notes && (
            <div className="col-span-2">
              <p className="text-xs text-gray-500 mb-1">Internal Notes</p>
              <p className="text-sm text-gray-600">{partner.notes}</p>
            </div>
          )}
        </div>

        {/* Attached Documents Row */}
        {(() => {
          let docs = [];
          try {
            if (Array.isArray(partner.documents)) docs = partner.documents;
            else if (typeof partner.documents === "string" && partner.documents.trim()) {
              docs = JSON.parse(partner.documents);
            }
          } catch {
            docs = [];
          }

          if (docs.length === 0) return null;

          return (
            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-[#0067A1]" />
                Attached Compliance Documents ({docs.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {docs.map((doc, idx) => (
                  <div
                    key={doc.id || idx}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-[#0067A1] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate" title={doc.name}>
                          {doc.name}
                        </p>
                        <p className="text-[10px] text-gray-400">{doc.size || "Document"}</p>
                      </div>
                    </div>
                    {doc.url && (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-[#0067A1] hover:bg-white rounded transition-colors shrink-0"
                        title="View Document"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Assigned Leads */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-100">
          <button
            onClick={() => setActiveTab("assigned")}
            className={`text-sm font-medium pb-1 border-b-2 transition-colors cursor-pointer ${activeTab === "assigned" ? "border-[#0067A1] text-[#0067A1]" : "border-transparent text-gray-500"}`}
          >
            All Assignments ({assignments.length})
          </button>
          {partnerServices.includes("nursing") && (
            <button
              onClick={() => setActiveTab("nursing")}
              className={`text-sm font-medium pb-1 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${activeTab === "nursing" ? "border-[#0067A1] text-[#0067A1]" : "border-transparent text-gray-500"}`}
            >
              <Heart className="w-3.5 h-3.5" /> Nursing ({nursingAssignments.length})
            </button>
          )}
          {partnerServices.includes("equipment") && (
            <button
              onClick={() => setActiveTab("equipment")}
              className={`text-sm font-medium pb-1 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${activeTab === "equipment" ? "border-[#0067A1] text-[#0067A1]" : "border-transparent text-gray-500"}`}
            >
              <Package className="w-3.5 h-3.5" /> Equipment ({equipmentAssignments.length})
            </button>
          )}
        </div>

        {assignments.length === 0 ? (
          <div className="p-12 text-center">
            <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No leads assigned yet</p>
            <p className="text-gray-400 text-sm mt-1">Click "Assign Lead" to share leads with this partner</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Lead ID</th>
                  <th className="text-left px-5 py-3 font-medium">Type</th>
                  <th className="text-left px-5 py-3 font-medium">Assigned On</th>
                  <th className="text-left px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(activeTab === "assigned"
                  ? assignments
                  : activeTab === "nursing"
                  ? nursingAssignments
                  : equipmentAssignments
                ).map((a) => (
                  <tr key={`${a.lead_type}:${a.lead_id}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-[#0067A1] font-medium">{a.lead_id}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg ${a.lead_type === "nursing" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                        {a.lead_type === "nursing" ? <Heart className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                        {a.lead_type === "nursing" ? "Nursing" : "Equipment"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {new Date(a.assigned_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => handleRemoveAssignment(a.lead_id, a.lead_type)}
                        className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                        title="Remove Assignment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Partner Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#0067A1]" />
                <h2 className="text-base font-bold text-slate-800">Edit Partner Profile</h2>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab navigation in modal */}
            <div className="flex border-b border-slate-200 bg-slate-50/30 px-6 text-xs sm:text-sm">
              {[
                { id: "basic", label: "Basic & Services", icon: Users },
                { id: "location", label: "Location & Compliance", icon: Building2 },
                { id: "docs", label: `Documents (${editForm.documents?.length || 0})`, icon: Paperclip },
              ].map((t) => {
                const TabIcon = t.icon;
                const active = editTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setEditTab(t.id)}
                    className={`flex items-center gap-1.5 py-3 px-3 font-medium border-b-2 transition-all cursor-pointer ${
                      active
                        ? "border-[#0067A1] text-[#0067A1] font-semibold"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <TabIcon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              {/* Tab 1: Basic */}
              {editTab === "basic" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Partner / Agency Name *</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1]"
                        placeholder="Agency Name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person</label>
                      <input
                        type="text"
                        value={editForm.contact_person}
                        onChange={(e) => setEditForm(f => ({ ...f, contact_person: e.target.value }))}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1]"
                        placeholder="Dr. / Manager Name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        maxLength={10}
                        value={editForm.phone}
                        onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1]"
                        placeholder="10-digit mobile"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1]"
                        placeholder="partner@example.com"
                      />
                    </div>
                  </div>

                  {/* Services Multi-Select */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Services Provided *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => toggleEditService("nursing")}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          editForm.services.includes("nursing")
                            ? "border-[#0067A1] bg-[#0067A1]/5 text-[#0067A1]"
                            : "border-slate-200 hover:border-slate-300 text-slate-700"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center border ${
                          editForm.services.includes("nursing") ? "bg-[#0067A1] border-[#0067A1] text-white" : "border-slate-300"
                        }`}>
                          {editForm.services.includes("nursing") && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 font-medium text-xs">
                            <Heart className="w-3.5 h-3.5 text-blue-600" /> Nursing Care
                          </div>
                          <p className="text-[10px] text-slate-400">Home nursing, attendant</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleEditService("equipment")}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          editForm.services.includes("equipment")
                            ? "border-[#0067A1] bg-[#0067A1]/5 text-[#0067A1]"
                            : "border-slate-200 hover:border-slate-300 text-slate-700"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center border ${
                          editForm.services.includes("equipment") ? "bg-[#0067A1] border-[#0067A1] text-white" : "border-slate-300"
                        }`}>
                          {editForm.services.includes("equipment") && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 font-medium text-xs">
                            <Package className="w-3.5 h-3.5 text-purple-600" /> Equipment
                          </div>
                          <p className="text-[10px] text-slate-400">Oxygen, ICU setup, beds</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Location */}
              {editTab === "location" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                      <input
                        type="text"
                        value={editForm.city}
                        onChange={(e) => setEditForm(f => ({ ...f, city: e.target.value }))}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1]"
                        placeholder="Service City"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                      <input
                        type="text"
                        value={editForm.state}
                        onChange={(e) => setEditForm(f => ({ ...f, state: e.target.value }))}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1]"
                        placeholder="State"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">PIN Code</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={editForm.pincode}
                        onChange={(e) => setEditForm(f => ({ ...f, pincode: e.target.value }))}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1]"
                        placeholder="Pincode"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Address</label>
                    <textarea
                      rows={2}
                      value={editForm.address}
                      onChange={(e) => setEditForm(f => ({ ...f, address: e.target.value }))}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] resize-none"
                      placeholder="Office address"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Reg / GSTIN / License Number</label>
                    <input
                      type="text"
                      value={editForm.registration_number}
                      onChange={(e) => setEditForm(f => ({ ...f, registration_number: e.target.value }))}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] font-mono"
                      placeholder="e.g. 09ABCDE1234F1Z5"
                    />
                  </div>
                </div>
              )}

              {/* Tab 3: Documents & Notes */}
              {editTab === "docs" && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-semibold text-slate-700">Documents Attached</label>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0067A1] bg-[#0067A1]/10 hover:bg-[#0067A1]/20 rounded-lg transition-colors cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingDoc ? "Uploading..." : "Upload Document"}</span>
                        <input
                          type="file"
                          disabled={uploadingDoc}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleDocUpload(file);
                          }}
                          accept=".pdf,.png,.jpg,.jpeg,.webp"
                          className="hidden"
                        />
                      </label>
                    </div>

                    {editForm.documents && editForm.documents.length > 0 ? (
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                        {editForm.documents.map((doc, idx) => (
                          <div key={doc.id || idx} className="p-2.5 flex items-center justify-between gap-2 bg-white">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-4 h-4 text-[#0067A1] shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-slate-800 truncate" title={doc.name}>
                                  {doc.name}
                                </p>
                                <p className="text-[10px] text-slate-400">{doc.size || "Document"}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {doc.url && (
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 text-[#0067A1] hover:bg-sky-50 rounded"
                                  title="View"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setEditForm(f => ({
                                    ...f,
                                    documents: f.documents.filter((_, i) => i !== idx),
                                  }))
                                }
                                className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                                title="Remove"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                        No documents attached. Click 'Upload Document' above.
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Remarks</label>
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] resize-none"
                      placeholder="Optional internal remarks about this partner..."
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-xs sm:text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <div className="flex items-center gap-2">
                {editTab !== "basic" && (
                  <button
                    type="button"
                    onClick={() => setEditTab(editTab === "docs" ? "location" : "basic")}
                    className="px-3 py-2 text-xs sm:text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Back
                  </button>
                )}
                {editTab !== "docs" ? (
                  <button
                    type="button"
                    onClick={() => setEditTab(editTab === "basic" ? "location" : "docs")}
                    className="px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    Next &rarr;
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="flex items-center gap-2 px-5 py-2 bg-[#0067A1] text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-[#004F7C] disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {savingEdit ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Lead Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">Assign Lead to {partner.name}</h2>
              <button onClick={() => setShowAssignModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Lead Type</label>
                <div className="flex gap-3">
                  {partnerServices.map((t) => (
                    <button
                      key={t}
                      onClick={() => { setAssignLeadType(t); setAssignLeadId(""); }}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors cursor-pointer capitalize ${
                        assignLeadType === t
                          ? "bg-[#0067A1] text-white border-[#0067A1]"
                          : "bg-white text-gray-600 border-gray-200 hover:border-[#0067A1]/30"
                      }`}
                    >
                      {t === "nursing" ? "🏥 Nursing" : "🩺 Equipment"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Lead ID</label>
                <input
                  type="text"
                  value={assignLeadId}
                  onChange={(e) => setAssignLeadId(e.target.value)}
                  placeholder={assignLeadType === "nursing" ? "e.g. NUR-001" : "e.g. EQ-001"}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30 font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Select from list below or enter the exact Lead ID
                </p>
              </div>

              {/* Quick pick from available leads */}
              {availableLeads[assignLeadType]?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1.5">
                    Available {assignLeadType} leads:
                  </p>
                  <div className="max-h-44 overflow-y-auto space-y-1 border border-gray-100 rounded-xl p-2">
                    {availableLeads[assignLeadType].slice(0, 15).map((lead) => (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() => setAssignLeadId(lead.lead_id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                          assignLeadId === lead.lead_id
                            ? "bg-[#0067A1]/10 text-[#0067A1] font-semibold border border-[#0067A1]/20"
                            : "hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <span className="font-mono font-medium">{lead.lead_id}</span>
                        <span className="ml-2 text-gray-500">
                          {lead.name || lead.patient_name} • {lead.city || "N/A"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssign}
                disabled={assigning || !assignLeadId.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-[#0067A1] text-white text-sm font-medium rounded-xl hover:bg-[#004F7C] disabled:opacity-60 transition-colors cursor-pointer"
              >
                {assigning ? (
                  <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Assigning...</>
                ) : (
                  <><Check className="w-4 h-4" /> Assign Lead</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
