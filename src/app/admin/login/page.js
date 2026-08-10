"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { sendOtp, verifyOtp, setLoggedInUser } from "@/lib/authHelpers";

export default function AdminLogin() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSendOtp = async () => {
    if (!phone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }

    setLoading(true);
    const data = await sendOtp(phone, "admin");
    setLoading(false);
    
    if (data.success) {
      setStep(2);
      setUserId(data.data.user_id);
      toast.success(`OTP sent successfully!`);
    } else {
      toast.error(data.message || "Failed to send OTP");
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      toast.error("Please enter the OTP");
      return;
    }

    setLoading(true);
    const data = await verifyOtp(userId, otp);
    setLoading(false);
    
    if (data.success) {
      setLoggedInUser("admin", data.data.user);
      toast.success("OTP verified successfully!");
      toast.dismiss();
      router.push("/admin/dashboard");
    } else {
      toast.error(data.message || "Invalid OTP");
    }
  };

  const handleBack = () => {
    setStep(1);
    setOtp("");
    setLoading(false);
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0067A1]/5 via-white to-[#0067A1]/10 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 transition-all duration-300 hover:shadow-[#0067A1]/10 border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#0067A1] rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm shadow-[#0067A1]/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            Admin Login
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {step === 1 ? "Enter your phone number to continue" : "Enter the OTP sent to your phone"}
          </p>
        </div>

        {/* Step 1: Phone Input */}
        {step === 1 ? (
          <div className="space-y-6">
            <div className="relative">
              <input
                type="tel"
                placeholder="Enter phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-4 pl-12 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-4 focus:ring-[#0067A1]/15 focus:border-[#0067A1] dark:bg-gray-700 dark:text-white transition-all duration-200"
                onKeyPress={(e) => e.key === 'Enter' && handleSendOtp()}
              />
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#0067A1]/50">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
            </div>

            <button
              onClick={handleSendOtp}
              disabled={loading}
              className="w-full py-4 bg-[#0067A1] hover:bg-[#004F7C] disabled:bg-gray-300 text-white rounded-xl font-semibold shadow-sm shadow-[#0067A1]/20 hover:shadow-[#0067A1]/30 transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sending OTP...</span>
                </>
              ) : (
                <>
                  <span>Send OTP</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        ) : (
          /* Step 2: OTP Verification */
          <div className="space-y-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full p-4 pl-4 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-4 focus:ring-[#0067A1]/15 focus:border-[#0067A1] dark:bg-gray-700 dark:text-white transition-all duration-200 text-center text-xl tracking-widest"
                maxLength={6}
                onKeyPress={(e) => e.key === 'Enter' && handleVerifyOtp()}
              />
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#0067A1]/50">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleBack}
                disabled={loading}
                className="flex-1 py-4 border border-[#0067A1]/20 text-[#0067A1] hover:bg-[#0067A1]/5 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 rounded-xl font-semibold transition-all duration-200"
              >
                Back
              </button>
              <button
                onClick={handleVerifyOtp}
                disabled={loading}
                className="flex-1 py-4 bg-[#0067A1] hover:bg-[#004F7C] disabled:bg-gray-300 text-white rounded-xl font-semibold shadow-sm shadow-[#0067A1]/20 hover:shadow-[#0067A1]/30 transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Verify OTP</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>

            <div className="text-center">
              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="text-[#0067A1] hover:text-[#004F7C] dark:text-gray-400 dark:hover:text-gray-300 text-sm font-medium transition-colors duration-200"
              >
                Resend OTP
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-600">
          <p className="text-center text-sm text-gray-400 dark:text-gray-500">
            Secure admin access portal
          </p>
        </div>
      </div>
    </div>
  );
}