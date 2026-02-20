import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";

interface ChatMessage {
  socketId: string;
  username: string;
  message: string;
  timestamp: number;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  username: string;
}

export function ChatPanel({ messages, onSend, username }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSend(input.trim());
      setInput("");
    }
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {messages.length === 0 && (
          <div className="text-center text-gray-600 text-xs italic py-8">
            No messages yet. Start the conversation!
          </div>
        )}
        {messages.map((msg, i) => {
          const isOwn = msg.username === username;
          return (
            <div key={i} className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-medium text-gray-500">
                  {isOwn ? "You" : msg.username}
                </span>
                <span className="text-[10px] text-gray-600">{formatTime(msg.timestamp)}</span>
              </div>
              <div
                className={`px-3 py-2 rounded-xl text-sm max-w-[85%] ${
                  isOwn
                    ? "bg-purple-600/20 text-purple-200 rounded-br-sm"
                    : "bg-white/5 text-gray-300 rounded-bl-sm"
                }`}
              >
                {msg.message}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-white/10 p-2 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-purple-500/50 placeholder:text-gray-600"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="p-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </form>
    </div>
  );
}
