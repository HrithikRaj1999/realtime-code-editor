import fs from "fs";
import path from "path";
import { spawn, spawnSync } from "child_process";

const repoRoot = process.cwd();
const isWindows = process.platform === "win32";

function parseBoolean(value, fallback = false) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function hasCommand(command) {
  const checker = isWindows ? "where" : "which";
  const result = spawnSync(checker, [command], { stdio: "ignore" });
  return result.status === 0;
}

function resolveBwsRuntime() {
  const forceDocker = parseBoolean(process.env.BW_USE_DOCKER_BWS, false);
  const hasLocalBws = hasCommand("bws");
  const hasDocker = hasCommand("docker");
  const dockerImage = (process.env.BW_DOCKER_IMAGE || "bitwarden/bws").trim();

  if (!forceDocker && hasLocalBws) {
    return {
      mode: "local",
      command: "bws",
      argsPrefix: [],
      label: "local bws CLI",
    };
  }

  if (!hasDocker) {
    if (forceDocker) {
      throw new Error('Docker not found, but BW_USE_DOCKER_BWS=true was set. Install Docker or unset BW_USE_DOCKER_BWS.');
    }
    throw new Error(
      'Bitwarden CLI not found. Install local "bws" or install Docker and use BW_USE_DOCKER_BWS=true.',
    );
  }

  const dockerArgs = ["run", "--rm", "-i"];
  const accessToken = (process.env.BWS_ACCESS_TOKEN || "").trim();
  if (accessToken) {
    dockerArgs.push("-e", `BWS_ACCESS_TOKEN=${accessToken}`);
  }
  const serverUrl = (process.env.BWS_SERVER_URL || "").trim();
  if (serverUrl) {
    dockerArgs.push("-e", `BWS_SERVER_URL=${serverUrl}`);
  }
  dockerArgs.push(dockerImage);

  return {
    mode: "docker",
    command: "docker",
    argsPrefix: dockerArgs,
    label: `Docker image ${dockerImage}`,
  };
}

function run(command, args, env = process.env) {
  const rendered = `${command} ${args.join(" ")}`.trim();
  console.log(`[bitwarden] ${rendered}`);

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
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

function readBwsSecretsAsEnvLines(runtime) {
  const args = ["secret", "list"];
  const projectId = (process.env.BWS_PROJECT_ID || "").trim();
  if (projectId) {
    args.push(projectId);
  }
  args.push("--output", "env");

  const command = runtime.command;
  const finalArgs = runtime.mode === "docker" ? [...runtime.argsPrefix, ...args] : args;

  const result = spawnSync(command, finalArgs, {
    env: process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  if (result.status !== 0) {
    const stderr = (result.stderr || "").trim();
    throw new Error(
      `Failed to fetch secrets from Bitwarden. ${stderr || "Check BWS_ACCESS_TOKEN / BWS_PROJECT_ID and bws login."}`,
    );
  }

  return (result.stdout || "").split(/\r?\n/);
}

function parseEnvOutput(lines) {
  const extracted = new Map();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");
    if (separator < 1) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    const quoted =
      (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"));
    if (quoted && value.length >= 2) {
      value = value.slice(1, -1);
    }

    if (!key) {
      continue;
    }
    extracted.set(key, value);
  }

  return extracted;
}

function setOrAppendKey(filePath, key, value) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  let replaced = false;

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = raw.indexOf("=");
    if (separator === -1) {
      continue;
    }
    const existingKey = raw.slice(0, separator).trim();
    if (existingKey !== key) {
      continue;
    }
    lines[i] = `${key}=${value}`;
    replaced = true;
    break;
  }

  if (!replaced) {
    lines.push(`${key}=${value}`);
  }

  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
}

function applyLocalOverrides(secretMap) {
  const mappings = [
    { secret: "LOCAL_SERVER_REDIS_HOST", file: "apps/server/.env.local", key: "REDIS_HOST" },
    { secret: "LOCAL_SERVER_ORCHESTRATOR_URL", file: "apps/server/.env.local", key: "ORCHESTRATOR_URL" },
    { secret: "LOCAL_SERVER_CLIENT_URL", file: "apps/server/.env.local", key: "CLIENT_URL" },
    { secret: "LOCAL_SERVER_JWT_SECRET", file: "apps/server/.env.common", key: "JWT_SECRET" },
    { secret: "LOCAL_ORCHESTRATOR_REDIS_HOST", file: "apps/orchestrator/.env.local", key: "REDIS_HOST" },
    { secret: "LOCAL_RUNNER_REDIS_HOST", file: "apps/runner/.env.local", key: "REDIS_HOST" },
    { secret: "LOCAL_WEB_VITE_API_URL", file: "apps/web/.env.local", key: "VITE_API_URL" },
    { secret: "LOCAL_WEB_VITE_WS_URL", file: "apps/web/.env.local", key: "VITE_WS_URL" },
    { secret: "LOCAL_WEB_VITE_SITE_URL", file: "apps/web/.env.common", key: "VITE_SITE_URL" },
  ];

  let applied = 0;
  for (const mapping of mappings) {
    const value = secretMap.get(mapping.secret);
    if (!value) {
      continue;
    }
    const targetPath = path.join(repoRoot, mapping.file);
    setOrAppendKey(targetPath, mapping.key, value);
    applied += 1;
  }

  if (applied > 0) {
    console.log(`[bitwarden] Applied ${applied} local env override(s) from LOCAL_* secrets.`);
  }
}

async function main() {
  if (!(process.env.BWS_ACCESS_TOKEN || "").trim()) {
    throw new Error(
      "Missing BWS_ACCESS_TOKEN. Create a Bitwarden machine account access token and export it before running setup:bitwarden.",
    );
  }

  const runtime = resolveBwsRuntime();
  console.log(`[bitwarden] Using ${runtime.label}`);

  const lines = readBwsSecretsAsEnvLines(runtime);
  const secretMap = parseEnvOutput(lines);
  if (secretMap.size === 0) {
    throw new Error(
      "No secrets returned from Bitwarden. Check machine account permissions/project selection.",
    );
  }

  for (const [key, value] of secretMap.entries()) {
    process.env[key] = value;
  }
  console.log(`[bitwarden] Loaded ${secretMap.size} secret(s) from Bitwarden.`);

  await run(process.execPath, ["scripts/setup-env.mjs", "local"]);

  const includeCloudControlEnv = parseBoolean(process.env.BW_INCLUDE_CLOUD_CONTROL_ENV, false);
  const allowPartial = parseBoolean(process.env.BW_ALLOW_PARTIAL_ENV, false);

  const generatorEnv = {
    ...process.env,
    GH_INCLUDE_CLOUD_CONTROL_ENV: includeCloudControlEnv ? "true" : "false",
    GH_ALLOW_PARTIAL_ENV: allowPartial ? "true" : "false",
    GH_CLOUD_ACTION: "none",
  };

  await run(process.execPath, ["scripts/generate-ci-env.mjs"], generatorEnv);
  applyLocalOverrides(secretMap);

  console.log("[bitwarden] Env sync completed.");
  console.log("[bitwarden] Next commands:");
  console.log("- npm run dev:local");
  console.log("- npm run dev:cloud");
}

main().catch((error) => {
  console.error(`[bitwarden] ${error.message}`);
  process.exit(1);
});
