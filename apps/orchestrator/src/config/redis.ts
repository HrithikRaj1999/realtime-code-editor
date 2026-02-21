import type { RedisOptions } from "ioredis";

function parsePort(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function buildRedisOptions(overrides: Partial<RedisOptions> = {}): RedisOptions {
  const redisUrl = (process.env.REDIS_URL || "").trim();

  if (redisUrl) {
    try {
      const parsed = new URL(redisUrl);
      return {
        host: parsed.hostname,
        port: parsePort(parsed.port, 6379),
        ...(parsed.username ? { username: decodeURIComponent(parsed.username) } : {}),
        ...(parsed.password ? { password: decodeURIComponent(parsed.password) } : {}),
        ...(parsed.protocol === "rediss:" ? { tls: {} } : {}),
        ...overrides,
      };
    } catch (error) {
      console.warn(`[redis] Invalid REDIS_URL: ${redisUrl}. Falling back to REDIS_HOST/REDIS_PORT.`);
      console.warn(error);
    }
  }

  return {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parsePort(process.env.REDIS_PORT, 6379),
    ...overrides,
  };
}
