export type MobileTab = "code" | "console" | "chat";

export interface LocationState {
  username?: string;
}

export interface OutputUpdate {
  output: string;
  status: string;
}
