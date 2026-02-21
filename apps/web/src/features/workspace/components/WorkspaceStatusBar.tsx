import { Clock, Users, Wifi, WifiOff } from "lucide-react";
import { SessionTimer } from "../../../components/SessionTimer";
import { StatusDot } from "./StatusDot";

interface WorkspaceStatusBarProps {
  connected: boolean;
  isRunning: boolean;
  typingUser: string | null;
  participantsCount: number;
  language: string;
}

export function WorkspaceStatusBar({
  connected,
  isRunning,
  typingUser,
  participantsCount,
  language,
}: WorkspaceStatusBarProps) {
  return (
    <div className="h-7 bg-[var(--bg-secondary)] border-t border-[var(--border)] flex items-center px-3 justify-between shrink-0 theme-transition">
      <div className="flex items-center gap-4">
        <StatusDot connected={connected} isRunning={isRunning} />
        {typingUser ? (
          <span className="text-[10px] text-[var(--accent)] italic animate-pulse hidden sm:block">
            {typingUser} is typing...
          </span>
        ) : null}
        <span className="hidden md:flex items-center gap-1 text-[10px] text-[var(--text-faint)]">
          <Users className="w-3 h-3" />
          {participantsCount} online
        </span>
      </div>

      <div className="flex items-center gap-3 text-[10px] text-[var(--text-faint)]">
        <span className="hidden sm:flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <SessionTimer />
        </span>
        <span className="hidden sm:block text-[var(--text-muted)] font-medium capitalize">
          {language}
        </span>
        <span className="hidden md:block">LF - UTF-8</span>
        {connected ? (
          <Wifi className="w-3 h-3 text-emerald-500" />
        ) : (
          <WifiOff className="w-3 h-3 text-red-500" />
        )}
      </div>
    </div>
  );
}
