"use client";

import { 
    FaHeartbeat, 
    FaLungs, 
    FaCheck, 
    FaShieldAlt, 
    FaWind,
    FaStethoscope,
    FaWalking,
    FaFileMedical,
    FaUserMd,
    FaClock,
    FaArrowRight,
    FaTint
} from "react-icons/fa";
import { useRouter } from "next/navigation";

// Dynamic Animated CardioConnect Vitals Monitor
function CardioVitalsPreview() {
    return (
        <div className="w-full rounded-2xl border border-rose-200/90 bg-white overflow-hidden shadow-xs hover:border-rose-300 transition-all">
            {/* Clinical Interface Header */}
            <div className="bg-rose-50/80 border-b border-rose-100 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                    </span>
                    <span className="text-xs font-bold text-rose-950 uppercase tracking-wider">
                        Vitals Monitor • Sinus Rhythm
                    </span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100/90 text-emerald-800 border border-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    Live • Normal
                </span>
            </div>

            {/* Dashboard Vitals Content */}
            <div className="p-4 sm:p-5 space-y-3.5 bg-white">
                {/* Real-time ECG Rhythm Wave Tile with Animated Vector */}
                <div className="rounded-xl border border-rose-100 p-3.5 bg-rose-50/30 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600">
                                <FaHeartbeat className="w-4 h-4 text-rose-600 animate-pulse" />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-slate-900">Resting Heart Rate</div>
                                <div className="text-[11px] text-slate-500">Real-time rhythm synchronization</div>
                            </div>
                        </div>
                        <div className="text-right flex items-baseline gap-1">
                            <span className="text-2xl font-black text-rose-600 tracking-tight">72</span>
                            <span className="text-xs font-semibold text-rose-800">BPM</span>
                        </div>
                    </div>

                    {/* Animated ECG Rhythm Waveform with glowing pulse */}
                    <div className="relative h-12 w-full overflow-hidden flex items-center bg-slate-950 rounded-lg border border-slate-800 px-1 shadow-inner">
                        {/* Medical grid background */}
                        <div 
                            className="absolute inset-0 opacity-20 pointer-events-none"
                            style={{
                                backgroundImage: "radial-gradient(#f43f5e 0.75px, transparent 0.75px), radial-gradient(#0284c7 0.75px, transparent 0.75px)",
                                backgroundSize: "12px 12px",
                                backgroundPosition: "0 0, 6px 6px"
                            }}
                        />

                        {/* Animated ECG Wave SVG */}
                        <svg className="w-full h-10 relative z-10" viewBox="0 0 400 40" fill="none" preserveAspectRatio="none">
                            {/* Base faint trace */}
                            <path
                                d="M 0 20 L 30 20 L 40 20 L 48 10 L 54 32 L 60 4 L 66 36 L 72 20 L 80 20 L 130 20 L 140 20 L 148 10 L 154 32 L 160 4 L 166 36 L 172 20 L 180 20 L 230 20 L 240 20 L 248 10 L 254 32 L 260 4 L 266 36 L 272 20 L 280 20 L 330 20 L 340 20 L 348 10 L 354 32 L 360 4 L 366 36 L 372 20 L 400 20"
                                stroke="#f43f5e"
                                strokeWidth="1.5"
                                strokeOpacity="0.3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            {/* Animated Glowing ECG Pulse Line */}
                            <path
                                className="ecg-animated-path"
                                d="M 0 20 L 30 20 L 40 20 L 48 10 L 54 32 L 60 4 L 66 36 L 72 20 L 80 20 L 130 20 L 140 20 L 148 10 L 154 32 L 160 4 L 166 36 L 172 20 L 180 20 L 230 20 L 240 20 L 248 10 L 254 32 L 260 4 L 266 36 L 272 20 L 280 20 L 330 20 L 340 20 L 348 10 L 354 32 L 360 4 L 366 36 L 372 20 L 400 20"
                                stroke="#fb7185"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            {/* Traveling Pulse Beam Dot */}
                            <circle r="3.5" fill="#ffffff">
                                <animateMotion
                                    path="M 0 20 L 30 20 L 40 20 L 48 10 L 54 32 L 60 4 L 66 36 L 72 20 L 80 20 L 130 20 L 140 20 L 148 10 L 154 32 L 160 4 L 166 36 L 172 20 L 180 20 L 230 20 L 240 20 L 248 10 L 254 32 L 260 4 L 266 36 L 272 20 L 280 20 L 330 20 L 340 20 L 348 10 L 354 32 L 360 4 L 366 36 L 372 20 L 400 20"
                                    dur="2.4s"
                                    repeatCount="indefinite"
                                />
                            </circle>
                        </svg>
                    </div>
                </div>

                {/* 2-Column Clinical Metrics with Colorful Accents */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Blood Pressure Tile */}
                    <div className="rounded-xl border border-sky-100 p-3 bg-sky-50/40">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider">
                                Blood Pressure
                            </span>
                            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                        </div>
                        <div className="text-lg font-extrabold text-slate-900">
                            118<span className="text-sm font-semibold text-slate-400">/</span>78
                            <span className="text-xs font-semibold text-sky-700 ml-1">mmHg</span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-sky-700 bg-sky-100/90 px-2 py-0.5 rounded border border-sky-200">
                                Optimal Range
                            </span>
                            <span className="text-[10px] font-medium text-slate-500">Systolic/Diastolic</span>
                        </div>
                    </div>

                    {/* Active Movement Tile */}
                    <div className="rounded-xl border border-emerald-100 p-3 bg-emerald-50/40">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                                Daily Movement
                            </span>
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        </div>
                        <div className="text-lg font-extrabold text-slate-900">
                            8,420
                            <span className="text-xs font-semibold text-emerald-700 ml-1">steps</span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-200">
                                Target Met (84%)
                            </span>
                            <span className="text-[10px] font-medium text-slate-500">10k Goal</span>
                        </div>
                    </div>
                </div>

                {/* Guided Routine Tile */}
                <div className="rounded-xl border border-rose-100 p-2.5 flex items-center justify-between bg-rose-50/30">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
                            <FaClock className="w-3.5 h-3.5" />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-slate-900">Cardiovascular Routine</div>
                            <div className="text-[11px] text-slate-600">10 mins guided pacing completed</div>
                        </div>
                    </div>
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100/90 px-2.5 py-1 rounded-full border border-rose-200 flex items-center gap-1">
                        <FaCheck className="w-2.5 h-2.5 text-rose-600" />
                        Recorded
                    </span>
                </div>

                {/* Institutional Compliance Footer */}
                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100">
                    <span className="flex items-center gap-1.5 text-rose-800 font-medium">
                        <FaShieldAlt className="w-3 h-3 text-rose-600" />
                        <span>AHA Aligned Protocols</span>
                    </span>
                    <span className="font-medium text-slate-600">DISHA & HIPAA Standard</span>
                </div>
            </div>
        </div>
    );
}

// Dynamic Animated LungConnect Vitals Monitor
function LungVitalsPreview() {
    return (
        <div className="w-full rounded-2xl border border-teal-200/90 bg-white overflow-hidden shadow-xs hover:border-teal-300 transition-all">
            {/* Clinical Interface Header */}
            <div className="bg-teal-50/80 border-b border-teal-100 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-600"></span>
                    </span>
                    <span className="text-xs font-bold text-teal-950 uppercase tracking-wider">
                        Respiratory Monitor • Pulmonary Health
                    </span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100/90 text-emerald-800 border border-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    Optimal Airway
                </span>
            </div>

            {/* Dashboard Vitals Content */}
            <div className="p-4 sm:p-5 space-y-3.5 bg-white">
                {/* Guided Breathing Visualizer Tile with Animated SVG Lungs */}
                <div className="rounded-xl border border-teal-100 p-3.5 bg-teal-50/30 relative overflow-hidden flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                            Box Breathing Exercise (4s)
                        </div>
                        <div className="text-xs font-bold text-slate-900">
                            Inhale (4s) • Hold • Exhale (4s)
                        </div>
                        <div className="text-[11px] text-slate-500">
                            5 mins completed • Airway pacing stabilized
                        </div>
                    </div>

                    {/* Stylized Animated Lungs Vector */}
                    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                        {/* Outer breathing ring pulse */}
                        <div className="absolute inset-0 rounded-full border-2 border-teal-300 animate-ping opacity-25"></div>
                        <div className="absolute inset-1 rounded-full bg-teal-100/70 border border-teal-200"></div>

                        {/* Animated Vector Lungs SVG */}
                        <svg className="w-10 h-10 relative z-10 lung-animated-svg" viewBox="0 0 64 64" fill="none">
                            {/* Trachea Windpipe */}
                            <path 
                                d="M32 10 L32 26 M30 14 L34 14 M30 18 L34 18 M30 22 L34 22" 
                                stroke="#0f766e" 
                                strokeWidth="2.5" 
                                strokeLinecap="round" 
                            />
                            {/* Left Bronchial Tree & Lung Lobe */}
                            <path 
                                d="M32 26 C26 26 20 28 17 34 C14 40 15 48 20 52 C24 55 28 51 30 45 C31 40 31 32 32 26 Z" 
                                fill="#14b8a6" 
                                stroke="#0d9488" 
                                strokeWidth="2" 
                                strokeLinejoin="round" 
                            />
                            {/* Right Bronchial Tree & Lung Lobe */}
                            <path 
                                d="M32 26 C38 26 44 28 47 34 C50 40 49 48 44 52 C40 55 36 51 34 45 C33 40 33 32 32 26 Z" 
                                fill="#06b6d4" 
                                stroke="#0284c7" 
                                strokeWidth="2" 
                                strokeLinejoin="round" 
                            />
                            {/* Internal Airway Branches */}
                            <path 
                                d="M32 26 L24 35 M24 35 L20 42 M24 35 L27 43" 
                                stroke="#ffffff" 
                                strokeWidth="1.2" 
                                strokeLinecap="round" 
                            />
                            <path 
                                d="M32 26 L40 35 M40 35 L44 42 M40 35 L37 43" 
                                stroke="#ffffff" 
                                strokeWidth="1.2" 
                                strokeLinecap="round" 
                            />
                        </svg>

                        {/* Small Floating 4s Tag */}
                        <span className="absolute -bottom-1 -right-1 text-[9px] font-black text-teal-800 bg-white border border-teal-300 rounded-full px-1.5 py-0.2 shadow-xs">
                            4s
                        </span>
                    </div>
                </div>

                {/* 2-Column Clinical Metrics with Colorful Accents */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Blood Oxygen SpO2 */}
                    <div className="rounded-xl border border-cyan-100 p-3 bg-cyan-50/40">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-bold text-cyan-800 uppercase tracking-wider">
                                Blood Oxygen (SpO2)
                            </span>
                            <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                        </div>
                        <div className="text-lg font-extrabold text-slate-900">
                            98%
                            <span className="text-xs font-semibold text-cyan-700 ml-1">Normal</span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-cyan-800 bg-cyan-100/90 px-2 py-0.5 rounded border border-cyan-200">
                                Healthy Saturation
                            </span>
                            <span className="text-[10px] font-medium text-slate-500">Pulse Oximetry</span>
                        </div>
                    </div>

                    {/* Respiratory Rate */}
                    <div className="rounded-xl border border-emerald-100 p-3 bg-emerald-50/40">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                                Respiratory Rate
                            </span>
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        </div>
                        <div className="text-lg font-extrabold text-slate-900">
                            16
                            <span className="text-xs font-semibold text-emerald-700 ml-1">breaths/min</span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-200">
                                Resting Rhythm
                            </span>
                            <span className="text-[10px] font-medium text-slate-500">Baseline Met</span>
                        </div>
                    </div>
                </div>

                {/* Environmental AQI Metric Tile */}
                <div className="rounded-xl border border-teal-100 p-2.5 flex items-center justify-between bg-teal-50/30">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600">
                            <FaWind className="w-3.5 h-3.5 animate-pulse" />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-slate-900">Ambient Air Quality (AQI)</div>
                            <div className="text-[11px] text-slate-600">AQI 32 • Optimal ambient air index</div>
                        </div>
                    </div>
                    <span className="text-[10px] font-bold text-teal-800 bg-teal-100/90 px-2.5 py-1 rounded-full border border-teal-200 flex items-center gap-1">
                        <FaCheck className="w-2.5 h-2.5 text-teal-600" />
                        Low Risk
                    </span>
                </div>

                {/* Institutional Compliance Footer */}
                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100">
                    <span className="flex items-center gap-1.5 text-teal-800 font-medium">
                        <FaShieldAlt className="w-3 h-3 text-teal-600" />
                        <span>Spirometry Guided Screening</span>
                    </span>
                    <span className="font-medium text-slate-600">Clinical Preventive Care</span>
                </div>
            </div>
        </div>
    );
}

const WellnessServices = ({ onLoginClick }) => {
    const router = useRouter();

    const handleServiceClick = (serviceType) => {
        if (typeof window === "undefined") return;

        const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');

        if (!userId) {
            onLoginClick?.();
            return;
        }

        if (serviceType === 'cardio') {
            router.push('/website/heart-health');
        } else if (serviceType === 'cardio_hub') {
            router.push('/website/cardio-connect');
        } else if (serviceType === 'lung') {
            router.push('/lung-connect');
        } else if (serviceType === 'lung_assessment') {
            router.push('/website/lung-assessment');
        }
    };

    return (
        <section className="py-12 lg:py-16 bg-white border-y border-slate-200">
            {/* Scoped CSS animations for ECG line and Lungs breathing visual */}
            <style jsx>{`
                .ecg-animated-path {
                    stroke-dasharray: 400;
                    stroke-dashoffset: 400;
                    animation: ecgDash 2.4s linear infinite;
                }
                @keyframes ecgDash {
                    0% {
                        stroke-dashoffset: 400;
                    }
                    50% {
                        stroke-dashoffset: 0;
                    }
                    100% {
                        stroke-dashoffset: -400;
                    }
                }
                .lung-animated-svg {
                    transform-origin: center;
                    animation: lungsBreathing 4s ease-in-out infinite;
                }
                @keyframes lungsBreathing {
                    0%, 100% {
                        transform: scale(0.92);
                    }
                    50% {
                        transform: scale(1.1);
                    }
                }
            `}</style>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <div className="max-w-3xl mx-auto text-center mb-10 lg:mb-12">
                    <p className="text-xs sm:text-sm font-semibold tracking-wide text-[#0067A1] uppercase mb-2">
                        Preventive Care Protocols
                    </p>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-3 tracking-tight">
                        Structured Health Programs
                    </h2>
                    <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
                        Evidence-based vitals tracking, guided breathing exercises, and clinical health trends designed for patient monitoring and doctor consultation.
                    </p>
                </div>

                {/* Main Cards Wrapper - Full Container Width matching other sections */}
                <div className="flex flex-col gap-8 lg:gap-10 w-full mx-auto">
                    {/* CardioConnect Card - Colorful, High-Contrast & Animated */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 lg:p-8 hover:border-slate-300 transition-all shadow-sm">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
                            {/* Animated Clinical UI Preview Column */}
                            <div className="lg:col-span-5 order-2 lg:order-1">
                                <CardioVitalsPreview />
                            </div>
                            
                            {/* Text / Feature Details Column */}
                            <div className="lg:col-span-7 order-1 lg:order-2 space-y-5">
                                <div>
                                    <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <FaHeartbeat className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                                        <span>Cardiovascular Health</span>
                                    </p>
                                    <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                                        CardioConnect
                                    </h3>
                                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-2.5">
                                        A standardized longitudinal routine for cardiovascular monitoring. Log resting pulse and blood pressure, monitor daily exertion, and export structured records for doctor review.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                    {/* Step 1 */}
                                    <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-white hover:border-rose-200 transition-all">
                                        <div className="flex items-center gap-2.5 mb-1.5">
                                            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                                                <FaStethoscope className="w-3.5 h-3.5" />
                                            </div>
                                            <h4 className="font-bold text-slate-900 text-xs">1. Log Vitals</h4>
                                        </div>
                                        <p className="text-[11px] text-slate-600 leading-normal">Track resting pulse, systolic and diastolic BP values.</p>
                                    </div>
                                    {/* Step 2 */}
                                    <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-white hover:border-amber-200 transition-all">
                                        <div className="flex items-center gap-2.5 mb-1.5">
                                            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                                                <FaWalking className="w-3.5 h-3.5" />
                                            </div>
                                            <h4 className="font-bold text-slate-900 text-xs">2. Active Habit</h4>
                                        </div>
                                        <p className="text-[11px] text-slate-600 leading-normal">Maintain structured exertion & guided relaxation.</p>
                                    </div>
                                    {/* Step 3 */}
                                    <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-white hover:border-sky-200 transition-all">
                                        <div className="flex items-center gap-2.5 mb-1.5">
                                            <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                                                <FaFileMedical className="w-3.5 h-3.5" />
                                            </div>
                                            <h4 className="font-bold text-slate-900 text-xs">3. Medical Report</h4>
                                        </div>
                                        <p className="text-[11px] text-slate-600 leading-normal">Clinical summaries prepared for doctor consultation.</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 pt-1">
                                    <button
                                        suppressHydrationWarning
                                        onClick={() => handleServiceClick('cardio_hub')}
                                        className="py-2.5 px-6 rounded-lg bg-[#0067A1] text-white font-semibold hover:bg-[#005584] transition-all text-xs sm:text-sm cursor-pointer shadow-md hover:shadow-lg flex items-center gap-2"
                                    >
                                        <span>Enter CardioConnect</span>
                                        <FaArrowRight className="w-3 h-3" />
                                    </button>
                                    <button
                                        suppressHydrationWarning
                                        onClick={() => handleServiceClick('cardio')}
                                        className="py-2.5 px-6 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-all text-xs sm:text-sm cursor-pointer shadow-sm hover:shadow-md"
                                    >
                                        Start Assessment
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* LungConnect Card - Colorful, High-Contrast & Animated */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 lg:p-8 hover:border-slate-300 transition-all shadow-sm">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
                            {/* Text / Feature Details Column */}
                            <div className="lg:col-span-7 order-1 lg:order-1 space-y-5">
                                <div>
                                    <p className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <FaLungs className="w-3.5 h-3.5 text-teal-500" />
                                        <span>Pulmonary Wellness</span>
                                    </p>
                                    <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                                        LungConnect
                                    </h3>
                                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-2.5">
                                        A guided respiratory wellness assessment and breathwork monitor. Complete standard pulmonary evaluations, practice box breathing routines, and monitor oxygen saturation.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                    {/* Step 1 */}
                                    <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-white hover:border-teal-200 transition-all">
                                        <div className="flex items-center gap-2.5 mb-1.5">
                                            <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
                                                <FaLungs className="w-3.5 h-3.5" />
                                            </div>
                                            <h4 className="font-bold text-slate-900 text-xs">1. Guided Inputs</h4>
                                        </div>
                                        <p className="text-[11px] text-slate-600 leading-normal">Clinical questionnaire on cough, breath & smoking habits.</p>
                                    </div>
                                    {/* Step 2 */}
                                    <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-white hover:border-cyan-200 transition-all">
                                        <div className="flex items-center gap-2.5 mb-1.5">
                                            <div className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0">
                                                <FaWind className="w-3.5 h-3.5" />
                                            </div>
                                            <h4 className="font-bold text-slate-900 text-xs">2. Box Breathing</h4>
                                        </div>
                                        <p className="text-[11px] text-slate-600 leading-normal">Paced breathing exercise with real-time rhythm guides.</p>
                                    </div>
                                    {/* Step 3 */}
                                    <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-white hover:border-blue-200 transition-all">
                                        <div className="flex items-center gap-2.5 mb-1.5">
                                            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                                <FaUserMd className="w-3.5 h-3.5" />
                                            </div>
                                            <h4 className="font-bold text-slate-900 text-xs">3. Specialist Review</h4>
                                        </div>
                                        <p className="text-[11px] text-slate-600 leading-normal">Seamless consultation with verified pulmonologists.</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 pt-1">
                                    <button
                                        suppressHydrationWarning
                                        onClick={() => handleServiceClick('lung')}
                                        className="py-2.5 px-6 rounded-lg bg-[#0067A1] text-white font-semibold hover:bg-[#005584] transition-all text-xs sm:text-sm cursor-pointer shadow-md hover:shadow-lg flex items-center gap-2"
                                    >
                                        <span>Enter LungConnect</span>
                                        <FaArrowRight className="w-3 h-3" />
                                    </button>
                                    <button
                                        suppressHydrationWarning
                                        onClick={() => handleServiceClick('lung_assessment')}
                                        className="py-2.5 px-6 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-all text-xs sm:text-sm cursor-pointer shadow-sm hover:shadow-md"
                                    >
                                        Start Assessment
                                    </button>
                                </div>
                            </div>

                            {/* Animated Clinical UI Preview Column */}
                            <div className="lg:col-span-5 order-2 lg:order-2">
                                <LungVitalsPreview />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default WellnessServices;
