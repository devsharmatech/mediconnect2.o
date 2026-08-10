"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Shield, CheckCircle, Lock, Smartphone, FileText, ChevronDown,
  ChevronUp, AlertTriangle, Fingerprint, ArrowRight, Loader2, Eye,
  Mail, Phone, Award, Building, CreditCard, User, Star, Clock,
} from "lucide-react";
import { agreementSections, AGREEMENT_TITLE, AGREEMENT_VERSION } from "./agreement-data";

// ─── Step Indicator ───
function StepIndicator({ currentStep, steps }) {
  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-2xl mx-auto mb-8">
      {steps.map((s, i) => {
        const done = currentStep > s.id;
        const active = currentStep === s.id;
        return (
          <div key={s.id} className="flex items-center flex-1 last:flex-initial">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 border-2 ${
                done ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200" :
                active ? "bg-[#0067A1] border-[#0067A1] text-white shadow-lg shadow-teal-200 scale-110" :
                "bg-white border-gray-300 text-gray-400"
              }`}>
                {done ? <CheckCircle className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
              </div>
              <span className={`text-xs mt-2 font-medium hidden sm:block ${
                done ? "text-emerald-600" : active ? "text-[#0067A1]" : "text-gray-400"
              }`}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-1 mx-2 rounded-full transition-all duration-500 ${
                done ? "bg-emerald-400" : "bg-gray-200"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── KYC Step ───
function KYCStep({ onComplete, doctorData, isCompleted }) {
  const [verifying, setVerifying] = useState(false);

  const handleDigiLocker = async () => {
    setVerifying(true);
    try {
      // Simulate DigiLocker verification (replace with real API)
      await new Promise((r) => setTimeout(r, 2000));
      toast.success("KYC verification completed!");
      onComplete();
    } catch {
      toast.error("KYC verification failed. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  if (isCompleted) {
    return (
      <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">KYC Verified</h3>
        <p className="text-gray-600">Your identity has been verified via DigiLocker.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
          <Fingerprint className="w-10 h-10 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Identity Verification</h3>
        <p className="text-gray-600 max-w-md mx-auto">Verify your identity securely using DigiLocker. This is required to proceed.</p>
      </div>

      {/* Pre-filled info preview */}
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <User className="w-4 h-4" /> Your Profile Summary
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500">Name:</span> <span className="font-medium text-gray-900 ml-1">{doctorData?.full_name || "N/A"}</span></div>
          <div><span className="text-gray-500">Email:</span> <span className="font-medium text-gray-900 ml-1">{doctorData?.email || "N/A"}</span></div>
          <div><span className="text-gray-500">Specialization:</span> <span className="font-medium text-gray-900 ml-1">{Array.isArray(doctorData?.specialization) ? doctorData.specialization.join(", ") : doctorData?.specialization || "N/A"}</span></div>
          <div><span className="text-gray-500">License:</span> <span className="font-medium text-gray-900 ml-1">{doctorData?.license_number || "N/A"}</span></div>
        </div>
      </div>

      {/* DigiLocker CTA */}
      <div className="bg-white border-2 border-blue-100 rounded-2xl p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-[#0067A1]" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">DigiLocker KYC</h4>
            <p className="text-sm text-gray-500 mt-1">Securely verify your Aadhaar and PAN through DigiLocker. Your documents are fetched directly from government issuers.</p>
          </div>
        </div>
        <button
          onClick={handleDigiLocker}
          disabled={verifying}
          className="w-full py-4 bg-gradient-to-r from-[#0067A1] to-indigo-600 text-white rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-60 flex items-center justify-center gap-3 shadow-lg"
        >
          {verifying ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Verifying...</>
          ) : (
            <><Fingerprint className="w-5 h-5" /> Verify with DigiLocker</>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── OTP Step ───
function OTPStep({ phone, doctorId, onComplete, isCompleted, disabled }) {
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const handleSend = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/doctors/onboarding/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, doctor_id: doctorId }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
        setCountdown(60);
        toast.success("OTP sent to your registered mobile.");
        if (data.dev_otp) console.log("[DEV] OTP:", data.dev_otp);
      } else {
        toast.error(data.error || "Failed to send OTP");
      }
    } catch { toast.error("Network error"); }
    finally { setSending(false); }
  };

  const handleVerify = async () => {
    if (otp.length < 6) return toast.error("Enter a valid 6-digit OTP");
    setVerifying(true);
    try {
      const res = await fetch("/api/doctors/onboarding/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp, doctor_id: doctorId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("OTP verified!");
        onComplete();
      } else {
        toast.error(data.error || "Invalid OTP");
      }
    } catch { toast.error("Network error"); }
    finally { setVerifying(false); }
  };

  if (disabled) {
    return (
      <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-8 text-center opacity-60">
        <Lock className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-500">OTP Verification</h3>
        <p className="text-sm text-gray-400 mt-1">Complete KYC verification first.</p>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">OTP Verified</h3>
        <p className="text-gray-600">Your mobile number has been verified.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
          <Smartphone className="w-10 h-10 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Mobile Verification</h3>
        <p className="text-gray-600">Verify your registered number <strong>{phone || "N/A"}</strong></p>
      </div>

      <div className="bg-white border-2 border-indigo-100 rounded-2xl p-6 max-w-md mx-auto">
        {!otpSent ? (
          <button
            onClick={handleSend}
            disabled={sending}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-60 flex items-center justify-center gap-3 shadow-lg"
          >
            {sending ? <><Loader2 className="w-5 h-5 animate-spin" /> Sending...</> : <><Smartphone className="w-5 h-5" /> Send OTP</>}
          </button>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Enter 6-digit OTP</label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="w-full px-4 py-4 text-center text-2xl font-bold tracking-[0.5em] border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="• • • • • •"
              />
            </div>
            <button
              onClick={handleVerify}
              disabled={verifying || otp.length < 6}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
            >
              {verifying ? <><Loader2 className="w-5 h-5 animate-spin" /> Verifying...</> : "Verify OTP"}
            </button>
            <button
              onClick={handleSend}
              disabled={countdown > 0 || sending}
              className="w-full text-sm text-indigo-600 hover:text-indigo-800 disabled:text-gray-400 py-2"
            >
              {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to format markdown bold (**text**) into strong elements
const formatContent = (text) => {
  if (!text) return "";
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

// ─── Agreement Accordion Section ───
function AccordionSection({ section, isOpen, onToggle }) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-8 h-8 bg-[#0067A1] text-white rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">
            {section.id}
          </span>
          <div className="min-w-0">
            <h4 className="font-semibold text-gray-900 text-sm sm:text-base">{section.title}</h4>
            {!isOpen && <p className="text-xs text-gray-500 mt-0.5 truncate">{section.preview}</p>}
          </div>
        </div>
        <div className="flex-shrink-0 ml-2">
          {isOpen ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-gray-100">
              <div className="pt-4 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {formatContent(section.content)}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Agreement Step ───
function AgreementStep({ doctorId, phone, onComplete, isCompleted, disabled }) {
  const [openSections, setOpenSections] = useState(new Set());
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const toggleSection = (id) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () => setOpenSections(new Set(agreementSections.map((s) => s.id)));
  const collapseAll = () => setOpenSections(new Set());

  const handleAccept = async () => {
    if (!agreed) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/doctors/onboarding/agreement/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: doctorId,
          phone,
          consent_version: AGREEMENT_VERSION,
          device_info: navigator.userAgent,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Agreement accepted successfully!");
        onComplete();
      } else {
        toast.error(data.error || "Failed to accept agreement");
      }
    } catch { toast.error("Network error"); }
    finally { setSubmitting(false); }
  };

  if (disabled) {
    return (
      <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-8 text-center opacity-60">
        <Lock className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-500">Professional Agreement</h3>
        <p className="text-sm text-gray-400 mt-1">Complete OTP verification first.</p>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Agreement Accepted</h3>
        <p className="text-gray-600">You have accepted the Professional Agreement (v{AGREEMENT_VERSION}).</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-center mb-4">
        <div className="w-20 h-20 bg-gradient-to-br from-[#0067A1] to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
          <FileText className="w-10 h-10 text-white" />
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Review & Confirm Your Professional Agreement</h3>
        <p className="text-gray-600 text-sm max-w-lg mx-auto">{AGREEMENT_TITLE}</p>
      </div>

      {/* Expand/Collapse controls */}
      <div className="flex justify-end gap-3 text-sm">
        <button onClick={expandAll} className="text-[#0067A1] hover:underline font-medium">Expand All</button>
        <span className="text-gray-300">|</span>
        <button onClick={collapseAll} className="text-gray-500 hover:underline font-medium">Collapse All</button>
      </div>

      {/* Accordion sections */}
      <div className="space-y-3">
        {agreementSections.map((section) => (
          <AccordionSection
            key={section.id}
            section={section}
            isOpen={openSections.has(section.id)}
            onToggle={() => toggleSection(section.id)}
          />
        ))}
      </div>

      {/* Sticky acceptance block */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t-2 border-[#0067A1]/20 rounded-2xl p-5 shadow-2xl mt-6 -mx-1">
        <label className="flex items-start gap-3 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 w-5 h-5 rounded border-gray-300 text-[#0067A1] focus:ring-[#0067A1]"
          />
          <span className="text-sm text-gray-700 leading-relaxed">
            I have read and agree to the <strong className="text-[#0067A1]">MediConnect Professional Agreement and Platform Terms</strong> (Version {AGREEMENT_VERSION}).
            I understand that this constitutes a legally binding agreement.
          </span>
        </label>
        <button
          onClick={handleAccept}
          disabled={!agreed || submitting}
          className="w-full py-4 bg-gradient-to-r from-[#0067A1] to-teal-600 text-white rounded-xl font-semibold text-lg hover:from-[#004F7C] hover:to-[#004F7C] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg"
        >
          {submitting ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
          ) : (
            <><CheckCircle className="w-5 h-5" /> Complete Onboarding & Activate Account</>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Success Step ───
function SuccessStep() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-8"
    >
      <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
        <CheckCircle className="w-12 h-12 text-white" />
      </div>
      <h2 className="text-3xl font-bold text-gray-900 mb-3">Onboarding Complete!</h2>
      <p className="text-gray-600 text-lg max-w-md mx-auto mb-6">
        Your verification is complete. The admin team will review and activate your account shortly.
      </p>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 max-w-md mx-auto">
        <div className="flex items-center gap-2 text-amber-700">
          <Clock className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">Pending admin approval. You will receive an email once activated.</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Verification Flow ───
export default function VerificationFlow({ doctorData, token, phone, doctorId, onboardingStatus }) {
  const steps = [
    { id: 1, label: "KYC", icon: Fingerprint },
    { id: 2, label: "OTP", icon: Smartphone },
    { id: 3, label: "Agreement", icon: FileText },
    { id: 4, label: "Done", icon: CheckCircle },
  ];

  const [kycDone, setKycDone] = useState(onboardingStatus?.kyc_verified || doctorData?.is_kyc || false);
  const [otpDone, setOtpDone] = useState(onboardingStatus?.otp_verified || false);
  const [agreementDone, setAgreementDone] = useState(onboardingStatus?.agreement_accepted || false);

  // Determine current step
  const getCurrentStep = () => {
    if (agreementDone) return 4;
    if (otpDone) return 3;
    if (kycDone) return 2;
    return 1;
  };

  const [currentStep, setCurrentStep] = useState(getCurrentStep());

  useEffect(() => {
    setCurrentStep(getCurrentStep());
  }, [kycDone, otpDone, agreementDone]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-5 sm:py-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-[#0067A1] rounded-xl flex items-center justify-center">
              <Star className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">MediConnect Onboarding</h1>
              <p className="text-sm text-gray-500">Complete your professional verification</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        <StepIndicator currentStep={currentStep} steps={steps} />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentStep === 1 && (
              <KYCStep
                doctorData={doctorData}
                isCompleted={kycDone}
                onComplete={() => setKycDone(true)}
              />
            )}
            {currentStep === 2 && (
              <OTPStep
                phone={phone}
                doctorId={doctorId}
                isCompleted={otpDone}
                disabled={!kycDone}
                onComplete={() => setOtpDone(true)}
              />
            )}
            {currentStep === 3 && (
              <AgreementStep
                doctorId={doctorId}
                phone={phone}
                isCompleted={agreementDone}
                disabled={!otpDone}
                onComplete={() => setAgreementDone(true)}
              />
            )}
            {currentStep === 4 && <SuccessStep />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
