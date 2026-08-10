"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDownIcon,
  UserIcon,
  UserGroupIcon,
  BeakerIcon,
  ShoppingCartIcon,
} from "@heroicons/react/24/outline";

export default function Navbar({ onOpenAuth }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const dropdownRef = useRef(null);

  const loginOptions = [
    {
      type: "patient",
      label: "Patient",
      icon: UserIcon,
      description: "Access your health records and appointments",
      color: "blue",
    },
    {
      type: "doctor",
      label: "Doctor",
      icon: UserGroupIcon,
      description: "Manage your practice and consultations",
      color: "green",
    },
    {
      type: "lab",
      label: "Laboratory",
      icon: BeakerIcon,
      description: "Handle test bookings and reports",
      color: "orange",
    },
    {
      type: "chemist",
      label: "Chemist",
      icon: ShoppingCartIcon,
      description: "Manage medicine orders and inventory",
      color: "purple",
    },
  ];

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getColorClasses = (color) => {
    const colors = {
      blue: "bg-blue-500 text-white",
      green: "bg-green-500 text-white",
      orange: "bg-orange-500 text-white",
      purple: "bg-purple-500 text-white",
    };
    return colors[color] || colors.blue;
  };

  const handleLoginClick = (userType) => {
    if (userType === "patient") {
      onOpenAuth(userType);
    } else {
      // Redirect other user types to their respective dashboards
      window.location.href = `/${userType}/login`;
    }
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <motion.div
            className="flex items-center"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link href="/" className="flex items-center space-x-2">
              <img
                src="/real-logo.png"
                alt="Mediconnect Logo"
                className="h-14 w-14 object-contain"
              />

            </Link>
          </motion.div>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center space-x-8">
            <Link
              href="#ai-intelligence"
              className="text-gray-700 hover:text-[#0067A1] transition-colors font-medium text-lg"
            >
              AI Features
            </Link>
            <Link
              href="#modules"
              className="text-gray-700 hover:text-[#0067A1] transition-colors font-medium text-lg"
            >
              Modules
            </Link>
            <Link
              href="#how-it-works"
              className="text-gray-700 hover:text-[#0067A1] transition-colors font-medium text-lg"
            >
              How It Works
            </Link>

            {/* Login Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() =>
                  setActiveDropdown(activeDropdown === "login" ? null : "login")
                }
                className="flex items-center space-x-2 text-gray-700 hover:text-[#0067A1] transition-colors font-medium text-lg px-4 py-2 rounded-lg hover:bg-blue-50"
              >
                <span>Login</span>
                <ChevronDownIcon
                  className={`w-4 h-4 transition-transform ${activeDropdown === "login" ? "rotate-180" : ""
                    }`}
                />
              </button>

              <AnimatePresence>
                {activeDropdown === "login" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 p-4"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Login to Your Account
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {loginOptions.map((option) => (
                        <motion.button
                          key={option.type}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleLoginClick(option.type)}
                          className={`p-4 rounded-lg border-2 border-gray-100 hover:border-${option.color}-500 transition-all duration-200 group text-left`}
                        >
                          <div
                            className={`w-10 h-10 ${getColorClasses(
                              option.color
                            )} rounded-lg flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}
                          >
                            <option.icon className="w-5 h-5" />
                          </div>
                          <h4 className="font-semibold text-gray-900 group-hover:text-gray-900">
                            {option.label}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {option.description}
                          </p>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onOpenAuth("patient")}
              className="bg-gradient-to-r from-[#0067A1] to-[#004F7C] text-white px-8 py-2.5 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold text-lg"
            >
              Get Started
            </motion.button>
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-600 hover:text-[#0067A1] focus:outline-none p-2 rounded-lg hover:bg-blue-50"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </motion.button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden py-4 p-4 rounded-md border-t border-gray-200 bg-white/95 backdrop-blur-md"
            >
              <div className="flex flex-col space-y-4">
                <Link
                  href="#ai-intelligence"
                  className="text-gray-700 hover:text-[#0067A1] py-2 font-medium text-lg"
                >
                  AI Features
                </Link>
                <Link
                  href="#modules"
                  className="text-gray-700 hover:text-[#0067A1] py-2 font-medium text-lg"
                >
                  Modules
                </Link>
                <Link
                  href="#how-it-works"
                  className="text-gray-700 hover:text-[#0067A1] py-2 font-medium text-lg"
                >
                  How It Works
                </Link>

                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-gray-900 font-semibold mb-3">
                    Login as:
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {loginOptions.map((option) => (
                      <button
                        key={option.type}
                        onClick={() => handleLoginClick(option.type)}
                        className="p-3 rounded-lg border border-gray-200 hover:border-blue-500 transition-colors text-left"
                      >
                        <div
                          className={`w-8 h-8 ${getColorClasses(
                            option.color
                          )} rounded-lg flex items-center justify-center mb-1`}
                        >
                          <option.icon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => onOpenAuth("patient")}
                  className="bg-gradient-to-r from-[#0067A1] to-[#004F7C] text-white px-4 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-semibold text-lg mt-4"
                >
                  Get Started
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
