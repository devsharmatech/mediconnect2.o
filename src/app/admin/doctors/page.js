"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Download,
  Plus,
  RefreshCw,
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Star,
  Award,
  Building,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  FileText,
  Shield,
  CreditCard,
  BadgeCheck,
  Clock4,
  GraduationCap,
  Stethoscope,
  Upload,
  X,
  ClipboardList,
  ShieldCheck,
  FileCheck,
  Home,
  ShieldAlert,
  FileJson,
  FileSpreadsheet,
} from "lucide-react";

// Helper to display array-or-string (or JSON) fields nicely
const formatArrayOrString = (value, fallback = "N/A") => {
  if (value == null) return fallback;

  // Already an array
  if (Array.isArray(value)) {
    if (value.length === 0) return fallback;
    return value.join(", ");
  }

  // Try to handle JSON strings like '["MBBS","MD"]'
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return fallback;

    if ((trimmed.startsWith("[") && trimmed.endsWith("]")) ||
      (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          if (parsed.length === 0) return fallback;
          return parsed.join(", ");
        }
      } catch {
        // Fall back to raw string
      }
    }

    return trimmed;
  }

  // Fallback for unexpected types (e.g. object)
  try {
    const asString = String(value).trim();
    return asString || fallback;
  } catch {
    return fallback;
  }
};

const formatDoctorUnId = (unId) => {
  if (!unId && unId !== 0) return "N/A";
  const clean = String(unId).toUpperCase().trim();
  if (clean.startsWith("DMC-")) return clean;
  if (/^\d+$/.test(clean)) {
    return `DMC-${clean.padStart(4, "0")}`;
  }
  return `DMC-${clean}`;
};

// Onboarding Modal Component
function OnboardingModal({ isOpen, onClose, doctor, onSave }) {
  const [formData, setFormData] = useState({
    // Core fields (match doctor-onboarding defaultFormData)
    doctor_name: "",
    email: "",
    phone: "",
    qualification: [],
    doctor_registration_no: "",
    years_experience: "",
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
    // Admin-only additional fields
    clinic_name: "",
    available_days: [],
    video_consultation_fee: "",
    clinic_consultation_fee: "",
    home_visit_fee: "",
    onboarding_status: "pending",
    additional_clinics: [],
  });

  // State for existing uploaded documents (URLs from database)
  const [existingDocs, setExistingDocs] = useState({
    dmc_mci_certificate: [],
    aadhaar_pan_license: [],
    address_proof: [],
    passport_photo: [],
    clinic_photos: [],
    signature_url: null,
  });

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localErrors, setLocalErrors] = useState({});

  const checkExistence = async (field, value) => {
    if (!value) return;
    try {
      const res = await fetch(`/api/doctors/check-exists?${field}=${encodeURIComponent(value)}${doctor ? `&excludeId=${doctor.id}` : ''}`);
      const data = await res.json();
      if (data.exists) {
        setLocalErrors(prev => ({ ...prev, [field]: data.message }));
      } else {
        setLocalErrors(prev => ({ ...prev, [field]: null }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // File states
  const [aadhaar_pan_license_file, setAadhaarPanLicenseFile] = useState(null);
  const [address_proof_file, setAddressProofFile] = useState(null);
  const [passport_photo_file, setPassportPhotoFile] = useState(null);
  const [clinic_photos_files, setClinicPhotosFiles] = useState([]);

  // Signature pad states
  const [signatureData, setSignatureData] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef(null);

  // Bank dropdown states
  const [bankOptions, setBankOptions] = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);
  const [isFetchingBanks, setIsFetchingBanks] = useState(false);
  const [isFetchingBranches, setIsFetchingBranches] = useState(false);
  const [isFetchingCoords, setIsFetchingCoords] = useState(false);

  const fetchCoordinates = async () => {
    if (!formData.clinic_address) {
      toast.error("Please enter a clinic address first");
      return;
    }
    setIsFetchingCoords(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        toast.error("Google Maps API key is missing");
        setIsFetchingCoords(false);
        return;
      }

      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(formData.clinic_address)}&key=${apiKey}`);
      const data = await response.json();

      if (data.status === "OK" && data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        handleInputChange("clinic_lat", location.lat.toString());
        handleInputChange("clinic_lng", location.lng.toString());
        toast.success("Coordinates fetched successfully");
      } else {
        console.error("Google Maps API error:", data);
        toast.error("Could not find coordinates for this address.");
      }
    } catch (error) {
      console.error("Error fetching coordinates:", error);
      toast.error("Error fetching coordinates");
    } finally {
      setIsFetchingCoords(false);
    }
  };

  const fetchCoordinatesForIndex = async (idx) => {
    const clinics = [...(formData.additional_clinics || [])];
    const clinic = clinics[idx];
    if (!clinic?.address) {
      toast.error("Please enter a clinic address first");
      return;
    }
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        toast.error("Google Maps API key is missing");
        return;
      }
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(clinic.address)}&key=${apiKey}`);
      const data = await response.json();
      if (data.status === "OK" && data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        clinics[idx] = {
          ...clinic,
          lat: location.lat.toString(),
          lng: location.lng.toString()
        };
        handleInputChange("additional_clinics", clinics);
        toast.success("Coordinates fetched successfully");
      } else {
        toast.error("Could not find coordinates for this address.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error fetching coordinates");
    }
  };

  const [isFetchingIfsc, setIsFetchingIfsc] = useState(false);

  const fetchBankDetailsByIfsc = async () => {
    if (!formData.bank_ifsc_code) {
      toast.error("Please enter an IFSC code first");
      return;
    }
    setIsFetchingIfsc(true);
    try {
      const response = await fetch(`https://ifsc.razorpay.com/${formData.bank_ifsc_code.toUpperCase()}`);
      if (response.ok) {
        const data = await response.json();
        handleInputChange("bank_name", data.BANK);
        handleInputChange("bank_branch", data.BRANCH);
        toast.success("Bank details fetched successfully");
      } else {
        toast.error("Invalid IFSC code");
      }
    } catch (error) {
      console.error("Error fetching bank details:", error);
      toast.error("Error fetching bank details");
    } finally {
      setIsFetchingIfsc(false);
    }
  };
  const [branchSearch, setBranchSearch] = useState("");

  const filteredBranches = useMemo(() => {
    if (!branchSearch) {
      return branchOptions.slice(0, 100); // Limit to first 100 branches for performance
    }
    const query = branchSearch.toLowerCase();
    return branchOptions
      .filter(
        (b) =>
          (b.branch || "").toLowerCase().includes(query) ||
          (b.city || "").toLowerCase().includes(query)
      )
      .slice(0, 100); // Limit to first 100 matches for performance
  }, [branchOptions, branchSearch]);

  useEffect(() => {
    if (step === 4) {
      setIsFetchingBanks(true);
      fetch("/api/ifsc/banks")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setBankOptions(data);
        })
        .catch(err => console.error("Error fetching banks:", err))
        .finally(() => setIsFetchingBanks(false));
    }
  }, [step]);

  useEffect(() => {
    if (step === 4 && formData.bank_name) {
      const selectedBank = bankOptions.find(b => b.name === formData.bank_name);
      if (selectedBank) {
        setIsFetchingBranches(true);
        fetch(`/api/ifsc/branches?bank=${selectedBank.code}`)
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) setBranchOptions(data);
          })
          .catch(err => console.error("Error fetching branches:", err))
          .finally(() => setIsFetchingBranches(false));
      } else {
        setBranchOptions([]);
      }
    }
  }, [step, formData.bank_name, bankOptions]);

  const daysOptions = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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

  const qualificationOptions = [
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

  useEffect(() => {
    if (doctor) {
      const details = doctor.doctor_details || {};

      // Parse specialization - could be string or array
      let specialityArray = [];
      if (details.specialization) {
        if (Array.isArray(details.specialization)) {
          specialityArray = details.specialization;
        } else if (typeof details.specialization === 'string') {
          try {
            specialityArray = JSON.parse(details.specialization);
          } catch {
            specialityArray = [details.specialization];
          }
        }
      }

      // Parse qualification - could be string or array
      let qualificationArray = [];
      if (details.qualification) {
        if (Array.isArray(details.qualification)) {
          qualificationArray = details.qualification;
        } else if (typeof details.qualification === 'string') {
          try {
            qualificationArray = JSON.parse(details.qualification);
          } catch {
            qualificationArray = [details.qualification];
          }
        }
      }

      let dmcArray = [];
      if (details.dmc_mci_certificate) {
        if (Array.isArray(details.dmc_mci_certificate)) {
          dmcArray = details.dmc_mci_certificate;
        } else if (typeof details.dmc_mci_certificate === 'string') {
          try {
            dmcArray = JSON.parse(details.dmc_mci_certificate);
          } catch {
            dmcArray = [details.dmc_mci_certificate];
          }
        }
      }

      setFormData({
        doctor_name: details.full_name || "",
        email: details.email || "",
        phone: doctor.phone_number || "",
        speciality: specialityArray,
        super_speciality: details.meta?.super_speciality || [],
        years_experience: details.experience_years || "",
        doctor_registration_no: details.license_number || "",
        clinic_name: details.clinic_name || "",
        clinic_address: details.clinic_address || "",
        clinic_lat: details.latitude || "",
        clinic_lng: details.longitude || "",
        available_days: details.available_days || [],
        leave_days: details.leave_days || [],
        clinic_slots: details.clinic_slots || {},
        video_slots: details.video_slots || {},
        home_slots: details.home_slots || {},
        qualification: qualificationArray,
        video_consultation_fee: details.video_consultation_fee || "",
        clinic_consultation_fee: details.clinic_consultation_fee || "",
        home_visit_fee: details.home_visit_fee || "",
        insurance: details.indemnity_insurance || "",
        // Identity fields from KYC
        aadhaar: details.kyc_data?.aadhaar_number || details.meta?.aadhaar || "",
        pan: details.kyc_data?.pan_number || details.meta?.pan || "",
        driving_license: details.meta?.driving_license || "",
        address: details.kyc_data?.address || details.meta?.address || "",
        // Bank details
        bank_account_name: details.bank_account_details?.account_name || "",
        bank_account_number: details.bank_account_details?.account_no || "",
        bank_ifsc_code: details.bank_account_details?.ifsc || "",
        bank_name: details.bank_account_details?.bank_name || "",
        bank_branch: details.bank_account_details?.branch || "",
        // Agreements
        bpl_service_agreement: details.meta?.bpl_service_agreement || false,
        bpl_preferred_time: details.meta?.bpl_preferred_time || "",
        non_disclosure_agreement: details.meta?.non_disclosure_agreement || false,
        terms_conditions_agreement: details.meta?.terms_conditions_agreement || false,
        digital_consent: details.digital_consent || false,
        digital_signature: details.signature_url || "",
        onboarding_status: details.onboarding_status || "pending",
        dmc_mci_nmc_certificates: dmcArray,
        additional_clinics: details.meta?.additional_clinics || [],
      });

      // Set existing document URLs for display
      setExistingDocs({
        dmc_mci_certificate: Array.isArray(details.dmc_mci_certificate) ? details.dmc_mci_certificate : (details.dmc_mci_certificate ? [details.dmc_mci_certificate] : []),
        aadhaar_pan_license: Array.isArray(details.aadhaar_pan_license) ? details.aadhaar_pan_license : (details.aadhaar_pan_license ? [details.aadhaar_pan_license] : []),
        address_proof: Array.isArray(details.address_proof) ? details.address_proof : (details.address_proof ? [details.address_proof] : []),
        passport_photo: Array.isArray(details.passport_photo) ? details.passport_photo : (details.passport_photo ? [details.passport_photo] : []),
        clinic_photos: Array.isArray(details.clinic_photos) ? details.clinic_photos : [],
        signature_url: Array.isArray(details.signature_url) ? details.signature_url[0] : (details.signature_url || null),
      });
      setSignatureData(Array.isArray(details.signature_url) ? details.signature_url[0] : (details.signature_url || ""));
    } else {
      setFormData({
        // Core fields (match doctor-onboarding defaultFormData)
        doctor_name: "",
        email: "",
        phone: "",
        qualification: [],
        doctor_registration_no: "",
        years_experience: "",
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
        bank_account_name: "",
        bank_account_number: "",
        bank_ifsc_code: "",
        bank_name: "",
        bank_branch: "",
        bpl_service_agreement: false,
        bpl_preferred_time: "",
        non_disclosure_agreement: false,
        terms_conditions_agreement: false,
        digital_consent: false,
        // Admin-only additional fields
        clinic_name: "",
        available_days: [],
        video_consultation_fee: "",
        clinic_consultation_fee: "",
        home_visit_fee: "",
        onboarding_status: "pending",
        additional_clinics: [],
      });
      setExistingDocs({
        dmc_mci_certificate: [],
        aadhaar_pan_license: [],
        address_proof: [],
        passport_photo: [],
        clinic_photos: [],
        signature_url: null,
      });
      setSignatureData("");
    }

    // Reset file inputs when modal opens/closes
    setStep(1);
    setAadhaarPanLicenseFile(null);
    setAddressProofFile(null);
    setPassportPhotoFile(null);
  }, [doctor, isOpen]);

  // Signature drawing logic
  useEffect(() => {
    if (step === 4 && canvasRef.current && (!signatureData || !signatureData.startsWith("http"))) {
      const timer = setTimeout(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [step, signatureData]);

  const startDrawing = (e) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    setIsDrawing(true);
    ctx.beginPath();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      if (canvasRef.current) {
        setSignatureData(canvasRef.current.toDataURL("image/png"));
      }
    }
  };

  const clearSignature = () => {
    setSignatureData("");
    setExistingDocs(prev => ({ ...prev, signature_url: null }));
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNestedChange = (parent, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value,
      },
    }));
  };

  const handleArrayToggle = (field, value) => {
    setFormData((prev) => {
      const currentArray = Array.isArray(prev[field]) ? prev[field] : [];
      return {
        ...prev,
        [field]: currentArray.includes(value)
          ? currentArray.filter((item) => item !== value)
          : [...currentArray, value],
      };
    });
  };

  const handleSlotChange = (slotType, day, index, field, value) => {
    setFormData((prev) => {
      const typeData = { ...(prev[slotType] || {}) };
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
      typeData[day] = dayData;

      return {
        ...prev,
        [slotType]: typeData,
      };
    });
  };

  const handleAddSlot = (slotType, day) => {
    setFormData((prev) => {
      const typeData = { ...(prev[slotType] || {}) };
      let dayData = typeData[day];
      if (!Array.isArray(dayData)) {
        dayData = dayData && (dayData.start || dayData.end) ? [dayData] : [{ start: "", end: "" }];
      }
      typeData[day] = [...dayData, { start: "", end: "" }];
      return {
        ...prev,
        [slotType]: typeData,
      };
    });
  };

  const handleRemoveSlot = (slotType, day, index) => {
    setFormData((prev) => {
      const typeData = { ...(prev[slotType] || {}) };
      let dayData = typeData[day];
      if (!Array.isArray(dayData)) {
        dayData = dayData && (dayData.start || dayData.end) ? [dayData] : [{ start: "", end: "" }];
      }
      dayData = dayData.filter((_, i) => i !== index);
      if (dayData.length === 0) {
        dayData = [{ start: "", end: "" }];
      }
      typeData[day] = dayData;
      return {
        ...prev,
        [slotType]: typeData,
      };
    });
  };

  const handleFileChange = (setter, file) => {
    if (file) {
      // Validate file type
      const validTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "application/pdf",
      ];
      if (!validTypes.includes(file.type)) {
        toast.error("Please upload JPEG, PNG, or PDF files only");
        return;
      }
      setter(file);
    }
  };

  const removeFile = (setter) => {
    setter(null);
  };

  // Upload a single file to Supabase Storage via the doctor-document API
  // (same method as the doctor-onboarding page)
  const uploadFileViaSignedUrl = async (file, folder) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    const res = await fetch("/api/upload/doctor-document", {
      method: "POST",
      body: fd,
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.message || "Failed to upload file");
    return result.publicUrl;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Identify files to upload from dmc_mci_nmc_certificates
      const dmcFilesToUpload = [];
      const finalDmcUrls = [];

      if (Array.isArray(formData.dmc_mci_nmc_certificates)) {
        for (const item of formData.dmc_mci_nmc_certificates) {
          if (item instanceof File) {
            dmcFilesToUpload.push(item);
          } else if (typeof item === "string" && item.startsWith("http")) {
            finalDmcUrls.push(item);
          }
        }
      }

      // ─── Step 1: Upload any new files first ───────────────────────────────
      const fileUploads = [
        { file: aadhaar_pan_license_file,   folder: "aadhaar-pan",       key: "aadhaar_pan_license" },
        { file: address_proof_file,         folder: "address-proofs",    key: "address_proof" },
        { file: passport_photo_file,        folder: "passport-photos",   key: "passport_photo" },
      ];

      const uploadedUrls = {
        clinic_photos: existingDocs.clinic_photos || [],
        signature_url: existingDocs.signature_url ? [existingDocs.signature_url] : [],
        aadhaar_pan_license: existingDocs.aadhaar_pan_license || [],
        address_proof: existingDocs.address_proof || [],
        passport_photo: existingDocs.passport_photo || [],
      };
      const total = dmcFilesToUpload.length + clinic_photos_files.length + fileUploads.filter((f) => f.file).length;
      let done = 0;

      // Upload DMC files
      if (dmcFilesToUpload.length > 0) {
        for (const file of dmcFilesToUpload) {
          done++;
          toast.loading(`Uploading document ${done} of ${total}...`, { id: "upload" });
          try {
            const url = await uploadFileViaSignedUrl(file, "dmc-certificates");
            finalDmcUrls.push(url);
          } catch (uploadErr) {
            toast.dismiss("upload");
            toast.error(`Failed to upload ${file.name}: ${uploadErr.message}`);
            setLoading(false);
            return;
          }
        }
      }

      // Store final DMC array under both keys for max backend compatibility
      uploadedUrls["dmc_mci_nmc_certificates"] = finalDmcUrls;
      uploadedUrls["dmc_mci_certificate"] = finalDmcUrls;

      for (const { file, folder, key } of fileUploads) {
        if (!file) continue;
        done++;
        toast.loading(`Uploading document ${done} of ${total}...`, { id: "upload" });
        try {
          const url = await uploadFileViaSignedUrl(file, folder);
          uploadedUrls[key] = [url]; // store as array to match DB schema
        } catch (uploadErr) {
          toast.dismiss("upload");
          toast.error(`Failed to upload ${file.name}: ${uploadErr.message}`);
          setLoading(false);
          return;
        }
      }

      toast.dismiss("upload");

      // Upload clinic photos
      if (clinic_photos_files.length > 0) {
        let clinicUrls = [...uploadedUrls.clinic_photos];
        for (const file of clinic_photos_files) {
          done++;
          toast.loading(`Uploading document ${done} of ${total}...`, { id: "upload_clinic" });
          try {
            const url = await uploadFileViaSignedUrl(file, "clinic-photos");
            clinicUrls.push(url);
          } catch (uploadErr) {
            toast.dismiss("upload_clinic");
            toast.error(`Failed to upload ${file.name}: ${uploadErr.message}`);
            setLoading(false);
            return;
          }
        }
        toast.dismiss("upload_clinic");
        uploadedUrls.clinic_photos = clinicUrls;
      }

      // Upload digital signature if it is a new base64 drawing
      if (signatureData && signatureData.startsWith("data:image")) {
        toast.loading("Uploading signature...", { id: "upload_sig" });
        try {
          const res = await fetch(signatureData);
          const blob = await res.blob();
          const file = new File([blob], "signature.png", { type: "image/png" });
          const url = await uploadFileViaSignedUrl(file, "signatures");
          uploadedUrls["signature_url"] = [url];
        } catch (uploadErr) {
          toast.dismiss("upload_sig");
          toast.error(`Failed to upload signature: ${uploadErr.message}`);
          setLoading(false);
          return;
        }
        toast.dismiss("upload_sig");
      } else if (signatureData && signatureData.startsWith("http")) {
        uploadedUrls["signature_url"] = [signatureData];
      } else {
        uploadedUrls["signature_url"] = [];
      }

      // ─── Step 2: Compute availability from slot data ──────────────────────
      const computeAvailability = () => {
        const activeDays = [];
        let earliest = null;
        let latest = null;

        daysOptions.forEach((day) => {
          // If the day is marked as leave, it's not active
          if ((formData.leave_days || []).includes(day)) return;

          const clinicSlot = (formData.clinic_slots || {})[day];
          const videoSlot = (formData.video_slots || {})[day];
          const homeSlot = (formData.home_slots || {})[day];

          // A day is active only if at least one time slot has start or end configured
          let slotsForDay = [];
          [clinicSlot, videoSlot, homeSlot].forEach((dData) => {
            if (dData) {
              if (Array.isArray(dData)) {
                slotsForDay.push(...dData);
              } else {
                slotsForDay.push(dData);
              }
            }
          });

          slotsForDay = slotsForDay.filter((slot) => slot.start || slot.end);

          if (slotsForDay.length === 0) return;

          activeDays.push(day);

          slotsForDay.forEach((slot) => {
            if (slot.start && (!earliest || slot.start < earliest)) earliest = slot.start;
            if (slot.end   && (!latest  || slot.end   > latest))   latest   = slot.end;
          });
        });

        return {
          availableDays: activeDays,
          availableTime: earliest && latest ? { start: earliest, end: latest } : undefined,
        };
      };

      const { availableDays, availableTime } = computeAvailability();
      
      if (availableDays.length === 0) {
        toast.error("Please configure at least one day of schedule for the doctor.");
        setLoading(false);
        return;
      }

      // ─── Step 3: Build the update FormData with JSON fields + uploaded URLs ─
      const submitFormData = new FormData();

      const payload = {
        ...formData,
        available_days: availableDays,
        available_time: availableTime,
      };

      // Append all plain fields (no File objects)
      Object.entries(payload).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        // Exclude dmc_mci_nmc_certificates from plain serialization since it is in uploadedUrls
        if (key === "dmc_mci_nmc_certificates") return;
        if (Array.isArray(value) || typeof value === "object") {
          submitFormData.append(key, JSON.stringify(value));
        } else if (typeof value === "boolean") {
          submitFormData.append(key, value.toString());
        } else {
          submitFormData.append(key, value);
        }
      });

      // Append uploaded file URLs as JSON arrays
      Object.entries(uploadedUrls).forEach(([key, urls]) => {
        submitFormData.append(key, JSON.stringify(urls));
      });

      // Add ID for updates
      if (doctor) {
        submitFormData.append("id", doctor.id);
      }

      await onSave(submitFormData);
      onClose();
      toast.success(
        doctor
          ? "Doctor updated successfully!"
          : "Doctor onboarded successfully!"
      );
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };


  // Helper to get filename from URL
  const getFileNameFromUrl = (url) => {
    if (!url) return "Document";

    // Handle arrays or unexpected structures defensively
    if (Array.isArray(url)) {
      return getFileNameFromUrl(url[0]);
    }

    if (typeof url !== "string") {
      try {
        const asString = String(url);
        if (!asString || asString === "[object Object]") return "Document";
        const parts = asString.split("/");
        return parts[parts.length - 1].split("?")[0] || "Document";
      } catch {
        return "Document";
      }
    }

    const parts = url.split("/");
    return parts[parts.length - 1].split("?")[0] || "Document";
  };

  const FileUploadField = ({
    label,
    file,
    setFile,
    existingUrls = [],
    accept = ".jpg,.jpeg,.png,.pdf",
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>

      {/* Show existing documents */}
      {existingUrls.length > 0 && !file && (
        <div className="mb-3 space-y-2">
          {existingUrls.map((url, idx) => (
            <div key={idx} className="border border-green-300 dark:border-green-600 rounded-lg p-3 bg-green-50 dark:bg-green-900/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                <div className="flex items-center space-x-3 min-w-0">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {getFileNameFromUrl(url)}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">Already uploaded</p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="whitespace-nowrap text-[#0067A1] dark:text-[#0080C6] hover:text-[#004F7C] text-sm underline"
                  >
                    View
                  </a>
                </div>
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-500 dark:text-gray-400">Upload new file to replace existing</p>
        </div>
      )}

      {!file ? (
        <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 sm:p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer">
          <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">
            Click to upload
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            JPEG, PNG, PDF
          </p>
          <input
            type="file"
            accept={accept}
            onChange={(e) => handleFileChange(setFile, e.target.files[0])}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      ) : (
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 sm:p-4 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <div className="flex-shrink-0 sm:ml-2">
              <button
                type="button"
                onClick={() => removeFile(setFile)}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <User className="w-5 h-5 text-gray-700 dark:text-white" />
        </div>
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
          Basic Information
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
            Doctor Name *
          </label>
          <input
            type="text"
            value={formData.doctor_name}
            onChange={(e) => handleInputChange("doctor_name", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="Dr. John Doe"
          />
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
            Phone Number *
          </label>
          <input
            type="text"
            value={formData.phone}
            onChange={(e) => handleInputChange("phone", e.target.value)}
            onBlur={(e) => checkExistence("phone", e.target.value)}
            className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent ${localErrors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
            placeholder="+91 9876543210"
          />
          {localErrors.phone && <p className="text-red-500 text-[10px] mt-1">{localErrors.phone}</p>}
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
            Email *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            onBlur={(e) => checkExistence("email", e.target.value)}
            className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent ${localErrors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
            placeholder="doctor@example.com"
          />
          {localErrors.email && <p className="text-red-500 text-[10px] mt-1">{localErrors.email}</p>}
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
            Registration Number *
          </label>
          <input
            type="text"
            value={formData.doctor_registration_no}
            onChange={(e) =>
              handleInputChange("doctor_registration_no", e.target.value)
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="MED123456"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Experience (Years) *
          </label>
          <input
            type="number"
            value={formData.years_experience}
            onChange={(e) =>
              handleInputChange("years_experience", e.target.value)
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="5"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Video Consultation Fee
          </label>
          <input
            type="number"
            value={formData.video_consultation_fee}
            onChange={(e) =>
              handleInputChange("video_consultation_fee", e.target.value)
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Clinic Consultation Fee
          </label>
          <input
            type="number"
            value={formData.clinic_consultation_fee}
            onChange={(e) =>
              handleInputChange("clinic_consultation_fee", e.target.value)
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="800"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Home Visit Fee
          </label>
          <input
            type="number"
            value={formData.home_visit_fee}
            onChange={(e) =>
              handleInputChange("home_visit_fee", e.target.value)
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="1500"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <Stethoscope className="w-5 h-5 text-gray-700 dark:text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Professional Details
        </h3>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Qualification *
        </label>
        <div className="flex flex-wrap gap-2">
          {qualificationOptions.map((qual) => (
            <button
              key={qual}
              type="button"
              onClick={() => handleArrayToggle("qualification", qual)}
              className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm border transition-all duration-200 ${(formData.qualification || []).includes(qual)
                ? "bg-black text-white border-black shadow-sm"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
            >
              {qual}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Speciality *
        </label>
        <div className="flex flex-wrap gap-2">
          {specialityOptions.map((spec) => (
            <button
              key={spec}
              type="button"
              onClick={() => handleArrayToggle("speciality", spec)}
              className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm border transition-all duration-200 ${(formData.speciality || []).includes(spec)
                ? "bg-black text-white border-black shadow-sm"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
            >
              {spec}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Super Speciality (Optional)
        </label>
        <div className="flex flex-wrap gap-2">
          {superSpecialityOptions.map((spec) => (
            <button
              key={spec}
              type="button"
              onClick={() => handleArrayToggle("super_speciality", spec)}
              className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm border transition-all duration-200 ${(formData.super_speciality || []).includes(spec)
                ? "bg-[#0067A1] text-white border-teal-600 shadow-sm"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
            >
              {spec}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Indemnity Insurance Amount
          </label>
          <input
            type="number"
            value={formData.insurance}
            onChange={(e) =>
              handleInputChange("insurance", e.target.value)
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="1000000"
          />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <Building className="w-5 h-5 text-gray-700 dark:text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Clinic & Availability
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Clinic Name
          </label>
          <input
            type="text"
            value={formData.clinic_name}
            onChange={(e) => handleInputChange("clinic_name", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="City Hospital"
          />
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Clinic Address
            </label>
            <button
              type="button"
              onClick={fetchCoordinates}
              disabled={isFetchingCoords || !formData.clinic_address}
              className="text-xs text-[#0067A1] hover:text-[#004F7C] dark:text-blue-400 dark:hover:text-blue-300 flex items-center font-medium disabled:opacity-50"
            >
              {isFetchingCoords ? (
                <><RefreshCw size={12} className="mr-1 animate-spin" /> Fetching...</>
              ) : (
                <><MapPin size={12} className="mr-1" /> Get Coordinates</>
              )}
            </button>
          </div>
          <textarea
            value={formData.clinic_address}
            onChange={(e) =>
              handleInputChange("clinic_address", e.target.value)
            }
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="Enter full clinic address"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Clinic Latitude
          </label>
          <input
            type="text"
            value={formData.clinic_lat}
            onChange={(e) =>
              handleInputChange("clinic_lat", e.target.value)
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="28.6139"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Clinic Longitude
          </label>
          <input
            type="text"
            value={formData.clinic_lng}
            onChange={(e) =>
              handleInputChange("clinic_lng", e.target.value)
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="77.2090"
          />
        </div>
      </div>

      {/* Additional Clinic Locations */}
      <div className="mt-4 border-t pt-4 border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
            Additional Clinic Locations
          </h4>
          <button
            type="button"
            onClick={() => {
              const list = [...(formData.additional_clinics || [])];
              list.push({ name: "", address: "", lat: "", lng: "" });
              handleInputChange("additional_clinics", list);
            }}
            className="px-3 py-1 bg-[#0067A1] text-white text-xs font-semibold rounded hover:bg-[#004F7C] transition"
          >
            + Add Location
          </button>
        </div>

        {(formData.additional_clinics || []).map((clinic, idx) => (
          <div key={idx} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/40 mb-3 space-y-3 relative">
            <button
              type="button"
              onClick={() => {
                const list = (formData.additional_clinics || []).filter((_, i) => i !== idx);
                handleInputChange("additional_clinics", list);
              }}
              className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition"
            >
              <X size={16} />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
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
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Clinic Branch"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Clinic Address
                  </label>
                  <button
                    type="button"
                    onClick={() => fetchCoordinatesForIndex(idx)}
                    className="text-[10px] text-[#0067A1] hover:underline dark:text-blue-400 font-semibold"
                  >
                    Get Coordinates
                  </button>
                </div>
                <input
                  type="text"
                  value={clinic.address || ""}
                  onChange={(e) => {
                    const list = [...formData.additional_clinics];
                    list[idx].address = e.target.value;
                    handleInputChange("additional_clinics", list);
                  }}
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Branch Address"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-gray-500">Latitude</label>
                <input
                  type="text"
                  value={clinic.lat || ""}
                  readOnly
                  className="w-full px-2 py-1 border border-gray-200 dark:border-gray-700 rounded text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500">Longitude</label>
                <input
                  type="text"
                  value={clinic.lng || ""}
                  readOnly
                  className="w-full px-2 py-1 border border-gray-200 dark:border-gray-700 rounded text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Weekly Availability - Clinic / Video / Home Slots */}
      <div className="mt-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
          <Clock4 className="w-4 h-4 mr-2" />
          Weekly Availability <span className="ml-2 text-xs text-red-500 font-normal">(Required: Select at least one day)</span>
        </h4>
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40">
          <table className="min-w-full text-xs sm:text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-2 sm:px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Day</th>
                <th className="px-2 sm:px-3 py-2 text-center font-medium text-gray-700 dark:text-gray-300">Leave</th>
                <th className="px-2 sm:px-3 py-2 text-center font-medium text-gray-700 dark:text-gray-300">Clinic Visit</th>
                <th className="px-2 sm:px-3 py-2 text-center font-medium text-gray-700 dark:text-gray-300">Video Consult</th>
                <th className="px-2 sm:px-3 py-2 text-center font-medium text-gray-700 dark:text-gray-300">Home Visit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {daysOptions.map((day) => {
                const isLeave = (formData.leave_days || []).includes(day);
                
                const getSlots = (type) => {
                  const raw = (formData[type] || {})[day];
                  return Array.isArray(raw) ? raw : (raw && (raw.start || raw.end) ? [raw] : [{ start: "", end: "" }]);
                };

                return (
                  <tr key={day} className={isLeave ? "bg-gray-50 dark:bg-gray-800/50 opacity-50" : ""}>
                    <td className="px-2 sm:px-3 py-2 align-top">
                      <span className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 block mt-1">
                        {day}
                      </span>
                    </td>
                    <td className="px-2 sm:px-3 py-2 text-center align-top">
                      <input
                        type="checkbox"
                        checked={isLeave}
                        onChange={() => handleArrayToggle("leave_days", day)}
                        className="h-3 w-3 sm:h-4 sm:w-4 rounded border-gray-300 text-[#0067A1] focus:ring-[#0067A1] mt-1"
                      />
                    </td>
                    {["clinic_slots", "video_slots", "home_slots"].map((type) => {
                      const daySlots = getSlots(type);
                      return (
                        <td key={type} className="px-2 sm:px-3 py-2 text-center align-top">
                          <div className="flex flex-col gap-2">
                            {daySlots.map((slot, idx) => (
                              <div key={idx} className="flex items-center justify-center gap-1 sm:gap-2">
                                <input
                                  type="time"
                                  value={slot.start || ""}
                                  disabled={isLeave}
                                  onChange={(e) =>
                                    handleSlotChange(type, day, idx, "start", e.target.value)
                                  }
                                  className="w-[100px] sm:w-[115px] px-1 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-[10px] sm:text-xs text-gray-900 dark:text-white disabled:opacity-50"
                                />
                                <span className="text-[10px] sm:text-xs text-gray-400">to</span>
                                <input
                                  type="time"
                                  value={slot.end || ""}
                                  disabled={isLeave}
                                  onChange={(e) =>
                                    handleSlotChange(type, day, idx, "end", e.target.value)
                                  }
                                  className="w-[100px] sm:w-[115px] px-1 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-[10px] sm:text-xs text-gray-900 dark:text-white disabled:opacity-50"
                                />
                                {type === "clinic_slots" && (
                                  <select
                                    value={slot.clinic_index || 0}
                                    disabled={isLeave}
                                    onChange={(e) =>
                                      handleSlotChange(type, day, idx, "clinic_index", parseInt(e.target.value, 10))
                                    }
                                    className="w-[90px] sm:w-[105px] px-1 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-[10px] sm:text-xs text-gray-900 dark:text-white disabled:opacity-50"
                                  >
                                    <option value={0}>{formData.clinic_name || "Primary"}</option>
                                    {(formData.additional_clinics || []).map((c, cIdx) => (
                                      <option key={cIdx + 1} value={cIdx + 1}>
                                        {c.name || `Clinic ${cIdx + 2}`}
                                      </option>
                                    ))}
                                  </select>
                                )}
                                {!isLeave && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSlot(type, day, idx)}
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                            {!isLeave && (
                              <button
                                type="button"
                                onClick={() => handleAddSlot(type, day)}
                                className="text-[10px] sm:text-xs text-[#0067A1] hover:text-[#004F7C] font-medium mt-1 flex justify-center"
                              >
                                + Add Interval
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
          Check 'Leave' to mark a day as unavailable, otherwise enter the available time slots.
        </p>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <FileText className="w-5 h-5 text-gray-700 dark:text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Documents, Identity & Agreements
        </h3>
      </div>

      {/* Show existing passport photo/profile image */}
      {existingDocs.passport_photo.length > 0 && (
        <div className="flex items-center space-x-4 p-4 bg-teal-50 dark:bg-[#003358]/20 rounded-lg border border-teal-200 dark:border-teal-700">
          <img
            src={existingDocs.passport_photo[0]}
            alt="Doctor Photo"
            className="w-16 h-16 rounded-full object-cover border-2 border-teal-300"
          />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Current Profile Photo</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Upload new photo in Passport Photo field to replace</p>
          </div>
        </div>
      )}

      {/* Identity Documents Section */}
      <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Shield className="w-4 h-4 mr-2" />
          Identity Information (No KYC Required for Admin)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Aadhaar Number
            </label>
            <input
              type="text"
              value={formData.aadhaar || ""}
              onChange={(e) => handleInputChange("aadhaar", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="1234-5678-9012"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              PAN Number
            </label>
            <input
              type="text"
              value={formData.pan || ""}
              onChange={(e) => handleInputChange("pan", e.target.value.toUpperCase())}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="ABCDE1234F"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Driving License
            </label>
            <input
              type="text"
              value={formData.driving_license || ""}
              onChange={(e) => handleInputChange("driving_license", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="DL-1234567890"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Insurance Amount (₹)
            </label>
            <input
              type="number"
              value={formData.insurance || ""}
              onChange={(e) => handleInputChange("insurance", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="1000000"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Residential Address
            </label>
            <textarea
              value={formData.address || ""}
              onChange={(e) => handleInputChange("address", e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="Full residential address"
            />
          </div>
        </div>
      </div>

      {/* KYC Data (from onboarding JSON) */}
      {doctor?.doctor_details?.kyc_data && (
        <div className="bg-teal-50 dark:bg-[#003358]/20 p-4 rounded-lg border border-teal-200 dark:border-teal-700">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
            <Shield className="w-4 h-4 mr-2" />
            KYC Data (read-only)
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            This is the KYC information received from the onboarding flow.
          </p>
          <div className="max-h-48 overflow-auto rounded-md bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 p-2">
            <pre className="text-[11px] leading-snug text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-all">
              {JSON.stringify(doctor.doctor_details.kyc_data, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Document Uploads */}
      <div className="space-y-4 sm:space-y-6">
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50/30 dark:bg-gray-800/10">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            DMC/MCI/NMC Certificates *
          </label>
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 sm:p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors relative cursor-pointer bg-white dark:bg-gray-800">
            <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">
              Click to select certificates (JPEG, PNG, PDF)
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Multiple files allowed
            </p>
            <input
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) => {
                const files = Array.from(e.target.files);
                const validFiles = files;
                if (validFiles.length > 0) {
                  setFormData(prev => ({
                    ...prev,
                    dmc_mci_nmc_certificates: [...(prev.dmc_mci_nmc_certificates || []), ...validFiles]
                  }));
                }
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          {/* Render files list */}
          {Array.isArray(formData.dmc_mci_nmc_certificates) && formData.dmc_mci_nmc_certificates.length > 0 && (
            <div className="mt-3 space-y-2">
              {formData.dmc_mci_nmc_certificates.map((file, idx) => {
                const isUrl = typeof file === "string";
                const name = isUrl ? file.split("/").pop().split("?")[0] : file.name;
                return (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <FileText className={`w-5 h-5 ${isUrl ? "text-green-600 dark:text-green-400" : "text-gray-400"} shrink-0`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {isUrl ? "Already uploaded" : `${(file.size / 1024 / 1024).toFixed(2)} MB`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0 ml-2">
                      {isUrl && (
                        <a
                          href={file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#0067A1] dark:text-[#0080C6] hover:underline px-2 py-1"
                        >
                          View
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            dmc_mci_nmc_certificates: prev.dmc_mci_nmc_certificates.filter((_, i) => i !== idx)
                          }));
                        }}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <FileUploadField
            label="Aadhaar/PAN/License"
            file={aadhaar_pan_license_file}
            setFile={setAadhaarPanLicenseFile}
            existingUrls={existingDocs.aadhaar_pan_license}
          />
          <FileUploadField
            label="Address Proof"
            file={address_proof_file}
            setFile={setAddressProofFile}
            existingUrls={existingDocs.address_proof}
          />
          <FileUploadField
            label="Passport Photo"
            file={passport_photo_file}
            setFile={setPassportPhotoFile}
            existingUrls={existingDocs.passport_photo}
            accept=".jpg,.jpeg,.png"
          />
        </div>
      </div>

      {/* Digital Signature Pad */}
      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Digital Signature
        </label>
        
        {signatureData && signatureData.startsWith("http") ? (
          <div className="flex flex-col space-y-3">
            <div className="bg-white p-2 border border-gray-200 rounded-md inline-block max-w-sm">
              <img src={signatureData} alt="Signature" className="h-16 object-contain" />
            </div>
            <div>
              <button
                type="button"
                onClick={clearSignature}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Remove & Draw New Signature
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-2xl space-y-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Draw the signature in the box below
            </p>
            <div className="border border-gray-300 dark:border-gray-600 rounded bg-white">
              <canvas
                ref={canvasRef}
                className="w-full h-32 sm:h-48 cursor-crosshair touch-none rounded"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={(e) => { e.preventDefault(); startDrawing(e.touches[0]); }}
                onTouchMove={(e) => { e.preventDefault(); draw(e.touches[0]); }}
                onTouchEnd={stopDrawing}
              />
            </div>
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={clearSignature}
                className="text-xs px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Clear
              </button>
              <span className="text-[10px] text-gray-400">Auto-saves when you lift the pen</span>
            </div>
          </div>
        )}
      </div>

      {/* Upload new clinic photos */}
      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Add New Clinic Photos
        </label>
        <div className="flex items-center space-x-4">
          <input
            type="file"
            multiple
            accept=".jpg,.jpeg,.png"
            id="clinic_photos_files"
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files);
              setClinicPhotosFiles(prev => [...prev, ...files]);
            }}
          />
          <label
            htmlFor="clinic_photos_files"
            className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
          >
            <Upload className="w-4 h-4 mr-2 text-gray-500" />
            Select Photos
          </label>
          <span className="text-sm text-gray-500">
            {clinic_photos_files.length} {clinic_photos_files.length === 1 ? 'file' : 'files'} selected
          </span>
        </div>
        {clinic_photos_files.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {clinic_photos_files.map((file, idx) => (
              <div key={idx} className="relative inline-flex items-center px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-700 dark:text-gray-300">
                <span className="truncate max-w-[150px]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => setClinicPhotosFiles(prev => prev.filter((_, i) => i !== idx))}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Show existing clinic photos if any */}
      {existingDocs.clinic_photos.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Clinic Photos (Uploaded)</h4>
          <div className="flex flex-wrap gap-2">
            {existingDocs.clinic_photos.map((url, idx) => (
              <div key={idx} className="relative group flex items-center">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-2 py-1 pr-8 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-600 rounded text-xs text-[#0067A1] dark:text-[#0080C6] hover:underline"
                >
                  <CheckCircle className="w-3 h-3 mr-1 text-green-600" />
                  Photo {idx + 1}
                </a>
                <button
                  type="button"
                  onClick={() => setExistingDocs(prev => ({ ...prev, clinic_photos: prev.clinic_photos.filter((_, i) => i !== idx) }))}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700 bg-white rounded-full p-0.5 z-10"
                  title="Remove uploaded photo"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}



      {/* Bank Details */}
      <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <CreditCard className="w-4 h-4 mr-2" />
          Bank Details
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Account Holder Name
            </label>
            <input
              type="text"
              value={formData.bank_account_name || ""}
              onChange={(e) => handleInputChange("bank_account_name", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="Enter full name as per bank records"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Bank Account Number
            </label>
            <input
              type="text"
              value={formData.bank_account_number || ""}
              onChange={(e) => handleInputChange("bank_account_number", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="1234567890"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                IFSC Code
              </label>
              <button
                type="button"
                onClick={fetchBankDetailsByIfsc}
                disabled={isFetchingIfsc || !formData.bank_ifsc_code}
                className="text-xs text-[#0067A1] hover:text-[#004F7C] dark:text-blue-400 dark:hover:text-blue-300 flex items-center font-medium disabled:opacity-50"
              >
                {isFetchingIfsc ? (
                  <><RefreshCw size={12} className="mr-1 animate-spin" /> Fetching...</>
                ) : (
                  <><RefreshCw size={12} className="mr-1" /> Fetch Bank</>
                )}
              </button>
            </div>
            <input
              type="text"
              value={formData.bank_ifsc_code || ""}
              onChange={(e) => handleInputChange("bank_ifsc_code", e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="SBIN0001234"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Bank Name
            </label>
            <input
              type="text"
              value={formData.bank_name || ""}
              onChange={(e) => handleInputChange("bank_name", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="State Bank of India"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Bank Branch
            </label>
            <input
              type="text"
              value={formData.bank_branch || ""}
              onChange={(e) => handleInputChange("bank_branch", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="Main Branch"
            />
          </div>
        </div>
      </div>

      {/* BPL Service Option */}
      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
        <label className="flex items-start space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.bpl_service_agreement || false}
            onChange={(e) => handleInputChange("bpl_service_agreement", e.target.checked)}
            className="mt-1 rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              BPL Service Agreement
            </span>
            <p className="text-xs text-gray-600 dark:text-gray-400">Agree to see BPL patients at subsidized rates</p>
          </div>
        </label>
        {formData.bpl_service_agreement && (
          <div className="mt-3 ml-6">
            <input
              type="text"
              value={formData.bpl_preferred_time || ""}
              onChange={(e) => handleInputChange("bpl_preferred_time", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Preferred BPL service time (e.g., Mon-Fri 2PM-4PM)"
            />
          </div>
        )}
      </div>

    </div>
  );

  if (!isOpen) return null;

  const stepLabels = ["Info", "Professional", "Schedule", "Documents"];

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-2 sm:p-4 bg-black/50 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-4xl max-h-[100vh] sm:max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700 my-2 sm:my-0 flex flex-col"
      >
        <div className="p-3 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-black">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate">
                {doctor ? "Update Doctor" : "Onboard New Doctor"}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-1 hidden sm:block">
                {doctor
                  ? "Update doctor information"
                  : "Add a new doctor to the system"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 sm:p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors flex-shrink-0"
            >
              <XCircle size={20} className="sm:hidden" />
              <XCircle size={24} className="hidden sm:block" />
            </button>
          </div>

          {/* Progress Steps - Responsive */}
          <div className="flex items-center justify-between mt-3 sm:mt-4">
            {[1, 2, 3, 4].map((stepNum) => (
              <div key={stepNum} className="flex items-center flex-1 last:flex-initial">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-all duration-300 ${step === stepNum
                      ? "bg-black text-white shadow-sm"
                      : step > stepNum
                        ? "bg-green-600 text-white shadow-sm"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                      }`}
                  >
                    {step > stepNum ? <CheckCircle size={14} /> : stepNum}
                  </div>
                  <span className="text-xs mt-1 text-gray-500 dark:text-gray-400 hidden sm:block">
                    {stepLabels[stepNum - 1]}
                  </span>
                </div>
                {stepNum < 4 && (
                  <div
                    className={`flex-1 h-0.5 sm:h-1 mx-1 sm:mx-2 transition-all duration-300 ${step > stepNum
                      ? "bg-green-600"
                      : "bg-gray-200 dark:bg-gray-700"
                      }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 sm:p-6 overflow-y-auto flex-1 min-h-0 bg-gray-50 dark:bg-gray-800">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>

        <div className="p-3 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex justify-between gap-3">
            <button
              onClick={() => step > 1 && setStep(step - 1)}
              disabled={step === 1}
              className="px-4 sm:px-6 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Previous
            </button>

            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-black text-white rounded-lg hover:bg-gray-800 transition-all duration-200 shadow-sm"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-all duration-200 shadow-sm"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <RefreshCw size={16} className="animate-spin" />
                    <span className="hidden sm:inline">Saving...</span>
                    <span className="sm:hidden">...</span>
                  </div>
                ) : doctor ? (
                  <span><span className="hidden sm:inline">Update Doctor</span><span className="sm:hidden">Update</span></span>
                ) : (
                  <span><span className="hidden sm:inline">Onboard Doctor</span><span className="sm:hidden">Save</span></span>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Enhanced Doctor Details Modal Component
function DoctorDetailsModal({ doctor, isOpen, onClose }) {
  const details = doctor?.doctor_details || {};
  const meta = details.meta || {};
  const kyc = details.kyc_data || {};

  const [onboardingStatus, setOnboardingStatus] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    if (isOpen && doctor?.id) {
      fetch(`/api/admin/doctors/onboarding-status?id=${doctor.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setOnboardingStatus(data.data);
          }
        });
    }
  }, [isOpen, doctor]);

  const toggleOnboardingField = async (field) => {
    if (!onboardingStatus) return;
    setIsUpdatingStatus(true);
    const updatedStatus = { ...onboardingStatus, [field]: !onboardingStatus[field], doctor_id: doctor.id };
    
    // Optimistic update
    setOnboardingStatus(updatedStatus);

    try {
      const res = await fetch("/api/admin/doctors/onboarding-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedStatus)
      });
      const data = await res.json();
      if (!data.success) {
        toast.error("Failed to update status");
        // Revert
        setOnboardingStatus(onboardingStatus);
      } else {
        toast.success("Status updated");
      }
    } catch (err) {
      toast.error("Error updating status");
      setOnboardingStatus(onboardingStatus);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const normalizeDaysList = (value) => {
    const validDays = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    const result = new Set();

    const visit = (val) => {
      if (!val) return;

      if (Array.isArray(val)) {
        val.forEach(visit);
        return;
      }

      if (typeof val === "string") {
        let s = val.trim();

        // Try to parse JSON arrays or quoted strings
        if (
          (s.startsWith("[") && s.endsWith("]")) ||
          (s.startsWith("\"") && s.endsWith("\""))
        ) {
          try {
            const parsed = JSON.parse(s);
            visit(parsed);
            return;
          } catch {
            // fall through
          }
        }

        // Strip leading/trailing quotes/brackets crudely
        s = s.replace(/^[\[\]"]+|[\[\]"]+$/g, "");
        if (validDays.includes(s)) {
          result.add(s);
        }
        return;
      }
    };

    visit(value);
    return Array.from(result);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800";
      case "inactive":
        return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700";
      case "pending":
        return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800";
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700";
    }
  };

  const getOnboardingStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800";
      case "rejected":
        return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800";
      case "pending":
        return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800";
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700";
    }
  };

  const getInitials = (name) => {
    return (
      name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "D"
    );
  };

  const getProfilePhoto = () => {
    const passport = details.passport_photo;
    if (Array.isArray(passport) && passport.length > 0) return passport[0];
    if (typeof passport === "string" && passport) return passport;
    // Fallback placeholder when no passport photo is available
    return "https://placehold.co/96x96?text=DR";
  };

  const getFileNameFromUrl = (url) => {
    if (!url) return "Document";

    if (Array.isArray(url)) {
      return getFileNameFromUrl(url[0]);
    }

    if (typeof url !== "string") {
      try {
        const asString = String(url);
        if (!asString || asString === "[object Object]") return "Document";
        const parts = asString.split("/");
        return parts[parts.length - 1].split("?")[0] || "Document";
      } catch {
        return "Document";
      }
    }

    const parts = url.split("/");
    return parts[parts.length - 1].split("?")[0] || "Document";
  };

  return (
    <AnimatePresence>
      {isOpen && doctor && (
        <motion.div
          key="modal-overlay"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden border border-gray-200 dark:border-gray-700"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-black">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl">
                    <User className="w-8 h-8 text-gray-700 dark:text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Doctor Details
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Complete professional information
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                >
                  <XCircle size={24} />
                </motion.button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[80vh]">
              {/* Profile Section */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-start space-x-6">
                  <div className="flex-shrink-0">
                    {getProfilePhoto() ? (
                      <motion.img
                        whileHover={{ scale: 1.05 }}
                        className="h-24 w-24 rounded-full object-cover shadow-xl border-4 border-gray-300 dark:border-gray-700"
                        src={getProfilePhoto()}
                        alt=""
                      />
                    ) : (
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="h-24 w-24 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-900 flex items-center justify-center text-white font-bold text-2xl shadow-xl border-4 border-gray-300 dark:border-gray-700"
                      >
                        {getInitials(doctor.doctor_details?.full_name)}
                      </motion.div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {details.full_name || "Unknown"}
                    </h4>
                    <p className="text-lg text-gray-700 dark:text-gray-300 font-semibold mb-3">
                      {formatArrayOrString(details.specialization, "N/A")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                        <BadgeCheck size={14} className="mr-1" />
                        ID: {formatDoctorUnId(doctor.un_id)}
                      </span>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                          doctor.status === 1 ? "active" : "inactive"
                        )}`}
                      >
                        {doctor.status === 1 ? "Active" : "Inactive"}
                      </span>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getOnboardingStatusColor(
                          details.onboarding_status
                        )}`}
                      >
                        {details.onboarding_status || "pending"}
                      </span>
                      {details.rating && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
                          <Star size={14} className="mr-1" />
                          {details.rating} ⭐ ({details.total_reviews || 0} reviews)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column */}
                  <div className="space-y-6">
                    {/* Onboarding Permissions */}
                    {onboardingStatus && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-emerald-200 dark:border-emerald-800">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Onboarding & Permissions
                          </h5>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {[
                            { key: "allowed_to_consult", label: "Allowed to Consult" },
                            { key: "registration_verified", label: "Registration Verified" },
                            { key: "agreement_accepted", label: "Agreement Accepted" },
                            { key: "otp_verified", label: "OTP Verified" }
                          ].map(item => (
                            <div key={item.key} className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {item.label}
                              </span>
                              <button
                                disabled={isUpdatingStatus}
                                onClick={() => toggleOnboardingField(item.key)}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  onboardingStatus[item.key] ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                                } ${isUpdatingStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    onboardingStatus[item.key] ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Professional Information */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                          <GraduationCap className="w-5 h-5 text-gray-700 dark:text-white" />
                        </div>
                        <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Professional Information
                        </h5>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Specialization
                          </span>
                          <span className="text-sm text-gray-900 dark:text-white font-medium">
                            {formatArrayOrString(details.specialization, "Not provided")}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Experience
                          </span>
                          <span className="text-sm text-gray-900 dark:text-white font-medium">
                            {details.experience_years || "0"}{" "}
                            years
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Qualification
                          </span>
                          <span className="text-sm text-gray-900 dark:text-white font-medium">
                            {formatArrayOrString(details.qualification, "Not provided")}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            License Number
                          </span>
                          <span className="text-sm text-gray-900 dark:text-white font-medium">
                            {details.license_number || "Not provided"}
                          </span>
                        </div>
                        {(() => {
                          const fees = [];
                          if (details.video_consultation_fee && parseFloat(details.video_consultation_fee) > 0) {
                            fees.push({ label: "Video Consultation Fee", value: details.video_consultation_fee });
                          }
                          if (details.clinic_consultation_fee && parseFloat(details.clinic_consultation_fee) > 0) {
                            fees.push({ label: "Clinic Consultation Fee", value: details.clinic_consultation_fee });
                          }
                          if (details.home_visit_fee && parseFloat(details.home_visit_fee) > 0) {
                            fees.push({ label: "Home Visit Fee", value: details.home_visit_fee });
                          }

                          if (fees.length > 0) {
                            return fees.map((fee, idx) => (
                              <div
                                key={fee.label}
                                className={`flex justify-between items-center py-2 ${
                                  idx < fees.length - 1 ? "border-b border-gray-200 dark:border-gray-700" : ""
                                }`}
                              >
                                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                  {fee.label}
                                </span>
                                <span className="text-sm text-gray-900 dark:text-white font-medium">
                                  ₹{parseFloat(fee.value).toFixed(2)}
                                </span>
                              </div>
                            ));
                          } else {
                            return (
                              <div className="flex justify-between items-center py-2">
                                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                  Consultation Fee
                                </span>
                                <span className="text-sm text-gray-900 dark:text-white font-medium">
                                  ₹{parseFloat(details.consultation_fee || "0").toFixed(2)}
                                </span>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                          <Mail className="w-5 h-5 text-gray-700 dark:text-white" />
                        </div>
                        <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Contact Information
                        </h5>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3 py-2">
                          <Mail className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                              Email
                            </p>
                            <p className="text-sm text-gray-900 dark:text-white">
                              {details.email || "Not provided"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 py-2">
                          <Phone className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                              Phone
                            </p>
                            <p className="text-sm text-gray-900 dark:text-white">
                              {doctor.phone_number || "Not provided"}
                            </p>
                          </div>
                        </div>
                        {details.clinic_name && (
                          <div className="flex items-start space-x-3 py-2">
                            <Building className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                Clinic
                              </p>
                              <p className="text-sm text-gray-900 dark:text-white">
                                {details.clinic_name}
                              </p>
                              {details.clinic_address && (
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                  {details.clinic_address}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Invitation History */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Mail className="w-5 h-5 text-[#0067A1] dark:text-blue-400" />
                          </div>
                          <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Invitation History
                          </h5>
                        </div>
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300">
                          Total Sent: {meta?.invitation_count || 0}
                        </span>
                      </div>
                      {meta?.invitation_logs && meta.invitation_logs.length > 0 ? (
                        <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                          {[...meta.invitation_logs].reverse().map((log, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-sm">
                              <span className="font-medium text-gray-700 dark:text-gray-300">
                                {new Date(log.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {log.method || 'Email'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-4">
                          No invitations sent yet.
                        </p>
                      )}
                    </div>

                    {/* Availability */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                          <Clock4 className="w-5 h-5 text-gray-700 dark:text-white" />
                        </div>
                        <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Availability
                        </h5>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Available Days
                          </span>
                          <span className="text-sm text-gray-900 dark:text-white font-medium">
                            {(() => {
                              const days = normalizeDaysList(details.available_days);
                              return days.length ? days.join(", ") : "Not set";
                            })()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Available Time
                          </span>
                          <span className="text-sm text-gray-900 dark:text-white font-medium">
                            {details.available_time?.start || "09:00"}{" "}
                            -{" "}
                            {details.available_time?.end || "17:00"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-t border-gray-200 dark:border-gray-700 mt-1">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Leave Days
                          </span>
                          <span className="text-sm text-gray-900 dark:text-white font-medium">
                            {(() => {
                              const days = normalizeDaysList(details.leave_days);
                              return days.length ? days.join(", ") : "None";
                            })()}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 pt-2">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            Slot Types
                          </span>
                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/60">
                              Clinic: {details.clinic_slots && Object.keys(details.clinic_slots).length ? "Configured" : "Not set"}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/60">
                              Video: {details.video_slots && Object.keys(details.video_slots).length ? "Configured" : "Not set"}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/60">
                              Home: {details.home_slots && Object.keys(details.home_slots).length ? "Configured" : "Not set"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Specialities */}
                    {doctor.doctor_details?.speciality_tags &&
                      doctor.doctor_details.speciality_tags.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center space-x-3 mb-4">
                            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                              <Award className="w-5 h-5 text-gray-700 dark:text-white" />
                            </div>
                            <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                              Specialities & Expertise
                            </h5>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {doctor.doctor_details.speciality_tags.map(
                              (tag, index) => (
                                <span
                                  key={index}
                                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg border border-gray-300 dark:border-gray-600 font-medium"
                                >
                                  {tag}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {/* Documents & Financial */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                          <FileText className="w-5 h-5 text-gray-700 dark:text-white" />
                        </div>
                        <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Documents & Financial
                        </h5>
                      </div>
                      <div className="space-y-4 text-sm">
                        {/* DMC / MCI / NMC */}
                        <div className="flex justify-between items-start py-2 border-b border-gray-200 dark:border-gray-700">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            DMC/MCI/NMC Certificates
                          </span>
                          <div className="text-right space-y-1">
                            {Array.isArray(details.dmc_mci_certificate) && details.dmc_mci_certificate.length > 0 ? (
                              details.dmc_mci_certificate.map((url, idx) => (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block text-xs text-[#0067A1] dark:text-[#0080C6] hover:underline truncate max-w-[180px] ml-auto"
                                >
                                  {getFileNameFromUrl(url)}
                                </a>
                              ))
                            ) : details.dmc_mci_certificate ? (
                              <a
                                href={details.dmc_mci_certificate}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-xs text-[#0067A1] dark:text-[#0080C6] hover:underline truncate max-w-[180px] ml-auto"
                              >
                                {getFileNameFromUrl(details.dmc_mci_certificate)}
                              </a>
                            ) : (
                              <span className="text-xs text-gray-500 dark:text-gray-500">Not uploaded</span>
                            )}
                          </div>
                        </div>

                        {/* Aadhaar / PAN / License */}
                        <div className="flex justify-between items-start py-2 border-b border-gray-200 dark:border-gray-700">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Aadhaar / PAN / License
                          </span>
                          <div className="text-right space-y-1">
                            {details.aadhaar_pan_license ? (
                              <a
                                href={details.aadhaar_pan_license}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-xs text-[#0067A1] dark:text-[#0080C6] hover:underline truncate max-w-[180px] ml-auto"
                              >
                                {getFileNameFromUrl(details.aadhaar_pan_license)}
                              </a>
                            ) : (
                              <span className="text-xs text-gray-500 dark:text-gray-500">Not uploaded</span>
                            )}
                          </div>
                        </div>

                        {/* Address Proof */}
                        <div className="flex justify-between items-start py-2 border-b border-gray-200 dark:border-gray-700">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Address Proof
                          </span>
                          <div className="text-right">
                            {details.address_proof ? (
                              <a
                                href={details.address_proof}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-xs text-[#0067A1] dark:text-[#0080C6] hover:underline truncate max-w-[180px] ml-auto"
                              >
                                {getFileNameFromUrl(details.address_proof)}
                              </a>
                            ) : (
                              <span className="text-xs text-gray-500 dark:text-gray-500">Not uploaded</span>
                            )}
                          </div>
                        </div>

                        {/* Passport Photo */}
                        <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Passport Photo
                          </span>
                          <div className="flex items-center gap-2">
                            {Array.isArray(details.passport_photo) && details.passport_photo.length > 0 ? (
                              <img
                                src={details.passport_photo[0]}
                                alt="Passport"
                                className="h-10 w-10 rounded-full object-cover border border-gray-300 dark:border-gray-600"
                              />
                            ) : details.passport_photo ? (
                              <img
                                src={details.passport_photo}
                                alt="Passport"
                                className="h-10 w-10 rounded-full object-cover border border-gray-300 dark:border-gray-600"
                              />
                            ) : (
                              <span className="text-xs text-gray-500 dark:text-gray-500">Not uploaded</span>
                            )}
                          </div>
                        </div>

                        {/* Clinic Photos */}
                        <div className="flex justify-between items-start py-2 border-b border-gray-200 dark:border-gray-700">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Clinic Photos
                          </span>
                          <div className="flex flex-wrap justify-end gap-1 max-w-[200px]">
                            {Array.isArray(details.clinic_photos) && details.clinic_photos.length > 0 ? (
                              details.clinic_photos.map((url, idx) => (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-gray-100 dark:bg-gray-700 text-[#0067A1] dark:text-teal-300 hover:underline"
                                >
                                  Photo {idx + 1}
                                </a>
                              ))
                            ) : (
                              <span className="text-xs text-gray-500 dark:text-gray-500">Not uploaded</span>
                            )}
                          </div>
                        </div>

                        {/* Digital Signature */}
                        <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Digital Signature
                          </span>
                          {details.signature_url ? (
                            <a
                              href={details.signature_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-xs text-[#0067A1] dark:text-[#0080C6] hover:underline"
                            >
                              View Signature
                            </a>
                          ) : (
                            <span className="text-xs text-gray-500 dark:text-gray-500">Not uploaded</span>
                          )}
                        </div>

                        {/* Indemnity Insurance */}
                        {details.indemnity_insurance && (
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                              Indemnity Insurance
                            </span>
                            <span className="text-sm text-gray-900 dark:text-white font-medium">
                              ₹{details.indemnity_insurance}
                            </span>
                          </div>
                        )}

                        {/* Bank Details */}
                        {details.bank_account_details && (
                          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                              Bank Details
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              {details.bank_account_details.bank_name || "Bank"}{" "}
                              • {details.bank_account_details.branch || "Branch"}
                              {details.bank_account_details.account_no && (
                                <>
                                  {" "}• •••
                                  {details.bank_account_details.account_no.slice(-4)}
                                </>
                              )}
                            </p>
                            {details.bank_account_details.ifsc && (
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                IFSC: {details.bank_account_details.ifsc}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Identity & KYC */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                          <Shield className="w-5 h-5 text-gray-700 dark:text-white" />
                        </div>
                        <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Identity & KYC
                        </h5>
                      </div>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                          <span className="text-gray-600 dark:text-gray-400">Aadhaar Number</span>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {kyc.aadhaar_number || meta.aadhaar || "Not provided"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                          <span className="text-gray-600 dark:text-gray-400">PAN Number</span>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {kyc.pan_number || meta.pan || "Not provided"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                          <span className="text-gray-600 dark:text-gray-400">Driving License</span>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {meta.driving_license || "Not provided"}
                          </span>
                        </div>
                        <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                          <span className="block text-gray-600 dark:text-gray-400 mb-1">Residential Address</span>
                          <p className="text-gray-900 dark:text-white text-xs">
                            {kyc.address || meta.address || "Not provided"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/60">
                            BPL Service: {meta.bpl_service_agreement ? "Yes" : "No"}
                          </span>
                          {meta.bpl_preferred_time && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/60">
                              BPL Time: {meta.bpl_preferred_time}
                            </span>
                          )}
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/60">
                            NDA: {meta.non_disclosure_agreement ? "Accepted" : "No"}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/60">
                            Terms: {meta.terms_conditions_agreement ? "Accepted" : "No"}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/60">
                            Digital Consent: {details.digital_consent ? "Yes" : "No"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                {(details.qualification || details.digital_consent) && (
                  <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {details.qualification && (
                        <div>
                          <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                            Qualifications
                          </h6>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {formatArrayOrString(details.qualification, "Not provided")}
                          </p>
                        </div>
                      )}
                      {details.digital_consent && (
                        <div className="flex items-center space-x-2">
                          <Shield className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Digital Consent Provided
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500 dark:text-gray-500">
                  Last updated:{" "}
                  {details.updated_at
                    ? new Date(details.updated_at).toLocaleDateString()
                    : "N/A"}
                </div>
                <div className="flex space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onClose}
                    className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                  >
                    Close
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Main Doctors Page Component
export default function DoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viewDoctor, setViewDoctor] = useState(null);
  const [editDoctor, setEditDoctor] = useState(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [specializationFilter, setSpecializationFilter] = useState("all");
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [logsDoctor, setLogsDoctor] = useState(null);
  const [docsDoctor, setDocsDoctor] = useState(null);
  const [isDocsModalOpen, setDocsModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [invitingDoctorId, setInvitingDoctorId] = useState(null);
  const [specialties, setSpecialties] = useState([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, pending: 0, verified: 0 });

  useEffect(() => {
    async function fetchSpecialties() {
      try {
        const res = await fetch("/api/cms/specialties");
        const json = await res.json();
        if (json.success && json.data?.length > 0) {
          const active = json.data
            .filter((s) => s.is_active !== false)
            .sort((a, b) => a.display_order - b.display_order);
          setSpecialties(active.map((s) => s.name));
        } else {
          setSpecialties([
            "Cardiology",
            "Dermatology",
            "Neurology",
            "Pediatrics",
            "Orthopedics",
            "Gynecology",
            "Dentistry",
            "Psychiatry",
            "General Physician",
            "ENT",
            "Ophthalmology",
          ]);
        }
      } catch (e) {
        console.error("Failed to load specialties", e);
        setSpecialties([
          "Cardiology",
          "Dermatology",
          "Neurology",
          "Pediatrics",
          "Orthopedics",
          "Gynecology",
          "Dentistry",
          "Psychiatry",
          "General Physician",
          "ENT",
          "Ophthalmology",
        ]);
      }
    }
    fetchSpecialties();
  }, []);

  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const fetchDoctors = async (
    page = 1,
    search = searchTerm,
    status = statusFilter,
    specialization = specializationFilter,
    limit = pagination.itemsPerPage || 10
  ) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(status !== "all" && { status }),
        ...(specialization !== "all" && { specialization }),
      });

      const res = await fetch(`/api/doctors/get?${params}`);
      const data = await res.json();

      if (!data.success) throw new Error(data.error);

      setDoctors(data.data || []);
      setPagination(
        data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 10,
          hasNextPage: false,
          hasPrevPage: false,
        }
      );
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDoctors(1, searchTerm, statusFilter, specializationFilter, pagination.itemsPerPage);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, specializationFilter, pagination.itemsPerPage]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleDelete = async () => {
    setConfirmOpen(false);
    if (selectedIds.length === 0) return toast.error("No doctors selected!");

    try {
      const res = await fetch("/api/doctors/delete-doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      const result = await res.json();
      if (result.success) {
        toast.success("Doctors deleted successfully!");
        setSelectedIds([]);
        fetchDoctors(pagination.currentPage);
      } else {
        toast.error(result.error || "Failed to delete doctors");
      }
    } catch (err) {
      toast.error("Error: " + err.message);
    }
  };

  const handleStatusChange = async (doctorId, newStatus) => {
    try {
      const res = await fetch("/api/doctors/onboard/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: doctorId, status: newStatus }),
      });

      const result = await res.json();
      if (result.success) {
        toast.success("Status updated successfully!");
        fetchDoctors(pagination.currentPage);
      } else {
        toast.error(result.error || "Failed to update status");
      }
    } catch (err) {
      toast.error("Error: " + err.message);
    }
  };

  const handleOnboardingStatusChange = async (doctorId, newStatus) => {
    try {
      const res = await fetch("/api/doctors/onboard/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: doctorId, onboarding_status: newStatus }),
      });

      const result = await res.json();
      if (result.success) {
        toast.success("Onboarding status updated!");
        fetchDoctors(pagination.currentPage);
      } else {
        toast.error(result.error || "Failed to update onboarding status");
      }
    } catch (err) {
      toast.error("Error: " + err.message);
    }
  };

  const handleSaveDoctor = async (formData) => {
    const url = editDoctor
      ? `/api/doctors/onboard/update`
      : `/api/doctors/onboard/web`;
    const method = editDoctor ? "PUT" : "POST";

    // Add flag to prevent generic "thank you" email since we send an invite link
    formData.append("isAdmin", "true");

    const res = await fetch(url, {
      method,
      body: formData,
    });

    const result = await res.json();
    if (!result.success && !result.status) throw new Error(result.error || result.message);

    // Auto-send invitation link when admin creates a new doctor
    if (!editDoctor && (result.doctorId || result.data?.id)) {
      await handleSendInvite(result.doctorId || result.data?.id);
    }

    fetchDoctors(pagination.currentPage);
    setEditDoctor(null);
    setOnboardingOpen(false);
  };

  const handleSendInvite = async (doctorId) => {
    try {
      setInvitingDoctorId(doctorId);
      const res = await fetch("/api/admin/doctors/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_id: doctorId }),
      });

      const result = await res.json();
      if (result.success) {
        toast.success("Invitation sent successfully!");
        fetchDoctors(pagination.currentPage);
      } else {
        toast.error(result.error || "Failed to send invitation");
      }
    } catch (err) {
      toast.error("Error sending invitation: " + err.message);
    } finally {
      setInvitingDoctorId(null);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchDoctors(newPage);
    }
  };

  const handleExport = async (exportType, format) => {
    try {
      setIsExporting(true);
      const idsToExport = exportType === "selected" ? selectedIds : "all";

      const res = await fetch("/api/admin/doctors/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: idsToExport,
          format: format,
          consentAcknowledged: true,
          admin_id: "admin-system", // In a real app, this would be from the session
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Export failed");
      }

      if (format === "csv") {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `doctors_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        const result = await res.json();
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result.data, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `doctors_export_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
      }

      toast.success(`Data exported as ${format.toUpperCase()} successfully!`);
      setExportModalOpen(false);
    } catch (err) {
      toast.error("Export Error: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(
      1,
      pagination.currentPage - Math.floor(maxVisiblePages / 2)
    );
    let endPage = Math.min(
      pagination.totalPages,
      startPage + maxVisiblePages - 1
    );

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  const getInitials = (name) => {
    return (
      name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "D"
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800";
      case "inactive":
        return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700";
      case "pending":
        return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800";
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700";
    }
  };

  const getOnboardingStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800";
      case "rejected":
        return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800";
      case "pending":
        return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800";
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700";
    }
  };



  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
      },
    },
    hover: {
      scale: 1.02,
      transition: {
        type: "spring",
        stiffness: 400,
      },
    },
  };

  const getProfilePhoto = (doctor) => {
    const passport = doctor.doctor_details?.passport_photo;
    if (Array.isArray(passport) && passport.length > 0) return passport[0];
    if (typeof passport === "string" && passport) return passport;
    // Fallback placeholder when no passport photo is available
    return "https://placehold.co/40x40?text=DR";
  };

  return (
    <>
      <main className="flex-1 overflow-auto relative z-0">
        <div className="p-2 md:p-4 bg-transparent">
          <div className="bg-white dark:bg-gray-800/90 rounded-2xl shadow-xl border border-gray-50 dark:border-gray-700/50">
            <div className="min-h-screen bg-gradient-to-br from-gray-50 rounded-2xl to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 lg:p-6">
              {/* Header Section */}
              <motion.div
                className="mb-8"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <motion.h4
                      className="text-4xl font-bold text-gray-900 dark:text-white mb-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      Doctor Management
                    </motion.h4>
                    <motion.p
                      className="text-gray-600 dark:text-gray-400 mt-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      Showing {pagination.totalItems} doctors
                    </motion.p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-4 sm:mt-0">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setExportModalOpen(true)}
                      className="flex items-center px-4 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors cursor-pointer border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <Download size={20} className="mr-2" />
                      Export Data
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setEditDoctor(null);
                        setOnboardingOpen(true);
                      }}
                      className="flex items-center px-4 py-2 text-sm bg-black text-white font-semibold rounded-lg transition-colors cursor-pointer border border-gray-300 dark:border-gray-700 hover:bg-gray-800"
                    >
                      <Plus size={20} className="mr-2" />
                      Onboard Doctor
                    </motion.button>
                  </div>
                </div>
              </motion.div>

              {/* Stats Cards */}
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {[
                  {
                    label: "Total Doctors",
                    onClick: () => setStatusFilter("all"),
                    value: summary.total,
                    icon: User,
                    color:
                      "from-gray-500 to-gray-600 dark:from-gray-800 dark:to-gray-900 text-gray-50",
                  },
                  {
                    label: "Active Doctors",
                    onClick: () => setStatusFilter("1"),
                    value: summary.active,
                    icon: CheckCircle,
                    color:
                      "from-green-500 to-green-600 dark:from-gray-800 dark:to-gray-900 text-gray-50",
                  },
                  {
                    label: "Pending Approval",
                    onClick: () => { setStatusFilter("pending_approval"); setSpecializationFilter("all"); setSearchTerm(""); },
                    value: summary.pending,
                    icon: AlertTriangle,
                    color:
                      "from-yellow-500 to-yellow-600 dark:from-yellow-800 dark:to-yellow-900 text-gray-50",
                  },
                  {
                    label: "Verified Doctors",
                    onClick: () => { setStatusFilter("verified"); setSpecializationFilter("all"); setSearchTerm(""); },
                    value: summary.verified,
                    icon: ShieldCheck,
                    color:
                      "from-[#0067A1] to-[#004F7C] dark:from-blue-800 dark:to-blue-900 text-gray-50",
                  },
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    variants={cardVariants}
                    whileHover="hover"
                    onClick={stat.onClick}
                    className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700/50 hover:shadow-sm transition-shadow cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {stat.label}
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                          {stat.value}
                        </p>
                      </div>
                      <div
                        className={`p-2 bg-gradient-to-r ${stat.color} rounded-lg border border-gray-300 dark:border-gray-600`}
                      >
                        <stat.icon className="w-6 h-6 text-gray-20 dark:text-white" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Controls Section */}
              <motion.div
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/50 p-4 mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Search Bar */}
                  <motion.div
                    className="relative flex-1 max-w-md"
                    whileFocus={{ scale: 1.02 }}
                  >
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search doctors by name, specialization, or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent transition-colors cursor-text"
                    />
                  </motion.div>

                  {/* Filters and Actions */}
                  <div className="flex flex-wrap items-center gap-3">
                    <motion.select
                      whileFocus={{ scale: 1.05 }}
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent transition-colors cursor-pointer"
                    >
                      <option value="all">All Status</option>
                      <option value="1">Active</option>
                      <option value="0">Inactive</option>
                      <option value="pending_approval">Pending Approval</option>
                      <option value="verified">Verified</option>
                    </motion.select>

                    <motion.select
                      whileFocus={{ scale: 1.05 }}
                      value={specializationFilter}
                      onChange={(e) => setSpecializationFilter(e.target.value)}
                      className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent transition-colors cursor-pointer"
                    >
                      <option value="all">All Specializations</option>
                      {specialties.map((spec) => (
                        <option key={spec} value={spec}>
                          {spec}
                        </option>
                      ))}
                    </motion.select>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => fetchDoctors(1)}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                    >
                      <Filter size={20} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => fetchDoctors(pagination.currentPage)}
                      disabled={loading}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <RefreshCw
                        size={20}
                        className={loading ? "animate-spin" : ""}
                      />
                    </motion.button>
                  </div>
                </div>

                {/* Bulk Actions */}
                <AnimatePresence>
                  {selectedIds.length > 0 && (
                    <motion.div
                      key="bulk-actions"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center justify-between mt-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl border border-red-200 dark:border-red-800/50"
                    >
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
                        <span className="text-red-700 dark:text-red-300 font-medium">
                          {selectedIds.length} doctor(s) selected
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            const newStatus = 1; // Active
                            Promise.all(
                              selectedIds.map((id) =>
                                handleStatusChange(id, newStatus)
                              )
                            );
                          }}
                          className="flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-all duration-300 cursor-pointer text-sm"
                        >
                          <CheckCircle size={16} className="mr-1" />
                          Activate
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            const newStatus = 0; // Inactive
                            Promise.all(
                              selectedIds.map((id) =>
                                handleStatusChange(id, newStatus)
                              )
                            );
                          }}
                          className="flex items-center px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-all duration-300 cursor-pointer text-sm"
                        >
                          <XCircle size={16} className="mr-1" />
                          Deactivate
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setConfirmOpen(true)}
                          className="flex items-center px-3 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-medium rounded-lg transition-all duration-300 cursor-pointer text-sm"
                        >
                          <Trash2 size={16} className="mr-1" />
                          Delete Selected
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Doctors Table */}
              <motion.div
                className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700/50 overflow-hidden mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                {loading ? (
                  <motion.div
                    className="flex items-center justify-center py-12"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <RefreshCw size={32} className="text-gray-400" />
                    </motion.div>
                  </motion.div>
                ) : doctors.length === 0 ? (
                  <motion.div
                    className="text-center py-12"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No doctors found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-500 mb-4">
                      {searchTerm ||
                        statusFilter !== "all" ||
                        specializationFilter !== "all"
                        ? "Try adjusting your search criteria"
                        : "Get started by onboarding your first doctor"}
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setEditDoctor(null);
                        setOnboardingOpen(true);
                      }}
                      className="inline-flex items-center px-4 py-2 bg-black text-white font-medium rounded-lg transition-all duration-300 cursor-pointer border border-gray-300 dark:border-gray-700 hover:bg-gray-800"
                    >
                      <Plus size={20} className="mr-2" />
                      Onboard New Doctor
                    </motion.button>
                  </motion.div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left w-[50px]">
                            <input
                              type="checkbox"
                              onChange={(e) =>
                                setSelectedIds(
                                  e.target.checked
                                    ? doctors.map((d) => d.id)
                                    : []
                                )
                              }
                              checked={
                                doctors.length > 0 &&
                                selectedIds.length === doctors.length
                              }
                              className="rounded border-gray-300 dark:border-gray-600 text-black focus:ring-black bg-white dark:bg-gray-700 cursor-pointer"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[280px]">
                            Doctor Details
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[180px]">
                            Specialization
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[150px]">
                            Contact Info
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[120px]">
                            Experience
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[140px]">
                            Account Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[140px]">
                            Onboarding
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[250px]">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {doctors.map((doctor, index) => (
                          <motion.tr
                            key={doctor.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all duration-300"
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(doctor.id)}
                                onChange={() => toggleSelect(doctor.id)}
                                className="rounded border-gray-300 dark:border-gray-600 text-black focus:ring-black bg-white dark:bg-gray-700 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  {getProfilePhoto(doctor) ? (
                                    <motion.img
                                      whileHover={{ scale: 1.1 }}
                                      className="h-10 w-10 rounded-full object-cover shadow-sm"
                                      src={getProfilePhoto(doctor)}
                                      alt=""
                                    />
                                  ) : (
                                    <motion.div
                                      whileHover={{ scale: 1.1 }}
                                      className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-900 flex items-center justify-center text-white font-medium text-sm shadow-sm"
                                    >
                                      {getInitials(
                                        doctor.doctor_details?.full_name
                                      )}
                                    </motion.div>
                                  )}
                                </div>
                                <div className="ml-4">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                      {(() => {
                                        let name = doctor.doctor_details?.full_name || "Unknown";
                                        if (name !== "Unknown" && !/^dr\.?\s/i.test(name)) {
                                          name = `Dr. ${name}`;
                                        }
                                        return name;
                                      })()}
                                    </span>
                                    {doctor.doctor_details?.kyc_status === 'verified' ? (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 shrink-0">
                                        ✓ KYC Done
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 shrink-0">
                                        No KYC
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    ID: {formatDoctorUnId(doctor.un_id)}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 max-w-[180px]">
                              <div className="flex items-center">
                                <Award
                                  size={16}
                                  className="text-gray-400 dark:text-gray-400 mr-2 flex-shrink-0"
                                />
                                <span
                                  className="text-sm text-gray-900 dark:text-white truncate"
                                  title={formatArrayOrString(doctor.doctor_details?.specialization)}
                                >
                                  {formatArrayOrString(
                                    doctor.doctor_details?.specialization,
                                    "N/A"
                                  )}
                                </span>
                              </div>
                              {doctor.doctor_details?.speciality_tags && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {doctor.doctor_details.speciality_tags
                                    .slice(0, 2)
                                    .map((tag) => (
                                      <span
                                        key={tag}
                                        className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  {doctor.doctor_details.speciality_tags
                                    .length > 2 && (
                                      <span className="text-xs text-gray-500 dark:text-gray-500">
                                        +
                                        {doctor.doctor_details.speciality_tags
                                          .length - 2}
                                      </span>
                                    )}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white">
                                {doctor.doctor_details?.email || "No email"}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1">
                                <Phone size={14} className="mr-1" />
                                {doctor.phone_number || "No phone"}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white">
                                {doctor.doctor_details?.experience_years || "0"}{" "}
                                years
                              </div>
                              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                                <Star
                                  size={14}
                                  className="mr-1 text-yellow-500"
                                />
                                {doctor.doctor_details?.rating || "0.0"} (
                                {doctor.doctor_details?.total_reviews || 0})
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex flex-col gap-2">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                    doctor.status === 1 ? "active" : "inactive"
                                  )}`}
                                >
                                  {doctor.status === 1 ? "Active" : "Inactive"}
                                </span>
                                <select
                                  value={doctor.status}
                                  onChange={(e) =>
                                    handleStatusChange(
                                      doctor.id,
                                      parseInt(e.target.value)
                                    )
                                  }
                                  className="text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1 focus:ring-2 focus:ring-black focus:border-transparent cursor-pointer"
                                >
                                  <option value={1}>Active</option>
                                  <option value={0}>Inactive</option>
                                </select>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-2">
                                <span
                                  className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOnboardingStatusColor(
                                    doctor.doctor_details?.onboarding_status
                                  )}`}
                                >
                                  {doctor.doctor_details?.onboarding_status ||
                                    "pending"}
                                </span>
                                <select
                                  value={doctor.doctor_details?.onboarding_status || "pending"}
                                  onChange={(e) =>
                                    handleOnboardingStatusChange(
                                      doctor.id,
                                      e.target.value
                                    )
                                  }
                                  className="text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1 focus:ring-2 focus:ring-black focus:border-transparent cursor-pointer"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="approved">Approved</option>
                                  <option value="rejected">Rejected</option>
                                </select>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => {
                                    setLogsDoctor(doctor);
                                    setLogsModalOpen(true);
                                  }}
                                  className="flex items-center px-2 py-1 bg-blue-50 text-[#0067A1] hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 rounded transition-colors cursor-pointer text-xs font-bold border border-blue-200 dark:border-blue-800"
                                >
                                  <ClipboardList size={14} className="mr-1.5" />
                                  LOGS
                                </motion.button>

                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => {
                                    setDocsDoctor(doctor);
                                    setDocsModalOpen(true);
                                  }}
                                  className="flex items-center px-2 py-1 bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 rounded transition-colors cursor-pointer text-xs font-bold border border-orange-200 dark:border-orange-800"
                                >
                                  <FileText size={14} className="mr-1.5" />
                                  DOCS
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => {
                                    setViewDoctor(doctor);
                                    setDetailsModalOpen(true);
                                  }}
                                  className="flex items-center px-2 py-1 bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 rounded transition-colors cursor-pointer text-xs font-bold border border-green-200 dark:border-green-800"
                                >
                                  <Eye size={14} className="mr-1.5" />

                                </motion.button>

                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => {
                                    setEditDoctor(doctor);
                                    setOnboardingOpen(true);
                                  }}
                                  className="flex items-center px-2 py-1 bg-teal-50 text-[#0067A1] hover:bg-teal-100 dark:bg-[#003358]/20 dark:text-[#0080C6] rounded transition-colors cursor-pointer text-xs font-bold border border-teal-200 dark:border-teal-800"
                                >
                                  <Edit size={14} className="mr-1.5" />

                                </motion.button>



                                <motion.button
                                  whileHover={invitingDoctorId === doctor.id ? {} : { scale: 1.1 }}
                                  whileTap={invitingDoctorId === doctor.id ? {} : { scale: 0.9 }}
                                  onClick={() => handleSendInvite(doctor.id)}
                                  disabled={invitingDoctorId === doctor.id}
                                  className={`flex items-center px-2 py-1 rounded transition-colors duration-300 text-xs font-bold border ${
                                    invitingDoctorId === doctor.id
                                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700"
                                      : "bg-teal-50 text-[#0067A1] hover:bg-teal-100 dark:bg-[#003358]/20 dark:text-[#0080C6] cursor-pointer border-teal-200 dark:border-teal-800"
                                  }`}
                                  title="Send Invite"
                                >
                                  {invitingDoctorId === doctor.id ? (
                                    <>
                                      <RefreshCw size={14} className="mr-1.5 animate-spin" />
                                      <span className="whitespace-nowrap">SENDING...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Mail size={14} className="mr-1.5" />
                                      <span className="whitespace-nowrap">
                                        INVITE {doctor.doctor_details?.meta?.invitation_count ? `(${doctor.doctor_details.meta.invitation_count})` : ''}
                                      </span>
                                    </>
                                  )}
                                </motion.button>

                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => toggleSelect(doctor.id)}
                                  className="p-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-all duration-300 cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 size={18} />
                                </motion.button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>

              {/* Pagination Component */}
              {doctors.length > 0 && (
                <motion.div
                  className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700/50 p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Showing{" "}
                      {(pagination.currentPage - 1) * pagination.itemsPerPage +
                        1}{" "}
                      to{" "}
                      {Math.min(
                        pagination.currentPage * pagination.itemsPerPage,
                        pagination.totalItems
                      )}{" "}
                      of {pagination.totalItems} doctors
                    </div>

                    <div className="flex items-center space-x-1">
                      {/* First Page */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handlePageChange(1)}
                        disabled={!pagination.hasPrevPage}
                        className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700/50 text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-300"
                      >
                        <ChevronsLeft size={16} />
                      </motion.button>

                      {/* Previous Page */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          handlePageChange(pagination.currentPage - 1)
                        }
                        disabled={!pagination.hasPrevPage}
                        className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700/50 text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-300"
                      >
                        <ChevronLeft size={16} />
                      </motion.button>

                      {/* Page Numbers */}
                      {getPageNumbers().map((pageNum) => (
                        <motion.button
                          key={pageNum}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-300 cursor-pointer ${pageNum === pagination.currentPage
                            ? "bg-black border-transparent text-white shadow-sm"
                            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700/50 text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                            }`}
                        >
                          {pageNum}
                        </motion.button>
                      ))}

                      {/* Next Page */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          handlePageChange(pagination.currentPage + 1)
                        }
                        disabled={!pagination.hasNextPage}
                        className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700/50 text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-300"
                      >
                        <ChevronRight size={16} />
                      </motion.button>

                      {/* Last Page */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handlePageChange(pagination.totalPages)}
                        disabled={!pagination.hasNextPage}
                        className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700/50 text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-300"
                      >
                        <ChevronsRight size={16} />
                      </motion.button>
                    </div>

                    {/* Items Per Page Selector */}
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400" key="items-per-page-container">
                      <span key="show-label">Show:</span>
                      <select
                        key="items-per-page-select"
                        value={pagination.itemsPerPage}
                        onChange={(e) => {
                          const newLimit = parseInt(e.target.value);
                          setPagination((prev) => ({
                            ...prev,
                            itemsPerPage: newLimit,
                            currentPage: 1,
                          }));
                        }}
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent cursor-pointer"
                      >
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                      </select>
                      <span key="per-page-label">per page</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={onboardingOpen}
        onClose={() => {
          setOnboardingOpen(false);
          setEditDoctor(null);
        }}
        doctor={editDoctor}
        onSave={handleSaveDoctor}
      />

      {/* Enhanced Doctor Details Modal */}
      <DoctorDetailsModal
        doctor={viewDoctor}
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setViewDoctor(null);
        }}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            key="delete-modal"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md transform transition-all border border-gray-200 dark:border-gray-700"
            >
              <div className="p-6 text-center">
                <motion.div
                  className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <AlertTriangle className="w-8 h-8 text-red-500 dark:text-red-400" />
                </motion.div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Confirm Deletion
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Are you sure you want to delete {selectedIds.length}{" "}
                  doctor(s)? This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setConfirmOpen(false)}
                    className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300 font-medium cursor-pointer"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDelete}
                    className="px-6 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-lg transition-all duration-300 font-medium cursor-pointer"
                  >
                    Delete
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logs Modal */}
      <AnimatePresence>
        {logsModalOpen && logsDoctor && (
          <motion.div
            key="logs-modal"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-xl p-4 max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                  <ClipboardList className="w-5 h-5 mr-2 text-blue-500" />
                  Doctor Activity Logs
                </h3>
                <button
                  onClick={() => setLogsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-900/50 flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white dark:border-gray-700 shadow-md bg-white flex-shrink-0">
                    {getProfilePhoto(logsDoctor) ? (
                      <img
                        src={getProfilePhoto(logsDoctor)}
                        alt={logsDoctor.doctor_details?.full_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = ""; // Force trigger fallback div if needed
                          e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400"><svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400">
                        <User className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="font-bold text-gray-900 dark:text-white truncate">
                      {logsDoctor.doctor_details?.full_name || logsDoctor.full_name || "Unknown"}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1 truncate">
                      <Mail className="w-3 h-3 mr-1" />
                      {logsDoctor.doctor_details?.email || logsDoctor.email || "No Email"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1">
                      <Phone className="w-3 h-3 mr-1" />
                      {logsDoctor.phone_number || "No Phone"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Verification Checklist</h4>

                  {/* Email / OTP Verification */}
                  <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg mr-3 ${(logsDoctor.onboarding_logs?.[0]?.otp_verified || logsDoctor.is_verified) ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-gray-900 dark:text-white">Email / OTP Verified</span>
                        {(logsDoctor.onboarding_logs?.[0]?.otp_verified || logsDoctor.is_verified) && (
                          <span className="text-[10px] text-gray-500">Verified at: {logsDoctor.onboarding_logs?.[0]?.updated_at ? new Date(logsDoctor.onboarding_logs[0].updated_at).toLocaleDateString() : 'N/A'}</span>
                        )}
                      </div>
                    </div>
                    {logsDoctor.onboarding_logs?.[0]?.otp_verified || logsDoctor.is_verified ? (
                      <span className="text-green-600 font-bold text-xs uppercase tracking-widest flex items-center"><CheckCircle className="w-4 h-4 mr-1" /> COMPLETED</span>
                    ) : (
                      <span className="text-red-500 font-bold text-xs uppercase tracking-widest flex items-center"><XCircle className="w-4 h-4 mr-1" /> PENDING</span>
                    )}
                  </div>

                  {/* Agreement Acceptance */}
                  <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg mr-3 ${(logsDoctor.onboarding_logs?.[0]?.agreement_accepted || logsDoctor.meta?.terms_conditions_agreement) ? 'bg-blue-100 text-[#0067A1]' : 'bg-gray-100 text-gray-400'}`}>
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-gray-900 dark:text-white">Terms & Agreements</span>
                        {(logsDoctor.onboarding_logs?.[0]?.agreement_accepted || logsDoctor.meta?.terms_conditions_agreement) && (
                          <span className="text-[10px] text-gray-500">Accepted: {logsDoctor.consent_logs?.[0]?.accepted_at ? new Date(logsDoctor.consent_logs[0].accepted_at).toLocaleDateString() : 'Yes'}</span>
                        )}
                      </div>
                    </div>
                    {logsDoctor.onboarding_logs?.[0]?.agreement_accepted || logsDoctor.doctor_details?.meta?.terms_conditions_agreement ? (
                      <span className="text-[#0067A1] font-bold text-xs uppercase tracking-widest flex items-center"><CheckCircle className="w-4 h-4 mr-1" /> COMPLETED</span>
                    ) : (
                      <span className="text-red-500 font-bold text-xs uppercase tracking-widest flex items-center"><XCircle className="w-4 h-4 mr-1" /> PENDING</span>
                    )}
                  </div>

                  {/* Digital Signature */}
                  <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg mr-3 ${(logsDoctor.doctor_details?.signature_url && (Array.isArray(logsDoctor.doctor_details.signature_url) ? logsDoctor.doctor_details.signature_url.length > 0 : logsDoctor.doctor_details.signature_url !== "[]")) ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'}`}>
                        <Edit className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-gray-900 dark:text-white">Digital Signature</span>
                        {(logsDoctor.doctor_details?.signature_url && (Array.isArray(logsDoctor.doctor_details.signature_url) ? logsDoctor.doctor_details.signature_url.length > 0 : logsDoctor.doctor_details.signature_url !== "[]")) && (
                          <span className="text-[10px] text-gray-500">Document Uploaded</span>
                        )}
                      </div>
                    </div>
                    {(logsDoctor.doctor_details?.signature_url && (Array.isArray(logsDoctor.doctor_details.signature_url) ? logsDoctor.doctor_details.signature_url.length > 0 : logsDoctor.doctor_details.signature_url !== "[]")) ? (
                      <span className="text-purple-600 font-bold text-xs uppercase tracking-widest flex items-center"><CheckCircle className="w-4 h-4 mr-1" /> COMPLETED</span>
                    ) : (
                      <span className="text-red-500 font-bold text-xs uppercase tracking-widest flex items-center"><XCircle className="w-4 h-4 mr-1" /> MISSING</span>
                    )}
                  </div>

                  {/* Aadhaar / KYC Document */}
                  <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg mr-3 ${(
                        (logsDoctor.doctor_details?.aadhaar_pan_license && (Array.isArray(logsDoctor.doctor_details.aadhaar_pan_license) ? logsDoctor.doctor_details.aadhaar_pan_license.length > 0 : logsDoctor.doctor_details.aadhaar_pan_license !== "[]")) ||
                        (logsDoctor.doctor_details?.kyc_data && (Array.isArray(logsDoctor.doctor_details.kyc_data) ? logsDoctor.doctor_details.kyc_data.length > 0 : (logsDoctor.doctor_details.kyc_data !== "[]" && Object.keys(logsDoctor.doctor_details.kyc_data).length > 0)))
                      ) ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-gray-900 dark:text-white">Aadhaar / KYC Document</span>
                        {(
                          (logsDoctor.doctor_details?.aadhaar_pan_license && (Array.isArray(logsDoctor.doctor_details.aadhaar_pan_license) ? logsDoctor.doctor_details.aadhaar_pan_license.length > 0 : logsDoctor.doctor_details.aadhaar_pan_license !== "[]")) ||
                          (logsDoctor.doctor_details?.kyc_data && (Array.isArray(logsDoctor.doctor_details.kyc_data) ? logsDoctor.doctor_details.kyc_data.length > 0 : (logsDoctor.doctor_details.kyc_data !== "[]" && Object.keys(logsDoctor.doctor_details.kyc_data).length > 0)))
                        ) && (
                            <span className="text-[10px] text-gray-500">Identity Verified</span>
                          )}
                      </div>
                    </div>
                    {(
                      (logsDoctor.doctor_details?.aadhaar_pan_license && (Array.isArray(logsDoctor.doctor_details.aadhaar_pan_license) ? logsDoctor.doctor_details.aadhaar_pan_license.length > 0 : logsDoctor.doctor_details.aadhaar_pan_license !== "[]")) ||
                      (logsDoctor.doctor_details?.kyc_data && (Array.isArray(logsDoctor.doctor_details.kyc_data) ? logsDoctor.doctor_details.kyc_data.length > 0 : (logsDoctor.doctor_details.kyc_data !== "[]" && Object.keys(logsDoctor.doctor_details.kyc_data).length > 0)))
                    ) ? (
                      <span className="text-orange-600 font-bold text-xs uppercase tracking-widest flex items-center"><CheckCircle className="w-4 h-4 mr-1" /> COMPLETED</span>
                    ) : (
                      <span className="text-red-500 font-bold text-xs uppercase tracking-widest flex items-center"><XCircle className="w-4 h-4 mr-1" /> PENDING</span>
                    )}
                  </div>

                  {/* Address Proof */}
                  <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg mr-3 ${(logsDoctor.doctor_details?.address_proof && (Array.isArray(logsDoctor.doctor_details.address_proof) ? logsDoctor.doctor_details.address_proof.length > 0 : logsDoctor.doctor_details.address_proof !== "[]")) ? 'bg-cyan-100 text-cyan-600' : 'bg-gray-100 text-gray-400'}`}>
                        <Home className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-gray-900 dark:text-white">Address Proof</span>
                        {(logsDoctor.doctor_details?.address_proof && (Array.isArray(logsDoctor.doctor_details.address_proof) ? logsDoctor.doctor_details.address_proof.length > 0 : logsDoctor.doctor_details.address_proof !== "[]")) && (
                          <span className="text-[10px] text-gray-500">Document Uploaded</span>
                        )}
                      </div>
                    </div>
                    {(logsDoctor.doctor_details?.address_proof && (Array.isArray(logsDoctor.doctor_details.address_proof) ? logsDoctor.doctor_details.address_proof.length > 0 : logsDoctor.doctor_details.address_proof !== "[]")) ? (
                      <span className="text-cyan-600 font-bold text-xs uppercase tracking-widest flex items-center"><CheckCircle className="w-4 h-4 mr-1" /> COMPLETED</span>
                    ) : (
                      <span className="text-red-500 font-bold text-xs uppercase tracking-widest flex items-center"><XCircle className="w-4 h-4 mr-1" /> MISSING</span>
                    )}
                  </div>

                  {/* Passport Photo */}
                  <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg mr-3 ${(logsDoctor.doctor_details?.passport_photo && (Array.isArray(logsDoctor.doctor_details.passport_photo) ? logsDoctor.doctor_details.passport_photo.length > 0 : logsDoctor.doctor_details.passport_photo !== "[]")) ? 'bg-teal-100 text-[#0067A1]' : 'bg-gray-100 text-gray-400'}`}>
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-gray-900 dark:text-white">Passport Photo</span>
                        {(logsDoctor.doctor_details?.passport_photo && (Array.isArray(logsDoctor.doctor_details.passport_photo) ? logsDoctor.doctor_details.passport_photo.length > 0 : logsDoctor.doctor_details.passport_photo !== "[]")) && (
                          <span className="text-[10px] text-gray-500">Photo Uploaded</span>
                        )}
                      </div>
                    </div>
                    {(logsDoctor.doctor_details?.passport_photo && (Array.isArray(logsDoctor.doctor_details.passport_photo) ? logsDoctor.doctor_details.passport_photo.length > 0 : logsDoctor.doctor_details.passport_photo !== "[]")) ? (
                      <span className="text-[#0067A1] font-bold text-xs uppercase tracking-widest flex items-center"><CheckCircle className="w-4 h-4 mr-1" /> COMPLETED</span>
                    ) : (
                      <span className="text-red-500 font-bold text-xs uppercase tracking-widest flex items-center"><XCircle className="w-4 h-4 mr-1" /> MISSING</span>
                    )}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Onboarding Summary</h4>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">CURRENT STATUS</span>
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-800 text-[#004F7C] dark:text-blue-200 text-[10px] rounded-full font-bold uppercase tracking-wider">
                        {logsDoctor.onboarding_logs?.[0]?.status || logsDoctor.onboarding_status || "INITIAL"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">REGISTRATION VERIFIED</span>
                      {logsDoctor.doctor_details?.registration_verified ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Clock4 className="w-4 h-4 text-blue-400 animate-pulse" />
                      )}
                    </div>
                    <p className="text-[10px] text-[#0067A1]/70 dark:text-blue-400/70 mt-3 pt-3 border-t border-blue-200/50 dark:border-blue-800/50">
                      Last Activity Logged: {logsDoctor.onboarding_logs?.[0]?.updated_at ? new Date(logsDoctor.onboarding_logs[0].updated_at).toLocaleString() : "No recent activity recorded."}
                    </p>
                  </div>
                </div>

                {/* ─── Admin Action Panel ──────────────────────────────── */}
                <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700 mt-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-500" />
                    Admin Verification Actions
                  </h4>

                  {/* Current onboarding_status */}
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Onboarding Status</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                      (logsDoctor.doctor_details?.onboarding_status || "pending") === "approved"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : (logsDoctor.doctor_details?.onboarding_status || "pending") === "rejected"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    }`}>
                      {logsDoctor.doctor_details?.onboarding_status || "pending"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Prescription Rights</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                      logsDoctor.doctor_details?.registration_verified
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}>
                      {logsDoctor.doctor_details?.registration_verified ? "✓ Enabled" : "✗ Blocked"}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-1 gap-2 pt-1">
                    {/* Case 1: Not yet approved → show Approve button */}
                    {logsDoctor.doctor_details?.onboarding_status !== "approved" && (
                      <button
                        onClick={async () => {
                          const confirmed = window.confirm(`Approve Dr. ${logsDoctor.doctor_details?.full_name || "this doctor"}?\n\nThis will:\n• Set onboarding status to Approved\n• Enable prescription rights\n• Activate their account`);
                          if (!confirmed) return;
                          try {
                            const res = await fetch("/api/doctors/onboard/status", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: logsDoctor.id, onboarding_status: "approved" }),
                            });
                            const result = await res.json();
                            if (result.success) {
                              toast.success("Doctor approved and prescription rights enabled!");
                              setLogsModalOpen(false);
                              fetchDoctors(pagination.currentPage);
                            } else {
                              toast.error(result.error || "Approval failed");
                            }
                          } catch (e) {
                            toast.error("Error: " + e.message);
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm font-semibold rounded-lg transition-all shadow-sm"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve & Enable Prescription Rights
                      </button>
                    )}

                    {/* Case 2: Approved but registration_verified is STILL false → fix button */}
                    {logsDoctor.doctor_details?.onboarding_status === "approved" && !logsDoctor.doctor_details?.registration_verified && (
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch("/api/admin/doctors/fix-prescription-rights", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: logsDoctor.id }),
                            });
                            const result = await res.json();
                            if (result.success) {
                              toast.success("Prescription rights enabled! Doctor can now write prescriptions.");
                              setLogsModalOpen(false);
                              fetchDoctors(pagination.currentPage);
                            } else {
                              toast.error(result.error || "Failed to fix prescription rights");
                            }
                          } catch (e) {
                            toast.error("Error: " + e.message);
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-semibold rounded-lg transition-all shadow-sm"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Fix Prescription Rights (Approved but Blocked)
                      </button>
                    )}

                    {/* Case 3: Fully approved + registration_verified = true → success banner */}
                    {logsDoctor.doctor_details?.onboarding_status === "approved" && logsDoctor.doctor_details?.registration_verified && (
                      <div className="flex items-center gap-2 py-2.5 px-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-700 dark:text-green-400 font-medium">Doctor Approved — Prescription Rights Active</span>
                      </div>
                    )}

                    {logsDoctor.doctor_details?.onboarding_status !== "rejected" && (
                      <button
                        onClick={async () => {
                          const confirmed = window.confirm(`Reject Dr. ${logsDoctor.doctor_details?.full_name || "this doctor"}?\n\nThis will:\n• Set onboarding status to Rejected\n• Block prescription rights\n• Deactivate their account`);
                          if (!confirmed) return;
                          try {
                            const res = await fetch("/api/doctors/onboard/status", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: logsDoctor.id, onboarding_status: "rejected" }),
                            });
                            const result = await res.json();
                            if (result.success) {
                              toast.success("Doctor rejected and account deactivated.");
                              setLogsModalOpen(false);
                              fetchDoctors(pagination.currentPage);
                            } else {
                              toast.error(result.error || "Rejection failed");
                            }
                          } catch (e) {
                            toast.error("Error: " + e.message);
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-semibold rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject & Deactivate Account
                      </button>
                    )}

                    {logsDoctor.doctor_details?.onboarding_status === "rejected" && (
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch("/api/doctors/onboard/status", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: logsDoctor.id, onboarding_status: "pending" }),
                            });
                            const result = await res.json();
                            if (result.success) {
                              toast.success("Doctor moved back to Pending review.");
                              setLogsModalOpen(false);
                              fetchDoctors(pagination.currentPage);
                            } else {
                              toast.error(result.error || "Failed");
                            }
                          } catch (e) {
                            toast.error("Error: " + e.message);
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 text-sm font-semibold rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all"
                      >
                        <Clock className="w-4 h-4" />
                        Move Back to Pending
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Documents Modal */}
      <AnimatePresence>
        {isDocsModalOpen && docsDoctor && (
          <motion.div
            key="docs-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
            onClick={() => setDocsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-orange-50 to-white dark:from-gray-800 dark:to-gray-900">
                <div className="flex items-center">
                  <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl mr-4">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Documents</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Review all uploaded documentation for {docsDoctor.full_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDocsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Content */}
              <div className="p-8 overflow-y-auto max-h-[calc(90vh-100px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { label: "DMC/MCI Certificate", key: "dmc_mci_certificate" },
                    { label: "Aadhaar/PAN/License", key: "aadhaar_pan_license" },
                    { label: "Address Proof", key: "address_proof" },
                    { label: "Passport Photo", key: "passport_photo" },
                    { label: "Digital Signature", key: "signature_url" },
                    { label: "Clinic Photos", key: "clinic_photos" },
                  ].map((doc) => {
                    const value = docsDoctor.doctor_details?.[doc.key] || docsDoctor[doc.key];
                    const urls = Array.isArray(value) ? value : (value ? [value] : []);

                    return (
                      <div key={doc.key} className="p-5 border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-800/50">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center">
                          <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                          {doc.label}
                        </h3>

                        {urls.length === 0 || (urls.length === 1 && (urls[0] === "[]" || !urls[0])) ? (
                          <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-600 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                            <FileText className="w-8 h-8 mb-2 opacity-20" />
                            <span className="text-xs uppercase tracking-widest font-medium">Not Available</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-4">
                            {urls.map((url, idx) => {
                              if (!url || url === "[]") return null;
                              const isImage = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url);

                              return (
                                <div key={idx} className="group relative">
                                  {isImage ? (
                                    <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                                      <img
                                        src={url}
                                        alt={`${doc.label} ${idx + 1}`}
                                        className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                        <a
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-2 bg-white text-gray-900 rounded-full hover:bg-orange-500 hover:text-white transition-colors shadow-sm"
                                          title="View Full Size"
                                        >
                                          <Eye size={18} />
                                        </a>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl group-hover:border-orange-500 transition-colors shadow-sm">
                                      <div className="flex items-center overflow-hidden">
                                        <div className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-lg mr-3">
                                          <FileText size={20} />
                                        </div>
                                        <div className="overflow-hidden">
                                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate max-w-[150px]">
                                            {url.split('/').pop().split('?')[0]}
                                          </p>
                                          <p className="text-[10px] text-gray-500 uppercase">Document File</p>
                                        </div>
                                      </div>
                                      <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-orange-600 transition-all shadow-md"
                                      >
                                        VIEW
                                      </a>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Export Consent Modal */}
      <AnimatePresence>
        {exportModalOpen && (
          <motion.div
            key="export-modal"
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExportModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.98, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 10 }}
              className="bg-white dark:bg-gray-900 rounded-[1.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Theme-Consistent Header */}
              <div className="relative p-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-black dark:bg-white rounded-lg shadow-sm">
                    <ShieldCheck className="w-6 h-6 text-white dark:text-black" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-black dark:text-white leading-tight">
                      Data Export Authorization
                    </h3>
                    <div className="flex items-center mt-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                        DPDP COMPLIANT
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setExportModalOpen(false)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all text-gray-400 hover:text-black dark:hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Theme-Consistent Body */}
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                <div className="mb-6">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Compliance Protocols</h4>
                  <div className="space-y-3">
                    {[
                      { icon: Home, text: "Authorized administrative usage only." },
                      { icon: Shield, text: "Strict adherence to DPDP Act 2023." },
                      { icon: FileCheck, text: "Prevention of unauthorized PII disclosure." },
                      { icon: BadgeCheck, text: "Secure local storage with encryption." }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/50">
                        <item.icon className="w-4 h-4 text-black dark:text-white mr-3 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
                  <label className="flex items-start space-x-3 cursor-pointer group">
                    <div className="relative flex items-center mt-0.5">
                      <input
                        type="checkbox"
                        id="consent-check-theme"
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 checked:bg-black dark:checked:bg-white checked:border-black dark:checked:border-white transition-all"
                      />
                      <CheckCircle className="absolute h-5 w-5 text-white dark:text-black opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none p-0.5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-black dark:text-white group-hover:underline decoration-2 underline-offset-4">
                        Acknowledge Responsibility
                      </span>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                        I confirm that I have the legal authority to export this sensitive medical professional data and assume full liability.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Theme-Consistent Footer */}
              <div className="p-6 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isExporting}
                    onClick={() => {
                      const check = document.getElementById('consent-check-theme');
                      if (!check.checked) return toast.error("Acknowledgement required.");
                      handleExport(selectedIds.length > 0 ? "selected" : "all", "csv");
                    }}
                    className="flex items-center justify-center py-3 px-4 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm shadow-sm transition-all disabled:opacity-50"
                  >
                    <FileSpreadsheet className="mr-2 w-4 h-4" />
                    CSV {selectedIds.length > 0 ? `(${selectedIds.length})` : "(All)"}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isExporting}
                    onClick={() => {
                      const check = document.getElementById('consent-check-theme');
                      if (!check.checked) return toast.error("Acknowledgement required.");
                      handleExport(selectedIds.length > 0 ? "selected" : "all", "json");
                    }}
                    className="flex items-center justify-center py-3 px-4 bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
                  >
                    <FileJson className="mr-2 w-4 h-4" />
                    JSON {selectedIds.length > 0 ? `(${selectedIds.length})` : "(All)"}
                  </motion.button>
                </div>
                <p className="text-[9px] text-center text-gray-400 mt-4 font-bold uppercase tracking-[0.2em]">
                  MEDICONNECT V2 • SECURE ADMIN TERMINAL
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
