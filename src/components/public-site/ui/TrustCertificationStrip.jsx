"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle } from "lucide-react";
import { 
  FaUserMd, 
  FaVideo, 
  FaLock, 
  FaHeartbeat,
  FaCheckCircle 
} from "react-icons/fa";
import { HiOutlineBadgeCheck } from "react-icons/hi";

export default function TrustCertificationStrip() {
  const [cmsLogos, setCmsLogos] = useState([]);

  useEffect(() => {
    fetch("/api/cms/compliance-logos")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setCmsLogos(json.data);
        }
      })
      .catch((err) => console.error("Failed to load CMS compliance logos:", err));
  }, []);

  const defaultStandards = [
    {
      title: "NMC Compliant",
      subtitle: "National Medical Commission",
      image: "https://d11fi0esezlwk0.cloudfront.net/media/uploads/32f8fea5-6f63-4aa9-a88f-23777f992233.png",
      icon: <HiOutlineBadgeCheck className="w-5 h-5 text-slate-500" />,
    },
    {
      title: "ABDM / NHA Aligned",
      subtitle: "Ayushman Bharat Digital Mission",
      image: "https://d11fi0esezlwk0.cloudfront.net/media/uploads/ee88c994-3a96-49d4-ae4a-1e229054ac7e.png",
      icon: <FaCheckCircle className="w-5 h-5 text-slate-500" />,
    },
    {
      title: "ISO 9001:2015",
      subtitle: "Quality Management System",
      image: "https://d11fi0esezlwk0.cloudfront.net/media/uploads/e778a78a-c02d-4b3c-9aa9-44d0569aac5a.gif",
      icon: (
        <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-600 text-white">
          ISO
        </span>
      ),
    },
    {
      title: "ISO 27001:2022",
      subtitle: "Information Security Management",
      image: "https://d11fi0esezlwk0.cloudfront.net/media/uploads/f7087876-8888-4389-b2a7-e1fac336f118.gif",
      icon: (
        <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-600 text-white">
          ISO
        </span>
      ),
    },
    {
      title: "Registered Professionals",
      subtitle: "Verified Medical Credentials",
      icon: <FaUserMd className="w-5 h-5 text-slate-500" />,
    },
    {
      title: "Telemedicine Aligned",
      subtitle: "Govt of India Guidelines",
      icon: <FaVideo className="w-5 h-5 text-slate-500" />,
    },
    {
      title: "Data Protection",
      subtitle: "Compliant & Encrypted",
      icon: <FaLock className="w-5 h-5 text-slate-500" />,
    },
    {
      title: "Patient Safety First",
      subtitle: "Ethical Clinical Care",
      icon: <FaHeartbeat className="w-5 h-5 text-slate-500" />,
    },
  ];

  // If CMS logos loaded, use them with official imagery; also include clinical governance badges
  const mergedItems = cmsLogos.length > 0
    ? [
        ...cmsLogos.map((logo) => ({
          title: logo.name,
          subtitle: logo.title || "Official Certification",
          image: logo.image,
          link: logo.link,
          icon: <HiOutlineBadgeCheck className="w-5 h-5 text-slate-500" />,
        })),
        ...defaultStandards.slice(4),
      ]
    : defaultStandards;

  // Quadruple items to ensure seamless infinite loop
  const tickerItems = [...mergedItems, ...mergedItems, ...mergedItems, ...mergedItems];

  return (
    <section className="w-full bg-[#F8FAFC] border-y border-[#DCE6EB] py-4 sm:py-5 overflow-hidden relative select-none">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes smoothTrustSlide {
              0% { transform: translate3d(0, 0, 0); }
              100% { transform: translate3d(-50%, 0, 0); }
            }
            .trust-slide-track {
              display: flex;
              width: max-content;
              animation: smoothTrustSlide 42s linear infinite;
              will-change: transform;
            }
            .trust-slide-track:hover {
              animation-play-state: paused;
            }
          `,
        }}
      />

      <div className="w-full">
        {/* Old Subtle Muted Heading */}
        <div className="text-center mb-3 sm:mb-4 px-4">
          <p className="text-[10px] sm:text-[11px] font-bold tracking-widest text-[#0B3A5B] uppercase">
            TRUSTED &amp; BUILT AROUND MEDICAL STANDARDS
          </p>
        </div>

        {/* Outer Container with Soft Edge Fades */}
        <div className="relative w-full overflow-hidden">
          {/* Left subtle fade mask */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 sm:w-28 bg-gradient-to-r from-[#F8FAFC] via-[#F8FAFC]/80 to-transparent z-10" />

          {/* Right subtle fade mask */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 sm:w-28 bg-gradient-to-l from-[#F8FAFC] via-[#F8FAFC]/80 to-transparent z-10" />

          {/* Infinite Auto-sliding Track */}
          <div className="trust-slide-track flex items-center gap-3 sm:gap-3.5 py-1">
            {tickerItems.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center justify-center text-center w-36 sm:w-40 h-[84px] sm:h-[88px] p-2.5 rounded-none bg-white border border-[#DCE6EB] hover:border-[#1677A8] transition-all duration-300 shrink-0 group cursor-default select-none"
              >
                {item.image ? (
                  <div className="h-7 sm:h-8 max-w-[110px] flex items-center justify-center mb-1 transition-all duration-300">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="max-h-full max-w-full object-contain grayscale group-hover:grayscale-0 opacity-80 group-hover:opacity-100 transition-all duration-300"
                    />
                  </div>
                ) : (
                  <div className="mb-1 flex items-center justify-center h-7 sm:h-8 text-slate-500 group-hover:text-[#1677A8] transition-colors">
                    {item.icon}
                  </div>
                )}
                <h4 className="text-[11px] sm:text-xs font-bold text-[#0B3A5B] leading-tight mb-0.5 line-clamp-1 group-hover:text-[#1677A8] transition-colors">
                  {item.title}
                </h4>
                <p className="text-[9px] sm:text-[10px] text-[#607580] leading-tight line-clamp-1">
                  {item.subtitle}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
