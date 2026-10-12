"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FaUserMd,
  FaArrowLeft,
  FaArrowRight,
  FaCheckCircle,
  FaShieldAlt,
  FaPhone,
  FaCalendarCheck,
  FaMapMarkerAlt
} from "react-icons/fa";
import Link from "next/link";

// Shared logic to normalize specialty string
const normalizeSpecialty = (value) => {
  if (!value) return "General Physician";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "General Physician";
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.join(", ");
      if (typeof parsed === "string") return parsed;
    } catch {}
    if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("(") && trimmed.endsWith(")"))) {
      const inner = trimmed.slice(1, -1);
      const parts = inner.split(",").map((p) => p.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
      if (parts.length) return parts.join(", ");
      return "General Physician";
    }
    return trimmed;
  }
  return String(value);
};

const cleanClinicAddress = (address) => {
  if (!address) return "India";
  const parts = address.split(',').map(p => p.trim());
  
  const genericParts = parts.filter(p => {
    if (/^\d+$/g.test(p)) return false;
    if (/^(flat|plot|house|rz|shop|hno|h\sno|room|ward|office|building|pincode)\b/i.test(p)) return false;
    return p.length > 2;
  });

  const lastParts = genericParts.length > 0 ? genericParts.slice(-2) : parts.slice(-2);
  
  return lastParts
    .map(p => p.replace(/^\d+[-\w\/]*\s*/g, ''))
    .map(p => p.replace(/^(opposite|opp\.|near|facing)\s+[\w\s]+/gi, ''))
    .map(p => p.trim())
    .filter(p => p.length > 2)
    .join(', ') || "India";
};

export default function ProblemEducationPage() {
  const { slug } = useParams();
  const router = useRouter();

  const [condition, setCondition] = useState(null);
  const [relatedConditions, setRelatedConditions] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // 1. Fetch condition details
        const resCond = await fetch(`/api/cms/conditions/${slug}`);
        const jsonCond = await resCond.json();
        
        if (!jsonCond.success || !jsonCond.data) {
           router.push("/doctors");
           return;
        }
        
        const currentCondition = jsonCond.data;
        setCondition(currentCondition);

        // 2. Fetch related conditions
        const resAllCond = await fetch("/api/cms/conditions?active_only=true");
        const jsonAllCond = await resAllCond.json();
        if (jsonAllCond.success && jsonAllCond.data) {
           const others = jsonAllCond.data
             .filter(c => c.slug !== slug)
             .sort(() => 0.5 - Math.random())
             .slice(0, 4);
           setRelatedConditions(others);
        }

        // 3. Fetch matched doctors based on Recommended Specialty
        const resDocs = await fetch("/api/doctors/get?limit=100");
        const jsonDocs = await resDocs.json();
        const allDocs = Array.isArray(jsonDocs?.data) ? jsonDocs.data : [];
        
        const specialtyTarget = (currentCondition.recommended_specialty || "General Physician").toLowerCase();
        
        const mappedDocs = allDocs
          .filter((doc) => {
            const details = doc.doctor_details || {};
            const hasHomeSlots = details.home_slots && Object.keys(details.home_slots).length > 0;
            const hasClinicSlots = details.clinic_slots && Object.keys(details.clinic_slots).length > 0;
            const hasAvailability = hasHomeSlots || hasClinicSlots;

            if (!(details.onboarding_status === "approved" || doc.status === 1) || !hasAvailability) return false;
            
            const docSpec = normalizeSpecialty(details.specialization).toLowerCase();
            return docSpec.includes(specialtyTarget) || specialtyTarget.includes(docSpec);
          })
          .map((doc) => {
            const details = doc.doctor_details || {};
            const rawFee = details.consultation_fee;
            const numericFee = typeof rawFee === "number" ? rawFee : rawFee ? Number(rawFee) : NaN;

            let profileImage = doc.profile_picture || "";
            if (profileImage && profileImage.includes("::text")) {
              const match = profileImage.match(/'([^']+)'/);
              profileImage = match ? match[1] : "";
            }

            return {
              id: doc.id,
              name: details.full_name || details.name || "Doctor",
              specialty: normalizeSpecialty(details.specialization),
              rating: typeof details.rating === "number" ? details.rating : null,
              reviews: typeof details.total_reviews === "number" && details.total_reviews > 0 ? details.total_reviews : null,
              location: cleanClinicAddress(details.clinic_address),
              experience: typeof details.experience_years === "number" && details.experience_years > 0 ? details.experience_years : null,
              fee: Number.isFinite(numericFee) && numericFee > 0 ? numericFee : null,
              profileImage: profileImage,
            };
          });
          
        setDoctors(mappedDocs);

      } catch (err) {
        console.error("Failed to load problem data", err);
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
            Loading medical information...
          </p>
        </div>
      </div>
    );
  }

  if (!condition) return null;

  const targetSpecialtyUrl = `/doctors?specialty=${encodeURIComponent(condition.recommended_specialty || "General Physician")}`;

  return (
    <div className="min-h-screen bg-[#F7FAFC]">
      
      {/* 1. HERO HEADER */}
      <section className="bg-gradient-to-b from-[#F7FAFC] to-white border-b border-[#DCE6EB] py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
          <p className="text-[11px] sm:text-xs font-bold tracking-widest text-[#1677A8] uppercase mb-1.5">
            HEALTH CONDITION GUIDE
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#0B3A5B] tracking-tight mb-4">
            {condition.seo_title || condition.title}
          </h1>
          <p className="text-base sm:text-lg text-[#607580] leading-relaxed max-w-2xl mx-auto">
            {condition.short_description || `Learn about the symptoms, causes, and specialist treatments for ${condition.title}.`}
          </p>
          {condition.recommended_specialty && (
            <div className="mt-6 flex justify-center">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E8F2F7] border border-[#DCE6EB] text-xs font-bold text-[#1677A8]">
                <FaUserMd className="w-3.5 h-3.5" />
                Recommended Specialty: {condition.recommended_specialty}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* 2. MAIN SECTION */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <Link
          href="/doctors"
          className="inline-flex items-center text-xs sm:text-sm font-semibold text-[#1677A8] hover:text-[#0B3A5B] transition-colors mb-6 group"
        >
          <FaArrowLeft className="mr-2 h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Specialists Directory
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
          {/* Left Column: Rich Text Content */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white rounded-2xl border border-[#DCE6EB] p-6 sm:p-8 lg:p-10 shadow-2xs">
              {/* Detailed CMS Content */}
              <div
                className="prose prose-slate max-w-none 
                  prose-headings:text-[#0B3A5B] prose-headings:font-extrabold 
                  prose-h2:text-2xl prose-h2:md:text-3xl prose-h2:border-b prose-h2:border-[#DCE6EB] prose-h2:pb-3 prose-h2:mt-8 prose-h2:first:mt-0 
                  prose-h3:text-xl prose-h3:text-[#0B3A5B] 
                  prose-p:text-[#18303D] prose-p:leading-relaxed 
                  prose-a:text-[#1677A8] prose-a:font-semibold 
                  prose-strong:text-[#0B3A5B] 
                  prose-ul:text-[#18303D] prose-li:my-1 
                  prose-img:rounded-2xl [&_*]:!whitespace-normal"
                dangerouslySetInnerHTML={{
                  __html: (
                    condition.detailed_content ||
                    "<h2>Overview</h2><p>Clinical guidance for this health concern is being curated by our medical researchers.</p>"
                  ).replace(/&nbsp;/g, " "),
                }}
              />
            </div>

            {/* Medical Disclaimer */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#DCE6EB] flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#E8F2F7] text-[#1677A8] flex items-center justify-center shrink-0 mt-0.5">
                <FaShieldAlt className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-[#0B3A5B] text-xs uppercase tracking-wider mb-1">
                  Medical Disclaimer
                </h4>
                <p className="text-xs sm:text-sm text-[#607580] leading-relaxed">
                  The information on this page is for educational and clinical guidance only and does not substitute professional medical advice. Diagnosis and treatment decisions must always be made in consultation with a qualified doctor.
                </p>
              </div>
            </div>

            {/* Related Health Conditions */}
            {relatedConditions.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#DCE6EB] p-6 sm:p-7 shadow-2xs">
                <h3 className="text-base sm:text-lg font-extrabold text-[#0B3A5B] mb-4">
                  Related Health Concerns
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  {relatedConditions.map((related) => (
                    <Link
                      key={related.id}
                      href={`/problem/${related.slug}`}
                      className="bg-[#F7FAFC] p-3.5 rounded-xl border border-[#DCE6EB] hover:border-[#1677A8] hover:bg-white hover:shadow-2xs transition-all flex flex-col items-center text-center group"
                    >
                      {related.icon_name && (
                        <div className="w-11 h-11 rounded-full bg-white border border-[#DCE6EB] flex items-center justify-center p-1.5 mb-2 group-hover:scale-105 transition-transform">
                          <img
                            src={related.icon_name}
                            alt={related.title}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                      <span className="text-xs font-bold text-[#0B3A5B] group-hover:text-[#1677A8] transition-colors line-clamp-1">
                        {related.title}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: CTA & Recommended Doctors */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Consultation CTA Block */}
            <div className="bg-[#0B3A5B] rounded-2xl p-6 sm:p-7 text-white shadow-2xs relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <FaUserMd className="text-white h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold">Consult a Specialist</h3>
                </div>
                <p className="text-white/80 text-xs sm:text-sm mb-5 leading-relaxed">
                  Don&apos;t delay addressing {condition.title}. Connect with verified <span className="font-bold text-white">{condition.recommended_specialty || "specialist"}</span> doctors for an accurate diagnosis and treatment plan.
                </p>
                <Link
                  href={targetSpecialtyUrl}
                  className="w-full bg-white hover:bg-[#F7FAFC] text-[#0B3A5B] px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors"
                >
                  Find Doctor <FaArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Doctor List (Mapped by Specialty) */}
            <div id="doctor-list" className="bg-white rounded-2xl border border-[#DCE6EB] shadow-2xs p-6 sticky top-24">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#DCE6EB]">
                <h3 className="text-base font-extrabold text-[#0B3A5B]">
                  Suggested Doctors
                </h3>
                {condition.recommended_specialty && (
                  <span className="text-[11px] font-bold bg-[#E8F2F7] text-[#1677A8] px-2.5 py-0.5 rounded-full border border-[#DCE6EB]">
                    {condition.recommended_specialty}
                  </span>
                )}
              </div>

              {doctors.length === 0 ? (
                <div className="text-center py-6 bg-[#F7FAFC] rounded-xl border border-dashed border-[#DCE6EB] p-4">
                  <FaUserMd className="mx-auto text-[#607580] text-3xl mb-2" />
                  <p className="text-xs text-[#607580]">
                    No specialists currently available for immediate online slot. Explore verified doctors in our care network.
                  </p>
                  <Link
                    href="/doctors"
                    className="inline-block mt-3 text-xs font-bold text-[#1677A8] hover:underline"
                  >
                    View All Doctors
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {doctors.slice(0, 3).map((doctor) => (
                    <Link
                      key={doctor.id}
                      href={`/doctor/${doctor.id}`}
                      className="group flex items-center gap-3.5 p-3 rounded-xl border border-[#DCE6EB] hover:border-[#1677A8]/50 hover:shadow-2xs transition-all bg-white"
                    >
                      <div className="relative shrink-0 w-13 h-13 rounded-xl overflow-hidden bg-[#F7FAFC] border border-[#DCE6EB]">
                        <img
                          src={doctor.profileImage || "/dr.png"}
                          alt={doctor.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "flex";
                          }}
                        />
                        <div className="hidden absolute inset-0 bg-[#E8F2F7] items-center justify-center font-bold text-[#1677A8]">
                          {doctor.name.charAt(0)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <h4 className="font-bold text-[#0B3A5B] text-xs sm:text-sm truncate group-hover:text-[#1677A8] transition-colors">
                            {doctor.name}
                          </h4>
                          <FaCheckCircle className="w-3 h-3 text-[#1677A8] shrink-0" />
                        </div>
                        <p className="text-[11px] text-[#607580] truncate mt-0.5">
                          {doctor.specialty}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[11px]">
                          <span className="font-semibold text-emerald-700">
                            {doctor.experience || 5}+ Yrs
                          </span>
                          {doctor.fee && (
                            <span className="text-[#607580]">
                              • ₹{doctor.fee}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}

                  {doctors.length > 3 && (
                    <Link
                      href={targetSpecialtyUrl}
                      className="block text-center w-full py-2.5 text-xs font-semibold text-[#1677A8] bg-[#E8F2F7] hover:bg-[#1677A8]/15 rounded-xl transition-colors mt-2"
                    >
                      View All Specialists
                    </Link>
                  )}
                </div>
              )}

              {/* Direct Care Helpline */}
              <div className="mt-5 pt-4 border-t border-[#DCE6EB]/60 flex items-center gap-3 text-xs text-[#607580]">
                <div className="w-8 h-8 rounded-lg bg-[#E8F2F7] text-[#1677A8] flex items-center justify-center shrink-0">
                  <FaPhone className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[#0B3A5B]">Need Guidance?</div>
                  <div className="text-[11px] text-[#607580]">+91 72890-43888 (9 AM - 9 PM)</div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
