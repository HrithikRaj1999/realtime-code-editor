import fs from "fs";
import net from "net";
import path from "path";
import { spawn, spawnSync } from "child_process";

const repoRoot = process.cwd();
const isWindows = process.platform === "win32";
const tmpDir = path.join(repoRoot, ".tmp");
const pidFilePath = path.join(tmpDir, "local-dev.pid");
const stateFilePath = path.join(tmpDir, "local-dev.state.json");
const logFilePath = path.join(tmpDir, "local-dev.log");
const managedRedisContainerName = "codestream-redis";

function parseBoolean(value, fallback = false) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function applyCliBitwardenArgs() {
  // Usage: npm run start:local -- <BWS_ACCESS_TOKEN> <BWS_PROJECT_ID> <BW_USE_DOCKER_BWS>
  const tokenArg = (process.argv[2] || "").trim();
  const projectIdArg = (process.argv[3] || "").trim();
  const useDockerArg = (process.argv[4] || "").trim();

  if (tokenArg) {
    process.env.BWS_ACCESS_TOKEN = tokenArg;
  }
  if (projectIdArg) {
    process.env.BWS_PROJECT_ID = projectIdArg;
  }
  if (useDockerArg) {
    process.env.BW_USE_DOCKER_BWS = parseBoolean(useDockerArg) ? "true" : "false";
  }

  if (tokenArg) {
    console.log("[start:local] Bitwarden token/project args detected from CLI.");
  }
}

function hasCommand(command) {
  const checker = isWindows ? "where" : "which";
  const result = spawnSync(checker, [command], { stdio: "ignore" });
  return result.status === 0;
}

function run(command, args, options = {}) {
  const rendered = `${command} ${args.join(" ")}`.trim();
  console.log(`[start:local] ${rendered}`);

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || repoRoot,
      env: options.env || process.env,
      stdio: options.stdio || "inherit",
      detached: options.detached || false,
      windowsHide: true,
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Command failed (${code}): ${rendered}`));
    });
  });
}

function runSync(command, args) {
  return spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
  });
}

function npmInvocation(args) {
  if (isWindows) {
    return {
      command: "cmd",
      args: ["/d", "/s", "/c", "npm", ...args],
    };
  }
  return {
    command: "npm",
    args,
  };
}

async function runNpm(args) {
  const invocation = npmInvocation(args);
  await run(invocation.command, invocation.args);
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function isPidRunning(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readExistingPid() {
  if (!fs.existsSync(pidFilePath)) {
    return 0;
  }
  const raw = fs.readFileSync(pidFilePath, "utf8").trim();
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 0;
  }
  return parsed;
}

function clearStalePidFiles() {
  const existingPid = readExistingPid();
  if (!existingPid) {
    return;
  }
  if (isPidRunning(existingPid)) {
    throw new Error(
      `Local app is already running (pid ${existingPid}). Run "npm run stop:local" first or tail logs at ${path.relative(repoRoot, logFilePath)}.`,
    );
  }
  fs.rmSync(pidFilePath, { force: true });
  fs.rmSync(stateFilePath, { force: true });
}

function hasAllNodeModules() {
  const required = [
    "node_modules",
    "apps/web/node_modules",
    "apps/server/node_modules",
    "apps/orchestrator/node_modules",
    "apps/runner/node_modules",
  ];
  return required.every((relativePath) => fs.existsSync(path.join(repoRoot, relativePath)));
}

async function ensureLocalSetup() {
  if (!hasCommand("npm")) {
    throw new Error("npm is not installed. Install Node.js + npm first.");
  }

  const hasAccessToken = Boolean((process.env.BWS_ACCESS_TOKEN || "").trim());
  const needsInstall = !hasAllNodeModules();

  if (needsInstall) {
    console.log("[start:local] Dependencies not found. Running setup...");
    await runNpm(["run", hasAccessToken ? "setup:bitwarden" : "setup"]);
    return;
  }

  await runNpm(["run", "setup:env:local"]);
  if (hasAccessToken) {
    await runNpm(["run", "env:sync:bitwarden"]);
  }
}

function canConnectRedis(host = "127.0.0.1", port = 6379, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    let settled = false;

    const finish = (ok) => {
      if (settled) {
        return;
      }
      settled = true;
      try {
        socket.destroy();
      } catch {
        // no-op
      }
      resolve(ok);
    };

    socket.setTimeout(timeoutMs);
    socket.on("connect", () => finish(true));
    socket.on("timeout", () => finish(false));
    socket.on("error", () => finish(false));
  });
}

function isDockerAvailable() {
  if (!hasCommand("docker")) {
    return false;
  }
  const result = runSync("docker", ["info"]);
  return result.status === 0;
}

function dockerContainerExists(name) {
  const result = runSync("docker", ["ps", "-a", "--filter", `name=^/${name}$`, "--format", "{{.Names}}"]);
  if (result.status !== 0) {
    return false;
  }
  return (result.stdout || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .includes(name);
}

function dockerContainerRunning(name) {
  const result = runSync("docker", ["ps", "--filter", `name=^/${name}$`, "--format", "{{.Names}}"]);
  if (result.status !== 0) {
    return false;
  }
  return (result.stdout || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .includes(name);
}

async function ensureRedis() {
  if (await canConnectRedis()) {
    return { managed: false };
  }

  if (!isDockerAvailable()) {
    console.warn(
      '[start:local] Redis is not reachable on localhost:6379 and Docker is not available. Start Redis manually or run "docker run -d --name codestream-redis -p 6379:6379 redis:7-alpine".',
    );
    return { managed: false };
  }

  if (dockerContainerRunning(managedRedisContainerName)) {
    return { managed: false };
  }

  if (dockerContainerExists(managedRedisContainerName)) {
    await run("docker", ["start", managedRedisContainerName]);
  } else {
    await run("docker", [
      "run",
      "-d",
      "--name",
      managedRedisContainerName,
      "-p",
      "6379:6379",
      "redis:7-alpine",
    ]);
  }

  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    // eslint-disable-next-line no-await-in-loop
    if (await canConnectRedis()) {
      return { managed: true };
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error("Redis container was started but localhost:6379 is still unreachable.");
}

function startAppProcess() {
  ensureDirectory(tmpDir);
  const outFd = fs.openSync(logFilePath, "a");

  const invocation = npmInvocation(["run", "dev:local"]);
  const child = spawn(invocation.command, invocation.args, {
    cwd: repoRoot,
    env: process.env,
    detached: true,
    stdio: ["ignore", outFd, outFd],
    windowsHide: true,
  });

  child.unref();
  return child.pid;
}

function writeState(pid, managedRedis) {
  ensureDirectory(tmpDir);
  fs.writeFileSync(pidFilePath, `${pid}\n`, "utf8");
  fs.writeFileSync(
    stateFilePath,
    JSON.stringify(
      {
        pid,
        managedRedis,
        logFile: path.relative(repoRoot, logFilePath),
        startedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf8",
  );
}

async function main() {
  applyCliBitwardenArgs();
  clearStalePidFiles();
  await ensureLocalSetup();
  const redisState = await ensureRedis();
  const pid = startAppProcess();
  writeState(pid, redisState.managed);

  console.log(`[start:local] App started in background (pid ${pid}).`);
  console.log(`[start:local] Logs: ${path.relative(repoRoot, logFilePath)}`);
  console.log('[start:local] Stop with: npm run stop:local');
}

main().catch((error) => {
  console.error(`[start:local] ${error.message}`);
  process.exit(1);
});
