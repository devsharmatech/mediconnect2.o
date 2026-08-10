"use client";

import { useState, useEffect } from "react";
import { FaWhatsapp, FaPhoneAlt } from "react-icons/fa";

export default function FloatingWhatsApp() {
    const [contactData, setContactData] = useState({ whatsapp: null, message: "", phone: null });

    useEffect(() => {
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
    }, []);

    if (!contactData.whatsapp && !contactData.phone) return null;

    const whatsappUrl = contactData.whatsapp ? `https://wa.me/${contactData.whatsapp}?text=${encodeURIComponent(contactData.message)}` : null;
    const phoneUrl = contactData.phone ? `tel:${contactData.phone}` : null;

    return (
        <div className="fixed bottom-4 left-4 z-[9998] flex flex-col gap-3 items-center">
            {/* Call Button */}
            {phoneUrl && (
                <a
                    href={phoneUrl}
                    className="bg-[#0067A1] hover:bg-[#004F7C] text-white p-3 rounded-full shadow-2xl transition-all hover:scale-110 flex items-center justify-center relative group"
                >
                    <FaPhoneAlt className="w-5 h-5 relative z-10" />
                </a>
            )}

            {/* WhatsApp Button */}
            {whatsappUrl && (
                <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#25D366] hover:bg-[#1ebd5a] text-white p-3 rounded-full shadow-2xl transition-all hover:scale-110 flex items-center justify-center relative group"
                >
                    <div className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20"></div>
                    <FaWhatsapp className="w-6 h-6 relative z-10" />
                </a>
            )}
        </div>
    );
}
