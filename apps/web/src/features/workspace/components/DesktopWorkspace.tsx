import { Loader2, MessageSquare, SquareTerminal } from "lucide-react";
import type { MouseEvent } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { ChatPanel } from "../../../components/ChatPanel";
import { OutputPanel } from "../../../components/OutputPanel";
import type { FormatResult } from "../../../components/CodeEditorV2";
import { EditorColumn } from "./EditorColumn";
import { PanelHeader } from "./PanelHeader";
import { ZoomControls } from "./ZoomControls";

interface ChatMessage {
  socketId: string;
  username: string;
  message: string;
  timestamp: number;
}

interface DesktopWorkspaceProps {
  roomId: string;
  language: string;
  code: string;
  output: string;
  username: string;
  theme: string;
  showChat: boolean;
  showNotes: boolean;
  isRunning: boolean;
  formatSignal: number;
  editorFontSize: number;
  consoleFontSize: number;
  notesHeight: number;
  chatMessages: ChatMessage[];
  onCodeChange: (code: string) => void;
  onFormatComplete: (result: FormatResult) => void;
  onToggleChat: () => void;
  onToggleNotes: () => void;
  onDragStart: (event: MouseEvent) => void;
  onZoomEditorIn: () => void;
  onZoomEditorOut: () => void;
  onZoomConsoleIn: () => void;
  onZoomConsoleOut: () => void;
  onClearOutput: () => void;
  onSendChatMessage: (message: string) => void;
}

export function DesktopWorkspace({
  roomId,
  language,
  code,
  output,
  username,
  theme,
  showChat,
  showNotes,
  isRunning,
  formatSignal,
  editorFontSize,
  consoleFontSize,
  notesHeight,
  chatMessages,
  onCodeChange,
  onFormatComplete,
  onToggleChat,
  onToggleNotes,
  onDragStart,
  onZoomEditorIn,
  onZoomEditorOut,
  onZoomConsoleIn,
  onZoomConsoleOut,
  onClearOutput,
  onSendChatMessage,
}: DesktopWorkspaceProps) {
  return (
    <Group orientation="horizontal" className="h-full">
      <Panel defaultSize={65} minSize={35} className="overflow-hidden">
        <EditorColumn
          roomId={roomId}
          language={language}
          code={code}
          theme={theme}
          fontSize={editorFontSize}
          formatSignal={formatSignal}
          showNotes={showNotes}
          notesHeight={notesHeight}
          onCodeChange={onCodeChange}
          onFormatComplete={onFormatComplete}
          onToggleNotes={onToggleNotes}
          onDragStart={onDragStart}
          onZoomIn={onZoomEditorIn}
          onZoomOut={onZoomEditorOut}
        />
      </Panel>

      <Separator className="w-[3px] bg-[var(--border)] hover:bg-[var(--accent)] active:bg-[var(--accent)] transition-colors cursor-col-resize" />

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
                {!showChat ? (
                  <>
                    {isRunning ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)] mr-1" />
                    ) : null}
                    <ZoomControls
                      size={consoleFontSize}
                      onIn={onZoomConsoleIn}
                      onOut={onZoomConsoleOut}
                    />
                    <div className="w-px h-4 bg-[var(--border)]" />
                  </>
                ) : null}
                <button
                  onClick={onToggleChat}
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
              <ChatPanel messages={chatMessages} onSend={onSendChatMessage} username={username} />
            ) : (
              <OutputPanel
                output={output}
                loading={isRunning}
                onClear={onClearOutput}
                fontSize={consoleFontSize}
              />
            )}
          </div>
        </div>
      </Panel>
    </Group>
  );
}
