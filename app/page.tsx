'use client'

import Image from 'next/image';
import React, { useState, useRef, useEffect } from 'react'
import AgentForm from './components/AgentForm'

export default function Home() {
  // The initial message is the only thing needed to start the conversation
  const [messages, setMessages] = useState([
    // { role: 'model', parts: [{ text: "Hi! I'm here to help you submit your AI agent idea. Let's start with the basics - what's your name?" }] },
    { role: 'model', parts: [{ text: "Welcome. This is the submission form for new AI agent ideas. I will guide you through the four required fields. To begin, please provide your full name." }] },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false); // To prevent double sends
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    linkedinProfile: "",
    idea: ""
  });
  const [isSubmitted, setIsSubmitted] = useState(false);


  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);


  //useEffect hook to handle scrolling and focusing
  useEffect(() => {
    // Auto-scrolling logic
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }

    // Auto-focusing logic
    if (inputRef.current && !isLoading) {
      inputRef.current.focus();
    }
  }, [messages, isLoading]); // This effect runs whenever messages or isLoading change


  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    setIsLoading(true);

    const userMessage = { role: 'user', parts: [{ text: input }] };
    // This is the full history for displaying in the UI
    const updatedMessagesForUI = [...messages, userMessage];

    setMessages(updatedMessagesForUI);
    setInput('');


    const historyForApi = updatedMessagesForUI.slice(1);

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send the corrected history array to the API
        body: JSON.stringify({ history: historyForApi }),
      });

      const data = await res.json();

      if (data.reply) {
        setMessages(prev => [...prev, { role: 'model', parts: [{ text: data.reply }] }]);
      }

      if (data.extractedData) {
        setFormData(prev => ({ ...prev, ...data.extractedData }));
      }

      if (data.submissionStatus === "SUCCESS") {
        handleFormSubmit();
      }

    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: "Sorry, something went wrong. Please try again." }] }]);
    } finally {
      setIsLoading(false);
    }
  };
  // Minor update to render the new message format
  const messageToDisplay = (msg: { role: string; parts: { text: string }[] }) => {
    return msg.parts.map(part => part.text).join('');
  }


  const handleFormSubmit = () => {
    console.log("Form Submitted Successfully:", formData);
    setIsSubmitted(true);
    // You could also clear the form here if desired
    // setFormData({ name: "", email: "", linkedinProfile: "", idea: "" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="flex items-center justify-center pt-12 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900">
          AI Form Submission Agent
        </h1>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* ... h1 title ... */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          <div>
            {isSubmitted ? (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
                <h2 className="text-2xl font-bold text-green-600 mb-4">Submission Successful!</h2>
                <p className="text-gray-700">Thank you for sharing your idea. We will be in touch soon.</p>
              </div>
            ) : (
              <AgentForm
                formData={formData}
                setFormData={setFormData}
                onFormSubmit={handleFormSubmit} />
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 flex flex-col h-[690px]">
            <h2 className="text-2xl font-bold mb-4 text-black">Copilot</h2>
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar text-black">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <p className={`px-4 py-2 rounded-lg max-w-[90%] ${msg.role === 'model' ? 'bg-gray-100 text-left' : 'bg-blue-100 text-left'}`}>
                    {messageToDisplay(msg)}
                  </p>
                </div>
              ))}
              {isLoading && <div className="flex justify-start"><p className="px-4 py-2 rounded-lg bg-gray-100">...</p></div>}
            </div>
            <div className="flex gap-2 mt-4">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="flex-1 border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 text-black"
                placeholder="Type your response..."
                disabled={isLoading || isSubmitted}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || isSubmitted}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition disabled:bg-blue-300"
              >
                Send
              </button>
            </div>
          </div>
        </div>
        <footer className="mt-24 pt-12 border-t border-gray-200">
          <div className="text-center">
            
            <p className="text-sm text-gray-500 mb-6">
              Built with Next.js
            </p>
            <div className="flex justify-center space-x-6 text-sm text-gray-500">
              <span>© 2025</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}