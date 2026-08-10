"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, Mail, AlertTriangle, Info } from "lucide-react";

export default function NursingTermsOfUsePage() {
  const sections = [
    {
      title: "1. Acceptance of Terms",
      content:
        "By accessing or using MediConnect.fit, you agree to be bound by these Terms of Use. If you do not agree, please do not use the platform.",
    },
    {
      title: "2. Nature of Services",
      content: "MediConnect is a healthcare coordination platform.",
      heading: "We do not:",
      list: [
        "Provide nursing or home care services",
        "Employ nurses or caregivers",
        "Supervise or control service delivery",
        "Guarantee service quality or outcomes",
      ],
      note: "All services are provided by independent third-party service providers.",
      highlight:
        "The service will be provided directly by the partner. MediConnect.fit does not control service delivery.",
    },
    {
      title: "3. User Responsibilities",
      content: "Users agree to:",
      list: [
        "Provide accurate and truthful information",
        "Not share sensitive medical records unless explicitly requested",
        "Use the platform only for lawful purposes",
      ],
      note: "MediConnect is not responsible for consequences arising from inaccurate or incomplete information provided by users.",
    },
    {
      title: "4. Service Requests & Referrals",
      list: [
        "Submitting a request does not guarantee service availability",
        "MediConnect may contact users to understand requirements",
        "Final service delivery depends on third-party provider availability and agreement",
      ],
      content:
        "MediConnect reserves the right to decline or discontinue coordination in certain cases.",
      highlight:
        "MediConnect does not operate as an emergency response service.",
    },
    {
      title: "5. Payments",
      content:
        "MediConnect does not collect payments for nursing or home care services through the platform unless explicitly stated.\n\nAny payment arrangements are made directly between the user and the service provider.",
    },
    {
      title: "6. Limitation of Liability",
      content: "To the maximum extent permitted by law:",
      list: [
        "MediConnect is not liable for acts, omissions, or conduct of third-party service providers",
        "MediConnect is not responsible for service delays, outcomes, or disputes",
      ],
      note: "Users agree to use the platform at their own discretion and risk.",
    },
    {
      title: "7. Intellectual Property",
      content:
        "All content, branding, and platform materials are the property of MediConnect unless otherwise stated. Unauthorized use is prohibited.",
    },
    {
      title: "8. Suspension or Termination",
      content:
        "MediConnect reserves the right to suspend or terminate access if:",
      list: [
        "Terms are violated",
        "Misuse of the platform is detected",
        "Legal or compliance risks arise",
      ],
    },
    {
      title: "9. Governing Law",
      content:
        "These Terms are governed by the laws of India, and courts located in India shall have jurisdiction.",
    },
    {
      title: "10. Contact Information",
      content: "For questions or concerns regarding these Terms:",
      email: "info@mediconnect.fit",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#0067A1] via-[#0080C6] to-[#0067A1] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <Link
            href="/website/nursing-care"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Nursing Care Request
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/10">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Terms of Use</h1>
              <p className="text-white/60 text-sm mt-1">
                MediConnect.fit — Nursing & Home Care Services
              </p>
            </div>
          </div>
          <p className="mt-4 text-white/50 text-sm">Last updated: 12-02-2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="space-y-8">
          {sections.map((section, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-sm"
            >
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                {section.title}
              </h2>

              {section.content && (
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line mb-4">
                  {section.content}
                </p>
              )}

              {section.heading && (
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  {section.heading}
                </p>
              )}

              {section.list && (
                <ul className="space-y-1.5 ml-1 mb-3">
                  {section.list.map((item, li) => (
                    <li
                      key={li}
                      className="flex items-start gap-2 text-sm text-gray-600"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0067A1] mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}

              {section.highlight && (
                <div className="flex items-start gap-3 bg-[#0067A1]/5 border border-[#0067A1]/15 rounded-xl p-4 mt-4">
                  <Info className="w-4 h-4 text-[#0067A1] mt-0.5 shrink-0" />
                  <p className="text-sm text-[#0067A1] font-medium italic">
                    &ldquo;{section.highlight}&rdquo;
                  </p>
                </div>
              )}

              {section.note && (
                <p className="text-xs text-gray-500 italic mt-3">
                  {section.note}
                </p>
              )}

              {section.email && (
                <a
                  href={`mailto:${section.email}`}
                  className="inline-flex items-center gap-2 mt-3 text-sm text-[#0067A1] font-medium hover:underline"
                >
                  <Mail className="w-4 h-4" />
                  {section.email}
                </a>
              )}
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-10 text-center space-y-4">
          <div className="flex items-center justify-center gap-6 text-sm">
            <Link
              href="/website/nursing-care/privacy"
              className="text-[#0067A1] font-medium hover:underline"
            >
              Privacy Policy
            </Link>
            <span className="text-gray-300">|</span>
            <Link
              href="/website/nursing-care"
              className="text-[#0067A1] font-medium hover:underline"
            >
              Request Nursing Care
            </Link>
          </div>
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} MediConnect.fit — All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
