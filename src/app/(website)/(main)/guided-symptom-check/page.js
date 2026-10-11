"use client";

import { useState } from "react";
import Link from "next/link";
import {
  HeartPulse,
  ArrowLeft,
  Stethoscope,
  UserRound,
  Shield,
  ClipboardList,
  MessageSquare,
  AlertTriangle,
  ArrowRight,
  Phone,
  FileText,
  BadgeCheck,
  Lock,
  Info,
  ChevronRight,
  Activity,
  CheckCircle2,
  XCircle,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────
   Data
───────────────────────────────────────────────────────── */
const steps = [
  {
    num: "01",
    title: "Describe Your Symptoms",
    body: "Tell us what you feel — pain, discomfort, fever, duration, and any triggers — in plain Hindi or English. No medical knowledge required.",
    icon: MessageSquare,
  },
  {
    num: "02",
    title: "Structured Clinical Triage",
    body: "Our triage assistant asks targeted follow-up questions on symptom severity, history, and associated complaints — aligned with NMC Telemedicine Practice Guidelines 2020.",
    icon: Activity,
  },
  {
    num: "03",
    title: "Doctor-Ready Summary",
    body: "A SOAP-format clinical summary (Subjective · Objective · Assessment · Plan) is automatically generated for your consulting doctor — no repetitive narration needed.",
    icon: ClipboardList,
  },
  {
    num: "04",
    title: "Specialist Matching",
    body: "Receive evidence-based specialty recommendations and book an instant or scheduled video consultation with a verified, NMC-registered doctor.",
    icon: UserRound,
  },
];

const benefits = [
  {
    icon: ClipboardList,
    title: "Saves Consultation Time",
    body: "Your complete symptom history is shared before the call, so the doctor focuses on diagnosis — not history collection.",
  },
  {
    icon: AlertTriangle,
    title: "Emergency Red-Flag Alerts",
    body: "Critical signs (chest pain, stroke symptoms, breathlessness) are automatically flagged with a prompt to call 108 / 112 immediately.",
  },
  {
    icon: MessageSquare,
    title: "No Medical Jargon Needed",
    body: "Speak naturally in Hindi or English. The system translates your words into structured clinical terminology.",
  },
  {
    icon: Lock,
    title: "ABDM & DPDP Compliant",
    body: "All data is encrypted and stored per the Ayushman Bharat Digital Mission and Digital Personal Data Protection Act, 2023.",
  },
  {
    icon: BadgeCheck,
    title: "NMC-Verified Doctors Only",
    body: "Every doctor on MediConnect holds a valid NMC or State Medical Council registration — verified before onboarding.",
  },
  {
    icon: FileText,
    title: "Secure Clinical Records",
    body: "Symptom summaries are stored in your ABHA-linked health locker — accessible only to authorised treating physicians.",
  },
];

const notServices = [
  "A medical diagnosis or clinical opinion",
  "A substitute for in-person physical examination",
  "A prescription service for any drug schedule",
  "An emergency service — dial 108 / 112 immediately for emergencies",
  "A provider of surgical or procedural consultations without in-person review",
];

const complianceItems = [
  "NMC Telemedicine Practice Guidelines 2020",
  "Ayushman Bharat Digital Mission (ABDM)",
  "Digital Personal Data Protection Act, 2023",
  "Drugs & Cosmetics Act, 1940",
  "Information Technology Act, 2000",
  "Indian Medical Council (Professional Conduct) Regulations",
];

/* ─────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────── */
export default function GuidedSymptomCheckPage() {
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F4F6F8]">

      {/* ══════════════════════════════════════════
          HERO — clean, no eyebrow badge
      ══════════════════════════════════════════ */}
      <section className="bg-[#0067A1] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
          <div className="max-w-2xl">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight mb-4">
              Guided Symptom Check
            </h1>
            <p className="text-white/80 text-base sm:text-lg leading-relaxed mb-8">
              Structure your symptoms before a consultation. Get matched with the right specialist and ensure your doctor has complete clinical context — before the call begins.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/website/doctors"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[#0067A1] font-semibold text-sm rounded-md hover:bg-slate-50 transition-colors"
              >
                <UserRound className="w-4 h-4" />
                Find Doctors
              </Link>
              <Link
                href="/website/services"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/40 text-white font-semibold text-sm rounded-md hover:bg-white/10 transition-colors"
              >
                All Services
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        {/* Back link */}
        <Link
          href="/website/services"
          className="inline-flex items-center gap-1.5 text-sm text-[#0067A1] font-medium hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Healthcare Services
        </Link>

        {/* ── Emergency strip ─────────────────── */}
        <div className="bg-red-700 text-white rounded-md px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-bold text-sm">Medical Emergency?</span>
          </div>
          <p className="text-sm text-white/90 flex-1">
            Do not use this tool. Call <strong>108</strong> (Ambulance) or <strong>112</strong> (National Emergency) immediately, or go to the nearest Government Hospital Emergency.
          </p>
          <div className="flex gap-2 shrink-0">
            <a href="tel:108" className="px-4 py-1.5 bg-white text-red-700 rounded font-bold text-sm hover:bg-red-50 transition-colors">
              Call 108
            </a>
            <a href="tel:112" className="px-4 py-1.5 bg-white/10 border border-white/30 text-white rounded font-semibold text-sm hover:bg-white/20 transition-colors">
              Call 112
            </a>
          </div>
        </div>

        {/* ── Clinical Disclaimer ─────────────── */}
        <div className="bg-white border border-amber-200 rounded-md overflow-hidden">
          <button
            onClick={() => setDisclaimerOpen((p) => !p)}
            className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-amber-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0" />
              <div>
                <p className="font-semibold text-slate-900 text-sm">Mandatory Clinical Disclaimer</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  This is a pre-consultation support tool — not a diagnosis or prescription service.
                </p>
              </div>
            </div>
            <ChevronRight
              className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${disclaimerOpen ? "rotate-90" : ""}`}
            />
          </button>

          {disclaimerOpen && (
            <div className="px-5 pb-5 border-t border-amber-100 pt-4 space-y-3 text-sm text-slate-700 leading-relaxed">
              <p>
                The Guided Symptom Check is an educational pre-consultation tool. It does <strong>not</strong> provide a medical diagnosis, clinical opinion, or prescription — and does not substitute a physical examination by a registered medical practitioner.
              </p>
              <div>
                <p className="font-semibold text-slate-900 mb-1.5">Do NOT use this tool if you have any of the following emergency symptoms:</p>
                <ul className="space-y-1 text-sm text-red-700 list-none">
                  {[
                    "Severe chest pain, tightness, or pressure radiating to the jaw / arm",
                    "Sudden difficulty breathing or choking",
                    "Sudden severe headache, facial drooping, arm weakness, or slurred speech (possible stroke)",
                    "Loss of consciousness or unresponsiveness",
                    "Uncontrolled bleeding or traumatic injury",
                    "High fever with stiff neck, rash, or confusion (possible meningitis / sepsis)",
                    "Suspected poisoning, drug overdose, or snake bite",
                  ].map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-red-500 font-bold shrink-0">→</span>
                      {s}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm font-semibold text-red-700">
                  For any of the above: Call 108 / 112 immediately or proceed to the nearest Government Hospital Emergency.
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-700">Regulatory Basis:</p>
                <p>This service is governed by the <em>NMC Telemedicine Practice Guidelines, 2020</em>, the <em>Ayushman Bharat Digital Mission (ABDM) Framework</em>, the <em>Digital Personal Data Protection Act, 2023</em>, and the <em>Information Technology Act, 2000</em>. Prescription drugs (Schedule H, H1, X) are only issued by NMC-registered doctors after proper clinical evaluation, as per the Drugs &amp; Cosmetics Act, 1940.</p>
              </div>
            </div>
          )}
        </div>

        {/* ── How It Works ────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-md p-5 sm:p-8">
          <div className="mb-7">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">How It Works</h2>
            <p className="text-slate-500 text-sm mt-1">
              A four-step, NMC-compliant pathway from symptoms to verified medical care.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.num} className="flex flex-col gap-3 p-4 border border-slate-100 rounded-md bg-slate-50 hover:border-[#0067A1]/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0067A1] border border-[#0067A1]/30 bg-white px-2 py-0.5 rounded">
                      {s.num}
                    </span>
                    <div className="w-8 h-8 rounded bg-[#0067A1]/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-[#0067A1]" />
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{s.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{s.body}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── NMC Regulatory Notice ────────────── */}
        <div className="bg-white border border-slate-200 rounded-md p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded bg-[#0067A1]/10 flex items-center justify-center shrink-0 mt-0.5">
              <Stethoscope className="w-4.5 h-4.5 text-[#0067A1]" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base mb-3">
                Regulatory Framework — NMC Telemedicine Practice Guidelines 2020
              </h3>
              <div className="space-y-2.5">
                {[
                  {
                    label: "Guideline 3.2 — First Consultation",
                    text: "A doctor may conduct telemedicine for the first time only after verifying patient identity and obtaining explicit digital consent. This tool aids in pre-consultation data collection only — no clinical opinions are generated.",
                  },
                  {
                    label: "Guideline 3.7 — Emergency Protocol",
                    text: "Where a life-threatening condition is identified during triage, the platform is mandated to immediately advise in-person emergency care. Telemedicine is not provided for emergency conditions.",
                  },
                  {
                    label: "Schedule H / H1 / X Drugs",
                    text: "Antibiotics, psychotropics, narcotics, and Schedule X controlled substances may only be prescribed after proper clinical evaluation by an NMC-registered doctor. This tool does not generate prescriptions.",
                  },
                ].map((r, i) => (
                  <div key={i} className="border-l-2 border-[#0067A1]/30 pl-3">
                    <p className="text-xs font-semibold text-slate-900">{r.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{r.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Benefits Grid ────────────────────── */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">Why Use This Tool?</h2>
          <p className="text-slate-500 text-sm mb-6">
            Designed for patients across India — from metros to tier-3 districts.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {benefits.map((b, i) => {
              const Icon = b.icon;
              return (
                <div
                  key={i}
                  className="bg-white border border-slate-200 rounded-md p-4 sm:p-5 flex items-start gap-3.5 hover:border-slate-300 transition-colors"
                >
                  <div className="w-8 h-8 rounded bg-[#0067A1]/8 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-[#0067A1]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 mb-1">{b.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{b.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Two-column: Limitations + Compliance ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* What this is NOT */}
          <div className="bg-white border border-slate-200 rounded-md p-5">
            <div className="flex items-center gap-2 mb-4">
              <XCircle className="w-4.5 h-4.5 text-red-600 shrink-0" />
              <h3 className="font-bold text-slate-900 text-sm">What This Tool Does NOT Provide</h3>
            </div>
            <ul className="space-y-2.5">
              {notServices.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <span className="text-red-400 font-bold shrink-0 mt-0.5">✕</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Compliance */}
          <div className="bg-white border border-slate-200 rounded-md p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
              <h3 className="font-bold text-slate-900 text-sm">Regulatory Compliance</h3>
            </div>
            <ul className="space-y-2.5">
              {complianceItems.map((item, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-slate-600">
                  <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] text-slate-400 leading-relaxed border-t border-slate-100 pt-3">
              MediConnect operates under the oversight of the National Medical Commission,
              Ministry of Health &amp; Family Welfare (GoI), and CDSCO. All consultations
              are subject to the laws of the Republic of India.
            </p>
          </div>
        </div>

        {/* ── CTA Banner ───────────────────────── */}
        <div className="bg-[#0067A1] rounded-md p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-1.5">
                Ready to consult an NMC-registered specialist?
              </h3>
              <p className="text-white/75 text-sm leading-relaxed max-w-lg">
                Browse verified doctors across 25+ specialties — General Physicians, Cardiologists, ENT, Dermatology, Psychiatry, Paediatrics &amp; more.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <Link
                href="/website/doctors"
                className="px-5 py-2.5 bg-white text-[#0067A1] rounded-md font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                Browse Specialists
              </Link>
              <Link
                href="/website/contact"
                className="px-5 py-2.5 border border-white/30 text-white rounded-md font-semibold text-sm hover:bg-white/10 transition-colors"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>

        {/* ── Footer compliance line ───────────── */}
        <div className="border-t border-slate-200 pt-6 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                NMC Telemedicine Guidelines 2020
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                ABDM / ABHA Compliant
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                DPDP Act 2023
              </span>
            </div>
            <p className="text-xs text-slate-400 text-right">
              Support: 9 AM – 9 PM IST &nbsp;|&nbsp; helpdesk@mediconnect.fit
            </p>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Grievance Officer: grievance@mediconnect.fit &nbsp;|&nbsp;
            <Link href="/privacy-policy" className="underline hover:text-slate-600">Privacy Policy</Link>
            &nbsp;|&nbsp;
            <Link href="/terms" className="underline hover:text-slate-600">Terms of Service</Link>
            &nbsp;|&nbsp;© {new Date().getFullYear()} MediConnect. All rights reserved.
          </p>
        </div>

      </div>
    </div>
  );
}
