"use client";
import { useState, useRef, useEffect, Suspense } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import dynamic from "next/dynamic";

import {
  User,
  Mail,
  Phone,
  Award,
  MapPin,
  Camera,
  FileText,
  Shield,
  BanknoteIcon,
  Calendar,
  Clock,
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Star,
  Stethoscope,
  Building,
  FileCheck,
  Heart,
  Info,
  Lock,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const VerificationFlow = dynamic(() => import("./verification-flow"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#0067A1] mx-auto mb-3" />
        <p className="text-gray-500">Loading verification...</p>
      </div>
    </div>
  ),
});

// Default form data structure
const defaultFormData = {
  doctor_name: "",
  email: "",
  phone: "",
  qualification: [],
  doctor_registration_no: "",
  years_experience: "",
  video_consultation_fee: "",
  clinic_consultation_fee: "",
  home_visit_fee: "",
  speciality: [],
  super_speciality: [],
  clinic_address: "",
  clinic_photos: [],
  kyc_data: [],
  is_kyc: false,
  clinic_lat: "",
  clinic_lng: "",
  leave_days: [],
  clinic_slots: {},
  video_slots: {},
  home_slots: {},
  insurance: "",
  aadhaar: "",
  pan: "",
  driving_license: "",
  address: "",
  address_proof: null,
  dmc_mci_nmc_certificates: [],
  passport_photo: null,
  digital_signature: "",
  bank_account_number: "",
  bank_ifsc_code: "",
  bank_name: "",
  bank_branch: "",
  bpl_service_agreement: false,
  bpl_preferred_time: "",
  non_disclosure_agreement: false,
  terms_conditions_agreement: false,
  digital_consent: false,
  additional_clinics: [],
};

const specialityOptions = [
  "General Medicine",
  "General Physician",
  "Family Medicine",
  "Pediatrics",
  "Neonatology",
  "Obstetrics & Gynecology",
  "Cardiology",
  "Cardiothoracic Surgery",
  "Dermatology",
  "Cosmetology",
  "Orthopedics",
  "Rheumatology",
  "Psychiatry",
  "Clinical Psychology",
  "ENT (Otorhinolaryngology)",
  "Ophthalmology",
  "Dentistry",
  "Pulmonology",
  "Critical Care Medicine",
  "Endocrinology",
  "Gastroenterology",
  "Hepatology",
  "Nephrology",
  "Urology",
  "Neurology",
  "Neurosurgery",
  "Radiology",
  "Interventional Radiology",
  "Medical Oncology",
  "Surgical Oncology",
  "Radiation Oncology",
  "Plastic & Reconstructive Surgery",
  "Vascular Surgery",
  "Anesthesiology",
  "Pain Medicine",
  "Physiotherapy",
  "Nutrition & Dietetics",
  "Sports Medicine",
  "Emergency Medicine",
  "Geriatrics",
  "Occupational Therapy",
  "Other",
];

const superSpecialityOptions = [
  "Cardiac Electrophysiology",
  "Heart Failure & Transplant",
  "Pediatric Cardiology",
  "Interventional Cardiology",
  "Stroke & Neurointervention",
  "Spine Surgery",
  "Joint Replacement",
  "Pediatric Neurology",
  "Movement Disorders",
  "Epileptology",
  "Pediatric Gastroenterology",
  "Liver Transplant",
  "Kidney Transplant",
  "Bone Marrow Transplant",
  "Neonatal Intensive Care",
  "Pediatric Intensive Care",
  "Fetal Medicine",
  "High-risk Obstetrics",
  "Reproductive Medicine / IVF",
  "Interventional Pulmonology",
  "Sleep Medicine",
  "Allergy & Immunology",
  "Pediatric Endocrinology",
  "Metabolic Medicine",
  "Interventional Neuroradiology",
  "Head & Neck Oncology",
  "Breast Oncology",
  "Gynecologic Oncology",
  "Pediatric Oncology",
  "Hand Surgery",
  "Craniofacial Surgery",
  "Bariatric Surgery",
  "Colorectal Surgery",
  "Pediatric Surgery",
  "Other Super-speciality",
];

const qualificationsList = [
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

const parseListField = (rawValue, optionsList) => {
  if (!rawValue) return [];
  
  let items = [];
  if (typeof rawValue === "string") {
    try {
      const parsed = JSON.parse(rawValue);
      items = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      items = [rawValue];
    }
  } else if (Array.isArray(rawValue)) {
    items = rawValue;
  } else {
    items = [String(rawValue)];
  }

  const normalizedItems = [];
  items.forEach(item => {
    if (typeof item === "string") {
      const parts = item.split(/[,;]+/).map(p => p.trim()).filter(Boolean);
      normalizedItems.push(...parts);
    } else {
      normalizedItems.push(item);
    }
  });

  const matched = new Set();
  
  normalizedItems.forEach(item => {
    const itemStr = String(item).toLowerCase();
    
    // First pass: exact match (case insensitive)
    const foundExact = optionsList.find(opt => opt.toLowerCase() === itemStr);
    if (foundExact) {
      matched.add(foundExact);
    } else {
      // Second pass: partial match (substring check)
      const foundPartial = optionsList.find(opt => {
        const optStr = opt.toLowerCase();
        return optStr.includes(itemStr) || itemStr.includes(optStr);
      });
      if (foundPartial) {
        matched.add(foundPartial);
      }
    }
  });

  // Fallback to "Other" or "Other Super-speciality" if non-empty value but no direct match found
  if (matched.size === 0 && normalizedItems.length > 0) {
    const hasOther = optionsList.find(opt => opt.toLowerCase() === "other" || opt.toLowerCase() === "other super-speciality");
    if (hasOther) {
      matched.add(hasOther);
    }
  }

  return Array.from(matched);
};

// ─── Main Page Export ───
// Handles routing between token-based verification flow and self-onboarding form
export default function DoctorOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="w-10 h-10 animate-spin text-[#0067A1]" />
        </div>
      }
    >
      <OnboardingRouter />
    </Suspense>
  );
}

function OnboardingRouter() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("token") || "";

  const [tokenData, setTokenData] = useState(null);
  const [tokenError, setTokenError] = useState(null);
  const [tokenLoading, setTokenLoading] = useState(!!tokenParam);
  const [isBouncing, setIsBouncing] = useState(false);

  // Dynamic local environment bounce redirect check
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const originHost = urlParams.get("origin_host");
      if (originHost) {
        setIsBouncing(true);
        const cleanParams = new URLSearchParams(window.location.search);
        cleanParams.delete("origin_host");
        const cleanSearch = cleanParams.toString();
        const localRedirectUrl = cleanSearch 
          ? `${originHost.replace(/\/$/, "")}${window.location.pathname}?${cleanSearch}`
          : `${originHost.replace(/\/$/, "")}${window.location.pathname}`;
        
        window.location.href = localRedirectUrl;
      }
    }
  }, []);

  useEffect(() => {
    if (isBouncing || !tokenParam) return;

    const fetchData = async () => {
      setTokenLoading(true);
      try {
        const res = await fetch(
          `/api/doctors/onboarding/data?token=${tokenParam}`
        );
        const result = await res.json();
        if (result.success) {
          setTokenData(result);
        } else {
          setTokenError(result.error || "Invalid or expired link");
        }
      } catch (err) {
        setTokenError("Failed to load. Please try again.");
      } finally {
        setTokenLoading(false);
      }
    };

    fetchData();
  }, [tokenParam]);

  // ─── Token-based verification flow ───
  if (isBouncing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#0067A1] mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Redirecting to local environment...</p>
        </div>
      </div>
    );
  }

  if (tokenParam) {
    if (tokenLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-[#0067A1] mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              Loading your onboarding...
            </p>
          </div>
        </div>
      );
    }

    if (tokenError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white rounded-lg border border-red-200 p-6 sm:p-8 text-center max-w-md w-full shadow-sm">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
              Link Error
            </h2>
            <p className="text-gray-600 text-sm mb-5">{tokenError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-semibold hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    if (tokenData) {
      return (
        <DoctorOnboardingForm
          initialTokenData={tokenData.data}
          tokenParam={tokenParam}
          phoneParam={tokenData.phone}
          emailParam={tokenData.data?.email}
          doctorId={tokenData.doctor_id}
          initialOnboardingStatus={tokenData.onboarding_status}
        />
      );
    }
  }

  // ─── No token → Self-Onboarding Flow ───
  return (
    <DoctorOnboardingForm />
  );
}

// Helper to format markdown bold (**text**) into strong elements
const formatContent = (text) => {
  if (!text) return "";
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

function DoctorOnboardingForm({
  initialTokenData = null,
  tokenParam = null,
  phoneParam = null,
  emailParam = null,
  doctorId = null,
  initialOnboardingStatus = null,
}) {
  const router = useRouter();
  const isTokenFlow = !!tokenParam;

  const parseJSON = (str) => {
    if (!str) return [];
    try {
      return typeof str === "string" ? JSON.parse(str) : str;
    } catch {
      return [];
    }
  };

  const mappedTokenData = initialTokenData ? {
    ...defaultFormData,
    doctor_name: initialTokenData.full_name || "",
    email: initialTokenData.email || "",
    phone: phoneParam || initialTokenData.phone || "",
    qualification: parseListField(initialTokenData.qualification, qualificationsList),
    doctor_registration_no: initialTokenData.license_number || "",
    years_experience: initialTokenData.experience_years || "",
    video_consultation_fee: initialTokenData.video_consultation_fee || "",
    clinic_consultation_fee: initialTokenData.clinic_consultation_fee || "",
    home_visit_fee: initialTokenData.home_visit_fee || "",
    speciality: parseListField(initialTokenData.specialization, specialityOptions),
    super_speciality: parseListField(initialTokenData.meta?.super_speciality, superSpecialityOptions),
    clinic_address: initialTokenData.clinic_address || "",
    clinic_photos: initialTokenData.clinic_photos || [],
    kyc_data: initialTokenData.kyc_data || [],
    is_kyc: initialTokenData.kyc_status === 'verified' || !!initialTokenData.kyc_data?.length,
    clinic_lat: initialTokenData.latitude || "",
    clinic_lng: initialTokenData.longitude || "",
    leave_days: initialTokenData.leave_days || [],
    clinic_slots: initialTokenData.clinic_slots || {},
    video_slots: initialTokenData.video_slots || {},
    home_slots: initialTokenData.home_slots || {},
    insurance: initialTokenData.indemnity_insurance || "",
    aadhaar: initialTokenData.meta?.aadhaar || "",
    pan: initialTokenData.meta?.pan || "",
    driving_license: initialTokenData.meta?.driving_license || "",
    address: initialTokenData.meta?.address || "",
    address_proof: initialTokenData.address_proof ? initialTokenData.address_proof[0] : null,
    dmc_mci_nmc_certificates: initialTokenData.dmc_mci_certificate || [],
    passport_photo: initialTokenData.passport_photo ? initialTokenData.passport_photo[0] : null,
    bank_account_number: initialTokenData.bank_account_details?.account_no || "",
    bank_account_name: initialTokenData.bank_account_details?.account_name || "",
    bank_ifsc_code: initialTokenData.bank_account_details?.ifsc || "",
    bank_name: initialTokenData.bank_account_details?.bank_name || "",
    bank_branch: initialTokenData.bank_account_details?.branch || "",
    bpl_service_agreement: initialTokenData.meta?.bpl_service_agreement || false,
    bpl_preferred_time: initialTokenData.meta?.bpl_preferred_time || "",
    non_disclosure_agreement: initialTokenData.meta?.non_disclosure_agreement || false,
    terms_conditions_agreement: initialTokenData.meta?.terms_conditions_agreement || false,
    digital_consent: initialTokenData.digital_consent || false,
    signature_url: initialTokenData.signature_url || "",
    additional_clinics: initialTokenData.meta?.additional_clinics || [],
  } : null;

  const [currentStep, setCurrentStep] = useState(1);
  const [kycLoading, setKycLoading] = useState(false);
  const [kycCompleted, setKycCompleted] = useState(mappedTokenData?.is_kyc || false);
  const [formData, setFormData] = useState(mappedTokenData || defaultFormData);
  const [isClient, setIsClient] = useState(false);

  const [isFetchingIfsc, setIsFetchingIfsc] = useState(false);
  const [ifscFetchError, setIfscFetchError] = useState("");


  // States for strict onboarding steps
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpVerified, setOtpVerified] = useState(initialOnboardingStatus?.otp_verified || false);
  const [agreementChecked, setAgreementChecked] = useState(initialOnboardingStatus?.agreement_accepted || false);
  const [submitting, setSubmitting] = useState(false);


  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);

  const [signatureData, setSignatureData] = useState("");
  const [activeSignatureTab, setActiveSignatureTab] = useState("draw");
  const [isDrawing, setIsDrawing] = useState(false);

  // New state for KYC validation
  const [showKycMismatchModal, setShowKycMismatchModal] = useState(false);
  const [kycMismatches, setKycMismatches] = useState([]);
  const [pendingKycData, setPendingKycData] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);

  const canvasRef = useRef(null);
  const fileInputRefs = useRef({});

  const steps = [
    { number: 1, title: "Personal Info", icon: User, color: "blue" },
    { number: 2, title: "Professional", icon: Award, color: "green" },
    { number: 3, title: "Documents", icon: FileText, color: "blue" },
    { number: 4, title: "Bank & Agreements", icon: Shield, color: "orange" },
  ];

  // --- Strict Onboarding Handlers ---
  const handleSendOtp = async () => {
    if (!phoneParam) return toast.error("Phone number missing");
    setOtpSending(true);
    try {
      const res = await fetch("/api/doctors/onboarding/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailParam, phone: phoneParam, doctor_id: doctorId }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
        toast.success("OTP sent to your registered phone number.");
      } else {
        toast.error(data.error || "Failed to send OTP");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) return toast.error("Enter a valid 6-digit OTP");
    setOtpVerifying(true);
    try {
      const res = await fetch("/api/doctors/onboarding/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailParam, phone: phoneParam, otp, doctor_id: doctorId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("OTP Verified successfully.");
        // Mark as verified locally to move to Agreement state in Step 4
        setOtpVerified(true);
      } else {
        toast.error(data.error || "Invalid OTP");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setOtpVerifying(false);
    }
  };

  // ─── Queue notification (fire-and-forget, non-blocking) ───────────────────
  const enqueueNotification = (type, { email, name, phone, recipient_id, payload } = {}) => {
    fetch("/api/queue/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, email, name, phone, recipient_id, payload }),
    }).catch((err) => console.warn("[NotifQueue] Enqueue failed (non-critical):", err.message));
  };

  const handleAcceptAgreement = async () => {
    if (!agreementChecked) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/doctors/onboarding/agreement/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneParam,
          email: emailParam,
          doctor_id: doctorId,
          consent_version: "v1.0",
          device_info: navigator.userAgent
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Onboarding Completed!");
        // ✅ Queue confirmation notification (fire-and-forget)
        enqueueNotification("onboarding_success", {
          email: emailParam,
          phone: phoneParam,
          name: formData.full_name || formData.doctor_name || "",
          payload: {
            full_name: formData.full_name || formData.doctor_name || "",
            clinic_name: formData.clinic_name || "",
          },
        });
        clearLocalStorage();
        router.push("/doctor/onboarding/success");
      } else {
        toast.error(data.error || "Failed to accept agreement");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const agreementCards = [
    {
      title: "1. Professional Declaration",
      content: `**Identity, Qualification & Representation**\nI hereby confirm that I am a duly qualified and registered medical practitioner under applicable laws of India, holding valid and subsisting registration with the relevant Medical Council.\nI represent and warrant that all information provided by me, including my qualifications, registration details, and professional credentials, is true, accurate, complete, and not misleading in any manner.\nI undertake to immediately notify MediConnect of any change, suspension, restriction, or expiry of my professional license, registration, or eligibility to practice.\nI acknowledge and accept that MediConnect reserves the right to independently verify, audit, or re-verify my credentials at any time, and to take appropriate action, including suspension or termination, in case of any discrepancy or non-compliance.`
    },
    {
      title: "2. Clinical Responsibility",
      content: `**Autonomy, Accountability & Legal Responsibility**\nI expressly acknowledge that all consultations, diagnoses, treatment plans, prescriptions, medical advice, and clinical decisions made through the MediConnect platform are solely my independent professional judgments.\nMediConnect functions exclusively as a technology platform facilitating interactions and does not, at any time, influence, guide, or interfere with my clinical decision-making.\nI agree that I am solely responsible and legally accountable for:\n• The accuracy, appropriateness, and safety of all medical advice provided\n• The legality and correctness of prescriptions issued\n• Compliance with applicable medical laws, drug regulations, and ethical standards\n• Ensuring that my medical decisions are in the best interest of the patient\nI understand that MediConnect shall not be liable for any clinical outcomes, medical negligence, or treatment-related consequences arising from my actions.`
    },
    {
      title: "3. Consultation Modes & Telemedicine",
      content: `**Teleconsultation, In-Clinic & Home Care Responsibilities**\nI shall strictly adhere to applicable telemedicine practice guidelines, including but not limited to:\n• Proper patient identification and verification\n• Obtaining valid and informed patient consent\n• Prescribing only within permissible categories and clinical appropriateness\n• Maintaining adequate consultation records\n• Avoiding prohibited or restricted prescriptions where applicable\n\n**IN-CLINIC CONSULTATION:**\nI remain fully responsible for maintaining all clinical, safety, hygiene, and regulatory standards within my physical practice, including compliance with local laws and professional obligations.\n\n**HOME VISIT CONSULTATION:**\nI acknowledge full responsibility for clinical care, patient safety, environmental judgment, and treatment decisions during home visits conducted by me.\n\nAcross all modes, I undertake to act with professional diligence, ethical integrity, and adherence to accepted standards of medical care.`
    },
    {
      title: "4. Patient Data & Privacy",
      content: `**Privacy, Security & Responsible Handling of Health Data**\nI acknowledge that patient data accessed through MediConnect constitutes sensitive personal and health information and must be handled with the highest degree of confidentiality and care.\nI agree to:\n• Access patient data strictly for legitimate clinical purposes\n• Maintain confidentiality of all patient information at all times\n• Not copy, download, store, or transfer patient data outside the platform without proper authorization\n• Not disclose patient data to any unauthorized individual or entity\n• Use platform systems responsibly to prevent any data leakage or misuse\nI understand that all data handling must comply with applicable data protection laws, including principles of consent, purpose limitation, and data minimization.\nAny unauthorized access, misuse, disclosure, or breach of patient data may result in immediate suspension, legal action, and reporting to regulatory authorities.`
    },
    {
      title: "5. Digital Health & ABHA",
      content: `**Responsible Use of National Digital Health Systems**\nWhere applicable, I agree to comply with national digital health frameworks and standards, including the handling of ABHA-linked health records.\nI undertake to:\n• Access or share digital health records only after obtaining valid patient consent\n• Use such data strictly for authorized clinical purposes\n• Respect interoperability and system integrity requirements\n• Avoid any misuse or unauthorized linkage of patient data\nI understand that digital health systems operate within a regulated framework and any misuse may attract regulatory and legal consequences.`
    },
    {
      title: "6. Platform Usage & Conduct",
      content: `**Professional Conduct & Platform Integrity**\nI agree to use the MediConnect platform in a professional, ethical, and lawful manner.\nI shall not:\n• Misrepresent my identity, credentials, or qualifications\n• Provide false, misleading, or inappropriate medical information\n• Use the platform for any unlawful or unethical activity\n• Attempt to manipulate platform systems or workflows\n\n**NON-CIRCUMVENTION:**\nI agree not to bypass or circumvent the platform to directly engage with patients introduced through MediConnect for the purpose of avoiding platform governance, fees, or controls.\nI acknowledge that such actions undermine platform integrity and may result in suspension or permanent termination.`
    },
    {
      title: "7. Payments & Commercial Terms",
      content: `**Financial Understanding & Obligations**\nI acknowledge and agree to the commercial terms of the platform, including:\n• Consultation fees and revenue structure\n• Platform commissions or service charges\n• Settlement timelines and payout mechanisms\n• Applicable taxes, deductions, and adjustments\nI understand that payments shall be processed strictly in accordance with platform policies and that MediConnect shall not be responsible for disputes arising from external or off-platform transactions.`
    },
    {
      title: "8. Service Standards (SLA)",
      content: `**Responsiveness, Quality & Conduct**\nI agree to maintain a high standard of professionalism, responsiveness, and quality of care while using the platform.\nThis includes:\n• Timely response to consultation requests\n• Clear, appropriate, and responsible communication\n• Maintaining professional decorum at all times\nI understand that repeated delays, non-responsiveness, patient complaints, or substandard conduct may lead to restriction, suspension, or termination of platform access.`
    },
    {
      title: "9. Liability & Platform Role",
      content: `**Role of MediConnect**\nI acknowledge that MediConnect operates solely as a technology platform facilitating interactions between patients and medical practitioners.\nMediConnect does not:\n• Provide medical advice\n• Control clinical decisions\n• Assume responsibility for treatment outcomes\nAll clinical responsibility remains solely with the practitioner.\n\n**10. SUSPENSION, TERMINATION & REGULATORY ACTION**\nMediConnect reserves the right to suspend, restrict, or terminate access in cases including but not limited to:\n• Violation of applicable laws or medical guidelines\n• Breach of platform terms or ethical standards\n• Fraud, misrepresentation, or misuse\n• Patient safety concerns\nSuch actions may be taken without prior notice where required to ensure safety and compliance.\n\n**11. GOVERNING LAW & JURISDICTION**\nThis agreement shall be governed by the applicable laws of India.\nAny disputes arising shall be subject to appropriate jurisdiction as defined by MediConnect.`
    }
  ];
  // ---------------------------------

  // Option lists removed and moved to global module scope to prevent TDZ reference issues

  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  // Set isClient to true when component mounts on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load form data from localStorage after component mounts on client
  useEffect(() => {
    if (isClient && !isTokenFlow) {
      const savedFormData = localStorage.getItem('doctorOnboardingFormData');
      const savedCurrentStep = localStorage.getItem('doctorOnboardingCurrentStep');

      if (savedFormData) {
        try {
          const parsedData = JSON.parse(savedFormData);
          setFormData(prev => ({
            ...defaultFormData,
            ...parsedData,
            clinic_photos: parsedData.clinic_photos || [],
            dmc_mci_nmc_certificates: parsedData.dmc_mci_nmc_certificates || [],
          }));
        } catch (error) {
          console.error('Error parsing saved form data:', error);
          localStorage.removeItem('doctorOnboardingFormData');
        }
      }

      if (savedCurrentStep) {
        setCurrentStep(parseInt(savedCurrentStep));
      }
    }
  }, [isClient]);

  // Save form data to localStorage whenever it changes (client only)
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('doctorOnboardingFormData', JSON.stringify(formData));
    }
  }, [formData, isClient]);

  // Save current step to localStorage whenever it changes (client only)
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('doctorOnboardingCurrentStep', currentStep.toString());
    }
  }, [currentStep, isClient]);

  // Fetch bank name and branch from IFSC using Razorpay IFSC API
  const fetchBankFromIfsc = async () => {
    const ifsc = (formData.bank_ifsc_code || "").trim().toUpperCase();
    if (!ifsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      setIfscFetchError("Please enter a valid IFSC code first (e.g. HDFC0001234)");
      return;
    }
    try {
      setIsFetchingIfsc(true);
      setIfscFetchError("");
      const res = await fetch(`https://ifsc.razorpay.com/${ifsc}`);
      if (!res.ok) {
        throw new Error("IFSC not found. Please verify the code and try again.");
      }
      const data = await res.json();
      handleInputChange("bank_name", data.BANK || "");
      handleInputChange("bank_branch", data.BRANCH || "");
    } catch (err) {
      setIfscFetchError(err.message || "Failed to fetch bank details");
    } finally {
      setIsFetchingIfsc(false);
    }
  };


  // Clean up localStorage when form is successfully submitted
  const clearLocalStorage = () => {
    if (isClient) {
      localStorage.removeItem('doctorOnboardingFormData');
      localStorage.removeItem('doctorOnboardingCurrentStep');
      localStorage.removeItem('digilocker_client_token');
      localStorage.removeItem('doctorOnboardingPreKycData');
    }
  };

  // Function to validate KYC data against existing form data
  const validateKycData = (kycData, currentFormData) => {
    const mismatches = [];

    // Check name mismatch
    if (currentFormData.doctor_name && kycData.name &&
      currentFormData.doctor_name.toLowerCase() !== kycData.name.toLowerCase()) {
      mismatches.push({
        field: "doctor_name",
        label: "Doctor Name",
        currentValue: currentFormData.doctor_name,
        kycValue: kycData.name,
        type: "name"
      });
    }

    // Check PAN mismatch
    if (currentFormData.pan && kycData.pan_number &&
      currentFormData.pan.toUpperCase() !== kycData.pan_number.toUpperCase()) {
      mismatches.push({
        field: "pan",
        label: "PAN Number",
        currentValue: currentFormData.pan,
        kycValue: kycData.pan_number,
        type: "pan"
      });
    }

    // Check Aadhaar last 4 digits mismatch
    if (currentFormData.aadhaar && kycData.aadhaar_number) {
      const currentLast4 = currentFormData.aadhaar.slice(-4);
      const kycLast4 = kycData.aadhaar_number.slice(-4);
      if (currentLast4 !== kycLast4) {
        mismatches.push({
          field: "aadhaar",
          label: "Aadhaar Number",
          currentValue: `XXXX-XXXX-${currentLast4}`,
          kycValue: `XXXX-XXXX-${kycLast4}`,
          type: "aadhaar"
        });
      }
    }

    return mismatches;
  };

  const handleDigiLockerKYC = async () => {
    try {
      setKycLoading(true);

      // Store current form data in localStorage before starting KYC process
      if (isClient) {
        localStorage.setItem('doctorOnboardingPreKycData', JSON.stringify(formData));
      }

      // Step 1: Get access token
      const myHeaders = new Headers();
      myHeaders.append("Content-Type", "application/json");

      const raw = JSON.stringify({
        company_name: "chandanI1vF",
        secret_token: "FPWzvCOxPHTXuOXamPLtBgy0d9ve4am3",
      });

      const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow",
      };

      const tokenResponse = await fetch(
        "https://digilocker.meon.co.in/get_access_token",
        requestOptions
      );
      const tokenData = await tokenResponse.json();
      console.log(tokenData);
      if (!tokenData.client_token) {
        throw new Error("Failed to get access token");
      }

      const clientToken = tokenData.client_token;
      const state = tokenData.state;

      // Step 2: Get DigiLocker URL
      const urlHeaders = new Headers();
      urlHeaders.append("Content-Type", "application/json");

      // Use current page URL as redirect URL or your specific thank you page
      const currentUrl = window.location.href;
      const currentOrigin = window.location.origin;
      const baseUrl = currentUrl.split("?")[0];

      // Hardcode the authorized DigiLocker production domain
      const productionOrigin = "https://mediconnect.fit";

      let redirectUrl = "";

      if (currentOrigin !== productionOrigin) {
        // Local/Staging environment: Route through production origin with origin_host bounce param
        const prodBaseUrl = `${productionOrigin}${window.location.pathname}`;
        const kycUrl = isTokenFlow
          ? `${prodBaseUrl}?token=${tokenParam}&kyc_callback=true&state=${state}`
          : `${prodBaseUrl}?kyc_callback=true&state=${state}`;
        redirectUrl = `${kycUrl}&origin_host=${encodeURIComponent(currentOrigin)}`;
      } else {
        // Production environment: Direct redirect
        redirectUrl = isTokenFlow
          ? `${baseUrl}?token=${tokenParam}&kyc_callback=true&state=${state}`
          : `${baseUrl}?kyc_callback=true&state=${state}`;
      }

      const urlRaw = JSON.stringify({
        client_token: clientToken,
        redirect_url: redirectUrl,
        company_name: "chandanI1vF",
        documents: "aadhaar,pan",
      });

      const urlRequestOptions = {
        method: "POST",
        headers: urlHeaders,
        body: urlRaw,
        redirect: "follow",
      };

      const urlResponse = await fetch(
        "https://digilocker.meon.co.in/digi_url",
        urlRequestOptions
      );
      const urlData = await urlResponse.json();

      if (urlData.url) {
        // Store client token for later use
        localStorage.setItem("digilocker_client_token", clientToken);

        // Redirect to DigiLocker
        window.location.href = urlData.url;
      } else {
        throw new Error("Failed to get DigiLocker URL");
      }
    } catch (error) {
      console.error("DigiLocker KYC error:", error);
      toast.error("Failed to initiate KYC process. Please try again.");
      setKycLoading(false);
    }
  };

  // Handle KYC data application with validation
  const applyKycData = async (kycData) => {
    const mismatches = validateKycData(kycData, formData);

    if (mismatches.length > 0) {
      // Show mismatch modal
      setKycMismatches(mismatches);
      setPendingKycData(kycData);
      setShowKycMismatchModal(true);
    } else {
      // No mismatches, apply KYC data directly while preserving other form data
      await updateFormWithKycData(kycData);
      toast.success("KYC verification completed successfully!");
    }
  };

  // Update form with KYC data while preserving existing form data
  const updateFormWithKycData = async (kycData) => {
    // 1. Update local state
    setFormData((prev) => ({
      ...prev,
      doctor_name: kycData.name || prev.doctor_name,
      email: kycData.email || prev.email,
      aadhaar: kycData.aadhaar_number || prev.aadhaar,
      pan: kycData.pan_number || prev.pan,
      address: kycData.address || prev.address,
      kyc_data: kycData || [],
      is_kyc: true,
    }));
    setKycCompleted(true);

    // 2. Persist to DB immediately if in token flow
    if (isTokenFlow && doctorId) {
      try {
        const putFormData = new FormData();
        putFormData.append("id", doctorId);
        putFormData.append("kyc_status", "verified");
        putFormData.append("kyc_data", JSON.stringify(kycData || []));

        // Also sync fields if they were updated by KYC
        if (kycData.aadhaar_number) putFormData.append("aadhaar", kycData.aadhaar_number);
        if (kycData.pan_number) putFormData.append("pan", kycData.pan_number);

        await fetch("/api/doctors/onboard/update", {
          method: "PUT",
          body: putFormData,
        });
        console.log("KYC data persisted to DB");
      } catch (err) {
        console.error("Failed to persist KYC data to DB:", err);
      }
    }

    // Clear the pre-KYC data from localStorage
    if (isClient) {
      localStorage.removeItem('doctorOnboardingPreKycData');
    }
  };

  // Handle user decision from KYC mismatch modal
  const handleKycMismatchDecision = async (useKycData) => {
    if (useKycData && pendingKycData) {
      // User wants to use KYC data - update form with KYC data while preserving other fields
      await updateFormWithKycData(pendingKycData);
      toast.success("KYC data applied successfully!");
    } else {
      // User wants to keep existing data, just mark as verified and restore original form data
      if (isClient) {
        const preKycData = localStorage.getItem('doctorOnboardingPreKycData');
        if (preKycData) {
          try {
            const parsedPreKycData = JSON.parse(preKycData);
            // Restore the original form data and just add KYC verification status
            const finalData = {
              ...parsedPreKycData, // Restore all original form data
              kyc_data: pendingKycData || [],
              is_kyc: true,
            };
            setFormData(finalData);

            // Persist the "Verified" status to DB even if they kept original text data
            if (isTokenFlow && doctorId) {
              const putFormData = new FormData();
              putFormData.append("id", doctorId);
              putFormData.append("kyc_status", "verified");
              putFormData.append("kyc_data", JSON.stringify(pendingKycData || []));
              await fetch("/api/doctors/onboard/update", { method: "PUT", body: putFormData });
            }
          } catch (error) {
            console.error('Error parsing pre-KYC data:', error);
          }
        }
      }
      setKycCompleted(true);
      toast.success("KYC verification completed! Your existing data has been preserved.");
    }

    setShowKycMismatchModal(false);
    setPendingKycData(null);
    setKycMismatches([]);
    // Clear pre-KYC data from localStorage
    if (isClient) {
      localStorage.removeItem('doctorOnboardingPreKycData');
    }
  };

  // Add this useEffect to handle KYC callback
  useEffect(() => {
    const handleKycCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const kycCallback = urlParams.get("kyc_callback");
      const state = urlParams.get("state");
      const status = true;

      if (kycCallback && state && status) {
        try {
          const clientToken = localStorage.getItem("digilocker_client_token");

          if (!clientToken) {
            throw new Error("No client token found");
          }

          const dataHeaders = new Headers();
          dataHeaders.append("Content-Type", "application/json");

          const dataRaw = JSON.stringify({
            client_token: clientToken,
            state: state,
            status: true,
          });

          const dataRequestOptions = {
            method: "POST",
            headers: dataHeaders,
            body: dataRaw,
            redirect: "follow",
          };

          const dataResponse = await fetch(
            "https://digilocker.meon.co.in/v2/send_entire_data",
            dataRequestOptions
          );
          const kycData = await dataResponse.json();

          if (kycData.status) {
            if (kycData.data) {
              // Apply KYC data with validation
              applyKycData(kycData.data);
            } else {
              setKycCompleted(true);
              toast.success("KYC verification completed successfully!");
            }

            // Clean up URL parameters (preserve the token parameter)
            const cleanParams = new URLSearchParams(window.location.search);
            cleanParams.delete("kyc_callback");
            cleanParams.delete("state");
            cleanParams.delete("status");
            const cleanSearch = cleanParams.toString();
            const newUrl = cleanSearch 
              ? `${window.location.pathname}?${cleanSearch}`
              : window.location.pathname;
            window.history.replaceState({}, "", newUrl);
          }
        } catch (error) {
          console.error("KYC data fetch error:", error);
          toast.error("Failed to fetch KYC data. Please try again.");

          // Restore form data from localStorage if KYC failed
          if (isClient) {
            const preKycData = localStorage.getItem('doctorOnboardingPreKycData');
            if (preKycData) {
              try {
                const parsedPreKycData = JSON.parse(preKycData);
                setFormData(parsedPreKycData);
              } catch (parseError) {
                console.error('Error parsing pre-KYC data:', parseError);
              }
            }
          }
        } finally {
          setKycLoading(false);
          localStorage.removeItem("digilocker_client_token");
        }
      }
    };

    if (isClient) {
      window.addEventListener("popstate", handleKycCallback);
      handleKycCallback();
    }

    return () => {
      if (isClient) {
        window.removeEventListener("popstate", handleKycCallback);
      }
    };
  }, [formData, isClient]);

  // Initialize time slots — only fill days that aren't already populated
  // (guards against wiping pre-filled token data)
  useEffect(() => {
    setFormData((prev) => {
      const mergeSlots = (existing) => {
        const merged = {};
        daysOfWeek.forEach((day) => {
          const dayData = existing?.[day];
          if (Array.isArray(dayData) && dayData.length > 0) {
            merged[day] = dayData;
          } else if (dayData?.start || dayData?.end) {
            merged[day] = [dayData];
          } else {
            merged[day] = [{ start: "", end: "" }];
          }
        });
        return merged;
      };

      return {
        ...prev,
        clinic_slots: mergeSlots(prev.clinic_slots),
        video_slots: mergeSlots(prev.video_slots),
        home_slots: mergeSlots(prev.home_slots),
      };
    });
  }, []);

  // Get geolocation (client only)
  useEffect(() => {
    if (isClient && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            clinic_lat: position.coords.latitude.toFixed(6),
            clinic_lng: position.coords.longitude.toFixed(6),
          }));
        },
        (error) => {
          console.log("Geolocation error:", error);
        }
      );
    }
  }, [isClient]);

  // Initialize signature canvas
  const initializeCanvas = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Set canvas size properly
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Set drawing styles
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  useEffect(() => {
    if (showSignatureModal) {
      const timer = setTimeout(() => {
        if (activeSignatureTab === "draw") {
          initializeCanvas();
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [showSignatureModal, activeSignatureTab]);

  // Enhanced Signature functionality
  const startDrawing = (e) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e) => {
    if (!isDrawing || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");

    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
  };

  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (PNG, JPG)");
      return;
    }



    const reader = new FileReader();
    reader.onload = (event) => {
      setSignatureData(event.target.result);
    };
    reader.onerror = () => {
      alert("Error reading file. Please try again.");
    };
    reader.readAsDataURL(file);
  };

  const saveSignature = () => {
    if (activeSignatureTab === "draw") {
      // For drawn signature
      if (!canvasRef.current) {
        alert("Please draw your signature first");
        return;
      }

      const canvas = canvasRef.current;

      // Check if canvas has any drawing
      const ctx = canvas.getContext("2d");
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let isEmpty = true;

      for (let i = 0; i < imageData.data.length; i += 4) {
        if (imageData.data[i + 3] !== 0) {
          isEmpty = false;
          break;
        }
      }

      if (isEmpty) {
        alert("Please draw your signature before saving");
        return;
      }

      const signature = canvas.toDataURL("image/png");
      setSignatureData(signature);
      // Clear signature_url so the new drawing takes priority
      setFormData((prev) => ({ ...prev, digital_signature: signature, signature_url: "" }));
    } else if (activeSignatureTab === "upload") {
      // For uploaded signature
      if (!signatureData) {
        alert("Please upload a signature image first");
        return;
      }
      // Clear signature_url so the uploaded image takes priority
      setFormData((prev) => ({ ...prev, digital_signature: signatureData, signature_url: "" }));
    }

    setShowSignatureModal(false);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleArrayToggle = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((item) => item !== value)
        : [...prev[field], value],
    }));
  };



  const handleFileUpload = (field, files) => {
    const fileArray = Array.from(files);
    if (field === "dmc_mci_nmc_certificates" || field === "clinic_photos") {
      setFormData((prev) => ({
        ...prev,
        [field]: [...(prev[field] || []), ...fileArray],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: fileArray[0],
      }));
    }
  };

  const removeFile = (field, index) => {
    if (field === "dmc_mci_nmc_certificates" || field === "clinic_photos") {
      setFormData((prev) => ({
        ...prev,
        [field]: (prev[field] || []).filter((_, i) => i !== index),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleTimeSlotChange = (type, day, index, field, value) => {
    setFormData((prev) => {
      const typeData = prev[type] || {};
      let dayData = typeData[day];
      
      if (!Array.isArray(dayData)) {
        dayData = dayData && (dayData.start || dayData.end) ? [dayData] : [{ start: "", end: "" }];
      } else {
        dayData = [...dayData];
      }

      if (index >= dayData.length) {
        dayData[index] = { start: "", end: "" };
      }

      dayData[index] = { ...dayData[index], [field]: value };

      return {
        ...prev,
        [type]: {
          ...typeData,
          [day]: dayData,
        },
      };
    });
  };

  const handleAddTimeSlot = (type, day) => {
    setFormData((prev) => {
      const typeData = prev[type] || {};
      let dayData = typeData[day];
      if (!Array.isArray(dayData)) {
        dayData = dayData && (dayData.start || dayData.end) ? [dayData] : [{ start: "", end: "" }];
      }
      return {
        ...prev,
        [type]: {
          ...typeData,
          [day]: [...dayData, { start: "", end: "" }],
        },
      };
    });
  };

  const handleRemoveTimeSlot = (type, day, index) => {
    setFormData((prev) => {
      const typeData = prev[type] || {};
      let dayData = typeData[day];
      if (!Array.isArray(dayData)) {
        dayData = dayData && (dayData.start || dayData.end) ? [dayData] : [{ start: "", end: "" }];
      }
      dayData = dayData.filter((_, i) => i !== index);
      if (dayData.length === 0) {
        dayData = [{ start: "", end: "" }];
      }
      return {
        ...prev,
        [type]: {
          ...typeData,
          [day]: dayData,
        },
      };
    });
  };

  const computeAvailability = () => {
    const activeDays = [];
    let earliest = null;
    let latest = null;

    daysOfWeek.forEach((day) => {
      if (formData.leave_days.includes(day)) return;

      const slotsForDay = [];
      [formData.clinic_slots, formData.video_slots, formData.home_slots].forEach(typeObj => {
        let dData = typeObj?.[day];
        if (dData) {
          if (Array.isArray(dData)) {
            slotsForDay.push(...dData);
          } else {
            slotsForDay.push(dData);
          }
        }
      });

      if (slotsForDay.length === 0) return;

      let hasValidSlot = false;
      slotsForDay.forEach((slot) => {
        if (slot.start) {
          hasValidSlot = true;
          if (!earliest || slot.start < earliest) earliest = slot.start;
        }
        if (slot.end) {
          hasValidSlot = true;
          if (!latest || slot.end > latest) latest = slot.end;
        }
      });
      
      if (hasValidSlot) {
        activeDays.push(day);
      }
    });

    return {
      availableDays: activeDays,
      availableTime:
        earliest && latest
          ? { start: earliest, end: latest }
          : undefined,
    };
  };

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (!formData.doctor_name)
          newErrors.doctor_name = "Doctor name is required";
        if (!formData.email) newErrors.email = "Email is required";
        else if (!/\S+@\S+\.\S+/.test(formData.email))
          newErrors.email = "Email is invalid";
        if (!formData.phone) newErrors.phone = "Phone is required";
        else if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\D/g, "")))
          newErrors.phone = "Please enter a valid 10-digit Indian phone number";
        if (!formData.qualification.length)
          newErrors.qualification = "At least one qualification is required";
        if (!formData.doctor_registration_no)
          newErrors.doctor_registration_no = "Registration number is required";
        // KYC is now mandatory
        if (!kycCompleted) {
          newErrors.kyc_data = "DigiLocker KYC verification is required to proceed";
        }
        break;

      case 3:
        // Aadhaar validation (12 digits, can contain spaces/dashes)
        if (
          formData.aadhaar &&
          !/^\d{4}\s?\d{4}\s?\d{4}$/.test(formData.aadhaar)
        )
          newErrors.aadhaar = "Please enter a valid 12-digit Aadhaar number";

        // PAN card validation
        if (formData.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan))
          newErrors.pan =
            "Please enter a valid PAN card number (e.g., ABCDE1234F)";

        // Driving License validation (basic Indian format)
        if (formData.driving_license) {
          const dlRegex = /^[A-Z]{2}\d{2}\s?\d{4}\s?\d{7}$/;
          if (!dlRegex.test(formData.driving_license.replace(/\s/g, "")))
            newErrors.driving_license =
              "Please enter a valid Driving License number";

        }

        // Professional Indemnity Insurance validation
        if (formData.insurance && formData.insurance < 0)
          newErrors.insurance = "Insurance amount cannot be negative";


        break;

      case 4:
        // Bank account validation
        if (
          formData.bank_account_number &&
          !/^\d{9,18}$/.test(formData.bank_account_number.replace(/\s/g, ""))
        )
          newErrors.bank_account_number =
            "Please enter a valid bank account number (9-18 digits)";

        // IFSC code validation
        if (
          formData.bank_ifsc_code &&
          !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.bank_ifsc_code)
        )
          newErrors.bank_ifsc_code = "Please enter a valid IFSC code";

        // Bank name validation
        if (formData.bank_name && formData.bank_name.length < 2)
          newErrors.bank_name = "Please enter a valid bank name";

        // Digital consent validation
        if (!isTokenFlow && !formData.digital_consent)
          newErrors.digital_consent = "Digital consent is required to proceed";

        break;
    }
    console.log(newErrors);
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError, { id: "validation-error" });
    }

    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Upload a single file directly via server-side Supabase upload
  const uploadFileViaSignedUrl = async (file, folder) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const res = await fetch("/api/upload/doctor-document", {
      method: "POST",
      body: formData,
    });

    const result = await res.json();
    if (!result.success) {
      throw new Error(result.message || "Failed to upload file");
    }

    return result.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(currentStep)) return;

    try {
      setLoading(true);
      toast.loading("Preparing your application...", { id: "loading" });

      // Identify scalar single-file fields
      const singleFileFields = [
        { key: "address_proof", apiKey: "address_proof", folder: "address-proofs" },
        { key: "passport_photo", apiKey: "passport_photo", folder: "passport-photos" },
        { key: "digital_signature", apiKey: "signature_url", folder: "signatures" },
      ];

      // Array multi-file fields
      const multiFileFields = [
        { key: "dmc_mci_nmc_certificates", apiKey: "dmc_mci_nmc_certificates", folder: "dmc-certificates" },
        { key: "clinic_photos", apiKey: "clinic_photos", folder: "clinic-photos" },
      ];

      // Upload all files via signed URLs
      const uploadedUrls = {};

      // Initialize array fields in uploadedUrls
      for (const { apiKey } of multiFileFields) {
        uploadedUrls[apiKey] = [];
      }

      // Collect files that need uploading
      const filesToUpload = [];

      // Process single files
      for (const { key, apiKey, folder } of singleFileFields) {
        const value = formData[key];
        if (value instanceof File) {
          filesToUpload.push({ apiKey, folder, file: value, isArray: false });
        } else if (key === "digital_signature" && typeof value === "string" && value.startsWith("data:")) {
          // Convert base64 signature to File
          const fetchRes = await fetch(value);
          const blob = await fetchRes.blob();
          const file = new File([blob], "digital_signature.png", { type: "image/png" });
          filesToUpload.push({ apiKey, folder, file, isArray: false });
        } else if (typeof value === "string" && value.startsWith("http")) {
          // Preserve existing uploaded URL
          uploadedUrls[apiKey] = value;
        }
      }

      // Process array files
      for (const { key, apiKey, folder } of multiFileFields) {
        const arr = formData[key];
        if (Array.isArray(arr) && arr.length > 0) {
          for (let i = 0; i < arr.length; i++) {
            const file = arr[i];
            if (file instanceof File) {
              filesToUpload.push({ apiKey, folder, file, isArray: true });
            } else if (typeof file === "string" && file.startsWith("http")) {
              // Preserve existing uploaded URL
              uploadedUrls[apiKey].push(file);
            }
          }
        }
      }

      if (filesToUpload.length > 0) {
        for (let i = 0; i < filesToUpload.length; i++) {
          const { apiKey, folder, file, isArray } = filesToUpload[i];
          toast.loading(`Uploading document ${i + 1} of ${filesToUpload.length}...`, { id: "loading" });
          try {
            const publicUrl = await uploadFileViaSignedUrl(file, folder);
            if (isArray) {
              uploadedUrls[apiKey].push(publicUrl);
            } else {
              uploadedUrls[apiKey] = publicUrl;
            }
          } catch (uploadErr) {
            console.error(`Failed to upload ${apiKey}:`, uploadErr);
            toast.dismiss("loading");
            toast.error(`Failed to upload ${file.name}. Please try again.`);
            setLoading(false);
            return;
          }
        }
      }

      toast.loading("Submitting your application...", { id: "loading" });

      // Derive available days & overall available time from slots
      const { availableDays, availableTime } = computeAvailability();

      // Start with all plain field data
      const payload = {};
      Object.entries(formData).forEach(([key, value]) => {
        // Exclude files from the JSON payload correctly
        if (
          value === null ||
          value === undefined ||
          key === "dmc_mci_nmc_certificates" ||
          key === "clinic_photos" ||
          key === "address_proof" ||
          key === "passport_photo" ||
          key === "digital_signature"
        ) {
          return;
        }
        payload[key] = value;
      });

      // Add availability data
      if (availableDays.length) {
        payload.available_days = availableDays;
      }
      if (availableTime) {
        payload.available_time = availableTime;
      }

      // Merge the uploaded file URLs
      Object.assign(payload, uploadedUrls);

      if (isTokenFlow) {
        if (!otpVerified) return toast.error("Please verify your OTP first.");
        if (!agreementChecked) return toast.error("Please accept the agreement to continue.");

        toast.loading("Saving your onboarding details...", { id: "loading" });
        try {
          const updateFormData = new FormData();
          updateFormData.append("id", doctorId);

          // Merge everything from payload into updateFormData
          Object.entries(payload).forEach(([key, value]) => {
            if (value === null || value === undefined) return;
            if (Array.isArray(value)) {
              updateFormData.append(key, JSON.stringify(value));
            } else if (typeof value === "object") {
              updateFormData.append(key, JSON.stringify(value));
            } else {
              updateFormData.append(key, value);
            }
          });

          // Append KYC verification status and data
          if (kycCompleted || formData.is_kyc) {
            updateFormData.append("kyc_status", "verified");
            if (formData.kyc_data) {
              updateFormData.append("kyc_data", JSON.stringify(formData.kyc_data));
            }
          }

          await fetch("/api/doctors/onboard/update", {
            method: "PUT",
            body: updateFormData,
          });
        } catch (err) {
          console.error("Failed to save onboarding details:", err);
        }

        await handleAcceptAgreement();
        return;
      }

      // Check if signature is empty
      if (
        !formData.digital_signature &&
        (!signatureData || isSignatureBlank(canvasRef.current))
      ) {
        setErrors((prev) => ({
          ...prev,
          digital_signature: "Digital signature is required",
        }));
        toast.error("Please provide your digital signature");
        setLoading(false);
        return;
      }

      // Send lightweight JSON to API
      const res = await fetch("/api/doctors/onboard/web", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      toast.dismiss("loading");
      if (data.status) {
        toast.success("✅ Doctor onboarded successfully!");
        // ✅ Queue confirmation notification (fire-and-forget)
        enqueueNotification("onboarding_success", {
          email: formData.email,
          phone: formData.phone,
          name: formData.full_name || formData.doctor_name || "",
          payload: {
            full_name: formData.full_name || formData.doctor_name || "",
            clinic_name: formData.clinic_name || "",
          },
        });
        // Clear localStorage on successful submission
        clearLocalStorage();
        // Redirect to animated success page
        router.push("/doctor/onboarding/success");
        setLoading(false);
      } else {
        toast.error(`❌ ${data.message || "Failed to submit"}`);
        setLoading(false);
      }
    } catch (err) {
      toast.dismiss("loading");
      console.error("Error submitting form:", err);
      toast.error("Something went wrong! Please try again.");
      setLoading(false);
    }
  };

  const progress = (currentStep / steps.length) * 100;

  // Helper to detect if a value is an image URL
  const isImageUrl = (url) =>
    typeof url === "string" &&
    /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url);

  // Helper to get a display name from a File or a URL string
  const getDisplayName = (file) =>
    file instanceof File ? file.name : String(file).split("/").pop();

  // Renders a single file item — handles both URL strings and File objects
  const FilePreviewItem = ({ file, onRemove }) => {
    const isUrl = typeof file === "string";
    const isImg = isImageUrl(file) || (file instanceof File && file.type?.startsWith("image/"));
    const name = getDisplayName(file);
    const src = isUrl ? file : file instanceof File ? URL.createObjectURL(file) : null;

    return (
      <div className="rounded-md overflow-hidden border border-gray-200 bg-[#F6F8FA]">
        {isImg && src ? (
          <>
            <img
              src={src}
              alt={name}
              className="w-full max-h-48 object-contain bg-white"
              onError={(e) => { e.target.style.display = "none"; }}
            />
            <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100">
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <CheckCircle className="w-4 h-4 text-[#0067A1] shrink-0" />
                <span className="text-xs text-gray-600 truncate">{name}</span>
              </div>
              <div className="flex items-center space-x-2 ml-2 shrink-0">
                {isUrl && (
                  <a href={file} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-white bg-[#0067A1] px-3 py-1 rounded-md hover:bg-[#004F7C] transition-colors">
                    View
                  </a>
                )}
                <button type="button" onClick={onRemove} className="text-red-500 hover:text-red-700">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="w-8 h-8 bg-[#0067A1]/10 rounded-md flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-[#0067A1]" />
              </div>
              <span className="text-sm text-gray-700 truncate">{name}</span>
            </div>
            <div className="flex items-center space-x-2 ml-2 shrink-0">
              {isUrl && (
                <a href={file} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-white bg-[#0067A1] px-3 py-1 rounded-md hover:bg-[#004F7C] transition-colors">
                  View
                </a>
              )}
              <button type="button" onClick={onRemove} className="text-red-500 hover:text-red-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const FileUploadBox = ({
    field,
    label,
    accept,
    multiple = false,
    required = false,
  }) => {
    const value = formData[field];
    const hasFiles = multiple ? Array.isArray(value) && value.length > 0 : !!value;

    return (
      <div className="border border-dashed border-gray-300 rounded-md p-4 sm:p-5 hover:border-[#0067A1] transition-colors">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {label} {required && <span className="text-red-500">*</span>}
        </label>

        <div className="text-center">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">Click to upload or drag and drop</p>
          <p className="text-sm text-gray-500">PNG, JPG, PDF up to 5MB</p>

          <input
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={(e) => handleFileUpload(field, e.target.files)}
            className="hidden"
            id={field}
          />
          <label
            htmlFor={field}
            className="inline-block mt-4 bg-[#0067A1] text-white px-4 py-2 rounded-md hover:bg-[#004F7C] cursor-pointer transition-colors text-sm font-medium"
          >
            {hasFiles ? "Replace File" : "Choose Files"}
          </label>
        </div>

        {/* File previews */}
        {hasFiles && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-gray-700 mb-2">
              {multiple ? "Uploaded files:" : "Current file:"}
            </p>
            {multiple ? (
              (value).map((file, index) => (
                <FilePreviewItem
                  key={index}
                  file={file}
                  onRemove={() => removeFile(field, index)}
                />
              ))
            ) : (
              <FilePreviewItem
                file={value}
                onRemove={() => removeFile(field, 0)}
              />
            )}
          </div>
        )}
      </div>
    );
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F6F8FA] via-white to-[#F6F8FA] py-2 sm:py-4 overflow-x-hidden">
      <div className="w-full max-w-6xl mx-auto px-2 sm:px-6 lg:px-8 min-w-0">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-3 sm:mb-4"
        >
          <div className="bg-gradient-to-r from-[#0067A1] to-[#0067A1] text-white rounded-lg p-3 sm:p-5 shadow-sm">
            <h1 className="text-xl sm:text-2xl font-bold mb-0.5 sm:mb-1.5">Doctor Onboarding Form</h1>
            <p className="text-xs sm:text-base opacity-90">
              Join our network of healthcare professionals
            </p>
          </div>
        </motion.div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-2.5 sm:p-4 mb-3 sm:mb-4">
          <div className="mb-2 sm:mb-3">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#0067A1] to-[#0067A1] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <div className="flex justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="text-center flex-1 min-w-0">
                <div
                  className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mx-auto mb-1 sm:mb-2 border-2 sm:border-4 ${currentStep > step.number
                    ? "bg-[#0067A1] border-[#0067A1] text-white"
                    : currentStep === step.number
                      ? "bg-[#0067A1] border-[#0067A1] text-white"
                      : "bg-white border-gray-300 text-gray-400"
                    }`}
                >
                  {currentStep > step.number ? (
                    <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6" />
                  ) : (
                    <step.icon className="w-4 h-4 sm:w-6 sm:h-6" />
                  )}
                </div>
                <span
                  className={`text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-semibold hidden sm:block break-normal px-1 leading-tight mt-1.5 ${currentStep >= step.number
                    ? "text-[#0067A1]"
                    : "text-gray-500"
                    }`}
                >
                  {step.title}
                </span>
              </div>
            ))}
          </div>

          {/* Mobile-only current step label */}
          <div className="text-center mt-3 block sm:hidden border-t border-gray-100 pt-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Step {currentStep} of {steps.length}
            </span>
            <span className="text-xs font-extrabold text-[#0067A1] block mt-0.5">
              {steps[currentStep - 1]?.title}
            </span>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm w-full overflow-hidden min-w-0">
          <form onSubmit={handleSubmit} className="w-full min-w-0">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 sm:p-6 min-w-0"
              >
                <div className="flex items-center mb-3 sm:mb-4">
                  <div className="w-10 h-10 bg-[#0067A1] rounded-md flex items-center justify-center mr-3">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                      Personal Information
                    </h2>
                    <p className="text-gray-600 text-sm">Tell us about yourself</p>
                  </div>
                </div>

                <fieldset>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 min-w-0">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Doctor Name *
                      </label>
                      <input
                        type="text"
                        value={formData.doctor_name}
                        onChange={(e) =>
                          handleInputChange("doctor_name", e.target.value)
                        }
                        className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all ${errors.doctor_name
                          ? "border-red-500"
                          : "border-gray-300"
                          }`}
                        placeholder="Enter full name"
                      />
                      {errors.doctor_name && (
                        <p className="text-red-500 text-sm mt-1 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.doctor_name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all ${errors.email ? "border-red-500" : "border-gray-300"
                          }`}
                        placeholder="name@example.com"
                      />
                      {errors.email && (
                        <p className="text-red-500 text-sm mt-1 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.email}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone *
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) =>
                          handleInputChange("phone", e.target.value)
                        }
                        className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all ${errors.phone ? "border-red-500" : "border-gray-300"
                          }`}
                        placeholder="+91 98765 43210"
                      />
                      {errors.phone && (
                        <p className="text-red-500 text-sm mt-1 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.phone}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Years of Experience
                      </label>
                      <select
                        value={formData.years_experience}
                        onChange={(e) =>
                          handleInputChange("years_experience", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all"
                      >
                        <option value="">Select years</option>
                        {Array.from({ length: 50 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1} Years
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Video Consultation Fee (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                        <input
                          type="number"
                          placeholder="e.g. 500"
                          value={formData.video_consultation_fee}
                          onChange={(e) =>
                            handleInputChange("video_consultation_fee", e.target.value)
                          }
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Clinic Consultation Fee (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                        <input
                          type="number"
                          placeholder="e.g. 800"
                          value={formData.clinic_consultation_fee}
                          onChange={(e) =>
                            handleInputChange("clinic_consultation_fee", e.target.value)
                          }
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Home Visit Fee (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                        <input
                          type="number"
                          placeholder="e.g. 1500"
                          value={formData.home_visit_fee}
                          onChange={(e) =>
                            handleInputChange("home_visit_fee", e.target.value)
                          }
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Qualification *
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {qualificationsList.map((qual) => (
                          <button
                            key={qual}
                            type="button"
                            onClick={() => handleArrayToggle("qualification", qual)}
                            className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${(formData.qualification || []).includes(qual)
                              ? "bg-black text-white border-black"
                              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                              }`}
                          >
                            {qual}
                          </button>
                        ))}
                      </div>
                      {errors.qualification && (
                        <p className="text-red-500 text-sm mt-1 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.qualification}
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Doctor Registration No. *
                      </label>
                      <input
                        type="text"
                        value={formData.doctor_registration_no}
                        onChange={(e) =>
                          handleInputChange(
                            "doctor_registration_no",
                            e.target.value
                          )
                        }
                        className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all ${errors.doctor_registration_no
                          ? "border-red-500"
                          : "border-gray-300"
                          }`}
                        placeholder="Registration number"
                      />
                      {errors.doctor_registration_no && (
                        <p className="text-red-500 text-sm mt-1 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.doctor_registration_no}
                        </p>
                      )}
                    </div>
                  </div>
                </fieldset>

                <div className="grid grid-cols-1 gap-6 mt-6">
                  <div className="md:col-span-2">
                    <div className="bg-[#F6F8FA] border border-teal-200 rounded-md p-4">
                      <div className="flex items-center flex-wrap justify-between gap-4">
                        <div className="flex items-center flex-wrap space-x-4 min-w-0">
                          <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                            <Shield className="w-6 h-6 text-[#0067A1]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                DigiLocker KYC Verification
                              </h3>
                              <span className="text-xs bg-red-100 text-red-700 border border-red-300 px-2 py-0.5 rounded-full font-medium">
                                Required
                              </span>
                            </div>
                            <p className="text-gray-600 text-sm">
                              Sync your Aadhaar and PAN details automatically
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          {kycCompleted ? (
                            <div className="flex items-center space-x-2 text-[#0067A1]">
                              <CheckCircle className="w-6 h-6" />
                              <span className="font-semibold">Verified</span>
                            </div>
                          ) : (
                            <motion.button
                              type="button"
                              onClick={handleDigiLockerKYC}
                              disabled={kycLoading}
                              whileHover={{ scale: kycLoading ? 1 : 1.02 }}
                              whileTap={{ scale: kycLoading ? 1 : 0.98 }}
                              className="bg-[#0067A1] text-white px-4 py-2 rounded-md hover:bg-[#004F7C] transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {kycLoading ? (
                                <div className="flex items-center space-x-2">
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  <span>Processing...</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <FileCheck className="w-4 h-4" />
                                  <span>Verify with DigiLocker</span>
                                </div>
                              )}
                            </motion.button>
                          )}
                        </div>
                      </div>

                      {kycCompleted && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="mt-4 p-4 bg-[#F6F8FA] rounded-lg border border-[#0067A1]"
                        >
                          <div className="flex items-center space-x-2 text-[#0067A1]">
                            <CheckCircle className="w-5 h-5" />
                            <span className="font-medium">
                              Your KYC has been verified successfully!
                            </span>
                          </div>
                          <p className="text-[#0067A1] text-sm mt-1">
                            Your Aadhaar and PAN details have been automatically
                            synced.
                          </p>
                        </motion.div>
                      )}
                    </div>
                    {errors.kyc_data && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.kyc_data}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end mt-4 sm:mt-6">
                  <motion.button
                    type="button"
                    onClick={nextStep}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-[#0067A1] text-white px-4 sm:px-6 py-2 rounded-md hover:bg-[#004F7C] transition-colors font-medium text-sm whitespace-nowrap"
                  >
                    Next Step
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Professional Details */}
            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 sm:p-6 min-w-0"
              >
                <fieldset>
                  <div className="flex items-center mb-3 sm:mb-4">
                    <div className="w-10 h-10 bg-green-600 rounded-md flex items-center justify-center mr-3">
                      <Award className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                        Professional Details
                      </h2>
                      <p className="text-gray-600 text-sm">
                        Your medical expertise and practice
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 sm:space-y-6">
                    {/* Specialities */}
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-gray-700 mb-2 sm:mb-3 flex items-center">
                        <Stethoscope className="w-4 h-4 mr-2 text-[#0067A1]" />
                        Specialities
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {specialityOptions.map((spec) => (
                          <button
                            key={spec}
                            type="button"
                            onClick={() => handleArrayToggle("speciality", spec)}
                            className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${(formData.speciality || []).includes(spec)
                              ? "bg-black text-white border-black"
                              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                              }`}
                          >
                            {spec}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Super Specialities */}
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-gray-700 mb-2 sm:mb-3 flex items-center">
                        <Star className="w-4 h-4 mr-2 text-[#0067A1]" />
                        Super Specialities
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {superSpecialityOptions.map((spec) => (
                          <button
                            key={spec}
                            type="button"
                            onClick={() => handleArrayToggle("super_speciality", spec)}
                            className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${(formData.super_speciality || []).includes(spec)
                              ? "bg-[#0067A1] text-white border-teal-600"
                              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                              }`}
                          >
                            {spec}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Clinic Details */}
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-gray-700 mb-3 sm:mb-4 flex items-center">
                        <Building className="w-5 h-5 mr-2 text-orange-600" />
                        Clinic Details
                      </h3>
                      <div className="space-y-3 sm:space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Clinic Address
                          </label>
                          <textarea
                            value={formData.clinic_address}
                            onChange={(e) =>
                              handleInputChange("clinic_address", e.target.value)
                            }
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-colors"
                            placeholder="Full clinic address with landmark"
                          />
                        </div>

                        {/* Additional Clinic Locations */}
                        <div className="mt-4 border-t pt-4 border-gray-200">
                          <div className="flex justify-between items-center mb-3">
                            <label className="block text-sm font-semibold text-gray-700">
                              Additional Clinic Locations
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const list = [...(formData.additional_clinics || [])];
                                list.push({ name: "", address: "", lat: "", lng: "" });
                                handleInputChange("additional_clinics", list);
                              }}
                              className="px-3 py-1 bg-[#0067A1] text-white text-xs font-semibold rounded hover:bg-[#093d39] transition"
                            >
                              + Add Location
                            </button>
                          </div>

                          {(formData.additional_clinics || []).map((clinic, idx) => (
                            <div key={idx} className="p-3 border border-gray-200 rounded-lg bg-gray-50 mb-3 space-y-3 relative">
                              <button
                                type="button"
                                onClick={() => {
                                  const list = (formData.additional_clinics || []).filter((_, i) => i !== idx);
                                  handleInputChange("additional_clinics", list);
                                }}
                                className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition"
                              >
                                <X className="w-4 h-4" />
                              </button>

                              <div className="space-y-3 pt-2">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Clinic Name
                                  </label>
                                  <input
                                    type="text"
                                    value={clinic.name || ""}
                                    onChange={(e) => {
                                      const list = [...formData.additional_clinics];
                                      list[idx].name = e.target.value;
                                      handleInputChange("additional_clinics", list);
                                    }}
                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] bg-white text-gray-900"
                                    placeholder="Branch Name"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Clinic Address
                                  </label>
                                  <textarea
                                    value={clinic.address || ""}
                                    onChange={(e) => {
                                      const list = [...formData.additional_clinics];
                                      list[idx].address = e.target.value;
                                      handleInputChange("additional_clinics", list);
                                    }}
                                    rows={2}
                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] bg-white text-gray-900"
                                    placeholder="Branch Address"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Lat / Lng - read-only, stays inside fieldset */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Latitude
                            </label>
                            <input
                              type="text"
                              value={formData.clinic_lat}
                              readOnly
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Longitude
                            </label>
                            <input
                              type="text"
                              value={formData.clinic_lng}
                              readOnly
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Availability Slots */}
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-gray-700 mb-2 sm:mb-3 flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-[#0067A1]" />
                        Weekly Availability
                      </h3>
                      <div className="w-0 min-w-full overflow-x-auto bg-gray-50 rounded-lg p-1.5 sm:p-3">
                        <table className="w-full border-collapse min-w-[800px]">
                          <thead>
                            <tr className="bg-[#0067A1] text-white">
                              <th className="border border-[#0067A1] p-3 text-left rounded-l-md">
                                Day
                              </th>
                              <th className="border border-[#0067A1] p-3 text-center">
                                Leave
                              </th>
                              <th className="border border-[#0067A1] p-3 text-center">
                                Clinic Visit
                              </th>
                              <th className="border border-[#0067A1] p-3 text-center">
                                Video Consultation
                              </th>
                              <th className="border border-[#0067A1] p-3 text-center rounded-r-md">
                                Home Visit
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {daysOfWeek.map((day) => (
                              <tr
                                key={day}
                                className="hover:bg-gray-100 transition-colors"
                              >
                                <td className="border border-gray-200 p-3 font-semibold bg-white text-sm">
                                  {day}
                                </td>
                                <td className="border border-gray-200 p-3 text-center bg-white">
                                  <input
                                    type="checkbox"
                                    checked={formData.leave_days.includes(day)}
                                    onChange={() =>
                                      handleArrayToggle("leave_days", day)
                                    }
                                    className="w-4.5 h-4.5 rounded border-gray-300 text-[#0067A1] focus:ring-[#0067A1]"
                                  />
                                </td>
                                {[
                                  "clinic_slots",
                                  "video_slots",
                                  "home_slots",
                                ].map((type) => {
                                  const rawDayData = formData[type][day];
                                  const daySlots = Array.isArray(rawDayData) ? rawDayData : (rawDayData && (rawDayData.start || rawDayData.end) ? [rawDayData] : [{ start: "", end: "" }]);
                                  
                                  return (
                                  <td
                                    key={type}
                                    className="border border-gray-200 p-3 bg-white align-top"
                                  >
                                    <div className="flex flex-col gap-2">
                                      {daySlots.map((slot, idx) => (
                                        <div key={idx} className="flex gap-1 items-center justify-center">
                                          <input
                                            type="time"
                                            value={slot.start || ""}
                                            onChange={(e) =>
                                              handleTimeSlotChange(
                                                type,
                                                day,
                                                idx,
                                                "start",
                                                e.target.value
                                              )
                                            }
                                            className="border border-gray-300 rounded-md px-1 py-1 text-xs focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] w-[110px]"
                                            disabled={formData.leave_days.includes(day)}
                                          />
                                          <span className="flex items-center text-gray-500 text-[10px]">
                                            to
                                          </span>
                                          <input
                                            type="time"
                                            value={slot.end || ""}
                                            onChange={(e) =>
                                              handleTimeSlotChange(
                                                type,
                                                day,
                                                idx,
                                                "end",
                                                e.target.value
                                              )
                                            }
                                            className="border border-gray-300 rounded-md px-1 py-1 text-xs focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] w-[110px]"
                                            disabled={formData.leave_days.includes(day)}
                                          />
                                          {type === "clinic_slots" && (
                                            <select
                                              value={slot.clinic_index || 0}
                                              disabled={formData.leave_days.includes(day)}
                                              onChange={(e) =>
                                                handleTimeSlotChange(
                                                  type,
                                                  day,
                                                  idx,
                                                  "clinic_index",
                                                  parseInt(e.target.value, 10)
                                                )
                                              }
                                              className="border border-gray-300 rounded-md px-1 py-1 text-xs focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] w-[95px] bg-white text-gray-900"
                                            >
                                              <option value={0}>{formData.clinic_name || "Primary"}</option>
                                              {(formData.additional_clinics || []).map((c, cIdx) => (
                                                <option key={cIdx + 1} value={cIdx + 1}>
                                                  {c.name || `Clinic ${cIdx + 2}`}
                                                </option>
                                              ))}
                                            </select>
                                          )}
                                          {!formData.leave_days.includes(day) && (
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveTimeSlot(type, day, idx)}
                                              className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                              title="Remove interval"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                      {!formData.leave_days.includes(day) && (
                                        <button
                                          type="button"
                                          onClick={() => handleAddTimeSlot(type, day)}
                                          className="text-xs text-[#0067A1] hover:text-[#0a3f3b] font-medium flex items-center justify-center mt-1"
                                        >
                                          + Add Interval
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                )})}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </fieldset>

                {/* ✅ Clinic Photos — genuinely OUTSIDE disabled fieldset */}
                <div className="px-0 pb-4 mt-6">
                  <h3 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-gray-700 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Clinic Photos
                  </h3>
                  <div className="border border-dashed border-gray-300 rounded-md p-4 hover:border-[#0067A1] transition-colors">
                    {/* Thumbnails */}
                    {Array.isArray(formData.clinic_photos) && formData.clinic_photos.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
                        {formData.clinic_photos.map((file, idx) => (
                          <div key={idx} className="relative group aspect-square rounded-md overflow-hidden border border-gray-200 shadow-sm">
                            <img
                              src={file instanceof File ? URL.createObjectURL(file) : file}
                              alt={`Clinic photo ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeFile("clinic_photos", idx)}
                              className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow z-10"
                            >
                              ×
                            </button>
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                              {file instanceof File ? file.name : `Photo ${idx + 1}`}
                            </div>
                          </div>
                        ))}
                        <label
                          htmlFor="clinic_photos_outer"
                          className="aspect-square rounded-md border border-dashed border-gray-300 hover:border-[#0067A1] flex flex-col items-center justify-center cursor-pointer text-gray-400 hover:text-[#0067A1] transition-colors"
                        >
                          <span className="text-3xl leading-none">+</span>
                          <span className="text-[10px] mt-1">Add More</span>
                        </label>
                      </div>
                    )}
                    {/* Empty state */}
                    {(!Array.isArray(formData.clinic_photos) || formData.clinic_photos.length === 0) && (
                      <div className="text-center py-8">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600 text-sm mb-1">Upload photos of your clinic</p>
                        <p className="text-xs text-gray-400">PNG, JPG up to 5MB each</p>
                        <label
                          htmlFor="clinic_photos_outer"
                          className="inline-block mt-3 bg-[#0067A1] text-white px-4 py-2 rounded-md hover:bg-[#004F7C] cursor-pointer transition-colors text-sm font-medium"
                        >
                          Choose Photos
                        </label>
                      </div>
                    )}
                    <input
                      type="file"
                      id="clinic_photos_outer"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleFileUpload("clinic_photos", e.target.files)}
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="flex justify-between mt-4 sm:mt-6">
                  <motion.button
                    type="button"
                    onClick={prevStep}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-gray-500 text-white px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl hover:bg-gray-600 transition-colors font-semibold shadow-md text-sm sm:text-base whitespace-nowrap"
                  >
                    Previous
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={nextStep}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-gradient-to-r from-[#0067A1] to-[#0067A1] text-white px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl hover:shadow-lg transition-all font-semibold shadow-md text-sm sm:text-base whitespace-nowrap"
                  >
                    Next Step
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Documents */}
            {currentStep === 3 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 sm:p-6 min-w-0"
              >
                <fieldset>
                  <div className="flex items-center mb-3 sm:mb-4">
                    <div className="w-10 h-10 bg-[#0067A1] rounded-md flex items-center justify-center mr-3">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                        Documents & Identity
                      </h2>
                      <p className="text-gray-600 text-sm">Upload required documents</p>
                    </div>
                  </div>

                  <div className="space-y-4 sm:space-y-6">
                    {/* Identity Documents */}
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-gray-700 mb-3 sm:mb-4">
                        Identity Documents
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Professional Indemnity Insurance (₹)
                          </label>
                          <input
                            type="number"
                            value={formData.insurance}
                            onChange={(e) =>
                              handleInputChange("insurance", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-colors"
                            placeholder="Amount in rupees"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Aadhaar Number
                          </label>
                          <input
                            type="text"
                            value={formData.aadhaar}
                            onChange={(e) =>
                              handleInputChange("aadhaar", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-colors"
                            placeholder="12-digit Aadhaar number"
                          />
                          {errors.aadhaar && (
                            <p className="text-red-500 text-sm mt-1 flex items-center">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              {errors.aadhaar}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            PAN Number
                          </label>
                          <input
                            type="text"
                            value={formData.pan}
                            onChange={(e) =>
                              handleInputChange("pan", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-colors"
                            placeholder="PAN number"
                          />
                          {errors.pan && (
                            <p className="text-red-500 text-sm mt-1 flex items-center">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              {errors.pan}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Driving License
                          </label>
                          <input
                            type="text"
                            value={formData.driving_license}
                            onChange={(e) =>
                              handleInputChange("driving_license", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-colors"
                            placeholder="Driving license number"
                          />
                          {errors.driving_license && (
                            <p className="text-red-500 text-sm mt-1 flex items-center">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              {errors.driving_license}
                            </p>
                          )}
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Address
                          </label>
                          <textarea
                            value={formData.address}
                            onChange={(e) =>
                              handleInputChange("address", e.target.value)
                            }
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-colors"
                            placeholder="Full residential address"
                          />
                          {errors.address && (
                            <p className="text-red-500 text-sm mt-1 flex items-center">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              {errors.address}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Document Uploads */}
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-gray-700 mb-3 sm:mb-4">
                        Document Uploads
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <FileUploadBox
                          field="address_proof"
                          label="Address Proof"
                          accept="image/*,.pdf"
                        />

                        <FileUploadBox
                          field="dmc_mci_nmc_certificates"
                          label="DMC/MCI/NMC Certificates"
                          accept="image/*,.pdf"
                          multiple={true}
                        />

                        <FileUploadBox
                          field="passport_photo"
                          label="Passport Photo"
                          accept="image/*"
                        />
                      </div>
                    </div>
                  </div>
                </fieldset>

                {/* ── Digital Signature — always editable, even in token flow ── */}
                <div className="mt-8">
                  <div className="border border-dashed border-teal-200 rounded-md p-4 bg-teal-50/10 hover:border-[#0067A1] transition-colors">
                    <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#0067A1]" />
                      Digital Signature <span className="text-red-500">*</span>
                    </label>

                    {/* Show existing signature_url from token OR newly drawn/uploaded signature */}
                    {(formData.signature_url || formData.digital_signature) ? (
                      <div className="space-y-3">
                        <div className="bg-white rounded-md border border-teal-200 overflow-hidden">
                          <img
                            src={formData.digital_signature || formData.signature_url}
                            alt="Digital Signature"
                            className="w-full max-h-32 object-contain p-3 bg-white"
                            onError={(e) => { e.target.style.display = "none"; }}
                          />
                          <div className="flex items-center justify-between px-4 py-2 bg-[#0067A1]/5 border-t border-teal-100">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4 text-[#0067A1]" />
                              <span className="text-sm font-medium text-[#0067A1]">Signature saved</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setShowSignatureModal(true)}
                                className="text-xs text-white bg-[#0067A1] px-3 py-1.5 rounded-md hover:bg-[#004F7C] transition-colors font-medium"
                              >
                                Re-sign
                              </button>
                              <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, signature_url: "", digital_signature: "" }))}
                                className="text-xs text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors font-medium border border-red-200"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <div className="w-14 h-14 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <FileText className="w-7 h-7 text-[#0067A1]" />
                        </div>
                        <p className="text-gray-600 mb-1 font-medium">Your digital signature is required</p>
                        <p className="text-gray-500 text-sm mb-4">Draw, type, or upload your signature</p>
                        <button
                          type="button"
                          onClick={() => setShowSignatureModal(true)}
                          className="bg-[#0067A1] text-white px-4 py-2 rounded-md hover:bg-[#004F7C] transition-colors font-medium text-sm"
                        >
                          ✍️ Create Signature
                        </button>
                        {errors.digital_signature && (
                          <p className="text-red-500 text-sm mt-3 flex items-center justify-center">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            {errors.digital_signature}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between mt-4 sm:mt-6">
                  <motion.button
                    type="button"
                    onClick={prevStep}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors font-semibold text-sm whitespace-nowrap"
                  >
                    Previous
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={nextStep}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-[#0067A1] text-white px-4 py-2 rounded-md hover:bg-[#004F7C] transition-colors font-semibold text-sm whitespace-nowrap"
                  >
                    Next Step
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Bank & Agreements */}
            {currentStep === 4 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 sm:p-6 min-w-0"
              >
                <div className="flex items-center mb-3 sm:mb-4">
                  <div className="w-10 h-10 bg-orange-600 rounded-md flex items-center justify-center mr-3">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                      Bank Details & Agreements
                    </h2>
                    <p className="text-gray-600 text-sm">Finalize your application</p>
                  </div>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  {/* Bank Details */}
                  <fieldset>
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-gray-700 mb-3 sm:mb-4">
                        Bank Details
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Account Holder Name
                          </label>
                          <input
                            type="text"
                            value={formData.bank_account_name || ""}
                            onChange={(e) =>
                              handleInputChange(
                                "bank_account_name",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-colors"
                            placeholder="Enter full name as per bank records"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Bank Account Number
                          </label>
                          <input
                            type="text"
                            value={formData.bank_account_number}
                            onChange={(e) =>
                              handleInputChange(
                                "bank_account_number",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-colors"
                            placeholder="Account number"
                          />
                          {errors.bank_account_number && (
                            <p className="text-red-500 text-sm mt-1 flex items-center">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              {errors.bank_account_number}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Bank IFSC Code
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={formData.bank_ifsc_code}
                              onChange={(e) => {
                                handleInputChange("bank_ifsc_code", e.target.value.toUpperCase());
                                setIfscFetchError("");
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-colors uppercase"
                              placeholder="e.g. HDFC0001234"
                            />
                            <button
                              type="button"
                              onClick={fetchBankFromIfsc}
                              disabled={isFetchingIfsc}
                              className="px-3 py-2 bg-[#0067A1] text-white rounded-md text-sm font-semibold hover:bg-[#09403c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1.5"
                            >
                              {isFetchingIfsc ? (
                                <><Loader2 className="w-3 h-3 animate-spin" /> Fetching...</>
                              ) : "Fetch Details"}
                            </button>
                          </div>
                          {ifscFetchError && (
                            <p className="text-red-500 text-sm mt-1 flex items-center">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              {ifscFetchError}
                            </p>
                          )}
                          {errors.bank_ifsc_code && (
                            <p className="text-red-500 text-sm mt-1 flex items-center">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              {errors.bank_ifsc_code}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Bank Name
                          </label>
                          <input
                            type="text"
                            value={formData.bank_name || ""}
                            onChange={(e) => handleInputChange("bank_name", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-colors"
                            placeholder="Auto-filled after IFSC lookup (or enter manually)"
                          />
                          {errors.bank_name && (
                            <p className="text-red-500 text-sm mt-1 flex items-center">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              {errors.bank_name}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Bank Branch
                          </label>
                          <input
                            type="text"
                            value={formData.bank_branch || ""}
                            onChange={(e) => handleInputChange("bank_branch", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-colors"
                            placeholder="Auto-filled after IFSC lookup (or enter manually)"
                          />
                          {errors.bank_branch && (
                            <p className="text-red-500 text-sm mt-1 flex items-center">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              {errors.bank_branch}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* BPL Service */}
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-gray-700 mb-3 sm:mb-4">
                        BPL Service Option
                      </h3>
                      <div className="bg-[#F6F8FA] p-4 rounded-lg border border-gray-200">
                        <label className="flex items-center space-x-4 cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={formData.bpl_service_agreement}
                              onChange={(e) =>
                                handleInputChange(
                                  "bpl_service_agreement",
                                  e.target.checked
                                )
                              }
                              className="w-5 h-5 rounded border border-gray-300 text-[#0067A1] focus:ring-[#0067A1]"
                            />
                          </div>
                          <div>
                            <span className="text-base font-semibold text-gray-700">
                              Agree to see BPL patients (Video consult only)
                            </span>
                            <p className="text-gray-600 text-sm mt-1">
                              Help underserved communities by providing affordable
                              healthcare
                            </p>
                          </div>
                        </label>
                        {formData.bpl_service_agreement && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="mt-4"
                          >
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Preferred time for BPL service
                            </label>
                            <input
                              type="text"
                              value={formData.bpl_preferred_time}
                              onChange={(e) =>
                                handleInputChange(
                                  "bpl_preferred_time",
                                  e.target.value
                                )
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-colors"
                              placeholder="e.g., Monday-Friday 2PM-4PM"
                            />
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </fieldset>

                  {/* Agreements */}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
                      Agreements & Verification
                    </h3>

                    {isTokenFlow ? (
                      <div className="space-y-6">
                        {/* KYC is mandatory — must be completed before proceeding */}
                        <>
                          {/* OTP Section */}
                          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-200">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                              <Phone className="w-5 h-5 mr-2 text-[#0067A1]" />
                              Phone Number Verification
                            </h3>
                            <div className="space-y-4">
                              <p className="text-gray-600 text-sm sm:text-base">
                                Verify your registered phone number: <span className="font-semibold text-gray-800">{phoneParam}</span>
                              </p>

                              <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                  type="text"
                                  maxLength="6"
                                  value={otp}
                                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                  disabled={!otpSent || otpVerified}
                                  placeholder="Enter 6-digit OTP"
                                  className="w-full sm:flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
                                />
                                {otpVerified ? (
                                  <button
                                    type="button"
                                    disabled
                                    className="w-full sm:w-auto px-4 py-2 bg-teal-50 text-[#004F7C] rounded-md font-medium flex items-center justify-center border border-teal-200 text-sm"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1.5 text-[#0067A1]" />
                                    Verified
                                  </button>
                                ) : !otpSent ? (
                                  <button
                                    type="button"
                                    onClick={handleSendOtp}
                                    disabled={otpSending}
                                    className="w-full sm:w-auto px-4 py-2 bg-[#0067A1] text-white rounded-md font-medium hover:bg-[#004F7C] disabled:opacity-50 transition-colors flex items-center justify-center text-sm"
                                  >
                                    {otpSending ? 'Sending...' : 'Send OTP'}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={handleVerifyOtp}
                                    disabled={otpVerifying || otp.length !== 6}
                                    className="w-full sm:w-auto px-4 py-2 bg-[#0067A1] text-white rounded-md font-medium hover:bg-[#004F7C] disabled:opacity-50 transition-colors flex items-center justify-center text-sm"
                                  >
                                    {otpVerifying ? 'Verifying...' : 'Verify'}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Agreement Modal Trigger */}
                          {otpVerified && (
                            <div className="bg-white p-4 sm:p-5 rounded-lg border border-gray-200 shadow-sm">
                              <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center">
                                <Shield className="w-4 h-4 mr-2 text-[#0067A1]" />
                                Professional Agreement
                              </h3>
                              <p className="text-xs text-gray-500 mb-4">
                                Please read and accept the terms of service to complete your onboarding.
                              </p>

                              <div className="flex flex-col items-center justify-center p-6 border border-dashed border-gray-300 rounded-lg bg-gray-50/50 mb-4">
                                <FileText className="w-10 h-10 text-gray-400 mb-2" />
                                <p className="text-gray-700 font-semibold mb-0.5 text-center text-sm">MediConnect Professional Agreement</p>
                                <p className="text-gray-500 text-xs mb-3 text-center">Version 1.0 (Required for compliance)</p>
                                <button
                                  type="button"
                                  onClick={() => setShowAgreementModal(true)}
                                  className="px-4 py-2 bg-[#0067A1] hover:bg-[#004F7C] text-white font-semibold rounded-md text-sm transition-colors flex items-center"
                                >
                                  Read & Accept Agreement
                                </button>
                              </div>

                              {agreementChecked && (
                                <div className="p-3 bg-teal-50 border border-teal-100 rounded-md flex items-center text-[#003358] font-medium text-sm">
                                  <CheckCircle className="w-4 h-4 mr-2 text-[#0067A1] shrink-0" />
                                  <span>Agreement reviewed and accepted.</span>
                                </div>
                              )}
                            </div>
                          )}

                        </>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md hover:bg-gray-100 cursor-pointer border border-gray-200 transition-colors">
                          <input
                            type="checkbox"
                            checked={formData.non_disclosure_agreement}
                            onChange={(e) =>
                              handleInputChange(
                                "non_disclosure_agreement",
                                e.target.checked
                              )
                            }
                            className="w-5 h-5 rounded border border-gray-300 text-[#0067A1] focus:ring-[#0067A1]"
                          />
                          <div>
                            <span className="font-semibold text-gray-700 text-sm">
                              Non-Disclosure Agreement (NDA)
                            </span>
                            <p className="text-gray-500 text-xs mt-0.5">
                              I agree to maintain confidentiality of patient
                              information
                            </p>
                          </div>
                        </label>

                        <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md hover:bg-gray-100 cursor-pointer border border-gray-200 transition-colors">
                          <input
                            type="checkbox"
                            checked={formData.terms_conditions_agreement}
                            onChange={(e) =>
                              handleInputChange(
                                "terms_conditions_agreement",
                                e.target.checked
                              )
                            }
                            className="w-5 h-5 rounded border border-gray-300 text-[#0067A1] focus:ring-[#0067A1]"
                          />
                          <div>
                            <span className="font-semibold text-gray-700 text-sm">
                              Terms & Conditions
                            </span>
                            <p className="text-gray-500 text-xs mt-0.5">
                              I agree to the platform terms and conditions
                            </p>
                          </div>
                        </label>

                        <div className="bg-[#F6F8FA] p-4 rounded-md border border-teal-200">
                          <label className="flex items-start space-x-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.digital_consent}
                              onChange={(e) =>
                                handleInputChange(
                                  "digital_consent",
                                  e.target.checked
                                )
                              }
                              className="w-5 h-5 rounded border border-gray-300 text-[#0067A1] focus:ring-[#0067A1] mt-0.5"
                              required
                            />
                            <div className="flex-1">
                              <span className="font-semibold text-gray-700 text-sm">
                                Digital Consent & Declaration
                              </span>
                              <p className="text-gray-500 text-xs mt-1">
                                I consent to the{" "}
                                <button
                                  type="button"
                                  onClick={() => setShowConsentModal(true)}
                                  className="text-[#0067A1] hover:text-[#0067A1] underline font-medium"
                                >
                                  platform terms and conditions
                                </button>
                                , and confirm that all information provided is
                                accurate to the best of my knowledge.
                              </p>
                              {errors.digital_consent && (
                                <p className="text-red-500 text-xs mt-1.5 flex items-center">
                                  <AlertCircle className="w-3.5 h-3.5 mr-1" />
                                  {errors.digital_consent}
                                </p>
                              )}
                            </div>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between mt-4 sm:mt-6">
                  <motion.button
                    type="button"
                    onClick={prevStep}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors font-semibold text-sm whitespace-nowrap"
                  >
                    Previous
                  </motion.button>
                  <motion.button
                    type="submit"
                    disabled={loading || (isTokenFlow && (!otpVerified || !agreementChecked))}
                    whileHover={{ scale: loading ? 1 : 1.02 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    className="bg-[#0067A1] text-white px-4 py-2 rounded-md hover:bg-[#004F7C] transition-colors font-semibold text-sm whitespace-nowrap"
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Submitting...</span>
                      </div>
                    ) : isTokenFlow ? (
                      "Complete Onboarding"
                    ) : (
                      "Submit Application"
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </form>
        </div>
      </div>

{/* KYC Mismatch Modal */}
      <AnimatePresence>
        {showKycMismatchModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 shadow-lg mx-4"
            >
              <div className="bg-orange-600 text-white p-4 sm:p-5 flex-shrink-0">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-bold">KYC Data Mismatch</h3>
                    <p className="text-xs opacity-90">We found some discrepancies between your form data and KYC records</p>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5 flex-1 overflow-y-auto">
                <div className="mb-4">
                  <p className="text-gray-700 text-sm mb-4">
                    Your KYC verification was successful, but we found some differences between the information
                    you provided and the official records. Please review the mismatches below:
                  </p>

                  <div className="space-y-3">
                    {kycMismatches.map((mismatch, index) => (
                      <motion.div
                        key={mismatch.field}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="border border-orange-200 rounded-md p-3.5 bg-orange-50/50"
                      >
                        <div className="flex items-center space-x-2.5 mb-2.5">
                          <AlertTriangle className="w-4 h-4 text-orange-600" />
                          <h4 className="font-semibold text-orange-850 text-sm">{mismatch.label}</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block font-medium text-gray-500 mb-1">
                              Your Input
                            </label>
                            <div className="bg-white p-2.5 rounded border border-gray-200">
                              <span className="text-gray-700 font-medium">{mismatch.currentValue}</span>
                            </div>
                          </div>

                          <div>
                            <label className="block font-medium text-gray-500 mb-1">
                              KYC Record
                            </label>
                            <div className="bg-white p-2.5 rounded border border-gray-200">
                              <span className="text-gray-700 font-medium">{mismatch.kycValue}</span>
                            </div>
                          </div>
                        </div>

                        <p className="text-orange-700 text-[11px] mt-2 flex items-center">
                          <Info className="w-3.5 h-3.5 mr-1" />
                          {mismatch.type === 'aadhaar'
                            ? 'Last 4 digits comparison'
                            : 'Please ensure this matches your official documents'}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#F6F8FA] border border-teal-200 rounded-md p-3">
                  <div className="flex items-start space-x-2.5">
                    <Info className="w-4 h-4 text-[#0067A1] mt-0.5" />
                    <div>
                      <h5 className="font-semibold text-[#0067A1] text-sm mb-0.5">Recommendation</h5>
                      <p className="text-[#0067A1] text-xs leading-relaxed">
                        For verification purposes, we recommend using the official KYC data.
                        However, you can choose to keep your existing information if you believe it's correct.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-5 py-3.5 flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:space-x-3 border-t border-gray-100">
                <button
                  onClick={() => handleKycMismatchDecision(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-755 rounded-md hover:bg-gray-100 transition-colors font-semibold text-xs"
                >
                  Keep My Data
                </button>
                <button
                  onClick={() => handleKycMismatchDecision(true)}
                  className="px-4 py-2 bg-[#0067A1] text-white rounded-md hover:bg-[#004F7C] transition-colors font-semibold text-xs"
                >
                  Use KYC Data
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Signature Modal */}
      <AnimatePresence>
        {showSignatureModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-250 shadow-lg mx-4"
            >
              <div className="bg-[#0067A1] text-white p-4 sm:p-5 flex-shrink-0">
                <h3 className="text-lg sm:text-xl font-bold">Digital Signature</h3>
                <p className="text-xs opacity-90">Create your signature</p>
              </div>

              <div className="p-4 sm:p-5 overflow-y-auto flex-1">
                <div className="border-b border-gray-200 mb-4">
                  <div className="flex space-x-6">
                    <button
                      onClick={() => setActiveSignatureTab("draw")}
                      className={`pb-3 px-1 border-b-2 font-semibold text-sm transition-colors ${activeSignatureTab === "draw"
                        ? "border-[#0067A1] text-[#0067A1]"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                      Draw Signature
                    </button>
                    <button
                      onClick={() => setActiveSignatureTab("upload")}
                      className={`pb-3 px-1 border-b-2 font-semibold text-sm transition-colors ${activeSignatureTab === "upload"
                        ? "border-[#0067A1] text-[#0067A1]"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                      Upload Signature
                    </button>
                  </div>
                </div>

                {activeSignatureTab === "draw" && (
                  <div>
                    <p className="text-gray-650 text-xs mb-3">
                      Draw your signature in the box below:
                    </p>
                    <div className="border border-gray-300 rounded bg-white">
                      <canvas
                        ref={canvasRef}
                        className="w-full h-40 sm:h-64 border border-gray-250 rounded bg-white cursor-crosshair touch-none"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          startDrawing(e.touches[0]);
                        }}
                        onTouchMove={(e) => {
                          e.preventDefault();
                          draw(e.touches[0]);
                        }}
                        onTouchEnd={stopDrawing}
                      />
                    </div>
                    <div className="mt-3 flex justify-between items-center">
                      <button
                        onClick={clearSignature}
                        className="bg-gray-500 text-white px-4 py-1.5 rounded hover:bg-gray-600 transition-colors flex items-center space-x-1.5 text-xs font-semibold"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Clear</span>
                      </button>
                      <p className="text-xs text-gray-550">
                        Draw your signature clearly
                      </p>
                    </div>
                  </div>
                )}

                {activeSignatureTab === "upload" && (
                  <div>
                    <p className="text-gray-650 text-xs mb-3">
                      Upload your signature image:
                    </p>
                    <div className="border border-dashed border-gray-300 rounded-md p-6 text-center">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-650 text-xs mb-2">
                        PNG or JPG files only
                      </p>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg"
                        onChange={handleSignatureUpload}
                        className="w-full max-w-xs mx-auto text-xs"
                      />
                      {signatureData && (
                        <div className="mt-3">
                          <p className="text-[#0067A1] font-semibold text-xs mb-1.5">
                            Preview:
                          </p>
                          <img
                            src={signatureData}
                            alt="Signature preview"
                            className="max-h-24 mx-auto border rounded"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 p-4 flex justify-end space-x-3 border-t border-gray-100 flex-shrink-0">
                <button
                  onClick={() => setShowSignatureModal(false)}
                  className="px-4 py-2 text-xs text-gray-600 hover:text-gray-800 transition-colors font-semibold hover:bg-gray-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={saveSignature}
                  className="bg-[#0067A1] text-white px-4 py-2 text-xs rounded-md hover:bg-[#004F7C] transition-colors font-semibold"
                >
                  Save Signature
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Consent Modal */}
      <AnimatePresence>
        {showConsentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 mx-4 shadow-xl"
            >
              {/* Header */}
              <div className="relative bg-[#0067A1] text-white p-4 sm:p-6 flex-shrink-0 overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-10 h-10 bg-white/10 rounded-md flex items-center justify-center backdrop-blur-sm">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-white">
                        Platform Compliance & Terms
                      </h3>
                      <p className="text-teal-100 text-xs sm:text-sm mt-0.5">
                        MediConnect.fit Regulatory Compliance Framework
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-teal-200">
                    <div className="flex items-center space-x-1.5">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span>100% Compliant</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
                      <span>Healthcare Standards</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
                      <span>Data Protection</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-emerald-50/20 border border-emerald-200/50 rounded-md p-4 text-center">
                    <CheckCircle className="w-8 h-8 text-[#0067A1] mx-auto mb-2" />
                    <h4 className="font-bold text-[#0067A1] text-base">
                      Full Compliance
                    </h4>
                    <p className="text-[#0067A1] text-xs">
                      All regulatory requirements met
                    </p>
                  </div>
                  <div className="bg-cyan-50/20 border border-cyan-200/50 rounded-md p-4 text-center">
                    <FileCheck className="w-8 h-8 text-[#0067A1] mx-auto mb-2" />
                    <h4 className="font-bold text-[#0067A1] text-base">
                      13 Standards
                    </h4>
                    <p className="text-[#0067A1] text-xs">
                      Healthcare regulations covered
                    </p>
                  </div>
                  <div className="bg-purple-50/20 border border-purple-200/50 rounded-md p-4 text-center">
                    <Award className="w-8 h-8 text-[#0067A1] mx-auto mb-2" />
                    <h4 className="font-bold text-[#0067A1] text-base">
                      Certified Secure
                    </h4>
                    <p className="text-[#0067A1] text-xs">
                      Data protection certified
                    </p>
                  </div>
                </div>

                {/* Compliance Table */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto scrollbar-thin-x">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="p-4 text-left">
                            <div className="flex items-center space-x-2">
                              <FileText className="w-4 h-4 text-[#0067A1]" />
                              <span className="font-semibold text-gray-700 text-sm">
                                Regulatory Area
                              </span>
                            </div>
                          </th>
                          <th className="p-4 text-left">
                            <div className="flex items-center space-x-2">
                              <Shield className="w-4 h-4 text-[#0067A1]" />
                              <span className="font-semibold text-gray-700 text-sm">
                                Requirement
                              </span>
                            </div>
                          </th>
                          <th className="p-4 text-center">
                            <div className="flex items-center space-x-2 justify-center">
                              <CheckCircle className="w-4 h-4 text-[#0067A1]" />
                              <span className="font-semibold text-gray-700 text-sm">
                                Status
                              </span>
                            </div>
                          </th>
                          <th className="p-4 text-left">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-gray-700 text-sm">
                                Reference
                              </span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {[
                          {
                            area: "Telemedicine Practice Guidelines, 2020",
                            requirement:
                              "Adherence to NMC/MCI Telemedicine Guidelines for Video Consultations, In-Clinic, and Home Visits",
                            reference:
                              "https://www.nmc.org.in/rules-regulations/telemedicine-practice-guidelines-2020.pdf",
                          },
                          {
                            area: "ABHA (Ayushman Bharat Health Account)",
                            requirement:
                              "Integration for patient identification and health record linkage",
                            reference: "https://abdm.gov.in/",
                          },
                          {
                            area: "Digital Personal Data Protection Act (DPDP), 2023",
                            requirement:
                              "Compliance with data privacy, consent management, and data subject rights",
                            reference:
                              "https://www.meity.gov.in/data-protection-framework",
                          },
                          {
                            area: "Information Technology Act, 2000 (IT Act)",
                            requirement:
                              "Adherence to digital signature, cybersecurity, and electronic records standards",
                            reference:
                              "https://www.meity.gov.in/content/information-technology-act-2000",
                          },
                          {
                            area: "Clinical Establishments Act, 2010",
                            requirement:
                              "Compliance for in-clinic and home visit services",
                            reference:
                              "https://main.mohfw.gov.in/Organisation/Departments-of-Health-and-Family-Welfare/clinical-establishments",
                          },
                          {
                            area: "Drugs & Cosmetics Act, 1940",
                            requirement:
                              "Restrictions on prescription of Schedule X and narcotics for home visits",
                            reference:
                              "https://cdsco.gov.in/opencms/opencms/en/Acts-Rules/",
                          },
                          {
                            area: "Indian Medical Council Regulations, 2002",
                            requirement:
                              "Adherence to ethical guidelines for medical practitioners",
                            reference:
                              "https://www.nmc.org.in/rules-regulations/code-of-medical-ethics-regulations-2002/",
                          },
                          {
                            area: "Digital Health Standards (ABDM, NHA)",
                            requirement:
                              "Compliance with National Digital Health Mission standards",
                            reference: "https://abdm.gov.in/standards",
                          },
                          {
                            area: "Accessibility Standards (DISHA, STQC)",
                            requirement:
                              "Compliance with digital accessibility norms for persons with disabilities",
                            reference: "https://www.stqc.gov.in/",
                          },
                          {
                            area: "Consent Management",
                            requirement:
                              "Implementation of digital consent protocols for all services",
                            reference: "https://abdm.gov.in/",
                          },
                          {
                            area: "Audit Trails & Record Keeping",
                            requirement:
                              "Maintenance of digital logs for consultations and prescriptions",
                            reference: "https://abdm.gov.in/",
                          },
                          {
                            area: "Insurance & Liability",
                            requirement:
                              "Verification of professional indemnity insurance coverage",
                            reference: "https://www.irdai.gov.in/",
                          },
                          {
                            area: "Platform Exclusivity Agreement",
                            requirement:
                              "Enforcement of non-solicitation and platform communication policies",
                            reference:
                              "https://www.nmc.org.in/rules-regulations/code-of-medical-ethics-regulations-2002/",
                          },
                        ].map((item, index) => (
                          <motion.tr
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                          >
                            <td className="p-4">
                              <div className="flex items-start space-x-2">
                                <div className="w-7 h-7 bg-teal-50 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border border-teal-150">
                                  <span className="text-[#0067A1] font-semibold text-xs">
                                    {index + 1}
                                  </span>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-800 text-xs sm:text-sm group-hover:text-[#0067A1] transition-colors">
                                    {item.area}
                                  </h4>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="text-gray-655 leading-relaxed text-xs">
                                {item.requirement}
                              </p>
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex justify-center">
                                <span className="inline-flex items-center space-x-1 bg-green-50 text-[#0067A1] px-2.5 py-0.5 rounded-md text-xs font-semibold border border-green-200">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Compliant</span>
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <a
                                href={item.reference}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-1.5 text-[#0067A1] hover:text-[#0067A1] font-medium text-xs transition-colors group/link"
                              >
                                <span>View Reference</span>
                                <svg
                                  className="w-3.5 h-3.5 transform group-hover/link:translate-x-0.5 transition-transform"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                  />
                                </svg>
                              </a>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="mt-6 bg-[#F6F8FA] border border-teal-200/50 rounded-md p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-teal-50 rounded flex items-center justify-center flex-shrink-0 border border-teal-200">
                      <Info className="w-5 h-5 text-[#0067A1]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-1 text-sm">
                        Your Data is Protected
                      </h4>
                      <p className="text-gray-500 text-xs leading-relaxed">
                        MediConnect.fit adheres to the highest standards of data
                        protection and healthcare compliance. All patient data
                        is encrypted, and our platform undergoes regular
                        security audits to ensure complete compliance with
                        Indian healthcare regulations and data protection laws.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
                <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <div className="flex items-center space-x-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#0067A1]" />
                      <span>Secure & Compliant</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#0067A1]" />
                      <span>Healthcare Certified</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setShowConsentModal(false)}
                      className="px-4 py-2 text-gray-650 hover:text-gray-800 font-medium transition-colors text-xs rounded hover:bg-gray-100"
                    >
                      Learn More
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowConsentModal(false)}
                      className="bg-[#0067A1] text-white px-4 py-2 rounded-md font-semibold text-xs hover:bg-[#004F7C] transition-colors"
                    >
                      I Understand & Agree
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Professional Agreement Modal */}
      <AnimatePresence>
        {showAgreementModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden border border-gray-200 shadow-xl flex flex-col"
            >
              <div className="bg-[#0067A1] text-white p-4 sm:p-5 shrink-0 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <Shield className="w-6 h-6" />
                  <div>
                    <h3 className="text-lg font-bold">Professional Agreement</h3>
                    <p className="text-teal-100 text-xs">Please read all sections carefully</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAgreementModal(false)}
                  className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-6 bg-white">
                {agreementCards.map((card, idx) => (
                  <div key={idx}>
                    <h4 className="text-sm font-bold text-gray-900 mb-1.5">{card.title}</h4>
                    <p className="text-gray-700 whitespace-pre-line leading-relaxed text-xs sm:text-sm">{formatContent(card.content)}</p>
                  </div>
                ))}
              </div>

              <div className="bg-gray-50 border-t border-gray-200 p-4 sm:p-5 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-start flex-1">
                  <input
                    type="checkbox"
                    id="modalAgree"
                    checked={agreementChecked}
                    onChange={(e) => setAgreementChecked(e.target.checked)}
                    className="mt-0.5 w-4.5 h-4.5 rounded border border-gray-300 text-[#0067A1] focus:ring-[#0067A1]"
                  />
                  <label htmlFor="modalAgree" className="ml-2.5 text-xs text-gray-700 font-medium cursor-pointer">
                    I confirm that I have read, understood, and agree to abide by the MediConnect Professional Agreement and platform policies.
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (agreementChecked) {
                      setShowAgreementModal(false);
                      toast.success("Agreement Accepted!");
                    } else {
                      toast.error("Please accept the agreement to continue.");
                    }
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-[#0067A1] hover:bg-[#004F7C] text-white font-semibold rounded-md transition-colors flex items-center justify-center shrink-0 disabled:opacity-50 text-sm"
                  disabled={!agreementChecked}
                >
                  <CheckCircle className="w-4 h-4 mr-1.5" />
                  I Accept
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
