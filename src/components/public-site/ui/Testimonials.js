'use client';

import React, { useState, useEffect } from 'react';
import { FaStar, FaQuoteLeft, FaChevronLeft, FaChevronRight, FaUser } from 'react-icons/fa';

const fallbackTestimonials = [
  {
    id: 1,
    name: 'Priya Sharma',
    role: 'Working Professional',
    location: 'Mumbai',
    image: '/Picture1.jpg',
    rating: 5,
    text: 'mediconnect.fit\'s symptom check helped me quickly understand my concern and connect with a cardiologist within minutes. The video consultation and digital prescription made everything so convenient!',
    highlight: 'Saved My Time',
  },
  {
    id: 2,
    name: 'Dr. Rajesh Kumar',
    role: 'Cardiologist, AIIMS',
    location: 'Delhi',
    image: '/dr.jpg',
    rating: 5,
    text: 'As a doctor on mediconnect.fit, I can serve patients across India efficiently. The platform\'s digital prescription and follow-up system has streamlined my practice significantly.',
    highlight: 'Trusted by Doctors',
  },
  {
    id: 3,
    name: 'Anita Desai',
    role: 'Senior Citizen',
    location: 'Bangalore',
    image: '/Picture2.jpg',
    rating: 5,
    text: 'At 68, technology intimidates me. But mediconnect.fit is so simple! I booked a lab test, they came home for collection, and my reports were on the app next day. Truly hassle-free healthcare.',
    highlight: 'Senior-Friendly',
  },
];

const Testimonials = () => {
  const [activeIndex, setActiveIndex] = useState(0);
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
             highlight: 'Verified User'
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

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };

  if(!testimonials || testimonials.length === 0) return null;

  return (
    <section className="py-8 lg:py-10 bg-[#F6F8FA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-[#003358] text-sm font-semibold rounded-full mb-4">
            <FaStar className="w-4 h-4 text-amber-500" />
            {headerData.title}
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#0067A1] mb-4">
            {headerData.heading}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {headerData.subheading}
          </p>
        </div>

        {/* Testimonial Carousel */}
        <div className="relative">
          {/* Main Testimonial Card */}
          <div className="bg-white rounded-3xl shadow-md p-8 md:p-12 relative">
            {/* Quote Icon */}
            <div className="absolute top-6 right-8 md:top-10 md:right-12 w-16 h-16 md:w-20 md:h-20 bg-[#0067A1]/5 rounded-full flex items-center justify-center transition-all">
              <FaQuoteLeft className="w-8 h-8 md:w-10 md:h-10 text-[#0067A1]/20" />
            </div>
            
            <div className="relative z-10 flex flex-col md:flex-row gap-8">
              {/* Avatar & Info */}
              <div className="flex-shrink-0 text-center md:text-left">
                { testimonials[activeIndex]?.image ? (
                  <img src={testimonials[activeIndex].image} className="w-20 h-20 object-cover rounded-2xl mx-auto md:mx-0 bg-gray-100" />
                ) : (
                  <div className="w-20 h-20 bg-[#0067A1] rounded-2xl flex items-center justify-center text-white mx-auto md:mx-0">
                    <FaUser className="w-10 h-10" />
                  </div>
                )}
                <h4 className="mt-4 text-lg font-bold text-gray-900">{testimonials[activeIndex]?.name}</h4>
                <p className="text-sm text-gray-500">{testimonials[activeIndex]?.role}</p>
                <p className="text-xs text-gray-400">{testimonials[activeIndex]?.location}</p>
                
                {/* Rating */}
                <div className="flex justify-center md:justify-start gap-1 mt-3">
                  {[...Array(testimonials[activeIndex]?.rating || 5)].map((_, i) => (
                    <FaStar key={i} className="w-4 h-4 text-amber-400" />
                  ))}
                </div>
                
                {/* Highlight Badge */}
                <span className="inline-block mt-3 px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                  {testimonials[activeIndex]?.highlight}
                </span>
              </div>
              
              {/* Testimonial Text */}
              <div className="flex-1 flex items-center">
                <p className="text-lg md:text-xl text-gray-700 leading-relaxed italic">
                  "{testimonials[activeIndex]?.text}"
                </p>
              </div>
            </div>
          </div>
          
          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              suppressHydrationWarning
              onClick={handlePrev}
              className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-gray-600 hover:text-[#0067A1]"
            >
              <FaChevronLeft className="w-5 h-5" />
            </button>
            
            {/* Dots */}
            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  suppressHydrationWarning
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === activeIndex 
                      ? 'w-8 bg-[#0067A1]' 
                      : 'w-2 bg-gray-300'
                  }`}
                />
              ))}
            </div>
            
            <button
              suppressHydrationWarning
              onClick={handleNext}
              className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-gray-600 hover:text-[#0067A1]"
            >
              <FaChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
