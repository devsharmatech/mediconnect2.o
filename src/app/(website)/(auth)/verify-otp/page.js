'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/utils/websiteApi';
import { FaArrowLeft, FaPhone, FaEnvelope, FaShieldAlt, FaCheckCircle } from 'react-icons/fa';

function VerifyOtpContent() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [loginMethod, setLoginMethod] = useState('phone');
  const [verificationType, setVerificationType] = useState('login');
  const [userType, setUserType] = useState('patient');
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [userId, setUserId] = useState(null);
  const [successAnim, setSuccessAnim] = useState(false);
  const inputRefs = useRef([]);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const type = searchParams.get('type');
    setVerificationType(type === 'registration' ? 'registration' : 'login');
    
    const storedPhone = sessionStorage.getItem('loginPhoneNumber');
    const storedEmail = sessionStorage.getItem('loginEmail');
    const storedMethod = sessionStorage.getItem('loginMethod') || 'phone';
    const storedUserId = sessionStorage.getItem('userId');
    const storedUserType = sessionStorage.getItem('loginUserType') || 'patient';
    const regPhone = sessionStorage.getItem('registrationPhone');
    
    setUserType(storedUserType);
    if (storedUserId) setUserId(storedUserId);
    
    if (type === 'registration' && regPhone) {
      setIdentifier(regPhone);
      setLoginMethod('phone');
    } else if (storedMethod === 'email' && storedEmail) {
      setIdentifier(storedEmail);
      setLoginMethod('email');
    } else if (storedPhone) {
      setIdentifier(storedPhone);
      setLoginMethod('phone');
    } else {
      router.push('/website');
      return;
    }

    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router, searchParams]);

  const handleOtpChange = (value, index) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !e.target.value && index > 0) {
      inputRefs.current[index - 1]?.focus();
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
      const focusIndex = Math.min(pasteData.length, 5);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      let currentUserId = userId;
      if (!currentUserId) {
        const loginPayload = loginMethod === 'email' 
          ? { email: identifier } 
          : { phone_number: identifier };
        const loginEndpoint = userType === 'doctor' ? '/website/auth/doctor/login' : '/website/auth/patient/login';
        const loginResponse = await api.post(loginEndpoint, loginPayload);
        if (!loginResponse.success || !loginResponse.data?.user_id) {
          throw new Error('Failed to verify OTP. Please try again.');
        }
        currentUserId = loginResponse.data.user_id;
      }

      const response = await api.post('/website/auth/validate-otp', {
        user_id: currentUserId || undefined,
        phone_number: loginMethod === 'phone' ? identifier : undefined,
        email: loginMethod === 'email' ? identifier : undefined,
        otp: otpValue,
      });

      if (response.success) {
        setSuccessAnim(true);
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
          const redirectPath = role === 'doctor' ? '/doctor' : '/website/dashboard';
          router.push(redirectPath);
        }, 1200);
      } else {
        throw new Error(response.error || 'Invalid OTP. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    try {
      setLoading(true);
      setError('');
      const payload = loginMethod === 'email' 
        ? { email: identifier } 
        : { phone_number: identifier };
      const endpoint = userType === 'doctor' ? '/website/auth/doctor/login' : '/website/auth/patient/login';
      const response = await api.post(endpoint, payload);
      if (response.success) {
        setCanResend(false);
        setResendTimer(30);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        const timer = setInterval(() => {
          setResendTimer((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              setCanResend(true);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        throw new Error(response.error || 'Failed to resend OTP. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const maskedIdentifier = loginMethod === 'phone' && identifier.length >= 4
    ? '•'.repeat(identifier.length - 4) + identifier.slice(-4)
    : identifier;

  const filledCount = otp.filter(d => d !== '').length;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Back link */}
      <Link
        href="/website"
        className="inline-flex items-center gap-2 mb-5 text-sm font-medium text-gray-500 hover:text-[#0067A1] transition-all duration-200 group"
      >
        <FaArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Home</span>
      </Link>

      {/* Main card */}
      <div
        className={`relative overflow-hidden rounded-3xl border transition-all duration-500 ${
          successAnim
            ? 'bg-emerald-50 border-emerald-200 shadow-lg shadow-emerald-100'
            : 'bg-white/90 backdrop-blur-xl border-white/60 shadow-xl shadow-[#0067A1]/[0.06]'
        }`}
      >
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-gradient-to-r from-[#0067A1] to-teal-400 transition-all duration-500 ease-out rounded-r-full"
            style={{ width: `${(filledCount / 6) * 100}%` }}
          />
        </div>

        <div className="px-6 sm:px-8 py-8 sm:py-10">
          {/* Icon */}
          <div className="flex justify-center mb-5">
            {successAnim ? (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-400 flex items-center justify-center shadow-lg shadow-emerald-200 animate-bounce">
                <FaCheckCircle className="w-7 h-7 text-white" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0067A1] to-teal-500 flex items-center justify-center shadow-lg shadow-[#0067A1]/30">
                <FaShieldAlt className="w-7 h-7 text-white" />
              </div>
            )}
          </div>

          {/* Header */}
          <div className="text-center mb-7">
            <h1 className="text-2xl sm:text-[26px] font-bold text-gray-900 tracking-tight">
              {successAnim
                ? '✓ Verified!'
                : verificationType === 'registration'
                  ? 'Verify Your Account'
                  : 'Enter Verification Code'}
            </h1>

            {successAnim ? (
              <p className="mt-2 text-sm text-emerald-600 font-medium animate-pulse">
                Redirecting you now...
              </p>
            ) : (
              <>
                <p className="mt-2 text-sm text-gray-500">
                  We sent a 6-digit code to
                </p>
                <div className="mt-3 inline-flex items-center gap-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-full px-5 py-2.5">
                  {loginMethod === 'email' ? (
                    <FaEnvelope className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <FaPhone className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                  <span className="text-sm font-semibold text-emerald-800 tracking-wider">
                    {maskedIdentifier}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 animate-[slideDown_0.3s_ease]">
              <svg className="w-5 h-5 text-red-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* OTP Form */}
          {!successAnim && (
            <form onSubmit={handleSubmit}>
              {/* OTP Inputs */}
              <div className="flex justify-center gap-2.5 sm:gap-3 mb-6">
                {otp.map((data, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    value={data}
                    onChange={(e) => handleOtpChange(e.target.value, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className={`
                      w-12 h-14 sm:w-14 sm:h-16
                      text-center text-xl sm:text-2xl font-bold text-gray-900
                      rounded-xl sm:rounded-2xl
                      border-2 outline-none
                      transition-all duration-200
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${data
                        ? 'border-teal-400 bg-teal-50/50 shadow-sm shadow-teal-100'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                      }
                      focus:border-[#0067A1] focus:ring-4 focus:ring-[#0067A1]/10 focus:bg-white focus:-translate-y-0.5 focus:shadow-md
                    `}
                    autoFocus={index === 0}
                    disabled={loading}
                    aria-label={`OTP digit ${index + 1}`}
                  />
                ))}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || filledCount < 6}
                className={`
                  w-full flex justify-center items-center gap-2.5 py-3.5 sm:py-4 px-6
                  text-sm sm:text-base font-semibold text-white
                  rounded-xl sm:rounded-2xl
                  transition-all duration-300
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none
                  ${filledCount >= 6
                    ? 'bg-gradient-to-r from-[#0067A1] to-[#0080C6] shadow-lg shadow-[#0067A1]/30 hover:shadow-xl hover:shadow-[#0067A1]/40 hover:-translate-y-0.5 active:translate-y-0'
                    : 'bg-gray-300 cursor-not-allowed'
                  }
                `}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <FaShieldAlt className="w-4 h-4" />
                    <span>Verify & Continue</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Resend */}
          {!successAnim && (
            <div className="flex flex-col items-center gap-1.5 mt-6">
              <span className="text-xs text-gray-400">Didn't receive the code?</span>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={!canResend || loading}
                className={`text-sm font-semibold px-4 py-1.5 rounded-lg transition-all duration-200 ${
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
          )}

          {/* Security note */}
          {!successAnim && (
            <div className="flex items-center justify-center gap-2 mt-7 pt-5 border-t border-gray-100">
              <FaShieldAlt className="w-3 h-3 text-gray-300" />
              <span className="text-[11px] text-gray-400">
                Your information is protected with end-to-end encryption
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-gray-200 border-t-[#0067A1]"></div>
      </div>
    }>
      <VerifyOtpContent />
    </Suspense>
  );
}