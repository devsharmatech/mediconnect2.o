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
      console.log("Fetching doctors for patient:", userId);
      const res = await fetch(`/api/digital-locker/connected-doctors?patient_id=${userId}`);
      const data = await res.json();
      console.log("Doctors fetched:", data);
      if (data?.success) {
        setDoctors(data.doctors || []);
      }
    } catch (e) {
      console.error("Failed to fetch connected doctors", e);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#0067A1]/10 rounded-xl flex items-center justify-center shrink-0">
              <FaLock className="w-6 h-6 text-[#0067A1]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Digital Locker
              </h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">
                Store and access your documents securely in MediConnect.fit.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0067A1] text-white text-sm font-semibold hover:bg-[#004F7C] shadow-lg shadow-[#0067A1]/20 transition-all active:scale-95 w-full sm:w-auto shrink-0"
          >
            <FaCloudUploadAlt className="w-4 h-4" />
            Add Document
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-6 p-1 bg-gray-100 rounded-2xl w-full sm:w-fit">
          <button
            onClick={() => setActiveTab("documents")}
            className={`flex-1 sm:flex-initial text-center px-3 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === "documents"
              ? "bg-white text-[#0067A1] shadow-sm"
              : "text-gray-500 hover:text-gray-700"
              }`}
          >
            Documents
          </button>
          <button
            onClick={() => setActiveTab("sharing")}
            className={`flex-1 sm:flex-initial text-center px-3 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === "sharing"
              ? "bg-white text-[#0067A1] shadow-sm"
              : "text-gray-500 hover:text-gray-700"
              }`}
          >
            Sharing History
          </button>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => {
            setShowAddModal(false);
            setEditingDoc(null);
            setEditStep('form');
          }} />
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 sm:p-8 m-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-8 sticky top-0 bg-white z-20 pb-4 border-b border-gray-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#0067A1]/10 rounded-2xl flex items-center justify-center shrink-0">
                  {editingDoc ? <FaFileAlt className="w-5 h-5 sm:w-6 sm:h-6 text-[#0067A1]" /> : <FaCloudUploadAlt className="w-5 h-5 sm:w-6 sm:h-6 text-[#0067A1]" />}
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                    {editingDoc ? "Edit Document" : "Upload Document"}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 font-medium">
                    {editingDoc ? "Securely update record details" : "Securely add new medical records"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingDoc(null);
                  setEditStep('form');
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <span className="sr-only">Close</span>
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            {(error || editError) && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-bold flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                {error || editError}
              </div>
            )}
            {editSuccess && (
              <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 font-bold flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                {editSuccess}
              </div>
            )}

            {editingDoc && editStep === 'verification' ? (
              <div className="space-y-6 text-center py-4">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaShieldAlt className="w-8 h-8 text-[#0067A1]" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Verification Required</h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                  For your security, please enter the 6-digit OTP sent to your email to authorize this edit.
                </p>
                <div className="max-w-xs mx-auto">
                  <input
                    value={editOtp}
                    onChange={(e) => setEditOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full text-center text-2xl font-black tracking-[1em] rounded-2xl border border-gray-100 bg-slate-50 p-5 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                    placeholder="••••••"
                  />
                  <button
                    onClick={handleVerifyEdit}
                    disabled={submitting || editOtp.length !== 6}
                    className="w-full mt-6 py-4 px-6 bg-[#0067A1] text-white rounded-2xl text-sm font-black shadow-xl shadow-[#0067A1]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {submitting ? "Verifying..." : "Verify & Continue"}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={editingDoc ? handleUpdate : async (e) => {
                await handleUpload(e);
                if (!error) setShowAddModal(false);
              }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {!editingDoc && (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">1. Select File</label>
                      <div className="relative group">
                        <input
                          type="file"
                          onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          accept="application/pdf,image/*"
                        />
                        <div className="w-full border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 group-hover:border-[#0067A1] transition-all bg-slate-50/50">
                          <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center">
                            <FaCloudUploadAlt className="w-5 h-5 text-gray-400 group-hover:text-[#0067A1]" />
                          </div>
                          <p className="text-sm font-bold text-gray-600">
                            {file ? file.name : "Drag and drop or click to browse"}
                          </p>
                          <p className="text-xs text-gray-400 font-medium">Supported: PDF, JPG, PNG (Max 10MB)</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className={editingDoc ? "md:col-span-2" : ""}>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                      {editingDoc ? "Document Name" : "2. Document Name"}
                    </label>
                    <input
                      value={documentName}
                      onChange={(e) => setDocumentName(e.target.value)}
                      className="w-full rounded-2xl border border-gray-100 bg-slate-50 p-4 text-sm font-medium focus:bg-white focus:ring-4 focus:ring-[#0067A1]/5 transition-all outline-none"
                      placeholder="e.g., Blood Test Report"
                    />
                  </div>

                  {!editingDoc && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">3. Document Type</label>
                      <select
                        value={documentType}
                        onChange={(e) => setDocumentType(e.target.value)}
                        className="w-full rounded-2xl border border-gray-100 bg-slate-50 p-4 text-sm font-medium focus:bg-white focus:ring-4 focus:ring-[#0067A1]/5 transition-all outline-none"
                      >
                        {DOCUMENT_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                      {editingDoc ? "Description (Optional)" : "4. Description (Optional)"}
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full rounded-2xl border border-gray-100 bg-slate-50 p-4 text-sm font-medium focus:bg-white focus:ring-4 focus:ring-[#0067A1]/5 transition-all outline-none resize-none"
                      placeholder="Add helpful notes here..."
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingDoc(null);
                      setEditStep('form');
                    }}
                    className="flex-1 py-4 px-6 border-2 border-gray-100 rounded-2xl text-sm font-bold text-gray-400 hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-[2] py-4 px-6 bg-[#0067A1] text-white rounded-2xl text-sm font-black shadow-xl shadow-[#0067A1]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {submitting ? "Processing..." : (editingDoc ? "Save Changes" : "Complete Upload")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Content Tabs */}

      {activeTab === "documents" ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0067A1]/10 rounded-lg flex items-center justify-center">
                <FaFolderOpen className="w-5 h-5 text-[#0067A1]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Your documents
                </h2>
                <p className="text-sm text-gray-600">
                  {documents.length} document{documents.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchDocuments}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>

          {documents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center">
              <FaFileAlt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-700 font-medium">No documents yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Upload your first document to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-2xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {doc.document_name}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <span className="font-medium text-gray-700">Type:</span>
                        {doc.document_type}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="font-medium text-gray-700">Size:</span>
                        {formatBytes(doc.file_size)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="font-medium text-gray-700">Uploaded:</span>
                        {formatDate(doc.upload_date || doc.created_at)}
                      </span>
                    </div>
                    {doc.description && (
                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                        {doc.description}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:flex-row sm:w-auto shrink-0 mt-3 sm:mt-0">
                    <button
                      type="button"
                      disabled={loadingEditDoc === doc.id}
                      onClick={() => handleEditRequest(doc)}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 w-full sm:w-auto"
                    >
                      {loadingEditDoc === doc.id ? (
                        <>
                          <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <FaFileAlt className="w-3.5 h-3.5" />
                          Edit
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSharingDoc(doc);
                        setShowShareModal(true);
                        setShareError("");
                        setShareSuccess("");
                        setShareConsent(false);
                      }}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-blue-200 text-xs sm:text-sm font-medium text-[#004F7C] hover:bg-blue-50 w-full sm:w-auto"
                    >
                      <FaShareAlt className="w-3.5 h-3.5" />
                      Share
                    </button>
                    <a
                      href={doc.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => logAction(doc.id, "viewed")}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto"
                    >
                      <FaExternalLinkAlt className="w-3.5 h-3.5" />
                      View
                    </a>
                    <a
                      href={doc.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => logAction(doc.id, "downloaded")}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#0067A1] text-white text-xs sm:text-sm font-semibold hover:bg-[#004F7C] w-full sm:w-auto"
                    >
                      <FaDownload className="w-3.5 h-3.5" />
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0067A1]/10 rounded-lg flex items-center justify-center">
                <FaShareAlt className="w-5 h-5 text-[#0067A1]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Sharing History
                </h2>
                <p className="text-sm text-gray-600">
                  Track who has access to your medical records
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchShares}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>

          {shares.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center">
              <FaShareAlt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-700 font-medium">No sharing history</p>
              <p className="text-sm text-gray-500 mt-1">
                Records you share with doctors will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {shares.map((share) => {
                const isExpired = new Date(share.expires_at) < new Date();
                const displayStatus = share.status === "ACTIVE" && isExpired ? "EXPIRED" : share.status;

                return (
                  <div
                    key={share.id}
                    className="rounded-2xl border border-gray-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:border-gray-300 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {share.digital_locker?.document_name || "Document Unavailable"}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase ${displayStatus === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          : displayStatus === "REVOKED"
                            ? "bg-red-50 text-red-600 border border-red-100"
                            : "bg-gray-50 text-gray-400 border border-gray-100"
                          }`}>
                          {displayStatus}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <FaUserMd className="w-3 h-3" />
                          <span className="font-bold text-gray-700">{share.doctor_details?.full_name}</span>
                        </span>
                        {share.digital_locker && (
                          <>
                            <span className="flex items-center gap-1.5">
                              <span className="font-medium text-gray-400">Type:</span>
                              {share.digital_locker.document_type}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="font-medium text-gray-400">Size:</span>
                              {formatBytes(share.digital_locker.file_size)}
                            </span>
                          </>
                        )}
                        <span className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-400">Shared:</span>
                          {formatDate(share.created_at)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-400">Expires:</span>
                          {formatDate(share.expires_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {displayStatus === "ACTIVE" && (
                        <button
                          onClick={() => handleRevokeShare(share.id)}
                          className="px-4 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 transition-colors"
                        >
                          Revoke Access
                        </button>
                      )}
                    </div>
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
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 sm:p-8 m-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-4 mb-6 sticky top-0 bg-white z-20 pb-4 border-b border-gray-50">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#0067A1]/10 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                <FaShareAlt className="w-5 h-5 sm:w-6 sm:h-6 text-[#0067A1]" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Share Document</h2>
                <p className="text-xs sm:text-sm text-gray-500 font-medium">Configure secure access for your doctor</p>
              </div>
            </div>

            {shareError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-700 font-bold flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                {shareError}
              </div>
            )}
            {shareSuccess && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-sm text-emerald-700 font-bold flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                {shareSuccess}
              </div>
            )}

            <div className="space-y-6">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Selected Document</p>
                <p className="text-sm font-bold text-slate-700 truncate">{sharingDoc.document_name}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">1. Select Doctor</label>
                <div className="relative">
                  <FaUserMd className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    value={selectedDoctorKey}
                    onChange={(e) => setSelectedDoctorKey(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-[#0067A1]/5 transition-all outline-none"
                  >
                    <option value="">Choose a practitioner...</option>
                    {doctors.map((doc) => (
                      <option key={`${doc.doctor_id}:${doc.appointment_id}`} value={`${doc.doctor_id}:${doc.appointment_id}`}>
                        {doc.doctor_name} | Appt: #{doc.appointment_id.slice(-8).toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">2. Access Duration (Expiry)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "10 Min", value: "10" },
                    { label: "30 Min", value: "30" },
                    { label: "1 Hr", value: "60" },
                    { label: "2 Hrs", value: "120" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setExpiryMinutes(opt.value)}
                      className={`py-3 rounded-2xl text-[10px] sm:text-xs font-bold transition-all border-2 ${expiryMinutes === opt.value
                        ? "bg-[#0067A1]/10 border-[#0067A1] text-[#0067A1] shadow-lg shadow-[#0067A1]/10"
                        : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-5 bg-[#0067A1]/5 rounded-3xl border border-[#0067A1]/10">
                <label className="flex items-start gap-4 cursor-pointer group">
                  <div className="relative flex items-center mt-1">
                    <input
                      type="checkbox"
                      checked={shareConsent}
                      onChange={(e) => setShareConsent(e.target.checked)}
                      className="peer h-5 w-5 opacity-0 absolute cursor-pointer"
                    />
                    <div className="h-5 w-5 bg-white border-2 border-gray-200 rounded-lg peer-checked:bg-[#0067A1] peer-checked:border-[#0067A1] transition-all flex items-center justify-center">
                      <div className="h-2 w-2 bg-white rounded-full opacity-0 peer-checked:opacity-100 transition-all" />
                    </div>
                  </div>
                  <span className="text-xs text-gray-600 font-medium leading-relaxed">
                    I understand that this document will be shared with the selected practitioner.
                    Access will <span className="font-bold text-[#0067A1]">automatically expire</span> after the selected duration.
                  </span>
                </label>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="flex-1 py-4 px-6 border-2 border-gray-100 rounded-2xl text-sm font-bold text-gray-400 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={shareSubmitting || !shareConsent || !selectedDoctorKey}
                  onClick={handleShare}
                  className="flex-[2] py-4 px-6 bg-[#0067A1] text-white rounded-2xl text-sm font-black shadow-xl shadow-[#0067A1]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {shareSubmitting ? "Generating Secure Link..." : "Share Securely"}
                </button>
              </div>
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
