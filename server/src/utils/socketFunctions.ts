import ACTIONS from "./constants";
import SocketIdManager from "./../Services/SocketIdManager";
import {
  ACTION_CODE_CHANGE,
  ACTION_DISCONNECT,
  ACTION_JOIN,
  ACTION_LEAVE,
  ACTION_OUT_CHANGE,
  ACTION_TYPING,
  PairType,
} from "./type";
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
      socketDict.addUser(socket.id, username);
      //get all the connected clients
      const clients = getAllClients(io, roomId);
      //board cast the clients to the all the clients so that they can update there list
      io.to(roomId).emit(ACTIONS.JOINED, {
        username,
        socketId: socket.id,
        clients,
      });
    }
  },
  [ACTIONS.LEAVE]: (socket: ACTION_LEAVE) => {
    if (socket) {
      const rooms = [...socket.rooms]; //get all the rooms that user is connected to
      //make that user with socket id to leave all the rooms in which they are connected to
      rooms.forEach((roomId) => {
        //emmit message to client
        console.log(`${socketDict.getUserName(socket.id)}is disconneted`);
        socket.to(roomId).emit(ACTIONS.DISCONNECTED, {
          socketId: socket.id,
          username: socketDict.getUserName(socket.id),
        });
        socket.leave(roomId); //officially leave
      });
      socketDict.removeUser(socket.id);
    }
  },
  [ACTIONS.DISCONNECTING]: (socket: ACTION_DISCONNECT) => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      if (roomId !== socket.id) {
        // Skip the default room with the socket's own ID
        console.log(
          `${socketDict.getUserName(
            socket.id
          )} is disconnected from room ${roomId}`
        );
        socket.to(roomId).emit(ACTIONS.DISCONNECTED, {
          socketId: socket.id,
          username: socketDict.getUserName(socket.id),
        });
      }
    });
    socketDict.removeUser(socket.id); // Cleanup user from custom tracking
  },
  [ACTIONS.CODE_CHANGE]: ({ io, roomId, code }: ACTION_CODE_CHANGE) => {
    io?.to(roomId!).emit(ACTIONS.CODE_CHANGE, code);
  },
  [ACTIONS.OUTPUT_CHANGE]: ({ io, roomId, output }: ACTION_OUT_CHANGE) => {
    io?.to(roomId!).emit(ACTIONS.OUTPUT_CHANGE, output);
  },
  [ACTIONS.TYPING]: ({ io, roomId, socket }: ACTION_TYPING) => {
    socket.to(roomId).emit(ACTIONS.TYPING_RECIEVED, {
      socketId: socket.id,
      username: socketDict.getUserName(socket.id),
    });
  },
};
