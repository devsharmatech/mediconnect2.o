"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FaUserMd,
  FaMapMarkerAlt,
  FaClock,
  FaCalendarAlt,
  FaCalendarCheck,
  FaCheckCircle,
  FaStar,
  FaVideo,
  FaClinicMedical,
  FaHome,
  FaInfoCircle,
  FaShieldAlt,
  FaGraduationCap,
  FaPhoneAlt,
  FaWhatsapp,
  FaArrowDown,
} from "react-icons/fa";
import { getDoctorDetailsAction, checkDoctorDiscountAction, getDoctorSlotsAction } from "./actions";
import { loadRazorpayScript } from "@/lib/razorpay";
import { LoadingScreen } from "@/components/public-site/ui/LoadingStates";
import ConsentGate from "@/components/public-site/auth/ConsentGate";
import dynamic from "next/dynamic";

const LoginModal = dynamic(
  () => import("@/components/public-site/auth/LoginModal"),
  { ssr: false },
);

const SignupModal = dynamic(
  () => import("@/components/public-site/auth/SignupModal"),
  { ssr: false },
);

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
    } catch {}
    return trimmed;
  }
  return String(value);
};

function DoctorProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Summary Header Panel Skeleton */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-center md:items-start gap-5">
        <div className="h-28 w-28 md:h-32 md:w-32 rounded-lg bg-slate-200 shrink-0"></div>
        <div className="flex-1 space-y-3 text-center md:text-left w-full">
          <div className="h-6 bg-slate-200 rounded w-48 mx-auto md:mx-0"></div>
          <div className="h-4 bg-slate-200 rounded w-32 mx-auto md:mx-0"></div>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-1">
            <div className="h-7 bg-slate-200 rounded w-36"></div>
            <div className="h-7 bg-slate-200 rounded w-24"></div>
            <div className="h-7 bg-slate-200 rounded w-28"></div>
          </div>
        </div>
      </div>

      {/* 2-Column Main Layout Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column Skeleton */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="flex border-b border-slate-200 bg-slate-50">
              <div className="flex-1 py-3.5 px-4"><div className="h-4 bg-slate-200 rounded w-28 mx-auto"></div></div>
              <div className="flex-1 py-3.5 px-4"><div className="h-4 bg-slate-200 rounded w-28 mx-auto"></div></div>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <div className="h-4 bg-slate-200 rounded w-24"></div>
                <div className="h-3 bg-slate-200 rounded w-full"></div>
                <div className="h-3 bg-slate-200 rounded w-5/6"></div>
                <div className="h-3 bg-slate-200 rounded w-3/4"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-28 bg-slate-100 rounded-lg p-4 space-y-2 border border-slate-200">
                  <div className="h-4 bg-slate-200 rounded w-20"></div>
                  <div className="h-3 bg-slate-200 rounded w-32"></div>
                  <div className="h-3 bg-slate-200 rounded w-28"></div>
                </div>
                <div className="h-28 bg-slate-100 rounded-lg p-4 space-y-2 border border-slate-200">
                  <div className="h-4 bg-slate-200 rounded w-24"></div>
                  <div className="h-3 bg-slate-200 rounded w-36"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column Skeleton */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <div className="h-3 bg-slate-200 rounded w-24"></div>
                <div className="h-6 bg-slate-200 rounded w-16"></div>
              </div>
              <div className="h-6 bg-slate-200 rounded w-20"></div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-slate-200 rounded w-28"></div>
              <div className="grid grid-cols-3 gap-2">
                <div className="h-10 bg-slate-200 rounded-lg"></div>
                <div className="h-10 bg-slate-200 rounded-lg"></div>
                <div className="h-10 bg-slate-200 rounded-lg"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-slate-200 rounded w-24"></div>
              <div className="h-9 bg-slate-200 rounded-lg"></div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-slate-200 rounded w-32"></div>
              <div className="grid grid-cols-3 gap-2">
                <div className="h-8 bg-slate-200 rounded-lg"></div>
                <div className="h-8 bg-slate-200 rounded-lg"></div>
                <div className="h-8 bg-slate-200 rounded-lg"></div>
                <div className="h-8 bg-slate-200 rounded-lg"></div>
                <div className="h-8 bg-slate-200 rounded-lg"></div>
                <div className="h-8 bg-slate-200 rounded-lg"></div>
              </div>
            </div>
            <div className="h-11 bg-slate-200 rounded-lg w-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DoctorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const doctorId = params?.id;

  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [booking, setBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [appointmentType, setAppointmentType] = useState("clinic_visit");
  const [activeTab, setActiveTab] = useState("overview");
  const [dataSharingConsent, setDataSharingConsent] = useState(true);
  const [teleconsultConsent, setTeleconsultConsent] = useState(true);
  const [showConsentGate, setShowConsentGate] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [selectedClinicIndex, setSelectedClinicIndex] = useState(0);
  const [discountDetails, setDiscountDetails] = useState(null);

  const scrollToBooking = () => {
    const el = document.getElementById("booking-panel");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("ring-4", "ring-[#0067A1]/40", "transition-all");
      setTimeout(() => {
        el.classList.remove("ring-4", "ring-[#0067A1]/40");
      }, 2500);
    }
  };

  const getQuickDates = () => {
    const result = [];
    const now = new Date();
    for (let i = 0; i < 3; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const dayLabel = i === 0 ? "Today" : i === 1 ? "Tomorrow" : "Day After";
      const dateNum = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      result.push({ dateStr, label: dayLabel, dateNum });
    }
    return result;
  };

  useEffect(() => {
    const fetchDiscount = async () => {
      const patientId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      if (!patientId || !doctorId) return;
      try {
        const res = await checkDoctorDiscountAction({
          patient_id: patientId,
          doctor_id: doctorId,
          appointment_type: appointmentType,
        });
        if (res.success && res.data) {
          setDiscountDetails(res.data);
        } else {
          setDiscountDetails(null);
        }
      } catch (err) {
        console.warn("Failed to check discount via Server Action:", err);
      }
    };
    fetchDiscount();
  }, [doctorId, appointmentType, selectedDate]);

  const handleLoginClick = () => {
    setIsSignupOpen(false);
    setIsLoginOpen(true);
  };

  const handleSignupClick = () => {
    setIsLoginOpen(false);
    setIsSignupOpen(true);
  };

  const todayStr = new Date().toISOString().split("T")[0];

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

  useEffect(() => {
    if (!doctorId) return;

    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);

    const fetchDoctor = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await getDoctorDetailsAction(doctorId);
        if (!res.success)
          throw new Error(res.error || "Failed to load doctor");
        setDoctor(res.data);
      } catch (e) {
        console.error("Doctor profile error:", e);
        setError(e.message || "Failed to load doctor");
      } finally {
        setLoading(false);
      }
    };

    fetchDoctor();
  }, [doctorId]);

  useEffect(() => {
    if (!doctorId || !selectedDate) return;

    const fetchSlots = async () => {
      try {
        setSlotsLoading(true);
        setSlots([]);
        setSelectedSlot(null);

        const res = await getDoctorSlotsAction({
          doctor_id: doctorId,
          date: selectedDate,
          appointment_type: appointmentType,
        });

        if (!res.success)
          throw new Error(res.error || "Failed to fetch slots");
        setSlots(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error("Doctor slots error:", e);
        setError(e.message || "Failed to fetch slots");
      } finally {
        setSlotsLoading(false);
      }
    };

    fetchSlots();
  }, [doctorId, selectedDate, appointmentType]);

  const details = doctor?.doctor_details || {};
  const fullName = details.full_name || doctor?.name || "Doctor";
  const specialty = normalizeSpecialty(details.specialization);
  const clinic = details.clinic_name || "Online consultation";
  const experience =
    details.experience_years || doctor?.experience_years || "0+ years";

  const qualifications = (() => {
    const q = details.qualification;
    if (!q) return [];
    if (Array.isArray(q)) return q.filter(Boolean);
    if (typeof q === "string") {
      try {
        const parsed = JSON.parse(q);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch {}
      return q.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [];
  })();

  let profileImage = "";
  if (details.passport_photo) {
    profileImage = Array.isArray(details.passport_photo) 
      ? details.passport_photo[0] 
      : details.passport_photo;
  }
  if (!profileImage && doctor?.profile_picture) {
    profileImage = doctor.profile_picture;
  }
  if (profileImage && typeof profileImage === 'string' && profileImage.includes("ui-avatars.com")) {
    profileImage = "";
  }
  
  if (profileImage && typeof profileImage === 'string' && profileImage.includes("::text")) {
    const match = profileImage.match(/'([^']+)'/);
    profileImage = match ? match[1] : "";
  }
  
  if (!profileImage) {
    profileImage = "/dr.png";
  }

  const baseFee =
    appointmentType === "video_consultation"
      ? Number(details.video_consultation_fee || 0)
      : appointmentType === "clinic_visit"
      ? Number(details.clinic_consultation_fee || 0)
      : appointmentType === "home_visit"
      ? Number(details.home_visit_fee || 0)
      : Number(details.consultation_fee || 0);
  const fee = discountDetails?.is_discount_applicable
    ? Number(discountDetails.discounted_fee)
    : baseFee;
  const rating = details.rating || 0;
  const reviews = details.total_reviews || 0;

  const handleBook = async () => {
    if (!doctorId || !selectedDate || !selectedSlot) return;

    const patientId =
      typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    const userRole =
      typeof window !== "undefined" ? localStorage.getItem("userRole") : null;

    if (!patientId) {
      setIsLoginOpen(true);
      return;
    }

    try {
      setBooking(true);
      setError("");

      // Enforce Layer-111 DPDP Consents before primary database allocations
      const consentRes = await fetch("/api/user/consent/grant", {
        headers: { Authorization: `Bearer ${patientId}` },
      });
      const consentData = await consentRes.json();

      if (!consentData?.data?.all_required_consented) {
        setBooking(false);
        setShowConsentGate(true);
        return;
      }

      await proceedToPaymentOrBooking();
    } catch (e) {
      console.error("Booking verification error:", e);
      setError(e.message || "Failed to verify booking prerequisites");
      setBooking(false);
    }
  };

  const proceedToPaymentOrBooking = async () => {
    const patientId =
      typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    if (!patientId) return;

    try {
      setBooking(true);
      setError("");

      const details = doctor?.doctor_details || {};
      const baseFee =
        appointmentType === "video_consultation"
          ? Number(details.video_consultation_fee || 0)
          : appointmentType === "clinic_visit"
          ? Number(details.clinic_consultation_fee || 0)
          : appointmentType === "home_visit"
          ? Number(details.home_visit_fee || 0)
          : Number(details.consultation_fee || 0);

      const fee = discountDetails?.is_discount_applicable
        ? Number(discountDetails.discounted_fee)
        : baseFee;

      let clinicName = null;
      let clinicAddress = null;
      if (appointmentType === "clinic_visit") {
        if (selectedClinicIndex === 0) {
          clinicName = details.clinic_name || null;
          clinicAddress = details.clinic_address || null;
        } else if (details.meta?.additional_clinics?.[selectedClinicIndex - 1]) {
          clinicName = details.meta.additional_clinics[selectedClinicIndex - 1].name || null;
          clinicAddress = details.meta.additional_clinics[selectedClinicIndex - 1].address || null;
        }
      }

      if (fee > 0) {
        // Log the attempt
        let attemptId = null;
        try {
          const attemptRes = await fetch("/api/appointment/attempt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              patient_id: patientId,
              doctor_id: doctorId,
              appointment_date: selectedDate,
              appointment_time: `${selectedSlot}:00`,
              appointment_type: appointmentType,
              fee: fee,
              clinic_name: clinicName,
              clinic_address: clinicAddress,
            }),
          });
          const attemptJson = await attemptRes.json();
          if (attemptJson.success && attemptJson.data) {
            attemptId = attemptJson.data.id;
          }
        } catch(e) {
          console.warn("Failed to log booking attempt:", e);
        }

        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
          throw new Error(
            "Failed to load payment gateway. Please check your connection.",
          );
        }

        // Generate Idempotency Key for this transaction
        const idempotencyKey = crypto.randomUUID();

        // Create Order
        const orderRes = await fetch("/api/payment/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: fee,
            patient_id: patientId,
            doctor_id: doctorId,
            appointment_type: appointmentType,
            idempotency_key: idempotencyKey,
          }),
        });
        const orderJson = await orderRes.json();
        if (!orderRes.ok)
          throw new Error(orderJson.error || "Failed to create payment order");

        const careEpisodeId = orderJson.data?.care_episode_id || orderJson.care_episode_id;

        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Ensure this is set in .env
          amount: orderJson.data?.order?.amount || orderJson.order?.amount,
          currency: orderJson.data?.order?.currency || orderJson.order?.currency,
          name: "MediConnect",
          description: `Consultation with ${fullName}`,
          image: `${window.location.origin}/real-logo.png`,
          order_id: orderJson.data?.order?.id || orderJson.order?.id,
          handler: async function (response) {
            await confirmBooking(patientId, {
              payment_id: response.razorpay_payment_id,
              order_id: response.razorpay_order_id,
              signature: response.razorpay_signature,
            }, careEpisodeId, `${idempotencyKey}-book`, attemptId);
          },
          prefill: {
            name: "", // Can fetch from patient details if available
            email: "",
            contact: "",
          },
          theme: {
            color: "#0067A1",
          },
        };

        const paymentObject = new window.Razorpay(options);
        paymentObject.open();
        setBooking(false); // Wait for handler
      } else {
        // Free consultation bypass
        let attemptId = null;
        try {
          const attemptRes = await fetch("/api/appointment/attempt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              patient_id: patientId,
              doctor_id: doctorId,
              appointment_date: selectedDate,
              appointment_time: `${selectedSlot}:00`,
              appointment_type: appointmentType,
              fee: 0,
              clinic_name: clinicName,
              clinic_address: clinicAddress,
            }),
          });
          const attemptJson = await attemptRes.json();
          if (attemptJson.success && attemptJson.data) {
            attemptId = attemptJson.data.id;
          }
        } catch(e) {
          console.warn("Failed to log booking attempt:", e);
        }

        const idempotencyKey = crypto.randomUUID();
        await confirmBooking(patientId, null, null, idempotencyKey, attemptId);
      }
    } catch (e) {
      console.error("Booking initiation error:", e);
      setError(e.message || "Failed to initiate booking");
      setBooking(false);
    }
  };

  const confirmBooking = async (patientId, paymentDetails = null, careEpisodeId = null, idempotencyKey = null, attemptId = null) => {
    try {
      setBooking(true);
      const details = doctor?.doctor_details || {};
      let clinicName = null;
      let clinicAddress = null;
      if (appointmentType === "clinic_visit") {
        if (selectedClinicIndex === 0) {
          clinicName = details.clinic_name || null;
          clinicAddress = details.clinic_address || null;
        } else if (details.meta?.additional_clinics?.[selectedClinicIndex - 1]) {
          clinicName = details.meta.additional_clinics[selectedClinicIndex - 1].name || null;
          clinicAddress = details.meta.additional_clinics[selectedClinicIndex - 1].address || null;
        }
      }

      console.log("[DEBUG BOOKING] confirmBooking called with:", {
        patientId,
        paymentDetails,
        careEpisodeId,
        idempotencyKey,
        attemptId
      });
      const requestPayload = {
        doctor_id: doctorId,
        patient_id: patientId,
        appointment_date: selectedDate,
        appointment_time: `${selectedSlot}:00`,
        screening_id: null,
        appointment_type: appointmentType,
        care_episode_id: careEpisodeId,
        idempotency_key: idempotencyKey,
        consents: {
          data_sharing: dataSharingConsent,
          teleconsultation: teleconsultConsent,
        },
        disease_info: paymentDetails
          ? `Booked via website | Payment ID: ${paymentDetails.payment_id}`
          : "Booked via website",
        payment_id: paymentDetails?.payment_id || null,
        razorpay_order_id: paymentDetails?.order_id || null,
        attempt_id: attemptId,
        clinic_name: clinicName,
        clinic_address: clinicAddress,
      };
      console.log("[DEBUG BOOKING] Sending payload to /api/appointment/book:", requestPayload);

      const res = await fetch("/api/appointment/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      const json = await res.json();
      console.log("[DEBUG BOOKING] Booking API responded with:", json);
      if (!json.success) throw new Error(json.message || "Failed to book");

      console.log("[DEBUG BOOKING] Booking confirmed successfully! Navigating to /website/appointments for patientId:", patientId);
      setBookingSuccess(true);
      setTimeout(() => {
        router.push("/website/appointments");
      }, 2000);
    } catch (e) {
      console.error("[DEBUG BOOKING] Booking confirmation error:", e);
      setError(e.message || "Failed to confirm booking");
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-28 lg:pb-12">
      {/* Top Header Navigation */}
      <div className="bg-white border-b border-slate-200 py-3.5 px-4 sm:px-6 lg:px-8 shadow-2xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#0067A1] hover:text-[#004F7C] transition-colors"
          >
            ← Back to Doctors
          </button>
          <span className="text-xs font-semibold text-slate-500">Doctor Profile</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Doctor Summary Header Panel */}
        {!loading && !error && doctor && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-center md:items-start gap-5">
            <div className="relative shrink-0">
              <div className="h-28 w-28 md:h-32 md:w-32 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                <img
                  src={profileImage}
                  alt={fullName}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-xs">
                <FaCheckCircle className="h-4 w-4 text-emerald-500" />
              </div>
            </div>

            <div className="flex-1 text-center md:text-left w-full">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900">
                  {fullName}
                </h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200/60">
                  <FaShieldAlt className="w-3 h-3 text-emerald-500" /> {specialty?.toLowerCase()?.includes("dent") ? "DDC Verified" : (details.council_name || "DMC Verified")}
                </span>
              </div>
              
              <p className="text-sm font-semibold text-[#0067A1] mb-3">
                {specialty}
              </p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs text-slate-600 mb-4">
                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                  <FaMapMarkerAlt className="text-[#0067A1]" /> <span>{clinic}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                  <FaClock className="text-[#0067A1]" /> <span>{experience} Exp.</span>
                </div>
                <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded border border-amber-200/60 font-semibold text-amber-800">
                  <FaStar className="text-amber-500" /> 
                  <span>{rating > 0 ? rating.toFixed(1) : "New"}</span>
                  {reviews > 0 && <span className="font-normal text-amber-700">({reviews} Reviews)</span>}
                </div>
              </div>

              {/* High-Visibility Appointment Action Box */}
              <div className="pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gradient-to-r from-sky-50/90 via-blue-50/40 to-slate-50/60 p-3.5 sm:p-4 rounded-lg border border-sky-100/90">
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                  <div>
                    <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block leading-none mb-1">
                      Consultation Fee
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      {discountDetails?.is_discount_applicable ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xl sm:text-2xl font-semibold text-[#0067A1]">
                            ₹{discountDetails.discounted_fee}
                          </span>
                          <span className="text-xs text-slate-400 line-through">
                            ₹{discountDetails.original_fee}
                          </span>
                        </div>
                      ) : fee > 0 ? (
                        <span className="text-xl sm:text-2xl font-semibold text-[#0067A1]">
                          ₹{fee}
                        </span>
                      ) : (
                        <span className="text-xl sm:text-2xl font-semibold text-emerald-600">Free</span>
                      )}
                      <span className="text-xs text-slate-500 font-medium">/ consultation</span>
                    </div>
                  </div>
                  <span className="sm:hidden inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                    <FaCheckCircle className="text-emerald-600 text-xs" /> Verified
                  </span>
                </div>

                <button
                  type="button"
                  onClick={scrollToBooking}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#0067A1] hover:bg-[#004F7C] active:bg-[#003e61] text-white px-5 sm:px-6 py-2.5 rounded-md font-medium text-sm shadow-sm transition-all cursor-pointer"
                >
                  <FaCalendarCheck className="w-4 h-4 text-emerald-300" />
                  <span>Book Appointment</span>
                  <FaArrowDown className="w-3 h-3 opacity-80" />
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <DoctorProfileSkeleton />
        ) : error ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
            <p className="text-red-500 font-medium text-sm">{error}</p>
          </div>
        ) : !doctor ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
            <p className="text-slate-500 text-sm">Doctor not found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Navigation Tabs */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="flex border-b border-slate-200 bg-slate-50/50">
                  <button
                    onClick={() => setActiveTab("overview")}
                    className={`flex-1 py-3 text-xs font-bold text-center transition-colors ${
                      activeTab === "overview"
                        ? "text-[#0067A1] border-b-2 border-[#0067A1] bg-white"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/50"
                    }`}
                  >
                    Overview & Details
                  </button>
                  <button
                    onClick={() => setActiveTab("reviews")}
                    className={`flex-1 py-3 text-xs font-bold text-center transition-colors ${
                      activeTab === "reviews"
                        ? "text-[#0067A1] border-b-2 border-[#0067A1] bg-white"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/50"
                    }`}
                  >
                    Patient Reviews
                  </button>
                </div>

                <div className="p-5 md:p-6">
                  {activeTab === "overview" ? (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                          <FaInfoCircle className="text-[#0067A1]" /> About Doctor
                        </h3>
                        <p className="text-slate-600 leading-relaxed text-xs md:text-sm">
                          {details.about ||
                            `${fullName} is a registered ${specialty} with over ${experience} years of experience practicing at ${clinic}. Provides dedicated medical consultations and patient care.`}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/80">
                          <h4 className="font-bold text-xs text-slate-800 mb-2 uppercase tracking-wider">
                            Services Provided
                          </h4>
                          <ul className="space-y-1.5 text-xs text-slate-600">
                            <li className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#0067A1]"></span>
                              General Consultation
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#0067A1]"></span>
                              Follow-up & Prescription Reviews
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#0067A1]"></span>
                              Preventive Healthcare
                            </li>
                          </ul>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/80">
                          <h4 className="font-bold text-xs text-slate-800 mb-2 uppercase tracking-wider">
                            Specializations
                          </h4>
                          <ul className="space-y-1.5 text-xs text-slate-600">
                            <li className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#0067A1]"></span>
                              {specialty}
                            </li>
                          </ul>
                        </div>
                      </div>

                      {qualifications.length > 0 && (
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/80">
                          <h4 className="font-bold text-xs text-slate-800 mb-2 uppercase tracking-wider">
                            Qualifications & Degrees
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {qualifications.map((qual, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-white border border-slate-200 text-slate-800 shadow-2xs"
                              >
                                <FaGraduationCap className="w-3.5 h-3.5 text-[#0067A1]" /> {qual}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <FaStar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <h3 className="text-sm font-bold text-slate-800 mb-1">
                        Patient Reviews
                      </h3>
                      <p className="text-xs text-slate-500">
                        No patient reviews published yet for this doctor profile.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Appointment Booking Panel */}
            <div className="lg:col-span-1" id="booking-panel">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5 transition-all">
                {/* Panel Title & Fee */}
                <div className="pb-4 border-b border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0067A1] flex items-center justify-center">
                        <FaCalendarCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold text-slate-900 leading-tight">
                          Book Appointment
                        </h2>
                        <span className="text-[11px] text-slate-500 block leading-tight">
                          Select slot & confirm
                        </span>
                      </div>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1">
                      <FaShieldAlt className="w-3 h-3 text-emerald-500" /> Verified
                    </span>
                  </div>

                  <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block leading-none mb-1">
                        Consultation Fee
                      </span>
                      {discountDetails?.is_discount_applicable ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-semibold text-[#0067A1]">
                              ₹{discountDetails.discounted_fee}
                            </span>
                            <span className="text-xs text-slate-400 line-through">
                              ₹{discountDetails.original_fee}
                            </span>
                          </div>
                          <span className="inline-block text-[10px] bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded border border-emerald-200/60">
                            2nd Booking Discount Applied
                          </span>
                        </div>
                      ) : fee > 0 ? (
                        <span className="text-xl font-semibold text-slate-900">
                          ₹{fee}
                        </span>
                      ) : (
                        <span className="text-lg font-semibold text-emerald-600">Free</span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium text-right">
                      No Extra Charges<br />
                      <span className="text-emerald-600 font-medium">Safe & Verified</span>
                    </span>
                  </div>
                </div>

                {/* Step 1: Consultation Mode Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                    1. Consultation Mode
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        id: "video_consultation",
                        icon: <FaVideo className="w-4 h-4" />,
                        title: "Video Call",
                        sub: "Online consultation",
                      },
                      {
                        id: "clinic_visit",
                        icon: <FaClinicMedical className="w-4 h-4" />,
                        title: "Clinic Visit",
                        sub: "In-person visit",
                      },
                      {
                        id: "home_visit",
                        icon: <FaHome className="w-4 h-4" />,
                        title: "Home Visit",
                        sub: "Doctor at home",
                      },
                    ].map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setAppointmentType(type.id)}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-md border text-center transition-all cursor-pointer ${
                          appointmentType === type.id
                            ? "border-[#0067A1] bg-[#0067A1] text-white shadow-sm ring-2 ring-[#0067A1]/20"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                        }`}
                      >
                        <span className="mb-1">{type.icon}</span>
                        <span className="text-xs font-medium leading-tight">{type.title}</span>
                        <span className={`text-[10px] mt-0.5 leading-tight ${appointmentType === type.id ? "text-sky-100" : "text-slate-500"}`}>
                          {type.sub}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Multiple Clinics Dropdown */}
                {appointmentType === "clinic_visit" && (details.meta?.additional_clinics || []).length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                      Clinic Location
                    </label>
                    <select
                      value={selectedClinicIndex}
                      onChange={(e) => setSelectedClinicIndex(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs bg-slate-50 text-slate-800 font-medium focus:outline-none focus:border-[#0067A1]"
                    >
                      <option value={0}>{details.clinic_name || "Primary Clinic"} ({details.clinic_address})</option>
                      {(details.meta.additional_clinics).map((c, cIdx) => (
                        <option key={cIdx + 1} value={cIdx + 1}>
                          {c.name || `Branch ${cIdx + 2}`} ({c.address})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Step 2: Date Picker with 1-Tap Quick Dates */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                      2. Select Date
                    </label>
                    <span className="text-[11px] font-medium text-[#0067A1] bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                      {selectedDate}
                    </span>
                  </div>

                  {/* Quick Date Chips (Today / Tomorrow / Day After) */}
                  <div className="grid grid-cols-3 gap-2">
                    {getQuickDates().map((q) => {
                      const isSelected = selectedDate === q.dateStr;
                      return (
                        <button
                          key={q.dateStr}
                          type="button"
                          onClick={() => setSelectedDate(q.dateStr)}
                          className={`py-2 px-1 rounded-md border text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                            isSelected
                              ? "border-[#0067A1] bg-[#0067A1] text-white shadow-sm ring-2 ring-[#0067A1]/20"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                          }`}
                        >
                          <span className={`text-[11px] font-medium ${isSelected ? "text-white" : "text-slate-800"}`}>
                            {q.label}
                          </span>
                          <span className={`text-[10px] ${isSelected ? "text-sky-100" : "text-slate-500"}`}>
                            {q.dateNum}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Or Pick another custom date */}
                  <div className="pt-1">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1">
                      <FaCalendarAlt className="w-3 h-3 text-slate-400" />
                      <span>Or pick another date:</span>
                    </div>
                    <input
                      type="date"
                      value={selectedDate}
                      min={todayStr}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#0067A1] focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                {/* Step 3: Available Slots */}
                <div id="time-slots-section" className="space-y-2 p-3 bg-slate-50/70 rounded-lg border border-slate-200/80 transition-all">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                      3. Available Time Slots
                    </label>
                    {selectedSlot && (
                      <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                        <FaCheckCircle className="text-emerald-500 text-[10px]" /> {selectedSlot}
                      </span>
                    )}
                  </div>

                  {slotsLoading ? (
                    <div className="text-center py-5">
                      <div className="animate-spin h-5 w-5 border-2 border-[#0067A1] border-t-transparent rounded-full mx-auto mb-1.5"></div>
                      <p className="text-xs text-slate-500">Checking doctor slots...</p>
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="text-center py-5 bg-white rounded-lg border border-slate-200 p-3">
                      <p className="text-xs text-slate-700 font-semibold mb-1">
                        No slots available for this date.
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Please select tomorrow or another date above.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Select an available time slot below:
                      </p>
                      <div 
                        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                        className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto no-scrollbar hide-scrollbar scrollbar-none p-0.5"
                      >
                        {slots.map((slot) => {
                          const isBooked =
                            slot.slot_booked ||
                            [
                              "booked",
                              "approved",
                              "completed",
                              "freezed",
                            ].includes(slot.status);
                          const rawTime = slot.time?.slice(0, 5) || slot.time;
                          const [hStr, mStr] = (rawTime || "").split(":");
                          const hNum = parseInt(hStr || "", 10);
                          const suffix =
                            !Number.isNaN(hNum) && hNum >= 12 ? "PM" : "AM";
                          const displayHour = !Number.isNaN(hNum)
                            ? ((hNum + 11) % 12) + 1
                            : rawTime;
                          const label = `${displayHour}:${mStr} ${suffix}`;
                          const isPast = isPastSlot(selectedDate, rawTime);
                          const disabled = isBooked || isPast;
                          const isSelected = selectedSlot === rawTime;

                          return (
                            <button
                              key={slot.time}
                              disabled={disabled}
                              onClick={() => setSelectedSlot(rawTime)}
                              className={`text-[11px] py-2 px-1 rounded-md border font-medium transition-all cursor-pointer ${
                                disabled
                                  ? "bg-slate-100 text-slate-300 border-transparent cursor-not-allowed"
                                  : isSelected
                                    ? "bg-[#0067A1] text-white border-[#0067A1] shadow-sm ring-2 ring-[#0067A1]/20 font-medium"
                                    : "bg-white text-slate-700 border-slate-200 hover:border-[#0067A1] hover:bg-sky-50/50"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* DPDP Consents - Simplified & Pre-agreed */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                    <input
                      type="checkbox"
                      id="dataSharing"
                      checked={dataSharingConsent}
                      onChange={(e) =>
                        setDataSharingConsent(e.target.checked)
                      }
                      className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-[#0067A1] focus:ring-[#0067A1]"
                    />
                    <label
                      htmlFor="dataSharing"
                      className="text-[11px] text-slate-600 leading-normal cursor-pointer"
                    >
                      Consent for medical consultation & records sharing (as per DPDP Act 2023)
                    </label>
                  </div>

                  <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                    <input
                      type="checkbox"
                      id="teleconsult"
                      checked={teleconsultConsent}
                      onChange={(e) =>
                        setTeleconsultConsent(e.target.checked)
                      }
                      className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-[#0067A1] focus:ring-[#0067A1]"
                    />
                    <label
                      htmlFor="teleconsult"
                      className="text-[11px] text-slate-600 leading-normal cursor-pointer"
                    >
                      Acceptance of Telemedicine Practice Guidelines (2020)
                    </label>
                  </div>
                </div>

                {/* Booking CTA Button */}
                <div className="pt-1">
                  {error && (
                    <p className="text-xs text-rose-600 mb-2.5 p-2 rounded bg-rose-50 border border-rose-200 text-center font-medium">
                      {error}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedSlot) {
                        const slotSection = document.getElementById("time-slots-section");
                        if (slotSection) {
                          slotSection.scrollIntoView({ behavior: "smooth", block: "center" });
                          slotSection.classList.add("ring-2", "ring-amber-400");
                          setTimeout(() => slotSection.classList.remove("ring-2", "ring-amber-400"), 2000);
                        }
                        return;
                      }
                      handleBook();
                    }}
                    disabled={
                      booking ||
                      !dataSharingConsent ||
                      !teleconsultConsent
                    }
                    className={`w-full py-3 px-4 rounded-md font-medium text-xs sm:text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      !selectedSlot
                        ? "bg-amber-500 hover:bg-amber-600 text-white animate-pulse"
                        : "bg-[#0067A1] hover:bg-[#004F7C] active:bg-[#003e61] text-white"
                    }`}
                  >
                    {booking ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Processing Booking...</span>
                      </>
                    ) : !selectedSlot ? (
                      <>
                        <FaClock className="w-4 h-4" />
                        <span>Select a Time Slot Above</span>
                      </>
                    ) : (
                      <>
                        <FaCalendarCheck className="w-4 h-4 text-emerald-300" />
                        <span>Confirm & Book • {fee > 0 ? `₹${fee}` : "Free"}</span>
                      </>
                    )}
                  </button>

                  {bookingSuccess && (
                    <div className="mt-2.5 bg-emerald-50 text-emerald-800 p-2.5 rounded-lg border border-emerald-200 flex items-center justify-center gap-2 text-xs font-medium">
                      <FaCheckCircle className="text-emerald-600" /> Booking Confirmed! Redirecting...
                    </div>
                  )}
                </div>

                {/* Direct Phone / WhatsApp Assistance */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 text-center space-y-2">
                  <div className="text-[11px] font-medium text-slate-700 leading-tight">
                    Need help booking your appointment?
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <a
                      href="tel:18001234567"
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#0067A1] bg-white px-3 py-1.5 rounded-md border border-slate-200 hover:bg-sky-50 shadow-2xs"
                    >
                      <FaPhoneAlt className="text-[10px] text-[#0067A1]" />
                      <span>Call Support</span>
                    </a>
                    <a
                      href="https://wa.me/919999999999?text=Hello%20MediConnect,%20I%20need%20help%20booking%20a%20doctor%20appointment"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-white px-3 py-1.5 rounded-md border border-emerald-200 hover:bg-emerald-50 shadow-2xs"
                    >
                      <FaWhatsapp className="text-xs text-emerald-500" />
                      <span>WhatsApp Help</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Sticky Quick Booking Bar (visible only on mobile, placed above mobile navigation) */}
        {!loading && !error && doctor && (
          <div className="lg:hidden fixed bottom-[56px] left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-4 py-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.12)] flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block leading-none mb-1">
                Consultation Fee
              </span>
              <span className="text-base font-semibold text-[#0067A1] leading-none">
                {discountDetails?.is_discount_applicable
                  ? `₹${discountDetails.discounted_fee}`
                  : fee > 0
                  ? `₹${fee}`
                  : "Free"}
              </span>
            </div>
            <button
              type="button"
              onClick={scrollToBooking}
              className="flex-1 max-w-[260px] inline-flex items-center justify-center gap-2 bg-[#0067A1] active:bg-[#004F7C] text-white py-2 px-3 rounded-md font-medium text-xs shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <FaCalendarCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>Book Appointment</span>
            </button>
          </div>
        )}
      </div>

      <ConsentGate
        isOpen={showConsentGate}
        onConsentGranted={() => {
          setShowConsentGate(false);
          proceedToPaymentOrBooking();
        }}
        onClose={() => setShowConsentGate(false)}
      />

      {isLoginOpen && (
        <LoginModal
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          onSignupClick={handleSignupClick}
          onSuccess={() => {
            setIsLoginOpen(false);
            window.location.reload();
          }}
        />
      )}
      {isSignupOpen && (
        <SignupModal
          isOpen={isSignupOpen}
          onClose={() => setIsSignupOpen(false)}
          onLoginClick={handleLoginClick}
        />
      )}
    </div>
  );
}
