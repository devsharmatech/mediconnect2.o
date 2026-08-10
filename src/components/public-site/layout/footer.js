"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FaHeartbeat,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaYoutube,
  FaArrowRight,
  FaShieldAlt,
  FaUserMd,
  FaStethoscope,
  FaHospital,
  FaFlask,
  FaVideo,
  FaMobileAlt,
  FaHeadset,
  FaCheckCircle,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { HiSparkles } from "react-icons/hi2";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [settings, setSettings] = useState(null);
  const [contactData, setContactData] = useState(null);

  React.useEffect(() => {
    fetch("/api/cms/settings")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setSettings(json.data);
        }
      })
      .catch(console.error);

    fetch("/api/cms/contact")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setContactData(json.data);
        }
      })
      .catch(console.error);
  }, []);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    try {
      const res = await fetch("/api/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSubscribed(true);
        setEmail("");
        setTimeout(() => setSubscribed(false), 3000);
      }
    } catch (err) {
      console.error("Subscribe error:", err);
    }
  };

  const legal = [
    { name: "FAQs", href: "/website/faqs" },
    { name: "Privacy Policy", href: "/website/privacy" },
    { name: "Terms of Use", href: "/website/terms" },
    { name: "Telemedicine Policy", href: "/website/telemedicine-policy" },
    { name: "Refund Policy", href: "/website/refund-policy" },
    { name: "Grievance Redressal", href: "/website/grievance-redressal" },
    {
      name: "ISO Certificates 2015",
      href: "/iso-certifications.pdf",
      external: true,
    },
    {
      name: "ISO Certificates 27001",
      href: "/iso-iec-27001-2022.pdf",
      external: true,
    },
  ];

  const baseSocialLinks = [
    { name: "Facebook", id: "facebook", icon: FaFacebookF, color: "hover:bg-[#0067A1]" },
    { name: "X (Twitter)", id: "twitter", icon: FaXTwitter, color: "hover:bg-black" },
    { name: "Instagram", id: "instagram", icon: FaInstagram, color: "hover:bg-pink-600" },
    { name: "YouTube", id: "youtube", icon: FaYoutube, color: "hover:bg-red-600" },
    { name: "LinkedIn", id: "linkedin", icon: FaLinkedinIn, color: "hover:bg-[#004F7C]" },
  ];

  const socialLinks = baseSocialLinks.map((link) => ({
    ...link,
    href: settings?.social_links?.[link.id] || "#"
  })).filter(link => link.href !== "#" || !settings?.social_links);

  return (
    <footer className="relative bg-[#003358] text-white overflow-hidden">
      {/* Newsletter Section */}
      <div className="relative border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-[#0067A1] rounded-2xl p-8 md:p-12 relative">
            <div className="relative flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="text-center lg:text-left">
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  Stay informed about your care
                </h3>
                <p className="text-[#E0F2F1] text-sm md:text-base">
                  Get relevant care reminders, service updates, and important
                  health information when needed. No promotions.
                </p>
              </div>

              <form
                onSubmit={handleSubscribe}
                className="flex-shrink-0 w-full lg:w-auto"
              >
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      suppressHydrationWarning
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full sm:w-80 pl-11 pr-4 py-3.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
                    />
                  </div>
                  <button
                    suppressHydrationWarning
                    type="submit"
                    className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-[#0067A1] font-semibold rounded-xl hover:bg-gray-100 transform hover:scale-105 transition-all duration-200 shadow-lg"
                  >
                    {subscribed ? (
                      <>
                        <FaCheckCircle className="w-4 h-4 text-green-500" />
                        Subscribed!
                      </>
                    ) : (
                      <>
                        Subscribe for Updates
                        <FaArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          {/* Brand Column */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-xl">
                <img src="/real-logo.png" alt="MediConnect" className="h-16 w-auto" />
              </div>
            </div>

            <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
              Your trusted partner in healthcare. Access verified doctors, book
              lab tests, order medicines, and manage your health records on one
              connected platform.
            </p>

            {/* Contact Info */}
            <div className="space-y-1.5 mt-2">
              {(settings?.support_phone || contactData?.support_phone || "+91 72890-43888").split('\n').map((phone, idx) => (
                <a
                  key={idx}
                  href={`tel:${phone.replace(/[^0-9+]/g, '')}`}
                  className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors group"
                >
                  <div className="w-7 h-7 bg-gray-800 group-hover:bg-[#0067A1] rounded-lg flex items-center justify-center transition-colors">
                    <FaPhone className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm">{phone.trim()}</span>
                </a>
              ))}

              <a
                href={`mailto:${settings?.support_email || "info@mediconnect.fit"}`}
                className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors group"
              >
                <div className="w-7 h-7 bg-gray-800 group-hover:bg-[#0067A1] rounded-lg flex items-center justify-center transition-colors">
                  <FaEnvelope className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm">{settings?.support_email || "info@mediconnect.fit"}</span>
              </a>

              <div className="flex items-center gap-3 text-gray-400">
                <div className="w-7 h-7 bg-gray-800 rounded-lg flex items-center justify-center">
                  <FaHeadset className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm">9:00 AM - 9:00 PM (All Days)</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex gap-2 mt-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  className={`w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 hover:text-white ${social.color} transition-all duration-300 transform hover:scale-110`}
                  aria-label={social.name}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-[#0067A1] rounded-full" />
              Legal
            </h3>
            <ul className="space-y-3">
              {legal.map((item) => (
                <li key={item.name}>
                  {item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white text-sm flex items-center gap-2 group transition-colors"
                    >
                      <FaShieldAlt className="w-3.5 h-3.5 text-amber-400" />
                      <span className="group-hover:translate-x-0.5 transition-transform">
                        {item.name}
                      </span>
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      className="text-gray-400 hover:text-white text-sm flex items-center gap-2 group transition-colors"
                    >
                      <FaShieldAlt className="w-3.5 h-3.5 text-amber-400" />
                      <span className="group-hover:translate-x-0.5 transition-transform">
                        {item.name}
                      </span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Compliance */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-[#0067A1] rounded-full" />
              Compliance
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-3">
              Information Security and Quality Management processes aligned with
              ISO/IEC 27001:2022 and ISO 9001:2015 standards.
            </p>
            <p className="text-sm text-gray-400 leading-relaxed">
              ABDM / ABHA enabled services are available where applicable.
            </p>
          </div>

          {/* Grievance Redressal & Legal Entity */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-[#0067A1] rounded-full" />
              Grievance Redressal
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              <span className="block font-semibold text-gray-200">
                {contactData?.grievance_name || "Grievance Officer"}
              </span>
              Email: {contactData?.grievance_email || settings?.support_email || "info@mediconnect.fit"}
              <br />
              Response Time: {contactData?.grievance_response_time || "48–72 working hours"}
            </p>

            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-2">
              Legal Entity
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-3">
              MediConnect.fit Private Limited
              <br />
              New Delhi, India
            </p>
          </div>
        </div>
      </div>
      <div className="text-center mb-3 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h4 className="text-sm font-semibold text-gray-200 mb-1">
          Medical Disclaimer
        </h4>
        <p className="text-xs text-gray-400 leading-relaxed">
          {settings?.emergency_disclaimer || "MediConnect.fit facilitates teleconsultation services in accordance with Indian telemedicine guidelines. This platform does not provide emergency medical care."}
        </p>
      </div>
      {/* Bottom Bar */}
      <div className="relative border-t border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <p className="text-sm text-center text-gray-300">
              {settings?.footer_text || "MediConnect.fit Private Limited. All rights reserved."}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
