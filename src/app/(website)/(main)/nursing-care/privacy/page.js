"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, Mail, AlertTriangle } from "lucide-react";

export default function NursingPrivacyPolicyPage() {
  const sections = [
    {
      title: "1. Introduction",
      content: `MediConnect.fit ("MediConnect", "we", "our", "us") is a digital healthcare coordination platform operating in India. We help users submit service requests and connect with independent healthcare and home care service providers.\n\nThis Privacy Policy explains how we collect, use, store, and protect personal data when you use our platform, including nursing and home care service requests.\n\nBy using MediConnect, you agree to the practices described in this policy.`,
    },
    {
      title: "2. Information We Collect",
      subsections: [
        {
          subtitle: "2.1 Information You Provide",
          content: "When you use MediConnect or submit a nursing/home care request, we may collect:",
          list: [
            "Name",
            "Mobile number",
            "Email address",
            "Age and gender",
            "City and locality",
            "Service requirement details (non-clinical)",
            "Optional notes shared by you",
          ],
          warning:
            "We do not require or encourage sharing of: Medical reports, Prescriptions, Diagnostic details, Government ID numbers (Aadhaar, PAN, etc.)",
        },
        {
          subtitle: "2.2 Automatically Collected Information",
          content: "We may collect limited technical information such as:",
          list: [
            "IP address",
            "Device type (web/app)",
            "Date and time of form submission",
          ],
          note: "This is used only for security, audit, and compliance purposes.",
        },
      ],
    },
    {
      title: "3. Purpose of Data Collection",
      content:
        "We collect and process personal data only for the following purposes:",
      list: [
        "To receive and process service requests",
        "To coordinate and connect users with suitable service providers",
        "To contact users regarding their request",
        "To maintain internal records, audit trails, and compliance logs",
      ],
      note: "We do not use personal data for advertising or unrelated purposes.",
    },
    {
      title: "4. Consent",
      content:
        "Before submitting any service request, users are required to provide explicit consent for:",
      list: [
        "Collection and processing of personal data",
        "Sharing relevant information with verified service partners solely for service coordination",
      ],
      note: "Consent is recorded with a timestamp and retained for compliance purposes.",
    },
    {
      title: "5. Data Sharing",
      content: "We may share limited personal data only with:",
      list: [
        "Verified, independent service providers",
        "Internal authorized MediConnect staff for coordination",
      ],
      note: "We do not sell, rent, or trade personal data with third parties.",
    },
    {
      title: "6. Data Storage and Security",
      list: [
        "Data is stored on secure servers",
        "Access is restricted to authorized personnel only",
        "Reasonable technical and organizational safeguards are in place",
      ],
      note: "We take reasonable steps to protect personal data against unauthorized access, misuse, or disclosure.",
    },
    {
      title: "7. Data Retention",
      content:
        "Personal data is retained only as long as necessary to:",
      list: [
        "Fulfil service coordination purposes",
        "Meet legal and regulatory obligations",
      ],
      note: "Data is deleted or anonymized once it is no longer required.",
    },
    {
      title: "8. User Rights (As per DPDP Act, 2023)",
      content: "Users have the right to:",
      list: [
        "Access their personal data",
        "Request correction of inaccurate data",
        "Request deletion of data (subject to legal obligations)",
        "Withdraw consent (which may limit our ability to provide services)",
      ],
      note: "Requests can be sent to: privacy@mediconnect.fit",
    },
    {
      title: "9. Third-Party Links",
      content:
        "MediConnect may connect users with third-party service providers. We are not responsible for the privacy practices or content of third-party websites or services.",
    },
    {
      title: "10. Changes to This Policy",
      content:
        'We may update this Privacy Policy from time to time. Any material changes will be reflected with an updated "Last updated" date.',
    },
    {
      title: "11. Contact Information",
      content: "For privacy-related queries or requests:",
      email: "info@mediconnect.fit",
    },
    {
      title: "12. Grievance & Data Queries",
      content:
        "For any concerns regarding data usage or service coordination, users may contact our Grievance Officer at:",
      email: "info@mediconnect.fit",
      note: "We aim to respond within a reasonable timeframe.",
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
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Privacy Policy</h1>
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

              {section.subsections?.map((sub, si) => (
                <div key={si} className="mb-5 last:mb-0">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    {sub.subtitle}
                  </h3>
                  {sub.content && (
                    <p className="text-gray-600 text-sm mb-2">{sub.content}</p>
                  )}
                  {sub.list && (
                    <ul className="space-y-1.5 ml-1 mb-3">
                      {sub.list.map((item, li) => (
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
                  {sub.warning && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mt-3">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-700">{sub.warning}</p>
                    </div>
                  )}
                  {sub.note && (
                    <p className="text-xs text-gray-500 italic mt-2">
                      {sub.note}
                    </p>
                  )}
                </div>
              ))}

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

              {section.warning && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mt-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700">{section.warning}</p>
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
              href="/website/nursing-care/terms"
              className="text-[#0067A1] font-medium hover:underline"
            >
              Terms of Use
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
