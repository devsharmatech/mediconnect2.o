import Link from "next/link";
import {
  Clock,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Stethoscope,
  Activity,
  HeartHandshake,
  Hospital,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  MessageSquare,
  Sparkles,
  Pill,
  Home as HomeIcon,
  HelpCircle,
  FileText
} from "lucide-react";

export const metadata = {
  title: "Doctor-Guided Support & Phased Roadmap | MediConnect.fit",
  description: "MediConnect.fit phased architecture roadmap. Explore live healthcare services and upcoming doctor-guided care support pathways."
};

export default function ComingSoonPage() {
  // Layer 2 & Layer 3 Upcoming Capabilities (per Document Specifications)
  const upcomingRoadmap = [
    {
      layer: "LAYER 2",
      badge: "In Active Development",
      badgeColor: "bg-[#159A8A]/10 text-[#159A8A] border-[#159A8A]/30",
      title: "Doctor-Guided Support Pathways",
      summary: "Additional doctor-led services for complex, multi-step, or longitudinal care coordination.",
      points: [
        "Second opinions before significant procedures or surgeries",
        "Structured care coordination for chronic conditions (Thyroid, Diabetes, PCOS)",
        "Pre-hospitalization guidance and surgical preparation consults",
        "Confusion to clarity: complex diagnostic report interpretation with a doctor"
      ],
      governance: "Clinical decisions remain strictly with treating, qualified medical practitioners."
    },
    {
      layer: "LAYER 3",
      badge: "Planned Scope",
      badgeColor: "bg-[#1677A8]/10 text-[#1677A8] border-[#1677A8]/30",
      title: "Connected Healthcare Network",
      summary: "Connecting accredited hospital networks and clinical partners with clear medical governance boundaries.",
      points: [
        "Structured hospital referrals and admission coordination",
        "Multi-disciplinary care circles across verified specialist teams",
        "Care Episode ID integration for connected continuity across episodes",
        "Post-discharge care coordination with home nursing follow-up"
      ],
      governance: "Operates with formal clinical partner agreements and patient consent protocols."
    }
  ];

  // Frozen Core Healthcare Services (Section 3 of Developer Handover Document)
  const coreLiveServices = [
    {
      name: "Doctor Consultation",
      tagline: "Live • Primary Pathway",
      desc: "Consult experienced doctors online or in-person across verified clinical specialties.",
      href: "/doctors",
      cta: "Consult Doctor",
      icon: Stethoscope
    },
    {
      name: "Diagnostics",
      tagline: "Live • NABL Accredited",
      desc: "Book lab tests and diagnostic services with trusted partner laboratories and home collection.",
      href: "/dashboard/lab-booking",
      cta: "Book Test",
      icon: Activity
    },
    {
      name: "Pharmacy",
      tagline: "Live • Genuine Medicines",
      desc: "Order genuine prescription medicines and healthcare essentials with home delivery.",
      href: "/medicine-order",
      cta: "Order Medicines",
      icon: Pill
    },
    {
      name: "Home Healthcare & Nursing Care",
      tagline: "Live • Care at Home",
      desc: "Get certified nursing care, medical equipment, and clinical support at home.",
      href: "/nursing-care",
      cta: "Explore Home Care",
      icon: HomeIcon
    },
    {
      name: "MediConnect DigiLocker",
      tagline: "Live • Digital Records",
      desc: "Keep your medical records, prescriptions, and lab reports encrypted, organized and accessible.",
      href: "/digital-locker",
      cta: "Open DigiLocker",
      icon: Lock
    }
  ];

  // Specialized Health Programs (Section 2 & 3 of Handover Document)
  const specializedPrograms = [
    {
      title: "CardioConnect",
      tagline: "Heart-health wellness",
      desc: "Consult cardiologists, access cardiac tests, and monitor resting vitals.",
      href: "/cardio-connect",
      cta: "CardioConnect"
    },
    {
      title: "LungConnect",
      tagline: "Respiratory wellness",
      desc: "Consult pulmonologists, monitor peak flow, and track breathing capacity.",
      href: "/lung-connect",
      cta: "LungConnect"
    },
    {
      title: "Health Library",
      tagline: "Evidence-based knowledge",
      desc: "Doctor-reviewed medical guides, preventive habits, and health insights.",
      href: "/health-insights",
      cta: "Health Library"
    }
  ];

  return (
    <div className="min-h-screen bg-[#F7FAFC] text-[#18303D] font-sans">
      {/* ─── Breadcrumb Navigation (Under Navbar • Responsive) ─── */}
      <div className="bg-[#F7FAFC] border-b border-[#DCE6EB]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex items-center justify-between gap-3 text-[11px] sm:text-xs">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 sm:gap-2 text-[#607580] min-w-0 overflow-x-auto no-scrollbar whitespace-nowrap">
            <Link href="/" className="hover:text-[#1677A8] transition-colors shrink-0">
              Home
            </Link>
            <span className="text-[#DCE6EB] shrink-0">/</span>
            <Link href="/services" className="hover:text-[#1677A8] transition-colors shrink-0">
              Services
            </Link>
            <span className="text-[#DCE6EB] shrink-0">/</span>
            <span className="text-[#0B3A5B] font-semibold shrink-0">Care Roadmap</span>
          </nav>

          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#1677A8] hover:text-[#0B3A5B] transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>

      {/* ─── Section 1: Institutional Authority Hero (Section 4 & 5 Hierarchy) ─── */}
      <section className="bg-white border-b border-[#DCE6EB] py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Eyebrow - Clean Typographic (No Border, No Background) */}
          <p className="text-[11px] sm:text-xs font-bold tracking-widest text-[#1677A8] uppercase mb-2.5 flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#1677A8]" />
            <span>Phased Medical Architecture • Roadmap</span>
          </p>

          {/* H1: Deep Navy #0B3A5B */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0B3A5B] tracking-tight mb-3">
            Structured Care Pathways (Coming Soon)
          </h1>

          {/* Subheading: Primary Text #18303D */}
          <p className="text-sm sm:text-base font-medium text-[#18303D] max-w-2xl mx-auto mb-3">
            MediConnect.fit is developing structured care pathways to support patients beyond individual consultations.
          </p>

          {/* Body Copy: Secondary Text #607580 */}
          <p className="text-xs sm:text-sm text-[#607580] max-w-2xl mx-auto leading-relaxed mb-6">
            These programs are designed to help patients understand their condition, organize multi-step care, and move forward with clarity — without overpromising or replacing your treating clinician.
          </p>

          {/* Approved Calm Guiding Quote from Reference Document */}
          <div className="inline-block bg-[#F7FAFC] border border-[#DCE6EB] rounded-md px-5 py-2.5 max-w-xl mx-auto">
            <p className="text-xs sm:text-sm text-[#0B3A5B] font-semibold italic">
              “Healthcare decisions feel easier when you’re guided, not rushed.”
            </p>
          </div>
        </div>
      </section>

      {/* ─── Institutional Trust Strip (Section 2 & 3 of Handover Spec) ─── */}
      <section className="bg-[#F7FAFC] border-b border-[#DCE6EB] py-3.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-[11px] text-[#607580]">
          <span className="font-semibold text-[#0B3A5B] uppercase tracking-wider text-[10px]">
            Platform Standards:
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2FA36B]" /> NMC Registered Doctors
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#1677A8]" /> ABDM / NHA Aligned
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#0B3A5B]" /> ISO 9001:2015 Certified
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#0B3A5B]" /> ISO 27001:2022 Certified
          </span>
          <span className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#159A8A]" /> Patient Data Protection
          </span>
        </div>
      </section>

      {/* ─── Main Content Container ─── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* ─── Section 2: Upcoming Roadmap Cards (Equal Height, Clean Medical Spacing) ─── */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-[#DCE6EB] pb-2.5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1677A8]">
                Phased Capabilities
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-[#0B3A5B]">
                Upcoming Care Programs
              </h2>
            </div>
            <span className="text-xs text-[#607580]">
              Built to support care organization and decision-making
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
            {upcomingRoadmap.map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-md border border-[#DCE6EB] p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:border-[#1677A8] transition-colors"
              >
                <div>
                  {/* Top Layer & Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-bold text-[#0B3A5B] tracking-wide">
                      {item.layer}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-[#0B3A5B] mb-2">
                    {item.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-[#607580] leading-relaxed mb-4">
                    {item.summary}
                  </p>

                  {/* Capabilities List */}
                  <div className="pt-3 border-t border-[#F7FAFC]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#18303D] block mb-2.5">
                      Planned Scope:
                    </span>
                    <ul className="space-y-2">
                      {item.points.map((pt, pIdx) => (
                        <li key={pIdx} className="text-xs text-[#18303D] flex items-start gap-2 leading-relaxed">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#159A8A] shrink-0 mt-0.5" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Card Footer Governance */}
                <div className="mt-5 pt-3 border-t border-[#DCE6EB] text-[11px] text-[#607580] flex items-center justify-between">
                  <span>Medical Governance:</span>
                  <span className="font-semibold text-[#0B3A5B] text-right">Doctor-Led</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Section 3: Clinical Content Safety Notice (Section 14 Compliance) ─── */}
        <section className="bg-white border border-[#DCE6EB] rounded-md p-4 sm:p-5 flex items-start gap-3.5">
          <ShieldCheck className="w-5 h-5 text-[#0B3A5B] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B3A5B]">
              Clinical Content Safety & Professional Governance
            </h4>
            <p className="text-xs text-[#607580] leading-relaxed">
              MediConnect.fit programs support patient coordination, report understanding, and care organization. They do not introduce automated diagnostic, predictive, or outcome claims. All final clinical decisions and prescriptions remain exclusively with licensed treating doctors.
            </p>
          </div>
        </section>

        {/* ─── Section 4: Available Right Now (Section 3 Core Services: Frozen) ─── */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-[#DCE6EB] pb-2.5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2FA36B]">
                Live Services
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-[#0B3A5B]">
                Available Right Now on MediConnect.fit
              </h2>
            </div>
            <span className="text-xs text-[#607580]">
              Five core services operational with verified providers
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {coreLiveServices.map((srv, sIdx) => {
              const SrvIcon = srv.icon;
              return (
                <div
                  key={sIdx}
                  className="bg-white rounded-md border border-[#DCE6EB] p-4 flex flex-col justify-between hover:border-[#1677A8] transition-colors shadow-2xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded bg-[#F7FAFC] text-[#1677A8] border border-[#DCE6EB]">
                        <SrvIcon className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-bold text-[#2FA36B] bg-[#2FA36B]/10 border border-[#2FA36B]/20 px-1.5 py-0.2 rounded uppercase">
                        Live Service
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-[#0B3A5B] mb-1">
                      {srv.name}
                    </h3>
                    <p className="text-[11px] text-[#607580] leading-relaxed mb-4">
                      {srv.desc}
                    </p>
                  </div>

                  <Link
                    href={srv.href}
                    className="inline-flex items-center justify-between w-full px-3 py-2 bg-[#F7FAFC] hover:bg-[#1677A8] text-[#18303D] hover:text-white rounded text-xs font-bold border border-[#DCE6EB] hover:border-[#1677A8] transition-colors"
                  >
                    <span>{srv.cta}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── Section 5: Specialized Health Programs Strip (Section 3 Architecture) ─── */}
        <section className="bg-white border border-[#DCE6EB] rounded-md p-5 sm:p-6 space-y-3">
          <div className="flex items-center justify-between border-b border-[#DCE6EB] pb-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1677A8]">
                Specialized Programs
              </span>
              <h3 className="text-sm font-bold text-[#0B3A5B]">
                Specialized Health Programs & Resources
              </h3>
            </div>
            <span className="text-[11px] text-[#607580]">Live Clinical Programs</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {specializedPrograms.map((prog, pIdx) => (
              <div key={pIdx} className="p-3 bg-[#F7FAFC] rounded border border-[#DCE6EB] flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-[#0B3A5B]">{prog.title}</div>
                  <div className="text-[10px] text-[#1677A8] font-semibold mb-1">{prog.tagline}</div>
                  <p className="text-[11px] text-[#607580] leading-snug mb-3">{prog.desc}</p>
                </div>
                <Link
                  href={prog.href}
                  className="text-xs font-bold text-[#1677A8] hover:text-[#0B3A5B] inline-flex items-center gap-1 transition-colors"
                >
                  <span>Explore {prog.cta}</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Section 6: Support & Assistance (Section 2 Item 11 of Handover Spec) ─── */}
        <section className="bg-white border border-[#DCE6EB] rounded-lg p-6 sm:p-8 text-center space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <h2 className="text-[21px] sm:text-[22px] font-bold text-[#0B3A5B]">
            Need help? We’re here.
          </h2>
          <p className="text-[13.5px] text-[#607580] max-w-lg mx-auto leading-relaxed">
            Get support, information and guidance through multiple channels.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <Link
              href="/services"
              className="px-4 py-2 bg-[#1677A8] hover:bg-[#0B3A5B] text-white rounded text-[13px] font-bold transition-colors shadow-2xs"
            >
              Explore Services
            </Link>
            <Link
              href="/doctors"
              className="px-4 py-2 bg-[#0B3A5B] hover:bg-[#163a5c] text-white rounded text-[13px] font-bold transition-colors shadow-2xs"
            >
              Consult Doctor
            </Link>
            <Link
              href="/"
              className="px-4 py-2 bg-[#F7FAFC] hover:bg-[#DCE6EB] text-[#18303D] rounded text-[13px] font-bold border border-[#DCE6EB] transition-colors"
            >
              Return Home
            </Link>
          </div>

          {/* 4 Support Channels Strip from Document Page 1 */}
          <div className="pt-4 border-t border-[#DCE6EB] flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-[#607580]">
            <span className="flex items-center gap-1.5 font-medium">
              <MessageSquare className="w-3.5 h-3.5 text-[#1677A8]" />
              <span>MediConnect AI: </span>
              <Link href="/services" className="text-[#1677A8] hover:underline font-semibold">
                Chat with AI &rarr;
              </Link>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Mail className="w-3.5 h-3.5 text-[#1677A8]" />
              <span>Email: </span>
              <a href="mailto:support@mediconnect.fit" className="text-[#1677A8] hover:underline font-semibold">
                support@mediconnect.fit
              </a>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Phone className="w-3.5 h-3.5 text-[#1677A8]" />
              <span>Call: </span>
              <a href="tel:+917289043888" className="text-[#0B3A5B] font-semibold hover:underline">
                +91 7289 043888
              </a>
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}
