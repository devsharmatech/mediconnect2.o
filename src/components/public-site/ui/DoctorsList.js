'use client';

import { useState } from 'react';
import { FaStar, FaRegStar, FaMapMarkerAlt, FaClock, FaStethoscope } from 'react-icons/fa';
import ScheduleVisitModal from './ScheduleVisitModal';

const doctors = [
  {
    id: 1,
    name: 'Dr. Kapil Kumar',
    rating: 4.8,
    reviews: 1.2,
    specialties: ['General Physician', 'Dermatologist'],
    experience: '12 years',
    location: 'AIIMS, New Delhi',
    fees: '₹500',
    availability: 'Available Today',
    timings: ['11:45 AM', '12:15 PM', '12:30 PM', '12:45 PM', '01:00 PM', '01:15 PM'],
    image: '/doctors/dr-kapil.jpg' // You'll need to add this image to your public folder
  },
  {
    id: 2,
    name: 'Dr. Priya Sharma',
    rating: 4.9,
    reviews: 2.5,
    specialties: ['Cardiologist', 'General Physician'],
    experience: '15 years',
    location: 'Fortis Hospital, Delhi',
    fees: '₹700',
    availability: 'Available Tomorrow',
    timings: ['10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM'],
    image: '/doctors/dr-priya.jpg'
  },
  {
    id: 3,
    name: 'Dr. Rajesh Verma',
    rating: 4.7,
    reviews: 1.8,
    specialties: ['Pediatrician', 'Neonatologist'],
    experience: '10 years',
    location: 'Max Hospital, Delhi',
    fees: '₹600',
    availability: 'Available Today',
    timings: ['02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM'],
    image: '/doctors/dr-rajesh.jpg'
  }
];

const StarRating = ({ rating }) => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  for (let i = 1; i <= 5; i++) {
    if (i <= fullStars) {
      stars.push(<FaStar key={i} className="text-yellow-400" />);
    } else if (i === fullStars + 1 && hasHalfStar) {
      stars.push(<FaStar key={i} className="text-yellow-400" />);
    } else {
      stars.push(<FaRegStar key={i} className="text-yellow-400" />);
    }
  }

  return <div className="flex">{stars}</div>;
};

export default function DoctorsList() {
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleBookAppointment = (doctor) => {
    setSelectedDoctor(doctor);
    setIsModalOpen(true);
  };

  const handleAppointmentConfirm = (appointmentDetails) => {
    console.log('Appointment scheduled with', selectedDoctor.name, ':', appointmentDetails);
    // Here you can add API call to save the appointment
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {doctors.map((doctor) => (
        <div key={doctor.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-start">
              {/* Doctor Image */}
              <div className="flex-shrink-0 mb-4 md:mb-0 md:mr-6">
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                  <FaStethoscope className="h-10 w-10 text-[#0067A1]" />
                </div>
              </div>
              
              {/* Doctor Info */}
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{doctor.name}</h3>
                    <div className="flex items-center mt-1">
                      <StarRating rating={doctor.rating} />
                      <span className="ml-2 text-sm text-gray-600">
                        {doctor.rating} 
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-0 text-sm text-gray-600">
                    <div className="flex items-center">
                      <FaMapMarkerAlt className="text-blue-500 mr-1" />
                      <span>{doctor.location}</span>
                    </div>
                  </div>
                </div>

                {/* Specialties and Experience */}
                <div className="mt-3 text-sm text-gray-600">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {doctor.specialties.map((specialty, index) => (
                      <span key={index} className="bg-blue-50 text-[#004F7C] px-2 py-1 rounded-full text-xs">
                        {specialty}
                      </span>
                    ))}
                    <span className="text-gray-500 text-xs flex items-center">
                      {doctor.experience} experience
                    </span>
                  </div>
                </div>

                {/* Availability */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center text-sm text-gray-600 mb-3 sm:mb-0">
                      <FaClock className="text-green-500 mr-2" />
                      <span className="font-medium text-green-600">{doctor.availability}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={() => handleBookAppointment(doctor)}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-[#0067A1] text-white text-sm font-medium rounded-lg hover:bg-[#004F7C] transition-colors"
                  >
                    Book Appointment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Schedule Visit Modal */}
      {selectedDoctor && (
        <ScheduleVisitModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          doctorName={selectedDoctor.name}
          specializations={selectedDoctor.specialties.join(', ')}
          onConfirm={handleAppointmentConfirm}
        />
      )}
    </div>
  );
}
