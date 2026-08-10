'use client';

import { useState } from 'react';
import { FaStethoscope } from 'react-icons/fa';
import AIDoctorModal from './AIDoctorModal';

export default function AIDoctorCard() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleChatNow = (e) => {
    e.stopPropagation(); // Prevent card click handler from firing
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("userRole");
      if (role !== "patient") {
        alert("Please login as a patient to use the Health Assistant.");
        return;
      }
    }
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer border border-gray-200">
        <div className="p-6">
          <div className="flex items-center space-x-4">
            <div className="shrink-0 bg-blue-100 p-3 rounded-full">
              <FaStethoscope className="h-6 w-6 text-[#0067A1]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Health Assistant</h3>
              <p className="mt-1 text-gray-600">Get instant health advice from our smart health assistant</p>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={handleChatNow}
              className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-[#0067A1] text-white hover:bg-[#004F7C] transition-colors duration-200"
            >
              Chat Now
            </button>
          </div>
        </div>
      </div>

      <AIDoctorModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}
