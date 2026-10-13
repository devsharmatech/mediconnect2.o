"use client";

import React, { useState, useEffect } from "react";
import { FaRobot, FaWhatsapp, FaEnvelope, FaPhoneAlt, FaChevronRight } from "react-icons/fa";

export default function SupportChannels() {
  const [settings, setSettings] = useState({
    support_phone: "+91 7289 043888",
    whatsapp_number: "+91 7289043888",
    whatsapp_message: "Hello! I would like to know more about MediConnect.",
    support_email: "info@mediconnect.fit",
  });

  useEffect(() => {
    let isMounted = true;
    fetch("/api/cms/settings")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data?.success && data?.data) {
          setSettings({
            support_phone: data.data.support_phone || "+91 7289 043888",
            whatsapp_number: data.data.whatsapp_number || "+91 7289043888",
            whatsapp_message: data.data.whatsapp_message || "Hello! I would like to know more about MediConnect.",
            support_email: data.data.support_email || "info@mediconnect.fit",
          });
        }
      })
      .catch((err) => console.error("SupportChannels: error fetching settings", err));

    return () => {
      isMounted = false;
    };
  }, []);

  const cleanPhone = (settings.support_phone || "+91 7289 043888").replace(/[^\d+]/g, "");
  const cleanWa = (settings.whatsapp_number || "+91 7289043888").replace(/[^\d]/g, "");

  const channels = [
    {
      id: "ai",
      title: "MediConnect AI",
      desc: "Get answers and navigate healthcare services.",
      badge: "Instant 24/7",
      badgeDot: "bg-[#1677A8] animate-pulse",
      infoLabel: "Automated Clinical Guide",
      infoValue: "Symptom triage & care navigation",
      actionText: "Chat with AI",
      href: "#",
      icon: FaRobot,
      isSpecialAction: true,
      buttonAction: () => {
        window.dispatchEvent(new CustomEvent("open-ai-chat"));
      },
    },
    {
      id: "whatsapp",
      title: "WhatsApp",
      desc: "Chat with our support team.",
      badge: "Quick Reply",
      badgeDot: "bg-[#2FA36B]",
      infoLabel: "Direct WhatsApp Line",
      infoValue: settings.whatsapp_number,
      actionText: "Chat on WhatsApp",
      href: `https://wa.me/${cleanWa}?text=${encodeURIComponent(settings.whatsapp_message || "Hello! I would like to know more about MediConnect.")}`,
      icon: FaWhatsapp,
      isExternal: true,
    },
    {
      id: "email",
      title: "Email Support",
      desc: "Write to us for assistance.",
      badge: "Direct Desk",
      badgeDot: "bg-[#1677A8]",
      infoLabel: "Official Support Inbox",
      infoValue: settings.support_email || "info@mediconnect.fit",
      actionText: settings.support_email || "info@mediconnect.fit",
      href: `mailto:${settings.support_email || "info@mediconnect.fit"}`,
      icon: FaEnvelope,
      isLink: true,
    },
    {
      id: "phone",
      title: "Call Support",
      desc: "Speak to our support team.",
      badge: "Toll-Free",
      badgeDot: "bg-[#159A8A] animate-pulse",
      infoLabel: "Patient Care Helpline",
      infoValue: settings.support_phone || "+91 7289 043888",
      actionText: settings.support_phone || "+91 7289 043888",
      href: `tel:${cleanPhone}`,
      icon: FaPhoneAlt,
      isLink: true,
    },
  ];

  return (
    <section className="w-full bg-[#FFFFFF] py-10 sm:py-14 border-b border-[#DCE6EB]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header - Frozen per Developer Handover PDF */}
        <div className="text-center sm:text-left mb-8 sm:mb-10">
          <p className="text-[11px] sm:text-xs font-bold tracking-widest text-[#1677A8] uppercase mb-1.5">
            SUPPORT & REACHABILITY
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0B3A5B] tracking-tight">
            Need help? We&apos;re here.
          </h2>
          <p className="text-xs sm:text-sm text-[#607580] mt-1.5 max-w-xl mx-auto sm:mx-0 leading-relaxed">
            Get support, information and guidance through multiple channels.
          </p>
        </div>

        {/* 4 Support Channels Cards - Rich, Balanced & Document-Compliant */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {channels.map((ch) => {
            const Icon = ch.icon;
            const isClickable = !!ch.buttonAction;

            return (
              <div
                key={ch.id}
                onClick={ch.buttonAction ? ch.buttonAction : undefined}
                className={`group flex flex-col justify-between p-5 sm:p-5.5 rounded-2xl bg-[#FFFFFF] border border-[#DCE6EB] hover:border-[#1677A8] hover:shadow-md transition-all duration-200 ${
                  isClickable ? "cursor-pointer" : ""
                }`}
              >
                <div>
                  {/* Top Header Row: Icon + Status Pill */}
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#F7FAFC] border border-[#DCE6EB] text-[#1677A8] flex items-center justify-center group-hover:bg-[#EBF5FA] group-hover:border-[#1677A8]/30 group-hover:scale-105 transition-all duration-200">
                      <Icon className="w-4.5 h-4.5 text-[#1677A8]" />
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#F7FAFC] text-[#18303D] border border-[#DCE6EB]">
                      <span className={`w-1.5 h-1.5 rounded-full ${ch.badgeDot}`} />
                      <span>{ch.badge}</span>
                    </span>
                  </div>

                  {/* Title: Deep Navy #0B3A5B */}
                  <h3 className="text-base font-bold text-[#0B3A5B] mb-1 group-hover:text-[#1677A8] transition-colors">
                    {ch.title}
                  </h3>

                  {/* Description: Secondary Copy #607580 */}
                  <p className="text-xs text-[#607580] leading-relaxed mb-3">
                    {ch.desc}
                  </p>

                  {/* Context Info Box (Eliminates empty void & shows real database values) */}
                  <div className="rounded-xl bg-[#F7FAFC] border border-[#DCE6EB] p-2.5 mb-4 group-hover:bg-[#F2F7FA] transition-colors">
                    <div className="text-[10px] font-semibold text-[#607580] uppercase tracking-wider mb-0.5">
                      {ch.infoLabel}
                    </div>
                    <div className="text-xs font-bold text-[#18303D] truncate">
                      {ch.infoValue}
                    </div>
                  </div>
                </div>

                {/* Bottom Action CTA with Clean Button Bar */}
                <div className="pt-2 border-t border-[#DCE6EB]/70">
                  {ch.buttonAction ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        ch.buttonAction();
                      }}
                      className="w-full flex items-center justify-between text-xs font-bold text-[#1677A8] group-hover:text-[#0B3A5B] transition-colors py-1 cursor-pointer"
                    >
                      <span className="truncate">{ch.actionText}</span>
                      <span className="w-6 h-6 rounded-md bg-[#F7FAFC] border border-[#DCE6EB] flex items-center justify-center shrink-0 ml-2 group-hover:bg-[#1677A8] group-hover:text-white group-hover:border-[#1677A8] transition-all">
                        <FaChevronRight className="w-2.5 h-2.5" />
                      </span>
                    </button>
                  ) : (
                    <a
                      href={ch.href}
                      target={ch.isExternal ? "_blank" : undefined}
                      rel={ch.isExternal ? "noopener noreferrer" : undefined}
                      className="w-full flex items-center justify-between text-xs font-bold text-[#1677A8] group-hover:text-[#0B3A5B] transition-colors py-1"
                    >
                      <span className="truncate">{ch.actionText}</span>
                      <span className="w-6 h-6 rounded-md bg-[#F7FAFC] border border-[#DCE6EB] flex items-center justify-center shrink-0 ml-2 group-hover:bg-[#1677A8] group-hover:text-white group-hover:border-[#1677A8] transition-all">
                        <FaChevronRight className="w-2.5 h-2.5" />
                      </span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
