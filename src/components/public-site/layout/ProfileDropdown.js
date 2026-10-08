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
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded border border-teal-200 bg-teal-50 text-teal-800">
          <FaUserMd className="w-2.5 h-2.5" />
          Doctor
        </span>
      );
    }
    if (isChemist) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded border border-amber-200 bg-amber-50 text-amber-800">
          Chemist
        </span>
      );
    }
    if (isLab) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded border border-blue-200 bg-blue-50 text-blue-800">
          Lab
        </span>
      );
    }
    if (isAdmin) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded border border-purple-200 bg-purple-50 text-purple-800">
          Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded border border-slate-200 bg-slate-100 text-slate-700">
        Patient
      </span>
    );
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Profile Trigger Button - Flat, Minimal, Medical Standard */}
      <button
        onClick={toggleDropdown}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300 transition-colors cursor-pointer text-left"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[#0067A1] font-bold text-xs shrink-0 overflow-hidden">
          {avatarUrl && !imageError ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <span>{getInitials(displayName)}</span>
          )}
        </div>

        {/* Name and Role (Desktop) */}
        <div className="hidden md:flex flex-col text-left leading-tight">
          <span className="text-xs font-semibold text-slate-900 max-w-[130px] truncate">
            {displayName}
          </span>
          <div className="flex items-center gap-1 mt-0.5">
            {getRoleBadge()}
          </div>
        </div>

        <FaChevronDown
          className={`h-3 w-3 text-slate-400 transition-transform duration-200 ml-0.5 ${isOpen ? "rotate-180 text-slate-700" : ""}`}
        />
      </button>

      {/* Dropdown Menu - Zero Shadow, Flat Medical Border */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg border border-slate-200 overflow-hidden origin-top-right z-50">
          {/* User Info Header */}
          <div className="p-3 bg-slate-50/80 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[#0067A1] font-bold text-xs shrink-0 overflow-hidden">
                {avatarUrl && !imageError ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <span>{getInitials(displayName)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {displayName}
                  </p>
                  {isDoctor && (
                    <FaCheckCircle className="w-3 h-3 text-teal-600 shrink-0" title="Verified Doctor" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {getDisplayEmail()}
                </p>
                <div className="mt-1">
                  {getRoleBadge()}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items - Clean, Monochromatic, Medical Standard */}
          <div className="p-1.5 space-y-0.5 text-xs">
            {/* Dual Role Backlinks */}
            {isChemist && (
              <Link
                href="/chemist/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-teal-800 bg-teal-50/70 hover:bg-teal-100/70 rounded-md font-medium transition-colors mb-1"
              >
                <FaCog className="h-3.5 w-3.5 text-teal-700 shrink-0" />
                <span>Return to Chemist Panel</span>
              </Link>
            )}

            {isLab && (
              <Link
                href="/lab/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-blue-800 bg-blue-50/70 hover:bg-blue-100/70 rounded-md font-medium transition-colors mb-1"
              >
                <FaCog className="h-3.5 w-3.5 text-blue-700 shrink-0" />
                <span>Return to Lab Panel</span>
              </Link>
            )}

            {/* DOCTOR MENU OPTIONS */}
            {isDoctor && (
              <>
                <Link
                  href="/doctor"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md font-medium transition-colors group"
                >
                  <FaUserMd className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0067A1] shrink-0 transition-colors" />
                  <span>Doctor Dashboard</span>
                </Link>

                <Link
                  href="/doctor?tab=appointments"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md font-medium transition-colors group"
                >
                  <FaCalendarAlt className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0067A1] shrink-0 transition-colors" />
                  <span>Appointments</span>
                </Link>

                <Link
                  href="/doctor/my-patients"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md font-medium transition-colors group"
                >
                  <FaUsers className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0067A1] shrink-0 transition-colors" />
                  <span>My Patients</span>
                </Link>

                <Link
                  href="/doctor/profile-settings"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md font-medium transition-colors group"
                >
                  <FaCog className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0067A1] shrink-0 transition-colors" />
                  <span>Clinic & Profile Settings</span>
                </Link>

                {/* Personal Health (Patient View for Doctors) */}
                <div className="pt-1.5 mt-1 border-t border-slate-100">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Personal Health (Patient View)
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md font-medium transition-colors group"
                  >
                    <FaUser className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0067A1] shrink-0 transition-colors" />
                    <span>Patient Dashboard</span>
                  </Link>

                  <Link
                    href="/website/appointments"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md font-medium transition-colors group"
                  >
                    <FaCalendarAlt className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0067A1] shrink-0 transition-colors" />
                    <span>My Consultations (as Patient)</span>
                  </Link>

                  <Link
                    href="/website/dashboard/lab-booking/orders"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md font-medium transition-colors group"
                  >
                    <FaFlask className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0067A1] shrink-0 transition-colors" />
                    <span>My Lab Orders & Reports</span>
                  </Link>
                </div>
              </>
            )}

            {/* PATIENT MENU OPTIONS */}
            {!isDoctor && (
              <>
                <Link
                  href="/website/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md font-medium transition-colors group"
                >
                  <FaUser className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0067A1] shrink-0 transition-colors" />
                  <span>Patient Dashboard</span>
                </Link>

                <Link
                  href="/website/appointments"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md font-medium transition-colors group"
                >
                  <FaCalendarAlt className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0067A1] shrink-0 transition-colors" />
                  <span>My Appointments</span>
                </Link>

                <Link
                  href="/website/lung-connect"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md font-medium transition-colors group"
                >
                  <TbLungsFilled className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0067A1] shrink-0 transition-colors" />
                  <span>LungConnect</span>
                </Link>

                <Link
                  href="/website/cardio-connect"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md font-medium transition-colors group"
                >
                  <FaHeartbeat className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0067A1] shrink-0 transition-colors" />
                  <span>CardioConnect</span>
                </Link>

                <Link
                  href="/website/lab-reports"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md font-medium transition-colors group"
                >
                  <FaFlask className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0067A1] shrink-0 transition-colors" />
                  <span>Lab Reports</span>
                </Link>

                <Link
                  href="/website/profile"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md font-medium transition-colors group"
                >
                  <FaCog className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0067A1] shrink-0 transition-colors" />
                  <span>My Profile</span>
                </Link>
              </>
            )}

            {/* Divider */}
            <div className="border-t border-slate-100 my-1"></div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-rose-600 hover:bg-rose-50/60 rounded-md font-medium transition-colors group cursor-pointer"
            >
              <FaSignOutAlt className="h-3.5 w-3.5 text-slate-400 group-hover:text-rose-500 shrink-0 transition-colors" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
