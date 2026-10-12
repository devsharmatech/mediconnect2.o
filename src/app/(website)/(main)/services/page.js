"use client";

import { useState, useEffect } from "react";
import {
  FaUserMd,
  FaHeartbeat,
  FaSearch,
  FaShoppingCart,
  FaHeadset,
  FaChartLine,
  FaShieldAlt,
  FaMobileAlt,
  FaCalendarCheck,
  FaPrescriptionBottle,
  FaBrain,
  FaClinicMedical,
  FaFlask,
  FaPills,
  FaHandHoldingHeart,
  FaBed,
  FaStethoscope,
  FaPlusSquare,
  FaSyringe
} from "react-icons/fa";
import { SiAntdesign } from "react-icons/si";
import AnimateIn from "@/components/ui/animations/AnimateIn";
import Link from "next/link";

const iconMap = {
  FaUserMd, FaHeartbeat, FaSearch, FaShoppingCart, FaHeadset, FaChartLine,
  FaShieldAlt, FaMobileAlt, FaCalendarCheck, FaPrescriptionBottle, FaBrain,
  FaClinicMedical, FaFlask, FaPills, FaHandHoldingHeart, FaBed, FaStethoscope,
  FaPlusSquare, FaSyringe
};

const ServiceCard = ({ icon: Icon, title, description, delay, link, img }) => {
  const isComingSoon = link?.includes("coming-soon") || title.toLowerCase().includes("symptom check");
  let actualLink = isComingSoon ? "/coming-soon" : link;
  if (!isComingSoon && actualLink) {
    if (actualLink.includes("nursing-care") || actualLink.includes("home-care")) {
      actualLink = "/nursing-care";
    } else if (actualLink.startsWith("/website")) {
      actualLink = actualLink.replace("/website", "");
    }
  }

  return (
    <AnimateIn delay={delay} className="w-full h-full">
      <Link href={actualLink} className="block h-full group">
        <div className="relative h-full rounded-2xl border border-[#DCE6EB] bg-white p-6 sm:p-7 shadow-2xs hover:border-[#1677A8]/50 hover:shadow-xs transition-all duration-200 flex flex-col justify-between">
          {isComingSoon && (
            <div className="absolute top-4 right-4 bg-[#159A8A]/10 text-[#159A8A] border border-[#159A8A]/30 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              Roadmap
            </div>
          )}
          <div>
            <div className="mb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F7FAFC] border border-[#DCE6EB] text-[#1677A8] overflow-hidden group-hover:scale-105 transition-transform">
                {img ? (
                  <img src={img} className="w-full h-full object-cover" alt={title} />
                ) : (
                  Icon ? <Icon className="h-6 w-6 text-[#1677A8]" /> : <FaUserMd className="h-6 w-6 text-[#1677A8]" />
                )}
              </div>
            </div>
            <h3 className="mb-2 text-lg sm:text-xl font-bold text-[#0B3A5B] group-hover:text-[#1677A8] transition-colors leading-snug">
              {title}
            </h3>
            <p className="mb-4 text-xs sm:text-sm leading-relaxed text-[#607580]">
              {description}
            </p>
          </div>

          <div className="mt-auto border-t border-[#DCE6EB]/60 pt-4 flex items-center justify-between">
            <span className="inline-flex items-center text-xs font-bold text-[#1677A8] group-hover:translate-x-0.5 transition-transform">
              Explore &rarr;
            </span>
          </div>
        </div>
      </Link>
    </AnimateIn>
  );
};

const FeatureHighlight = ({ icon: Icon, title, description }) => (
  <div className="rounded-2xl border border-[#DCE6EB] bg-white p-5 sm:p-6 shadow-2xs">
    <div className="mb-3.5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7FAFC] border border-[#DCE6EB] text-[#1677A8]">
      <Icon className="h-5 w-5 text-[#1677A8]" />
    </div>
    <h4 className="mb-1 text-base font-bold text-[#0B3A5B]">{title}</h4>
    <p className="text-xs text-[#607580] leading-relaxed">{description}</p>
  </div>
);

const fallbackMainServices = [
  {
    icon: FaUserMd,
    title: "Doctor Consultations",
    description:
      "HD video consultations and in-clinic visits with verified specialists across 15+ clinical specialties.",
    link: "/doctors",
  },
  {
    icon: FaFlask,
    title: "Lab Tests & Diagnostics",
    description:
      "Book NABL-accredited diagnostic packages and tests with digital reports delivered directly to your account.",
    link: "/dashboard/lab-booking",
  },
  {
    icon: FaPills,
    title: "Pharmacy & Medicines",
    description:
      "Order genuine prescribed medications and healthcare essentials with reliable home delivery.",
    link: "/medicine-order",
  },
  {
    icon: FaHandHoldingHeart,
    title: "Home Healthcare & Nursing Care",
    description:
      "Certified home nursing, elder care, clinical procedures, and medical equipment at home.",
    link: "/nursing-care",
  },
  {
    icon: FaPrescriptionBottle,
    title: "MediConnect DigiLocker",
    description:
      "Encrypted digital health records for prescriptions, diagnostic reports, and medical history.",
    link: "/digital-locker",
  },
  {
    icon: FaHeadset,
    title: "24/7 Care Support",
    description:
      "Multi-channel support via phone, WhatsApp, and email for assistance with appointments and orders.",
    link: "/contact",
  },
];

export default function ServicesPage() {
  const [mainServices, setMainServices] = useState(fallbackMainServices);
  const [supportiveTools, setSupportiveTools] = useState([]);
  const [headerData, setHeaderData] = useState({
    title: "COMPLETE CARE ECOSYSTEM",
    heading: "Practical Care, Organised Clearly",
    subheading: "From doctor consultations and diagnostics to medicines, records, and ongoing support — all connected in one place."
  });

  useEffect(() => {
    async function fetchServices() {
      try {
        const res = await fetch("/api/cms/services");
        const json = await res.json();
        if (json.success && json.data && json.data.length > 0) {
          const active = json.data.filter(s => s.status === "active").sort((a,b)=>a.display_order - b.display_order);
          if (active.length > 0) {
            setMainServices(active.map(s => ({
              icon: iconMap[s.icon_name] || FaUserMd,
              title: s.title,
              description: s.description,
              link: s.link || `/website/services/${s.slug}`,
              img: s.image || s.icon
            })));
          }
        }
      } catch (e) {
        console.error("Failed to load CMS services", e);
      }
    }
    async function fetchSupportiveTools() {
      try {
        const res = await fetch("/api/cms/supportive-tools");
        const json = await res.json();
        if (json.success && json.data && json.data.length > 0) {
          const active = json.data.filter(s => s.status === "active").sort((a,b)=>a.display_order - b.display_order);
          setSupportiveTools(active.map(s => ({
            id: s.id,
            icon: iconMap[s.icon_name] || FaHeartbeat,
            title: s.title,
            description: s.description,
            link: `/website/supportive-tools/${s.slug}`,
            img: s.image
          })));
        }
      } catch (e) {
        console.error("Failed to load generic tools", e);
      }
    }
    async function fetchHeaders() {
      try {
        const res = await fetch("/api/cms/section-headers?page=services");
        const json = await res.json();
        if (json.success && json.data && json.data.heading) {
          setHeaderData({
            title: json.data.title || "COMPLETE CARE ECOSYSTEM",
            heading: json.data.heading,
            subheading: json.data.subheading || ""
          });
        }
      } catch (e) {
        console.error("Failed to load CMS headers", e);
      }
    }
    fetchServices();
    fetchSupportiveTools();
    fetchHeaders();
  }, []);

  const displayTools = supportiveTools.length > 0 ? supportiveTools : [
    {
      icon: FaHeartbeat,
      title: "Guided Symptom Check",
      description:
        "A guided tool to organize your symptoms before consulting a certified doctor.",
      link: "/coming-soon",
    },
    {
      icon: FaChartLine,
      title: "Health Insights & Trends",
      description:
        "Contextual summaries and diagnostic trends to support doctor-led clinical decisions.",
      link: "/coming-soon",
    },
  ];

  const features = [
    {
      icon: FaShieldAlt,
      title: "Secure & Encrypted",
      description:
        "Bank-grade security and ABDM compliance to protect sensitive clinical data.",
    },
    {
      icon: FaMobileAlt,
      title: "Mobile Optimized",
      description:
        "Seamless access across smartphones, tablets, and desktop browsers.",
    },
    {
      icon: SiAntdesign,
      title: "Doctor-Led Workflow",
      description:
        "Clear care pathways verified by registered medical practitioners.",
    },
    {
      icon: FaBrain,
      title: "Continuous Care",
      description:
        "Longitudinal health records that keep every doctor visit context-aware.",
    },
  ];

  return (
    <div className="min-h-screen bg-white pb-20 w-full overflow-x-hidden">
      {/* 1. HERO HEADER */}
      <section className="bg-[#F7FAFC] border-b border-[#DCE6EB] py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[11px] sm:text-xs font-bold tracking-widest text-[#1677A8] uppercase mb-2">
            {headerData.title || "COMPLETE CARE ECOSYSTEM"}
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-bold text-[#0B3A5B] tracking-tight mb-3">
            {headerData.heading || "Practical Care, Organised Clearly"}
          </h1>
          <p className="text-sm sm:text-base text-[#607580] max-w-2xl mx-auto leading-relaxed">
            {headerData.subheading || "From doctor consultations and lab tests to medicines and health records, mediconnect.fit helps you access essential care in one connected place."}
          </p>
        </div>
      </section>

      {/* 2. MAIN SERVICES CONTAINER */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-16">
        {/* Main Core Services Grid */}
        <div>
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="text-[11px] sm:text-xs font-bold tracking-widest text-[#1677A8] uppercase mb-1.5">
              PRIMARY HEALTHCARE SERVICES
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0B3A5B] tracking-tight">
              Essential Care You Can Rely On
            </h2>
            <p className="text-xs sm:text-sm text-[#607580] mt-1.5 leading-relaxed">
              Transparent, accessible medical services delivered with verified practitioners.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mainServices.map((service, index) => (
              <ServiceCard key={index} {...service} delay={150 + index * 50} />
            ))}
          </div>
        </div>

        {/* Supportive Tools Grid */}
        <div className="pt-6 border-t border-[#DCE6EB]">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="text-[11px] sm:text-xs font-bold tracking-widest text-[#1677A8] uppercase mb-1.5">
              SUPPORTIVE CLINICAL TOOLS
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0B3A5B] tracking-tight">
              Helpful Tools Around Your Care
            </h2>
            <p className="text-xs sm:text-sm text-[#607580] mt-1.5 leading-relaxed">
              Guided symptom checks and diagnostic trends designed to assist doctor consultations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayTools.map((tool, index) => (
              <ServiceCard key={tool.id || index} {...tool} delay={150 + index * 50} />
            ))}
          </div>
        </div>

        {/* Platform Advantages */}
        <AnimateIn delay={300}>
          <div className="rounded-3xl border border-[#DCE6EB] bg-[#F7FAFC] p-8 md:p-12 shadow-2xs">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <p className="text-[11px] sm:text-xs font-bold tracking-widest text-[#1677A8] uppercase mb-1.5">
                PLATFORM CAPABILITIES
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#0B3A5B] tracking-tight">
                Why Choose MediConnect.fit
              </h2>
              <p className="text-xs sm:text-sm text-[#607580] mt-1.5 leading-relaxed">
                Combining digital accessibility with strict medical standards and patient safety.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {features.map((feature, index) => (
                <FeatureHighlight key={index} {...feature} />
              ))}
            </div>
          </div>
        </AnimateIn>

        {/* Institutional Medical Notice */}
        <AnimateIn delay={400}>
          <div className="max-w-3xl mx-auto text-center p-6 rounded-2xl bg-white border border-[#DCE6EB] shadow-2xs">
            <p className="text-xs text-[#607580] leading-relaxed">
              MediConnect.fit services are governed by Indian medical regulations and the NMC Telemedicine Practice Guidelines. Diagnostic tests and medicine dispensing are fulfilled through licensed partner diagnostic centers and certified pharmacies.
            </p>
          </div>
        </AnimateIn>
      </div>
    </div>
  );
}
