"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FaUserMd,
  FaMapMarkerAlt,
  FaClock,
  FaCalendarAlt,
  FaCheckCircle,
  FaStar,
  FaVideo,
  FaClinicMedical,
  FaHome,
  FaInfoCircle,
  FaShieldAlt,
} from "react-icons/fa";
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
  const [dataSharingConsent, setDataSharingConsent] = useState(false);
  const [teleconsultConsent, setTeleconsultConsent] = useState(false);
  const [showConsentGate, setShowConsentGate] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [selectedClinicIndex, setSelectedClinicIndex] = useState(0);
  const [discountDetails, setDiscountDetails] = useState(null);

  useEffect(() => {
    const fetchDiscount = async () => {
      const patientId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      if (!patientId || !doctorId) return;
      try {
        const res = await fetch(`/api/doctors/check-discount?patient_id=${patientId}&doctor_id=${doctorId}&appointment_type=${appointmentType}`);
        const json = await res.json();
        if (json.success && json.data) {
          setDiscountDetails(json.data);
        } else {
          setDiscountDetails(null);
        }
      } catch (err) {
        console.warn("Failed to check discount:", err);
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
        const res = await fetch(`/api/doctors/${doctorId}`);
        const json = await res.json();
        if (!json.success)
          throw new Error(json.error || "Failed to load doctor");
        setDoctor(json.data);
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

        const res = await fetch("/api/doctors/slots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doctor_id: doctorId,
            date: selectedDate,
            appointment_type: appointmentType,
          }),
        });

        const json = await res.json();
        if (!json.success)
          throw new Error(json.message || "Failed to fetch slots");
        setSlots(Array.isArray(json.data) ? json.data : []);
      } catch (e) {
        console.error("Doctor slots error:", e);
        setError(e.message || "Failed to load slots");
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

    if (!patientId || userRole !== "patient") {
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
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-[#0067A1] to-[#136f68] pt-6 pb-32 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center text-white/80 hover:text-white transition-colors text-sm"
            >
              ← Back to Doctors
            </button>
          </div>

          {!loading && !error && doctor && (
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
              <div className="relative">
                <div className="h-32 w-32 md:h-40 md:w-40 rounded-full border-4 border-white/20 shadow-xl overflow-hidden bg-white">
                  <img
                    src={profileImage}
                    alt={fullName}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-green-500 shadow-md">
                  <FaCheckCircle className="h-4 w-4 text-white" />
                </div>
              </div>

              <div className="text-center md:text-left flex-1">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  {fullName}
                </h1>
                <p className="text-xl text-white/90 font-medium mb-4">
                  {specialty}
                </p>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-white/80">
                  <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                    <FaMapMarkerAlt /> {clinic}
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                    <FaClock /> {experience} Exp.
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                    <FaStar className="text-yellow-400" />{" "}
                    {rating > 0 ? rating.toFixed(1) : "New"} ({reviews} Reviews)
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24">
        {loading ? (
          <LoadingScreen
            message="Loading doctor profile..."
            submessage="Fetching availability"
          />
        ) : error ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <p className="text-red-500">{error}</p>
          </div>
        ) : !doctor ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <p className="text-gray-500">Doctor not found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Tabs */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex border-b border-gray-100">
                  <button
                    onClick={() => setActiveTab("overview")}
                    className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${
                      activeTab === "overview"
                        ? "text-[#0067A1] border-b-2 border-[#0067A1] bg-[#f0fdfa]"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab("reviews")}
                    className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${
                      activeTab === "reviews"
                        ? "text-[#0067A1] border-b-2 border-[#0067A1] bg-[#f0fdfa]"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Reviews
                  </button>
                </div>

                <div className="p-6 md:p-8">
                  {activeTab === "overview" ? (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <FaInfoCircle className="text-[#0067A1]" /> About
                        </h3>
                        <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                          {details.about ||
                            `${fullName} is a highly skilled ${specialty} with over ${experience} years of experience in ${clinic}. Requires appointment for consultation.`}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-50 p-4 rounded-xl">
                          <h4 className="font-semibold text-gray-900 mb-2">
                            Services
                          </h4>
                          <ul className="space-y-2 text-sm text-gray-600">
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-[#0067A1]"></div>{" "}
                              General Consultation
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-[#0067A1]"></div>{" "}
                              Follow-up Visits
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-[#0067A1]"></div>{" "}
                              Preventive Care
                            </li>
                          </ul>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl">
                          <h4 className="font-semibold text-gray-900 mb-2">
                            Specializations
                          </h4>
                          <ul className="space-y-2 text-sm text-gray-600">
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-[#0067A1]"></div>{" "}
                              {specialty}
                            </li>
                          </ul>
                        </div>
                      </div>

                      {qualifications.length > 0 && (
                        <div className="mt-6 bg-gray-50 p-4 rounded-xl">
                          <h4 className="font-semibold text-gray-900 mb-2">
                            Qualifications
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {qualifications.map((qual, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-[#0067A1]"
                              >
                                🎓 {qual}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="bg-gray-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaStar className="h-8 w-8 text-yellow-400" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        Patient Reviews
                      </h3>
                      <p className="text-gray-500">
                        No reviews available specifically for this profile yet.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Booking Card (Sticky) */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 p-6 sticky top-24">
                <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">
                      Consultation Fee
                    </p>
                    {discountDetails?.is_discount_applicable ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-2xl font-bold text-[#0067A1]">
                            ₹{discountDetails.discounted_fee}
                          </p>
                          <p className="text-sm text-gray-400 line-through">
                            ₹{discountDetails.original_fee}
                          </p>
                        </div>
                        <span className="inline-block text-[10px] bg-teal-50 text-[#004F7C] font-semibold px-2 py-0.5 rounded">
                          🏷️ 2nd Booking Discount!
                        </span>
                      </div>
                    ) : fee > 0 ? (
                      <p className="text-2xl font-bold text-[#0067A1]">
                        ₹{fee}
                      </p>
                    ) : (
                      <p className="text-xl font-bold text-green-600">Free</p>
                    )}
                  </div>
                  <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                    <FaShieldAlt /> DMC Specialist
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Appointment Type */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                      Mode
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        {
                          id: "video_consultation",
                          icon: <FaVideo />,
                          label: "Video",
                        },
                        {
                          id: "clinic_visit",
                          icon: <FaClinicMedical />,
                          label: "Clinic",
                        },
                        { id: "home_visit", icon: <FaHome />, label: "Home" },
                      ].map((type) => (
                        <button
                          key={type.id}
                          onClick={() => setAppointmentType(type.id)}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                            appointmentType === type.id
                              ? "border-[#0067A1] bg-[#0067A1] text-white shadow-md transform scale-105"
                              : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          <span className="mb-1 text-lg">{type.icon}</span>
                          <span className="text-[10px] font-medium">
                            {type.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {appointmentType === "clinic_visit" && (details.meta?.additional_clinics || []).length > 0 && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                        Clinic Location
                      </label>
                      <select
                        value={selectedClinicIndex}
                        onChange={(e) => setSelectedClinicIndex(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] text-gray-700 font-medium cursor-pointer"
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

                  {/* Date Selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center justify-between">
                      <span>Date</span>
                      <span className="text-[10px] font-normal text-gray-400">
                        {selectedDate}
                      </span>
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      min={todayStr}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] transition-all"
                    />
                  </div>

                  {/* Slots */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                      Time Slots
                    </label>
                    {slotsLoading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin h-5 w-5 border-2 border-[#0067A1] border-t-transparent rounded-full mx-auto"></div>
                      </div>
                    ) : slots.length === 0 ? (
                      <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <p className="text-xs text-gray-500">
                          No slots available.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
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
                              className={`text-[11px] px-1 py-2 rounded-lg border transition-all ${
                                disabled
                                  ? "bg-gray-100 text-gray-300 border-transparent cursor-not-allowed"
                                  : isSelected
                                    ? "bg-[#0067A1] text-white border-[#0067A1] font-medium shadow-md"
                                    : "bg-white text-gray-700 border-gray-200 hover:border-[#0067A1] hover:bg-emerald-50"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* DPDP Consents */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <input
                        type="checkbox"
                        id="dataSharing"
                        checked={dataSharingConsent}
                        onChange={(e) =>
                          setDataSharingConsent(e.target.checked)
                        }
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-[#0067A1] focus:ring-[#0067A1]"
                      />
                      <label
                        htmlFor="dataSharing"
                        className="text-xs text-gray-600 leading-relaxed cursor-pointer"
                      >
                        I consent to the sharing of my medical data with this
                        doctor and the MediConnect platform for the purpose of
                        clinical assessment and treatment as per the DPDP Act
                        2023.
                      </label>
                    </div>
                    <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <input
                        type="checkbox"
                        id="teleconsult"
                        checked={teleconsultConsent}
                        onChange={(e) =>
                          setTeleconsultConsent(e.target.checked)
                        }
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-[#0067A1] focus:ring-[#0067A1]"
                      />
                      <label
                        htmlFor="teleconsult"
                        className="text-xs text-gray-600 leading-relaxed cursor-pointer"
                      >
                        I agree to the Telemedicine Guidelines (2020) and
                        understand that digital consultations have clinical
                        limitations compared to physical examinations.
                      </label>
                    </div>
                  </div>

                  {/* Submit */}
                  <div className="pt-2">
                    {error && (
                      <p className="text-xs text-red-500 mb-3 text-center bg-red-50 p-2 rounded-lg">
                        {error}
                      </p>
                    )}

                    <button
                      onClick={handleBook}
                      disabled={
                        booking ||
                        !selectedSlot ||
                        !dataSharingConsent ||
                        !teleconsultConsent
                      }
                      className="w-full bg-[#0067A1] text-white py-3.5 rounded-xl font-bold shadow-lg shadow-[#0067A1]/30 hover:bg-[#09403c] hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center gap-2"
                    >
                      {booking ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                          Processing...
                        </>
                      ) : (
                        "Book Appointment"
                      )}
                    </button>

                    {bookingSuccess && (
                      <div className="mt-3 bg-green-50 text-green-700 p-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
                        <FaCheckCircle /> Booking Confirmed!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
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
