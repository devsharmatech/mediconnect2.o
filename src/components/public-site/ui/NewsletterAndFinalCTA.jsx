"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FaCheckCircle, FaCalendarCheck } from "react-icons/fa";

export default function NewsletterAndFinalCTA() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
  };

  return (
    <section className="w-full bg-[#FFFFFF] py-10 sm:py-14 border-b border-[#DCE6EB]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          
          {/* Left Card: Stay informed about your health */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#F7FAFC] border border-[#DCE6EB] flex flex-col justify-between">
            <div className="text-center sm:text-left">
              <h3 className="text-xl sm:text-2xl font-bold text-[#0B3A5B] mb-2 tracking-tight">
                Stay informed about your health
              </h3>
              <p className="text-xs sm:text-sm text-[#607580] mb-6 leading-relaxed max-w-lg mx-auto sm:mx-0">
                Get trusted health articles, doctor-reviewed guides, and preventative updates. No promotions.
              </p>
            </div>

            {subscribed ? (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-center sm:justify-start gap-2">
                <FaCheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                Thank you for subscribing to doctor-curated updates!
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[#DCE6EB] bg-white text-xs sm:text-sm text-[#18303D] placeholder-[#607580] focus:outline-none focus:ring-2 focus:ring-[#1677A8]"
                />
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#0B3A5B] text-white text-xs sm:text-sm font-semibold hover:bg-[#1677A8] transition-colors shrink-0 shadow-xs cursor-pointer"
                >
                  Subscribe &rarr;
                </button>
              </form>
            )}
          </div>

          {/* Right Card: Take charge of your healthcare today */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#0B3A5B] text-white flex flex-col justify-between shadow-xs">
            <div className="text-center sm:text-left">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">
                Take charge of your healthcare today.
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 mb-6 leading-relaxed max-w-lg mx-auto sm:mx-0">
                Find a doctor, access healthcare services, manage your records and continue your healthcare journey with MediConnect.fit.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <Link
                href="/website/doctors"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-[#0B3A5B] hover:bg-slate-100 text-xs sm:text-sm font-bold transition-all shadow-sm"
              >
                <FaCalendarCheck className="w-3.5 h-3.5 text-[#1677A8]" />
                <span>Book a Consultation &rarr;</span>
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
