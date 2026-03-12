import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";

const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const socketURL = isLocal ? "http://localhost:5175" : "https://chat-app-backend-bflx.onrender.com";

console.log(`[ChatFlow] Connecting to socket at: ${socketURL}`);
const socket = io(socketURL, {
  transports: ['websocket', 'polling'],
  withCredentials: true
});

socket.on("connect", () => console.log("[ChatFlow] Socket connected:", socket.id));
socket.on("connect_error", (err) => console.error("[ChatFlow] Connection error:", err));

// ── Icons (inline SVG) ──────────────────────────────────────────────────────

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const ChatIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const UserIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const AgentIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

// ── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({ name, small }) {
  const initials = name ? name.slice(0, 2).toUpperCase() : "??";
  const size = small ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  return (
    <div
      className={`${size} rounded-full flex items-center justify-center font-semibold flex-shrink-0`}
      style={{
        background: "linear-gradient(135deg, #6366f1, #4f46e5)",
        color: "#fff",
        boxShadow: "0 2px 8px rgba(99,102,241,0.4)",
      }}
    >
      {initials}
    </div>
  );
}

// ── Message Bubble ──────────────────────────────────────────────────────────

function MessageBubble({ msg, isSelf, style }) {
  return (
    <div
      className={`flex items-end gap-2 animate-fade-in ${isSelf ? "justify-end" : "justify-start"}`}
      style={style}
    >
      {!isSelf && <Avatar name={msg.sender} small />}
      <div className={`flex flex-col gap-1 max-w-[70%] ${isSelf ? "items-end" : "items-start"}`}>
       
        <div
          className={`px-4 py-2.5 text-sm leading-relaxed ${isSelf ? "bubble-self" : "bubble-other"}`}
        >
          <p style={{padding:'8px'}}>{msg.message}</p>
        </div>
      </div>
      {isSelf && <Avatar name={msg.sender} small />}
    </div>
  );
}

// ── Empty State ─────────────────────────────────────────────────────────────

function EmptyMessages() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: "var(--text-muted)" }}>
      <div style={{
        width: 52, height: 52, borderRadius: "50%",
        background: "rgba(99,102,241,0.1)",
        border: "1px solid rgba(99,102,241,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#6366f1"
      }}>
        <ChatIcon />
      </div>
      <p className="text-sm font-medium">No messages yet</p>
      <p className="text-xs text-center" style={{ maxWidth: 160 }}>
        Send the first message to get the conversation started
      </p>
    </div>
  );
}

// ── Label ───────────────────────────────────────────────────────────────────

function Label({ children }) {
  return (
    <label className="block text-xs font-semibold mb-1.5 tracking-wide uppercase" style={{ color: "var(--text-muted)" }}>
      {children}
    </label>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function Chat() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("customer");
  const [room, setRoom] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [noAgentNotice, setNoAgentNotice] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket.on("joined-room", ({ room }) => {
      setRoom(room);
      setIsConnecting(false);
    });

    socket.on("chat-message", ({ sender, message }) => {
      setMessages((prev) => [...prev, { sender, message }]);
    });

    socket.on("no-customers", () => {
      setNoAgentNotice(false);
      setIsConnecting(false);
      alert("No customers waiting in queue.");
    });

    return () => {
      socket.off("joined-room");
      socket.off("chat-message");
      socket.off("no-customers");
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const joinChat = () => {
    if (!name.trim()) return alert("Please enter your name to continue.");
    setIsConnecting(true);
    if (role === "customer") {
      console.log('custom');
      
      socket.emit("customer-join", { name });
    } else {
      console.log('agent');
      socket.emit("agent-join", { name });
    }
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    socket.emit("chat-message", { room, sender: name, message });
    setMessage("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Join Screen ─────────────────────────────────────────────────────────

  if (!room) {
    return (
      <div
        className="min-h-dvh flex flex-col items-center justify-center p-4"
        style={{ gap: "0" }}
      >
        {/* Brand mark */}
        <div className="animate-fade-slide mb-8 flex flex-col items-center gap-3" style={{ animationDelay: "0ms" }}>
          <div style={{
            width: 64, height: 64, borderRadius: "18px",
            background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 32px rgba(99,102,241,0.5)",
            color: "#fff"
          }}>
            <ChatIcon />
          </div>
          <div className="text-center mb-3">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Chat App
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              Real-time support, instantly
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          className="glass-card w-full animate-fade-slide"
          style={{ maxWidth: 400, padding: "32px 28px", animationDelay: "80ms" }}
        >
          <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            Join a session
          </h2>

          <div className="flex flex-col gap-5">
            <div>
              <Label>Your name</Label>
              <input
                type="text"
                placeholder="Enter name..."
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && joinChat()}
              />
            </div>

            <div>
              <Label>Joining as</Label>
              <select
                className="select-field"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="customer">Customer</option>
                <option value="agent">Support Agent</option>
              </select>

              <div className="mt-2.5 flex gap-2">
                {/* <span className={`role-badge ${role}`}>
                  {role === "customer" ? <UserIcon /> : <AgentIcon />}
                  {role === "customer" ? "Customer" : "Agent"}
                </span> */}
                <span className="text-xs self-center" style={{ color: "var(--text-muted)" }}>
                  {role === "customer"
                    ? "You'll be matched with an available agent"
                    : "Pick up the next waiting customer"}
                </span>
              </div>
            </div>

            <button
              className="btn-primary mt-1"
              onClick={joinChat}
              disabled={isConnecting}
              style={isConnecting ? { opacity: 0.7, cursor: "not-allowed" } : {}}
            >
              {isConnecting ? "Connecting…" : "Join Chat →"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-xs animate-fade-slide" style={{ color: "var(--text-muted)", animationDelay: "160ms" }}>
          Secure · End-to-End · Instant
        </p>
      </div>
    );
  }

  // ── Chat Screen ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4">
      <div
        className="glass-card w-full flex flex-col animate-fade-slide"
        style={{ maxWidth: 520, height: "min(680px, 90dvh)", padding: '3px', overflow: "hidden" }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{
            borderBottom: "1px solid var(--border-subtle)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: "12px",
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", boxShadow: "0 4px 12px rgba(99,102,241,0.4)"
          }}>
            <ChatIcon />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                Live Support
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="online-dot" />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Connected</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto scrollbar-hidden"
          style={{ display: "flex", padding:'10px', flexDirection: "column", gap: "12px" }}
        >
          {messages.length === 0 ? (
            <EmptyMessages />
          ) : (
            messages.map((msg, idx) => (
              <MessageBubble
                key={idx}
                msg={msg}
                isSelf={msg.sender === name}
                style={{ animationDelay: `${Math.min(idx * 30, 200)}ms` }}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div
          className="px-4 py-3"
          style={{
            borderTop: "1px solid var(--border-subtle)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Type a message…"
              className="input-field"
              style={{ flex: 1, padding: "12px 16px", fontSize: "0.9rem" }}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className="btn-send"
              onClick={sendMessage}
              disabled={!message.trim()}
              style={!message.trim() ? { opacity: 0.5, cursor: "not-allowed" } : {}}
            >
              <SendIcon />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}
