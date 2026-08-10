"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { sendOtp, verifyOtp, setLoggedInUser } from "@/lib/authHelpers";
import Image from "next/image";

export default function LabLogin() {
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
    const data = await sendOtp(phone, "lab");
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
      setLoggedInUser("lab", data.data.user);
      toast.success("OTP verified successfully!");
      router.push("/lab/dashboard");
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
    <div className="w-full min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#1f2937",
            color: "#fff",
            border: "1px solid #004F7C",
          },
        }}
      />

      <div className="w-full max-w-4xl flex flex-col md:flex-row bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300">
        {/* Left Side - Lab Illustration with Medical Blue Theme */}
        <div className="md:w-1/2 bg-[#0067A1] p-8 flex flex-col justify-center items-center text-white relative overflow-hidden">
          {/* Decorative Background blur */}
          <div className="absolute top-10 left-10 w-64 h-64 bg-emerald-400/20 rounded-full mix-blend-overlay filter blur-[80px]"></div>
          <div className="absolute bottom-10 right-10 w-64 h-64 bg-emerald-300/20 rounded-full mix-blend-overlay filter blur-[80px]"></div>

          <div className="w-48 h-48 relative mb-6 z-10">
            {/* Lab Microscope and Test Tubes Illustration */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                {/* Microscope */}
                <div className="relative">
                  {/* Microscope Base */}
                  <div className="w-32 h-6 bg-emerald-500/50 rounded-full"></div>

                  {/* Microscope Arm */}
                  <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-4 h-24 bg-gradient-to-b from-emerald-400 to-[#0067A1] rounded-t-lg">
                    {/* Microscope Head */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-8 bg-emerald-300/40 rounded-full"></div>

                    {/* Eyepiece */}
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-12 h-3 bg-emerald-200/60 rounded-full"></div>

                    {/* Objective Lens */}
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-10 h-10 bg-gradient-to-b from-emerald-400 to-[#0067A1] rounded-full border-2 border-emerald-300/50">
                      <div className="absolute inset-2 bg-emerald-800/40 rounded-full"></div>
                    </div>
                  </div>
                </div>

                {/* Test Tubes */}
                <div className="absolute -right-8 top-12">
                  <div className="flex space-x-2">
                    {/* Test Tube 1 */}
                    <div className="relative">
                      <div className="w-6 h-16 bg-emerald-400/30 rounded-t-full border-2 border-emerald-300/50">
                        <div className="absolute bottom-0 w-full h-8 bg-gradient-to-t from-emerald-500 to-emerald-300 rounded-t-full"></div>
                      </div>
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-emerald-300/40 rounded-full"></div>
                    </div>

                    {/* Test Tube 2 */}
                    <div className="relative">
                      <div className="w-6 h-20 bg-emerald-400/30 rounded-t-full border-2 border-emerald-300/50">
                        <div className="absolute bottom-0 w-full h-12 bg-gradient-to-t from-emerald-400 to-emerald-600 rounded-t-full"></div>
                      </div>
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-emerald-300/40 rounded-full"></div>
                    </div>
                  </div>
                </div>

                {/* DNA Helix */}
                <div className="absolute -left-8 top-16">
                  <div className="relative w-16 h-16">
                    {/* DNA Strand */}
                    <div className="absolute inset-0">
                      {/* Backbone */}
                      <div className="absolute left-0 top-0 w-1 h-full bg-emerald-300/40 rounded-full"></div>
                      <div className="absolute right-0 top-0 w-1 h-full bg-emerald-300/40 rounded-full"></div>

                      {/* Base pairs */}
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="absolute left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-[#0067A1] rounded-full"
                          style={{ top: `${i * 25}%`, transform: `rotate(${i % 2 === 0 ? '10deg' : '-10deg'})` }}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 text-center z-10">Laboratory Portal</h2>
          <p className="text-emerald-100 text-center max-w-md z-10 font-light text-sm">
            Access your professional dashboard to manage lab tests,
            reports, patient samples, and diagnostics securely
          </p>

          {/* Lab Features */}
          <div className="flex space-x-6 mt-8 z-10">
            <div className="text-center">
              <div className="w-10 h-10 bg-emerald-500/30 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6 text-emerald-200" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-[11px] text-emerald-200 font-medium">Test Results</span>
            </div>

            <div className="text-center">
              <div className="w-10 h-10 bg-emerald-500/30 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-[11px] text-emerald-200 font-medium">Accurate</span>
            </div>

            <div className="text-center">
              <div className="w-10 h-10 bg-emerald-500/30 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <span className="text-[11px] text-emerald-200 font-medium">Secure Data</span>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="md:w-1/2 p-8 lg:p-12">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-sm">
              <svg
                className="w-7 h-7 text-[#0067A1]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Laboratory Login
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {step === 1
                ? "Enter your registered phone number"
                : "Enter verification code sent to your phone"}
            </p>
          </div>

          {/* Step 1: Phone Input */}
          {step === 1 ? (
            <div className="space-y-6">
              <div className="relative">
                <input
                  type="tel"
                  placeholder="+91 12345 67890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-4 pl-12 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] dark:bg-gray-700 dark:text-white transition-all duration-200 bg-gray-50"
                  onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                />
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28l1.498 4.493-2.257 1.13a11 11 0 005.516 5.516l1.13-2.257 4.493 1.498V19a2 2 0 01-2 2H5a2 2 0 01-2-2V5z"
                    />
                  </svg>
                </div>
              </div>

              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full py-4 bg-[#0067A1] hover:bg-[#004F7C] disabled:bg-gray-400 text-white rounded-xl font-bold shadow-lg hover:shadow-emerald-900/20 active:scale-[0.98] transition-all duration-200 flex items-center justify-center space-x-2 tracking-wide"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Send OTP</span>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 5l7 7-7 7M5 5l7 7-7 7"
                      />
                    </svg>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Step 2: OTP */
            <div className="space-y-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] dark:bg-gray-700 dark:text-white transition-all text-center text-xl tracking-widest bg-gray-50 font-mono"
                  maxLength={6}
                  onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                />
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handleBack}
                  disabled={loading}
                  className="flex-1 py-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl font-semibold transition-all duration-200"
                >
                  Back
                </button>
                <button
                  onClick={handleVerifyOtp}
                  disabled={loading}
                  className="flex-1 py-4 bg-[#0067A1] hover:bg-[#004F7C] disabled:bg-gray-400 text-white rounded-xl font-bold shadow-lg hover:shadow-emerald-900/20 active:scale-[0.98] transition-all md:flex-grow flex items-center justify-center tracking-wide"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </>
                  ) : (
                    <>
                      <span>Verify OTP</span>
                      <svg
                        className="w-4 h-4 ml-1.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="text-[#0067A1] dark:text-emerald-400 hover:underline text-sm font-semibold transition-colors duration-200"
                >
                  Resend OTP
                </button>
              </div>
            </div>
          )}

          <div className="mt-10 pt-6 border-t border-gray-100 dark:border-gray-700/50">
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 font-medium">
              <svg className="w-4 h-4 inline-block mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Secure laboratory access portal • HIPAA compliant
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}