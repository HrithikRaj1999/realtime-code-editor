import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const repoRoot = process.cwd();
const isWindows = process.platform === "win32";
const tmpDir = path.join(repoRoot, ".tmp");
const pidFilePath = path.join(tmpDir, "local-dev.pid");
const stateFilePath = path.join(tmpDir, "local-dev.state.json");
const managedRedisContainerName = "codestream-redis";

function runSync(command, args) {
  return spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
  });
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

function readPid() {
  if (!fs.existsSync(pidFilePath)) {
    return 0;
  }
  const raw = fs.readFileSync(pidFilePath, "utf8").trim();
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function readState() {
  if (!fs.existsSync(stateFilePath)) {
    return { managedRedis: false };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(stateFilePath, "utf8"));
    return {
      managedRedis: Boolean(parsed?.managedRedis),
    };
  } catch {
    return { managedRedis: false };
  }
}

function stopProcessTree(pid) {
  if (!isPidRunning(pid)) {
    return false;
  }

  if (isWindows) {
    const result = runSync("taskkill", ["/PID", String(pid), "/T", "/F"]);
    if (result.status !== 0) {
      throw new Error((result.stderr || result.stdout || "taskkill failed").trim());
    }
    return true;
  }

  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    process.kill(pid, "SIGTERM");
  }
  return true;
}

function cleanupPidFiles() {
  fs.rmSync(pidFilePath, { force: true });
  fs.rmSync(stateFilePath, { force: true });
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

function stopManagedRedisIfNeeded(managedRedis) {
  if (!managedRedis) {
    return;
  }
  const dockerCheck = runSync(isWindows ? "where" : "which", ["docker"]);
  if (dockerCheck.status !== 0) {
    return;
  }
  if (!dockerContainerRunning(managedRedisContainerName)) {
    return;
  }
  runSync("docker", ["stop", managedRedisContainerName]);
}

function main() {
  const pid = readPid();
  const state = readState();

  if (!pid) {
    cleanupPidFiles();
    stopManagedRedisIfNeeded(state.managedRedis);
    console.log("[stop:local] No tracked local app process is running.");
    return;
  }

  const stopped = stopProcessTree(pid);
  cleanupPidFiles();
  stopManagedRedisIfNeeded(state.managedRedis);

  if (stopped) {
    console.log(`[stop:local] Stopped local app process tree (pid ${pid}).`);
  } else {
    console.log("[stop:local] Tracked process was not running.");
  }
}

try {
  main();
} catch (error) {
  console.error(`[stop:local] ${error.message}`);
  process.exit(1);
}
