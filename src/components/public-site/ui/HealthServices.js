"use client";

import { useState, useEffect } from "react";
import {
  FaUserMd,
  FaClinicMedical,
  FaFlask,
  FaPills,
  FaHandHoldingHeart,
  FaBed,
  FaStethoscope,
  FaHeartbeat,
  FaPlusSquare,
  FaSyringe
} from "react-icons/fa";
import Link from "next/link";

const fallbackServices = [
  {
    icon: 'FaUserMd',
    title: "Doctor Consultations",
    description: "HD video consultations and in-clinic visits with verified specialists across key specialties.",
    link: "/website/services/doctor-consultations",
  },
  {
    icon: 'FaFlask',
    title: "Lab Tests",
    description: "Book diagnostic lab tests with digital reports. Sample collection available where applicable.",
    link: "/website/services/lab-tests",
  },
  {
    icon: 'FaPills',
    title: "Medicine Delivery",
    description: "Order prescribed medicines from trusted pharmacy partners with convenient delivery options.",
    link: "/website/services/pharmacy",
  },
  {
    icon: 'FaClinicMedical',
    title: "Digital Health Records",
    description: "Organised, ABHA-supportive storage for prescriptions, reports and medical records.",
    link: "/website/digital-health-records",
  },
  {
    icon: 'FaHandHoldingHeart',
    title: "Nursing & Home Care",
    description: "Essential nursing and support services at home for ongoing care.",
    link: "/website/services/home-care",
  },
  {
    icon: 'FaBed',
    title: "Medical Equipment",
    description: "Access medical equipment for safe and comfortable home use.",
    link: "/website/services/medical-equipment",
  },
];

const iconMap = {
  FaUserMd: <FaUserMd className="text-xl text-white" />,
  FaClinicMedical: <FaClinicMedical className="text-xl text-white" />,
  FaFlask: <FaFlask className="text-xl text-white" />,
  FaPills: <FaPills className="text-xl text-white" />,
  FaHandHoldingHeart: <FaHandHoldingHeart className="text-xl text-white" />,
  FaBed: <FaBed className="text-xl text-white" />,
  FaStethoscope: <FaStethoscope className="text-xl text-white" />,
  FaHeartbeat: <FaHeartbeat className="text-xl text-white" />,
  FaPlusSquare: <FaPlusSquare className="text-xl text-white" />,
  FaSyringe: <FaSyringe className="text-xl text-white" />
};

const HealthServices = () => {
  const [services, setServices] = useState(fallbackServices);
  const [headerData, setHeaderData] = useState({
    title: "Available Now",
    heading: "Access Care, Anytime You Need It",
    subheading: "These services are live and available on mediconnect.fit.",
  });

  useEffect(() => {
    async function fetchServices() {
      try {
        const res = await fetch("/api/cms/services");
        const json = await res.json();
        if (json.success && json.data && json.data.length > 0) {
           const active = json.data.filter(s => s.status === "active").sort((a,b)=>a.display_order - b.display_order);
           if (active.length > 0) {
             setServices(active.map(s => ({
               icon: s.icon_name || 'FaUserMd',
               title: s.title,
               description: s.description,
               link: s.link || '#',
               img: s.image
             })));
           }
        }
      } catch (e) {
        console.error("Failed to load CMS services", e);
      }
    }
    async function fetchHeaders() {
      try {
        const res = await fetch("/api/cms/section-headers?page=services");
        const json = await res.json();
        if (json.success && json.data && json.data.heading) {
            setHeaderData({
               title: json.data.title || "Available Now",
               heading: json.data.heading,
               subheading: json.data.subheading || "These services are live and available on mediconnect.fit."
            });
        }
      } catch (e) {
        console.error("Failed to load CMS headers", e);
      }
    }
    fetchServices();
    fetchHeaders();
  }, []);

  return (
    <section className="py-8 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          {headerData.title && (
            <p className="text-sm font-semibold tracking-wide text-[#0067A1] uppercase mb-2">
              {headerData.title}
            </p>
          )}
          <h2 className="text-3xl font-extrabold text-[#0067A1] sm:text-4xl">
            {headerData.heading}
          </h2>
          {headerData.subheading && (
            <p className="mt-4 text-lg text-gray-600">
              {headerData.subheading}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => {
            const isComingSoon = service.title.toLowerCase().includes("abha") || service.title.toLowerCase().includes("digital health");
            let actualLink = isComingSoon ? "/coming-soon" : service.link;
            if (!isComingSoon) {
              if (actualLink.includes("nursing-care") || actualLink.includes("home-care")) {
                actualLink = "/nursing-care";
              } else if (actualLink.startsWith("/website")) {
                actualLink = actualLink.replace("/website", "");
              }
            }
            
            return (
              <Link
                key={index}
                href={actualLink}
                className="relative rounded-xl border border-gray-200 bg-white p-6 text-left flex flex-col h-full hover:shadow-lg hover:border-[#0067A1]/30 transition-all cursor-pointer"
              >
                {isComingSoon && (
                  <div className="absolute top-4 right-4 bg-orange-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full animate-pulse uppercase tracking-wider">
                    Coming Soon
                  </div>
                )}
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 bg-[#0067A1] overflow-hidden">
                  {service.img ? (
                    <img src={service.img} className="w-full h-full object-cover" alt={service.title} />
                  ) : (
                    iconMap[service.icon] || <FaUserMd className="text-xl text-white" />
                  )}
                </div>
                <h3 className="text-xl font-semibold text-[#003358] mb-2">
                  {service.title}
                </h3>
                <p className="mt-1 text-gray-600 text-sm flex-grow">
                  {service.description}
                </p>
                <span className="mt-4 inline-flex items-center text-sm font-semibold text-[#0067A1]">
                  Learn more
                  <span aria-hidden="true" className="ml-1">
                    &rarr;
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HealthServices;
