"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
  Store,
  Package,
  Receipt,
  ShieldCheck,
  FileCheck,
  Banknote,
  ExternalLink,
  QrCode,
  Beaker,
  Microscope,
  TestTube,
  Heart,
  Activity,
  Pill,
  Home,
} from "lucide-react";
import Papa from "papaparse";

// Terms and Conditions Modal Component
function TermsModal({ isOpen, onClose, onAccept }) {
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    setAccepted(true);
    onAccept();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-black">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <FileText className="w-5 h-5 text-gray-700 dark:text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Terms & Conditions
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  Please read and accept the terms to continue
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
            >
              <XCircle size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh] bg-gray-50 dark:bg-gray-800">
          <div className="space-y-6 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Privacy Policy
              </h4>
              <div className="space-y-3">
                <p>
                  <strong>1. Data Collection and Usage</strong><br />
                  We collect personal and business information including but not limited to:
                  - Owner name, contact details, and identification documents
                  - Laboratory registration and license information
                  - Business documents (GSTIN, lab license, etc.)
                  - Location data and facility details
                </p>

                <p>
                  <strong>2. Data Protection</strong><br />
                  Your data is protected with industry-standard security measures:
                  - Encryption of sensitive information
                  - Secure document storage
                  - Restricted access to personal data
                  - Regular security audits
                </p>

                <p>
                  <strong>3. Information Sharing</strong><br />
                  We may share your information with:
                  - Regulatory authorities as required by law
                  - Payment processors for transaction purposes
                  - Service providers for platform operations
                  - Legal authorities when mandated
                </p>

                <p>
                  <strong>4. Consent and Permissions</strong><br />
                  By accepting these terms, you agree to:
                  - Provide accurate and complete information
                  - Maintain updated documentation
                  - Allow verification of submitted documents
                  - Receive communications related to your account
                </p>

                <p>
                  <strong>5. Document Retention</strong><br />
                  We retain your documents for:
                  - Legal compliance requirements
                  - Service delivery purposes
                  - Audit and verification needs
                  - As long as your account remains active
                </p>

                <p>
                  <strong>6. Rights and Responsibilities</strong><br />
                  You have the right to:
                  - Access your personal information
                  - Request corrections to inaccurate data
                  - Withdraw consent (subject to legal obligations)
                  - Delete your account and associated data
                </p>

                <p>
                  <strong>7. Platform Usage</strong><br />
                  As a registered laboratory, you agree to:
                  - Maintain valid licenses and certifications
                  - Comply with all applicable laws and regulations
                  - Provide genuine services and accurate results
                  - Maintain professional conduct on the platform
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-300">
                    Important Notice
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-400 text-sm mt-1">
                    By accepting these terms, you acknowledge that you have read, understood,
                    and agree to be bound by all the conditions mentioned above. Please ensure
                    all submitted documents are valid and up-to-date.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="accept-terms"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-black focus:ring-black bg-white dark:bg-gray-700"
              />
              <label htmlFor="accept-terms" className="text-sm text-gray-700 dark:text-gray-300">
                I have read and accept the Terms & Conditions
              </label>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAccept}
                disabled={!accepted}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Accept & Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Service Input Component
function ServiceInput({ services, onChange }) {
  const [newService, setNewService] = useState({ service_name: "", price: "" });

  const addService = () => {
    if (newService.service_name && newService.price) {
      const updatedServices = [...services, {
        service_name: newService.service_name,
        price: parseFloat(newService.price)
      }];
      onChange(updatedServices);
      setNewService({ service_name: "", price: "" });
    }
  };

  const removeService = (index) => {
    const updatedServices = services.filter((_, i) => i !== index);
    onChange(updatedServices);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Service name"
          value={newService.service_name}
          onChange={(e) => setNewService(prev => ({ ...prev, service_name: e.target.value }))}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
        />
        <input
          type="number"
          placeholder="Price"
          value={newService.price}
          onChange={(e) => setNewService(prev => ({ ...prev, price: e.target.value }))}
          className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
        />
        <button
          type="button"
          onClick={addService}
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all duration-200"
        >
          Add
        </button>
      </div>

      <div className="space-y-2 max-h-40 overflow-y-auto">
        {services.map((service, index) => (
          <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div>
              <span className="font-medium text-gray-900 dark:text-white">{service.service_name}</span>
              <span className="ml-2 text-green-600 dark:text-green-400">₹{service.price}</span>
            </div>
            <button
              type="button"
              onClick={() => removeService(index)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Updated OnboardingModal Component for Labs
function OnboardingModal({ isOpen, onClose, lab, onSave }) {
  const [formData, setFormData] = useState({
    lab_name: "",
    owner_name: "",
    email: "",
    phone_number: "",
    contact_person: "",
    address: "",
    latitude: "",
    longitude: "",
    license_number: "",
    registration_number: "",
    gst_number: "",
    pan_number: "",
    general_turnaround: "",
    accepts_home_collection: false,
    opening_hours: { open: "09:00", close: "18:00" },
    services: [],
  });

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // File states
  const [pan_card_file, setPanCardFile] = useState(null);
  const [aadhaar_card_file, setAadhaarCardFile] = useState(null);
  const [lab_license_file, setLabLicenseFile] = useState(null);
  const [gst_certificate_file, setGstCertificateFile] = useState(null);
  const [owner_photo_file, setOwnerPhotoFile] = useState(null);
  const [signature_file, setSignatureFile] = useState(null);

  const turnaroundOptions = [
    "Same day",
    "24 hours",
    "48 hours",
    "3-5 days",
    "1 week",
    "2 weeks"
  ];

  useEffect(() => {
    if (lab) {
      // Parse services and opening hours from existing lab data
      const parsedServices = Array.isArray(lab.services)
        ? lab.services
        : (typeof lab.services === 'string' ? JSON.parse(lab.services) : []);

      const parsedOpeningHours = lab.opening_hours && typeof lab.opening_hours === 'string'
        ? JSON.parse(lab.opening_hours)
        : (lab.opening_hours || { open: "09:00", close: "18:00" });

      setFormData({
        lab_name: lab.lab_name || "",
        owner_name: lab.owner_name || "",
        email: lab.email || "",
        phone_number: lab.phone_number || "",
        contact_person: lab.contact_person || "",
        address: lab.address || "",
        latitude: lab.latitude || "",
        longitude: lab.longitude || "",
        license_number: lab.license_number || "",
        registration_number: lab.registration_number || "",
        gst_number: lab.gst_number || "",
        pan_number: lab.pan_number || "",
        general_turnaround: lab.general_turnaround || "",
        accepts_home_collection: lab.accepts_home_collection || false,
        opening_hours: parsedOpeningHours,
        services: parsedServices,
      });
    } else {
      setFormData({
        lab_name: "",
        owner_name: "",
        email: "",
        phone_number: "",
        contact_person: "",
        address: "",
        latitude: "",
        longitude: "",
        license_number: "",
        registration_number: "",
        gst_number: "",
        pan_number: "",
        general_turnaround: "",
        accepts_home_collection: false,
        opening_hours: { open: "09:00", close: "18:00" },
        services: [],
      });
    }

    setStep(1);

    // Reset file states
    setPanCardFile(null);
    setAadhaarCardFile(null);
    setLabLicenseFile(null);
    setGstCertificateFile(null);
    setOwnerPhotoFile(null);
    setSignatureFile(null);
  }, [lab, isOpen]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileChange = (setter, file) => {
    if (file) {
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

  const handleServicesChange = (newServices) => {
    setFormData(prev => ({
      ...prev,
      services: newServices
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

  // Upload a single file via Supabase signed URL (bypasses server body size limit)
  const uploadFileViaSignedUrl = async (file, folder) => {
    // Step 1: Get a signed upload URL from our API
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

    const { signedUrl, publicUrl } = result.data;

    // Step 2: Upload the file directly to Supabase Storage using the signed URL
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

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const submitFormData = new FormData();

      // Append form data
      Object.keys(formData).forEach((key) => {
        if (key === 'opening_hours' || key === 'services') {
          submitFormData.append(key, JSON.stringify(formData[key]));
        } else if (key === 'accepts_home_collection') {
          submitFormData.append(key, formData[key].toString());
        } else {
          submitFormData.append(key, formData[key]);
        }
      });

      // Append files
      const fileFields = [
        { field: "pan_card", file: pan_card_file },
        { field: "aadhaar_card", file: aadhaar_card_file },
        { field: "lab_license", file: lab_license_file },
        { field: "gst_certificate", file: gst_certificate_file },
        { field: "owner_photo", file: owner_photo_file },
        { field: "signature", file: signature_file },
      ];

      for (const { field, file } of fileFields) {
        if (!file) continue;
        
        // Upload via presigned URL if it's a File object (not a string URL)
        if (typeof file !== "string") {
          toast.success(`Uploading ${field.replace(/_/g, ' ')}...`, { id: 'uploading' });
          const publicUrl = await uploadFileViaSignedUrl(file, field);
          submitFormData.append(field, publicUrl);
        } else {
          submitFormData.append(field, file);
        }
      }
      toast.dismiss('uploading');

      // Add ID for updates
      if (lab) {
        submitFormData.append("id", lab.id);
      }

      await onSave(submitFormData);
      onClose();
      toast.success(
        lab ? "Lab updated successfully!" : "Lab onboarded successfully!"
      );
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const FileUploadField = ({
    label,
    file,
    setFile,
    accept = ".jpg,.jpeg,.png,.pdf",
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      {!file ? (
        <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer">
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Click to upload or drag and drop
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
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeFile(setFile)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <User className="w-5 h-5 text-gray-700 dark:text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Basic Information
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Lab Name *
          </label>
          <input
            type="text"
            value={formData.lab_name}
            onChange={(e) => handleInputChange("lab_name", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="City Diagnostic Lab"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Owner Name *
          </label>
          <input
            type="text"
            value={formData.owner_name}
            onChange={(e) => handleInputChange("owner_name", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="John Doe"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Phone Number *
          </label>
          <input
            type="text"
            value={formData.phone_number}
            onChange={(e) => handleInputChange("phone_number", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="+91 9876543210"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="lab@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Contact Person
          </label>
          <input
            type="text"
            value={formData.contact_person}
            onChange={(e) => handleInputChange("contact_person", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="Manager Name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            License Number *
          </label>
          <input
            type="text"
            value={formData.license_number}
            onChange={(e) => handleInputChange("license_number", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="LAB123456789"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <MapPin className="w-5 h-5 text-gray-700 dark:text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Location & Business Details
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Address *
          </label>
          <textarea
            value={formData.address}
            onChange={(e) => handleInputChange("address", e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="Enter full lab address"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Latitude
            </label>
            <input
              type="text"
              value={formData.latitude}
              onChange={(e) => handleInputChange("latitude", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="28.6139"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Longitude
            </label>
            <input
              type="text"
              value={formData.longitude}
              onChange={(e) => handleInputChange("longitude", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="77.2090"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Registration Number
            </label>
            <input
              type="text"
              value={formData.registration_number}
              onChange={(e) => handleInputChange("registration_number", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="REG123456"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              GST Number
            </label>
            <input
              type="text"
              value={formData.gst_number}
              onChange={(e) => handleInputChange("gst_number", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="07AABCU9603R1ZM"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              PAN Number
            </label>
            <input
              type="text"
              value={formData.pan_number}
              onChange={(e) => handleInputChange("pan_number", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="ABCDE1234F"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <Beaker className="w-5 h-5 text-gray-700 dark:text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Services & Operations
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Services with Prices *
          </label>
          <ServiceInput
            services={formData.services}
            onChange={handleServicesChange}
          />
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              General Turnaround Time *
            </label>
            <select
              value={formData.general_turnaround}
              onChange={(e) => handleInputChange("general_turnaround", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="">Select turnaround time</option>
              {turnaroundOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
            <input
              type="checkbox"
              id="home-collection"
              checked={formData.accepts_home_collection}
              onChange={(e) => handleInputChange("accepts_home_collection", e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-black focus:ring-black bg-white dark:bg-gray-700"
            />
            <label htmlFor="home-collection" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Accepts Home Collection
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Opening Hours
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Open Time</label>
                <input
                  type="time"
                  value={formData.opening_hours.open}
                  onChange={(e) => handleOpeningHoursChange('open', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Close Time</label>
                <input
                  type="time"
                  value={formData.opening_hours.close}
                  onChange={(e) => handleOpeningHoursChange('close', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
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
          Documents & Certificates
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FileUploadField
          label="PAN Card"
          file={pan_card_file}
          setFile={setPanCardFile}
        />
        <FileUploadField
          label="Aadhaar Card"
          file={aadhaar_card_file}
          setFile={setAadhaarCardFile}
        />
        <FileUploadField
          label="Lab License"
          file={lab_license_file}
          setFile={setLabLicenseFile}
        />
        <FileUploadField
          label="GST Certificate"
          file={gst_certificate_file}
          setFile={setGstCertificateFile}
        />
        <FileUploadField
          label="Owner Photo"
          file={owner_photo_file}
          setFile={setOwnerPhotoFile}
          accept=".jpg,.jpeg,.png"
        />
        <FileUploadField
          label="Signature"
          file={signature_file}
          setFile={setSignatureFile}
          accept=".jpg,.jpeg,.png,.pdf"
        />
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-black">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {lab ? "Update Lab" : "Onboard New Lab"}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  {lab
                    ? "Update lab information"
                    : "Add a new diagnostic lab to the system"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-between mt-4">
              {[1, 2, 3, 4].map((stepNum) => (
                <div key={stepNum} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${step === stepNum
                      ? "bg-black text-white shadow-sm"
                      : step > stepNum
                        ? "bg-gray-600 text-white shadow-sm"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                      }`}
                  >
                    {stepNum}
                  </div>
                  {stepNum < 4 && (
                    <div
                      className={`w-12 h-1 mx-2 transition-all duration-300 ${step > stepNum
                        ? "bg-gray-600"
                        : "bg-gray-200 dark:bg-gray-700"
                        }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[60vh] bg-gray-50 dark:bg-gray-800">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
          </div>

          <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="flex justify-between">
              <button
                onClick={() => step > 1 && setStep(step - 1)}
                disabled={step === 1}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Previous
              </button>

              {step < 4 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all duration-200 shadow-sm"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-all duration-200 shadow-sm"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Saving...</span>
                    </div>
                  ) : lab ? (
                    "Update Lab"
                  ) : (
                    "Onboard Lab"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Admin CSV Bulk Upload Modal Component with PapaParse Preview & Collection Type Support
function AdminCsvUploadModal({ isOpen, onClose, preselectedLabId, onUploaded }) {
  const [labs, setLabs] = useState([]);
  const [selectedLabId, setSelectedLabId] = useState(preselectedLabId || "");
  const [loadingLabs, setLoadingLabs] = useState(false);
  const [csvData, setCsvData] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (preselectedLabId) {
        setSelectedLabId(preselectedLabId);
      }
      fetchLabOptions();
    } else {
      setCsvData([]);
      setCsvErrors([]);
      setCsvFileName("");
    }
  }, [isOpen, preselectedLabId]);

  const fetchLabOptions = async () => {
    setLoadingLabs(true);
    try {
      const res = await fetch("/api/lab/web?limit=1000");
      const json = await res.json();
      if (json.success && json.data?.labs) {
        setLabs(json.data.labs);
        if (!selectedLabId && json.data.labs.length > 0 && !preselectedLabId) {
          setSelectedLabId(json.data.labs[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load labs dropdown", e);
    } finally {
      setLoadingLabs(false);
    }
  };

  const CSV_HEADERS = [
    "Test Name", "Price", "Category", "Collection Type", "Sample Type", "Container",
    "Temperature", "Turnaround Time", "Schedule", "Reporting Schedule",
    "Remarks", "Clinical History Required", "Active"
  ];

  const downloadSampleTemplate = () => {
    const sampleRows = [
      [
        "Complete Blood Count (CBC)", "450", "Hematology", "both", "EDTA Blood", "EDTA Tube",
        "Room Temp", "Same Day", "Daily by 3 PM", "Same day by 7 PM",
        "10-12 hrs overnight fasting advised", "No", "Yes"
      ],
      [
        "Lipid Profile Extended", "950", "Biochemistry", "home", "Serum", "Red top / Plain",
        "2-8°C", "Same Day", "Daily by 11 AM", "Same day by 6 PM",
        "12 hrs strict fasting required", "Yes", "Yes"
      ],
      [
        "Digital Chest X-Ray", "600", "Radiology", "lab", "Patient Visit", "N/A",
        "Room Temp", "1-2 Hours", "Daily by 4 PM", "Same day in 2 hours",
        "Walk-in test center only", "No", "Yes"
      ],
      [
        "HbA1c Glycated Hemoglobin", "550", "Endocrinology", "both", "EDTA Blood", "Lavender top",
        "Room Temp", "Same Day", "Daily by 3 PM", "Same day by 6 PM",
        "Non-fasting acceptable", "No", "Yes"
      ]
    ];
    const csvContent = [CSV_HEADERS.join(","), ...sampleRows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "sample_lab_tests_template.csv";
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("Sample CSV template downloaded!");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = [];
        const errs = [];

        results.data.forEach((row, idx) => {
          const testName = (row["Test Name"] || row["test_name"] || "").trim();
          const price = (row["Price"] || row["price"] || "").trim();
          const rawCol = (row["Collection Type"] || row["collection_type"] || "").trim().toLowerCase();
          const collectionType = ["home", "lab", "both"].includes(rawCol) ? rawCol : "lab";

          const rowErrors = [];
          if (!testName) rowErrors.push("Missing Test Name");
          if (!price || isNaN(parseFloat(price))) rowErrors.push("Invalid Price");

          const parsed = {
            test_name: testName,
            price: price,
            category_name: (row["Category"] || row["category"] || "").trim() || "General",
            collection_type: collectionType,
            specimen_type: (row["Sample Type"] || row["specimen_type"] || "").trim() || null,
            container: (row["Container"] || row["container"] || "").trim() || null,
            temperature: (row["Temperature"] || row["temperature"] || "").trim() || null,
            turnaround_time: (row["Turnaround Time"] || row["turnaround_time"] || "").trim() || null,
            schedule: (row["Schedule"] || row["schedule"] || "").trim() || null,
            reporting_schedule: (row["Reporting Schedule"] || row["reporting_schedule"] || "").trim() || null,
            remarks: (row["Remarks"] || row["remarks"] || "").trim() || null,
            clinical_history_required: ["yes", "true", "1"].includes((row["Clinical History Required"] || "").trim().toLowerCase()),
            is_active: !["no", "false", "0"].includes((row["Active"] || "").trim().toLowerCase()),
            _errors: rowErrors,
            _rowNum: idx + 2
          };

          if (rowErrors.length > 0) errs.push(parsed);
          rows.push(parsed);
        });

        setCsvData(rows);
        setCsvErrors(errs);
      },
      error: () => {
        toast.error("Failed to parse CSV file with PapaParse");
      }
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRowEdit = (index, field, value) => {
    const updated = [...csvData];
    updated[index][field] = value;
    const rowErrors = [];
    if (!updated[index].test_name?.trim()) rowErrors.push("Missing Test Name");
    if (!updated[index].price || isNaN(parseFloat(updated[index].price))) rowErrors.push("Invalid Price");
    updated[index]._errors = rowErrors;
    setCsvData(updated);
    setCsvErrors(updated.filter(r => r._errors.length > 0));
  };

  const handleRowDelete = (index) => {
    const updated = [...csvData];
    updated.splice(index, 1);
    setCsvData(updated);
    setCsvErrors(updated.filter(r => r._errors.length > 0));
  };

  const handleConfirmUpload = async () => {
    if (!selectedLabId) {
      toast.error("Please select a target Lab diagnostic center");
      return;
    }
    const validRows = csvData.filter(r => r._errors.length === 0);
    if (validRows.length === 0) {
      toast.error("No valid tests to import");
      return;
    }

    setUploading(true);
    try {
      const payload = validRows.map(({ _errors, _rowNum, ...clean }) => clean);
      const res = await fetch("/api/admin/labs/tests/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lab_id: selectedLabId,
          tests: payload
        })
      });
      const data = await res.json();
      if (data.success) {
        const targetLab = labs.find(l => l.id === selectedLabId);
        toast.success(data.message || `Imported ${validRows.length} tests to ${targetLab?.lab_name || 'Lab'}!`);
        if (onUploaded) onUploaded(selectedLabId);
        onClose();
      } else {
        toast.error(data.message || "Failed to import tests");
      }
    } catch (err) {
      console.error("Bulk upload error:", err);
      toast.error("Server error importing tests");
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  const validCount = csvData.filter(r => r._errors.length === 0).length;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/40 text-[#0067A1] dark:text-blue-300 rounded-xl">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Admin Bulk Upload Lab Tests</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Select any diagnostic center, preview CSV with PapaParse, and bulk import test catalog</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Target Lab Selector & Sample Download Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                Target Diagnostic Lab *
              </label>
              {loadingLabs ? (
                <div className="h-11 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse flex items-center px-4 text-xs text-gray-500">Loading labs...</div>
              ) : (
                <select
                  value={selectedLabId}
                  onChange={(e) => setSelectedLabId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-[#0067A1] focus:outline-none transition-all"
                >
                  <option value="" disabled>Select Target Diagnostic Lab...</option>
                  {labs.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.lab_name} {l.address ? `— ${l.address.slice(0, 45)}...` : ""} ({l.status || 'approved'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <button
                type="button"
                onClick={downloadSampleTemplate}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 rounded-xl font-medium text-sm transition-colors cursor-pointer shadow-xs"
              >
                <Download size={16} />
                Download Sample CSV
              </button>
            </div>
          </div>

          {/* Instructions Banner */}
          <div className="p-3.5 bg-blue-50/60 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold">Format Guidelines:</span>
              <p>
                Columns supported: <code className="font-mono bg-blue-100/60 dark:bg-blue-800/40 px-1 py-0.5 rounded">Test Name</code>, <code className="font-mono bg-blue-100/60 dark:bg-blue-800/40 px-1 py-0.5 rounded">Price</code>, <code className="font-mono bg-blue-100/60 dark:bg-blue-800/40 px-1 py-0.5 rounded">Category</code>, <code className="font-mono bg-blue-100/60 dark:bg-blue-800/40 px-1 py-0.5 rounded">Collection Type</code> (<span className="text-emerald-700 dark:text-emerald-300 font-semibold">home</span>, <span className="text-blue-700 dark:text-blue-300 font-semibold">lab</span>, or <span className="text-teal-700 dark:text-teal-300 font-semibold">both</span>), <code className="font-mono bg-blue-100/60 dark:bg-blue-800/40 px-1 py-0.5 rounded">Sample Type</code>, <code className="font-mono bg-blue-100/60 dark:bg-blue-800/40 px-1 py-0.5 rounded">Turnaround Time</code>.
              </p>
            </div>
          </div>

          {/* File Dropzone */}
          <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl cursor-pointer hover:border-[#0067A1] dark:hover:border-blue-400 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-all group">
            <Upload className="w-8 h-8 text-gray-400 group-hover:text-[#0067A1] transition-colors" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
              {csvFileName ? (
                <span className="font-semibold text-[#0067A1] dark:text-blue-400">{csvFileName}</span>
              ) : (
                "Click or drag to select your CSV file"
              )}
            </span>
            <span className="text-xs text-gray-400">Accepted format: .csv (Parsed instantly in-browser using PapaParse)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>

          {/* PapaParse Live Preview Table */}
          {csvData.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-xs font-semibold">
                    Total Rows: {csvData.length}
                  </span>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1">
                    <CheckCircle size={13} />
                    Valid: {validCount}
                  </span>
                  {csvErrors.length > 0 && (
                    <span className="px-3 py-1 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-lg text-xs font-semibold flex items-center gap-1">
                      <XCircle size={13} />
                      Errors: {csvErrors.length}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400 italic">Click any cell below to edit before final import</span>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto max-h-72">
                <table className="w-full text-left text-xs min-w-[750px]">
                  <thead className="bg-gray-50 dark:bg-gray-700/80 sticky top-0 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-3 py-2.5 text-center w-10 text-gray-500">#</th>
                      <th className="px-3 py-2.5 text-center w-12 text-gray-500">Status</th>
                      <th className="px-3 py-2.5 text-gray-700 dark:text-gray-200">Test Name *</th>
                      <th className="px-3 py-2.5 w-24 text-gray-700 dark:text-gray-200">Price (₹) *</th>
                      <th className="px-3 py-2.5 w-32 text-gray-700 dark:text-gray-200">Category</th>
                      <th className="px-3 py-2.5 w-32 text-gray-700 dark:text-gray-200">Collection Type</th>
                      <th className="px-3 py-2.5 text-gray-700 dark:text-gray-200">Sample</th>
                      <th className="px-3 py-2.5 w-24 text-gray-700 dark:text-gray-200">TAT</th>
                      <th className="px-3 py-2.5 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {csvData.map((row, i) => (
                      <tr
                        key={i}
                        className={row._errors.length > 0 ? "bg-red-50/30 dark:bg-red-900/10" : "hover:bg-gray-50 dark:hover:bg-gray-700/30"}
                      >
                        <td className="px-3 py-2 text-center text-gray-400 font-mono">{row._rowNum}</td>
                        <td className="px-3 py-2 text-center">
                          {row._errors.length === 0 ? (
                            <CheckCircle size={16} className="text-emerald-500 mx-auto" />
                          ) : (
                            <XCircle size={16} className="text-red-500 mx-auto" title={row._errors.join(", ")} />
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="text"
                            value={row.test_name}
                            onChange={(e) => handleRowEdit(i, "test_name", e.target.value)}
                            className={`w-full px-2 py-1 bg-transparent rounded border ${
                              row._errors.includes("Missing Test Name") ? "border-red-400 bg-red-50/50 text-red-900" : "border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-[#0067A1]"
                            }`}
                            placeholder="Test name"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                            <input
                              type="number"
                              value={row.price}
                              onChange={(e) => handleRowEdit(i, "price", e.target.value)}
                              className={`w-full pl-5 pr-2 py-1 bg-transparent rounded border ${
                                row._errors.includes("Invalid Price") ? "border-red-400 bg-red-50/50 text-red-900" : "border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-[#0067A1]"
                              }`}
                              placeholder="0"
                            />
                          </div>
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="text"
                            value={row.category_name}
                            onChange={(e) => handleRowEdit(i, "category_name", e.target.value)}
                            className="w-full px-2 py-1 bg-transparent rounded border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-[#0067A1]"
                            placeholder="Category"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <select
                            value={row.collection_type || "lab"}
                            onChange={(e) => handleRowEdit(i, "collection_type", e.target.value)}
                            className="w-full px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs"
                          >
                            <option value="lab">Lab Visit</option>
                            <option value="home">Home Collection</option>
                            <option value="both">Both (Home & Lab)</option>
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="text"
                            value={row.specimen_type || ""}
                            onChange={(e) => handleRowEdit(i, "specimen_type", e.target.value)}
                            className="w-full px-2 py-1 bg-transparent rounded border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-[#0067A1]"
                            placeholder="Sample"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="text"
                            value={row.turnaround_time || ""}
                            onChange={(e) => handleRowEdit(i, "turnaround_time", e.target.value)}
                            className="w-full px-2 py-1 bg-transparent rounded border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-[#0067A1]"
                            placeholder="TAT"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRowDelete(i)}
                            className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                            title="Remove row"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80 flex items-center justify-between shrink-0">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {selectedLabId ? (
              <span>Target: <strong>{labs.find(l => l.id === selectedLabId)?.lab_name || 'Selected Lab'}</strong></span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 font-medium">Please select a target lab first</span>
            )}
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmUpload}
              disabled={uploading || !selectedLabId || validCount === 0}
              className="px-5 py-2 bg-[#0067A1] hover:bg-[#004F7C] disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-semibold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Importing Tests...
                </>
              ) : (
                <>
                  <Upload size={14} />
                  Import {validCount} Tests to Lab
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LabTestsContent({ labId, onOpenUploadCsv }) {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/lab/tests?lab_id=${labId}`);
      const data = await res.json();
      if (data.success) {
        setTests(data.data || []);
      } else {
        toast.error(data.message || "Failed to fetch lab tests");
      }
    } catch (err) {
      toast.error("Error fetching lab tests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (labId) {
      fetchTests();
    }
  }, [labId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h4 className="text-base font-semibold text-gray-900 dark:text-white">Diagnostic Tests Catalog ({tests.length})</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">Available tests and collection options for this diagnostic center</p>
        </div>
        <button
          type="button"
          onClick={() => onOpenUploadCsv && onOpenUploadCsv(labId)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#0067A1] hover:bg-[#004F7C] text-white rounded-lg transition-colors shadow-sm cursor-pointer"
        >
          <Upload size={14} />
          Upload CSV Tests
        </button>
      </div>

      {tests.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
          <TestTube className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Tests Found</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1 mb-4">This lab hasn't added any diagnostic tests yet.</p>
          <button
            type="button"
            onClick={() => onOpenUploadCsv && onOpenUploadCsv(labId)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[#0067A1] hover:bg-[#004F7C] text-white rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            <Upload size={14} />
            Upload CSV for this Lab
          </button>
        </div>
      ) : (
        tests.map((test) => (
          <div key={test.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
                    {test.test_code || "N/A"}
                  </span>
                  {test.category && (
                    <span className="text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-[#0067A1] dark:text-blue-400 px-2 py-0.5 rounded-full flex items-center">
                      {test.category.name}
                    </span>
                  )}
                  {/* Collection Type Badge */}
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 border ${
                    test.collection_type === 'home'
                      ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
                      : test.collection_type === 'both'
                      ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800'
                      : 'bg-blue-50 text-[#0067A1] border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                  }`}>
                    {test.collection_type === 'home' ? (
                      <>
                        <Home size={11} />
                        Home Collection
                      </>
                    ) : test.collection_type === 'both' ? (
                      <>
                        <RefreshCw size={11} />
                        Home & Lab
                      </>
                    ) : (
                      <>
                        <Microscope size={11} />
                        Lab Visit
                      </>
                    )}
                  </span>
                  {!test.is_active && (
                    <span className="text-xs font-medium bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
                      Inactive
                    </span>
                  )}
                </div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                  {test.test_name}
                </h4>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  ₹{test.price}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="block text-gray-500 dark:text-gray-400 text-xs mb-1">Sample Type</span>
                <span className="font-medium text-gray-900 dark:text-white">{test.specimen_type || "Not specified"}</span>
              </div>
              <div>
                <span className="block text-gray-500 dark:text-gray-400 text-xs mb-1">Container</span>
                <span className="font-medium text-gray-900 dark:text-white">{test.container || "Not specified"}</span>
              </div>
              <div>
                <span className="block text-gray-500 dark:text-gray-400 text-xs mb-1">Temperature</span>
                <span className="font-medium text-gray-900 dark:text-white">{test.temperature || "Not specified"}</span>
              </div>
              <div>
                <span className="block text-gray-500 dark:text-gray-400 text-xs mb-1">TAT</span>
                <span className="font-medium text-gray-900 dark:text-white">{test.turnaround_time || "Not specified"}</span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function LabDetailsModal({ lab, isOpen, onClose, onOpenUploadCsv }) {
  if (!isOpen || !lab) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl border border-gray-200 dark:border-gray-700">
        <ModalContent lab={lab} onClose={onClose} onOpenUploadCsv={onOpenUploadCsv} />
      </div>
    </div>
  );
}

function ModalContent({ lab, onClose, onOpenUploadCsv }) {
  const [activeTab, setActiveTab] = useState("details");
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800";
      case "pending":
        return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800";
      case "rejected":
        return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800";
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
        .toUpperCase() || "L"
    );
  };

  // Parse services and opening hours
  const parsedServices = Array.isArray(lab.services)
    ? lab.services
    : (typeof lab.services === 'string' ? JSON.parse(lab.services) : []);

  const parsedOpeningHours = lab.opening_hours && typeof lab.opening_hours === 'string'
    ? JSON.parse(lab.opening_hours)
    : (lab.opening_hours || { open: "09:00", close: "18:00" });

  // Initialize map when location tab is active and coordinates are available
  useEffect(() => {
    if (
      activeTab === "location" &&
      lab.latitude &&
      lab.longitude &&
      window.google
    ) {
      const initializeMap = () => {
        const position = {
          lat: parseFloat(lab.latitude),
          lng: parseFloat(lab.longitude),
        };

        // Clear existing map
        if (mapRef.current) {
          mapRef.current = null;
        }
        if (markerRef.current) {
          markerRef.current.setMap(null);
        }

        // Create new map
        mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
          zoom: 15,
          center: position,
          styles: [
            {
              featureType: "all",
              elementType: "geometry",
              stylers: [{ color: "#f5f5f5" }],
            },
            {
              featureType: "all",
              elementType: "labels.text.fill",
              stylers: [{ color: "#616161" }],
            },
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
        });

        // Create marker
        markerRef.current = new window.google.maps.Marker({
          position: position,
          map: mapRef.current,
          title: lab.lab_name || "Lab Location",
          animation: window.google.maps.Animation.DROP,
        });

        // Create info window
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div class="p-2">
              <h3 class="font-semibold text-gray-900">${lab.lab_name || "Lab"
            }</h3>
              <p class="text-sm text-gray-600">${lab.address || "Location"
            }</p>
            </div>
          `,
        });

        markerRef.current.addListener("click", () => {
          infoWindow.open(mapRef.current, markerRef.current);
        });
      };

      initializeMap();
    }
  }, [
    activeTab,
    lab.latitude,
    lab.longitude,
    lab.lab_name,
    lab.address,
  ]);

  // Load Google Maps script
  useEffect(() => {
    const existingScript = document.querySelector(
      'script[src^="https://maps.googleapis.com/maps/api/js"]'
    );

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "YOUR_API_KEY"
        }`;
      script.setAttribute("async", "");
      script.setAttribute("defer", "");
      script.setAttribute("loading", "async");
      script.onload = () => setMapLoaded(true);
      document.head.appendChild(script);
    } else {
      if (window.google) {
        setMapLoaded(true);
      } else {
        existingScript.addEventListener("load", () => setMapLoaded(true));
      }
    }
  }, []);

  // Cleanup map when component unmounts
  useEffect(() => {
    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
    };
  }, []);

  // Render location content
  const renderLocationContent = () => {
    if (!lab.latitude || !lab.longitude) {
      return (
        <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400">
              No location data available
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            Location
          </h4>
          <a
            href={`https://www.google.com/maps?q=${lab.latitude},${lab.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0067A1] dark:text-[#0080C6] hover:text-[#004F7C] dark:hover:text-teal-300 text-sm flex items-center space-x-1"
          >
            <span>Open in Google Maps</span>
            <ExternalLink size={14} />
          </a>
        </div>

        <div
          ref={mapContainerRef}
          className="h-64 w-full rounded-lg border border-gray-300 dark:border-gray-600"
        />

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600 dark:text-gray-400">
              Latitude:
            </span>
            <span className="ml-2 text-gray-900 dark:text-white">
              {lab.latitude}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-600 dark:text-gray-400">
              Longitude:
            </span>
            <span className="ml-2 text-gray-900 dark:text-white">
              {lab.longitude}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Render documents content
  const renderDocumentsContent = () => {
    const documents = [
      { label: "PAN Card", value: lab.pan_card_url, icon: CreditCard },
      { label: "Aadhaar Card", value: lab.aadhaar_card_url, icon: BadgeCheck },
      { label: "Lab License", value: lab.lab_license_url, icon: FileCheck },
      { label: "GST Certificate", value: lab.gst_certificate_url, icon: Receipt },
      { label: "Owner Photo", value: lab.owner_photo_url, icon: User },
      { label: "Signature", value: lab.signature_url, icon: QrCode },
    ];

    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <FileCheck className="w-5 h-5 text-gray-700 dark:text-white" />
            </div>
            <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
              Documents Status
            </h5>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            {documents.map((doc, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-lg ${doc.value
                      ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                      }`}
                  >
                    <doc.icon size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {doc.label}
                    </p>
                    <p
                      className={`text-xs ${doc.value
                        ? "text-green-600 dark:text-green-400"
                        : "text-gray-500 dark:text-gray-500"
                        }`}
                    >
                      {doc.value ? "Uploaded" : "Pending"}
                    </p>
                  </div>
                </div>
                {doc.value && (
                  <a
                    href={doc.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0067A1] dark:text-[#0080C6] hover:text-[#004F7C] dark:hover:text-teal-300 transition-colors"
                  >
                    <Eye size={16} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render services content
  const renderServicesContent = () => (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <Beaker className="w-5 h-5 text-gray-700 dark:text-white" />
          </div>
          <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
            Services & Capabilities
          </h5>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Available Services
              </h6>
              <div className="space-y-2">
                {parsedServices.map((service, index) => (
                  <div key={index} className="flex justify-between items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <span className="text-sm text-gray-900 dark:text-white">{service.service_name}</span>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">₹{service.price}</span>
                  </div>
                ))}
                {parsedServices.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No services added</p>
                )}
              </div>
            </div>

            <div>
              <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Home Collection
              </h6>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${lab.accepts_home_collection
                ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800"
                : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                }`}>
                {lab.accepts_home_collection ? "Available" : "Not Available"}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Turnaround Time
              </h6>
              <div className="flex items-center space-x-2 text-sm text-gray-900 dark:text-white">
                <Clock size={16} />
                <span>{lab.general_turnaround || "Not specified"}</span>
              </div>
            </div>

            <div>
              <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Opening Hours
              </h6>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-gray-600 dark:text-gray-400">Open:</span>
                  <span className="text-gray-900 dark:text-white font-medium">{parsedOpeningHours.open}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-gray-600 dark:text-gray-400">Close:</span>
                  <span className="text-gray-900 dark:text-white font-medium">{parsedOpeningHours.close}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render details content
  const renderDetailsContent = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Column */}
      <div className="space-y-6">
        {/* Business Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Building className="w-5 h-5 text-gray-700 dark:text-white" />
            </div>
            <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
              Business Information
            </h5>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Lab Name
              </span>
              <span className="text-sm text-gray-900 dark:text-white font-medium">
                {lab.lab_name || "Not provided"}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Owner Name
              </span>
              <span className="text-sm text-gray-900 dark:text-white font-medium">
                {lab.owner_name || "Not provided"}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                License Number
              </span>
              <span className="text-sm text-gray-900 dark:text-white font-medium">
                {lab.license_number || "Not provided"}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Registration Number
              </span>
              <span className="text-sm text-gray-900 dark:text-white font-medium">
                {lab.registration_number || "Not provided"}
              </span>
            </div>
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
                  {lab.email || "Not provided"}
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
                  {lab.phone_number || "Not provided"}
                </p>
              </div>
            </div>
            {lab.contact_person && (
              <div className="flex items-center space-x-3 py-2">
                <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Contact Person
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {lab.contact_person}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        {/* Location Details */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <MapPin className="w-5 h-5 text-gray-700 dark:text-white" />
            </div>
            <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
              Location Details
            </h5>
          </div>
          <div className="space-y-4">
            <div className="py-2">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Address
              </p>
              <p className="text-sm text-gray-900 dark:text-white">
                {lab.address || "Not provided"}
              </p>
            </div>
            {(lab.latitude || lab.longitude) && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Latitude
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {lab.latitude}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Longitude
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {lab.longitude}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tax Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Receipt className="w-5 h-5 text-gray-700 dark:text-white" />
            </div>
            <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
              Tax Information
            </h5>
          </div>
          <div className="space-y-4">
            {lab.gst_number && (
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  GST Number
                </span>
                <span className="text-sm text-gray-900 dark:text-white font-medium">
                  {lab.gst_number}
                </span>
              </div>
            )}
            {lab.pan_number && (
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  PAN Number
                </span>
                <span className="text-sm text-gray-900 dark:text-white font-medium">
                  {lab.pan_number}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="p-6 pb-0 border-b rounded-t-2xl border-gray-200 dark:border-gray-700 bg-white dark:bg-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl">
              <Beaker className="w-8 h-8 text-gray-700 dark:text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                Lab Details
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Complete business information
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
          >
            <XCircle size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mt-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab("details")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 ${activeTab === "details"
              ? "bg-black text-white border border-black"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
          >
            <div className="flex items-center space-x-2">
              <User size={16} />
              <span>Details</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("services")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 ${activeTab === "services"
              ? "bg-black text-white border border-black"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
          >
            <div className="flex items-center space-x-2">
              <Beaker size={16} />
              <span>Services</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("location")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 ${activeTab === "location"
              ? "bg-black text-white border border-black"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
          >
            <div className="flex items-center space-x-2">
              <MapPin size={16} />
              <span>Location</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 ${activeTab === "documents"
              ? "bg-black text-white border border-black"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
          >
            <div className="flex items-center space-x-2">
              <FileText size={16} />
              <span>Documents</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("tests")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 ${activeTab === "tests"
              ? "bg-black text-white border border-black"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
          >
            <div className="flex items-center space-x-2">
              <TestTube size={16} />
              <span>Tests</span>
            </div>
          </button>
        </div>
      </div>
      <div className="overflow-y-auto max-h-[70vh]">
        {/* Profile Section */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-start space-x-6">
            <div className="flex-shrink-0">
              {lab.owner_photo_url ? (
                <img
                  className="h-24 w-24 rounded-full object-cover shadow-xl border-4 border-gray-300 dark:border-gray-700"
                  src={lab.owner_photo_url}
                  alt="Owner"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 dark:from-gray-900 dark:to-gray-900 flex items-center justify-center text-white font-bold text-2xl shadow-xl border-4 border-gray-300 dark:border-gray-700">
                  {getInitials(lab.owner_name)}
                </div>
              )}
            </div>
            <div className="flex-1">
              <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {lab.lab_name || "Unknown Lab"}
              </h4>
              <p className="text-lg text-gray-700 dark:text-gray-300 font-semibold mb-3">
                {lab.owner_name || "Unknown Owner"}
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                  <BadgeCheck size={14} className="mr-1" />
                  License: {lab.license_number || "N/A"}
                </span>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    lab.onboarding_status || "pending"
                  )}`}
                >
                  {lab.onboarding_status ? lab.onboarding_status.charAt(0).toUpperCase() + lab.onboarding_status.slice(1) : "Pending"}
                </span>
                {lab.gst_number && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-teal-100 dark:bg-[#003358] text-[#004F7C] dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                    <Receipt size={14} className="mr-1" />
                    GST: {lab.gst_number}
                  </span>
                )}
                {lab.accepts_home_collection && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800">
                    <MapPin size={14} className="mr-1" />
                    Home Collection
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "details" && renderDetailsContent()}
          {activeTab === "services" && renderServicesContent()}
          {activeTab === "location" && renderLocationContent()}
          {activeTab === "documents" && renderDocumentsContent()}
          {activeTab === "tests" && <LabTestsContent labId={lab.id} onOpenUploadCsv={onOpenUploadCsv} />}
        </div>
      </div>
      <div className="p-6 border-t rounded-b-2xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500 dark:text-gray-500">
            Created:{" "}
            {lab.created_at
              ? new Date(lab.created_at).toLocaleDateString()
              : "N/A"}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function LabsPage() {
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viewLab, setViewLab] = useState(null);
  const [editLab, setEditLab] = useState(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [summary, setSummary] = useState({ total: 0, approved: 0, pending: 0, homeCollection: 0 });
  const [csvUploadModalOpen, setCsvUploadModalOpen] = useState(false);
  const [csvTargetLabId, setCsvTargetLabId] = useState(null);

  const handleOpenCsvModal = (labId = null) => {
    setCsvTargetLabId(labId);
    setCsvUploadModalOpen(true);
  };

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Fetch labs
  const fetchLabs = async (page = 1, search = searchTerm, status = statusFilter) => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.itemsPerPage.toString(),
        ...(search && { search }),
        ...(status !== "all" && { status }),
      });

      const response = await fetch(`/api/lab/web?${params}`);
      const result = await response.json();

      if (result.success) {
        setLabs(result.data.labs || []);
        if (result.data.summary) {
          setSummary(result.data.summary);
        }
        setPagination({
          currentPage: result.data.pagination?.page || 1,
          totalPages: result.data.pagination?.totalPages || 1,
          totalItems: result.data.pagination?.total || 0,
          itemsPerPage: result.data.pagination?.limit || 10,
          hasNextPage: (result.data.pagination?.page || 1) < (result.data.pagination?.totalPages || 1),
          hasPrevPage: (result.data.pagination?.page || 1) > 1,
        });
      } else {
        toast.error(result.message || "Failed to fetch labs");
      }
    } catch (error) {
      console.error("Error fetching labs:", error);
      toast.error("Failed to load labs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabs(pagination.currentPage, searchTerm, statusFilter);
  }, [searchTerm, statusFilter, pagination.itemsPerPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
      fetchLabs(newPage);
    }
  };

  // Handle items per page change
  const handleItemsPerPageChange = (newLimit) => {
    const newPagination = {
      ...pagination,
      itemsPerPage: parseInt(newLimit),
      currentPage: 1,
    };
    setPagination(newPagination);
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, pagination.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleDelete = async () => {
    setConfirmOpen(false);
    if (selectedIds.length === 0) return toast.error("No labs selected!");

    try {
      const res = await fetch("/api/lab/web/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      const result = await res.json();
      if (result.success) {
        toast.success("Labs deleted successfully!");
        setSelectedIds([]);
        fetchLabs();
      } else {
        toast.error(result.message || "Failed to delete labs");
      }
    } catch (err) {
      toast.error("Error: " + err.message);
    }
  };

  const handleStatusChange = async (labId, newStatus) => {
    try {
      const res = await fetch("/api/lab/web/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: labId, onboarding_status: newStatus }),
      });

      const result = await res.json();
      if (result.success) {
        toast.success("Status updated successfully!");
        fetchLabs();
      } else {
        toast.error(result.message || "Failed to update status");
      }
    } catch (err) {
      toast.error("Error: " + err.message);
    }
  };

  const handleSaveLab = async (formData) => {
    const url = editLab ? "/api/lab/web/update" : "/api/lab/web";
    const method = "POST";

    const res = await fetch(url, {
      method,
      body: formData,
    });

    let result;
    try {
      result = await res.json();
    } catch (err) {
      if (res.status === 413) {
        throw new Error("Files are too large. Please upload smaller files.");
      }
      throw new Error(`Server error (${res.status}). Failed to save lab.`);
    }

    if (!result.success) throw new Error(result.message);

    fetchLabs();
    setEditLab(null);
    setOnboardingOpen(false);
  };

  const getInitials = (name) => {
    return (
      name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "L"
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800";
      case "pending":
        return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800";
      case "rejected":
        return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800";
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

  return (
    <>
      <main className="flex-1 overflow-auto relative z-0">
        <div className="p-2 md:p-4 bg-transparent">
          <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50">
            <div className="min-h-screen bg-gradient-to-br from-gray-50 rounded-2xl to-gray-100 dark:from-gray-900 dark:to-gray-800 p-2 md:p-4 lg:p-6">
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
                      Lab Management
                    </motion.h4>
                    <motion.p
                      className="text-gray-600 dark:text-gray-400 mt-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of {pagination.totalItems} labs
                    </motion.p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap mt-4 sm:mt-0">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleOpenCsvModal(null)}
                      className="flex items-center px-4 py-2 text-sm bg-white dark:bg-gray-800 text-[#0067A1] dark:text-blue-400 font-semibold rounded-lg transition-all duration-300 cursor-pointer shadow-xs border border-[#0067A1]/30 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      <Upload size={18} className="mr-2" />
                      Upload Tests (CSV)
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setEditLab(null);
                        setOnboardingOpen(true);
                      }}
                      className="flex items-center px-4 py-2 text-sm bg-black text-white font-semibold rounded-lg transition-all duration-300 cursor-pointer shadow-sm border border-gray-300 dark:border-gray-700 hover:bg-gray-800"
                    >
                      <Plus size={20} className="mr-2" />
                      Onboard Lab
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
                    label: "Total Labs",
                    value: summary.total,
                    icon: Beaker,
                    color:
                      "from-gray-500 to-gray-600 dark:from-gray-800 dark:to-gray-900 text-gray-50 text-center",
                  },
                  {
                    label: "Approved Labs",
                    value: summary.approved,
                    icon: CheckCircle,
                    color:
                      "from-green-500 to-green-600 dark:from-green-800 dark:to-green-900 text-gray-50 text-center",
                  },
                  {
                    label: "Pending Labs",
                    value: summary.pending,
                    icon: Clock,
                    color:
                      "from-yellow-500 to-yellow-600 dark:from-yellow-800 dark:to-yellow-900 text-gray-50 text-center",
                  },
                  {
                    label: "Home Collection",
                    value: summary.homeCollection,
                    icon: MapPin,
                    color:
                      "from-[#0067A1] to-[#004F7C] dark:from-[#003358] dark:to-[#003358] text-gray-50 text-center",
                  },
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    variants={cardVariants}
                    whileHover="hover"
                    className="bg-white dark:bg-gray-800/80 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700/50 hover:shadow-md transition-all duration-300"
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
                        className={`p-3 bg-gradient-to-r ${stat.color} rounded-xl shadow-sm border border-gray-300 dark:border-gray-600`}
                      >
                        <stat.icon className="w-6 h-6 text-gray-20 dark:text-white" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Controls Section */}
              <motion.div
                className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700/50 p-6 mb-6"
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
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                    <input
                      type="text"
                      placeholder="Search labs by name, owner, or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300 cursor-text"
                    />
                  </motion.div>

                  {/* Filters and Actions */}
                  <div className="flex flex-wrap items-center gap-3">
                    <motion.select
                      whileFocus={{ scale: 1.05 }}
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300 cursor-pointer"
                    >
                      <option value="all">All Status</option>
                      <option value="approved">Approved</option>
                      <option value="pending">Pending</option>
                      <option value="rejected">Rejected</option>
                    </motion.select>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => fetchLabs(1)}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300 cursor-pointer"
                    >
                      <Filter size={20} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => fetchLabs(pagination.currentPage)}
                      disabled={loading}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center justify-between mt-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl border border-red-200 dark:border-red-800/50"
                    >
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
                        <span className="text-red-700 dark:text-red-300 font-medium">
                          {selectedIds.length} lab(s) selected
                        </span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            Promise.all(
                              selectedIds.map((id) => handleStatusChange(id, "approved"))
                            );
                          }}
                          className="flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-all duration-300 cursor-pointer text-sm"
                        >
                          <CheckCircle size={16} className="mr-1" />
                          Approve
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            Promise.all(
                              selectedIds.map((id) => handleStatusChange(id, "pending"))
                            );
                          }}
                          className="flex items-center px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-all duration-300 cursor-pointer text-sm"
                        >
                          <Clock size={16} className="mr-1" />
                          Mark Pending
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            Promise.all(
                              selectedIds.map((id) => handleStatusChange(id, "rejected"))
                            );
                          }}
                          className="flex items-center px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all duration-300 cursor-pointer text-sm"
                        >
                          <XCircle size={16} className="mr-1" />
                          Reject
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

              {/* Labs Table */}
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
                ) : labs.length === 0 ? (
                  <motion.div
                    className="text-center py-12"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Beaker className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No labs found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-500 mb-4">
                      {searchTerm || statusFilter !== "all"
                        ? "Try adjusting your search criteria"
                        : "Get started by onboarding your first lab"}
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setEditLab(null);
                        setOnboardingOpen(true);
                      }}
                      className="inline-flex items-center px-4 py-2 bg-black text-white font-medium rounded-lg transition-all duration-300 cursor-pointer border border-gray-300 dark:border-gray-700 hover:bg-gray-800"
                    >
                      <Plus size={20} className="mr-2" />
                      Onboard New Lab
                    </motion.button>
                  </motion.div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700/80 border-b border-gray-200 dark:border-gray-600">
                        <tr>
                          <th className="px-4 py-3 text-left">
                            <input
                              type="checkbox"
                              onChange={(e) =>
                                setSelectedIds(
                                  e.target.checked
                                    ? labs.map((l) => l.id)
                                    : []
                                )
                              }
                              checked={
                                labs.length > 0 &&
                                selectedIds.length === labs.length
                              }
                              className="rounded border-gray-300 dark:border-gray-600 text-black focus:ring-black bg-white dark:bg-gray-700 cursor-pointer"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Lab
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Owner
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Contact
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Services
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {labs.map((lab, index) => {
                          const parsedServices = Array.isArray(lab.services)
                            ? lab.services
                            : (typeof lab.services === 'string' ? JSON.parse(lab.services) : []);

                          return (
                            <motion.tr
                              key={lab.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all duration-300"
                            >
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.includes(lab.id)}
                                  onChange={() => toggleSelect(lab.id)}
                                  className="rounded border-gray-300 dark:border-gray-600 text-black focus:ring-black bg-white dark:bg-gray-700 cursor-pointer"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10">
                                    {lab.owner_photo_url ? (
                                      <motion.img
                                        whileHover={{ scale: 1.1 }}
                                        className="h-10 w-10 rounded-full object-cover shadow-sm"
                                        src={lab.owner_photo_url}
                                        alt=""
                                      />
                                    ) : (
                                      <motion.div
                                        whileHover={{ scale: 1.1 }}
                                        className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 dark:from-gray-700 dark:to-gray-900 flex items-center justify-center text-white font-medium text-sm shadow-sm"
                                      >
                                        {getInitials(lab.owner_name)}
                                      </motion.div>
                                    )}
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {lab.lab_name || "Unknown Lab"}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                      License: {lab.license_number || "N/A"}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {lab.owner_name || "Unknown"}
                                </div>
                                {lab.contact_person && (
                                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                    Contact: {lab.contact_person}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {lab.email || "No email"}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1">
                                  <Phone size={14} className="mr-1" />
                                  {lab.phone_number || "No phone"}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {parsedServices.slice(0, 2).map(s => s.service_name).join(", ") || "No services"}
                                  {parsedServices.length > 2 && (
                                    <span className="text-gray-500"> +{parsedServices.length - 2} more</span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                                  <Clock size={14} className="mr-1" />
                                  {lab.general_turnaround || "N/A"}
                                  {lab.accepts_home_collection && (
                                    <span className="ml-2 text-green-600 dark:text-green-400 flex items-center">
                                      <MapPin size={12} className="mr-1" />
                                      Home
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col gap-2">
                                  <span
                                    className={`inline-flex text-center items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                      lab.onboarding_status || "pending"
                                    )}`}
                                  >
                                    {lab.onboarding_status ? lab.onboarding_status.charAt(0).toUpperCase() + lab.onboarding_status.slice(1) : "Pending"}
                                  </span>
                                  <select
                                    value={lab.onboarding_status || "pending"}
                                    onChange={(e) =>
                                      handleStatusChange(
                                        lab.id,
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
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => {
                                      setViewLab(lab);
                                      setDetailsModalOpen(true);
                                    }}
                                    className="p-2 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-all duration-300 cursor-pointer"
                                    title="View Details"
                                  >
                                    <Eye size={18} />
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                      setEditLab(lab);
                                      setOnboardingOpen(true);
                                    }}
                                    className="p-2 text-[#0067A1] dark:text-[#0080C6] hover:text-[#004F7C] dark:hover:text-teal-300 transition-all duration-300 cursor-pointer"
                                    title="Edit"
                                  >
                                    <Edit size={18} />
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => toggleSelect(lab.id)}
                                    className="p-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-all duration-300 cursor-pointer"
                                    title="Delete"
                                  >
                                    <Trash2 size={18} />
                                  </motion.button>
                                </div>
                              </td>
                            </motion.tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
              {labs.length > 0 && (
                <motion.div
                  className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700/50 p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of {pagination.totalItems} labs
                    </div>

                    <div className="flex items-center space-x-4">
                      {/* Items Per Page Selector */}
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                        <span>Show:</span>
                        <select
                          value={pagination.itemsPerPage}
                          onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent cursor-pointer"
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                        </select>
                        <span>per page</span>
                      </div>

                      {/* Pagination Controls */}
                      <div className="flex items-center space-x-1">
                        {/* First Page */}
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handlePageChange(1)}
                          disabled={!pagination.hasPrevPage}
                          className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-300"
                        >
                          <ChevronsLeft size={16} />
                        </motion.button>

                        {/* Previous Page */}
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handlePageChange(pagination.currentPage - 1)}
                          disabled={!pagination.hasPrevPage}
                          className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-300"
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
                              : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                              }`}
                          >
                            {pageNum}
                          </motion.button>
                        ))}

                        {/* Next Page */}
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handlePageChange(pagination.currentPage + 1)}
                          disabled={!pagination.hasNextPage}
                          className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-300"
                        >
                          <ChevronRight size={16} />
                        </motion.button>

                        {/* Last Page */}
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handlePageChange(pagination.totalPages)}
                          disabled={!pagination.hasNextPage}
                          className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-300"
                        >
                          <ChevronsRight size={16} />
                        </motion.button>
                      </div>
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
          setEditLab(null);
        }}
        lab={editLab}
        onSave={handleSaveLab}
      />

      {/* Enhanced Lab Details Modal */}
      <LabDetailsModal
        lab={viewLab}
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setViewLab(null);
        }}
        onOpenUploadCsv={(labId) => handleOpenCsvModal(labId)}
      />

      {/* Admin Bulk CSV Upload Modal */}
      <AdminCsvUploadModal
        isOpen={csvUploadModalOpen}
        onClose={() => setCsvUploadModalOpen(false)}
        preselectedLabId={csvTargetLabId}
        onUploaded={() => {
          fetchLabs(pagination.currentPage);
        }}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmOpen && (
          <motion.div
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
                  lab(s)? This action cannot be undone.
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
    </>
  );
}