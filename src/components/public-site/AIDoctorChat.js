'use client';

import { useState, useRef, useEffect } from 'react';

const AIDoctorChat = () => {
  const [messages, setMessages] = useState([
    { id: 1, text: 'Hi there! I am your Health Assistant. Please describe your symptoms and I will help you with screening.', sender: 'ai' },
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      text: inputValue,
      sender: 'user',
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // Simulate AI response
    setTimeout(() => {
      let aiResponse;
      if (messages.length === 1) {
        aiResponse = {
          id: messages.length + 2,
          text: 'I understand your symptoms. Let me ask you a few questions to better assess your condition. How long have you had the fever? Please type your answer below.',
          sender: 'ai',
        };
      } else {
        aiResponse = {
          id: messages.length + 2,
          text: 'Have you experienced any other symptoms along with the fever, such as cough, sore throat, or body aches? Please type your answer below.',
          sender: 'ai',
        };
      }
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col  bg-white text-gray-900 h-full">
      {/* Header */}
     
      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50" style={{}}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                message.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-white text-gray-800 border border-gray-200'
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white p-4 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type here..."
            className="flex-1 bg-white border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-[#0067A1] hover:bg-[#004F7C] text-white font-semibold px-6 py-2 rounded-full"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIDoctorChat;
