"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FaUserMd,
  FaArrowLeft,
  FaArrowRight,
  FaCheckCircle,
  FaShieldAlt,
  FaPhone,
  FaStethoscope,
  FaStar,
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
  const [activeSpecialtyTab, setActiveSpecialtyTab] = useState("all");
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

        // Parse multiple specialties
        const parsedSpecialties = Array.isArray(currentCondition.specialties) && currentCondition.specialties.length > 0
          ? currentCondition.specialties
          : currentCondition.recommended_specialty
          ? currentCondition.recommended_specialty.split(",").map(s => s.trim()).filter(Boolean)
          : ["General Physician"];

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

        // 3. Fetch matched doctors based on ANY of the condition's specialties
        const resDocs = await fetch("/api/doctors/get?limit=100");
        const jsonDocs = await resDocs.json();
        const allDocs = Array.isArray(jsonDocs?.data) ? jsonDocs.data : [];
        
        const mappedDocs = allDocs
          .filter((doc) => {
            const details = doc.doctor_details || {};
            const hasHomeSlots = details.home_slots && Object.keys(details.home_slots).length > 0;
            const hasClinicSlots = details.clinic_slots && Object.keys(details.clinic_slots).length > 0;
            const hasAvailability = hasHomeSlots || hasClinicSlots;

            if (!(details.onboarding_status === "approved" || doc.status === 1) || !hasAvailability) return false;
            
            const docSpec = normalizeSpecialty(details.specialization).toLowerCase();
            return parsedSpecialties.some((spec) => {
              const target = spec.toLowerCase();
              return docSpec.includes(target) || target.includes(docSpec);
            });
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

  // Derived multiple specialties array
  const specialties = useMemo(() => {
    if (!condition) return [];
    if (Array.isArray(condition.specialties) && condition.specialties.length > 0) {
      return condition.specialties;
    }
    if (condition.recommended_specialty) {
      return condition.recommended_specialty.split(",").map(s => s.trim()).filter(Boolean);
    }
    return ["General Physician"];
  }, [condition]);

  // Filter doctors by active specialty tab
  const filteredDoctors = useMemo(() => {
    if (activeSpecialtyTab === "all") return doctors;
    const target = activeSpecialtyTab.toLowerCase();
    return doctors.filter(d => {
      const docSpec = (d.specialty || "").toLowerCase();
      return docSpec.includes(target) || target.includes(docSpec);
    });
  }, [doctors, activeSpecialtyTab]);

  if (loading) {
    return (
      <div className="min-h-[50vh] bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 border-3 border-[#0067A1] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Loading medical information...
          </p>
        </div>
      </div>
    );
  }

  if (!condition) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      
      {/* 1. COMPACT PROFESSIONAL HEADER BAR */}
      <section className="bg-white border-b border-slate-200 py-3.5 sm:py-4">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb line */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link href="/" className="hover:text-[#0067A1] transition-colors">Home</Link>
              <span>/</span>
              <Link href="/doctors" className="hover:text-[#0067A1] transition-colors">Specialists Directory</Link>
              <span>/</span>
              <span className="text-slate-800 font-semibold truncate max-w-[200px]">{condition.title}</span>
            </div>
            <Link
              href="/doctors"
              className="hidden sm:inline-flex items-center text-[11px] font-semibold text-[#0067A1] hover:text-[#004F7C] transition-colors group shrink-0"
            >
              <FaArrowLeft className="mr-1.5 h-2.5 w-2.5 group-hover:-translate-x-0.5 transition-transform" />
              All Doctors
            </Link>
          </div>

          {/* Condition Header with Compact Height & Proportioned Fonts */}
          <div className="pt-0.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold tracking-wider uppercase text-[#0067A1] bg-[#0067A1]/10 px-2 py-0.5 rounded-[4px] border border-[#0067A1]/20">
                Clinical Guide
              </span>
              <span className="text-xs text-slate-400">• Verified Condition</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0B3A5B] tracking-tight">
              {condition.seo_title || condition.title}
            </h1>
            <p className="text-xs sm:text-[13px] text-slate-600 mt-0.5 max-w-2xl leading-normal line-clamp-2">
              {condition.short_description || `Symptoms, causes, and specialist consultation options for ${condition.title}.`}
            </p>

            {/* Quick Specialty CTA Buttons (Short & Clean) */}
            {specialties.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Specialties:
                </span>
                {specialties.map((spec) => (
                  <Link
                    key={spec}
                    href={`/doctors?specialty=${encodeURIComponent(spec)}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[5px] bg-[#0067A1] hover:bg-[#004F7C] text-white text-xs font-semibold transition-colors shadow-2xs group cursor-pointer"
                  >
                    <FaStethoscope className="w-2.5 h-2.5 text-white/90" />
                    <span>{spec}</span>
                    <FaArrowRight className="w-2 h-2 text-white/80 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. MAIN MEDICAL CONTENT & SIDEBAR */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
          {/* Left Column: Educational Content & Clinical Guide */}
          <div className="lg:col-span-8 space-y-5">
            <div className="bg-white rounded-[8px] border border-slate-200 p-5 sm:p-6 shadow-2xs">
              {/* Detailed CMS Content with Refined Medical Font Sizes */}
              <div
                className="prose prose-slate max-w-none 
                  prose-headings:text-[#0B3A5B] prose-headings:font-bold 
                  prose-h2:text-base sm:prose-h2:text-lg prose-h2:font-bold prose-h2:border-b prose-h2:border-slate-200 prose-h2:pb-1.5 prose-h2:mt-5 prose-h2:first:mt-0 
                  prose-h3:text-sm sm:prose-h3:text-base prose-h3:font-semibold prose-h3:mt-3.5 
                  prose-p:text-xs sm:prose-p:text-[13px] prose-p:text-slate-700 prose-p:leading-relaxed prose-p:my-2 
                  prose-a:text-[#0067A1] prose-a:font-semibold 
                  prose-strong:text-slate-900 prose-strong:font-semibold 
                  prose-ul:text-xs sm:prose-ul:text-[13px] prose-ul:text-slate-700 prose-ul:my-2 prose-li:my-1 
                  prose-img:rounded-[6px] [&_*]:!whitespace-normal"
                dangerouslySetInnerHTML={{
                  __html: (
                    condition.detailed_content ||
                    "<h2>Overview</h2><p>Clinical guidance for this health concern is being curated by our medical team.</p>"
                  ).replace(/&nbsp;/g, " "),
                }}
              />
            </div>

            {/* Medical Disclaimer (Compact & Standard) */}
            <div className="bg-white rounded-[8px] p-4 border border-slate-200 flex items-start gap-3">
              <div className="w-8 h-8 rounded-[6px] bg-[#0067A1]/10 text-[#0067A1] flex items-center justify-center shrink-0 mt-0.5 border border-[#0067A1]/20">
                <FaShieldAlt className="h-3.5 w-3.5" />
              </div>
              <div>
                <h4 className="font-bold text-[#0B3A5B] text-xs uppercase tracking-wider mb-0.5">
                  Medical Disclaimer
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                  The clinical information provided on this page is for educational and guidance purposes and does not replace medical advice. Always consult a verified specialist for accurate diagnosis and prescription.
                </p>
              </div>
            </div>

            {/* Related Health Concerns */}
            {relatedConditions.length > 0 && (
              <div className="bg-white rounded-[8px] border border-slate-200 p-4 sm:p-5 shadow-2xs">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Related Health Concerns
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {relatedConditions.map((related) => (
                    <Link
                      key={related.id}
                      href={`/problem/${related.slug}`}
                      className="bg-slate-50 hover:bg-white p-3 rounded-[6px] border border-slate-200 hover:border-[#0067A1] transition-all flex flex-col items-center text-center group cursor-pointer"
                    >
                      {related.icon_name && (
                        <div className="w-9 h-9 rounded-[5px] bg-white border border-slate-200 flex items-center justify-center p-1.5 mb-1.5 group-hover:scale-105 transition-transform">
                          <img
                            src={related.icon_name}
                            alt={related.title}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                      <span className="text-xs font-semibold text-slate-800 group-hover:text-[#0067A1] transition-colors line-clamp-1">
                        {related.title}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Multiple Specialty CTA Buttons & Suggested Doctors */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Consultation CTA Block with Multiple Specialty Buttons */}
            <div className="bg-[#0B3A5B] rounded-[8px] p-4 sm:p-5 text-white shadow-2xs">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-[6px] bg-white/10 flex items-center justify-center shrink-0">
                  <FaUserMd className="text-white h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Consult Doctor</h3>
                  <p className="text-[11px] text-white/70">Verified Specialists</p>
                </div>
              </div>

              <p className="text-white/80 text-xs leading-normal mb-3">
                Select specialty for <span className="font-semibold text-white">{condition.title}</span>:
              </p>

              {/* Multiple Specialty CTA Buttons (Short & Concise) */}
              <div className="space-y-2 mb-2.5">
                {specialties.map((spec) => (
                  <Link
                    key={spec}
                    href={`/doctors?specialty=${encodeURIComponent(spec)}`}
                    className="w-full bg-[#0067A1] hover:bg-[#004F7C] text-white px-3.5 py-2 rounded-[6px] text-xs font-bold shadow-2xs flex items-center justify-between transition-colors group cursor-pointer border border-white/10"
                  >
                    <span className="flex items-center gap-2">
                      <FaStethoscope className="h-3 w-3 text-white/90" />
                      <span>{spec}</span>
                    </span>
                    <FaArrowRight className="h-2.5 w-2.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                ))}
              </div>

              <Link
                href="/doctors"
                className="w-full bg-white hover:bg-slate-50 text-[#0B3A5B] px-3 py-1.5 rounded-[6px] text-xs font-semibold shadow-2xs flex items-center justify-center gap-1 transition-colors block text-center"
              >
                All Doctors
              </Link>
            </div>

            {/* Suggested Doctors List with Specialty Filter Tabs */}
            <div id="doctor-list" className="bg-white rounded-[8px] border border-slate-200 shadow-2xs p-4 sm:p-5 sticky top-20">
              <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-[#0B3A5B]">
                    Suggested Doctors
                  </h3>
                  <p className="text-[11px] text-slate-500">Available specialists for this condition</p>
                </div>
                <span className="text-[11px] font-bold text-[#0067A1] bg-[#0067A1]/10 px-2 py-0.5 rounded-[4px] border border-[#0067A1]/20">
                  {filteredDoctors.length} Found
                </span>
              </div>

              {/* Specialty Filter Tabs */}
              {specialties.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setActiveSpecialtyTab("all")}
                    className={`px-2 py-1 rounded-[4px] text-[11px] font-bold transition-colors cursor-pointer shrink-0 border ${
                      activeSpecialtyTab === "all"
                        ? "bg-[#0067A1] text-white border-[#0067A1]"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    All ({doctors.length})
                  </button>
                  {specialties.map((spec) => {
                    const count = doctors.filter(d => {
                      const docSpec = (d.specialty || "").toLowerCase();
                      const target = spec.toLowerCase();
                      return docSpec.includes(target) || target.includes(docSpec);
                    }).length;

                    return (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => setActiveSpecialtyTab(spec)}
                        className={`px-2 py-1 rounded-[4px] text-[11px] font-bold transition-colors cursor-pointer shrink-0 border ${
                          activeSpecialtyTab === spec
                            ? "bg-[#0067A1] text-white border-[#0067A1]"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {spec} ({count})
                      </button>
                    );
                  })}
                </div>
              )}

              {filteredDoctors.length === 0 ? (
                <div className="text-center py-5 bg-slate-50 rounded-[6px] border border-dashed border-slate-200 p-3">
                  <FaUserMd className="mx-auto text-slate-400 text-2xl mb-1.5" />
                  <p className="text-xs text-slate-600">
                    No specialists available for this tab right now.
                  </p>
                  <Link
                    href="/doctors"
                    className="inline-block mt-2 text-xs font-bold text-[#0067A1] hover:underline"
                  >
                    Explore All Doctors
                  </Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredDoctors.slice(0, 4).map((doctor) => (
                    <div
                      key={doctor.id}
                      className="p-3 rounded-[6px] border border-slate-200 bg-white hover:border-[#0067A1]/50 hover:shadow-2xs transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0 w-10 h-10 rounded-[6px] overflow-hidden bg-slate-100 border border-slate-200">
                          <img
                            src={doctor.profileImage || "/dr.png"}
                            alt={doctor.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = "none";
                              e.target.nextSibling.style.display = "flex";
                            }}
                          />
                          <div className="hidden absolute inset-0 bg-blue-50 items-center justify-center font-bold text-[#0067A1] text-xs">
                            {doctor.name.charAt(0)}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <h4 className="font-bold text-slate-900 text-xs truncate">
                              {doctor.name}
                            </h4>
                            <FaCheckCircle className="w-2.5 h-2.5 text-[#0067A1] shrink-0" />
                          </div>
                          <p className="text-[10px] text-slate-500 truncate">
                            {doctor.specialty}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
                            {doctor.experience && (
                              <span className="font-semibold text-emerald-700">
                                {doctor.experience}+ Yrs
                              </span>
                            )}
                            {doctor.fee && (
                              <span className="text-slate-500 font-semibold">
                                • ₹{doctor.fee}
                              </span>
                            )}
                            {doctor.rating && (
                              <span className="inline-flex items-center gap-0.5 text-amber-600 font-bold">
                                • <FaStar className="w-2 h-2" /> {doctor.rating}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* CTA Button on doctor item */}
                      <Link
                        href={`/doctor/${doctor.id}`}
                        className="bg-[#0067A1] hover:bg-[#004F7C] text-white py-1 px-2.5 rounded-[5px] text-[11px] font-bold text-center transition-colors shrink-0 shadow-2xs cursor-pointer"
                      >
                        Book Slot
                      </Link>
                    </div>
                  ))}

                  <Link
                    href={`/doctors?specialty=${encodeURIComponent(activeSpecialtyTab === "all" ? (specialties[0] || "General Physician") : activeSpecialtyTab)}`}
                    className="block text-center w-full py-1.5 text-xs font-bold text-[#0067A1] bg-slate-50 hover:bg-[#0067A1]/10 rounded-[6px] transition-colors mt-2 border border-slate-200"
                  >
                    View All Doctors →
                  </Link>
                </div>
              )}

              {/* Direct Care Helpline */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2.5 text-xs text-slate-500">
                <div className="w-7 h-7 rounded-[5px] bg-[#0067A1]/10 text-[#0067A1] flex items-center justify-center shrink-0 border border-[#0067A1]/20">
                  <FaPhone className="h-3 w-3" />
                </div>
                <div>
                  <div className="font-bold text-[#0B3A5B] text-[11px]">Need Help Choosing?</div>
                  <div className="text-[10px] text-slate-500">+91 72890-43888 (9 AM - 9 PM)</div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
