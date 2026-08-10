"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Home,
  Users,
  ClipboardList,
  Settings,
  Menu,
  X,
  Stethoscope,
  Pill,
  Activity,
  Calendar,
  LogOut,
  User,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TestTube,
  Microscope,
  Hospital,
  Bell,
  UserPlus,
  Key,
  FileText,
  Heart,
  Mail,
  LayoutDashboard,
  IndianRupee,
  Zap,
  RotateCcw,
  Wallet,
  Database,
} from "lucide-react";

import { getLoggedInUser, logoutUser } from "@/lib/authHelpers";

export default function Sidebar({ open, mobileOpen, onToggle, onCloseMobile }) {
  const [role, setRole] = useState("admin");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const user = getLoggedInUser("admin");
    if (user?.role) setRole(user.role);
  }, []);

  const menuItems = [
    {
      name: "Dashboard",
      icon: <Home />,
      path: `/admin/dashboard`,
    },
    {
      name: "Patients",
      icon: <Users />,
      path: `/admin/patients`,
    },
    {
      name: "BPL Requests",
      icon: <Users />,
      path: `/admin/bpl-requests`,
    },
    {
      name: "Doctors",
      icon: <Stethoscope />,
      path: `/admin/doctors`,
    },
    {
      name: "Appointments",
      icon: <Calendar />,
      path: `/admin/appointments`,
    },
    {
      name: "Booking Attempts",
      icon: <Activity />,
      path: `/admin/booking-attempts`,
    },
    {
      name: "Financial Ledger",
      icon: <IndianRupee />,
      path: `/admin/ledger`,
    },
    {
      name: "Refunds",
      icon: <RotateCcw />,
      path: `/admin/refunds`,
    },
    {
      name: "Payouts",
      icon: <Wallet />,
      path: `/admin/payouts`,
    },
    {
      name: "Operations",
      icon: <Zap />,
      path: `/admin/operations`,
    },
    {
      name: "Clinical Risks",
      icon: <Shield />,
      path: `/admin/clinical-risks`,
    },
    {
      name: "Data Quality",
      icon: <Activity />,
      path: `/admin/data-quality`,
    },
    {
      name: "Intervention",
      icon: <ShieldAlert />,
      path: `/admin/intervention`,
    },
    {
      name: "Privacy Audit",
      icon: <ShieldCheck />,
      path: `/admin/audit-logs`,
    },
    {
      name: "Clinical Excellence",
      icon: <Activity />,
      path: `/admin/clinical-analytics`,
    },
    {
      name: "Prescriptions",
      icon: <ClipboardList />,
      path: `/admin/prescriptions`,
    },
    {
      name: "Drug Master",
      icon: <Pill />,
      submenu: true,
      subItems: [
        { name: "All Drugs", path: `/admin/drugs` },
        { name: "Categories", path: `/admin/drugs/categories` }
      ]
    },
    {
      name: "Clinical Masters",
      icon: <ClipboardList />,
      submenu: true,
      subItems: [
        { name: "Prescription Templates", path: `/admin/cms/prescription-templates` },
        { name: "Diagnosis Master", path: `/admin/cms/diagnosis` }
      ]
    },
    {
      name: "Clinical Repository",
      icon: <Database />,
      path: `/admin/clinical-repository`,
    },
    {
      name: "Chemists",
      icon: <Pill />,
      path: `/admin/chemists`,
    },

    {
      name: "Labs Manager",
      icon: <Microscope />,
      submenu: true,
      subItems: [
        { name: "All Labs", path: `/admin/labs` },
        { name: "Lab Categories", path: `/admin/labs/categories` },
        { name: "Lab Tests Master", path: `/admin/cms/lab-tests` }
      ]
    },
    {
      name: "Hospitals",
      icon: <Hospital />,
      path: `/admin/hospitals`,
    },
    {
      name: "Insurance",
      icon: <Shield />,
      path: `/admin/insurance-partners`,
    },
    {
      name: "Nursing Care",
      icon: <Heart />,
      path: `/admin/nursing`,
    },
    {
      name: "Notifications",
      icon: <Bell />,
      path: `/admin/notifications`,
    },
    {
      name: "Subscribers",
      icon: <Mail />,
      path: `/admin/subscribers`,
    },
    {
      name: "Staff",
      icon: <Users />,
      path: `/admin/staff`,
    },
    {
      name: "Add Staff",
      icon: <UserPlus />,
      path: `/admin/staff/create`,
    },
    {
      name: "Roles",
      icon: <Key />,
      path: `/admin/staff/roles`,
    },
    {
      name: "Activity Logs",
      icon: <FileText />,
      path: `/admin/staff/logs`,
    },
    {
      name: "Website CMS",
      icon: <LayoutDashboard />,
      submenu: true,
      subItems: [
        { name: "Homepage", path: `/admin/cms/homepage` },
        { name: "Static Page Sections", path: `/admin/cms/page-blocks` },
        { name: "Services", path: `/admin/cms/services` },
        { name: "Specialties", path: `/admin/cms/specialties` },
        { name: "Testimonials", path: `/admin/cms/testimonials` },
        { name: "Resources", path: `/admin/cms/resources` },
        { name: "FAQs", path: `/admin/cms/faqs` },
        { name: "Supportive Tools", path: `/admin/cms/supportive-tools` },
        { name: "Conditions", path: `/admin/cms/conditions` },
        { name: "About Page", path: `/admin/cms/about` },
        { name: "Contact Page", path: `/admin/cms/contact` },
        { name: "Legal Pages", path: `/admin/cms/legal` },
        { name: "Compliance Logos", path: `/admin/cms/compliance-logos` },
        { name: "Website Settings", path: `/admin/cms/settings` }
      ]
    },
    {
      name: "Settings",
      icon: <Settings />,
      path: `/admin/settings`,
    },
  ];

  const handleLogout = (role) => {
    logoutUser(role);
  };

  const handleNavigation = (path) => {
    router.push(path);
    onCloseMobile();
  };

  const [expandedMenus, setExpandedMenus] = useState({});

  const toggleSubmenu = (menuName) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuName]: !prev[menuName]
    }));
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden cursor-pointer transition-opacity duration-300"
          onClick={onCloseMobile}
          style={{ pointerEvents: 'auto' }}
        />
      )}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 
          ${open ? "w-64" : "w-20"} 
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          bg-[#003358] border-r border-[#003358] shadow-[4px_0_24px_rgba(0,0,0,0.1)]
          h-screen transition-all duration-300 flex flex-col
        `}
        style={{ pointerEvents: 'auto' }}
      >

        {/* Header */}
        <div className={`p-5 flex items-center h-20 shrink-0 border-b border-white/10 ${open ? "justify-between" : "justify-center relative"}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/20 shrink-0">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            {open && (
              <span className="text-base font-bold text-white tracking-wide whitespace-nowrap">
                MediConnect
              </span>
            )}
          </div>

          <button
            onClick={onToggle}
            className={`p-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors ${
              !open 
                ? "hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 bg-[#003358] border border-white/20 shadow-lg rounded-full z-10 w-7 h-7 items-center justify-center hover:scale-110" 
                : "hidden lg:flex"
            }`}
          >
            {!open ? <Menu className="w-3 h-3" /> : <X className="w-4 h-4" />}
          </button>
          
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu - Scrollable */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5 custom-scrollbar min-h-0">
          {menuItems.map((item, idx) => {
            const isActive = pathname === item.path || (item.submenu && item.subItems.some(sub => pathname === sub.path || pathname.startsWith(`${sub.path}/`)));
            
            return (
              <div key={idx} className="space-y-1">
                <button
                  onClick={() => {
                    if (item.submenu) {
                      toggleSubmenu(item.name);
                    } else {
                      handleNavigation(item.path);
                    }
                  }}
                  title={!open ? item.name : undefined}
                  className={`
                    relative w-full flex items-center gap-3.5 px-3 py-3 rounded-xl transition-all duration-200 group text-sm font-medium text-left
                    ${open ? "" : "justify-center"}
                    ${isActive
                      ? "bg-white text-[#0067A1] shadow-md"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                    }
                  `}
                  style={{ pointerEvents: 'auto' }}
                >
                  <div className={`flex-shrink-0 transition-colors ${isActive ? "text-[#0067A1]" : "text-white/60 group-hover:text-white"} ${!open ? "w-6 h-6" : "w-5 h-5"} flex items-center justify-center`}>
                    {item.icon}
                  </div>

                  {open && (
                    <span className="whitespace-nowrap flex-1">
                      {item.name}
                    </span>
                  )}

                  {/* Submenu Chevron */}
                  {open && item.submenu && (
                    <svg
                      className={`w-3 h-3 transition-transform duration-200 ${expandedMenus[item.name] ? 'rotate-90' : ''} text-white/50`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                  
                  {/* Active indicator for minimized sidebar */}
                  {!open && isActive && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full"></div>
                  )}
                </button>

                {/* Submenu Items */}
                {open && item.submenu && expandedMenus[item.name] && (
                  <div className="mt-1 ml-5 pl-3.5 space-y-1 border-l border-white/10">
                    {item.subItems.map((sub, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => handleNavigation(sub.path)}
                        className={`
                          flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs font-medium transition-all text-left
                          ${pathname === sub.path
                            ? "text-white bg-white/10"
                            : "text-white/50 hover:text-white hover:bg-white/5"
                          }
                        `}
                      >
                        <span className="whitespace-nowrap">{sub.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Profile & Logout Section - Fixed */}
        <div className="p-4 shrink-0 border-t border-white/10 bg-black/10">
          {open && (
            <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl border border-white/10 mb-3 overflow-hidden">
              <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-400 flex items-center justify-center text-[#003358] font-bold text-sm shadow-md">
                <User size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  Admin User
                </p>
                <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Administrator
                </p>
              </div>
            </div>
          )}
          
          <button
            onClick={() => handleLogout('admin')}
            title={!open ? "Logout" : undefined}
            className={`
              flex items-center gap-2 px-3 py-3 rounded-xl text-sm transition-all duration-200 w-full font-medium border border-transparent
              text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 hover:border-rose-500/30
              ${!open ? "justify-center" : "justify-center"}
            `}
            style={{ pointerEvents: 'auto' }}
          >
            <LogOut className={`flex-shrink-0 ${!open ? "w-6 h-6" : "w-4 h-4"}`} />
            {open && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}