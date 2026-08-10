"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { FaUserMd, FaArrowRight, FaVideo, FaMapMarkerAlt, FaStar, FaClock, FaCheckCircle } from "react-icons/fa";
import { HiOutlineBadgeCheck } from "react-icons/hi";

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
  
  // Filter out parts that contain house number indicators or are very short
  const genericParts = parts.filter(p => {
    if (/^\d+$/g.test(p)) return false; // skip pincode or numbers
    if (/^(flat|plot|house|rz|shop|hno|h\sno|room|ward|office|building|pincode)\b/i.test(p)) return false;
    return p.length > 2;
  });

  const lastParts = genericParts.length > 0 ? genericParts.slice(-2) : parts.slice(-2);
  
  // Clean up leading numbers/symbols from the final segments
  return lastParts
    .map(p => p.replace(/^\d+[-\w\/]*\s*/g, '')) // remove leading numbers (like "114-A" or "113A")
    .map(p => p.replace(/^(opposite|opp\.|near|facing)\s+[\w\s]+/gi, '')) // remove landmarks
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
           router.push("/website/doctors");
           return;
        }
        
        const currentCondition = jsonCond.data;
        setCondition(currentCondition);

        // 2. Fetch related conditions (just get all and pick 3-4 random/next active)
        const resAllCond = await fetch("/api/cms/conditions?active_only=true");
        const jsonAllCond = await resAllCond.json();
        if (jsonAllCond.success && jsonAllCond.data) {
           const others = jsonAllCond.data.filter(c => c.slug !== slug).sort(() => 0.5 - Math.random()).slice(0, 4);
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
            
            // Allow exact or substring match using target
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
      <div className="min-h-screen bg-[#F6F8FA] flex items-center justify-center">
        <div className="flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-[#0067A1] border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500 font-medium">Loading medical information...</p>
        </div>
      </div>
    );
  }

  if (!condition) return null;

  return (
    <div className="min-h-screen bg-[#F6F8FA] pb-16">
      
      {/* Hero Banner (SEO Optimized) */}
      <div className="bg-[#003358] relative overflow-hidden pt-12 pb-16 px-6 lg:px-8">
         <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white to-transparent"></div>
         <div className="container mx-auto max-w-5xl relative z-10">
            <div className="flex flex-col md:flex-row items-center gap-6">
               {condition.icon_name && (
                   <div className="w-24 h-24 shrink-0 rounded-2xl bg-white/10 p-4 border border-white/20 shadow-xl backdrop-blur-sm flex items-center justify-center">
                       <img 
                         src={condition.icon_name} 
                         alt={condition.title} 
                         className="w-full h-full object-contain drop-shadow-md" 
                         style={{ filter: "brightness(0) saturate(100%) invert(100%)" }} // White for the dark header
                       />
                   </div>
               )}
               <div className="text-center md:text-left">
                   <div className="inline-block bg-emerald-500/20 text-emerald-300 font-semibold px-4 py-1.5 rounded-full text-sm mb-4 border border-emerald-500/30">
                       Health Condition Guide
                   </div>
                   <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                       {condition.seo_title || condition.title}
                   </h1>
                   <p className="text-lg text-gray-300 max-w-3xl leading-relaxed">
                       {condition.short_description || `Learn about the symptoms, causes, and specialist treatments for ${condition.title}.`}
                   </p>
               </div>
            </div>
         </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Left Column: Rich Text Content */}
            <div className="lg:w-2/3">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10 mb-8 overflow-hidden prose prose-emerald max-w-none prose-headings:text-[#003358] prose-h2:text-2xl prose-h2:md:text-3xl prose-h2:font-bold prose-h2:border-b prose-h2:pb-3 prose-h2:mt-10 prose-h2:first:mt-0 prose-a:text-[#0067A1] prose-img:rounded-xl [&_*]:!whitespace-normal">
                    {/* Render the admin rich text content */}
                    <div dangerouslySetInnerHTML={{ __html: (condition.detailed_content || "<h2>Overview</h2><p>Content is being updated globally by our medical researchers.</p>").replace(/&nbsp;/g, ' ') }} />
                </div>

                {/* Medical Disclaimer */}
                <div className="bg-orange-50 rounded-xl p-5 border border-orange-100 flex items-start gap-4 mb-8">
                    <div className="bg-orange-100 p-2 rounded-lg text-orange-600 shrink-0 mt-0.5">
                       <FaUserMd size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-orange-800 text-sm uppercase tracking-wide mb-1">Medical Disclaimer</h4>
                        <p className="text-orange-700/80 text-sm leading-relaxed">
                            The content on this page is for educational purposes only and does not substitute professional medical advice. Diagnosis and treatment decisions must always be made by consulting a qualified healthcare provider.
                        </p>
                    </div>
                </div>

                {/* Internal Linking Rule: 3-4 related conditions */}
                {relatedConditions.length > 0 && (
                <div className="mb-10">
                    <h3 className="text-xl font-bold text-gray-900 mb-5">Related Health Conditions</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {relatedConditions.map(related => (
                            <div 
                                key={related.id} 
                                onClick={() => router.push(`/website/problem/${related.slug}`)}
                                className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#0067A1]/30 transition-all cursor-pointer flex flex-col items-center text-center group"
                            >
                                {related.icon_name && (
                                    <img 
                                      src={related.icon_name} 
                                      className="w-10 h-10 object-contain mb-3 group-hover:scale-110 transition-transform" 
                                      alt="" 
                                      style={{ filter: "hue-rotate(45deg) saturate(120%)" }}
                                    />
                                )}
                                <span className="text-sm font-semibold text-gray-800 group-hover:text-[#0067A1]">{related.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
                )}
            </div>

            {/* Right Column: CTA & Recommended Doctors (Sticky sidebar) */}
            <div className="lg:w-1/3 space-y-6">
                
                {/* Book Consultation CTA Block */}
                <div className="bg-gradient-to-br from-[#0067A1] to-[#004F7C] rounded-2xl p-7 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-white/10 p-2 rounded-lg"><FaUserMd className="text-white" size={24} /></div>
                            <h3 className="text-xl font-bold">Consult a Specialist</h3>
                        </div>
                        <p className="text-white/80 text-sm mb-6 leading-relaxed">
                            Don't ignore the symptoms of {condition.title}. Get a proper diagnosis and treatment plan from our top <span className="font-bold text-white">{condition.recommended_specialty || 'General'}</span> experts.
                        </p>
                        <button onClick={() => {
                            const docSection = document.getElementById('doctor-list');
                            if(docSection) docSection.scrollIntoView({ behavior: 'smooth' });
                            else router.push('/website/doctors');
                        }} className="w-full bg-white text-[#0067A1] hover:bg-gray-100 px-6 py-3.5 rounded-xl font-bold shadow flex items-center justify-center gap-2 transition-all">
                            Find a Doctor <FaArrowRight size={14} />
                        </button>
                    </div>
                </div>

                {/* Doctor List (Mapped by Specialty) */}
                <div id="doctor-list" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900">Suggested Doctors</h3>
                        <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md border border-emerald-100">
                            {condition.recommended_specialty}
                        </span>
                    </div>

                    {doctors.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <FaUserMd className="mx-auto text-gray-300 text-3xl mb-3" />
                            <p className="text-sm text-gray-500 px-4">No specialists currently available for online booking. Please check back soon.</p>
                            <button onClick={() => router.push('/website/doctors')} className="mt-4 text-[#0067A1] text-sm font-semibold hover:underline">View All Doctors</button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {doctors.slice(0, 3).map((doctor) => (
                                <div key={doctor.id} className="group border border-gray-100 rounded-xl p-4 hover:border-[#0067A1]/30 hover:shadow-md transition-all cursor-pointer bg-white" onClick={() => router.push(`/website/doctor/${doctor.id}`)}>
                                    <div className="flex gap-4">
                                        <div className="relative shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                                            <img src={doctor.profileImage || "/dr.png"} alt={doctor.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                                            <div className="hidden absolute inset-0 bg-[#0067A1]/10 items-center justify-center font-bold text-[#0067A1]">{doctor.name.charAt(0)}</div>
                                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-[2px]"><FaCheckCircle className="w-3.5 h-3.5 text-emerald-500" /></div>
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <h4 className="font-bold text-gray-900 text-sm truncate group-hover:text-[#0067A1] transition-colors">{doctor.name}</h4>
                                            <p className="text-xs text-emerald-600 font-medium truncate mt-0.5">{(doctor.experience || 5)}+ Yrs Exp</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {doctors.length > 3 && (
                                <button onClick={() => router.push('/website/doctors')} className="w-full py-3 text-sm font-semibold text-[#0067A1] bg-[#0067A1]/5 hover:bg-[#0067A1]/10 rounded-xl transition-colors">
                                    View {doctors.length - 3} More Specialists
                                </button>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </div>
      </div>
    </div>
  );
}
