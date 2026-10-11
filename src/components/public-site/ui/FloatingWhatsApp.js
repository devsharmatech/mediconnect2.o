"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { FaWhatsapp, FaPhoneAlt } from "react-icons/fa";

export default function FloatingWhatsApp() {
    const pathname = usePathname();
    const [contactData, setContactData] = useState({ whatsapp: null, message: "", phone: null });

    // Portal / dashboard routes where floating WhatsApp & Call buttons must be hidden
    const portalRoutes = [
        "/dashboard", "/doctor", "/lab-reports", "/appointments",
        "/medicine-order", "/digital-locker", "/nursing-care", "/heart-health",
        "/cardio-connect", "/lung-assessment", "/lung-health", "/lung-connect",
        "/profile", "/settings", "/lab-booking", "/find-doctors",
        "/prescriptions", "/patient", "/consultation", "/services/lab-tests",
        "/admin", "/chemist", "/lab", "/receptionist"
    ];
    const currentPath = pathname || (typeof window !== "undefined" ? window.location.pathname : "");
    const isPortalRoute = Boolean(currentPath && portalRoutes.some((r) => currentPath.includes(r)));

    useEffect(() => {
        if (isPortalRoute) return;
        fetch("/api/cms/settings")
            .then((res) => res.json())
            .then((json) => {
                if (json.success && json.data) {
                    setContactData({
                        whatsapp: json.data.whatsapp_number ? json.data.whatsapp_number.replace(/[^0-9]/g, "") : null,
                        message: json.data.whatsapp_message || "",
                        phone: json.data.support_phone ? json.data.support_phone.replace(/[^0-9+]/g, "") : null
                    });
                }
            })
            .catch(console.error);
    }, [pathname, isPortalRoute]);

    // Hide WhatsApp and Call buttons on portal and dashboard pages
    if (isPortalRoute) {
        return null;
    }

    if (!contactData.whatsapp && !contactData.phone) return null;

    const whatsappUrl = contactData.whatsapp ? `https://wa.me/${contactData.whatsapp}?text=${encodeURIComponent(contactData.message)}` : null;
    const phoneUrl = contactData.phone ? `tel:${contactData.phone}` : null;

    return (
        <div className="fixed bottom-[7.25rem] sm:bottom-[7.5rem] lg:bottom-6 right-3 sm:right-6 lg:right-auto lg:left-6 z-[9998] flex flex-col gap-2 sm:gap-2.5 items-center">
            {/* Call Button - visible on desktop/tablet, kept hidden on mobile to prevent blocking UI */}
            {phoneUrl && (
                <a
                    href={phoneUrl}
                    className="hidden sm:flex bg-[#0067A1] hover:bg-[#004F7C] text-white p-2.5 sm:p-3 rounded-full shadow-2xl transition-all hover:scale-110 items-center justify-center relative group"
                    aria-label="Call Support"
                >
                    <FaPhoneAlt className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
                </a>
            )}

            {/* WhatsApp Button */}
            {whatsappUrl && (
                <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#25D366] hover:bg-[#1ebd5a] text-white w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-2xl transition-all hover:scale-110 flex items-center justify-center relative group border-2 border-white"
                    aria-label="Chat on WhatsApp"
                >
                    <div className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20"></div>
                    <FaWhatsapp className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" />
                </a>
            )}
        </div>
    );
}

