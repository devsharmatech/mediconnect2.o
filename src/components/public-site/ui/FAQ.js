'use client';

import React, { useState, useEffect } from 'react';
import { FaChevronDown, FaQuestionCircle, FaHeadset, FaEnvelope } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';

const fallbackFaqs = [
  {
    category: 'General',
    questions: [
      {
        q: 'What is mediconnect.fit?',
        a: 'mediconnect.fit is an integrated digital health platform connecting patients with verified doctors, accredited diagnostic labs, and registered pharmacies. You can consult online, book home lab tests, get verified prescriptions, and manage digital health records in one place.',
      },
      {
        q: 'Is creating an account free?',
        a: 'Yes, creating an account and maintaining your Health Locker is completely free. You only pay for consultations, diagnostic tests, or pharmacy orders you book, with upfront pricing and zero hidden fees.',
      },
      {
        q: 'How does symptom screening work?',
        a: 'Our guided symptom assessment helps you describe your symptoms accurately and directs you to the appropriate medical specialist. It provides clinical context to support you, but never replaces clinical diagnosis.',
      },
    ],
  },
  {
    category: 'Consultations',
    questions: [
      {
        q: 'How do online video consultations work?',
        a: 'Once booked, you receive a direct link to join a private, high-definition video call with your specialist on your phone or computer—no software downloads required. You can share past reports and discuss your treatment plan face-to-face.',
      },
      {
        q: 'Are all doctors on mediconnect.fit verified?',
        a: 'Yes. Every doctor undergoes rigorous medical council verification, including degree cross-checks, active license verification with state medical councils, and clinical credential validation before onboarding.',
      },
      {
        q: 'Can I get a valid digital prescription?',
        a: 'Yes. Following your consultation, your doctor issues a legally valid digital prescription (compliant with Indian Telemedicine Practice Guidelines) stored instantly in your Health Locker.',
      },
      {
        q: 'What happens if I miss my scheduled consultation?',
        a: 'You can easily reschedule up to 2 hours before the appointment without any penalty. If an unforeseen clinician emergency occurs, our care team provides immediate re-allocation or a 100% refund.',
      },
    ],
  },
  {
    category: 'Lab Tests',
    questions: [
      {
        q: 'How does home sample collection work?',
        a: 'Select your required tests or health package, choose your preferred morning time slot, and a certified phlebotomist visits your home with sealed, temperature-regulated sample kits.',
      },
      {
        q: 'When will I receive my lab test reports?',
        a: 'Most routine blood tests (CBC, Lipid, Thyroid, HbA1c) are processed within 12–24 hours. Digital reports with doctor summaries are automatically uploaded to your dashboard and emailed to you.',
      },
      {
        q: 'Are your diagnostic laboratory partners accredited?',
        a: 'Yes, all sample analysis is conducted exclusively by NABL-accredited and ICMR-recognized diagnostic laboratories adhering to strict quality control standards.',
      },
    ],
  },
  {
    category: 'Pharmacy',
    questions: [
      {
        q: 'How do I order medicines from my prescription?',
        a: 'You can order medicines directly with one click from your digital prescription, or upload an existing valid prescription. Partner licensed pharmacies verify the order and dispatch to your doorstep.',
      },
      {
        q: 'Are medicines delivered with proper cold-chain maintenance?',
        a: 'All medications are dispensed strictly by verified licensed chemists following strict cold-chain maintenance for temperature-sensitive drugs like insulin and biologicals.',
      },
    ],
  },
  {
    category: 'Privacy & Security',
    questions: [
      {
        q: 'Is my medical data confidential and secure?',
        a: 'Yes. Your health data is protected with AES-256 bank-grade encryption at rest and in transit. We comply with ISO 27001, Indian DPDP guidelines, and never share or monetize your private medical records.',
      },
      {
        q: 'Can I link my Ayushman Bharat Health Account (ABHA)?',
        a: 'Yes. MediConnect seamlessly integrates with India\'s ABDM ecosystem. You can create a new 14-digit ABHA address or link your existing ABHA to automatically sync and access your lifelong longitudinal health history.',
      },
    ],
  },
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);
  const [activeCategory, setActiveCategory] = useState('General');
  const [faqs, setFaqs] = useState(fallbackFaqs);
  const [headerData, setHeaderData] = useState({
     title: "Got Questions?",
     heading: "Frequently Asked Questions",
     subheading: "Find answers to common questions about mediconnect.fit. Can't find what you're looking for? Contact our support team."
  });

  // Component mount check for client-side functionality
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    async function fetchFaqs() {
      try {
        const res = await fetch("/api/cms/faqs");
        const json = await res.json();
        if (json.success && json.data && json.data.length > 0) {
           // We map CMS flat structure into categories. If they don't have categories, group under "General"
           const active = json.data.filter((f) => f.status === "active").sort((a,b)=>a.display_order - b.display_order);
           const grouped = {};
           active.forEach(item => {
               const cat = item.category || 'General';
               if (!grouped[cat]) grouped[cat] = [];
               grouped[cat].push({ q: item.question, a: item.answer });
           });
           
           const newFaqs = Object.keys(grouped).map(k => ({ category: k, questions: grouped[k] }));
           setFaqs(newFaqs);
        }
      } catch (e) {
        console.error("Failed to load CMS faqs", e);
      }
    }
    async function fetchHeaders() {
      try {
        const res = await fetch("/api/cms/section-headers?page=faqs");
        const json = await res.json();
        if (json.success && json.data && json.data.heading) {
            setHeaderData({
               title: json.data.title || "Got Questions?",
               heading: json.data.heading,
               subheading: json.data.subheading || ""
            });
        }
      } catch (e) {
        console.error("Failed to load CMS headers", e);
      }
    }
    fetchFaqs();
    fetchHeaders();
  }, []);

  const toggleQuestion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const activeFaqs = faqs.find(f => f.category === activeCategory)?.questions || [];

  return (
    <section className="py-12 sm:py-16 bg-[#F7FAFC] border-t border-[#DCE6EB]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-[11px] sm:text-xs font-bold tracking-widest text-[#1677A8] uppercase mb-1.5">
            {headerData.title || "GOT QUESTIONS?"}
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0B3A5B] mb-3 tracking-tight">
            {headerData.heading || "Frequently Asked Questions"}
          </h2>
          <p className="text-sm sm:text-base text-[#607580] leading-relaxed max-w-2xl mx-auto">
            {headerData.subheading}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Category Sidebar */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-2xs border border-[#DCE6EB] p-3 sm:p-4 sticky top-24">
              <h3 className="text-xs font-bold text-[#607580] uppercase tracking-wider mb-3 px-2">Categories</h3>
              <nav className="space-y-1">
                {faqs.map((category) => (
                  <button
                    suppressHydrationWarning
                    key={category.category}
                    onClick={() => {
                      setActiveCategory(category.category);
                      setOpenIndex(null);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                      activeCategory === category.category
                        ? 'bg-[#0B3A5B] text-white shadow-xs'
                        : 'text-[#607580] hover:bg-[#F7FAFC] hover:text-[#0B3A5B]'
                    }`}
                  >
                    {category.category}
                    <span className={`ml-2 text-xs ${activeCategory === category.category ? 'text-blue-200' : 'text-[#607580]'}`}>
                      ({category.questions.length})
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* FAQ Accordion */}
          <div className="lg:col-span-6">
            <div className="space-y-3.5">
              {activeFaqs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl shadow-2xs border border-[#DCE6EB] overflow-hidden transition-all hover:border-[#1677A8]/40"
                >
                  <button
                    suppressHydrationWarning
                    onClick={() => toggleQuestion(index)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4"
                  >
                    <span className="text-sm sm:text-base font-bold text-[#0B3A5B]">{faq.q}</span>
                    <div className={`w-7 h-7 bg-[#F7FAFC] rounded-lg flex items-center justify-center flex-shrink-0 transition-transform ${openIndex === index ? 'rotate-180 bg-[#0B3A5B]' : ''}`}>
                      <FaChevronDown className={`w-3.5 h-3.5 ${openIndex === index ? 'text-white' : 'text-[#607580]'}`} />
                    </div>
                  </button>
                  
                  <div className={`${openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden transition-all duration-200`}>
                    <div className="px-5 pb-5 text-[#607580] text-sm leading-relaxed border-t border-[#DCE6EB]/60 pt-3.5">
                      {isClient && faq.a}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Support Card */}
          <div className="lg:col-span-3">
            <div className="bg-[#0B3A5B] rounded-2xl p-6 text-white sticky top-24 shadow-xs">
              <div>
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-4 text-[#1677A8]">
                  <HiSparkles className="w-5 h-5 text-white" />
                </div>
                
                <h3 className="text-base font-bold mb-1.5 text-white">Still Have Questions?</h3>
                <p className="text-white/80 text-xs sm:text-sm mb-4 leading-relaxed">
                  Our healthcare coordinators are ready to help you anytime.
                </p>
                <p className="text-[11px] text-white/70 mb-4 pb-3 border-b border-white/10">
                  Hours: 9:00 AM - 9:00 PM (All Days)
                </p>
                
                <div className="space-y-2.5">
                  <a
                    href="tel:+917289043888"
                    className="flex items-center gap-3 bg-white/10 hover:bg-white/15 rounded-xl px-3.5 py-2.5 transition-colors"
                  >
                    <FaHeadset className="w-4 h-4 text-emerald-300" />
                    <div>
                      <div className="text-[10px] text-white/70">Call Helpline</div>
                      <div className="text-xs font-bold text-white">+91 72890-43888</div>
                    </div>
                  </a>
                  
                  <a
                    href="mailto:info@mediconnect.fit"
                    className="flex items-center gap-3 bg-white/10 hover:bg-white/15 rounded-xl px-3.5 py-2.5 transition-colors"
                  >
                    <FaEnvelope className="w-4 h-4 text-sky-300" />
                    <div>
                      <div className="text-[10px] text-white/70">Email Us</div>
                      <div className="text-xs font-bold text-white">info@mediconnect.fit</div>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
