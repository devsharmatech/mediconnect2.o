'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/utils/websiteApi';
import { FaTimes, FaUser, FaEnvelope, FaPhone, FaVenusMars, FaCalendarAlt, FaMapMarkerAlt, FaHeartbeat, FaShieldAlt, FaCheckCircle, FaArrowRight, FaArrowLeft } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';

const SignupModal = ({ isOpen, onClose, onLoginClick }) => {
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
  const [step, setStep] = useState(1);
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
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    if (formData.full_name && formData.phone_number) {
      setStep(2);
      setError('');
    } else {
      setError('Please fill in all required fields');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.phone_number) {
      setError('Please fill in all required fields');
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
        sessionStorage.setItem('registrationPhone', formData.phone_number);
        sessionStorage.setItem('userId', response.data.user_id);
        onClose();
        router.push('/website/verify-otp?type=registration');
      } else {
        throw new Error(response.error || 'Registration failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during signup');
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const benefits = [
    { icon: FaHeartbeat, text: 'Access to verified doctors across key specialties', color: 'text-[#0067A1]' },
    { icon: FaShieldAlt, text: 'Secure digital health records', color: 'text-[#0067A1]' },
    { icon: HiSparkles, text: 'Smart health insights', color: 'text-[#0067A1]' },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl flex flex-col md:flex-row overflow-hidden animate-fadeIn" style={{ maxHeight: '90vh' }}>
        {/* Left Side - Benefits Panel (desktop only) */}
        <div className="hidden md:flex md:w-2/5 bg-[#0067A1] p-6 flex-col justify-between relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
                <FaHeartbeat className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">mediconnect.fit</span>
            </div>

            <h3 className="text-xl font-bold text-white mb-3">
              Designed for individuals and families
            </h3>
            <p className="text-[#E0F2F1] text-xs leading-relaxed mb-6">
              Create your account and get access to personalized healthcare services, smart health insights, and a network of verified doctors.
            </p>

            {/* Benefits List */}
            <div className="space-y-3">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 bg-white/10 rounded-xl p-3 transform transition-transform hover:translate-x-1"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                    <benefit.icon className={`w-5 h-5 ${benefit.color}`} />
                  </div>
                  <span className="text-white font-medium text-xs">{benefit.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trust Badge */}
          <div className="relative z-10 mt-2 flex items-center gap-2 text-[#E0F2F1] text-[11px]">
            <FaShieldAlt className="w-4 h-4" />
            <span>256-bit Encryption</span>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Header */}
          <div className="flex items-start justify-between px-5 pt-5 pb-3 sm:px-7">
            <div className="pr-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex gap-1">
                  <div className={`w-8 h-1.5 rounded-full transition-colors ${step >= 1 ? 'bg-[#0067A1]' : 'bg-gray-200'}`} />
                  <div className={`w-8 h-1.5 rounded-full transition-colors ${step >= 2 ? 'bg-[#0067A1]' : 'bg-gray-200'}`} />
                </div>
                <span className="text-xs text-gray-400 ml-2">Step {step} of 2</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {step === 1 ? 'Create your account' : 'Complete your profile'}
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-gray-500">
                {step === 1 ? 'Start your health journey today' : 'Just a few more details'}
              </p>
            </div>
            <button
              type="button"
              className="p-2 rounded-full bg-gray-100 text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-all"
              onClick={onClose}
            >
              <FaTimes className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-7">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3 animate-fadeIn">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <FaTimes className="w-3 h-3 text-red-500" />
                </div>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={step === 1 ? handleNextStep : handleSubmit} className="space-y-4">
              {step === 1 ? (
                <>
                  {/* Full Name */}
                  <div className="group">
                    <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Full Name <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FaUser className="h-4 w-4 text-gray-400 group-focus-within:text-[#0067A1] transition-colors" />
                      </div>
                      <input
                        id="full_name"
                        name="full_name"
                        placeholder="John Doe"
                        type="text"
                        required
                        value={formData.full_name}
                        onChange={handleChange}
                        className="block w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:border-[#0067A1] focus:ring-2 focus:ring-[#0067A1]/20 transition-all outline-none"
                      />
                    </div>
                  </div>

                   {/* Email */}
                   <div className="group">
                     <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                       Email Address <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                     </label>
                     <div className="relative">
                       <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                         <FaEnvelope className="h-4 w-4 text-gray-400 group-focus-within:text-[#0067A1] transition-colors" />
                       </div>
                       <input
                         id="email"
                         name="email"
                         placeholder="john@example.com"
                         type="email"
                         autoComplete="email"
                         value={formData.email}
                         onChange={handleChange}
                         className="block w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:border-[#0067A1] focus:ring-2 focus:ring-[#0067A1]/20 transition-all outline-none"
                       />
                     </div>
                   </div>

                  {/* Phone Number */}
                  <div className="group">
                    <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Phone Number <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FaPhone className="h-4 w-4 text-gray-400 group-focus-within:text-[#0067A1] transition-colors" />
                      </div>
                      <input
                        id="phone_number"
                        name="phone_number"
                        placeholder="1234567890"
                        type="tel"
                        required
                        value={formData.phone_number}
                        onChange={handleChange}
                        className="block w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:border-[#0067A1] focus:ring-2 focus:ring-[#0067A1]/20 transition-all outline-none"
                      />
                    </div>
                  </div>

                  {/* Continue Button */}
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#0067A1] hover:bg-[#004F7C] text-white font-semibold rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                  >
                    Continue
                    <FaArrowRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  {/* Gender */}
                  <div className="group">
                    <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Gender
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FaVenusMars className="h-4 w-4 text-gray-400 group-focus-within:text-[#0067A1] transition-colors" />
                      </div>
                      <select
                        id="gender"
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        className="block w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#0067A1] focus:ring-2 focus:ring-[#0067A1]/20 transition-all outline-none appearance-none bg-white cursor-pointer"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Date of Birth */}
                  <div className="group">
                    <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Date of Birth
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FaCalendarAlt className="h-4 w-4 text-gray-400 group-focus-within:text-[#0067A1] transition-colors" />
                      </div>
                      <input
                        id="date_of_birth"
                        name="date_of_birth"
                        type="date"
                        value={formData.date_of_birth}
                        onChange={handleChange}
                        className="block w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#0067A1] focus:ring-2 focus:ring-[#0067A1]/20 transition-all outline-none"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="group">
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Address
                    </label>
                    <div className="relative">
                      <div className="absolute top-3 left-0 pl-4 flex items-start pointer-events-none">
                        <FaMapMarkerAlt className="h-4 w-4 text-gray-400 group-focus-within:text-[#0067A1] transition-colors" />
                      </div>
                      <textarea
                        id="address"
                        name="address"
                        placeholder="Flat No, Street, City, State, Pincode"
                        rows={3}
                        value={formData.address}
                        onChange={handleChange}
                        className="block w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:border-[#0067A1] focus:ring-2 focus:ring-[#0067A1]/20 transition-all outline-none resize-none"
                      />
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all duration-200"
                    >
                      <FaArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-[2] flex items-center justify-center gap-2 py-2.5 px-4 bg-[#0067A1] hover:bg-[#004F7C] text-white font-semibold rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
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
                </>
              )}
            </form>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 sm:px-8 border-t border-gray-100 bg-gray-50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-xs text-gray-500">
                Already have an account?{' '}
                <button
                  onClick={handleOpenLogin}
                  className="font-semibold text-[#0067A1] hover:text-[#004F7C] transition-colors"
                >
                  Sign in
                </button>
              </p>
              <p className="text-xs text-gray-400">
                By signing up, you agree to our{' '}
                <a href="/website/terms" className="text-[#0067A1] hover:underline">Terms</a>
                {' & '}
                <a href="/website/privacy" className="text-[#0067A1] hover:underline">Privacy Policy</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupModal;
