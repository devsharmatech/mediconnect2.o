'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/utils/websiteApi';

const VerifyOtpForm = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Get phone number from session storage
    const storedPhone = sessionStorage.getItem('loginPhoneNumber');
    if (!storedPhone) {
      // If no phone number in session, redirect to login
      router.push('/login');
      return;
    }
    setPhoneNumber(storedPhone);

    // Start the resend timer
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
  }, [router]);

  const handleOtpChange = (element, index) => {
    if (isNaN(element.value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);
    
    // Auto focus to next input
    if (element.nextSibling && element.value !== '') {
      element.nextSibling.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !e.target.value && index > 0) {
      // Move to previous input on backspace
      const prevInput = e.target.previousSibling;
      if (prevInput) prevInput.focus();
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
      // First, get the user ID by logging in again (since we only have the phone number)
      const loginResponse = await api.post('/auth/patient/login', {
        phone_number: phoneNumber,
      });

      if (!loginResponse.success || !loginResponse.data?.user_id) {
        throw new Error('Failed to verify OTP. Please try again.');
      }

      const response = await api.post('/auth/validate-otp', {
        user_id: loginResponse.data.user_id,
        phone_number: phoneNumber,
        otp: otpValue
      });

      if (response.success) {
        // Store the authentication token if provided
        if (response.data?.token) {
          localStorage.setItem('authToken', response.data.token);
        }
        // Redirect to dashboard or home page after successful verification
        router.push('/dashboard');
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
      
      const response = await api.post('/auth/patient/login', {
        phone_number: phoneNumber,
      });

      if (response.success) {
        setCanResend(false);
        setResendTimer(30);
        
        // Restart the timer
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Verify OTP
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We've sent a 6-digit OTP to {phoneNumber}
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="flex justify-center space-x-2">
            {otp.map((data, index) => (
              <input
                key={index}
                type="text"
                maxLength="1"
                value={data}
                onChange={(e) => handleOtpChange(e.target, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className="w-12 h-12 text-center text-xl border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0067A1] focus:border-transparent"
                autoFocus={index === 0}
                disabled={loading}
              />
            ))}
          </div>

          <div className="text-center">
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#0067A1] hover:bg-[#004F7C] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0067A1] ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </div>
        </form>

        <div className="text-center text-sm">
          <p className="text-gray-600">
            Didn't receive the OTP?{' '}
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={!canResend || loading}
              className={`font-medium ${canResend ? 'text-[#0067A1] hover:text-[#004F7C]' : 'text-gray-400 cursor-not-allowed'}`}
            >
              {canResend ? 'Resend OTP' : `Resend in ${resendTimer}s`}
            </button>
          </p>
        </div>

        <div className="text-center">
          <Link href="/login" className="text-sm font-medium text-[#0067A1] hover:text-[#004F7C]">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtpForm;
