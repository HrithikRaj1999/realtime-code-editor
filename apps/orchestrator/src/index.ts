import express, { Request, Response } from "express";
import cors from "cors";
import { Queue } from "bullmq";
import { v4 as uuidv4 } from "uuid";
import { loadRuntimeEnv } from "./config/loadRuntimeEnv";
import { buildRedisOptions } from "./config/redis";

loadRuntimeEnv();

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cors());

const SUPPORTED_LANGUAGES = ["javascript", "python", "java", "cpp", "go", "c"];
const MAX_TIMEOUT_MS = 20000;
const MAX_MEMORY_MB = 256;
const MIN_TIMEOUT_MS = 250;
const MIN_MEMORY_MB = 32;
const MAX_STDIN_BYTES = 10 * 1024;
const submissionQueueName = process.env.SUBMISSION_QUEUE_NAME || "submission";

function getDefaultTimeoutMs(language: string): number {
  switch (language.toLowerCase()) {
    case "go":
    case "java":
    case "cpp":
    case "c":
      return 12000;
    default:
      return 5000;
  }
}

const redisOptions = buildRedisOptions();

const submissionQueue = new Queue(submissionQueueName, { connection: redisOptions });
submissionQueue.on("error", (err) => {
  console.error("Submission queue error:", err);
});
console.log(`Redis target: ${redisOptions.host}:${redisOptions.port}`);
console.log(`Queue target: ${submissionQueueName}`);
console.log("Security policy: hardened multi-language execution (always enabled).");

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
  const normalizedLanguage = language.toLowerCase();
  if (!SUPPORTED_LANGUAGES.includes(normalizedLanguage)) {
    return res.status(400).json({
      error: `Unsupported language: ${language}. Supported: ${SUPPORTED_LANGUAGES.join(", ")}`,
    });
  }
  if (code.length > 50000) {
    return res.status(400).json({ error: "Code exceeds maximum length (50KB)" });
  }
  if (stdin !== undefined && typeof stdin !== "string") {
    return res.status(400).json({ error: "stdin must be a string" });
  }
  if (typeof stdin === "string" && Buffer.byteLength(stdin, "utf8") > MAX_STDIN_BYTES) {
    return res.status(400).json({ error: "stdin exceeds maximum size (10KB)" });
  }

  // Rate limiting by IP
  const clientIp = req.ip || req.socket.remoteAddress || "unknown";
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: "Rate limit exceeded. Try again later." });
  }

  const jobId = uuidv4();
  const requestedTimeout = Number.isFinite(timeoutMs)
    ? Number(timeoutMs)
    : getDefaultTimeoutMs(normalizedLanguage);
  const requestedMemory = Number.isFinite(memoryMb) ? Number(memoryMb) : 128;
  const effectiveTimeout = Math.min(Math.max(Math.floor(requestedTimeout), MIN_TIMEOUT_MS), MAX_TIMEOUT_MS);
  const effectiveMemory = Math.min(Math.max(Math.floor(requestedMemory), MIN_MEMORY_MB), MAX_MEMORY_MB);

  try {
    await submissionQueue.add("run-code", {
      jobId,
      code,
      language: normalizedLanguage,
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
