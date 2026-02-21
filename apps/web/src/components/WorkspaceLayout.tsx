import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Group, Panel, Separator } from "react-resizable-panels";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  Loader2,
  Code2,
  MessageSquare,
  StickyNote,
  ZoomIn,
  ZoomOut,
  Wifi,
  WifiOff,
  Clock,
  Users,
  SquareTerminal,
  GripHorizontal,
} from "lucide-react";
import { TopNav } from "./TopNav";
import { CodeEditor, type FormatResult } from "./CodeEditorV2";
import { OutputPanel } from "./OutputPanel";
import { ChatPanel } from "./ChatPanel";
import { SessionTimer } from "./SessionTimer";
import { NotesPanel } from "./NotesPanel";
import { useSocket } from "../hooks/useSocket";
import { CODE_TEMPLATES } from "../lib/codeTemplates";
import { SeoHead } from "./SeoHead";
import { useTheme } from "../context/ThemeContext";

type MobileTab = "code" | "console" | "chat";
type LocationState = { username?: string } | null;

const FONT_SIZE_MIN = 10;
const FONT_SIZE_MAX = 24;
const FONT_SIZE_DEFAULT = 13;
const NOTES_DEFAULT_HEIGHT = 200; // px
const NOTES_MIN_HEIGHT = 80;
const NOTES_MAX_HEIGHT = 600;

// ─── Reusable sub-components ─────────────────────────────────────

function ZoomControls({
  size,
  onIn,
  onOut,
}: {
  size: number;
  onIn: () => void;
  onOut: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-[var(--border)] bg-[var(--bg-input)] px-0.5">
      <button
        onClick={onOut}
        className="p-1 text-[var(--text-faint)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-colors"
        title="Zoom out"
      >
        <ZoomOut className="w-3.5 h-3.5" />
      </button>
      <span className="w-6 text-center text-[10px] font-mono text-[var(--text-faint)] select-none">
        {size}
      </span>
      <button
        onClick={onIn}
        className="p-1 text-[var(--text-faint)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-colors"
        title="Zoom in"
      >
        <ZoomIn className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function PanelHeader({
  icon,
  label,
  right,
}: {
  icon: React.ReactNode;
  label: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="h-9 flex items-center justify-between px-3 border-b border-[var(--border)] bg-[var(--bg-secondary)] shrink-0 theme-transition">
      <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
        {icon}
        {label}
      </span>
      {right && <div className="flex items-center gap-1.5">{right}</div>}
    </div>
  );
}

// ─── Custom drag-to-resize hook for notes height ──────────────────
function useNotesResize(initialHeight: number) {
  const [notesHeight, setNotesHeight] = useState(initialHeight);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(initialHeight);

  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startY.current = e.clientY;
      startH.current = notesHeight;

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        // Dragging UP increases notes height (handle is at the top of notes)
        const delta = startY.current - ev.clientY;
        const next = Math.min(NOTES_MAX_HEIGHT, Math.max(NOTES_MIN_HEIGHT, startH.current + delta));
        setNotesHeight(next);
      };
      const onMouseUp = () => {
        dragging.current = false;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [notesHeight],
  );

  return { notesHeight, setNotesHeight, onDragStart };
}

// ─── Main component ────────────────────────────────────────────

export default function WorkspaceLayout() {
  const { roomId } = useParams();
  const activeRoomId = roomId || "demo-room";
  const location = useLocation();
  const username = (location.state as LocationState)?.username || "Anonymous";
  const { theme, toggleTheme } = useTheme();

  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(CODE_TEMPLATES.javascript);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [formatSignal, setFormatSignal] = useState(0);
  const [mobileTab, setMobileTab] = useState<MobileTab>("code");
  const [showChat, setShowChat] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [editorFontSize, setEditorFontSize] = useState(FONT_SIZE_DEFAULT);
  const [consoleFontSize, setConsoleFontSize] = useState(FONT_SIZE_DEFAULT);
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true,
  );
  const codeRef = useRef(code);
  const { notesHeight, onDragStart } = useNotesResize(NOTES_DEFAULT_HEIGHT);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const zoomEditorIn = () => setEditorFontSize((s) => Math.min(s + 1, FONT_SIZE_MAX));
  const zoomEditorOut = () => setEditorFontSize((s) => Math.max(s - 1, FONT_SIZE_MIN));
  const zoomConsoleIn = () => setConsoleFontSize((s) => Math.min(s + 1, FONT_SIZE_MAX));
  const zoomConsoleOut = () => setConsoleFontSize((s) => Math.max(s - 1, FONT_SIZE_MIN));

  const handleRemoteCodeChange = useCallback((remoteCode: string) => setCode(remoteCode), []);

  const handleOutputChange = useCallback((data: { output: string; status: string }) => {
    if (data && typeof data.output === "string") setOutput(data.output);
    if (data?.status === "completed" || data?.status === "failed") setIsRunning(false);
  }, []);

  const {
    participants,
    connected,
    chatMessages,
    typingUser,
    sendCodeChange,
    sendTyping,
    sendChatMessage,
  } = useSocket({
    roomId: activeRoomId,
    username,
    onCodeChange: handleRemoteCodeChange,
    onOutputChange: handleOutputChange,
  });

  const handleLanguageChange = useCallback(
    (newLanguage: string) => {
      setLanguage(newLanguage);
      const template = CODE_TEMPLATES[newLanguage] || CODE_TEMPLATES.javascript;
      setCode(template);
      sendCodeChange(template);
    },
    [sendCodeChange],
  );

  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode);
      sendCodeChange(newCode);
      sendTyping();
    },
    [sendCodeChange, sendTyping],
  );

  const handleRun = async () => {
    setIsRunning(true);
    setOutput("Submitting code...\n");
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const resp = await axios.post(`${apiUrl}/run`, {
        language,
        code: codeRef.current,
        roomId: activeRoomId,
      });
      if (resp.data.status === "queued") setOutput("Job queued, waiting for execution...\n");
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || "Execution failed";
      setOutput(msg);
      toast.error("Code execution failed");
      setIsRunning(false);
    }
  };

  const handleFormat = useCallback(() => {
    if (isFormatting || isRunning) return;
    setIsFormatting(true);
    setFormatSignal((prev) => prev + 1);
  }, [isFormatting, isRunning]);

  const handleFormatComplete = useCallback((result: FormatResult) => {
    setIsFormatting(false);
    if (!result.ok) {
      toast.error(result.message || "Formatting failed");
      return;
    }
    toast(result.changed ? "Code formatted ✨" : "Already formatted ✓", {
      icon: result.changed ? "✨" : "✓",
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && e.altKey && (e.key === "F" || e.key === "f")) {
        e.preventDefault();
        handleFormat();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "j") {
        e.preventDefault();
        setShowNotes((p) => !p);
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        zoomEditorIn();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "-") {
        e.preventDefault();
        zoomEditorOut();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleFormat]);

  // ─── Status dot ─────────────────────────────────────────────
  const StatusDot = () => (
    <div className="flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        {connected && !isRunning && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-40" />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${!connected ? "bg-red-500" : isRunning ? "bg-amber-400" : "bg-emerald-500"}`}
        />
      </span>
      <span
        className={`text-[10px] font-medium ${!connected ? "text-red-500" : isRunning ? "text-amber-400" : "text-emerald-500"}`}
      >
        {!connected ? "Offline" : isRunning ? "Running" : "Live"}
      </span>
    </div>
  );

  // ─── Mobile tabs ────────────────────────────────────────────
  const MobileTabs = () => (
    <div className="flex lg:hidden border-b border-[var(--border)] bg-[var(--bg-secondary)] theme-transition">
      {(["code", "console", "chat"] as MobileTab[]).map((tab) => {
        const Icon = tab === "code" ? Code2 : tab === "console" ? SquareTerminal : MessageSquare;
        return (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border-b-2 ${
              mobileTab === tab
                ? "text-[var(--accent)] border-[var(--accent)] bg-[var(--bg-badge)]"
                : "text-[var(--text-faint)] border-transparent hover:text-[var(--text-muted)]"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {tab}
          </button>
        );
      })}
    </div>
  );

  // ─── Left column: editor + resizable notes ──────────────────
  const EditorColumn = () => (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Editor Header */}
      <PanelHeader
        icon={<Code2 className="w-3.5 h-3.5 text-blue-400" />}
        label="Editor"
        right={
          <>
            <ZoomControls size={editorFontSize} onIn={zoomEditorIn} onOut={zoomEditorOut} />
            <div className="w-px h-4 bg-[var(--border)]" />
            <button
              onClick={() => setShowNotes((p) => !p)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border transition-all ${
                showNotes
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  : "bg-[var(--bg-input)] text-[var(--text-faint)] border-[var(--border)] hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/5"
              }`}
              title="Toggle Notes (Ctrl+J)"
            >
              <StickyNote className="w-3.5 h-3.5" />
              <span>Notes</span>
            </button>
          </>
        }
      />

      {/* Editor body — takes all remaining height */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <CodeEditor
          code={code}
          setCode={handleCodeChange}
          language={language}
          fontSize={editorFontSize}
          theme={theme}
          formatSignal={formatSignal}
          onFormatComplete={handleFormatComplete}
        />
      </div>

      {/* Notes — custom draggable resize, always in DOM */}
      <div
        className="flex-none overflow-hidden transition-[height] duration-200 ease-in-out"
        style={{ height: showNotes ? notesHeight : 0 }}
      >
        {/* Drag handle at top of notes */}
        <div
          onMouseDown={onDragStart}
          className="h-[6px] w-full flex items-center justify-center cursor-row-resize select-none group bg-[var(--border)] hover:bg-[var(--accent)] transition-colors"
          title="Drag to resize notes"
        >
          <GripHorizontal className="w-5 h-3 text-[var(--text-faint)] group-hover:text-[var(--accent)] opacity-60 group-hover:opacity-100 transition-all" />
        </div>

        {/* Notes content */}
        <div className="overflow-hidden" style={{ height: notesHeight - 6 }}>
          <NotesPanel roomId={activeRoomId} />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <SeoHead
        title="Live Coding Room | CodeStream"
        description="Collaborate in a real-time code editor room."
        canonicalPath="/"
        robots="noindex, nofollow, noarchive"
      />

      <div className="h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden theme-transition">
        <TopNav
          language={language}
          setLanguage={handleLanguageChange}
          isRunning={isRunning}
          onRun={handleRun}
          isFormatting={isFormatting}
          onFormat={handleFormat}
          theme={theme}
          toggleTheme={toggleTheme}
          roomId={activeRoomId}
          participants={participants}
          connected={connected}
          typingUser={typingUser}
          onToggleChat={() => setShowChat((p) => !p)}
        />

        {!isDesktop && <MobileTabs />}

        {/* ── Main workspace ───────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {isDesktop ? (
            <Group orientation="horizontal" className="h-full">
              {/* Left: editor + notes */}
              <Panel defaultSize={65} minSize={35} className="overflow-hidden">
                <EditorColumn />
              </Panel>

              {/* Horizontal divider (left ↔ right) */}
              <Separator className="w-[3px] bg-[var(--border)] hover:bg-[var(--accent)] active:bg-[var(--accent)] transition-colors cursor-col-resize" />

              {/* Right: console / chat */}
              <Panel defaultSize={35} minSize={22}>
                <div className="h-full flex flex-col bg-[var(--bg-secondary)] theme-transition">
                  <PanelHeader
                    icon={
                      showChat ? (
                        <MessageSquare className="w-3.5 h-3.5 text-[var(--accent)]" />
                      ) : (
                        <SquareTerminal className="w-3.5 h-3.5 text-green-500" />
                      )
                    }
                    label={showChat ? "Chat" : "Console"}
                    right={
                      <>
                        {!showChat && (
                          <>
                            {isRunning && (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)] mr-1" />
                            )}
                            <ZoomControls
                              size={consoleFontSize}
                              onIn={zoomConsoleIn}
                              onOut={zoomConsoleOut}
                            />
                            <div className="w-px h-4 bg-[var(--border)]" />
                          </>
                        )}
                        <button
                          onClick={() => setShowChat((p) => !p)}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border transition-all ${
                            showChat
                              ? "bg-[var(--bg-input)] text-[var(--text-faint)] border-[var(--border)] hover:text-green-400 hover:border-green-500/30"
                              : "bg-[var(--bg-badge)] text-[var(--accent)] border-[var(--border-accent)] hover:bg-[var(--accent)]/10"
                          }`}
                          title={showChat ? "Switch to Console" : "Switch to Chat"}
                        >
                          {showChat ? (
                            <>
                              <SquareTerminal className="w-3.5 h-3.5" />
                              <span>Console</span>
                            </>
                          ) : (
                            <>
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Chat</span>
                            </>
                          )}
                        </button>
                      </>
                    }
                  />
                  <div className="flex-1 min-h-0 overflow-hidden">
                    {showChat ? (
                      <ChatPanel
                        messages={chatMessages}
                        onSend={sendChatMessage}
                        username={username}
                      />
                    ) : (
                      <OutputPanel
                        output={output}
                        loading={isRunning}
                        onClear={() => setOutput("")}
                        fontSize={consoleFontSize}
                      />
                    )}
                  </div>
                </div>
              </Panel>
            </Group>
          ) : (
            /* ── Mobile ─────────────────────────────────── */
            <div className="h-full flex flex-col">
              {mobileTab === "code" && (
                <>
                  <PanelHeader
                    icon={<Code2 className="w-3.5 h-3.5 text-blue-400" />}
                    label="Editor"
                    right={
                      <ZoomControls
                        size={editorFontSize}
                        onIn={zoomEditorIn}
                        onOut={zoomEditorOut}
                      />
                    }
                  />
                  <div className="flex-1 min-h-0">
                    <CodeEditor
                      code={code}
                      setCode={handleCodeChange}
                      language={language}
                      fontSize={editorFontSize}
                      theme={theme}
                      formatSignal={formatSignal}
                      onFormatComplete={handleFormatComplete}
                    />
                  </div>
                </>
              )}
              {mobileTab === "console" && (
                <>
                  <PanelHeader
                    icon={<SquareTerminal className="w-3.5 h-3.5 text-green-500" />}
                    label="Console"
                    right={
                      <>
                        {isRunning && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
                        )}
                        <ZoomControls
                          size={consoleFontSize}
                          onIn={zoomConsoleIn}
                          onOut={zoomConsoleOut}
                        />
                      </>
                    }
                  />
                  <div className="flex-1 min-h-0">
                    <OutputPanel
                      output={output}
                      loading={isRunning}
                      onClear={() => setOutput("")}
                      fontSize={consoleFontSize}
                    />
                  </div>
                </>
              )}
              {mobileTab === "chat" && (
                <>
                  <PanelHeader
                    icon={<MessageSquare className="w-3.5 h-3.5 text-[var(--accent)]" />}
                    label="Chat"
                  />
                  <div className="flex-1 min-h-0">
                    <ChatPanel
                      messages={chatMessages}
                      onSend={sendChatMessage}
                      username={username}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Status Bar ──────────────────────────────────── */}
        <div className="h-7 bg-[var(--bg-secondary)] border-t border-[var(--border)] flex items-center px-3 justify-between shrink-0 theme-transition">
          <div className="flex items-center gap-4">
            <StatusDot />
            {typingUser && (
              <span className="text-[10px] text-[var(--accent)] italic animate-pulse hidden sm:block">
                {typingUser} is typing…
              </span>
            )}
            <span className="hidden md:flex items-center gap-1 text-[10px] text-[var(--text-faint)]">
              <Users className="w-3 h-3" />
              {participants.length} online
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
            <span className="hidden md:block">LF · UTF-8</span>
            {connected ? (
              <Wifi className="w-3 h-3 text-emerald-500" />
            ) : (
              <WifiOff className="w-3 h-3 text-red-500" />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
