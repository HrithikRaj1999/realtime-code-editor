import { Code2, Loader2, MessageSquare, SquareTerminal } from "lucide-react";
import { ChatPanel } from "../../../components/ChatPanel";
import { CodeEditor, type FormatResult } from "../../../components/CodeEditorV2";
import { OutputPanel } from "../../../components/OutputPanel";
import { PanelHeader } from "./PanelHeader";
import { ZoomControls } from "./ZoomControls";
import type { MobileTab } from "../types";

interface ChatMessage {
  socketId: string;
  username: string;
  message: string;
  timestamp: number;
}

interface MobileWorkspaceProps {
  activeTab: MobileTab;
  language: string;
  code: string;
  output: string;
  username: string;
  theme: string;
  isRunning: boolean;
  formatSignal: number;
  editorFontSize: number;
  consoleFontSize: number;
  chatMessages: ChatMessage[];
  onCodeChange: (code: string) => void;
  onFormatComplete: (result: FormatResult) => void;
  onZoomEditorIn: () => void;
  onZoomEditorOut: () => void;
  onZoomConsoleIn: () => void;
  onZoomConsoleOut: () => void;
  onClearOutput: () => void;
  onSendChatMessage: (message: string) => void;
}

export function MobileWorkspace({
  activeTab,
  language,
  code,
  output,
  username,
  theme,
  isRunning,
  formatSignal,
  editorFontSize,
  consoleFontSize,
  chatMessages,
  onCodeChange,
  onFormatComplete,
  onZoomEditorIn,
  onZoomEditorOut,
  onZoomConsoleIn,
  onZoomConsoleOut,
  onClearOutput,
  onSendChatMessage,
}: MobileWorkspaceProps) {
  return (
    <div className="h-full flex flex-col">
      {activeTab === "code" ? (
        <>
          <PanelHeader
            icon={<Code2 className="w-3.5 h-3.5 text-blue-400" />}
            label="Editor"
            right={
              <ZoomControls size={editorFontSize} onIn={onZoomEditorIn} onOut={onZoomEditorOut} />
            }
          />
          <div className="flex-1 min-h-0">
            <CodeEditor
              code={code}
              setCode={onCodeChange}
              language={language}
              fontSize={editorFontSize}
              theme={theme}
              formatSignal={formatSignal}
              onFormatComplete={onFormatComplete}
            />
          </div>
        </>
      ) : null}

      {activeTab === "console" ? (
        <>
          <PanelHeader
            icon={<SquareTerminal className="w-3.5 h-3.5 text-green-500" />}
            label="Console"
            right={
              <>
                {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" /> : null}
                <ZoomControls
                  size={consoleFontSize}
                  onIn={onZoomConsoleIn}
                  onOut={onZoomConsoleOut}
                />
              </>
            }
          />
          <div className="flex-1 min-h-0">
            <OutputPanel
              output={output}
              loading={isRunning}
              onClear={onClearOutput}
              fontSize={consoleFontSize}
            />
          </div>
        </>
      ) : null}

      {activeTab === "chat" ? (
        <>
          <PanelHeader
            icon={<MessageSquare className="w-3.5 h-3.5 text-[var(--accent)]" />}
            label="Chat"
          />
          <div className="flex-1 min-h-0">
            <ChatPanel messages={chatMessages} onSend={onSendChatMessage} username={username} />
          </div>
        </>
      ) : null}
    </div>
  );
}
