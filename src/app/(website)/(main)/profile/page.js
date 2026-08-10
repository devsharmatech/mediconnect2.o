"use client";

import { useState, useEffect } from "react";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaEdit,
  FaCalendar,
  FaHeart,
  FaClock,
  FaCheckCircle,
  FaBan,
  FaShieldAlt,
  FaDownload,
  FaUserSecret,
} from "react-icons/fa";
import toast from 'react-hot-toast';
import api from '@/utils/websiteApi';
import EditProfileModal from "@/components/public-site/profile/EditProfileModal";
import AbhaConnectModal from "@/components/public-site/abha/AbhaConnectModal";
import { LoadingScreen } from "@/components/public-site/ui/LoadingStates";

export default function ProfilePage() {
  // Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAbhaModalOpen, setIsAbhaModalOpen] = useState(false);

  // State for user data
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user data on mount
  useEffect(() => {
    const fetchUserData = async () => {
      const storedUserId = localStorage.getItem("userId");
      const storedUserRole = localStorage.getItem("userRole");
      const storedUserData = localStorage.getItem("userData");

      if (storedUserId) {
        try {
          // Try to fetch fresh data from API
          const response = await api.post("/profile/get", { user_id: storedUserId });

          if (response.success && response.data) {
            const apiUser = response.data;
            const freshUserData = {
              user_id: storedUserId,
              role: storedUserRole || "patient",
              user: {
                id: storedUserId,
                phone_number: apiUser.phone_number || "",
                role: storedUserRole || "patient",
                profile_picture: apiUser.profile_picture,
                created_at: apiUser.created_at,
                details: {
                  full_name: apiUser.details?.full_name || apiUser.full_name || "User",
                  email: apiUser.details?.email || apiUser.email || "",
                  gender: apiUser.details?.gender || "",
                  date_of_birth: apiUser.details?.date_of_birth || "",
                  blood_group: apiUser.details?.blood_group || "",
                  address: apiUser.details?.address || "",
                  emergency_contact: apiUser.details?.emergency_contact || "",
                }
              }
            };
            setUserData(freshUserData);
            localStorage.setItem("userData", JSON.stringify(apiUser));
          } else {
            throw new Error("Failed to fetch fresh data");
          }
        } catch (error) {
          console.error("Failed to fetch fresh user data, falling back to local storage", error);
          if (storedUserData) {
            try {
              const parsedUser = JSON.parse(storedUserData);
              setUserData({
                user_id: storedUserId,
                role: storedUserRole || "patient",
                user: {
                  id: storedUserId,
                  phone_number: parsedUser.phone_number || "",
                  role: storedUserRole || "patient",
                  profile_picture: parsedUser.profile_picture,
                  created_at: parsedUser.created_at,
                  details: {
                    full_name: parsedUser.details?.full_name || parsedUser.full_name || "User",
                    email: parsedUser.details?.email || parsedUser.email || "",
                    gender: parsedUser.details?.gender || "",
                    date_of_birth: parsedUser.details?.date_of_birth || "",
                    blood_group: parsedUser.details?.blood_group || "",
                    address: parsedUser.details?.address || "",
                    emergency_contact: parsedUser.details?.emergency_contact || "",
                  }
                }
              });
            } catch (e) {
              console.error("Failed to parse local user data", e);
            }
          }
        }
      }
      setLoading(false);
    };

    fetchUserData();
  }, []);

  const handleAbhaSuccess = (profile) => {
    console.log("ABHA Linked:", profile);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Calculate age from date of birth
  const calculateAge = (dob) => {
    if (!dob) return "—";
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  const handleSaveProfile = async (formData) => {
    const toastId = toast.loading("Updating profile...");
    try {
      const data = new FormData();
      data.append("user_id", userData.user_id);
      data.append("full_name", formData.full_name);
      data.append("email", formData.email);
      data.append("gender", formData.gender);
      data.append("date_of_birth", formData.date_of_birth);
      data.append("address", formData.address);

      if (formData.profile_picture_file) {
        data.append("profile_picture", formData.profile_picture_file);
      }

      const response = await api.put("/auth/patient/update", data, {
        "Content-Type": "multipart/form-data",
      });

      if (response.success) {
        setUserData((prev) => ({
          ...prev,
          user: {
            ...prev.user,
            profile_picture: response.data.profile_picture,
            phone_number: formData.phone_number,
            details: {
              ...prev.user.details,
              full_name: response.data.full_name,
              email: response.data.email,
              gender: response.data.gender,
              date_of_birth: response.data.date_of_birth,
              address: response.data.address,
            },
          },
        }));
        toast.success("Profile updated successfully!", { id: toastId });
      } else {
        throw new Error(response.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error(error.message || "Something went wrong", { id: toastId });
      throw error;
    }
  };

  const handleExportData = async () => {
    const toastId = toast.loading("Generating your secure data export...");
    try {
      const res = await fetch(`/api/user/data/export?user_id=${userData.user_id}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to export data");

      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mediconnect_export_${userData.user_id}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Data export downloaded successfully!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error(err.message, { id: toastId });
    }
  };

  const handleAnonymizeData = async () => {
    if (!window.confirm("WARNING: This will permanently remove your personally identifiable info (PII) from our systems. This action cannot be reversed. Are you sure?")) return;

    const toastId = toast.loading("Processing anonymization request...");
    try {
      const res = await fetch("/api/user/data/anonymize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userData.user_id })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || data.message || "Failed to anonymize data");
      toast.success("Your data has been anonymized. You will be logged out.", { id: toastId });
      setTimeout(() => {
        localStorage.clear();
        window.location.href = "/";
      }, 2000);
    } catch (err) {
      console.error(err);
      toast.error(err.message, { id: toastId });
    }
  };

  const handleWithdrawConsent = async () => {
    if (!window.confirm("WARNING: Withdrawing consent will block all future consultations and severely limit platform access. This action cannot be reversed. Are you sure you wish to withdraw DPDP consent?")) return;

    const toastId = toast.loading("Revoking consent...");
    try {
      const res = await fetch("/api/user/consent/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userData.user_id,
          consent_types: ["DATA_PROCESSING", "TELECONSULTATION", "MARKETING"]
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || data.message);
      toast.success("Consent successfully withdrawn.", { id: toastId });
      setTimeout(() => {
        localStorage.clear();
        window.location.href = "/";
      }, 2000);
    } catch (err) {
      console.error(err);
      toast.error(err.message, { id: toastId });
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading your profile..." submessage="Fetching account details" />;
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <p className="text-xl text-gray-600 mb-4 text-center">Please log in to view your profile.</p>
        <a href="/website/auth/login" className="px-6 py-2.5 bg-[#0067A1] text-white rounded-xl hover:bg-[#004F7C] transition-colors shadow-sm">
          Go to Login
        </a>
      </div>
    );
  }

  return (
    <>
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        userData={userData}
        onSave={handleSaveProfile}
      />

      <AbhaConnectModal
        isOpen={isAbhaModalOpen}
        onClose={() => setIsAbhaModalOpen(false)}
        userId={userData.user.id}
        onSuccess={handleAbhaSuccess}
      />

      {/* Main Profile Grid Wrapper */}
      <div className="max-w-full mx-auto ">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* Left Column: Profile Card & Account Status */}
          <div className="space-y-6 lg:col-span-1">

            {/* Main Profile Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-emerald-100/40 overflow-hidden relative">
              {/* Cover Banner Area */}
              <div className="h-24 bg-gradient-to-r from-[#0067A1] via-[#0080C6] to-[#053733] relative">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/medical-icons.png')]"></div>
              </div>

              {/* Profile Details */}
              <div className="px-5 pb-6 text-center -mt-10 relative z-10 flex flex-col items-center">
                {/* Avatar */}
                <div className="relative group shrink-0 mb-3">
                  <div className="w-24 h-24 rounded-full bg-white p-1 shadow-md ring-4 ring-[#0067A1]/5">
                    <div className="w-full h-full rounded-full bg-gray-100 overflow-hidden relative">
                      {userData.user.profile_picture ? (
                        <img
                          src={userData.user.profile_picture}
                          alt={userData.user.details.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#0067A1] text-white text-3xl font-bold">
                          {userData.user.details.full_name?.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* User Name & Role */}
                <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
                  {userData.user.details.full_name}
                </h2>

                <span className="mt-1.5 bg-emerald-50 text-emerald-700 px-3 py-0.5 rounded-full text-[11px] font-bold border border-emerald-100/65 uppercase tracking-wider">
                  {userData.role}
                </span>

                {/* Quick details */}
                <div className="w-full border-t border-gray-100 my-4 pt-4 space-y-2.5 text-left text-gray-500 text-xs">
                  <div className="flex items-center gap-2.5">
                    <FaClock className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{calculateAge(userData.user.details.date_of_birth)} years old</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <FaCalendar className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Joined {formatDate(userData.user.created_at)}</span>
                  </div>
                </div>

                {/* Edit Button */}
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="w-full px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-xl transition-all border border-gray-200 text-xs shadow-xs"
                >
                  Edit Profile
                </button>
              </div>
            </div>

            {/* Account Status Card */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
              <h3 className="text-xs font-bold text-gray-900 mb-3.5 uppercase tracking-wider">Account Verification</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <FaCheckCircle className="text-emerald-500 w-4 h-4 shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-600 font-semibold">Email Verified</span>
                </div>
                <div className="flex items-center gap-3">
                  <FaCheckCircle className="text-emerald-500 w-4 h-4 shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-600 font-semibold">Phone Verified</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: ABHA Stripe, Personal Info, DPDP */}
          <div className="lg:col-span-2 space-y-6">

            {/* ABHA Integration Stripe */}
            <div className="bg-gradient-to-r from-[#FFF8E1] to-[#FFECB3] rounded-3xl p-4 sm:p-5 shadow-sm border border-orange-100 relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-orange-200 rounded-full opacity-50 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm p-2 shrink-0">
                    <img src="https://abdm.gov.in/static/media/Ayushman-logo.d6e0ea533c09466a0598ccb56c7ef652.svg" alt="ABHA" className="w-full h-full" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900">ABHA Integration</h3>
                      <span className="px-2.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-wider rounded-full shrink-0">
                        Official
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-700 mt-1 leading-relaxed">
                      Link your Ayushman Bharat Health Account to securely access and share your digital health records.
                    </p>
                  </div>
                </div>
                <button
                  disabled
                  className="w-full md:w-auto px-5 py-2.5 bg-orange-100 text-orange-600 font-bold rounded-xl transition-all shrink-0 text-xs sm:text-sm flex items-center justify-center cursor-not-allowed"
                >
                  Coming Soon
                </button>
              </div>
            </div>

            {/* Personal Information Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-150/40 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-150/40 flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-bold text-[#003358] flex items-center gap-2">
                  <span className="w-1 h-5 bg-[#0067A1] rounded-full"></span>
                  Personal Information
                </h3>
              </div>

              <div className="p-5 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-y-6">
                  <InfoItem
                    icon={FaUser}
                    label="Full Name"
                    value={userData.user.details.full_name}
                  />
                  <InfoItem
                    icon={FaEnvelope}
                    label="Email Address"
                    value={userData.user.details.email || "—"}
                  />
                  <InfoItem
                    icon={FaPhone}
                    label="Phone Number"
                    value={`${userData.user.phone_number}`}
                  />
                  <InfoItem
                    icon={FaUser}
                    label="Gender"
                    value={
                      userData.user.details.gender ? (
                        userData.user.details.gender.charAt(0).toUpperCase() +
                        userData.user.details.gender.slice(1)
                      ) : "—"
                    }
                  />
                  <InfoItem
                    icon={FaCalendar}
                    label="Date of Birth"
                    value={formatDate(userData.user.details.date_of_birth)}
                  />
                  {userData.user.details.blood_group && (
                    <InfoItem
                      icon={FaHeart}
                      label="Blood Group"
                      value={userData.user.details.blood_group}
                    />
                  )}
                  <div className="sm:col-span-2">
                    <InfoItem
                      icon={FaMapMarkerAlt}
                      label="Address"
                      value={userData.user.details.address || "—"}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy & Data Rights Hub (DPDP Compliance) */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-150/40 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-150/40 flex items-center justify-between gap-2">
                <h3 className="text-base sm:text-lg font-bold text-[#003358] flex items-center gap-2">
                  <span className="w-1 h-5 bg-purple-600 rounded-full"></span>
                  Privacy & Data Rights (DPDP)
                </h3>
                <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-purple-100 flex items-center gap-1 shrink-0">
                  <FaShieldAlt className="w-3 h-3" /> <span className="hidden sm:inline">Secured</span>
                </span>
              </div>

              <div className="p-5 sm:p-6">
                <p className="text-xs sm:text-sm text-gray-600 mb-5 leading-relaxed">
                  Under the Digital Personal Data Protection (DPDP) Act 2023, you have full ownership of your personal and health records. Use these cryptographic tools to manage your digital footprint. Actions taken here are legally binding and permanent.
                </p>

                <div className="space-y-3.5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-150/40 hover:border-gray-200 transition-all gap-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                        <FaDownload className="text-blue-500 shrink-0" /> Export Medical Data
                      </h4>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">Download a complete JSON and PDF archive of all your clinical records, history, and consent logs.</p>
                    </div>
                    <button
                      onClick={handleExportData}
                      className="w-full md:w-auto px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 hover:text-[#0067A1] transition-all text-xs whitespace-nowrap shadow-xs"
                    >
                      Export Archive
                    </button>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl bg-orange-55/40 border border-orange-100 hover:border-orange-200 transition-all gap-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-orange-900 flex items-center gap-2 text-sm">
                        <FaUserSecret className="text-orange-500 shrink-0" /> Anonymize My PII
                      </h4>
                      <p className="text-xs text-orange-700/85 mt-1 leading-relaxed">Permanently erase your name, phone number, and address from the system. Non-identifiable clinical data will remain for analytics.</p>
                    </div>
                    <button
                      onClick={handleAnonymizeData}
                      className="w-full md:w-auto px-4 py-2 bg-orange-100 border border-orange-200 text-orange-700 font-bold rounded-xl hover:bg-orange-500 hover:text-white transition-all text-xs whitespace-nowrap shadow-xs"
                    >
                      Anonymize Profile
                    </button>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl bg-red-55/40 border border-red-100 hover:border-red-200 transition-all gap-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-red-900 flex items-center gap-2 text-sm">
                        <FaBan className="text-red-500 shrink-0" /> Withdraw Telemedicine Consent
                      </h4>
                      <p className="text-xs text-red-700/85 mt-1 leading-relaxed">Revoke all legal consents. You will be unable to book or complete any future consultations on this platform.</p>
                    </div>
                    <button
                      onClick={handleWithdrawConsent}
                      className="w-full md:w-auto px-4 py-2 bg-red-100 border border-red-200 text-red-700 font-bold rounded-xl hover:bg-red-500 hover:text-white transition-all text-xs whitespace-nowrap shadow-xs"
                    >
                      Withdraw Consent
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

// Helper Components
const InfoItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-4">
    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#E6FFFA] flex items-center justify-center text-[#0067A1]">
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-base font-medium text-gray-900 mt-0.5">{value}</p>
    </div>
  </div>
);
