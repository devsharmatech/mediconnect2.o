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
        a: 'mediconnect.fit is a digital health platform that helps patients connect with verified doctors, diagnostic partners and pharmacies. You can check your symptoms in a guided way, book video consultations, order lab tests at home, receive digital prescriptions, and access your health records in one place.',
      },
      {
        q: 'Is mediconnect.fit free to use?',
        a: 'Creating an account is free. You only pay for the services you choose to use, such as consultations, lab tests or medicines. Where available, symptom screening tools are offered without additional charges for registered patients.',
      },
      {
        q: 'How does symptom screening work?',
        a: 'Our guided symptom check helps you describe your concern clearly, suggests what kind of doctor or service may be relevant, and highlights when you should seek urgent care. It supports, but never replaces, the judgement of a qualified doctor or emergency services.',
      },
    ],
  },
  {
    category: 'Consultations',
    questions: [
      {
        q: 'How do video consultations work?',
        a: 'After booking, you\'ll receive a link to join the HD video call at your scheduled time. Our platform works directly in your browser \u2014 no app download needed. Features include screen sharing for reports and digital prescription generation.',
      },
      {
        q: 'Are all doctors on mediconnect.fit verified?',
        a: 'Doctors listed on mediconnect.fit go through a vetting process. This includes checking medical degrees, registration with state medical councils and relevant experience. Only doctors who meet these criteria are onboarded.',
      },
      {
        q: 'Can I get prescriptions through video consultation?',
        a: 'Yes! Doctors issue legally valid digital prescriptions after consultations. These are stored in your Digital Health Locker and can be used to order medicines directly through our platform with doorstep delivery.',
      },
    ],
  },
  {
    category: 'Lab Tests & Medicines',
    questions: [
      {
        q: 'How does home lab test collection work?',
        a: 'You can book diagnostic tests, choose an available time slot, and a certified phlebotomist will visit your home for sample collection. Reports are delivered digitally within a typical processing window and stored in your Health Locker.',
      },
      {
        q: 'How fast is medicine delivery?',
        a: 'Delivery timelines depend on your location and the pharmacy fulfilling the order. You can upload or share your prescription, and medicines are supplied by verified pharmacy partners in line with local regulations.',
      },
    ],
  },
  {
    category: 'Privacy & Security',
    questions: [
      {
        q: 'Is my health data secure?',
        a: 'Yes, security is our top priority. All data is encrypted with 256-bit SSL encryption. We are HIPAA compliant and follow ISO 27001 standards. Your data is never sold or shared with third parties without your explicit consent.',
      },
      {
        q: 'What is the Digital Health Locker?',
        a: 'Your Digital Health Locker is an ABHA-integrated secure vault for all prescriptions, lab reports, and medical records. Access everything from one place, share with doctors instantly, and maintain your complete health history digitally.',
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
    <section className="py-8 lg:py-10 pt-2 bg-[#F6F8FA]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#0067A1] text-white text-sm font-semibold rounded-full mb-4">
            <FaQuestionCircle className="w-4 h-4" />
            {headerData.title}
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#0067A1] mb-4">
            {headerData.heading}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {headerData.subheading}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Category Sidebar */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sticky top-24">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">Categories</h3>
              <nav className="space-y-1">
                {faqs.map((category) => (
                  <button
                    suppressHydrationWarning
                    key={category.category}
                    onClick={() => {
                      setActiveCategory(category.category);
                      setOpenIndex(null);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium ${
                      activeCategory === category.category
                        ? 'bg-[#0067A1] text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {category.category}
                    <span className={`ml-2 text-xs ${activeCategory === category.category ? 'text-blue-100' : 'text-gray-400'}`}>
                      ({category.questions.length})
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* FAQ Accordion */}
          <div className="lg:col-span-6">
            <div className="space-y-4">
              {activeFaqs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  <button
                    suppressHydrationWarning
                    onClick={() => toggleQuestion(index)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between gap-4"
                  >
                    <span className="text-base font-semibold text-gray-900">{faq.q}</span>
                    <div className={`w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 ${openIndex === index ? 'rotate-180 bg-[#0067A1]' : ''}`}>
                      <FaChevronDown className={`w-4 h-4 ${openIndex === index ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                  </button>
                  
                  <div className={`${openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden transition-all delay-100`}>
                    <div className="px-6 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-4">
                      {isClient && faq.a}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Support Card */}
          <div className="lg:col-span-3">
            <div className="bg-[#003358] rounded-2xl p-6 text-white sticky top-24">
              <div className="">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                  <HiSparkles className="w-6 h-6 text-white" />
                </div>
                
                <h3 className="text-lg font-bold mb-2 ">Still Have Questions?</h3>
                <p className="text-blue-100 text-sm mb-6">
                  Our support team is here to help you.
                </p>
                <p className="text-xs text-blue-200 mb-4">
                  Support Hours: 9:00 AM - 9:00 PM (All Days)
                </p>
                
                <div className="space-y-3">
                  <a
                    href="tel:+917289043888"
                    className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 hover:bg-white/20 transition-colors"
                  >
                    <FaHeadset className="w-5 h-5" />
                    <div>
                      <div className="text-xs text-blue-100">Call Us</div>
                      <div className="text-sm font-semibold">+91 72890-43888</div>
                    </div>
                  </a>
                  
                  <a
                    href="mailto:info@mediconnect.fit"
                    className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 hover:bg-white/20 transition-colors"
                  >
                    <FaEnvelope className="w-5 h-5" />
                    <div>
                      <div className="text-xs text-blue-100">Email Us</div>
                      <div className="text-sm font-semibold">info@mediconnect.fit</div>
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
