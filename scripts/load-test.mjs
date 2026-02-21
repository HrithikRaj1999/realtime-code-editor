import { spawn } from "child_process";

function parseBoolean(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function getAppEnvArgs() {
  const args = [];
  const prefix = "LOADTEST_APP_ENV_";

  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith(prefix)) {
      continue;
    }
    const envKey = key.slice(prefix.length);
    if (!envKey || value === undefined) {
      continue;
    }
    args.push("-e", `${envKey}=${value}`);
  }

  return args;
}

function runCommand(command, args, { dryRun = false } = {}) {
  const rendered = `${command} ${args.join(" ")}`.trim();
  console.log(`[load-test] ${rendered}`);

  if (dryRun) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      windowsHide: true,
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Command failed with exit code ${code}: ${rendered}`));
    });
  });
}

function printHelp() {
  console.log(`Load test commands:
- stress:cpu-mem   Safe CPU + RAM stress in isolated container
- stress:io        Safe disk I/O stress in isolated container
- app:start        Start app container with strict limits
- app:stats        Observe app resource usage
- app:logs         Tail app logs
- app:inspect      Check OOM/exit state
- http:wrk         Run HTTP load test from isolated wrk container
- chaos:restart    Stop + start app container (manual chaos)
- help             Show this help

Examples:
- npm run test:load:cpu-mem
- npm run test:load:io
- npm run test:load:app:start
- npm run test:load:http
- npm run test:load:chaos:restart

Common environment overrides:
- LOADTEST_CPUS=1.0
- LOADTEST_MEMORY=512m
- LOADTEST_PIDS_LIMIT=256
- LOADTEST_TIMEOUT=60s
- LOADTEST_APP_NAME=myapp
- LOADTEST_APP_IMAGE=myapp:latest
- LOADTEST_HOST_PORT=4000
- LOADTEST_CONTAINER_PORT=4000
- LOADTEST_HTTP_TARGET=http://host.docker.internal:4000/health
- LOADTEST_WRK_THREADS=4
- LOADTEST_WRK_CONNECTIONS=200
- LOADTEST_WRK_DURATION=30s

Flags:
- --dry-run    Print commands without executing`);
}

function getDockerGuardArgs() {
  const cpus = process.env.LOADTEST_CPUS || "1.0";
  const memory = process.env.LOADTEST_MEMORY || "512m";
  const pidsLimit = process.env.LOADTEST_PIDS_LIMIT || "256";
  return ["--cpus", cpus, "--memory", memory, "--pids-limit", pidsLimit];
}

async function runStressCpuMem({ dryRun }) {
  const timeout = process.env.LOADTEST_TIMEOUT || "60s";
  const vmBytes = process.env.LOADTEST_VM_BYTES || "350m";
  const args = [
    "run",
    "--rm",
    ...getDockerGuardArgs(),
    "alpine",
    "sh",
    "-lc",
    `apk add --no-cache stress-ng && stress-ng --cpu 1 --vm 1 --vm-bytes ${vmBytes} --timeout ${timeout} --metrics-brief`,
  ];
  await runCommand("docker", args, { dryRun });
}

async function runStressIo({ dryRun }) {
  const timeout = process.env.LOADTEST_TIMEOUT || "60s";
  const hddBytes = process.env.LOADTEST_HDD_BYTES || "300m";
  const args = [
    "run",
    "--rm",
    ...getDockerGuardArgs(),
    "alpine",
    "sh",
    "-lc",
    `apk add --no-cache stress-ng && stress-ng --hdd 1 --hdd-bytes ${hddBytes} --timeout ${timeout} --metrics-brief`,
  ];
  await runCommand("docker", args, { dryRun });
}

async function runAppStart({ dryRun }) {
  const appName = process.env.LOADTEST_APP_NAME || "myapp";
  const appImage = process.env.LOADTEST_APP_IMAGE || "myapp:latest";
  const hostPort = process.env.LOADTEST_HOST_PORT || "4000";
  const containerPort = process.env.LOADTEST_CONTAINER_PORT || "4000";

  if (parseBoolean(process.env.LOADTEST_FORCE_RECREATE)) {
    await runCommand("docker", ["rm", "-f", appName], { dryRun }).catch(() => undefined);
  }

  const args = [
    "run",
    "-d",
    "--name",
    appName,
    ...getDockerGuardArgs(),
    ...getAppEnvArgs(),
    "-p",
    `${hostPort}:${containerPort}`,
    appImage,
  ];
  await runCommand("docker", args, { dryRun });
}

async function runAppStats({ dryRun }) {
  const appName = process.env.LOADTEST_APP_NAME || "myapp";
  const streamStats = parseBoolean(process.env.LOADTEST_STATS_STREAM);
  const args = ["stats"];
  if (!streamStats) {
    args.push("--no-stream");
  }
  args.push(appName);
  await runCommand("docker", args, { dryRun });
}

async function runAppLogs({ dryRun }) {
  const appName = process.env.LOADTEST_APP_NAME || "myapp";
  const follow = parseBoolean(process.env.LOADTEST_LOGS_FOLLOW);
  const tail = process.env.LOADTEST_LOGS_TAIL || "200";
  const args = ["logs", "--tail", tail];
  if (follow) {
    args.push("-f");
  }
  args.push(appName);
  await runCommand("docker", args, { dryRun });
}

async function runAppInspect({ dryRun }) {
  const appName = process.env.LOADTEST_APP_NAME || "myapp";
  const args = [
    "inspect",
    appName,
    "--format",
    "OOMKilled={{.State.OOMKilled}} ExitCode={{.State.ExitCode}}",
  ];
  await runCommand("docker", args, { dryRun });
}

async function runHttpWrk({ dryRun }) {
  const target = process.env.LOADTEST_HTTP_TARGET || "http://host.docker.internal:4000/health";
  const threads = process.env.LOADTEST_WRK_THREADS || "4";
  const connections = process.env.LOADTEST_WRK_CONNECTIONS || "200";
  const duration = process.env.LOADTEST_WRK_DURATION || "30s";
  const args = [
    "run",
    "--rm",
    "williamyeh/wrk",
    `-t${threads}`,
    `-c${connections}`,
    `-d${duration}`,
    target,
  ];
  await runCommand("docker", args, { dryRun });
}

async function runChaosRestart({ dryRun }) {
  const appName = process.env.LOADTEST_APP_NAME || "myapp";
  await runCommand("docker", ["stop", appName], { dryRun });
  await runCommand("docker", ["start", appName], { dryRun });
}

async function main() {
  const [, , rawCommand, ...restArgs] = process.argv;
  const command = rawCommand || "help";
  const dryRun = restArgs.includes("--dry-run") || parseBoolean(process.env.LOADTEST_DRY_RUN);

  switch (command) {
    case "stress:cpu-mem":
      await runStressCpuMem({ dryRun });
      return;
    case "stress:io":
      await runStressIo({ dryRun });
      return;
    case "app:start":
      await runAppStart({ dryRun });
      return;
    case "app:stats":
      await runAppStats({ dryRun });
      return;
    case "app:logs":
      await runAppLogs({ dryRun });
      return;
    case "app:inspect":
      await runAppInspect({ dryRun });
      return;
    case "http:wrk":
      await runHttpWrk({ dryRun });
      return;
    case "chaos:restart":
      await runChaosRestart({ dryRun });
      return;
    case "help":
    default:
      printHelp();
  }
}

main().catch((error) => {
  console.error(`[load-test] ${error.message}`);
  process.exit(1);
});
