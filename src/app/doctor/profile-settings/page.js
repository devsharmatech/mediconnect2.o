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
    <div className="min-h-screen bg-slate-50/50 py-4 px-3 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Top Action Header Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Doctor Profile & Settings</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Manage your medical credentials, practice fees, opening hours & contact details</p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0067A1] text-white text-sm font-medium rounded-lg hover:bg-[#004F7C] transition-colors"
              >
                <FaEdit className="w-3.5 h-3.5" />
                Edit Profile
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3.5 py-2 bg-white text-slate-700 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#0067A1] text-white text-sm font-medium rounded-lg hover:bg-[#004F7C] transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <FaSave className="w-3.5 h-3.5" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Main Form Column */}
          <div className="lg:col-span-2 space-y-5">
            {/* Personal Information */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
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
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
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
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
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
                  label="Video Consultation Fee (₹)"
                  value={profile.videoConsultationFee}
                  isEditing={isEditing}
                  name="videoConsultationFee"
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
                  label="Home Visit Fee (₹)"
                  value={profile.homeVisitFee}
                  isEditing={isEditing}
                  name="homeVisitFee"
                  onChange={handleInputChange}
                />
                
                <Field
                  label="Primary Hospital / Clinic Name"
                  value={profile.hospital}
                  isEditing={isEditing}
                  name="hospital"
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Discounts & Additional Clinics */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Discounts & Practice Locations</h2>
                <p className="text-xs text-slate-500">Follow-up discounts and secondary clinic addresses</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Follow-up Discount Type
                  </label>
                  <select
                    value={profile.secondBookingDiscountType}
                    disabled={!isEditing}
                    name="secondBookingDiscountType"
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#0067A1] disabled:bg-slate-50"
                  >
                    <option value="none">No Discount</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>

                {profile.secondBookingDiscountType !== "none" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Discount Value
                    </label>
                    <input
                      type="number"
                      value={profile.secondBookingDiscountValue}
                      disabled={!isEditing}
                      name="secondBookingDiscountValue"
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#0067A1] disabled:bg-slate-50"
                      placeholder="Enter value"
                    />
                  </div>
                )}
              </div>

              {/* Additional Clinics */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-700">Additional Clinic Locations</span>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        const list = [...(profile.additionalClinics || [])];
                        list.push({ name: "", address: "" });
                        setProfile(prev => ({ ...prev, additionalClinics: list }));
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-md border border-slate-200 transition-colors"
                    >
                      + Add Location
                    </button>
                  )}
                </div>

                {(profile.additionalClinics || []).length === 0 && (
                  <p className="text-xs text-slate-400 font-normal italic">No additional clinic locations added.</p>
                )}

                {(profile.additionalClinics || []).map((clinic, idx) => (
                  <div key={idx} className="p-3 border border-slate-200 rounded-lg bg-slate-50/50 space-y-2 relative">
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          const list = (profile.additionalClinics || []).filter((_, i) => i !== idx);
                          setProfile(prev => ({ ...prev, additionalClinics: list }));
                        }}
                        className="absolute top-2 right-2 text-slate-400 hover:text-rose-500"
                      >
                        <FaTimes className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={clinic.name || ""}
                        disabled={!isEditing}
                        onChange={(e) => {
                          const list = [...profile.additionalClinics];
                          list[idx].name = e.target.value;
                          setProfile(prev => ({ ...prev, additionalClinics: list }));
                        }}
                        className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 bg-white"
                        placeholder="Clinic Name"
                      />
                      <input
                        type="text"
                        value={clinic.address || ""}
                        disabled={!isEditing}
                        onChange={(e) => {
                          const list = [...profile.additionalClinics];
                          list[idx].address = e.target.value;
                          setProfile(prev => ({ ...prev, additionalClinics: list }));
                        }}
                        className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 bg-white"
                        placeholder="Clinic Address"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Timings */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Weekly Schedule & Hours</h2>
                  <p className="text-xs text-slate-500">Configure clinic, video consultation, and home visit availability</p>
                </div>
                <span className="text-xs text-amber-600 font-medium">Select at least 1 active day</span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Day</th>
                      <th className="p-2.5 text-center">Leave</th>
                      <th className="p-2.5">Clinic Visit</th>
                      <th className="p-2.5">Video Consultation</th>
                      <th className="p-2.5">Home Visit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {daysOfWeek.map((day) => (
                      <tr key={day} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-semibold text-slate-800">{day}</td>
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={weeklyAvailability.leave_days.includes(day)}
                            onChange={() => isEditing && handleWeeklyLeaveToggle(day)}
                            disabled={!isEditing}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-[#0067A1] focus:ring-[#0067A1]"
                          />
                        </td>
                        {["clinic_slots", "video_slots", "home_slots"].map((type) => (
                          <td key={type} className="p-2.5">
                            <div className="flex items-center gap-1">
                              <input
                                type="time"
                                value={weeklyAvailability[type]?.[day]?.start || ""}
                                onChange={(e) =>
                                  handleWeeklySlotChange(type, day, "start", e.target.value)
                                }
                                disabled={!isEditing || weeklyAvailability.leave_days.includes(day)}
                                className="border border-slate-200 rounded px-1.5 py-1 text-xs disabled:bg-slate-100 disabled:text-slate-400"
                              />
                              <span className="text-slate-400">-</span>
                              <input
                                type="time"
                                value={weeklyAvailability[type]?.[day]?.end || ""}
                                onChange={(e) =>
                                  handleWeeklySlotChange(type, day, "end", e.target.value)
                                }
                                disabled={!isEditing || weeklyAvailability.leave_days.includes(day)}
                                className="border border-slate-200 rounded px-1.5 py-1 text-xs disabled:bg-slate-100 disabled:text-slate-400"
                              />
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Address & Bio */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
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
            </div>
          </div>

          {/* Right Summary Column */}
          <div className="space-y-5">
            {/* Profile Avatar Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center space-y-4">
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
                <div className="flex items-center justify-center gap-1 mt-2 text-xs text-slate-600">
                  <FaStar className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-medium text-slate-800">{profile.rating || "5.0"}</span>
                  <span className="text-slate-400">({profile.patientsTreated || 0} consultations)</span>
                </div>
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