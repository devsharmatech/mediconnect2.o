"use client";

import { useState, useEffect, useRef } from "react";
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
  Stethoscope,
  Video,
  FileText,
  UserCheck,
  Mail,
} from "lucide-react";

export default function DoctorLoginPage() {
  const [method, setMethod] = useState("phone"); // "phone" | "email"
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef([]);
  const router = useRouter();

  // Redirect if already logged in as doctor
  useEffect(() => {
    setMounted(true);
    const user = getLoggedInUser("doctor");
    if (user?.id) {
      router.replace("/doctor");
    }
  }, [router]);

  // Resend countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;

    if (method === "phone") {
      const cleanPhone = phone.trim().replace(/\D/g, "");
      if (!cleanPhone || cleanPhone.length !== 10) {
        toast.error("Please enter a valid 10-digit mobile number", { id: "auth-toast" });
        return;
      }
      setLoading(true);
      try {
        const data = await sendOtp(cleanPhone, "doctor");
        setLoading(false);
        if (data.success) {
          setStep(2);
          setUserId(data.data?.user_id || null);
          setResendTimer(30);
          toast.success("OTP sent successfully!", { id: "auth-toast" });
          setTimeout(() => otpRefs.current[0]?.focus(), 150);
        } else {
          toast.error(data.message || "Failed to send OTP", { id: "auth-toast" });
        }
      } catch (err) {
        setLoading(false);
        toast.error("Network error. Please try again.", { id: "auth-toast" });
      }
    } else {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes("@")) {
        toast.error("Please enter a valid email address", { id: "auth-toast" });
        return;
      }
      setLoading(true);
      try {
        const res = await fetch("/api/website/auth/doctor/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail }),
        });
        const data = await res.json();
        setLoading(false);
        if (data.success) {
          setStep(2);
          setUserId(data.data?.user_id || null);
          setResendTimer(30);
          toast.success(`OTP sent to ${cleanEmail}`, { id: "auth-toast" });
          setTimeout(() => otpRefs.current[0]?.focus(), 150);
        } else {
          toast.error(data.message || data.error || "Doctor account not found", { id: "auth-toast" });
        }
      } catch (err) {
        setLoading(false);
        toast.error("Network error. Please try again.", { id: "auth-toast" });
      }
    }
  };

  const handleOtpChange = (index, val) => {
    const clean = val.replace(/\D/g, "");
    if (!clean) {
      const nextOtp = [...otp];
      nextOtp[index] = "";
      setOtp(nextOtp);
      return;
    }

    if (clean.length > 1) {
      // Pasted full code
      const digits = clean.slice(0, 6).split("");
      const nextOtp = [...otp];
      digits.forEach((d, i) => {
        if (i < 6) nextOtp[i] = d;
      });
      setOtp(nextOtp);
      const nextFocus = Math.min(digits.length, 5);
      otpRefs.current[nextFocus]?.focus();
      return;
    }

    const nextOtp = [...otp];
    nextOtp[index] = clean;
    setOtp(nextOtp);

    if (index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanOtp = otp.join("").trim();
    if (cleanOtp.length !== 6) {
      toast.error("Please enter the complete 6-digit OTP", { id: "auth-toast" });
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      let data = null;
      if (userId) {
        data = await verifyOtp(userId, cleanOtp);
      } else {
        const res = await fetch("/api/website/auth/validate-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone_number: method === "phone" ? phone.trim().replace(/\D/g, "") : undefined,
            email: method === "email" ? email.trim().toLowerCase() : undefined,
            role: "doctor",
            otp: cleanOtp,
          }),
        });
        data = await res.json();
      }

      setLoading(false);
      if (data?.success) {
        const user = data.data?.user || data.data;
        setLoggedInUser("doctor", user);
        toast.success(`Welcome back, Dr. ${user?.details?.full_name || user?.name || ""}!`, { id: "auth-toast" });
        router.replace("/doctor");
      } else {
        toast.error(data?.message || data?.error || "Invalid OTP code", { id: "auth-toast" });
      }
    } catch (err) {
      setLoading(false);
      toast.error("Failed to verify OTP. Please try again.", { id: "auth-toast" });
    }
  };

  const handleBack = () => {
    setStep(1);
    setOtp(["", "", "", "", "", ""]);
    setLoading(false);
  };

  if (!mounted) return null;

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-[#F4F7F9] p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl flex flex-col lg:flex-row bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
        
        {/* Left Panel: Doctor Visual & Trust Highlights */}
        <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden flex-col">
          <Image
            src="/consult-2.jpg"
            alt="Doctor Portal Login"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07243b]/95 via-[#0B3A5B]/70 to-[#0B3A5B]/20" />

          <div className="absolute bottom-0 left-0 right-0 p-10 z-10 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 bg-white rounded-xl p-1.5 flex items-center justify-center border border-white/20 shrink-0 shadow-sm">
                <img
                  src="/real-logo.png"
                  alt="MediConnect"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <p className="text-white font-bold text-base leading-tight tracking-wide">MediConnect</p>
                <p className="text-sky-300 text-[11px] font-semibold uppercase tracking-widest">Doctor Portal</p>
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight mb-3">
              Doctor-Led Clinical Care,<br />Streamlined Practice
            </h2>
            <p className="text-white/80 text-sm leading-relaxed mb-6">
              Access your digital prescriptions, HD video consultations, patient records, and live scheduling from a single compliant platform.
            </p>

            <div className="flex flex-wrap gap-2.5">
              {[
                { icon: <Video className="w-3.5 h-3.5" />, text: "Teleconsultations" },
                { icon: <FileText className="w-3.5 h-3.5" />, text: "Digital Rx & Follow-ups" },
                { icon: <ShieldCheck className="w-3.5 h-3.5" />, text: "NMC Guideline Compliant" },
              ].map(({ icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white/95 text-[11px] font-medium"
                >
                  {icon}
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel: Login / OTP Form */}
        <div className="flex-1 p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-white">
          {/* Mobile Header */}
          <div className="flex items-center gap-3 mb-6 lg:hidden">
            <div className="w-10 h-10 bg-white rounded-lg p-1.5 flex items-center justify-center border border-slate-200 shrink-0">
              <img
                src="/real-logo.png"
                alt="MediConnect"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <p className="text-slate-900 font-bold text-base leading-tight">MediConnect</p>
              <p className="text-[#0067A1] text-[11px] font-semibold uppercase tracking-widest">Doctor Portal</p>
            </div>
          </div>

          {/* Stepper Dots */}
          <div className="flex items-center gap-2 mb-7">
            <div className={`flex items-center gap-2 text-xs font-semibold ${step >= 1 ? "text-[#0067A1]" : "text-slate-400"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step >= 1 ? "bg-[#0067A1] text-white" : "bg-slate-200 text-slate-500"}`}>
                {step > 1 ? <CheckCircle2 className="w-3.5 h-3.5" /> : "1"}
              </div>
              {method === "phone" ? "Mobile" : "Email"}
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 text-[#0067A1] text-xs font-semibold rounded-full border border-sky-200 mb-3">
              <Stethoscope className="w-3.5 h-3.5 text-[#0067A1]" />
              <span>Verified Specialist Access</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
              {step === 1 ? "Doctor Sign In" : "Enter Verification Code"}
            </h1>
            <p className="text-slate-500 text-sm">
              {step === 1
                ? "Sign in to manage your appointments, write prescriptions, and consult patients."
                : `We have sent a 6-digit OTP to ${method === "phone" ? `+91 ${phone}` : email}.`}
            </p>
          </div>

          {/* STEP 1: Phone / Email Form */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              {/* Method Switcher */}
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setMethod("phone")}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    method === "phone" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  Mobile Number
                </button>
                <button
                  type="button"
                  onClick={() => setMethod("email")}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    method === "email" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  Email Address
                </button>
              </div>

              {method === "phone" ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">
                    Mobile Number
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-sm font-semibold text-slate-500 border-r border-slate-200 pr-2.5">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="Enter 10-digit number"
                      autoFocus
                      className="w-full pl-16 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] transition-all"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">
                    Registered Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@example.com"
                    autoFocus
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] transition-all"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-[#0B3A5B] hover:bg-[#1677A8] text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: OTP Verification */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-3 uppercase tracking-wider text-center">
                  6-Digit OTP
                </label>
                <div className="flex justify-center gap-2 sm:gap-3">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-11 h-13 sm:w-12 sm:h-14 text-center font-bold text-lg sm:text-xl text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all"
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change {method === "phone" ? "Number" : "Email"}</span>
                </button>

                {resendTimer > 0 ? (
                  <span className="text-slate-400">Resend in {resendTimer}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="flex items-center gap-1 text-[#0067A1] hover:underline font-semibold cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Resend OTP</span>
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || otp.join("").length !== 6}
                className="w-full py-3.5 px-4 bg-[#0B3A5B] hover:bg-[#1677A8] text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Verify OTP</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer Navigation Links */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              <span>New doctor? </span>
              <Link
                href="/doctor/onboarding"
                className="text-[#0067A1] font-semibold hover:underline"
              >
                Join as Partner
              </Link>
            </div>
            <Link
              href="/"
              className="text-slate-500 hover:text-slate-800 transition-colors"
            >
              Back to Website
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}
