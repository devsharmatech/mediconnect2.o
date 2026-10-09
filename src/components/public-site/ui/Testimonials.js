'use client';

import React, { useState, useEffect } from 'react';
import { FaStar, FaQuoteLeft, FaChevronLeft, FaChevronRight, FaCheckCircle } from 'react-icons/fa';

const fallbackTestimonials = [
  {
    id: 1,
    name: 'Rajesh K.',
    role: 'Telemedicine',
    location: 'Mumbai',
    image: null,
    rating: 5,
    text: 'I was skeptical about online consultations, but MediConnect changed my mind. The doctor was thorough, asked the right questions, and the digital prescription was sent to my pharmacy instantly. Saved me a whole day of traveling!',
    highlight: 'Verified Experience',
  },
  {
    id: 2,
    name: 'Priya S.',
    role: 'Lab Test Booking',
    location: 'Bangalore',
    image: null,
    rating: 5,
    text: 'Booking lab tests was so easy. The home collection was on time and I got my reports digitally the same day. The doctor reviewed them in my follow-up call. Very seamless experience.',
    highlight: 'Verified Experience',
  },
  {
    id: 3,
    name: 'Amit P.',
    role: 'General Medicine',
    location: 'Delhi',
    image: null,
    rating: 5,
    text: 'As someone with diabetes and hypertension, I need regular check-ups. MediConnect\'s digital health records keep everything in one place. My doctor can see my history instantly. Highly recommended!',
    highlight: 'Verified Experience',
  },
  {
    id: 4,
    name: 'Sunita M.',
    role: 'Dermatology',
    location: 'Pune',
    image: null,
    rating: 5,
    text: 'The video consultation was crystal clear. The dermatologist could see my skin condition properly and prescribed the right treatment. My acne cleared up within 3 weeks. Thank you, MediConnect!',
    highlight: 'Verified Experience',
  },
  {
    id: 5,
    name: 'Dr. Vikram (Patient)',
    role: 'Cardiology',
    location: 'Hyderabad',
    image: null,
    rating: 5,
    text: 'Being a doctor myself, I appreciate the clinical rigor. The consultation followed proper medical protocol — history taking, examination via video, and a well-structured prescription with follow-up scheduling.',
    highlight: 'Verified Experience',
  },
  {
    id: 6,
    name: 'Meera R.',
    role: 'Gynecology',
    location: 'Chennai',
    image: null,
    rating: 5,
    text: 'For sensitive health issues, the privacy of a telemedicine consultation is invaluable. The gynecologist was empathetic and professional. The medicine order was delivered discreetly to my door.',
    highlight: 'Verified Experience',
  },
];

const Testimonials = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [testimonials, setTestimonials] = useState(fallbackTestimonials);
  const [headerData, setHeaderData] = useState({
     title: "Experiences from patients and partners",
     heading: "What Our Community Says",
     subheading: "The stories below are individual experiences of patients, clinicians and partners using mediconnect.fit in their own contexts."
  });

  useEffect(() => {
    async function fetchTestimonials() {
      try {
        const res = await fetch("/api/cms/testimonials");
        const json = await res.json();
        if (json.success && json.data && json.data.length > 0) {
           const mapped = json.data.filter(t => t.status === "active").sort((a,b)=>a.display_order - b.display_order).map((t, idx) => ({
             id: t.id || idx,
             name: t.patient_name,
             role: t.consultation_type,
             location: t.city,
             image: t.photo,
             rating: 5,
             text: t.testimonial_text,
             highlight: 'Verified Experience'
           }));
           if(mapped.length > 0) {
             setTestimonials(mapped);
           }
        }
      } catch (e) {
        console.error("Failed to load CMS testimonials", e);
      }
    }
    async function fetchHeaders() {
      try {
        const res = await fetch("/api/cms/section-headers?page=testimonials");
        const json = await res.json();
        if (json.success && json.data && json.data.heading) {
            setHeaderData({
               title: json.data.title || "Experiences from patients and partners",
               heading: json.data.heading,
               subheading: json.data.subheading || ""
            });
        }
      } catch (e) {
        console.error("Failed to load CMS headers", e);
      }
    }
    fetchTestimonials();
    fetchHeaders();
  }, []);

  const total = testimonials.length;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % total);
  };

  if (!testimonials || testimonials.length === 0) return null;

  // Window of 3 testimonials for desktop, 2 for tablet, 1 for mobile
  const visibleItems = [
    testimonials[currentIndex % total],
    testimonials[(currentIndex + 1) % total],
    testimonials[(currentIndex + 2) % total],
  ];

  return (
    <section className="py-12 lg:py-16 bg-[#F6F8FA] border-y border-slate-200/80">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-10 sm:mb-12">
          <p className="text-xs sm:text-sm font-semibold tracking-wider text-[#0067A1] uppercase mb-2">
            {headerData.title || "EXPERIENCES FROM PATIENTS AND PARTNERS"}
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-3 tracking-tight">
            {headerData.heading || "What Our Community Says"}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            {headerData.subheading}
          </p>
        </div>

        {/* Responsive Testimonials Cards Grid: exactly 1 card on phone, 2 on tablet, 3 on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch w-full">
          {visibleItems.map((item, idx) => {
            const visibilityClass = idx === 0 
              ? "flex w-full" 
              : idx === 1 
              ? "hidden sm:flex" 
              : "hidden lg:flex";

            return (
              <div
                key={`${item.id}-${idx}`}
                className={`${visibilityClass} bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 hover:border-[#0067A1]/40 transition-all duration-300 flex-col justify-between h-full relative group w-full`}
              >
                {/* Decorative quote mark */}
                <div className="absolute top-5 right-5 text-slate-100 group-hover:text-[#0067A1]/10 transition-colors pointer-events-none">
                  <FaQuoteLeft className="w-8 h-8" />
                </div>

                <div>
                  {/* Author Header */}
                  <div className="flex items-center gap-3.5 mb-4">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-12 h-12 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#0067A1]/10 text-[#0067A1] font-bold text-base flex items-center justify-center border border-[#0067A1]/20">
                        {item.name ? item.name.charAt(0) : "P"}
                      </div>
                    )}
                    <div>
                      <h4 className="text-base font-bold text-slate-900 group-hover:text-[#0067A1] transition-colors">
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span>{item.location}</span>
                        <span>•</span>
                        <span className="font-medium text-[#0067A1] bg-[#0067A1]/10 px-2 py-0.5 rounded-md">
                          {item.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Rating Stars */}
                  <div className="flex items-center gap-1 mb-3.5">
                    {[...Array(item.rating || 5)].map((_, i) => (
                      <FaStar key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    ))}
                    <span className="text-xs font-semibold text-slate-700 ml-1.5">5.0</span>
                  </div>

                  {/* Story Text */}
                  <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed italic relative z-10">
                    &ldquo;{item.text}&rdquo;
                  </p>
                </div>

                {/* Card Footer */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 font-medium text-[#0067A1]">
                    <FaCheckCircle className="w-3.5 h-3.5 text-[#0067A1]" />
                    {item.highlight || "Verified Experience"}
                  </span>
                  <span className="text-slate-400 text-[11px]">mediconnect.fit</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Carousel Navigation */}
        <div className="flex items-center justify-center gap-4 mt-8 sm:mt-10">
          <button
            suppressHydrationWarning
            onClick={handlePrev}
            aria-label="Previous stories"
            className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-600 hover:text-[#0067A1] hover:border-[#0067A1] transition-all"
          >
            <FaChevronLeft className="w-4 h-4" />
          </button>

          {/* Dots */}
          <div className="flex items-center gap-2">
            {testimonials.map((_, index) => (
              <button
                suppressHydrationWarning
                key={index}
                aria-label={`Go to slide ${index + 1}`}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'w-6 bg-[#0067A1]' 
                    : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>

          <button
            suppressHydrationWarning
            onClick={handleNext}
            aria-label="Next stories"
            className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-600 hover:text-[#0067A1] hover:border-[#0067A1] transition-all"
          >
            <FaChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
