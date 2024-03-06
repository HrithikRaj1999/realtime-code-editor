import { Server } from "http";
import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import ACTIONS from "./../../../client/src/constants/constants";

export interface SocketMapType {
  [key: string]: string;
}
// export interface PairType {
//   [action: string]: (
//     socket?: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
//     roomId?: string,
//     username?: string,
//     io?: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap,any>
//   ) => any;
// }
export interface PairType {
  [action: string]: any;
}
export interface ACTION_JOIN {
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;
  roomId: string;
  username: string;
  io: any;
}
export type ACTION_DISCONNECT = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  any
>;
export type ACTION_CODE_CHANGE = {
  roomId: string;
  code: string;
  io: any;
};
