"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { FaComments, FaTimes, FaRobot, FaPaperPlane, FaUser, FaUserMd } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";

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

    // ── Check if patient route ─────────────────
    const patientRoutes = ["/dashboard", "/doctor", "/lab-reports", "/appointments",
        "/medicine-order", "/digital-locker", "/nursing-care", "/heart-health", "/lung-assessment",
        "/lung-health", "/profile", "/settings", "/lab-booking", "/find-doctors"];
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

            // Business Rule: End symptom conversations with doctor option
            const symptomKeywords = ["pain", "hurt", "fever", "cough", "sick", "doctor", "symptom", "feeling", "blood"];
            const matchedKeyword = symptomKeywords.find(kw => text.toLowerCase().includes(kw) || botText.toLowerCase().includes(kw));

            if (matchedKeyword && !data.isEmergency) {
                try {
                    // Smart Specialty Routing using Clinical API
                    const mappingRes = await fetch(`/api/clinical/complaint-mapping?query=${encodeURIComponent(matchedKeyword)}`);
                    const mappingData = await mappingRes.json();
                    
                    if (mappingData.success && mappingData.data && mappingData.data.length > 0) {
                        const topComplaint = mappingData.data[0];
                        const topDiagnosis = topComplaint.diagnoses.sort((a, b) => a.priority_rank - b.priority_rank)[0];
                        
                        if (topDiagnosis) {
                            const detailsRes = await fetch(`/api/clinical/diagnosis-details?diagnosis_id=${topDiagnosis.diagnosis_id}`);
                            const detailsData = await detailsRes.json();
                            
                            if (detailsData.success && detailsData.data && detailsData.data.routing) {
                                const specialty = detailsData.data.routing.primary_specialty;
                                botText += `\n\nBased on your symptoms, we strongly recommend consulting a **${specialty}**. Would you like to consult one now?`;
                                action = { label: `Book ${specialty}`, url: `/website/doctors?specialty=${encodeURIComponent(specialty)}`, icon: FaUserMd };
                            } else {
                                botText += "\n\nWould you like to consult a doctor now?";
                                action = { label: "Book Appointment", url: "/website/doctors", icon: FaUserMd };
                            }
                        } else {
                            botText += "\n\nWould you like to consult a doctor now?";
                            action = { label: "Book Appointment", url: "/website/doctors", icon: FaUserMd };
                        }
                    } else {
                        botText += "\n\nWould you like to consult a doctor now?";
                        action = { label: "Book Appointment", url: "/website/doctors", icon: FaUserMd };
                    }
                } catch (e) {
                    botText += "\n\nWould you like to consult a doctor now?";
                    action = { label: "Book Appointment", url: "/website/doctors", icon: FaUserMd };
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
                className="fixed bottom-6 right-6 z-[9999] bg-[#0067A1] hover:bg-[#004F7C] text-white p-4 rounded-full shadow-2xl transition-all hover:scale-105 flex items-center justify-center group border-4 border-white"
            >
                {isOpen ? (
                    <FaTimes className="w-6 h-6" />
                ) : (
                    <FaComments className="w-6 h-6 transform group-hover:-rotate-12 transition-transform" />
                )}
            </button>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95, transformOrigin: "bottom right" }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        style={{ maxHeight: "calc(100dvh - 120px)" }}
                        className="fixed bottom-24 right-4 sm:right-6 z-[9999] w-[calc(100vw-2rem)] sm:w-[400px] h-[600px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-[#0067A1] to-[#004F7C] p-4 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/10 p-2 rounded-full backdrop-blur-sm">
                                    <FaComments className="text-white w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-sm tracking-wide">MediConnect Assistant</h3>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                        <span className="text-white/80 text-xs font-medium">Secure Support</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white p-1">
                                <FaTimes className="w-5 h-5" />
                            </button>
                        </div>

                        {!hasAgreed ? (
                            /* Disclaimer Screen */
                            <div className="flex-1 p-6 flex flex-col items-center justify-center bg-gray-50 text-center">
                                <div className="bg-yellow-100 p-4 rounded-full mb-4">
                                    <FaUserMd className="w-8 h-8 text-yellow-600" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 mb-3">Important Notice</h3>
                                <p className="text-sm text-gray-600 leading-relaxed mb-6">
                                    This assistant provides general health information and <strong>does not provide medical diagnosis or treatment advice</strong>. For medical concerns, consult a licensed physician.
                                </p>
                                <button
                                    onClick={handleAgree}
                                    className="w-full bg-[#0067A1] text-white font-semibold py-3 rounded-xl shadow-md hover:bg-[#004F7C] transition-colors"
                                >
                                    I Understand & Continue
                                </button>
                            </div>
                        ) : (
                            /* Active Chat Area */
                            <>
                                <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-4 min-h-0 scrollbar-thin scrollbar-thumb-gray-200">
                                    {messages.map((msg, i) => (
                                        <div
                                            key={msg.id || i}
                                            className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                                        >
                                            <div className={`flex flex-col max-w-[88%] ${msg.type === "user" ? "items-end" : "items-start"}`}>
                                                <div
                                                    className={`p-3.5 rounded-2xl text-[15px] leading-relaxed shadow-sm whitespace-pre-wrap ${msg.type === "user"
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
                                                        className="mt-2 text-sm bg-[#0067A1]/10 text-[#0067A1] px-4 py-2.5 rounded-xl font-semibold hover:bg-[#0067A1] hover:text-white transition-colors flex items-center justify-center gap-2 border border-[#0067A1]/20 w-full shadow-sm"
                                                    >
                                                        {msg.action.icon && <msg.action.icon className="w-4 h-4" />}
                                                        {msg.action.label}
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
                                <div className="p-3 bg-white border-t border-gray-100 relative">
                                    {/* Auto Suggestions Popup */}
                                    {suggestions.length > 0 && (
                                        <div className="absolute bottom-full left-0 w-full p-2 z-50">
                                            <div className="bg-white rounded-xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden">
                                                {suggestions.map((s, idx) => (
                                                    <button
                                                        type="button"
                                                        key={idx}
                                                        onClick={() => { setInputValue(s); setSuggestions([]); inputRef.current?.focus(); }}
                                                        className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-[#0067A1]/5 hover:text-[#0067A1] transition-colors border-b border-gray-50 last:border-0"
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <form
                                        onSubmit={(e) => { setSuggestions([]); handleSendMessage(e); }}
                                        className="flex items-center gap-2 bg-gray-50 border border-gray-200 focus-within:border-[#0067A1]/30 focus-within:ring-4 focus-within:ring-[#0067A1]/5 rounded-xl px-4 py-2 transition-all shadow-sm"
                                    >
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={inputValue}
                                            onChange={handleInputChange}
                                            placeholder="Describe your symptoms safely..."
                                            className="bg-transparent flex-1 text-[15px] outline-none text-gray-800 placeholder-gray-400 py-1"
                                            autoFocus
                                        />
                                        <button
                                            type="submit"
                                            disabled={!inputValue.trim() || isTyping}
                                            className="text-[#0067A1] hover:bg-[#0067A1] hover:text-white p-2.5 rounded-lg disabled:text-gray-300 disabled:hover:bg-transparent transition-all"
                                        >
                                            <FaPaperPlane className="w-4 h-4" />
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
