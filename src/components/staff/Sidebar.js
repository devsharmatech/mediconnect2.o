"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Home, Users, ClipboardList, Settings, Menu, X,
  Stethoscope, Pill, Calendar, LogOut, User, Shield,
  Microscope, Hospital, Bell, Activity, Key, Heart
} from "lucide-react";

// Permission → menu mapping
const allMenuItems = [
  { name: "Dashboard", icon: <Home size={22} />, path: "/staff/dashboard", permission: "view_dashboard" },
  { name: "Patients", icon: <Users size={22} />, path: "/staff/patients", permission: "view_patients" },
  { name: "Doctors", icon: <Stethoscope size={22} />, path: "/staff/doctors", permission: "view_doctors" },
  { name: "Appointments", icon: <Calendar size={22} />, path: "/staff/appointments", permission: "view_appointments" },
  { name: "Prescriptions", icon: <ClipboardList size={22} />, path: "/staff/prescriptions", permission: "view_prescriptions" },
  { name: "Chemists", icon: <Pill size={22} />, path: "/staff/chemists", permission: "view_chemists" },
  { name: "Labs", icon: <Microscope size={22} />, path: "/staff/labs", permission: "view_labs" },
  { name: "Hospitals", icon: <Hospital size={22} />, path: "/staff/hospitals", permission: "view_hospitals" },
  { name: "Insurance", icon: <Shield size={22} />, path: "/staff/insurance", permission: "view_insurance" },
  { name: "Nursing Care", icon: <Heart size={22} />, path: "/staff/nursing", permission: "view_nursing" },
  { name: "Notifications", icon: <Bell size={22} />, path: "/staff/notifications", permission: "view_notifications" },
  { name: "Settings", icon: <Settings size={22} />, path: "/staff/settings", permission: "view_settings" },
];

export default function StaffSidebar({ open, mobileOpen, onToggle, onCloseMobile }) {
  const [staffUser, setStaffUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const user = JSON.parse(localStorage.getItem("staffUser") || "null");
      const perms = JSON.parse(localStorage.getItem("staffPermissions") || "[]");
      setStaffUser(user);
      setPermissions(perms);
    } catch {
      // ignore
    }
  }, []);

  // Filter menu items based on permissions
  const menuItems = allMenuItems.filter(
    (item) => permissions.includes(item.permission) || item.permission === "view_dashboard"
  );

  const handleLogout = () => {
    localStorage.removeItem("staffToken");
    localStorage.removeItem("staffUser");
    localStorage.removeItem("staffPermissions");
    window.location.href = "/staff/login";
  };

  const handleNavigation = (path) => {
    router.push(path);
    onCloseMobile();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden cursor-pointer transition-opacity duration-300"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          ${open ? "w-64" : "w-16"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700
          h-screen transition-all duration-300 flex flex-col
          shadow-2xl lg:shadow-none overflow-hidden
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 py-7 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className={`flex items-center space-x-3 transition-all duration-300 ${!open && "hidden w-0"}`}>
            <div className="w-8 h-8 bg-[#0067A1] rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 truncate">Staff Panel</h2>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer flex-shrink-0"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          <div className="px-2 space-y-1">
            {menuItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleNavigation(item.path)}
                className={`
                  group flex items-center w-full p-3 rounded-lg
                  transition-all duration-200 relative cursor-pointer
                  ${open ? "justify-start" : "justify-center"}
                  ${
                    pathname === item.path || pathname?.startsWith(item.path + "/")
                      ? "bg-[#0067A1] text-white shadow-md"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200"
                  }
                `}
              >
                <div className={`${pathname === item.path ? "scale-110" : ""} transition-transform duration-200 flex-shrink-0`}>
                  {item.icon}
                </div>
                {open && (
                  <span className="ml-3 font-medium text-sm truncate flex-1 text-left">{item.name}</span>
                )}
                {!open && pathname === item.path && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full" />
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* User + Logout */}
        <div className="p-2 border-t border-gray-200 dark:border-gray-700 space-y-2 flex-shrink-0">
          <div className={`flex items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800 ${!open && "justify-center"}`}>
            <div className="w-8 h-8 bg-[#0067A1] rounded-full flex items-center justify-center shadow flex-shrink-0">
              <User className="w-4 h-4 text-white" />
            </div>
            {open && (
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{staffUser?.full_name || "Staff"}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{staffUser?.designation || "Staff Member"}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`group flex items-center w-full p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200 cursor-pointer ${open ? "justify-start" : "justify-center"}`}
          >
            <LogOut size={20} className="flex-shrink-0" />
            {open && <span className="ml-3 font-medium text-sm">Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
