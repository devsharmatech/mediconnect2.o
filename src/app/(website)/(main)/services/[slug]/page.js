"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FaArrowLeft,
  FaHeartbeat,
  FaFlask,
  FaUserMd,
  FaPills,
  FaHandHoldingHeart,
  FaBed,
  FaBrain,
  FaPhone,
  FaCalendarCheck,
  FaShieldAlt
} from "react-icons/fa";
import Link from "next/link";

const iconMap = {
  "doctor-consultations": FaUserMd,
  "lab-service": FaFlask,
  "pharmacy": FaPills,
  "nursing-care": FaHandHoldingHeart,
  "medical-equipment": FaBed,
  "wellness-modules": FaBrain,
};

export default function ServiceDetailPage() {
  const { slug } = useParams();
  const router = useRouter();

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otherServices, setOtherServices] = useState([]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // 1. Fetch service by slug
        const res = await fetch(`/api/cms/services/${slug}`);
        const json = await res.json();

        if (!json.success || !json.data) {
          router.push("/services");
          return;
        }

        setService(json.data);

        // 2. Fetch other services for sidebar links
        const resAll = await fetch("/api/cms/services");
        const jsonAll = await resAll.json();
        if (jsonAll.success && jsonAll.data) {
          const others = jsonAll.data
            .filter((s) => s.status === "active" && s.slug !== slug)
            .sort((a, b) => a.display_order - b.display_order)
            .slice(0, 6);
          setOtherServices(others);
        }
      } catch (err) {
        console.error("Failed to load service data", err);
      } finally {
        setLoading(false);
      }
    }

    if (slug) fetchData();
  }, [slug, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7FAFC] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-[#0B3A5B] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#607580]">
            Loading service...
          </p>
        </div>
      </div>
    );
  }

  if (!service) return null;

  const ServiceIcon = iconMap[slug] || FaHeartbeat;

  const getServiceCta = () => {
    switch (slug) {
      case "lab-service":
        return {
          title: "Book Diagnostic Tests & Health Packages",
          description: "Search tests, compare accredited lab prices, or schedule verified home sample collection.",
          link: "/services/lab-tests",
          buttonText: "Book Lab Test",
        };
      case "doctor-consultations":
        return {
          title: "Consult Verified Doctors Online",
          description: "Connect with verified specialists across 30+ medical specialties for online or clinic consultations.",
          link: "/doctors",
          buttonText: "Find Doctor",
        };
      case "pharmacy":
        return {
          title: "Order Genuine Medicines Online",
          description: "Upload your doctor prescription or explore registered pharmacies with quick home delivery.",
          link: "/medicines",
          buttonText: "Order Medicine",
        };
      case "nursing-care":
        return {
          title: "Request Qualified In-Home Nursing",
          description: "Professional post-operative nursing, wound dressing, and elderly care delivered at home.",
          link: "/nursing-care",
          buttonText: "Request Care",
        };
      case "medical-equipment":
        return {
          title: "Rent or Purchase Medical Equipment",
          description: "Oxygen concentrators, hospital beds, wheelchairs, and vital monitoring equipment.",
          link: "/medical-equipment",
          buttonText: "Request Equipment",
        };
      case "wellness-modules":
        return {
          title: "Interactive Clinical Health Tools",
          description: "Check your BMI, calculate cardiovascular risk, track vitals, and estimate due dates.",
          link: "/services",
          buttonText: "Explore Tools",
        };
      default:
        return {
          title: "Need Assistance With This Service?",
          description: "Our dedicated care coordinators are ready to help guide you through the process.",
          link: "/contact",
          buttonText: "Contact Us",
        };
    }
  };

  const cta = getServiceCta();

  return (
    <div className="min-h-screen bg-[#F7FAFC]">
      {/* 1. HERO HEADER */}
      <section className="bg-gradient-to-b from-[#F7FAFC] to-white border-b border-[#DCE6EB] py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
          <p className="text-[11px] sm:text-xs font-bold tracking-widest text-[#1677A8] uppercase mb-1.5">
            MEDICONNECT SERVICE
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#0B3A5B] tracking-tight mb-4">
            {service.title}
          </h1>
          <p className="text-base sm:text-lg text-[#607580] leading-relaxed max-w-2xl mx-auto">
            {service.description}
          </p>
        </div>
      </section>

      {/* 2. MAIN CONTENT + SIDEBAR */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <Link
          href="/services"
          className="inline-flex items-center text-xs sm:text-sm font-semibold text-[#1677A8] hover:text-[#0B3A5B] transition-colors mb-6 group"
        >
          <FaArrowLeft className="mr-2 h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Services
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Main Content Column */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-2xl border border-[#DCE6EB] p-6 sm:p-8 lg:p-10 shadow-2xs">
              
              {/* Detailed CMS Content */}
              <div
                className="prose prose-slate max-w-none whitespace-pre-wrap 
                  prose-headings:text-[#0B3A5B] prose-headings:font-extrabold 
                  prose-h2:text-2xl prose-h2:md:text-3xl prose-h2:border-b prose-h2:border-[#DCE6EB] prose-h2:pb-3 prose-h2:mt-8 prose-h2:first:mt-0 
                  prose-h3:text-xl prose-h3:text-[#0B3A5B] 
                  prose-p:text-[#18303D] prose-p:leading-relaxed 
                  prose-a:text-[#1677A8] prose-a:font-semibold 
                  prose-strong:text-[#0B3A5B] 
                  prose-ul:text-[#18303D] prose-li:my-1 
                  prose-img:rounded-2xl"
                dangerouslySetInnerHTML={{
                  __html: (
                    service.detailed_content ||
                    "<h2>Overview</h2><p>Detailed information for this medical service is being curated by our clinical team.</p>"
                  ).replace(/&nbsp;/g, " "),
                }}
              />

              {/* Service Action CTA Box */}
              <div className="mt-10 p-6 rounded-2xl bg-[#F7FAFC] border border-[#DCE6EB] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-[#0B3A5B] text-base sm:text-lg">
                    {cta.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-[#607580] max-w-xl">
                    {cta.description}
                  </p>
                </div>
                <Link
                  href={cta.link}
                  className="px-6 py-3 bg-[#0B3A5B] hover:bg-[#1677A8] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-2xs hover:shadow-xs transition-colors whitespace-nowrap shrink-0"
                >
                  {cta.buttonText}
                </Link>
              </div>
            </div>

            {/* Regulatory & Phased Availability Note */}
            <div className="bg-[#F7FAFC] rounded-2xl p-5 border border-[#DCE6EB] flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-[#E8F2F7] text-[#1677A8] flex items-center justify-center shrink-0 mt-0.5">
                <FaShieldAlt className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-[#0B3A5B] text-xs uppercase tracking-wider mb-1">
                  Clinical Notice
                </h4>
                <p className="text-xs text-[#607580] leading-relaxed">
                  MediConnect services and diagnostic test bookings are verified by registered medical providers. Service operating hours and home phlebotomy coverage may vary according to partner lab schedules in your locality.
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl border border-[#DCE6EB] shadow-2xs p-6 sticky top-24">
              <h3 className="text-base font-extrabold text-[#0B3A5B] pb-3 mb-4 border-b border-[#DCE6EB]">
                Other Healthcare Services
              </h3>

              <div className="space-y-2.5">
                {otherServices.map((s) => {
                  const OtherIcon = iconMap[s.slug] || FaHeartbeat;
                  const targetLink =
                    s.slug === "lab-service"
                      ? "/services/lab-tests"
                      : s.link || `/services/${s.slug}`;

                  return (
                    <Link
                      key={s.id}
                      href={targetLink}
                      className="flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-[#DCE6EB] hover:bg-[#F7FAFC] transition-all group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#1677A8]/10 text-[#1677A8] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
                        {s.icon ? (
                          <img
                            src={s.icon}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <OtherIcon className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs sm:text-sm text-[#0B3A5B] group-hover:text-[#1677A8] transition-colors truncate">
                          {s.title}
                        </p>
                        <p className="text-[11px] text-[#607580] truncate">
                          {s.description}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Sidebar Quick Action Button */}
              <div className="mt-6 pt-5 border-t border-[#DCE6EB]">
                <Link
                  href={cta.link}
                  className="block w-full text-center bg-[#0B3A5B] hover:bg-[#1677A8] text-white py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold shadow-2xs hover:shadow-xs transition-colors"
                >
                  {cta.buttonText}
                </Link>
              </div>

              {/* Direct Help Card */}
              <div className="mt-4 pt-4 border-t border-[#DCE6EB]/60 flex items-center gap-3 text-xs text-[#607580]">
                <div className="w-9 h-9 rounded-xl bg-[#E8F2F7] text-[#1677A8] flex items-center justify-center shrink-0">
                  <FaPhone className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[#0B3A5B]">Care Support</div>
                  <div className="text-[11px] text-[#607580]">
                    +91 72890-43888 (9 AM - 9 PM)
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
