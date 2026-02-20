// Socket event constants — shared between frontend and backend
export const SOCKET_EVENTS = {
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
  RUN_STARTED: "run-started",
  RUN_OUTPUT: "run-output",
  RUN_FINISHED: "run-finished",
  RUN_ERROR: "run-error",
  SET_ROLE: "set-role",
  CHAT_MESSAGE: "chat-message",
} as const;

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
