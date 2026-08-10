"use client";

import { useState, useRef, useEffect } from "react";
import { FaComments, FaTimes, FaRobot, FaPaperPlane, FaUser } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 1,
            type: "bot",
            text: "👋 Hi there! I'm the MediConnect Assistant. How can I help you today?",
        },
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const [sessionId] = useState(() => 'sess-' + Math.random().toString(36).substring(2, 15));

    const predefinedQuestions = [
        "How do I book a doctor appointment?",
        "What is an ABHA account?",
        "How can I register as a chemist?",
        "Are the doctors verified?",
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSendMessage = async (text) => {
        if (!text.trim()) return;

        // Add user message
        const userMsg = { id: Date.now(), type: "user", text, role: "user" };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInputValue("");
        setIsTyping(true);

        try {
            // Prepare messages for OpenAI (filter out welcome message if needed, but we can pass it as assistant)
            const apiMessages = newMessages.map(m => ({
                role: m.type === "bot" ? "assistant" : "user",
                content: m.text
            }));

            const response = await fetch('/api/website/chatbot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: apiMessages,
                    sessionId: sessionId,
                    source: 'website'
                })
            });

            const data = await response.json();
            
            if (data.success) {
                setMessages(prev => [...prev, {
                    id: Date.now() + 1,
                    type: "bot",
                    text: data.response,
                    action: data.action
                }]);
            } else {
                setMessages(prev => [...prev, {
                    id: Date.now() + 1,
                    type: "bot",
                    text: "I'm having trouble connecting right now. Please try again later.",
                }]);
            }
        } catch (error) {
            console.error("Chatbot API Error:", error);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                type: "bot",
                text: "I'm having trouble connecting right now. Please check your internet or try again later.",
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-[9999] bg-[#0067A1] hover:bg-[#004F7C] text-white p-4 rounded-full shadow-2xl transition-all hover:scale-110 flex items-center justify-center group"
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
                        className="fixed bottom-24 right-4 sm:right-6 z-[9999] w-[calc(100vw-2rem)] sm:w-[380px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-[#0067A1] to-[#004F7C] p-4 flex items-center gap-3 shadow-sm">
                            <div className="bg-white/10 p-2 rounded-full backdrop-blur-sm">
                                <FaComments className="text-white w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm tracking-wide">MediConnect Assistant</h3>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                    <span className="text-white/80 text-xs font-medium">Online</span>
                                </div>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-4 min-h-0 scrollbar-thin scrollbar-thumb-gray-200">
                            {/* Welcome Message */}
                            <div className="flex justify-center mb-4">
                                <span className="text-xs text-gray-400 font-medium bg-gray-100 px-3 py-1 rounded-full">Today</span>
                            </div>

                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div className={`flex flex-col max-w-[85%] ${msg.type === "user" ? "items-end" : "items-start"}`}>
                                        <div
                                            className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.type === "user"
                                                ? "bg-[#0067A1] text-white rounded-tr-none"
                                                : "bg-white border border-gray-100 text-gray-700 rounded-tl-none"
                                                }`}
                                        >
                                            {msg.text}
                                        </div>
                                        {/* Action Button if present */}
                                        {msg.action && (
                                            <a
                                                href={msg.action.url}
                                                className="mt-2 text-xs bg-[#0067A1]/10 text-[#0067A1] px-4 py-2 rounded-xl font-semibold hover:bg-[#0067A1] hover:text-white transition-colors flex items-center gap-2 border border-[#0067A1]/20"
                                            >
                                                {msg.action.label} <span aria-hidden="true">&rarr;</span>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1.5 items-center">
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>


                        {/* Input Area */}
                        <div className="p-3 bg-white border-t border-gray-100">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSendMessage(inputValue);
                                }}
                                className="flex items-center gap-2 bg-gray-50 border border-gray-200 focus-within:border-[#0067A1]/30 focus-within:ring-4 focus-within:ring-[#0067A1]/5 rounded-full px-4 py-2.5 transition-all"
                            >
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Type your question..."
                                    className="bg-transparent flex-1 text-sm outline-none text-gray-700 placeholder-gray-400"
                                />
                                <button
                                    type="submit"
                                    disabled={!inputValue.trim()}
                                    className="text-[#0067A1] hover:bg-[#0067A1] hover:text-white p-2 rounded-full disabled:text-gray-300 disabled:hover:bg-transparent transition-all"
                                >
                                    <FaPaperPlane className="w-4 h-4 ml-0.5" />
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Chatbot;
