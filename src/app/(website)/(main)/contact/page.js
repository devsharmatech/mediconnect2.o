'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FaPhone, FaEnvelope, FaClock, FaPaperPlane, FaWhatsapp, FaShieldAlt, FaComments } from 'react-icons/fa';
import FAQ from '@/components/public-site/ui/FAQ';

const baseContactInfo = [
  {
    icon: <FaPhone className="h-5 w-5" />,
    title: 'Phone Support',
    description: '+91 72890-43888\n+91 72890-43777',
    actionText: 'Call Now',
    actionIcon: <FaPhone className="h-3.5 w-3.5" />,
    id: 'phone'
  },
  {
    icon: <FaEnvelope className="h-5 w-5" />,
    title: 'Email Us',
    description: 'info@mediconnect.fit',
    actionText: 'Send Email',
    actionIcon: <FaPaperPlane className="h-3.5 w-3.5" />,
    id: 'email'
  },
  {
    icon: <FaClock className="h-5 w-5" />,
    title: 'Support Hours',
    description: '9:00 AM - 9:00 PM (All Days)',
    id: 'hours'
  },
];

export default function ContactPage() {
  const [contactInfo, setContactInfo] = useState(baseContactInfo);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [headerData, setHeaderData] = useState({
     title: "GET IN TOUCH",
     heading: "Get In Touch",
     subheading: "Have questions about consultations, tests, or your account? Our team is available to help you with appointments, reports, and platform support."
  });
  const [cmsData, setCmsData] = useState(null);

  useEffect(() => {
    async function fetchHeaders() {
      try {
        const res = await fetch("/api/cms/section-headers?page=contact");
        const json = await res.json();
        if (json.success && json.data && json.data.heading) {
            setHeaderData({
               title: json.data.title || "GET IN TOUCH",
               heading: json.data.heading,
               subheading: json.data.subheading || ""
            });
        }
      } catch (e) {
        console.error("Failed to load CMS headers", e);
      }
    }
    async function fetchSettings() {
      try {
        const res = await fetch("/api/cms/settings");
        const json = await res.json();
        if (json.success && json.data) {
          if (json.data.whatsapp_number) {
            setWhatsappNumber(json.data.whatsapp_number.replace(/[^0-9]/g, ''));
          }
          if (json.data.whatsapp_message) {
            setWhatsappMessage(json.data.whatsapp_message);
          }
        }
      } catch (e) {
        console.error("Failed to load CMS settings", e);
      }
    }
    async function fetchContact() {
      try {
        const res = await fetch("/api/cms/contact");
        const json = await res.json();
        if (json.success && json.data) {
           const info = json.data;
           setCmsData(info);
           setContactInfo(prev => {
              const newInfo = [...prev];
              const phoneItem = newInfo.find(i => i.id === 'phone');
              if (phoneItem && info.support_phone) {
                phoneItem.description = info.support_phone;
              }
              const emailItem = newInfo.find(i => i.id === 'email');
              if (emailItem && info.support_email) {
                emailItem.description = info.support_email;
              }
              const hoursItem = newInfo.find(i => i.id === 'hours');
              if (hoursItem && info.support_hours) {
                hoursItem.description = info.support_hours;
              }
              return newInfo;
           });
        }
      } catch (e) {
        console.error("Failed to load CMS contact info", e);
      }
    }
    fetchSettings();
    fetchContact();
    fetchHeaders();
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitMessage('');
    setIsSubmitting(true);

    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast.error('Please fill in all required fields');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/website/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        const errorMessage = data?.message || 'Something went wrong. Please try again.';
        setSubmitMessage(errorMessage);
        toast.error(errorMessage);
        return;
      }

      const successMessage = 'Thank you for reaching out! Our team will get back to you within 24 hours.';
      setSubmitMessage(successMessage);
      toast.success(successMessage);
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
      });
    } catch (error) {
      console.error('Contact form error', error);
      const errorMessage = 'Network error. Please check your connection and try again.';
      setSubmitMessage(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContactAction = (item) => {
    if (item.id === 'phone') {
      const firstPhone = item.description.split('\n')[0].replace(/[^0-9+]/g, '');
      window.open(`tel:${firstPhone}`, '_blank');
    } else if (item.id === 'email') {
      window.open(`mailto:${item.description}`, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7FAFC]">
      {/* Hero Header */}
      <section className="bg-gradient-to-b from-[#F7FAFC] to-white border-b border-[#DCE6EB] py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
          <p className="text-[11px] sm:text-xs font-bold tracking-widest text-[#1677A8] uppercase mb-1.5">
            {headerData.title || "GET IN TOUCH"}
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#0B3A5B] tracking-tight mb-4">
            {headerData.heading || "Contact MediConnect Support"}
          </h1>
          <p className="text-base sm:text-lg text-[#607580] leading-relaxed">
            {headerData.subheading}
          </p>

          {/* WhatsApp Quick Action */}
          {whatsappNumber && (
            <div className="mt-6 flex justify-center">
              <a
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage || 'Hello MediConnect team')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-xs transition-all hover:shadow-md"
              >
                <FaWhatsapp className="h-4 w-4" />
                Chat on WhatsApp
              </a>
            </div>
          )}

          {submitMessage && (
            <div className={`mt-6 max-w-lg mx-auto p-4 rounded-xl text-sm font-medium border ${submitMessage.includes('Thank you') ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
              {submitMessage}
            </div>
          )}
        </div>
      </section>

      {/* Main Contact Section */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* Left Column: Contact Channels & Info */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Patient Care Banner Card */}
              <div className="bg-[#0B3A5B] rounded-2xl p-6 sm:p-7 text-white shadow-xs relative overflow-hidden">
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-white mb-3">
                    <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                    Typically responds within 2-4 hours
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold mb-2">We&apos;re Here For You</h2>
                  <p className="text-sm text-white/85 leading-relaxed">
                    {cmsData?.consultation_support_text || "Whether you have questions about doctor consultations, home sample collections, or technical assistance, our care team is available to assist you."}
                  </p>
                </div>
              </div>

              {/* Contact Information Cards */}
              <div className="space-y-3.5">
                {contactInfo.map((item) => (
                  <div
                    key={item.id}
                    className="group bg-white rounded-2xl border border-[#DCE6EB] p-5 hover:border-[#1677A8]/50 hover:shadow-xs transition-all duration-200"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#1677A8]/10 text-[#1677A8] group-hover:scale-105 transition-transform">
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-[#0B3A5B]">{item.title}</h3>
                        <p className="mt-1 whitespace-pre-line text-sm text-[#18303D] font-medium leading-relaxed">
                          {item.description}
                        </p>
                        {item.actionText && (
                          <button
                            onClick={() => handleContactAction(item)}
                            className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1677A8] hover:text-[#0B3A5B] transition-colors"
                          >
                            {item.actionIcon}
                            {item.actionText}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Grievance & Compliance Info (from CMS if available) */}
              {cmsData?.grievance_email && (
                <div className="bg-white rounded-2xl border border-[#DCE6EB] p-5">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-[#E8F2F7] text-[#1677A8] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FaShieldAlt className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B3A5B] mb-0.5">
                        Grievance Officer
                      </h4>
                      <p className="text-xs text-[#18303D] font-medium">
                        {cmsData.grievance_name || "Patient Relations Office"}
                      </p>
                      <a 
                        href={`mailto:${cmsData.grievance_email}`}
                        className="text-xs text-[#1677A8] hover:underline font-semibold block mt-1"
                      >
                        {cmsData.grievance_email}
                      </a>
                      {cmsData.grievance_response_time && (
                        <p className="text-[11px] text-[#607580] mt-1">
                          Standard resolution: {cmsData.grievance_response_time}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Emergency Medical Notice */}
              {cmsData?.medical_notice && (
                <div className="rounded-2xl bg-amber-50/80 border border-amber-200/80 p-4 text-xs text-amber-900 leading-relaxed">
                  <span className="font-bold block mb-1">Medical Notice:</span>
                  {cmsData.medical_notice}
                </div>
              )}

            </div>

            {/* Right Column: Contact Inquiry Form */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-2xl border border-[#DCE6EB] p-6 sm:p-8 lg:p-10 shadow-2xs">
                <div className="mb-6 pb-5 border-b border-[#DCE6EB]/60">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#0B3A5B]">Send Us a Message</h2>
                  <p className="mt-1.5 text-xs sm:text-sm text-[#607580]">
                    Fill out the form below and our medical coordinators will respond promptly.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="name" className="block text-xs sm:text-sm font-bold text-[#0B3A5B] mb-1.5">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full rounded-xl border border-[#DCE6EB] bg-[#F7FAFC]/60 px-4 py-2.5 sm:py-3 text-sm text-[#18303D] focus:bg-white focus:border-[#1677A8] focus:ring-2 focus:ring-[#1677A8]/20 transition-all outline-none placeholder:text-[#607580]/50"
                        placeholder="e.g. Rahul Sharma"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-xs sm:text-sm font-bold text-[#0B3A5B] mb-1.5">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full rounded-xl border border-[#DCE6EB] bg-[#F7FAFC]/60 px-4 py-2.5 sm:py-3 text-sm text-[#18303D] focus:bg-white focus:border-[#1677A8] focus:ring-2 focus:ring-[#1677A8]/20 transition-all outline-none placeholder:text-[#607580]/50"
                        placeholder="rahul@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-xs sm:text-sm font-bold text-[#0B3A5B] mb-1.5">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className="w-full rounded-xl border border-[#DCE6EB] bg-[#F7FAFC]/60 px-4 py-2.5 sm:py-3 text-sm text-[#18303D] focus:bg-white focus:border-[#1677A8] focus:ring-2 focus:ring-[#1677A8]/20 transition-all outline-none placeholder:text-[#607580]/50"
                      placeholder="e.g. Appointment rescheduling or test report inquiry"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-xs sm:text-sm font-bold text-[#0B3A5B] mb-1.5">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={5}
                      value={formData.message}
                      onChange={handleChange}
                      required
                      className="w-full rounded-xl border border-[#DCE6EB] bg-[#F7FAFC]/60 px-4 py-2.5 sm:py-3 text-sm text-[#18303D] focus:bg-white focus:border-[#1677A8] focus:ring-2 focus:ring-[#1677A8]/20 transition-all outline-none resize-none placeholder:text-[#607580]/50"
                      placeholder="Please describe how we can assist you..."
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B3A5B] hover:bg-[#1677A8] py-3 px-8 text-white text-sm font-semibold shadow-xs hover:shadow-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <FaPaperPlane className="h-3.5 w-3.5" />
                      {isSubmitting ? 'Sending...' : 'Send Message'}
                    </button>
                    <p className="mt-3 text-[11px] text-[#607580]">
                      By submitting this form, you agree to our standard Privacy Policy.
                    </p>
                  </div>
                </form>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Shared FAQ section */}
      <FAQ />
    </div>
  );
}