"use client";

import React from "react";
import Link from "next/link";
import { FaRobot, FaWhatsapp, FaEnvelope, FaPhoneAlt, FaChevronRight } from "react-icons/fa";

export default function SupportChannels() {
  const channels = [
    {
      title: "MediConnect AI",
      desc: "Get answers and navigate healthcare services.",
      actionText: "Chat with AI",
      href: "/website/ai-health-guide",
      icon: FaRobot,
      isSpecialAction: true,
      buttonAction: () => {
        window.dispatchEvent(new CustomEvent("open-ai-chat"));
      }
    },
    {
      title: "WhatsApp",
      desc: "Chat with our support team.",
      actionText: "Chat on WhatsApp",
      href: "https://wa.me/9118001234567",
      icon: FaWhatsapp,
      isExternal: true,
    },
    {
      title: "Email Support",
      desc: "Write to us for assistance.",
      actionText: "support@mediconnect.fit",
      href: "mailto:support@mediconnect.fit",
      icon: FaEnvelope,
      isLink: true,
    },
    {
      title: "Call Support",
      desc: "Speak to our support team.",
      actionText: "+91 1800 123 4567",
      href: "tel:+9118001234567",
      icon: FaPhoneAlt,
      isLink: true,
    },
  ];

  return (
    <section className="w-full bg-[#FFFFFF] py-10 sm:py-14 border-b border-[#DCE6EB]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {channels.map((ch, idx) => {
            const Icon = ch.icon;
            return (
              <div 
                key={idx}
                onClick={ch.buttonAction ? ch.buttonAction : undefined}
                className={`group flex flex-col justify-between p-5 rounded-2xl bg-[#FFFFFF] border border-[#DCE6EB] hover:border-[#1677A8]/50 hover:shadow-xs transition-all ${
                  ch.buttonAction ? "cursor-pointer hover:border-[#1677A8]" : ""
                }`}
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#F7FAFC] border border-[#DCE6EB] text-[#1677A8] flex items-center justify-center mb-3.5 group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5 text-[#1677A8]" />
                  </div>
                  <h3 className="text-base font-bold text-[#0B3A5B] mb-1 group-hover:text-[#1677A8] transition-colors">
                    {ch.title}
                  </h3>
                  <p className="text-xs text-[#607580] leading-relaxed mb-4">
                    {ch.desc}
                  </p>
                </div>

                <div className="pt-2">
                  {ch.buttonAction ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        ch.buttonAction();
                      }}
                      className="inline-flex items-center text-xs font-bold text-[#1677A8] group-hover:text-[#0B3A5B] transition-colors cursor-pointer"
                    >
                      <span>{ch.actionText}</span>
                      <FaChevronRight className="w-2.5 h-2.5 ml-1" />
                    </button>
                  ) : (
                    <a
                      href={ch.href}
                      target={ch.isExternal ? "_blank" : undefined}
                      rel={ch.isExternal ? "noopener noreferrer" : undefined}
                      className="inline-flex items-center text-xs font-bold text-[#1677A8] group-hover:text-[#0B3A5B] transition-colors"
                    >
                      <span>{ch.actionText}</span>
                      <FaChevronRight className="w-2.5 h-2.5 ml-1" />
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
