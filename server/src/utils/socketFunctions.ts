import ACTIONS from "./constants";
import SocketIdManager from "./../Services/SocketIdManager";
import {
  ACTION_CODE_CHANGE,
  ACTION_DISCONNECT,
  ACTION_JOIN,
  PairType,
} from "./type";
import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
const socketDict = SocketIdManager.getInstance();

//any needs to be corrected
export const getAllClients = (io: any, roomId: string) => {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId: any) => {
      return {
        socketId: socketId,
        username: socketDict.getUserName(socketId),
      };
    }
  );
};

export const SOCKET_ACTION_PAIR: PairType = {
  [ACTIONS.JOIN]: ({ socket, roomId, username, io }: ACTION_JOIN) => {
    if (socket && username && roomId && io) {
      socket.join(roomId);
      //get allt he connected clients
      const clients = getAllClients(io, roomId);
      clients.forEach(({ socketId }) => {
        io.to(socketId).emit(ACTIONS.JOINED, {
          username,
          socketId: socket.id,
          clients,
        });
      });

      socketDict.addUser(socket.id, username);
    }
  },
  [ACTIONS.DISCONNECTING]: (socket: ACTION_DISCONNECT) => {
    if (socket) {
      const rooms = [...socket.rooms]; //get all the rooms that user is connected to
      //make that user with socket id to leave all the rooms in which they are connected to
      rooms.forEach((roomId) => {
        //emmit message to client
        socket.to(roomId).emit(ACTIONS.DISCONNECTED, {
          socketId: socket.id,
          username: socketDict.getUserName(socket.id),
        });
        socket.leave(roomId); //officially leave
      });
      socketDict.removeUser(socket.id);
    }
  },
  [ACTIONS.CODE_CHANGE]: ({ io, roomId, code }: ACTION_CODE_CHANGE) => {
    io?.to(roomId!).emit(ACTIONS.CODE_CHANGE, code);
  },
};
