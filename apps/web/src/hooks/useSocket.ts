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

interface UseSocketOptions {
  roomId: string;
  username: string;
  onCodeChange?: (code: string) => void;
  onOutputChange?: (data: { output: string; status: string }) => void;
}

export function useSocket({ roomId, username, onCodeChange, onOutputChange }: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [connected, setConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [typingUser, setTypingUser] = useState<string | null>(null);

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
    socket.on(ACTIONS.JOINED, ({ clients, username: joinedUser, socketId }) => {
      setParticipants(clients);
    });

    // When someone disconnects
    socket.on(ACTIONS.DISCONNECTED, ({ socketId, username: leftUser }) => {
      setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
    });

    // Code changes from other users
    socket.on(ACTIONS.CODE_CHANGE, (code: string) => {
      onCodeChange?.(code);
    });

    // Server-originated output (from runner via Redis)
    socket.on(ACTIONS.OUTPUT_CHANGE, (data: { output: string; status: string }) => {
      onOutputChange?.(data);
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
  }, [roomId, username]);

  const sendCodeChange = useCallback(
    (code: string) => {
      socketRef.current?.emit(ACTIONS.CODE_CHANGE, { roomId, code });
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
