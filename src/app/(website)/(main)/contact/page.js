'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FaPhone, FaEnvelope, FaClock, FaPaperPlane, FaMapMarkerAlt, FaWhatsapp } from 'react-icons/fa';
import FAQ from '@/components/public-site/ui/FAQ';

const baseContactInfo = [
  {
    icon: <FaPhone className="h-6 w-6 text-white" />,
    title: 'Phone Support',
    description: '+91 72890-43888\n+91 72890-43777',
    highlight: true,
    actionText: 'Call Now',
    actionIcon: <FaPhone className="h-4 w-4" />,
    id: 'phone'
  },
  {
    icon: <FaEnvelope className="h-6 w-6 text-white" />,
    title: 'Email Us',
    description: 'info@mediconnect.fit',
    actionText: 'Send Email',
    actionIcon: <FaPaperPlane className="h-4 w-4" />,
    id: 'email'
  },
  {
    icon: <FaClock className="h-6 w-6 text-white" />,
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
                const parts = info.support_phone.split('\n');
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

    // Add form validation
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

      const successMessage = 'Thank you for your message! We will get back to you within 24 hours.';
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
    } else if (item.title === 'Headquarters') {
      // Open Google Maps or other map service
      window.open('https://maps.google.com/?q=123+Health+Street+Mumbai', '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FA] pb-10">
        {/* Page Header - compact with primary background */}
        <div className="mb-4 md:mb-4 lg:mb-4">
          <div className="bg-[#0067A1] px-6 py-10 md:px-10 md:py-12 text-center text-white">
            <div className="mb-2 uppercase tracking-wider text-xs font-semibold text-white/70">
               {headerData.title}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
              {headerData.heading}
            </h1>
            <p className="mx-auto mt-2 max-w-2xl text-sm sm:text-base text-white/80 whitespace-pre-line">
              {headerData.subheading}
            </p>
            {/* WhatsApp Quick Action */}
            {whatsappNumber && (
              <div className="mt-5">
                <a
                  href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-medium px-6 py-3 rounded-full shadow-md"
                >
                  <FaWhatsapp className="h-5 w-5" />
                  Chat on WhatsApp
                </a>
              </div>
            )}
          </div>

          {submitMessage && (
            <div className={`mt-6 max-w-md mx-auto p-4 rounded-lg ${submitMessage.includes('Thank you') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              <p className="text-sm font-medium">{submitMessage}</p>
            </div>
          )}
        </div>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          {/* Contact Information */}
          <div className="space-y-6 md:space-y-8">
            <div className="bg-[#0067A1] rounded-2xl p-6 md:p-8 text-white">
              <h2 className="text-xl md:text-2xl font-bold mb-4">We&apos;re Here For You</h2>
              <p className="text-white/90">
                Whether you have questions about our services, need technical support, or want to partner with us, 
                our mediconnect.fit team will respond promptly within 24 hours.
              </p>
              <div className="mt-6 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-400"></div>
                <span className="text-sm text-white/90">Typically responds in 2-4 hours</span>
              </div>
            </div>

            <div className="space-y-4">
              {contactInfo.map((item, index) => (
                <div
                  key={index}
                  className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg ${item.highlight ? 'bg-green-500' : 'bg-[#0067A1]'} transition-transform duration-300 group-hover:scale-110`}>
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                      <p className="mt-1 whitespace-pre-line text-sm text-gray-600">
                        {item.description}
                      </p>
                      {item.actionText && (
                        <button
                          onClick={() => handleContactAction(item)}
                          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[#0067A1] hover:text-[#004F7C] transition-colors duration-200"
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

           
          </div>

          {/* Contact Form */}
          <div className="sticky top-8">
            <div className="h-full rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-lg">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Send us a message</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Fill out the form below and we&apos;ll get back to you as soon as possible.
                </p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#0067A1] focus:ring-2 focus:ring-[#0067A1]/20 transition-all duration-200 outline-none"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#0067A1] focus:ring-2 focus:ring-[#0067A1]/20 transition-all duration-200 outline-none"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#0067A1] focus:ring-2 focus:ring-[#0067A1]/20 transition-all duration-200 outline-none"
                    placeholder="How can we help you?"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#0067A1] focus:ring-2 focus:ring-[#0067A1]/20 transition-all duration-200 outline-none resize-none"
                    placeholder="Tell us about your inquiry..."
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group relative w-full rounded-lg bg-gradient-to-r from-[#0067A1] to-teal-600 py-4 px-6 text-white font-semibold transition-all duration-300 hover:shadow-xl hover:from-[#0067A1] hover:to-[#0067A1] disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <FaPaperPlane className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                      {isSubmitting ? 'Sending...' : 'Send Message'}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0067A1] to-[#0067A1] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </button>
                  <p className="mt-3 text-xs text-gray-500 text-center">
                    By submitting, you agree to our Privacy Policy
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      {/* Shared FAQ section */}
      <FAQ />
    </div>
  );
}