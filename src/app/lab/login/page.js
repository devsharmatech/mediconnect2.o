"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { sendOtp, verifyOtp, setLoggedInUser } from "@/lib/authHelpers";
import Image from "next/image";
import {
  Phone,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Microscope,
  Loader2,
  RefreshCw,
  Lock,
  CheckCircle2,
  FlaskConical,
  Activity,
} from "lucide-react";

export default function LabLogin() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSendOtp = async () => {
    if (!phone.trim()) {
      toast.error("Please enter your phone number", { id: "auth-toast" });
      return;
    }
    if (loading) return;
    setLoading(true);
    const data = await sendOtp(phone, "lab");
    setLoading(false);
    if (data.success) {
      setStep(2);
      setUserId(data.data.user_id);
      toast.success("OTP sent successfully!", { id: "auth-toast" });
    } else {
      toast.error(data.message || "Failed to send OTP", { id: "auth-toast" });
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      toast.error("Please enter the OTP", { id: "auth-toast" });
      return;
    }
    if (loading) return;
    setLoading(true);
    const data = await verifyOtp(userId, otp);
    setLoading(false);
    if (data.success) {
      setLoggedInUser("lab", data.data.user);
      toast.success("OTP verified successfully!", { id: "auth-toast" });
      router.push("/lab/dashboard");
    } else {
      toast.error(data.message || "Invalid OTP", { id: "auth-toast" });
    }
  };

  const handleBack = () => {
    setStep(1);
    setOtp("");
    setLoading(false);
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-[#F0F4F8] dark:bg-slate-950 p-4">
      <div className="w-full max-w-5xl flex flex-col lg:flex-row bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden">

        {/* ── Left Panel: Illustration ── */}
        <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden flex-col">
          {/* Full-bleed image */}
          <Image
            src="/lab-login-illustration.jpg"
            alt="Laboratory Portal"
            fill
            className="object-cover"
            priority
          />
          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#001a30]/90 via-[#003358]/30 to-transparent" />

          {/* Overlay Content */}
          <div className="absolute bottom-0 left-0 right-0 p-10 z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white/10 rounded-xl border border-white/20 flex items-center justify-center backdrop-blur-sm">
                <Microscope className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-base leading-tight">MediConnect</p>
                <p className="text-emerald-400 text-[11px] font-semibold uppercase tracking-widest">Diagnostic Portal</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white leading-snug mb-3">
              Precision Diagnostics,<br />Simplified Management
            </h2>
            <p className="text-white/60 text-sm leading-relaxed mb-6">
              Streamline lab operations, manage test orders, and deliver accurate results faster than ever.
            </p>

            {/* Feature badges */}
            <div className="flex flex-wrap gap-2">
              {[
                { icon: <FlaskConical className="w-3.5 h-3.5" />, text: "Test Catalog" },
                { icon: <Activity className="w-3.5 h-3.5" />, text: "Order Tracking" },
                { icon: <ShieldCheck className="w-3.5 h-3.5" />, text: "HIPAA Secure" },
              ].map(({ icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white/80 text-[11px] font-medium"
                >
                  {icon}
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right Panel: Form ── */}
        <div className="flex-1 p-8 sm:p-12 flex flex-col justify-center">
          {/* Mobile Brand */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-[#003358] rounded-xl flex items-center justify-center shadow">
              <Microscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-slate-800 dark:text-white font-bold text-base leading-tight">MediConnect</p>
              <p className="text-emerald-600 text-[11px] font-semibold uppercase tracking-widest">Diagnostic Portal</p>
            </div>
          </div>

          {/* Progress steps */}
          <div className="flex items-center gap-2 mb-8">
            <div className={`flex items-center gap-2 text-xs font-semibold ${step >= 1 ? "text-[#0067A1]" : "text-slate-400"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step >= 1 ? "bg-[#0067A1] text-white" : "bg-slate-200 text-slate-500"}`}>
                {step > 1 ? <CheckCircle2 className="w-4 h-4" /> : "1"}
              </div>
              Phone
            </div>
            <div className={`flex-1 h-px rounded ${step >= 2 ? "bg-[#0067A1]" : "bg-slate-200"}`} />
            <div className={`flex items-center gap-2 text-xs font-semibold ${step >= 2 ? "text-[#0067A1]" : "text-slate-400"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step >= 2 ? "bg-[#0067A1] text-white" : "bg-slate-200 text-slate-500"}`}>
                2
              </div>
              Verify OTP
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">
              {step === 1 ? "Laboratory Sign In" : "Enter Verification Code"}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {step === 1
                ? "Enter your registered phone number to receive an OTP."
                : `We've sent a 6-digit code to +91 ${phone}. Please enter it below.`}
            </p>
          </div>

          {/* ── Step 1: Phone ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">
                  Phone Number
                </label>
                <div className="flex items-center gap-0 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#0067A1]/30 focus-within:border-[#0067A1] transition-all bg-slate-50 dark:bg-slate-800">
                  <div className="flex items-center gap-2 px-4 py-3.5 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600 dark:text-slate-300 text-sm font-semibold">+91</span>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                    className="flex-1 px-4 py-3.5 bg-transparent outline-none text-slate-900 dark:text-white placeholder-slate-400 text-sm font-medium"
                  />
                </div>
              </div>

              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full py-3.5 bg-[#003358] hover:bg-[#004F7C] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow-lg shadow-[#003358]/20 hover:shadow-[#003358]/30 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Send OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* ── Step 2: OTP ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">
                  6-Digit OTP
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onPaste={(e) => {
                    e.preventDefault();
                    const text = e.clipboardData?.getData("text") || "";
                    setOtp(text.replace(/\D/g, "").slice(0, 6));
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                  className="w-full px-5 py-4 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30 focus:border-[#0067A1] dark:bg-slate-800 dark:text-white text-center text-2xl tracking-[0.6em] font-mono bg-slate-50 transition-all"
                  maxLength={6}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleBack}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 flex-1 py-3.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-semibold text-sm transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={handleVerifyOtp}
                  disabled={loading}
                  className="flex-[2] py-3.5 bg-[#003358] hover:bg-[#004F7C] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow-lg shadow-[#003358]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Verify & Sign In</span>
                      <ShieldCheck className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center">
                <button
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 text-[#0067A1] dark:text-emerald-400 hover:underline text-sm font-semibold transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Resend OTP
                </button>
              </div>
            </div>
          )}

          {/* Trust strip */}
          <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500 font-medium">
            <Lock className="w-3.5 h-3.5" />
            Secure laboratory access portal &nbsp;·&nbsp; HIPAA compliant &nbsp;·&nbsp; 256-bit encrypted
          </div>
        </div>
      </div>
    </div>
  );
}