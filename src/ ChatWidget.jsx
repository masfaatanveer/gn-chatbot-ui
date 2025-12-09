import React, { useState, useEffect, useRef } from "react";
import Logo from './img/logo.jpg';
import './ChatWidget.css';

// --- Helper: Generate Unique Session ID (UUID) ---
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const chatEndRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [showGreeting, setShowGreeting] = useState(true);

  // --- NEW: Session ID State (Only Session ID now) ---
  const [sessionId, setSessionId] = useState("");

  // --- Initialize Session ID on Load ---
  useEffect(() => {
    // Check sessionStorage for existing session ID
    let session = sessionStorage.getItem("chat_session_id");
    
    // If not found, generate a new one
    if (!session) {
      session = generateUUID();
      sessionStorage.setItem("chat_session_id", session);
    }

    setSessionId(session);
  }, []);

  // --- PARSING LOGIC (Unchanged) ---
  const parseResponse = (originalText) => {
    const confirmationRegex = /\b(understood|confirmed|booked|great|perfect|noted|finalize|done|reserved)\b/i;
    if (confirmationRegex.test(originalText)) return { text: originalText, options: [] };

    const dateRegex = /\b((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*)\b(?:.{0,20}?\d{1,2}(?:st|nd|rd|th)?)?/i;
    const timeRegex = /\b((?:1[0-2]|0?[1-9])(?::[0-5][0-9])?\s*[AaPp][Mm])\b/g;

    const lines = originalText.split("\n");
    let detectedOptions = [];
    let currentContextDate = null;
    let linesToKeep = [];

    lines.forEach((line) => {
      let cleanLine = line;
      const dateMatch = line.match(dateRegex);
      if (dateMatch) currentContextDate = dateMatch[0].trim().replace(/[:,-]+$/, "");

      const timeMatches = line.match(timeRegex);
      if (timeMatches) {
        timeMatches.forEach((time) => {
          let label = time;
          if (currentContextDate && !label.toLowerCase().includes(currentContextDate.toLowerCase())) {
            label = `${currentContextDate} - ${time}`;
          }
          if (!detectedOptions.includes(label)) detectedOptions.push(label);
        });
        cleanLine = cleanLine.replace(timeRegex, "").trim();
      }
      const isJunk = cleanLine === "" || /^[\*\-\•\s]+$/.test(cleanLine);
      if (!isJunk && cleanLine.length > 2) linesToKeep.push(cleanLine);
    });

    let finalText = linesToKeep.join("\n").trim();
    if (!finalText && detectedOptions.length === 0) finalText = originalText;
    return { text: finalText, options: detectedOptions };
  };

  const handleOptionClick = (optionText) => {
    sendMessage(optionText);
  };

  const handleQuickAction = (text) => {
    sendMessage(text);
  };

  // --- Send Message Logic ---
  const sendMessage = async (msgOverride = null) => {
    const msgToSend = msgOverride || message;

    // 1. Validation
    if (!msgToSend || !msgToSend.trim()) return;

    // 2. Tab Switch
    if (activeTab !== "chat") {
      setActiveTab("chat");
    }

    // 3. UI Update (Atomic)
    setChatLog((prev) => {
      const updatedHistory = prev.map((msg) => {
        if (msg.sender === "bot" && !msg.interactionDone) {
          return { ...msg, interactionDone: true };
        }
        return msg;
      });
      return [...updatedHistory, { sender: "user", text: msgToSend }];
    });

    // 4. Cleanup
    if (!msgOverride) setMessage("");
    setLoading(true);

    try {
      // --- UPDATED FETCH: Sending Only Session ID ---
      const res = await fetch("https://automate.ththeater.com/webhook/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: msgToSend,
          sessionId: sessionId  // Sending Session ID only
        }),
      });

      if (!res.ok) throw new Error("Server error");

      const data = await res.json();
      const r = Array.isArray(data) ? data[0] : data;
      const originalText = r.output || r.text || "Received";
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
    }
  };

  // Auto Scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog, loading, activeTab]);

  const toggleWidget = () => {
    if (!open) {
      setShowGreeting(false);
      setActiveTab("home");
    } else {
      setShowGreeting(true);
    }
    setOpen(!open);
  };

  // --- Components ---
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

  return (
    <>
      {!open && showGreeting && (
        <div onClick={toggleWidget} className="cw-greeting-bubble">
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
            style={{
              width: "68px",
              height: "38px",
              borderRadius: "50%",
              objectFit: "cover"
            }}
          />
        )}
      </button>

      {open && (
        <div className="cw-wrapper">
          <div className="cw-container">
            <div className="cw-left-line"></div>
            <div className="cw-overlay"></div>

            {/* HOME TAB */}
            {activeTab === "home" && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Header />
                <div className="cw-body">
                  <div className="cw-bot-bubble">
                    Hi there! 👋<br />
                    I'm the GN Roofing Assistant.<br />
                    Need help with roofing, siding, gutters or scheduling a free inspection?
                  </div>
                  <div className="cw-chips-container">
                    {["Roofing Estimate", "Siding Repair", "Gutter Issues", "Free Inspection"].map((label, i) => (
                      <button
                        key={label}
                        onClick={() => handleQuickAction(label)}
                        className="cw-chip-btn"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Home Footer Input */}
                <div className="cw-footer">
                  <div className="cw-input-container">
                    <input
                      disabled={loading}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                      placeholder="Ask anything..."
                      className="cw-input"
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
              </div>
            )}

            {/* CHAT TAB */}
            {activeTab === "chat" && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Header />
                <div className="cw-body">
                  {/* Static Intro Message */}
                  <div className="cw-bot-bubble">
                    Hi there! 👋<br />
                    I'm the GN Roofing Assistant.<br />
                    Need help with roofing, siding, gutters or scheduling a free inspection?
                  </div>

                  {/* Chat Logs */}
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

                      {/* Bot Options */}
                      {chat.sender === "bot" && chat.options && chat.options.length > 0 && !chat.interactionDone && (
                        <div className="cw-chips-container" style={{ marginBottom: '10px', marginLeft: '2px' }}>
                          {chat.options.map((opt, idx) => (
                            <button key={idx} onClick={() => handleOptionClick(opt)} className="cw-chip-btn">
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Loading Animation */}
                  {loading && (
                    <div className="cw-typing-container">
                      <span className="cw-dot"></span>
                      <span className="cw-dot"></span>
                      <span className="cw-dot"></span>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Chat Footer Input */}
                <div className="cw-footer">
                  <div className="cw-input-container">
                    <input
                      disabled={loading}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                      placeholder="Ask anything..."
                      className="cw-input"
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
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}