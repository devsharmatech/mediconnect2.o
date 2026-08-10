'use client';

import { useState, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight, FaCalendarCheck } from 'react-icons/fa';
import Button from './Button';

const heroImagesFallback = [
  {
    src: '/consult-1.jpg',
    alt: 'Indian doctor consulting a patient in clinic',
  },
  {
    src: '/consult-2.jpg',
    alt: 'Two Indian doctors discussing a case',
  },
  {
    src: '/consult-3.jpg',
    alt: 'Indian family speaking with a doctor online',
  },
];

const Hero = ({ onLoginClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cmsData, setCmsData] = useState(null);
  const [images, setImages] = useState(heroImagesFallback);

  useEffect(() => {
    async function fetchHome() {
      try {
        const res = await fetch("/api/cms/homepage");
        const json = await res.json();
        if (json.success && json.data) {
          setCmsData(json.data);
          if (json.data) {
            const loadedImages = [];
            if (json.data.hero_image) loadedImages.push({ src: json.data.hero_image, alt: 'Hero CMS Image 1' });
            if (json.data.hero_image2) loadedImages.push({ src: json.data.hero_image2, alt: 'Hero CMS Image 2' });
            if (json.data.hero_image3) loadedImages.push({ src: json.data.hero_image3, alt: 'Hero CMS Image 3' });
            if (json.data.hero_image4) loadedImages.push({ src: json.data.hero_image4, alt: 'Hero CMS Image 4' });
            if (loadedImages.length > 0) {
              setImages(loadedImages);
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchHome();
  }, []);

  // Auto-play slider
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [images.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const headline = cmsData?.headline || "Online Doctor Consultation in India";
  const base_headline = cmsData?.base_headline || "- Verified, Ethical & Doctor-Led";
  const subheadline = cmsData?.subheadline || "Consult verified doctors online through video consultations, prescriptions, lab coordination, and follow-ups - delivered responsibly and in line with medical guidelines.";
  const description = cmsData?.description || "Doctor-led care • Guideline-compliant • No sponsored recommendations • Patient-first";

  const primaryText = cmsData?.primary_button_text || "Book a Consultation";
  const secondaryText = cmsData?.secondary_button_text || "How It Works";

  return (
    <div className="bg-[#F6F8FA]">
      {/* Hero Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left: Text */}
          <div className="text-center md:text-left">
            <h1 className="text-[22px] sm:text-[30px] lg:text-[48px] leading-tight font-bold text-[#0067A1] mb-3">
              {headline}
            </h1>
            <h4 className="text-[16px] sm:text-[20px] lg:text-[28px] leading-tight font-semibold text-[#0067A1] mb-3">
              {base_headline}
            </h4>
            <p className="text-[16px] sm:text-[18px] leading-relaxed text-[#2D3748] mb-2 max-w-xl mx-auto md:mx-0">
              {subheadline}
            </p>
            <p className="text-[13px] sm:text-[14px] leading-relaxed text-[#6B7280] mb-6 max-w-xl mx-auto md:mx-0">
              {description}
            </p>

            <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-3 mb-2 justify-center md:justify-start">
              <Button
                onClick={onLoginClick}
                className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold rounded-lg bg-[#0067A1] text-white hover:bg-[#004F7C] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0067A1]"
              >
                <FaCalendarCheck className="mr-2 h-4 w-4" />
                {primaryText}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold rounded-lg border border-[#0067A1] text-[#0067A1] bg-white hover:bg-[#F3F4F6]"
                onClick={() => {
                  const section = document.getElementById('how-it-works');
                  if (section) {
                    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  } else if (cmsData?.secondary_button_link) {
                    window.location.href = cmsData.secondary_button_link;
                  }
                }}
              >
                {secondaryText}
              </Button>
            </div>
            <p className="text-[11px] sm:text-xs text-[#6B7280] max-w-md mx-auto md:mx-0">
              Takes 2–3 minutes • No obligation • Follow-up supported based on medical advice
            </p>
          </div>

          {/* Right: Hero Image Slider (Indian doctors) */}
          <div className="w-full flex justify-center md:justify-end">
            <div className="w-full max-w-md md:max-w-lg lg:max-w-xl rounded-xl border border-[#E2E8F0] bg-white overflow-hidden flex flex-col">
              <div className="relative aspect-[4/3] w-full bg-[#EFF3F6] overflow-hidden">
                {images.map((image, index) => (
                  <img
                    key={index}
                    src={image.src}
                    alt={image.alt}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out ${index === currentIndex ? 'opacity-100' : 'opacity-0'
                      }`}
                  />
                ))}
                {/* Left/right icon buttons over image */}
                {images.length > 1 && (
                  <>
                    <button
                      suppressHydrationWarning
                      type="button"
                      onClick={handlePrev}
                      className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#0067A1] shadow-md hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#0067A1]/70"
                      aria-label="Previous image"
                    >
                      <FaChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      suppressHydrationWarning
                      type="button"
                      onClick={handleNext}
                      className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#0067A1] shadow-md hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#0067A1]/70"
                      aria-label="Next image"
                    >
                      <FaChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Hero;
