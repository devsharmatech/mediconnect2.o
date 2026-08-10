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
  FaWind,
  FaUserMd,
} from "react-icons/fa";
import { TbLungsFilled } from "react-icons/tb";

const PatientSidebar = ({ 
  isOpen, 
  onClose, 
  user, 
  onOpenAssistant,
  isCollapsed: propCollapsed,
  setIsCollapsed: propSetCollapsed
}) => {
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
          return { heart: false, lung: false };
        }
      }
    }
    return { heart: false, lung: false };
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
      user?.full_name ||
      user?.name ||
      "User"
    );
  };

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
      section: "Health Programs",
      name: "Heart Wellness",
      icon: FaHeartbeat,
      groupId: "heart",
      children: [
        {
          name: "Heart Health",
          href: "/website/heart-health",
          icon: FaHeartbeat,
        },
        {
          name: "Heart Statistics",
          href: "/website/heart-health-statistics",
          icon: FaHeartbeat,
        },
      ],
    },
    {
      section: "Health Programs",
      name: "Lung Wellness",
      icon: TbLungsFilled,
      groupId: "lung",
      children: [
        {
          name: "Lung Health",
          href: "/website/lung-assessment",
          icon: TbLungsFilled,
        },
        {
          name: "Lung Statistics",
          href: "/website/lung-health-statistics",
          icon: TbLungsFilled,
        },
      ],
    },
    {
      section: "Health Programs",
      name: "Breathing Exercises",
      href: "/website/dashboard/breathing",
      icon: FaWind,
    },
    {
      section: "Tools",
      name: "Health Assistant",
      href: "/website#ai-chat",
      icon: FaUserNurse,
    },
  ];

  const isActive = (href) => {
    if (href === "/website/dashboard") {
      return pathname === "/website/dashboard";
    }

    if (href === "/website/nursing-care") {
      return pathname === "/website/nursing-care";
    }
    if (href === "/website/nursing-care/status") {
      return pathname === "/website/nursing-care/status";
    }

    if (href === "/website/dashboard/lab-booking") {
      return pathname === "/website/dashboard/lab-booking" || (pathname.startsWith("/website/dashboard/lab-booking/") && !pathname.startsWith("/website/dashboard/lab-booking/orders"));
    }
    if (href === "/website/dashboard/lab-booking/orders") {
      return pathname === "/website/dashboard/lab-booking/orders";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  useEffect(() => {
    const saved = sessionStorage.getItem("patientSidebarScroll");
    if (navRef.current && saved) {
      navRef.current.scrollTop = Number(saved);
    }
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

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-[#003358] border-r border-[#003358] shadow-[4px_0_24px_rgba(0,0,0,0.1)] z-50 transition-all duration-300 flex flex-col
          ${isCollapsed ? "w-20" : "w-64"}
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Header / Logo */}
        <div className={`p-5 flex items-center h-20 shrink-0 border-b border-white/10 ${isCollapsed ? "justify-center relative" : "justify-between"}`}>
          <Link
            href="/website"
            className="flex items-center gap-3 overflow-hidden"
          >
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/20 shrink-0">
              <FaHeartbeat className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <span className="text-base font-bold text-white tracking-wide whitespace-nowrap">
                MediConnect
              </span>
            )}
          </Link>

          {/* Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <FaTimes className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`hidden lg:flex p-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors ${
                isCollapsed 
                  ? "absolute -right-3.5 top-1/2 -translate-y-1/2 bg-[#003358] border border-white/20 shadow-lg rounded-full z-10 w-7 h-7 items-center justify-center hover:scale-110" 
                  : ""
              }`}
            >
              {isCollapsed ? (
                <FaChevronRight className="w-3 h-3" />
              ) : (
                <FaChevronLeft className="w-4 h-4" />
              )}
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
              const showSection = !isCollapsed && item.section && item.section !== lastSection;
              if (showSection) lastSection = item.section;

              const commonClasses = `relative w-full flex items-center gap-3.5 px-3 py-3 rounded-xl transition-all duration-200 group text-sm font-medium text-left
                ${active
                  ? "bg-white text-[#0067A1] shadow-md"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
                }
                ${isCollapsed ? "justify-center" : ""}
              `;

              const iconNode = (
                <item.icon
                  className={`flex-shrink-0 transition-colors ${
                    active
                      ? "text-[#0067A1]"
                      : "text-white/60 group-hover:text-white"
                  } ${isCollapsed ? "w-6 h-6" : "w-5 h-5"}`}
                />
              );

              const content = (
                <>
                  {iconNode}
                  {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
                  {!isCollapsed && isGroup && (
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
                const isOpen = !!openGroups[item.groupId];
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
                      title={isCollapsed ? item.name : undefined}
                      className={commonClasses}
                    >
                      {content}
                    </button>
                    {!isCollapsed && isOpen && (
                      <div className="mt-1 ml-5 pl-3.5 space-y-1 border-l border-white/10">
                        {item.children.map((child) => {
                          const childActive = isActive(child.href);
                          return (
                            <Link
                              key={child.name}
                              href={child.href}
                              onClick={onClose}
                              className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs font-medium transition-all
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
                              <span>{child.name}</span>
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
                    title={isCollapsed ? item.name : undefined}
                    className={commonClasses}
                  >
                    {content}
                  </button>
                ) : (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    title={isCollapsed ? item.name : undefined}
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
          {!isCollapsed && (
            <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl border border-white/10 mb-3 overflow-hidden">
              <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-400 flex items-center justify-center text-[#003358] font-bold text-sm shadow-md">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={getDisplayName()}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span>
                    {getInitials(getDisplayName())}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {getDisplayName()}
                </p>
                <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Patient
                </p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            title={isCollapsed ? "Logout" : undefined}
            className={`flex items-center gap-2 px-3 py-3 rounded-xl text-sm transition-all duration-200 w-full text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 font-medium border border-transparent hover:border-rose-500/30
              ${isCollapsed ? "justify-center" : "justify-center"}
            `}
          >
            <FaSignOutAlt className={`flex-shrink-0 ${isCollapsed ? "w-6 h-6" : "w-4 h-4"}`} />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default PatientSidebar;
