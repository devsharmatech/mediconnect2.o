'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FaTimes, FaPhone, FaEnvelope, FaArrowRight, FaShieldAlt, FaUser, FaUserMd, FaArrowLeft, FaCheckCircle, FaLock } from 'react-icons/fa';
import api from '@/utils/websiteApi';
import dynamic from 'next/dynamic';

const SignupModal = dynamic(
  () => import('@/components/public-site/auth/SignupModal'),
  {
    ssr: false,
  }
);

const LoginModal = ({ isOpen, onClose, onSignupClick, initialUserType = 'patient', onSuccess }) => {
  const [userType, setUserType] = useState(initialUserType);
  const [loginMethod, setLoginMethod] = useState('phone');
  const [formData, setFormData] = useState({
    phone_number: '',
    email: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [step, setStep] = useState('login'); // 'login' | 'otp' | 'success'
  const [userId, setUserId] = useState(null);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const otpRefs = useRef([]);
  const timerRef = useRef(null);
  const router = useRouter();

  const handleOpenSignup = (e) => {
    e?.preventDefault();
    onSignupClick?.(e);
  };

  useEffect(() => {
    if (isOpen) {
      setUserType(initialUserType || 'patient');
      setIsAnimating(true);
      window.scrollTo(0, 0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      // Reset state when modal closes
      setStep('login');
      setOtp(['', '', '', '', '', '']);
      setError('');
      setUserId(null);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      document.body.style.overflow = 'unset';
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, initialUserType]);

  const startResendTimer = () => {
    setCanResend(false);
    setResendTimer(30);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone_number' && isNaN(value)) return;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Step 1: Send OTP
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const identifier = loginMethod === 'phone' ? formData.phone_number : formData.email;
    if (!identifier) {
      setError(`Please enter your ${loginMethod === 'phone' ? 'phone number' : 'email address'}`);
      return;
    }

    setLoading(true);
    try {
      const payload = loginMethod === 'phone'
        ? { phone_number: formData.phone_number }
        : { email: formData.email };
      const endpoint = userType === 'doctor' ? '/website/auth/doctor/login' : '/website/auth/patient/login';
      const response = await api.post(endpoint, payload);

      if (response.success) {
        setUserId(response.data.user_id);
        // Store in session for fallback
        if (loginMethod === 'phone') {
          sessionStorage.setItem('loginPhoneNumber', formData.phone_number);
        } else {
          sessionStorage.setItem('loginEmail', formData.email);
        }
        sessionStorage.setItem('loginMethod', loginMethod);
        sessionStorage.setItem('loginUserType', userType);
        sessionStorage.setItem('userId', response.data.user_id);
        // Move to OTP step
        setStep('otp');
        setOtp(['', '', '', '', '', '']);
        startResendTimer();
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  // OTP input handlers
  const handleOtpChange = (value, index) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value !== '' && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !e.target.value && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim().slice(0, 6);
    if (/^\d+$/.test(pasteData)) {
      const newOtp = [...otp];
      for (let i = 0; i < pasteData.length && i < 6; i++) {
        newOtp[i] = pasteData[i];
      }
      setOtp(newOtp);
      otpRefs.current[Math.min(pasteData.length, 5)]?.focus();
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/website/auth/validate-otp', {
        user_id: userId || undefined,
        phone_number: loginMethod === 'phone' ? formData.phone_number : undefined,
        email: loginMethod === 'email' ? formData.email : undefined,
        otp: otpValue,
      });

      if (response.success) {
        setStep('success');
        const { user_id, role, user } = response.data || {};
        if (typeof window !== 'undefined') {
          if (response.data?.token) localStorage.setItem('authToken', response.data.token);
          if (user_id) localStorage.setItem('userId', String(user_id));
          if (role) localStorage.setItem('userRole', role);
          if (user) localStorage.setItem('userData', JSON.stringify(user));
          sessionStorage.removeItem('loginPhoneNumber');
          sessionStorage.removeItem('loginEmail');
          sessionStorage.removeItem('loginMethod');
          sessionStorage.removeItem('loginUserType');
          sessionStorage.removeItem('registrationPhone');
          sessionStorage.removeItem('userId');
        }

        setTimeout(() => {
          onClose();
          if (onSuccess) {
            onSuccess(response.data);
          } else {
            const redirectPath = role === 'doctor' ? '/doctor' : '/website/dashboard';
            router.push(redirectPath);
          }
        }, 1000);
      } else {
        throw new Error(response.error || 'Invalid OTP. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!canResend) return;
    try {
      setLoading(true);
      setError('');
      const payload = loginMethod === 'email'
        ? { email: formData.email }
        : { phone_number: formData.phone_number };
      const endpoint = userType === 'doctor' ? '/website/auth/doctor/login' : '/website/auth/patient/login';
      const response = await api.post(endpoint, payload);
      if (response.success) {
        setOtp(['', '', '', '', '', '']);
        startResendTimer();
        otpRefs.current[0]?.focus();
      } else {
        throw new Error(response.error || 'Failed to resend OTP.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const identifier = loginMethod === 'phone' ? formData.phone_number : formData.email;
  const maskedIdentifier = loginMethod === 'phone' && identifier.length >= 4
    ? '•'.repeat(identifier.length - 4) + identifier.slice(-4)
    : identifier;
  const filledCount = otp.filter(d => d !== '').length;

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto transition-all duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className={`relative w-full max-w-sm sm:max-w-md bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all duration-300 ${isAnimating ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
        style={{ maxHeight: '85vh' }}
      >
        {/* Close button */}
        <button
          type="button"
          className="absolute right-3 top-3 z-10 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
          onClick={onClose}
        >
          <FaTimes className="h-4 w-4" />
        </button>

        <div className="p-4 sm:p-5 md:p-6 pt-10 overflow-y-auto" style={{ maxHeight: '85vh' }}>

          {/* ========== STEP 1: LOGIN ========== */}
          {step === 'login' && (
            <>
              {/* Header */}
              <div className="text-center mb-5">
                <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#0067A1]/10 mb-2">
                  <FaShieldAlt className="w-5 h-5 text-[#0067A1]" />
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">
                  Welcome Back
                </h2>
                <p className="text-sm text-gray-500">
                  New here?{' '}
                  <button onClick={handleOpenSignup} className="font-semibold text-[#0067A1] hover:text-[#004F7C] transition-colors">
                    Create an account
                  </button>
                </p>
              </div>

              {/* User Type Selector */}
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setUserType('patient')}
                  className={`flex-1 flex flex-col items-center py-3 px-3 rounded-xl border-2 transition-all duration-300 ${
                    userType === 'patient'
                      ? 'border-[#0067A1] bg-[#0067A1]/5 text-[#0067A1]'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <FaUser className={`text-xl mb-1 ${userType === 'patient' ? 'text-[#0067A1]' : 'text-gray-400'}`} />
                  <span className="font-medium text-xs">Patient</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUserType('doctor')}
                  className={`flex-1 flex flex-col items-center py-3 px-3 rounded-xl border-2 transition-all duration-300 ${
                    userType === 'doctor'
                      ? 'border-green-500 bg-green-50 text-green-600'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <FaUserMd className={`text-xl mb-1 ${userType === 'doctor' ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className="font-medium text-xs">Doctor</span>
                </button>
              </div>

              {/* Login Method Toggle */}
              <div className="flex bg-gray-100 rounded-xl p-1 mb-4 text-xs sm:text-sm">
                <button
                  type="button"
                  onClick={() => setLoginMethod('phone')}
                  className={`flex-1 flex items-center justify-center py-2.5 px-3 rounded-lg font-medium transition-all duration-300 ${
                    loginMethod === 'phone' ? 'bg-white text-[#0067A1] shadow-md' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <FaPhone className="mr-2" /> Phone
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod('email')}
                  className={`flex-1 flex items-center justify-center py-2.5 px-3 rounded-lg font-medium transition-all duration-300 ${
                    loginMethod === 'email' ? 'bg-white text-[#0067A1] shadow-md' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <FaEnvelope className="mr-2" /> Email
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm">
                  <p className="text-sm text-red-600 flex items-center">
                    <svg className="w-4 h-4 mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                {loginMethod === 'phone' ? (
                  <div className="relative">
                    <label htmlFor="phone_number" className="block text-xs font-medium text-gray-700 mb-1.5">Phone Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FaPhone className="text-gray-400 text-xs" />
                      </div>
                      <input
                        id="phone_number"
                        name="phone_number"
                        type="tel"
                        placeholder="Enter your phone number"
                        required
                        value={formData.phone_number}
                        onChange={handleChange}
                        className="w-full pl-11 pr-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all text-gray-900 placeholder-gray-400 text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1.5">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FaEnvelope className="text-gray-400 text-xs" />
                      </div>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Enter your email address"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full pl-11 pr-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all text-gray-900 placeholder-gray-400 text-sm"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group w-full py-2.5 px-4 bg-[#0067A1] hover:bg-[#004F7C] text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending OTP...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      Send OTP
                      <FaArrowRight className="ml-1.5 text-xs group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </button>
              </form>

              <p className="mt-4 text-center text-[11px] text-gray-500 flex items-center justify-center gap-1.5">
                <FaLock className="w-3 h-3 text-gray-400 shrink-0" />
                <span>Your information is secured with end-to-end encryption</span>
              </p>
            </>
          )}

          {/* ========== STEP 2: OTP VERIFICATION ========== */}
          {step === 'otp' && (
            <>
              {/* Back button */}
              <button
                type="button"
                onClick={() => { setStep('login'); setError(''); setOtp(['', '', '', '', '', '']); }}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0067A1] transition-colors mb-4 group"
              >
                <FaArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                <span>Change number</span>
              </button>

              {/* Header */}
              <div className="text-center mb-5">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0067A1] to-teal-500 shadow-lg shadow-[#0067A1]/20 mb-3">
                  <FaShieldAlt className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1.5">
                  Enter Verification Code
                </h2>
                <p className="text-sm text-gray-500 mb-2">
                  We sent a 6-digit code to
                </p>
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-full px-4 py-2">
                  {loginMethod === 'email' ? (
                    <FaEnvelope className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <FaPhone className="w-3 h-3 text-emerald-600" />
                  )}
                  <span className="text-sm font-semibold text-emerald-800 tracking-wide">
                    {maskedIdentifier}
                  </span>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <svg className="w-4 h-4 text-red-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}

              {/* OTP Form */}
              <form onSubmit={handleVerifyOtp}>
                {/* Progress bar */}
                <div className="h-1 bg-gray-100 rounded-full mb-5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#0067A1] to-teal-400 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${(filledCount / 6) * 100}%` }}
                  />
                </div>

                {/* OTP Inputs */}
                <div className="flex justify-center gap-2 sm:gap-2.5 mb-5">
                  {otp.map((data, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength="1"
                      value={data}
                      onChange={(e) => handleOtpChange(e.target.value, index)}
                      onKeyDown={(e) => handleOtpKeyDown(e, index)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      className={`
                        w-11 h-13 sm:w-12 sm:h-14
                        text-center text-lg sm:text-xl font-bold text-gray-900
                        rounded-xl border-2 outline-none
                        transition-all duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${data
                          ? 'border-teal-400 bg-teal-50/50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                        }
                        focus:border-[#0067A1] focus:ring-4 focus:ring-[#0067A1]/10 focus:bg-white focus:-translate-y-0.5 focus:shadow-md
                      `}
                      disabled={loading}
                      aria-label={`OTP digit ${index + 1}`}
                    />
                  ))}
                </div>

                {/* Verify Button */}
                <button
                  type="submit"
                  disabled={loading || filledCount < 6}
                  className={`
                    w-full flex justify-center items-center gap-2 py-3 px-4
                    text-sm font-semibold text-white rounded-xl
                    transition-all duration-300
                    disabled:opacity-40 disabled:cursor-not-allowed
                    ${filledCount >= 6
                      ? 'bg-gradient-to-r from-[#0067A1] to-[#0080C6] shadow-lg shadow-[#0067A1]/30 hover:shadow-xl hover:-translate-y-0.5'
                      : 'bg-gray-300'
                    }
                  `}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <FaShieldAlt className="w-3.5 h-3.5" />
                      <span>Verify & Continue</span>
                    </>
                  )}
                </button>
              </form>

              {/* Resend */}
              <div className="flex flex-col items-center gap-1.5 mt-5">
                <span className="text-xs text-gray-400">Didn't receive the code?</span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={!canResend || loading}
                  className={`text-sm font-semibold px-4 py-1.5 rounded-lg transition-all ${
                    canResend
                      ? 'text-[#0067A1] bg-[#0067A1]/5 hover:bg-[#0067A1]/10 cursor-pointer'
                      : 'text-gray-400 cursor-default'
                  }`}
                >
                  {canResend ? 'Resend Code' : (
                    <span>Resend in <strong className="text-[#0067A1]">{resendTimer}s</strong></span>
                  )}
                </button>
              </div>

              <p className="mt-4 text-center text-[11px] text-gray-400 flex items-center justify-center gap-1.5">
                <FaLock className="w-3 h-3 text-gray-400 shrink-0" />
                <span>Protected with end-to-end encryption</span>
              </p>
            </>
          )}

          {/* ========== STEP 3: SUCCESS ========== */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-400 shadow-lg shadow-emerald-200 mb-4 animate-bounce">
                <FaCheckCircle className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                ✓ Verified!
              </h2>
              <p className="text-sm text-emerald-600 font-medium animate-pulse">
                Redirecting you now...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
