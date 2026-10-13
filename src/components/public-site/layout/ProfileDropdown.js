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
  FaFolderOpen,
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

  const hasDoctor = userRole === "doctor" || user?.role === "doctor" || (typeof window !== "undefined" && !!localStorage.getItem("doctorUser"));
  const hasChemist = userRole === "chemist" || user?.role === "chemist" || (typeof window !== "undefined" && !!localStorage.getItem("chemistUser"));
  const hasLab = userRole === "lab" || user?.role === "lab" || (typeof window !== "undefined" && !!localStorage.getItem("labUser"));
  const hasAdmin = userRole === "admin" || user?.role === "admin" || (typeof window !== "undefined" && !!localStorage.getItem("adminUser"));
  const isDoctor = hasDoctor;
  const isChemist = hasChemist;
  const isLab = hasLab;
  const isAdmin = hasAdmin;
  const isPatient = !isDoctor && !isChemist && !isLab && !isAdmin;

  // Get display name
  const getRawName = () => {
    const raw = (
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
      ""
    );
    if (!raw || raw.trim().toLowerCase() === "administrator" || raw.trim().toLowerCase() === "admin") {
      return "Dev Sharma";
    }
    return raw;
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

  // Synchronize avatar state without purging valid multi-role sessions

  const getRoleLabel = () => {
    if (isDoctor) return "Doctor";
    if (isChemist) return "Chemist";
    if (isLab) return "Lab Partner";
    if (isAdmin) return "Admin";
    return "Patient";
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Profile Trigger Button - Elegant, Clean, Medical Standard */}
      <button
        type="button"
        suppressHydrationWarning
        onClick={toggleDropdown}
        className={`group flex items-center gap-2.5 px-3 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer text-left ${
          isOpen
            ? "border-[#0067A1] bg-sky-50/50 shadow-xs ring-1 ring-[#0067A1]/20"
            : "border-slate-200/90 bg-white hover:bg-slate-50 hover:border-slate-300 shadow-2xs"
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Avatar with subtle online badge */}
        <div className="relative shrink-0">
          <div className="w-8 h-8 rounded-full bg-[#0067A1] text-white flex items-center justify-center font-bold text-xs shadow-2xs ring-1 ring-slate-200/60 overflow-hidden">
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
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
        </div>

        {/* Name and Role (Desktop) - Clean normal text without borders */}
        <div className="hidden md:flex flex-col text-left leading-tight">
          <span className="text-xs font-bold text-slate-800 group-hover:text-slate-900 max-w-[130px] truncate tracking-tight">
            {displayName}
          </span>
          <span className="text-[11px] text-slate-500 font-normal mt-0.5">
            {getRoleLabel()}
          </span>
        </div>

        <FaChevronDown
          className={`h-3 w-3 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ml-0.5 ${
            isOpen ? "rotate-180 text-[#0067A1]" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu - Sleek, Rounded-xl, Compact */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-60 max-w-[calc(100vw-24px)] bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden origin-top-right z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* User Info Header */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-full bg-[#0067A1] text-white flex items-center justify-center font-bold text-xs shadow-xs ring-2 ring-white overflow-hidden">
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
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
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
                <p className="text-[11px] text-slate-500 truncate">
                  {getDisplayEmail()}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] font-semibold text-[#0067A1]">
                    {getRoleLabel()}
                  </span>
                  <span className="text-slate-300 text-[9px]">•</span>
                  <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items - Simple, Short & Non-Technical Labels */}
          <div className="p-1.5 space-y-0.5 text-xs">
            {/* Professional Portal Links (Doctor, Chemist, Lab, Admin) */}
            {isDoctor && (
              <>
                <Link
                  href="/doctor"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg font-medium transition-colors group"
                >
                  <FaUserMd className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0067A1] shrink-0 transition-colors" />
                  <span>Doctor Panel</span>
                </Link>

                <Link
                  href="/doctor?tab=appointments"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg font-medium transition-colors group"
                >
                  <FaCalendarAlt className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0067A1] shrink-0 transition-colors" />
                  <span>Doctor Appointments</span>
                </Link>

                <Link
                  href="/doctor/my-patients"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg font-medium transition-colors group"
                >
                  <FaUsers className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0067A1] shrink-0 transition-colors" />
                  <span>My Patients</span>
                </Link>

                <Link
                  href="/doctor/profile-settings"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg font-medium transition-colors group"
                >
                  <FaCog className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0067A1] shrink-0 transition-colors" />
                  <span>Doctor Settings</span>
                </Link>
              </>
            )}

            {isChemist && (
              <>
                <Link
                  href="/chemist/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-teal-800 bg-teal-50/70 hover:bg-teal-100/70 rounded-lg font-medium transition-colors"
                >
                  <FaCog className="h-3.5 w-3.5 text-teal-700 shrink-0" />
                  <span>Chemist Panel</span>
                </Link>
                <Link
                  href="/chemist/orders"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                >
                  <FaCalendarAlt className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>Chemist Orders</span>
                </Link>
              </>
            )}

            {isLab && (
              <>
                <Link
                  href="/lab/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-blue-800 bg-blue-50/70 hover:bg-blue-100/70 rounded-lg font-medium transition-colors"
                >
                  <FaCog className="h-3.5 w-3.5 text-blue-700 shrink-0" />
                  <span>Lab Panel</span>
                </Link>
                <Link
                  href="/lab/orders"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                >
                  <FaFlask className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>Lab Orders</span>
                </Link>
              </>
            )}

            {isAdmin && (
              <Link
                href="/admin/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-indigo-800 bg-indigo-50/70 hover:bg-indigo-100/70 rounded-lg font-medium transition-colors"
              >
                <FaCog className="h-3.5 w-3.5 text-indigo-700 shrink-0" />
                <span>Admin Panel</span>
              </Link>
            )}

            {/* PATIENT VIEW / PERSONAL HEALTH SECTION (Accessible by ALL users: Patient, Doctor, Chemist, Lab, Admin) */}
            <div className={`pt-1.5 mt-1 ${(isDoctor || isChemist || isLab || isAdmin) ? "border-t border-slate-100" : ""}`}>
              {(isDoctor || isChemist || isLab || isAdmin) && (
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Patient View
                </div>
              )}

              <Link
                href="/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg font-medium transition-colors group"
              >
                <FaUser className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0067A1] shrink-0 transition-colors" />
                <span>Health Records</span>
              </Link>

              <Link
                href="/appointments"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg font-medium transition-colors group"
              >
                <FaCalendarAlt className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0067A1] shrink-0 transition-colors" />
                <span>My Appointments</span>
              </Link>

              <Link
                href="/lab-reports"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg font-medium transition-colors group"
              >
                <FaFlask className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0067A1] shrink-0 transition-colors" />
                <span>My Lab Reports</span>
              </Link>

              <Link
                href="/medicine-order"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg font-medium transition-colors group"
              >
                <FaCog className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0067A1] shrink-0 transition-colors" />
                <span>My Medicine Orders</span>
              </Link>

              <Link
                href="/digital-locker"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg font-medium transition-colors group"
              >
                <FaFolderOpen className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0067A1] shrink-0 transition-colors" />
                <span>Digital Locker</span>
              </Link>

              <Link
                href="/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg font-medium transition-colors group"
              >
                <FaUser className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0067A1] shrink-0 transition-colors" />
                <span>My Profile</span>
              </Link>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-100 my-1"></div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-rose-600 hover:bg-rose-50/60 rounded-lg font-medium transition-colors group cursor-pointer"
            >
              <FaSignOutAlt className="h-3.5 w-3.5 text-slate-400 group-hover:text-rose-500 shrink-0 transition-colors" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
