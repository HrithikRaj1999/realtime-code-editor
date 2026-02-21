import {
  Play,
  Code2,
  Moon,
  Sun,
  Share2,
  Copy,
  Check,
  MessageSquare,
  Wifi,
  WifiOff,
  WandSparkles,
  Loader2,
  ChevronDown,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { ParticipantsList } from "./ParticipantsList";

interface Participant {
  socketId: string;
  username: string;
}

export interface TopNavProps {
  language: string;
  setLanguage: (lang: string) => void;
  isRunning: boolean;
  onRun: () => void;
  theme: string;
  toggleTheme: () => void;
  roomId?: string;
  participants?: Participant[];
  connected?: boolean;
  typingUser?: string | null;
  onToggleChat?: () => void;
  onFormat?: () => void;
  isFormatting?: boolean;
}

export function TopNav({
  language,
  setLanguage,
  isRunning,
  onRun,
  theme,
  toggleTheme,
  roomId = "demo-room",
  participants = [],
  connected = false,
  typingUser = null,
  onToggleChat,
  onFormat,
  isFormatting = false,
}: TopNavProps) {
  const [copied, setCopied] = useState(false);

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    toast.success("Room ID copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareRoom = () => {
    const url = `${window.location.origin}/editor/${roomId}`;
    navigator.clipboard.writeText(url);
    toast.success("Room link copied!");
  };

  return (
    <nav className="h-12 border-b border-[var(--border)] bg-[var(--bg-primary)] flex items-center justify-between px-3 gap-3 min-w-0 theme-transition">
      {/* ── Left section ─────────────────────── */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-500/15">
            <Code2 className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-[13px] tracking-tight text-[var(--text-primary)] hidden sm:block">
            CodeStream
          </span>
        </div>

        {/* Divider */}
        <div className="hidden sm:block h-4 w-px bg-[var(--border)]" />

        {/* Connection + Room ID */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px]">
            {connected ? (
              <Wifi className="w-3 h-3 text-emerald-400" />
            ) : (
              <WifiOff className="w-3 h-3 text-red-400" />
            )}
            <span className={`font-medium ${connected ? "text-emerald-400" : "text-red-400"}`}>
              {connected ? "Live" : "Offline"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-[var(--bg-input)] px-2.5 py-1 rounded-md border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors">
            <span className="text-[11px] text-[var(--text-muted)] font-mono">
              {roomId.slice(0, 8)}…
            </span>
            <button
              onClick={copyRoomId}
              className="text-[var(--text-faint)] hover:text-[var(--accent)] transition-colors"
              title="Copy Room ID"
            >
              {copied ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>

        {/* Participants */}
        <div className="hidden lg:block">
          <ParticipantsList participants={participants} />
        </div>
      </div>

      {/* ── Right section ────────────────────── */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Language Selector */}
        <div className="relative hidden sm:flex items-center">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="appearance-none bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-1.5 pr-7 text-[12px] font-medium text-[var(--text-secondary)] outline-none hover:border-[var(--border-hover)] focus:ring-1 focus:ring-[var(--accent)]/40 transition-all cursor-pointer"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="go">Go</option>
          </select>
          <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-faint)] pointer-events-none" />
        </div>

        {/* Format */}
        {onFormat && (
          <button
            onClick={onFormat}
            disabled={isFormatting || isRunning}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border ${
              isFormatting || isRunning
                ? "bg-[var(--bg-input)] text-[var(--text-faint)] border-[var(--border)] cursor-not-allowed opacity-50"
                : "bg-indigo-600/90 text-white hover:bg-indigo-500 border-indigo-500/60 shadow-sm shadow-indigo-500/10"
            }`}
            title="Format code (Shift+Alt+F)"
          >
            {isFormatting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <WandSparkles className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Format</span>
          </button>
        )}

        {/* Run Button */}
        <button
          onClick={onRun}
          disabled={isRunning}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all shadow-sm active:scale-[0.97] ${
            isRunning
              ? "bg-amber-500/12 text-amber-400 border border-amber-500/25 cursor-not-allowed"
              : "bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-500/60 shadow-emerald-500/15"
          }`}
        >
          {isRunning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
          <span className="hidden sm:inline">{isRunning ? "Running…" : "Run Code"}</span>
          <span className="sm:hidden">{isRunning ? "…" : "Run"}</span>
        </button>

        <div className="hidden sm:block h-4 w-px bg-[var(--border)]" />

        {/* Action icon buttons */}
        <button
          onClick={shareRoom}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
          title="Share room link"
        >
          <Share2 className="w-4 h-4" />
        </button>

        {onToggleChat && (
          <button
            onClick={onToggleChat}
            className="hidden md:inline-flex p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
            title="Toggle Chat"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-amber-400 transition-colors"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* User avatar */}
        <div className="hidden lg:flex w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-500 items-center justify-center shadow-sm ring-1 ring-[var(--border)]">
          <User className="w-3.5 h-3.5 text-white" />
        </div>
      </div>
    </nav>
  );
}
