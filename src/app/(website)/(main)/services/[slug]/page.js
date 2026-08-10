"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { FaArrowLeft, FaHeartbeat } from "react-icons/fa";
import Link from "next/link";

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
          router.push("/website/services");
          return;
        }

        setService(json.data);

        // 2. Fetch other services for sidebar links
        const resAll = await fetch("/api/cms/services");
        const jsonAll = await resAll.json();
        if (jsonAll.success && jsonAll.data) {
          const others = jsonAll.data
            .filter(s => s.status === "active" && s.slug !== slug)
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
      <div className="min-h-screen bg-[#F6F8FA] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-[#0067A1] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-500 font-medium">Loading service details...</p>
        </div>
      </div>
    );
  }

  if (!service) return null;

  return (
    <div className="min-h-screen bg-[#F6F8FA]">
      {/* Hero Banner */}
      <div className="bg-[#0067A1] px-6 py-10 md:px-10 md:py-14 text-center text-white">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
            {service.icon ? (
              <img src={service.icon} alt={service.title} className="h-9 w-9 object-contain" />
            ) : (
              <FaHeartbeat className="h-9 w-9 text-white" />
            )}
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3">
            {service.title}
          </h1>
          <p className="mt-2 text-sm md:text-base text-white/90 max-w-2xl mx-auto">
            {service.description}
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <Link href="/services" className="inline-flex items-center text-sm text-[#0067A1] hover:underline mb-8">
          <FaArrowLeft className="mr-2 h-3 w-3" />
          Back to All Services
        </Link>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="lg:w-2/3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10 overflow-hidden prose prose-emerald max-w-none whitespace-pre-wrap prose-headings:text-[#003358] prose-h2:text-2xl prose-h2:md:text-3xl prose-h2:font-bold prose-h2:border-b prose-h2:pb-3 prose-h2:mt-10 prose-h2:first:mt-0 prose-a:text-[#0067A1] prose-img:rounded-xl">
              <div dangerouslySetInnerHTML={{ __html: (service.detailed_content || "<h2>Overview</h2><p>Detailed content for this service is being prepared by our team.</p>").replace(/&nbsp;/g, ' ') }} />
              
              {/* Inline Action Banner */}
              {(slug === "nursing-care" || slug === "medical-equipment") && (
                <div className="mt-8 p-6 bg-[#0067A1]/5 rounded-xl border border-[#0067A1]/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-gray-900 text-base">Ready to request this service?</h4>
                    <p className="text-sm text-gray-600 mt-1">Submit your details and our coordinator team will contact you.</p>
                  </div>
                  <Link
                    href={slug === "nursing-care" ? "/nursing-care" : "/medical-equipment"}
                    className="px-5 py-2.5 bg-[#0067A1] text-white font-semibold text-sm rounded-xl hover:bg-[#004F7C] transition-colors whitespace-nowrap no-underline"
                  >
                    {slug === "nursing-care" ? "Request Nursing Care" : "Request Equipment"}
                  </Link>
                </div>
              )}
            </div>

            {/* Compliance / Disclaimer */}
            <div className="bg-amber-50 rounded-xl p-5 border border-amber-100 mt-8">
              <h4 className="font-bold text-amber-800 text-sm uppercase tracking-wide mb-1">Important Note</h4>
              <p className="text-amber-700/80 text-sm leading-relaxed">
                mediconnect.fit is being introduced in phases. Service availability, partners and operating hours may vary by location and over time. Patients should always rely on medical advice and local healthcare services where needed.
              </p>
            </div>
          </div>

          {/* Sidebar: Other Services */}
          <div className="lg:w-1/3">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24">
              <h3 className="text-lg font-bold text-gray-900 mb-5 border-b pb-3 border-gray-100">Other Services</h3>
              <div className="space-y-3">
                {otherServices.map((s) => (
                  <Link
                    key={s.id}
                    href={s.link || `/services/${s.slug}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#0067A1]/5 hover:border-[#0067A1]/20 border border-transparent transition-all group"
                  >
                    {s.icon ? (
                      <div className="w-10 h-10 rounded-lg bg-[#0067A1] flex items-center justify-center shrink-0 overflow-hidden">
                        <img src={s.icon} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[#0067A1] flex items-center justify-center shrink-0">
                        <FaHeartbeat className="h-5 w-5 text-white" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-gray-900 group-hover:text-[#0067A1] transition-colors truncate">{s.title}</p>
                      <p className="text-xs text-gray-500 truncate">{s.description}</p>
                    </div>
                  </Link>
                ))}
              </div>

              {/* CTA */}
              <div className="mt-6 pt-5 border-t border-gray-100">
                {slug === "nursing-care" ? (
                  <Link
                    href="/nursing-care"
                    className="block w-full text-center bg-[#0067A1] hover:bg-[#004F7C] text-white py-3 rounded-xl font-semibold shadow transition-colors"
                  >
                    Request Nursing Care
                  </Link>
                ) : slug === "medical-equipment" ? (
                  <Link
                    href="/medical-equipment"
                    className="block w-full text-center bg-[#0067A1] hover:bg-[#004F7C] text-white py-3 rounded-xl font-semibold shadow transition-colors"
                  >
                    Request Medical Equipment
                  </Link>
                ) : (
                  <Link
                    href="/doctors"
                    className="block w-full text-center bg-[#0067A1] hover:bg-[#004F7C] text-white py-3 rounded-xl font-semibold shadow transition-colors"
                  >
                    Find a Doctor
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
