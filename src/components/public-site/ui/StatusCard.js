'use client';

import { FaCheck, FaCalendarAlt, FaFlask, FaFileMedical } from 'react-icons/fa';

const StatusCard = () => {
  return (
    <div className="bg-white rounded-2xl shadow-md p-6 h-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Health Overview</h3>
      
      <div className="space-y-4">
        <StatusItem 
          icon={<FaCheck className="h-5 w-5 text-green-600" />}
          title="AI Screening Complete"
          subtitle="Symptoms analyzed • 2 hours ago"
          bgColor="bg-green-100"
        />
        
        <StatusItem 
          icon={<FaCalendarAlt className="h-5 w-5 text-[#0067A1]" />}
          title="Video Consultation Booked"
          subtitle="Dr. Sharma (Cardio) • Tomorrow 2 PM"
          bgColor="bg-blue-100"
        />
        
        <StatusItem 
          icon={<FaFlask className="h-5 w-5 text-purple-600" />}
          title="Lab Reports Ready"
          subtitle="CBC, Thyroid • 3 new reports"
          bgColor="bg-purple-100"
        />
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex items-center">
          <div className="shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
            <FaFileMedical className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-500">Digital Health Locker</p>
            <p className="text-sm font-medium text-gray-900">ABHA Linked • Secure</p>
          </div>
        </div>
        <button className="mt-4 w-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium py-2 px-4 rounded-lg text-sm transition duration-150 ease-in-out">
          Access My Records
        </button>
      </div>
    </div>
  );
};

const StatusItem = ({ icon, title, subtitle, bgColor }) => (
  <div className="flex items-start">
    <div className={`shrink-0 h-10 w-10 rounded-full ${bgColor} flex items-center justify-center`}>
      {icon}
    </div>
    <div className="ml-3">
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  </div>
);

export default StatusCard;
