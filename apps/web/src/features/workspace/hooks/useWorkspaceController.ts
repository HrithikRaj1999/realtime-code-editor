import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import type { FormatResult } from "../../../components/CodeEditorV2";
import { useSocket } from "../../../hooks/useSocket";
import { CODE_TEMPLATES } from "../../../lib/codeTemplates";
import {
  ALLOWED_LANGUAGE_OPTIONS,
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

const CODE_EMIT_DEBOUNCE_MS = 300;
const TYPING_THROTTLE_MS = 2000;

function getCodeTemplate(language: string): string {
  return CODE_TEMPLATES[language] || CODE_TEMPLATES.javascript;
}

export function useWorkspaceController({ roomId, username }: UseWorkspaceControllerOptions) {
  const languageOptions = useMemo(() => ALLOWED_LANGUAGE_OPTIONS, []);
  const defaultLanguage = languageOptions[0]?.value || "javascript";
  const [language, setLanguage] = useState(defaultLanguage);
  const [code, setCode] = useState(getCodeTemplate(defaultLanguage));
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
  const languageRef = useRef(language);
  const codeRevisionRef = useRef(0);
  const pendingCodeEmitRef = useRef<{ code: string; revision: number } | null>(null);
  const codeEmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmitRef = useRef(0);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    if (codeEmitTimerRef.current) {
      clearTimeout(codeEmitTimerRef.current);
      codeEmitTimerRef.current = null;
    }
    pendingCodeEmitRef.current = null;
    codeRevisionRef.current = 0;

    const nextLanguage = languageOptions.some((option) => option.value === languageRef.current)
      ? languageRef.current
      : defaultLanguage;
    const template = getCodeTemplate(nextLanguage);
    setCode(template);
    codeRef.current = template;
    setLanguage(nextLanguage);
  }, [roomId, defaultLanguage, languageOptions]);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleRemoteCodeChange = useCallback((update: { code: string; revision?: number }) => {
    const remoteCode = update?.code;
    if (typeof remoteCode !== "string") {
      return;
    }

    const incomingRevision =
      typeof update.revision === "number" && Number.isFinite(update.revision)
        ? Math.max(1, Math.floor(update.revision))
        : null;

    if (incomingRevision !== null && incomingRevision <= codeRevisionRef.current) {
      return;
    }

    if (remoteCode === codeRef.current) {
      if (incomingRevision !== null) {
        codeRevisionRef.current = Math.max(codeRevisionRef.current, incomingRevision);
      }
      return;
    }

    setCode(remoteCode);
    codeRef.current = remoteCode;
    if (incomingRevision !== null) {
      codeRevisionRef.current = incomingRevision;
    }
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

  const flushPendingCodeEmit = useCallback(() => {
    if (codeEmitTimerRef.current) {
      clearTimeout(codeEmitTimerRef.current);
      codeEmitTimerRef.current = null;
    }

    const pending = pendingCodeEmitRef.current;
    if (!pending) {
      return;
    }

    pendingCodeEmitRef.current = null;
    sendCodeChange(pending.code, pending.revision);
  }, [sendCodeChange]);

  const scheduleCodeEmit = useCallback(
    (nextCode: string, revision: number) => {
      pendingCodeEmitRef.current = {
        code: nextCode,
        revision,
      };

      if (codeEmitTimerRef.current) {
        clearTimeout(codeEmitTimerRef.current);
      }

      codeEmitTimerRef.current = setTimeout(() => {
        flushPendingCodeEmit();
      }, CODE_EMIT_DEBOUNCE_MS);
    },
    [flushPendingCodeEmit],
  );

  useEffect(() => {
    if (languageOptions.some((option) => option.value === language)) {
      return;
    }
    const fallbackLanguage = languageOptions[0]?.value || "javascript";
    setLanguage(fallbackLanguage);
    const template = getCodeTemplate(fallbackLanguage);
    setCode(template);
    codeRef.current = template;
    codeRevisionRef.current += 1;
    scheduleCodeEmit(template, codeRevisionRef.current);
  }, [language, languageOptions, scheduleCodeEmit]);

  useEffect(() => {
    return () => {
      if (codeEmitTimerRef.current) {
        clearTimeout(codeEmitTimerRef.current);
        codeEmitTimerRef.current = null;
      }
      pendingCodeEmitRef.current = null;
    };
  }, []);

  const onLanguageChange = useCallback(
    (nextLanguage: string) => {
      setLanguage(nextLanguage);
      const template = getCodeTemplate(nextLanguage);
      setCode(template);
      codeRef.current = template;
      const nextRevision = codeRevisionRef.current + 1;
      codeRevisionRef.current = nextRevision;
      scheduleCodeEmit(template, nextRevision);
    },
    [scheduleCodeEmit],
  );

  const onCodeChange = useCallback(
    (nextCode: string) => {
      if (nextCode === codeRef.current) {
        return;
      }
      setCode(nextCode);
      codeRef.current = nextCode;
      const nextRevision = codeRevisionRef.current + 1;
      codeRevisionRef.current = nextRevision;
      scheduleCodeEmit(nextCode, nextRevision);

      // Throttle typing indicator to avoid flooding the socket
      const now = Date.now();
      if (now - lastTypingEmitRef.current >= TYPING_THROTTLE_MS) {
        lastTypingEmitRef.current = now;
        sendTyping();
      }
    },
    [scheduleCodeEmit, sendTyping],
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
  };
}
