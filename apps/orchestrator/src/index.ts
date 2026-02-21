import express, { Request, Response } from "express";
import cors from "cors";
import { Queue } from "bullmq";
import { v4 as uuidv4 } from "uuid";
import { loadRuntimeEnv } from "./config/loadRuntimeEnv";

loadRuntimeEnv();

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cors());

const SUPPORTED_LANGUAGES = ["javascript", "python", "java", "cpp", "go", "c"];
const MAX_TIMEOUT_MS = 10000;
const MAX_MEMORY_MB = 256;

const redisOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
};

const submissionQueue = new Queue("submission", { connection: redisOptions });

// Rate limiting: simple in-memory counter (replace with Redis in production)
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 30; // max runs per window
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  entry.count++;
  return true;
}

app.post("/run", async (req: Request, res: Response) => {
  const { code, language, roomId, stdin, timeoutMs, memoryMb } = req.body;

  // Validation
  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Code is required and must be a string" });
  }
  if (!language || typeof language !== "string") {
    return res.status(400).json({ error: "Language is required" });
  }
  if (!SUPPORTED_LANGUAGES.includes(language.toLowerCase())) {
    return res.status(400).json({
      error: `Unsupported language: ${language}. Supported: ${SUPPORTED_LANGUAGES.join(", ")}`,
    });
  }
  if (code.length > 50000) {
    return res.status(400).json({ error: "Code exceeds maximum length (50KB)" });
  }

  // Rate limiting by IP
  const clientIp = req.ip || req.socket.remoteAddress || "unknown";
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: "Rate limit exceeded. Try again later." });
  }

  const jobId = uuidv4();
  const effectiveTimeout = Math.min(
    typeof timeoutMs === "number" ? timeoutMs : 5000,
    MAX_TIMEOUT_MS,
  );
  const effectiveMemory = Math.min(typeof memoryMb === "number" ? memoryMb : 128, MAX_MEMORY_MB);

  try {
    await submissionQueue.add("run-code", {
      jobId,
      code,
      language: language.toLowerCase(),
      roomId: roomId || null,
      stdin: stdin || "",
      timeoutMs: effectiveTimeout,
      memoryMb: effectiveMemory,
    });

    res.status(202).json({
      message: "Job queued",
      jobId,
      status: "queued",
    });
  } catch (error) {
    console.error("Queue error:", error);
    res.status(500).json({ error: "Failed to queue job" });
  }
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Orchestrator running on port ${PORT}`);
});
