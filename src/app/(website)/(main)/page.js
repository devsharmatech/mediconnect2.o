"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FaBell,
  FaCalendarCheck,
  FaClipboardList,
  FaFileMedical,
  FaFilter,
  FaNotesMedical,
  FaUserMd,
  FaVideo,
} from "react-icons/fa";
import WellnessServices from "@/components/public-site/ui/WellnessServices";
import Hero from "@/components/public-site/ui/Hero";
import HealthServices from "@/components/public-site/ui/HealthServices";
import Testimonials from "@/components/public-site/ui/Testimonials";
import FAQ from "@/components/public-site/ui/FAQ";
import dynamic from "next/dynamic";
import MedicalNews from "@/components/public-site/ui/MedicalNews";

const LoginModal = dynamic(
  () => import("@/components/public-site/auth/LoginModal"),
  { ssr: false },
);

const SignupModal = dynamic(
  () => import("@/components/public-site/auth/SignupModal"),
  { ssr: false },
);

import FeaturedDoctorsHome from "@/components/public-site/ui/FeaturedDoctorsHome";

export default function Home() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [pageBlocks, setPageBlocks] = useState({});
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(true);

  const [homeData, setHomeData] = useState(null);

  useEffect(() => {
    fetch('/api/cms/page-blocks?page=home')
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          const blocksMap = {};
          json.data.forEach(block => {
            blocksMap[block.block_key] = block;
          });
          setPageBlocks(blocksMap);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoadingBlocks(false));

    fetch('/api/cms/homepage')
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          setHomeData(json.data);
        }
      })
      .catch(console.error);
  }, []);

  const howItWorksSteps = [
    {
      icon: FaClipboardList,
      title: "Search & Filter",
      description: "Find the right doctor by specialty, location, or name.",
    },
    {
      icon: FaUserMd,
      title: "Choose Specialty",
      description: "Select the specific medical department you need.",
    },
    {
      icon: FaCalendarCheck,
      title: "Book & Consult",
      description: "Schedule your slot and consult via video or in-clinic.",
    },
  ];

  const handleLoginClick = () => {
    setIsSignupOpen(false);
    setIsLoginOpen(true);
  };

  const handleSignupClick = () => {
    setIsLoginOpen(false);
    setIsSignupOpen(true);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - Full Width */}
      <section className="w-full">
        <Hero onLoginClick={handleLoginClick} />
      </section>

      <main className="bg-white">
        {/* Featured Doctors, Specialties, and Conditions Section */}
        <section id="book-consultation" className="scroll-mt-8">
          <FeaturedDoctorsHome />
        </section>

        {/* SECTION 2: SERVICES AVAILABLE NOW (CORE PRACTICAL CARE) */}
        <section id="services">
          {/* ... existing HealthServices ... */}
          <HealthServices />

          {/* ... existing supportive tools ... */}
          <div className="container px-4 sm:px-6 lg:px-8 pb-8 lg:pb-10 mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tools Block */}
              <div className="rounded-2xl border border-[#0067A1]/10 bg-[#F6F8FA] p-6 sm:p-8 ">
                <div className="flex flex-col gap-6">
                  <div className="max-w-xl">
                    <p className="text-xs font-semibold tracking-wide text-[#0067A1] uppercase mb-2">
                      Tools that support doctor consultations
                    </p>
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                      Helpful tools around your care
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                      These tools support care. They do not replace doctor
                      consultations or professional medical advice.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                    <a href="/website/coming-soon" className="rounded-xl bg-white border border-[#0067A1]/10 p-4 shadow-sm hover:shadow-md hover:border-[#0067A1]/30 transition-all cursor-pointer block">
                      <p className="text-xs font-semibold text-[#0067A1] mb-1 uppercase tracking-wide">
                        Guided Symptom Check
                      </p>
                      <p className="text-xs text-gray-600">
                        Helps you explain your concern before consulting a doctor.
                      </p>
                      <span className="text-[10px] text-[#0067A1] mt-2 inline-block">Learn more &rarr;</span>
                    </a>
                    <a href="/website/coming-soon" className="rounded-xl bg-white border border-[#0067A1]/10 p-4 shadow-sm hover:shadow-md hover:border-[#0067A1]/30 transition-all cursor-pointer block">
                      <p className="text-xs font-semibold text-[#0067A1] mb-1 uppercase tracking-wide">
                        Health Insights
                      </p>
                      <p className="text-xs text-gray-600">
                        Simple summaries to support doctor-led decisions.
                      </p>
                      <span className="text-[10px] text-[#0067A1] mt-2 inline-block">Learn more &rarr;</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* ABHA Creation Block */}
              <div className="relative rounded-2xl border border-[#0067A1]/10 bg-[#F0FDF4] p-6 sm:p-8 flex flex-col justify-between">
                <div className="absolute top-4 right-4 bg-orange-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full animate-pulse uppercase tracking-wider">
                  Coming Soon
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-wide text-[#15803d] uppercase mb-2">
                    National Health Authority
                  </p>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                    Create Your ABHA Account
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-md">
                    Join India's digital health ecosystem. Create your Ayushman Bharat Health Account (ABHA) to securely store and share your health records.
                  </p>
                </div>
                <div className="mt-6">
                  <a href="/coming-soon" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-[#0067A1] hover:bg-[#004F7C] transition-colors shadow-lg hover:shadow-xl">
                    Coming Soon &rarr;
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* NEW: Wellness Services Section (CardioConnect & LungConnect) */}
        <WellnessServices onLoginClick={handleLoginClick} />


        {/* Mission block - Why mediconnect.fit exists */}
        <section className="bg-white border-y border-gray-100">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-5 lg:py-8">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-xs font-semibold tracking-wide text-[#0067A1] uppercase mb-2">
                {homeData?.mission_title || "Our Mission"}
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#0067A1] mb-4">
                {homeData?.mission_heading || "Making Healthcare Easier for Patients"}
              </h2>
              {homeData?.mission_text ? (
                <div
                  className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 prose prose-sm max-w-none mx-auto text-center [&>p]:mb-3"
                  dangerouslySetInnerHTML={{ __html: homeData.mission_text.replace(/&nbsp;/g, ' ') }}
                />
              ) : (
                <>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3">
                    Patients many times have to go to different places for doctor visits, tests, medicines, and follow-ups.
                  </p>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3">
                    MediConnect.fit exists to make healthcare easier by helping patients manage these needs in one place.
                  </p>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3">
                    Our aim is to save patients time and effort, reduce unnecessary worry, and support honest medical advice.
                  </p>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                    We focus on doctor-led care that patients can trust, without rushing decisions or taking shortcuts.
                  </p>
                </>
              )}
            </div>
          </div>
        </section>

        {/* BANNER BREAK (CALM & PREMIUM) */}
        <section className="bg-[#F6F8FA] border-y border-gray-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 text-center">
            <p className="text-lg sm:text-xl lg:text-2xl font-semibold text-[#003358] leading-relaxed italic">
              "Healthcare decisions feel easier when you're guided, not rushed."
            </p>
          </div>
        </section>
        {/* Connected Care Ecosystem - image left, text right */}
        <section className="bg-[#F6F8FA] border-y border-gray-100">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
              {/* Image */}
              <div className="order-2 w-full overflow-hidden">
                <div className="relative w-full">
                  <img
                    src={pageBlocks["home_connected_care"]?.image || "/p3.png"}
                    alt="Connected care across services"
                    className="w-full h-72 sm:h-80 lg:h-[420px] object-cover rounded-2xl border border-gray-200"
                  />
                </div>
              </div>
              {/* Text */}

              <div className="space-y-4 order-1 min-w-0 whitespace-normal">
                {isLoadingBlocks ? (
                  <div className="animate-pulse flex flex-col gap-4 w-full">
                    <div className="h-4 bg-gray-100 rounded w-1/4"></div>
                    <div className="h-8 bg-gray-100 rounded w-3/4"></div>
                    <div className="h-24 bg-gray-100 rounded w-full"></div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-semibold tracking-wide text-[#0067A1] uppercase">
                      {pageBlocks["home_connected_care"]?.eyebrow}
                    </p>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0067A1]">
                      {pageBlocks["home_connected_care"]?.title}
                    </h2>
                    {pageBlocks["home_connected_care"]?.content && (
                      <div className="text-sm sm:text-base text-gray-700 leading-relaxed [&_p]:mb-4 [&_*]:!whitespace-normal w-full" dangerouslySetInnerHTML={{ __html: pageBlocks["home_connected_care"].content.replace(/&nbsp;/g, ' ') }} />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
        {/* How It Works */}
        <section id="how-it-works" className="bg-white py-8 lg:py-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                How It <span className="text-[#0067A1]">Works</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Get started with doctor consultations in 3 simple steps
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Link href="/website/doctors?scroll=doctors-list#doctors-list" className="text-center group block cursor-pointer">
                <div className="relative mb-6">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#0067A1] shadow-sm group-hover:scale-105 transition-transform duration-300">
                    <FaClipboardList className="h-8 w-8 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#0067A1] bg-white text-sm font-bold text-[#0067A1]">
                    1
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-[#0067A1] transition-colors">
                  Choose Doctor Specialty
                </h3>
                <p className="text-gray-600">
                  Select the medical specialty relevant to your health concern
                </p>
              </Link>

              <Link href="/website/doctors?scroll=doctors-list#doctors-list" className="text-center group block cursor-pointer">
                <div className="relative mb-6">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#0067A1] shadow-sm group-hover:scale-105 transition-transform duration-300">
                    <FaUserMd className="h-8 w-8 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#0067A1] bg-white text-sm font-bold text-[#0067A1]">
                    2
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-[#0067A1] transition-colors">
                  Choose Your Doctor
                </h3>
                <p className="text-gray-600">
                  Browse verified doctors and pick the one that suits your needs
                </p>
              </Link>

              <Link href="/website/doctors?scroll=doctors-list#doctors-list" className="text-center group block cursor-pointer">
                <div className="relative mb-6">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#0067A1] shadow-sm group-hover:scale-105 transition-transform duration-300">
                    <FaCalendarCheck className="h-8 w-8 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#0067A1] bg-white text-sm font-bold text-[#0067A1]">
                    3
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-[#0067A1] transition-colors">
                  Choose Time & Book Appointment
                </h3>
                <p className="text-gray-600">
                  Pick a convenient time slot and book your appointment instantly
                </p>
              </Link>
            </div>
          </div>
        </section>
        {/* SECTION 5: HOW MEDICONNECT APPROACHES CARE - Image Left */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Image */}
            <div className="order-1 w-full overflow-hidden">
              <div className="relative w-full">
                <img
                  src={pageBlocks["home_care_approaches"]?.image || "/p4.png"}
                  alt="Doctor patient communication"
                  className="w-full h-72 sm:h-80 lg:h-[420px] object-cover rounded-2xl border border-gray-200"
                />
              </div>
            </div>
            <div className="space-y-6 order-2 min-w-0 whitespace-normal">
              {isLoadingBlocks ? (
                <div className="animate-pulse flex flex-col gap-4 w-full">
                  <div className="h-4 bg-gray-100 rounded w-1/4"></div>
                  <div className="h-10 bg-gray-100 rounded w-3/4"></div>
                  <div className="h-48 bg-gray-100 rounded w-full"></div>
                </div>
              ) : (
                <>
                  <p className="text-sm font-semibold tracking-wide text-[#0067A1] uppercase">
                    {pageBlocks["home_care_approaches"]?.eyebrow}
                  </p>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0067A1] leading-tight">
                    {pageBlocks["home_care_approaches"]?.title}
                  </h2>
                  {pageBlocks["home_care_approaches"]?.content && (
                    <div className="text-lg text-gray-600 leading-relaxed [&_p]:mb-4 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-2 [&_ul]:my-4 [&_li]:text-gray-700 [&_*]:!whitespace-normal w-full" dangerouslySetInnerHTML={{ __html: pageBlocks["home_care_approaches"].content.replace(/&nbsp;/g, ' ') }} />
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 6: HEALTH RECORDS & PRIVACY - Image Right */}
        <section className="bg-[#F6F8FA] mx-auto border-y border-gray-100">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Text Content */}
              <div className="space-y-6 order-2 lg:order-1 min-w-0 whitespace-normal">
                {isLoadingBlocks ? (
                  <div className="animate-pulse flex flex-col gap-4 w-full">
                    <div className="h-4 bg-gray-100 rounded w-1/4"></div>
                    <div className="h-10 bg-gray-100 rounded w-3/4"></div>
                    <div className="h-32 bg-gray-100 rounded w-full"></div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-semibold tracking-wide text-[#0067A1] uppercase">
                      {pageBlocks["home_privacy"]?.eyebrow}
                    </p>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0067A1] leading-tight">
                      {pageBlocks["home_privacy"]?.title}
                    </h2>
                    {pageBlocks["home_privacy"]?.content && (
                      <div className="text-lg text-gray-600 leading-relaxed [&_p]:mb-4 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-2 [&_ul]:my-4 [&_li]:text-gray-700 [&_*]:!whitespace-normal w-full" dangerouslySetInnerHTML={{ __html: pageBlocks["home_privacy"].content.replace(/&nbsp;/g, ' ') }} />
                    )}
                  </>
                )}
              </div>
              {/* Image */}
              <div className="order-1 lg:order-2 w-full overflow-hidden">
                <div className="relative w-full">
                  <img
                    src={pageBlocks["home_privacy"]?.image || "/p5.png"}
                    alt="Secure health records"
                    className="w-full h-72 sm:h-80 lg:h-[420px] object-cover rounded-2xl border border-gray-200"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6B: ROADMAP - LAYERS 1, 2 & 3 */}
        <section className="bg-[#003358] border-y border-slate-800/60">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
            <div className="max-w-3xl mx-auto text-center mb-8">
              {isLoadingBlocks ? (
                <div className="animate-pulse flex flex-col items-center gap-3 w-full">
                  <div className="h-4 bg-slate-700 rounded w-1/3"></div>
                  <div className="h-8 bg-slate-700 rounded w-2/3"></div>
                  <div className="h-16 bg-slate-700 rounded w-3/4"></div>
                </div>
              ) : (
                <>
                  <p className="text-sm font-semibold tracking-wide text-[#E0F2F1] uppercase mb-3">
                    {pageBlocks["home_roadmap_header"]?.eyebrow}
                  </p>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight mb-3">
                    {pageBlocks["home_roadmap_header"]?.title}
                  </h2>
                  {pageBlocks["home_roadmap_header"]?.content && (
                    <div className="text-sm sm:text-base text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: pageBlocks["home_roadmap_header"].content.replace(/&nbsp;/g, ' ') }} />
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              <div className="rounded-2xl border border-amber-500/60 bg-slate-900/70 p-6 flex flex-col">
                {isLoadingBlocks ? (
                  <div className="animate-pulse flex flex-col gap-3 w-full">
                    <div className="h-3 bg-slate-700 rounded w-1/3"></div>
                    <div className="h-6 bg-slate-700 rounded w-2/3"></div>
                    <div className="h-20 bg-slate-700 rounded w-full"></div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-amber-300 uppercase mb-2 tracking-wide">
                      {pageBlocks["home_roadmap_layer1"]?.eyebrow}
                    </p>
                    <h3 className="text-lg font-semibold text-white mb-3">
                      {pageBlocks["home_roadmap_layer1"]?.title}
                    </h3>
                    {pageBlocks["home_roadmap_layer1"]?.content && (
                      <div className="text-sm text-slate-300 mb-3 flex-1 flex flex-col space-y-2 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-1.5 [&_ul]:text-xs [&_ul]:text-slate-300 [&_p]:mb-2" dangerouslySetInnerHTML={{ __html: pageBlocks["home_roadmap_layer1"].content.replace(/&nbsp;/g, ' ') }} />
                    )}
                  </>
                )}
              </div>

              <div className="rounded-2xl border border-[#0067A1]/60 bg-slate-900/70 p-6 flex flex-col">
                {isLoadingBlocks ? (
                  <div className="animate-pulse flex flex-col gap-3 w-full">
                    <div className="h-3 bg-slate-700 rounded w-1/3"></div>
                    <div className="h-6 bg-slate-700 rounded w-2/3"></div>
                    <div className="h-20 bg-slate-700 rounded w-full"></div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-[#E0F2F1] uppercase mb-2 tracking-wide">
                      {pageBlocks["home_roadmap_layer2"]?.eyebrow}
                    </p>
                    <h3 className="text-lg font-semibold text-white mb-3">
                      {pageBlocks["home_roadmap_layer2"]?.title}
                    </h3>
                    {pageBlocks["home_roadmap_layer2"]?.content && (
                      <div className="text-sm text-slate-300 mb-3 flex-1 flex flex-col space-y-2 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-1.5 [&_ul]:text-xs [&_ul]:text-slate-300 [&_p]:mb-2" dangerouslySetInnerHTML={{ __html: pageBlocks["home_roadmap_layer2"].content.replace(/&nbsp;/g, ' ') }} />
                    )}
                  </>
                )}
              </div>

              <div className="rounded-2xl border border-[#0067A1]/60 bg-slate-900/70 p-6 flex flex-col">
                {isLoadingBlocks ? (
                  <div className="animate-pulse flex flex-col gap-3 w-full">
                    <div className="h-3 bg-slate-700 rounded w-1/3"></div>
                    <div className="h-6 bg-slate-700 rounded w-2/3"></div>
                    <div className="h-20 bg-slate-700 rounded w-full"></div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-[#E0F2F1] uppercase mb-2 tracking-wide">
                      {pageBlocks["home_roadmap_layer3"]?.eyebrow}
                    </p>
                    <h3 className="text-lg font-semibold text-white mb-3">
                      {pageBlocks["home_roadmap_layer3"]?.title}
                    </h3>
                    {pageBlocks["home_roadmap_layer3"]?.content && (
                      <div className="text-sm text-slate-300 mb-3 flex-1 flex flex-col space-y-2 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-1.5 [&_ul]:text-xs [&_ul]:text-slate-300 [&_p]:mb-2" dangerouslySetInnerHTML={{ __html: pageBlocks["home_roadmap_layer3"].content.replace(/&nbsp;/g, ' ') }} />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* MEDICAL NEWS - Briefings */}
        <MedicalNews />

        {/* TRUST & SOCIAL PROOF - Patients, doctors and partners */}
        <Testimonials />

        {/* FAQ Section - common patient questions */}
        <FAQ />

        {/* SECTION 7: TRUST & COMPLIANCE - Centered with Icons */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          <div className="text-center mb-8">
            <p className="text-sm font-semibold tracking-wide text-[#0067A1] uppercase mb-4">
              Trust & Compliance
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0067A1] leading-tight">
              Built on Medical Standards
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow text-center">
              <div className="w-14 h-14 bg-[#0067A1] rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Registered Professionals
              </h3>
              <p className="text-sm text-gray-600">
                Care delivered by registered medical professionals
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow text-center">
              <div className="w-14 h-14 bg-[#0067A1] rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Telemedicine Aligned
              </h3>
              <p className="text-sm text-gray-600">
                Services aligned with Government of India guidelines
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow text-center">
              <div className="w-14 h-14 bg-[#0067A1] rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Data Protection
              </h3>
              <p className="text-sm text-gray-600">
                Compliant with Indian data protection laws
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow text-center">
              <div className="w-14 h-14 bg-[#0067A1] rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Patient Safety First
              </h3>
              <p className="text-sm text-gray-600">
                Ethical care as our core principle
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Modals */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSignupClick={handleSignupClick}
      />
      <SignupModal
        isOpen={isSignupOpen}
        onClose={() => setIsSignupOpen(false)}
        onLoginClick={handleLoginClick}
      />
    </div>
  );
}
