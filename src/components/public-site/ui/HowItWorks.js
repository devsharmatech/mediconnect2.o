'use client';

import React from 'react';
import { FaUserPlus, FaSearch, FaCalendarCheck, FaVideo, FaFileMedical, FaPills, FaArrowRight, FaCheckCircle, FaUpload, FaNotesMedical, FaBell, FaUserMd } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';

const steps = [
  {
    number: '01',
    icon: FaUserPlus,
    title: 'Choose Consultation Type',
    description: 'Select the type of consultation you need — video, in-person, or home visit.',
    features: [
      'Video consultation from home',
      'In-person clinic appointment',
      'Home visit for care at your doorstep',
    ],
  },
  {
    number: '02',
    icon: FaUserMd,
    title: 'Select Specialty',
    description: 'Choose from verified doctors across specialties based on your health concern.',
    features: [
      'General Physician, Cardiologist, and more',
      'View doctor profiles and experience',
      'Only registered medical practitioners',
    ],
  },
  {
    number: '03',
    icon: FaCalendarCheck,
    title: 'Choose a Slot',
    description: 'Pick a convenient date and time that works for you.',
    features: [
      'Real-time availability',
      'Flexible scheduling options',
      'Easy rescheduling if needed',
    ],
  },
  {
    number: '04',
    icon: FaUpload,
    title: 'Confirm & Upload History',
    description: 'Confirm your appointment and share relevant medical history or documents.',
    features: [
      'Upload previous reports if available',
      'Share symptoms and concerns',
      'Helps doctor prepare for consultation',
    ],
  },
  {
    number: '05',
    icon: FaVideo,
    title: 'Consult the Doctor',
    description: 'Connect with your doctor at the scheduled time for a thorough consultation.',
    features: [
      'Secure video consultation',
      'Discuss health concerns in detail',
      'Ask questions and get guidance',
    ],
  },
  {
    number: '06',
    icon: FaNotesMedical,
    title: 'Receive Notes & Prescriptions',
    description: 'Get digital prescriptions and consultation notes in your account.',
    features: [
      'Digital prescriptions instantly',
      'Consultation summary for reference',
      'Order medicines directly if needed',
    ],
  },
  {
    number: '07',
    icon: FaBell,
    title: 'Follow-Up Reminders',
    description: 'Receive timely reminders for follow-up consultations and medication schedules.',
    features: [
      'Automated follow-up reminders',
      'Medication and appointment alerts',
      'Continuity of care support',
    ],
  },
];

const additionalServices = [
  {
    icon: FaFileMedical,
    title: 'Digital Health Records',
    description: 'Secure, organized access to prescriptions, lab reports and documents.',
  },
  {
    icon: FaPills,
    title: 'Medication & Test Support',
    description: 'Support to stay on track with doctor-advised medicines and investigations.',
  },
  {
    icon: HiSparkles,
    title: 'Health Insights & Tools',
    description: 'Contextual health tips, reminders, and supportive tools around your care.',
  },
];

const HowItWorks = () => {
  return (
    <section className="py-20 pt-5 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#0067A1]/10 text-[#0067A1] text-sm font-semibold rounded-full mb-4">
            <FaCheckCircle className="w-4 h-4" />
            7 Simple Steps
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#0067A1] mb-4">
            How <span className="text-[#0067A1]">mediconnect.fit</span> Works
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            From booking to follow-up — your care journey organised in simple steps.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-16">
          {steps.map((step, index) => (
            <div key={index} className="relative group">
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-16 left-full w-full h-0.5 bg-gray-200 z-0">
                  <FaArrowRight className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                </div>
              )}
              
              <div className="relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">
                {/* Step Number */}
                <div className="absolute -top-3 -right-3 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-400">
                  {step.number}
                </div>
                
                {/* Icon */}
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 bg-[#0067A1]">
                  <step.icon className="w-7 h-7 text-white" />
                </div>
                
                {/* Content */}
                <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm mb-4 leading-relaxed">{step.description}</p>
                
                {/* Features */}
                <ul className="space-y-2">
                  {step.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-center gap-2 text-sm text-gray-500">
                      <FaCheckCircle className="w-3.5 h-3.5 text-[#0067A1] flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Services */}
        <div className="bg-[#003358] rounded-3xl p-8 md:p-12">
          <div className="">
            <div className="text-center mb-10">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Plus, Get Access To
              </h3>
              <p className="text-gray-400">
                Additional services to complete your healthcare experience
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {additionalServices.map((service, index) => (
                <div
                  key={index}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6"
                >
                  <div className="w-12 h-12 bg-[#0067A1] rounded-xl flex items-center justify-center mb-4">
                    <service.icon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">{service.title}</h4>
                  <p className="text-gray-400 text-sm">{service.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
