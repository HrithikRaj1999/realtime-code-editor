import ACTIONS from "./constants";
import SocketIdManager from "../Services/SocketIdManager";
import {
  CodeChangeArgs,
  JoinArgs,
  OutputChangeArgs,
  TypingArgs,
  ChatMessageArgs,
  PairType,
  AppSocket,
} from "./types";

const socketDict = SocketIdManager.getInstance();

export const getAllClients = (io: any, roomId: string) => {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId: any) => ({
      socketId,
      username: socketDict.getUserName(socketId),
    }),
  );
};

export const SOCKET_ACTION_PAIR: PairType = {
  [ACTIONS.JOIN]: ({ socket, roomId, username, io }: JoinArgs) => {
    if (socket && username && roomId && io) {
      socket.join(roomId);
      socketDict.addUser(socket.id, username);
      const clients = getAllClients(io, roomId);
      io.to(roomId).emit(ACTIONS.JOINED, {
        username,
        socketId: socket.id,
        clients,
      });
    }
  },

  [ACTIONS.LEAVE]: (socket: AppSocket) => {
    if (socket) {
      const rooms = [...socket.rooms];
      rooms.forEach((roomId) => {
        console.log(`${socketDict.getUserName(socket.id)} is disconnected`);
        socket.to(roomId).emit(ACTIONS.DISCONNECTED, {
          socketId: socket.id,
          username: socketDict.getUserName(socket.id),
        });
        socket.leave(roomId);
      });
      socketDict.removeUser(socket.id);
    }
  },

  [ACTIONS.DISCONNECTING]: (socket: AppSocket) => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      if (roomId !== socket.id) {
        console.log(
          `${socketDict.getUserName(socket.id)} is disconnected from room ${roomId}`,
        );
        socket.to(roomId).emit(ACTIONS.DISCONNECTED, {
          socketId: socket.id,
          username: socketDict.getUserName(socket.id),
        });
      }
    });
    socketDict.removeUser(socket.id);
  },

  [ACTIONS.CODE_CHANGE]: ({ io, roomId, code }: CodeChangeArgs) => {
    io?.to(roomId).emit(ACTIONS.CODE_CHANGE, code);
  },

  // OUTPUT_CHANGE: now only server-originated (from Redis job-updates).
  // We keep this handler so the server can still relay, but clients should NOT emit this.
  [ACTIONS.OUTPUT_CHANGE]: ({ io, roomId, output }: OutputChangeArgs) => {
    io?.to(roomId).emit(ACTIONS.OUTPUT_CHANGE, output);
  },

  [ACTIONS.TYPING]: ({ io, roomId, socket }: TypingArgs) => {
    socket.to(roomId).emit(ACTIONS.TYPING_RECEIVED, {
      socketId: socket.id,
      username: socketDict.getUserName(socket.id),
    });
  },

  [ACTIONS.CHAT_MESSAGE]: ({
    io,
    roomId,
    socket,
    message,
    username,
  }: ChatMessageArgs) => {
    io?.to(roomId).emit(ACTIONS.CHAT_MESSAGE, {
      socketId: socket.id,
      username,
      message,
      timestamp: Date.now(),
    });
  },
};
