'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/utils/websiteApi';
import {
  FaTimes, FaUser, FaEnvelope, FaPhone, FaVenusMars,
  FaCalendarAlt, FaMapMarkerAlt, FaShieldAlt,
  FaCheckCircle, FaArrowRight, FaArrowLeft
} from 'react-icons/fa';

const SignupModal = ({ isOpen, onClose, onLoginClick, onSuccess }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    gender: 'male',
    date_of_birth: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: Info, 2: Details, 3: OTP, 4: Success
  const [userId, setUserId] = useState(null);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const otpRefs = useRef([]);
  const timerRef = useRef(null);
  const router = useRouter();

  const handleOpenLogin = (e) => {
    e?.preventDefault();
    onLoginClick?.(e);
  };

  useEffect(() => {
    if (isOpen) {
      window.scrollTo(0, 0);
      setStep(1);
      setError('');
      setOtp(['', '', '', '', '', '']);
      setUserId(null);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      document.body.style.overflow = 'unset';
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.phone_number) {
      setError('Please fill in all required fields');
      return;
    }

    const cleanPhone = formData.phone_number.replace(/\D/g, "").slice(-10);
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setError('');
    setStep(2);
  };

  // Step 2 submit -> Register and send OTP (move to Step 3 inside modal)
  const handleSubmitRegistration = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.phone_number) {
      setError('Phone number is required');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/website/auth/patient/register', {
        phone_number: formData.phone_number,
        full_name: formData.full_name,
        email: formData.email,
        gender: formData.gender,
        date_of_birth: formData.date_of_birth,
        address: formData.address,
      });

      if (response.success) {
        setUserId(response.data.user_id);
        setStep(3); // Transition to OTP Verification inside modal
        setOtp(['', '', '', '', '', '']);
        startResendTimer();
        setTimeout(() => otpRefs.current[0]?.focus(), 150);
      } else {
        throw new Error(response.error || response.message || 'Registration failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during registration');
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  // OTP Input handlers
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

  // Step 3: Verify OTP inside modal
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
        phone_number: formData.phone_number,
        otp: otpValue,
      });

      if (response.success) {
        setStep(4);
        const { user_id, role, user } = response.data || {};
        if (typeof window !== 'undefined') {
          if (response.data?.token) localStorage.setItem('authToken', response.data.token);
          if (user_id) localStorage.setItem('userId', String(user_id));
          if (role) localStorage.setItem('userRole', role);
          if (user) localStorage.setItem('userData', JSON.stringify(user));
        }

        setTimeout(() => {
          onClose();
          if (onSuccess) {
            onSuccess(response.data);
          } else {
            router.push('/website/dashboard');
          }
        }, 1000);
      } else {
        throw new Error(response.error || response.message || 'Invalid OTP. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
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
      const response = await api.post('/website/auth/patient/register', {
        phone_number: formData.phone_number,
        full_name: formData.full_name,
        email: formData.email,
        gender: formData.gender,
        date_of_birth: formData.date_of_birth,
        address: formData.address,
      });

      if (response.success) {
        startResendTimer();
        setOtp(['', '', '', '', '', '']);
        otpRefs.current[0]?.focus();
      } else {
        throw new Error(response.error || 'Failed to resend OTP.');
      }
    } catch (err) {
      setError(err.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const maskedPhone = formData.phone_number.length >= 4
    ? '••••••' + formData.phone_number.slice(-4)
    : formData.phone_number;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Clean Modal Window */}
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-fadeIn"
        style={{ maxHeight: '90vh' }}
      >
        {/* Close Button */}
        <button
          type="button"
          className="absolute right-4 top-4 z-10 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
          onClick={onClose}
        >
          <FaTimes className="h-4 w-4" />
        </button>

        <div className="p-6 sm:p-7 overflow-y-auto" style={{ maxHeight: '90vh' }}>

          {/* Header & Step Indicator */}
          <div className="mb-6">
            {step < 4 && (
              <div className="flex items-center gap-2 mb-3">
                <div className="flex gap-1">
                  <div className={`w-8 h-1.5 rounded-full transition-colors ${step >= 1 ? 'bg-[#0067A1]' : 'bg-gray-200'}`} />
                  <div className={`w-8 h-1.5 rounded-full transition-colors ${step >= 2 ? 'bg-[#0067A1]' : 'bg-gray-200'}`} />
                  <div className={`w-8 h-1.5 rounded-full transition-colors ${step >= 3 ? 'bg-[#0067A1]' : 'bg-gray-200'}`} />
                </div>
                <span className="text-xs text-gray-400 ml-2">Step {step} of 3</span>
              </div>
            )}

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              {step === 1 && 'Create your account'}
              {step === 2 && 'Complete your profile'}
              {step === 3 && 'Verify Mobile Number'}
              {step === 4 && '✓ Verified!'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {step === 1 && 'Start your health journey today'}
              {step === 2 && 'Just a few more details'}
              {step === 3 && `We sent a 6-digit OTP code to ${maskedPhone}`}
              {step === 4 && 'Redirecting to your dashboard...'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm">
              <p className="text-sm text-red-600 flex items-center gap-2">
                <FaTimes className="w-4 h-4 shrink-0" />
                {error}
              </p>
            </div>
          )}

          {/* STEP 1: Basic Info */}
          {step === 1 && (
            <form onSubmit={handleNextStep} className="space-y-4 text-sm">
              {/* Full Name */}
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <FaUser className="h-4 w-4" />
                  </div>
                  <input
                    id="full_name"
                    name="full_name"
                    placeholder="John Doe"
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:border-[#0067A1] focus:ring-2 focus:ring-[#0067A1]/20 transition-all outline-none"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <FaEnvelope className="h-4 w-4" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    placeholder="john@example.com"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:border-[#0067A1] focus:ring-2 focus:ring-[#0067A1]/20 transition-all outline-none"
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div>
                <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Phone Number <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <FaPhone className="h-4 w-4" />
                  </div>
                  <input
                    id="phone_number"
                    name="phone_number"
                    placeholder="10-digit phone number"
                    type="tel"
                    maxLength="10"
                    required
                    value={formData.phone_number}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:border-[#0067A1] focus:ring-2 focus:ring-[#0067A1]/20 transition-all outline-none"
                  />
                </div>
              </div>

              {/* Continue Button */}
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#0067A1] hover:bg-[#004F7C] text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 mt-2"
              >
                <span>Continue</span>
                <FaArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* STEP 2: Profile Details */}
          {step === 2 && (
            <form onSubmit={handleSubmitRegistration} className="space-y-4 text-sm">
              {/* Gender */}
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Gender
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <FaVenusMars className="h-4 w-4" />
                  </div>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#0067A1] focus:ring-2 focus:ring-[#0067A1]/20 transition-all outline-none appearance-none bg-white cursor-pointer"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Date of Birth */}
              <div>
                <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Date of Birth
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <FaCalendarAlt className="h-4 w-4" />
                  </div>
                  <input
                    id="date_of_birth"
                    name="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#0067A1] focus:ring-2 focus:ring-[#0067A1]/20 transition-all outline-none"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Address
                </label>
                <div className="relative">
                  <div className="absolute top-3 left-0 pl-3.5 flex items-start pointer-events-none text-gray-400">
                    <FaMapMarkerAlt className="h-4 w-4" />
                  </div>
                  <textarea
                    id="address"
                    name="address"
                    placeholder="Flat No, Street, City, State, Pincode"
                    rows={2}
                    value={formData.address}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:border-[#0067A1] focus:ring-2 focus:ring-[#0067A1]/20 transition-all outline-none resize-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all"
                >
                  <FaArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] flex items-center justify-center gap-2 py-2.5 px-4 bg-[#0067A1] hover:bg-[#004F7C] text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      <FaCheckCircle className="w-4 h-4" />
                      Create Account
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: OTP Verification Inside Modal */}
          {step === 3 && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="flex justify-center mb-2">
                <div className="w-14 h-14 rounded-2xl bg-[#0067A1]/10 flex items-center justify-center">
                  <FaShieldAlt className="w-6 h-6 text-[#0067A1]" />
                </div>
              </div>

              {/* 6-digit OTP Inputs */}
              <div className="flex justify-center gap-2 sm:gap-2.5">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, index)}
                    onKeyDown={(e) => handleOtpKeyDown(e, index)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className={`
                      w-11 h-13 sm:w-12 sm:h-14
                      text-center text-xl font-bold text-gray-900
                      rounded-xl border-2 outline-none
                      transition-all duration-200
                      ${digit
                        ? 'border-[#0067A1] bg-sky-50/50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                      }
                      focus:border-[#0067A1] focus:ring-4 focus:ring-[#0067A1]/10
                    `}
                    autoFocus={index === 0}
                    disabled={loading}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading || otp.join('').length < 6}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-[#0067A1] hover:bg-[#004F7C] text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <FaShieldAlt className="w-4 h-4" />
                    Verify & Continue
                  </>
                )}
              </button>

              {/* Resend Timer */}
              <div className="flex flex-col items-center gap-1.5 pt-1 text-center">
                <span className="text-xs text-gray-400">Didn't receive the code?</span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={!canResend || loading}
                  className={`text-xs font-semibold px-3 py-1 rounded-lg transition-all ${
                    canResend
                      ? 'text-[#0067A1] bg-[#0067A1]/10 hover:bg-[#0067A1]/20 cursor-pointer'
                      : 'text-gray-400 cursor-default'
                  }`}
                >
                  {canResend ? 'Resend Code' : `Resend in ${resendTimer}s`}
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: Success State */}
          {step === 4 && (
            <div className="py-8 flex flex-col items-center justify-center text-center animate-fadeIn">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 text-emerald-600 shadow-md">
                <FaCheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Account Verified!</h3>
              <p className="text-sm text-emerald-600 font-medium mt-1">
                Redirecting to your dashboard...
              </p>
            </div>
          )}

          {/* Footer in Two Rows */}
          <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col items-center justify-center gap-2 text-xs text-center">
            <p className="text-gray-500">
              Already have an account?{' '}
              <button
                type="button"
                onClick={handleOpenLogin}
                className="font-semibold text-[#0067A1] hover:text-[#004F7C] transition-colors"
              >
                Sign in
              </button>
            </p>
            <p className="text-gray-400 text-[11px]">
              By signing up, you agree to our{' '}
              <a href="/website/terms" className="text-[#0067A1] hover:underline">Terms</a>
              {' & '}
              <a href="/website/privacy" className="text-[#0067A1] hover:underline">Privacy Policy</a>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SignupModal;
