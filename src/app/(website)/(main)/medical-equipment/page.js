"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, User, Phone, Mail, MapPin, Clock, FileText,
  CheckCircle2, AlertCircle, Loader2, Shield,
  Stethoscope, Home, Activity, HandHeart
} from "lucide-react";
import Link from "next/link";

const EQUIPMENT_TYPES = [
  { id: "Oxygen Concentrator", label: "Oxygen Concentrator", icon: Activity, desc: "For respiratory support at home" },
  { id: "Hospital Bed", label: "Hospital Bed", icon: Home, desc: "Manual or automatic hospital bed" },
  { id: "Wheelchair", label: "Wheelchair", icon: User, desc: "Manual or motorized wheelchair" },
  { id: "Suction Machine", label: "Suction Machine", icon: Activity, desc: "For airway clearance" },
  { id: "BiPAP / CPAP", label: "BiPAP / CPAP", icon: Stethoscope, desc: "Non-invasive ventilator support" },
  { id: "Cardiac Monitor", label: "Cardiac Monitor", icon: Heart, desc: "To track vital parameters" },
  { id: "Other", label: "Other", icon: HandHeart, desc: "Other specialized medical equipment" },
];

const DURATIONS = [
  { value: "short_term", label: "Short-term (Rent)" },
  { value: "long_term", label: "Long-term (Rent)" },
  { value: "purchase", label: "Outright Purchase" },
];

export default function MedicalEquipmentRequestPage() {
  const [userProfile, setUserProfile] = useState(null);
  const [editProfile, setEditProfile] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [city, setCity] = useState("");
  const [locality, setLocality] = useState("");
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [dataConsent, setDataConsent] = useState(false);
  const [commConsent, setCommConsent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [leadId, setLeadId] = useState("");
  const [error, setError] = useState("");

  // Auto-fill from profile
  useEffect(() => {
    try {
      const userData = localStorage.getItem("userData");
      const userId = localStorage.getItem("userId");
      if (userData && userId) {
        const parsed = JSON.parse(userData);
        const profile = {
          user_id: userId,
          full_name: parsed.details?.full_name || parsed.full_name || "",
          phone_number: parsed.phone_number || "",
          email: parsed.details?.email || parsed.email || "",
          gender: parsed.details?.gender || "",
          date_of_birth: parsed.details?.date_of_birth || "",
        };
        if (profile.date_of_birth) {
          const dob = new Date(profile.date_of_birth);
          const diff = Date.now() - dob.getTime();
          profile.age = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
        }
        setUserProfile(profile);
        setName(profile.full_name);
        setPhone(profile.phone_number);
        setEmail(profile.email);
        setAge(profile.age ? String(profile.age) : "");
        setGender(profile.gender);
      }
    } catch { /* ignore */ }
  }, []);

  const toggleEquipmentType = (id) => {
    setEquipmentTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name || !phone || !city || !duration || equipmentTypes.length === 0) {
      setError("Please fill in all required fields and select at least one equipment type.");
      return;
    }
    if (!dataConsent || !commConsent) {
      setError("You must provide both consents to submit this request.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/medical-equipment/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userProfile?.user_id || null,
          name,
          phone,
          email,
          age: age ? parseInt(age) : null,
          gender,
          city,
          locality,
          equipment_types: equipmentTypes,
          duration,
          notes,
          data_consent: dataConsent,
          communication_consent: commConsent,
          device_type: "web",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to submit request.");
        return;
      }
      setLeadId(data.data.lead_id);
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#e6f2f1] via-white to-[#d5eeec] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Request Submitted!</h2>
          <p className="text-gray-600 mb-4">
            Your medical equipment request has been received. Our team will contact you shortly.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-500">Your Reference ID</p>
            <p className="text-lg font-bold text-[#0067A1]">{leadId}</p>
          </div>
          <p className="text-xs text-gray-400 mb-6">
            Service delivery is handled directly by independent equipment partners.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/website"
              className="inline-block px-6 py-3 bg-[#0067A1] text-white rounded-xl font-medium hover:bg-[#004F7C] transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e6f2f1] via-white to-[#d5eeec]">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0067A1] to-[#0080C6] text-white py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold mb-3">
            Request Medical Equipment
          </h1>
          <p className="text-white/80 text-sm lg:text-base max-w-xl mx-auto">
            MediConnect coordinates medical equipment rental and sales. Fill out the form below to request equipment.
          </p>
        </div>
      </div>

      {/* Disclaimer Banner */}
      <div className="max-w-3xl mx-auto px-4 -mt-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <strong>Disclaimer:</strong> Equipment delivery and billing are handled directly by independent partners.
            MediConnect facilitates service requests and connects users with vetted equipment providers.
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Section A: Patient Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <User className="w-5 h-5 text-[#0067A1]" />
              Patient Details
            </h2>
            {userProfile && (
              <button
                type="button"
                onClick={() => setEditProfile(!editProfile)}
                className="text-sm text-[#0067A1] font-medium hover:underline cursor-pointer"
              >
                {editProfile ? "Lock" : "Edit"}
              </button>
            )}
          </div>

          {userProfile && !editProfile && (
            <p className="text-xs text-gray-500 mb-4 bg-gray-50 p-2 rounded-lg">
              These details are fetched from your MediConnect profile.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                readOnly={userProfile && !editProfile}
                className={`w-full px-4 py-2.5 border rounded-xl ${userProfile && !editProfile ? "bg-gray-50 text-gray-600" : "bg-white"} border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30`}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                readOnly={userProfile && !editProfile}
                className={`w-full px-4 py-2.5 border rounded-xl ${userProfile && !editProfile ? "bg-gray-50 text-gray-600" : "bg-white"} border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30`}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                readOnly={userProfile && !editProfile}
                className={`w-full px-4 py-2.5 border rounded-xl ${userProfile && !editProfile ? "bg-gray-50 text-gray-600" : "bg-white"} border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30`}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  readOnly={userProfile && !editProfile}
                  min="0" max="150"
                  className={`w-full px-4 py-2.5 border rounded-xl ${userProfile && !editProfile ? "bg-gray-50 text-gray-600" : "bg-white"} border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  disabled={userProfile && !editProfile}
                  className={`w-full px-4 py-2.5 border rounded-xl ${userProfile && !editProfile ? "bg-gray-50 text-gray-600" : "bg-white"} border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30`}
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section B: Location */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-[#0067A1]" />
            Delivery Location
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Mumbai, Delhi, Bangalore"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Area / Locality</label>
              <input
                type="text"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                placeholder="e.g. Andheri West, Koramangala"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30"
              />
            </div>
          </div>
        </div>

        {/* Section C: Equipment Requirement */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-[#0067A1]" />
            Equipment Required *
          </h2>
          <p className="text-sm text-gray-500 mb-4">Select all that apply</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {EQUIPMENT_TYPES.map((eq) => {
              const Icon = eq.icon;
              const selected = equipmentTypes.includes(eq.id);
              return (
                <button
                  key={eq.id}
                  type="button"
                  onClick={() => toggleEquipmentType(eq.id)}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left cursor-pointer ${
                    selected
                      ? "border-[#0067A1] bg-[#0067A1]/5"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    selected ? "bg-[#0067A1] text-white" : "bg-gray-100 text-gray-500"
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${selected ? "text-[#0067A1]" : "text-gray-700"}`}>
                      {eq.label}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{eq.desc}</p>
                  </div>
                  {selected && (
                    <CheckCircle2 className="w-5 h-5 text-[#0067A1] ml-auto flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Duration */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-[#0067A1]" />
            Requirement Duration *
          </h2>
          <div className="flex flex-wrap gap-3">
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDuration(d.value)}
                className={`px-5 py-2.5 rounded-xl border-2 font-medium text-sm transition-all cursor-pointer ${
                  duration === d.value
                    ? "border-[#0067A1] bg-[#0067A1] text-white"
                    : "border-gray-200 text-gray-700 hover:border-gray-300"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-[#0067A1]" />
            Additional Details / Brand Preferences
          </h2>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-amber-700">
              <strong>⚠ Warning:</strong> Please do not share medical reports or sensitive patient documents here.
            </p>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="E.g. brand preference, flow rate for oxygen, specifications..."
            className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{notes.length}/1000</p>
        </div>

        {/* Consent */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-5">
            <Shield className="w-5 h-5 text-[#0067A1]" />
            Consent (Required)
          </h2>

          <div className="space-y-4">
            <label
              className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                dataConsent
                  ? "border-[#0067A1] bg-[#0067A1]/5"
                  : "border-gray-200 bg-gray-50 hover:border-gray-300"
              }`}
            >
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={dataConsent}
                  onChange={(e) => setDataConsent(e.target.checked)}
                  className="sr-only peer"
                />
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                  dataConsent
                    ? "bg-[#0067A1] border-[#0067A1]"
                    : "bg-white border-gray-300"
                }`}>
                  {dataConsent && (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800 leading-relaxed">
                  I consent to MediConnect collecting and processing my personal information
                  for coordinating medical equipment services with verified partners.
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                commConsent
                  ? "border-[#0067A1] bg-[#0067A1]/5"
                  : "border-gray-200 bg-gray-50 hover:border-gray-300"
              }`}
            >
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={commConsent}
                  onChange={(e) => setCommConsent(e.target.checked)}
                  className="sr-only peer"
                />
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                  commConsent
                    ? "bg-[#0067A1] border-[#0067A1]"
                    : "bg-white border-gray-300"
                }`}>
                  {commConsent && (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800 leading-relaxed">
                  I agree to receive calls, SMS, or WhatsApp messages regarding my equipment request.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-[#0067A1] to-[#0080C6] text-white font-semibold text-lg rounded-xl hover:shadow-lg hover:shadow-[#0067A1]/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting Request...
            </>
          ) : (
            "Submit Request"
          )}
        </button>
      </form>
    </div>
  );
}
