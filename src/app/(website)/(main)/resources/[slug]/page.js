"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  FaArrowLeft, 
  FaCalendarAlt, 
  FaShareAlt, 
  FaUserMd, 
  FaPrint, 
  FaCheck, 
  FaShieldAlt, 
  FaClipboardCheck, 
  FaChevronRight,
  FaStethoscope,
  FaClock
} from "react-icons/fa";
import Link from "next/link";

export default function ResourceDetailPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState([]);
  const [copied, setCopied] = useState(false);

  // Interactive pre-consultation patient checklist
  const [checklist, setChecklist] = useState({
    symptoms: false,
    records: false,
    meds: false,
    questions: false,
  });

  const toggleChecklist = (key) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    if (slug) fetchResource();
  }, [slug]);

  const fetchResource = async () => {
    try {
      const res = await fetch(`/api/cms/resources`);
      const result = await res.json();
      if (result.success && result.data) {
        const found = result.data.find((r) => r.slug === slug);
        if (found) {
          setResource(found);
          const relatedItems = result.data
            .filter((r) => r.type === found.type && r.id !== found.id && r.status === "published")
            .slice(0, 3);
          setRelated(relatedItems);
        } else {
          router.push("/resources");
        }
      }
    } catch (err) {
      console.error("Failed to load resource:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#F7FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#1677A8] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-[#607580]">Loading clinical resource...</p>
        </div>
      </div>
    );
  }

  if (!resource) return null;

  const checklistCompleted = Object.values(checklist).filter(Boolean).length;

  return (
    <main className="min-h-screen bg-[#F7FAFC] pb-16 sm:pb-24">
      {/* Clinical Breadcrumb & Header Section */}
      <div className="w-full bg-[#FFFFFF] border-b border-[#DCE6EB] py-6 sm:py-8">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Top Navigation Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2 text-xs text-[#607580]">
              <Link href="/" className="hover:text-[#1677A8] transition-colors">Home</Link>
              <span className="text-[#DCE6EB]">/</span>
              <Link href="/resources" className="hover:text-[#1677A8] transition-colors">Resources</Link>
              <span className="text-[#DCE6EB]">/</span>
              <span className="text-[#0B3A5B] font-semibold truncate max-w-[200px] sm:max-w-xs">{resource.title}</span>
            </div>

            <Link
              href="/resources"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1677A8] hover:text-[#0B3A5B] bg-[#F7FAFC] hover:bg-[#EBF5FA] border border-[#DCE6EB] px-3 py-1.5 rounded-lg transition-colors"
            >
              <FaArrowLeft className="w-3 h-3" /> Back to Resources
            </Link>
          </div>

          {/* Meta Chips */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 mb-3">
            <span className="px-2.5 py-1 bg-[#E8F2F7] text-[#1677A8] text-[11px] font-bold uppercase tracking-wider rounded-md border border-[#DCE6EB]">
              {resource.type?.replace("_", " ") || "Patient Guide"}
            </span>

            <span className="text-xs text-[#607580] flex items-center gap-1.5 bg-[#F7FAFC] px-2.5 py-1 rounded-md border border-[#DCE6EB]">
              <FaCalendarAlt className="w-3 h-3 text-[#1677A8]" />
              {new Date(resource.created_at).toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>

            <span className="text-xs text-[#607580] flex items-center gap-1.5 bg-[#F7FAFC] px-2.5 py-1 rounded-md border border-[#DCE6EB]">
              <FaClock className="w-3 h-3 text-[#159A8A]" />
              4 min read
            </span>

            <span className="text-xs font-semibold text-[#2FA36B] flex items-center gap-1.5 bg-[#EDF7F2] px-2.5 py-1 rounded-md border border-[#DCE6EB]">
              <FaCheck className="w-2.5 h-2.5" />
              Clinically Reviewed
            </span>
          </div>

          {/* Article Main Headline */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0B3A5B] tracking-tight leading-tight mb-3">
            {resource.title}
          </h1>

          <p className="text-sm sm:text-base text-[#607580] max-w-3xl leading-relaxed">
            Essential steps to organize your symptoms, clinical history, and prescriptions for a productive and effective doctor consultation.
          </p>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-2.5 mt-5 pt-4 border-t border-[#DCE6EB]">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#F7FAFC] hover:bg-[#EBF5FA] text-[#1677A8] border border-[#DCE6EB] hover:border-[#1677A8]/50 rounded-lg text-xs font-bold transition-all shadow-2xs"
            >
              <FaShareAlt className="w-3 h-3" />
              <span>{copied ? "Link Copied!" : "Share Guide"}</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#F7FAFC] hover:bg-[#EBF5FA] text-[#18303D] border border-[#DCE6EB] rounded-lg text-xs font-bold transition-all shadow-2xs"
            >
              <FaPrint className="w-3 h-3 text-[#607580]" />
              <span>Print Guide</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Body Grid */}
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
          
          {/* Left Main Article Column */}
          <div className="lg:w-2/3">
            <article className="bg-[#FFFFFF] rounded-2xl border border-[#DCE6EB] p-6 sm:p-10 shadow-2xs">
              
              {/* Featured Visual Image */}
              {resource.image && (
                <div className="w-full h-64 sm:h-80 md:h-[360px] mb-8 rounded-xl overflow-hidden border border-[#DCE6EB] bg-[#F7FAFC]">
                  <img
                    src={resource.image}
                    alt={resource.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Rendered Clinical Article Content with Dedicated Medical Styling */}
              <div 
                className="resource-article-content prose max-w-none 
                  prose-headings:text-[#0B3A5B] prose-headings:font-bold prose-headings:tracking-tight
                  prose-h2:text-xl prose-h2:sm:text-2xl prose-h2:border-b prose-h2:border-[#DCE6EB] prose-h2:pb-2 prose-h2:mt-8 prose-h2:mb-4
                  prose-h3:text-base prose-h3:sm:text-lg prose-h3:text-[#0B3A5B] prose-h3:mt-6 prose-h3:mb-2
                  prose-p:text-[#18303D] prose-p:leading-relaxed prose-p:text-sm prose-p:sm:text-base prose-p:mb-4
                  prose-blockquote:bg-[#F0F7FB] prose-blockquote:border-l-4 prose-blockquote:border-[#1677A8] prose-blockquote:p-4 prose-blockquote:rounded-r-xl prose-blockquote:my-6 prose-blockquote:text-[#0B3A5B] prose-blockquote:text-sm prose-blockquote:sm:text-base prose-blockquote:italic prose-blockquote:not-italic
                  prose-ul:list-disc prose-ul:pl-5 prose-ul:space-y-1.5 prose-li:text-sm prose-li:text-[#18303D]
                  prose-a:text-[#1677A8] prose-a:font-semibold hover:prose-a:underline"
                dangerouslySetInnerHTML={{ __html: resource.content }}
              />

              {/* Interactive Patient Consultation Prep Checklist */}
              <div className="mt-10 p-5 sm:p-6 rounded-xl bg-[#F7FAFC] border border-[#DCE6EB]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-[#DCE6EB]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#E8F2F7] text-[#1677A8] flex items-center justify-center shrink-0">
                      <FaClipboardCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-[#0B3A5B]">
                        Pre-Consultation Checklist
                      </h3>
                      <p className="text-[11px] sm:text-xs text-[#607580]">
                        Tick each step before your doctor session starts
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold text-[#1677A8] bg-white border border-[#DCE6EB] px-2.5 py-1 rounded-full self-start sm:self-center">
                    {checklistCompleted} of 4 Ready
                  </span>
                </div>

                <div className="space-y-2.5">
                  {[
                    { key: "symptoms", label: "List all ongoing symptoms with duration & intensity" },
                    { key: "records", label: "Keep previous prescriptions & recent blood tests ready" },
                    { key: "meds", label: "Note down current medicines, vitamins & dosages" },
                    { key: "questions", label: "Write down 2–3 key health questions for the doctor" },
                  ].map((chk) => (
                    <label
                      key={chk.key}
                      onClick={() => toggleChecklist(chk.key)}
                      className="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-[#DCE6EB] hover:border-[#1677A8]/40 cursor-pointer transition-colors select-none"
                    >
                      <input
                        type="checkbox"
                        checked={checklist[chk.key]}
                        onChange={() => {}}
                        className="mt-0.5 w-4 h-4 accent-[#1677A8] rounded cursor-pointer"
                      />
                      <span className={`text-xs sm:text-[13px] leading-snug ${checklist[chk.key] ? "line-through text-[#607580]" : "text-[#18303D] font-medium"}`}>
                        {chk.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Clinical Editorial Attribution */}
              <div className="mt-8 pt-6 border-t border-[#DCE6EB] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#E8F2F7] rounded-xl flex items-center justify-center text-[#1677A8] border border-[#DCE6EB] shrink-0">
                    <FaUserMd className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-[#0B3A5B]">
                      MediConnect Clinical Editorial Team
                    </p>
                    <p className="text-[11px] text-[#607580]">
                      Peer-reviewed patient literacy guidelines • Telemedicine Compliant
                    </p>
                  </div>
                </div>
              </div>

              {/* Mandatory Medical Disclaimer (Handover Spec) */}
              <div className="mt-6 p-3.5 rounded-xl bg-[#F7FAFC] border border-[#DCE6EB] text-[11px] text-[#607580] leading-relaxed flex items-start gap-2.5">
                <FaShieldAlt className="w-4 h-4 text-[#1677A8] shrink-0 mt-0.5" />
                <span>
                  <strong>Clinical Notice:</strong> The health information provided in this guide is for patient education and preparation purposes. It does not replace clinical consultation, prescription guidance, or emergency triage from a registered medical practitioner.
                </span>
              </div>
            </article>
          </div>

          {/* Right Sidebar Column */}
          <div className="lg:w-1/3 space-y-6">
            
            {/* Consultation Booking Action Widget */}
            <div className="bg-[#0B3A5B] text-white rounded-2xl p-6 shadow-md border border-[#1677A8]/30 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-teal-300">
                  <FaStethoscope className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider">
                  Book a Specialist
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mb-1.5 leading-snug">
                Ready for Your Consultation?
              </h3>
              <p className="text-xs text-slate-200 leading-relaxed mb-4">
                Connect with certified pulmonologists, cardiologists, and physicians across 30+ medical specialties.
              </p>

              <div className="space-y-1.5 text-xs text-slate-200 mb-5">
                <div className="flex items-center gap-2">
                  <FaCheck className="w-3 h-3 text-[#2FA36B]" />
                  <span>15-min instant teleconsultations</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaCheck className="w-3 h-3 text-[#2FA36B]" />
                  <span>Verified digital prescriptions in DigiLocker</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaCheck className="w-3 h-3 text-[#2FA36B]" />
                  <span>100% confidential & encrypted</span>
                </div>
              </div>

              <Link
                href="/#book-consultation"
                className="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-xl bg-white text-[#0B3A5B] hover:bg-slate-100 font-bold text-xs transition-colors shadow-sm"
              >
                <span>Book Consultation</span>
                <FaChevronRight className="w-2.5 h-2.5 ml-1.5" />
              </Link>
            </div>

            {/* Quick Consultation Reminders Box */}
            <div className="bg-[#FFFFFF] rounded-2xl border border-[#DCE6EB] p-5 shadow-2xs">
              <h4 className="text-xs font-bold text-[#0B3A5B] uppercase tracking-wider mb-3 pb-2 border-b border-[#DCE6EB]">
                Quick Consultation Tips
              </h4>
              <ul className="space-y-2 text-xs text-[#607580]">
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#E8F2F7] text-[#1677A8] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                  <span>Join online consultation 5 minutes prior to test audio & video.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#E8F2F7] text-[#1677A8] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                  <span>Keep your medical DigiLocker or past prescriptions open on screen.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#E8F2F7] text-[#1677A8] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                  <span>Ask the doctor to clarify medicine timing and follow-up window.</span>
                </li>
              </ul>
            </div>

            {/* Related Health Resources */}
            <div className="bg-[#FFFFFF] rounded-2xl border border-[#DCE6EB] p-5 shadow-2xs sticky top-24">
              <h4 className="text-xs font-bold text-[#0B3A5B] uppercase tracking-wider mb-4 pb-2 border-b border-[#DCE6EB]">
                Related Resources
              </h4>

              {related.length > 0 ? (
                <div className="space-y-4">
                  {related.map((item) => (
                    <Link
                      key={item.id}
                      href={`/resources/${item.slug}`}
                      className="group flex gap-3 items-start p-2 rounded-xl hover:bg-[#F7FAFC] border border-transparent hover:border-[#DCE6EB] transition-all"
                    >
                      {item.image ? (
                        <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-[#DCE6EB] bg-[#F7FAFC]">
                          <img
                            src={item.image}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-[#E8F2F7] text-[#1677A8] flex items-center justify-center shrink-0 border border-[#DCE6EB]">
                          <FaStethoscope className="w-5 h-5" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#1677A8] block mb-0.5">
                          {item.type?.replace("_", " ") || "Guide"}
                        </span>
                        <h5 className="text-xs font-bold text-[#0B3A5B] group-hover:text-[#1677A8] transition-colors line-clamp-2 leading-snug">
                          {item.title}
                        </h5>
                        <p className="text-[11px] text-[#607580] mt-1 flex items-center gap-1">
                          <FaCalendarAlt className="w-2.5 h-2.5 text-[#1677A8]" />
                          {new Date(item.created_at).toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#607580]">No additional resources found in this category.</p>
              )}
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
