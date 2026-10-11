"use client";

import React, { useState } from "react";
import { FaTimes, FaWhatsapp, FaLink, FaPills, FaFlask, FaShareAlt, FaCheck, FaLock } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

export default function SharePrescriptionMenuModal({
  isOpen,
  onClose,
  prescription,
  doctorName,
  diagnosis,
  date,
  onOpenChemistShare,
  onOpenLabShare,
  onSaveToDigiLocker,
  isSavedInDigiLocker,
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const rxId = prescription?.id || prescription?.prescription_id || "";
  const docName = doctorName || prescription?.doctor_details?.full_name || prescription?.doctor?.full_name || "Doctor";
  const diagText = diagnosis || (typeof prescription?.diagnosis === "string" ? prescription.diagnosis : (prescription?.diagnosis?.primary || "General Medical Consultation"));
  const rxDate = date || (prescription?.created_at ? new Date(prescription.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Recent");

  const origin = typeof window !== "undefined" ? window.location.origin : "https://mediconnect.fit";
  const shareUrl = `${origin}/medicine-order?prescription_id=${rxId}`;

  const shareText = `*MediConnect e-Prescription*\n👨‍⚕️ Doctor: Dr. ${docName}\n📅 Date: ${rxDate}\n🩺 Diagnosis: ${diagText}\n🔗 View & Fulfill Prescription:\n${shareUrl}`;

  const handleWhatsAppShare = () => {
    const encoded = encodeURIComponent(shareText);
    const waUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Prescription link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Prescription - Dr. ${docName}`,
          text: `Prescription from Dr. ${docName} on MediConnect:`,
          url: shareUrl,
        });
      } catch (e) {
        if (e.name !== "AbortError") {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden z-10 border border-slate-100"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0067A1] flex items-center justify-center">
              <FaShareAlt className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Share Prescription</h3>
              <p className="text-[11px] text-slate-300">Dr. {docName} • {rxDate}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-5 space-y-3">
          {/* WhatsApp */}
          <button
            onClick={handleWhatsAppShare}
            className="w-full flex items-center gap-3.5 p-3 rounded-xl border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-300 transition-all text-left cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <FaWhatsapp className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs text-gray-900">Share via WhatsApp</p>
              <p className="text-[11px] text-gray-500">Send prescription details to pharmacy, doctor or family</p>
            </div>
          </button>

          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-3.5 p-3 rounded-xl border border-blue-100 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-300 transition-all text-left cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#0067A1] text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              {copied ? <FaCheck className="w-5 h-5" /> : <FaLink className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs text-gray-900">
                {copied ? "Link Copied!" : "Copy Secure Link"}
              </p>
              <p className="text-[11px] text-gray-500 truncate">{shareUrl}</p>
            </div>
          </button>

          {/* Partner Pharmacy / Chemist */}
          {onOpenChemistShare && (
            <button
              onClick={() => {
                onClose();
                onOpenChemistShare();
              }}
              className="w-full flex items-center gap-3.5 p-3 rounded-xl border border-amber-100 bg-amber-50/40 hover:bg-amber-50 hover:border-amber-300 transition-all text-left cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <FaPills className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs text-gray-900">Send to Nearby Pharmacy</p>
                <p className="text-[11px] text-gray-500">Get bids & home delivery from verified chemist partners</p>
              </div>
            </button>
          )}

          {/* Diagnostic Lab */}
          {onOpenLabShare && (
            <button
              onClick={() => {
                onClose();
                onOpenLabShare();
              }}
              className="w-full flex items-center gap-3.5 p-3 rounded-xl border border-teal-100 bg-teal-50/40 hover:bg-teal-50 hover:border-teal-300 transition-all text-left cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <FaFlask className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs text-gray-900">Book Prescribed Lab Tests</p>
                <p className="text-[11px] text-gray-500">Order diagnostic tests with home sample collection</p>
              </div>
            </button>
          )}

          {/* Save to DigiLocker */}
          {onSaveToDigiLocker && (
            <button
              onClick={() => {
                onClose();
                onSaveToDigiLocker();
              }}
              className={`w-full flex items-center gap-3.5 p-3 rounded-xl border transition-all text-left cursor-pointer group ${
                isSavedInDigiLocker
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-indigo-100 bg-indigo-50/40 hover:bg-indigo-50 hover:border-indigo-300"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                isSavedInDigiLocker ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white group-hover:scale-105 transition-transform"
              }`}>
                {isSavedInDigiLocker ? <FaCheck className="w-4 h-4" /> : <FaLock className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs text-gray-900">
                  {isSavedInDigiLocker ? "Saved in MediConnect DigiLocker" : "Save in MediConnect DigiLocker"}
                </p>
                <p className="text-[11px] text-gray-500">
                  {isSavedInDigiLocker ? "Securely stored in your personal digital locker records" : "Generate verified PDF & store safely in your health locker"}
                </p>
              </div>
            </button>
          )}

          {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
            <button
              onClick={handleNativeShare}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <FaShareAlt className="w-3.5 h-3.5 text-slate-500" />
              More Sharing Options...
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-200 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
