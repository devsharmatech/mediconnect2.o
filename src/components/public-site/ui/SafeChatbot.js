"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { 
    FaComments, FaTimes, FaRobot, FaPaperPlane, FaUser, FaUserMd, 
    FaFlask, FaPills, FaFolder, FaHeartbeat, FaLungs, 
    FaPlus, FaHistory, FaTrashAlt, FaChevronLeft, FaClock 
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";

const ACTION_ICONS = {
    FaUserMd,
    FaFlask,
    FaPills,
    FaFolder,
    FaHeartbeat,
    FaLungs,
};

const resolveActionIcon = (iconOrName) => {
    if (!iconOrName) return FaUserMd;
    if (typeof iconOrName === "function") return iconOrName;
    return ACTION_ICONS[iconOrName] || FaUserMd;
};

const formatSessionTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (isToday) return `Today, ${timeStr}`;
    return `${date.toLocaleDateString([], { month: "short", day: "numeric" })}, ${timeStr}`;
};

const SPECIALTY_ROUTING = [
    {
        specialty: "Cardiology",
        filterValue: "Cardiology",
        buttonLabel: "Consult Cardiologist",
        title: "Cardiologist",
        regex: /(cardiolog(ist|y)?|heart( doctor)?|cardiac|chest pain|chest tightness|chest discomfort|angina|palpitation|high bp|hypertension|blood pressure|दिल का दौरा|दिल में दर्द|छाती में दर्द|सीने में दर्द|dil ka daura|dil me dard|chhati me dard|sine me dard)/i,
    },
    {
        specialty: "Pulmonology",
        filterValue: "Pulmonology",
        buttonLabel: "Consult Pulmonologist",
        title: "Pulmonologist",
        regex: /(pulmonolog(ist|y)?|lung(s)?( doctor)?|chest specialist|breathless(ness)?|shortness of breath|asthma|bronchitis|wheezing|respiratory|फेफड़े|सांस फूलना|सांस लेने में दिक्कत|दमा|phepde|saans( lene me dikkat)?|dama)/i,
    },
    {
        specialty: "Endocrinology",
        filterValue: "Endocrinology",
        buttonLabel: "Consult Endocrinologist",
        title: "Endocrinologist",
        regex: /(endocrinolog(ist|y)?|thyroid|थायरॉइड|थायराइड|hormon(e|al)|हार्मोन|diabetes|मधुमेह|sugar|शुगर|insulin|metabolism|weight gain|वजन बढ़|vajan badh|weight loss|वजन घट|vajan ghat|fatigue|cold intolerance|ठंड ज्यादा लगना|चेहरे पर सूजन|neend jyada|ज्यादा नींद|वजन घटाने|सूजन)/i,
    },
    {
        specialty: "General Physician",
        filterValue: "General Physician",
        buttonLabel: "Consult General Physician",
        title: "General Physician",
        regex: /(general physician|physician|general doctor|family doctor|fever|fevr|fev|febrile|temp|temperature|high temp|bukhar|bukhaar|cold|sardi|zukham|jukham|cough|khasi|khansi|flu|viral|infection|headache|sir dard|sar dard|body pain|badan dard|weakness|kamzori|fatigue|shivering|chills|unwell|sick|bimar|bimaar|ill|illness|chikitsak|dikhana|बुखार|सर्दी|जुकाम|खांसी|सिर दर्द|बदन दर्द|कमजोरी|कमज़ोरी|थकान|सुस्ती|अस्वस्थ|बीमार|ठंड लगना)/i,
    },
    {
        specialty: "Dentistry",
        filterValue: "Dentistry",
        buttonLabel: "Consult Dentist",
        title: "Dentist",
        regex: /(dentist(s)?|dentistry|dental|teeth|tooth|toothache|cavity|cavities|gums?|root canal|braces|scaling|dant|daant|danto me dard|दांत|दांत दर्द|मसूड़े)/i,
    },
    {
        specialty: "Gastroenterology",
        filterValue: "Gastroenterology",
        buttonLabel: "Consult Gastroenterologist",
        title: "Gastroenterologist",
        regex: /(gastroenterolog(ist|y)?|stomach doctor|stomach pain|pet dard|pet me dard|acidity|gerd|acid reflux|liver|digest(ion|ive)|kabz|constipation|loose motion|vomit|gas|dast|bloating|कब्ज|पेट फूलना|पेट दर्द|बदहजमी|गैस|उल्टी|दस्त|लीवर)/i,
    },
    {
        specialty: "Dermatology",
        filterValue: "Dermatology",
        buttonLabel: "Consult Dermatologist",
        title: "Dermatologist",
        regex: /(dermatolog(ist|y)?|skin|acne|pimple(s)?|rash(es)?|eczema|psoriasis|hair fall|hair loss|khujli|chamdi|tvacha|dry skin|त्वचा|बाल झड़ना|ड्राई स्किन|खुजली|मुंहासे|दाद|खाज)/i,
    },
    {
        specialty: "Orthopedics",
        filterValue: "Orthopedics",
        buttonLabel: "Consult Orthopedic Specialist",
        title: "Orthopedic Specialist",
        regex: /(orthopedic(s)?|orthopaedic(s)?|bone|joint(s)?|fracture|knee pain|back pain|kamar dard|spine|arthritis|haddi|jod(o)?|ghutn(e)?|हड्डी|जोड़|घुटने का दर्द|कमर दर्द|muscle pain|मांसपेशियों में दर्द|जोड़ों में दर्द)/i,
    },
    {
        specialty: "Gynecology",
        filterValue: "Gynecology",
        buttonLabel: "Consult Gynecologist",
        title: "Gynecologist",
        regex: /(gynecolog(ist|y)?|gynaecolog(ist|y)?|obgyn|pregnancy|period(s)?|menstrual|pcos|pcod|mahila|ladies|महिला रोग|माहवारी|पीरियड|गर्भावस्था)/i,
    },
    {
        specialty: "Pediatrics",
        filterValue: "Pediatrics",
        buttonLabel: "Consult Pediatrician",
        title: "Pediatrician",
        regex: /(pediatric(ian|s)?|paediatric(ian|s)?|child doctor|baby doctor|infant|bacha|bacche|bachon|बाल रोग|बच्चा|बच्चे)/i,
    },
    {
        specialty: "ENT",
        filterValue: "ENT",
        buttonLabel: "Consult ENT Specialist",
        title: "ENT Specialist",
        regex: /(ent doctor|ent specialist|ear nose throat|ear pain|throat infection|throat pain|gala dard|gale me dard|sinus(itis)?|tonsil|kaan|naak|gala|कान|नाक|गला|गले में दर्द|कान में दर्द)/i,
    },
    {
        specialty: "Neurology",
        filterValue: "Neurology",
        buttonLabel: "Consult Neurologist",
        title: "Neurologist",
        regex: /(neurolog(ist|y)?|brain doctor|migraine|nerve pain|seizure|tremor|dimag|sar|naso|न्यूरोलॉजिस्ट|माइग्रेन|नस|नसों में दर्द|चक्कर|मिर्गी)/i,
    },
    {
        specialty: "Psychiatry",
        filterValue: "Psychiatry",
        buttonLabel: "Consult Psychiatrist",
        title: "Psychiatrist",
        regex: /(psychiatr(ist|y)?|mental health|depression|anxiety|stress|counseling|tanav|ghabrahat|डिप्रेशन|तनाव|घबराहट|उदासी|udasi|dhyan lagane me pareshani|ध्यान लगाने में परेशानी|मानसिक स्वास्थ्य)/i,
    },
    {
        specialty: "Urology",
        filterValue: "Urology",
        buttonLabel: "Consult Urologist",
        title: "Urologist",
        regex: /(urolog(ist|y)?|kidney stone|urinary|prostate|pathri|peshab|पथरी|पेशाब में जलन|किडनी)/i,
    },
    {
        specialty: "Ophthalmology",
        filterValue: "Ophthalmology",
        buttonLabel: "Consult Eye Specialist",
        title: "Eye Specialist",
        regex: /(op?thalmolog(ist|y)?|eye doctor|eyesight|cataract|vision|aankh|motiyabind|आंख|आंखों में जलन|मोतियाबिंद|दृष्टि)/i,
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
    "endocrinology": "Endocrinology",
    "endocrinologist": "Endocrinology",
    "diabetology": "Endocrinology",
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
    const [historySessions, setHistorySessions] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Initialize session, restore persisted chat, and user on mount
    useEffect(() => {
        const storedAgreement = localStorage.getItem("ai_disclaimer_agreed");
        if (storedAgreement) {
            setHasAgreed(true);
            const savedSessionId = localStorage.getItem("ai_chat_current_session_id");
            const savedMessages = localStorage.getItem("ai_chat_current_messages");
            if (savedSessionId && savedMessages) {
                try {
                    const parsed = JSON.parse(savedMessages);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setSessionId(savedSessionId);
                        setMessages(parsed);
                    } else {
                        initChat();
                    }
                } catch (e) {
                    initChat();
                }
            } else {
                initChat();
            }
        }

        try {
            const storedHistory = localStorage.getItem("ai_chat_history_sessions");
            if (storedHistory) {
                const parsedHistory = JSON.parse(storedHistory);
                if (Array.isArray(parsedHistory)) {
                    setHistorySessions(parsedHistory);
                }
            }
        } catch (e) {}

        let uId = localStorage.getItem("anon_user_id");
        if (!uId) {
            uId = uuidv4();
            localStorage.setItem("anon_user_id", uId);
        }
        setUserId(uId);

        const handleOpenChat = (event) => {
            setIsOpen(true);
            setShowHistory(false);
            if (event?.detail?.message) {
                setInputValue(event.detail.message);
            }
            setTimeout(() => {
                inputRef.current?.focus();
            }, 200);
        };

        window.addEventListener("open-ai-chat", handleOpenChat);
        window.addEventListener("open-chatbot", handleOpenChat);
        window.addEventListener("open-dr-mediconnect-chat", handleOpenChat);

        if (typeof window !== "undefined" && window.location.hash === "#ai-chat") {
            setIsOpen(true);
        }

        const handleHashChange = () => {
            if (window.location.hash === "#ai-chat") {
                setIsOpen(true);
            }
        };
        window.addEventListener("hashchange", handleHashChange);

        return () => {
            window.removeEventListener("open-ai-chat", handleOpenChat);
            window.removeEventListener("open-chatbot", handleOpenChat);
            window.removeEventListener("open-dr-mediconnect-chat", handleOpenChat);
            window.removeEventListener("hashchange", handleHashChange);
        };
    }, []);

    // Auto-save active chat messages and update session history in localStorage
    useEffect(() => {
        if (!sessionId || !messages || messages.length === 0) return;
        try {
            localStorage.setItem("ai_chat_current_session_id", sessionId);
            localStorage.setItem("ai_chat_current_messages", JSON.stringify(messages));

            // Only add to previous history if user sent at least one message
            const firstUserMsg = messages.find((m) => m.type === "user");
            if (firstUserMsg) {
                const storedHistory = localStorage.getItem("ai_chat_history_sessions");
                let list = storedHistory ? JSON.parse(storedHistory) : [];
                const rawText = firstUserMsg.text.trim();
                const title = rawText.length > 36 ? rawText.slice(0, 36) + "..." : rawText;

                const sessionItem = {
                    id: sessionId,
                    title: title || "Consultation",
                    updatedAt: Date.now(),
                    messages: messages,
                };

                const existingIdx = list.findIndex((s) => s.id === sessionId);
                if (existingIdx >= 0) {
                    list[existingIdx] = sessionItem;
                } else {
                    list.unshift(sessionItem);
                }

                list = list.slice(0, 25);
                localStorage.setItem("ai_chat_history_sessions", JSON.stringify(list));
                setHistorySessions(list);
            }
        } catch (e) {
            console.error("Session sync error:", e);
        }
    }, [messages, sessionId]);

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
        const newId = uuidv4();
        const initialGreeting = [
            {
                id: Date.now(),
                type: "bot",
                text: "👋 Hello! Welcome to Support. How can I help you today? Please note I am here to provide general health information and cannot diagnose conditions.",
            },
        ];
        setSessionId(newId);
        setMessages(initialGreeting);
        try {
            localStorage.setItem("ai_chat_current_session_id", newId);
            localStorage.setItem("ai_chat_current_messages", JSON.stringify(initialGreeting));
        } catch (e) {}
    }

    const startNewChat = () => {
        initChat();
        setShowHistory(false);
        setTimeout(() => {
            inputRef.current?.focus();
        }, 150);
    };

    const loadSession = (session) => {
        if (!session) return;
        setSessionId(session.id);
        setMessages(session.messages || []);
        setShowHistory(false);
        try {
            localStorage.setItem("ai_chat_current_session_id", session.id);
            localStorage.setItem("ai_chat_current_messages", JSON.stringify(session.messages || []));
        } catch (e) {}
    };

    const deleteSession = (e, targetId) => {
        e.stopPropagation();
        const updated = historySessions.filter((s) => s.id !== targetId);
        setHistorySessions(updated);
        try {
            localStorage.setItem("ai_chat_history_sessions", JSON.stringify(updated));
            if (sessionId === targetId) {
                initChat();
            }
        } catch (err) {}
    };

    const clearAllHistory = () => {
        if (typeof window !== "undefined" && window.confirm("Are you sure you want to clear all chat history?")) {
            setHistorySessions([]);
            try {
                localStorage.removeItem("ai_chat_history_sessions");
                initChat();
            } catch (e) {}
        }
    };

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
            let actions = [];
            const lowerText = text.toLowerCase().trim();

            // 1. VETERINARY / ANIMAL / PET GUARD: MediConnect is strictly for human healthcare
            const ANIMAL_PET_REGEX = /(dog|dogs|puppy|puppies|cat|cats|kitten|kittens|pet|pets|animal|animals|kutta|kuta|kutti|kutte|billi|billian|jaanwar|janwar|pashu|pashuon|gay|gaay|bhains|bakri|bakra|veterinary|veterinarian|vet doctor|vet clinic|doggy|कुत्ता|कुत्ते|बिल्ली|जानवर|पशु|गाय|भैंस|बकरी|वेटरनरी)/i;
            if (ANIMAL_PET_REGEX.test(lowerText) || data.is_animal_query || data.route_id === "OUT_OF_SCOPE_ANIMAL") {
                const animalNotice = "MediConnect केवल मानव स्वास्थ्य (Human Healthcare) सेवाओं और डॉक्टरों के परामर्श के लिए है। हम पशुओं (Animals / Pets) का इलाज या परामर्श प्रदान नहीं करते हैं। कृपया अपने पेट या जानवर के स्वास्थ्य के लिए किसी योग्य पशु चिकित्सक (Veterinary Doctor / Vet Clinic) से संपर्क करें।";
                const botMsg = { id: Date.now(), type: "bot", text: animalNotice, actions: [], action: null };
                setMessages((prev) => [...prev, botMsg]);
                return;
            }

            // 2. UNWANTED / OFF-TOPIC / NON-HEALTH GUARD
            const OFF_TOPIC_REGEX = /\b(python|javascript|coding|code|programmer|programming|html|css|java|c\+\+|crypto|bitcoin|ethereum|stock market|share market|nifty|sensex|movie|cinema|actor|actress|song|sing|dance|cricket match|ipl|football score|weather today|mausam kaisa|recipe|cook|baking|cake recipe|politics|narendra modi|election|joke|chutkula|shayari|math|calculate|equation)\b/i;
            if (OFF_TOPIC_REGEX.test(lowerText)) {
                const offTopicNotice = "MediConnect एक समर्पित हेल्थकेयर प्लेटफॉर्म है, जो केवल मानव स्वास्थ्य, डॉक्टर परामर्श और चिकित्सा सेवाओं के लिए है। मैं गैर-चिकित्सीय (non-medical) विषयों में सहायता नहीं कर सकता। यदि आपको स्वास्थ्य संबंधी कोई समस्या या प्रश्न है, तो कृपया बताएं।";
                const botMsg = { id: Date.now(), type: "bot", text: offTopicNotice, actions: [], action: null };
                setMessages((prev) => [...prev, botMsg]);
                return;
            }

            // 3. PURE GREETING GUARD: Don't show doctor consultation buttons on just "hi" / "hello"
            const GREETING_REGEX = /^(hi|hello|hey|heyy|namaste|namaskar|good morning|good afternoon|good evening|kaise ho|kese ho|how are you|kya haal hai|hlo|hii|hiii)\b/i;
            const isPureGreeting = GREETING_REGEX.test(lowerText) && lowerText.split(/\s+/).length <= 4;
            if (isPureGreeting) {
                const greetingText = "नमस्ते! मैं MediConnect का AI स्वास्थ्य सहायक हूँ। आज मैं आपके स्वास्थ्य से संबंधित किस प्रकार सहायता कर सकता हूँ? कृपया अपने लक्षण या समस्या बताएं।";
                const botMsg = { id: Date.now(), type: "bot", text: botText || greetingText, actions: [], action: null };
                setMessages((prev) => [...prev, botMsg]);
                return;
            }

            // Clean up any residual "Doctor & Dentist" string from AI output so it never confuses users
            let cleanBot = String(botText || "")
                .replace(/Doctor\s*&\s*Dentist\s*Consultations/gi, "Doctor Consultations")
                .replace(/doctor and dentist consultations/gi, "doctor consultations")
                .replace(/Doctor\s*&\s*Dentist/gi, "Doctor");
            botText = cleanBot;

            // Strict dental keyword check: ONLY consider dental if the USER'S input explicitly mentions teeth/mouth/dental
            const userHasDentalWords = /(dentist(s)?|dentistry|dental|teeth|tooth|toothache|cavity|cavities|gums?|root canal|braces|scaling|dant|daant|danto me dard|दांत|दांत दर्द|मसूड़े|mouth pain|oral)/i.test(lowerText);

            // 1. Detect ALL matching specialties from user inquiry
            let matchedSpecialties = SPECIALTY_ROUTING.filter((s) => {
                if (s.specialty === "Dentistry" && !userHasDentalWords) return false;
                return s.regex.test(lowerText);
            });

            // 2. Also check if the bot specifically recommended/named any specialty in its response text
            for (const spec of SPECIALTY_ROUTING) {
                if (spec.specialty === "Dentistry" && !userHasDentalWords) {
                    continue;
                }
                const specNameRegex = new RegExp(`\\b(${spec.specialty}|${spec.title})\\b`, "i");
                if (specNameRegex.test(cleanBot) && !matchedSpecialties.some((s) => s.specialty === spec.specialty)) {
                    matchedSpecialties.push(spec);
                }
            }

            // 3. Strict dental guard: Never route to Dentistry unless user asked about teeth/mouth
            if (!userHasDentalWords) {
                matchedSpecialties = matchedSpecialties.filter((s) => s.specialty !== "Dentistry");
            }

            // 4. General Fever / Infection / Weakness Guard: Ensure General Physician is included if general symptoms mentioned
            const hasGeneralSymptom = /(fever|fevr|fev|febrile|temp|temperature|high temp|bukhar|bukhaar|cold|sardi|zukham|jukham|cough|khasi|khansi|flu|viral|infection|headache|sir dard|sar dard|body pain|badan dard|weakness|kamzori|fatigue|unwell|sick|bimar|bimaar|ill|illness|बुखार|सर्दी|जुकाम|खांसी|सिर दर्द|बदन दर्द|कमजोरी|कमज़ोरी|थकान|सुस्ती|अस्वस्थ|बीमार)/i.test(lowerText) ||
                                      /(fever|cold|cough|headache|infection|flu|viral)/i.test(cleanBot);
            if (hasGeneralSymptom && !matchedSpecialties.some((s) => s.specialty === "General Physician")) {
                const gp = SPECIALTY_ROUTING.find((s) => s.specialty === "General Physician");
                if (gp) matchedSpecialties.push(gp);
            }

            const isPatientLoggedIn = typeof window !== "undefined" && Boolean(localStorage.getItem("patientUser"));

            // Check if user is asking for specific platform services first
            if (
                data.route_id === "LAB" ||
                data.cta_id === "CTA_LAB" ||
                /\b(lab|blood test|diagnostic test|sample collection|pathology|jaanch|जांच|ब्लड टेस्ट)\b/i.test(lowerText)
            ) {
                actions = [{ label: "Book Lab Tests", url: "/patient/lab-booking", icon: FaFlask, iconName: "FaFlask" }];
            } else if (
                data.route_id === "MEDICINE" ||
                data.cta_id === "CTA_MEDICINE" ||
                (/\b(pharmacy|order medicine|दवा ऑर्डर)\b/i.test(lowerText) && !/\b(which medicine|suggest|dawa batao|medicine for)\b/i.test(lowerText))
            ) {
                if (isPatientLoggedIn) {
                    actions = [{ label: "Order Prescribed Medicines", url: "/patient/medicine-order", icon: FaPills, iconName: "FaPills" }];
                } else {
                    botText += "\n\nMediConnect पर दवाइयाँ ऑर्डर करने के लिए डॉक्टर का मान्य पर्चा (Prescription) होना आवश्यक है। बिना डॉक्टर की सलाह के दवाइयाँ न लें।";
                    actions = [{ label: "Consult Doctor", url: "/website/doctors", icon: FaUserMd, iconName: "FaUserMd" }];
                }
            } else if (
                data.route_id === "DIGILOCKER" ||
                data.cta_id === "CTA_DIGILOCKER" ||
                /\b(digilocker|records|health records|documents|दस्तावेज)\b/i.test(lowerText)
            ) {
                actions = [{ label: "Access DigiLocker", url: "/patient/digital-locker", icon: FaFolder, iconName: "FaFolder" }];
            } else if (data.route_id === "CARDIO" || data.cta_id === "CTA_CARDIO") {
                actions = [{ label: "CardioConnect", url: "/patient/heart-health", icon: FaHeartbeat, iconName: "FaHeartbeat" }];
            } else if (data.route_id === "LUNG" || data.cta_id === "CTA_LUNG") {
                actions = [{ label: "LungConnect", url: "/patient/lung-assessment", icon: FaLungs, iconName: "FaLungs" }];
            } else {
                // Medical / Doctor / Symptom / Health Consultation
                const hasSymptoms = /(bukhar|fever|pain|dard|cough|khasi|khansi|cold|sardi|zukham|jukham|headache|sir dard|sar dard|vomit|rash|sick|bimar|ill|swelling|throat|pet dard|infection|allergy|वजन|सूजन|थकान|कमजोरी)/i.test(lowerText);
                const isAskingMedication = /(which medicine|what medicine|suggest (a )?medicine|prescribe|kya.*(medicine|dawa|dawai)|(medicine|dawa|dawai).*(bata|bta|suggest|le sakte|lu|du|lenge|milegi))/i.test(lowerText) ||
                    (hasSymptoms && /(medicine|medicines|dawa|dawai|tablet|pill|syrup|दवा)/i.test(lowerText));

                if (isAskingMedication) {
                    botText = "बिना डॉक्टर के परामर्श के कोई भी दवा नहीं लेनी चाहिए। किसी भी बीमारी या लक्षण होने पर पहले योग्य डॉक्टर से सलाह व जांच लें। डॉक्टर द्वारा पर्ची (Prescription) लिखे जाने के बाद ही सही दवा का सेवन करें।\n\nकृपया परामर्श के लिए डॉक्टर चुनें:";
                }

                // If no specialties matched so far, try clinical diagnosis mapping
                if (matchedSpecialties.length === 0 && !data.isEmergency) {
                    const multiWordSymptoms = [
                        "chest pain", "back pain", "knee pain", "joint pain", "stomach pain",
                        "headache", "toothache", "ear pain", "throat pain", "eye pain"
                    ];
                    let mappingKeyword = multiWordSymptoms.find((s) => lowerText.includes(s));

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
                                        const platformSpecialty = CLINICAL_TO_PLATFORM_SPECIALTY[rawSpec] || "General Physician";
                                        const foundSpec = SPECIALTY_ROUTING.find((s) => s.specialty.toLowerCase() === platformSpecialty.toLowerCase());
                                        if (foundSpec) {
                                            matchedSpecialties.push(foundSpec);
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            // ignore mapping error
                        }
                    }
                }

                // Health Concern Check: Did user ask a health/symptom/doctor related query?
                const hasHealthOrDoctorIntent = /(pain|dard|fever|bukhar|cough|khasi|khansi|cold|sardi|zukham|jukham|headache|sir dard|sar dard|vomit|rash|sick|bimar|ill|swelling|throat|pet dard|infection|allergy|वजन|सूजन|थकान|कमजोरी|कमज़ोरी|सुस्ती|बीमार|दवा|doctor|chikitsak|tabiyat|tabiyat kharab|dikhana|treatment|ilaj|consult|consultation|appointment|specialist|hospital|clinic|problem|health|medical|illness|disease|bimaari|bimari|swasthya|जांच|prescription|परामर्श)/i.test(lowerText) || hasGeneralSymptom || data.route_id === "CONSULT" || data.cta_id === "CTA_CONSULT";

                // Button Generation Rules:
                // 1) Multiple specialties detected -> Show up to 3 buttons
                // 2) Single specialty detected -> Show 1 button
                // 3) Requirement unclear health inquiry -> Show 2 buttons: "Consult General Physician" and "All Doctors"
                // 4) Not a health concern / off-topic -> Show NO buttons
                if (matchedSpecialties.length >= 2) {
                    const topSpecs = matchedSpecialties.slice(0, 3);
                    actions = topSpecs.map((s) => ({
                        label: s.buttonLabel,
                        url: `/website/doctors?specialty=${encodeURIComponent(s.filterValue)}`,
                        icon: FaUserMd,
                        iconName: "FaUserMd",
                    }));
                } else if (matchedSpecialties.length === 1) {
                    const singleSpec = matchedSpecialties[0];
                    actions = [{
                        label: singleSpec.buttonLabel,
                        url: `/website/doctors?specialty=${encodeURIComponent(singleSpec.filterValue)}`,
                        icon: FaUserMd,
                        iconName: "FaUserMd",
                    }];
                } else if (hasHealthOrDoctorIntent) {
                    // Patient health requirement unclear / general fallback:
                    // 2 buttons: Consult General Physician + All Doctors
                    actions = [
                        {
                            label: "Consult General Physician",
                            url: "/website/doctors?specialty=General%20Physician",
                            icon: FaUserMd,
                            iconName: "FaUserMd",
                        },
                        {
                            label: "All Doctors",
                            url: "/website/doctors",
                            icon: FaUserMd,
                            iconName: "FaUserMd",
                        },
                    ];
                } else {
                    // Completely unrelated / no health intent -> NO BUTTONS
                    actions = [];
                }
            }

            const botMsg = { id: Date.now(), type: "bot", text: botText, actions, action: actions[0] || null };
            setMessages((prev) => [...prev, botMsg]);

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
                        <div className="bg-[#0067A1] px-3.5 py-3 sm:px-4 sm:py-3.5 flex items-center justify-between shadow-sm shrink-0">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="bg-white/10 p-2 rounded-full backdrop-blur-sm shrink-0">
                                    <FaComments className="text-white w-4 h-4 sm:w-5 sm:h-5" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-white font-bold text-sm sm:text-base tracking-wide leading-tight truncate">Support</h3>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shrink-0"></span>
                                        <span className="text-white/80 text-[11px] sm:text-xs font-medium truncate">Online Support</span>
                                    </div>
                                </div>
                            </div>

                            {/* Header Actions */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                {hasAgreed && (
                                    <>
                                        <button
                                            onClick={startNewChat}
                                            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all border border-white/20 active:scale-95 cursor-pointer shadow-xs"
                                            title="New Chat"
                                            aria-label="New Chat"
                                        >
                                            <FaPlus className="w-3 h-3" />
                                        </button>

                                        <button
                                            onClick={() => setShowHistory(!showHistory)}
                                            className={`w-8 h-8 rounded-full transition-all border active:scale-95 cursor-pointer flex items-center justify-center shadow-xs ${
                                                showHistory
                                                    ? "bg-white text-[#0067A1] border-white font-bold"
                                                    : "bg-white/15 text-white hover:bg-white/25 border-white/20"
                                            }`}
                                            title={showHistory ? "Back to Chat" : "Previous Chats"}
                                            aria-label="Chat History"
                                        >
                                            <FaHistory className="w-3.5 h-3.5" />
                                        </button>
                                    </>
                                )}

                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all border border-white/20 active:scale-95 cursor-pointer shadow-xs"
                                    aria-label="Close Support"
                                    title="Close Support"
                                >
                                    <FaTimes className="w-3.5 h-3.5" />
                                </button>
                            </div>
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
                                        className="w-full bg-[#0067A1] text-white font-semibold py-3 px-6 rounded-md shadow-md hover:bg-[#004F7C] transition-colors cursor-pointer"
                                    >
                                        I Understand & Continue
                                    </button>
                                </div>
                            </div>
                        ) : showHistory ? (
                            /* Previous Chats Screen */
                            <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
                                {/* History Top Bar */}
                                <div className="px-3.5 py-2.5 bg-white border-b border-gray-100 flex items-center justify-between shrink-0 shadow-2xs">
                                    <button
                                        onClick={() => setShowHistory(false)}
                                        className="text-xs font-semibold text-[#0067A1] hover:text-[#004F7C] flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-[#0067A1]/5 transition-colors cursor-pointer"
                                    >
                                        <FaChevronLeft className="w-3 h-3" />
                                        <span>Back to Chat</span>
                                    </button>
                                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                        {historySessions.length} {historySessions.length === 1 ? "Session" : "Sessions"}
                                    </span>
                                    <button
                                        onClick={startNewChat}
                                        className="text-xs font-semibold bg-[#0067A1] text-white px-2.5 py-1 rounded-md hover:bg-[#004F7C] transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                                    >
                                        <FaPlus className="w-2.5 h-2.5" />
                                        <span>New</span>
                                    </button>
                                </div>

                                {/* Sessions List */}
                                <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-2.5">
                                    {historySessions.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3 text-gray-400">
                                                <FaClock className="w-6 h-6" />
                                            </div>
                                            <p className="font-semibold text-gray-700 text-sm mb-1">No past chats yet</p>
                                            <p className="text-xs text-gray-500 max-w-xs mb-4">
                                                Your consultations are automatically saved here so you can revisit them anytime.
                                            </p>
                                            <button
                                                onClick={() => { setShowHistory(false); inputRef.current?.focus(); }}
                                                className="text-xs bg-[#0067A1] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#004F7C] transition-colors shadow-xs cursor-pointer"
                                            >
                                                Start Consulting
                                            </button>
                                        </div>
                                    ) : (
                                        historySessions.map((sess) => {
                                            const isActive = sess.id === sessionId;
                                            return (
                                                <div
                                                    key={sess.id}
                                                    onClick={() => loadSession(sess)}
                                                    className={`p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 group text-left ${
                                                        isActive
                                                            ? "bg-blue-50/80 border-[#0067A1]/40 ring-1 ring-[#0067A1]/30 shadow-xs"
                                                            : "bg-white border-gray-200/70 hover:border-[#0067A1]/30 hover:shadow-sm"
                                                    }`}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="font-bold text-xs sm:text-sm text-gray-900 truncate">
                                                                {sess.title || "Health Consultation"}
                                                            </h4>
                                                            {isActive && (
                                                                <span className="shrink-0 bg-[#0067A1] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                                                    Current
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                                            <span className="flex items-center gap-1">
                                                                <FaClock className="w-2.5 h-2.5 text-gray-400" />
                                                                {formatSessionTime(sess.updatedAt)}
                                                            </span>
                                                            <span>•</span>
                                                            <span>{sess.messages?.length || 0} msgs</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={(e) => deleteSession(e, sess.id)}
                                                        className="text-gray-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors shrink-0 opacity-70 group-hover:opacity-100 cursor-pointer"
                                                        title="Delete chat"
                                                        aria-label="Delete chat"
                                                    >
                                                        <FaTrashAlt className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* History Footer Actions */}
                                {historySessions.length > 0 && (
                                    <div className="p-2.5 bg-white border-t border-gray-100 shrink-0 flex justify-center">
                                        <button
                                            onClick={clearAllHistory}
                                            className="text-xs text-red-600 hover:text-red-700 font-semibold transition-colors flex items-center gap-1.5 py-1 px-3 rounded-md hover:bg-red-50 cursor-pointer"
                                        >
                                            <FaTrashAlt className="w-3 h-3" />
                                            <span>Clear All History</span>
                                        </button>
                                    </div>
                                )}
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

                                                {/* Action Buttons if present */}
                                                {(() => {
                                                    const actionList = msg.actions && msg.actions.length > 0
                                                        ? msg.actions
                                                        : msg.action
                                                            ? [msg.action]
                                                            : [];
                                                    if (actionList.length === 0) return null;
                                                    return (
                                                        <div className="mt-2.5 flex flex-col gap-2 w-full">
                                                            {actionList.map((act, actIdx) => {
                                                                const IconComp = resolveActionIcon(act.iconName || act.icon);
                                                                return (
                                                                    <a
                                                                        key={actIdx}
                                                                        href={act.url}
                                                                        className="text-xs sm:text-sm bg-gradient-to-r from-[#0067A1] to-[#007cc2] hover:from-[#005585] hover:to-[#0067A1] text-white px-4 py-2.5 rounded-xl font-semibold shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 w-full text-center cursor-pointer active:scale-[0.99]"
                                                                    >
                                                                        <IconComp className="w-3.5 h-3.5 shrink-0 text-white/95" />
                                                                        <span className="tracking-wide">{act.label}</span>
                                                                    </a>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                })()}
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
