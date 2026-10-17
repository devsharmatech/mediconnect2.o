"use client";

import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import {
  FileCheck,
  CheckCircle,
  XCircle,
  Clock,
  Upload,
  Eye,
  AlertTriangle,
  FileText,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function LabComplianceDocumentsTab({ labId }) {
  const [documents, setDocuments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState(null);
  const [updatingType, setUpdatingType] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingDoc, setEditingDoc] = useState(null);
  const [docMeta, setDocMeta] = useState({ document_number: "", expiry_date: "", remarks: "" });

  const fileInputRefs = useRef({});

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/lab/documents?lab_id=${labId}`);
      const data = await res.json();
      if (data.success) {
        setDocuments(data.data.documents || []);
        setSummary(data.data.summary || null);
      } else {
        toast.error(data.message || "Failed to load documents");
      }
    } catch {
      toast.error("Error loading compliance documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (labId) {
      fetchDocuments();
    }
  }, [labId]);

  const handleFileUpload = async (docType, file) => {
    if (!file) return;
    try {
      setUploadingType(docType);
      const formData = new FormData();
      formData.append("lab_id", labId);
      formData.append("document_type", docType);
      formData.append("file", file);

      const res = await fetch("/api/lab/documents", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Document uploaded successfully");
        fetchDocuments();
      } else {
        toast.error(data.message || "Upload failed");
      }
    } catch {
      toast.error("Error uploading file");
    } finally {
      setUploadingType(null);
    }
  };

  const handleUpdateStatus = async (doc, newStatus, reason = null) => {
    try {
      setUpdatingType(doc.document_type);
      const payload = {
        lab_id: labId,
        document_type: doc.document_type,
        verification_status: newStatus,
        verified_by: "Admin",
      };
      if (doc.id) payload.id = doc.id;
      if (newStatus === "REJECTED" && reason) payload.rejection_reason = reason;
      if (newStatus === "NOT_APPLICABLE" && reason) payload.not_applicable_reason = reason;

      const res = await fetch("/api/lab/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Status updated to ${newStatus}`);
        fetchDocuments();
      } else {
        toast.error(data.message || "Failed to update status");
      }
    } catch {
      toast.error("Error updating document status");
    } finally {
      setUpdatingType(null);
    }
  };

  const handleSaveMetadata = async (doc) => {
    try {
      setUpdatingType(doc.document_type);
      const payload = {
        lab_id: labId,
        document_type: doc.document_type,
        document_number: docMeta.document_number || null,
        expiry_date: docMeta.expiry_date || null,
        remarks: docMeta.remarks || null,
      };
      if (doc.id) payload.id = doc.id;

      const res = await fetch("/api/lab/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Document details saved");
        setEditingDoc(null);
        fetchDocuments();
      } else {
        toast.error(data.message || "Failed to save details");
      }
    } catch {
      toast.error("Error saving document details");
    } finally {
      setUpdatingType(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-8 h-8 border-4 border-[#0067A1] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const filteredDocs = documents.filter((doc) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "verified") return doc.verification_status === "VERIFIED";
    if (statusFilter === "review") return doc.verification_status === "UNDER_REVIEW" || doc.verification_status === "RECEIVED";
    if (statusFilter === "pending") return !doc.document_url && doc.verification_status !== "NOT_APPLICABLE";
    if (statusFilter === "not_applicable") return doc.verification_status === "NOT_APPLICABLE";
    return true;
  });

  const verifiedCount = summary?.verified || 0;
  const totalCount = summary?.total || 12;
  const verifiedPercentage = Math.round((verifiedCount / totalCount) * 100);

  return (
    <div className="space-y-6">
      {/* Compliance Overview Banner */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/40 rounded-xl text-[#0067A1] dark:text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                PRL Partner Compliance Registry
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Track compliance certificates, environmental consents, and regulatory licenses
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchDocuments}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer border border-gray-200 dark:border-gray-600"
            >
              <RefreshCw size={12} />
              Refresh
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              Compliance Readiness: {verifiedPercentage}%
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              {verifiedCount} of {totalCount} Verified
            </span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                verifiedPercentage >= 80 ? "bg-emerald-500" : verifiedPercentage >= 40 ? "bg-amber-500" : "bg-blue-500"
              }`}
              style={{ width: `${verifiedPercentage}%` }}
            />
          </div>
        </div>

        {/* Summary Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/60">
          <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800/80">
            <span className="text-xs text-gray-500 dark:text-gray-400 block">Total</span>
            <span className="text-base font-bold text-gray-900 dark:text-white">{summary?.total || 0}</span>
          </div>
          <div className="text-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
            <span className="text-xs text-emerald-700 dark:text-emerald-400 block">Verified</span>
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">{summary?.verified || 0}</span>
          </div>
          <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20">
            <span className="text-xs text-blue-700 dark:text-blue-400 block">In Review</span>
            <span className="text-base font-bold text-blue-600 dark:text-blue-400">{(summary?.under_review || 0) + (summary?.received || 0)}</span>
          </div>
          <div className="text-center p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20">
            <span className="text-xs text-amber-700 dark:text-amber-400 block">Uploaded</span>
            <span className="text-base font-bold text-amber-600 dark:text-amber-400">{summary?.uploaded || 0}</span>
          </div>
          <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800/80">
            <span className="text-xs text-gray-500 dark:text-gray-400 block">N/A</span>
            <span className="text-base font-bold text-gray-600 dark:text-gray-400">{summary?.not_applicable || 0}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            statusFilter === "all"
              ? "bg-[#0067A1] text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          All Items ({documents.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("verified")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            statusFilter === "verified"
              ? "bg-emerald-600 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          Verified ({summary?.verified || 0})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("review")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            statusFilter === "review"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          Review ({ (summary?.under_review || 0) + (summary?.received || 0) })
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("not_applicable")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            statusFilter === "not_applicable"
              ? "bg-gray-700 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          Not Applicable ({summary?.not_applicable || 0})
        </button>
      </div>

      {/* Documents List */}
      <div className="space-y-3">
        {filteredDocs.map((doc, index) => {
          const isUploading = uploadingType === doc.document_type;
          const isUpdating = updatingType === doc.document_type;
          const isEditing = editingDoc === doc.document_type;

          const getStatusBadge = () => {
            switch (doc.verification_status) {
              case "VERIFIED":
                return (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle size={12} />
                    Verified
                  </span>
                );
              case "UNDER_REVIEW":
                return (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    <Clock size={12} />
                    Under Review
                  </span>
                );
              case "RECEIVED":
                return (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    <FileCheck size={12} />
                    Uploaded
                  </span>
                );
              case "REJECTED":
                return (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800">
                    <XCircle size={12} />
                    Rejected
                  </span>
                );
              case "NOT_APPLICABLE":
              default:
                return (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                    Not Applicable
                  </span>
                );
            }
          };

          return (
            <div
              key={doc.document_type || index}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 transition-all hover:border-gray-300 dark:hover:border-gray-600 shadow-2xs"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left Info */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-semibold text-[#0067A1] dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                      {doc.default_authority || "Regulatory"}
                    </span>
                    {getStatusBadge()}
                    {doc.expiry_date && (
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Clock size={11} />
                        Expires: {new Date(doc.expiry_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <h5 className="text-sm font-bold text-gray-900 dark:text-white">
                    {doc.standard_title || doc.document_name}
                  </h5>

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {doc.description || "Compliance record requirement"}
                  </p>

                  {doc.document_number && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 font-mono">
                      Doc No: <span className="font-semibold">{doc.document_number}</span>
                    </p>
                  )}

                  {doc.rejection_reason && (
                    <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      Reason: {doc.rejection_reason}
                    </p>
                  )}
                </div>

                {/* Right Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* View File Link */}
                  {doc.document_url && (
                    <a
                      href={doc.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0067A1] hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
                    >
                      <Eye size={13} />
                      View
                    </a>
                  )}

                  {/* Upload File Input */}
                  <input
                    type="file"
                    ref={(el) => (fileInputRefs.current[doc.document_type] = el)}
                    onChange={(e) => handleFileUpload(doc.document_type, e.target.files[0])}
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[doc.document_type]?.click()}
                    disabled={isUploading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isUploading ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <Upload size={13} />
                    )}
                    {doc.document_url ? "Replace" : "Upload"}
                  </button>

                  {/* Verification Actions for Admin */}
                  {doc.verification_status !== "VERIFIED" && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(doc, "VERIFIED")}
                      disabled={isUpdating}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                    >
                      <CheckCircle size={13} />
                      Verify
                    </button>
                  )}

                  {doc.verification_status !== "NOT_APPLICABLE" && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(doc, "NOT_APPLICABLE", "Marked non-applicable by Admin")}
                      disabled={isUpdating}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    >
                      Mark N/A
                    </button>
                  )}

                  {doc.verification_status !== "REJECTED" && doc.document_url && (
                    <button
                      type="button"
                      onClick={() => {
                        const reason = prompt("Enter rejection reason:");
                        if (reason) handleUpdateStatus(doc, "REJECTED", reason);
                      }}
                      disabled={isUpdating}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:text-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                    >
                      Reject
                    </button>
                  )}

                  {/* Metadata Editor Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isEditing) {
                        setEditingDoc(null);
                      } else {
                        setEditingDoc(doc.document_type);
                        setDocMeta({
                          document_number: doc.document_number || "",
                          expiry_date: doc.expiry_date ? doc.expiry_date.split("T")[0] : "",
                          remarks: doc.remarks || "",
                        });
                      }
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    title="Edit Metadata"
                  >
                    {isEditing ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {/* Collapsible Metadata Form */}
              {isEditing && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/60 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Document Number
                    </label>
                    <input
                      type="text"
                      value={docMeta.document_number}
                      onChange={(e) => setDocMeta({ ...docMeta, document_number: e.target.value })}
                      placeholder="e.g. NABL/2026/091"
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={docMeta.expiry_date}
                      onChange={(e) => setDocMeta({ ...docMeta, expiry_date: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Remarks
                      </label>
                      <input
                        type="text"
                        value={docMeta.remarks}
                        onChange={(e) => setDocMeta({ ...docMeta, remarks: e.target.value })}
                        placeholder="Internal notes"
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSaveMetadata(doc)}
                      disabled={isUpdating}
                      className="px-3 py-1.5 text-xs font-semibold bg-[#0067A1] hover:bg-[#004F7C] text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
