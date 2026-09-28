"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { sendOtp, verifyOtp, setLoggedInUser } from "@/lib/authHelpers";

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
    const role = localStorage.getItem("userRole");
    const token = localStorage.getItem("authToken") || localStorage.getItem("userData");
    if (role === "chemist" && token) {
      router.replace("/chemist/dashboard");
    }
  }, [router]);

  const handleSendOtp = async () => {
    if (!phone.trim()) {
      toast.error("Please enter your phone number", { id: "auth-toast" });
      return;
    }
    if (loading) return;
    setLoading(true);
    const data = await sendOtp(phone, "chemist");
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
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        * { font-family: 'Inter', sans-serif; box-sizing: border-box; }

        .cl-page {
          min-height: 100vh;
          background: #0a0f1e;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }

        /* Ambient blobs */
        .cl-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          animation: blobFloat 8s ease-in-out infinite;
        }
        .cl-blob-1 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(0,103,161,0.35) 0%, transparent 70%);
          top: -100px; left: -100px;
          animation-delay: 0s;
        }
        .cl-blob-2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(0,180,140,0.2) 0%, transparent 70%);
          bottom: -80px; right: -80px;
          animation-delay: 3s;
        }
        .cl-blob-3 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(102,51,204,0.15) 0%, transparent 70%);
          top: 50%; left: 50%; transform: translate(-50%,-50%);
          animation-delay: 6s;
        }
        @keyframes blobFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }

        /* Grid lines */
        .cl-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
        }

        /* Card */
        .cl-card {
          width: 100%;
          max-width: 460px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 28px;
          padding: 48px 44px;
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          position: relative;
          z-index: 10;
          box-shadow: 0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset;
        }

        /* Logo area */
        .cl-logo-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 40px;
        }
        .cl-logo-icon {
          width: 40px; height: 40px;
          background: linear-gradient(135deg, #0067A1 0%, #00b48c 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(0,103,161,0.5);
        }
        .cl-logo-text {
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.3px;
        }
        .cl-logo-sub {
          font-size: 11px;
          color: rgba(255,255,255,0.35);
          font-weight: 400;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        /* Badge */
        .cl-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(0,180,140,0.1);
          border: 1px solid rgba(0,180,140,0.25);
          color: #00c896;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 100px;
          letter-spacing: 0.3px;
          margin-bottom: 20px;
        }
        .cl-badge-dot {
          width: 6px; height: 6px;
          background: #00c896;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        /* Heading */
        .cl-heading {
          font-size: 30px;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.8px;
          line-height: 1.2;
          margin-bottom: 8px;
        }
        .cl-heading span {
          background: linear-gradient(90deg, #0067A1, #00b48c);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .cl-subheading {
          font-size: 14px;
          color: rgba(255,255,255,0.4);
          margin-bottom: 36px;
          line-height: 1.5;
        }

        /* Step indicator */
        .cl-steps {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 32px;
        }
        .cl-step-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 600;
        }
        .cl-step-num {
          width: 24px; height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          transition: all 0.3s;
        }
        .cl-step-num.active {
          background: linear-gradient(135deg, #0067A1, #00b48c);
          color: #fff;
          box-shadow: 0 4px 12px rgba(0,103,161,0.4);
        }
        .cl-step-num.done {
          background: rgba(0,200,150,0.2);
          color: #00c896;
          border: 1px solid rgba(0,200,150,0.3);
        }
        .cl-step-num.inactive {
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.3);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .cl-step-label {
          color: rgba(255,255,255,0.4);
          font-size: 12px;
        }
        .cl-step-label.active { color: rgba(255,255,255,0.8); }
        .cl-step-divider {
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.08);
        }

        /* Input */
        .cl-input-wrap {
          position: relative;
          margin-bottom: 16px;
        }
        .cl-input-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255,255,255,0.3);
          pointer-events: none;
        }
        .cl-input {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          padding: 16px 16px 16px 48px;
          color: #fff;
          font-size: 15px;
          font-weight: 500;
          outline: none;
          transition: all 0.2s;
        }
        .cl-input::placeholder { color: rgba(255,255,255,0.2); }
        .cl-input:focus {
          border-color: rgba(0,103,161,0.6);
          background: rgba(0,103,161,0.08);
          box-shadow: 0 0 0 3px rgba(0,103,161,0.15);
        }
        .cl-input.otp-input {
          text-align: center;
          font-size: 24px;
          letter-spacing: 10px;
          font-weight: 700;
          padding: 18px;
        }

        /* Buttons */
        .cl-btn-primary {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #0067A1 0%, #005588 100%);
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.25s;
          box-shadow: 0 8px 24px rgba(0,103,161,0.35);
          position: relative;
          overflow: hidden;
          letter-spacing: 0.2px;
        }
        .cl-btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #0078bb 0%, #006694 100%);
          transform: translateY(-1px);
          box-shadow: 0 12px 32px rgba(0,103,161,0.5);
        }
        .cl-btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        .cl-btn-primary::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          transition: left 0.5s;
        }
        .cl-btn-primary:hover:not(:disabled)::before {
          left: 100%;
        }

        .cl-btn-secondary {
          flex: 1;
          padding: 14px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.7);
          font-size: 14px;
          font-weight: 600;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .cl-btn-secondary:hover:not(:disabled) {
          background: rgba(255,255,255,0.08);
          color: #fff;
        }
        .cl-btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

        .cl-btn-row {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }

        /* Spinner */
        .cl-spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Resend */
        .cl-resend {
          text-align: center;
          margin-top: 12px;
        }
        .cl-resend-btn {
          background: none; border: none;
          color: rgba(0,180,140,0.8);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          transition: color 0.2s;
        }
        .cl-resend-btn:hover { color: #00c896; }
        .cl-resend-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Footer */
        .cl-footer {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: center;
        }
        .cl-footer-text {
          font-size: 12px;
          color: rgba(255,255,255,0.25);
        }
        .cl-lock-icon { color: rgba(255,255,255,0.2); }

        /* OTP hint */
        .cl-otp-hint {
          background: rgba(0,103,161,0.1);
          border: 1px solid rgba(0,103,161,0.2);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 12px;
          color: rgba(255,255,255,0.5);
          margin-bottom: 16px;
          text-align: center;
        }
        .cl-otp-hint strong { color: #4da8d8; }

        /* Phone prefix */
        .cl-prefix {
          position: absolute;
          left: 48px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255,255,255,0.5);
          font-size: 15px;
          font-weight: 500;
          pointer-events: none;
        }
        .cl-input.with-prefix { padding-left: 80px; }

        /* Features */
        .cl-features {
          display: flex;
          gap: 12px;
          margin-bottom: 32px;
        }
        .cl-feature {
          flex: 1;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 12px;
          text-align: center;
        }
        .cl-feature-icon {
          font-size: 18px;
          margin-bottom: 4px;
        }
        .cl-feature-label {
          font-size: 10px;
          color: rgba(255,255,255,0.3);
          font-weight: 500;
          letter-spacing: 0.3px;
        }
      `}</style>

      <div className="cl-page">
        {/* Ambient blobs */}
        <div className="cl-blob cl-blob-1" />
        <div className="cl-blob cl-blob-2" />
        <div className="cl-blob cl-blob-3" />
        {/* Grid */}
        <div className="cl-grid" />

        <div className="cl-card">
          {/* Logo */}
          <div className="cl-logo-wrap">
            <div className="cl-logo-icon">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div>
              <div className="cl-logo-text">MediConnect</div>
              <div className="cl-logo-sub">Chemist Portal</div>
            </div>
          </div>

          {/* Badge */}
          <div className="cl-badge">
            <div className="cl-badge-dot" />
            Secure Professional Access
          </div>

          {/* Heading */}
          <div className="cl-heading">
            Welcome back,<br />
            <span>Pharmacist</span>
          </div>
          <div className="cl-subheading">
            {step === 1
              ? "Enter your registered mobile number to access your dashboard."
              : `We've sent a 6-digit OTP to +91 ${phone}. Please enter it below.`}
          </div>

          {/* Step indicator */}
          <div className="cl-steps">
            <div className="cl-step-item">
              <div className={`cl-step-num ${step === 1 ? "active" : "done"}`}>
                {step === 1 ? "1" : (
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`cl-step-label ${step === 1 ? "active" : ""}`}>Phone</span>
            </div>
            <div className="cl-step-divider" />
            <div className="cl-step-item">
              <div className={`cl-step-num ${step === 2 ? "active" : "inactive"}`}>2</div>
              <span className={`cl-step-label ${step === 2 ? "active" : ""}`}>Verify</span>
            </div>
          </div>

          {/* Features strip */}
          {step === 1 && (
            <div className="cl-features">
              <div className="cl-feature">
                <div className="cl-feature-icon">🔒</div>
                <div className="cl-feature-label">Encrypted</div>
              </div>
              <div className="cl-feature">
                <div className="cl-feature-icon">⚡</div>
                <div className="cl-feature-label">Instant OTP</div>
              </div>
              <div className="cl-feature">
                <div className="cl-feature-icon">✅</div>
                <div className="cl-feature-label">Verified</div>
              </div>
            </div>
          )}

          {/* Step 1: Phone */}
          {step === 1 ? (
            <div>
              <div className="cl-input-wrap">
                <div className="cl-input-icon">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28l1.498 4.493-2.257 1.13a11 11 0 005.516 5.516l1.13-2.257 4.493 1.498V19a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
                  </svg>
                </div>
                <span className="cl-prefix">+91</span>
                <input
                  type="tel"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="cl-input with-prefix"
                  onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                  autoFocus
                  maxLength={10}
                />
              </div>

              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="cl-btn-primary"
              >
                {loading ? (
                  <>
                    <div className="cl-spinner" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    Send OTP
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Step 2: OTP */
            <div>
              <div className="cl-otp-hint">
                Developer bypass OTP: <strong>123456</strong>
              </div>
              <div className="cl-input-wrap">
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
                  className="cl-input otp-input"
                  maxLength={6}
                  onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                  autoFocus
                />
              </div>

              <div className="cl-btn-row">
                <button onClick={handleBack} disabled={loading} className="cl-btn-secondary">
                  ← Back
                </button>
                <button
                  onClick={handleVerifyOtp}
                  disabled={loading}
                  className="cl-btn-primary"
                  style={{ flex: 2 }}
                >
                  {loading ? (
                    <>
                      <div className="cl-spinner" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify & Login
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>

              <div className="cl-resend">
                <button onClick={handleSendOtp} disabled={loading} className="cl-resend-btn">
                  Didn't receive it? Resend OTP
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="cl-footer">
            <svg className="cl-lock-icon" width="12" height="12" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span className="cl-footer-text">Secure chemist access portal • All data encrypted • HIPAA compliant</span>
          </div>
        </div>
      </div>
    </>
  );
}