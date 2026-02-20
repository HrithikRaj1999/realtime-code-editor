// Shared types — used across frontend and backend

export interface User {
  id: string;
  username: string;
}

export interface Participant {
  socketId: string;
  username: string;
  role?: "interviewer" | "candidate" | "spectator";
}

export interface Room {
  id: string;
  createdBy: string;
  createdAt: number;
  participants: Participant[];
  language: string;
}

export interface RunRequest {
  code: string;
  language: string;
  roomId?: string;
  stdin?: string;
  timeoutMs?: number;
  memoryMb?: number;
}

export interface RunResult {
  jobId: string;
  status: "queued" | "running" | "completed" | "failed";
  output?: string;
  error?: string;
  executionTimeMs?: number;
}

export interface ChatMessage {
  socketId: string;
  username: string;
  message: string;
  timestamp: number;
}

export interface JoinPayload {
  roomId: string;
  username: string;
}

export interface JoinedPayload {
  username: string;
  socketId: string;
  clients: Participant[];
}

export interface DisconnectedPayload {
  socketId: string;
  username: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
