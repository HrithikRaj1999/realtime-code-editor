import express, { Express } from "express";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import { SOCKET_ACTION_PAIR } from "./src/utils/socketFunctions";
import ACTIONS from "./src/utils/constants";
import codeRunnerRouter from "./src/routes/codeRunner";
import cors from "cors";
dotenv.config();

const app: Express = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const port = process.env.PORT || 3000;
const server = http.createServer(app);
const io = new Server(server);
app.use(cors());
app.use("/run", codeRunnerRouter);

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
    SOCKET_ACTION_PAIR[ACTIONS.CODE_CHANGE]({ io, roomId, code });
  });
  socket.on(ACTIONS.LEAVE, () => {
    SOCKET_ACTION_PAIR[ACTIONS.LEAVE](socket);
  });

  socket.on(ACTIONS.OUTPUT_CHANGE, ({ roomId, output }) => {
    SOCKET_ACTION_PAIR[ACTIONS.OUTPUT_CHANGE]({ io, roomId, output });
  });
});

server.listen(port, () => console.log("Server listening on port", port));
