'use client';

import React from 'react';
import { FaArrowRight, FaHeartbeat, FaUserMd, FaFlask, FaPills, FaCheckCircle, FaApple, FaGooglePlay } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';

const CTASection = ({ onSignupClick }) => {
  return (
    <section className="relative py-20 bg-[#F6F8FA]">
      {/* Main CTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-[#0067A1] text-white">
          <div className="relative z-10 px-8 py-16 md:px-16 md:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left Content */}
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white text-sm font-semibold rounded-full mb-6">
                  <HiSparkles className="w-4 h-4" />
                  Designed for individuals and families
                </div>
                
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                  Organise your healthcare, <br />
                  <span className="text-blue-200">in one place</span>
                </h2>
                
                <p className="text-lg text-blue-100 mb-8 leading-relaxed">
                  mediconnect.fit helps you connect with verified doctors, request lab tests at home, order medicines and access your health records — all in one place, where available.
                </p>
                
                {/* Features List */}
                <ul className="grid grid-cols-2 gap-3 mb-8">
                  {[
                    'Consult a Doctor',
                    'Lab Tests at Home',
                    'Medicine Delivery',
                    'Digital Health Records',
                    'Nursing & Home Care',
                    'Medical Equipment',
                  ].map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-white text-sm">
                      <FaCheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={onSignupClick}
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#0067A1] font-semibold rounded-xl shadow-sm hover:bg-gray-100"
                  >
                    Set up your mediconnect.fit account
                    <FaArrowRight className="w-4 h-4" />
                  </button>
                  
                  <a
                    href="#services"
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-white/10 text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20"
                  >
                    See available services
                  </a>
                </div>
              </div>
              
              {/* Right Content - Stats & Cards */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: FaUserMd, label: 'Verified doctors', description: 'Consult with registered medical professionals.' },
                  { icon: FaFlask, label: 'Diagnostics', description: 'Book lab tests with partnered providers, where available.' },
                  { icon: FaPills, label: 'Medicines & home care', description: 'Connect to pharmacy and home-care partners.' },
                  { icon: FaHeartbeat, label: 'Health records & follow-up', description: 'Keep prescriptions and reports organised in one place.' },
                ].map((item, index) => (
                  <div 
                    key={index}
                    className="bg-white/5 border border-white/15 rounded-2xl p-6"
                  >
                    <div className="w-12 h-12 bg-[#0067A1] rounded-xl flex items-center justify-center mb-4 shadow-sm">
                      <item.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-sm font-semibold text-blue-100">{item.label}</div>
                    <p className="mt-1 text-xs text-blue-100/80">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* App Download Section */}
        <div className="mt-12 bg-[#003358] rounded-3xl p-8 md:p-12 relative">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Healthcare On The Go
              </h3>
              <p className="text-gray-400 max-w-lg">
                Download our mobile app to use mediconnect.fit from your phone. Available on iOS and Android.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="#"
                className="flex items-center gap-3 px-6 py-3 bg-white rounded-xl hover:bg-gray-100 transition-colors group"
              >
                <FaApple className="w-8 h-8 text-gray-900" />
                <div className="text-left">
                  <div className="text-xs text-gray-500">Download on the</div>
                  <div className="text-sm font-bold text-gray-900">App Store</div>
                </div>
              </a>
              
              <a
                href="#"
                className="flex items-center gap-3 px-6 py-3 bg-white rounded-xl hover:bg-gray-100 transition-colors group"
              >
                <FaGooglePlay className="w-7 h-7 text-gray-900" />
                <div className="text-left">
                  <div className="text-xs text-gray-500">Get it on</div>
                  <div className="text-sm font-bold text-gray-900">Google Play</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
