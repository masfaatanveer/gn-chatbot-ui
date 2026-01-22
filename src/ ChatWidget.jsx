import { useState, useEffect, useRef, useCallback, forwardRef } from "react";
import Logo from './img/logo.jpg';
import './ChatWidget.css';

// --- UTILITIES ---

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const parseResponse = (originalText) => {
  const cleanText = originalText.replace(/\*\*/g, ""); 
  const lines = cleanText.split("\n");
  let detectedOptions = [];
  let linesToKeep = [];

  // 1. Triggers - Sirf inke baad buttons banne chahiye
  const optionTriggers = [
    "available times:", "available slots:", "we provide:", "we offer:", "options:"
  ];

  let isOptionsContext = false;

  // Regex Patterns
  const dayTimeRegex = /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+((?:1[0-2]|0?[1-9]):[0-5][0-9]\s*[AaPp][Mm])\b/gi;
  const serviceKeywords = ["roof", "siding", "gutter", "deck", "repair", "install"];

  lines.forEach((line) => {
    let lineText = line.trim();
    if (!lineText) return;

    const lowerLine = lineText.toLowerCase();

    // Context Check: Kya ye line koi trigger hai?
    if (optionTriggers.some(trigger => lowerLine.includes(trigger))) {
      isOptionsContext = true;
      linesToKeep.push(lineText);
      return; 
    }

    let extractedAsButton = false;

    // RULE: Buttons sirf tab nikalo jab context "Options" ka ho
    if (isOptionsContext) {
      // Check for "Monday 10:00 AM" format
      const dayTimeMatches = lineText.match(dayTimeRegex);
      if (dayTimeMatches) {
        dayTimeMatches.forEach(match => detectedOptions.push(match.trim()));
        extractedAsButton = true;
      } 
      // Check for Services (Roofing, Siding etc)
      else if (serviceKeywords.some(k => lowerLine.includes(k)) && lineText.length < 30) {
        // Bullet points saaf karein
        const cleanOption = lineText.replace(/^[\-\*\•\d][\.\)]?\s+/, "").trim();
        detectedOptions.push(cleanOption);
        extractedAsButton = true;
      }
    }

    // Agar button nahi bana aur kaam ki baat hai, toh text mein rakho
    if (!extractedAsButton) {
      // Aik aur check: Agar line mein "to" ya "between" hai aur woh trigger nahi hai, toh usey sentence hi rehne do
      linesToKeep.push(lineText);
    }
  });

  let finalText = linesToKeep.join("\n").trim();
  
  // Duplicate remove karein
  detectedOptions = [...new Set(detectedOptions)].slice(0, 5);

  return { text: finalText, options: detectedOptions };
};

// --- SUB-COMPONENTS ---

const Header = () => (
  <div className="cw-header-wrapper">
    <div className="cw-header-content">
      <div className="cw-logo-box">
        <img src={Logo} alt="GN Logo" className="cw-logo-img" />
      </div>
      <div className="flex-1">
        <div className="cw-title-row">
          <span className="cw-title">GN Exteriors Assistant</span>
           <span className="cw-status-dot"></span>
        </div>
        <p className="cw-subtitle">Here to help with roofing, siding or gutters.</p>
      </div>
    </div>
    <div className="cw-header-separator"></div>
  </div>
);

const StaticBotGreeting = () => (
  <div className="cw-bot-bubble">
    Hi there! 👋<br />
    I’m Willy, the GN Exteriors Assistant. Need help with roofing, siding, gutters, or another exterior project?
  </div>
);

const FooterInput = forwardRef(({ message, setMessage, sendMessage, loading }, ref) => (
  <div className="cw-footer">
    <div className="cw-input-container">
      <input
        ref={ref}
        disabled={loading}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        placeholder="Ask anything..."
        className="cw-input"
        autoFocus
      />
      <button onClick={() => sendMessage()} disabled={loading} className="cw-send-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C1132E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </div>
  <a href="https://www.quikrai.us/" target="_blank">  <div className="cw-powered">Powered by Quikr AI</div>  </a>  
  </div>
));

// --- MAIN COMPONENT ---
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(""); 
  const [loading, setLoading] = useState(false);
  const [showGreeting, setShowGreeting] = useState(true);
  
  // States for IDs
  const [sessionId, setSessionId] = useState("");
  const [macId, setMacId] = useState("");

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const [chatLog, setChatLog] = useState([]);

  const [activeTab, setActiveTab] = useState("home");


  useEffect(() => {
    let session = localStorage.getItem("chat_session_id");
    if (!session) {
      session = generateUUID();
      localStorage.setItem("chat_session_id", session);
    }
    setSessionId(session);

    // Mac ID check karo
    let deviceId = localStorage.getItem("chat_device_mac_id");
    if (!deviceId) {
      deviceId = generateUUID();
      localStorage.setItem("chat_device_mac_id", deviceId);
    }
    setMacId(deviceId);
  }, []);

  // Auto-Focus Logic
  useEffect(() => {
    if (open && !loading) {
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 100);
    }
  }, [open, loading, activeTab]);

  // Auto-scroll Logic
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog, loading, activeTab]);

  // Toggle Widget Logic
  const toggleWidget = () => {
    if (open) {
      setShowGreeting(true);
    } else {
      setShowGreeting(false);
      // Agar active chat hai to wahan, warna home screen
      setActiveTab(chatLog.length > 0 ? "chat" : "home");
    }
    setOpen(!open);
  };

  // Send Message Logic
  const sendMessage = useCallback(async (msgOverride = null) => {
    const msgToSend = msgOverride || message;
    if (!msgToSend || !msgToSend.trim()) return;

    if (activeTab !== "chat") setActiveTab("chat");

    // UI Update (Add user message)
    setChatLog((prev) => {
      const updatedHistory = prev.map((msg) => 
        msg.sender === "bot" ? { ...msg, interactionDone: true } : msg
      );
      
      const newHistory = [...updatedHistory, { sender: "user", text: msgToSend }];
      
      // Keep only last 100 messages in current session memory
      if (newHistory.length > 100) {
        return newHistory.slice(-100); 
      }
      return newHistory;
    });

    if (!msgOverride) setMessage("");
    setLoading(true);

    try {
      // API Call: Sending Persistent Session ID
      const res = await fetch("https://automate.ththeater.com/webhook/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: msgToSend, 
          sessionId: sessionId, // <-- Yeh ID same rahegi, server is se context uthayega
          macId: macId
        }),
      });

      if (!res.ok) throw new Error("Server error");

      const data = await res.json();
      const responseData = Array.isArray(data) ? data[0] : data;
      const originalText = responseData.output || responseData.text || "Received";
      
      const { text, options } = parseResponse(originalText);

      // Add Bot Response
      setChatLog((prev) => {
        const newHistory = [...prev, { sender: "bot", text, options, interactionDone: false }];
        if (newHistory.length > 100) {
            return newHistory.slice(-100);
        }
        return newHistory;
      });

    } catch (err) {
      setChatLog((p) => [
        ...p,
        { sender: "bot", text: "Error: Unable to connect to server.", error: true },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [message, sessionId, macId, activeTab]); 

  return (
    <>
      {/* Greeting Bubble */}
      {!open && showGreeting && (
        <div
          onClick={toggleWidget}
          className={`cw-greeting-bubble ${!open ? "cw-greeting-show" : "cw-greeting-hide"}`}
        >
          <span>Chat now with Willy</span>
          <span style={{ fontSize: '20px' }}>👋</span>
        </div>
      )}

      {/* Main Button */}
      <button onClick={toggleWidget} className={`cw-trigger-btn ${open ? 'open' : ''}`}>
        {open ? (
          <svg width="24" height="24" stroke="white" fill="none" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <img
            src={Logo}
            alt="Company Logo"
            className="cw-logo-img"
          />
        )}
      </button>

      {/* Chat Window */}
      {open && (
        <div className="cw-wrapper">
          <div className="cw-container">
            <div className="cw-left-line"></div>
            <div className="cw-overlay"></div>

            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Header />

              <div className="cw-body">
                {activeTab === "home" && (
                  <>
                    <StaticBotGreeting />
                    <div className="cw-chips-container">
                      {[" Free Estimate", "Free Inspection", "I have a question", "Other"].map((label, i) => (
                        <button
                          key={label}
                          onClick={() => sendMessage(label)}
                          className="cw-chip-btn"
                          style={{ animationDelay: `${i * 0.2}s` }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {activeTab === "chat" && (
                  <>
                    <StaticBotGreeting />
                    {chatLog.map((chat, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        {chat.sender === "user" ? (
                          <div className="cw-user-message-row">
                            <div className="cw-user-bubble">{chat.text}</div>
                            <div className="cw-user-avatar">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                              </svg>
                            </div>
                          </div>
                        ) : (
                          <div className="cw-bot-bubble" style={{ marginTop: '5px' }}>
                            {chat.text}
                          </div>
                        )}

                        {chat.sender === "bot" && chat.options?.length > 0 && !chat.interactionDone && (
                          <div className="cw-chips-container" style={{ marginBottom: '10px', marginLeft: '2px' }}>
                            {chat.options.map((opt, idx) => (
                              <button 
                                key={idx} 
                                onClick={() => sendMessage(opt)} 
                                className="cw-chip-btn"
                                style={{ animationDelay: `${idx * 0.1}s` }}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {loading && (
                      <div className="cw-typing-container">
                        <span className="cw-dot"></span><span className="cw-dot"></span><span className="cw-dot"></span>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </>
                )}
              </div>

              <FooterInput 
                ref={inputRef}
                message={message}
                setMessage={setMessage}
                sendMessage={sendMessage}
                loading={loading}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}