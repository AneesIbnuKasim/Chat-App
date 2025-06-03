import { useEffect, useState, useRef, useContext } from "react";
import io from "socket.io-client";
const socket = io("http://localhost:5174");

export default function Chat() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("customer");
  const [room, setRoom] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null)

  useEffect(() => {
    socket.on("joined-room", ({ room }) => {
      setRoom(room);
    });

    socket.on("chat-message", ({ sender, message }) => {
      setMessages((prev) => [...prev, { sender, message }]);
      
    });

    socket.on("no-customers", () => {
      alert("No customers waiting.");
    });

    return () => {
      socket.off("joined-room");
      socket.off("chat-message");
      socket.off("no-customers");
    };
  }, []);

   // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const joinChat = () => {
    if (!name) return alert("Enter your name");
    if (role === "customer") {
      socket.emit("customer-join", { name });
    } else {
      socket.emit("agent-join", { name });
    }
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    socket.emit("chat-message", { room, sender: name, message });
    setMessage("");
  };

  return (
    <div className="flex items-center min-h-[70vh]">
    <div className="max-w-md mx-auto p-4 border rounded shadow">
      {!room ? (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Your name"
            className="border p-2 w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            className="border p-2 w-full"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="customer">Customer</option>
            <option value="agent">Agent</option>
          </select>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={joinChat}
          >
            Join Chat
          </button>
        </div>
        
      ) : (
        <div >
          <div className="h-64 overflow-y-scroll scrollbar-hidden border p-2 mb-4 ">
            {messages.map((msg, indx) => {
              const isSender = msg.sender === name;
              return (
                <div
                  key={indx}
                  className={`mb-2 flex ${
                    isSender ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`px-3 py-2 rounded-lg max-w-[75%] ${
                      isSender
                        ? "bg-green-200 text-right self-end"
                        : "bg-gray-200 text-left self-start"
                    }`}
                  >
                    <div className="text-sm font-semibold mb-1">
                      {msg.sender}
                    </div>
                    <div>{msg.message}</div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type a message"
              className="border p-2 flex-1"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              className="bg-green-500 text-white px-4 py-2 rounded"
              onClick={sendMessage}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
