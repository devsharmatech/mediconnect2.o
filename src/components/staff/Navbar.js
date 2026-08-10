"use client";

import { useEffect, useState, useRef } from "react";
import { Bell, Search, Sun, Moon, User, LogOut, Menu } from "lucide-react";

export default function StaffNavbar({ onMenuClick, sidebarOpen }) {
  const [staffUser, setStaffUser] = useState(null);
  const [theme, setTheme] = useState("light");
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const profileRef = useRef(null);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("staffUser") || "null");
      setStaffUser(user);
    } catch { /* ignore */ }

    const storedTheme = localStorage.getItem("theme") || "light";
    setTheme(storedTheme);

    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem("theme", newTheme);
  };

  const handleLogout = () => {
    localStorage.removeItem("staffToken");
    localStorage.removeItem("staffUser");
    localStorage.removeItem("staffPermissions");
    window.location.href = "/staff/login";
  };

  return (
    <header className="sticky top-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 px-4 lg:px-6 py-4 shadow-sm flex-shrink-0">
      <div className="flex items-center justify-between">
        {/* Left */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer"
          >
            <Menu size={20} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl lg:text-2xl font-bold text-gray-800 dark:text-gray-200">
              Staff Panel
            </h1>
            <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 mt-1 hidden sm:block">
              Welcome, {staffUser?.full_name || "Staff"} — {staffUser?.designation || ""}
            </p>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center space-x-2 lg:space-x-4">
          {/* Desktop Search */}
          <div className="hidden lg:block relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-56 pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0067A1]/40 focus:border-transparent transition-all duration-200 cursor-text"
            />
          </div>

          {/* Mobile Search */}
          <button className="lg:hidden p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer">
            <Search size={20} />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer"
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center p-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer"
            >
              <div className="w-8 h-8 bg-[#0067A1] rounded-lg flex items-center justify-center shadow">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="hidden md:flex flex-col ml-2 mr-2 text-left">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {staffUser?.full_name || "Staff"}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {staffUser?.role_name || "Staff"}
                </span>
              </div>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                <div className="p-4 bg-gradient-to-br from-[#0067A1] to-[#0080C6] text-white">
                  <p className="font-semibold text-sm truncate">{staffUser?.full_name || "Staff"}</p>
                  <p className="text-xs opacity-80 truncate">{staffUser?.email || ""}</p>
                  <p className="text-xs opacity-70 mt-1">{staffUser?.employee_code || ""}</p>
                </div>
                <div className="p-2">
                  <button
                    onClick={() => { window.location.href = "/staff/profile"; setProfileOpen(false); }}
                    className="flex items-center w-full p-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer"
                  >
                    <User size={16} className="mr-3" />
                    <span className="text-sm">My Profile</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full p-2.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 cursor-pointer"
                  >
                    <LogOut size={16} className="mr-3" />
                    <span className="text-sm">Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
