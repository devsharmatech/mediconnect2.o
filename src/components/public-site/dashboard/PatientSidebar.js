"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FaHome,
  FaCalendarAlt,
  FaFileMedical,
  FaLock,
  FaPills,
  FaHandHoldingHeart,
  FaHeartbeat,
  FaUser,
  FaSignOutAlt,
  FaChevronLeft,
  FaChevronRight,
  FaCog,
  FaUserNurse,
  FaTimes,
  FaFlask,
  FaReceipt,

  FaUserMd,
  FaWalking,
  FaRunning,
  FaChartLine,
} from "react-icons/fa";
import { TbLungsFilled } from "react-icons/tb";
import Image from "next/image";

export default function PatientSidebar({ 
  isOpen, 
  onClose, 
  user, 
  onOpenAssistant,
  isCollapsed: propCollapsed,
  setIsCollapsed: propSetCollapsed
}) {
  const pathname = usePathname();
  const router = useRouter();
  
  // Support both parent-controlled collapse and local fallback
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const isCollapsed = propCollapsed !== undefined ? propCollapsed : localCollapsed;
  const setIsCollapsed = propSetCollapsed !== undefined ? propSetCollapsed : setLocalCollapsed;

  const navRef = useRef(null);
  const [openGroups, setOpenGroups] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("patientSidebarGroups");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (error) {
          return { cardio: false, lung: false, heart: false };
        }
      }
    }
    return { cardio: false, lung: false, heart: false };
  });

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userData");
    router.push("/website");
  };

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getDisplayName = () => {
    return (
      user?.details?.full_name ||
      user?.profile?.full_name ||
      user?.user?.details?.full_name ||
      user?.user?.full_name ||
      user?.full_name ||
      user?.name ||
      "User"
    );
  };

  const getAvatarUrl = () => {
    return (
      user?.profile_picture ||
      user?.avatar ||
      user?.image ||
      user?.details?.profile_picture ||
      user?.details?.avatar ||
      user?.user?.profile_picture ||
      user?.user?.avatar ||
      user?.profile?.profile_picture ||
      user?.profile?.avatar ||
      null
    );
  };

  const avatarUrl = getAvatarUrl();
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

  const menuItems = [
    {
      section: "Core",
      name: "Dashboard",
      href: "/website/dashboard",
      icon: FaHome,
    },
    {
      section: "Core",
      name: "Appointments",
      href: "/website/appointments",
      icon: FaCalendarAlt,
    },
    {
      section: "Core",
      name: "Find Doctors",
      href: "/website/find-doctors",
      icon: FaUserMd,
    },
    {
      section: "Health Programs",
      name: "LungConnect",
      icon: TbLungsFilled,
      groupId: "lung",
      children: [
        {
          name: "LungConnect Hub",
          href: "/lung-connect",
          icon: TbLungsFilled,
        },
        {
          name: "All Activities",
          href: "/lung-activities",
          icon: FaWalking,
        },
        {
          name: "Respiratory Check",
          href: "/lung-assessment",
          icon: TbLungsFilled,
        },
        {
          name: "Recorded Trends",
          href: "/lung-health-statistics",
          icon: FaChartLine,
        },
        {
          name: "Assessment History",
          href: "/respiratory-history",
          icon: FaFileMedical,
        },
      ],
    },
    {
      section: "Health Programs",
      name: "CardioConnect",
      icon: FaHeartbeat,
      groupId: "cardio",
      children: [
        {
          name: "CardioConnect Hub",
          href: "/cardio-connect",
          icon: FaHeartbeat,
        },
        {
          name: "Cardio Assessment",
          href: "/heart-health",
          icon: FaHeartbeat,
        },
        {
          name: "Cardio Statistics",
          href: "/heart-health-statistics",
          icon: FaChartLine,
        },
        {
          name: "Assessment History",
          href: "/heart-health-history",
          icon: FaFileMedical,
        },
      ],
    },
    {
      section: "Services",
      name: "Medicines",
      href: "/website/medicine-order",
      icon: FaPills,
    },
    {
      section: "Services",
      name: "Lab Reports",
      href: "/website/lab-reports",
      icon: FaFileMedical,
    },
    {
      section: "Services",
      name: "Book Lab Tests",
      href: "/website/dashboard/lab-booking",
      icon: FaFlask,
    },
    {
      section: "Services",
      name: "My Lab Orders",
      href: "/website/dashboard/lab-booking/orders",
      icon: FaReceipt,
    },
    {
      section: "Services",
      name: "Medical Equipment",
      href: "/website/medical-equipment",
      icon: FaFileMedical,
    },
    {
      section: "Services",
      name: "Digital Locker",
      href: "/website/digital-locker",
      icon: FaLock,
    },
    {
      section: "Services",
      name: "Nursing Care",
      href: "/website/nursing-care",
      icon: FaHandHoldingHeart,
    },
    {
      section: "Services",
      name: "Nursing Status",
      href: "/website/nursing-care/status",
      icon: FaHeartbeat,
    },
    {
      section: "Tools",
      name: "Symptom Checker",
      href: "/website/guided-symptom-check",
      icon: FaUserNurse,
    },
    {
      section: "Tools",
      name: "ABHA Health ID",
      href: "/website/abha",
      icon: FaLock,
    },
    {
      section: "Tools",
      name: "Health Assistant",
      href: "/website#ai-chat",
      icon: FaUserNurse,
    },
    {
      section: "Account",
      name: "My Profile",
      href: "/website/profile",
      icon: FaUser,
    },
    {
      section: "Account",
      name: "Settings",
      href: "/website/settings",
      icon: FaCog,
    },
  ];

  const isActive = (href) => {
    const cleanPath = (pathname || "").replace(/^\/website/, "") || "/";
    const cleanHref = (href || "").replace(/^\/website/, "") || "/";

    if (cleanHref === "/dashboard") {
      return cleanPath === "/dashboard";
    }

    if (cleanHref === "/nursing-care") {
      return cleanPath === "/nursing-care";
    }
    if (cleanHref === "/nursing-care/status") {
      return cleanPath === "/nursing-care/status";
    }

    if (cleanHref === "/dashboard/lab-booking") {
      return cleanPath === "/dashboard/lab-booking" || (cleanPath.startsWith("/dashboard/lab-booking/") && !cleanPath.startsWith("/dashboard/lab-booking/orders"));
    }
    if (cleanHref === "/dashboard/lab-booking/orders") {
      return cleanPath === "/dashboard/lab-booking/orders";
    }

    return cleanPath === cleanHref || cleanPath.startsWith(`${cleanHref}/`);
  };

  useEffect(() => {
    const saved = sessionStorage.getItem("patientSidebarScroll");
    if (navRef.current && saved) {
      navRef.current.scrollTop = Number(saved);
    }
  }, [pathname]);

  // Auto-expand group if current route is a child
  useEffect(() => {
    menuItems.forEach((item) => {
      if (item.children && item.groupId) {
        const hasActiveChild = item.children.some((child) => isActive(child.href));
        if (hasActiveChild) {
          setOpenGroups((prev) => {
            if (prev[item.groupId]) return prev;
            return { ...prev, [item.groupId]: true };
          });
        }
      }
    });
  }, [pathname]);

  useEffect(() => {
    sessionStorage.setItem(
      "patientSidebarGroups",
      JSON.stringify(openGroups)
    );
  }, [openGroups]);

  const handleNavScroll = () => {
    if (!navRef.current) return;
    sessionStorage.setItem(
      "patientSidebarScroll",
      String(navRef.current.scrollTop)
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-all duration-300"
          onClick={onClose}
        />
      )}

      {/* Floating Reopen Button (Desktop only when collapsed/minimized) */}
      {isCollapsed && (
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="hidden lg:flex fixed left-0 top-1/2 -translate-y-1/2 z-40 bg-[#003358] text-white hover:bg-[#002642] border border-l-0 border-white/20 shadow-xl rounded-r-md px-2.5 py-3.5 hover:px-3.5 transition-all duration-200 cursor-pointer items-center justify-center group"
          title="Open Sidebar"
          aria-label="Open Sidebar"
        >
          <FaChevronRight className="w-4 h-4 text-white/80 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-[#003358] border-r border-[#003358] shadow-[4px_0_24px_rgba(0,0,0,0.1)] z-50 transition-all duration-300 flex flex-col
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          ${isCollapsed ? "lg:-translate-x-full" : "lg:translate-x-0"}
        `}
      >
        {/* Header / Logo */}
        <div className="px-4 flex items-center h-16 shrink-0 border-b border-white/10 justify-between">
          <Link
            href="/website"
            className="flex items-center"
          >
            <Image
              src="/real-logo.png"
              alt="MediConnect"
              width={140}
              height={40}
              className="object-contain"
              style={{ width: "auto", height: "40px" }}
            />
          </Link>

          {/* Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-[5px] text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close Sidebar"
              aria-label="Close Sidebar"
            >
              <FaTimes className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsCollapsed(true)}
              className="hidden lg:flex p-1.5 rounded-[5px] text-white/60 hover:text-white hover:bg-white/10 transition-colors items-center justify-center cursor-pointer"
              title="Close Sidebar"
              aria-label="Close Sidebar"
            >
              <FaChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Catalog */}
        <nav
          ref={navRef}
          onScroll={handleNavScroll}
          className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar min-h-0"
        >
          {(() => {
            let lastSection = null;
            return menuItems.map((item) => {
              const isGroup = Array.isArray(item.children);
              const active = isGroup
                ? item.children.some((child) => isActive(child.href))
                : isActive(item.href);
              const isAssistant = item.name === "Health Assistant";
              const showSection = item.section && item.section !== lastSection;
              if (showSection) lastSection = item.section;

              const commonClasses = `relative w-full flex items-center gap-3.5 px-3 py-3 rounded-[5px] transition-all duration-200 group text-sm font-medium text-left
                ${active
                  ? "bg-white text-[#0067A1] shadow-md"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
                }
              `;

              const iconNode = (
                <item.icon
                  className={`flex-shrink-0 transition-colors ${
                    active
                      ? "text-[#0067A1]"
                      : "text-white/60 group-hover:text-white"
                  } w-5 h-5`}
                />
              );

              const content = (
                <>
                  {iconNode}
                  <span className="whitespace-nowrap">{item.name}</span>
                  {isGroup && (
                    <FaChevronRight
                      className={`ml-auto w-3 h-3 text-white/50 transition-transform duration-200 ${
                        openGroups[item.groupId] ? "rotate-90" : ""
                      }`}
                    />
                  )}
                </>
              );

              let itemNode = null;

              if (isGroup) {
                const isOpenGroup = !!openGroups[item.groupId];
                itemNode = (
                  <div key={item.name} className="space-y-1">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenGroups((prev) => ({
                          ...prev,
                          [item.groupId]: !prev[item.groupId],
                        }))
                      }
                      className={commonClasses}
                    >
                      {content}
                    </button>
                    {isOpenGroup && (
                      <div className="mt-1 ml-5 pl-3.5 space-y-1 border-l border-white/10">
                        {item.children.map((child) => {
                          const childActive = isActive(child.href);
                          return (
                            <Link
                              key={child.name}
                              href={child.href}
                              onClick={onClose}
                              title={child.name}
                              className={`flex items-center gap-3 w-full px-3 py-2 rounded-[5px] text-xs font-medium transition-all
                                ${childActive 
                                  ? "text-white bg-white/10" 
                                  : "text-white/50 hover:text-white hover:bg-white/5"
                                }
                              `}
                            >
                              <child.icon
                                className={`w-4 h-4 flex-shrink-0 ${
                                  childActive ? "text-white" : "text-white/40"
                                }`}
                              />
                              <span className="whitespace-nowrap truncate">{child.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              } else {
                itemNode = isAssistant && onOpenAssistant ? (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => {
                      onOpenAssistant();
                      onClose();
                    }}
                    className={commonClasses}
                  >
                    {content}
                  </button>
                ) : (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    className={commonClasses}
                  >
                    {content}
                  </Link>
                );
              }

              if (!showSection) return itemNode;

              return (
                <div key={`${item.section}-${item.name}`} className="space-y-1">
                  <p className="px-3 pt-4 pb-1 text-[10px] font-bold tracking-widest text-white/40 uppercase select-none">
                    {item.section}
                  </p>
                  {itemNode}
                </div>
              );
            });
          })()}
        </nav>

        {/* Footer actions */}
        <div className="p-4 shrink-0 border-t border-white/10 bg-black/10">
          <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-[5px] border border-white/10 mb-3 overflow-hidden">
            <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-400 flex items-center justify-center text-[#003358] font-bold text-sm shadow-md overflow-hidden">
              {avatarUrl && !imageError ? (
                <img
                  src={avatarUrl}
                  alt={getDisplayName()}
                  className="w-full h-full rounded-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <span>
                  {getInitials(getDisplayName())}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {getDisplayName()}
              </p>
              <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Patient
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-3 py-3 rounded-[5px] text-sm transition-all duration-200 w-full text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 font-medium border border-transparent hover:border-rose-500/30 cursor-pointer"
          >
            <FaSignOutAlt className="w-4 h-4 flex-shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
