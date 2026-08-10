"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { CheckCircle2, Store } from "lucide-react";

export default function ChemistOnboardingSuccess() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F6F8FA] via-white to-[#F6F8FA] flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative max-w-xl w-full bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
      >
        {/* Floating glow */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.2 }}
          className="pointer-events-none absolute -top-32 -right-20 w-72 h-72 bg-[#0067A1]/10 blur-3xl rounded-full"
        />

        <div className="relative z-10 px-8 pt-10 pb-8">
          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="mb-6"
            >
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-[#F6F8FA] flex items-center justify-center border border-[#0067A1]/20 shadow-[0_0_40px_rgba(11,79,74,0.15)]">
                  <CheckCircle2 className="w-14 h-14 text-[#0067A1]" />
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                  className="absolute -bottom-3 -right-3 bg-white rounded-full p-2 shadow-lg"
                >
                  <Store className="w-5 h-5 text-[#0067A1]" />
                </motion.div>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-2xl md:text-3xl font-bold text-[#0067A1] mb-3"
            >
              Thank you for registering your pharmacy
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="text-sm md:text-base text-gray-600 max-w-md mb-5"
            >
              Your chemist onboarding details have been submitted successfully.
              Our team will review your information and activate your account
              shortly. You will receive an email notification once it is
              approved.
            </motion.p>

            {/* Animated timeline dots */}
            <div className="flex items-center justify-center gap-3 mb-8 mt-2">
              {["Application received", "Verification", "Activation"].map(
                (label, idx) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + idx * 0.1 }}
                    className="flex flex-col items-center text-xs text-gray-500"
                  >
                    <motion.div
                      className={`w-3 h-3 rounded-full ${idx === 0
                        ? "bg-[#0067A1] shadow-[0_0_18px_rgba(11,79,74,0.4)]"
                        : "bg-gray-200"
                        }`}
                      animate={
                        idx === 0
                          ? {
                            scale: [1, 1.15, 1],
                            boxShadow: [
                              "0 0 18px rgba(11,79,74,0.4)",
                              "0 0 28px rgba(11,79,74,0.6)",
                              "0 0 18px rgba(11,79,74,0.4)",
                            ],
                          }
                          : {}
                      }
                      transition={{
                        duration: 1.4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                    <span className="mt-2 whitespace-nowrap">{label}</span>
                  </motion.div>
                )
              )}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="flex flex-col sm:flex-row gap-3 w-full justify-center"
            >
              <Link
                href="/"
                className="inline-flex justify-center items-center px-5 py-2.5 rounded-full bg-[#0067A1] text-white font-medium shadow-lg hover:shadow-xl hover:bg-[#004F7C] transition-all text-sm md:text-base"
              >
                Go to Home
              </Link>
              <Link
                href="/chemist-onboarding"
                className="inline-flex justify-center items-center px-5 py-2.5 rounded-full border border-[#0067A1]/30 text-[#0067A1] font-medium hover:bg-[#F6F8FA] transition-all text-sm md:text-base"
              >
                Submit another response
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

