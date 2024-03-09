import { ChangeEvent, Dispatch, MouseEvent, SetStateAction } from "react";
import { NavigateFunction } from "react-router-dom";
import { Socket } from "socket.io-client";
export interface InformationTypes {
  roomId: string;
  username: string;
  isCreateRoom: boolean;
}

export type UseRoomCreateReturn = [
  InformationTypes,
  Dispatch<SetStateAction<InformationTypes>>,
  (e: MouseEvent<HTMLElement, globalThis.MouseEvent>) => void,
  (e: ChangeEvent<HTMLInputElement>) => void,
  (e: ChangeEvent<HTMLInputElement>) => void,
  () => void,
  NavigateFunction,
  (e: React.KeyboardEvent<HTMLInputElement>) => void
];

export interface Avatarprops {
  username: string;
  socketId: string;
}
export interface SocketContextType {
  socket: Socket;
  setSocket: React.Dispatch<React.SetStateAction<Socket>>;
  clients: ClientType[] | [];
  setClients: React.Dispatch<React.SetStateAction<ClientType[] | []>>;
}

export interface propsType {
  children: React.ReactNode;
}
export interface ClientType {
  socketId: string;
  username: string;
}

export interface HandleNewJoin {
  username: string;
  socketId: string;
  clients: ClientType[];
}
export interface HandleLeave {
  username: string;
  socketId: string;
}
export interface UseEditorParamsTypes {
  socket: Socket;
  clients: ClientType[] | [];
  setClients: React.Dispatch<React.SetStateAction<ClientType[] | []>>;
}
