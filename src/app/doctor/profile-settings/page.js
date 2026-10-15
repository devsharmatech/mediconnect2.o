"use client";

import { 
  useState,
  useEffect,
  useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { 
  FaUserMd,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaGraduationCap,
  FaBriefcaseMedical,
  FaSave,
  FaEdit,
  FaUser,
  FaStethoscope,
  FaClock,
  FaDollarSign,
  FaHospital,
  FaUserEdit,
  FaHistory,
  FaCertificate,
  FaStar,
  FaCalendarAlt,
  FaLock,
  FaTimes,
  FaTrashAlt,
  FaClinicMedical,
  FaPercentage,
  FaRupeeSign,
  FaPlus,
  FaBolt,
  FaCopy,
  FaCheck,
  FaChevronDown,
  FaChevronUp,
  FaVideo
} from "react-icons/fa";
import api from "@/utils/websiteApi";

// Combined list to match doctor onboarding (specialities + super-specialities)
const specialities = [
  // Core specialities
  { name: "General Medicine", icon: "👨‍⚕️", description: "Internal medicine" },
  { name: "General Physician", icon: "👨‍⚕️", description: "General medical practitioner" },
  { name: "Family Medicine", icon: "👨‍👩‍👧", description: "Family physician" },
  { name: "Pediatrics", icon: "👶", description: "Child healthcare specialist" },
  { name: "Neonatology", icon: "👶", description: "Newborn specialist" },
  { name: "Obstetrics & Gynecology", icon: "👩", description: "Women health specialist" },
  { name: "Cardiology", icon: "❤️", description: "Heart specialist" },
  { name: "Cardiothoracic Surgery", icon: "❤️", description: "Heart & chest surgery" },
  { name: "Dermatology", icon: "🔬", description: "Skin specialist" },
  { name: "Cosmetology", icon: "✨", description: "Cosmetic procedures" },
  { name: "Orthopedics", icon: "🦴", description: "Bone and joint specialist" },
  { name: "Rheumatology", icon: "🦵", description: "Joint and arthritis specialist" },
  { name: "Psychiatry", icon: "🧠", description: "Mental health specialist" },
  { name: "Clinical Psychology", icon: "🧠", description: "Psychological counselling" },
  { name: "ENT (Otorhinolaryngology)", icon: "👂", description: "Ear, Nose, Throat" },
  { name: "Ophthalmology", icon: "👁️", description: "Eye specialist" },
  { name: "Dentistry", icon: "🦷", description: "Dental care specialist" },
  { name: "Pulmonology", icon: "🫁", description: "Lung specialist" },
  { name: "Critical Care Medicine", icon: "🏥", description: "ICU & intensive care" },
  { name: "Endocrinology", icon: "⚖️", description: "Hormone specialist" },
  { name: "Gastroenterology", icon: "🍽️", description: "Digestive system specialist" },
  { name: "Hepatology", icon: "🍽️", description: "Liver specialist" },
  { name: "Nephrology", icon: "🧬", description: "Kidney specialist" },
  { name: "Urology", icon: "💧", description: "Urinary system specialist" },
  { name: "Neurology", icon: "🧠", description: "Brain & nerve specialist" },
  { name: "Neurosurgery", icon: "🧠", description: "Brain & spine surgery" },
  { name: "Radiology", icon: "📷", description: "Medical imaging" },
  { name: "Interventional Radiology", icon: "📷", description: "Image-guided procedures" },
  { name: "Oncology (Medical)", icon: "🎗️", description: "Cancer specialist" },
  { name: "Oncology (Surgical)", icon: "🎗️", description: "Cancer surgery" },
  { name: "Oncology (Radiation)", icon: "🎗️", description: "Radiation therapy" },
  { name: "Plastic & Reconstructive Surgery", icon: "✨", description: "Cosmetic & reconstructive" },
  { name: "Vascular Surgery", icon: "🩺", description: "Blood vessel surgery" },
  { name: "Anesthesiology", icon: "💉", description: "Anesthesia specialist" },
  { name: "Pain Medicine", icon: "💊", description: "Chronic pain management" },
  { name: "Physiotherapy", icon: "🏃", description: "Physical rehabilitation" },
  { name: "Nutrition & Dietetics", icon: "🥗", description: "Clinical nutrition" },
  { name: "Sports Medicine", icon: "⚽", description: "Sports injuries" },
  { name: "Emergency Medicine", icon: "🚑", description: "Emergency & trauma" },
  { name: "Geriatrics", icon: "👴", description: "Elderly care" },
  { name: "Occupational Therapy", icon: "🖐️", description: "Functional rehabilitation" },
  { name: "Other", icon: "➕", description: "Other speciality" },

  // Super-specialities (from onboarding)
  { name: "Cardiac Electrophysiology", icon: "❤️", description: "Heart rhythm specialist" },
  { name: "Heart Failure & Transplant", icon: "❤️", description: "Advanced cardiac care" },
  { name: "Pediatric Cardiology", icon: "👶", description: "Children's heart specialist" },
  { name: "Interventional Cardiology", icon: "❤️", description: "Cath-lab procedures" },
  { name: "Stroke & Neurointervention", icon: "🧠", description: "Stroke interventions" },
  { name: "Spine Surgery", icon: "🦴", description: "Spine surgery" },
  { name: "Joint Replacement", icon: "🦴", description: "Hip & knee replacement" },
  { name: "Pediatric Neurology", icon: "👶", description: "Children's neurology" },
  { name: "Movement Disorders", icon: "🧠", description: "Parkinsonism, tremors" },
  { name: "Epileptology", icon: "🧠", description: "Epilepsy" },
  { name: "Pediatric Gastroenterology", icon: "👶", description: "GI in children" },
  { name: "Liver Transplant", icon: "🍽️", description: "Liver transplant" },
  { name: "Kidney Transplant", icon: "🧬", description: "Renal transplant" },
  { name: "Bone Marrow Transplant", icon: "🩸", description: "Hematology-oncology" },
  { name: "Neonatal Intensive Care", icon: "👶", description: "NICU" },
  { name: "Pediatric Intensive Care", icon: "👶", description: "PICU" },
  { name: "Fetal Medicine", icon: "👶", description: "Fetal imaging & therapy" },
  { name: "High-risk Obstetrics", icon: "👩", description: "Complicated pregnancy" },
  { name: "Reproductive Medicine / IVF", icon: "🧬", description: "Fertility specialist" },
  { name: "Interventional Pulmonology", icon: "🫁", description: "Bronchoscopy & procedures" },
  { name: "Sleep Medicine", icon: "😴", description: "Sleep disorders" },
  { name: "Allergy & Immunology", icon: "🌸", description: "Allergy specialist" },
  { name: "Pediatric Endocrinology", icon: "👶", description: "Hormones in children" },
  { name: "Metabolic Medicine", icon: "⚖️", description: "Metabolic disorders" },
  { name: "Interventional Neuroradiology", icon: "📷", description: "Neurovascular procedures" },
  { name: "Head & Neck Oncology", icon: "🎗️", description: "Cancer of head & neck" },
  { name: "Breast Oncology", icon: "🎗️", description: "Breast cancer" },
  { name: "Gynecologic Oncology", icon: "🎗️", description: "Gynec cancers" },
  { name: "Pediatric Oncology", icon: "👶", description: "Children's cancer" },
  { name: "Hand Surgery", icon: "✋", description: "Hand & microsurgery" },
  { name: "Craniofacial Surgery", icon: "😊", description: "Face & skull" },
  { name: "Bariatric Surgery", icon: "⚖️", description: "Weight-loss surgery" },
  { name: "Colorectal Surgery", icon: "🍽️", description: "Colon & rectum" },
  { name: "Pediatric Surgery", icon: "👶", description: "Surgery in children" },
  { name: "Other Super-speciality", icon: "➕", description: "Other super speciality" },
];

const qualificationsOptions = [
  "MBBS",
  "MBChB",
  "MD (Physician)",
  "MD (General Medicine)",
  "MD (Pediatrics)",
  "MD (Obstetrics & Gynecology)",
  "MD (Dermatology)",
  "MD (Psychiatry)",
  "MD (Anesthesiology)",
  "MD (Radiology)",
  "MD (Pathology)",
  "MD (Community Medicine)",
  "MD (Emergency Medicine)",
  "MS (General Surgery)",
  "MS (Orthopedics)",
  "MS (ENT)",
  "MS (Ophthalmology)",
  "MS (Obstetrics & Gynecology)",
  "DNB (Medicine)",
  "DNB (Pediatrics)",
  "DNB (Orthopedics)",
  "DNB (Radiology)",
  "DNB (Anesthesiology)",
  "DNB (General Surgery)",
  "DM (Cardiology)",
  "DM (Neurology)",
  "DM (Gastroenterology)",
  "DM (Nephrology)",
  "DM (Endocrinology)",
  "DM (Pulmonology)",
  "MCh (Cardiothoracic Surgery)",
  "MCh (Neurosurgery)",
  "MCh (Plastic Surgery)",
  "MCh (Urology)",
  "MCh (Surgical Oncology)",
  "BDS",
  "MDS (Orthodontics)",
  "MDS (Endodontics)",
  "MDS (Prosthodontics)",
  "MDS (Periodontology)",
  "BHMS",
  "BAMS",
  "BUMS",
  "MD (Homoeopathy)",
  "MD (Ayurveda)",
  "FRCS",
  "MRCP",
  "MRCS",
  "Fellowship (India)",
  "Fellowship (International)",
  "PhD (Medical)",
  "Diploma (Medical)",
  "Other",
];

const Field = ({
  label,
  value,
  isEditing,
  name,
  type = "text",
  textarea = false,
  rows = 3,
  onChange,
}) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-semibold text-slate-700">
      {label}
    </label>
    {isEditing ? (
      textarea ? (
        <textarea
          name={name}
          value={value || ""}
          onChange={onChange}
          rows={rows}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] transition-colors"
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value || ""}
          onChange={onChange}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] transition-colors"
        />
      )
    ) : (
      <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-800 text-sm min-h-[38px] flex items-center">
        {value || <span className="text-slate-400 font-normal">—</span>}
      </div>
    )}
  </div>
);

// Format 24-hr time (e.g. "09:00", "17:00") into clean 12-hr display ("09:00 AM", "05:00 PM")
const formatTime12 = (timeStr) => {
  if (!timeStr) return "";
  const trimmed = String(timeStr).trim();
  if (trimmed.includes("AM") || trimmed.includes("PM") || trimmed.includes("am") || trimmed.includes("pm")) {
    return trimmed;
  }
  const parts = trimmed.split(":");
  if (parts.length < 2) return trimmed;
  const hour = parseInt(parts[0], 10);
  const min = parts[1].slice(0, 2);
  if (isNaN(hour)) return trimmed;
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${min} ${ampm}`;
};

export default function DoctorProfile() {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    specialization: "",
    experience: "",
    qualification: "",
    hospital: "",
    address: "",
    videoConsultationFee: "",
    videoFollowUpFee: "",
    clinicConsultationFee: "",
    clinicFollowUpFee: "",
    homeVisitFee: "",
    homeFollowUpFee: "",
    followUpFee: "",
    about: "",
    licenseNumber: "",
    languages: "",
    rating: "",
    patientsTreated: "",
    availability: "",
    secondBookingDiscountType: "none",
    secondBookingDiscountValue: 0,
    additionalClinics: [],
  });
  const [profilePicture, setProfilePicture] = useState("");
  const [newProfileFile, setNewProfileFile] = useState(null);

  const [stats, setStats] = useState({
    totalAppointments: 0,
    completed: 0,
    patientSatisfaction: 0,
    averageRating: 0,
  });
  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const [weeklyAvailability, setWeeklyAvailability] = useState({
    leave_days: [],
    clinic_slots: {},
    video_slots: {},
    home_slots: {},
  });
  const [quickSetupOpen, setQuickSetupOpen] = useState(false);
  const [quickClinic, setQuickClinic] = useState({ start: "09:00", end: "13:00" });
  const [quickVideo, setQuickVideo] = useState({ start: "17:00", end: "20:00" });
  const [quickHome, setQuickHome] = useState({ start: "", end: "" });
  const [quickScope, setQuickScope] = useState("weekdays");
  const [quickDays, setQuickDays] = useState([
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
  ]);
  const [scheduleViewMode, setScheduleViewMode] = useState("cards"); // 'cards' | 'table'
  const [scheduleFilterService, setScheduleFilterService] = useState("all"); // 'all' | 'clinic' | 'video' | 'home'
  const [selectedSpecialities, setSelectedSpecialities] = useState([]);
  const [selectedQualifications, setSelectedQualifications] = useState([]);
  const [newSpeciality, setNewSpeciality] = useState("");

  const loadProfile = useCallback(async () => {
    try {
      setIsLoading(true);

      const storedUserId =
        typeof window !== "undefined"
          ? window.localStorage.getItem("userId")
          : null;
      const storedRole =
        typeof window !== "undefined"
          ? window.localStorage.getItem("userRole")
          : null;

      if (!storedUserId || storedRole !== "doctor") {
        setIsLoading(false);
        return;
      }

      const res = await api.post("/profile/get", { user_id: storedUserId });

      if (!res.success || !res.data) {
        console.error("Failed to fetch profile from API", res.error);
        setIsLoading(false);
        return;
      }

      const parsed = res.data;
      const details = parsed?.details || {};

      // Parse available_time fallback
      let parsedAvailableTime = details.available_time;
      if (typeof parsedAvailableTime === "string") {
        try { parsedAvailableTime = JSON.parse(parsedAvailableTime); } catch { parsedAvailableTime = null; }
      }
      const generalTimeFallback = (parsedAvailableTime && typeof parsedAvailableTime === "object" && parsedAvailableTime.start && parsedAvailableTime.end)
        ? parsedAvailableTime
        : null;

      const activeDaysList = Array.isArray(details.available_days)
        ? details.available_days
        : (typeof details.available_days === "string" ? details.available_days.split(",").map(d => d.trim()) : []);

      // Parse weekly availability slots (clinic, video, home) and leave days
      const parseSlots = (value, fallbackTime = null) => {
        let raw = value;
        if (typeof value === "string") {
          try {
            raw = JSON.parse(value);
          } catch {
            raw = {};
          }
        }
        if (!raw || typeof raw !== "object") raw = {};

        const normalized = {};
        daysOfWeek.forEach((day) => {
          const shortDay = day.slice(0, 3);
          const val = raw[day] ?? raw[shortDay] ?? raw[day.toLowerCase()] ?? raw[shortDay.toLowerCase()];

          if (val) {
            if (Array.isArray(val) && val.length > 0) {
              const validSlots = val.filter((s) => s && (s.start || s.end));
              if (validSlots.length > 0) {
                const first = validSlots[0] || {};
                const last = validSlots[validSlots.length - 1] || first;
                normalized[day] = {
                  start: first.start || "",
                  end: last.end || first.end || "",
                };
              } else {
                normalized[day] = { start: "", end: "" };
              }
            } else if (typeof val === "object") {
              const start = val.start || val["0"]?.start || "";
              const end = val.end || val["0"]?.end || "";
              normalized[day] = { start, end };
            } else {
              normalized[day] = { start: "", end: "" };
            }
          } else if (
            fallbackTime &&
            (activeDaysList.includes(day) || activeDaysList.includes(shortDay) || activeDaysList.includes(day.toLowerCase()))
          ) {
            normalized[day] = {
              start: fallbackTime.start || "",
              end: fallbackTime.end || "",
            };
          } else {
            normalized[day] = { start: "", end: "" };
          }
        });

        return normalized;
      };

      const parseLeaveDays = (value) => {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value === "string") {
          const trimmed = value.trim();
          if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            try {
              const parsed = JSON.parse(trimmed);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          }
          return trimmed
            .split(",")
            .map((d) => d.trim())
            .filter(Boolean);
        }
        return [];
      };

      const clinicSlots = parseSlots(details.clinic_slots, generalTimeFallback);
      const videoSlots = parseSlots(details.video_slots);
      const homeSlots = parseSlots(details.home_slots);
      const leaveDays = parseLeaveDays(details.leave_days);

      setWeeklyAvailability({
        leave_days: leaveDays,
        clinic_slots: clinicSlots,
        video_slots: videoSlots,
        home_slots: homeSlots,
      });

      // Derive aggregated availability label from weekly slots
      const computeAvailabilityFromSlots = () => {
        const activeDays = [];
        let earliest = null;
        let latest = null;

        daysOfWeek.forEach((day) => {
          if (leaveDays.includes(day)) return;

          const slotsForDay = [
            clinicSlots?.[day],
            videoSlots?.[day],
            homeSlots?.[day],
          ].filter(Boolean);

          if (slotsForDay.length === 0) return;

          activeDays.push(day);

          slotsForDay.forEach((slot) => {
            if (slot.start) {
              if (!earliest || slot.start < earliest) earliest = slot.start;
            }
            if (slot.end) {
              if (!latest || slot.end > latest) latest = slot.end;
            }
          });
        });

        return {
          availableDays: activeDays,
          availableTime:
            earliest && latest
              ? { start: earliest, end: latest }
              : undefined,
        };
      };

      const { availableDays, availableTime } = computeAvailabilityFromSlots();

      const availabilityLabel =
        availableDays.length && availableTime
          ? `${availableDays.join(", ")} • ${availableTime.start} - ${availableTime.end}`
          : "";

      // Normalize specialization and qualification (may be arrays or JSON)
      const normalizeField = (value) => {
        if (Array.isArray(value)) {
          return value.join(", ");
        }
        if (typeof value === "string") {
          const trimmed = value.trim();
          if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            try {
              const parsedArr = JSON.parse(trimmed);
              if (Array.isArray(parsedArr)) return parsedArr.join(", ");
            } catch {
              // fall through to raw string
            }
          }
          return trimmed;
        }
        return "";
      };

      const normalizedSpecialization = normalizeField(details.specialization);
      const normalizedQualification = normalizeField(details.qualification);

      const parseToArray = (value) => {
        if (Array.isArray(value)) return value;
        if (typeof value === "string") {
          const trimmed = value.trim();
          if (!trimmed) return [];
          if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            try {
              const parsedArr = JSON.parse(trimmed);
              return Array.isArray(parsedArr) ? parsedArr : [];
            } catch {
              return [];
            }
          }
          return trimmed
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);
        }
        return [];
      };

      const specializationArray = parseToArray(details.specialization);
      const qualificationArray = parseToArray(details.qualification);

      // Update localStorage so other pages see the latest profile
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("userData", JSON.stringify(parsed));
        }
      } catch (storageError) {
        console.error("Failed to store updated userData in localStorage", storageError);
      }

      setProfile({
        name: details.full_name || parsed.full_name || "",
        email: details.email || parsed.email || "",
        phone: parsed.phone_number || "",
        specialization: normalizedSpecialization,
        experience:
          details.experience_years !== null && details.experience_years !== undefined && !Number.isNaN(Number(details.experience_years))
            ? `${details.experience_years} years`
            : "",
        qualification: normalizedQualification,
        hospital: details.clinic_name || "",
        address: details.clinic_address || "",
        videoConsultationFee:
          details.video_consultation_fee !== null && details.video_consultation_fee !== undefined && !Number.isNaN(Number(details.video_consultation_fee))
            ? `₹${Number(details.video_consultation_fee)}`
            : "",
        videoFollowUpFee:
          details.video_follow_up_fee !== null && details.video_follow_up_fee !== undefined && !Number.isNaN(Number(details.video_follow_up_fee))
            ? `₹${Number(details.video_follow_up_fee)}`
            : (details.meta?.video_follow_up_fee !== undefined && !Number.isNaN(Number(details.meta.video_follow_up_fee))
                ? `₹${Number(details.meta.video_follow_up_fee)}`
                : (details.follow_up_fee !== null && details.follow_up_fee !== undefined && !Number.isNaN(Number(details.follow_up_fee))
                    ? `₹${Number(details.follow_up_fee)}`
                    : "")),
        clinicConsultationFee:
          details.clinic_consultation_fee !== null && details.clinic_consultation_fee !== undefined && !Number.isNaN(Number(details.clinic_consultation_fee))
            ? `₹${Number(details.clinic_consultation_fee)}`
            : "",
        clinicFollowUpFee:
          details.clinic_follow_up_fee !== null && details.clinic_follow_up_fee !== undefined && !Number.isNaN(Number(details.clinic_follow_up_fee))
            ? `₹${Number(details.clinic_follow_up_fee)}`
            : (details.meta?.clinic_follow_up_fee !== undefined && !Number.isNaN(Number(details.meta.clinic_follow_up_fee))
                ? `₹${Number(details.meta.clinic_follow_up_fee)}`
                : (details.follow_up_fee !== null && details.follow_up_fee !== undefined && !Number.isNaN(Number(details.follow_up_fee))
                    ? `₹${Number(details.follow_up_fee)}`
                    : "")),
        homeVisitFee:
          details.home_visit_fee !== null && details.home_visit_fee !== undefined && !Number.isNaN(Number(details.home_visit_fee))
            ? `₹${Number(details.home_visit_fee)}`
            : "",
        homeFollowUpFee:
          details.home_follow_up_fee !== null && details.home_follow_up_fee !== undefined && !Number.isNaN(Number(details.home_follow_up_fee))
            ? `₹${Number(details.home_follow_up_fee)}`
            : (details.meta?.home_follow_up_fee !== undefined && !Number.isNaN(Number(details.meta.home_follow_up_fee))
                ? `₹${Number(details.meta.home_follow_up_fee)}`
                : (details.follow_up_fee !== null && details.follow_up_fee !== undefined && !Number.isNaN(Number(details.follow_up_fee))
                    ? `₹${Number(details.follow_up_fee)}`
                    : "")),
        followUpFee:
          details.follow_up_fee !== null && details.follow_up_fee !== undefined && !Number.isNaN(Number(details.follow_up_fee))
            ? `₹${Number(details.follow_up_fee)}`
            : (details.meta?.follow_up_fee !== undefined && !Number.isNaN(Number(details.meta.follow_up_fee))
                ? `₹${Number(details.meta.follow_up_fee)}`
                : ""),
        about:
          details.about_me || "",
        licenseNumber: details.license_number || "",
        languages: details.languages || "",
        rating:
          typeof details.rating === "number" && !Number.isNaN(details.rating)
            ? details.rating.toFixed(1)
            : "",
        patientsTreated:
          typeof details.total_reviews === "number" && !Number.isNaN(details.total_reviews)
            ? String(details.total_reviews)
            : "",
        availability: availabilityLabel,
        secondBookingDiscountType: details.second_booking_discount_type || details.meta?.second_booking_discount_type || "none",
        secondBookingDiscountValue: Number(details.second_booking_discount_value ?? details.meta?.second_booking_discount_value ?? 0),
        additionalClinics: (() => {
          if (Array.isArray(details.additional_clinics) && details.additional_clinics.length > 0) return details.additional_clinics;
          if (Array.isArray(details.meta?.additional_clinics) && details.meta.additional_clinics.length > 0) return details.meta.additional_clinics;
          if (typeof details.additional_clinics === "string") {
            try { return JSON.parse(details.additional_clinics); } catch {}
          }
          if (typeof details.meta?.additional_clinics === "string") {
            try { return JSON.parse(details.meta.additional_clinics); } catch {}
          }
          return [];
        })(),
      });

      setProfilePicture(parsed.profile_picture || "");

      setSelectedSpecialities(specializationArray);
      setSelectedQualifications(qualificationArray);

      // Derive simple stats from doctor details if available
      setStats({
        totalAppointments:
          typeof details.total_appointments === "number" && !Number.isNaN(details.total_appointments)
            ? details.total_appointments
            : 0,
        completed:
          typeof details.completed_appointments === "number" && !Number.isNaN(details.completed_appointments)
            ? details.completed_appointments
            : 0,
        patientSatisfaction:
          typeof details.satisfaction_score === "number" && !Number.isNaN(details.satisfaction_score)
            ? details.satisfaction_score
            : 0,
        averageRating:
          typeof details.rating === "number" && !Number.isNaN(details.rating)
            ? details.rating
            : 0,
      });
    } catch (err) {
      console.error("Failed to load doctor profile from API", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProfilePictureChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setNewProfileFile(file);

    // Preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePicture(reader.result || "");
    };
    reader.readAsDataURL(file);

    try {
      let userId =
        typeof window !== "undefined"
          ? window.localStorage.getItem("userId")
          : null;

      if (!userId && typeof window !== "undefined") {
        try {
          const stored = window.localStorage.getItem("userData");
          if (stored) {
            const parsed = JSON.parse(stored);
            userId = parsed?.id || parsed?.user_id || parsed?.doctor_id;
          }
          if (!userId) {
            const docStored = window.localStorage.getItem("doctorUser");
            if (docStored) {
              const parsedDoc = JSON.parse(docStored);
              userId = parsedDoc?.id || parsedDoc?.user_id;
            }
          }
        } catch {}
      }

      if (!userId) {
        toast.error("Session not found. Please log in again.", { id: "avatar-toast" });
        console.error("No userId found in localStorage for profile picture update");
        return;
      }

      toast.loading("Uploading profile picture...", { id: "avatar-toast" });

      const formData = new FormData();
      formData.append("user_id", userId);
      formData.append("profile_picture", file);

      const response = await fetch("/api/profile/doctor/update-picture", {
        method: "PUT",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        toast.error(data?.message || "Failed to upload profile picture.", { id: "avatar-toast" });
        console.error("Failed to update profile picture", data);
        return;
      }

      if (data.data?.profile_picture) {
        setProfilePicture(data.data.profile_picture);
        toast.success("Profile picture updated successfully!", { id: "avatar-toast" });
        if (typeof window !== "undefined") {
          const stored = window.localStorage.getItem("userData");
          if (stored) {
            try {
              const parsedUser = JSON.parse(stored);
              const updatedUser = {
                ...parsedUser,
                profile_picture: data.data.profile_picture,
              };
              window.localStorage.setItem("userData", JSON.stringify(updatedUser));
            } catch (e) {
              console.error("Failed to update userData with new profile picture", e);
            }
          }
        }
      }
    } catch (error) {
      toast.error("Error updating profile picture.", { id: "avatar-toast" });
      console.error("Error updating profile picture", error);
    } finally {
      setNewProfileFile(null);
    }
  };

  const handleWeeklyLeaveToggle = (day) => {
    setWeeklyAvailability((prev) => ({
      ...prev,
      leave_days: prev.leave_days.includes(day)
        ? prev.leave_days.filter((d) => d !== day)
        : [...prev.leave_days, day],
    }));
  };

  const handleWeeklySlotChange = (type, day, field, value) => {
    setWeeklyAvailability((prev) => {
      const currentDay = prev[type]?.[day] || { start: "", end: "" };
      return {
        ...prev,
        [type]: {
          ...(prev[type] || {}),
          [day]: {
            start: field === "start" ? value : (currentDay.start || ""),
            end: field === "end" ? value : (currentDay.end || ""),
          },
        },
      };
    });
  };

  const handleCopyDayToAll = (sourceDay) => {
    if (!isEditing) setIsEditing(true);

    const sClinic = weeklyAvailability.clinic_slots?.[sourceDay] || { start: "", end: "" };
    const sVideo = weeklyAvailability.video_slots?.[sourceDay] || { start: "", end: "" };
    const sHome = weeklyAvailability.home_slots?.[sourceDay] || { start: "", end: "" };

    const hasAnyTime = sClinic.start || sClinic.end || sVideo.start || sVideo.end || sHome.start || sHome.end;

    if (!hasAnyTime) {
      toast.error(`Please set hours for ${sourceDay} first.`);
      return;
    }

    setWeeklyAvailability((prev) => {
      const c = { ...(prev.clinic_slots || {}) };
      const v = { ...(prev.video_slots || {}) };
      const h = { ...(prev.home_slots || {}) };
      let updatedLeave = [...(prev.leave_days || [])];

      daysOfWeek.forEach((day) => {
        if (day !== sourceDay) {
          c[day] = { ...sClinic };
          v[day] = { ...sVideo };
          h[day] = { ...sHome };
          // Keep Sunday as leave if it was leave, otherwise activate
          if (day !== "Sunday") {
            updatedLeave = updatedLeave.filter((d) => d !== day);
          }
        }
      });

      return {
        ...prev,
        clinic_slots: c,
        video_slots: v,
        home_slots: h,
        leave_days: updatedLeave,
      };
    });

    toast.success(`${sourceDay} hours copied to all days!`);
  };

  const handleClearDay = (targetDay) => {
    if (!isEditing) setIsEditing(true);
    setWeeklyAvailability((prev) => {
      const c = { ...(prev.clinic_slots || {}) };
      const v = { ...(prev.video_slots || {}) };
      const h = { ...(prev.home_slots || {}) };
      c[targetDay] = { start: "", end: "" };
      v[targetDay] = { start: "", end: "" };
      h[targetDay] = { start: "", end: "" };
      return {
        ...prev,
        clinic_slots: c,
        video_slots: v,
        home_slots: h,
      };
    });
    toast.success(`Cleared ${targetDay} timings.`);
  };

  const handleApplyPreset = (type) => {
    if (!isEditing) setIsEditing(true);

    if (type === "mon_fri") {
      setQuickScope("weekdays");
      setQuickDays(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
      setWeeklyAvailability((prev) => {
        const c = { ...(prev.clinic_slots || {}) };
        const v = { ...(prev.video_slots || {}) };
        const h = { ...(prev.home_slots || {}) };
        const workDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        workDays.forEach((day) => {
          c[day] = { start: "09:00", end: "13:00" };
          v[day] = { start: "17:00", end: "20:00" };
          h[day] = { start: "", end: "" };
        });
        return {
          ...prev,
          clinic_slots: c,
          video_slots: v,
          home_slots: h,
          leave_days: ["Saturday", "Sunday"],
        };
      });
      toast.success("Mon - Fri standard schedule applied!");
    } else if (type === "mon_sat") {
      setQuickScope("mon_sat");
      setQuickDays(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);
      setWeeklyAvailability((prev) => {
        const c = { ...(prev.clinic_slots || {}) };
        const v = { ...(prev.video_slots || {}) };
        const h = { ...(prev.home_slots || {}) };
        const workDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        workDays.forEach((day) => {
          c[day] = { start: "09:00", end: "13:00" };
          v[day] = { start: "17:00", end: "20:00" };
          h[day] = { start: "", end: "" };
        });
        return {
          ...prev,
          clinic_slots: c,
          video_slots: v,
          home_slots: h,
          leave_days: ["Sunday"],
        };
      });
      toast.success("Mon - Sat regular schedule applied!");
    } else if (type === "sunday_off") {
      setWeeklyAvailability((prev) => {
        const hasSun = prev.leave_days.includes("Sunday");
        return {
          ...prev,
          leave_days: hasSun
            ? prev.leave_days.filter((d) => d !== "Sunday")
            : [...prev.leave_days, "Sunday"],
        };
      });
      toast.success("Sunday leave updated!");
    } else if (type === "clear_all") {
      setWeeklyAvailability({
        leave_days: ["Sunday"],
        clinic_slots: {},
        video_slots: {},
        home_slots: {},
      });
      toast.success("Schedule cleared.");
    }
  };

  const handleApplyBatchSchedule = () => {
    if (!isEditing) setIsEditing(true);

    if (quickDays.length === 0) {
      toast.error("Select at least 1 day to apply.");
      return;
    }

    const hasClinic = Boolean(quickClinic.start && quickClinic.end);
    const hasVideo = Boolean(quickVideo.start && quickVideo.end);
    const hasHome = Boolean(quickHome.start && quickHome.end);

    if (!hasClinic && !hasVideo && !hasHome) {
      toast.error("Please enter hours for at least one service.");
      return;
    }

    setWeeklyAvailability((prev) => {
      const c = { ...(prev.clinic_slots || {}) };
      const v = { ...(prev.video_slots || {}) };
      const h = { ...(prev.home_slots || {}) };
      let updatedLeave = [...(prev.leave_days || [])];

      quickDays.forEach((day) => {
        if (hasClinic) c[day] = { start: quickClinic.start, end: quickClinic.end };
        if (hasVideo) v[day] = { start: quickVideo.start, end: quickVideo.end };
        if (hasHome) h[day] = { start: quickHome.start, end: quickHome.end };
        // Reactivate day if it was marked as leave
        updatedLeave = updatedLeave.filter((d) => d !== day);
      });

      // If weekdays scope, mark Sunday as leave if not already
      if (quickScope === "weekdays" && !updatedLeave.includes("Sunday")) {
        updatedLeave.push("Sunday");
      }

      return {
        ...prev,
        clinic_slots: c,
        video_slots: v,
        home_slots: h,
        leave_days: updatedLeave,
      };
    });

    toast.success(`Hours applied to ${quickDays.length} day(s)!`);
  };

  const handleSpecialityAdd = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setSelectedSpecialities((prev) => {
      if (prev.includes(trimmed)) return prev;
      const updated = [...prev, trimmed];
      setProfile((p) => ({
        ...p,
        specialization: updated.join(", "),
      }));
      return updated;
    });
  };

  const handleSpecialityToggle = (name) => {
    setSelectedSpecialities((prev) => {
      const exists = prev.includes(name);
      const updated = exists ? prev.filter((s) => s !== name) : [...prev, name];
      setProfile((p) => ({
        ...p,
        specialization: updated.join(", "),
      }));
      return updated;
    });
  };

  const handleQualificationAdd = (value) => {
    if (!value) return;
    setSelectedQualifications((prev) => {
      if (prev.includes(value)) return prev;
      const updated = [...prev, value];
      setProfile((p) => ({
        ...p,
        qualification: updated.join(", "),
      }));
      return updated;
    });
  };

  const handleQualificationRemove = (value) => {
    setSelectedQualifications((prev) => {
      const updated = prev.filter((q) => q !== value);
      setProfile((p) => ({
        ...p,
        qualification: updated.join(", "),
      }));
      return updated;
    });
  };

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      let userId =
        typeof window !== "undefined"
          ? window.localStorage.getItem("userId")
          : null;

      if (!userId && typeof window !== "undefined") {
        try {
          const stored = window.localStorage.getItem("userData");
          if (stored) {
            const parsed = JSON.parse(stored);
            userId = parsed?.id || parsed?.user_id || parsed?.doctor_id;
          }
        } catch {}
      }

      if (!userId) {
        toast.error("Session not found. Please log in again.");
        setIsLoading(false);
        return;
      }

      const experienceYears = profile.experience
        ? parseInt(String(profile.experience).replace(/[^0-9]/g, ""), 10)
        : null;

      const feeNumeric = profile.consultationFee
        ? Number(String(profile.consultationFee).replace(/[^0-9.]/g, ""))
        : null;

      // Derive aggregated availability from weekly slots before saving
      const computeAvailabilityFromSlots = () => {
        const activeDays = [];
        let earliest = null;
        let latest = null;

        // Map full day names to short codes for storage
        const dayShortMap = {
          Monday: "Mon",
          Tuesday: "Tue",
          Wednesday: "Wed",
          Thursday: "Thu",
          Friday: "Fri",
          Saturday: "Sat",
          Sunday: "Sun",
        };

        daysOfWeek.forEach((day) => {
          if (weeklyAvailability.leave_days.includes(day)) return;

          let slotsForDay = [];
          const cSlot = weeklyAvailability.clinic_slots?.[day];
          const vSlot = weeklyAvailability.video_slots?.[day];
          const hSlot = weeklyAvailability.home_slots?.[day];
          
          [cSlot, vSlot, hSlot].forEach(slotData => {
            if (slotData) {
              if (Array.isArray(slotData)) slotsForDay.push(...slotData);
              else slotsForDay.push(slotData);
            }
          });

          // Filter out slots that have no start or end time
          slotsForDay = slotsForDay.filter((slot) => slot.start || slot.end);

          if (slotsForDay.length === 0) return;

          const shortDay = dayShortMap[day] || day;
          activeDays.push(shortDay);

          slotsForDay.forEach((slot) => {
            if (slot.start) {
              if (!earliest || slot.start < earliest) earliest = slot.start;
            }
            if (slot.end) {
              if (!latest || slot.end > latest) latest = slot.end;
            }
          });
        });

        return {
          availableDays: activeDays,
          availableTime:
            earliest && latest
              ? { start: earliest, end: latest }
              : null,
        };
      };

      const { availableDays, availableTime } = computeAvailabilityFromSlots();

      const parseFee = (feeVal) => {
        if (feeVal === undefined || feeVal === null || feeVal === "") return 0;
        const num = Number(String(feeVal).replace(/[^0-9.-]+/g, ""));
        return isNaN(num) ? 0 : num;
      };

      const payload = {
        user_id: userId,
        full_name: profile.name,
        email: profile.email,
        phone_number: profile.phone,
        specialization: selectedSpecialities,
        qualification: selectedQualifications,
        experience_years: experienceYears,
        video_consultation_fee: parseFee(profile.videoConsultationFee),
        video_follow_up_fee: parseFee(profile.videoFollowUpFee),
        clinic_consultation_fee: parseFee(profile.clinicConsultationFee),
        clinic_follow_up_fee: parseFee(profile.clinicFollowUpFee),
        home_visit_fee: parseFee(profile.homeVisitFee),
        home_follow_up_fee: parseFee(profile.homeFollowUpFee),
        follow_up_fee: parseFee(profile.followUpFee || profile.videoFollowUpFee || profile.clinicFollowUpFee),
        clinic_name: profile.hospital,
        clinic_address: profile.address,
        license_number: profile.licenseNumber,
        about_me: profile.about,
        languages: profile.languages,
        // Store short day codes like ["Mon", "Tue", ...] if available
        available_days: availableDays.length > 0 ? availableDays : undefined,
        available_time: availableTime || undefined,
        clinic_slots: weeklyAvailability.clinic_slots,
        video_slots: weeklyAvailability.video_slots,
        home_slots: weeklyAvailability.home_slots,
        leave_days: weeklyAvailability.leave_days,
        second_booking_discount_type: profile.secondBookingDiscountType,
        second_booking_discount_value: profile.secondBookingDiscountValue,
        additional_clinics: profile.additionalClinics,
      };

      const res = await api.put("/profile/doctor/basic-update", payload);

      if (!res.success) {
        console.error("Failed to update doctor profile", res.error);
        toast.error(res.message || res.error || "Failed to update profile. Please try again.");
        return;
      }

      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("userData", JSON.stringify(res.data));
        }
      } catch (storageError) {
        console.error("Failed to store updated userData after save", storageError);
      }

      await loadProfile();
      setIsEditing(false);
      toast.success("Profile updated successfully.");
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setIsLoading(false);
    }
  }, [profile, loadProfile, selectedSpecialities, selectedQualifications, weeklyAvailability]);

  if (isLoading && !profile.name) {
    return (
      <div className="min-h-screen bg-[#F6F8FA] p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-[#0067A1]/20 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <FaUserMd className="w-10 h-10 text-[#0067A1]" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-slate-700">Loading Profile</h3>
              <p className="text-sm text-slate-500">Fetching your professional information...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 py-2 sm:py-5 px-1 sm:px-4 md:px-6 pb-16 sm:pb-8">
      <div className="max-w-7xl mx-auto space-y-3 sm:space-y-5">
        {/* Top Action Header Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Doctor Profile & Settings</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Manage your medical credentials, practice fees, opening hours & contact details</p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0067A1] text-white text-xs sm:text-sm font-semibold rounded-md hover:bg-[#004F7C] transition-colors shadow-2xs"
              >
                <FaEdit className="w-3 h-3" />
                Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 bg-white text-slate-700 text-xs sm:text-sm font-semibold rounded-md border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0067A1] text-white text-xs sm:text-sm font-semibold rounded-md hover:bg-[#004F7C] transition-colors disabled:opacity-50 shadow-2xs"
                >
                  {isLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <FaSave className="w-3 h-3" />
                      Save
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-5">
          {/* Left Main Form Column */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-5">
            {/* Personal Information */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5 space-y-3 sm:space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Personal Information</h2>
                <p className="text-xs text-slate-500">Contact details and identity information</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Full Name"
                  value={profile.name}
                  isEditing={isEditing}
                  name="name"
                  onChange={handleInputChange}
                />
                
                <Field
                  label="Email Address"
                  value={profile.email}
                  isEditing={false}
                  name="email"
                  onChange={handleInputChange}
                />
                
                <Field
                  label="Phone Number"
                  value={profile.phone}
                  isEditing={isEditing}
                  name="phone"
                  type="tel"
                  onChange={handleInputChange}
                />
                
                <Field
                  label="Medical License Number"
                  value={profile.licenseNumber}
                  isEditing={isEditing}
                  name="licenseNumber"
                  onChange={handleInputChange}
                />
                
                <Field
                  label="Languages Spoken"
                  value={profile.languages}
                  isEditing={isEditing}
                  name="languages"
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Speciality & Qualifications */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5 space-y-3 sm:space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Specialities & Qualifications</h2>
                <p className="text-xs text-slate-500">Medical degrees and clinical specializations</p>
              </div>

              <div className="space-y-4">
                {/* Specialities */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">Specialities</label>
                  <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-3">
                    <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                      {selectedSpecialities.length === 0 && (
                        <span className="text-xs text-slate-400 font-normal">No speciality selected</span>
                      )}
                      {selectedSpecialities.map((spec) => (
                        <span
                          key={spec}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#0067A1]/10 text-[#0067A1] text-xs font-medium border border-[#0067A1]/20"
                        >
                          {spec}
                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => handleSpecialityToggle(spec)}
                              className="ml-1 text-slate-400 hover:text-slate-700"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                    </div>

                    {isEditing && (
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newSpeciality}
                            onChange={(e) => setNewSpeciality(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSpecialityAdd(newSpeciality);
                                setNewSpeciality("");
                              }
                            }}
                            placeholder="Add custom speciality..."
                            className="flex-1 px-3 py-1.5 text-xs sm:text-sm rounded-md border border-slate-200 focus:outline-none focus:border-[#0067A1]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              handleSpecialityAdd(newSpeciality);
                              setNewSpeciality("");
                            }}
                            disabled={!newSpeciality.trim()}
                            className="px-3 py-1.5 text-xs font-medium rounded-md bg-[#0067A1] text-white hover:bg-[#004F7C] disabled:opacity-50"
                          >
                            Add
                          </button>
                        </div>

                        <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 rounded-md border border-slate-200">
                          {specialities.map((spec) => {
                            const active = selectedSpecialities.includes(spec.name);
                            return (
                              <label
                                key={spec.name}
                                className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-slate-50 text-xs"
                              >
                                <input
                                  type="checkbox"
                                  checked={active}
                                  onChange={() => handleSpecialityToggle(spec.name)}
                                  className="w-3.5 h-3.5 rounded border-slate-300 text-[#0067A1] focus:ring-[#0067A1]"
                                />
                                <span className="font-medium text-slate-800">{spec.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Qualifications */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">Medical Qualifications</label>
                  <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-2">
                    <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                      {selectedQualifications.length === 0 && (
                        <span className="text-xs text-slate-400 font-normal">No qualification listed</span>
                      )}
                      {selectedQualifications.map((qual) => (
                        <span
                          key={qual}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-medium border border-slate-200"
                        >
                          {qual}
                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => handleQualificationRemove(qual)}
                              className="ml-1 text-slate-400 hover:text-slate-700"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                    {isEditing && (
                      <select
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-xs text-slate-700 focus:outline-none focus:border-[#0067A1] bg-white"
                        defaultValue=""
                        onChange={(e) => {
                          handleQualificationAdd(e.target.value);
                          e.target.value = "";
                        }}
                      >
                        <option value="" disabled>+ Select qualification to add...</option>
                        {qualificationsOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Fees & Practice Details */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5 space-y-3 sm:space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Consultation Fees & Experience</h2>
                <p className="text-xs text-slate-500">Pricing and hospital affiliation</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Years of Experience"
                  value={profile.experience}
                  isEditing={isEditing}
                  name="experience"
                  onChange={handleInputChange}
                />
                <Field
                  label="Primary Hospital / Clinic Name"
                  value={profile.hospital}
                  isEditing={isEditing}
                  name="hospital"
                  onChange={handleInputChange}
                />
                
                <Field
                  label="Video Consultation Fee (₹)"
                  value={profile.videoConsultationFee}
                  isEditing={isEditing}
                  name="videoConsultationFee"
                  onChange={handleInputChange}
                />
                <Field
                  label="Video Follow-up Fee (₹)"
                  value={profile.videoFollowUpFee}
                  isEditing={isEditing}
                  name="videoFollowUpFee"
                  onChange={handleInputChange}
                />

                <Field
                  label="Clinic Visit Fee (₹)"
                  value={profile.clinicConsultationFee}
                  isEditing={isEditing}
                  name="clinicConsultationFee"
                  onChange={handleInputChange}
                />
                <Field
                  label="Clinic Follow-up Fee (₹)"
                  value={profile.clinicFollowUpFee}
                  isEditing={isEditing}
                  name="clinicFollowUpFee"
                  onChange={handleInputChange}
                />

                <Field
                  label="Home Visit Fee (₹)"
                  value={profile.homeVisitFee}
                  isEditing={isEditing}
                  name="homeVisitFee"
                  onChange={handleInputChange}
                />
                <Field
                  label="Home Visit Follow-up Fee (₹)"
                  value={profile.homeFollowUpFee}
                  isEditing={isEditing}
                  name="homeFollowUpFee"
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Discounts & Additional Clinics */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Discounts & Practice Locations</h2>
                  <p className="text-xs text-slate-500">Follow-up discounts and secondary clinic addresses</p>
                </div>
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 shrink-0 whitespace-nowrap">
                  Optional
                </span>
              </div>

              {/* Discount Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Follow-up Discount Type
                  </label>
                  {isEditing ? (
                    <select
                      value={profile.secondBookingDiscountType}
                      name="secondBookingDiscountType"
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] transition-colors"
                    >
                      <option value="none">No Discount</option>
                      <option value="percentage">Percentage (%)</option>
                      <option value="flat">Flat Amount (₹)</option>
                    </select>
                  ) : (
                    <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-800 text-sm min-h-[38px] flex items-center">
                      {profile.secondBookingDiscountType === "percentage" ? (
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                          <FaPercentage className="w-3 h-3 text-emerald-600" /> Percentage Discount
                        </span>
                      ) : profile.secondBookingDiscountType === "flat" ? (
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                          <FaRupeeSign className="w-3 h-3 text-emerald-600" /> Flat Amount Discount
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">No discount configured</span>
                      )}
                    </div>
                  )}
                </div>

                {profile.secondBookingDiscountType !== "none" ? (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      {profile.secondBookingDiscountType === "percentage" ? "Discount Percentage (%)" : "Discount Amount (₹)"}
                    </label>
                    {isEditing ? (
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">
                          {profile.secondBookingDiscountType === "percentage" ? "%" : "₹"}
                        </span>
                        <input
                          type="number"
                          value={profile.secondBookingDiscountValue}
                          name="secondBookingDiscountValue"
                          onChange={handleInputChange}
                          className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] transition-colors"
                          placeholder={profile.secondBookingDiscountType === "percentage" ? "e.g. 20" : "e.g. 200"}
                          min="0"
                          max={profile.secondBookingDiscountType === "percentage" ? "100" : undefined}
                        />
                      </div>
                    ) : (
                      <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-800 text-sm font-semibold min-h-[38px] flex items-center">
                        {profile.secondBookingDiscountType === "percentage"
                          ? `${profile.secondBookingDiscountValue}% Off on 2nd Booking`
                          : `₹${profile.secondBookingDiscountValue} Flat Off on 2nd Booking`}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="hidden sm:block"></div>
                )}
              </div>

              {/* Additional Clinics Section */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Additional Clinic Locations
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Add other branches or consulting clinics where patients can visit you
                    </p>
                  </div>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        const list = [...(profile.additionalClinics || [])];
                        list.push({ name: "", address: "" });
                        setProfile(prev => ({ ...prev, additionalClinics: list }));
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0067A1] hover:bg-[#004F7C] text-white text-xs font-semibold rounded-md shadow-2xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <FaPlus className="w-2.5 h-2.5" />
                      Add
                    </button>
                  )}
                </div>

                {(profile.additionalClinics || []).length === 0 ? (
                  <div className="text-center py-6 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/60">
                    <FaClinicMedical className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                    <p className="text-xs font-medium text-slate-600">No additional clinic locations added yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {isEditing ? "Click \"Add Location\" above to add your other consulting addresses." : "Doctor has not configured secondary clinic locations."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(profile.additionalClinics || []).map((clinic, idx) => (
                      <div
                        key={idx}
                        className="p-4 border border-slate-200 rounded-xl bg-white shadow-2xs hover:border-slate-300 transition-all space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-sky-50 text-[#0067A1] flex items-center justify-center text-[10px] font-bold">
                              {idx + 1}
                            </span>
                            Additional Clinic #{idx + 1}
                          </span>
                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => {
                                const list = (profile.additionalClinics || []).filter((_, i) => i !== idx);
                                setProfile(prev => ({ ...prev, additionalClinics: list }));
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
                              title="Remove clinic location"
                            >
                              <FaTrashAlt className="w-3 h-3" />
                              Remove
                            </button>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="block text-[11px] font-semibold text-slate-600">
                                Clinic / Hospital Name
                              </label>
                              <input
                                type="text"
                                value={clinic.name || ""}
                                onChange={(e) => {
                                  const list = [...profile.additionalClinics];
                                  list[idx] = { ...list[idx], name: e.target.value };
                                  setProfile(prev => ({ ...prev, additionalClinics: list }));
                                }}
                                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] transition-colors"
                                placeholder="e.g. MediConnect Polyclinic"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[11px] font-semibold text-slate-600">
                                Clinic Address & Landmark
                              </label>
                              <input
                                type="text"
                                value={clinic.address || ""}
                                onChange={(e) => {
                                  const list = [...profile.additionalClinics];
                                  list[idx] = { ...list[idx], address: e.target.value };
                                  setProfile(prev => ({ ...prev, additionalClinics: list }));
                                }}
                                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] transition-colors"
                                placeholder="e.g. 2nd Floor, Sector 14, Gurugram"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1 text-xs">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <FaClinicMedical className="w-3.5 h-3.5 text-[#0067A1]" />
                              {clinic.name || "Clinic Name Not Specified"}
                            </div>
                            <div className="text-slate-500 pl-5">
                              {clinic.address || "No address specified"}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Weekly Timings */}
            <div className="bg-white rounded-xl border border-slate-200 p-2.5 sm:p-5 space-y-3 sm:space-y-4">
              {/* Header */}
              <div className="border-b border-slate-100 pb-2.5 sm:pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">Weekly Schedule & Hours</h2>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-blue-50 text-[#0067A1] border border-blue-200">
                      Weekly OPD
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Configure clinic, video consultation, and home visit availability</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-amber-600 font-medium hidden md:inline">Select at least 1 active day</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isEditing) setIsEditing(true);
                      setQuickSetupOpen((prev) => !prev);
                    }}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs ${
                      quickSetupOpen
                        ? "bg-[#0067A1] text-white ring-2 ring-[#0067A1]/20 shadow-blue-100"
                        : "bg-blue-50 text-[#0067A1] hover:bg-blue-100 border border-blue-200"
                    }`}
                  >
                    <FaBolt className="w-3 h-3 text-amber-500" />
                    Quick Setup
                    {quickSetupOpen ? <FaChevronUp className="w-2.5 h-2.5 ml-0.5" /> : <FaChevronDown className="w-2.5 h-2.5 ml-0.5" />}
                  </button>
                </div>
              </div>

              {/* Quick Setup Panel */}
              {quickSetupOpen && (
                <div className="p-2.5 sm:p-4 rounded-xl bg-gradient-to-br from-blue-50/70 via-slate-50 to-indigo-50/50 border border-blue-200/80 space-y-3 animate-in fade-in duration-200">
                  {/* Presets Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-blue-100">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <FaBolt className="text-amber-500 w-3.5 h-3.5" />
                        Quick Batch Availability
                      </h3>
                      <p className="text-[11px] text-slate-500">Apply hours across selected days in one click</p>
                    </div>

                    {/* Presets */}
                    <div className="flex items-center flex-wrap gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-500 mr-1">Presets:</span>
                      <button
                        type="button"
                        onClick={() => handleApplyPreset("mon_fri")}
                        className="px-2.5 py-1 text-xs font-semibold rounded-md bg-white border border-slate-200 text-slate-700 hover:border-[#0067A1] hover:text-[#0067A1] shadow-2xs transition-colors"
                      >
                        Mon - Fri
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPreset("mon_sat")}
                        className="px-2.5 py-1 text-xs font-semibold rounded-md bg-white border border-slate-200 text-slate-700 hover:border-[#0067A1] hover:text-[#0067A1] shadow-2xs transition-colors"
                      >
                        Mon - Sat
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPreset("sunday_off")}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md border shadow-2xs transition-colors ${
                          weeklyAvailability.leave_days.includes("Sunday")
                            ? "bg-amber-50 border-amber-300 text-amber-700"
                            : "bg-white border-slate-200 text-slate-700 hover:border-amber-400"
                        }`}
                      >
                        {weeklyAvailability.leave_days.includes("Sunday") ? "Sunday: Off ✓" : "Sunday Off"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPreset("clear_all")}
                        className="px-2.5 py-1 text-xs font-semibold rounded-md bg-white border border-red-200 text-red-600 hover:bg-red-50 shadow-2xs transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Batch Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {/* Clinic Visit */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <FaClinicMedical className="w-3.5 h-3.5 text-[#0067A1]" />
                          Clinic Visit
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuickClinic({ start: "", end: "" })}
                          className="text-[10px] text-slate-400 hover:text-red-500 font-medium"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 block mb-1">Start</span>
                          <input
                            type="time"
                            value={quickClinic.start}
                            onChange={(e) => setQuickClinic((p) => ({ ...p, start: e.target.value }))}
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold bg-slate-50 focus:bg-white focus:border-[#0067A1] focus:ring-1 focus:ring-[#0067A1]"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 block mb-1">End</span>
                          <input
                            type="time"
                            value={quickClinic.end}
                            onChange={(e) => setQuickClinic((p) => ({ ...p, end: e.target.value }))}
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold bg-slate-50 focus:bg-white focus:border-[#0067A1] focus:ring-1 focus:ring-[#0067A1]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Video Consultation */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <FaVideo className="w-3.5 h-3.5 text-purple-600" />
                          Video Consultation
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuickVideo({ start: "", end: "" })}
                          className="text-[10px] text-slate-400 hover:text-red-500 font-medium"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 block mb-1">Start</span>
                          <input
                            type="time"
                            value={quickVideo.start}
                            onChange={(e) => setQuickVideo((p) => ({ ...p, start: e.target.value }))}
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold bg-slate-50 focus:bg-white focus:border-[#0067A1] focus:ring-1 focus:ring-[#0067A1]"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 block mb-1">End</span>
                          <input
                            type="time"
                            value={quickVideo.end}
                            onChange={(e) => setQuickVideo((p) => ({ ...p, end: e.target.value }))}
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold bg-slate-50 focus:bg-white focus:border-[#0067A1] focus:ring-1 focus:ring-[#0067A1]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Home Visit */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 shadow-2xs sm:col-span-2 md:col-span-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <FaMapMarkerAlt className="w-3.5 h-3.5 text-emerald-600" />
                          Home Visit (Optional)
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuickHome({ start: "", end: "" })}
                          className="text-[10px] text-slate-400 hover:text-red-500 font-medium"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 block mb-1">Start</span>
                          <input
                            type="time"
                            value={quickHome.start}
                            onChange={(e) => setQuickHome((p) => ({ ...p, start: e.target.value }))}
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold bg-slate-50 focus:bg-white focus:border-[#0067A1] focus:ring-1 focus:ring-[#0067A1]"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 block mb-1">End</span>
                          <input
                            type="time"
                            value={quickHome.end}
                            onChange={(e) => setQuickHome((p) => ({ ...p, end: e.target.value }))}
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold bg-slate-50 focus:bg-white focus:border-[#0067A1] focus:ring-1 focus:ring-[#0067A1]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Apply Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div className="flex items-center flex-wrap gap-1.5">
                      <span className="text-xs font-semibold text-slate-700 mr-1">Apply To:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickScope("weekdays");
                          setQuickDays(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
                        }}
                        className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-colors ${
                          quickScope === "weekdays"
                            ? "bg-[#0067A1] text-white shadow-2xs"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        Mon - Fri
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickScope("mon_sat");
                          setQuickDays(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);
                        }}
                        className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-colors ${
                          quickScope === "mon_sat"
                            ? "bg-[#0067A1] text-white shadow-2xs"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        Mon - Sat
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickScope("all");
                          setQuickDays([...daysOfWeek]);
                        }}
                        className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-colors ${
                          quickScope === "all"
                            ? "bg-[#0067A1] text-white shadow-2xs"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        All Days
                      </button>

                      {/* Day Toggles */}
                      <div className="flex items-center gap-1 sm:ml-2">
                        {daysOfWeek.map((d) => {
                          const isSel = quickDays.includes(d);
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => {
                                setQuickScope("custom");
                                setQuickDays((prev) =>
                                  prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
                                );
                              }}
                              className={`w-6 h-6 rounded text-[10px] font-bold transition-all ${
                                isSel
                                  ? "bg-[#0067A1] text-white shadow-2xs"
                                  : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-100"
                              }`}
                              title={d}
                            >
                              {d.slice(0, 1)}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyBatchSchedule}
                      className="px-3.5 py-1.5 rounded-md bg-[#0067A1] hover:bg-[#005282] text-white text-xs font-semibold shadow-2xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <FaCheck className="w-3 h-3" />
                      Apply
                    </button>
                  </div>
                </div>
              )}

              {/* View Mode & Filter Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                {/* Service Filter Tabs */}
                <div className="flex items-center flex-wrap gap-1 bg-slate-100/90 p-0.5 sm:p-1 rounded-lg border border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setScheduleFilterService("all")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                      scheduleFilterService === "all"
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleFilterService("clinic")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                      scheduleFilterService === "clinic"
                        ? "bg-[#0067A1] text-white shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <FaClinicMedical className="w-3 h-3" />
                    Clinic
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleFilterService("video")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                      scheduleFilterService === "video"
                        ? "bg-purple-600 text-white shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <FaVideo className="w-3 h-3" />
                    Video
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleFilterService("home")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                      scheduleFilterService === "home"
                        ? "bg-emerald-600 text-white shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <FaMapMarkerAlt className="w-3 h-3" />
                    Home
                  </button>
                </div>

                {/* View Switcher: Cards vs Table */}
                <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-lg border border-slate-200/60 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setScheduleViewMode("cards")}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      scheduleViewMode === "cards"
                        ? "bg-white text-[#0067A1] shadow-2xs font-bold"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleViewMode("table")}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      scheduleViewMode === "table"
                        ? "bg-white text-[#0067A1] shadow-2xs font-bold"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Table
                  </button>
                </div>
              </div>

              {/* View 1: 100% Responsive Cards View (Default) */}
              {scheduleViewMode === "cards" ? (
                <div className="space-y-3">
                  {daysOfWeek.map((day) => {
                    const isLeave = weeklyAvailability.leave_days.includes(day);
                    const clinicSlot = weeklyAvailability.clinic_slots?.[day] || { start: "", end: "" };
                    const videoSlot = weeklyAvailability.video_slots?.[day] || { start: "", end: "" };
                    const homeSlot = weeklyAvailability.home_slots?.[day] || { start: "", end: "" };

                    return (
                      <div
                        key={day}
                        className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                          isLeave
                            ? "bg-slate-50/70 border-slate-200"
                            : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                        }`}
                      >
                        {/* Day Card Header */}
                        <div className="px-3.5 py-2.5 bg-slate-50/90 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className={`text-xs sm:text-sm font-bold ${isLeave ? "text-slate-400 line-through" : "text-slate-800"}`}>
                              {day}
                            </span>

                            {isEditing ? (
                              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={isLeave}
                                  onChange={() => handleWeeklyLeaveToggle(day)}
                                  className="w-3.5 h-3.5 rounded border-slate-300 text-[#0067A1] focus:ring-[#0067A1] cursor-pointer"
                                />
                                <span className={`text-[11px] font-medium ${isLeave ? "text-amber-700 font-semibold" : "text-slate-500"}`}>
                                  {isLeave ? "Off (Leave)" : "Active"}
                                </span>
                              </label>
                            ) : (
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                isLeave
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}>
                                {isLeave ? "Off" : "Active"}
                              </span>
                            )}
                          </div>

                          {isEditing && (
                            <div className="flex items-center gap-1.5">
                              {!isLeave && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyDayToAll(day)}
                                  title={`Copy ${day}'s hours to other active days`}
                                  className="px-2.5 py-1 rounded text-xs font-semibold bg-white hover:bg-[#0067A1] text-[#0067A1] hover:text-white border border-blue-200 hover:border-[#0067A1] transition-all shadow-2xs flex items-center gap-1"
                                >
                                  <FaCopy className="w-2.5 h-2.5" />
                                  Copy
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleClearDay(day)}
                                title={`Clear ${day} timings`}
                                className="px-2 py-1 rounded text-xs text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors"
                              >
                                Clear
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Day Card Body */}
                        <div className="p-3 sm:p-3.5">
                          {isLeave ? (
                            <div className="py-2 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                              <span>🏖️ Day marked as leave. No appointments scheduled.</span>
                              {isEditing && (
                                <button
                                  type="button"
                                  onClick={() => handleWeeklyLeaveToggle(day)}
                                  className="text-xs font-semibold text-[#0067A1] hover:underline"
                                >
                                  Activate
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {/* Clinic Visit */}
                              {(scheduleFilterService === "all" || scheduleFilterService === "clinic") && (
                                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                      <FaClinicMedical className="w-3.5 h-3.5 text-[#0067A1]" />
                                      Clinic Visit
                                    </span>
                                    {clinicSlot.start && clinicSlot.end ? (
                                      <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.2 rounded-md">
                                        Set
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400">Not set</span>
                                    )}
                                  </div>

                                  {isEditing ? (
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <span className="text-[10px] font-semibold text-slate-400 block mb-1">Start</span>
                                        <input
                                          type="time"
                                          value={clinicSlot.start || ""}
                                          onChange={(e) => handleWeeklySlotChange("clinic_slots", day, "start", e.target.value)}
                                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold bg-white text-slate-800 focus:border-[#0067A1] focus:ring-1 focus:ring-[#0067A1]"
                                        />
                                      </div>
                                      <div>
                                        <span className="text-[10px] font-semibold text-slate-400 block mb-1">End</span>
                                        <input
                                          type="time"
                                          value={clinicSlot.end || ""}
                                          onChange={(e) => handleWeeklySlotChange("clinic_slots", day, "end", e.target.value)}
                                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold bg-white text-slate-800 focus:border-[#0067A1] focus:ring-1 focus:ring-[#0067A1]"
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    clinicSlot.start && clinicSlot.end ? (
                                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200/90 rounded-lg px-2.5 py-1.5 shadow-2xs">
                                        <FaClock className="w-3.5 h-3.5 text-[#0067A1] shrink-0" />
                                        <span>{formatTime12(clinicSlot.start)}</span>
                                        <span className="text-slate-300 font-bold">—</span>
                                        <span>{formatTime12(clinicSlot.end)}</span>
                                      </div>
                                    ) : (
                                      <div className="text-xs text-slate-400 italic bg-white/70 border border-dashed border-slate-200 rounded-lg px-2.5 py-1.5">
                                        Not configured
                                      </div>
                                    )
                                  )}
                                </div>
                              )}

                              {/* Video Consultation */}
                              {(scheduleFilterService === "all" || scheduleFilterService === "video") && (
                                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                      <FaVideo className="w-3.5 h-3.5 text-purple-600" />
                                      Video Consultation
                                    </span>
                                    {videoSlot.start && videoSlot.end ? (
                                      <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded-md">
                                        Set
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400">Not set</span>
                                    )}
                                  </div>

                                  {isEditing ? (
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <span className="text-[10px] font-semibold text-slate-400 block mb-1">Start</span>
                                        <input
                                          type="time"
                                          value={videoSlot.start || ""}
                                          onChange={(e) => handleWeeklySlotChange("video_slots", day, "start", e.target.value)}
                                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold bg-white text-slate-800 focus:border-[#0067A1] focus:ring-1 focus:ring-[#0067A1]"
                                        />
                                      </div>
                                      <div>
                                        <span className="text-[10px] font-semibold text-slate-400 block mb-1">End</span>
                                        <input
                                          type="time"
                                          value={videoSlot.end || ""}
                                          onChange={(e) => handleWeeklySlotChange("video_slots", day, "end", e.target.value)}
                                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold bg-white text-slate-800 focus:border-[#0067A1] focus:ring-1 focus:ring-[#0067A1]"
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    videoSlot.start && videoSlot.end ? (
                                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200/90 rounded-lg px-2.5 py-1.5 shadow-2xs">
                                        <FaClock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                        <span>{formatTime12(videoSlot.start)}</span>
                                        <span className="text-slate-300 font-bold">—</span>
                                        <span>{formatTime12(videoSlot.end)}</span>
                                      </div>
                                    ) : (
                                      <div className="text-xs text-slate-400 italic bg-white/70 border border-dashed border-slate-200 rounded-lg px-2.5 py-1.5">
                                        Not configured
                                      </div>
                                    )
                                  )}
                                </div>
                              )}

                              {/* Home Visit */}
                              {(scheduleFilterService === "all" || scheduleFilterService === "home") && (
                                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 space-y-2 sm:col-span-2 md:col-span-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                      <FaMapMarkerAlt className="w-3.5 h-3.5 text-emerald-600" />
                                      Home Visit
                                    </span>
                                    {homeSlot.start && homeSlot.end ? (
                                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md">
                                        Set
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400">Optional</span>
                                    )}
                                  </div>

                                  {isEditing ? (
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <span className="text-[10px] font-semibold text-slate-400 block mb-1">Start</span>
                                        <input
                                          type="time"
                                          value={homeSlot.start || ""}
                                          onChange={(e) => handleWeeklySlotChange("home_slots", day, "start", e.target.value)}
                                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold bg-white text-slate-800 focus:border-[#0067A1] focus:ring-1 focus:ring-[#0067A1]"
                                        />
                                      </div>
                                      <div>
                                        <span className="text-[10px] font-semibold text-slate-400 block mb-1">End</span>
                                        <input
                                          type="time"
                                          value={homeSlot.end || ""}
                                          onChange={(e) => handleWeeklySlotChange("home_slots", day, "end", e.target.value)}
                                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold bg-white text-slate-800 focus:border-[#0067A1] focus:ring-1 focus:ring-[#0067A1]"
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    homeSlot.start && homeSlot.end ? (
                                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200/90 rounded-lg px-2.5 py-1.5 shadow-2xs">
                                        <FaClock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                        <span>{formatTime12(homeSlot.start)}</span>
                                        <span className="text-slate-300 font-bold">—</span>
                                        <span>{formatTime12(homeSlot.end)}</span>
                                      </div>
                                    ) : (
                                      <div className="text-xs text-slate-400 italic bg-white/70 border border-dashed border-slate-200 rounded-lg px-2.5 py-1.5">
                                        Not configured
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* View 2: Table View with STICKY Day Column so it NEVER cuts off */
                <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-2xs">
                  <table className="w-full text-xs text-left min-w-[640px]">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        {/* Sticky Day Column */}
                        <th className="p-2.5 sticky left-0 bg-slate-100 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-slate-200 min-w-[130px]">
                          Day / Status
                        </th>
                        {(scheduleFilterService === "all" || scheduleFilterService === "clinic") && (
                          <th className="p-2.5 min-w-[210px]">Clinic Visit</th>
                        )}
                        {(scheduleFilterService === "all" || scheduleFilterService === "video") && (
                          <th className="p-2.5 min-w-[210px]">Video Consultation</th>
                        )}
                        {(scheduleFilterService === "all" || scheduleFilterService === "home") && (
                          <th className="p-2.5 min-w-[210px]">Home Visit</th>
                        )}
                        {isEditing && <th className="p-2.5 text-right min-w-[110px]">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {daysOfWeek.map((day) => {
                        const isLeave = weeklyAvailability.leave_days.includes(day);
                        return (
                          <tr key={day} className={`hover:bg-slate-50/50 transition-colors ${isLeave ? "bg-slate-50/60" : ""}`}>
                            {/* Sticky Left Day Cell */}
                            <td className="p-2.5 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-slate-200">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`font-bold ${isLeave ? "text-slate-400 line-through" : "text-slate-800"}`}>
                                  {day}
                                </span>
                                {isEditing ? (
                                  <label className="flex items-center gap-1 cursor-pointer" title="Toggle Leave">
                                    <input
                                      type="checkbox"
                                      checked={isLeave}
                                      onChange={() => handleWeeklyLeaveToggle(day)}
                                      className="w-3.5 h-3.5 rounded border-slate-300 text-[#0067A1] focus:ring-[#0067A1]"
                                    />
                                    <span className="text-[10px] text-slate-500">Off</span>
                                  </label>
                                ) : (
                                  isLeave && (
                                    <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                      Off
                                    </span>
                                  )
                                )}
                              </div>
                            </td>

                            {/* Clinic */}
                            {(scheduleFilterService === "all" || scheduleFilterService === "clinic") && (
                              <td className="p-2.5">
                                {isEditing ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="time"
                                      value={weeklyAvailability.clinic_slots?.[day]?.start || ""}
                                      onChange={(e) => handleWeeklySlotChange("clinic_slots", day, "start", e.target.value)}
                                      disabled={isLeave}
                                      className={`w-[110px] border border-slate-200 rounded px-1.5 py-1 text-xs ${
                                        isLeave ? "bg-slate-100 text-slate-300" : "bg-white text-slate-800"
                                      } disabled:bg-slate-100 disabled:text-slate-400`}
                                    />
                                    <span className="text-slate-400">-</span>
                                    <input
                                      type="time"
                                      value={weeklyAvailability.clinic_slots?.[day]?.end || ""}
                                      onChange={(e) => handleWeeklySlotChange("clinic_slots", day, "end", e.target.value)}
                                      disabled={isLeave}
                                      className={`w-[110px] border border-slate-200 rounded px-1.5 py-1 text-xs ${
                                        isLeave ? "bg-slate-100 text-slate-300" : "bg-white text-slate-800"
                                      } disabled:bg-slate-100 disabled:text-slate-400`}
                                    />
                                  </div>
                                ) : (
                                  weeklyAvailability.clinic_slots?.[day]?.start && weeklyAvailability.clinic_slots?.[day]?.end ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                                      <FaClock className="w-3 h-3 text-[#0067A1]" />
                                      {formatTime12(weeklyAvailability.clinic_slots[day].start)} – {formatTime12(weeklyAvailability.clinic_slots[day].end)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-xs">—</span>
                                  )
                                )}
                              </td>
                            )}

                            {/* Video */}
                            {(scheduleFilterService === "all" || scheduleFilterService === "video") && (
                              <td className="p-2.5">
                                {isEditing ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="time"
                                      value={weeklyAvailability.video_slots?.[day]?.start || ""}
                                      onChange={(e) => handleWeeklySlotChange("video_slots", day, "start", e.target.value)}
                                      disabled={isLeave}
                                      className={`w-[110px] border border-slate-200 rounded px-1.5 py-1 text-xs ${
                                        isLeave ? "bg-slate-100 text-slate-300" : "bg-white text-slate-800"
                                      } disabled:bg-slate-100 disabled:text-slate-400`}
                                    />
                                    <span className="text-slate-400">-</span>
                                    <input
                                      type="time"
                                      value={weeklyAvailability.video_slots?.[day]?.end || ""}
                                      onChange={(e) => handleWeeklySlotChange("video_slots", day, "end", e.target.value)}
                                      disabled={isLeave}
                                      className={`w-[110px] border border-slate-200 rounded px-1.5 py-1 text-xs ${
                                        isLeave ? "bg-slate-100 text-slate-300" : "bg-white text-slate-800"
                                      } disabled:bg-slate-100 disabled:text-slate-400`}
                                    />
                                  </div>
                                ) : (
                                  weeklyAvailability.video_slots?.[day]?.start && weeklyAvailability.video_slots?.[day]?.end ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                                      <FaClock className="w-3 h-3 text-purple-600" />
                                      {formatTime12(weeklyAvailability.video_slots[day].start)} – {formatTime12(weeklyAvailability.video_slots[day].end)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-xs">—</span>
                                  )
                                )}
                              </td>
                            )}

                            {/* Home */}
                            {(scheduleFilterService === "all" || scheduleFilterService === "home") && (
                              <td className="p-2.5">
                                {isEditing ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="time"
                                      value={weeklyAvailability.home_slots?.[day]?.start || ""}
                                      onChange={(e) => handleWeeklySlotChange("home_slots", day, "start", e.target.value)}
                                      disabled={isLeave}
                                      className={`w-[110px] border border-slate-200 rounded px-1.5 py-1 text-xs ${
                                        isLeave ? "bg-slate-100 text-slate-300" : "bg-white text-slate-800"
                                      } disabled:bg-slate-100 disabled:text-slate-400`}
                                    />
                                    <span className="text-slate-400">-</span>
                                    <input
                                      type="time"
                                      value={weeklyAvailability.home_slots?.[day]?.end || ""}
                                      onChange={(e) => handleWeeklySlotChange("home_slots", day, "end", e.target.value)}
                                      disabled={isLeave}
                                      className={`w-[110px] border border-slate-200 rounded px-1.5 py-1 text-xs ${
                                        isLeave ? "bg-slate-100 text-slate-300" : "bg-white text-slate-800"
                                      } disabled:bg-slate-100 disabled:text-slate-400`}
                                    />
                                  </div>
                                ) : (
                                  weeklyAvailability.home_slots?.[day]?.start && weeklyAvailability.home_slots?.[day]?.end ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                                      <FaClock className="w-3 h-3 text-emerald-600" />
                                      {formatTime12(weeklyAvailability.home_slots[day].start)} – {formatTime12(weeklyAvailability.home_slots[day].end)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-xs">—</span>
                                  )
                                )}
                              </td>
                            )}

                            {/* Actions */}
                            {isEditing && (
                              <td className="p-2.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {!isLeave && (
                                    <button
                                      type="button"
                                      onClick={() => handleCopyDayToAll(day)}
                                      title={`Copy ${day}'s timings to all days`}
                                      className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-[#0067A1] hover:bg-[#0067A1] hover:text-white border border-blue-200 transition-colors flex items-center gap-1"
                                    >
                                      <FaCopy className="w-2.5 h-2.5" />
                                      Copy
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleClearDay(day)}
                                    title={`Clear ${day} hours`}
                                    className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                  >
                                    <FaTimes className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Address & Bio */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5 space-y-3 sm:space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Address & Professional Bio</h2>
                <p className="text-xs text-slate-500">Physical address and summary for patients</p>
              </div>

              <div className="space-y-4">
                <Field
                  label="Primary Clinic Address"
                  value={profile.address}
                  isEditing={isEditing}
                  name="address"
                  textarea={true}
                  rows={3}
                  onChange={handleInputChange}
                />

                <Field
                  label="About Me (Bio)"
                  value={profile.about}
                  isEditing={isEditing}
                  name="about"
                  textarea={true}
                  rows={4}
                  onChange={handleInputChange}
                />
              </div>

              {isEditing && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-md border border-slate-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#0067A1] hover:bg-[#004F7C] text-white text-xs sm:text-sm font-semibold rounded-md transition-colors disabled:opacity-50 shadow-2xs cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <FaSave className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Right Summary Column */}
          <div className="space-y-3 sm:space-y-5">
            {/* Profile Avatar Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5 text-center space-y-3 sm:space-y-4">
              <div className="relative w-28 h-28 mx-auto">
                <div className="w-28 h-28 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                  {profilePicture ? (
                    <img
                      src={profilePicture}
                      alt="Doctor Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FaUserMd className="w-12 h-12 text-[#0067A1]" />
                  )}
                </div>
                <label className="absolute bottom-0 right-1 w-7 h-7 bg-[#0067A1] text-white rounded-full flex items-center justify-center cursor-pointer border border-white hover:bg-[#004F7C]">
                  <FaEdit className="w-3 h-3" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfilePictureChange}
                  />
                </label>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">{profile.name || "Doctor Profile"}</h3>
                <p className="text-xs font-semibold text-[#0067A1] mt-0.5">{profile.specialization || "General Physician"}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs space-y-2 text-left">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Account Status</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium text-[11px]">
                    Active
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>License Status</span>
                  <span className="px-2 py-0.5 rounded bg-[#0067A1]/10 text-[#0067A1] font-medium text-[11px]">
                    Verified
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Quick Navigation</h3>
              
              <button
                type="button"
                onClick={() => router.push("/doctor/appointments")}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
              >
                <span>View Appointments</span>
                <FaCalendarAlt className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => router.push("/doctor/manage-slots")}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
              >
                <span>Manage Consultation Slots</span>
                <FaClock className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}