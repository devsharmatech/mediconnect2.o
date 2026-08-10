"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Home,
  ClipboardList,
  Beaker,
  FlaskRound,
  FileText,
  User,
  Settings,
  Menu,
  X,
  LogOut,
  Microscope,
  Activity,
  BarChart,
  Bell,
  Users,
  Package,
  Shield,
  Calendar,
} from "lucide-react";
import { getLoggedInUser, logoutUser } from "@/lib/authHelpers";

export default function LabSidebar({
  open,
  mobileOpen,
  onToggle,
  onCloseMobile,
}) {
  const [labName, setLabName] = useState("");
  const [labStats, setLabStats] = useState({
    todayOrders: 0,
    activeTests: 0,
  });
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const fetchLabData = async () => {
      const user = getLoggedInUser("lab");
      if (user) {
        // Try to fetch real lab name from lab_details by user_id
        try {
          const nameRes = await fetch("/api/lab/my-name", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id }),
          });
          const nameData = await nameRes.json();
          if (nameData.success && nameData.lab_name) {
            setLabName(nameData.lab_name);
          } else {
            setLabName(user.details?.full_name || "Lab Admin");
          }
        } catch {
          setLabName(user.details?.full_name || "Lab Admin");
        }

        // Fetch today's stats
        try {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const response = await fetch("/api/lab/dashboard", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lab_id: user.id,
              start_date: today.toISOString(),
            }),
          });

          const result = await response.json();
          if (result.success) {
            setLabStats({
              todayOrders: result.data.stats?.total_orders || 0,
              activeTests: result.data.stats?.active_services || 0,
            });
          }
        } catch (error) {
          console.error("Error fetching lab stats:", error);
        }
      }
    };

    fetchLabData();
  }, []);

  const menuItems = [
    {
      name: "Dashboard",
      icon: <Home size={22} />,
      path: `/lab/dashboard`,
    },
    {
      name: "Test Orders",
      icon: <ClipboardList size={22} />,
      path: `/lab/orders`,
    },
    {
      name: "Test Catalog",
      icon: <Beaker size={22} />,
      path: `/lab/tests`,
    },
    {
      name: "Profile",
      icon: <User size={22} />,
      path: `/lab/profile`,
    },
    // {
    //   name: "Settings",
    //   icon: <Settings size={22} />,
    //   path: `/lab/settings`,
    // },
  ];

  const handleLogout = () => {
    logoutUser("lab");
    router.push("/lab/login");
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
          style={{ pointerEvents: "auto" }}
        />
      )}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 
          ${open ? "w-64" : "w-16"} 
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800
          border-r border-emerald-200 dark:border-gray-700
          h-screen transition-all duration-300 flex flex-col
          shadow-2xl lg:shadow-lg shadow-emerald-200/50 dark:shadow-gray-900
          overflow-hidden
        `}
        style={{ pointerEvents: "auto" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 py-5 border-b border-emerald-200 dark:border-gray-700 flex-shrink-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <div
            className={`flex items-center space-x-3 transition-all duration-300 ${!open && "hidden w-0"
              }`}
          >
            <div className="w-8 h-8 lg:w-9 lg:h-9 bg-[#0067A1] rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <Microscope className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="text-xs lg:text-sm font-bold text-[#0067A1] dark:text-emerald-500 truncate leading-tight">
                {labName || "Lab Portal"}
              </h2>
              <p className="text-[10px] lg:text-xs text-emerald-600 dark:text-emerald-500 truncate">
                Diagnostic Center
              </p>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="p-2 rounded-lg bg-emerald-50 dark:bg-gray-800 text-[#0067A1] dark:text-emerald-500 hover:bg-emerald-100 dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer flex-shrink-0 hover:scale-105 border border-emerald-100"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-emerald-200 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
          <div className="px-2 space-y-1">
            {menuItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleNavigation(item.path)}
                className={`
                  group flex items-center w-full p-3 rounded-xl
                  transition-all duration-200 relative cursor-pointer
                  ${open ? "justify-start" : "justify-center"}
                  mb-1
                  ${pathname === item.path
                    ? "bg-[#0067A1] text-white shadow-lg shadow-emerald-900/20"
                    : "text-gray-700 dark:text-gray-400 hover:bg-emerald-50 dark:hover:bg-gray-800 hover:text-[#0067A1] dark:hover:text-emerald-300"
                  }
                `}
                style={{ pointerEvents: "auto" }}
              >
                <div
                  className={`${pathname === item.path
                    ? "scale-110 text-white"
                    : "text-[#0067A1] dark:text-emerald-500"
                    } transition-transform duration-200 flex-shrink-0`}
                >
                  {item.icon}
                </div>

                {open && (
                  <span className="ml-3 font-medium text-xs lg:text-sm truncate flex-1 text-left">
                    {item.name}
                  </span>
                )}

                {/* Active indicator for minimized sidebar */}
                {!open && pathname === item.path && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-md"></div>
                )}

                {/* Hover effect for expanded */}
                {open && pathname !== item.path && (
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-4 bg-[#0067A1] rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                )}
              </button>
            ))}

            {/* Additional Quick Actions Section */}
            {open && (
              <div className="pt-6 mt-4 border-t border-emerald-200 dark:border-gray-700 hidden">
                <p className="px-3 mb-2 text-xs font-semibold text-[#0067A1] dark:text-emerald-500 uppercase tracking-wider">
                  Quick Actions
                </p>
                <button
                  onClick={() => handleNavigation("/lab/orders/new")}
                  className="group flex items-center w-full p-3 rounded-xl text-gray-700 dark:text-gray-400 hover:bg-emerald-50 dark:hover:bg-gray-800 hover:text-[#0067A1] dark:hover:text-emerald-300 transition-all duration-200"
                >
                  <Activity className="w-5 h-5 text-[#0067A1] dark:text-emerald-500" />
                  <span className="ml-3 font-medium text-sm truncate flex-1 text-left">
                    New Test Order
                  </span>
                  <div className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-[#0067A1] dark:text-emerald-400 text-xs rounded-full font-medium">
                    New
                  </div>
                </button>
                <button
                  onClick={() => handleNavigation("/lab/reports/generate")}
                  className="group flex items-center w-full p-3 rounded-xl text-gray-700 dark:text-gray-400 hover:bg-emerald-50 dark:hover:bg-gray-800 hover:text-[#0067A1] dark:hover:text-emerald-300 transition-all duration-200"
                >
                  <BarChart className="w-5 h-5 text-[#0067A1] dark:text-emerald-500" />
                  <span className="ml-3 font-medium text-sm truncate flex-1 text-left">
                    Generate Report
                  </span>
                  <div className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-[#0067A1] dark:text-emerald-400 text-xs rounded-full font-medium">
                    PDF
                  </div>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* User Profile & Logout Section */}
        <div className="p-3 border-t border-emerald-200 dark:border-gray-700 space-y-2 flex-shrink-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
          {/* User Profile */}
          <div
            className={`
            flex items-center p-3 rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-white dark:from-gray-800 dark:to-gray-900
            transition-all duration-300 ${!open && "justify-center"}
          `}
          >
            <div className="w-8 h-8 bg-[#0067A1] rounded-full flex items-center justify-center shadow-md flex-shrink-0 ring-2 ring-white dark:ring-gray-800">
              <FlaskRound className="w-4 h-4 text-white" />
            </div>
            {open && (
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-xs lg:text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                  {labName}
                </p>
                <div className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1 shadow-sm"></div>
                  <p className="text-[10px] lg:text-xs text-emerald-700 dark:text-emerald-500 truncate font-medium">
                    Online • Verified Lab
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={`
              group flex items-center w-full p-3 rounded-xl
              bg-white dark:bg-gray-800
              text-[#0067A1] dark:text-emerald-500 border border-emerald-200 dark:border-gray-700
              hover:bg-emerald-50 dark:hover:bg-gray-700 hover:border-[#0067A1] dark:hover:border-gray-600
              hover:shadow-sm transition-all duration-200 cursor-pointer
              ${open ? "justify-start" : "justify-center"}
            `}
            style={{ pointerEvents: "auto" }}
          >
            <LogOut size={20} className="flex-shrink-0" />
            {open && (
              <>
                <span className="ml-3 font-medium text-xs lg:text-sm">Logout</span>
                <div className="ml-auto text-xs px-2 py-0.5 bg-emerald-50 dark:bg-gray-700 border border-emerald-100 text-[#0067A1] dark:text-emerald-400 rounded-full">
                  Exit
                </div>
              </>
            )}
          </button>

          {/* Stats Footer - Only shown when expanded */}
          {open && (
            <div className="pt-3 mt-2 border-t border-emerald-200 dark:border-gray-700 hidden">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-2 bg-emerald-50 dark:bg-gray-800 rounded-lg border border-emerald-100/50">
                  <div className="flex items-center justify-center mb-1">
                    <Calendar className="w-3 h-3 text-[#0067A1] dark:text-emerald-500" />
                  </div>
                  <p className="text-xs text-[#0067A1] dark:text-emerald-400 font-medium tracking-tight">
                    Today's Orders
                  </p>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {labStats.todayOrders}
                  </p>
                </div>
                <div className="text-center p-2 bg-emerald-50 dark:bg-gray-800 rounded-lg border border-emerald-100/50">
                  <div className="flex items-center justify-center mb-1">
                    <Shield className="w-3 h-3 text-[#0067A1] dark:text-emerald-500" />
                  </div>
                  <p className="text-xs text-[#0067A1] dark:text-emerald-400 font-medium tracking-tight">
                    Active Tests
                  </p>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {labStats.activeTests}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
