"use client";

import { useState, useEffect } from "react";
import {
  FaBullseye,
  FaLightbulb,
  FaUserMd,
  FaStethoscope,
  FaHeartbeat,
} from "react-icons/fa";
import AnimateIn from "@/components/ui/animations/AnimateIn";
import { HiSparkles } from "react-icons/hi";

const TeamMember = ({ name, role, expertise, image }) => (
  <div className="group relative flex flex-col items-center rounded-lg border border-gray-200 bg-white p-5 text-center shadow-sm hover:shadow-md transition-all duration-300 h-full overflow-hidden hover:-translate-y-0.5">
    <div className="relative mb-4">
      {image ? (
        <img src={image} alt={name} className="relative h-24 w-24 md:h-28 md:w-28 rounded-full border-[3px] border-gray-50 shadow-sm object-cover z-10" />
      ) : (
        <div className="relative h-24 w-24 md:h-28 md:w-28 rounded-full border-[3px] border-gray-50 shadow-sm bg-gray-50 flex items-center justify-center z-10">
          <FaUserMd className="h-10 w-10 text-gray-400" />
        </div>
      )}
    </div>

    <div className="flex flex-col flex-grow items-center w-full z-10">
      <h3 className="mb-1 text-base md:text-lg font-bold text-gray-900 group-hover:text-[#0067A1] transition-colors line-clamp-1 w-full">{name}</h3>
      <p className="mb-3 text-[10px] md:text-xs font-bold tracking-wider text-[#0067A1] uppercase bg-[#0067A1]/5 px-2.5 py-1 rounded-md">{role}</p>
      <div className="mt-auto w-full pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500 leading-relaxed font-medium px-1 line-clamp-3">{expertise || "Dedicated medical professional."}</p>
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
            title: json.data.title || "ABOUT US",
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

  // Map sections by key for easy access
  const opening = aboutSections.find(s => s.section_key === 'opening');
  const vision = aboutSections.find(s => s.section_key === 'vision');
  const mission = aboutSections.find(s => s.section_key === 'mission');
  const differentiators = aboutSections.find(s => s.section_key === 'differentiators');
  const foundersMessage = aboutSections.find(s => s.section_key === 'founders_message');

  return (
    <div className="min-h-screen bg-[#F6F8FA]  pb-20">
      {/* Page Header Component */}
      <div className="bg-[#0067A1] px-6 py-10 md:px-10 md:py-14 text-center text-white">
        <div className="container mx-auto max-w-full">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
            <FaHeartbeat className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3">
            {headerData?.heading || "About MediConnect.fit"}
          </h1>
          {headerData?.subheading && (
            <p className="mt-2 text-sm md:text-base text-white/90 max-w-2xl mx-auto">
              {headerData.subheading}
            </p>
          )}
        </div>
      </div>

      <div className="relative  mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">

        {/* Opening Statement */}
        {opening && (
          <AnimateIn delay={100}>
            <div className="max-w-4xl mx-auto text-center mb-16 px-4">
              <p className="text-xl md:text-2xl text-[#003358] font-medium leading-relaxed"
                dangerouslySetInnerHTML={{ __html: opening.content }} />
            </div>
          </AnimateIn>
        )}

        {/* Vision & Mission Grid */}
        <div className="grid gap-8 lg:grid-cols-2 max-w-full mx-auto mb-16">
          {vision && (
            <AnimateIn delay={200} className="relative h-full">
              <div className="relative rounded-2xl border border-gray-200 bg-white p-8 shadow-sm h-full flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0067A1]/10 text-[#0067A1] mb-6">
                  <FaLightbulb className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{vision.title || "Our Vision"}</h2>
                <div className="text-base text-gray-600 leading-relaxed max-w-none prose prose-sm prose-p:my-2"
                  dangerouslySetInnerHTML={{ __html: vision.content }} />
              </div>
            </AnimateIn>
          )}

          {mission && (
            <AnimateIn delay={300} className="relative h-full">
              <div className="relative rounded-2xl border border-gray-200 bg-white p-8 shadow-sm h-full flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0067A1]/10 text-[#0067A1] mb-6">
                  <FaBullseye className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{mission.title || "Our Mission"}</h2>
                <div className="text-base text-gray-600 leading-relaxed max-w-none prose prose-sm prose-p:my-2"
                  dangerouslySetInnerHTML={{ __html: mission.content }} />
              </div>
            </AnimateIn>
          )}
        </div>

        {/* What Makes Us Different */}
        {differentiators && (
          <AnimateIn delay={400} className="max-w-full mx-auto mb-20">
            <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-12 shadow-sm relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
                  {differentiators.title || "What Makes Us Different"}
                </h2>
                <div className="flex justify-center">
                  {/* Styled List rendering */}
                  <div className="w-full text-base text-gray-700 leading-relaxed 
                                  prose prose-sm max-w-none 
                                  prose-ul:grid prose-ul:sm:grid-cols-2 prose-ul:gap-4 md:prose-ul:gap-6 prose-ul:list-none prose-ul:pl-0 
                                  prose-li:flex prose-li:items-center prose-li:gap-4 prose-li:bg-[#F6F8FA] prose-li:p-5 prose-li:rounded-xl prose-li:border prose-li:border-gray-100 prose-li:m-0 prose-li:font-medium
                                  [&_li::before]:content-['✓'] [&_li::before]:text-white [&_li::before]:bg-[#0067A1] [&_li::before]:rounded-full [&_li::before]:w-6 [&_li::before]:h-6 [&_li::before]:flex [&_li::before]:items-center [&_li::before]:justify-center [&_li::before]:text-sm [&_li::before]:flex-shrink-0"
                    dangerouslySetInnerHTML={{ __html: differentiators.content }} />
                </div>
              </div>
            </div>
          </AnimateIn>
        )}

        {/* Founders Section (High Trust Story) */}
        {(teamMembers.length > 0 || foundersMessage) && (
          <AnimateIn delay={500} className="max-w-full mx-auto mt-20 pt-10 border-t border-gray-200">
            <div className="text-center mb-10">
              <p className="text-sm font-semibold tracking-wide text-[#0067A1] uppercase mb-2">Our Team</p>
              <h2 className="text-3xl font-extrabold text-[#0067A1] sm:text-4xl">Meet the People Behind MediConnect</h2>
              <p className="mt-3 text-lg text-gray-600">Dedicated professionals committed to transforming healthcare.</p>
            </div>

            <div className="flex flex-col items-center justify-center w-full">
              {/* Founders Message */}
              {foundersMessage && (
                <div className="w-full max-w-full bg-[#003358] rounded-3xl p-8 md:p-12 text-white relative shadow-md flex flex-col justify-center mb-16 overflow-hidden">
                  <FaLightbulb className="absolute -top-4 -right-4 text-[#0067A1]/30 w-32 h-32" />
                  <h3 className="text-xl md:text-2xl font-bold text-teal-100 mb-6 relative z-10">
                    {foundersMessage.title || "Message from the Founders"}
                  </h3>
                  <div className="text-lg md:text-xl text-white/90 leading-relaxed italic border-l-4 border-[#0067A1] pl-6 py-2 pb-4 font-light dropdown-style-quotes relative z-10">
                    {foundersMessage.content?.replace(/^<p>|<\/p>$/g, '')}
                  </div>
                </div>
              )}

              {/* Top Management Section */}
              {teamMembers.filter(m => m.category === 'top_management' || !m.category).length > 0 && (
                <div className="w-full mb-16">
                  <div className="text-center mb-8">
                    <p className="text-sm font-semibold tracking-wide text-[#0067A1] uppercase mb-2">Leadership</p>
                    <h3 className="text-2xl font-extrabold text-[#0067A1] sm:text-3xl">Top Management</h3>
                  </div>
                  <div className="flex flex-wrap justify-center gap-6 lg:gap-8 w-full">
                    {teamMembers.filter(m => m.category === 'top_management' || !m.category).map((member, index) => (
                      <div key={member.id || index} className="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(25%-1.5rem)]">
                        <TeamMember {...member} icon={FaStethoscope} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Executive Management Section */}
              {teamMembers.filter(m => m.category === 'executive_management').length > 0 && (
                <div className="w-full">
                  <div className="text-center mb-8">
                    <p className="text-sm font-semibold tracking-wide text-[#0067A1] uppercase mb-2">Operations</p>
                    <h3 className="text-2xl font-extrabold text-[#0067A1] sm:text-3xl">Executive Management</h3>
                  </div>
                  <div className="flex flex-wrap justify-center gap-6 lg:gap-8 w-full">
                    {teamMembers.filter(m => m.category === 'executive_management').map((member, index) => (
                      <div key={member.id || index} className="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(25%-1.5rem)]">
                        <TeamMember {...member} icon={FaUserMd} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </AnimateIn>
        )}

      </div>
    </div>
  );
}
