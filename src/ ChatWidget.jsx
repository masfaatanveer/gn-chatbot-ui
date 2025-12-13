import { useState, useEffect, useRef, useCallback, forwardRef } from "react";
import Logo from './img/logo.jpg';
import './ChatWidget.css';

// --- UTILITIES ---
    
// Generate a random ID for Sessions and Devices
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Logic to parse the AI response and extract clickable "Chips" (Options)
const parseResponse = (originalText) => {
  const cleanText = originalText.replace(/\*\*/g, ""); 
  const lines = cleanText.split("\n");
  let detectedOptions = [];
  let linesToKeep = [];

  // Regex for detecting lists, times, dates, and bullets
  const sentenceListRegex = /(?:offer|provide|include|services?|serve|areas?|towns?|cities?|locations?|cover|in|available|days?|times?|slots?)(?:\s+|:\s*|\s+are\s*:?\s*|\s+on\s*)([\w\s,]+(?:and\s+[\w\s]+)?)/i;
  const bulletSymbolRegex = /^[\-\*\•\d][\.\)]?\s+/; 
  const timeRangeRegex = /\b((?:1[0-2]|0?[1-9])(?::[0-5][0-9])?\s*[AaPp][Mm]\s*-\s*(?:1[0-2]|0?[1-9])(?::[0-5][0-9])?\s*[AaPp][Mm])\b/g;
  const dateRegex = /\b((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*)\b(?:.{0,20}?\d{1,2}(?:st|nd|rd|th)?)?/i;
  const singleTimeRegex = /\b((?:1[0-2]|0?[1-9])(?::[0-5][0-9])?\s*[AaPp][Mm])\b/g;

  // Strict keywords to ensure chips are relevant
  const serviceKeywords = ["roof", "siding", "gutter", "repair", "install", "inspect", "estimate", "leak", "shingle", "replacement"];

  // Phrases to ignore (don't make these into chips)
  const blockedPhrases = [
    "your best phone number", "your full name", "provide the following",
    "is your", "what is", "please provide", "tell me",
    "your area", "your location", "your address", "your zip code", "following"
  ];

  let currentContextDate = null;

  lines.forEach((line) => {
    let lineText = line.trim();
    let extractedFromLine = false;

    // 1. Check for Time Ranges (e.g., "10 AM - 2 PM")
    const rangeMatches = lineText.match(timeRangeRegex);
    if (rangeMatches) {
      rangeMatches.forEach(range => {
         if (!detectedOptions.includes(range)) detectedOptions.push(range);
      });
      lineText = lineText.replace(timeRangeRegex, "").trim();
      if (lineText.length < 10) extractedFromLine = true; 
    }

    // 2. Check for Dates (e.g., "Monday", "Nov 12th")
    const dateMatch = lineText.match(dateRegex);
    if (dateMatch) {
        let foundDate = dateMatch[0].trim().replace(/[:,-]+$/, "");
        currentContextDate = foundDate; 
        
        if (lineText.length < 25 && !extractedFromLine) {
           if (!detectedOptions.includes(foundDate)) {
               detectedOptions.push(foundDate);
               extractedFromLine = true;
           }
        }
    }

    // 3. Check for Lists (Services or Locations)
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
            const isService = serviceKeywords.some(k => cleanItem.toLowerCase().includes(k));
            const isLocationContext = /areas?|towns?|cities?|locations?|cover/i.test(lineText);

            if (!isBlocked && cleanItem.length > 2 && cleanItem.length < 35) {
               if (isDay || isService || isLocationContext) {
                  cleanItem = cleanItem.charAt(0).toUpperCase() + cleanItem.slice(1);
                  if (!detectedOptions.includes(cleanItem)) {
                      detectedOptions.push(cleanItem);
                      itemsAdded++;
                  }  
               }
            }
          });
          if (itemsAdded > 0) lineText = lineText.replace(rawList, "the following:");
      }
    }

    // 4. Check for Bullet Points
    const isBullet = bulletSymbolRegex.test(lineText);
    if (isBullet && !extractedFromLine) {
      let option = lineText.replace(bulletSymbolRegex, "").replace(/\*\*/g, "").trim();
      const isBlocked = blockedPhrases.some(phrase => option.toLowerCase().includes(phrase));
      
      const isService = serviceKeywords.some(k => option.toLowerCase().includes(k));
      const isDay = /^(mon|tue|wed|thu|fri|sat|sun)/i.test(option);
      const isTime = /\d{1,2}(?::\d{2})?\s*[AaPp][Mm]/.test(option);

      if (!isBlocked && option.length < 50) {
          if (isService || isDay || isTime) {
             detectedOptions.push(option);
             extractedFromLine = true;
          }
      }
    }

    // 5. Check for Single Times
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
    <div 
      style={{ 
        marginTop: '16px', 
        height: '1px', 
        background: 'linear-gradient(90deg, transparent 0%, rgba(193, 19, 46, 0.15) 50%, transparent 100%)' 
      }} 
    ></div>
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
  <a href="https://www.quikrai.us/" target="_blank">  <div className="cw-powered">Powered by Quikr AI</div>  </a>  
  </div>
));

// --- MAIN COMPONENT ---
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(""); // Input message state
  const [loading, setLoading] = useState(false);
  const [showGreeting, setShowGreeting] = useState(true);
  
  // States for IDs
  const [sessionId, setSessionId] = useState("");
  const [macId, setMacId] = useState("");

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // 1. Initialize chat history from LocalStorage (so chat stays after reload)
  const [chatLog, setChatLog] = useState(() => {
    try {
      const saved = localStorage.getItem("chat_history");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // 2. Decide starting Tab: If history exists, show Chat, else Home
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("chat_history") ? "chat" : "home";
  });

  // 3. Auto-Save chat to LocalStorage (Max 100 messages)
  useEffect(() => {
    if (chatLog.length > 0) {
      const trimmedLog = chatLog.slice(-100);
      localStorage.setItem("chat_history", JSON.stringify(trimmedLog));
    }
  }, [chatLog]);

  // 4. Initialize Session ID and Device ID (Create once, then save)
  useEffect(() => {
    let session = localStorage.getItem("chat_session_id");
    if (!session) {
      session = generateUUID();
      localStorage.setItem("chat_session_id", session);
    }
    setSessionId(session);

    let deviceId = localStorage.getItem("chat_device_mac_id");
    if (!deviceId) {
      deviceId = generateUUID();
      localStorage.setItem("chat_device_mac_id", deviceId);
    }
    setMacId(deviceId);
  }, []);

  // Auto-Focus on input when chat opens
  useEffect(() => {
    if (open && !loading) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  }, [open, loading, activeTab]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog, loading, activeTab]);

  // Handle opening/closing the widget
  const toggleWidget = () => {
    if (open) {
      setShowGreeting(true);
    } else {
      setShowGreeting(false);
      setActiveTab(chatLog.length > 0 ? "chat" : "home");
    }
    setOpen(!open);
  };

  // Function to send message to API
  const sendMessage = useCallback(async (msgOverride = null) => {
    const msgToSend = msgOverride || message;
    if (!msgToSend || !msgToSend.trim()) return;

    if (activeTab !== "chat") setActiveTab("chat");

    // Optimistic UI Update (Show user message immediately)
    setChatLog((prev) => {
      const updatedHistory = prev.map((msg) => 
        msg.sender === "bot" ? { ...msg, interactionDone: true } : msg
      );
      return [...updatedHistory, { sender: "user", text: msgToSend }];
    });

    if (!msgOverride) setMessage("");
    setLoading(true);

    try {
      // Send request to webhook
      const res = await fetch("https://automate.ththeater.com/webhook/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: msgToSend, 
          sessionId: sessionId,
          macId: macId
        }),
      });

      if (!res.ok) throw new Error("Server error");

      const data = await res.json();
      const responseData = Array.isArray(data) ? data[0] : data;
      const originalText = responseData.output || responseData.text || "Received";
      
      // Parse response to find options/chips
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
      {/* Greeting Bubble (Only visible when widget is closed) */}
      {!open && showGreeting && (
        <div
          onClick={toggleWidget}
          className={`cw-greeting-bubble ${!open ? "cw-greeting-show" : "cw-greeting-hide"}`}
        >
          <span>Chat now with Willy</span>
          <span style={{ fontSize: '20px' }}>👋</span>
        </div>
      )}

      {/* Main Toggle Button */}
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

      {/* Main Chat Window */}
      {open && (
        <div className="cw-wrapper">
          <div className="cw-container">
            <div className="cw-left-line"></div>
            <div className="cw-overlay"></div>

            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Header />

              <div className="cw-body">
                {/* Home Tab: Chips Only */}
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

                {/* Chat Tab: Conversation History */}
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

                        {/* Chips/Options from Bot */}
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