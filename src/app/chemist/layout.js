"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/chemist/Sidebar";
import Navbar from "@/components/chemist/Navbar";
import { Toaster } from "react-hot-toast";
import { getLoggedInUser } from "@/lib/authHelpers";
import { usePathname } from "next/navigation";
import DpdpConsentModal from "@/components/chemist/DpdpConsentModal";


export default function ChemistLayout({ children }) {
 const [isLoggedIn, setIsLoggedIn] = useState(false);
 const [userId, setUserId] = useState(null);
 const [mounted, setMounted] = useState(false);
 const [sidebarOpen, setSidebarOpen] = useState(true);
 const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
 const pathname = usePathname();

 const checkLogin = () => {
   const user = getLoggedInUser("chemist");
   setIsLoggedIn(!!user);
   if (user?.id) {
     setUserId(user.id);
   }
 };

 useEffect(() => {
 setMounted(true);
 checkLogin();
 }, [pathname]);

 const handleSidebarToggle = () => {
 setSidebarOpen(!sidebarOpen);
 };

 const handleMobileSidebarToggle = () => {
 setMobileSidebarOpen(!mobileSidebarOpen);
 };

 const closeMobileSidebar = () => {
 setMobileSidebarOpen(false);
 };




 if (!mounted) {
 return (
 <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
 <div className="flex items-center space-x-3">
 <div className="w-10 h-10 bg-gray-800 rounded-full animate-pulse"></div>
 <div className="text-gray-800 font-bold text-xl">Mediconnect</div>
 </div>
 </div>
 );
 }

 if (pathname === "/admin/login") {
 return <>{children}</>;
 }

 return (
 <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 cursor-default relative">
   <Toaster 
     position="top-right" 
     toastOptions={{
       duration: 3000,
       success: {
         style: {
           background: '#ffffff',
           color: '#1f2937',
           padding: '12px 16px',
           boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
           borderRadius: '12px',
           border: '1px solid #e5e7eb',
           fontWeight: '500',
         }
       },
       error: {
         style: {
           background: '#ffffff',
           color: '#dc2626',
           padding: '12px 16px',
           boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
           borderRadius: '12px',
           border: '1px solid #fecaca',
           fontWeight: '500',
         }
       }
     }}
   />
  
  {isLoggedIn && userId && (
    <DpdpConsentModal role="chemist" userId={userId} />
  )}

  {isLoggedIn && (
  <Sidebar
  open={sidebarOpen}
  mobileOpen={mobileSidebarOpen}
  onToggle={handleSidebarToggle}
  onMobileToggle={handleMobileSidebarToggle}
  onCloseMobile={closeMobileSidebar}
  />
  )}

  {/* Main Content Area - Fixed the margin condition */}
  <div
  className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
  isLoggedIn ? (sidebarOpen ? "lg:ml-64" : "lg:ml-16") : ""
  }`}
  >
  {isLoggedIn && (
  <Navbar
  onMenuClick={handleMobileSidebarToggle}
  sidebarOpen={sidebarOpen}
  />
  )}

  <main className="flex-1 p-4 md:p-6">{children}</main>
  </div>

  
  </div>
  );
}

