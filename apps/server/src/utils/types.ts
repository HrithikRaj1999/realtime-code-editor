import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export type AppSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  any
>;

export interface PairType {
  [action: string]: (args: any) => void;
}

export interface JoinArgs {
  socket: AppSocket;
  roomId: string;
  username: string;
  io: any;
}

export interface CodeChangeArgs {
  roomId: string;
  code: string;
  revision?: number;
  io: any;
  socket: AppSocket;
}

export interface OutputChangeArgs {
  roomId: string;
  output: string;
  io: any;
  socket?: AppSocket;
}

export interface TypingArgs {
  socket: AppSocket;
  io: any;
  roomId: string;
}

export interface ChatMessageArgs {
  socket: AppSocket;
  io: any;
  roomId: string;
  message: string;
  username: string;
}
