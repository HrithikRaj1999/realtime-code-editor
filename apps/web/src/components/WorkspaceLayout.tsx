import { useLocation, useParams } from "react-router-dom";
import { TopNav } from "./TopNav";
import { SeoHead } from "./SeoHead";
import { useTheme } from "../context/ThemeContext";
import {
  NOTES_DEFAULT_HEIGHT,
  NOTES_MAX_HEIGHT,
  NOTES_MIN_HEIGHT,
} from "../features/workspace/constants";
import { DesktopWorkspace } from "../features/workspace/components/DesktopWorkspace";
import { MobileTabs } from "../features/workspace/components/MobileTabs";
import { MobileWorkspace } from "../features/workspace/components/MobileWorkspace";
import { WorkspaceStatusBar } from "../features/workspace/components/WorkspaceStatusBar";
import { useWorkspaceController } from "../features/workspace/hooks/useWorkspaceController";
import { useNotesResize } from "../features/workspace/hooks/useNotesResize";
import { useWorkspaceShortcuts } from "../features/workspace/hooks/useWorkspaceShortcuts";
import type { LocationState } from "../features/workspace/types";

export default function WorkspaceLayout() {
  const { roomId } = useParams();
  const activeRoomId = roomId || "demo-room";
  const location = useLocation();
  const username = ((location.state as LocationState | null) || {}).username || "Anonymous";
  const { theme, toggleTheme } = useTheme();

  const {
    language,
    languageOptions,
    code,
    output,
    isRunning,
    isFormatting,
    formatSignal,
    mobileTab,
    showChat,
    showNotes,
    editorFontSize,
    consoleFontSize,
    isDesktop,
    participants,
    connected,
    chatMessages,
    typingUser,
    onLanguageChange,
    onCodeChange,
    runCode,
    triggerFormat,
    onFormatComplete,
    setMobileTab,
    toggleChat,
    toggleNotes,
    clearOutput,
    zoomEditorIn,
    zoomEditorOut,
    zoomConsoleIn,
    zoomConsoleOut,
    sendChatMessage,
  } = useWorkspaceController({
    roomId: activeRoomId,
    username,
  });

  const { notesHeight, onDragStart } = useNotesResize({
    initialHeight: NOTES_DEFAULT_HEIGHT,
    minHeight: NOTES_MIN_HEIGHT,
    maxHeight: NOTES_MAX_HEIGHT,
  });

  useWorkspaceShortcuts({
    onFormat: triggerFormat,
    onToggleNotes: toggleNotes,
    onEditorZoomIn: zoomEditorIn,
    onEditorZoomOut: zoomEditorOut,
  });

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
          setLanguage={onLanguageChange}
          languageOptions={languageOptions}
          isRunning={isRunning}
          onRun={runCode}
          isFormatting={isFormatting}
          onFormat={triggerFormat}
          theme={theme}
          toggleTheme={toggleTheme}
          roomId={activeRoomId}
          participants={participants}
          connected={connected}
          typingUser={typingUser}
          onToggleChat={toggleChat}
        />

        {!isDesktop ? <MobileTabs activeTab={mobileTab} onChange={setMobileTab} /> : null}

        <div className="flex-1 min-h-0 overflow-hidden">
          {isDesktop ? (
            <DesktopWorkspace
              roomId={activeRoomId}
              language={language}
              code={code}
              output={output}
              username={username}
              theme={theme}
              showChat={showChat}
              showNotes={showNotes}
              isRunning={isRunning}
              formatSignal={formatSignal}
              editorFontSize={editorFontSize}
              consoleFontSize={consoleFontSize}
              notesHeight={notesHeight}
              chatMessages={chatMessages}
              onCodeChange={onCodeChange}
              onFormatComplete={onFormatComplete}
              onToggleChat={toggleChat}
              onToggleNotes={toggleNotes}
              onDragStart={onDragStart}
              onZoomEditorIn={zoomEditorIn}
              onZoomEditorOut={zoomEditorOut}
              onZoomConsoleIn={zoomConsoleIn}
              onZoomConsoleOut={zoomConsoleOut}
              onClearOutput={clearOutput}
              onSendChatMessage={sendChatMessage}
            />
          ) : (
            <MobileWorkspace
              activeTab={mobileTab}
              language={language}
              code={code}
              output={output}
              username={username}
              theme={theme}
              isRunning={isRunning}
              formatSignal={formatSignal}
              editorFontSize={editorFontSize}
              consoleFontSize={consoleFontSize}
              chatMessages={chatMessages}
              onCodeChange={onCodeChange}
              onFormatComplete={onFormatComplete}
              onZoomEditorIn={zoomEditorIn}
              onZoomEditorOut={zoomEditorOut}
              onZoomConsoleIn={zoomConsoleIn}
              onZoomConsoleOut={zoomConsoleOut}
              onClearOutput={clearOutput}
              onSendChatMessage={sendChatMessage}
            />
          )}
        </div>

        <WorkspaceStatusBar
          connected={connected}
          isRunning={isRunning}
          typingUser={typingUser}
          participantsCount={participants.length}
          language={language}
        />
      </div>
    </>
  );
}
