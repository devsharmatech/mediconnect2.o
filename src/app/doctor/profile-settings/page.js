"use client";

import { useState, useEffect, useCallback } from "react";
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
  FaTimes
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
  icon: Icon,
  isEditing,
  name,
  type = "text",
  textarea = false,
  rows = 3,
  onChange,
}) => (
  <div className="space-y-2">
    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
      {Icon && <Icon className="w-4 h-4 text-[#0067A1]" />}
      {label}
    </label>
    {isEditing ? (
      textarea ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          rows={rows}
          className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all"
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0067A1] focus:border-transparent transition-all"
        />
      )
    ) : (
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 min-h-[44px] flex items-center">
        {value || <span className="text-slate-400">Not provided</span>}
      </div>
    )}
  </div>
);

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
    clinicConsultationFee: "",
    homeVisitFee: "",
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
      // Parse weekly availability slots (clinic, video, home) and leave days
      const parseSlots = (value) => {
        if (!value) return {};
        if (typeof value === "string") {
          try {
            const parsed = JSON.parse(value);
            return parsed && typeof parsed === "object" ? parsed : {};
          } catch {
            return {};
          }
        }
        if (typeof value === "object") return value;
        return {};
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

      const clinicSlots = parseSlots(details.clinic_slots);
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
        clinicConsultationFee:
          details.clinic_consultation_fee !== null && details.clinic_consultation_fee !== undefined && !Number.isNaN(Number(details.clinic_consultation_fee))
            ? `₹${Number(details.clinic_consultation_fee)}`
            : "",
        homeVisitFee:
          details.home_visit_fee !== null && details.home_visit_fee !== undefined && !Number.isNaN(Number(details.home_visit_fee))
            ? `₹${Number(details.home_visit_fee)}`
            : "",
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
        secondBookingDiscountType: details.second_booking_discount_type || "none",
        secondBookingDiscountValue: Number(details.second_booking_discount_value || 0),
        additionalClinics: details.meta?.additional_clinics || [],
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
      const userId =
        typeof window !== "undefined"
          ? window.localStorage.getItem("userId")
          : null;

      if (!userId) {
        console.error("No userId found in localStorage for profile picture update");
        return;
      }

      const formData = new FormData();
      formData.append("user_id", userId);
      formData.append("profile_picture", file);

      const response = await fetch("/api/profile/doctor/update-picture", {
        method: "PUT",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        console.error("Failed to update profile picture", data);
        return;
      }

      if (data.data?.profile_picture) {
        setProfilePicture(data.data.profile_picture);
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
    setWeeklyAvailability((prev) => ({
      ...prev,
      [type]: {
        ...(prev[type] || {}),
        [day]: {
          ...(prev[type]?.[day] || {}),
          [field]: value,
        },
      },
    }));
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
      const userId =
        typeof window !== "undefined"
          ? window.localStorage.getItem("userId")
          : null;

      if (!userId) {
        console.error("No userId found in localStorage for profile update");
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

      if (availableDays.length === 0) {
        toast.error("Please configure at least one day of availability in your schedule.");
        setIsLoading(false);
        return;
      }

      const payload = {
        user_id: userId,
        full_name: profile.name,
        email: profile.email,
        phone_number: profile.phone,
        specialization: selectedSpecialities,
        qualification: selectedQualifications,
        experience_years: experienceYears,
        video_consultation_fee: profile.videoConsultationFee ? Number(profile.videoConsultationFee.replace(/[^0-9.-]+/g, "")) : 0,
        clinic_consultation_fee: profile.clinicConsultationFee ? Number(profile.clinicConsultationFee.replace(/[^0-9.-]+/g, "")) : 0,
        home_visit_fee: profile.homeVisitFee ? Number(profile.homeVisitFee.replace(/[^0-9.-]+/g, "")) : 0,
        clinic_name: profile.hospital,
        clinic_address: profile.address,
        license_number: profile.licenseNumber,
        about_me: profile.about,
        languages: profile.languages,
        // Store short day codes like ["Mon", "Tue", ...]
        available_days: availableDays,
        available_time: availableTime,
        clinic_slots: weeklyAvailability.clinic_slots,
        video_slots: weeklyAvailability.video_slots,
        home_slots: weeklyAvailability.home_slots,
        leave_days: weeklyAvailability.leave_days,
        second_booking_discount_type: profile.secondBookingDiscountType,
        second_booking_discount_value: profile.secondBookingDiscountValue,
        additional_clinics: profile.additionalClinics,
      };

      const res = await api.put("/profile/doctor/basic-update", payload);

      if (!res.success || !res.data) {
        console.error("Failed to update doctor profile", res.error);
        toast.error("Failed to update profile. Please try again.");
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
    <div className="min-h-screen bg-[#F6F8FA]">
      <div className="w-full mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-[#0067A1] shadow-md">
                <FaUserMd className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-800">Professional Profile</h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">Manage your professional information and credentials</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#0067A1] text-white font-semibold rounded-xl hover:bg-[#004F7C] transition-all duration-200"
              >
                <FaEdit className="w-4 h-4" />
                Edit Profile
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all text-sm font-semibold text-slate-700 hover:text-slate-900 hover:border-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#0067A1] text-white font-semibold rounded-xl hover:bg-[#004F7C] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <FaSave className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Profile Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Overview */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-[#0067A1]/10">
                  <FaUserEdit className="w-5 h-5 text-[#0067A1]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Personal Information</h3>
                  <p className="text-sm text-slate-500">Your basic contact and identification details</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field
                  label="Full Name"
                  value={profile.name}
                  icon={FaUser}
                  isEditing={isEditing}
                  name="name"
                  onChange={handleInputChange}
                />
                
                <Field
                  label="Email Address"
                  value={profile.email}
                  icon={FaEnvelope}
                  isEditing={false}
                  name="email"
                  onChange={handleInputChange}
                />
                
                <Field
                  label="Phone Number"
                  value={profile.phone}
                  icon={FaPhone}
                  isEditing={isEditing}
                  name="phone"
                  type="tel"
                  onChange={handleInputChange}
                />
                
                <Field
                  label="Medical License"
                  value={profile.licenseNumber}
                  icon={FaCertificate}
                  isEditing={isEditing}
                  name="licenseNumber"
                  onChange={handleInputChange}
                />
                
                <Field
                  label="Languages Spoken"
                  value={profile.languages}
                  icon={FaUser}
                  isEditing={isEditing}
                  name="languages"
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-[#0067A1]/10">
                  <FaBriefcaseMedical className="w-5 h-5 text-[#0067A1]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Professional Details</h3>
                  <p className="text-sm text-slate-500">Your medical qualifications and practice information</p>
                </div>
              </div>
              <div className="space-y-8">
                {/* Specialities - professional multi-select */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <FaStethoscope className="w-5 h-5 text-[#0067A1]" />
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800">Specialities</h3>
                        <p className="text-xs text-slate-500">Select one or more areas of expertise</p>
                      </div>
                    </div>
                  </div>
                  <div className="border border-slate-200 rounded-2xl p-3 bg-white">
                    {/* Selected chips */}
                    <div className="flex flex-wrap gap-2 mb-3 min-h-[32px]">
                      {selectedSpecialities.length === 0 && !isEditing && (
                        <span className="text-xs text-slate-400">Not provided</span>
                      )}
                      {selectedSpecialities.length === 0 && isEditing && (
                        <span className="text-xs text-slate-400">Select one or more specialities from the list below</span>
                      )}
                      {selectedSpecialities.map((spec) => (
                        <span
                          key={spec}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#0067A1] text-white text-xs font-medium"
                        >
                          {spec}
                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => handleSpecialityToggle(spec)}
                              className="ml-1 text-white/80 hover:text-white"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                    </div>

                    {/* Custom speciality input */}
                    {isEditing && (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
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
                          placeholder="Add custom speciality (e.g. Diabetology)"
                          className="flex-1 px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0067A1] focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            handleSpecialityAdd(newSpeciality);
                            setNewSpeciality("");
                          }}
                          className="px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-[#0067A1] text-white hover:bg-[#004F7C] disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={!newSpeciality.trim()}
                        >
                          Add
                        </button>
                      </div>
                    )}

                    {/* Options list (edit mode only) */}
                    {isEditing && (
                      <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                        {specialities.map((spec) => {
                          const active = selectedSpecialities.includes(spec.name);
                          return (
                            <label
                              key={spec.name}
                              className="flex items-start gap-3 py-2 px-1 cursor-pointer hover:bg-slate-50 rounded-lg"
                            >
                              <input
                                type="checkbox"
                                checked={active}
                                onChange={() => handleSpecialityToggle(spec.name)}
                                className="mt-1 w-4 h-4 rounded border-slate-300 text-[#0067A1] focus:ring-[#0067A1]"
                              />
                              <div className="flex items-start gap-2 flex-1 min-w-0">
                                <div className="mt-0.5 text-lg">
                                  <span>{spec.icon}</span>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 truncate">{spec.name}</p>
                                  <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{spec.description}</p>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Qualifications (chips + dropdown, like onboarding) */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FaGraduationCap className="w-4 h-4 text-[#0067A1]" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Qualifications</p>
                      <p className="text-xs text-slate-500">Add all your medical degrees</p>
                    </div>
                  </div>
                  <div className="border border-slate-200 rounded-2xl p-3 bg-white">
                    <div className="flex flex-wrap gap-2 mb-3 min-h-[32px]">
                      {selectedQualifications.length === 0 && !isEditing && (
                        <span className="text-xs text-slate-400">Not provided</span>
                      )}
                      {selectedQualifications.map((qual) => (
                        <span
                          key={qual}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#0067A1] text-white text-xs font-medium"
                        >
                          {qual}
                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => handleQualificationRemove(qual)}
                              className="ml-1 text-white/80 hover:text-white"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                    {isEditing && (
                      <select
                        className="w-full border-none text-sm text-slate-700 focus:outline-none focus:ring-0 bg-transparent"
                        defaultValue=""
                        onChange={(e) => {
                          handleQualificationAdd(e.target.value);
                          e.target.value = "";
                        }}
                      >
                        <option value="" disabled>
                          Add qualification...
                        </option>
                        {qualificationsOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field
                    label="Experience"
                    value={profile.experience}
                    icon={FaHistory}
                    isEditing={isEditing}
                    name="experience"
                    onChange={handleInputChange}
                  />
                  
                  <Field
                    label="Video Consultation Fee"
                    value={profile.videoConsultationFee}
                    icon={FaDollarSign}
                    isEditing={isEditing}
                    name="videoConsultationFee"
                    onChange={handleInputChange}
                  />
                  <Field
                    label="Clinic Consultation Fee"
                    value={profile.clinicConsultationFee}
                    icon={FaDollarSign}
                    isEditing={isEditing}
                    name="clinicConsultationFee"
                    onChange={handleInputChange}
                  />
                  <Field
                    label="Home Visit Fee"
                    value={profile.homeVisitFee}
                    icon={FaDollarSign}
                    isEditing={isEditing}
                    name="homeVisitFee"
                    onChange={handleInputChange}
                  />
                  
                  <Field
                    label="Hospital/Clinic"
                    value={profile.hospital}
                    icon={FaHospital}
                    isEditing={isEditing}
                    name="hospital"
                    onChange={handleInputChange}
                  />
                  
                  <Field
                    label="Availability"
                    value={profile.availability}
                    icon={FaCalendarAlt}
                    isEditing={false}
                    name="availability"
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            {/* Second Booking Discount Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-[#0067A1]/10">
                  <FaDollarSign className="w-5 h-5 text-[#0067A1]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Second Booking Discount</h3>
                  <p className="text-sm text-slate-500">Offer a discount to patients returning for their second booking</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Discount Type
                  </label>
                  <select
                    value={profile.secondBookingDiscountType}
                    disabled={!isEditing}
                    name="secondBookingDiscountType"
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0067A1] bg-white text-slate-700 font-medium transition text-sm"
                  >
                    <option value="none">No Discount</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>

                {profile.secondBookingDiscountType !== "none" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Discount Value
                    </label>
                    <input
                      type="number"
                      value={profile.secondBookingDiscountValue}
                      disabled={!isEditing}
                      name="secondBookingDiscountValue"
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0067A1] bg-white text-slate-700 font-medium transition text-sm"
                      placeholder="Enter value"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Additional Clinic Locations Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#0067A1]/10">
                    <FaHospital className="w-5 h-5 text-[#0067A1]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">Additional Clinic Locations</h3>
                    <p className="text-sm text-slate-500">Manage multiple clinic locations for physical consultations</p>
                  </div>
                </div>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      const list = [...(profile.additionalClinics || [])];
                      list.push({ name: "", address: "", lat: "", lng: "" });
                      setProfile(prev => ({ ...prev, additionalClinics: list }));
                    }}
                    className="px-4 py-1.5 bg-[#0067A1] text-white text-xs font-semibold rounded-xl hover:bg-[#004F7C] transition"
                  >
                    + Add Clinic
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {(profile.additionalClinics || []).map((clinic, idx) => (
                  <div key={idx} className="p-4 border border-slate-100 rounded-xl bg-slate-50 relative space-y-3">
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          const list = (profile.additionalClinics || []).filter((_, i) => i !== idx);
                          setProfile(prev => ({ ...prev, additionalClinics: list }));
                        }}
                        className="absolute top-3 right-3 text-slate-400 hover:text-rose-500 transition"
                      >
                        <FaTimes className="w-4 h-4" />
                      </button>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                          Clinic Name
                        </label>
                        <input
                          type="text"
                          value={clinic.name || ""}
                          disabled={!isEditing}
                          onChange={(e) => {
                            const list = [...profile.additionalClinics];
                            list[idx].name = e.target.value;
                            setProfile(prev => ({ ...prev, additionalClinics: list }));
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0067A1] bg-white text-slate-700 font-medium transition text-sm"
                          placeholder="Clinic Name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                          Clinic Address
                        </label>
                        <input
                          type="text"
                          value={clinic.address || ""}
                          disabled={!isEditing}
                          onChange={(e) => {
                            const list = [...profile.additionalClinics];
                            list[idx].address = e.target.value;
                            setProfile(prev => ({ ...prev, additionalClinics: list }));
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0067A1] bg-white text-slate-700 font-medium transition text-sm"
                          placeholder="Clinic Address"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-[#0067A1]/10">
                  <FaClock className="w-5 h-5 text-[#0067A1]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Opening Timings <span className="ml-2 text-xs text-rose-500 font-normal">(Required: Select at least one day)</span></h3>
                  <p className="text-sm text-slate-500">Configure your weekly clinic, video, and home visit hours</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-[#0067A1] text-white">
                        <th className="p-3 text-left font-semibold">Day</th>
                        <th className="p-3 text-center font-semibold">Leave</th>
                        <th className="p-3 text-center font-semibold">Clinic Visit</th>
                        <th className="p-3 text-center font-semibold">Video Consultation</th>
                        <th className="p-3 text-center font-semibold">Home Visit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daysOfWeek.map((day) => (
                        <tr key={day} className="hover:bg-slate-50">
                          <td className="border-t border-slate-200 p-3 font-semibold text-slate-800 bg-white">
                            {day}
                          </td>
                          <td className="border-t border-slate-200 p-3 text-center bg-white">
                            <input
                              type="checkbox"
                              checked={weeklyAvailability.leave_days.includes(day)}
                              onChange={() => isEditing && handleWeeklyLeaveToggle(day)}
                              disabled={!isEditing}
                              className="w-4 h-4 rounded border-slate-300 text-[#0067A1] focus:ring-[#0067A1] disabled:opacity-60"
                            />
                          </td>
                          {["clinic_slots", "video_slots", "home_slots"].map((type) => (
                            <td
                              key={type}
                              className="border-t border-slate-200 p-3 bg-white"
                            >
                              <div className="flex items-center justify-center gap-2">
                                <input
                                  type="time"
                                  value={weeklyAvailability[type]?.[day]?.start || ""}
                                  onChange={(e) =>
                                    handleWeeklySlotChange(
                                      type,
                                      day,
                                      "start",
                                      e.target.value
                                    )
                                  }
                                  disabled={
                                    !isEditing || weeklyAvailability.leave_days.includes(day)
                                  }
                                  className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] disabled:bg-slate-50 disabled:text-slate-400"
                                />
                                <span className="text-xs text-slate-400">to</span>
                                <input
                                  type="time"
                                  value={weeklyAvailability[type]?.[day]?.end || ""}
                                  onChange={(e) =>
                                    handleWeeklySlotChange(
                                      type,
                                      day,
                                      "end",
                                      e.target.value
                                    )
                                  }
                                  disabled={
                                    !isEditing || weeklyAvailability.leave_days.includes(day)
                                  }
                                  className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] disabled:bg-slate-50 disabled:text-slate-400"
                                />
                                {type === "clinic_slots" && (
                                  <select
                                    value={weeklyAvailability[type]?.[day]?.clinic_index || 0}
                                    onChange={(e) =>
                                      handleWeeklySlotChange(
                                        type,
                                        day,
                                        "clinic_index",
                                        parseInt(e.target.value, 10)
                                      )
                                    }
                                    disabled={
                                      !isEditing || weeklyAvailability.leave_days.includes(day)
                                    }
                                    className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] disabled:bg-slate-50 disabled:text-slate-400 bg-white text-slate-800"
                                  >
                                    <option value={0}>{profile.hospital || "Primary"}</option>
                                    {(profile.additionalClinics || []).map((c, cIdx) => (
                                      <option key={cIdx + 1} value={cIdx + 1}>
                                        {c.name || `Clinic ${cIdx + 2}`}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-500">
                  Note: Update your timings and click "Save Changes" to apply them across clinic, video, and home visit bookings.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-[#0067A1]/10">
                  <FaMapMarkerAlt className="w-5 h-5 text-[#0067A1]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Clinic Address</h3>
                  <p className="text-sm text-slate-500">Your practice location and contact details</p>
                </div>
              </div>

              <Field
                label="Address"
                value={profile.address}
                icon={FaMapMarkerAlt}
                isEditing={isEditing}
                name="address"
                textarea={true}
                rows={4}
                onChange={handleInputChange}
              />
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-[#0067A1]/10">
                  <FaUserMd className="w-5 h-5 text-[#0067A1]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">About Me</h3>
                  <p className="text-sm text-slate-500">Your professional bio and background</p>
                </div>
              </div>

              <Field
                label="Professional Bio"
                value={profile.about}
                isEditing={isEditing}
                name="about"
                textarea={true}
                rows={6}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Right Column - Quick Stats & Info */}
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5">
              <div className="text-center mb-6">
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <div className="w-32 h-32 rounded-full bg-[#E3EBEB] flex items-center justify-center shadow-lg overflow-hidden">
                    {profilePicture ? (
                      <img
                        src={profilePicture}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FaUserMd className="w-16 h-16 text-[#0067A1]" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-[#0067A1] text-white shadow-md border border-white cursor-pointer hover:bg-[#004F7C] transition-colors">
                    <FaEdit className="w-3 h-3" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfilePictureChange}
                    />
                  </label>
                </div>
                <h3 className="text-xl font-bold text-slate-800">{profile.name}</h3>
                <p className="text-emerald-600 font-semibold">{profile.specialization}</p>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <FaStar className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold text-slate-700">{profile.rating}</span>
                  <span className="text-sm text-slate-500">({profile.patientsTreated} patients)</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Status</span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#0067A1]/10 text-[#0067A1] border border-[#0067A1]/20">
                    Active
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Member Since</span>
                  <span className="font-medium text-slate-700">Jan 2023</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Last Updated</span>
                  <span className="font-medium text-slate-700">Today</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Profile Completion</span>
                  <span className="font-medium text-slate-700">85%</span>
                </div>
              </div>

                <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="text-sm text-slate-500 mb-2">Profile Strength</div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-[#0067A1] h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5">
              <h4 className="text-sm font-semibold text-slate-700 mb-4">Quick Actions</h4>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => router.push("/doctor/appointments")}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-[#0067A1]/40 hover:bg-[#0067A1]/5 transition-all"
                >
                  <span className="font-medium text-slate-700">View Schedule</span>
                  <FaCalendarAlt className="w-4 h-4 text-slate-400" />
                </button>
                
                <button
                  type="button"
                  onClick={() => router.push("/doctor/manage-slots")}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-[#0067A1]/40 hover:bg-[#0067A1]/5 transition-all"
                >
                  <span className="font-medium text-slate-700">Update Availability</span>
                  <FaClock className="w-4 h-4 text-slate-400" />
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.print();
                    }
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50 transition-all"
                >
                  <span className="font-medium text-slate-700">Download Profile</span>
                  <FaUserMd className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Verification Status */}
            <div className="bg-[#0067A1]/5 rounded-2xl border border-[#0067A1]/20 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-[#0067A1]">
                  <FaCertificate className="w-4 h-4 text-white" />
                </div>
                <h4 className="font-semibold text-emerald-800">Verification Status</h4>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Medical License</span>
                  <span className="px-2 py-1 rounded text-xs font-semibold bg-[#0067A1]/10 text-[#0067A1]">
                    Verified
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Qualifications</span>
                  <span className="px-2 py-1 rounded text-xs font-semibold bg-[#0067A1]/10 text-[#0067A1]">
                    Verified
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Identity</span>
                  <span className="px-2 py-1 rounded text-xs font-semibold bg-[#0067A1]/10 text-[#0067A1]">
                    Verified
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Mode Notice */}
        {isEditing && (
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500 flex-shrink-0">
                <FaEdit className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-amber-800 mb-2">You are in Edit Mode</h4>
                <p className="text-sm text-amber-700">
                  Changes made here will update your professional profile. Some information may require verification before being published.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}