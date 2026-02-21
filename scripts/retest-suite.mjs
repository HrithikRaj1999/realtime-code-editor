import { spawn } from "child_process";

function runCommand(command, args, { env = {} } = {}) {
  const rendered = `${command} ${args.join(" ")}`.trim();
  console.log(`[retest] ${rendered}`);

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      windowsHide: true,
      env: { ...process.env, ...env },
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Exit code ${code}: ${rendered}`));
    });
  });
}

function runNpm(args, options = {}) {
  if (process.platform === "win32") {
    return runCommand("cmd", ["/d", "/s", "/c", "npm", ...args], options);
  }
  return runCommand("npm", args, options);
}

async function checkHealth(url, timeoutMs = 15000) {
  const started = Date.now();
  let lastError = "unknown error";

  while (Date.now() - started < timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Health request failed with status ${response.status}`);
      }
      const body = await response.text();
      console.log(`[retest] health response: ${body}`);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      await new Promise((resolve) => setTimeout(resolve, 500));
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error(`Health check failed after ${timeoutMs}ms: ${lastError}`);
}

async function runStep(results, name, work) {
  const startedAt = Date.now();
  try {
    await work();
    results.push({
      name,
      status: "PASS",
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    results.push({
      name,
      status: "FAIL",
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function printSummary(results) {
  const lines = results.map((result) => {
    const duration = `${(result.durationMs / 1000).toFixed(2)}s`;
    const base = `${result.status} | ${duration.padStart(8)} | ${result.name}`;
    if (!result.error) {
      return base;
    }
    return `${base}\n  -> ${result.error}`;
  });

  console.log("\n[retest] Summary");
  console.log(lines.join("\n"));

  const failed = results.filter((result) => result.status === "FAIL");
  console.log(
    `\n[retest] Result: ${failed.length === 0 ? "PASS" : "FAIL"} (${results.length - failed.length}/${results.length} passed)`,
  );

  return failed.length === 0;
}

async function main() {
  const appName = process.env.LOADTEST_APP_NAME || "myapp";
  const appImage = process.env.LOADTEST_APP_IMAGE || "myapp:latest";
  const hostPort = process.env.LOADTEST_HOST_PORT || "5500";
  const containerPort = process.env.LOADTEST_CONTAINER_PORT || "5000";
  const healthUrl = process.env.LOADTEST_HEALTH_URL || `http://localhost:${hostPort}/health`;
  const httpTarget =
    process.env.LOADTEST_HTTP_TARGET || `http://host.docker.internal:${hostPort}/health`;
  const results = [];

  await runStep(results, "docker compose up redis", async () => {
    await runCommand("docker", ["compose", "up", "-d", "redis"]);
  });

  await runStep(results, "build app image", async () => {
    await runCommand("docker", ["build", "-t", appImage, "apps/server"]);
  });

  const appStartEnv = {
    LOADTEST_APP_NAME: appName,
    LOADTEST_APP_IMAGE: appImage,
    LOADTEST_HOST_PORT: hostPort,
    LOADTEST_CONTAINER_PORT: containerPort,
    LOADTEST_CPUS: process.env.LOADTEST_CPUS || "0.5",
    LOADTEST_MEMORY: process.env.LOADTEST_MEMORY || "256m",
    LOADTEST_PIDS_LIMIT: process.env.LOADTEST_PIDS_LIMIT || "128",
    LOADTEST_FORCE_RECREATE: "true",
    LOADTEST_APP_ENV_REDIS_HOST: process.env.LOADTEST_REDIS_HOST || "host.docker.internal",
    LOADTEST_APP_ENV_REDIS_PORT: process.env.LOADTEST_REDIS_PORT || "6379",
  };

  await runStep(results, "start constrained app container", async () => {
    await runNpm(["run", "test:load:app:start"], { env: appStartEnv });
  });

  await runStep(results, "health check (before load)", async () => {
    await checkHealth(healthUrl);
  });

  await runStep(results, "stress cpu + memory", async () => {
    await runNpm(["run", "test:load:cpu-mem"], {
      env: { LOADTEST_TIMEOUT: process.env.LOADTEST_TIMEOUT || "20s" },
    });
  });

  await runStep(results, "stress disk io", async () => {
    await runNpm(["run", "test:load:io"], {
      env: { LOADTEST_TIMEOUT: process.env.LOADTEST_TIMEOUT || "20s" },
    });
  });

  await runStep(results, "container stats", async () => {
    await runNpm(["run", "test:load:app:stats"], {
      env: { LOADTEST_APP_NAME: appName },
    });
  });

  await runStep(results, "container logs", async () => {
    await runNpm(["run", "test:load:app:logs"], {
      env: {
        LOADTEST_APP_NAME: appName,
        LOADTEST_LOGS_TAIL: process.env.LOADTEST_LOGS_TAIL || "120",
      },
    });
  });

  await runStep(results, "container inspect", async () => {
    await runNpm(["run", "test:load:app:inspect"], {
      env: { LOADTEST_APP_NAME: appName },
    });
  });

  await runStep(results, "http load test (wrk)", async () => {
    await runNpm(["run", "test:load:http"], {
      env: {
        LOADTEST_HTTP_TARGET: httpTarget,
        LOADTEST_WRK_THREADS: process.env.LOADTEST_WRK_THREADS || "4",
        LOADTEST_WRK_CONNECTIONS: process.env.LOADTEST_WRK_CONNECTIONS || "200",
        LOADTEST_WRK_DURATION: process.env.LOADTEST_WRK_DURATION || "20s",
      },
    });
  });

  await runStep(results, "chaos restart", async () => {
    await runNpm(["run", "test:load:chaos:restart"], {
      env: { LOADTEST_APP_NAME: appName },
    });
  });

  await runStep(results, "health check (after restart)", async () => {
    await checkHealth(healthUrl);
  });

  await runStep(results, "security tests", async () => {
    await runNpm(["--prefix", "apps/runner", "run", "test:security"]);
  });

  const success = printSummary(results);
  if (!success) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`[retest] fatal: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
