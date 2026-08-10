"use client";

import { useState, useEffect } from "react";
import {
 User,
 MapPin,
 Clock,
 Save,
 Phone,
 Building2,
 Loader2,
 Mail,
 Smartphone,
 MessageSquare,
 Map,
 Calendar,
 Check,
 AlertCircle,
 Camera,
 Upload,
 Shield,
 Globe,
 Store,
 Edit2,
 X,
 ChevronDown,
 ChevronUp,
 Sun,
 Moon,
 Truck,
 ShieldCheck,
 FileText,
 CreditCard,
 FileSignature,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { getLoggedInUser } from "@/lib/authHelpers";
import Image from "next/image";

export default function ChemistProfilePage() {
 const [chemist, setChemist] = useState(null);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [profile, setProfile] = useState(null);
 const [activeSave, setActiveSave] = useState(null);
 const [uploadingImage, setUploadingImage] = useState(false);
 const [expandedSection, setExpandedSection] = useState(["basic", "timings", "location"]);
 const [documents, setDocuments] = useState({});
 const [uploadingDoc, setUploadingDoc] = useState(false);

 // Default store timings
 const defaultTimings = {
 Monday: { open: "09:00", close: "21:00", closed: false },
 Tuesday: { open: "09:00", close: "21:00", closed: false },
 Wednesday: { open: "09:00", close: "21:00", closed: false },
 Thursday: { open: "09:00", close: "21:00", closed: false },
 Friday: { open: "09:00", close: "21:00", closed: false },
 Saturday: { open: "10:00", close: "20:00", closed: false },
 Sunday: { open: "10:00", close: "18:00", closed: true },
 };

 // Document types based on database schema
 const documentTypes = [
 { key: "drug_license", label: "Drug License", icon: <FileText className="w-4 h-4" /> },
 { key: "pharmacist_certificate", label: "Pharmacist Certificate", icon: <FileText className="w-4 h-4" /> },
 { key: "pan_aadhaar", label: "PAN/Aadhaar", icon: <FileText className="w-4 h-4" /> },
 { key: "gstin_certificate", label: "GSTIN Certificate", icon: <FileText className="w-4 h-4" /> },
 { key: "store_photo", label: "Store Photo", icon: <Camera className="w-4 h-4" /> },
 { key: "consent_form", label: "Consent / Declaration Form", icon: <FileSignature className="w-4 h-4" /> },
 { key: "digital_signature", label: "Digital Signature", icon: <FileSignature className="w-4 h-4" /> },
 { key: "payment_qr_url", label: "Payment QR Code", icon: <Camera className="w-4 h-4" /> },
 ];

 // Initialize chemist
 useEffect(() => {
 const user = getLoggedInUser("chemist");
 if (user) {
 setChemist(user);
 }
 }, []);

 // Fetch profile when chemist is available
 useEffect(() => {
 if (chemist?.id) {
 fetchProfile();
 }
 }, [chemist]);

 const fetchProfile = async () => {
 try {
 setLoading(true);
 const res = await fetch("/api/chemists/profile/get", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ chemist_id: chemist.id }),
 });

 const result = await res.json();
 if (result.success) {
 const profileData = {
 ...result.data,
 mobile: result.data.mobile || result.data.user?.phone_number || "",
 store_timings: result.data.store_timings || defaultTimings,
 };
 setProfile(profileData);

 // Extract documents from profile data
 const docs = {};
 documentTypes.forEach(doc => {
 if (profileData[doc.key]) {
 docs[doc.key] = profileData[doc.key];
 }
 });
 setDocuments(docs);

 toast.success("Profile loaded successfully", {
 duration: 3000,
 });
 } else {
 toast.error(result.message || "Failed to load profile");
 // Initialize with empty profile if fetch fails
 setProfile({
 id: chemist.id,
 owner_name: "",
 pharmacy_name: "",
 pharmacist_name: "",
 email: chemist.email || "",
 mobile: "",
 whatsapp: "",
 address: "",
 latitude: null,
 longitude: null,
 store_timings: defaultTimings,
 drug_license: "",
 pharmacist_certificate: "",
 pan_aadhaar: "",
 gstin_certificate: "",
 store_photo: "",
 consent_form: "",
 declaration_form: "",
 gstin: "",
 consent_terms: false,
 digital_signature: "",
 payment_qr_url: "",
 registration_no: "",
 description: "",
 upi_id: "",
 created_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 });
 setDocuments({});
 }
 } catch (error) {
 console.error("Fetch profile error:", error);
 toast.error("Failed to load profile. Please try again.");
 } finally {
 setLoading(false);
 }
 };

 const handleSave = async (saveFunction, section) => {
 setActiveSave(section);
 setSaving(true);
 await saveFunction();
 setSaving(false);
 setTimeout(() => setActiveSave(null), 2000);
 };

 // Basic Information Save - Updated to match database schema
 const saveBasicInfo = async () => {
 try {
 const res = await fetch("/api/chemists/profile/update-basic", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 chemist_id: chemist.id,
 owner_name: profile?.owner_name,
 pharmacy_name: profile?.pharmacy_name,
 pharmacist_name: profile?.pharmacist_name,
 email: profile?.email,
 mobile: profile?.mobile,
 whatsapp: profile?.whatsapp,
 address: profile?.address,
 drug_license: profile?.drug_license,
 pharmacist_certificate: profile?.pharmacist_certificate,
 pan_aadhaar: profile?.pan_aadhaar,
 gstin_certificate: profile?.gstin_certificate,
 store_photo: profile?.store_photo,
 consent_form: profile?.consent_form,
 declaration_form: profile?.declaration_form,
 gstin: profile?.gstin,
 consent_terms: profile?.consent_terms,
 digital_signature: profile?.digital_signature,
 registration_no: profile?.registration_no,
 description: profile?.description,
 upi_id: profile?.upi_id,
 }),
 });

 const result = await res.json();
 if (result.success) {
 toast.success("Basic information updated successfully");
 } else {
 toast.error(result.message || "Failed to update");
 }
 } catch (error) {
 toast.error("Network error. Please try again.");
 }
 };

 // Store Timings Save
 const saveStoreTimings = async () => {
 try {
 const res = await fetch("/api/chemists/profile/update-timings", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 chemist_id: chemist.id,
 store_timings: profile?.store_timings,
 }),
 });

 const result = await res.json();
 if (result.success) {
 toast.success("Store timings updated successfully");
 } else {
 toast.error(result.message || "Failed to update timings");
 }
 } catch (error) {
 toast.error("Network error. Please try again.");
 }
 };

 // Document Upload Handler
 const handleDocumentUpload = async (file, docType) => {
 if (!file) return;

 const validTypes = [
 "image/jpeg", "image/png", "image/webp",
 "application/pdf",
 "application/msword",
 "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
 ];

 if (!validTypes.includes(file.type)) {
 toast.error("Please upload a valid file (PDF, DOC, DOCX, JPEG, PNG, WebP)");
 return;
 }

 setUploadingDoc(true);
 const formData = new FormData();
 formData.append("document", file);
 formData.append("chemist_id", chemist.id);
 formData.append("doc_type", docType);

 try {
 const res = await fetch("/api/chemists/profile/upload-document", {
 method: "POST",
 body: formData,
 });

 const result = await res.json();
 if (result.success) {
 setProfile(prev => ({
 ...prev,
 [docType]: result.url,
 }));
 setDocuments(prev => ({
 ...prev,
 [docType]: result.url,
 }));
 toast.success(`${docType.replace(/_/g, ' ')} uploaded successfully`);
 } else {
 toast.error(result.message || "Failed to upload document");
 }
 } catch (error) {
 toast.error("Network error. Please try again.");
 } finally {
 setUploadingDoc(false);
 }
 };

 // Toggle section expansion
 const toggleSection = (section) => {
 setExpandedSection((prev) =>
 prev.includes(section)
 ? prev.filter((s) => s !== section)
 : [...prev, section]
 );
 };

 const handleViewAllDocuments = () => {
    setExpandedSection((prev) =>
      prev.includes("documents") ? prev : [...prev, "documents"]
    );
    setTimeout(() => {
      const el = document.getElementById("documents-section");
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

 // Update store timing for a specific day
 const updateStoreTiming = (day, field, value) => {
 setProfile((prev) => {
 if (!prev) return prev;
 return {
 ...prev,
 store_timings: {
 ...prev.store_timings,
 [day]: {
 ...prev.store_timings[day],
 [field]: value,
 },
 },
 };
 });
 };

 // Render input field component
 const renderInputField = (field, label, icon, type = "text", required = false) => {
 return (
 <div className="space-y-2">
 <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
 {icon}
 <span>
 {label}
 {required && <span className="text-red-500 ml-1">*</span>}
 </span>
 </label>
 <input
 type={type}
 className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#0067A1] focus:border-[#0067A1] dark:focus:ring-[#0067A1] dark:focus:border-[#0067A1] transition-all duration-200 outline-none hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
 value={profile?.[field] || ""}
 onChange={(e) =>
 setProfile((prev) => (prev ? { ...prev, [field]: e.target.value } : null))
 }
 placeholder={`Enter ${label.toLowerCase()}`}
 required={required}
 />
 </div>
 );
 };

 // Render document upload field
 const renderDocumentField = (docType, label, icon) => {
 const fileUrl = documents[docType] || profile?.[docType];

 return (
 <div className="space-y-2">
 <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
 {icon}
 <span>{label}</span>
 </label>
 <div className="flex items-center gap-3">
 {fileUrl ? (
 <div className="flex-1 flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
 <div className="flex items-center gap-2">
 <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />
 <a
 href={fileUrl}
 target="_blank"
 rel="noopener noreferrer"
 className="text-[#0067A1] dark:text-[#0080C6] hover:text-[#004F7C] dark:hover:text-teal-300 truncate max-w-xs"
 >
 {fileUrl.split('/').pop()}
 </a>
 </div>
 <button
 onClick={() => {
 setProfile(prev => ({ ...prev, [docType]: "" }));
 setDocuments(prev => ({ ...prev, [docType]: null }));
 }}
 className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
 >
 <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
 </button>
 </div>
 ) : (
 <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
 <p className="text-sm text-gray-500 dark:text-gray-400">No file uploaded</p>
 </div>
 )}
 <label>
 <input
 type="file"
 accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
 className="hidden"
 onChange={(e) => {
 const file = e.target.files?.[0];
 if (file) handleDocumentUpload(file, docType);
 }}
 disabled={uploadingDoc}
 />
 <div className="px-4 py-3 bg-[#0067A1] dark:bg-[#004F7C] text-white rounded-lg hover:bg-[#004F7C] dark:hover:bg-[#004F7C] transition-all cursor-pointer whitespace-nowrap">
 {uploadingDoc ? (
 <Loader2 className="w-4 h-4 animate-spin" />
 ) : (
 "Upload"
 )}
 </div>
 </label>
 </div>
 </div>
 );
 };

 if (loading) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-[#0067A1]/5 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
 <div className="text-center">
 <div className="relative">
 <Loader2 className="w-16 h-16 animate-spin text-[#0067A1] dark:text-teal-500 mx-auto mb-4" />
 <Building2 className="w-8 h-8 text-[#0080C6] dark:text-[#0067A1] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
 </div>
 <p className="text-gray-600 dark:text-gray-300 font-medium mt-4">Loading your profile...</p>
 <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Please wait a moment</p>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">

 <div className="mx-auto">
 {/* Header with Stats */}
 <div className="mb-8">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
 <div>
 <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-2">
 Pharmacy Profile
 </h1>
 <p className="text-gray-600 dark:text-gray-400">
 Manage your pharmacy information, timings, and location
 </p>
 </div>
 {profile?.consent_terms && (
 <div className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 rounded-full">
 <ShieldCheck className="w-5 h-5" />
 <span className="font-medium">Verified</span>
 </div>
 )}
 </div>

 {/* Stats Cards */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-[#0067A1]/10 dark:bg-[#003358]/30 rounded-lg">
 <Store className="w-5 h-5 text-[#0067A1] dark:text-[#0080C6]" />
 </div>
 <div>
 <p className="text-sm text-gray-600 dark:text-gray-400">Pharmacy Name</p>
 <p className="font-semibold text-gray-800 dark:text-gray-200 truncate" style={{ whiteSpace: "break-spaces" }}>
 {profile?.pharmacy_name || "Not set"}
 </p>
 </div>
 </div>
 </div>

 <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
 <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
 </div>
 <div>
 <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
 <p className="font-semibold text-gray-800 dark:text-gray-200">
 {profile?.store_timings ? "Open Today" : "Closed"}
 </p>
 </div>
 </div>
 </div>

 <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
 <User className="w-5 h-5 text-amber-600 dark:text-amber-400" />
 </div>
 <div>
 <p className="text-sm text-gray-600 dark:text-gray-400">Owner</p>
 <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">
 {profile?.owner_name || "Not set"}
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Left Column - Profile Image and Quick Info */}
 <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-6 lg:self-start">
 {/* Profile Image Card */}
 <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
 {/* Profile Image */}
 <div className="flex flex-col items-center mb-6">
 <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-gray-800 shadow-lg mb-4">
 {profile?.store_photo ? (
 <Image
 src={profile.store_photo}
 alt="Store Photo"
 fill
 className="object-cover"
 priority
 />
 ) : (
 <div className="w-full h-full bg-[#0067A1]/10 dark:bg-gray-700 flex items-center justify-center">
 <Building2 className="w-16 h-16 text-[#0080C6] dark:text-gray-400" />
 </div>
 )}
 </div>
 <h3 className="text-xl font-bold text-gray-800 dark:text-white">
 {profile?.pharmacy_name || "Your Pharmacy"}
 </h3>
 <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
 {profile?.owner_name || "Owner Name"}
 </p>
 <div className="mt-2 flex items-center gap-1 text-sm">
 <span
 className={`px-2 py-1 rounded-full ${profile?.consent_terms
 ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
 : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
 }`}
 >
 {profile?.consent_terms ? "Verified" : "Pending Verification"}
 </span>
 </div>
 </div>

 {/* Quick Contact Info */}
 <div className="space-y-4">
 <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">
 Contact Information
 </h4>
 <div className="space-y-3">
 <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
 <Mail className="w-5 h-5 text-gray-500 dark:text-gray-400" />
 <div className="flex-1">
 <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
 <p className="font-medium text-gray-800 dark:text-gray-300 truncate">
 {profile?.email || "Not set"}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
 <Phone className="w-5 h-5 text-gray-500 dark:text-gray-400" />
 <div className="flex-1">
 <p className="text-sm text-gray-600 dark:text-gray-400">Mobile</p>
 <p className="font-medium text-gray-800 dark:text-gray-300">
 {profile?.mobile || "Not set"}
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Documents Quick View */}
 <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
 <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">
 Documents Status
 </h4>
 <div className="space-y-3">
 {documentTypes.slice(0, 5).map((doc, index) => (
 <div
 key={index}
 className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded"
 >
 <div className="flex items-center gap-2">
 <div className={`w-2 h-2 rounded-full ${documents[doc.key] ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}></div>
 <span className="text-sm text-gray-700 dark:text-gray-300">{doc.label}</span>
 </div>
 <span className={`text-xs px-2 py-1 rounded-full ${documents[doc.key] ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}>
 {documents[doc.key] ? "Uploaded" : "Pending"}
 </span>
 </div>
 ))}
 {documentTypes.length > 5 && (
 <button
 onClick={handleViewAllDocuments}
 className="w-full text-center text-sm text-[#0067A1] dark:text-[#0080C6] hover:text-[#004F7C] dark:hover:text-teal-300 pt-2"
 >
 View all {documentTypes.length} documents
 </button>
 )}
 </div>
 </div>
 </div>

 {/* Right Column - Main Forms */}
 <div className="lg:col-span-2 space-y-6">
 {/* Basic Information Section */}
 <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
 <div
 className="p-6 border-b border-gray-100 dark:border-gray-700 bg-[#0067A1]/5 dark:bg-gray-700 cursor-pointer"
 onClick={() => toggleSection("basic")}
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="p-3 bg-[#0067A1]/10 dark:bg-[#003358]/30 rounded-xl">
 <Building2 className="w-6 h-6 text-[#0067A1] dark:text-[#0080C6]" />
 </div>
 <div>
 <h2 className="text-xl font-bold text-gray-800 dark:text-white">
 Pharmacy Information
 </h2>
 <p className="text-gray-600 dark:text-gray-400 text-sm">
 Update your pharmacy details
 </p>
 </div>
 </div>
 {expandedSection.includes("basic") ? (
 <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
 ) : (
 <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
 )}
 </div>
 </div>

 {expandedSection.includes("basic") && (
 <div className="p-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {renderInputField(
 "owner_name",
 "Owner Name",
 <User className="w-4 h-4" />,
 "text",
 true
 )}
 {renderInputField(
 "pharmacy_name",
 "Pharmacy Name",
 <Building2 className="w-4 h-4" />,
 "text",
 true
 )}
 {renderInputField(
 "pharmacist_name",
 "Pharmacist Name",
 <User className="w-4 h-4" />,
 "text"
 )}
 {renderInputField(
 "email",
 "Email Address",
 <Mail className="w-4 h-4" />,
 "email",
 true
 )}
 {renderInputField(
 "mobile",
 "Mobile Number",
 <Phone className="w-4 h-4" />,
 "tel",
 true
 )}
 {renderInputField(
 "drug_license",
 "Drug License Number",
 <Shield className="w-4 h-4" />,
 "text",
 true
 )}
 {renderInputField(
 "gstin",
 "GSTIN",
 <Shield className="w-4 h-4" />,
 "text"
 )}
 {renderInputField(
 "registration_no",
 "Registration Number",
 <Shield className="w-4 h-4" />,
 "text"
 )}
 {renderInputField(
 "upi_id",
 "UPI ID (VPA)",
 <CreditCard className="w-4 h-4" />,
 "text"
 )}
 </div>

 {/* Address */}
 <div className="mt-6 space-y-2">
 <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
 <MapPin className="w-4 h-4" />
 <span>
 Pharmacy Address <span className="text-red-500">*</span>
 </span>
 </label>
 <textarea
 className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#0067A1] focus:border-[#0067A1] dark:focus:ring-[#0067A1] dark:focus:border-[#0067A1] transition-all duration-200 outline-none hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 min-h-[120px] resize-none"
 value={profile?.address || ""}
 onChange={(e) =>
 setProfile((prev) =>
 prev ? { ...prev, address: e.target.value } : null
 )
 }
 placeholder="Enter complete pharmacy address"
 required
 />
 </div>

 {/* Description */}
 <div className="mt-6 space-y-2">
 <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
 Pharmacy Description
 </label>
 <textarea
 className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#0067A1] focus:border-[#0067A1] dark:focus:ring-[#0067A1] dark:focus:border-[#0067A1] transition-all duration-200 outline-none hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 min-h-[100px] resize-none"
 value={profile?.description || ""}
 onChange={(e) =>
 setProfile((prev) =>
 prev ? { ...prev, description: e.target.value } : null
 )
 }
 placeholder="Describe your pharmacy services..."
 />
 </div>

 {/* Consent Terms */}
 <div className="mt-6 flex items-start gap-3">
 <input
 type="checkbox"
 checked={profile?.consent_terms || false}
 onChange={(e) =>
 setProfile((prev) =>
 prev ? { ...prev, consent_terms: e.target.checked } : null
 )
 }
 className="w-5 h-5 mt-1 rounded text-[#0067A1] dark:text-teal-500 focus:ring-[#0067A1] dark:focus:ring-[#0067A1] bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
 />
 <div>
 <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
 I agree to all terms and conditions
 </label>
 <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
 By checking this box, you confirm that all information provided is accurate and you agree to our terms of service.
 </p>
 </div>
 </div>

 <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
 <button
 onClick={() => handleSave(saveBasicInfo, "basic")}
 disabled={saving && activeSave === "basic"}
 className={`px-8 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-300 ${activeSave === "basic"
 ? "bg-green-500 text-white"
 : "bg-[#0067A1] text-white hover:bg-[#004F7C] dark:bg-[#004F7C] dark:hover:bg-[#004F7C] shadow-lg hover:shadow-xl"
 }`}
 >
 {activeSave === "basic" ? (
 <>
 <Check className="w-5 h-5" />
 Information Saved!
 </>
 ) : saving && activeSave === "basic" ? (
 <>
 <Loader2 className="w-5 h-5 animate-spin" />
 Saving Changes...
 </>
 ) : (
 <>
 <Save className="w-5 h-5" />
 Save Information
 </>
 )}
 </button>
 </div>
 </div>
 )}
 </div>

 {/* Documents Section */}
 <div id="documents-section" className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
 <div
 className="p-6 border-b border-gray-100 dark:border-gray-700 bg-purple-50 dark:bg-gray-700 cursor-pointer"
 onClick={() => toggleSection("documents")}
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
 <FileText className="w-6 h-6 text-purple-600 dark:purple-400" />
 </div>
 <div>
 <h2 className="text-xl font-bold text-gray-800 dark:text-white">
 Required Documents
 </h2>
 <p className="text-gray-600 dark:text-gray-400 text-sm">
 Upload all required documents
 </p>
 </div>
 </div>
 {expandedSection.includes("documents") ? (
 <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
 ) : (
 <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
 )}
 </div>
 </div>

 {expandedSection.includes("documents") && (
 <div className="p-6">
 <div className="mb-6">
 <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
 <div className="flex items-start gap-3">
 <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
 <div>
 <p className="font-medium text-amber-800 dark:text-amber-300 mb-1">
 Document Requirements
 </p>
 <p className="text-sm text-amber-700 dark:text-amber-400">
 All documents must be clear, readable, and valid. Accepted formats: PDF, DOC, DOCX, JPG, PNG, WebP (Max 10MB).
 </p>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 gap-6">
 {documentTypes.map((doc, index) => (
 <div key={index}>
 {renderDocumentField(doc.key, doc.label, doc.icon)}
 </div>
 ))}
 </div>
 </div>

 <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
 <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
 Note: All document changes are saved automatically when you upload a file.
 </p>
 </div>
 </div>
 )}
 </div>

 {/* Store Timings Section */}
 <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
 <div
 className="p-6 border-b border-gray-100 dark:border-gray-700 bg-green-50 dark:bg-gray-700 cursor-pointer"
 onClick={() => toggleSection("timings")}
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
 <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
 </div>
 <div>
 <h2 className="text-xl font-bold text-gray-800 dark:text-white">
 Store Timings
 </h2>
 <p className="text-gray-600 dark:text-gray-400 text-sm">
 Set your pharmacy operating hours
 </p>
 </div>
 </div>
 {expandedSection.includes("timings") ? (
 <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
 ) : (
 <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
 )}
 </div>
 </div>

 {expandedSection.includes("timings") && (
 <div className="p-6">
 <div className="space-y-4">
 {Object.entries(profile?.store_timings || {}).map(
 ([day, timing]) => (
 <div
 key={day}
 className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl"
 >
 <div className="flex items-center gap-4">
 <input
 type="checkbox"
 checked={!timing.closed}
 onChange={(e) =>
 updateStoreTiming(
 day,
 "closed",
 !e.target.checked
 )
 }
 className="w-5 h-5 rounded text-green-600 dark:text-green-500 focus:ring-green-500 dark:focus:ring-green-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
 />
 <span className="font-medium text-gray-700 dark:text-gray-300 w-24">
 {day}
 </span>
 </div>
 {!timing.closed ? (
 <div className="flex items-center gap-2">
 <div className="flex items-center gap-2">
 <Sun className="w-4 h-4 text-amber-500 dark:text-amber-400" />
 <input
 type="time"
 value={timing.open}
 onChange={(e) =>
 updateStoreTiming(
 day,
 "open",
 e.target.value
 )
 }
 className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:focus:ring-green-500 dark:focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
 />
 </div>
 <span className="text-gray-400 dark:text-gray-500">to</span>
 <div className="flex items-center gap-2">
 <Moon className="w-4 h-4 text-teal-500 dark:text-[#0080C6]" />
 <input
 type="time"
 value={timing.close}
 onChange={(e) =>
 updateStoreTiming(
 day,
 "close",
 e.target.value
 )
 }
 className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:focus:ring-green-500 dark:focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
 />
 </div>
 </div>
 ) : (
 <span className="text-red-500 dark:text-red-400 font-medium">
 Closed
 </span>
 )}
 </div>
 )
 )}
 </div>

 <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
 <button
 onClick={() => handleSave(saveStoreTimings, "timings")}
 disabled={saving && activeSave === "timings"}
 className={`px-8 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-300 ${activeSave === "timings"
 ? "bg-green-500 text-white"
 : "bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:from-green-600 dark:hover:to-emerald-700 shadow-lg hover:shadow-xl"
 }`}
 >
 {activeSave === "timings" ? (
 <>
 <Check className="w-5 h-5" />
 Timings Saved!
 </>
 ) : saving && activeSave === "timings" ? (
 <>
 <Loader2 className="w-5 h-5 animate-spin" />
 Saving Timings...
 </>
 ) : (
 <>
 <Save className="w-5 h-5" />
 Save Timings
 </>
 )}
 </button>
 </div>
 </div>
 )}
 </div>

 {/* Footer Note */}
 <div className="text-center text-gray-500 dark:text-gray-400 text-sm pt-4">
 <p>
 Profile last updated:{" "}
 {profile?.updated_at
 ? new Date(profile.updated_at).toLocaleDateString("en-US", {
 year: "numeric",
 month: "long",
 day: "numeric",
 hour: "2-digit",
 minute: "2-digit",
 })
 : "Never"}
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}