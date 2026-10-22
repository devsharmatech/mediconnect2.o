"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
  LifeBuoy,
} from "lucide-react";

import { getLoggedInUser, logoutUser } from "@/lib/authHelpers";

export default function Sidebar({ open, mobileOpen, onToggle, onCloseMobile }) {
  const [role, setRole] = useState("admin");
  const [adminUser, setAdminUser] = useState(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const loadUser = () => {
      const user = getLoggedInUser("admin");
      if (user?.role) setRole(user.role);
      setAdminUser(user);
    };
    loadUser();
    window.addEventListener("adminProfileUpdated", loadUser);
    return () => window.removeEventListener("adminProfileUpdated", loadUser);
  }, []);

  const menuGroups = [
    {
      title: "Core",
      items: [
        {
          name: "Dashboard",
          icon: <Home className="w-4 h-4" />,
          path: `/admin/dashboard`,
        },
        {
          name: "Operations",
          icon: <Zap className="w-4 h-4" />,
          path: `/admin/operations`,
        },
      ],
    },
    {
      title: "Clinical Practice",
      items: [
        {
          name: "Patients & Bookings",
          icon: <Users className="w-4 h-4" />,
          submenu: true,
          subItems: [
            { name: "All Patients", path: `/admin/patients` },
            { name: "Appointments", path: `/admin/appointments` },
            { name: "Booking Attempts", path: `/admin/booking-attempts` },
            { name: "BPL Requests", path: `/admin/bpl-requests` },
          ],
        },
        {
          name: "Clinical Records",
          icon: <ClipboardList className="w-4 h-4" />,
          submenu: true,
          subItems: [
            { name: "Prescriptions", path: `/admin/prescriptions` },
            { name: "Prescription Templates", path: `/admin/cms/prescription-templates` },
            { name: "Diagnosis Master", path: `/admin/cms/diagnosis` },
            { name: "Clinical Repository", path: `/admin/clinical-repository` },
          ],
        },
        {
          name: "Drug Master",
          icon: <Pill className="w-4 h-4" />,
          submenu: true,
          subItems: [
            { name: "All Drugs", path: `/admin/drugs` },
            { name: "Categories", path: `/admin/drugs/categories` },
          ],
        },
      ],
    },
    {
      title: "Partner Network",
      items: [
        {
          name: "Doctors",
          icon: <Stethoscope className="w-4 h-4" />,
          path: `/admin/doctors`,
        },
        {
          name: "Diagnostic Labs",
          icon: <Microscope className="w-4 h-4" />,
          submenu: true,
          subItems: [
            { name: "All Labs", path: `/admin/labs` },
            { name: "Lab Test Orders", path: `/admin/labs/orders` },
            { name: "Commission Categories", path: `/admin/labs/categories` },
            { name: "Lab Tests Master", path: `/admin/cms/lab-tests` },
          ],
        },
        {
          name: "Chemists",
          icon: <Pill className="w-4 h-4" />,
          path: `/admin/chemists`,
        },
        {
          name: "Allied Partners",
          icon: <Hospital className="w-4 h-4" />,
          submenu: true,
          subItems: [
            { name: "Hospitals", path: `/admin/hospitals` },
            { name: "Insurance Partners", path: `/admin/insurance-partners` },
            { name: "Nursing Leads", path: `/admin/nursing` },
            { name: "Nursing Partners", path: `/admin/nursing/partners` },
          ],
        },
      ],
    },
    {
      title: "Finance & Accounts",
      items: [
        {
          name: "Finance Master",
          icon: <IndianRupee className="w-4 h-4" />,
          submenu: true,
          subItems: [
            { name: "Doctor Ledger", path: `/admin/finance/doctor-ledger` },
            { name: "Lab Ledger", path: `/admin/finance/lab-ledger` },
            { name: "Chemist Ledger", path: `/admin/finance/chemist-ledger` },
            { name: "CA Profit & GST", path: `/admin/finance/profit-gst` },
            { name: "Refunds", path: `/admin/refunds` },
          ],
        },
      ],
    },
    {
      title: "Governance & Quality",
      items: [
        {
          name: "Clinical Governance",
          icon: <ShieldAlert className="w-4 h-4" />,
          submenu: true,
          subItems: [
            { name: "Clinical Risks", path: `/admin/clinical-risks` },
            { name: "Data Quality & DLQ", path: `/admin/data-quality` },
            { name: "Clinical Intervention", path: `/admin/intervention` },
            { name: "Privacy Audit Logs", path: `/admin/audit-logs` },
            { name: "Clinical Analytics", path: `/admin/clinical-analytics` },
          ],
        },
      ],
    },
    {
      title: "Administration & CMS",
      items: [
        {
          name: "Staff & Access",
          icon: <Users className="w-4 h-4" />,
          submenu: true,
          subItems: [
            { name: "All Staff", path: `/admin/staff` },
            { name: "Add Staff", path: `/admin/staff/create` },
            { name: "Roles & Permissions", path: `/admin/staff/roles` },
            { name: "Staff Activity Logs", path: `/admin/staff/logs` },
          ],
        },
        {
          name: "Communications",
          icon: <Bell className="w-4 h-4" />,
          submenu: true,
          subItems: [
            { name: "Notifications", path: `/admin/notifications` },
            { name: "Subscribers", path: `/admin/subscribers` },
            { name: "Help & Support", path: `/admin/support` },
          ],
        },
        {
          name: "Website CMS",
          icon: <LayoutDashboard className="w-4 h-4" />,
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
            { name: "Website Settings", path: `/admin/cms/settings` },
          ],
        },
        {
          name: "Settings",
          icon: <Settings className="w-4 h-4" />,
          path: `/admin/settings`,
        },
        {
          name: "Patient View",
          icon: <Heart className="w-4 h-4" />,
          path: `/dashboard`,
        },
      ],
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
          <Link
            href="/"
            onClick={onCloseMobile}
            title="Go to website homepage"
            className="flex items-center gap-3 overflow-hidden cursor-pointer group"
          >
            <div className="w-10 h-10 bg-white/10 group-hover:bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/20 shrink-0 transition-colors">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            {open && (
              <span className="text-base font-bold text-white tracking-wide whitespace-nowrap">
                MediConnect
              </span>
            )}
          </Link>

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
        <nav
          className="flex-1 overflow-y-auto py-3 px-3 space-y-3 custom-scrollbar admin-sidebar-scroll min-h-0"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent',
            pointerEvents: 'auto',
          }}
        >
          {menuGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {open ? (
                <div className="pt-2 pb-1 px-3 text-[10px] font-bold tracking-wider text-white/40 uppercase select-none">
                  {group.title}
                </div>
              ) : (
                gIdx > 0 && <div className="my-2 border-t border-white/10 mx-2" />
              )}

              {group.items.map((item, idx) => {
                const isActive = pathname === item.path || (item.submenu && item.subItems.some(sub => pathname === sub.path || pathname.startsWith(`${sub.path}/`)));
                const isExpanded = expandedMenus[item.name] !== undefined ? expandedMenus[item.name] : isActive;

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
                        relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-xs font-medium text-left cursor-pointer
                        ${open ? "" : "justify-center"}
                        ${isActive
                          ? "bg-white text-[#0067A1] shadow-md font-semibold"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                        }
                      `}
                      style={{ pointerEvents: 'auto' }}
                    >
                      <div className={`flex-shrink-0 transition-colors ${isActive ? "text-[#0067A1]" : "text-white/60 group-hover:text-white"} ${!open ? "w-6 h-6" : "w-4 h-4"} flex items-center justify-center`}>
                        {item.icon}
                      </div>

                      {open && (
                        <span className="whitespace-nowrap flex-1 truncate">
                          {item.name}
                        </span>
                      )}

                      {/* Submenu Chevron */}
                      {open && item.submenu && (
                        <svg
                          className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''} text-white/50 shrink-0`}
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
                    {open && item.submenu && isExpanded && (
                      <div className="mt-1 ml-4 pl-3 space-y-0.5 border-l border-white/15">
                        {item.subItems.map((sub, sIdx) => {
                          const isSubActive = pathname === sub.path || pathname.startsWith(`${sub.path}/`);
                          return (
                            <button
                              key={sIdx}
                              onClick={() => handleNavigation(sub.path)}
                              className={`
                                flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all text-left cursor-pointer
                                ${isSubActive
                                  ? "text-white bg-white/15 font-semibold"
                                  : "text-white/60 hover:text-white hover:bg-white/5"
                                }
                              `}
                            >
                              <span className="whitespace-nowrap truncate">{sub.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Profile & Logout Section - Fixed */}
        <div className="p-4 shrink-0 border-t border-white/10 bg-black/10">
          {open && (
            <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl border border-white/10 mb-3 overflow-hidden">
              <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-400 flex items-center justify-center text-[#003358] font-bold text-sm shadow-md overflow-hidden">
                {adminUser?.profile_picture ? (
                  <img
                    src={adminUser.profile_picture}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                ) : (
                  <User size={18} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {adminUser?.admin_details?.full_name || adminUser?.full_name || "Dev Sharma"}
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

        <style jsx>{`
          .admin-sidebar-scroll {
            scrollbar-width: thin !important;
            scrollbar-color: rgba(255, 255, 255, 0.2) transparent !important;
          }
          .admin-sidebar-scroll::-webkit-scrollbar {
            width: 3px !important;
          }
          .admin-sidebar-scroll::-webkit-scrollbar-track {
            background: transparent !important;
          }
          .admin-sidebar-scroll::-webkit-scrollbar-thumb {
            background-color: rgba(255, 255, 255, 0.2) !important;
            border-radius: 9999px !important;
          }
          .admin-sidebar-scroll::-webkit-scrollbar-thumb:hover {
            background-color: rgba(255, 255, 255, 0.45) !important;
          }
          .admin-sidebar-scroll::-webkit-scrollbar-button {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }
        `}</style>
      </aside>
    </>
  );
}