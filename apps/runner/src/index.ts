import { Worker } from "bullmq";
import Redis from "ioredis";
import executeCode, { cleanupCodeArtifacts, writeCodeToFile } from "./utils/executeCode";
import { loadRuntimeEnv } from "./config/loadRuntimeEnv";
import { buildRedisOptions } from "./config/redis";

loadRuntimeEnv();

const redisOptions = buildRedisOptions({ maxRetriesPerRequest: null });
const submissionQueueName = process.env.SUBMISSION_QUEUE_NAME || "submission";
const jobUpdatesChannel = process.env.JOB_UPDATES_CHANNEL || "job-updates";
const allowedLanguages = new Set(["javascript", "python", "java", "cpp", "go", "c"]);
const MIN_TIMEOUT_MS = 250;
const MAX_TIMEOUT_MS = 10000;
const MIN_MEMORY_MB = 32;
const MAX_MEMORY_MB = 256;

// Redis client for publishing results
const redisPublisher = new Redis(redisOptions);
redisPublisher.on("error", (err) => {
  console.error("Redis publisher error:", err);
});

console.log("Starting runner worker...");
console.log(`Redis target: ${redisOptions.host}:${redisOptions.port}`);
console.log(`Queue target: ${submissionQueueName}`);
console.log(`Publish channel: ${jobUpdatesChannel}`);
console.log("Security policy: hardened multi-language execution (always enabled).");

const worker = new Worker(
  submissionQueueName,
  async (job) => {
    console.log(`Processing job ${job.id}`);
    const { code, language, roomId, jobId, stdin, timeoutMs, memoryMb } = job.data;
    const normalizedLanguage = String(language || "").toLowerCase();
    const requestedTimeout = Number.isFinite(timeoutMs) ? Number(timeoutMs) : 5000;
    const requestedMemory = Number.isFinite(memoryMb) ? Number(memoryMb) : 128;
    const effectiveTimeout = Math.min(
      Math.max(Math.floor(requestedTimeout), MIN_TIMEOUT_MS),
      MAX_TIMEOUT_MS,
    );
    const effectiveMemory = Math.min(
      Math.max(Math.floor(requestedMemory), MIN_MEMORY_MB),
      MAX_MEMORY_MB,
    );

    try {
      // Notify: running
      await redisPublisher.publish(
        jobUpdatesChannel,
        JSON.stringify({
          status: "running",
          jobId,
          roomId,
        }),
      );

      let filePath = "";
      let output: string;
      try {
        if (!allowedLanguages.has(normalizedLanguage)) {
          throw new Error(
            `Language "${normalizedLanguage}" is blocked. Allowed: ${Array.from(allowedLanguages).join(", ")}.`,
          );
        }

        filePath = await writeCodeToFile(normalizedLanguage, code);
        output = await executeCode(filePath, normalizedLanguage, {
          stdin,
          timeoutMs: effectiveTimeout,
          memoryMb: effectiveMemory,
        });
      } catch (execError: any) {
        output = execError.toString();
      } finally {
        if (filePath) {
          try {
            await cleanupCodeArtifacts(filePath);
          } catch (cleanupError) {
            console.error("Failed to cleanup code artifacts:", cleanupError);
          }
        }
      }

      // Notify: completed
      await redisPublisher.publish(
        jobUpdatesChannel,
        JSON.stringify({
          status: "completed",
          jobId,
          roomId,
          output,
        }),
      );

      console.log(`Job ${job.id} completed`);
      return output;
    } catch (error: any) {
      console.error(`Job ${job.id} failed:`, error);
      await redisPublisher.publish(
        jobUpdatesChannel,
        JSON.stringify({
          status: "failed",
          jobId,
          roomId,
          error: error.message,
        }),
      );
      throw error;
    }
  },
  { connection: redisOptions },
);

worker.on("completed", (job) => {
  console.log(`${job.id} has completed!`);
});

worker.on("failed", (job, err) => {
  console.log(`${job?.id} has failed with ${err.message}`);
});

worker.on("error", (err) => {
  console.error("Worker error:", err);
});
