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
  // New events for roles and run status
  RUN_STARTED: "run-started",
  RUN_OUTPUT: "run-output",
  RUN_FINISHED: "run-finished",
  RUN_ERROR: "run-error",
  SET_ROLE: "set-role",
  CHAT_MESSAGE: "chat-message",
} as const;

export default ACTIONS;
