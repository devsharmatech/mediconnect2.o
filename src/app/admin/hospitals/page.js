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
  Ambulance,
  Bed,
  HeartPulse,
  Scalpel,
  Hospital,
  Syringe,
  Thermometer,
} from "lucide-react";

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
                Hospital Registration Agreement
              </h4>
              <div className="space-y-3">
                <p>
                  <strong>1. Hospital Information & Verification</strong><br />
                  By registering, you confirm that all provided hospital details are accurate:
                  - Valid medical licenses and certifications
                  - Proper hospital registration documents
                  - Qualified medical staff credentials
                  - Facility specifications and capabilities
                </p>
                
                <p>
                  <strong>2. Service Standards</strong><br />
                  Registered hospitals must maintain:
                  - 24/7 emergency services (if claimed)
                  - Proper medical equipment and facilities
                  - Qualified medical professionals
                  - Hygienic and safe environment
                  - Emergency response protocols
                </p>
                
                <p>
                  <strong>3. Patient Care & Safety</strong><br />
                  Commitment to:
                  - Quality patient care standards
                  - Emergency medical services
                  - Proper diagnosis and treatment
                  - Patient privacy and data protection
                  - Medical ethics compliance
                </p>
                
                <p>
                  <strong>4. Legal Compliance</strong><br />
                  Agreement to comply with:
                  - Medical council regulations
                  - Health department guidelines
                  - Data protection laws
                  - Medical waste management rules
                  - Emergency service protocols
                </p>
                
                <p>
                  <strong>5. Facility Requirements</strong><br />
                  Must maintain:
                  - Adequate bed capacity as declared
                  - ICU facilities if specified
                  - Emergency department standards
                  - Ambulance services if offered
                  - Medical equipment maintenance
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-300">
                    Important Medical Facility Notice
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-400 text-sm mt-1">
                    By accepting these terms, you certify that your hospital meets all 
                    government medical standards and maintains proper licenses. Regular 
                    audits may be conducted to verify compliance.
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

// Specialties Input Component
function SpecialtiesInput({ specialties, onChange }) {
  const [newSpecialty, setNewSpecialty] = useState("");

  const commonSpecialties = [
    "Cardiology", "Neurology", "Orthopedics", "Pediatrics", "Gynecology",
    "Dermatology", "Ophthalmology", "Dentistry", "Psychiatry", "Urology",
    "Endocrinology", "Gastroenterology", "Nephrology", "Oncology", "Rheumatology",
    "Pulmonology", "ENT", "General Surgery", "Plastic Surgery", "Emergency Medicine"
  ];

  const addSpecialty = () => {
    if (newSpecialty.trim() && !specialties.includes(newSpecialty.trim())) {
      const updatedSpecialties = [...specialties, newSpecialty.trim()];
      onChange(updatedSpecialties);
      setNewSpecialty("");
    }
  };

  const removeSpecialty = (index) => {
    const updatedSpecialties = specialties.filter((_, i) => i !== index);
    onChange(updatedSpecialties);
  };

  const addCommonSpecialty = (specialty) => {
    if (!specialties.includes(specialty)) {
      const updatedSpecialties = [...specialties, specialty];
      onChange(updatedSpecialties);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add medical specialty"
          value={newSpecialty}
          onChange={(e) => setNewSpecialty(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
        />
        <button
          type="button"
          onClick={addSpecialty}
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all duration-200"
        >
          Add
        </button>
      </div>
      
      {/* Common Specialties */}
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Common Specialties
        </p>
        <div className="flex flex-wrap gap-2">
          {commonSpecialties.map((specialty) => (
            <button
              key={specialty}
              type="button"
              onClick={() => addCommonSpecialty(specialty)}
              disabled={specialties.includes(specialty)}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {specialty}
            </button>
          ))}
        </div>
      </div>
      
      {/* Selected Specialties */}
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Selected Specialties ({specialties.length})
        </p>
        <div className="flex flex-wrap gap-2">
          {specialties.map((specialty, index) => (
            <div
              key={index}
              className="flex items-center space-x-2 px-3 py-1 bg-teal-100 dark:bg-[#003358] text-[#004F7C] dark:text-teal-300 rounded-full text-sm"
            >
              <span>{specialty}</span>
              <button
                type="button"
                onClick={() => removeSpecialty(index)}
                className="text-[#0067A1] dark:text-[#0080C6] hover:text-[#004F7C] dark:hover:text-teal-200 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {specialties.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">No specialties added</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Facilities Input Component
function FacilitiesInput({ facilities, onChange }) {
  const [newFacility, setNewFacility] = useState("");

  const commonFacilities = [
    "ICU", "Emergency Room", "Operation Theater", "Pharmacy", "Laboratory",
    "Radiology", "Ambulance Service", "Blood Bank", "Cafeteria", "Parking",
    "Wheelchair Access", "AC Rooms", "Private Rooms", "24/7 Emergency",
    "Trauma Center", "MICU", "SICU", "NICU", "PICU", "Dialysis Unit"
  ];

  const addFacility = () => {
    if (newFacility.trim() && !facilities.includes(newFacility.trim())) {
      const updatedFacilities = [...facilities, newFacility.trim()];
      onChange(updatedFacilities);
      setNewFacility("");
    }
  };

  const removeFacility = (index) => {
    const updatedFacilities = facilities.filter((_, i) => i !== index);
    onChange(updatedFacilities);
  };

  const addCommonFacility = (facility) => {
    if (!facilities.includes(facility)) {
      const updatedFacilities = [...facilities, facility];
      onChange(updatedFacilities);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add facility"
          value={newFacility}
          onChange={(e) => setNewFacility(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFacility())}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
        />
        <button
          type="button"
          onClick={addFacility}
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all duration-200"
        >
          Add
        </button>
      </div>
      
      {/* Common Facilities */}
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Common Facilities
        </p>
        <div className="flex flex-wrap gap-2">
          {commonFacilities.map((facility) => (
            <button
              key={facility}
              type="button"
              onClick={() => addCommonFacility(facility)}
              disabled={facilities.includes(facility)}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {facility}
            </button>
          ))}
        </div>
      </div>
      
      {/* Selected Facilities */}
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Selected Facilities ({facilities.length})
        </p>
        <div className="flex flex-wrap gap-2">
          {facilities.map((facility, index) => (
            <div
              key={index}
              className="flex items-center space-x-2 px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 rounded-full text-sm"
            >
              <span>{facility}</span>
              <button
                type="button"
                onClick={() => removeFacility(index)}
                className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {facilities.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">No facilities added</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Updated OnboardingModal Component for Hospitals
function OnboardingModal({ isOpen, onClose, hospital, onSave }) {
  const [formData, setFormData] = useState({
    hospital_name: "",
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
    hospital_type: "general",
    bed_count: 0,
    icu_beds: 0,
    emergency_services: false,
    ambulance_services: false,
    specialties: [],
    facilities: [],
    opening_hours: { open: "00:00", close: "23:59" },
    emergency_timing: { open: "00:00", close: "23:59" },
    general_turnaround: "",
  });

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // File states
  const [pan_card_file, setPanCardFile] = useState(null);
  const [aadhaar_card_file, setAadhaarCardFile] = useState(null);
  const [hospital_license_file, setHospitalLicenseFile] = useState(null);
  const [gst_certificate_file, setGstCertificateFile] = useState(null);
  const [owner_photo_file, setOwnerPhotoFile] = useState(null);
  const [signature_file, setSignatureFile] = useState(null);

  const hospitalTypes = [
    { value: "general", label: "General Hospital" },
    { value: "specialty", label: "Specialty Hospital" },
    { value: "multi_specialty", label: "Multi-Specialty Hospital" },
    { value: "super_specialty", label: "Super-Specialty Hospital" },
    { value: "clinic", label: "Clinic" },
    { value: "diagnostic_center", label: "Diagnostic Center" },
  ];

  const turnaroundOptions = [
    "Immediate (Emergency)",
    "Within 1 hour",
    "2-4 hours",
    "Same day",
    "24 hours",
    "48 hours"
  ];

  useEffect(() => {
    if (hospital) {
      // Parse data from existing hospital
      const parsedSpecialties = Array.isArray(hospital.specialties) 
        ? hospital.specialties 
        : (typeof hospital.specialties === 'string' ? JSON.parse(hospital.specialties) : []);
      
      const parsedFacilities = Array.isArray(hospital.facilities) 
        ? hospital.facilities 
        : (typeof hospital.facilities === 'string' ? JSON.parse(hospital.facilities) : []);
      
      const parsedOpeningHours = hospital.opening_hours && typeof hospital.opening_hours === 'string' 
        ? JSON.parse(hospital.opening_hours) 
        : (hospital.opening_hours || { open: "00:00", close: "23:59" });

      const parsedEmergencyTiming = hospital.emergency_timing && typeof hospital.emergency_timing === 'string' 
        ? JSON.parse(hospital.emergency_timing) 
        : (hospital.emergency_timing || { open: "00:00", close: "23:59" });

      setFormData({
        hospital_name: hospital.hospital_name || "",
        owner_name: hospital.owner_name || "",
        email: hospital.email || "",
        phone_number: hospital.phone_number || "",
        contact_person: hospital.contact_person || "",
        address: hospital.address || "",
        latitude: hospital.latitude || "",
        longitude: hospital.longitude || "",
        license_number: hospital.license_number || "",
        registration_number: hospital.registration_number || "",
        gst_number: hospital.gst_number || "",
        pan_number: hospital.pan_number || "",
        hospital_type: hospital.hospital_type || "general",
        bed_count: hospital.bed_count || 0,
        icu_beds: hospital.icu_beds || 0,
        emergency_services: hospital.emergency_services || false,
        ambulance_services: hospital.ambulance_services || false,
        specialties: parsedSpecialties,
        facilities: parsedFacilities,
        opening_hours: parsedOpeningHours,
        emergency_timing: parsedEmergencyTiming,
        general_turnaround: hospital.general_turnaround || "",
      });
    } else {
      setFormData({
        hospital_name: "",
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
        hospital_type: "general",
        bed_count: 0,
        icu_beds: 0,
        emergency_services: false,
        ambulance_services: false,
        specialties: [],
        facilities: [],
        opening_hours: { open: "00:00", close: "23:59" },
        emergency_timing: { open: "00:00", close: "23:59" },
        general_turnaround: "",
      });
    }

    setStep(1);

    // Reset file states
    setPanCardFile(null);
    setAadhaarCardFile(null);
    setHospitalLicenseFile(null);
    setGstCertificateFile(null);
    setOwnerPhotoFile(null);
    setSignatureFile(null);
  }, [hospital, isOpen]);

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

  const handleSpecialtiesChange = (newSpecialties) => {
    setFormData(prev => ({
      ...prev,
      specialties: newSpecialties
    }));
  };

  const handleFacilitiesChange = (newFacilities) => {
    setFormData(prev => ({
      ...prev,
      facilities: newFacilities
    }));
  };

  const handleTimingChange = (type, field, value) => {
    setFormData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const submitFormData = new FormData();
      
      // Append form data
      Object.keys(formData).forEach((key) => {
        if (key === 'opening_hours' || key === 'emergency_timing' || key === 'specialties' || key === 'facilities') {
          submitFormData.append(key, JSON.stringify(formData[key]));
        } else if (key === 'emergency_services' || key === 'ambulance_services') {
          submitFormData.append(key, formData[key].toString());
        } else {
          submitFormData.append(key, formData[key]);
        }
      });

      // Append files
      const fileFields = [
        { field: "pan_card", file: pan_card_file },
        { field: "aadhaar_card", file: aadhaar_card_file },
        { field: "hospital_license", file: hospital_license_file },
        { field: "gst_certificate", file: gst_certificate_file },
        { field: "owner_photo", file: owner_photo_file },
        { field: "signature", file: signature_file },
      ];

      fileFields.forEach(({ field, file }) => {
        if (file) submitFormData.append(field, file);
      });

      // Add ID for updates
      if (hospital) {
        submitFormData.append("id", hospital.id);
      }

      await onSave(submitFormData);
      onClose();
      toast.success(
        hospital ? "Hospital updated successfully!" : "Hospital onboarded successfully!"
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
          <Hospital className="w-5 h-5 text-gray-700 dark:text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Hospital Basic Information
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Hospital Name *
          </label>
          <input
            type="text"
            value={formData.hospital_name}
            onChange={(e) => handleInputChange("hospital_name", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="City General Hospital"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Hospital Type *
          </label>
          <select
            value={formData.hospital_type}
            onChange={(e) => handleInputChange("hospital_type", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
          >
            {hospitalTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
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
            placeholder="Dr. John Smith"
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
            placeholder="hospital@example.com"
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
            placeholder="Hospital Administrator"
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
            placeholder="HSP123456789"
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
            placeholder="Enter full hospital address"
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
          <Bed className="w-5 h-5 text-gray-700 dark:text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Hospital Facilities & Services
        </h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Bed Capacity
            </label>
            <input
              type="number"
              value={formData.bed_count}
              onChange={(e) => handleInputChange("bed_count", parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="Total beds"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ICU Beds
            </label>
            <input
              type="number"
              value={formData.icu_beds}
              onChange={(e) => handleInputChange("icu_beds", parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="ICU bed count"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
              <input
                type="checkbox"
                id="emergency-services"
                checked={formData.emergency_services}
                onChange={(e) => handleInputChange("emergency_services", e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-black focus:ring-black bg-white dark:bg-gray-700"
              />
              <label htmlFor="emergency-services" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                24/7 Emergency Services
              </label>
            </div>

            <div className="flex items-center space-x-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
              <input
                type="checkbox"
                id="ambulance-services"
                checked={formData.ambulance_services}
                onChange={(e) => handleInputChange("ambulance_services", e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-black focus:ring-black bg-white dark:bg-gray-700"
              />
              <label htmlFor="ambulance-services" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Ambulance Services
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Emergency Response Time
            </label>
            <select
              value={formData.general_turnaround}
              onChange={(e) => handleInputChange("general_turnaround", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="">Select response time</option>
              {turnaroundOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Regular Timing
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Open Time</label>
                <input
                  type="time"
                  value={formData.opening_hours.open}
                  onChange={(e) => handleTimingChange('opening_hours', 'open', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Close Time</label>
                <input
                  type="time"
                  value={formData.opening_hours.close}
                  onChange={(e) => handleTimingChange('opening_hours', 'close', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {formData.emergency_services && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Emergency Department Timing
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Open Time</label>
                  <input
                    type="time"
                    value={formData.emergency_timing.open}
                    onChange={(e) => handleTimingChange('emergency_timing', 'open', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Close Time</label>
                  <input
                    type="time"
                    value={formData.emergency_timing.close}
                    onChange={(e) => handleTimingChange('emergency_timing', 'close', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Medical Specialties *
          </label>
          <SpecialtiesInput 
            specialties={formData.specialties} 
            onChange={handleSpecialtiesChange} 
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Facilities & Amenities
          </label>
          <FacilitiesInput 
            facilities={formData.facilities} 
            onChange={handleFacilitiesChange} 
          />
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
          label="Hospital License"
          file={hospital_license_file}
          setFile={setHospitalLicenseFile}
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
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-black">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {hospital ? "Update Hospital" : "Onboard New Hospital"}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  {hospital
                    ? "Update hospital information"
                    : "Add a new hospital to the system"}
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
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                      step === stepNum
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
                      className={`w-12 h-1 mx-2 transition-all duration-300 ${
                        step > stepNum
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
                  ) : hospital ? (
                    "Update Hospital"
                  ) : (
                    "Onboard Hospital"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={handleSubmit}
      />
    </>
  );
}

// Hospital Details Modal Component
function HospitalDetailsModal({ hospital, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("details");

  if (!isOpen || !hospital) {
    return null;
  }

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

  const getHospitalTypeLabel = (type) => {
    const types = {
      general: "General Hospital",
      specialty: "Specialty Hospital",
      multi_specialty: "Multi-Specialty Hospital",
      super_specialty: "Super-Specialty Hospital",
      clinic: "Clinic",
      diagnostic_center: "Diagnostic Center"
    };
    return types[type] || type;
  };

  const parsedSpecialties = Array.isArray(hospital.specialties) 
    ? hospital.specialties 
    : (typeof hospital.specialties === 'string' ? JSON.parse(hospital.specialties) : []);

  const parsedFacilities = Array.isArray(hospital.facilities) 
    ? hospital.facilities 
    : (typeof hospital.facilities === 'string' ? JSON.parse(hospital.facilities) : []);

  const parsedOpeningHours = hospital.opening_hours && typeof hospital.opening_hours === 'string' 
    ? JSON.parse(hospital.opening_hours) 
    : (hospital.opening_hours || { open: "00:00", close: "23:59" });

  const parsedEmergencyTiming = hospital.emergency_timing && typeof hospital.emergency_timing === 'string' 
    ? JSON.parse(hospital.emergency_timing) 
    : (hospital.emergency_timing || { open: "00:00", close: "23:59" });

  const renderDetailsContent = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Column */}
      <div className="space-y-6">
        {/* Hospital Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Building className="w-5 h-5 text-gray-700 dark:text-white" />
            </div>
            <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
              Hospital Information
            </h5>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Hospital Name
              </span>
              <span className="text-sm text-gray-900 dark:text-white font-medium">
                {hospital.hospital_name || "Not provided"}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Hospital Type
              </span>
              <span className="text-sm text-gray-900 dark:text-white font-medium">
                {getHospitalTypeLabel(hospital.hospital_type)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Owner Name
              </span>
              <span className="text-sm text-gray-900 dark:text-white font-medium">
                {hospital.owner_name || "Not provided"}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                License Number
              </span>
              <span className="text-sm text-gray-900 dark:text-white font-medium">
                {hospital.license_number || "Not provided"}
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
                  {hospital.email || "Not provided"}
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
                  {hospital.phone_number || "Not provided"}
                </p>
              </div>
            </div>
            {hospital.contact_person && (
              <div className="flex items-center space-x-3 py-2">
                <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Contact Person
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {hospital.contact_person}
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
                {hospital.address || "Not provided"}
              </p>
            </div>
            {(hospital.latitude || hospital.longitude) && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Latitude
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {hospital.latitude}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Longitude
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {hospital.longitude}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Capacity & Services */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Bed className="w-5 h-5 text-gray-700 dark:text-white" />
            </div>
            <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
              Capacity & Services
            </h5>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Beds
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {hospital.bed_count || 0}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  ICU Beds
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {hospital.icu_beds || 0}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {hospital.emergency_services && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">
                  <Ambulance size={12} className="mr-1" />
                  Emergency
                </span>
              )}
              {hospital.ambulance_services && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-100 dark:bg-[#003358] text-[#004F7C] dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  <Ambulance size={12} className="mr-1" />
                  Ambulance
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSpecialtiesContent = () => (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <HeartPulse className="w-5 h-5 text-gray-700 dark:text-white" />
          </div>
          <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
            Medical Specialties & Facilities
          </h5>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Specialties */}
          <div>
            <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              Medical Specialties ({parsedSpecialties.length})
            </h6>
            <div className="space-y-2">
              {parsedSpecialties.map((specialty, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <Heart className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-gray-900 dark:text-white">{specialty}</span>
                </div>
              ))}
              {parsedSpecialties.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">No specialties listed</p>
              )}
            </div>
          </div>

          {/* Facilities */}
          <div>
            <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              Facilities ({parsedFacilities.length})
            </h6>
            <div className="space-y-2">
              {parsedFacilities.map((facility, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-900 dark:text-white">{facility}</span>
                </div>
              ))}
              {parsedFacilities.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">No facilities listed</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTimingContent = () => (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <Clock className="w-5 h-5 text-gray-700 dark:text-white" />
          </div>
          <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
            Operating Hours
          </h5>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Regular Timing */}
          <div>
            <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              Regular Hours
            </h6>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">Open:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{parsedOpeningHours.open}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">Close:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{parsedOpeningHours.close}</span>
              </div>
            </div>
          </div>

          {/* Emergency Timing */}
          {hospital.emergency_services && (
            <div>
              <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                Emergency Department
              </h6>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <span className="text-sm text-red-600 dark:text-red-400">Open:</span>
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">{parsedEmergencyTiming.open}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <span className="text-sm text-red-600 dark:text-red-400">Close:</span>
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">{parsedEmergencyTiming.close}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {hospital.general_turnaround && (
          <div className="mt-6 p-4 bg-teal-50 dark:bg-[#003358]/20 rounded-lg border border-teal-200 dark:border-teal-800">
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-[#0067A1] dark:text-[#0080C6]" />
              <div>
                <p className="text-sm font-medium text-[#004F7C] dark:text-teal-300">
                  Emergency Response Time
                </p>
                <p className="text-sm text-[#004F7C] dark:text-[#0080C6]">
                  {hospital.general_turnaround}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderDocumentsContent = () => {
    const documents = [
      { label: "PAN Card", value: hospital.pan_card_url, icon: CreditCard },
      { label: "Aadhaar Card", value: hospital.aadhaar_card_url, icon: BadgeCheck },
      { label: "Hospital License", value: hospital.hospital_license_url, icon: FileCheck },
      { label: "GST Certificate", value: hospital.gst_certificate_url, icon: Receipt },
      { label: "Owner Photo", value: hospital.owner_photo_url, icon: User },
      { label: "Signature", value: hospital.signature_url, icon: QrCode },
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
                    className={`p-2 rounded-lg ${
                      doc.value
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
                      className={`text-xs ${
                        doc.value
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-6 pb-0 border-b rounded-t-2xl border-gray-200 dark:border-gray-700 bg-white dark:bg-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl">
                <Hospital className="w-8 h-8 text-gray-700 dark:text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Hospital Details
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Complete hospital information
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
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 ${
                activeTab === "details"
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
              onClick={() => setActiveTab("specialties")}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 ${
                activeTab === "specialties"
                  ? "bg-black text-white border border-black"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <div className="flex items-center space-x-2">
                <HeartPulse size={16} />
                <span>Specialties</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("timing")}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 ${
                activeTab === "timing"
                  ? "bg-black text-white border border-black"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Clock size={16} />
                <span>Timing</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("documents")}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 ${
                activeTab === "documents"
                  ? "bg-black text-white border border-black"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <div className="flex items-center space-x-2">
                <FileText size={16} />
                <span>Documents</span>
              </div>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[70vh]">
          {/* Profile Section */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-start space-x-6">
              <div className="flex-shrink-0">
                {hospital.owner_photo_url ? (
                  <img
                    className="h-24 w-24 rounded-full object-cover shadow-xl border-4 border-gray-300 dark:border-gray-700"
                    src={hospital.owner_photo_url}
                    alt="Owner"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 dark:from-gray-900 dark:to-gray-900 flex items-center justify-center text-white font-bold text-2xl shadow-xl border-4 border-gray-300 dark:border-gray-700">
                    {hospital.hospital_name?.charAt(0) || "H"}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {hospital.hospital_name || "Unknown Hospital"}
                </h4>
                <p className="text-lg text-gray-700 dark:text-gray-300 font-semibold mb-3">
                  {hospital.owner_name || "Unknown Owner"}
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                    <BadgeCheck size={14} className="mr-1" />
                    License: {hospital.license_number || "N/A"}
                  </span>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      hospital.onboarding_status || "pending"
                    )}`}
                  >
                    {hospital.onboarding_status ? hospital.onboarding_status.charAt(0).toUpperCase() + hospital.onboarding_status.slice(1) : "Pending"}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-teal-100 dark:bg-[#003358] text-[#004F7C] dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                    <Building size={14} className="mr-1" />
                    {getHospitalTypeLabel(hospital.hospital_type)}
                  </span>
                  {hospital.emergency_services && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">
                      <Ambulance size={14} className="mr-1" />
                      Emergency
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "details" && renderDetailsContent()}
            {activeTab === "specialties" && renderSpecialtiesContent()}
            {activeTab === "timing" && renderTimingContent()}
            {activeTab === "documents" && renderDocumentsContent()}
          </div>
        </div>

        <div className="p-6 border-t rounded-b-2xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500 dark:text-gray-500">
              Created:{" "}
              {hospital.created_at
                ? new Date(hospital.created_at).toLocaleDateString()
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
      </div>
    </div>
  );
}

export default function HospitalsPage() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viewHospital, setViewHospital] = useState(null);
  const [editHospital, setEditHospital] = useState(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Fetch hospitals
  const fetchHospitals = async (page = 1, search = searchTerm, status = statusFilter, type = typeFilter) => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.itemsPerPage.toString(),
        ...(search && { search }),
        ...(status !== "all" && { status }),
        ...(type !== "all" && { type }),
      });

      const response = await fetch(`/api/hospital/web?${params}`);
      const result = await response.json();

      if (result.success) {
        setHospitals(result.data.hospitals || []);
        setPagination({
          currentPage: result.data.pagination?.page || 1,
          totalPages: result.data.pagination?.totalPages || 1,
          totalItems: result.data.pagination?.total || 0,
          itemsPerPage: result.data.pagination?.limit || 10,
          hasNextPage: (result.data.pagination?.page || 1) < (result.data.pagination?.totalPages || 1),
          hasPrevPage: (result.data.pagination?.page || 1) > 1,
        });
      } else {
        toast.error(result.message || "Failed to fetch hospitals");
      }
    } catch (error) {
      console.error("Error fetching hospitals:", error);
      toast.error("Failed to load hospitals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals(pagination.currentPage, searchTerm, statusFilter, typeFilter);
  }, [pagination.currentPage, searchTerm, statusFilter, typeFilter, pagination.itemsPerPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
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
    if (selectedIds.length === 0) return toast.error("No hospitals selected!");

    try {
      const res = await fetch("/api/hospital/web/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      const result = await res.json();
      if (result.success) {
        toast.success("Hospitals deleted successfully!");
        setSelectedIds([]);
        fetchHospitals();
      } else {
        toast.error(result.message || "Failed to delete hospitals");
      }
    } catch (err) {
      toast.error("Error: " + err.message);
    }
  };

  const handleStatusChange = async (hospitalId, newStatus) => {
    try {
      const res = await fetch("/api/hospital/web/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: hospitalId, onboarding_status: newStatus }),
      });

      const result = await res.json();
      if (result.success) {
        toast.success("Status updated successfully!");
        fetchHospitals();
      } else {
        toast.error(result.message || "Failed to update status");
      }
    } catch (err) {
      toast.error("Error: " + err.message);
    }
  };

  const handleSaveHospital = async (formData) => {
    const url = editHospital ? "/api/hospital/web/update" : "/api/hospital/web";
    const method = editHospital ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      body: formData,
    });

    const result = await res.json();
    if (!result.success) throw new Error(result.message);

    fetchHospitals();
    setEditHospital(null);
    setOnboardingOpen(false);
  };

  const getInitials = (name) => {
    return (
      name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "H"
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

  const getHospitalTypeLabel = (type) => {
    const types = {
      general: "General",
      specialty: "Specialty",
      multi_specialty: "Multi-Specialty",
      super_specialty: "Super-Specialty",
      clinic: "Clinic",
      diagnostic_center: "Diagnostic"
    };
    return types[type] || type;
  };

  const hospitalTypes = [
    { value: "all", label: "All Types" },
    { value: "general", label: "General Hospital" },
    { value: "specialty", label: "Specialty Hospital" },
    { value: "multi_specialty", label: "Multi-Specialty" },
    { value: "super_specialty", label: "Super-Specialty" },
    { value: "clinic", label: "Clinic" },
    { value: "diagnostic_center", label: "Diagnostic Center" },
  ];

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
                      Hospital Management
                    </motion.h4>
                    <motion.p
                      className="text-gray-600 dark:text-gray-400 mt-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of {pagination.totalItems} hospitals
                    </motion.p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setEditHospital(null);
                      setOnboardingOpen(true);
                    }}
                    className="flex items-center px-4 py-2 text-sm bg-black text-white font-semibold rounded-lg transition-all duration-300 mt-4 sm:mt-0 cursor-pointer shadow-sm border border-gray-300 dark:border-gray-700 hover:bg-gray-800"
                  >
                    <Plus size={20} className="mr-2" />
                    Onboard Hospital
                  </motion.button>
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
                    label: "Total Hospitals",
                    value: hospitals.length,
                    icon: Hospital,
                    color:
                      "from-gray-500 to-gray-600 dark:from-gray-800 dark:to-gray-900 text-gray-50 text-center",
                  },
                  {
                    label: "Approved Hospitals",
                    value: hospitals.filter((h) => h.onboarding_status === "approved").length,
                    icon: CheckCircle,
                    color:
                      "from-green-500 to-green-600 dark:from-green-800 dark:to-green-900 text-gray-50 text-center",
                  },
                  {
                    label: "Pending Hospitals",
                    value: hospitals.filter((h) => h.onboarding_status === "pending").length,
                    icon: Clock,
                    color:
                      "from-yellow-500 to-yellow-600 dark:from-yellow-800 dark:to-yellow-900 text-gray-50 text-center",
                  },
                  {
                    label: "Emergency Services",
                    value: hospitals.filter((h) => h.emergency_services).length,
                    icon: Ambulance,
                    color:
                      "from-red-500 to-red-600 dark:from-red-800 dark:to-red-900 text-gray-50 text-center",
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
                      placeholder="Search hospitals by name, owner, or email..."
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

                    <motion.select
                      whileFocus={{ scale: 1.05 }}
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300 cursor-pointer"
                    >
                      {hospitalTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </motion.select>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => fetchHospitals(1)}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300 cursor-pointer"
                    >
                      <Filter size={20} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => fetchHospitals(pagination.currentPage)}
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
                          {selectedIds.length} hospital(s) selected
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

              {/* Hospitals Table */}
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
                ) : hospitals.length === 0 ? (
                  <motion.div
                    className="text-center py-12"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Hospital className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No hospitals found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-500 mb-4">
                      {searchTerm || statusFilter !== "all" || typeFilter !== "all"
                        ? "Try adjusting your search criteria"
                        : "Get started by onboarding your first hospital"}
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setEditHospital(null);
                        setOnboardingOpen(true);
                      }}
                      className="inline-flex items-center px-4 py-2 bg-black text-white font-medium rounded-lg transition-all duration-300 cursor-pointer border border-gray-300 dark:border-gray-700 hover:bg-gray-800"
                    >
                      <Plus size={20} className="mr-2" />
                      Onboard New Hospital
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
                                    ? hospitals.map((h) => h.id)
                                    : []
                                )
                              }
                              checked={
                                hospitals.length > 0 &&
                                selectedIds.length === hospitals.length
                              }
                              className="rounded border-gray-300 dark:border-gray-600 text-black focus:ring-black bg-white dark:bg-gray-700 cursor-pointer"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Hospital
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Owner
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Contact
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Capacity
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
                        {hospitals.map((hospital, index) => {
                          const parsedSpecialties = Array.isArray(hospital.specialties) 
                            ? hospital.specialties 
                            : (typeof hospital.specialties === 'string' ? JSON.parse(hospital.specialties) : []);
                          
                          return (
                          <motion.tr
                            key={hospital.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all duration-300"
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(hospital.id)}
                                onChange={() => toggleSelect(hospital.id)}
                                className="rounded border-gray-300 dark:border-gray-600 text-black focus:ring-black bg-white dark:bg-gray-700 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  {hospital.owner_photo_url ? (
                                    <motion.img
                                      whileHover={{ scale: 1.1 }}
                                      className="h-10 w-10 rounded-full object-cover shadow-sm"
                                      src={hospital.owner_photo_url}
                                      alt=""
                                    />
                                  ) : (
                                    <motion.div
                                      whileHover={{ scale: 1.1 }}
                                      className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 dark:from-gray-700 dark:to-gray-900 flex items-center justify-center text-white font-medium text-sm shadow-sm"
                                    >
                                      {getInitials(hospital.owner_name)}
                                    </motion.div>
                                  )}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {hospital.hospital_name || "Unknown Hospital"}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {getHospitalTypeLabel(hospital.hospital_type)} • {hospital.license_number || "N/A"}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-900 dark:text-white">
                                {hospital.owner_name || "Unknown"}
                              </div>
                              {hospital.contact_person && (
                                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                  Contact: {hospital.contact_person}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-900 dark:text-white">
                                {hospital.email || "No email"}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1">
                                <Phone size={14} className="mr-1" />
                                {hospital.phone_number || "No phone"}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-900 dark:text-white">
                                <div className="flex items-center space-x-4">
                                  <div className="flex items-center space-x-1">
                                    <Bed size={14} className="text-gray-500" />
                                    <span>{hospital.bed_count || 0} Beds</span>
                                  </div>
                                  {hospital.icu_beds > 0 && (
                                    <div className="flex items-center space-x-1">
                                      <Activity size={14} className="text-red-500" />
                                      <span>{hospital.icu_beds} ICU</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center flex-wrap gap-1">
                                {hospital.emergency_services && (
                                  <span className="inline-flex items-center text-red-600 dark:text-red-400">
                                    <Ambulance size={12} className="mr-1" />
                                    Emergency
                                  </span>
                                )}
                                {hospital.ambulance_services && (
                                  <span className="inline-flex items-center text-[#0067A1] dark:text-[#0080C6]">
                                    <Ambulance size={12} className="mr-1" />
                                    Ambulance
                                  </span>
                                )}
                                {parsedSpecialties.length > 0 && (
                                  <span className="text-gray-500">
                                    {parsedSpecialties.length} specialties
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-2">
                                <span
                                  className={`inline-flex text-center items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                    hospital.onboarding_status || "pending"
                                  )}`}
                                >
                                  {hospital.onboarding_status ? hospital.onboarding_status.charAt(0).toUpperCase() + hospital.onboarding_status.slice(1) : "Pending"}
                                </span>
                                <select
                                  value={hospital.onboarding_status || "pending"}
                                  onChange={(e) =>
                                    handleStatusChange(
                                      hospital.id,
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
                                    setViewHospital(hospital);
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
                                    setEditHospital(hospital);
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
                                  onClick={() => toggleSelect(hospital.id)}
                                  className="p-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-all duration-300 cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 size={18} />
                                </motion.button>
                              </div>
                            </td>
                          </motion.tr>
                        )})}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
              {hospitals.length > 0 && (
                <motion.div
                  className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700/50 p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of {pagination.totalItems} hospitals
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
                            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-300 cursor-pointer ${
                              pageNum === pagination.currentPage
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
          setEditHospital(null);
        }}
        hospital={editHospital}
        onSave={handleSaveHospital}
      />

      {/* Enhanced Hospital Details Modal */}
      <HospitalDetailsModal
        hospital={viewHospital}
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setViewHospital(null);
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
                  hospital(s)? This action cannot be undone.
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