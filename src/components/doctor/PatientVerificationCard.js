"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Check,
  AlertTriangle,
  UserCheck,
  FileCheck2,
  AlertCircle,
  Flag,
  Loader2,
  X,
  User
} from "lucide-react";
import { toast } from "react-hot-toast";

// Helper function to securely mask mobile numbers (e.g. +91 9876543210 -> +91 98****3210)
export function maskPhoneNumber(phone) {
  if (!phone) return "Not Available";
  const str = String(phone).trim();
  if (str.startsWith("ANONYMIZED_") || str.startsWith("deleted_")) return "Account Deleted";
  if (str.length <= 4) return "****";
  
  if (str.startsWith("+91")) {
    const rawDigits = str.slice(3).trim();
    if (rawDigits.length >= 8) {
      return `+91 ${rawDigits.slice(0, 2)}****${rawDigits.slice(-4)}`;
    }
  }
  if (str.length >= 8) {
    return `${str.slice(0, 2)}****${str.slice(-4)}`;
  }
  return str.slice(0, 2) + "****" + str.slice(-2);
}

// Calculate age from DOB or patient object
export function getPatientAge(patientObj, appointment = {}) {
  const candidateAge = patientObj?.age || appointment?.patient_age || appointment?.age;
  if (candidateAge !== undefined && candidateAge !== null && candidateAge !== "") {
    const a = parseInt(candidateAge, 10);
    if (!isNaN(a)) {
      return { ageStr: `${a} yrs`, isMinor: a < 18, ageNum: a };
    }
    return { ageStr: String(candidateAge), isMinor: false, ageNum: null };
  }
  const dob = patientObj?.date_of_birth || patientObj?.dob || appointment?.patient_dob || appointment?.date_of_birth;
  if (!dob) return { ageStr: "Not Specified", isMinor: false, ageNum: null };
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return { ageStr: "Not Specified", isMinor: false, ageNum: null };
  
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return {
    ageStr: `${age} yrs`,
    isMinor: age < 18,
    ageNum: age
  };
}

export default function PatientVerificationCard({
  appointment,
  doctorUserId = null,
  onVerificationComplete = null,
  compact = false
}) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verification, setVerification] = useState(null);

  // Verification Form State
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [consentConfirmed, setConsentConfirmed] = useState(false);

  // Minor / Guardian Details
  const [isMinorPatient, setIsMinorPatient] = useState(false);
  const [guardianName, setGuardianName] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState("Parent / Guardian");
  const [guardianPhone, setGuardianPhone] = useState("");

  // Discrepancy Reporting Modal State
  const [showDiscrepancyModal, setShowDiscrepancyModal] = useState(false);
  const [discrepancyReason, setDiscrepancyReason] = useState("Identity Mismatch");
  const [discrepancyNotes, setDiscrepancyNotes] = useState("");

  const patientObj = appointment?.patient || appointment?.patient_details || {};
  const patientName = patientObj.full_name || patientObj.name || appointment?.patient_name || "Patient";
  const { ageStr, isMinor } = getPatientAge(patientObj, appointment);
  const maskedPhone = maskPhoneNumber(patientObj.phone_number || patientObj.phone || appointment?.patient_phone || appointment?.phone);

  const doctorId = doctorUserId || appointment?.doctor_id || (typeof window !== "undefined" ? localStorage.getItem("userId") : null);

  // Fetch current verification status from DB
  useEffect(() => {
    if (!appointment?.id) return;
    let isMounted = true;

    async function loadVerification() {
      setLoading(true);
      try {
        const res = await fetch(`/api/doctor/patient-verification?appointment_id=${appointment.id}`);
        const data = await res.json();
        if (isMounted && data.success && data.verification) {
          setVerification(data.verification);
          setIdentityConfirmed(Boolean(data.verification.identity_confirmed));
          setConsentConfirmed(Boolean(data.verification.consent_confirmed));
          if (data.verification.is_minor) {
            setIsMinorPatient(true);
            setGuardianName(data.verification.guardian_name || "");
            setGuardianRelationship(data.verification.guardian_relationship || "Parent / Guardian");
            setGuardianPhone(data.verification.guardian_phone || "");
          }
        } else if (isMounted) {
          if (isMinor) {
            setIsMinorPatient(true);
          }
        }
      } catch (err) {
        console.error("Failed to load patient verification", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadVerification();
    return () => { isMounted = false; };
  }, [appointment?.id, isMinor]);

  // Handle Confirm
  const handleConfirm = async () => {
    if (!identityConfirmed || !consentConfirmed) {
      toast.error("Please confirm both identity and clinical consent.");
      return;
    }

    if (isMinorPatient && !guardianName.trim()) {
      toast.error("Guardian name is required for minor patient consent.");
      return;
    }

    if (!doctorId) {
      toast.error("Doctor ID not found. Please log in again.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/doctor/patient-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_id: appointment.id,
          patient_id: appointment.patient_id,
          doctor_id: doctorId,
          status: "verified",
          identity_confirmed: true,
          consent_confirmed: true,
          is_minor: isMinorPatient,
          guardian_name: isMinorPatient ? guardianName.trim() : null,
          guardian_relationship: isMinorPatient ? guardianRelationship : null,
          guardian_phone: isMinorPatient ? guardianPhone.trim() : null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setVerification(data.verification);
        toast.success("Patient verified successfully.");
        if (onVerificationComplete) onVerificationComplete(data.verification);
      } else {
        toast.error(data.error || "Failed to save verification.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error while submitting verification.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Report Discrepancy
  const handleReportDiscrepancy = async () => {
    if (!discrepancyReason) {
      toast.error("Please select a reason for the discrepancy.");
      return;
    }

    if (!doctorId) {
      toast.error("Doctor ID not found. Please log in again.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/doctor/patient-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_id: appointment.id,
          patient_id: appointment.patient_id,
          doctor_id: doctorId,
          status: "discrepancy_reported",
          identity_confirmed: false,
          consent_confirmed: false,
          is_minor: isMinorPatient,
          guardian_name: isMinorPatient ? guardianName.trim() : null,
          guardian_relationship: isMinorPatient ? guardianRelationship : null,
          discrepancy_reason: discrepancyReason,
          discrepancy_notes: discrepancyNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setVerification(data.verification);
        setShowDiscrepancyModal(false);
        toast.success("Discrepancy recorded and escalated.");
        if (onVerificationComplete) onVerificationComplete(data.verification);
      } else {
        toast.error(data.error || "Failed to submit discrepancy report.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to report discrepancy.");
    } finally {
      setSubmitting(false);
    }
  };

  const isVerified = verification?.status === "verified";
  const isDiscrepancy = verification?.status === "discrepancy_reported";

  if (loading) {
    return (
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2.5 text-slate-500 text-xs">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0067A1]" />
        <span>Checking patient verification...</span>
      </div>
    );
  }

  // 1. Sleek Verified State (Compact, professional, non-intrusive)
  if (isVerified) {
    return (
      <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 transition-all">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Check className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-bold text-emerald-950">
                Identity & Consent Verified
              </h4>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Compliant
              </span>
            </div>
            <p className="text-[11px] text-emerald-800/80 mt-0.5 truncate">
              {verification.verified_at
                ? `Verified on ${new Date(verification.verified_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "Clinician confirmed"}
              {verification.is_minor && verification.guardian_name ? ` • Guardian: ${verification.guardian_name}` : ""}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setVerification(null)}
          className="self-start sm:self-center px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100/70 rounded-md transition-colors cursor-pointer"
        >
          Re-verify
        </button>
      </div>
    );
  }

  // 2. Sleek Discrepancy Flagged State
  if (isDiscrepancy) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 transition-all">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-bold text-rose-950">
                Identity Discrepancy Flagged
              </h4>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                Escalated
              </span>
            </div>
            <p className="text-[11px] text-rose-800 mt-0.5 truncate">
              Issue: {verification.discrepancy_reason || "Mismatch reported"}
              {verification.discrepancy_notes ? ` (${verification.discrepancy_notes})` : ""}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setVerification(null)}
          className="self-start sm:self-center px-2.5 py-1 text-xs font-semibold text-rose-800 hover:text-rose-950 hover:bg-rose-100 rounded-md transition-colors cursor-pointer"
        >
          Re-check
        </button>
      </div>
    );
  }

  // 3. Clean Pending State (Professional Healthcare UI)
  const isFormValid = identityConfirmed && consentConfirmed && (!isMinorPatient || guardianName.trim().length > 0);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden transition-all">
      {/* Sleek Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#0067A1] text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate">
              Patient Identity & Consent
            </h4>
            <p className="text-[11px] text-slate-500 truncate">
              Treating clinician confirmation (NMC Guidelines)
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Pending
        </span>
      </div>

      <div className="p-3.5 sm:p-4 space-y-3.5">
        {/* Interactive Verification Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Card 1: Identity */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIdentityConfirmed(!identityConfirmed)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setIdentityConfirmed(!identityConfirmed); }}
            className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-3 select-none ${
              identityConfirmed
                ? "bg-sky-50/50 border-[#0067A1] ring-1 ring-[#0067A1]"
                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <div
              className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                identityConfirmed ? "bg-[#0067A1] text-white" : "border border-slate-300 bg-white"
              }`}
            >
              {identityConfirmed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900">1. Confirm Identity</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Verified presenting patient matches profile (<strong className="text-slate-800 font-medium">{patientName}</strong>).
              </p>
            </div>
          </div>

          {/* Card 2: Consent */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setConsentConfirmed(!consentConfirmed)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setConsentConfirmed(!consentConfirmed); }}
            className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-3 select-none ${
              consentConfirmed
                ? "bg-sky-50/50 border-[#0067A1] ring-1 ring-[#0067A1]"
                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <div
              className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                consentConfirmed ? "bg-[#0067A1] text-white" : "border border-slate-300 bg-white"
              }`}
            >
              {consentConfirmed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900">2. Medical Consent</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Informed consent obtained for clinical consultation and examination.
              </p>
            </div>
          </div>
        </div>

        {/* Minor / Guardian Checkbox */}
        <div className="pt-0.5">
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-700">
            <input
              type="checkbox"
              checked={isMinorPatient}
              onChange={(e) => setIsMinorPatient(e.target.checked)}
              className="rounded border-slate-300 text-[#0067A1] focus:ring-[#0067A1]"
            />
            <span className="font-medium">
              Patient is a minor (&lt;18 yrs) — Guardian details required
            </span>
          </label>

          {isMinorPatient && (
            <div className="mt-2.5 bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
              <p className="text-xs font-bold text-slate-800">
                Guardian Details (Legal Representative)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                    Guardian Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                    Relationship *
                  </label>
                  <select
                    value={guardianRelationship}
                    onChange={(e) => setGuardianRelationship(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] focus:outline-none"
                  >
                    <option value="Parent / Guardian">Parent / Guardian</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Legal Guardian">Legal Guardian</option>
                    <option value="Relative / Caretaker">Relative / Caretaker</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                    Guardian Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons (Strictly Short Labels per AGENTS.md rule) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowDiscrepancyModal(true)}
            className="px-3 py-1.5 text-xs font-medium text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Flag className="w-3.5 h-3.5 text-rose-600" />
            Report Issue
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || !isFormValid}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
              !submitting && isFormValid
                ? "bg-[#0067A1] text-white hover:bg-[#005282] shadow-xs"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                Verify
              </>
            )}
          </button>
        </div>
      </div>

      {/* Discrepancy Reporting Modal */}
      {showDiscrepancyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h4 className="font-bold text-sm text-slate-900">Report Discrepancy</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowDiscrepancyModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Select Reason *</label>
                <select
                  value={discrepancyReason}
                  onChange={(e) => setDiscrepancyReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-rose-500 focus:outline-none text-xs"
                >
                  <option value="Identity Mismatch">Patient does not match registered profile / photo</option>
                  <option value="Refused Consent">Patient unable or refused to confirm identity / consent</option>
                  <option value="Suspected Fraud / Impersonation">Suspected impersonation / fraudulent booking</option>
                  <option value="Minor Without Guardian">Minor patient unaccompanied without legal guardian</option>
                  <option value="Other Discrepancy">Other clinical / administrative discrepancy</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Clinical Notes (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Provide context regarding the identity issue..."
                  value={discrepancyNotes}
                  onChange={(e) => setDiscrepancyNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-rose-500 focus:outline-none text-xs"
                />
              </div>

              <div className="bg-rose-50 border border-rose-100 rounded-lg p-2.5 text-[11px] text-rose-800">
                Reporting a discrepancy immediately alerts MediConnect Clinical Ops and halts unauthorized clinical prescriptions.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDiscrepancyModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReportDiscrepancy}
                disabled={submitting}
                className="px-4 py-1.5 text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 rounded-lg shadow-xs flex items-center gap-1.5"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flag className="w-3.5 h-3.5" />}
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
