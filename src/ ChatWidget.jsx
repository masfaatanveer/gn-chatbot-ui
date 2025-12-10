import React, { useState, useEffect, useRef, useCallback, forwardRef } from "react";
import Logo from './img/logo.jpg';
import './ChatWidget.css';

// --- UTILITIES (Logic Separated) ---

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

  const sentenceListRegex = /(?:offer|provide|include|services?|serve|areas?|towns?|cities?|locations?|cover|in|available|days?|times?|slots?)(?:\s+|:\s*|\s+are\s*:?\s*|\s+on\s*)([\w\s,]+(?:and\s+[\w\s]+)?)/i;
  const bulletRegex = /^[\-\*\•\d][\.\)]?\s+(.+)$/;
  const timeRangeRegex = /\b((?:1[0-2]|0?[1-9])(?::[0-5][0-9])?\s*[AaPp][Mm]\s*-\s*(?:1[0-2]|0?[1-9])(?::[0-5][0-9])?\s*[AaPp][Mm])\b/g;
  const dateRegex = /\b((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*)\b(?:.{0,20}?\d{1,2}(?:st|nd|rd|th)?)?/i;
  const singleTimeRegex = /\b((?:1[0-2]|0?[1-9])(?::[0-5][0-9])?\s*[AaPp][Mm])\b/g;

  // --- UPDATED BLOCKED PHRASES (Fix for "Your area" button) ---
  const blockedPhrases = [
    "your best phone number", 
    "your full name", 
    "provide the following",
    "is your", 
    "what is", 
    "please provide", 
    "tell me",
    "your area",      // <-- Blocked
    "your location",  // <-- Blocked
    "your address",   // <-- Blocked
    "your zip code",  // <-- Blocked
    "following"
  ];

  let currentContextDate = null;

  lines.forEach((line) => {
    let lineText = line.trim();
    let extractedFromLine = false;

    // A. Check for Time Ranges
    const rangeMatches = lineText.match(timeRangeRegex);
    if (rangeMatches) {
      rangeMatches.forEach(range => {
         if (!detectedOptions.includes(range)) detectedOptions.push(range);
      });
      lineText = lineText.replace(timeRangeRegex, "").trim();
      if (lineText.length < 5) extractedFromLine = true; 
    }

    // B. Check for Sentence Lists
    const sentenceMatch = lineText.match(sentenceListRegex);
    if (sentenceMatch) {
      const rawList = sentenceMatch[1].trim(); 
      const isSentence = /^(is|are|was|were|do|does|can|will|should|what|where)\b/i.test(rawList);
      const hasSeparator = rawList.includes(',') || rawList.includes(' and ') || rawList.includes(' or ');

      if (!isSentence && hasSeparator) {
          const items = rawList.split(/,| and | or /).map(s => s.trim());
          let itemsAdded = 0;

          items.forEach(item => {
            let cleanItem = item.replace(/[.?!]+$/, ""); 
            const isBlocked = blockedPhrases.some(phrase => cleanItem.toLowerCase().includes(phrase));
            const isDay = /^(mon|tue|wed|thu|fri|sat|sun)/i.test(cleanItem);

            if (!isBlocked && ((cleanItem.length > 2 && cleanItem.length < 35) || isDay)) {
               cleanItem = cleanItem.charAt(0).toUpperCase() + cleanItem.slice(1);
               if (!detectedOptions.includes(cleanItem)) {
                  detectedOptions.push(cleanItem);
                  itemsAdded++;
               }
            }
          });
          if (itemsAdded > 0) lineText = lineText.replace(rawList, "the following:");
      }
    }

    // C. Check for Bullet Points
    const bulletMatch = lineText.match(bulletRegex);
    if (bulletMatch) {
      let option = bulletMatch[1].trim().replace(/\*\*/g, ""); 
      const isBlocked = blockedPhrases.some(phrase => option.toLowerCase().includes(phrase));
      if (!isBlocked && option.length < 60) {
          detectedOptions.push(option);
          extractedFromLine = true;
      }
    }

    // D. Check for Dates
    const dateMatch = lineText.match(dateRegex);
    if (dateMatch) {
        currentContextDate = dateMatch[0].trim().replace(/[:,-]+$/, "");
        if (lineText.length < 15 && !extractedFromLine) {
           if (!detectedOptions.includes(currentContextDate)) {
               detectedOptions.push(currentContextDate);
               extractedFromLine = true;
           }
        }
    }

    // E. Check for Single Times
    const timeMatches = lineText.match(singleTimeRegex);
    if (timeMatches) {
      timeMatches.forEach((time) => {
        let label = time;
        if (currentContextDate && !label.toLowerCase().includes(currentContextDate.toLowerCase())) {
          label = `${currentContextDate} - ${time}`;
        }
        const isPartOfRange = detectedOptions.some(opt => opt.includes(time));
        if (!isPartOfRange && !detectedOptions.includes(label)) {
           detectedOptions.push(label);
        }
      });
      lineText = lineText.replace(singleTimeRegex, "").trim();
    }

    const isJunk = lineText === "" || /^[\*\-\•\s]+$/.test(lineText);
    
    // Check if remaining text is BLOCKED to prevent it showing as regular text button
    const isLineBlocked = blockedPhrases.some(phrase => lineText.toLowerCase().includes(phrase));
    
    if (!isJunk && !extractedFromLine && lineText.length > 1) {
      linesToKeep.push(lineText);
    }
  });

  let finalText = linesToKeep.join("\n").trim();
  if (!finalText && detectedOptions.length === 0) finalText = cleanText;
  
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
          <span className="cw-title">GN Roofing Assistant</span>
           <span className="cw-status-dot"></span>
        </div>
        <p className="cw-subtitle">Here to help with roofing, siding or gutters.</p>
      </div>
    </div>
    <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', marginTop: '20px' }}></div>
  </div>
);

const StaticBotGreeting = () => (
  <div className="cw-bot-bubble">
    Hi there! 👋<br />
    I'm the GN Roofing Assistant.<br />
    Need help with roofing, siding, gutters or scheduling a free inspection?
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
    <div className="cw-powered">Powered by Quikr AI</div>
  </div>
));

// --- MAIN COMPONENT ---
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showGreeting, setShowGreeting] = useState(true);
  
  // State for IDs
  const [sessionId, setSessionId] = useState("");
  const [macId, setMacId] = useState(""); // <-- MAC ID State

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize Session ID AND MAC ID
  useEffect(() => {
    // 1. Session ID (Temporary per tab/session)
    let session = sessionStorage.getItem("chat_session_id");
    if (!session) {
      session = generateUUID();
      sessionStorage.setItem("chat_session_id", session);
    }
    setSessionId(session);

    // 2. MAC ID (Persistent Device ID using LocalStorage)
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
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  }, [open, loading, activeTab]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog, loading, activeTab]);

  const toggleWidget = () => {
    if (open) {
      setShowGreeting(true);
    } else {
      setShowGreeting(false);
      setActiveTab("home");
    }
    setOpen(!open);
  };

  const sendMessage = useCallback(async (msgOverride = null) => {
    const msgToSend = msgOverride || message;
    if (!msgToSend || !msgToSend.trim()) return;

    if (activeTab !== "chat") setActiveTab("chat");

    setChatLog((prev) => {
      const updatedHistory = prev.map((msg) => 
        msg.sender === "bot" ? { ...msg, interactionDone: true } : msg
      );
      return [...updatedHistory, { sender: "user", text: msgToSend }];
    });

    if (!msgOverride) setMessage("");
    setLoading(true);

    try {
      const res = await fetch("https://automate.ththeater.com/webhook/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: msgToSend, 
          sessionId: sessionId,
          macId: macId // <-- Sending MAC ID in payload
        }),
      });

      if (!res.ok) throw new Error("Server error");

      const data = await res.json();
      const responseData = Array.isArray(data) ? data[0] : data;
      const originalText = responseData.output || responseData.text || "Received";
      
      const { text, options } = parseResponse(originalText);

      setChatLog((p) => [
        ...p,
        { sender: "bot", text, options, interactionDone: false },
      ]);
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
      {!open && showGreeting && (
        <div
          onClick={toggleWidget}
          className={`cw-greeting-bubble ${!open ? "cw-greeting-show" : "cw-greeting-hide"}`}
        >
          <span>Chat now with Willy</span>
          <span style={{ fontSize: '20px' }}>👋</span>
        </div>
      )}

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
            style={{ width: "68px", height: "38px", borderRadius: "50%", objectFit: "cover" }}
          />
        )}
      </button>

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
                      {["Roofing Estimate", "Siding Repair", "Gutter Issues", "Free Inspection"].map((label, i) => (
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