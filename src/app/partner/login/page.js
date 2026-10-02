"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Phone, Shield, ArrowRight, RotateCcw } from "lucide-react";

export default function PartnerLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [partnerId, setPartnerId] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!phone.trim()) { toast.error("Enter your phone number"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/partner/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (data.success) {
        setPartnerId(data.data.partner_id);
        setStep(2);
        toast.success("OTP sent to your registered number");
      } else {
        toast.error(data.message || "Phone number not registered");
      }
    } catch {
      toast.error("Server error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) { toast.error("Enter the OTP"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/partner/auth/validate-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: partnerId, otp }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("partnerUser", JSON.stringify(data.data.partner));
        toast.success("Welcome back!");
        router.replace("/partner/dashboard");
      } else {
        toast.error(data.message || "Invalid OTP");
      }
    } catch {
      toast.error("Server error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#0067A1] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#0067A1]/20">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MediConnect</h1>
          <p className="text-sm text-gray-500 mt-1">Partner Portal</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-gray-100">
            <div
              className="h-1 bg-[#0067A1] transition-all duration-500"
              style={{ width: step === 1 ? "50%" : "100%" }}
            />
          </div>

          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                {step === 1 ? "Partner Login" : "Verify OTP"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {step === 1
                  ? "Enter your registered phone number"
                  : `OTP sent to +91 ${phone.replace(/\D/g, "").slice(-10)}`}
              </p>
            </div>

            {step === 1 ? (
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <Phone className="w-4.5 h-4.5" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                    placeholder="Enter 10-digit mobile number"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0067A1]/25 focus:border-[#0067A1] transition-all"
                  />
                </div>
                <button
                  onClick={handleSendOtp}
                  disabled={loading || phone.length < 10}
                  className="w-full py-3 bg-[#0067A1] hover:bg-[#004F7C] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Send OTP <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <Shield className="w-4.5 h-4.5" />
                  </div>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                    placeholder="Enter 6-digit OTP"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-center tracking-[0.4em] text-lg font-bold focus:outline-none focus:ring-2 focus:ring-[#0067A1]/25 focus:border-[#0067A1] transition-all"
                    maxLength={6}
                  />
                </div>
                <button
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.length < 6}
                  className="w-full py-3 bg-[#0067A1] hover:bg-[#004F7C] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Verify & Login <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => { setStep(1); setOtp(""); }}
                    className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowRight className="w-3 h-3 rotate-180" /> Change number
                  </button>
                  <button
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="text-xs text-[#0067A1] hover:text-[#004F7C] flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Resend OTP
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Only registered partners can access this portal.
          <br />Contact your MediConnect admin to get access.
        </p>
      </div>
    </div>
  );
}
