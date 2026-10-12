"use client";

import { useState, useEffect } from "react";
import {
  FaBullseye,
  FaLightbulb,
  FaUserMd,
  FaStethoscope,
  FaHeartbeat,
  FaCheckCircle,
} from "react-icons/fa";
import AnimateIn from "@/components/ui/animations/AnimateIn";

const TeamMember = ({ name, role, expertise, image }) => (
  <div className="group relative flex flex-col items-center rounded-2xl border border-[#DCE6EB] bg-white p-6 text-center shadow-2xs hover:shadow-sm hover:border-[#1677A8]/40 transition-all duration-300 h-full overflow-hidden hover:-translate-y-0.5">
    <div className="relative mb-4">
      {image ? (
        <img
          src={image}
          alt={name}
          className="relative h-24 w-24 md:h-28 md:w-28 rounded-full border-2 border-[#DCE6EB] shadow-xs object-cover z-10 group-hover:border-[#1677A8] transition-colors"
        />
      ) : (
        <div className="relative h-24 w-24 md:h-28 md:w-28 rounded-full border-2 border-[#DCE6EB] bg-[#F7FAFC] flex items-center justify-center z-10 group-hover:border-[#1677A8] transition-colors">
          <FaUserMd className="h-10 w-10 text-[#1677A8]" />
        </div>
      )}
    </div>

    <div className="flex flex-col flex-grow items-center w-full z-10">
      <h3 className="mb-1 text-base md:text-lg font-bold text-[#0B3A5B] group-hover:text-[#1677A8] transition-colors line-clamp-1 w-full">
        {name}
      </h3>
      <p className="mb-3 text-[11px] font-bold tracking-wider text-[#1677A8] uppercase bg-[#E8F2F7] px-2.5 py-1 rounded-md">
        {role}
      </p>
      <div className="mt-auto w-full pt-3 border-t border-[#DCE6EB]/60">
        <p className="text-xs text-[#607580] leading-relaxed font-medium px-1 line-clamp-3">
          {expertise || "Dedicated medical professional."}
        </p>
      </div>
    </div>
  </div>
);

export default function AboutPage() {
  const [aboutSections, setAboutSections] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [headerData, setHeaderData] = useState({
    title: "ABOUT MEDICONNECT.FIT",
    heading: "About MediConnect.fit",
    subheading: "A doctor-led healthcare platform designed to support patients beyond individual consultations."
  });

  useEffect(() => {
    async function fetchHeaders() {
      try {
        const res = await fetch("/api/cms/section-headers?page=about");
        const json = await res.json();
        if (json.success && json.data && json.data.heading) {
          setHeaderData({
            title: json.data.title || "ABOUT MEDICONNECT.FIT",
            heading: json.data.heading,
            subheading: json.data.subheading || ""
          });
        }
      } catch (e) {
        console.error("Failed to load CMS headers", e);
      }
    }
    async function fetchAbout() {
      try {
        const res = await fetch("/api/cms/about");
        const json = await res.json();
        if (json.success && json.data) {
          setAboutSections(json.data);
        }
      } catch (e) {
        console.error("Failed to load about sections", e);
      }
    }
    async function fetchTeam() {
      try {
        const res = await fetch("/api/cms/team");
        const json = await res.json();
        if (json.success && json.data) {
          setTeamMembers(json.data);
        }
      } catch (e) {
        console.error("Failed to load team members", e);
      }
    }
    fetchAbout();
    fetchHeaders();
    fetchTeam();
  }, []);

  const opening = aboutSections.find(s => s.section_key === 'opening');
  const vision = aboutSections.find(s => s.section_key === 'vision');
  const mission = aboutSections.find(s => s.section_key === 'mission');
  const differentiators = aboutSections.find(s => s.section_key === 'differentiators');
  const foundersMessage = aboutSections.find(s => s.section_key === 'founders_message');

  const DEFAULT_VISION = `<p>To build India's most trusted, accessible, and continuous healthcare ecosystem where every individual receives proactive, doctor-led clinical guidance and seamless care continuity.</p><p>We envision a future where geographical and technological barriers to quality medical expertise are completely eliminated through secure digital health lockers, ABDM-compliant records, and patient-first clinical empathy.</p>`;

  const DEFAULT_MISSION = `<p>To empower patients and healthcare practitioners through integrated telemedicine consultations, digitized health history, and transparent care pathways.</p><p>We are committed to upholding the highest clinical standards under the NMC Telemedicine Practice Guidelines, ensuring patients receive timely triage, accurate electronic prescriptions, and dependable follow-up support throughout their recovery journey.</p>`;

  const normalizeText = (htmlOrText) => (htmlOrText || "").replace(/<[^>]*>?/gm, '').trim().toLowerCase();
  const isDuplicateOpening = opening && headerData?.subheading && normalizeText(opening.content) === normalizeText(headerData.subheading);

  const getCleanContent = (section, defaultText) => {
    if (!section?.content) return defaultText;
    const plain = normalizeText(section.content);
    if (plain.length < 120) {
      return `<p>${section.content.replace(/<[^>]*>?/gm, '').trim()}</p>` + defaultText;
    }
    return section.content;
  };

  return (
    <div className="min-h-screen bg-white pb-20 w-full overflow-x-hidden">
      {/* 1. HERO HEADER */}
      <section className="bg-[#F7FAFC] border-b border-[#DCE6EB] py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[11px] sm:text-xs font-bold tracking-widest text-[#1677A8] uppercase mb-2">
            {headerData.title || "ABOUT MEDICONNECT.FIT"}
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-bold text-[#0B3A5B] tracking-tight mb-3">
            {headerData.heading || "About MediConnect.fit"}
          </h1>
          {headerData.subheading && (
            <p className="text-sm sm:text-base text-[#607580] max-w-2xl mx-auto leading-relaxed">
              {headerData.subheading}
            </p>
          )}
        </div>
      </section>

      {/* 2. MAIN CONTENT BODY */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-16">
        {/* Opening Statement */}
        {opening && !isDuplicateOpening && (
          <AnimateIn delay={100}>
            <div className="max-w-3xl mx-auto text-center px-4">
              <p
                className="text-lg md:text-xl text-[#0B3A5B] font-medium leading-relaxed italic"
                dangerouslySetInnerHTML={{ __html: opening.content }}
              />
            </div>
          </AnimateIn>
        )}

        {/* Vision & Mission Grid */}
        <div className="grid gap-6 lg:grid-cols-2 items-stretch">
          {/* Vision */}
          <AnimateIn delay={200} className="h-full">
            <div className="h-full rounded-2xl border border-[#DCE6EB] bg-white p-7 sm:p-9 shadow-2xs hover:border-[#1677A8]/40 transition-all flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F7FAFC] border border-[#DCE6EB] text-[#1677A8] mb-5">
                <FaLightbulb className="h-7 w-7 text-[#1677A8]" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#0B3A5B] mb-3">
                {vision?.title || "Our Vision"}
              </h2>
              <div
                className="text-xs sm:text-sm text-[#607580] leading-relaxed prose prose-sm max-w-none prose-p:my-2"
                dangerouslySetInnerHTML={{ __html: getCleanContent(vision, DEFAULT_VISION) }}
              />
            </div>
          </AnimateIn>

          {/* Mission */}
          <AnimateIn delay={300} className="h-full">
            <div className="h-full rounded-2xl border border-[#DCE6EB] bg-white p-7 sm:p-9 shadow-2xs hover:border-[#1677A8]/40 transition-all flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F7FAFC] border border-[#DCE6EB] text-[#1677A8] mb-5">
                <FaBullseye className="h-7 w-7 text-[#1677A8]" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#0B3A5B] mb-3">
                {mission?.title || "Our Mission"}
              </h2>
              <div
                className="text-xs sm:text-sm text-[#607580] leading-relaxed prose prose-sm max-w-none prose-p:my-2"
                dangerouslySetInnerHTML={{ __html: getCleanContent(mission, DEFAULT_MISSION) }}
              />
            </div>
          </AnimateIn>
        </div>

        {/* What Makes Us Different */}
        {differentiators && (
          <AnimateIn delay={400}>
            <div className="bg-[#F7FAFC] rounded-3xl border border-[#DCE6EB] p-8 md:p-12 shadow-2xs">
              <div className="text-center max-w-2xl mx-auto mb-8">
                <p className="text-[11px] sm:text-xs font-bold tracking-widest text-[#1677A8] uppercase mb-1.5">
                  CORE VALUES & STANDARDS
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#0B3A5B] tracking-tight">
                  {differentiators.title || "What Makes Us Different"}
                </h2>
              </div>

              <div className="w-full text-xs sm:text-sm text-[#18303D] leading-relaxed 
                              prose prose-sm max-w-none 
                              prose-ul:grid prose-ul:grid-cols-1 prose-ul:sm:grid-cols-2 prose-ul:gap-4 md:prose-ul:gap-5 prose-ul:list-none prose-ul:pl-0 
                              prose-li:flex prose-li:items-center prose-li:gap-3.5 prose-li:bg-white prose-li:p-5 prose-li:rounded-2xl prose-li:border prose-li:border-[#DCE6EB] prose-li:m-0 prose-li:font-medium
                              [&_li::before]:content-['✓'] [&_li::before]:text-white [&_li::before]:bg-[#1677A8] [&_li::before]:rounded-full [&_li::before]:w-5 [&_li::before]:h-5 [&_li::before]:flex [&_li::before]:items-center [&_li::before]:justify-center [&_li::before]:text-xs [&_li::before]:shrink-0"
                dangerouslySetInnerHTML={{ __html: differentiators.content }}
              />
            </div>
          </AnimateIn>
        )}

        {/* Founders Section (High Trust Story) */}
        {(teamMembers.length > 0 || foundersMessage) && (
          <AnimateIn delay={500} className="pt-6 border-t border-[#DCE6EB]">
            {/* Founders Message */}
            {foundersMessage && (
              <div className="w-full bg-[#0B3A5B] rounded-3xl p-8 sm:p-12 text-white relative shadow-lg flex flex-col justify-center mb-16 overflow-hidden">
                <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-[#1677A8]/20 blur-2xl pointer-events-none" />
                <p className="text-[11px] sm:text-xs font-bold tracking-widest text-cyan-200 uppercase mb-2 relative z-10">
                  LEADERSHIP VISION
                </p>
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-6 relative z-10">
                  {foundersMessage.title || "Message from the Founders"}
                </h3>
                <div className="text-base sm:text-lg text-slate-100 leading-relaxed italic border-l-3 border-[#1677A8] pl-6 py-2 font-light relative z-10">
                  &ldquo;{foundersMessage.content?.replace(/^<p>|<\/p>$/g, '')}&rdquo;
                </div>
              </div>
            )}

            {/* Top Management Section */}
            {teamMembers.filter(m => m.category === 'top_management' || !m.category).length > 0 && (
              <div className="w-full mb-14">
                <div className="text-center mb-8">
                  <p className="text-[11px] sm:text-xs font-bold tracking-widest text-[#1677A8] uppercase mb-1.5">
                    CLINICAL LEADERSHIP
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-[#0B3A5B] tracking-tight">
                    Top Management
                  </h3>
                  <p className="text-xs sm:text-sm text-[#607580] mt-1 max-w-xl mx-auto">
                    Experienced doctors and healthcare leaders driving medical excellence.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                  {teamMembers.filter(m => m.category === 'top_management' || !m.category).map((member, index) => (
                    <div key={member.id || index} className="h-full">
                      <TeamMember {...member} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Executive Management Section */}
            {teamMembers.filter(m => m.category === 'executive_management').length > 0 && (
              <div className="w-full">
                <div className="text-center mb-8">
                  <p className="text-[11px] sm:text-xs font-bold tracking-widest text-[#1677A8] uppercase mb-1.5">
                    OPERATIONAL EXCELLENCE
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-[#0B3A5B] tracking-tight">
                    Executive Management
                  </h3>
                  <p className="text-xs sm:text-sm text-[#607580] mt-1 max-w-xl mx-auto">
                    Healthcare operations, compliance, and patient experience directors.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                  {teamMembers.filter(m => m.category === 'executive_management').map((member, index) => (
                    <div key={member.id || index} className="h-full">
                      <TeamMember {...member} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </AnimateIn>
        )}
      </div>
    </div>
  );
}
