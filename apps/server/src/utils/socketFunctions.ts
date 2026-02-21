import ACTIONS from "./constants";
import SocketIdManager from "../services/socket-id-manager";
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
const roomCodeState = new Map<string, { code: string; revision: number; updatedAt: number }>();

export const getAllClients = (io: any, roomId: string) => {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId: any) => ({
      socketId,
      username: socketDict.getUserName(socketId),
    }),
  );
};

function clearRoomStateIfEmpty(io: any, roomId: string) {
  const clients = io?.sockets?.adapter?.rooms?.get(roomId);
  if (!clients || clients.size === 0) {
    roomCodeState.delete(roomId);
  }
}

function toRevisionNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return Math.max(1, Math.floor(value));
}

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

      const roomState = roomCodeState.get(roomId);
      if (roomState) {
        socket.emit(ACTIONS.SYNC_CODE, {
          code: roomState.code,
          revision: roomState.revision,
        });
      }
    }
  },

  [ACTIONS.LEAVE]: ({ socket, io }: { socket: AppSocket; io: any }) => {
    if (socket) {
      const rooms = [...socket.rooms];
      rooms.forEach((roomId) => {
        if (roomId === socket.id) {
          return;
        }
        console.log(`${socketDict.getUserName(socket.id)} is disconnected`);
        socket.to(roomId).emit(ACTIONS.DISCONNECTED, {
          socketId: socket.id,
          username: socketDict.getUserName(socket.id),
        });
        socket.leave(roomId);
        clearRoomStateIfEmpty(io, roomId);
      });
      socketDict.removeUser(socket.id);
    }
  },

  [ACTIONS.DISCONNECTING]: ({ socket, io }: { socket: AppSocket; io: any }) => {
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
        setTimeout(() => clearRoomStateIfEmpty(io, roomId), 0);
      }
    });
    socketDict.removeUser(socket.id);
  },

  [ACTIONS.CODE_CHANGE]: ({ io, socket, roomId, code, revision }: CodeChangeArgs) => {
    if (!io || !socket || !roomId || typeof code !== "string") {
      return;
    }

    const incomingRevision = toRevisionNumber(revision);
    const previous = roomCodeState.get(roomId);
    if (
      previous &&
      incomingRevision !== null &&
      incomingRevision <= previous.revision &&
      code !== previous.code
    ) {
      return;
    }

    const nextRevision =
      incomingRevision !== null
        ? Math.max(incomingRevision, (previous?.revision || 0) + 1)
        : (previous?.revision || 0) + 1;

    roomCodeState.set(roomId, {
      code,
      revision: nextRevision,
      updatedAt: Date.now(),
    });

    // Broadcast only to peers to avoid sender echo/render loops.
    socket.to(roomId).emit(ACTIONS.CODE_CHANGE, {
      code,
      revision: nextRevision,
    });
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
