"use client";

import { FaHeartbeat, FaLungs, FaClipboardCheck, FaGamepad, FaChartLine } from "react-icons/fa";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const WellnessServices = ({ onLoginClick }) => {
    const router = useRouter();

    const handleServiceClick = (serviceType) => {
        if (typeof window === "undefined") return;

        const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
        const userType = localStorage.getItem('userRole') || sessionStorage.getItem('loginUserType');

        if (!userId) {
            onLoginClick?.();
            return;
        }

        if (userType !== 'patient') {
            toast.error("Wellness services are only available for patient accounts.");
            return;
        }

        if (serviceType === 'cardio') {
            router.push('/website/heart-health');
        } else if (serviceType === 'lung') {
            router.push('/website/lung-assessment');
        }
    };

    return (
        <section className="py-6 lg:py-8 bg-white border-y border-gray-100">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-6">
                    <p className="text-sm font-semibold tracking-wide text-[#0067A1] uppercase mb-4">
                        Specialized Care
                    </p>
                    <h2 className="text-3xl sm:text-4xl font-bold text-[#003358] mb-6">
                        Focused Wellness Programs
                    </h2>
                    <p className="text-lg text-gray-600 leading-relaxed">
                        Interactive health monitoring and insight-driven care through simple forms and games.
                    </p>
                </div>

                <div className="flex flex-col gap-10 lg:gap-14">
                    {/* CardioConnect Card */}
                    <div className="bg-white rounded-3xl border border-gray-150 overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 p-6 sm:p-8 lg:p-10">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
                            {/* Visual Mockup Column */}
                            <div className="lg:col-span-5 order-1 lg:order-1 relative group/mockup">
                                {/* Soft ambient background glow */}
                                <div className="absolute -inset-4 bg-gradient-to-tr from-rose-500/10 to-red-500/10 rounded-[2.5rem] blur-2xl opacity-75 group-hover/mockup:opacity-100 transition-opacity duration-300"></div>
                                
                                {/* Mockup image with hover effects */}
                                <div className="relative rounded-[2rem] overflow-hidden border-4 border-gray-100 shadow-md bg-gray-50 transform hover:scale-[1.02] transition-all duration-500 ease-out hover:shadow-xl">
                                    <img 
                                        src="/cardio-mockup.png" 
                                        alt="CardioConnect App Interface" 
                                        className="w-full h-auto object-cover"
                                    />
                                </div>
                            </div>
                            
                            {/* Text / Feature details Column */}
                            <div className="lg:col-span-7 order-2 lg:order-2">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center shadow-inner">
                                        <FaHeartbeat className="w-7 h-7 text-rose-500 animate-pulse" />
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold uppercase tracking-widest text-rose-500 bg-rose-50 px-3 py-1 rounded-full">Active Vitals</span>
                                        <h3 className="text-2xl sm:text-3xl font-extrabold text-[#003358] mt-1">
                                            CardioConnect
                                        </h3>
                                    </div>
                                </div>

                                <p className="text-gray-600 text-base mb-8 leading-relaxed">
                                    A structured program for heart health. Log your vitals manually and play interactive games to stay active and monitor your cardiovascular health.
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                                    {/* Step 1 */}
                                    <div className="flex flex-col items-start p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-[#0067A1]/20 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-3 shadow-sm">
                                            <FaClipboardCheck className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-bold text-[#003358] text-sm mb-1">1. Log Vitals</h4>
                                        <p className="text-xs text-gray-500 leading-relaxed">Enter your blood pressure & heart rate.</p>
                                    </div>
                                    {/* Step 2 */}
                                    <div className="flex flex-col items-start p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-[#0067A1]/20 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-3 shadow-sm">
                                            <FaGamepad className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-bold text-[#003358] text-sm mb-1">2. Play Games</h4>
                                        <p className="text-xs text-gray-500 leading-relaxed">Engage in stress-relief runner games.</p>
                                    </div>
                                    {/* Step 3 */}
                                    <div className="flex flex-col items-start p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-[#0067A1]/20 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-[#0067A1]/10 text-[#0067A1] flex items-center justify-center mb-3 shadow-sm">
                                            <FaChartLine className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-bold text-[#003358] text-sm mb-1">3. Get Insights</h4>
                                        <p className="text-xs text-gray-500 leading-relaxed">Receive automatic reports for your doctor.</p>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <button
                                        suppressHydrationWarning
                                        onClick={() => handleServiceClick('cardio')}
                                        className="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-[#0067A1] text-white font-semibold hover:bg-[#004F7C] transition-all hover:shadow-lg hover:shadow-[#0067A1]/20 text-sm active:scale-95"
                                    >
                                        Start Heart Assessment
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* LungConnect Card */}
                    <div className="bg-white rounded-3xl border border-gray-150 overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 p-6 sm:p-8 lg:p-10">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
                            {/* Text / Feature details Column */}
                            <div className="lg:col-span-7 order-2 lg:order-1">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center shadow-inner">
                                        <FaLungs className="w-7 h-7 text-emerald-500 animate-pulse" />
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold uppercase tracking-widest text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full">Respiratory Care</span>
                                        <h3 className="text-2xl sm:text-3xl font-extrabold text-[#003358] mt-1">
                                            LungConnect
                                        </h3>
                                    </div>
                                </div>

                                <p className="text-gray-600 text-base mb-8 leading-relaxed">
                                    Comprehensive respiratory wellness. Use our breathing exercises and interactive games to improve lung capacity and track your breath quality.
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                                    {/* Step 1 */}
                                    <div className="flex flex-col items-start p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-[#0067A1]/20 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-3 shadow-sm">
                                            <FaGamepad className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-bold text-[#003358] text-sm mb-1">1. Breath Games</h4>
                                        <p className="text-xs text-gray-500 leading-relaxed">Exercises to check lung capacity.</p>
                                    </div>
                                    {/* Step 2 */}
                                    <div className="flex flex-col items-start p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-[#0067A1]/20 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-3 shadow-sm">
                                            <FaChartLine className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-bold text-[#003358] text-sm mb-1">2. Analyze Trends</h4>
                                        <p className="text-xs text-gray-500 leading-relaxed">See patterns in your respiratory health.</p>
                                    </div>
                                    {/* Step 3 */}
                                    <div className="flex flex-col items-start p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-[#0067A1]/20 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center mb-3 shadow-sm">
                                            <FaClipboardCheck className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-bold text-[#003358] text-sm mb-1">3. Stay Informed</h4>
                                        <p className="text-xs text-gray-500 leading-relaxed">Alerts to share with your specialist.</p>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <button
                                        suppressHydrationWarning
                                        onClick={() => handleServiceClick('lung')}
                                        className="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-white border border-[#0067A1] text-[#0067A1] font-semibold hover:bg-[#0067A1]/5 transition-all hover:shadow-md text-sm active:scale-95"
                                    >
                                        Check Respiratory Health
                                    </button>
                                </div>
                            </div>

                            {/* Visual Mockup Column */}
                            <div className="lg:col-span-5 order-1 lg:order-2 relative group/mockup">
                                {/* Soft ambient background glow */}
                                <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-500/10 to-teal-500/10 rounded-[2.5rem] blur-2xl opacity-75 group-hover/mockup:opacity-100 transition-opacity duration-300"></div>
                                
                                {/* Mockup image with hover effects */}
                                <div className="relative rounded-[2rem] overflow-hidden border-4 border-gray-100 shadow-md bg-gray-50 transform hover:scale-[1.02] transition-all duration-500 ease-out hover:shadow-xl">
                                    <img 
                                        src="/lung-mockup.png" 
                                        alt="LungConnect App Interface" 
                                        className="w-full h-auto object-cover"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default WellnessServices;
