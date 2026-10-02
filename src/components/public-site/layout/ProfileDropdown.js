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
} from "react-icons/fa";
import { TbLungsFilled } from "react-icons/tb";

const ProfileDropdown = ({ user, userRole, onLogout }) => {
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

  // Get initials from a display name
  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getDisplayName = () => {
    return (
      // Patient / generic
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

  const getDisplayEmail = () => {
    return (
      user?.details?.email ||
      user?.profile?.email ||
      user?.user?.details?.email ||
      user?.user?.email ||
      user?.email ||
      user?.details?.mobile ||
      "user@example.com"
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

  const isPatient = userRole === "patient" || user?.role === "patient";
  const isDoctor = !isPatient && (userRole === "doctor" || user?.role === "doctor");
  const isChemist = !isPatient && (userRole === "chemist" || user?.role === "chemist");
  const isLab = !isPatient && (userRole === "lab" || user?.role === "lab");

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

  return (
    <div className="relative hidden sm:block" ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={toggleDropdown}
        className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0067A1] focus:ring-offset-2"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-[#0067A1] flex items-center justify-center text-white font-semibold shadow-sm overflow-hidden">
          {avatarUrl && !imageError ? (
            <img
              src={avatarUrl}
              alt={getDisplayName()}
              className="w-full h-full rounded-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <span className="text-sm">{getInitials(getDisplayName())}</span>
          )}
        </div>

        {/* Name and Chevron (hidden on mobile) */}
        <div className="hidden md:flex items-center space-x-1">
          <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
            {getDisplayName()}
          </span>
          <FaChevronDown
            className={`h-3 w-3 text-gray-500 ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
      <div
        className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden origin-top-right z-50"
      >
        {/* User Info Section */}
        <div className="px-4 py-3 bg-[#F6F8FA] border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-[#0067A1] flex items-center justify-center text-white font-semibold shadow-sm overflow-hidden">
              {avatarUrl && !imageError ? (
                <img
                  src={avatarUrl}
                  alt={getDisplayName()}
                  className="w-full h-full rounded-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <span>{getInitials(getDisplayName())}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {getDisplayName()}
              </p>
              <p className="text-xs text-gray-600 truncate">
                {getDisplayEmail()}
              </p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="py-2">
          {/* Quick Return for Dual Roles */}
          {isChemist && (
            <Link
              href="/chemist/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center px-4 py-2.5 text-sm text-teal-700 bg-teal-50 hover:bg-teal-100 group border-b border-teal-100 mb-1"
            >
              <FaCog className="h-4 w-4 mr-3 text-teal-600" />
              <span className="font-semibold">Return to Chemist Panel</span>
            </Link>
          )}

          {isLab && (
            <Link
              href="/lab/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center px-4 py-2.5 text-sm text-emerald-700 bg-emerald-50 hover:bg-emerald-100 group border-b border-emerald-100 mb-1"
            >
              <FaCog className="h-4 w-4 mr-3 text-emerald-600" />
              <span className="font-semibold">Return to Lab Panel</span>
            </Link>
          )}

          {/* Dashboard */}
          <Link
            href={isDoctor ? "/doctor" : "/website/dashboard"}
            onClick={() => setIsOpen(false)}
            className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 group"
          >
            <FaUser className="h-4 w-4 mr-3 text-gray-400 group-hover:text-[#0067A1]" />
            <span className="font-medium">{isDoctor ? "Doctor Dashboard" : "Dashboard"}</span>
          </Link>

          {/* Patient shortcuts */}
          {!isDoctor && (
            <>
              <Link
                href="/website/lung-connect"
                onClick={() => setIsOpen(false)}
                className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 group"
              >
                <TbLungsFilled className="h-4 w-4 mr-3 text-teal-600 group-hover:text-teal-700" />
                <span className="font-medium">LungConnect</span>
              </Link>

              <Link
                href="/website/cardio-connect"
                onClick={() => setIsOpen(false)}
                className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 group"
              >
                <FaHeartbeat className="h-4 w-4 mr-3 text-rose-500 group-hover:text-rose-600" />
                <span className="font-medium">CardioConnect</span>
              </Link>

              <Link
                href="/website/appointments"
                onClick={() => setIsOpen(false)}
                className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 group"
              >
                <FaCalendarAlt className="h-4 w-4 mr-3 text-gray-400 group-hover:text-[#0067A1]" />
                <span className="font-medium">My Appointments</span>
              </Link>

              <Link
                href="/website/lab-reports"
                onClick={() => setIsOpen(false)}
                className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 group"
              >
                <FaFlask className="h-4 w-4 mr-3 text-gray-400 group-hover:text-[#0067A1]" />
                <span className="font-medium">Lab Reports</span>
              </Link>

              <Link
                href="/website/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 group"
              >
                <FaUser className="h-4 w-4 mr-3 text-gray-400 group-hover:text-[#0067A1]" />
                <span className="font-medium">My Profile</span>
              </Link>
            </>
          )}

          {/* Divider */}
          <div className="border-t border-gray-100 my-1"></div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 group"
          >
            <FaSignOutAlt className="h-4 w-4 mr-3 text-red-400 group-hover:text-red-600 transition-colors duration-150" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
