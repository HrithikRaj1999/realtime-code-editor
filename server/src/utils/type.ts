import { Server } from "http";
import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export interface SocketMapType {
  [key: string]: string;
}
export interface PairType {
  [action: string]: (
    socket?: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
    roomId?: string,
    username?: string,
    io?: any
  ) => any;
}
