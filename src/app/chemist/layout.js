"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/chemist/Sidebar";
import Navbar from "@/components/chemist/Navbar";
import { getLoggedInUser } from "@/lib/authHelpers";
import { usePathname, useRouter } from "next/navigation";
import DpdpConsentModal from "@/components/chemist/DpdpConsentModal";


export default function ChemistLayout({ children }) {
 const [isLoggedIn, setIsLoggedIn] = useState(false);
 const [userId, setUserId] = useState(null);
 const [mounted, setMounted] = useState(false);
 const [sidebarOpen, setSidebarOpen] = useState(true);
 const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
 const pathname = usePathname();
 const router = useRouter();

 const isLoginPage = pathname === "/chemist/login";

 const checkLogin = () => {
   const user = getLoggedInUser("chemist");
   setIsLoggedIn(!!user);
   if (user?.id) {
     setUserId(user.id);
   }
   return !!user;
 };

 useEffect(() => {
   setMounted(true);
   const loggedIn = checkLogin();

   // If not logged in and not on login page → redirect
   if (!loggedIn && !isLoginPage) {
     router.replace("/chemist/login");
   }
   // If logged in and on login page → redirect to dashboard
   if (loggedIn && isLoginPage) {
     router.replace("/chemist/dashboard");
   }
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

 // On login page — render clean (no sidebar/navbar)
 if (isLoginPage) {
   return <>{children}</>;
 }

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

 return (
   <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 cursor-default relative">
    
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

    {/* Main Content Area */}
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

