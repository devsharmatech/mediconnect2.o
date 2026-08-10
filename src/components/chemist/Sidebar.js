"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
    Home,
    ClipboardList,
    Pill,
    PackageSearch,
    User,
    Settings,
    Menu,
    X,
    LogOut,
    Beaker,
    FlaskRound,
    FileText,
    Layers,
    Bell,
    FileBarChart,
    ShoppingCart,
    Package,
    Shield
} from "lucide-react";

import { getLoggedInUser, logoutUser } from "@/lib/authHelpers";

export default function ChemistSidebar({ open, mobileOpen, onToggle, onCloseMobile }) {
    const [chemistName, setChemistName] = useState("");
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const user = getLoggedInUser("chemist");

        if (user?.details?.pharmacist_name) setChemistName(user?.details?.pharmacist_name);
    }, []);

    const menuItems = [
        {
            name: "Dashboard",
            icon: <Home size={22} />,
            path: `/chemist/dashboard`,
        },
        {
            name: "Medicine Orders",
            icon: <ClipboardList size={22} />,
            path: `/chemist/orders`,
        },
        {
            name: "Profile",
            icon: <User size={22} />,
            path: `/chemist/profile`,
        },
        // {
        // name: "Settings",
        // icon: <Settings size={22} />,
        // path: `/chemist/settings`,
        // },
    ];

    const handleLogout = () => {
        logoutUser("chemist");
        router.push("/chemist/login");
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
                    style={{ pointerEvents: 'auto' }}
                />
            )}
            <aside
                className={`
 fixed inset-y-0 left-0 z-50 
 ${open ? "w-64" : "w-16"} 
 ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
 bg-white dark:bg-gray-900
 border-r border-[#0067A1]/20 dark:border-gray-700
 h-screen transition-all duration-300 flex flex-col
 shadow-2xl lg:shadow-lg shadow-[#0067A1]/20 dark:shadow-gray-900
 overflow-hidden
 `}
                style={{ pointerEvents: 'auto' }}
            >

                {/* Header */}
                <div className="flex items-center justify-between p-4 py-5 border-b border-white/10 flex-shrink-0 bg-[#0067A1] text-white">
                    <div className={`flex items-center space-x-3 transition-all duration-300 ${!open && "hidden w-0"}`}>
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                            <Beaker className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h2 className="text-lg font-bold text-white truncate">
                                Chemist Panel
                            </h2>
                            <p className="text-xs text-teal-100/80 truncate">
                                Professional Access
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onToggle}
                        className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all duration-200 cursor-pointer flex-shrink-0 hover:scale-105"
                    >
                        {open ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>

                {/* Navigation Menu */}
                <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-[#0067A1]/30 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
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
                                        ? "bg-[#0067A1] text-white shadow-lg shadow-[#0067A1]/30"
                                        : "text-gray-700 dark:text-gray-400 hover:bg-[#004F7C]/10 dark:hover:bg-gray-800 hover:text-[#0067A1] dark:hover:text-teal-300"
                                    }
 `}
                                style={{ pointerEvents: 'auto' }}
                            >
                                <div className={`${pathname === item.path ? "scale-110 text-white" : "text-[#0067A1] dark:text-[#0080C6]"} transition-transform duration-200 flex-shrink-0`}>
                                    {item.icon}
                                </div>

                                {open && (
                                    <span className="ml-3 font-medium text-sm truncate flex-1 text-left">
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
                            <div className="pt-6 mt-4 border-t border-[#0067A1]/20 dark:border-gray-700 hidden">
                                <p className="px-3 mb-2 text-xs font-semibold text-[#0067A1] dark:text-teal-500 uppercase tracking-wider">
                                    Quick Actions
                                </p>
                                <button className="group flex items-center w-full p-3 rounded-xl text-gray-700 dark:text-gray-400 hover:bg-[#004F7C]/5 dark:hover:bg-gray-800 hover:text-[#004F7C] dark:hover:text-teal-300 transition-all duration-200">
                                    <FileBarChart className="w-5 h-5 text-[#0067A1] dark:text-[#0080C6]" />
                                    <span className="ml-3 font-medium text-sm truncate flex-1 text-left">
                                        Sales Report
                                    </span>
                                    <div className="px-2 py-0.5 bg-[#0067A1]/10 dark:bg-[#003358]/30 text-[#004F7C] dark:text-[#0080C6] text-xs rounded-full">
                                        New
                                    </div>
                                </button>
                                <button className="group flex items-center w-full p-3 rounded-xl text-gray-700 dark:text-gray-400 hover:bg-[#004F7C]/5 dark:hover:bg-gray-800 hover:text-[#004F7C] dark:hover:text-teal-300 transition-all duration-200">
                                    <ShoppingCart className="w-5 h-5 text-[#0067A1] dark:text-[#0080C6]" />
                                    <span className="ml-3 font-medium text-sm truncate flex-1 text-left">
                                        Purchase Orders
                                    </span>
                                    <div className="px-2 py-0.5 bg-[#0067A1]/10 dark:bg-[#003358]/30 text-[#004F7C] dark:text-[#0080C6] text-xs rounded-full">
                                        5
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                </nav>

                {/* User Profile & Logout Section */}
                <div className="p-3 border-t border-[#0067A1]/20 dark:border-gray-700 space-y-2 flex-shrink-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">

                    {/* User Profile */}
                    <div className={`
 flex items-center p-3 rounded-xl bg-[#0067A1]/5 dark:bg-gray-800
 transition-all duration-300 ${!open && "justify-center"}
 `}>
                        <div className="w-10 h-10 bg-[#0067A1] rounded-full flex items-center justify-center shadow-md flex-shrink-0 ring-2 ring-white dark:ring-gray-800">
                            <FlaskRound className="w-5 h-5 text-white" />
                        </div>
                        {open && (
                            <div className="ml-3 min-w-0 flex-1">
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                                    {chemistName || "Chemist User"}
                                </p>
                                <div className="flex items-center">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full mr-1.5"></div>
                                    <p className="text-xs text-[#0067A1]/80 dark:text-teal-500 truncate">
                                        Online • Verified
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
 bg-[#0067A1]/5 dark:bg-gray-800
 text-[#0067A1] dark:text-[#0080C6] border border-[#0067A1]/20 dark:border-gray-700
 hover:bg-[#004F7C]/20 dark:hover:bg-gray-800 hover:border-[#0067A1]/40 dark:hover:border-gray-600
 hover:shadow-md transition-all duration-200 cursor-pointer
 ${open ? "justify-start" : "justify-center"}
 `}
                        style={{ pointerEvents: 'auto' }}
                    >
                        <LogOut size={20} className="flex-shrink-0" />
                        {open && (
                            <>
                                <span className="ml-3 font-medium text-sm">Logout</span>
                                <div className="ml-auto text-xs px-2 py-0.5 bg-[#0067A1]/10 dark:bg-[#0067A1]/30 text-[#0067A1] dark:text-[#0080C6] rounded-full">
                                    Exit
                                </div>
                            </>
                        )}
                    </button>

                    {/* Stats Footer - Only shown when expanded */}
                    {open && (
                        <div className="pt-3 mt-2 border-t border-[#0067A1]/20 dark:border-gray-700 hidden">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="text-center p-2 bg-[#0067A1]/5 dark:bg-gray-800 rounded-lg">
                                    <div className="flex items-center justify-center mb-1">
                                        <Package className="w-3 h-3 text-[#0067A1] dark:text-[#0080C6]" />
                                    </div>
                                    <p className="text-xs text-[#004F7C] dark:text-[#0080C6]">Today's Orders</p>
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">24</p>
                                </div>
                                <div className="text-center p-2 bg-[#0067A1]/10 dark:bg-gray-800 rounded-lg">
                                    <div className="flex items-center justify-center mb-1">
                                        <Shield className="w-3 h-3 text-[#0067A1] dark:text-[#0080C6]" />
                                    </div>
                                    <p className="text-xs text-[#004F7C] dark:text-[#0080C6]">Stock Items</p>
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">156</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}