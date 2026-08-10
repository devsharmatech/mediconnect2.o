"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default function ComplianceStrip() {
  const [logos, setLogos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogos = async () => {
      try {
        const res = await fetch("/api/cms/compliance-logos");
        const result = await res.json();
        if (result.success && result.data) {
          setLogos(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch compliance logos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogos();
  }, []);

  if (loading || logos.length === 0) return null;

  return (
    <div className="w-full bg-white border-t border-gray-100 py-8 lg:py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex flex-col items-center justify-center mb-8 text-center">
           <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold uppercase tracking-widest mb-3">
             <CheckCircle className="w-3.5 h-3.5" />
             Trusted & Certified
           </div>
           <h2 className="text-xl md:text-2xl font-bold text-[#0067A1]">
             Our Certifications & Partnerships
           </h2>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 lg:gap-16">
          {logos.map((logo) => {
            const content = (
              <div className="flex flex-col items-center justify-center text-center group cursor-pointer transition-transform hover:-translate-y-1">
                {logo.image && (
                  <div className="h-16 md:h-20 max-w-[160px] flex items-center justify-center mb-3 grayscale group-hover:grayscale-0 transition-all duration-300 opacity-80 group-hover:opacity-100">
                    <img 
                      src={logo.image} 
                      alt={logo.name} 
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}
                <h4 className="text-sm font-bold text-gray-900 group-hover:text-[#0067A1] transition-colors">
                  {logo.name}
                </h4>
                {logo.title && (
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    {logo.title}
                  </p>
                )}
              </div>
            );

            if (logo.link) {
              return (
                <Link key={logo.id} href={logo.link} target="_blank" rel="noopener noreferrer">
                  {content}
                </Link>
              );
            }

            return <div key={logo.id}>{content}</div>;
          })}
        </div>

      </div>
    </div>
  );
}
