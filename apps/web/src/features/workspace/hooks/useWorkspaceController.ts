import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import type { FormatResult } from "../../../components/CodeEditorV2";
import { useSocket } from "../../../hooks/useSocket";
import { CODE_TEMPLATES } from "../../../lib/codeTemplates";
import {
  DESKTOP_BREAKPOINT,
  FONT_SIZE_DEFAULT,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
} from "../constants";
import { queueRunJob } from "../api";
import type { MobileTab, OutputUpdate } from "../types";

interface UseWorkspaceControllerOptions {
  roomId: string;
  username: string;
}

function getCodeTemplate(language: string): string {
  return CODE_TEMPLATES[language] || CODE_TEMPLATES.javascript;
}

export function useWorkspaceController({ roomId, username }: UseWorkspaceControllerOptions) {
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
    typeof window !== "undefined" ? window.innerWidth >= DESKTOP_BREAKPOINT : true,
  );

  const codeRef = useRef(code);
  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleRemoteCodeChange = useCallback((remoteCode: string) => {
    setCode(remoteCode);
  }, []);

  const handleOutputChange = useCallback((data: OutputUpdate) => {
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
    roomId,
    username,
    onCodeChange: handleRemoteCodeChange,
    onOutputChange: handleOutputChange,
  });

  const onLanguageChange = useCallback(
    (nextLanguage: string) => {
      setLanguage(nextLanguage);
      const template = getCodeTemplate(nextLanguage);
      setCode(template);
      sendCodeChange(template);
    },
    [sendCodeChange],
  );

  const onCodeChange = useCallback(
    (nextCode: string) => {
      setCode(nextCode);
      sendCodeChange(nextCode);
      sendTyping();
    },
    [sendCodeChange, sendTyping],
  );

  const runCode = useCallback(async () => {
    setIsRunning(true);
    setOutput("Submitting code...\n");

    try {
      const response = await queueRunJob({
        language,
        code: codeRef.current,
        roomId,
      });

      if (response.status === "queued") {
        setOutput("Job queued, waiting for execution...\n");
      }
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || "Execution failed";
      setOutput(message);
      toast.error("Code execution failed");
      setIsRunning(false);
    }
  }, [language, roomId]);

  const triggerFormat = useCallback(() => {
    if (isFormatting || isRunning) {
      return;
    }
    setIsFormatting(true);
    setFormatSignal((value) => value + 1);
  }, [isFormatting, isRunning]);

  const onFormatComplete = useCallback((result: FormatResult) => {
    setIsFormatting(false);
    if (!result.ok) {
      toast.error(result.message || "Formatting failed");
      return;
    }

    toast(result.changed ? "Code formatted" : "Already formatted", {
      icon: result.changed ? "OK" : "Done",
    });
  }, []);

  const toggleChat = useCallback(() => {
    setShowChat((value) => !value);
  }, []);

  const toggleNotes = useCallback(() => {
    setShowNotes((value) => !value);
  }, []);

  const clearOutput = useCallback(() => {
    setOutput("");
  }, []);

  const zoomEditorIn = useCallback(
    () => setEditorFontSize((value) => Math.min(value + 1, FONT_SIZE_MAX)),
    [],
  );
  const zoomEditorOut = useCallback(
    () => setEditorFontSize((value) => Math.max(value - 1, FONT_SIZE_MIN)),
    [],
  );
  const zoomConsoleIn = useCallback(
    () => setConsoleFontSize((value) => Math.min(value + 1, FONT_SIZE_MAX)),
    [],
  );
  const zoomConsoleOut = useCallback(
    () => setConsoleFontSize((value) => Math.max(value - 1, FONT_SIZE_MIN)),
    [],
  );

  return {
    language,
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
  };
}
