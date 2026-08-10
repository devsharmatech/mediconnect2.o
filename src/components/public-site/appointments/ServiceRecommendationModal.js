"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaTimes, FaStethoscope, FaArrowRight, FaPills, FaFlask, FaUserNurse } from "react-icons/fa";
import { toast } from "react-hot-toast";

const SERVICE_ICONS = {
    pharmacy: FaPills,
    lab: FaFlask,
    nursing: FaUserNurse,
};

// Phase 4D fix: map each service type to a real navigation route
const SERVICE_ROUTES = {
    pharmacy: "/website/services", // Replace with actual route when pharmacy is built
    lab: "/website/dashboard/lab-booking/prescription",
    nursing: "/website/services", // Replace with actual route when nursing is built
};

export default function ServiceRecommendationModal({ isOpen, onClose, appointment }) {
    const router = useRouter();
    const [recommendations, setRecommendations] = useState([]);
    const [urgencyMessage, setUrgencyMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [selectedService, setSelectedService] = useState(null);

    useEffect(() => {
        if (!isOpen || !appointment) return;

        const fetchRecommendations = async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/patient/service-recommendations?consultation_id=${appointment.id}`);
                const data = await res.json();

                if (data.success) {
                    setRecommendations(data.data.recommendations || []);
                    setUrgencyMessage(data.data.urgency_message || "Start treatment as soon as possible.");
                }
            } catch (err) {
                console.error("Failed to fetch service recommendations", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRecommendations();
    }, [isOpen, appointment]);

    if (!isOpen || !appointment) return null;

    const handleServiceSelect = (rec) => {
        setSelectedService(rec.service_type);
    };

    const handleProceed = () => {
        if (!selectedService) {
            toast.error("Please select a service to proceed.");
            return;
        }

        const route = SERVICE_ROUTES[selectedService];
        if (route) {
            onClose();
            // Pass the consultation_id if navigating to the lab booking flow
            if (selectedService === "lab" && appointment?.id) {
                router.push(`${route}?consultation_id=${appointment.id}`);
            } else {
                router.push(route);
            }
        } else {
            toast.success(`Proceeding with ${selectedService} services...`);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
                    <h2 className="text-xl font-bold text-emerald-900 flex items-center gap-2">
                        <FaStethoscope className="text-emerald-500 w-5 h-5" />
                        Recommended Next Steps
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-gray-500">
                        <FaTimes className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="space-y-4 animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-6"></div>
                            <div className="h-20 bg-gray-100 rounded-xl w-full"></div>
                            <div className="h-20 bg-gray-100 rounded-xl w-full"></div>
                        </div>
                    ) : recommendations.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500 font-medium">No specific next steps recommended for this consultation.</p>
                            <button
                                onClick={onClose}
                                className="mt-4 px-6 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold p-3 rounded-xl text-center shadow-sm">
                                🕒 {urgencyMessage}
                            </div>

                            {/* Service options — click to select */}
                            <div className="space-y-3">
                                {recommendations.map((rec, idx) => {
                                    const Icon = SERVICE_ICONS[rec.service_type] || FaStethoscope;
                                    const isSelected = selectedService === rec.service_type;
                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => handleServiceSelect(rec)}
                                            className={`group flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer shadow-sm hover:shadow-md ${
                                                isSelected
                                                    ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200"
                                                    : "border-gray-200 hover:border-emerald-300 hover:bg-emerald-50"
                                            }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                                                    isSelected ? "bg-emerald-500 text-white" : "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200"
                                                }`}>
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900 capitalize leading-none">{rec.service_type} Services</h4>
                                                    <p className="text-xs text-gray-500 mt-1.5 font-medium">{rec.display_text}</p>
                                                </div>
                                            </div>
                                            <FaArrowRight className={`w-4 h-4 transition-colors ${isSelected ? "text-emerald-500" : "text-gray-300 group-hover:text-emerald-500"}`} />
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Proceed button — navigates to the selected service */}
                            <button
                                onClick={handleProceed}
                                disabled={!selectedService}
                                className="w-full py-3.5 rounded-xl bg-[#0067A1] text-white font-bold text-lg hover:bg-[#073834] transition-all shadow-lg shadow-[#0067A1]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {selectedService
                                    ? `Go to ${selectedService.charAt(0).toUpperCase() + selectedService.slice(1)} →`
                                    : "Select a Service"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
