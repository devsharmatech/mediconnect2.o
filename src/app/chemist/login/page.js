"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { sendOtp, verifyOtp, setLoggedInUser, getLoggedInUser } from "@/lib/authHelpers";
import {
  Phone,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Lock,
  CheckCircle2,
  Pill,
  Store,
  Package,
} from "lucide-react";

export default function ChemistLogin() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Redirect if already logged in as chemist
  useEffect(() => {
    setMounted(true);
    const user = getLoggedInUser("chemist");
    if (user?.id) {
      router.replace("/chemist/dashboard");
    }
  }, [router]);

  const handleSendOtp = async () => {
    const cleanPhone = phone.trim().replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number", { id: "auth-toast" });
      return;
    }
    if (loading) return;
    setLoading(true);
    const data = await sendOtp(cleanPhone, "chemist");
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
    const cleanOtp = otp.trim().replace(/\D/g, "");
    if (!cleanOtp || cleanOtp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP", { id: "auth-toast" });
      return;
    }
    if (loading) return;
    setLoading(true);
    const data = await verifyOtp(userId, cleanOtp);
    setLoading(false);
    if (data.success) {
      setLoggedInUser("chemist", data.data.user);
      toast.success("Welcome back!", { id: "auth-toast" });
      router.push("/chemist/dashboard");
    } else {
      toast.error(data.message || "Invalid OTP", { id: "auth-toast" });
    }
  };

  const handleBack = () => {
    setStep(1);
    setOtp("");
    setLoading(false);
  };

  if (!mounted) return null;

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-[#F0F4F8] p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl flex flex-col lg:flex-row bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
        
        {/* ── Left Panel: Illustration & Feature Badges (Desktop) ── */}
        <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden flex-col">
          <Image
            src="/chemist-login-illustration.jpg"
            alt="Chemist and Pharmacy Portal"
            fill
            className="object-cover"
            priority
          />
          {/* Subtle gradient overlay for contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#001a30]/95 via-[#003358]/40 to-transparent" />

          {/* Overlay Content */}
          <div className="absolute bottom-0 left-0 right-0 p-10 z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 bg-white rounded-xl p-1.5 flex items-center justify-center shadow-md border border-white/20 shrink-0 overflow-hidden">
                <img
                  src="/real-logo.png"
                  alt="MediConnect"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <p className="text-white font-bold text-base leading-tight">MediConnect</p>
                <p className="text-emerald-400 text-[11px] font-semibold uppercase tracking-widest">Chemist & Pharmacy Portal</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white leading-snug mb-3">
              Smart Pharmacy Dispensing,<br />Simplified Management
            </h2>
            <p className="text-white/70 text-sm leading-relaxed mb-6">
              Process verified teleconsultation prescriptions, fulfill medicine orders, and manage pharmacy operations with speed and precision.
            </p>

            {/* Feature badges using library icons only */}
            <div className="flex flex-wrap gap-2">
              {[
                { icon: <Pill className="w-3.5 h-3.5" />, text: "Prescription Dispensing" },
                { icon: <Package className="w-3.5 h-3.5" />, text: "Order Management" },
                { icon: <ShieldCheck className="w-3.5 h-3.5" />, text: "DPDP & Drug License Compliant" },
              ].map(({ icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white/90 text-[11px] font-medium"
                >
                  {icon}
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right Panel: Clean Light Form ── */}
        <div className="flex-1 p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-white">
          {/* Mobile Brand Header */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-11 h-11 bg-white rounded-xl p-1.5 flex items-center justify-center shadow-sm border border-slate-200 shrink-0 overflow-hidden">
              <img
                src="/real-logo.png"
                alt="MediConnect"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <p className="text-slate-900 font-bold text-base leading-tight">MediConnect</p>
              <p className="text-emerald-600 text-[11px] font-semibold uppercase tracking-widest">Chemist Portal</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mb-8">
            <div className={`flex items-center gap-2 text-xs font-semibold ${step >= 1 ? "text-[#0067A1]" : "text-slate-400"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step >= 1 ? "bg-[#0067A1] text-white" : "bg-slate-200 text-slate-500"}`}>
                {step > 1 ? <CheckCircle2 className="w-3.5 h-3.5" /> : "1"}
              </div>
              Mobile Number
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
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200 mb-3">
              <Store className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pharmacy Partner Access</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
              {step === 1 ? "Chemist Sign In" : "Enter Verification Code"}
            </h1>
            <p className="text-slate-500 text-sm">
              {step === 1
                ? "Enter your registered mobile number to access your pharmacy dashboard."
                : `We've sent a 6-digit OTP to +91 ${phone}. Please enter it below.`}
            </p>
          </div>

          {/* ── Step 1: Phone ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">
                  Mobile Number
                </label>
                <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#0067A1]/30 focus-within:border-[#0067A1] transition-all bg-slate-50">
                  <div className="flex items-center gap-2 px-4 py-3.5 border-r border-slate-200 bg-white shrink-0">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700 text-sm font-semibold">+91</span>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="Enter 10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                    className="flex-1 px-4 py-3.5 bg-transparent outline-none text-slate-900 placeholder-slate-400 text-sm font-medium"
                    maxLength={10}
                    autoFocus
                  />
                </div>
              </div>

              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full py-3.5 bg-[#003358] hover:bg-[#004F7C] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow-md shadow-[#003358]/20 hover:shadow-lg hover:shadow-[#003358]/30 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
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

              {/* Onboarding Register Link */}
              <div className="pt-2 text-center text-xs text-slate-500">
                Don't have a registered pharmacy?{" "}
                <Link
                  href="/chemist/onboarding"
                  className="text-[#0067A1] font-semibold hover:underline"
                >
                  Register your pharmacy
                </Link>
              </div>
            </div>
          )}

          {/* ── Step 2: OTP ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    6-Digit OTP
                  </label>
                  {(phone.includes("8744412521") || phone.includes("9999999991")) && (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Dev OTP: 123456
                    </span>
                  )}
                </div>
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
                  className="w-full px-5 py-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30 focus:border-[#0067A1] text-center text-2xl tracking-[0.6em] font-mono bg-slate-50 text-slate-900 transition-all"
                  maxLength={6}
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleBack}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 flex-1 py-3.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-semibold text-sm transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={handleVerifyOtp}
                  disabled={loading}
                  className="flex-[2] py-3.5 bg-[#003358] hover:bg-[#004F7C] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow-md shadow-[#003358]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
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
                  className="inline-flex items-center gap-1.5 text-[#0067A1] hover:underline text-sm font-semibold transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Resend OTP
                </button>
              </div>
            </div>
          )}

          {/* ── Trust Strip ── */}
          <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Secure pharmacy portal · DPDP compliant · 256-bit encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}