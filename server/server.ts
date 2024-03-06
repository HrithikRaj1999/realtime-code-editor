import express, { Express } from "express";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import { SOCKET_ACTION_PAIR } from "./src/utils/socketFunctions";
import ACTIONS from "./src/utils/constants";
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;
const server = http.createServer(app);
const io = new Server(server);

io.on("connection", (socket) => {
  //a new user has joined
  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    SOCKET_ACTION_PAIR[ACTIONS.JOIN]({ io, socket, roomId, username });
  });

  //when a user is leaving the room
  socket.on(ACTIONS.DISCONNECTING, () =>
    SOCKET_ACTION_PAIR[ACTIONS.DISCONNECTING](socket)
  );
  //when a user changing code
  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    SOCKET_ACTION_PAIR[ACTIONS.CODE_CHANGE]({io, roomId, code});
  });
});

server.listen(port, () => console.log("Server listening on port", port));
