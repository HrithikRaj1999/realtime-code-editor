import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const ACTIONS = {
  JOIN: "join",
  JOINED: "joined",
  DISCONNECTING: "disconnecting",
  DISCONNECTED: "disconnected",
  CODE_CHANGE: "code-change",
  SYNC_CODE: "sync-code",
  LEAVE: "leave",
  OUTPUT_CHANGE: "output-changed",
  TYPING: "typing",
  TYPING_RECEIVED: "typing-received",
  CHAT_MESSAGE: "chat-message",
} as const;

interface Participant {
  socketId: string;
  username: string;
}

interface ChatMessage {
  socketId: string;
  username: string;
  message: string;
  timestamp: number;
}

interface CodeUpdate {
  code: string;
  revision?: number;
}

interface UseSocketOptions {
  roomId: string;
  username: string;
  onCodeChange?: (update: CodeUpdate) => void;
  onOutputChange?: (data: { output: string; status: string }) => void;
}

function normalizeCodePayload(payload: unknown): CodeUpdate | null {
  if (typeof payload === "string") {
    return { code: payload };
  }

  if (payload && typeof payload === "object" && typeof (payload as CodeUpdate).code === "string") {
    const revisionValue = (payload as CodeUpdate).revision;
    return {
      code: (payload as CodeUpdate).code,
      revision:
        typeof revisionValue === "number" && Number.isFinite(revisionValue)
          ? revisionValue
          : undefined,
    };
  }

  return null;
}

export function useSocket({ roomId, username, onCodeChange, onOutputChange }: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [connected, setConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  // ── Stable refs for callbacks ──────────────────────────────────────
  // Store the latest callbacks in refs so that socket event handlers
  // always invoke the current version WITHOUT needing to tear down and
  // recreate the socket connection when the callbacks change identity.
  const onCodeChangeRef = useRef(onCodeChange);
  const onOutputChangeRef = useRef(onOutputChange);

  useEffect(() => {
    onCodeChangeRef.current = onCodeChange;
  }, [onCodeChange]);

  useEffect(() => {
    onOutputChangeRef.current = onOutputChange;
  }, [onOutputChange]);

  useEffect(() => {
    const serverUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const socket = io(serverUrl, {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit(ACTIONS.JOIN, { roomId, username });
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    // When someone joins, update participants
    socket.on(ACTIONS.JOINED, ({ clients }) => {
      setParticipants(clients);
    });

    // When someone disconnects
    socket.on(ACTIONS.DISCONNECTED, ({ socketId }) => {
      setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
    });

    // Code changes from other users — read callback from ref
    socket.on(ACTIONS.CODE_CHANGE, (payload: unknown) => {
      const update = normalizeCodePayload(payload);
      if (update) {
        onCodeChangeRef.current?.(update);
      }
    });

    socket.on(ACTIONS.SYNC_CODE, (payload: unknown) => {
      const update = normalizeCodePayload(payload);
      if (update) {
        onCodeChangeRef.current?.(update);
      }
    });

    // Server-originated output (from Redis job-updates) — read callback from ref
    socket.on(ACTIONS.OUTPUT_CHANGE, (data: { output: string; status: string }) => {
      onOutputChangeRef.current?.(data);
    });

    // Typing indicator
    socket.on(ACTIONS.TYPING_RECEIVED, ({ username: typingUsername }) => {
      setTypingUser(typingUsername);
      setTimeout(() => setTypingUser(null), 2000);
    });

    // Chat messages
    socket.on(ACTIONS.CHAT_MESSAGE, (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.emit(ACTIONS.LEAVE);
      socket.disconnect();
      socketRef.current = null;
    };
    // Only reconnect when roomId or username actually changes.
    // Callback identity changes are handled via refs above.
  }, [roomId, username]);

  const sendCodeChange = useCallback(
    (code: string, revision?: number) => {
      socketRef.current?.emit(ACTIONS.CODE_CHANGE, { roomId, code, revision });
    },
    [roomId],
  );

  const sendTyping = useCallback(() => {
    socketRef.current?.emit(ACTIONS.TYPING, roomId);
  }, [roomId]);

  const sendChatMessage = useCallback(
    (message: string) => {
      socketRef.current?.emit(ACTIONS.CHAT_MESSAGE, {
        roomId,
        message,
        username,
      });
    },
    [roomId, username],
  );

  return {
    socket: socketRef.current,
    participants,
    connected,
    chatMessages,
    typingUser,
    sendCodeChange,
    sendTyping,
    sendChatMessage,
  };
}
