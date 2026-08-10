'use client';

import { FaClock, FaChartLine, FaClinicMedical, FaDatabase } from 'react-icons/fa';
import AnimateIn from './animations/AnimateIn';

const features = [
  {
    icon: <FaChartLine className="text-3xl text-[#0067A1]" />,
    title: "Guided Health Screening",
    description: "Symptom-based questions that help you choose the right kind of care."
  },
  {
    icon: <FaClinicMedical className="text-3xl text-[#0067A1]" />,
    title: "Digital Health Locker",
    description: "Store prescriptions, reports and records in one organised place."
  },
  {
    icon: <FaDatabase className="text-3xl text-[#0067A1]" />,
    title: "Healthcare-Grade Security",
    description: "Encryption and access controls to help protect your health data."
  },
  {
    icon: <FaClock className="text-3xl text-[#0067A1]" />,
    title: "Doctor Consultations",
    description: "Connect with verified doctors for consultations, where available."
  }
];

const AnimatedFeatureCard = ({ icon, title, description, index }) => (
  <AnimateIn 
    delay={100 + (index * 100)}
    className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
  >
    <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[#0067A1]/10 mb-4">
      {icon}
    </div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </AnimateIn>
);

const FeatureSection = () => {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <AnimatedFeatureCard key={index} index={index} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureSection;
