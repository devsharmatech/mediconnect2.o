"use client";

import { useState, useEffect } from "react";
import { X, ShieldCheck, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function LabOtpModal({ isOpen, onClose, labId, onVerified }) {
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [timer, setTimer] = useState(0);

    useEffect(() => {
        if (isOpen && labId) {
            sendOtp();
        } else {
            // Reset state on close
            setOtp(["", "", "", "", "", ""]);
        }
    }, [isOpen, labId]);

    useEffect(() => {
        let interval;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const sendOtp = async () => {
        setSending(true);
        try {
            const res = await fetch("/api/lab/otp/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lab_id: labId }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success("OTP sent to your registered mobile number");
                setTimer(30); // 30 seconds cooldown
            } else {
                toast.error(data.error || "Failed to send OTP");
            }
        } catch (error) {
            toast.error("An error occurred while sending OTP");
        } finally {
            setSending(false);
        }
    };

    const verifyOtp = async () => {
        const otpString = otp.join("");
        if (otpString.length !== 6) {
            toast.error("Please enter a valid 6-digit OTP");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/lab/otp/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lab_id: labId, otp: otpString }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(data.message);
                onVerified(); // Trigger the callback
            } else {
                toast.error(data.error || "Invalid OTP");
            }
        } catch (error) {
            toast.error("An error occurred during verification");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e, index) => {
        const value = e.target.value;
        if (isNaN(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);

        // Move to next input
        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            if (nextInput) nextInput.focus();
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            if (prevInput) prevInput.focus();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                    <h2 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        Verification Required
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 text-center">
                        To protect your catalog, please enter the 6-digit OTP sent to your registered mobile number. Once verified, you can manage your tests for the next 15 minutes.
                    </p>

                    <div className="flex justify-center gap-2 sm:gap-3 mb-6">
                        {otp.map((digit, idx) => (
                            <input
                                key={idx}
                                id={`otp-${idx}`}
                                type="text"
                                maxLength="1"
                                value={digit}
                                onChange={(e) => handleChange(e, idx)}
                                onKeyDown={(e) => handleKeyDown(e, idx)}
                                className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        ))}
                    </div>

                    <div className="flex flex-col gap-3 mt-8">
                        <button
                            onClick={verifyOtp}
                            disabled={loading || otp.join("").length !== 6}
                            className="w-full bg-[#0067A1] hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Continue"}
                        </button>
                        
                        <div className="text-center">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Didn't receive the code? </span>
                            <button
                                onClick={sendOtp}
                                disabled={sending || timer > 0}
                                className="text-sm font-medium text-emerald-600 hover:text-emerald-700 disabled:text-gray-400 transition-colors"
                            >
                                {timer > 0 ? `Resend in ${timer}s` : "Resend OTP"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
