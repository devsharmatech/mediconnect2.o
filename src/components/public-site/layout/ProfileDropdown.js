"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  FaUser,
  FaSignOutAlt,
  FaChevronDown,
  FaCalendarAlt,
  FaFlask,
  FaHeartbeat,
  FaCog,
  FaUserMd,
  FaVideo,
  FaUsers,
  FaCheckCircle,
} from "react-icons/fa";
import { TbLungsFilled } from "react-icons/tb";

const ProfileDropdown = ({ user, userRole, onLogout, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = () => {
    setIsOpen(false);
    onLogout?.();
  };

  const isPatient = userRole === "patient" || user?.role === "patient";
  const isDoctor = !isPatient && (userRole === "doctor" || user?.role === "doctor");
  const isChemist = !isPatient && (userRole === "chemist" || user?.role === "chemist");
  const isLab = !isPatient && (userRole === "lab" || user?.role === "lab");
  const isAdmin = !isPatient && !isDoctor && (userRole === "admin" || user?.role === "admin");

  // Get display name
  const getRawName = () => {
    return (
      // Doctor / Patient
      user?.details?.full_name ||
      user?.profile?.full_name ||
      user?.user?.details?.full_name ||
      user?.user?.full_name ||
      user?.full_name ||
      user?.name ||
      // Chemist
      user?.details?.owner_name ||
      user?.details?.pharmacy_name ||
      // Lab
      user?.details?.lab_name ||
      user?.details?.lab_owner_name ||
      "User"
    );
  };

  const rawName = getRawName();
  const displayName = isDoctor && !rawName.toLowerCase().startsWith("dr.") && !rawName.toLowerCase().startsWith("dr ")
    ? `Dr. ${rawName}`
    : rawName;

  // Get initials from display name
  const getInitials = (name) => {
    if (!name) return "U";
    const clean = name.replace(/^Dr\.\s*/i, "").trim();
    const parts = clean.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return clean.substring(0, 2).toUpperCase() || "U";
  };

  const getDisplayEmail = () => {
    return (
      user?.details?.email ||
      user?.profile?.email ||
      user?.user?.details?.email ||
      user?.user?.email ||
      user?.email ||
      (user?.phone_number ? `+91 ${user.phone_number}` : null) ||
      (user?.details?.mobile ? `+91 ${user.details.mobile}` : null) ||
      "user@mediconnect.fit"
    );
  };

  const getAvatarUrl = () => {
    return (
      user?.profile_picture ||
      user?.avatar ||
      user?.image ||
      user?.details?.profile_picture ||
      user?.details?.avatar ||
      user?.user?.profile_picture ||
      user?.user?.avatar ||
      user?.profile?.profile_picture ||
      user?.profile?.avatar ||
      null
    );
  };

  const avatarUrl = getAvatarUrl();
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

  // Clean up any stale lab/chemist session from localStorage if current user is a patient
  useEffect(() => {
    if (typeof window !== "undefined" && isPatient) {
      try {
        const labRaw = localStorage.getItem("labUser");
        if (labRaw) {
          const lu = JSON.parse(labRaw);
          if (lu?.id !== user?.id) localStorage.removeItem("labUser");
        }
        const chemRaw = localStorage.getItem("chemistUser");
        if (chemRaw) {
          const cu = JSON.parse(chemRaw);
          if (cu?.id !== user?.id) localStorage.removeItem("chemistUser");
        }
      } catch {}
    }
  }, [isPatient, user?.id]);

  const getRoleBadge = () => {
    if (isDoctor) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full bg-teal-50 text-teal-700 border border-teal-200">
          <FaUserMd className="w-2.5 h-2.5" />
          Doctor
        </span>
      );
    }
    if (isChemist) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
          Chemist
        </span>
      );
    }
    if (isLab) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          Lab
        </span>
      );
    }
    if (isAdmin) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full bg-purple-50 text-purple-700 border border-purple-200">
          Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full bg-sky-50 text-sky-700 border border-sky-200">
        Patient
      </span>
    );
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Profile Trigger Button */}
      <button
        onClick={toggleDropdown}
        className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full md:rounded-xl border border-gray-200 bg-white hover:bg-gray-50/80 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 transition-all shadow-sm"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Avatar with Online Dot */}
        <div className="relative w-9 h-9 rounded-full bg-[#0067A1] flex items-center justify-center text-white font-bold text-xs shadow-inner overflow-visible shrink-0 ring-1 ring-gray-100">
          {avatarUrl && !imageError ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-full h-full rounded-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <span>{getInitials(displayName)}</span>
          )}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
        </div>

        {/* Name and Role (Desktop) */}
        <div className="hidden md:flex flex-col text-left leading-tight">
          <span className="text-sm font-semibold text-gray-800 max-w-[130px] truncate">
            {displayName}
          </span>
          <div className="flex items-center gap-1 mt-0.5">
            {getRoleBadge()}
          </div>
        </div>

        <FaChevronDown
          className={`h-3 w-3 text-gray-400 transition-transform duration-200 ml-0.5 ${isOpen ? "rotate-180 text-[#0067A1]" : ""}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden origin-top-right z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* User Info Header */}
          <div className="p-4 bg-gradient-to-br from-sky-50/70 via-gray-50 to-white border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-full bg-[#0067A1] flex items-center justify-center text-white font-bold text-sm shadow-md overflow-hidden shrink-0 ring-2 ring-white">
                {avatarUrl && !imageError ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full rounded-full object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <span>{getInitials(displayName)}</span>
                )}
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {displayName}
                  </p>
                  {isDoctor && (
                    <FaCheckCircle className="w-3.5 h-3.5 text-teal-600 shrink-0" title="Verified Doctor" />
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {getDisplayEmail()}
                </p>
                <div className="mt-1.5">
                  {getRoleBadge()}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2 space-y-0.5 text-sm">
            {/* Dual Role Backlinks */}
            {isChemist && (
              <Link
                href="/chemist/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center px-3 py-2.5 text-teal-700 bg-teal-50/70 hover:bg-teal-100/70 rounded-xl font-medium transition-colors mb-1"
              >
                <FaCog className="h-4 w-4 mr-3 text-teal-600" />
                <span>Return to Chemist Panel</span>
              </Link>
            )}

            {isLab && (
              <Link
                href="/lab/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center px-3 py-2.5 text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100/70 rounded-xl font-medium transition-colors mb-1"
              >
                <FaCog className="h-4 w-4 mr-3 text-emerald-600" />
                <span>Return to Lab Panel</span>
              </Link>
            )}

            {/* DOCTOR MENU OPTIONS */}
            {isDoctor && (
              <>
                <Link
                  href="/doctor"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center px-3 py-2.5 text-gray-700 hover:bg-sky-50/80 hover:text-[#0067A1] rounded-xl font-medium transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mr-2.5 group-hover:bg-[#0067A1] group-hover:text-white transition-colors">
                    <FaUserMd className="h-3.5 w-3.5" />
                  </div>
                  <span>Doctor Dashboard</span>
                </Link>

                <Link
                  href="/doctor?tab=appointments"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center px-3 py-2.5 text-gray-700 hover:bg-sky-50/80 hover:text-[#0067A1] rounded-xl font-medium transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center mr-2.5 group-hover:bg-[#0067A1] group-hover:text-white transition-colors">
                    <FaCalendarAlt className="h-3.5 w-3.5" />
                  </div>
                  <span>Appointments</span>
                </Link>

                <Link
                  href="/doctor/my-patients"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center px-3 py-2.5 text-gray-700 hover:bg-sky-50/80 hover:text-[#0067A1] rounded-xl font-medium transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mr-2.5 group-hover:bg-[#0067A1] group-hover:text-white transition-colors">
                    <FaUsers className="h-3.5 w-3.5" />
                  </div>
                  <span>My Patients</span>
                </Link>

                <Link
                  href="/doctor/profile-settings"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center px-3 py-2.5 text-gray-700 hover:bg-sky-50/80 hover:text-[#0067A1] rounded-xl font-medium transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center mr-2.5 group-hover:bg-[#0067A1] group-hover:text-white transition-colors">
                    <FaCog className="h-3.5 w-3.5" />
                  </div>
                  <span>Clinic & Profile Settings</span>
                </Link>
              </>
            )}

            {/* PATIENT MENU OPTIONS */}
            {!isDoctor && (
              <>
                <Link
                  href="/website/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center px-3 py-2.5 text-gray-700 hover:bg-sky-50/80 hover:text-[#0067A1] rounded-xl font-medium transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center mr-2.5 group-hover:bg-[#0067A1] group-hover:text-white transition-colors">
                    <FaUser className="h-3.5 w-3.5" />
                  </div>
                  <span>Patient Dashboard</span>
                </Link>

                <Link
                  href="/website/appointments"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center px-3 py-2.5 text-gray-700 hover:bg-sky-50/80 hover:text-[#0067A1] rounded-xl font-medium transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mr-2.5 group-hover:bg-[#0067A1] group-hover:text-white transition-colors">
                    <FaCalendarAlt className="h-3.5 w-3.5" />
                  </div>
                  <span>My Appointments</span>
                </Link>

                <Link
                  href="/website/lung-connect"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center px-3 py-2.5 text-gray-700 hover:bg-sky-50/80 hover:text-[#0067A1] rounded-xl font-medium transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center mr-2.5 group-hover:bg-[#0067A1] group-hover:text-white transition-colors">
                    <TbLungsFilled className="h-4 w-4" />
                  </div>
                  <span>LungConnect</span>
                </Link>

                <Link
                  href="/website/cardio-connect"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center px-3 py-2.5 text-gray-700 hover:bg-sky-50/80 hover:text-[#0067A1] rounded-xl font-medium transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center mr-2.5 group-hover:bg-[#0067A1] group-hover:text-white transition-colors">
                    <FaHeartbeat className="h-3.5 w-3.5" />
                  </div>
                  <span>CardioConnect</span>
                </Link>

                <Link
                  href="/website/lab-reports"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center px-3 py-2.5 text-gray-700 hover:bg-sky-50/80 hover:text-[#0067A1] rounded-xl font-medium transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mr-2.5 group-hover:bg-[#0067A1] group-hover:text-white transition-colors">
                    <FaFlask className="h-3.5 w-3.5" />
                  </div>
                  <span>Lab Reports</span>
                </Link>

                <Link
                  href="/website/profile"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center px-3 py-2.5 text-gray-700 hover:bg-sky-50/80 hover:text-[#0067A1] rounded-xl font-medium transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center mr-2.5 group-hover:bg-[#0067A1] group-hover:text-white transition-colors">
                    <FaCog className="h-3.5 w-3.5" />
                  </div>
                  <span>My Profile</span>
                </Link>
              </>
            )}

            {/* Divider */}
            <div className="border-t border-gray-100 my-1.5"></div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2.5 text-red-600 hover:bg-red-50/80 rounded-xl font-medium transition-colors group"
            >
              <div className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center mr-2.5 group-hover:bg-red-500 group-hover:text-white transition-colors">
                <FaSignOutAlt className="h-3.5 w-3.5" />
              </div>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
