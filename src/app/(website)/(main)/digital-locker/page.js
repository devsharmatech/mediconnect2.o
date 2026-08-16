"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FaCloudUploadAlt,
  FaFileAlt,
  FaFolderOpen,
  FaExternalLinkAlt,
  FaDownload,
  FaLock,
  FaEnvelope,
  FaShieldAlt,
  FaShareAlt,
  FaUserMd,
  FaTrash,
} from "react-icons/fa";
import { LoadingScreen } from "@/components/public-site/ui/LoadingStates";

const DOCUMENT_TYPES = [
  { value: "prescription", label: "Prescription" },
  { value: "lab_report", label: "Lab Report" },
  { value: "medical_record", label: "Medical Record" },
  { value: "health_certificate", label: "Health Certificate" },
  { value: "insurance_document", label: "Insurance Document" },
  { value: "vaccination_card", label: "Vaccination Card" },
  { value: "adharcard", label: "Aadhaar Card" },
  { value: "pancard", label: "PAN Card" },
  { value: "voter_id", label: "Voter ID" },
  { value: "driving_license", label: "Driving License" },
  { value: "passport", label: "Passport" },
  { value: "other", label: "Other" },
];

function formatBytes(bytes) {
  if (!bytes || Number.isNaN(Number(bytes))) return "—";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(Number(bytes)) / Math.log(1024)),
    sizes.length - 1,
  );
  const value = Number(bytes) / Math.pow(1024, i);
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${sizes[i]}`;
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function DigitalLockerPage() {
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [editStep, setEditStep] = useState('form'); // 'form', 'verification'
  const [editOtp, setEditOtp] = useState("");
  const [editToken, setEditToken] = useState("");
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [loadingEditDoc, setLoadingEditDoc] = useState(null); // Track which doc is being requested for edit

  const [checkingVerification, setCheckingVerification] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");

  const [file, setFile] = useState(null);
  const [documentName, setDocumentName] = useState("");
  const [documentType, setDocumentType] = useState("prescription");
  const [description, setDescription] = useState("");

  // Sharing states
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharingDoc, setSharingDoc] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorKey, setSelectedDoctorKey] = useState(""); // Stores "doctor_id:appointment_id"
  const [expiryMinutes, setExpiryMinutes] = useState("30");
  const [shareConsent, setShareConsent] = useState(false);
  const [shareSubmitting, setShareSubmitting] = useState(false);
  const [shareError, setShareError] = useState("");
  const [shareSuccess, setShareSuccess] = useState("");
  const [shares, setShares] = useState([]);
  const [activeTab, setActiveTab] = useState("documents"); // "documents" or "sharing"
  const [viewingDoc, setViewingDoc] = useState(null);
  const [deletingDoc, setDeletingDoc] = useState(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const handleDeleteDocument = async (docId) => {
    if (!docId || !userId) return;
    setDeletingLoading(true);
    try {
      const res = await fetch("/api/digital-locker/document/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: docId, user_id: userId }),
      });
      const data = await res.json();
      if (data.success) {
        setDocuments(prev => prev.filter(d => d.id !== docId));
        setDeletingDoc(null);
      } else {
        alert(data.message || "Failed to delete document");
      }
    } catch (err) {
      alert(err.message || "Something went wrong while deleting");
    } finally {
      setDeletingLoading(false);
    }
  };

  const userId = useMemo(() => {
    if (user?.id) return user.id;
    if (typeof window === "undefined") return null;
    return localStorage.getItem("userId");
  }, [user]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const userData = localStorage.getItem("userData");
    if (!userData) {
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(userData);
      setUser(parsed);
      if (parsed?.email) setEmail(String(parsed.email));
      
      const rawPhone = parsed?.phone_number || parsed?.phone || parsed?.user?.phone_number || parsed?.user?.phone || "";
      if (rawPhone) {
        setPhoneNumber(String(rawPhone));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const checkEmailStatus = async () => {
    if (!userId) return;
    setCheckingVerification(true);
    setVerificationError("");
    setVerificationMessage("");

    try {
      const res = await fetch(`/api/digital-locker/email-status/${userId}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!data?.success) {
        throw new Error(data?.message || "Failed to check verification status");
      }

      const verified = Boolean(data?.data?.verified);
      setIsEmailVerified(verified);
      
      if (data?.data?.email) {
        const val = String(data.data.email);
        if (/^\+?\d+$/.test(val.replace(/\s+/g, ""))) {
          setPhoneNumber(val);
        } else {
          setEmail(val);
        }
      }
    } catch (e) {
      setVerificationError(
        e?.message || "Failed to check verification status"
      );
      setIsEmailVerified(false);
    } finally {
      setCheckingVerification(false);
    }
  };

  const fetchDocuments = async () => {
    if (!userId) return;
    setError("");
    try {
      const res = await fetch(`/api/digital-locker/documents/${userId}`);
      const data = await res.json();
      if (!data?.success) {
        if (res.status === 403) {
          setIsEmailVerified(false);
        }
        throw new Error(data?.message || "Failed to load documents");
      }
      setDocuments(data?.data?.documents || []);
    } catch (e) {
      setError(e?.message || "Failed to load documents");
    }
  };

  useEffect(() => {
    if (!userId) return;
    checkEmailStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    if (!checkingVerification && isEmailVerified) {
      fetchDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkingVerification, isEmailVerified, userId]);

  const logAction = async (documentId, actionType) => {
    if (!userId || !documentId) return;
    if (!isEmailVerified) return;
    try {
      await fetch(`/api/digital-locker/documents/${userId}?action=log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: documentId,
          action_type: actionType,
          ip_address: null,
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        }),
      });
    } catch {
      // best-effort logging
    }
  };

  const handleFileChange = (selectedFile) => {
    setFile(selectedFile);
    if (!selectedFile) return;

    if (!documentName) {
      const baseName = selectedFile.name?.replace(/\.[^/.]+$/, "") || "";
      setDocumentName(baseName);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!userId) {
      setError("User not found. Please login again.");
      return;
    }
    if (!isEmailVerified) {
      setError("Please verify your email to use Digital Locker.");
      return;
    }
    if (!file) {
      setError("Please choose a file.");
      return;
    }
    if (!documentName.trim()) {
      setError("Please enter a document name.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("document_name", documentName.trim());
      form.append("document_type", documentType);
      form.append("description", description.trim());

      const res = await fetch(`/api/digital-locker/documents/${userId}`, {
        method: "POST",
        body: form,
      });

      const data = await res.json();
      if (!data?.success) {
        if (res.status === 403) {
          setIsEmailVerified(false);
        }
        throw new Error(data?.message || "Upload failed");
      }

      setFile(null);
      setDocumentName("");
      setDocumentType("prescription");
      setDescription("");

      await fetchDocuments();
    } catch (e) {
      setError(e?.message || "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditRequest = async (doc) => {
    setLoadingEditDoc(doc.id);
    setEditingDoc(doc);
    setDocumentName(doc.document_name);
    setDocumentType(doc.document_type);
    setDescription(doc.description || "");
    setEditError("");
    setEditSuccess("");
    setEditOtp("");
    setError(""); // Clear any stale global errors

    const phoneValue = String(phoneNumber || "").trim();
    console.log("DEBUG: handleEditRequest initiated", {
      docId: doc.id,
      userId,
      phone: phoneValue
    });

    if (!phoneValue) {
      console.error("DEBUG: Phone number is missing in state");
      setError("Registered mobile number not found. Please ensure your profile is complete.");
      setEditingDoc(null);
      setLoadingEditDoc(null);
      return;
    }

    try {
      // Step 1: Request OTP (Consolidated Route)
      const res = await fetch(`/api/digital-locker/documents/${userId}?action=requestverify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: doc.id,
          action_type: "edit"
        }),
      });
      
      const data = await res.json();
      console.log("DEBUG: requestverify response", data);

      if (!data?.success) {
        console.error("DEBUG: requestverify failed", data?.message);
        throw new Error(data?.message || "Failed to request verification");
      }
      
      // Step 2: Only proceed to verification UI if OTP was sent successfully
      setVerificationId(data.data.verification_id);
      setEditToken(data.data.verification_token); // Store token for next step
      setEditStep('verification');
      setShowAddModal(true);
      console.log("OTP requested successfully, token stored.");
    } catch (err) {
      setError(err.message); // Show error in main UI if OTP fails to send
      setEditingDoc(null);
    } finally {
      setLoadingEditDoc(null);
    }
  };

  const handleVerifyEdit = async () => {
    setSubmitting(true);
    setEditError("");
    console.log("Verifying OTP with token:", editToken);
    try {
      const res = await fetch(`/api/digital-locker/documents/${userId}?action=verifyotp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verification_token: editToken,
          otp_code: editOtp
        }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || "Invalid OTP");
      setEditToken(data.data.verification_token);
      setEditStep('form');
      setEditOtp("");
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setEditError("");
    try {
      const res = await fetch(`/api/digital-locker/documents/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: editingDoc.id,
          document_name: documentName,
          description: description,
          verification_token: editToken
        }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || "Update failed");

      setEditSuccess("Document updated successfully!");
      await fetchDocuments();
      setTimeout(() => {
        setShowAddModal(false);
        setEditingDoc(null);
        setEditStep('form');
        setEditToken("");
      }, 1500);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await fetch(`/api/digital-locker/connected-doctors?patient_id=${userId}`);
      const data = await res.json();
      if (data?.success) {
        setDoctors(data.doctors || []);
      }
    } catch (e) {
      // silently fail
    }
  };

  const handleShare = async (e) => {
    e.preventDefault();
    if (!selectedDoctorKey || !shareConsent) {
      setShareError("Please select a doctor and provide consent.");
      return;
    }

    setShareSubmitting(true);
    setShareError("");
    setShareSuccess("");

    const [doctorId, appointmentId] = selectedDoctorKey.split(":");
    const doctor = doctors.find(d => d.doctor_id === doctorId && d.appointment_id === appointmentId);

    try {
      const res = await fetch("/api/digital-locker/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: sharingDoc.id,
          patient_id: userId,
          doctor_id: doctorId,
          appointment_id: appointmentId,
          expiry_minutes: expiryMinutes,
          consent_message: `I, the patient, hereby give my consent to share this document (${sharingDoc.document_name}) with ${doctor?.doctor_name} for appointment ${appointmentId} for ${expiryMinutes} minutes.`
        }),
      });

      const data = await res.json();
      if (!data?.success) throw new Error(data?.error || "Sharing failed");

      setShareSuccess("Document shared successfully!");
      setTimeout(() => {
        setShowShareModal(false);
        setSharingDoc(null);
        setShareSuccess("");
        setSelectedDoctorKey("");
      }, 2000);
    } catch (err) {
      setShareError(err.message);
    } finally {
      setShareSubmitting(false);
    }
  };

  const fetchShares = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/digital-locker/shares?patient_id=${userId}`);
      const data = await res.json();
      if (data?.success) {
        setShares(data.shares || []);
      }
    } catch (e) {
      console.error("Failed to fetch shares history", e);
    }
  };

  const handleRevokeShare = async (shareId) => {
    if (!confirm("Are you sure you want to revoke this access?")) return;
    try {
      const res = await fetch(`/api/digital-locker/shares?share_id=${shareId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data?.success) {
        fetchShares();
      } else {
        alert(data?.error || "Failed to revoke share");
      }
    } catch (err) {
      console.error("Revoke error:", err);
    }
  };

  useEffect(() => {
    if (userId && doctors.length === 0) {
      fetchDoctors();
    }
    if (userId) {
      fetchShares();
    }
  }, [userId, doctors.length]);

  if (loading) {
    return <LoadingScreen message="Loading Digital Locker..." submessage="Preparing your secure storage" />;
  }

  if (!userId) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h1 className="text-xl font-bold text-gray-900">Digital Locker</h1>
        <p className="mt-2 text-sm text-gray-600">
          Please sign in to access your Digital Locker.
        </p>
      </div>
    );
  }

  const sendPhoneOtp = async () => {
    setVerificationError("");
    setVerificationMessage("");
    setError("");

    const phoneValue = String(phoneNumber || "").trim();
    if (!phoneValue) {
      setVerificationError("Registered mobile number not found. Please ensure your profile is complete.");
      return;
    }

    setOtpSending(true);
    try {
      const res = await fetch("/api/digital-locker/send-sms-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, phone_number: phoneValue }),
      });
      const data = await res.json();
      if (!data?.success) {
        throw new Error(data?.message || "Failed to send OTP");
      }

      setVerificationId(String(data?.data?.verification_id || ""));
      setVerificationMessage(
        data?.message || "OTP sent successfully. Please check your mobile phone."
      );
    } catch (e) {
      setVerificationError(e?.message || "Failed to send OTP");
    } finally {
      setOtpSending(false);
    }
  };

  const verifyPhoneOtp = async () => {
    setVerificationError("");
    setVerificationMessage("");
    setError("");

    const otpValue = String(otpCode || "").trim();
    if (!verificationId) {
      setVerificationError("Please request an OTP first.");
      return;
    }
    if (otpValue.length !== 6) {
      setVerificationError("Please enter a valid 6-digit OTP.");
      return;
    }

    setOtpVerifying(true);
    try {
      const res = await fetch("/api/digital-locker/verify-sms-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verification_id: verificationId,
          otp_code: otpValue,
        }),
      });
      const data = await res.json();
      if (!data?.success) {
        throw new Error(data?.message || "Failed to verify OTP");
      }

      setIsEmailVerified(true);
      setOtpCode("");
      setVerificationMessage(data?.message || "Mobile number verified successfully.");
      setShowUnlockModal(false);
      await fetchDocuments();
    } catch (e) {
      setVerificationError(e?.message || "Failed to verify OTP");
    } finally {
      setOtpVerifying(false);
    }
  };

  const closeUnlockModal = () => {
    setShowUnlockModal(false);
    setVerificationId("");
    setOtpCode("");
    setVerificationError("");
    setVerificationMessage("");
  };

  if (checkingVerification) {
    return <LoadingScreen message="Checking verification..." submessage="Verifying your email status" />;
  }

  if (!isEmailVerified) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <div className="max-w-xl mx-auto text-center">
            <div className="w-16 h-16 bg-[#0067A1]/10 rounded-2xl flex items-center justify-center mx-auto">
              <FaLock className="w-7 h-7 text-[#0067A1]" />
            </div>
            <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-gray-900">
              Digital Locker is locked
            </h1>
            <p className="mt-2 text-sm sm:text-base text-gray-600">
              For security, verify your registered mobile number with OTP to unlock upload, view,
              and download.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowUnlockModal(true);
                  setVerificationError("");
                  setVerificationMessage("");
                }}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0067A1] text-white text-sm font-semibold hover:bg-[#004F7C] transition-colors"
              >
                <FaShieldAlt className="w-4 h-4" />
                Unlock
              </button>
              <button
                type="button"
                onClick={checkEmailStatus}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Refresh status
              </button>
            </div>
          </div>
        </div>

        {showUnlockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0"
              onClick={closeUnlockModal}
            />

            <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl border border-gray-200 shadow-2xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#0067A1]/10 rounded-lg flex items-center justify-center">
                    <FaEnvelope className="w-5 h-5 text-[#0067A1]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Unlock Digital Locker
                    </h2>
                    <p className="text-sm text-gray-600">
                      Send OTP to your registered mobile number and verify.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeUnlockModal}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>

              <div className="mt-5">
                {verificationError && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {verificationError}
                  </div>
                )}
                {verificationMessage && (
                  <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                    {verificationMessage}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mobile Number
                    </label>
                    <input
                      value={phoneNumber}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-550 font-bold select-none cursor-not-allowed"
                      placeholder="Registered mobile number"
                      disabled={true}
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      Your registered mobile number from your account.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 items-center justify-between">
                    <button
                      type="button"
                      onClick={sendPhoneOtp}
                      disabled={otpSending || otpVerifying || !phoneNumber}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0067A1] text-white text-sm font-semibold hover:bg-[#004F7C] transition-colors disabled:opacity-60"
                    >
                      {otpSending ? "Sending OTP..." : "Send OTP"}
                    </button>
                    <button
                      type="button"
                      onClick={checkEmailStatus}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Refresh status
                    </button>
                  </div>

                  {verificationId && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-gray-100">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          OTP
                        </label>
                        <input
                          value={otpCode}
                          onChange={(e) =>
                            setOtpCode(
                              e.target.value.replace(/\D/g, "").slice(0, 6)
                            )
                          }
                          className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm tracking-widest"
                          placeholder="6-digit OTP"
                          inputMode="numeric"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={verifyPhoneOtp}
                          disabled={otpVerifying || otpCode.length !== 6}
                          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0067A1] text-white text-sm font-semibold hover:bg-[#004F7C] transition-colors disabled:opacity-60"
                        >
                          {otpVerifying ? "Verifying..." : "Verify"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Digital Locker</h1>
          <p className="text-sm text-slate-500 mt-0.5">Secure storage for your medical documents</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0067A1] text-white text-sm font-semibold hover:bg-[#004F7C] transition-colors shrink-0 w-full sm:w-auto"
        >
          <FaCloudUploadAlt className="w-4 h-4" />
          Add Document
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("documents")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "documents"
              ? "border-[#0067A1] text-[#0067A1]"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          Documents
        </button>
        <button
          onClick={() => setActiveTab("sharing")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "sharing"
              ? "border-[#0067A1] text-[#0067A1]"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          Sharing History
        </button>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => {
            setShowAddModal(false);
            setEditingDoc(null);
            setEditStep('form');
          }} />
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 p-5 m-4 max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {editingDoc ? "Edit Document" : "Upload Document"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {editingDoc ? "Update document details" : "Add a new medical record to your locker"}
                </p>
              </div>
              <button
                onClick={() => { setShowAddModal(false); setEditingDoc(null); setEditStep('form'); }}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {(error || editError) && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                {error || editError}
              </div>
            )}
            {editSuccess && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">
                {editSuccess}
              </div>
            )}

            {editingDoc && editStep === 'verification' ? (
              <div className="py-6 text-center space-y-4">
                <p className="text-sm font-medium text-slate-800">Verification Required</p>
                <p className="text-xs text-slate-500">Enter the 6-digit OTP sent to verify this edit.</p>
                <input
                  value={editOtp}
                  onChange={(e) => setEditOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-40 mx-auto block text-center text-lg font-bold tracking-widest rounded-lg border border-slate-200 bg-slate-50 py-2.5 focus:bg-white focus:ring-2 focus:ring-[#0067A1]/20 outline-none"
                  placeholder="------"
                />
                <button
                  onClick={handleVerifyEdit}
                  disabled={submitting || editOtp.length !== 6}
                  className="px-6 py-2 bg-[#0067A1] text-white rounded-lg text-sm font-semibold hover:bg-[#004F7C] transition-colors disabled:opacity-50"
                >
                  {submitting ? "Verifying..." : "Verify & Continue"}
                </button>
              </div>
            ) : (
              <form onSubmit={editingDoc ? handleUpdate : async (e) => { await handleUpload(e); if (!error) setShowAddModal(false); }} className="space-y-4">
                {!editingDoc && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">File</label>
                    <div className="relative group">
                      <input
                        type="file"
                        onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        accept="application/pdf,image/*"
                      />
                      <div className="flex items-center gap-3 border border-dashed border-slate-300 rounded-lg px-3 py-2.5 group-hover:border-[#0067A1] transition-colors bg-slate-50">
                        <FaCloudUploadAlt className="w-4 h-4 text-slate-400 group-hover:text-[#0067A1] shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-600 truncate">
                            {file ? file.name : "Click to select a file"}
                          </p>
                          <p className="text-[10px] text-slate-400">PDF, JPG, PNG — max 10MB</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className={editingDoc ? "sm:col-span-2" : ""}>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Document Name</label>
                    <input
                      value={documentName}
                      onChange={(e) => setDocumentName(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1]"
                      placeholder="e.g., Blood Test Report"
                    />
                  </div>

                  {!editingDoc && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Document Type</label>
                      <select
                        value={documentType}
                        onChange={(e) => setDocumentType(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1]"
                      >
                        {DOCUMENT_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Description <span className="text-slate-400 font-normal">(optional)</span></label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] resize-none"
                    placeholder="Add any notes..."
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(false); setEditingDoc(null); setEditStep('form'); }}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2 px-4 bg-[#0067A1] text-white rounded-lg text-sm font-semibold hover:bg-[#004F7C] transition-colors disabled:opacity-50"
                  >
                    {submitting ? "Processing..." : (editingDoc ? "Save Changes" : "Upload")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Content Tabs */}

      {activeTab === "documents" ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div>
              <span className="text-sm font-semibold text-slate-800">Your documents</span>
              <span className="ml-2 text-xs text-slate-400">{documents.length} file{documents.length !== 1 ? "s" : ""}</span>
            </div>
            <button
              type="button"
              onClick={fetchDocuments}
              className="text-xs text-slate-500 hover:text-[#0067A1] transition-colors font-medium"
            >
              Refresh
            </button>
          </div>

          {documents.length === 0 ? (
            <div className="py-14 px-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">No files yet</p>
              <p className="text-sm font-medium text-slate-700 mb-1">Your locker is empty</p>
              <p className="text-xs text-slate-500">Upload your first document using the Add Document button above.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {documents.map((doc) => (
                <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors">
                  {/* Doc icon */}
                  <div className="w-9 h-9 rounded-lg bg-[#0067A1]/8 border border-[#0067A1]/10 flex items-center justify-center shrink-0">
                    <FaFileAlt className="w-4 h-4 text-[#0067A1]" />
                  </div>

                  {/* Doc info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{doc.document_name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      <span className="capitalize">{doc.document_type}</span>
                      <span className="mx-1.5">·</span>
                      {formatBytes(doc.file_size)}
                      <span className="mx-1.5">·</span>
                      {formatDate(doc.upload_date || doc.created_at)}
                    </p>
                    {doc.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">{doc.description}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={loadingEditDoc === doc.id}
                      onClick={() => handleEditRequest(doc)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors"
                    >
                      {loadingEditDoc === doc.id ? (
                        <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                      ) : (
                        <FaFileAlt className="w-3 h-3" />
                      )}
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSharingDoc(doc); setShowShareModal(true); setShareError(""); setShareSuccess(""); setShareConsent(false); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-blue-200 text-xs font-medium text-[#0067A1] hover:bg-blue-50 transition-colors"
                    >
                      <FaShareAlt className="w-3 h-3" />
                      Share
                    </button>
                    <button
                      type="button"
                      onClick={() => { setViewingDoc(doc); logAction(doc.id, "viewed"); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      <FaExternalLinkAlt className="w-3 h-3" />
                      View
                    </button>
                    <a
                      href={doc.document_url}
                      download={doc.document_name || "document"}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => logAction(doc.id, "downloaded")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0067A1] text-white text-xs font-medium hover:bg-[#004F7C] transition-colors"
                    >
                      <FaDownload className="w-3 h-3" />
                      Download
                    </a>
                    <button
                      type="button"
                      onClick={() => setDeletingDoc(doc)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <FaTrash className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div>
              <span className="text-sm font-semibold text-slate-800">Sharing History</span>
              <p className="text-xs text-slate-400 mt-0.5">Track who has access to your records</p>
            </div>
            <button
              type="button"
              onClick={fetchShares}
              className="text-xs text-slate-500 hover:text-[#0067A1] transition-colors font-medium"
            >
              Refresh
            </button>
          </div>

          {shares.length === 0 ? (
            <div className="py-14 px-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">No records</p>
              <p className="text-sm font-medium text-slate-700 mb-1">No sharing history yet</p>
              <p className="text-xs text-slate-500">Records you share with doctors will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {shares.map((share) => {
                const isExpired = new Date(share.expires_at) < new Date();
                const displayStatus = share.status === "ACTIVE" && isExpired ? "EXPIRED" : share.status;

                return (
                  <div key={share.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {share.digital_locker?.document_name || "Document Unavailable"}
                        </p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
                          displayStatus === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700"
                            : displayStatus === "REVOKED"
                              ? "bg-red-50 text-red-600"
                              : "bg-slate-100 text-slate-400"
                        }`}>
                          {displayStatus}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {share.doctor_details?.full_name && (
                          <span className="font-medium text-slate-600">{share.doctor_details.full_name}</span>
                        )}
                        {share.digital_locker?.document_type && (
                          <><span className="mx-1.5">·</span>{share.digital_locker.document_type}</>
                        )}
                        <span className="mx-1.5">·</span>Expires {formatDate(share.expires_at)}
                      </p>
                    </div>
                    {displayStatus === "ACTIVE" && (
                      <button
                        onClick={() => handleRevokeShare(share.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors shrink-0"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && sharingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowShareModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-5 m-4 max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Share Document</h2>
                <p className="text-xs text-slate-400 mt-0.5">Grant your doctor temporary access</p>
              </div>
              <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {shareError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">{shareError}</div>
            )}
            {shareSuccess && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">{shareSuccess}</div>
            )}

            <div className="space-y-4">
              {/* Selected doc */}
              <div className="flex items-center gap-2.5 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <FaFileAlt className="w-4 h-4 text-slate-400 shrink-0" />
                <p className="text-sm font-medium text-slate-700 truncate">{sharingDoc.document_name}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Doctor</label>
                <select
                  value={selectedDoctorKey}
                  onChange={(e) => setSelectedDoctorKey(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1]"
                >
                  <option value="">Select a doctor...</option>
                  {doctors.map((doc) => (
                    <option key={`${doc.doctor_id}:${doc.appointment_id}`} value={`${doc.doctor_id}:${doc.appointment_id}`}>
                      {doc.doctor_name} — Appt #{doc.appointment_id.slice(-8).toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Access duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "10 min", value: "10" },
                    { label: "30 min", value: "30" },
                    { label: "1 hr", value: "60" },
                    { label: "2 hrs", value: "120" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setExpiryMinutes(opt.value)}
                      className={`py-2 rounded-lg text-xs font-medium transition-colors border ${
                        expiryMinutes === opt.value
                          ? "bg-[#0067A1] border-[#0067A1] text-white"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shareConsent}
                  onChange={(e) => setShareConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0067A1] focus:ring-[#0067A1]/20"
                />
                <span className="text-xs text-slate-500 leading-relaxed">
                  I understand this document will be shared and access will expire automatically.
                </span>
              </label>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={shareSubmitting || !shareConsent || !selectedDoctorKey}
                  onClick={handleShare}
                  className="flex-1 py-2 px-4 bg-[#0067A1] text-white rounded-lg text-sm font-semibold hover:bg-[#004F7C] transition-colors disabled:opacity-50"
                >
                  {shareSubmitting ? "Sharing..." : "Share"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document View Preview Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FaFileAlt className="w-5 h-5 text-[#0067A1]" />
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{viewingDoc.document_name}</h3>
                  <p className="text-xs text-gray-500">{viewingDoc.document_type} · {formatBytes(viewingDoc.file_size)}</p>
                </div>
              </div>
              <button onClick={() => setViewingDoc(null)} className="text-gray-400 hover:text-gray-700 text-lg font-bold">✕</button>
            </div>
            <div className="flex-1 bg-gray-100 p-4 overflow-auto flex items-center justify-center min-h-[400px]">
              {viewingDoc.document_url?.match(/\.(jpeg|jpg|png|webp|gif)/i) ? (
                <img src={viewingDoc.document_url} alt={viewingDoc.document_name} className="max-w-full max-h-[70vh] object-contain rounded-xl shadow" />
              ) : (
                <object
                  data={viewingDoc.document_url}
                  type="application/pdf"
                  className="w-full h-[65vh] rounded-xl border-none"
                >
                  <iframe
                    src={`https://docs.google.com/gview?url=${encodeURIComponent(viewingDoc.document_url)}&embedded=true`}
                    title={viewingDoc.document_name}
                    className="w-full h-[65vh] rounded-xl border-none"
                  />
                </object>
              )}
            </div>
            <div className="px-6 py-3 bg-white border-t border-gray-100 flex justify-between items-center">
              <a href={viewingDoc.document_url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[#0067A1] hover:underline flex items-center gap-1">
                <FaExternalLinkAlt className="w-3 h-3" /> Open in New Tab
              </a>
              <button onClick={() => setViewingDoc(null)} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Document Delete Confirmation Modal */}
      {deletingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-white rounded-xl shadow-xl p-5 border border-slate-200">
            <h3 className="text-base font-semibold text-slate-900 mb-1">Delete document?</h3>
            <p className="text-xs text-slate-500 mb-4">
              <strong className="text-slate-700">&quot;{deletingDoc.document_name}&quot;</strong> will be permanently removed from your locker.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeletingDoc(null)}
                className="flex-1 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingLoading}
                onClick={() => handleDeleteDocument(deletingDoc.id)}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {deletingLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note */}
      <div className="text-xs text-gray-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-gray-100">
        <span>
          Documents are stored in your Digital Locker for easy access. If you need
          help, contact support at info@mediconnect.fit.
        </span>
        {process.env.NODE_ENV === "development" && (
          <button
            type="button"
            onClick={async () => {
              if (!confirm("Reset email verification for testing? This will lock your locker again.")) return;
              try {
                const res = await fetch("/api/digital-locker/test", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ user_id: userId, test_type: "cleanup_unlock_test" }),
                });
                const data = await res.json();
                if (data.success) {
                  alert("State cleaned up successfully! Locker is now locked for this user. Page will reload.");
                  window.location.reload();
                } else {
                  alert("Failed to reset: " + data.message);
                }
              } catch (e) {
                alert("Error: " + e.message);
              }
            }}
            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg text-[10px] font-bold transition-all shrink-0 w-fit"
          >
            Reset Verification (Test Mode)
          </button>
        )}
      </div>
    </div>
  );
}
