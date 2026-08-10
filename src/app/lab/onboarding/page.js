"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  Store,
  Building,
  FileCheck,
  Heart,
  Info,
  Lock,
  AlertTriangle,
  Package,
  Receipt,
  CreditCard,
  QrCode,
  Beaker,
  Microscope,
  TestTube,
  Activity,
  Loader2,
} from "lucide-react";

// Default form data structure for lab
const defaultFormData = {
  // Personal Information
  owner_name: "",
  email: "",
  phone: "",
  mobile: "",
  whatsapp: "",
  contact_person: "",
  
  // Lab Information
  lab_name: "",
  license_number: "",
  registration_number: "",
  address: "",
  latitude: "",
  longitude: "",
  
  // Business Details
  gst_number: "",
  pan_number: "",
  years_experience: "",
  general_turnaround: "",
  accepts_home_collection: false,
  opening_hours: { open: "09:00", close: "18:00" },
  services: [],
  
  // KYC Data
  kyc_data: [],
  is_kyc: false,
  
  // Documents
  pan_card_file: null,
  aadhaar_card_file: null,
  lab_license_file: null,
  gst_certificate_file: null,
  owner_photo_file: null,
  signature_file: null,
  
  // Payment & Agreements
  payout_mode: "bank_transfer",
  bank_account_number: "",
  bank_ifsc_code: "",
  bank_name: "",
  bank_branch: "",
  
  // Agreements
  non_disclosure_agreement: false,
  terms_conditions_agreement: false,
  digital_consent: false,
  consent_terms: false,
};

export default function LabOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(defaultFormData);
  const [isClient, setIsClient] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [signatureData, setSignatureData] = useState("");
  const [activeSignatureTab, setActiveSignatureTab] = useState("draw");
  const [isDrawing, setIsDrawing] = useState(false);
  const [kycLoading, setKycLoading] = useState(false);
  const [kycCompleted, setKycCompleted] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);
  const router = useRouter();

  const canvasRef = useRef(null);
  const fileInputRefs = useRef({});

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

  const steps = [
    { number: 1, title: "Lab Info", icon: Beaker, color: "blue" },
    { number: 2, title: "Location & Services", icon: MapPin, color: "green" },
    { number: 3, title: "Documents", icon: FileText, color: "orange" },
    { number: 4, title: "Bank & Agreements", icon: Shield, color: "purple" },
  ];

  const payoutModes = [
    { value: "bank_transfer", label: "Bank Transfer", icon: BanknoteIcon },
    { value: "upi", label: "UPI", icon: QrCode },
    { value: "cash", label: "Cash", icon: CreditCard },
    { value: "cheque", label: "Cheque", icon: FileText },
  ];

  const turnaroundOptions = [
    "Same day",
    "24 hours",
    "48 hours",
    "3-5 days",
    "1 week",
    "2 weeks"
  ];

  // Set isClient to true when component mounts on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load form data from localStorage after component mounts on client
  useEffect(() => {
    if (isClient) {
      const savedFormData = localStorage.getItem('labOnboardingFormData');
      const savedCurrentStep = localStorage.getItem('labOnboardingCurrentStep');
      
      if (savedFormData) {
        try {
          const parsedData = JSON.parse(savedFormData);
          setFormData(prev => ({
            ...defaultFormData,
            ...parsedData,
            services: parsedData.services || [],
            opening_hours: parsedData.opening_hours || { open: "09:00", close: "18:00" }
          }));
        } catch (error) {
          console.error('Error parsing saved form data:', error);
          localStorage.removeItem('labOnboardingFormData');
        }
      }
      
      if (savedCurrentStep) {
        setCurrentStep(parseInt(savedCurrentStep));
      }
    }
  }, [isClient]);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('labOnboardingFormData', JSON.stringify(formData));
    }
  }, [formData, isClient]);

  // Save current step to localStorage whenever it changes
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('labOnboardingCurrentStep', currentStep.toString());
    }
  }, [currentStep, isClient]);

  // Clean up localStorage when form is successfully submitted
  const clearLocalStorage = () => {
    if (isClient) {
      localStorage.removeItem('labOnboardingFormData');
      localStorage.removeItem('labOnboardingCurrentStep');
    }
  };

  // DigiLocker KYC Integration
  const handleDigiLockerKYC = async () => {
    try {
      setKycLoading(true);
      
      // Store current form data in localStorage before starting KYC process
      if (isClient) {
        localStorage.setItem('labOnboardingPreKycData', JSON.stringify(formData));
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
      
      if (!tokenData.client_token) {
        throw new Error("Failed to get access token");
      }

      const clientToken = tokenData.client_token;
      const state = tokenData.state;

      // Step 2: Get DigiLocker URL
      const urlHeaders = new Headers();
      urlHeaders.append("Content-Type", "application/json");

      // Use current page URL as redirect URL
      const currentUrl = window.location.href;
      const currentOrigin = window.location.origin;
      const baseUrl = currentUrl.split("?")[0];

      // Hardcode the authorized DigiLocker production domain
      const productionOrigin = "https://mediconnect.fit";

      let redirectUrl = "";

      if (currentOrigin !== productionOrigin) {
        // Local/Staging environment: Route through production origin with origin_host bounce param
        const prodBaseUrl = `${productionOrigin}${window.location.pathname}`;
        redirectUrl = `${prodBaseUrl}?kyc_callback=true&state=${state}&origin_host=${encodeURIComponent(currentOrigin)}`;
      } else {
        // Production environment: Direct redirect
        redirectUrl = `${baseUrl}?kyc_callback=true&state=${state}`;
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

  // Handle KYC callback
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
            // Apply KYC data
            setFormData((prev) => ({
              ...prev,
              owner_name: kycData.data?.name || prev.owner_name,
              email: kycData.data?.email || prev.email,
              kyc_data: kycData.data || [],
              is_kyc: true,
            }));
            setKycCompleted(true);
            toast.success("KYC verification completed successfully!");

            // Clean up URL
            window.history.replaceState({}, "", window.location.pathname);
          }
        } catch (error) {
          console.error("KYC data fetch error:", error);
          toast.error("Failed to fetch KYC data. Please try again.");
          
          // Restore form data from localStorage if KYC failed
          if (isClient) {
            const preKycData = localStorage.getItem('labOnboardingPreKycData');
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
          localStorage.removeItem('labOnboardingPreKycData');
        }
      }
    };

    if (isClient) {
      handleKycCallback();
    }
  }, [formData, isClient]);

  // Initialize signature canvas with proper error handling
  const initializeCanvas = () => {
    if (!canvasRef.current) return;

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      // Set canvas size properly
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      // Set drawing styles
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    } catch (error) {
      console.error("Error initializing canvas:", error);
    }
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

  // Enhanced Signature functionality with error handling
  const startDrawing = (e) => {
    if (!canvasRef.current) return;

    try {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext("2d");

      setIsDrawing(true);
      ctx.beginPath();
      
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      ctx.moveTo(x, y);
    } catch (error) {
      console.error("Error starting drawing:", error);
    }
  };

  const draw = (e) => {
    if (!isDrawing || !canvasRef.current) return;

    try {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext("2d");

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      ctx.lineTo(x, y);
      ctx.stroke();
    } catch (error) {
      console.error("Error drawing:", error);
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    if (!canvasRef.current) return;

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
    } catch (error) {
      console.error("Error clearing signature:", error);
    }
  };

  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG)");
      return;
    }


    const reader = new FileReader();
    reader.onload = (event) => {
      setSignatureData(event.target.result);
    };
    reader.onerror = () => {
      toast.error("Error reading file. Please try again.");
    };
    reader.readAsDataURL(file);
  };

  const saveSignature = () => {
    try {
      if (activeSignatureTab === "draw") {
        if (!canvasRef.current) {
          toast.error("Please draw your signature first");
          return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        // Check if canvas has any drawing
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let isEmpty = true;

        for (let i = 0; i < imageData.data.length; i += 4) {
          if (imageData.data[i + 3] !== 0) {
            isEmpty = false;
            break;
          }
        }

        if (isEmpty) {
          toast.error("Please draw your signature before saving");
          return;
        }

        const signature = canvas.toDataURL("image/png");
        setSignatureData(signature);
        setFormData((prev) => ({ ...prev, signature_file: signature }));
      } else if (activeSignatureTab === "upload") {
        if (!signatureData) {
          toast.error("Please upload a signature image first");
          return;
        }
        setFormData((prev) => ({ ...prev, signature_file: signatureData }));
      }

      setShowSignatureModal(false);
      toast.success("Signature saved successfully!");
    } catch (error) {
      console.error("Error saving signature:", error);
      toast.error("Failed to save signature. Please try again.");
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleFileUpload = (field, files) => {
    const file = files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload JPEG, PNG, or PDF files only");
      return;
    }


    setFormData((prev) => ({
      ...prev,
      [field]: file,
    }));
    toast.success("File uploaded successfully!");
  };

  const removeFile = (field) => {
    setFormData((prev) => ({ ...prev, [field]: null }));
  };

  // Service management functions
  const [newService, setNewService] = useState({ service_name: "", price: "" });

  const addService = () => {
    if (newService.service_name && newService.price) {
      const updatedServices = [...formData.services, {
        service_name: newService.service_name,
        price: parseFloat(newService.price)
      }];
      setFormData(prev => ({
        ...prev,
        services: updatedServices
      }));
      setNewService({ service_name: "", price: "" });
    }
  };

  const removeService = (index) => {
    const updatedServices = formData.services.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      services: updatedServices
    }));
  };

  const handleOpeningHoursChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      opening_hours: {
        ...prev.opening_hours,
        [field]: value
      }
    }));
  };

  // Get geolocation
  useEffect(() => {
    if (isClient && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6),
          }));
        },
        (error) => {
          console.log("Geolocation error:", error);
        }
      );
    }
  }, [isClient]);

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (!formData.lab_name) newErrors.lab_name = "Lab name is required";
        if (!formData.owner_name) newErrors.owner_name = "Owner name is required";
        if (!formData.email) newErrors.email = "Email is required";
        else if (!/\S+@\S+\.\S+/.test(formData.email))
          newErrors.email = "Email is invalid";
        if (!formData.phone) newErrors.phone = "Phone is required";
        else if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\D/g, "")))
          newErrors.phone = "Please enter a valid 10-digit Indian phone number";
        if (!formData.license_number)
          newErrors.license_number = "Lab license number is required";
        if (!formData.is_kyc)
          newErrors.kyc = "KYC verification is required";
        break;

      case 2:
        if (!formData.address) newErrors.address = "Address is required";
        if (!formData.general_turnaround) newErrors.general_turnaround = "Turnaround time is required";
        if (formData.services.length === 0) newErrors.services = "At least one service is required";
        
        // Validate required documents for step 2
        if (!formData.lab_license_file) newErrors.lab_license_file = "Lab license file is required";
        break;

      case 3:
        // GST validation
        if (formData.gst_number && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gst_number))
          newErrors.gst_number = "Please enter a valid GST number";

        // PAN validation
        if (formData.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_number))
          newErrors.pan_number = "Please enter a valid PAN number";

        // Validate additional documents
        if (!formData.pan_card_file) newErrors.pan_card_file = "PAN card is required";
        if (!formData.aadhaar_card_file) newErrors.aadhaar_card_file = "Aadhaar card is required";
        if (!formData.owner_photo_file) newErrors.owner_photo_file = "Owner photo is required";
        break;

      case 4:
        // Bank account validation
        if (formData.payout_mode === "bank_transfer") {
          if (!formData.bank_account_number) newErrors.bank_account_number = "Bank account number is required";
          else if (!/^\d{9,18}$/.test(formData.bank_account_number.replace(/\s/g, "")))
            newErrors.bank_account_number = "Please enter a valid bank account number (9-18 digits)";

          if (!formData.bank_ifsc_code) newErrors.bank_ifsc_code = "IFSC code is required";
          else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.bank_ifsc_code))
            newErrors.bank_ifsc_code = "Please enter a valid IFSC code";
        }

        // Digital consent validation
        if (!formData.digital_consent)
          newErrors.digital_consent = "Digital consent is required to proceed";
        if (!formData.consent_terms)
          newErrors.consent_terms = "You must accept the terms and conditions";
        if (!formData.non_disclosure_agreement)
          newErrors.non_disclosure_agreement = "Non-disclosure agreement is required";
        if (!formData.terms_conditions_agreement)
          newErrors.terms_conditions_agreement = "Terms and conditions agreement is required";

        break;
    }

    setErrors(newErrors);
    
    // Show error toast if there are validation errors
    if (Object.keys(newErrors).length > 0) {
      toast.error("Please fix the validation errors before proceeding");
      return false;
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

  const uploadFileViaSignedUrl = async (file, folder) => {
    const res = await fetch("/api/upload/signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type,
        bucket: "lab-documents",
        folder: folder,
      }),
    });

    let result;
    try {
      result = await res.json();
    } catch (err) {
      if (res.status === 413) throw new Error("File too large. Please upload a smaller file.");
      throw new Error(`Server error (${res.status}). Failed to get upload URL.`);
    }
    if (!result.success) {
      throw new Error(result.message || "Failed to get upload URL");
    }

    const { signedUrl, token, publicUrl } = result.data;

    const uploadRes = await fetch(signedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });

    if (!uploadRes.ok) {
      throw new Error(`Upload failed for ${file.name}`);
    }

    return publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(currentStep)) return;

    try {
      setLoading(true);
      toast.loading("Preparing your application...", { id: "loading" });

      const documentFields = [
        { key: "pan_card", apiKey: "pan_card" },
        { key: "aadhaar_card", apiKey: "aadhaar_card" },
        { key: "lab_license", apiKey: "lab_license" },
        { key: "gst_certificate", apiKey: "gst_certificate" },
        { key: "owner_photo", apiKey: "owner_photo" },
        { key: "signature", apiKey: "signature" },
      ];

      const filesToUpload = [];
      for (const { key, apiKey } of documentFields) {
        const value = formData[key];
        if (value instanceof File) {
          filesToUpload.push({ key, apiKey, file: value });
        } else if (key === "signature" && typeof value === "string" && value.startsWith("data:")) {
          const fetchRes = await fetch(value);
          const blob = await fetchRes.blob();
          const file = new File([blob], "digital_signature.png", { type: "image/png" });
          filesToUpload.push({ key, apiKey: "signature", file });
        }
      }

      const uploadedUrls = {};
      if (filesToUpload.length > 0) {
        for (let i = 0; i < filesToUpload.length; i++) {
          const { apiKey, file } = filesToUpload[i];
          toast.loading(`Uploading document ${i + 1} of ${filesToUpload.length}...`, { id: "loading" });
          try {
            uploadedUrls[apiKey] = await uploadFileViaSignedUrl(file, apiKey);
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

      const payload = {
        ...formData,
        ...uploadedUrls,
      };

      // Map 'phone' to 'phone_number' for backend compatibility
      if (payload.phone) {
        payload.phone_number = payload.phone;
      }

      const res = await fetch("/api/lab/web", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data;
      try {
        data = await res.json();
      } catch (err) {
        toast.dismiss("loading");
        if (res.status === 413) {
          toast.error("❌ Form data too large. Please reduce file sizes and try again.");
        } else {
          toast.error(`❌ Server error (${res.status}). Please try again later.`);
        }
        setLoading(false);
        return;
      }

      toast.dismiss("loading");
      if (data.success) {
        toast.success("✅ Lab onboarded successfully!");
        clearLocalStorage();
        setFormData(defaultFormData);
        setCurrentStep(1);
        setLoading(false);
        router.push("/lab/onboarding/success");
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

  const progress = (currentStep / steps.length) * 100;  const FileUploadBox = ({
    field,
    label,
    accept,
    required = false,
  }) => (
    <div className="border border-dashed border-gray-300 rounded-md p-4 hover:border-[#0067A1] transition-colors">
      <label className="block text-xs font-semibold text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
        {errors[field] && (
          <span className="text-red-500 text-xs ml-2">({errors[field]})</span>
        )}
      </label>

      <div className="text-center">
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600 text-sm mb-1">Click to upload or drag and drop</p>
        <p className="text-xs text-gray-500">PNG, JPG, PDF</p>

        <input
          type="file"
          accept={accept}
          onChange={(e) => handleFileUpload(field, e.target.files)}
          className="hidden"
          id={field}
        />
        <label
          htmlFor={field}
          className="inline-block mt-3 bg-[#0067A1] hover:bg-[#004F7C] text-white px-4 py-2 rounded-md cursor-pointer transition-colors text-sm font-semibold"
        >
          Choose File
        </label>
      </div>

      {/* File preview */}
      {formData[field] && (
        <div className="mt-3">
          <div className="flex items-center justify-between bg-gray-50 p-2 rounded-md border border-gray-200">
            <div className="flex items-center space-x-2">
              <FileCheck className="w-4 h-4 text-[#0067A1]" />
              <span className="text-xs text-gray-700 truncate max-w-[200px]">
                {formData[field].name || "File uploaded"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => removeFile(field)}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );



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

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6 overflow-x-hidden">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 min-w-0">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4"
        >
          <div className="bg-[#0067A1] text-white rounded-lg p-4 sm:p-6 border border-teal-800 shadow-sm">
            <h1 className="text-lg sm:text-xl font-bold mb-1">Lab Onboarding Form</h1>
            <p className="text-xs sm:text-sm opacity-90">
              Join our network of diagnostic laboratories
            </p>
          </div>
        </motion.div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-4">
          <div className="mb-3">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#0067A1] rounded-full"
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
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mx-auto mb-1 border-2 ${
                    currentStep > step.number
                      ? "bg-[#0067A1] border-[#0067A1] text-white"
                      : currentStep === step.number
                      ? "bg-[#0067A1] border-[#0067A1] text-white"
                      : "bg-white border-gray-300 text-gray-400"
                  }`}
                >
                  {currentStep > step.number ? (
                    <CheckCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  ) : (
                    <step.icon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  )}
                </div>
                <span
                  className={`text-[10px] sm:text-xs font-semibold hidden sm:block break-normal px-1 leading-tight mt-1 ${
                    currentStep >= step.number
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
          <div className="text-center mt-2.5 block sm:hidden border-t border-gray-100 pt-2">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
              Step {currentStep} of {steps.length}
            </span>
            <span className="text-xs font-extrabold text-[#0067A1] block mt-0.5">
              {steps[currentStep - 1]?.title}
            </span>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit}>
            {/* Step 1: Lab Information */}
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 sm:p-6 min-w-0"
              >
                <div className="flex items-center mb-4 border-b border-gray-100 pb-3">
                  <div className="w-8 h-8 bg-[#0067A1] rounded-md flex items-center justify-center mr-3 flex-shrink-0">
                    <Beaker className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-gray-900">
                      Lab Information
                    </h2>
                    <p className="text-gray-500 text-xs">Tell us about your lab</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 min-w-0">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Lab Name *
                    </label>
                    <input
                      type="text"
                      value={formData.lab_name}
                      onChange={(e) =>
                        handleInputChange("lab_name", e.target.value)
                      }
                      className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all ${
                        errors.lab_name
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      placeholder="Enter lab name"
                    />
                    {errors.lab_name && (
                      <p className="text-red-500 text-xs mt-1 flex items-center">
                        <AlertCircle className="w-3.5 h-3.5 mr-1" />
                        {errors.lab_name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Owner Name *
                    </label>
                    <input
                      type="text"
                      value={formData.owner_name}
                      onChange={(e) =>
                        handleInputChange("owner_name", e.target.value)
                      }
                      className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all ${
                        errors.owner_name
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      placeholder="Enter owner name"
                    />
                    {errors.owner_name && (
                      <p className="text-red-500 text-xs mt-1 flex items-center">
                        <AlertCircle className="w-3.5 h-3.5 mr-1" />
                        {errors.owner_name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all ${
                        errors.email ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="lab@example.com"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-xs mt-1 flex items-center">
                        <AlertCircle className="w-3.5 h-3.5 mr-1" />
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        handleInputChange("phone", e.target.value)
                      }
                      className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all ${
                        errors.phone ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="+91 98765 43210"
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-xs mt-1 flex items-center">
                        <AlertCircle className="w-3.5 h-3.5 mr-1" />
                        {errors.phone}
                      </p>
                    )}
                  </div>



                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={formData.contact_person}
                      onChange={(e) =>
                        handleInputChange("contact_person", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all"
                      placeholder="Contact person name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Years of Experience
                    </label>
                    <select
                      value={formData.years_experience}
                      onChange={(e) =>
                        handleInputChange("years_experience", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] bg-white text-gray-900 transition-all"
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
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Lab License No. *
                    </label>
                    <input
                      type="text"
                      value={formData.license_number}
                      onChange={(e) =>
                        handleInputChange("license_number", e.target.value)
                      }
                      className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all ${
                        errors.license_number
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      placeholder="Lab license number"
                    />
                    {errors.license_number && (
                      <p className="text-red-500 text-xs mt-1 flex items-center">
                        <AlertCircle className="w-3.5 h-3.5 mr-1" />
                        {errors.license_number}
                      </p>
                    )}
                  </div>

                  {/* KYC Section */}
                  <div className="md:col-span-2">
                    <div className="bg-gray-50 border border-teal-200 rounded-md p-4">
                      <div className="flex items-center flex-wrap justify-between gap-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-teal-100 rounded-md flex items-center justify-center flex-shrink-0">
                            <Shield className="w-5 h-5 text-[#0067A1]" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">
                              DigiLocker KYC Verification
                            </h3>
                            <p className="text-gray-500 text-xs mt-0.5">
                              Sync your Aadhaar and PAN details automatically
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center">
                          {kycCompleted ? (
                            <div className="flex items-center space-x-1.5 text-[#0067A1]">
                              <CheckCircle className="w-5 h-5" />
                              <span className="font-semibold text-sm">Verified</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={handleDigiLockerKYC}
                              disabled={kycLoading}
                              className="bg-[#0067A1] hover:bg-[#004F7C] text-white px-4 py-2 rounded-md transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {kycLoading ? (
                                <div className="flex items-center space-x-2">
                                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  <span>Processing...</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1.5">
                                  <FileCheck className="w-4 h-4" />
                                  <span>Verify with DigiLocker</span>
                                </div>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {kycCompleted && (
                        <div
                          className="mt-3 p-3 bg-white rounded border border-[#0067A1]/30"
                        >
                          <div className="flex items-center space-x-1.5 text-[#0067A1]">
                            <CheckCircle className="w-4 h-4" />
                            <span className="font-medium text-xs">
                              Your KYC has been verified successfully!
                            </span>
                          </div>
                          <p className="text-gray-500 text-xs mt-1">
                            Your Aadhaar and PAN details have been automatically synced.
                          </p>
                        </div>
                      )}
                    </div>
                    {errors.kyc && (
                      <p className="text-red-500 text-xs mt-1 flex items-center">
                        <AlertCircle className="w-3.5 h-3.5 mr-1" />
                        {errors.kyc}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end mt-4 sm:mt-6 border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={nextStep}
                    className="bg-[#0067A1] hover:bg-[#004F7C] text-white px-5 py-2 rounded-md transition-colors font-semibold text-sm shadow-sm"
                  >
                    Next Step
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Location & Services */}
            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 sm:p-6 min-w-0"
              >
                <div className="flex items-center mb-4 border-b border-gray-100 pb-3">
                  <div className="w-8 h-8 bg-green-600 rounded-md flex items-center justify-center mr-3 flex-shrink-0">
                    <MapPin className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-gray-900">
                      Location & Services
                    </h2>
                    <p className="text-gray-500 text-xs">
                      Your lab location and service offerings
                    </p>
                  </div>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 gap-3 sm:gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Address *
                      </label>
                      <textarea
                        value={formData.address}
                        onChange={(e) =>
                          handleInputChange("address", e.target.value)
                        }
                        rows={3}
                        className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all ${
                          errors.address ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Full lab address with landmark"
                      />
                      {errors.address && (
                        <p className="text-red-500 text-xs mt-1 flex items-center">
                          <AlertCircle className="w-3.5 h-3.5 mr-1" />
                          {errors.address}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Latitude
                        </label>
                        <input
                          type="text"
                          value={formData.latitude}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Longitude
                        </label>
                        <input
                          type="text"
                          value={formData.longitude}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Registration Number
                        </label>
                        <input
                          type="text"
                          value={formData.registration_number}
                          onChange={(e) =>
                            handleInputChange("registration_number", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all"
                          placeholder="Lab registration number"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          General Turnaround Time *
                        </label>
                        <select
                          value={formData.general_turnaround}
                          onChange={(e) =>
                            handleInputChange("general_turnaround", e.target.value)
                          }
                          className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all ${
                            errors.general_turnaround ? "border-red-500" : "border-gray-300"
                          }`}
                        >
                          <option value="">Select turnaround time</option>
                          {turnaroundOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                        {errors.general_turnaround && (
                          <p className="text-red-500 text-xs mt-1 flex items-center">
                            <AlertCircle className="w-3.5 h-3.5 mr-1" />
                            {errors.general_turnaround}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-md bg-gray-50">
                      <input
                        type="checkbox"
                        id="home-collection"
                        checked={formData.accepts_home_collection}
                        onChange={(e) =>
                          handleInputChange("accepts_home_collection", e.target.checked)
                        }
                        className="rounded border-gray-300 text-[#0067A1] focus:ring-[#0067A1] w-4 h-4"
                      />
                      <label htmlFor="home-collection" className="text-xs font-semibold text-gray-700 cursor-pointer">
                        Accepts Home Collection
                      </label>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Opening Hours
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1">Open Time</label>
                          <input
                            type="time"
                            value={formData.opening_hours.open}
                            onChange={(e) => handleOpeningHoursChange('open', e.target.value)}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-1 focus:ring-[#0067A1]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1">Close Time</label>
                          <input
                            type="time"
                            value={formData.opening_hours.close}
                            onChange={(e) => handleOpeningHoursChange('close', e.target.value)}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-1 focus:ring-[#0067A1]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Services Section */}
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-gray-700 mb-3">
                      Lab Services
                    </h3>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Service name"
                          value={newService.service_name}
                          onChange={(e) => setNewService(prev => ({ ...prev, service_name: e.target.value }))}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1]"
                        />
                        <input
                          type="number"
                          placeholder="Price"
                          value={newService.price}
                          onChange={(e) => setNewService(prev => ({ ...prev, price: e.target.value }))}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1]"
                        />
                        <button
                          type="button"
                          onClick={addService}
                          className="px-4 py-2 bg-[#0067A1] hover:bg-[#004F7C] text-white rounded-md transition-colors text-sm font-semibold"
                        >
                          Add
                        </button>
                      </div>
                      
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {formData.services.map((service, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border border-gray-200 rounded-md bg-white">
                            <div className="text-xs">
                              <span className="font-semibold text-gray-900">{service.service_name}</span>
                              <span className="ml-2 text-green-600 font-semibold">₹{service.price}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeService(index)}
                              className="text-red-650 hover:text-red-800 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                      {errors.services && (
                        <p className="text-red-500 text-xs mt-1 flex items-center">
                          <AlertCircle className="w-3.5 h-3.5 mr-1" />
                          {errors.services}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Required Documents for Step 2 */}
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-gray-700 mb-3">
                      Required Documents
                    </h3>
                    <FileUploadBox
                      field="lab_license_file"
                      label="Lab License *"
                      accept="image/*,.pdf"
                      required={true}
                    />
                  </div>
                </div>

                <div className="flex justify-between mt-4 sm:mt-6 border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-5 py-2 rounded-md transition-colors font-semibold text-sm shadow-sm"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    className="bg-[#0067A1] hover:bg-[#004F7C] text-white px-5 py-2 rounded-md transition-colors font-semibold text-sm shadow-sm"
                  >
                    Next Step
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Documents */}
            {currentStep === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 sm:p-6 min-w-0"
              >
                <div className="flex items-center mb-4 border-b border-gray-100 pb-3">
                  <div className="w-8 h-8 bg-orange-600 rounded-md flex items-center justify-center mr-3 flex-shrink-0">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-gray-900">
                      Documents & Business Details
                    </h2>
                    <p className="text-gray-500 text-xs">Upload required documents</p>
                  </div>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        GST Number
                      </label>
                      <input
                        type="text"
                        value={formData.gst_number}
                        onChange={(e) =>
                          handleInputChange("gst_number", e.target.value)
                        }
                        className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all ${
                          errors.gst_number ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="07AABCU9603R1ZM"
                      />
                      {errors.gst_number && (
                        <p className="text-red-500 text-xs mt-1 flex items-center">
                          <AlertCircle className="w-3.5 h-3.5 mr-1" />
                          {errors.gst_number}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        PAN Number
                      </label>
                      <input
                        type="text"
                        value={formData.pan_number}
                        onChange={(e) =>
                          handleInputChange("pan_number", e.target.value)
                        }
                        className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all ${
                          errors.pan_number ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="ABCDE1234F"
                      />
                      {errors.pan_number && (
                        <p className="text-red-500 text-xs mt-1 flex items-center">
                          <AlertCircle className="w-3.5 h-3.5 mr-1" />
                          {errors.pan_number}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <FileUploadBox
                      field="pan_card_file"
                      label="PAN Card *"
                      accept="image/*,.pdf"
                      required={true}
                    />
                    <FileUploadBox
                      field="aadhaar_card_file"
                      label="Aadhaar Card *"
                      accept="image/*,.pdf"
                      required={true}
                    />
                    <FileUploadBox
                      field="gst_certificate_file"
                      label="GST Certificate"
                      accept="image/*,.pdf"
                      required={false}
                    />
                    <FileUploadBox
                      field="owner_photo_file"
                      label="Owner Photo *"
                      accept="image/*"
                      required={true}
                    />

                    <div className="border border-dashed border-gray-300 rounded-md p-4 hover:border-[#0067A1] transition-colors">
                      <label className="block text-xs font-semibold text-gray-700 mb-2">
                        Digital Signature
                      </label>
                      <div className="text-center">
                        <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        {formData.signature_file ? (
                          <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                            <CheckCircle className="w-6 h-6 text-[#0067A1] mx-auto mb-1" />
                            <p className="text-[#0067A1] font-semibold text-xs">
                              Signature Added
                            </p>
                          </div>
                        ) : (
                          <>
                            <p className="text-gray-500 text-xs mb-2">
                              Add your digital signature
                            </p>
                            <button
                              type="button"
                              onClick={() => setShowSignatureModal(true)}
                              className="bg-[#0067A1] hover:bg-[#004F7C] text-white px-4 py-2 rounded-md transition-colors text-sm font-semibold"
                            >
                              Create Signature
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-4 sm:mt-6 border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-5 py-2 rounded-md transition-colors font-semibold text-sm shadow-sm"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    className="bg-[#0067A1] hover:bg-[#004F7C] text-white px-5 py-2 rounded-md transition-colors font-semibold text-sm shadow-sm"
                  >
                    Next Step
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Bank & Agreements */}
            {currentStep === 4 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 sm:p-6 min-w-0"
              >
                <div className="flex items-center mb-4 border-b border-gray-100 pb-3">
                  <div className="w-8 h-8 bg-[#0067A1] rounded-md flex items-center justify-center mr-3 flex-shrink-0">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-gray-900">
                      Bank Details & Agreements
                    </h2>
                    <p className="text-gray-500 text-xs">Finalize your application</p>
                  </div>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  {/* Bank Details */}
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-gray-700 mb-3">
                      Bank Details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Payout Mode
                        </label>
                        <select
                          value={formData.payout_mode}
                          onChange={(e) =>
                            handleInputChange("payout_mode", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] bg-white text-gray-900 transition-all"
                        >
                          {payoutModes.map((mode) => (
                            <option key={mode.value} value={mode.value}>
                              {mode.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Bank Account Number
                          {formData.payout_mode === "bank_transfer" && " *"}
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
                          className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all ${
                            errors.bank_account_number
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                          placeholder="Account number"
                        />
                        {errors.bank_account_number && (
                          <p className="text-red-500 text-xs mt-1 flex items-center">
                            <AlertCircle className="w-3.5 h-3.5 mr-1" />
                            {errors.bank_account_number}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Bank IFSC Code
                          {formData.payout_mode === "bank_transfer" && " *"}
                        </label>
                        <input
                          type="text"
                          value={formData.bank_ifsc_code}
                          onChange={(e) =>
                            handleInputChange("bank_ifsc_code", e.target.value)
                          }
                          className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all ${
                            errors.bank_ifsc_code
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                          placeholder="IFSC code"
                        />
                        {errors.bank_ifsc_code && (
                          <p className="text-red-500 text-xs mt-1 flex items-center">
                            <AlertCircle className="w-3.5 h-3.5 mr-1" />
                            {errors.bank_ifsc_code}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Bank Name
                        </label>
                        <input
                          type="text"
                          value={formData.bank_name}
                          onChange={(e) =>
                            handleInputChange("bank_name", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all"
                          placeholder="Bank name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Bank Branch
                        </label>
                        <input
                          type="text"
                          value={formData.bank_branch}
                          onChange={(e) =>
                            handleInputChange("bank_branch", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1] transition-all"
                          placeholder="Branch name"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Agreements */}
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-gray-700 mb-3">
                      Agreements
                    </h3>
                    <div className="space-y-4">
                      <label className="flex items-start space-x-3 p-3 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.non_disclosure_agreement}
                          onChange={(e) =>
                            handleInputChange(
                              "non_disclosure_agreement",
                              e.target.checked
                            )
                          }
                          className={`w-4 h-4 mt-0.5 rounded border focus:ring-[#0067A1] ${
                            errors.non_disclosure_agreement
                              ? "border-red-500 text-red-500"
                              : "border-gray-300 text-[#0067A1]"
                          }`}
                        />
                        <div>
                          <span className="text-xs font-semibold text-gray-700">
                            Non-Disclosure Agreement (NDA) *
                          </span>
                          <p className="text-gray-500 text-[11px] mt-0.5">
                            I agree to maintain confidentiality of patient and business information
                          </p>
                          {errors.non_disclosure_agreement && (
                            <p className="text-red-500 text-[11px] mt-1 flex items-center">
                              <AlertCircle className="w-3.5 h-3.5 mr-1" />
                              {errors.non_disclosure_agreement}
                            </p>
                          )}
                        </div>
                      </label>

                      <label className="flex items-start space-x-3 p-3 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.terms_conditions_agreement}
                          onChange={(e) =>
                            handleInputChange(
                              "terms_conditions_agreement",
                              e.target.checked
                            )
                          }
                          className={`w-4 h-4 mt-0.5 rounded border focus:ring-[#0067A1] ${
                            errors.terms_conditions_agreement
                              ? "border-red-500 text-red-500"
                              : "border-gray-300 text-[#0067A1]"
                          }`}
                        />
                        <div>
                          <span className="text-xs font-semibold text-gray-700">
                            Terms & Conditions *
                          </span>
                          <p className="text-gray-500 text-[11px] mt-0.5">
                            I agree to the platform terms and conditions
                          </p>
                          {errors.terms_conditions_agreement && (
                            <p className="text-red-500 text-[11px] mt-1 flex items-center">
                              <AlertCircle className="w-3.5 h-3.5 mr-1" />
                              {errors.terms_conditions_agreement}
                            </p>
                          )}
                        </div>
                      </label>

                      <div className="bg-teal-50/30 p-4 rounded-md border border-teal-200">
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
                            className={`w-4 h-4 rounded border focus:ring-[#0067A1] mt-0.5 ${
                              errors.digital_consent
                                ? "border-red-500 text-red-500"
                                : "border-gray-300 text-[#0067A1]"
                            }`}
                            required
                          />
                          <div className="flex-1">
                            <span className="text-xs font-semibold text-gray-700">
                              Digital Consent & Declaration *
                            </span>
                            <p className="text-gray-500 text-[11px] mt-1">
                              I consent to the{" "}
                              <button
                                type="button"
                                onClick={() => setShowConsentModal(true)}
                                className="text-[#0067A1] hover:underline font-semibold"
                              >
                                platform terms and conditions
                              </button>
                              , and confirm that all information provided is
                              accurate to the best of my knowledge.
                            </p>
                            {errors.digital_consent && (
                              <p className="text-red-500 text-[11px] mt-1 flex items-center">
                                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                                {errors.digital_consent}
                              </p>
                            )}
                          </div>
                        </label>
                      </div>

                      <div className="bg-teal-50/30 p-4 rounded-md border border-teal-200">
                        <label className="flex items-start space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.consent_terms}
                            onChange={(e) =>
                              handleInputChange(
                                "consent_terms",
                                e.target.checked
                              )
                            }
                            className={`w-4 h-4 rounded border focus:ring-[#0067A1] mt-0.5 ${
                              errors.consent_terms
                                ? "border-red-500 text-red-500"
                                : "border-gray-300 text-[#0067A1]"
                            }`}
                            required
                          />
                          <div className="flex-1">
                            <span className="text-xs font-semibold text-gray-700">
                              Terms & Conditions Acceptance *
                            </span>
                            <p className="text-gray-500 text-[11px] mt-1">
                              I have read and accept the complete Terms & Conditions, 
                              Privacy Policy, and all associated agreements for lab onboarding.
                            </p>
                            {errors.consent_terms && (
                              <p className="text-red-500 text-[11px] mt-1 flex items-center">
                                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                                {errors.consent_terms}
                              </p>
                            )}
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-4 sm:mt-6 border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-5 py-2 rounded-md transition-colors font-semibold text-sm shadow-sm"
                  >
                    Previous
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-[#0067A1] hover:bg-[#004F7C] text-white px-5 py-2 rounded-md transition-colors font-semibold text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Submitting...</span>
                      </div>
                    ) : (
                      "Submit Application"
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </form>
        </div>
      </div>

      {/* Enhanced Signature Modal with Error Handling */}
      <AnimatePresence>
        {showSignatureModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowSignatureModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg w-full max-w-xl max-h-[90vh] flex flex-col shadow-xl border border-gray-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-[#0067A1] text-white p-4 flex-shrink-0">
                <h3 className="text-lg font-bold">Digital Signature</h3>
                <p className="text-xs opacity-90">Create your signature</p>
              </div>

              <div className="p-4 overflow-y-auto flex-1">
                <div className="border-b border-gray-200 mb-4">
                  <div className="flex space-x-6">
                    <button
                      type="button"
                      onClick={() => setActiveSignatureTab("draw")}
                      className={`pb-2 px-1 border-b-2 font-semibold text-sm transition-colors ${
                        activeSignatureTab === "draw"
                          ? "border-[#0067A1] text-[#0067A1]"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Draw Signature
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSignatureTab("upload")}
                      className={`pb-2 px-1 border-b-2 font-semibold text-sm transition-colors ${
                        activeSignatureTab === "upload"
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
                    <p className="text-xs text-gray-500 mb-3">
                      Draw your signature in the box below:
                    </p>
                    <div className="border border-gray-300 rounded-md p-2 bg-white">
                      <canvas
                        ref={canvasRef}
                        className="w-full h-64 border border-gray-200 rounded bg-white cursor-crosshair touch-none"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          const touch = e.touches[0];
                          const mouseEvent = new MouseEvent("mousedown", {
                            clientX: touch.clientX,
                            clientY: touch.clientY,
                          });
                          canvasRef.current.dispatchEvent(mouseEvent);
                        }}
                        onTouchMove={(e) => {
                          e.preventDefault();
                          const touch = e.touches[0];
                          const mouseEvent = new MouseEvent("mousemove", {
                            clientX: touch.clientX,
                            clientY: touch.clientY,
                          });
                          canvasRef.current.dispatchEvent(mouseEvent);
                        }}
                        onTouchEnd={() => {
                          const mouseEvent = new MouseEvent("mouseup", {});
                          canvasRef.current.dispatchEvent(mouseEvent);
                        }}
                      />
                    </div>
                    <div className="mt-3 flex justify-between items-center">
                      <button
                        type="button"
                        onClick={clearSignature}
                        className="bg-gray-500 text-white px-4 py-1.5 rounded-md hover:bg-gray-600 transition-colors flex items-center space-x-1.5 text-xs font-semibold"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Clear</span>
                      </button>
                      <p className="text-xs text-gray-400">
                        Draw your signature clearly
                      </p>
                    </div>
                  </div>
                )}

                {activeSignatureTab === "upload" && (
                  <div>
                    <p className="text-xs text-gray-500 mb-3">
                      Upload your signature image:
                    </p>
                    <div className="border border-dashed border-gray-300 rounded-md p-6 text-center">
                      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs text-gray-500 mb-3">
                        PNG or JPG files only (max 2MB)
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
                            className="max-h-24 mx-auto border rounded bg-white"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 px-4 py-3 flex justify-end space-x-3 border-t border-gray-150 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowSignatureModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors font-semibold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveSignature}
                  className="bg-[#0067A1] hover:bg-[#004F7C] text-white px-4 py-2 rounded-md transition-colors font-semibold text-sm"
                >
                  Save Signature
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Consent Modal */}
      <AnimatePresence>
        {showConsentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-xl border border-gray-200 flex flex-col"
            >
              {/* Header */}
              <div className="bg-[#0067A1] text-white p-5 flex-shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-md flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">
                      Lab Compliance & Terms
                    </h3>
                    <p className="text-teal-100 text-xs mt-0.5">
                      MediConnect.fit Laboratory Regulatory Compliance Framework
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto flex-1">
                <div className="space-y-4 text-xs text-gray-600">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                      Laboratory Compliance Requirements
                    </h4>
                    <div className="space-y-3">
                      <p>
                        <strong>1. Laboratory License Compliance</strong><br />
                        All diagnostic labs must maintain valid licenses as per the 
                        Clinical Establishments Act and relevant state regulations.
                      </p>
                      
                      <p>
                        <strong>2. NABL Accreditation</strong><br />
                        Compliance with National Accreditation Board for Testing and Calibration Laboratories standards.
                      </p>
                      
                      <p>
                        <strong>3. Data Protection</strong><br />
                        Adherence to Digital Personal Data Protection Act (DPDP), 2023 
                        for patient data and test results.
                      </p>
                      
                      <p>
                        <strong>4. Quality Control Standards</strong><br />
                        Implementation of proper quality control measures and 
                        maintenance of test accuracy standards.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowConsentModal(false)}
                  className="bg-[#0067A1] hover:bg-[#004F7C] text-white px-5 py-2 rounded-md font-semibold text-sm shadow-sm"
                >
                  I Understand & Agree
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}