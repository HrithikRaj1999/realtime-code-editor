import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Group, Panel, Separator } from "react-resizable-panels";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Loader2, Terminal, Code2, MessageSquare } from "lucide-react";
import { TopNav } from "./TopNav";
import { CodeEditor, type FormatResult } from "./CodeEditorV2";
import { OutputPanel } from "./OutputPanel";
import { ChatPanel } from "./ChatPanel";
import { SessionTimer } from "./SessionTimer";
import { useSocket } from "../hooks/useSocket";
import { CODE_TEMPLATES } from "../lib/codeTemplates";
import { SeoHead } from "./SeoHead";

type MobileTab = "code" | "console" | "chat";
type LocationState = { username?: string } | null;

export default function WorkspaceLayout() {
  const { roomId } = useParams();
  const activeRoomId = roomId || "demo-room";
  const location = useLocation();
  const username = (location.state as LocationState)?.username || "Anonymous";

  const [language, setLanguage] = useState("javascript");
  const [theme, setTheme] = useState("dark");
  const [code, setCode] = useState(CODE_TEMPLATES.javascript);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [formatSignal, setFormatSignal] = useState(0);
  const [mobileTab, setMobileTab] = useState<MobileTab>("code");
  const [showChat, setShowChat] = useState(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true,
  );
  const codeRef = useRef(code);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    const onResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleRemoteCodeChange = useCallback((remoteCode: string) => {
    setCode(remoteCode);
  }, []);

  const handleOutputChange = useCallback((data: { output: string; status: string }) => {
    if (data && typeof data.output === "string") {
      setOutput(data.output);
    }
    if (data?.status === "completed" || data?.status === "failed") {
      setIsRunning(false);
    }
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
      const response = await axios.post(`${apiUrl}/run`, {
        language,
        code: codeRef.current,
        roomId: activeRoomId,
      });

      if (response.data.status === "queued") {
        setOutput("Job queued, waiting for execution...\n");
      }
    } catch (error: any) {
      const serverError = error.response?.data?.error;
      const fallbackMessage = error.message || "Execution failed";
      const message =
        typeof serverError === "string" && serverError.length > 0 ? serverError : fallbackMessage;

      setOutput(message);
      toast.error("Code execution failed");
      setIsRunning(false);
    }
  };

  const handleFormat = useCallback(() => {
    if (isFormatting || isRunning) {
      return;
    }
    setIsFormatting(true);
    setFormatSignal((prev) => prev + 1);
  }, [isFormatting, isRunning]);

  const handleFormatComplete = useCallback((result: FormatResult) => {
    setIsFormatting(false);

    if (!result.ok) {
      toast.error(result.message || "Formatting failed");
      return;
    }

    if (result.changed) {
      toast.success("Code formatted");
    } else {
      toast("Code is already formatted", { icon: "i" });
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.shiftKey && event.altKey && (event.key === "F" || event.key === "f")) {
        event.preventDefault();
        handleFormat();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFormat]);

  const mobileTabButtons = (
    <div className="flex lg:hidden border-b border-white/[0.06] bg-[#111111]">
      {(["code", "console", "chat"] as MobileTab[]).map((tab) => (
        <button
          key={tab}
          onClick={() => setMobileTab(tab)}
          className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-all ${
            mobileTab === tab
              ? "text-purple-400 border-b-2 border-purple-500 bg-purple-500/5"
              : "text-gray-600 hover:text-gray-400"
          }`}
        >
          {tab === "code" && <Code2 className="w-3.5 h-3.5 inline mr-1.5" />}
          {tab === "console" && <Terminal className="w-3.5 h-3.5 inline mr-1.5" />}
          {tab === "chat" && <MessageSquare className="w-3.5 h-3.5 inline mr-1.5" />}
          {tab}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <SeoHead
        title="Live Coding Room | CodeStream"
        description="Collaborate in a real-time code editor room with synchronized editing, chat, and code execution."
        canonicalPath="/"
        robots="noindex, nofollow, noarchive"
      />

      <div className="h-screen flex flex-col bg-[#0a0a0a] text-gray-200 overflow-hidden font-sans selection:bg-purple-500/30">
        <TopNav
          language={language}
          setLanguage={handleLanguageChange}
          isRunning={isRunning}
          onRun={handleRun}
          isFormatting={isFormatting}
          onFormat={handleFormat}
          theme={theme}
          setTheme={setTheme}
          roomId={activeRoomId}
          participants={participants}
          connected={connected}
          typingUser={typingUser}
          onToggleChat={() => setShowChat((prev) => !prev)}
        />

        {!isDesktop && mobileTabButtons}

        <div className="flex-1 overflow-hidden relative">
          {isDesktop ? (
            <Group orientation="horizontal" className="h-full">
              <Panel defaultSize="68%" minSize="40%">
                <div className="h-full min-w-0 overflow-hidden bg-[#1e1e1e]">
                  <CodeEditor
                    code={code}
                    setCode={handleCodeChange}
                    language={language}
                    formatSignal={formatSignal}
                    onFormatComplete={handleFormatComplete}
                  />
                </div>
              </Panel>

              <Separator className="w-[3px] bg-[#1a1a1a] hover:bg-purple-500/60 active:bg-purple-500 transition-colors cursor-col-resize" />

              <Panel defaultSize="32%" minSize="24%">
                <div className="h-full min-w-0 overflow-hidden flex flex-col bg-[#0d0d0d] border-l border-white/[0.06]">
                  <div className="h-10 border-b border-white/[0.06] flex items-center px-4 justify-between shrink-0">
                    <span className="text-xs font-medium uppercase tracking-wider text-gray-500 flex items-center gap-2">
                      {showChat ? (
                        <>
                          <MessageSquare className="w-3.5 h-3.5 text-purple-400/80" />
                          Chat
                        </>
                      ) : (
                        <>
                          <Terminal className="w-3.5 h-3.5 text-green-500/70" />
                          Console
                        </>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      {isRunning && !showChat && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                      )}
                      <button
                        onClick={() => setShowChat((prev) => !prev)}
                        className={`p-1.5 rounded-md transition-all ${
                          showChat
                            ? "text-purple-400 bg-purple-500/10 ring-1 ring-purple-500/20"
                            : "text-gray-600 hover:text-gray-400 hover:bg-white/5"
                        }`}
                        title="Toggle Chat"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {showChat ? (
                    <div className="flex-1 overflow-hidden">
                      <ChatPanel messages={chatMessages} onSend={sendChatMessage} username={username} />
                    </div>
                  ) : (
                    <div className="flex-1 overflow-hidden">
                      <OutputPanel output={output} loading={isRunning} onClear={() => setOutput("")} />
                    </div>
                  )}
                </div>
              </Panel>
            </Group>
          ) : (
            <>
              {mobileTab === "code" && (
                <CodeEditor
                  code={code}
                  setCode={handleCodeChange}
                  language={language}
                  formatSignal={formatSignal}
                  onFormatComplete={handleFormatComplete}
                />
              )}
              {mobileTab === "console" && (
                <div className="h-full flex flex-col">
                  <OutputPanel output={output} loading={isRunning} onClear={() => setOutput("")} />
                </div>
              )}
              {mobileTab === "chat" && (
                <div className="h-full flex flex-col">
                  <ChatPanel messages={chatMessages} onSend={sendChatMessage} username={username} />
                </div>
              )}
            </>
          )}
        </div>

        <div className="h-7 bg-[#0d0d0d] border-t border-white/[0.06] flex items-center px-4 justify-between text-[10px] text-gray-600 select-none shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-full ${
                  connected
                    ? isRunning
                      ? "bg-amber-500 animate-pulse shadow-amber-500/50 shadow-sm"
                      : "bg-emerald-500 shadow-emerald-500/50 shadow-sm"
                    : "bg-red-500 shadow-red-500/50 shadow-sm"
                }`}
              />
              <span
                className={
                  connected
                    ? isRunning
                      ? "text-amber-500/80"
                      : "text-emerald-500/80"
                    : "text-red-500/80"
                }
              >
                {connected ? (isRunning ? "Running" : "Connected") : "Disconnected"}
              </span>
            </span>
            {typingUser && (
              <span className="text-purple-400/70 animate-pulse italic">{typingUser} is typing...</span>
            )}
            <span className="text-gray-600">
              {participants.length} user{participants.length !== 1 ? "s" : ""} online
            </span>
          </div>
          <div className="flex items-center gap-4">
            <SessionTimer />
            <span className="capitalize text-gray-500 font-medium">{language}</span>
            <span className="text-gray-700">UTF-8</span>
          </div>
        </div>
      </div>
    </>
  );
}
