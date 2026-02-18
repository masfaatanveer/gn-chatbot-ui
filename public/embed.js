(function () {
  "use strict";

  // ─── CONFIG ───
  var WIDGET_URL = "https://gn-chatbot-ui.vercel.app";
  var Z = 2147483647;

  // ─── STATE ───
  var isOpen = false;
  var iframe = null;
  var btn = null;
  var bubble = null;
  var style = null;
  var btnContent = { logo: null, xIcon: null };

  // ─── STYLES ───
  function injectStyles() {
    style = document.createElement("style");
    style.id = "gn-embed-styles";
    style.textContent = [

      /* ── TRIGGER BUTTON ── */
      "#gn-trigger{",
      "  position:fixed;bottom:24px;right:24px;",
      "  width:60px;height:60px;",
      "  border-radius:50%;",
      "  border:1px solid rgba(255,255,255,0.15);",
      "  background:radial-gradient(circle,#5c1212 40%,#3a0a0a 100%);",
      "  box-shadow:0 0 18px rgba(193,19,46,0.45);",
      "  cursor:pointer;",
      "  display:flex;align-items:center;justify-content:center;",
      "  z-index:" + Z + ";",
      "  padding:0;outline:none;",
      "  transition:transform 0.25s ease,box-shadow 0.25s ease;",
      "  overflow:hidden;",
      "}",

      "#gn-trigger:hover{",
      "  transform:scale(1.1);",
      "  box-shadow:0 0 10px rgba(193,19,46,0.6),0 0 20px rgba(193,19,46,0.4),0 6px 18px rgba(0,0,0,0.5);",
      "}",

      "#gn-trigger.gn-open{",
      "  background:#5c1518;",
      "  transform:rotate(90deg);",
      "}",
      "#gn-trigger.gn-open:hover{",
      "  transform:rotate(90deg) scale(1.1);",
      "}",

      /* Logo inside button */
      "#gn-trigger .gn-btn-logo{",
      "  width:100%;height:100%;",
      "  object-fit:contain;",
      "  transform:scale(1.5);",
      "  border-radius:50%;",
      "  pointer-events:none;",
      "}",

      /* X icon inside button */
      "#gn-trigger .gn-btn-x{",
      "  display:none;",
      "  pointer-events:none;",
      "}",
      "#gn-trigger.gn-open .gn-btn-logo{ display:none; }",
      "#gn-trigger.gn-open .gn-btn-x{ display:block; }",

      /* ── GREETING BUBBLE ── */
      "#gn-greeting{",
      "  position:fixed;",
      "  bottom:30px;right:95px;",
      "  background:#2b1011;",
      "  border:1px solid rgba(255,255,255,0.15);",
      "  color:#fff;",
      "  padding:12px 20px;",
      "  border-radius:50px;",
      '  font-family:"SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;',
      "  font-size:14px;font-weight:500;",
      "  box-shadow:0 4px 15px rgba(0,0,0,0.4);",
      "  cursor:pointer;",
      "  z-index:" + (Z - 1) + ";",
      "  display:flex;align-items:center;gap:8px;",
      "  backdrop-filter:blur(10px);",
      "  -webkit-backdrop-filter:blur(10px);",
      "  transform-origin:bottom right;",
      "  animation:gnZoomIn 0.65s cubic-bezier(0.22,1,0.36,1) forwards;",
      "}",

      "#gn-greeting.gn-hide{",
      "  animation:gnZoomOut 0.45s cubic-bezier(0.55,0,0.55,0.2) forwards;",
      "  pointer-events:none;",
      "}",

      "@keyframes gnZoomIn{",
      "  from{opacity:0;transform:translateY(20px) scale(0.75);}",
      "  to{opacity:1;transform:translateY(0) scale(1);}",
      "}",
      "@keyframes gnZoomOut{",
      "  from{opacity:1;transform:translateY(0) scale(1);}",
      "  to{opacity:0;transform:translateY(20px) scale(0.75);}",
      "}",

      /* ── IFRAME ── */
      "#gn-frame{",
      "  position:fixed;",
      "  bottom:100px;right:24px;",
      "  width:460px;height:670px;",
      "  border:none;",
      "  border-radius:32px;",
      "  overflow:hidden;",
      "  z-index:" + Z + ";",
      "  opacity:0;",
      "  transform:translateY(20px);",
      "  transition:opacity 0.3s ease,transform 0.3s ease;",
      "  pointer-events:none;",
      "  background:transparent;",
      "  box-shadow:rgba(0,0,0,0.45) 0px 18px 44px,0 0 0 1px rgba(255,255,255,0.05);",
      "  visibility:hidden;",  
      "}",

      "#gn-frame.gn-open{",
      "  opacity:1;transform:translateY(0);pointer-events:auto;",
      "  visibility:visible;",  
      "}",

      /* ── MOBILE ── */
      "@media(max-width:600px){",
      "  #gn-frame{",
      "    width:92vw!important;height:78vh!important;",
      "    bottom:90px!important;right:14px!important;",
      "  }",
      "  #gn-trigger{",
      "    width:54px!important;height:54px!important;",
      "    bottom:18px!important;right:18px!important;",
      "  }",
      "  #gn-greeting{",
      "    bottom:24px!important;right:80px!important;",
      "    font-size:13px!important;padding:10px 16px!important;",
      "  }",
      "}",

      "@media(max-width:420px){",
      "  #gn-frame{",
      "    width:94vw!important;height:80vh!important;",
      "    right:10px!important;bottom:80px!important;",
      "  }",
      "  #gn-trigger{",
      "    width:50px!important;height:50px!important;right:14px!important;",
      "  }",
      "  #gn-greeting{",
      "    right:72px!important;",
      "  }",
      "}",

    ].join("\n");
    document.head.appendChild(style);
  }

  // ─── CREATE TRIGGER BUTTON ───
  function createTrigger() {
    btn = document.createElement("button");
    btn.id = "gn-trigger";
    btn.setAttribute("aria-label", "Open chat");

    // Logo image
    btnContent.logo = document.createElement("img");
    btnContent.logo.className = "gn-btn-logo";
    btnContent.logo.src = WIDGET_URL + "/logo.jpg";
    btnContent.logo.alt = "GN Exteriors";
    btnContent.logo.onerror = function () {
      // Fallback if image doesn't load
      this.style.display = "none";
    };
    btn.appendChild(btnContent.logo);

    // X icon (shown when open)
    btnContent.xIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    btnContent.xIcon.setAttribute("class", "gn-btn-x");
    btnContent.xIcon.setAttribute("width", "24");
    btnContent.xIcon.setAttribute("height", "24");
    btnContent.xIcon.setAttribute("viewBox", "0 0 24 24");
    btnContent.xIcon.setAttribute("fill", "none");
    btnContent.xIcon.setAttribute("stroke", "white");
    btnContent.xIcon.setAttribute("stroke-width", "2");
    btnContent.xIcon.innerHTML =
      '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';
    btn.appendChild(btnContent.xIcon);

    btn.addEventListener("click", toggleChat);
    document.body.appendChild(btn);
  }

  // ─── CREATE GREETING BUBBLE ───
  function createGreeting() {
    bubble = document.createElement("div");
    bubble.id = "gn-greeting";
    bubble.innerHTML = '<span>Chat now with Willy</span><span style="font-size:20px">👋</span>';
    bubble.addEventListener("click", function () {
      openChat();
    });
    document.body.appendChild(bubble);
  }

  // ─── CREATE IFRAME ───
  function createIframe() {
    iframe = document.createElement("iframe");
    iframe.id = "gn-frame";
    iframe.src = WIDGET_URL + "?embed=true";
    iframe.setAttribute("allow", "microphone; clipboard-write");
    iframe.setAttribute("title", "GN Exteriors Chat Assistant");
    document.body.appendChild(iframe);
  }

  // ─── TOGGLE / OPEN / CLOSE ───
  function toggleChat() {
    if (isOpen) {
      closeChat();
    } else {
      openChat();
    }
  }

  function openChat() {
    isOpen = true;

    // Button → open state (shows X, rotates)
    btn.classList.add("gn-open");

    // Hide greeting bubble
    if (bubble) {
      bubble.classList.add("gn-hide");
    }

    // Show iframe
    // Small delay to let iframe load on first open
    if (iframe.classList.contains("gn-open")) {
      // Already open, just send message
      try { iframe.contentWindow.postMessage({ type: "GN_CHAT_OPEN" }, "*"); } catch(e) {}
    } else {
      iframe.classList.add("gn-open");
    }
  }

  function closeChat() {
    isOpen = false;

    // Button → closed state (shows logo)
    btn.classList.remove("gn-open");

    // Show greeting bubble again
    if (bubble) {
      bubble.classList.remove("gn-hide");
    }

    // Hide iframe
    if (iframe) iframe.classList.remove("gn-open");
  }

  // ─── LISTEN FOR MESSAGES FROM IFRAME ───
  window.addEventListener("message", function (event) {
    if (event.origin !== WIDGET_URL.replace(/\/$/, "")) return;
    var data = event.data;
    if (!data || !data.type) return;

    if (data.type === "GN_CHAT_CLOSE") {
      closeChat();
    }
  });

  // ─── INIT ───
function init() {
  if (document.getElementById("gn-trigger")) return;
  injectStyles();
  createTrigger();
  createGreeting();
  createIframe(); 
}

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();