"use client";

import dynamic from "next/dynamic";

const Chatbot = dynamic(() => import("./SafeChatbot"), { 
    ssr: false,
});

export default function SafeChatbotWrapper() {
    return <Chatbot />;
}
