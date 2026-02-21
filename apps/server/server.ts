import express, { Express } from "express";
import http from "http";
import { Server } from "socket.io";
import ACTIONS from "./src/utils/constants";
import { SOCKET_ACTION_PAIR } from "./src/utils/socketFunctions";
import Redis from "ioredis";
import cors from "cors";
import authRoutes from "./src/routes/auth";
import { loadRuntimeEnv } from "./src/config/loadRuntimeEnv";
import { buildRedisOptions } from "./src/config/redis";

loadRuntimeEnv();
const jobUpdatesChannel = process.env.JOB_UPDATES_CHANNEL || "job-updates";

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

function resolveOrchestratorUrl() {
  const rawValue =
    process.env.ORCHESTRATOR_URL || process.env.ORCHESTRATOR_HOSTPORT || "localhost:4000";
  const trimmed = rawValue.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `http://${trimmed}`;
}

// Proxy /run requests to orchestrator
app.use("/run", async (req, res) => {
  const orchestratorUrl = resolveOrchestratorUrl();
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

io.on("connection", (socket) => {
  // A new user has joined
  socket.on(ACTIONS.JOIN, ({ roomId, username }: { roomId: string; username: string }) => {
    SOCKET_ACTION_PAIR[ACTIONS.JOIN]({ io, socket, roomId, username });
  });

  // When a user is leaving the room
  socket.on(ACTIONS.DISCONNECTING, () =>
    SOCKET_ACTION_PAIR[ACTIONS.DISCONNECTING]({ socket, io }),
  );

  // When a user changes code
  socket.on(
    ACTIONS.CODE_CHANGE,
    ({ roomId, code, revision }: { roomId: string; code: string; revision?: number }) => {
      SOCKET_ACTION_PAIR[ACTIONS.CODE_CHANGE]({ io, socket, roomId, code, revision });
    },
  );

  socket.on(ACTIONS.LEAVE, () => {
    SOCKET_ACTION_PAIR[ACTIONS.LEAVE]({ socket, io });
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
const redisOptions = buildRedisOptions();
const redisSubscriber = new Redis(redisOptions);
redisSubscriber.on("error", (err) => {
  console.error("Redis subscriber error:", err);
});
console.log(`Redis target: ${redisOptions.host}:${redisOptions.port}`);
console.log(`Subscribe channel: ${jobUpdatesChannel}`);

redisSubscriber
  .subscribe(jobUpdatesChannel)
  .then((count) => {
    console.log(`Subscribed to ${count} channels.`);
  })
  .catch((err) => {
    console.error("Failed to subscribe:", err.message);
  });

redisSubscriber.on("message", (channel: string, message: string) => {
  if (channel === jobUpdatesChannel) {
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
