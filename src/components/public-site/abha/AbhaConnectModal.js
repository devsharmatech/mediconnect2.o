"use client";

import { useState } from 'react';
import { FaTimes, FaAddressCard, FaMobileAlt, FaFingerprint, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import api from '@/utils/websiteApi';
import ConsentForm from './ConsentForm';
import toast from 'react-hot-toast';

const AbhaConnectModal = ({ isOpen, onClose, userId, onSuccess }) => {
    const [activeTab, setActiveTab] = useState('link'); // 'link' or 'create'
    const [step, setStep] = useState(1); // 1: Input, 2: OTP, 3: Consent (for link) / Success
    const [identifier, setIdentifier] = useState(''); // Mobile or Aadhaar
    const [otp, setOtp] = useState('');
    const [txnId, setTxnId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [abhaProfile, setAbhaProfile] = useState(null);
    const [consentGiven, setConsentGiven] = useState(false);

    if (!isOpen) return null;

    const resetState = () => {
        setStep(1);
        setIdentifier('');
        setOtp('');
        setTxnId('');
        setError('');
        setAbhaProfile(null);
        setConsentGiven(false);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    // Step 1: Generate OTP
    const handleGenerateOtp = async (e) => {
        e.preventDefault();
        if (!identifier) {
            setError("Please enter your Aadhaar or Mobile number");
            return;
        }

        setLoading(true);
        setError('');

        try {
            const type = identifier.length === 12 ? 'aadhaar' : 'mobile'; // Simple check
            const response = await api.post('/abha/generate-otp', { identifier, type });

            if (response.success) {
                setTxnId(response.data.txnId);
                setStep(2);
                toast.success(response.data.message);
            } else {
                throw new Error(response.message || "Failed to send OTP");
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (!otp) {
            setError("Please enter the OTP");
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await api.post('/abha/verify-otp', { otp, txnId });

            if (response.success) {
                if (activeTab === 'link') {
                    setAbhaProfile(response.data.profile);
                    setStep(3); // Go to Consent
                } else {
                    // Create Flow - directly show success or next steps
                    // For mock, we treat verification as creation success for now
                    await handleCreateAbha(identifier);
                }
            } else {
                throw new Error(response.message || "Invalid OTP");
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Create ABHA Final Step
    const handleCreateAbha = async (mobile) => {
        try {
            const response = await api.post('/abha/create', { mobile });
            if (response.success) {
                setAbhaProfile(response.data.profile);
                setStep(3); // Show Success in Step 3
                toast.success("ABHA Created Successfully!");
            } else {
                throw new Error(response.message);
            }
        } catch (err) {
            setError(err.message);
        }
    }


    // Step 3: Link ABHA (Requires Consent)
    const handleLinkAbha = async () => {
        if (!consentGiven) {
            setError("Please provide your consent to proceed.");
            return;
        }

        setLoading(true);
        setError('');

        try {
            // 1. Record Consent
            const consentRes = await api.post('/abha/consent', {
                user_id: userId,
                purpose: 'Care Coordination',
                scope: ['profile', 'records'],
                status: 'granted',
                details: { abha: abhaProfile.healthId } // Store basic details
            });

            if (!consentRes.success) throw new Error("Failed to record consent");

            // 2. Link ABHA
            const linkRes = await api.post('/abha/link', {
                user_id: userId,
                abha_profile: abhaProfile
            });

            if (linkRes.success) {
                toast.success("ABHA Linked Successfully!");
                onSuccess && onSuccess(abhaProfile);
                handleClose();
            } else {
                throw new Error(linkRes.message || "Failed to link ABHA");
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-[#0067A1] p-4 sm:p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded-lg">
                            <FaAddressCard className="text-white w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Connect ABHA</h3>
                            <p className="text-[#E0F2F1] text-xs">Ayushman Bharat Health Account</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="text-white/80 hover:text-white transition-colors">
                        <FaTimes className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100">
                    <button
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'link' ? 'text-[#0067A1] border-b-2 border-[#0067A1] bg-[#0067A1]/5' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => { setActiveTab('link'); resetState(); }}
                    >
                        I have an ABHA
                    </button>
                    <button
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'create' ? 'text-[#0067A1] border-b-2 border-[#0067A1] bg-[#0067A1]/5' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => { setActiveTab('create'); resetState(); }}
                    >
                        Create new ABHA
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto">
                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                            <FaExclamationCircle className="flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Step 1: Input */}
                    {step === 1 && (
                        <form onSubmit={handleGenerateOtp} className="space-y-4">
                            <p className="text-sm text-gray-600 mb-2">
                                {activeTab === 'link'
                                    ? "Enter your ABHA Number or Mobile Number to link your existing account."
                                    : "Enter your Aadhaar or Mobile Number to create a new ABHA ID."}
                            </p>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                    {activeTab === 'link' ? 'ABHA / Mobile Number' : 'Aadhaar / Mobile Number'}
                                </label>
                                <div className="relative">
                                    <FaAddressCard className="absolute left-3 top-3 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder={activeTab === 'link' ? "e.g. 91-8877-6655-44" : "e.g. 1234-5678-9012"}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0067A1] focus:border-transparent outline-none transition-all"
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#0067A1] text-white py-3 rounded-xl font-semibold hover:bg-[#004F7C] transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                            >
                                {loading ? 'Sending OTP...' : 'Send OTP'}
                            </button>
                        </form>
                    )}

                    {/* Step 2: OTP */}
                    {step === 2 && (
                        <form onSubmit={handleVerifyOtp} className="space-y-4">
                            <div className="text-center mb-6">
                                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <FaMobileAlt className="text-blue-500 w-6 h-6" />
                                </div>
                                <h4 className="font-semibold text-gray-900">Verify OTP</h4>
                                <p className="text-xs text-gray-500 mt-1">
                                    Enter the 6-digit code sent to your mobile.
                                </p>
                            </div>

                            <div className="relative">
                                <FaFingerprint className="absolute left-3 top-3 text-gray-400" />
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    autoComplete="one-time-code"
                                    placeholder="Enter 6-digit OTP"
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0067A1] focus:border-transparent outline-none transition-all text-center tracking-widest text-lg font-bold"
                                    value={otp}
                                    maxLength={6}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    onPaste={(e) => {
                                        e.preventDefault();
                                        const pasteData = e.clipboardData?.getData('text') || '';
                                        setOtp(pasteData.replace(/\D/g, '').slice(0, 6));
                                    }}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#0067A1] text-white py-3 rounded-xl font-semibold hover:bg-[#004F7C] transition-colors disabled:opacity-70"
                            >
                                {loading ? 'Verifying...' : 'Verify & Proceed'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="w-full text-gray-500 text-sm hover:text-gray-700"
                            >
                                Change Number
                            </button>
                        </form>
                    )}

                    {/* Step 3: Consent (Link) or Success (Create) */}
                    {step === 3 && (
                        <div className="space-y-4">
                            {activeTab === 'link' ? (
                                <>
                                    <div className="bg-green-50 rounded-xl p-4 border border-green-100 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-green-100 shadow-sm">
                                                <FaCheckCircle className="text-green-500 w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">ABHA Profile Found</p>
                                                <p className="text-xs text-gray-600">{abhaProfile?.name} ({abhaProfile?.healthId})</p>
                                            </div>
                                        </div>
                                    </div>

                                    <ConsentForm
                                        isConsented={consentGiven}
                                        onConsentChange={setConsentGiven}
                                    />

                                    <button
                                        onClick={handleLinkAbha}
                                        disabled={loading || !consentGiven}
                                        className="w-full bg-[#0067A1] text-white py-3 rounded-xl font-semibold hover:bg-[#004F7C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                                    >
                                        {loading ? 'Linking...' : 'Link ABHA Account'}
                                    </button>
                                </>
                            ) : (
                                <div className="text-center py-6">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                                        <FaCheckCircle className="text-green-500 w-8 h-8" />
                                    </div>
                                    <h4 className="text-xl font-bold text-gray-900 mb-2">ABHA Created!</h4>
                                    <p className="text-gray-600 mb-6">
                                        Your new ABHA ID <strong>{abhaProfile?.healthId}</strong> has been created successfully.
                                    </p>
                                    <button
                                        onClick={() => { setActiveTab('link'); setStep(3); setConsentGiven(false); }}
                                        className="w-full bg-[#0067A1] text-white py-3 rounded-xl font-semibold hover:bg-[#004F7C] transition-colors"
                                    >
                                        Proceed to Link Account
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AbhaConnectModal;
