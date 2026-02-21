import { useState, useRef, useEffect, memo } from "react";
import { Send, MessageCircle } from "lucide-react";

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

export const ChatPanel = memo(function ChatPanel({ messages, onSend, username }: ChatPanelProps) {
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

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)] theme-transition">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-[var(--text-faint)]">
            <div className="w-12 h-12 rounded-xl bg-[var(--bg-hover)] flex items-center justify-center">
              <MessageCircle className="w-6 h-6 opacity-40" />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-medium text-[var(--text-muted)]">No messages yet</p>
              <p className="text-[11px] mt-1 text-[var(--text-faint)]">
                Start a conversation with your team
              </p>
            </div>
          </div>
        )}
        {messages.map((msg, i) => {
          const isOwn = msg.username === username;
          return (
            <div key={i} className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] font-medium text-[var(--text-muted)]">
                  {isOwn ? "You" : msg.username}
                </span>
                <span className="text-[10px] text-[var(--text-faint)]">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
              <div
                className={`px-3 py-2 rounded-xl text-[13px] max-w-[85%] leading-relaxed ${
                  isOwn ? "rounded-br-sm" : "rounded-bl-sm"
                }`}
                style={{
                  backgroundColor: isOwn ? "var(--chat-own)" : "var(--chat-other)",
                  color: isOwn ? "var(--chat-own-text)" : "var(--chat-other-text)",
                }}
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
        className="border-t border-[var(--border)] p-2 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--border-accent)] focus:ring-1 focus:ring-[var(--accent)]/30 placeholder:text-[var(--text-faint)] transition-all theme-transition"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="p-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-25 disabled:cursor-not-allowed transition-all shadow-sm shadow-[var(--accent)]/10"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </form>
    </div>
  );
});
