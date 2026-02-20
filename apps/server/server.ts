import express, { Express } from "express";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import ACTIONS from "./src/utils/constants";
import { SOCKET_ACTION_PAIR } from "./src/utils/socketFunctions";
import Redis from "ioredis";
import cors from "cors";
import SocketIdManager from "./src/Services/SocketIdManager";
import authRoutes from "./src/routes/auth";

dotenv.config();

const app: Express = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

const port = process.env.PORT || 3000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"],
  },
});

// Proxy /run requests to orchestrator
app.use("/run", async (req, res) => {
  const orchestratorUrl = process.env.ORCHESTRATOR_URL || "http://localhost:4000";
  try {
    const response = await fetch(`${orchestratorUrl}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error("Orchestrator Proxy Error:", error);
    res.status(503).json({
      error:
        "Execution services are unavailable. Start server, orchestrator, runner, and Redis (try `npm run dev:all`).",
    });
  }
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Auth routes
app.use("/auth", authRoutes);

const socketDict = SocketIdManager.getInstance();

io.on("connection", (socket) => {
  // A new user has joined
  socket.on(ACTIONS.JOIN, ({ roomId, username }: { roomId: string; username: string }) => {
    SOCKET_ACTION_PAIR[ACTIONS.JOIN]({ io, socket, roomId, username });
  });

  // When a user is leaving the room
  socket.on(ACTIONS.DISCONNECTING, () => SOCKET_ACTION_PAIR[ACTIONS.DISCONNECTING](socket));

  // When a user changes code
  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }: { roomId: string; code: string }) => {
    SOCKET_ACTION_PAIR[ACTIONS.CODE_CHANGE]({ io, roomId, code });
  });

  socket.on(ACTIONS.LEAVE, () => {
    SOCKET_ACTION_PAIR[ACTIONS.LEAVE](socket);
  });

  // NOTE: Output is now server-originated only (from Redis job-updates).
  // Clients should NOT emit OUTPUT_CHANGE — they only receive it.
  // This listener is kept for legacy compatibility but should be removed.

  socket.on(ACTIONS.TYPING, (roomId: string) => {
    SOCKET_ACTION_PAIR[ACTIONS.TYPING]({ io, roomId, socket });
  });

  // Chat messages
  socket.on(
    ACTIONS.CHAT_MESSAGE,
    ({ roomId, message, username }: { roomId: string; message: string; username: string }) => {
      SOCKET_ACTION_PAIR[ACTIONS.CHAT_MESSAGE]({
        io,
        roomId,
        socket,
        message,
        username,
      });
    },
  );
});

// Redis subscriber for run job updates
const redisSubscriber = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
});

redisSubscriber
  .subscribe("job-updates")
  .then((count) => {
    console.log(`Subscribed to ${count} channels.`);
  })
  .catch((err) => {
    console.error("Failed to subscribe:", err.message);
  });

redisSubscriber.on("message", (channel: string, message: string) => {
  if (channel === "job-updates") {
    try {
      const update = JSON.parse(message);
      const { roomId, output, status, error } = update;

      if (roomId) {
        // Server-originated output broadcast to all room participants
        io.to(roomId).emit(ACTIONS.OUTPUT_CHANGE, {
          output: error || output || `Status: ${status}`,
          status,
        });
      }
    } catch (e) {
      console.error("Error parsing redis message", e);
    }
  }
});

server.listen(port, () => console.log(`Server listening on port ${port}`));

export { app, server, io };
