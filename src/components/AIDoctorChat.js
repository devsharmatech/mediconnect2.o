"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FaPaperPlane,
  FaUser,
  FaSpinner,
  FaUserMd,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaClock,
  FaCheckCircle,
  FaLock,
} from "react-icons/fa";
import { loadRazorpayScript } from "@/lib/razorpay";

const normalizeSpecialty = (value) => {
  if (!value) return "General Physician";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "General Physician";
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.join(", ");
      if (typeof parsed === "string") return parsed;
    } catch {
      // not JSON, fallback
    }
    return trimmed;
  }
  return String(value);
};

const RecommendedDoctorsModal = ({
  isOpen,
  onClose,
  analysis,
  screeningId,
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [error, setError] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [booking, setBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [appointmentType, setAppointmentType] = useState("video_consultation");
  const [dataSharingConsent, setDataSharingConsent] = useState(false);
  const [teleconsultConsent, setTeleconsultConsent] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);

    const fetchDoctors = async () => {
      try {
        setLoading(true);
        setError("");

        const [homeRes, clinicRes] = await Promise.all([
          fetch("/api/doctors/home/available", { method: "POST" }),
          fetch("/api/doctors/clinic/available", { method: "POST" }),
        ]);

        const [homeJson, clinicJson] = await Promise.all([
          homeRes.json(),
          clinicRes.json(),
        ]);

        const homeDoctors = Array.isArray(homeJson?.data) ? homeJson.data : [];
        const clinicDoctors = Array.isArray(clinicJson?.data)
          ? clinicJson.data
          : [];

        const combinedMap = new Map();

        const addList = (list) => {
          list.forEach((doc) => {
            const existing = combinedMap.get(doc.id) || {};
            combinedMap.set(doc.id, { ...existing, ...doc });
          });
        };

        addList(homeDoctors);
        addList(clinicDoctors);

        let combined = Array.from(combinedMap.values()).map((doc) => ({
          id: doc.id,
          name: doc.full_name || doc.name || "Doctor",
          specialty: normalizeSpecialty(doc.specialization),
          clinicName: doc.clinic_name || "Online consultation",
          fee: doc.consultation_fee,
          experience:
            doc.experience_years || doc.years_of_experience || "5+ years",
          profileImage: doc.passport_photo || doc.profile_picture || "/dr.png",
        }));

        const recSpecs =
          analysis?.recommended_specialties &&
          Array.isArray(analysis.recommended_specialties)
            ? analysis.recommended_specialties.map((s) => s.toLowerCase())
            : [];

        if (recSpecs.length) {
          const filtered = combined.filter((doc) => {
            const spec = (doc.specialty || "").toLowerCase();
            return recSpecs.some((s) => spec.includes(s));
          });
          if (filtered.length) {
            combined = filtered;
          }
        }

        setDoctors(combined);
        if (combined.length) {
          setSelectedDoctor(combined[0]);
        }
      } catch (e) {
        console.error("Recommended doctors error:", e);
        setError("Failed to load recommended doctors. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, [isOpen, analysis]);

  useEffect(() => {
    if (!selectedDoctor || !selectedDate) return;

    const fetchSlots = async () => {
      try {
        setSlotsLoading(true);
        setSlots([]);
        setSelectedSlot(null);

        const res = await fetch("/api/doctors/slots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doctor_id: selectedDoctor.id,
            date: selectedDate,
            appointment_type: appointmentType,
          }),
        });

        const json = await res.json();
        if (!json.success)
          throw new Error(json.message || "Failed to fetch slots");

        setSlots(Array.isArray(json.data) ? json.data : []);
      } catch (e) {
        console.error("Slots fetch error:", e);
        setError("Failed to load slots. Please change date or try again.");
      } finally {
        setSlotsLoading(false);
      }
    };

    fetchSlots();
  }, [selectedDoctor, selectedDate, appointmentType]);

  const formatTimeTo12Hour = (timeStr) => {
    if (!timeStr) return "";
    const base = timeStr.length > 5 ? timeStr.slice(0, 5) : timeStr;
    const [hStr, mStr] = base.split(":");
    const hNum = parseInt(hStr, 10);
    if (Number.isNaN(hNum)) return base;
    const suffix = hNum >= 12 ? "PM" : "AM";
    const displayHour = ((hNum + 11) % 12) + 1; // 0,12 -> 12; 13->1 etc.
    return `${displayHour}:${mStr} ${suffix}`;
  };

  const isPastSlot = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return false;
    const [hStr, mStr] = timeStr.split(":");
    const hNum = parseInt(hStr, 10);
    const mNum = parseInt(mStr, 10);
    if (Number.isNaN(hNum) || Number.isNaN(mNum)) return false;
    const slotDate = new Date(dateStr);
    slotDate.setHours(hNum, mNum, 0, 0);
    return slotDate < new Date();
  };

  const confirmBooking = async (patientId, paymentDetails = null, careEpisodeId = null, idempotencyKey = null) => {
    try {
      setBooking(true);
      console.log("[DEBUG BOOKING - AIDoctorChat] confirmBooking called with:", {
        patientId,
        paymentDetails,
        careEpisodeId,
        idempotencyKey
      });
      const requestPayload = {
        doctor_id: selectedDoctor.id,
        patient_id: patientId,
        screening_id: screeningId,
        appointment_date: selectedDate,
        appointment_time: `${selectedSlot}:00`,
        appointment_type: appointmentType,
        care_episode_id: careEpisodeId,
        idempotency_key: idempotencyKey,
        payment_id: paymentDetails ? paymentDetails.payment_id : null,
        consents: {
          data_sharing: dataSharingConsent,
          teleconsultation: teleconsultConsent,
        },
        disease_info: analysis
          ? {
              ...analysis,
              payment_note: paymentDetails
                ? `Paid via Razorpay: ${paymentDetails.payment_id}`
                : "Free/Pre-paid",
            }
          : paymentDetails
            ? `Payment ID: ${paymentDetails.payment_id}`
            : "Booked directly",
      };
      console.log("[DEBUG BOOKING - AIDoctorChat] Sending payload to /api/appointment/book:", requestPayload);

      const res = await fetch("/api/appointment/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      const json = await res.json();
      console.log("[DEBUG BOOKING - AIDoctorChat] Booking API responded with:", json);
      if (!json.success) throw new Error(json.message || "Failed to book");

      console.log("[DEBUG BOOKING - AIDoctorChat] Booking confirmed! Redirecting to /website/appointments for patient:", patientId);
      setBookingSuccess(true);
      setTimeout(() => {
        onClose();
        router.push("/website/appointments");
      }, 1200);
    } catch (e) {
      console.error("[DEBUG BOOKING - AIDoctorChat] Booking error:", e);
      setError(e.message || "Failed to book appointment. Please try again.");
    } finally {
      setBooking(false);
    }
  };

  const handleBook = async () => {
    if (!selectedDoctor || !selectedDate || !selectedSlot || !screeningId)
      return;

    const patientId =
      typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    if (!patientId) {
      setError("Please login as a patient to book an appointment.");
      return;
    }

    const fee = selectedDoctor.fee ? Number(selectedDoctor.fee) : 0;

    try {
      setBooking(true);
      setError("");

      if (fee > 0) {
        // --- Payment required ---
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
          throw new Error(
            "Failed to load payment gateway. Please check your internet connection.",
          );
        }

        const idempotencyKey = crypto.randomUUID();

        // Create Razorpay order
        const orderRes = await fetch("/api/payment/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: fee,
            patient_id: patientId,
            doctor_id: selectedDoctor.id,
            appointment_type: appointmentType,
            idempotency_key: idempotencyKey,
          }),
        });
        const orderJson = await orderRes.json();
        if (!orderRes.ok)
          throw new Error(orderJson.error || "Failed to create payment order");

        const careEpisodeId = orderJson.data?.care_episode_id || orderJson.care_episode_id;

        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: orderJson.data?.order?.amount || orderJson.order?.amount,
          currency: orderJson.data?.order?.currency || orderJson.order?.currency,
          name: "MediConnect",
          description: `Consultation with ${selectedDoctor.name}`,
          image: "/real-logo.png",
          order_id: orderJson.data?.order?.id || orderJson.order?.id,
          handler: async function (response) {
            await confirmBooking(patientId, {
              payment_id: response.razorpay_payment_id,
              order_id: response.razorpay_order_id,
              signature: response.razorpay_signature,
            }, careEpisodeId, `${idempotencyKey}-book`);
          },
          prefill: { name: "", email: "", contact: "" },
          theme: { color: "#0067A1" },
          modal: {
            ondismiss: () => {
              setBooking(false);
              setError(
                "Payment was cancelled. Please try again to complete your booking.",
              );
            },
          },
        };

        const paymentObject = new window.Razorpay(options);
        paymentObject.open();
        setBooking(false); // Wait for Razorpay handler
      } else {
        // --- Free consultation ---
        const idempotencyKey = crypto.randomUUID();
        await confirmBooking(patientId, null, null, idempotencyKey);
      }
    } catch (e) {
      console.error("Booking error:", e);
      setError(e.message || "Failed to initiate booking. Please try again.");
      setBooking(false);
    }
  };

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-2 sm:px-4">
      <div className="w-full max-w-5xl lg:max-w-7xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200 max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-4 sm:px-6 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-800">
              Recommended doctors for you
            </p>
            {analysis?.recommended_specialties?.length ? (
              <p className="text-[11px] text-gray-500">
                Based on your screening, we suggest specialists in{" "}
                <span className="font-medium">
                  {analysis.recommended_specialties.join(", ")}
                </span>
              </p>
            ) : (
              <p className="text-[11px] text-gray-500">
                Choose a doctor below to book an appointment.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-bold"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          <div className="p-4 sm:p-5 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-gray-500">Loading doctors...</p>
            ) : doctors.length === 0 ? (
              <p className="text-sm text-gray-500">
                No matching doctors available right now. Please try again later.
              </p>
            ) : (
              <div className="space-y-3">
                {doctors.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setSelectedDoctor(doc)}
                    className={`w-full text-left rounded-xl border px-3 py-3 flex items-start gap-3 transition-colors ${
                      selectedDoctor?.id === doc.id
                        ? "border-[#0067A1] bg-[#0067A1]/5"
                        : "border-gray-200 hover:border-[#0067A1]/40 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center">
                        <img
                          src={doc.profileImage || "/dr.png"}
                          alt={doc.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate flex items-center gap-1.5">
                        <FaUserMd className="w-4 h-4 text-[#0067A1]" />
                        <span>{doc.name}</span>
                      </p>
                      <p className="text-[11px] text-[#0067A1] mt-0.5 truncate">
                        {doc.specialty}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate flex items-center gap-1 mt-1">
                        <FaMapMarkerAlt className="w-3 h-3" />
                        <span>{doc.clinicName}</span>
                      </p>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                        <span>{doc.experience} years experience</span>
                        {doc.fee && doc.fee > 0 && (
                          <span className="font-semibold text-[#0067A1]">
                            ₹{doc.fee}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 sm:p-5 flex flex-col gap-3 overflow-y-auto">
            {selectedDoctor ? (
              <>
                <div className="rounded-xl border border-gray-100 bg-[#0067A1]/5 p-3 sm:p-4 flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 rounded-full overflow-hidden border border-white shadow bg-gray-100 flex items-center justify-center">
                      <img
                        src={selectedDoctor.profileImage || "/dr.png"}
                        alt={selectedDoctor.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 truncate">
                      <FaUserMd className="w-4 h-4 text-[#0067A1]" />
                      <span>{selectedDoctor.name}</span>
                    </p>
                    <p className="text-xs text-[#0067A1] mt-0.5 truncate">
                      {selectedDoctor.specialty}
                    </p>
                    <p className="text-[11px] text-gray-600 mt-1 truncate flex items-center gap-1">
                      <FaMapMarkerAlt className="w-3 h-3" />
                      <span>{selectedDoctor.clinicName}</span>
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-600">
                      {selectedDoctor.experience && (
                        <span>
                          {selectedDoctor.experience} years experience
                        </span>
                      )}
                      {selectedDoctor.fee && selectedDoctor.fee > 0 && (
                        <span className="font-semibold text-[#0067A1]">
                          ₹{selectedDoctor.fee}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-1 mt-2">
                    Book an appointment
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Select date and time slot that works best for you.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-700">
                    Appointment type
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      {
                        id: "video_consultation",
                        label: "Video consult",
                        description: "Connect from anywhere",
                      },
                      {
                        id: "clinic_visit",
                        label: "Clinic visit",
                        description: "Visit doctor at clinic",
                      },
                      {
                        id: "home_visit",
                        label: "Home visit",
                        description: "Doctor comes to your home",
                      },
                    ].map((opt) => {
                      const active = appointmentType === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setAppointmentType(opt.id);
                            setSelectedSlot(null);
                          }}
                          className={`flex-1 min-w-[110px] rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                            active
                              ? "border-[#0067A1] bg-[#0067A1] text-white shadow-sm"
                              : "border-emerald-100 bg-white text-gray-800 hover:border-[#0067A1]/70"
                          }`}
                        >
                          <div className="font-semibold text-[11px] leading-snug">
                            {opt.label}
                          </div>
                          <div
                            className={`mt-0.5 text-[10px] ${active ? "text-emerald-50" : "text-gray-500"}`}
                          >
                            {opt.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                    <FaCalendarAlt className="w-3 h-3 text-[#0067A1]" />
                    Appointment date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    min={todayStr}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0067A1] focus:border-transparent"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                    <FaClock className="w-3 h-3 text-[#0067A1]" />
                    Available time slots
                  </label>
                  {slotsLoading ? (
                    <p className="text-xs text-gray-500">Loading slots...</p>
                  ) : slots.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      No slots available for this date. Please try another date.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1">
                      {slots.map((slot) => {
                        const isBooked =
                          slot.slot_booked ||
                          slot.status === "booked" ||
                          slot.status === "approved" ||
                          slot.status === "completed" ||
                          slot.status === "freezed";
                        const rawTime = slot.time?.slice(0, 5) || slot.time;
                        const value = rawTime;
                        const timeLabel = formatTimeTo12Hour(rawTime);
                        const isPast = isPastSlot(selectedDate, rawTime);
                        const disabled = isBooked || isPast;
                        const isSelected = selectedSlot === value;
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={disabled}
                            onClick={() => setSelectedSlot(value)}
                            className={`text-[11px] px-2 py-1.5 rounded-full border transition-colors shadow-sm ${
                              disabled
                                ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                                : isSelected
                                  ? "border-[#0067A1] bg-[#0067A1] text-white shadow"
                                  : "border-emerald-100 bg-emerald-50 text-gray-800 hover:border-[#0067A1] hover:bg-[#0067A1]/10"
                            }`}
                          >
                            {timeLabel}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-800 mb-2">
                    Consent & Legal
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-start gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={dataSharingConsent}
                        onChange={(e) =>
                          setDataSharingConsent(e.target.checked)
                        }
                        className="mt-0.5 rounded border-gray-300 text-[#0067A1] focus:ring-[#0067A1]"
                      />
                      <span className="text-[10px] text-gray-600 leading-tight group-hover:text-gray-800 transition-colors">
                        I consent to the sharing of my medical data and
                        screening results with the selected doctor for clinical
                        assessment as per the DPDP Act 2023.
                      </span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={teleconsultConsent}
                        onChange={(e) =>
                          setTeleconsultConsent(e.target.checked)
                        }
                        className="mt-0.5 rounded border-gray-300 text-[#0067A1] focus:ring-[#0067A1]"
                      />
                      <span className="text-[10px] text-gray-600 leading-tight group-hover:text-gray-800 transition-colors">
                        I agree to the terms of teleconsultation and understand
                        that digital healthcare services have inherent
                        limitations compared to physical visits.
                      </span>
                    </label>
                  </div>
                </div>

                <div className="mt-auto flex flex-col gap-2 pt-2">
                  <button
                    type="button"
                    disabled={
                      booking ||
                      !selectedSlot ||
                      !dataSharingConsent ||
                      !teleconsultConsent
                    }
                    onClick={handleBook}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#0067A1] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#004F7C] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                  >
                    {booking ? (
                      "Processing..."
                    ) : selectedDoctor?.fee &&
                      Number(selectedDoctor.fee) > 0 ? (
                      <span className="flex items-center gap-1.5">
                        <FaLock className="w-3 h-3" />
                        Pay ₹{selectedDoctor.fee} &amp; Confirm
                      </span>
                    ) : (
                      "Confirm Booking (Free)"
                    )}
                  </button>
                  {bookingSuccess && (
                    <p className="flex items-center justify-center gap-1 text-[11px] text-emerald-600">
                      <FaCheckCircle className="w-3 h-3" />
                      Appointment booked! Redirecting to My Appointments...
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400 text-center mt-1">
                    You will be able to see this appointment in your "My
                    Appointments" section.
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">
                Select a doctor from the left to see available slots.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AIDoctorChat = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hi, I'm Dr. Mediconnect, your health assistant. I can help you understand your symptoms and guide you towards the right kind of care. Please describe what you're experiencing, and I'll ask a few questions to understand your situation better.\n\nNote: I provide general health information only. For medical emergencies, please call emergency services immediately.",
      sender: "ai",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [screeningId, setScreeningId] = useState(null);
  const [stage, setStage] = useState(null);
  const [progress, setProgress] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text: inputValue,
      sender: "user",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const patientId =
        typeof window !== "undefined" ? localStorage.getItem("userId") : null;

      if (!patientId) {
        const aiMessage = {
          id: Date.now() + 1,
          text: "Please login as a patient to start a health screening.",
          sender: "ai",
        };
        setMessages((prev) => [...prev, aiMessage]);
        return;
      }

      // First message: start screening
      if (!screeningId) {
        const response = await fetch("/api/v2/ai/screening", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            patient_id: patientId,
            initial_symptoms: userMessage.text,
          }),
        });

        const data = await response.json();

        if (data.status) {
          setScreeningId(data.screening_id);
          setStage(data.stage);
          if (data.progress) setProgress(data.progress);

          const questionText =
            data.next_question?.text ||
            "Can you tell me more about your symptoms?";

          const aiMessage = {
            id: Date.now() + 2,
            text: questionText,
            sender: "ai",
          };
          setMessages((prev) => [...prev, aiMessage]);
        } else {
          throw new Error(
            data.message ||
              "Failed to start health screening. Please try again.",
          );
        }
      } else {
        // Subsequent messages: answer flow
        const response = await fetch("/api/v2/ai/screening/answer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            screening_id: screeningId,
            answer: userMessage.text,
          }),
        });

        const data = await response.json();

        // Clarification required
        if (!data.status && data.requires_clarification) {
          const aiMessage = {
            id: Date.now() + 2,
            text:
              data.message ||
              "Could you please clarify your previous answer a bit more?",
            sender: "ai",
          };
          setMessages((prev) => [...prev, aiMessage]);
          return;
        }

        if (!data.status) {
          throw new Error(
            data.message ||
              "Something went wrong while processing your answer.",
          );
        }

        setScreeningId(data.screening_id || screeningId);
        if (typeof data.stage === "number") setStage(data.stage);
        if (data.progress) setProgress(data.progress);

        if (data.next_question) {
          const aiMessage = {
            id: Date.now() + 3,
            text: data.next_question.text,
            sender: "ai",
          };
          setMessages((prev) => [...prev, aiMessage]);
        } else if (data.analysis) {
          const analysisData = data.analysis;
          const summary =
            analysisData.summary ||
            "Your health screening is complete. Here is a summary:";
          const specialties =
            analysisData.recommended_specialties?.join(", ") ||
            "General Physician";
          const urgency = analysisData.urgency || "routine";

          const aiMessage = {
            id: Date.now() + 3,
            text:
              `${summary}\n\n` +
              `Urgency: ${urgency}\n` +
              `Recommended specialists: ${specialties}\n\n` +
              `Please use this as general guidance only and consult a doctor for a proper diagnosis.`,
            sender: "ai",
          };
          setMessages((prev) => [...prev, aiMessage]);
          setAnalysis(analysisData);
          setShowRecommendations(true);
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage = {
        id: Date.now() + 1,
        text: "I apologize, but I encountered an error. Please try again or contact support if the issue persists.",
        sender: "ai",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col bg-white h-full">
      {/* Chat Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`flex items-end gap-2 max-w-[85%] ${message.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mb-0.5 ${
                  message.sender === "user"
                    ? "bg-[#0067A1]"
                    : "bg-white border border-slate-200"
                }`}
              >
                {message.sender === "user" ? (
                  <FaUser className="w-3 h-3 text-white" />
                ) : (
                  <FaUserMd className="w-3 h-3 text-[#0067A1]" />
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`px-3.5 py-2.5 rounded-xl text-sm ${
                  message.sender === "user"
                    ? "bg-[#0067A1] text-white rounded-br-sm"
                    : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-end gap-2">
              <div className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center shrink-0 mb-0.5">
                <FaUserMd className="w-3 h-3 text-[#0067A1]" />
              </div>
              <div className="bg-white border border-slate-200 rounded-xl rounded-bl-sm px-3.5 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-3 py-3 border-t border-slate-200 bg-white shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Describe your symptoms..."
            disabled={isLoading}
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] transition-colors text-slate-800 placeholder-slate-400 disabled:opacity-50 bg-white"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="w-9 h-9 flex items-center justify-center bg-[#0067A1] hover:bg-[#004F7C] text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <FaPaperPlane className="w-3.5 h-3.5" />
          </button>
        </form>
        <div className="mt-2 flex gap-1.5 flex-wrap">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => !isLoading && setInputValue("I have chest pain and shortness of breath.")}
            className="text-[11px] px-2.5 py-1 rounded border border-slate-200 text-slate-500 hover:border-[#0067A1] hover:text-[#0067A1] disabled:opacity-40 transition-colors bg-white"
          >
            Chest pain & breathlessness
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => !isLoading && setInputValue("I have fever, cough, and body pain for 3 days.")}
            className="text-[11px] px-2.5 py-1 rounded border border-slate-200 text-slate-500 hover:border-[#0067A1] hover:text-[#0067A1] disabled:opacity-40 transition-colors bg-white"
          >
            Fever & body pain
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => !isLoading && setInputValue("I feel anxious and unable to sleep properly.")}
            className="text-[11px] px-2.5 py-1 rounded border border-slate-200 text-slate-500 hover:border-[#0067A1] hover:text-[#0067A1] disabled:opacity-40 transition-colors bg-white"
          >
            Anxiety & sleep
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-2">For information only · Always consult a doctor</p>
      </div>
      {analysis && (
        <RecommendedDoctorsModal
          isOpen={showRecommendations}
          onClose={() => setShowRecommendations(false)}
          analysis={analysis}
          screeningId={screeningId}
        />
      )}
    </div>
  );
};

export default AIDoctorChat;
