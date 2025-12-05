import { useState, useEffect, useRef } from "react";
import Logo from './img/logo.jpg';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const chatEndRef = useRef(null);
  const [loading, setLoading] = useState(false);

const sendMessage = async () => {
    if (!message.trim()) return;

    setChatLog((prev) => [...prev, { sender: "user", text: message }]);
    setLoading(true);

    try {
      const res = await fetch(
        "https://automate.ththeater.com/webhook/chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        }
      );

      if (!res.ok) throw new Error("Server error");

      const data = await res.json();

      // ✅ FIX: Server bhej raha hai [ { "output": "..." } ]
      // Hum check karenge ke data Array hai ya Object, aur sahi text nikalenge.
      
      let botResponse = "No response from server";

      if (Array.isArray(data) && data.length > 0 && data[0].output) {
        // Agar response Array hai: [ { "output": "Hello" } ]
        botResponse = data[0].output;
      } else if (data.output) {
        // Agar response direct Object hai: { "output": "Hello" }
        botResponse = data.output;
      }

      setChatLog((prev) => [
        ...prev,
        { sender: "bot", text: botResponse },
      ]);

    } catch (err) {
      console.error(err);
      setChatLog((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Error: Unable to connect to server.",
          error: true,
        },
      ]);
    } finally {
      setMessage("");
      setLoading(false);
    }
  };
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog]);

  return (
    <>
    {/* Floating Button (Chat open hone par mobile pe chup jayega taake overlap na kare) */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-6 right-6 z-[9999] flex items-center justify-center w-[60px] h-[60px] bg-[#242424] text-white text-[26px] rounded-full border-2 border-blue-500 shadow-[0_0_10px_#3b82f6] hover:scale-105 transition-transform duration-200 ${
          open ? "hidden sm:flex" : "flex"
        }`}
      >
        💬
      </button>

      {open && (
        <div className="fixed z-[9999] bg-[#0f0f0f] border border-[#2a2a2a] shadow-[0_0_40px_rgba(0,0,0,0.6)] overflow-hidden font-sans text-white flex flex-col
          
          /* === RESPONSIVE CLASSES START === */
          bottom-0 right-0 w-full h-[100dvh] rounded-none                /* Mobile Styles: Full Screen */
          sm:bottom-[90px] sm:right-6 sm:w-[420px] sm:h-[600px] sm:rounded-[20px] /* Desktop Styles: Card Style */
          /* === RESPONSIVE CLASSES END === */
        ">
          
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[#2b2b2b] bg-[#111]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 shrink-0 flex items-center justify-center bg-[rgba(60,138,255,0.15)] border border-[rgba(60,138,255,0.3)] rounded-xl overflow-hidden">
                <img
                  src={Logo}
                  alt="HAB Logo"
                  className="w-[36px] h-[36px] object-contain"
                />
              </div>

              <div>
                <div className="text-lg font-semibold">HAB Assistant</div>
                <div className="text-[13px] text-[#a0a0a0]">
                  Online • Ready to assist
                </div>
              </div>
            </div>

            {/* Mobile Close Button (Sirf mobile pe zaroori hai, lekin sab jagah dikha sakte hain UX ke liye) */}
            <button 
              onClick={() => setOpen(false)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 p-[18px] overflow-y-auto bg-[#0f0f0f] space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-[rgba(15,15,15,0.3)] [&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-lg hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
            
            {/* STATIC WELCOME MESSAGE */}
            <div className="flex justify-start">
              <div className="max-w-[85%] sm:max-w-[75%] p-3.5 px-[18px] rounded-2xl text-[15px] leading-relaxed bg-[rgba(60,138,255,0.15)] border border-[rgba(60,138,255,0.25)] text-white backdrop-blur-[14px] shadow-[0px_4px_20px_rgba(60,138,255,0.15)]">
                Hello! I'm HAB. How can I help streamline your business today?
              </div>
            </div>

            {/* DYNAMIC CHAT */}
            {chatLog.map((chat, i) => (
              <div
                key={i}
                className={`flex ${
                  chat.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] p-3.5 px-[18px] rounded-2xl text-[15px] leading-relaxed backdrop-blur-[14px] text-white ${
                    chat.sender === "user"
                      ? "bg-[rgba(60,138,255,0.3)] border border-[rgba(60,138,255,0.25)] shadow-[0px_4px_20px_rgba(60,138,255,0.15)]"
                      : chat.error
                      ? "bg-[rgba(255,60,60,0.15)] border border-[rgba(255,60,60,0.3)] shadow-[0px_4px_18px_rgba(255,60,60,0.2)]"
                      : "bg-[rgba(60,138,255,0.15)] border border-[rgba(60,138,255,0.25)] shadow-[0px_4px_20px_rgba(60,138,255,0.15)]"
                  }`}
                >
                  {chat.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="text-[#888] text-2xl animate-pulse px-2">
                …
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-[18px] border-t border-[rgba(60,138,255,0.15)] bg-[rgba(255,255,255,0.02)] backdrop-blur-[20px]">
            <div className="flex items-center gap-3 bg-[rgba(255,255,255,0.05)] border border-[rgba(60,138,255,0.15)] rounded-2xl p-2 px-3.5 backdrop-blur-[28px]">
              <input
                disabled={loading}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type your message..."
                className="flex-1 p-3 bg-transparent text-white text-base border-none outline-none placeholder-gray-400 disabled:opacity-50"
              />

              <button
                onClick={sendMessage}
                disabled={loading}
                className="flex items-center justify-center w-[46px] h-[46px] rounded-[14px] border border-[rgba(60,138,255,0.3)] bg-[rgba(255,255,255,0.08)] backdrop-blur-[24px] shadow-[0px_8px_32px_rgba(60,138,255,0.15)_inset_0_1px_rgba(255,255,255,0.3)_inset_0_-1px_rgba(0,0,0,0.1)] hover:bg-[rgba(255,255,255,0.15)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
                  <path d="m21.854 2.147-10.94 10.939" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}