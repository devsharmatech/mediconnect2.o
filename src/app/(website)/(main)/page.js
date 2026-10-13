"use client";

import Hero from "@/components/public-site/ui/Hero";
import TrustCertificationStrip from "@/components/public-site/ui/TrustCertificationStrip";
import HowItWorksSteps from "@/components/public-site/ui/HowItWorksSteps";
import FeaturedDoctorsHome from "@/components/public-site/ui/FeaturedDoctorsHome";
import HealthServices from "@/components/public-site/ui/HealthServices";
import ConnectedJourney from "@/components/public-site/ui/ConnectedJourney";
import WellnessServices from "@/components/public-site/ui/WellnessServices";
import WhyChooseUs from "@/components/public-site/ui/WhyChooseUs";
import SupportChannels from "@/components/public-site/ui/SupportChannels";
import AppShowcase from "@/components/public-site/ui/AppShowcase";
import FAQ from "@/components/public-site/ui/FAQ";
import NewsletterAndFinalCTA from "@/components/public-site/ui/NewsletterAndFinalCTA";
import MedicalNews from "@/components/public-site/ui/MedicalNews";

export default function Home() {
  const handleLoginClick = () => {
    window.dispatchEvent(new CustomEvent("open-login-modal", { detail: { userType: "patient" } }));
  };

  return (
    <div className="min-h-screen bg-white w-full max-w-full overflow-x-hidden">
      {/* SECTION 2: Hero Section - Full Width with Doctor Image Slider */}
      <section className="w-full max-w-full overflow-x-hidden">
        <Hero onLoginClick={handleLoginClick} />
      </section>

      <main className="bg-white w-full max-w-full overflow-x-hidden">
        {/* SECTION 3: Trust & Certification Strip */}
        <TrustCertificationStrip />

        {/* SECTIONS 4 & 5: Health Concerns & Specialties Discovery (Unified & Responsive) */}
        <section id="book-consultation" className="scroll-mt-8">
          <FeaturedDoctorsHome />
        </section>

        {/* SECTION 6: Complete Healthcare Services (OUR SERVICES & CARE ECOSYSTEM) */}
        <section id="services">
          <HealthServices />
        </section>

        {/* HOW IT WORKS: Simple & Coordinated 3-Step Process with Animated Lottie Icons */}
        <HowItWorksSteps />

        {/* SECTIONS 7 & 8: One Connected Healthcare Journey & Care Episode */}
        <ConnectedJourney />

        {/* SECTION 9: Specialized Health Programs (CardioConnect & LungConnect Interactive Vitals) */}
        <section id="specialized-programs">
          <WellnessServices onLoginClick={handleLoginClick} />
        </section>

        {/* SECTION 10: Why MediConnect.fit (6 Value Pillars) */}
        <WhyChooseUs />

        {/* SECTION 11: Support Channels (AI, WhatsApp, Email, Phone) */}
        <SupportChannels />

        {/* SECTION 12: Web + Mobile Ecosystem */}
        <AppShowcase />

        {/* MEDICAL NEWS BRIEFINGS */}
        <MedicalNews />

        {/* SECTION 14: Frequently Asked Questions */}
        <FAQ />

        {/* SECTIONS 15 & 16: Newsletter & Final CTA */}
        <NewsletterAndFinalCTA />
      </main>
    </div>
  );
}
