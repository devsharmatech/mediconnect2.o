"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { FaComments, FaTimes, FaRobot, FaPaperPlane, FaUser, FaUserMd, FaFlask, FaPills, FaFolder, FaHeartbeat, FaLungs } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";

const SPECIALTY_ROUTING = [
    {
        specialty: "Cardiology",
        filterValue: "Cardiology",
        buttonLabel: "Consult Cardiologist",
        title: "Cardiologist",
        regex: /\b(cardiolog(ist|y)|heart( doctor)?|cardiac|chest pain|chest tightness|chest discomfort|angina|palpitation|high bp|hypertension|blood pressure|dil ka daura|dil me dard|chhati me dard|sine me dard)\b/i,
    },
    {
        specialty: "Pulmonology",
        filterValue: "Pulmonology",
        buttonLabel: "Consult Pulmonologist",
        title: "Pulmonologist",
        regex: /\b(pulmonolog(ist|y)|lung(s)?( doctor)?|chest specialist|breathless(ness)?|shortness of breath|asthma|bronchitis|wheezing|respiratory|phepde|saans( lene me dikkat)?|dama)\b/i,
    },
    {
        specialty: "General Physician",
        filterValue: "General Physician",
        buttonLabel: "Consult General Physician",
        title: "General Physician",
        regex: /\b(general physician|physician|general doctor|family doctor|fever|bukhar|bukhaar|cold|sardi|zukham|jukham|cough|khasi|khansi|flu|viral|headache|sir dard|sar dard|body pain|badan dard|weakness|kamzori|chikitsak|dikhana)\b/i,
    },
    {
        specialty: "Dentistry",
        filterValue: "Dentistry",
        buttonLabel: "Consult Dentist",
        title: "Dentist",
        regex: /\b(dentist(s)?|dentistry|dental|teeth|tooth|toothache|cavity|cavities|gums?|root canal|braces|scaling|dant|daant|danto me dard)\b/i,
    },
    {
        specialty: "Gastroenterology",
        filterValue: "Gastroenterology",
        buttonLabel: "Consult Gastroenterologist",
        title: "Gastroenterologist",
        regex: /\b(gastroenterolog(ist|y)|stomach doctor|stomach pain|pet dard|pet me dard|acidity|gerd|acid reflux|liver|digest(ion|ive)|kabz|constipation|loose motion|vomit|gas|dast)\b/i,
    },
    {
        specialty: "Orthopedics",
        filterValue: "Orthopedics",
        buttonLabel: "Consult Orthopedic Specialist",
        title: "Orthopedic Specialist",
        regex: /\b(orthopedic(s)?|orthopaedic(s)?|bone|joint(s)?|fracture|knee pain|back pain|kamar dard|spine|arthritis|haddi|jod(o)?|ghutn(e)?)\b/i,
    },
    {
        specialty: "Dermatology",
        filterValue: "Dermatology",
        buttonLabel: "Consult Dermatologist",
        title: "Dermatologist",
        regex: /\b(dermatolog(ist|y)|skin|acne|pimple(s)?|rash(es)?|eczema|psoriasis|hair fall|hair loss|khujli|chamdi|tvacha)\b/i,
    },
    {
        specialty: "Pediatrics",
        filterValue: "Pediatrics",
        buttonLabel: "Consult Pediatrician",
        title: "Pediatrician",
        regex: /\b(pediatric(ian|s)?|paediatric(ian|s)?|child doctor|baby doctor|infant|bacha|bacche|bachon)\b/i,
    },
    {
        specialty: "Gynecology",
        filterValue: "Gynecology",
        buttonLabel: "Consult Gynecologist",
        title: "Gynecologist",
        regex: /\b(gynecolog(ist|y)|gynaecolog(ist|y)|obgyn|pregnancy|period(s)?|menstrual|pcos|pcod|mahila|ladies)\b/i,
    },
    {
        specialty: "ENT",
        filterValue: "ENT",
        buttonLabel: "Consult ENT Specialist",
        title: "ENT Specialist",
        regex: /\b(ent doctor|ent specialist|ear nose throat|ear pain|throat infection|throat pain|gala dard|gale me dard|sinus(itis)?|tonsil|kaan|naak|gala)\b/i,
    },
    {
        specialty: "Neurology",
        filterValue: "Neurology",
        buttonLabel: "Consult Neurologist",
        title: "Neurologist",
        regex: /\b(neurolog(ist|y)|brain doctor|migraine|nerve pain|seizure|tremor|dimag|sar|naso)\b/i,
    },
    {
        specialty: "Psychiatry",
        filterValue: "Psychiatry",
        buttonLabel: "Consult Psychiatrist",
        title: "Psychiatrist",
        regex: /\b(psychiatr(ist|y)|mental health|depression|anxiety|stress|counseling|tanav|ghabrahat)\b/i,
    },
    {
        specialty: "Urology",
        filterValue: "Urology",
        buttonLabel: "Consult Urologist",
        title: "Urologist",
        regex: /\b(urolog(ist|y)|kidney stone|urinary|prostate|pathri|peshab)\b/i,
    },
    {
        specialty: "Ophthalmology",
        filterValue: "Ophthalmology",
        buttonLabel: "Consult Eye Specialist",
        title: "Eye Specialist",
        regex: /\b(op?thalmolog(ist|y)|eye doctor|eyesight|cataract|vision|aankh|motiyabind)\b/i,
    },
];

const CLINICAL_TO_PLATFORM_SPECIALTY = {
    "dental surgery": "Dentistry",
    "oral medicine": "Dentistry",
    "dentistry": "Dentistry",
    "occupational medicine": "General Physician",
    "internal medicine": "General Physician",
    "family medicine": "General Physician",
    "general practice": "General Physician",
    "emergency medicine": "General Physician",
    "pediatric medicine": "Pediatrics",
    "pediatrics": "Pediatrics",
    "orthopedic surgery": "Orthopedics",
    "orthopedics": "Orthopedics",
    "otolaryngology": "ENT",
    "ent": "ENT",
    "obstetrics and gynecology": "Gynecology",
    "gynecology": "Gynecology",
    "pulmonary disease": "Pulmonology",
    "chest medicine": "Pulmonology",
    "pulmonology": "Pulmonology",
    "cardiovascular disease": "Cardiology",
    "cardiology": "Cardiology",
    "dermatology": "Dermatology",
    "neurology": "Neurology",
    "psychiatry": "Psychiatry",
    "urology": "Urology",
    "gastroenterology": "Gastroenterology",
};

// Assume we have access to user data in the real app via a context. 
// For safety, we use a placeholder or local generated ID if logged out.
const getUserId = () => {
    // In a real implementation this would come from Supabase auth
    return typeof window !== "undefined" && localStorage.getItem("anon_user_id")
        ? localStorage.getItem("anon_user_id")
        : "anonymous_user";
};

const SafeChatbot = () => {
    const pathname = usePathname();

    // ── All hooks must be declared BEFORE any conditional returns ──────────
    const [isOpen, setIsOpen] = useState(false);
    const [hasAgreed, setHasAgreed] = useState(false);
    const [sessionId, setSessionId] = useState("");
    const [userId, setUserId] = useState("");
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Initialize session and user on mount
    useEffect(() => {
        const storedAgreement = localStorage.getItem("ai_disclaimer_agreed");
        if (storedAgreement) {
            setHasAgreed(true);
            initChat();
        }

        let uId = localStorage.getItem("anon_user_id");
        if (!uId) {
            uId = uuidv4();
            localStorage.setItem("anon_user_id", uId);
        }
        setUserId(uId);
    }, []);

    // ── Check if patient route (suppress public website chatbot) ──
    const patientRoutes = [
        "/dashboard", "/doctor", "/lab-reports", "/appointments",
        "/medicine-order", "/digital-locker", "/nursing-care", "/heart-health",
        "/cardio-connect", "/lung-assessment", "/lung-health", "/lung-connect",
        "/profile", "/settings", "/lab-booking", "/find-doctors",
        "/prescriptions", "/patient", "/consultation", "/services/lab-tests"
    ];
    const isPatientRoute = patientRoutes.some(r => pathname?.includes(r));


    function initChat() {
        setSessionId(uuidv4());
        setMessages([
            {
                id: Date.now(),
                type: "bot",
                text: "👋 Hello! I am the MediConnect Assistant. How can I help you today? Please note I am here to provide general information and cannot diagnose conditions.",
            },
        ]);
    }

    const handleAgree = async () => {
        setHasAgreed(true);
        localStorage.setItem("ai_disclaimer_agreed", "true");
        initChat();

        // Log agreement to backend silently
        try {
            await fetch("/api/v2/ai/disclaimer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId })
            });
        } catch (e) { /* ignore */ }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        const text = inputValue.trim();
        if (!text) return;

        // Add user message
        const userMsg = { id: Date.now(), type: "user", text, role: "user" };
        const newMessagesContext = [...messages, userMsg];
        setMessages(newMessagesContext);
        setInputValue("");
        setIsTyping(true);

        // Prepare context payload for API
        // Filter out actions/buttons, just send text
        const apiMessages = newMessagesContext.map(m => ({
            role: m.type === "user" ? "user" : "assistant",
            content: m.text
        }));

        try {
            const res = await fetch("/api/v2/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: apiMessages,
                    userId: userId,
                    sessionId: sessionId
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                // Rate limit or error
                setMessages(prev => [...prev, {
                    id: Date.now(), type: "bot", text: data.message || "Something went wrong. Please try again later."
                }]);
                return;
            }

            // Success. We get back the AI's response text.
            let botText = data.response;
            let action = null;
            const lowerText = text.toLowerCase().trim();
            const cleanBot = String(botText || "");

            // 1. Detect specialty from user inquiry FIRST, then bot's explicit recommendation
            let matchedSpecialty = null;

            // A. Check if user's input directly matches a specialty symptom (e.g. chest pain -> Cardiology)
            matchedSpecialty = SPECIALTY_ROUTING.find((s) => s.regex.test(lowerText));

            // B. If not found, check if the bot specifically recommended/named a specialty in its response text
            if (!matchedSpecialty) {
                for (const spec of SPECIALTY_ROUTING) {
                    const specNameRegex = new RegExp(`\\b(${spec.specialty}|${spec.title})\\b`, "i");
                    if (specNameRegex.test(cleanBot)) {
                        matchedSpecialty = spec;
                        break;
                    }
                }
            }

            // C. Check if botText contains any keyword from specialty regex
            if (!matchedSpecialty) {
                matchedSpecialty = SPECIALTY_ROUTING.find((s) => s.regex.test(cleanBot));
            }

            // D. STRICT DENTAL GUARD: NEVER route to Dentistry unless user or bot text actually mentions teeth/mouth/dental
            if (matchedSpecialty?.specialty === "Dentistry") {
                const hasDentalWords = /\b(dentist|dental|teeth|tooth|toothache|dant|daant|gum|cavity|root canal|braces|scaling)\b/i.test(lowerText) ||
                                       /\b(dentist|dental|teeth|tooth|toothache|dant|daant|gum|cavity|root canal)\b/i.test(cleanBot);
                if (!hasDentalWords) {
                    // False dental trigger on non-dental pain/symptom -> cancel dental routing!
                    matchedSpecialty = null;
                }
            }

            const hasSymptoms = /\b(bukhar|fever|pain|dard|cough|khasi|khansi|cold|sardi|zukham|jukham|headache|sir dard|sar dard|vomit|rash|sick|bimar|ill|swelling|throat|pet dard|infection|allergy)\b/i.test(lowerText);
            const isAskingMedication = /\b(which medicine|what medicine|suggest (a )?medicine|prescribe|kya.*(medicine|dawa|dawai)|(medicine|dawa|dawai).*(bata|bta|suggest|le sakte|lu|du|lenge|milegi))\b/i.test(lowerText) ||
                (hasSymptoms && /\b(medicine|medicines|dawa|dawai|tablet|pill|syrup)\b/i.test(lowerText));
            const isPatientLoggedIn = typeof window !== "undefined" && Boolean(localStorage.getItem("patientUser"));

            // If user is asking for medicine for an illness/symptom, enforce doctor consultation first
            if (isAskingMedication) {
                botText = "बिना डॉक्टर के परामर्श के कोई भी दवा नहीं लेनी चाहिए। बुखार या किसी भी बीमारी के लक्षण होने पर पहले योग्य डॉक्टर से सलाह व जांच लें। डॉक्टर द्वारा पर्ची (Prescription) लिखे जाने के बाद ही सही दवा का सेवन करें।\n\nक्या आप डॉक्टर से परामर्श (Consultation) लेना चाहते हैं?";
                
                const targetSpecialty = matchedSpecialty || SPECIALTY_ROUTING.find(s => s.specialty === "General Physician");
                action = {
                    label: targetSpecialty ? targetSpecialty.buttonLabel : "Consult General Physician",
                    url: targetSpecialty ? `/website/doctors?specialty=${encodeURIComponent(targetSpecialty.filterValue)}` : "/website/doctors?specialty=General%20Physician",
                    icon: FaUserMd,
                };
            } else if (matchedSpecialty) {
                const isAvailabilityInquiry = /\b(do you have|is there|are there|have you got|available|find|search|book|consult|need|want|looking for)\b/i.test(lowerText);
                
                // If it's a dentist inquiry or bot returned a generic fallback
                if (matchedSpecialty.specialty === "Dentistry") {
                    if (isAvailabilityInquiry || botText.toLowerCase().includes("isn't listed") || botText.toLowerCase().includes("cannot confirm") || botText.toLowerCase().includes("not listed")) {
                        botText = "Yes, we have verified Dentists available on MediConnect! You can consult them for dental checkups, tooth pain, dental cleanings, root canals, and oral care. Would you like to view our dentists and book an appointment?";
                    }
                    action = {
                        label: matchedSpecialty.buttonLabel,
                        url: `/website/doctors?specialty=${encodeURIComponent(matchedSpecialty.filterValue)}`,
                        icon: FaUserMd,
                    };
                } else {
                    if (isAvailabilityInquiry && (botText.toLowerCase().includes("isn't listed") || botText.toLowerCase().includes("cannot confirm") || botText.toLowerCase().includes("not listed"))) {
                        botText = `Yes, we have verified **${matchedSpecialty.title}s** available on MediConnect! You can browse doctor profiles, check availability, and book appointments.`;
                    }
                    action = {
                        label: matchedSpecialty.buttonLabel,
                        url: `/website/doctors?specialty=${encodeURIComponent(matchedSpecialty.filterValue)}`,
                        icon: FaUserMd,
                    };
                }
            } else if (
                data.route_id === "CONSULT" ||
                data.cta_id === "CTA_CONSULT" ||
                /\b(doctor|physician|appointment|specialist|consultation|dikhana|chikitsak|chikitsa|bimar|ill)\b/i.test(lowerText)
            ) {
                // Doctor inquiry with no specific sub-specialty
                action = { label: "Browse All Doctors", url: "/website/doctors", icon: FaUserMd };
            } else if (
                data.route_id === "LAB" ||
                data.cta_id === "CTA_LAB" ||
                /\b(lab|blood test|diagnostic test|sample collection|pathology|jaanch)\b/i.test(lowerText)
            ) {
                action = { label: "Book Lab Tests", url: "/patient/lab-booking", icon: FaFlask };
            } else if (
                data.route_id === "MEDICINE" ||
                data.cta_id === "CTA_MEDICINE" ||
                /\b(medicine|medicines|pharmacy|dawai|order medicine)\b/i.test(lowerText)
            ) {
                // Only link to patient medicine order if user is already logged in as a patient
                if (isPatientLoggedIn) {
                    action = { label: "Order Prescribed Medicines", url: "/patient/medicine-order", icon: FaPills };
                } else {
                    botText += "\n\nMediConnect पर दवाइयाँ ऑर्डर करने के लिए डॉक्टर का मान्य पर्चा (Prescription) होना आवश्यक है। बिना डॉक्टर की सलाह के दवाइयाँ न लें।";
                    action = { label: "Consult a Doctor First", url: "/website/doctors", icon: FaUserMd };
                }
            } else if (
                data.route_id === "DIGILOCKER" ||
                data.cta_id === "CTA_DIGILOCKER" ||
                /\b(digilocker|records|health records|documents)\b/i.test(lowerText)
            ) {
                action = { label: "Access DigiLocker", url: "/patient/digital-locker", icon: FaFolder };
            } else if (data.route_id === "CARDIO" || data.cta_id === "CTA_CARDIO") {
                action = { label: "CardioConnect", url: "/patient/heart-health", icon: FaHeartbeat };
            } else if (data.route_id === "LUNG" || data.cta_id === "CTA_LUNG") {
                action = { label: "LungConnect", url: "/patient/lung-assessment", icon: FaLungs };
            } else if (!data.isEmergency) {
                // Check if user text mentions chest or heart symptoms
                if (/\b(chest|heart|cardiac|angina|chhati|sine)\b/i.test(lowerText)) {
                    action = { label: "Consult Cardiologist", url: "/website/doctors?specialty=Cardiology", icon: FaUserMd };
                } else if (/\b(breathless|breathing|saans|lung|asthma)\b/i.test(lowerText)) {
                    action = { label: "Consult Pulmonologist", url: "/website/doctors?specialty=Pulmonology", icon: FaUserMd };
                } else {
                    // Multi-word symptom phrases to avoid picking a single word like 'pain'
                    const multiWordSymptoms = [
                        "chest pain", "back pain", "knee pain", "joint pain", "stomach pain",
                        "headache", "toothache", "ear pain", "throat pain", "eye pain"
                    ];
                    let mappingKeyword = multiWordSymptoms.find(s => lowerText.includes(s));

                    if (!mappingKeyword) {
                        const symptomKeywords = ["fever", "bukhar", "cough", "khasi", "sick", "bimar", "vomit", "dizziness", "swelling", "infection", "rash"];
                        mappingKeyword = symptomKeywords.find((kw) => lowerText.includes(kw));
                    }

                    if (mappingKeyword) {
                        try {
                            const mappingRes = await fetch(`/api/clinical/complaint-mapping?query=${encodeURIComponent(mappingKeyword)}`);
                            const mappingData = await mappingRes.json();
                            
                            if (mappingData.success && mappingData.data && mappingData.data.length > 0) {
                                const topComplaint = mappingData.data[0];
                                const topDiagnosis = topComplaint.diagnoses?.sort((a, b) => a.priority_rank - b.priority_rank)[0];
                                
                                if (topDiagnosis) {
                                    const detailsRes = await fetch(`/api/clinical/diagnosis-details?diagnosis_id=${topDiagnosis.diagnosis_id}`);
                                    const detailsData = await detailsRes.json();
                                    
                                    if (detailsData.success && detailsData.data && detailsData.data.routing?.primary_specialty) {
                                        const rawSpec = detailsData.data.routing.primary_specialty.toLowerCase();
                                        let platformSpecialty = CLINICAL_TO_PLATFORM_SPECIALTY[rawSpec] || "General Physician";
                                        
                                        // Strict Dental guard: NEVER recommend Dentistry unless user asked about teeth/mouth
                                        if (platformSpecialty === "Dentistry" && !/\b(teeth|tooth|dant|daant|gum|cavity|mouth|oral|root canal)\b/i.test(lowerText)) {
                                            if (/\b(chest|heart|cardiac|angina|chhati|sine)\b/i.test(lowerText)) {
                                                platformSpecialty = "Cardiology";
                                            } else {
                                                platformSpecialty = "General Physician";
                                            }
                                        }

                                        botText += `\n\nBased on your symptoms, we recommend consulting a **${platformSpecialty}**. Would you like to consult one now?`;
                                        action = { label: `Consult ${platformSpecialty}`, url: `/website/doctors?specialty=${encodeURIComponent(platformSpecialty)}`, icon: FaUserMd };
                                    } else {
                                        action = { label: "Browse All Doctors", url: "/website/doctors", icon: FaUserMd };
                                    }
                                } else {
                                    action = { label: "Browse All Doctors", url: "/website/doctors", icon: FaUserMd };
                                }
                            } else {
                                action = { label: "Browse All Doctors", url: "/website/doctors", icon: FaUserMd };
                            }
                        } catch (e) {
                            action = { label: "Browse All Doctors", url: "/website/doctors", icon: FaUserMd };
                        }
                    } else {
                        // General medical inquiry with no specific symptom keyword
                        action = { label: "Consult General Physician", url: "/website/doctors?specialty=General%20Physician", icon: FaUserMd };
                    }
                }
            }

            const botMsg = { id: Date.now(), type: "bot", text: botText, action };
            setMessages(prev => [...prev, botMsg]);

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                id: Date.now(), type: "bot", text: "I'm having trouble connecting to the server. Please check your connection."
            }]);
        } finally {
            setIsTyping(false);
            // Re-focus the input after bot replies
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    };

    const handleInputChange = async (e) => {
        const val = e.target.value;
        setInputValue(val);
        
        if (val.trim().length > 2) {
            try {
                const res = await fetch(`/api/clinical/complaint-mapping?query=${encodeURIComponent(val)}`);
                const data = await res.json();
                if (data.success && data.data) {
                    const symps = data.data.map(d => d.canonical_complaint).slice(0, 4);
                    setSuggestions(symps);
                }
            } catch (err) {
                setSuggestions([]);
            }
        } else {
            setSuggestions([]);
        }
    };

    if (isPatientRoute) {
        return null;
    }

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-[4.25rem] lg:bottom-6 right-3 sm:right-6 z-[9999] bg-[#0067A1] hover:bg-[#004F7C] text-white w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-2xl transition-all hover:scale-105 flex items-center justify-center group border-2 sm:border-4 border-white ${
                    isOpen ? "hidden sm:flex" : "flex"
                }`}
                aria-label={isOpen ? "Close Assistant" : "Open Assistant"}
            >
                {isOpen ? (
                    <FaTimes className="w-4 h-4 sm:w-6 sm:h-6" />
                ) : (
                    <FaComments className="w-4 h-4 sm:w-6 sm:h-6 transform group-hover:-rotate-12 transition-transform" />
                )}
            </button>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 sm:inset-auto sm:bottom-24 sm:right-6 z-[99999] w-full sm:w-[400px] h-[100dvh] sm:h-[600px] sm:max-h-[calc(100dvh-120px)] bg-white rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border sm:border-gray-100 overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="bg-[#0067A1] px-4 py-3.5 sm:p-4 flex items-center justify-between shadow-sm shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/10 p-2 rounded-full backdrop-blur-sm">
                                    <FaComments className="text-white w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-sm sm:text-base tracking-wide">MediConnect Assistant</h3>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                        <span className="text-white/80 text-xs font-medium">Secure Support</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-white/80 hover:text-white p-2 rounded-md hover:bg-white/10 transition-colors"
                                aria-label="Close Assistant"
                            >
                                <FaTimes className="w-5 h-5" />
                            </button>
                        </div>

                        {!hasAgreed ? (
                            /* Disclaimer Screen */
                            <div className="flex-1 p-6 flex flex-col items-center justify-center bg-gray-50 text-center overflow-y-auto">
                                <div className="max-w-sm w-full flex flex-col items-center">
                                    <div className="bg-yellow-100 p-4 rounded-full mb-4">
                                        <FaUserMd className="w-8 h-8 text-yellow-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-800 mb-3">Important Notice</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed mb-6">
                                        This assistant provides general health information and <strong>does not provide medical diagnosis or treatment advice</strong>. For medical concerns, consult a licensed physician.
                                    </p>
                                    <button
                                        onClick={handleAgree}
                                        className="w-full bg-[#0067A1] text-white font-semibold py-3 px-6 rounded-md shadow-md hover:bg-[#004F7C] transition-colors"
                                    >
                                        I Understand & Continue
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Active Chat Area */
                            <>
                                <div className="flex-1 p-3 sm:p-4 overflow-y-auto bg-gray-50 space-y-4 min-h-0 scrollbar-thin scrollbar-thumb-gray-200 overscroll-contain">
                                    {messages.map((msg, i) => (
                                        <div
                                            key={msg.id || i}
                                            className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                                        >
                                            <div className={`flex flex-col max-w-[90%] sm:max-w-[85%] ${msg.type === "user" ? "items-end" : "items-start"}`}>
                                                <div
                                                    className={`p-3.5 rounded-2xl text-[14px] sm:text-[15px] leading-relaxed shadow-sm whitespace-pre-wrap break-words ${msg.type === "user"
                                                        ? "bg-[#0067A1] text-white rounded-tr-none"
                                                        : "bg-white border border-gray-100 text-gray-800 rounded-tl-none"
                                                        }`}
                                                >
                                                    {msg.text}
                                                </div>

                                                {/* Action Button if present */}
                                                {msg.action && (
                                                    <a
                                                        href={msg.action.url}
                                                        className="mt-2 text-sm bg-[#0067A1]/10 text-[#0067A1] px-4 py-2.5 rounded-md font-semibold hover:bg-[#0067A1] hover:text-white transition-colors flex items-center justify-center gap-2 border border-[#0067A1]/20 w-full shadow-xs text-center"
                                                    >
                                                        {msg.action.icon && <msg.action.icon className="w-4 h-4 shrink-0" />}
                                                        <span>{msg.action.label}</span>
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {isTyping && (
                                        <div className="flex justify-start">
                                            <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1.5 items-center">
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input Area */}
                                <div className="shrink-0 p-2.5 sm:p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white border-t border-gray-100 relative">
                                    {/* Auto Suggestions Popup */}
                                    {suggestions.length > 0 && (
                                        <div className="absolute bottom-full left-0 w-full p-2 z-50">
                                            <div className="bg-white rounded-md shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden max-h-48 overflow-y-auto">
                                                {suggestions.map((s, idx) => (
                                                    <button
                                                        type="button"
                                                        key={idx}
                                                        onClick={() => { setInputValue(s); setSuggestions([]); inputRef.current?.focus(); }}
                                                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-[#0067A1]/5 hover:text-[#0067A1] transition-colors border-b border-gray-50 last:border-0"
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <form
                                        onSubmit={(e) => { setSuggestions([]); handleSendMessage(e); }}
                                        className="flex items-center gap-2 bg-gray-50 border border-gray-200 focus-within:border-[#0067A1]/30 focus-within:ring-2 focus-within:ring-[#0067A1]/10 rounded-md px-3 sm:px-4 py-1.5 sm:py-2 transition-all shadow-xs"
                                    >
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={inputValue}
                                            onChange={handleInputChange}
                                            placeholder="Describe your symptoms safely..."
                                            className="bg-transparent flex-1 min-w-0 text-[15px] outline-none text-gray-800 placeholder-gray-400 py-1"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!inputValue.trim() || isTyping}
                                            aria-label="Send message"
                                            className="shrink-0 text-[#0067A1] hover:bg-[#0067A1] hover:text-white p-2 sm:p-2.5 rounded-md disabled:text-gray-300 disabled:hover:bg-transparent transition-all flex items-center justify-center"
                                        >
                                            <FaPaperPlane className="w-4 h-4 shrink-0" />
                                        </button>
                                    </form>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default SafeChatbot;
