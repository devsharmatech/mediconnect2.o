"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

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
} from "lucide-react";

export default function DoctorOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Personal Information
    doctor_name: "",
    email: "",
    phone: "",
    qualification: [],
    doctor_registration_no: "",
    years_experience: "",

    // Professional Details
    speciality: [],
    super_speciality: [],

    // Clinic Details
    clinic_address: "",
    clinic_photos: [],
    clinic_lat: "",
    clinic_lng: "",

    // Availability
    leave_days: [],
    clinic_slots: {},
    video_slots: {},
    home_slots: {},

    // Identity Documents
    insurance: "",
    aadhaar: "",
    pan: "",
    driving_license: "",
    address: "",

    // Document Uploads
    address_proof: null,
    dmc_mci_nmc_certificates: [],
    passport_photo: null,
    digital_signature: "",

    // Bank Details
    bank_account_number: "",
    bank_ifsc_code: "",
    bank_name: "",
    bank_branch: "",

    // Agreements
    bpl_service_agreement: false,
    bpl_preferred_time: "",
    non_disclosure_agreement: false,
    terms_conditions_agreement: false,
    digital_consent: false,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [signatureData, setSignatureData] = useState("");
  const [activeSignatureTab, setActiveSignatureTab] = useState("draw");
  const [isDrawing, setIsDrawing] = useState(false);

  const canvasRef = useRef(null);
  const fileInputRefs = useRef({});

  const steps = [
    { number: 1, title: "Personal Info", icon: User, color: "blue" },
    { number: 2, title: "Professional", icon: Award, color: "green" },
    { number: 3, title: "Documents", icon: FileText, color: "blue" },
    { number: 4, title: "Bank & Agreements", icon: Shield, color: "orange" },
  ];

  const specialities = [
    {
      name: "General Physician",
      icon: "👨‍⚕️",
      description: "General medical practitioner",
    },
    {
      name: "Pediatrician",
      icon: "👶",
      description: "Child healthcare specialist",
    },
    {
      name: "Gynecologist",
      icon: "👩",
      description: "Women health specialist",
    },
    { name: "Cardiologist", icon: "❤️", description: "Heart specialist" },
    { name: "Dermatologist", icon: "🔬", description: "Skin specialist" },
    {
      name: "Orthopedic",
      icon: "🦴",
      description: "Bone and joint specialist",
    },
    {
      name: "Psychiatrist",
      icon: "🧠",
      description: "Mental health specialist",
    },
    { name: "ENT Specialist", icon: "👂", description: "Ear, Nose, Throat" },
    { name: "Ophthalmologist", icon: "👁️", description: "Eye specialist" },
    { name: "Dentist", icon: "🦷", description: "Dental care specialist" },
    { name: "Pulmonologist", icon: "🫁", description: "Lung specialist" },
    { name: "Endocrinologist", icon: "⚖️", description: "Hormone specialist" },
    { name: "Radiologist", icon: "📷", description: "Medical imaging" },
    { name: "Urologist", icon: "💧", description: "Urinary system specialist" },
    {
      name: "Anesthesiologist",
      icon: "💉",
      description: "Anesthesia specialist",
    },
  ];

  const superSpecialities = [
    { name: "Nephrology", icon: "🧬", description: "Kidney specialist" },
    { name: "Oncology", icon: "🎗️", description: "Cancer specialist" },
    {
      name: "Neurosurgery",
      icon: "🧠",
      description: "Brain surgery specialist",
    },
    {
      name: "Gastroenterology",
      icon: "🍽️",
      description: "Digestive system specialist",
    },
    {
      name: "Cardiac Surgery",
      icon: "💓",
      description: "Heart surgery specialist",
    },
    {
      name: "Plastic Surgery",
      icon: "✨",
      description: "Cosmetic surgery specialist",
    },
    {
      name: "Rheumatology",
      icon: "🦵",
      description: "Joint and arthritis specialist",
    },
    {
      name: "Hematology",
      icon: "🩸",
      description: "Blood disorder specialist",
    },
    {
      name: "Endovascular Surgery",
      icon: "🩺",
      description: "Vascular surgery specialist",
    },
    {
      name: "Pulmonology (Critical Care)",
      icon: "🏥",
      description: "Critical care specialist",
    },
    {
      name: "Transplant Surgery",
      icon: "🔄",
      description: "Organ transplant specialist",
    },
  ];

  const qualificationsList = [
    "MBBS",
    "MD",
    "MS",
    "DNB",
    "BDS",
    "MDS",
    "BHMS",
    "BAMS",
    "BUMS",
    "DM",
    "MCh",
    "PhD (Medical)",
    "Other",
  ];

  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  // Initialize time slots
  useEffect(() => {
    const initialSlots = {};
    daysOfWeek.forEach((day) => {
      initialSlots[day] = { start: "", end: "" };
    });

    setFormData((prev) => ({
      ...prev,
      clinic_slots: { ...initialSlots },
      video_slots: { ...initialSlots },
      home_slots: { ...initialSlots },
    }));
  }, []);

  // Get geolocation
  useEffect(() => {
    if (navigator.geolocation) {
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
  }, []);

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

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("File size should be less than 2MB");
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
      setFormData((prev) => ({ ...prev, digital_signature: signature }));
    } else if (activeSignatureTab === "upload") {
      // For uploaded signature
      if (!signatureData) {
        alert("Please upload a signature image first");
        return;
      }
      setFormData((prev) => ({ ...prev, digital_signature: signatureData }));
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

  const handleQualificationAdd = (value) => {
    if (value && !formData.qualification.includes(value)) {
      setFormData((prev) => ({
        ...prev,
        qualification: [...prev.qualification, value],
      }));
    }
  };

  const handleQualificationRemove = (value) => {
    setFormData((prev) => ({
      ...prev,
      qualification: prev.qualification.filter((item) => item !== value),
    }));
  };

  const handleFileUpload = (field, files) => {
    const fileArray = Array.from(files);
    if (field === "dmc_mci_nmc_certificates" || field === "clinic_photos") {
      setFormData((prev) => ({
        ...prev,
        [field]: [...prev[field], ...fileArray],
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
        [field]: prev[field].filter((_, i) => i !== index),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleTimeSlotChange = (type, day, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [day]: {
          ...prev[type][day],
          [field]: value,
        },
      },
    }));
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

        // Address validation if provided
        if (formData.address && formData.address.length < 10)
          newErrors.address = "Please enter a complete address";

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
        if (!formData.digital_consent)
          newErrors.digital_consent = "Digital consent is required to proceed";

        break;
    }
    console.log(newErrors)
    setErrors(newErrors);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(currentStep)) return;

    try {
      setLoading(true);
      toast.loading("Submitting your application...", { id: "loading" });

      const fd = new FormData();

      // Append scalar, array, and object fields
      Object.entries(formData).forEach(([key, value]) => {
        if (
          value === null ||
          value === undefined ||
          key === "dmc_mci_nmc_certificates" ||
          key === "clinic_photos"
        )
          return;

        if (Array.isArray(value) || typeof value === "object") {
          fd.append(key, JSON.stringify(value));
        } else {
          fd.append(key, value);
        }
      });

      // Multi-file uploads
      if (formData.dmc_mci_nmc_certificates?.length) {
        formData.dmc_mci_nmc_certificates.forEach((file) =>
          fd.append("dmc_mci_nmc_certificates", file)
        );
      }

      if (formData.clinic_photos?.length) {
        formData.clinic_photos.forEach((file) =>
          fd.append("clinic_photos", file)
        );
      }

      // Optional files (single)
      if (formData.address_proof)
        fd.append("address_proof", formData.address_proof);
      if (formData.passport_photo)
        fd.append("passport_photo", formData.passport_photo);

      // Digital signature (dataURL or File)
      if (formData.digital_signature) {
        if (typeof formData.digital_signature === "string") {
          fd.append("digital_signature", formData.digital_signature);
        } else {
          fd.append("digital_signature", formData.digital_signature);
        }
      }

      // Send to API
      const res = await fetch("/api/doctors/onboard/web", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();

      toast.dismiss("loading");
      if (data.status) {
        toast.success("✅ Doctor onboarded successfully!");
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

  const FileUploadBox = ({
    field,
    label,
    accept,
    multiple = false,
    required = false,
  }) => (
    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-blue-500 transition-colors">
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
          className="inline-block mt-4 bg-blue-800 text-white px-6 py-2 rounded-lg hover:bg-[#004F7C] cursor-pointer transition-colors"
        >
          Choose Files
        </label>
      </div>

      {/* File previews */}
      {formData[field] && (multiple ? formData[field].length > 0 : true) && (
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Uploaded files:
          </p>
          <div className="space-y-2">
            {multiple ? (
              formData[field].map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-green-50 p-3 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <FileCheck className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-gray-700">{file.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(field, index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileCheck className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-700">
                    {formData[field].name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(field, 0)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const SpecialityCard = ({ speciality, field, selected }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
        selected
          ? "border-blue-500 bg-blue-50 shadow-md"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
      onClick={() => handleArrayToggle(field, speciality.name)}
    >
      <div className="flex items-center space-x-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            selected ? "bg-blue-100" : "bg-gray-100"
          }`}
        >
          <span className="text-lg">{speciality.icon}</span>
        </div>
        <div className="flex-1">
          <h4
            className={`font-semibold ${
              selected ? "text-[#004F7C]" : "text-gray-700"
            }`}
          >
            {speciality.name}
          </h4>
          <p className="text-sm text-gray-500">{speciality.description}</p>
        </div>
        <div
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
            selected ? "bg-blue-500 border-blue-500" : "border-gray-300"
          }`}
        >
          {selected && <CheckCircle className="w-4 h-4 text-white" />}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="bg-gradient-to-r from-blue-800 to-blue-800 text-white rounded-2xl p-8 shadow-2xl">
            <h1 className="text-4xl font-bold mb-4">Doctor Onboarding Form</h1>
            <p className="text-xl opacity-90">
              Join our network of healthcare professionals
            </p>
          </div>
        </motion.div>

        {/* Progress Bar */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="mb-4">
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <div className="flex justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="text-center flex-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 border-4 ${
                    currentStep > step.number
                      ? "bg-green-500 border-green-500 text-white"
                      : currentStep === step.number
                      ? "bg-blue-800 border-blue-800 text-white shadow-lg"
                      : "bg-white border-gray-300 text-gray-400"
                  }`}
                >
                  {currentStep > step.number ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <step.icon className="w-6 h-6" />
                  )}
                </div>
                <span
                  className={`text-sm font-semibold ${
                    currentStep >= step.number
                      ? "text-blue-800"
                      : "text-gray-500"
                  }`}
                >
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <form onSubmit={handleSubmit}>
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-8"
              >
                <div className="flex items-center mb-8">
                  <div className="w-12 h-12 bg-blue-800 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Personal Information
                    </h2>
                    <p className="text-gray-600">Tell us about yourself</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                        errors.doctor_name
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
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                        errors.email ? "border-red-500" : "border-gray-300"
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
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                        errors.phone ? "border-red-500" : "border-gray-300"
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
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="">Select years</option>
                      {Array.from({ length: 50 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1} Years
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Qualification *
                    </label>
                    <div className="border-2 border-gray-300 rounded-xl p-4 min-h-[60px] bg-white">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {formData.qualification.map((qual) => (
                          <span
                            key={qual}
                            className="bg-gradient-to-r from-blue-500 to-blue-500 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 shadow-md"
                          >
                            {qual}
                            <button
                              type="button"
                              onClick={() => handleQualificationRemove(qual)}
                              className="text-white hover:text-blue-100 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleQualificationAdd(e.target.value);
                            e.target.value = "";
                          }
                        }}
                        className="w-full border-none focus:ring-0 focus:outline-none bg-transparent"
                      >
                        <option value="">Add qualification...</option>
                        {qualificationsList.map((qual) => (
                          <option key={qual} value={qual}>
                            {qual}
                          </option>
                        ))}
                      </select>
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
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                        errors.doctor_registration_no
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

                <div className="flex justify-end mt-8">
                  <motion.button
                    type="button"
                    onClick={nextStep}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-gradient-to-r from-blue-800 to-blue-800 text-white px-8 py-4 rounded-xl hover:shadow-lg transition-all font-semibold shadow-md"
                  >
                    Next Step
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Professional Details */}
            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-8"
              >
                <div className="flex items-center mb-8">
                  <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Professional Details
                    </h2>
                    <p className="text-gray-600">
                      Your medical expertise and practice
                    </p>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Specialities */}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                      <Stethoscope className="w-6 h-6 mr-2 text-blue-800" />
                      Specialities
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {specialities.map((spec) => (
                        <SpecialityCard
                          key={spec.name}
                          speciality={spec}
                          field="speciality"
                          selected={formData.speciality.includes(spec.name)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Super Specialities */}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                      <Star className="w-6 h-6 mr-2 text-blue-800" />
                      Super Specialities
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {superSpecialities.map((spec) => (
                        <SpecialityCard
                          key={spec.name}
                          speciality={spec}
                          field="super_speciality"
                          selected={formData.super_speciality.includes(
                            spec.name
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Clinic Details */}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                      <Building className="w-6 h-6 mr-2 text-orange-600" />
                      Clinic Details
                    </h3>
                    <div className="space-y-6">
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
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          placeholder="Full clinic address with landmark"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FileUploadBox
                          field="clinic_photos"
                          label="Clinic Photos (Geo-tagged)"
                          accept="image/*"
                          multiple={true}
                        />
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Latitude
                          </label>
                          <input
                            type="text"
                            value={formData.clinic_lat}
                            readOnly
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50"
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
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Availability Slots */}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                      <Calendar className="w-6 h-6 mr-2 text-green-600" />
                      Weekly Availability
                    </h3>
                    <div className="overflow-x-auto bg-gray-50 rounded-xl p-4">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gradient-to-r from-blue-500 to-blue-500 text-white">
                            <th className="border border-blue-800 p-3 text-left rounded-l-xl">
                              Day
                            </th>
                            <th className="border border-blue-800 p-3 text-center">
                              Leave
                            </th>
                            <th className="border border-blue-800 p-3 text-center">
                              Clinic Visit
                            </th>
                            <th className="border border-blue-800 p-3 text-center">
                              Video Consultation
                            </th>
                            <th className="border border-blue-800 p-3 text-center rounded-r-xl">
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
                              <td className="border border-gray-200 p-3 font-semibold bg-white">
                                {day}
                              </td>
                              <td className="border border-gray-200 p-3 text-center bg-white">
                                <input
                                  type="checkbox"
                                  checked={formData.leave_days.includes(day)}
                                  onChange={() =>
                                    handleArrayToggle("leave_days", day)
                                  }
                                  className="w-5 h-5 rounded border-gray-300 text-blue-800 focus:ring-blue-500"
                                />
                              </td>
                              {[
                                "clinic_slots",
                                "video_slots",
                                "home_slots",
                              ].map((type) => (
                                <td
                                  key={type}
                                  className="border border-gray-200 p-3 bg-white"
                                >
                                  <div className="flex gap-2 justify-center">
                                    <input
                                      type="time"
                                      value={formData[type][day]?.start || ""}
                                      onChange={(e) =>
                                        handleTimeSlotChange(
                                          type,
                                          day,
                                          "start",
                                          e.target.value
                                        )
                                      }
                                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      disabled={formData.leave_days.includes(
                                        day
                                      )}
                                    />
                                    <span className="flex items-center text-gray-500">
                                      to
                                    </span>
                                    <input
                                      type="time"
                                      value={formData[type][day]?.end || ""}
                                      onChange={(e) =>
                                        handleTimeSlotChange(
                                          type,
                                          day,
                                          "end",
                                          e.target.value
                                        )
                                      }
                                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      disabled={formData.leave_days.includes(
                                        day
                                      )}
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
                </div>

                <div className="flex justify-between mt-8">
                  <motion.button
                    type="button"
                    onClick={prevStep}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-gray-500 text-white px-8 py-4 rounded-xl hover:bg-gray-600 transition-colors font-semibold shadow-md"
                  >
                    Previous
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={nextStep}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-gradient-to-r from-[#0067A1] to-blue-800 text-white px-8 py-4 rounded-xl hover:shadow-lg transition-all font-semibold shadow-md"
                  >
                    Next Step
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Documents */}
            {currentStep === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-8"
              >
                <div className="flex items-center mb-8">
                  <div className="w-12 h-12 bg-blue-800 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Documents & Identity
                    </h2>
                    <p className="text-gray-600">Upload required documents</p>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Identity Documents */}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-6">
                      Identity Documents
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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
                    <h3 className="text-xl font-semibold text-gray-900 mb-6">
                      Document Uploads
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-blue-500 transition-colors">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Digital Signature
                        </label>
                        <div className="text-center">
                          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          {formData.digital_signature ? (
                            <div className="bg-green-50 p-4 rounded-lg">
                              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                              <p className="text-green-700 font-medium">
                                Signature Added
                              </p>
                            </div>
                          ) : (
                            <>
                              <p className="text-gray-600 mb-2">
                                Add your digital signature
                              </p>
                              <button
                                type="button"
                                onClick={() => setShowSignatureModal(true)}
                                className="mt-4 bg-blue-800 text-white px-6 py-2 rounded-lg hover:bg-[#004F7C] transition-colors"
                              >
                                Create Signature
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <motion.button
                    type="button"
                    onClick={prevStep}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-gray-500 text-white px-8 py-4 rounded-xl hover:bg-gray-600 transition-colors font-semibold shadow-md"
                  >
                    Previous
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={nextStep}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-gradient-to-r from-blue-800 to-blue-800 text-white px-8 py-4 rounded-xl hover:shadow-lg transition-all font-semibold shadow-md"
                  >
                    Next Step
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Bank & Agreements */}
            {currentStep === 4 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-8"
              >
                <div className="flex items-center mb-8">
                  <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Bank Details & Agreements
                    </h2>
                    <p className="text-gray-600">Finalize your application</p>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Bank Details */}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-6">
                      Bank Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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
                        <input
                          type="text"
                          value={formData.bank_ifsc_code}
                          onChange={(e) =>
                            handleInputChange("bank_ifsc_code", e.target.value)
                          }
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          placeholder="IFSC code"
                        />
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
                          value={formData.bank_name}
                          onChange={(e) =>
                            handleInputChange("bank_name", e.target.value)
                          }
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          placeholder="Bank name"
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
                          value={formData.bank_branch}
                          onChange={(e) =>
                            handleInputChange("bank_branch", e.target.value)
                          }
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          placeholder="Branch name"
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
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      BPL Service Option
                    </h3>
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-xl border-2 border-green-200">
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
                            className="w-6 h-6 rounded border-2 border-gray-300 text-green-600 focus:ring-green-500"
                          />
                        </div>
                        <div>
                          <span className="text-lg font-semibold text-gray-700">
                            Agree to see BPL patients at ₹40 (Video consult
                            only)
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
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            placeholder="e.g., Monday-Friday 2PM-4PM"
                          />
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* Agreements */}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-6">
                      Agreements
                    </h3>
                    <div className="space-y-4">
                      <label className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.non_disclosure_agreement}
                          onChange={(e) =>
                            handleInputChange(
                              "non_disclosure_agreement",
                              e.target.checked
                            )
                          }
                          className="w-5 h-5 rounded border-2 border-gray-300 text-blue-800 focus:ring-blue-500"
                        />
                        <div>
                          <span className="font-semibold text-gray-700">
                            Non-Disclosure Agreement (NDA)
                          </span>
                          <p className="text-gray-600 text-sm mt-1">
                            I agree to maintain confidentiality of patient
                            information
                          </p>
                        </div>
                      </label>

                      <label className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.terms_conditions_agreement}
                          onChange={(e) =>
                            handleInputChange(
                              "terms_conditions_agreement",
                              e.target.checked
                            )
                          }
                          className="w-5 h-5 rounded border-2 border-gray-300 text-blue-800 focus:ring-blue-500"
                        />
                        <div>
                          <span className="font-semibold text-gray-700">
                            Terms & Conditions
                          </span>
                          <p className="text-gray-600 text-sm mt-1">
                            I agree to the platform terms and conditions
                          </p>
                        </div>
                      </label>

                      <div className="bg-gradient-to-r from-blue-50 to-blue-50 p-6 rounded-xl border-2 border-blue-200">
                        <label className="flex items-start space-x-4 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.digital_consent}
                            onChange={(e) =>
                              handleInputChange(
                                "digital_consent",
                                e.target.checked
                              )
                            }
                            className="w-5 h-5 rounded border-2 border-gray-300 text-blue-800 focus:ring-blue-500 mt-1"
                            required
                          />
                          <div className="flex-1">
                            <span className="font-semibold text-gray-700">
                              Digital Consent & Declaration
                            </span>
                            <p className="text-gray-600 mt-2">
                              I consent to the{" "}
                              <button
                                type="button"
                                onClick={() => setShowConsentModal(true)}
                                className="text-blue-800 hover:text-blue-800 underline font-medium"
                              >
                                platform terms and conditions
                              </button>
                              , and confirm that all information provided is
                              accurate to the best of my knowledge.
                            </p>
                            {errors.digital_consent && (
                              <p className="text-red-500 text-sm mt-2 flex items-center">
                                <AlertCircle className="w-4 h-4 mr-1" />
                                {errors.digital_consent}
                              </p>
                            )}
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <motion.button
                    type="button"
                    onClick={prevStep}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-gray-500 text-white px-8 py-4 rounded-xl hover:bg-gray-600 transition-colors font-semibold shadow-md"
                  >
                    Previous
                  </motion.button>
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.02 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-4 rounded-xl hover:shadow-lg transition-all font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Submitting...</span>
                      </div>
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
              className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl"
            >
              <div className="bg-gradient-to-r from-blue-800 to-blue-800 text-white p-6">
                <h3 className="text-2xl font-bold">Digital Signature</h3>
                <p className="opacity-90">Create your signature</p>
              </div>

              <div className="p-6">
                <div className="border-b border-gray-200 mb-6">
                  <div className="flex space-x-8">
                    <button
                      onClick={() => setActiveSignatureTab("draw")}
                      className={`pb-4 px-2 border-b-2 font-semibold transition-colors ${
                        activeSignatureTab === "draw"
                          ? "border-blue-800 text-blue-800"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Draw Signature
                    </button>
                    <button
                      onClick={() => setActiveSignatureTab("upload")}
                      className={`pb-4 px-2 border-b-2 font-semibold transition-colors ${
                        activeSignatureTab === "upload"
                          ? "border-blue-800 text-blue-800"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Upload Signature
                    </button>
                  </div>
                </div>

                {activeSignatureTab === "draw" && (
                  <div>
                    <p className="text-gray-600 mb-4">
                      Draw your signature in the box below:
                    </p>
                    <div className="border-2 border-gray-300 rounded-lg p-4 bg-white">
                      <canvas
                        ref={canvasRef}
                        className="w-full h-64 border-2 border-gray-200 rounded bg-white cursor-crosshair touch-none"
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
                    <div className="mt-4 flex justify-between items-center">
                      <button
                        onClick={clearSignature}
                        className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
                      >
                        <X className="w-4 h-4" />
                        <span>Clear</span>
                      </button>
                      <p className="text-sm text-gray-500">
                        Draw your signature clearly
                      </p>
                    </div>
                  </div>
                )}

                {activeSignatureTab === "upload" && (
                  <div>
                    <p className="text-gray-600 mb-4">
                      Upload your signature image:
                    </p>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2">
                        PNG or JPG files only (max 2MB)
                      </p>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg"
                        onChange={handleSignatureUpload}
                        className="w-full max-w-xs mx-auto"
                      />
                      {signatureData && (
                        <div className="mt-4">
                          <p className="text-green-600 font-medium mb-2">
                            Preview:
                          </p>
                          <img
                            src={signatureData}
                            alt="Signature preview"
                            className="max-h-32 mx-auto border rounded"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-4">
                <button
                  onClick={() => setShowSignatureModal(false)}
                  className="px-8 py-3 text-gray-600 hover:text-gray-800 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={saveSignature}
                  className="bg-gradient-to-r from-blue-800 to-blue-800 text-white px-8 py-3 rounded-lg hover:shadow-lg transition-all font-semibold"
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
              className="bg-gradient-to-br from-white to-blue-50/30 rounded-3xl w-full max-w-6xl max-h-[95vh] overflow-hidden shadow-2xl border border-white/20"
            >
              {/* Header */}
              <div className="relative bg-gradient-to-r from-blue-800 via-blue-800 to-indigo-700 text-white p-8 overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12"></div>
                </div>

                <div className="relative z-10">
                  <div className="flex items-center space-x-4 mb-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                        Platform Compliance & Terms
                      </h3>
                      <p className="text-blue-100 text-lg mt-1">
                        MediConnect.fit Regulatory Compliance Framework
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6 text-sm text-blue-200">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span>100% Compliant</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span>Healthcare Standards</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span>Data Protection</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-8 max-h-[60vh] overflow-y-auto">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200 rounded-2xl p-6 text-center">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                    <h4 className="font-bold text-green-800 text-lg">
                      Full Compliance
                    </h4>
                    <p className="text-green-600 text-sm">
                      All regulatory requirements met
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-100 border border-blue-200 rounded-2xl p-6 text-center">
                    <FileCheck className="w-12 h-12 text-blue-800 mx-auto mb-3" />
                    <h4 className="font-bold text-blue-800 text-lg">
                      13 Standards
                    </h4>
                    <p className="text-blue-800 text-sm">
                      Healthcare regulations covered
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-violet-100 border border-blue-200 rounded-2xl p-6 text-center">
                    <Award className="w-12 h-12 text-blue-800 mx-auto mb-3" />
                    <h4 className="font-bold text-blue-800 text-lg">
                      Certified Secure
                    </h4>
                    <p className="text-blue-800 text-sm">
                      Data protection certified
                    </p>
                  </div>
                </div>

                {/* Compliance Table */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gradient-to-r from-gray-50 to-blue-50/50 border-b border-gray-200">
                          <th className="p-6 text-left">
                            <div className="flex items-center space-x-2">
                              <FileText className="w-5 h-5 text-blue-800" />
                              <span className="font-semibold text-gray-700">
                                Regulatory Area
                              </span>
                            </div>
                          </th>
                          <th className="p-6 text-left">
                            <div className="flex items-center space-x-2">
                              <Shield className="w-5 h-5 text-blue-800" />
                              <span className="font-semibold text-gray-700">
                                Requirement
                              </span>
                            </div>
                          </th>
                          <th className="p-6 text-center">
                            <div className="flex items-center space-x-2 justify-center">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                              <span className="font-semibold text-gray-700">
                                Status
                              </span>
                            </div>
                          </th>
                          <th className="p-6 text-left">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-gray-700">
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
                            transition={{ delay: index * 0.05 }}
                            className="group hover:bg-blue-50/30 transition-all duration-300"
                          >
                            <td className="p-6">
                              <div className="flex items-start space-x-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                                  <span className="text-blue-800 font-semibold text-sm">
                                    {index + 1}
                                  </span>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-800 group-hover:text-[#004F7C] transition-colors">
                                    {item.area}
                                  </h4>
                                </div>
                              </div>
                            </td>
                            <td className="p-6">
                              <p className="text-gray-600 leading-relaxed text-sm">
                                {item.requirement}
                              </p>
                            </td>
                            <td className="p-6 text-center">
                              <div className="flex justify-center">
                                <span className="inline-flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                  <CheckCircle className="w-4 h-4" />
                                  <span>Compliant</span>
                                </span>
                              </div>
                            </td>
                            <td className="p-6">
                              <a
                                href={item.reference}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-2 text-blue-800 hover:text-[#004F7C] font-medium text-sm transition-colors group/link"
                              >
                                <span>View Reference</span>
                                <svg
                                  className="w-4 h-4 transform group-hover/link:translate-x-1 transition-transform"
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
                <div className="mt-8 bg-gradient-to-r from-blue-50/50 to-blue-50/50 border border-blue-200/50 rounded-2xl p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Info className="w-6 h-6 text-blue-800" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">
                        Your Data is Protected
                      </h4>
                      <p className="text-gray-600 text-sm leading-relaxed">
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
              <div className="bg-gradient-to-r from-gray-50 to-blue-50/30 border-t border-gray-200/50 px-8 py-6">
                <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Lock className="w-4 h-4 text-green-600" />
                      <span>Secure & Compliant</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-blue-800" />
                      <span>Healthcare Certified</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setShowConsentModal(false)}
                      className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors rounded-xl hover:bg-gray-100"
                    >
                      Learn More
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowConsentModal(false)}
                      className="bg-gradient-to-r from-blue-800 to-blue-800 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
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
    </div>
  );
}
