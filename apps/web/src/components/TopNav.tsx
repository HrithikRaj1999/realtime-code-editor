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
  setTheme: (theme: string) => void;
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
  setTheme,
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
    toast.success("Room ID copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareRoom = () => {
    const url = `${window.location.origin}/editor/${roomId}`;
    navigator.clipboard.writeText(url);
    toast.success("Room link copied to clipboard!");
  };

  return (
    <nav className="h-14 border-b border-white/10 bg-[#0a0a0a] flex items-center justify-between px-4 gap-4 min-w-0">
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-purple-600 to-blue-600 rounded-md">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white hidden sm:block">
            CodeStream
          </span>
        </div>

        {/* Connection indicator */}
        <div className="flex items-center gap-1.5">
          {connected ? (
            <Wifi className="w-3 h-3 text-green-500" />
          ) : (
            <WifiOff className="w-3 h-3 text-red-500" />
          )}
        </div>

        {/* Room ID Display & Copy */}
        <div className="hidden sm:flex items-center gap-2 bg-[#1e1e1e] px-3 py-1.5 rounded-md border border-white/10 group hover:border-purple-500/30 transition-colors">
          <span className="text-xs text-gray-400 font-mono">ID: {roomId.slice(0, 8)}...</span>
          <button
            onClick={copyRoomId}
            className="text-gray-500 hover:text-white transition-colors"
            title="Copy Room ID"
          >
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Participants */}
        <div className="hidden md:block">
          <ParticipantsList participants={participants} />
        </div>

        <div className="hidden md:block h-4 w-[1px] bg-white/10 mx-2" />

        {/* Language Selector */}
        <div className="relative group hidden sm:block">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="appearance-none bg-[#1e1e1e] border border-white/10 rounded-md px-3 py-1.5 text-xs font-medium text-gray-300 outline-none focus:ring-1 focus:ring-purple-500/50 hover:bg-[#252525] transition-colors cursor-pointer w-32"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="go">Go</option>
          </select>
        </div>

        {onFormat && (
          <button
            onClick={onFormat}
            disabled={isFormatting || isRunning}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all border ${
              isFormatting || isRunning
                ? "bg-slate-500/10 text-slate-400 border-slate-500/20 cursor-not-allowed"
                : "bg-indigo-600 text-white hover:bg-indigo-500 border-indigo-500"
            }`}
            title="Format code"
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
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all shadow-lg hover:shadow-green-500/20 active:scale-95
            ${
              isRunning
                ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 cursor-not-allowed"
                : "bg-green-600 text-white hover:bg-green-500 border border-green-500"
            }`}
        >
          <Play className={`w-3.5 h-3.5 ${isRunning ? "animate-spin" : "fill-current"}`} />
          <span className="hidden sm:inline">{isRunning ? "Running..." : "Run Code"}</span>
          <span className="sm:hidden">{isRunning ? "Run..." : "Run"}</span>
        </button>

        <div className="hidden sm:block h-4 w-[1px] bg-white/10 mx-1" />

        {/* Action Buttons */}
        <button
          onClick={shareRoom}
          className="p-2 rounded-md hover:bg-[#1e1e1e] text-gray-400 hover:text-white transition-colors"
          title="Share room link"
        >
          <Share2 className="w-4 h-4" />
        </button>

        {onToggleChat && (
          <button
            onClick={onToggleChat}
            className="hidden md:inline-flex p-2 rounded-md hover:bg-[#1e1e1e] text-gray-400 hover:text-purple-400 transition-colors"
            title="Toggle Chat"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        )}

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-md hover:bg-[#1e1e1e] text-gray-400 hover:text-yellow-400 transition-colors"
        >
          {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* User Avatar */}
        <div className="hidden lg:block w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 ml-2 shadow-inner ring-1 ring-white/10" />
      </div>
    </nav>
  );
}
