"use client";

import Link from "next/link";
import { FaHeartbeat, FaArrowLeft, FaHome } from "react-icons/fa";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F6F8FA] flex flex-col items-center justify-center p-4 selection:bg-[#0067A1] selection:text-white">
      {/* Main Content Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-xl w-full text-center space-y-8"
      >
        {/* Animated Icon */}
        <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
          <div className="absolute inset-0 bg-[#0067A1]/10 rounded-full animate-ping opacity-50"></div>
          <div className="absolute inset-2 bg-[#0067A1]/20 rounded-full animate-pulse"></div>
          <div className="relative w-24 h-24 bg-white rounded-full shadow-2xl flex items-center justify-center text-[#0067A1] z-10 border-4 border-white">
            <FaHeartbeat className="w-12 h-12" />
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-4 relative z-10">
          <h1 className="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-[#0067A1] to-[#128C7E] tracking-tighter drop-shadow-sm">
            404
          </h1>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
            Page Not Found
          </h2>
          <p className="text-base md:text-lg text-gray-500 max-w-md mx-auto leading-relaxed">
            It looks like this link is broken, or the page has been moved. Don't worry, even the best doctors misplace a file sometimes.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 relative z-10">
          <button 
            onClick={() => window.history.back()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-xl font-semibold shadow-sm transition-all duration-200"
          >
            <FaArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          
          <Link 
            href="/website" 
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-[#0067A1] text-white hover:bg-[#073A37] rounded-xl font-semibold shadow-xl shadow-[#0067A1]/20 transition-all duration-200 hover:-translate-y-0.5"
          >
            <FaHome className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
