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
    FaClock
} from "react-icons/fa";
import { useRouter } from "next/navigation";

// Minimalist, institutional medical CardioConnect vitals monitor
function CardioVitalsPreview() {
    return (
        <div className="w-full rounded-xl border border-slate-200 bg-white overflow-hidden">
            {/* Clinical Interface Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                        Vitals Monitor • Sinus Rhythm
                    </span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                    Normal
                </span>
            </div>

            {/* Dashboard Vitals Content */}
            <div className="p-4 sm:p-5 space-y-3.5 bg-white">
                {/* Real-time ECG Rhythm Wave Tile */}
                <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <FaHeartbeat className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <div>
                                <div className="text-xs font-semibold text-slate-800">Resting Heart Rate</div>
                                <div className="text-[11px] text-slate-500">Continuous rhythm recording</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-xl font-bold text-slate-900">72</span>
                            <span className="text-xs font-medium text-slate-500 ml-1">BPM</span>
                        </div>
                    </div>

                    {/* Crisp Vector ECG Rhythm Line */}
                    <div className="h-8 w-full overflow-hidden flex items-center bg-white rounded border border-slate-200 px-2">
                        <svg className="w-full h-5 text-slate-700" viewBox="0 0 320 28" fill="none" preserveAspectRatio="none">
                            <path
                                d="M0 14 L35 14 L42 14 L48 5 L54 23 L60 2 L66 26 L72 14 L78 14 L115 14 L122 14 L128 5 L134 23 L140 2 L146 26 L152 14 L158 14 L195 14 L202 14 L208 5 L214 23 L220 2 L226 26 L232 14 L238 14 L275 14 L282 14 L288 5 L294 23 L300 2 L306 26 L312 14 L320 14"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                </div>

                {/* 2-Column Clinical Metrics */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Blood Pressure */}
                    <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/50">
                        <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                            Blood Pressure
                        </div>
                        <div className="text-lg font-bold text-slate-900">
                            118<span className="text-sm font-normal text-slate-400">/</span>78
                            <span className="text-xs font-normal text-slate-500 ml-1">mmHg</span>
                        </div>
                        <div className="mt-1.5 inline-flex items-center text-[10px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            Optimal Range
                        </div>
                    </div>

                    {/* Active Movement */}
                    <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/50">
                        <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                            Daily Movement
                        </div>
                        <div className="text-lg font-bold text-slate-900">
                            8,420
                            <span className="text-xs font-normal text-slate-500 ml-1">steps</span>
                        </div>
                        <div className="mt-1.5 inline-flex items-center text-[10px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            Target Met
                        </div>
                    </div>
                </div>

                {/* Guided Routine Tile */}
                <div className="rounded-lg border border-slate-200 p-2.5 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <FaClock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <div>
                            <div className="text-xs font-semibold text-slate-800">Cardiovascular Routine</div>
                            <div className="text-[11px] text-slate-500">10 mins guided pacing completed</div>
                        </div>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                        Recorded
                    </span>
                </div>

                {/* Institutional Compliance Footer */}
                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200">
                    <span className="flex items-center gap-1.5">
                        <FaShieldAlt className="w-3 h-3 text-slate-400" />
                        <span>AHA Aligned Protocols</span>
                    </span>
                    <span>DISHA & HIPAA Standard</span>
                </div>
            </div>
        </div>
    );
}

// Minimalist, institutional medical LungConnect vitals monitor
function LungVitalsPreview() {
    return (
        <div className="w-full rounded-xl border border-slate-200 bg-white overflow-hidden">
            {/* Clinical Interface Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                        Respiratory Monitor • Pulmonary Health
                    </span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                    Optimal
                </span>
            </div>

            {/* Dashboard Vitals Content */}
            <div className="p-4 sm:p-5 space-y-3.5 bg-white">
                {/* Guided Breathing Visualizer Tile */}
                <div className="rounded-lg border border-slate-200 p-3 flex items-center justify-between bg-slate-50/50">
                    <div className="space-y-0.5">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Pulmonary Exercise
                        </div>
                        <div className="text-xs font-semibold text-slate-900">
                            Box Breathing Exercise (4s)
                        </div>
                        <div className="text-[11px] text-slate-500">
                            5 mins completed • Airway pacing recorded
                        </div>
                    </div>
                    {/* Concentric Clean Breath Indicator */}
                    <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
                        <div className="absolute inset-0 rounded-full border border-slate-300"></div>
                        <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-bold text-xs">
                            4s
                        </div>
                    </div>
                </div>

                {/* 2-Column Clinical Metrics */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Blood Oxygen SpO2 */}
                    <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/50">
                        <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                            Blood Oxygen (SpO2)
                        </div>
                        <div className="text-lg font-bold text-slate-900">
                            98%
                            <span className="text-xs font-normal text-slate-500 ml-1">Normal</span>
                        </div>
                        <div className="mt-1.5 inline-flex items-center text-[10px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            Healthy Saturation
                        </div>
                    </div>

                    {/* Respiratory Rate */}
                    <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/50">
                        <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                            Respiratory Rate
                        </div>
                        <div className="text-lg font-bold text-slate-900">
                            16
                            <span className="text-xs font-normal text-slate-500 ml-1">breaths/min</span>
                        </div>
                        <div className="mt-1.5 inline-flex items-center text-[10px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            Resting Rhythm
                        </div>
                    </div>
                </div>

                {/* Environmental AQI Metric Tile */}
                <div className="rounded-lg border border-slate-200 p-2.5 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <FaWind className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <div>
                            <div className="text-xs font-semibold text-slate-800">Ambient Air Quality (AQI)</div>
                            <div className="text-[11px] text-slate-500">AQI 32 • Optimal ambient air</div>
                        </div>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                        Low Risk
                    </span>
                </div>

                {/* Institutional Compliance Footer */}
                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200">
                    <span className="flex items-center gap-1.5">
                        <FaShieldAlt className="w-3 h-3 text-slate-400" />
                        <span>Spirometry Guided Screening</span>
                    </span>
                    <span>Clinical Preventive Care</span>
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
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <div className="max-w-3xl mx-auto text-center mb-10 lg:mb-12">
                    <p className="text-xs font-bold tracking-widest text-[#0067A1] uppercase mb-1.5">
                        Preventive Care Protocols
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2.5">
                        Structured Health Programs
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto">
                        Evidence-based vitals tracking, guided breathing exercises, and clinical health trends designed for patient monitoring and doctor consultation.
                    </p>
                </div>

                <div className="flex flex-col gap-8 lg:gap-10 max-w-5xl mx-auto">
                    {/* CardioConnect Card - Shadow Free, Minimal Medical Standard */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-7 lg:p-8">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
                            {/* Native Clinical UI Preview Column */}
                            <div className="lg:col-span-5 order-2 lg:order-1">
                                <CardioVitalsPreview />
                            </div>
                            
                            {/* Text / Feature Details Column */}
                            <div className="lg:col-span-7 order-1 lg:order-2 space-y-5">
                                <div>
                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 mb-2 uppercase tracking-wider">
                                        Cardiovascular Health
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                                        CardioConnect
                                    </h3>
                                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mt-2">
                                        A standardized longitudinal routine for cardiovascular monitoring. Log resting pulse and blood pressure, monitor daily exertion, and export structured records for doctor review.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {/* Step 1 */}
                                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                                        <div className="flex items-center gap-2 mb-1">
                                            <FaStethoscope className="w-3.5 h-3.5 text-slate-600" />
                                            <h4 className="font-semibold text-slate-900 text-xs">1. Log Vitals</h4>
                                        </div>
                                        <p className="text-[11px] text-slate-500 leading-normal">Track resting pulse, systolic and diastolic BP values.</p>
                                    </div>
                                    {/* Step 2 */}
                                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                                        <div className="flex items-center gap-2 mb-1">
                                            <FaWalking className="w-3.5 h-3.5 text-slate-600" />
                                            <h4 className="font-semibold text-slate-900 text-xs">2. Active Habit</h4>
                                        </div>
                                        <p className="text-[11px] text-slate-500 leading-normal">Maintain structured exertion & guided relaxation.</p>
                                    </div>
                                    {/* Step 3 */}
                                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                                        <div className="flex items-center gap-2 mb-1">
                                            <FaFileMedical className="w-3.5 h-3.5 text-slate-600" />
                                            <h4 className="font-semibold text-slate-900 text-xs">3. Medical Report</h4>
                                        </div>
                                        <p className="text-[11px] text-slate-500 leading-normal">Clinical summaries prepared for doctor consultation.</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 pt-1">
                                    <button
                                        suppressHydrationWarning
                                        onClick={() => handleServiceClick('cardio_hub')}
                                        className="py-2.5 px-5 rounded-lg bg-[#0067A1] text-white font-medium hover:bg-[#005584] transition-colors text-xs sm:text-sm cursor-pointer"
                                    >
                                        Enter CardioConnect
                                    </button>
                                    <button
                                        suppressHydrationWarning
                                        onClick={() => handleServiceClick('cardio')}
                                        className="py-2.5 px-5 rounded-lg bg-white border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors text-xs sm:text-sm cursor-pointer"
                                    >
                                        Start Assessment
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* LungConnect Card - Shadow Free, Minimal Medical Standard */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-7 lg:p-8">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
                            {/* Text / Feature Details Column */}
                            <div className="lg:col-span-7 order-1 lg:order-1 space-y-5">
                                <div>
                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 mb-2 uppercase tracking-wider">
                                        Pulmonary Wellness
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                                        LungConnect
                                    </h3>
                                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mt-2">
                                        A guided respiratory wellness assessment and breathwork monitor. Complete standard pulmonary evaluations, practice box breathing routines, and monitor oxygen saturation.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {/* Step 1 */}
                                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                                        <div className="flex items-center gap-2 mb-1">
                                            <FaLungs className="w-3.5 h-3.5 text-slate-600" />
                                            <h4 className="font-semibold text-slate-900 text-xs">1. Guided Inputs</h4>
                                        </div>
                                        <p className="text-[11px] text-slate-500 leading-normal">Clinical questionnaire on cough, breath & smoking habits.</p>
                                    </div>
                                    {/* Step 2 */}
                                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                                        <div className="flex items-center gap-2 mb-1">
                                            <FaWind className="w-3.5 h-3.5 text-slate-600" />
                                            <h4 className="font-semibold text-slate-900 text-xs">2. Box Breathing</h4>
                                        </div>
                                        <p className="text-[11px] text-slate-500 leading-normal">Paced breathing exercise with real-time rhythm guides.</p>
                                    </div>
                                    {/* Step 3 */}
                                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                                        <div className="flex items-center gap-2 mb-1">
                                            <FaUserMd className="w-3.5 h-3.5 text-slate-600" />
                                            <h4 className="font-semibold text-slate-900 text-xs">3. Specialist Review</h4>
                                        </div>
                                        <p className="text-[11px] text-slate-500 leading-normal">Seamless consultation with verified pulmonologists.</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 pt-1">
                                    <button
                                        suppressHydrationWarning
                                        onClick={() => handleServiceClick('lung')}
                                        className="py-2.5 px-5 rounded-lg bg-[#0067A1] text-white font-medium hover:bg-[#005584] transition-colors text-xs sm:text-sm cursor-pointer"
                                    >
                                        Enter LungConnect
                                    </button>
                                    <button
                                        suppressHydrationWarning
                                        onClick={() => handleServiceClick('lung_assessment')}
                                        className="py-2.5 px-5 rounded-lg bg-white border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors text-xs sm:text-sm cursor-pointer"
                                    >
                                        Start Assessment
                                    </button>
                                </div>
                            </div>

                            {/* Native Clinical UI Preview Column */}
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
