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
  const isComingSoon = title.toLowerCase().includes("abha") || title.toLowerCase().includes("digital health");
  let actualLink = isComingSoon ? "/coming-soon" : link;
  if (!isComingSoon) {
    if (actualLink.includes("nursing-care") || actualLink.includes("home-care")) {
      actualLink = "/nursing-care";
    } else if (actualLink.startsWith("/website")) {
      actualLink = actualLink.replace("/website", "");
    }
  }

  return (
    <AnimateIn delay={delay} className="w-full">
      <Link href={actualLink} className="block h-full">
        <div className="relative h-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-[#0067A1]/30 transition-all duration-200">
          {isComingSoon && (
            <div className="absolute top-4 right-4 bg-orange-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full animate-pulse uppercase tracking-wider">
              Coming Soon
            </div>
          )}
          <div className="mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#0067A1] overflow-hidden">
              {img ? (
                 <img src={img} className="w-full h-full object-cover" alt={title} />
              ) : (
                 Icon ? <Icon className="h-8 w-8 text-white" /> : <FaUserMd className="h-8 w-8 text-white" />
              )}
            </div>
          </div>
          <h3 className="mb-3 text-xl font-bold text-[#003358]">{title}</h3>
          <p className="mb-4 text-sm leading-relaxed text-gray-600">
            {description}
          </p>
          <div className="mt-4 border-t border-gray-100 pt-4 mt-auto">
            <span className="inline-flex items-center text-sm font-semibold text-[#0067A1]">
              Explore Service
              <svg
                className="ml-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </span>
          </div>
        </div>
      </Link>
    </AnimateIn>
  );
};

const FeatureHighlight = ({ icon: Icon, title, description }) => (
  <div className="relative">
    <div className="relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#0067A1] text-white">
        <Icon className="h-6 w-6" />
      </div>
      <h4 className="mb-2 text-lg font-semibold text-[#003358]">{title}</h4>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  </div>
);

const fallbackMainServices = [
  {
    icon: FaUserMd,
    title: "Doctor Consultations",
    description:
      "HD video consultations and in-clinic visits with verified specialists across key specialties.",
    link: "/website/services/doctor-consultations",
  },
  {
    icon: FaSearch,
    title: "Lab Tests",
    description:
      "Book diagnostic lab tests with digital reports. Sample collection available where applicable.",
    link: "/website/services/lab-tests",
  },
  {
    icon: FaShoppingCart,
    title: "Medicine Delivery",
    description:
      "Order prescribed medicines from trusted pharmacy partners with convenient delivery options.",
    link: "/website/services/pharmacy",
  },
  {
    icon: FaPrescriptionBottle,
    title: "Digital Health Records",
    description:
      "ABHA-supportive storage for prescriptions, reports and medical records so everything stays organised.",
    link: "/website/coming-soon",
  },
  {
    icon: FaCalendarCheck,
    title: "Appointments & Follow-Ups",
    description:
      "Scheduling, reminders and simple follow-up management across your care journey.",
    link: "/website/coming-soon",
  },
  {
    icon: FaHeadset,
    title: "Patient Support",
    description:
      "Help with bookings, basic questions and navigation across your services.",
    link: "/website/coming-soon",
  },
];

export default function ServicesPage() {
  const [mainServices, setMainServices] = useState(fallbackMainServices);
  const [supportiveTools, setSupportiveTools] = useState([]);
  const [headerData, setHeaderData] = useState({
     title: "COMPLETE CARE ECOSYSTEM",
     heading: "Practical Care, Organised Clearly",
     subheading: "Doctor consultations, lab tests, medicines, records and support services that patients and families use most often."
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

  // Fallback Supportive tools if none loaded
  const displayTools = supportiveTools.length > 0 ? supportiveTools : [
    {
      icon: FaHeartbeat,
      title: "Guided Symptom Check",
      description:
        "A guided way to describe your concern and understand which doctor or service may be relevant.",
      link: "/website/coming-soon",
    },
    {
      icon: FaChartLine,
      title: "Health Insights & Trends",
      description:
        "Contextual summaries and trends around your reports to support doctor-led decisions.",
      link: "/website/coming-soon",
    },
  ];

  const features = [
    {
      icon: FaShieldAlt,
      title: "Secure & Private",
      description:
        "End-to-end encryption for all your health data and communications.",
    },
    {
      icon: FaMobileAlt,
      title: "Mobile First",
      description:
        "Access all services on-the-go with our mobile-optimized platform.",
    },
    {
      icon: SiAntdesign,
      title: "Intuitive Design",
      description:
        "User-friendly interface that makes healthcare management simple.",
    },
    {
      icon: FaBrain,
      title: "Smart Technology",
      description:
        "Advanced algorithms for personalized health recommendations.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F6F8FA]">
      {/* Hero Section (compact, primary background) */}
      <div className="mb-12 md:mb-16  bg-[#0067A1] px-6 py-10 md:px-10 md:py-12 text-center text-white">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
          <FaHeartbeat className="h-9 w-9 text-white" />
        </div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3">
          Complete Healthcare Services, Organised Clearly
        </h1>
        <p className="mt-2 text-sm md:text-base text-white/80 max-w-2xl mx-auto">
          From doctor consultations and lab tests to medicines and health
          records, mediconnect.fit helps you access essential care in one connected
          place.
        </p>
      </div>
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-10">
        {/* Main Services Grid - Practical care first (Layer 1) */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <div className="mb-4 inline-block rounded-full bg-[#0067A1]/5 px-6 py-2">
              <span className="text-sm font-semibold text-[#0067A1]">
                {headerData.title}
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {headerData.heading}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {headerData.subheading}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mainServices.map((service, index) => (
              <ServiceCard key={index} {...service} delay={200 + index * 100} />
            ))}
          </div>
        </div>

        {/* Supportive Tools Grid - grouped separately */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <div className="inline-block px-6 py-2 rounded-full bg-[#0067A1]/5 mb-4">
              <span className="text-sm font-semibold text-[#0067A1]">
                SUPPORTIVE TOOLS
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Helpful tools around your care
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Features like guided symptom checks and health insights
              are designed as helpers around doctor-led care.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {displayTools.map((tool, index) => (
              <ServiceCard key={tool.id || index} {...tool} delay={200 + index * 100} />
            ))}
          </div>
        </div>

        {/* Features Section */}
        <AnimateIn delay={400} className="mb-20">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 md:p-12">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Why Choose <span className="text-[#0067A1]">Our Platform</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                We combine innovative technology with healthcare expertise for
                exceptional service
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <FeatureHighlight key={index} {...feature} />
              ))}
            </div>
          </div>
        </AnimateIn>

        {/* Institutional note instead of marketing stats/CTA */}
        <AnimateIn delay={600} className="mb-12">
          <div className="max-w-3xl mx-auto text-center text-sm md:text-base text-gray-600">
            <p>
              mediconnect.fit is being introduced in phases. Service availability,
              partners and operating hours may vary by location and over time.
              Patients should always rely on medical advice and local healthcare
              services where needed.
            </p>
          </div>
        </AnimateIn>
      </div>
    </div>
  );
}
