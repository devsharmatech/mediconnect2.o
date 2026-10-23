"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FaFolder,
  FaArrowLeft,
  FaClock,
  FaLock,
  FaFolderOpen,
  FaUserCheck,
  FaArrowRight,
  FaStethoscope,
} from "react-icons/fa";
import Link from "next/link";
import dynamic from "next/dynamic";

const LoginModal = dynamic(
  () => import("@/components/public-site/auth/LoginModal"),
  { ssr: false }
);
const SignupModal = dynamic(
  () => import("@/components/public-site/auth/SignupModal"),
  { ssr: false }
);

export default function DigitalHealthRecordsPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== "undefined") {
        const userId = localStorage.getItem("userId");
        setIsLoggedIn(Boolean(userId && userId !== "null" && userId !== "undefined"));
      }
    };
    checkAuth();

    // Listen for storage changes in case user logs in elsewhere
    window.addEventListener("storage", checkAuth);
    return () => window.removeEventListener("storage", checkAuth);
  }, []);

  const handleDigiLockerClick = () => {
    if (typeof window !== "undefined") {
      const userId = localStorage.getItem("userId");
      if (userId && userId !== "null" && userId !== "undefined") {
        router.push("/digital-locker");
        return;
      }
    }
    // Not logged in -> trigger login modal
    setShowLoginModal(true);
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    setIsLoggedIn(true);
    router.push("/digital-locker");
  };

  const handleSignupSuccess = () => {
    setShowSignupModal(false);
    setIsLoggedIn(true);
    router.push("/digital-locker");
  };

  return (
    <div className="min-h-screen bg-[#F6F8FA]">
      {/* Header */}
      <div className="bg-[#0067A1] px-6 py-10 md:px-10 md:py-12 text-center text-white">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
          <FaFolder className="h-9 w-9 text-white" />
        </div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3">
          Digital Health Records
        </h1>
        <p className="mt-2 text-sm md:text-base text-white/90 max-w-2xl mx-auto">
          Organised, ABHA-supportive storage for prescriptions, reports and medical records.
        </p>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-[#0067A1] hover:underline mb-8"
          >
            <FaArrowLeft className="mr-2 h-3 w-3" />
            Back to Home
          </Link>

          {/* Main content */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <FaClock className="h-5 w-5 text-amber-600" />
              </div>
              <span className="text-sm font-medium text-amber-700">
                Secure Record Access Coming Soon
              </span>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Your Health Information, Securely Managed
            </h2>

            <div className="space-y-4 text-gray-600 text-sm leading-relaxed">
              <p>
                MediConnect.fit supports India&apos;s digital health ecosystem through optional ABHA integration. You can store your health records securely and access them when needed.
              </p>

              <div className="bg-[#F6F8FA] rounded-xl p-4 mt-6 border border-gray-100">
                <p className="text-xs text-gray-500 mb-2 uppercase font-bold tracking-wider">
                  What You Can Do
                </p>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>• Create or link your ABHA ID</li>
                  <li>• Store prescriptions and lab reports</li>
                  <li>• Control access to your information</li>
                  <li>• Share records with doctors securely</li>
                </ul>
              </div>

              <p>
                Your health data is handled responsibly, in line with Indian healthcare and data protection regulations.
              </p>
            </div>

            {/* Action Buttons Section */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="mb-4">
                <p className="text-sm text-gray-600 font-medium">
                  {isLoggedIn ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md text-xs border border-emerald-200">
                      <FaUserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Logged in as Patient — Access your stored prescriptions, diagnostic reports, and digital locker.
                    </span>
                  ) : (
                    <span className="text-gray-500 text-xs sm:text-sm">
                      Full digital locker features are active for registered patients. Login to view your prescriptions, reports, and uploaded records.
                    </span>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* DigiLocker Button */}
                <button
                  type="button"
                  onClick={handleDigiLockerClick}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold rounded-lg bg-[#0067A1] text-white hover:bg-[#004F7C] transition-colors shadow-sm cursor-pointer"
                >
                  {isLoggedIn ? (
                    <FaFolderOpen className="h-4 w-4" />
                  ) : (
                    <FaLock className="h-3.5 w-3.5" />
                  )}
                  <span>DigiLocker</span>
                  <FaArrowRight className="h-3 w-3" />
                </button>

                {/* Consult Doctor / Book Slot Button */}
                <Link
                  href="/doctors"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors shadow-xs"
                >
                  <FaStethoscope className="h-3.5 w-3.5 text-[#0067A1]" />
                  <span>Consult Doctor</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Support note */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Support Hours: 9:00 AM - 9:00 PM (All Days)</p>
            <p className="mt-1">Email: info@mediconnect.fit</p>
          </div>
        </div>
      </div>

      {/* Auth Modals */}
      {showLoginModal && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onSignupClick={() => {
            setShowLoginModal(false);
            setShowSignupModal(true);
          }}
          initialUserType="patient"
          onSuccess={handleLoginSuccess}
        />
      )}

      {showSignupModal && (
        <SignupModal
          isOpen={showSignupModal}
          onClose={() => setShowSignupModal(false)}
          onLoginClick={() => {
            setShowSignupModal(false);
            setShowLoginModal(true);
          }}
          onSuccess={handleSignupSuccess}
        />
      )}
    </div>
  );
}
