import { spawn, spawnSync } from "child_process";

const isWindows = process.platform === "win32";
const useBitwarden = process.argv.includes("--bitwarden");

function run(command, args) {
  const rendered = `${command} ${args.join(" ")}`.trim();
  console.log(`[setup] ${rendered}`);

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
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

function runNpm(args) {
  if (isWindows) {
    return run("cmd", ["/d", "/s", "/c", "npm", ...args]);
  }
  return run("npm", args);
}

async function runNpmWithFallback(primaryArgs, fallbackArgs) {
  try {
    await runNpm(primaryArgs);
  } catch (error) {
    const renderedPrimary = primaryArgs.join(" ");
    const renderedFallback = fallbackArgs.join(" ");
    console.warn(`[setup] Primary npm command failed: npm ${renderedPrimary}`);
    console.warn(`[setup] Retrying with fallback: npm ${renderedFallback}`);
    await runNpm(fallbackArgs);
  }
}

async function installWorkspaceDependencies() {
  const apps = ["web", "server", "orchestrator", "runner"];
  for (const app of apps) {
    const prefixArgs = ["--prefix", `apps/${app}`];
    await runNpmWithFallback([...prefixArgs, "ci"], [...prefixArgs, "install"]);
  }
}

function hasCommand(command) {
  const checker = isWindows ? "where" : "which";
  const result = spawnSync(checker, [command], { stdio: "ignore" });
  return result.status === 0;
}

function hasAny(commands) {
  return commands.some((command) => hasCommand(command));
}

function printDependencyHints() {
  const missing = [];

  if (!hasAny(["docker", "docker.exe"])) {
    missing.push("Docker");
  }
  if (!hasAny(["redis-server", "redis-server.exe"])) {
    missing.push("Redis (or run via Docker)");
  }
  if (!hasAny(["python3", "python", "py"])) {
    missing.push("Python");
  }
  if (!(hasCommand("javac") && hasCommand("java"))) {
    missing.push("Java JDK");
  }
  if (!hasCommand("go")) {
    missing.push("Go");
  }
  if (!hasAny(["g++", "clang++"])) {
    missing.push("C++ compiler (g++ or clang++)");
  }
  if (!hasAny(["gcc", "clang"])) {
    missing.push("C compiler (gcc or clang)");
  }

  if (missing.length === 0) {
    console.log("[setup] Runtime tool check passed.");
    return;
  }

  console.warn(`[setup] Missing optional local runtimes/tools: ${missing.join(", ")}`);
  if (isWindows) {
    console.warn(
      "[setup] Windows hint: install with winget (Docker Desktop, Python, OpenJDK, Go, LLVM/MSYS2) or use Docker-only execution.",
    );
    return;
  }
  console.warn(
    "[setup] Linux hint: install with apt/yum/apk (docker, redis-server, python3, openjdk, golang, build-essential/clang).",
  );
}

async function main() {
  console.log(`[setup] Platform: ${process.platform}`);
  console.log("[setup] Installing dependencies and preparing env files...");

  await runNpmWithFallback(["ci"], ["install"]);
  await installWorkspaceDependencies();
  await runNpm(["run", "setup:env:local"]);

  if (useBitwarden) {
    await run(process.execPath, ["scripts/bitwarden-sync-env.mjs"]);
  }

  printDependencyHints();

  console.log("[setup] Completed.");
  console.log("[setup] Next commands:");
  console.log("- npm run dev:local");
  console.log("- npm run dev:cloud");
}

main().catch((error) => {
  console.error(`[setup] ${error.message}`);
  process.exit(1);
});
