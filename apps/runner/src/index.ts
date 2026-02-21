import { Worker } from "bullmq";
import Redis from "ioredis";
import executeCode, { writeCodeToFile } from "./utils/executeCode";
import { loadRuntimeEnv } from "./config/loadRuntimeEnv";
import { buildRedisOptions } from "./config/redis";

loadRuntimeEnv();

const redisOptions = buildRedisOptions({ maxRetriesPerRequest: null });

// Redis client for publishing results
const redisPublisher = new Redis(redisOptions);
redisPublisher.on("error", (err) => {
  console.error("Redis publisher error:", err);
});

console.log("Starting runner worker...");
console.log(`Redis target: ${redisOptions.host}:${redisOptions.port}`);

const worker = new Worker(
  "submission",
  async (job) => {
    console.log(`Processing job ${job.id}`);
    const { code, language, roomId, jobId, stdin, timeoutMs, memoryMb } = job.data;

    try {
      // Notify: running
      await redisPublisher.publish(
        "job-updates",
        JSON.stringify({
          status: "running",
          jobId,
          roomId,
        }),
      );

      const filePath = await writeCodeToFile(language, code);

      let output: string;
      try {
        output = await executeCode(filePath, language, {
          stdin,
          timeoutMs: timeoutMs || 5000,
          memoryMb: memoryMb || 128,
        });
      } catch (execError: any) {
        output = execError.toString();
      }

      // Notify: completed
      await redisPublisher.publish(
        "job-updates",
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
        "job-updates",
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
