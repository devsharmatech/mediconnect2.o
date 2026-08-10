'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  FaHome, 
  FaCalendarAlt, 
  FaUserCog, 
  FaClock,
  FaBell, 
  FaSignOutAlt,
  FaStethoscope,
  FaHandHoldingHeart,
  FaHeartbeat
} from 'react-icons/fa';
import { FaBolt } from 'react-icons/fa6';

const Sidebar = () => {
  const pathname = usePathname();
  
  // This would typically come from your auth context or user session
  const isDoctor = pathname.includes('/doctor');

  const doctorMenuItems = [
    { name: 'Dashboard', icon: <FaHome className="w-5 h-5" />, href: '/doctor' },
    { name: 'Manage Slots', icon: <FaClock className="w-5 h-5" />, href: '/doctor/manage-slots' },
    { name: 'Prescriptions', icon: <FaStethoscope className="w-5 h-5" />, href: '/doctor/prescriptions' },
    { 
      name: 'Instant Request', 
      icon: <FaBolt className="w-5 h-5" />, 
      href: '/doctor/instant-request',
      badge: 3 // Example badge count
    },
    { name: 'Profile Settings', icon: <FaUserCog className="w-5 h-5" />, href: '/doctor/profile-settings' },
  ];

  const patientMenuItems = [
    { name: 'Dashboard', icon: <FaHome className="w-5 h-5" />, href: '/website/dashboard' },
    { name: 'Book Appointment', icon: <FaCalendarAlt className="w-5 h-5" />, href: '/website/doctors' },
    { name: 'My Appointments', icon: <FaCalendarAlt className="w-5 h-5" />, href: '/website/appointments' },
    { name: 'My Prescriptions', icon: <FaStethoscope className="w-5 h-5" />, href: '/website/prescriptions' },
    { name: 'Nursing Care', icon: <FaHandHoldingHeart className="w-5 h-5" />, href: '/website/nursing-care' },
    { name: 'Nursing Status', icon: <FaHeartbeat className="w-5 h-5" />, href: '/website/nursing-care/status' },
    { name: 'Profile Settings', icon: <FaUserCog className="w-5 h-5" />, href: '/website/profile' },
  ];

  const menuItems = isDoctor ? doctorMenuItems : patientMenuItems;

  return (
    <div className="bg-white border-r border-gray-200 flex flex-col">
      {/* Profile Section */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-2">
            {isDoctor ? (
              <FaStethoscope className="text-[#0067A1] text-2xl" />
            ) : (
              <span className="text-gray-600 text-2xl">👤</span>
            )}
          </div>
          <h3 className="font-medium">
            {isDoctor ? 'Dr. John Doe' : 'John Doe'}
            {isDoctor && <span className="block text-xs text-[#0067A1] font-normal">Cardiologist</span>}
          </h3>
          <p className="text-gray-500 text-sm">john@example.com</p>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto">
        <ul className="p-2 space-y-1">
          {menuItems.map((item) => (
            <li key={item.name}>
              <Link 
                href={item.href}
                className={`flex items-center justify-between px-4 py-2.5 text-gray-700 hover:bg-blue-50 rounded-lg ${
                  pathname === item.href ? 'bg-blue-50 text-[#0067A1]' : ''
                }`}
              >
                <div className="flex items-center">
                  <span className="mr-3">{item.icon}</span>
                  {item.name}
                </div>
                {item.badge && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
                 </Link>
            </li>
          ))}
          <li className="mt-2">
            <button className="flex items-center w-full px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-lg">
              <FaSignOutAlt className="mr-3" />
              Logout
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;
