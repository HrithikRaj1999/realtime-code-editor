import fs from "fs";
import path from "path";

const repoRoot = process.cwd();

function parseBoolean(value, fallback = false) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function readEnvFileToMap(filePath) {
  const map = new Map();
  if (!fs.existsSync(filePath)) {
    return map;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");
    if (separator < 1) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (quoted && value.length >= 2) {
      value = value.slice(1, -1);
    }

    if (!key || map.has(key)) {
      continue;
    }
    map.set(key, value);
  }

  return map;
}

function collectFallbackEnv() {
  const fallback = new Map();
  const candidates = [
    ".env.stop-cloud",
    "apps/server/.env.common",
    "apps/server/.env.local",
    "apps/server/.env.cloud",
    "apps/orchestrator/.env.common",
    "apps/orchestrator/.env.local",
    "apps/orchestrator/.env.cloud",
    "apps/runner/.env.common",
    "apps/runner/.env.local",
    "apps/runner/.env.cloud",
    "apps/web/.env.common",
    "apps/web/.env.local",
    "apps/web/.env.cloud",
  ];

  for (const relativePath of candidates) {
    const absolutePath = path.join(repoRoot, relativePath);
    const fileMap = readEnvFileToMap(absolutePath);
    for (const [key, value] of fileMap.entries()) {
      if (!fallback.has(key)) {
        fallback.set(key, value);
      }
    }
  }

  return fallback;
}

function firstNonEmpty(values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

function resolveEnv(names, fallbackMap) {
  const fromProcess = firstNonEmpty(names.map((name) => process.env[name]));
  if (fromProcess) {
    return fromProcess;
  }
  return firstNonEmpty(names.map((name) => fallbackMap.get(name)));
}

function ensureFileFromExample(relativePath) {
  const filePath = path.join(repoRoot, relativePath);
  if (fs.existsSync(filePath)) {
    return;
  }

  const examplePath = `${filePath}.example`;
  if (fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, filePath);
    return;
  }

  fs.writeFileSync(filePath, "", "utf8");
}

function setOrAppendKey(relativePath, key, value) {
  const filePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  let replaced = false;

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = raw.indexOf("=");
    if (separator < 0) {
      continue;
    }

    const currentKey = raw.slice(0, separator).trim();
    if (currentKey !== key) {
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

function writeEntries(relativePath, entries) {
  ensureFileFromExample(relativePath);
  for (const [key, value] of entries) {
    if (value === undefined || value === null || String(value).trim() === "") {
      continue;
    }
    setOrAppendKey(relativePath, key, String(value).trim());
  }
}

function inferHostPortFromUrl(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (!value) {
    return "";
  }
  try {
    const parsed = new URL(value);
    return parsed.port ? `${parsed.hostname}:${parsed.port}` : parsed.hostname;
  } catch {
    return "";
  }
}

function normalizeOrchestratorUrl(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) {
    return "";
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return `http://${value}`;
}

function resolveRedis(prefix, fallbackMap) {
  const sharedUrl = resolveEnv(["SHARED_REDIS_URL"], fallbackMap);
  const sharedHost = resolveEnv(["SHARED_REDIS_HOST"], fallbackMap);
  const sharedPort = resolveEnv(["SHARED_REDIS_PORT"], fallbackMap) || "6379";

  const url = resolveEnv([`${prefix}_REDIS_URL`], fallbackMap) || sharedUrl;
  const host = resolveEnv([`${prefix}_REDIS_HOST`], fallbackMap) || sharedHost;
  const port = resolveEnv([`${prefix}_REDIS_PORT`], fallbackMap) || sharedPort;

  return { url, host, port };
}

function hasRedisConfig(redis) {
  if (redis.url) {
    return true;
  }
  return Boolean(redis.host && redis.port);
}

function buildConfig(fallbackMap) {
  const serverClientUrl = resolveEnv(["SERVER_CLIENT_URL"], fallbackMap);
  const serverJwtSecret = resolveEnv(["SERVER_JWT_SECRET"], fallbackMap);
  const orchestratorHostPort = resolveEnv(["SERVER_ORCHESTRATOR_HOSTPORT"], fallbackMap);
  const orchestratorUrlRaw = resolveEnv(["SERVER_ORCHESTRATOR_URL"], fallbackMap);
  const orchestratorUrl = normalizeOrchestratorUrl(orchestratorUrlRaw || orchestratorHostPort);
  const orchestratorHostPortResolved =
    orchestratorHostPort || inferHostPortFromUrl(orchestratorUrlRaw);

  const webApiUrl = resolveEnv(["WEB_VITE_API_URL"], fallbackMap);
  const webWsUrl = resolveEnv(["WEB_VITE_WS_URL"], fallbackMap);
  const webSiteUrl = resolveEnv(["WEB_VITE_SITE_URL"], fallbackMap) || serverClientUrl;

  const serverRedis = resolveRedis("SERVER", fallbackMap);
  const orchestratorRedis = resolveRedis("ORCHESTRATOR", fallbackMap);
  const runnerRedis = resolveRedis("RUNNER", fallbackMap);

  return {
    flags: {
      allowPartial: parseBoolean(resolveEnv(["GH_ALLOW_PARTIAL_ENV"], fallbackMap), false),
      includeCloudControl: parseBoolean(
        resolveEnv(["GH_INCLUDE_CLOUD_CONTROL_ENV"], fallbackMap),
        false,
      ),
    },
    server: {
      deployEnv: "cloud",
      runOnCloud: "true",
      port: resolveEnv(["SERVER_PORT"], fallbackMap) || "5000",
      redis: serverRedis,
      orchestratorUrl,
      orchestratorHostPort: orchestratorHostPortResolved,
      clientUrl: serverClientUrl,
      jwtSecret: serverJwtSecret,
    },
    orchestrator: {
      deployEnv: "cloud",
      runOnCloud: "true",
      port: resolveEnv(["ORCHESTRATOR_PORT"], fallbackMap) || "4000",
      redis: orchestratorRedis,
    },
    runner: {
      deployEnv: "cloud",
      runOnCloud: "true",
      redis: runnerRedis,
    },
    web: {
      runOnCloud: "true",
      apiUrl: webApiUrl,
      wsUrl: webWsUrl,
      siteUrl: webSiteUrl,
    },
    control: {
      cloudflareApiToken: resolveEnv(["CONTROL_CLOUDFLARE_API_TOKEN"], fallbackMap),
      cloudflareAccountId: resolveEnv(["CONTROL_CLOUDFLARE_ACCOUNT_ID"], fallbackMap),
      cloudflarePagesProjects: resolveEnv(["CONTROL_CLOUDFLARE_PAGES_PROJECTS"], fallbackMap),
      renderApiKey: resolveEnv(["CONTROL_RENDER_API_KEY"], fallbackMap),
      renderOwnerId: resolveEnv(["CONTROL_RENDER_OWNER_ID"], fallbackMap),
      renderBlueprintId: resolveEnv(["CONTROL_RENDER_BLUEPRINT_ID"], fallbackMap),
      renderServiceIds: resolveEnv(["CONTROL_RENDER_SERVICE_IDS"], fallbackMap),
      renderKeyValueIds: resolveEnv(["CONTROL_RENDER_KEY_VALUE_IDS"], fallbackMap),
      redisUrl: resolveEnv(["CONTROL_REDIS_URL"], fallbackMap),
    },
  };
}

function validateConfig(config) {
  if (config.flags.allowPartial) {
    return;
  }

  const missing = [];

  if (!config.server.clientUrl) {
    missing.push("SERVER_CLIENT_URL");
  }
  if (!config.server.jwtSecret) {
    missing.push("SERVER_JWT_SECRET");
  }
  if (!config.web.apiUrl) {
    missing.push("WEB_VITE_API_URL");
  }
  if (!config.web.wsUrl) {
    missing.push("WEB_VITE_WS_URL");
  }
  if (!config.server.orchestratorUrl && !config.server.orchestratorHostPort) {
    missing.push("SERVER_ORCHESTRATOR_URL or SERVER_ORCHESTRATOR_HOSTPORT");
  }

  const hasAnyRedis =
    hasRedisConfig(config.server.redis) ||
    hasRedisConfig(config.orchestrator.redis) ||
    hasRedisConfig(config.runner.redis);
  if (!hasAnyRedis) {
    missing.push(
      "Redis config for server/orchestrator/runner (set *_REDIS_URL or *_REDIS_HOST + *_REDIS_PORT, or SHARED_REDIS_*)",
    );
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required secret values for CI env generation:\n- ${missing.join("\n- ")}\nSet GH_ALLOW_PARTIAL_ENV=true to bypass.`,
    );
  }
}

function writeCloudEnvFiles(config) {
  writeEntries("apps/server/.env.cloud", [
    ["DEPLOY_ENV", config.server.deployEnv],
    ["RUN_ON_CLOUD", config.server.runOnCloud],
    ["PORT", config.server.port],
    ["REDIS_URL", config.server.redis.url],
    ["REDIS_HOST", config.server.redis.host],
    ["REDIS_PORT", config.server.redis.port],
    ["ORCHESTRATOR_URL", config.server.orchestratorUrl],
    ["ORCHESTRATOR_HOSTPORT", config.server.orchestratorHostPort],
    ["CLIENT_URL", config.server.clientUrl],
    ["JWT_SECRET", config.server.jwtSecret],
  ]);

  writeEntries("apps/orchestrator/.env.cloud", [
    ["DEPLOY_ENV", config.orchestrator.deployEnv],
    ["RUN_ON_CLOUD", config.orchestrator.runOnCloud],
    ["PORT", config.orchestrator.port],
    ["REDIS_URL", config.orchestrator.redis.url],
    ["REDIS_HOST", config.orchestrator.redis.host],
    ["REDIS_PORT", config.orchestrator.redis.port],
  ]);

  writeEntries("apps/runner/.env.cloud", [
    ["DEPLOY_ENV", config.runner.deployEnv],
    ["RUN_ON_CLOUD", config.runner.runOnCloud],
    ["REDIS_URL", config.runner.redis.url],
    ["REDIS_HOST", config.runner.redis.host],
    ["REDIS_PORT", config.runner.redis.port],
  ]);

  writeEntries("apps/web/.env.cloud", [
    ["VITE_RUN_ON_CLOUD", config.web.runOnCloud],
    ["VITE_API_URL", config.web.apiUrl],
    ["VITE_WS_URL", config.web.wsUrl],
    ["VITE_SITE_URL", config.web.siteUrl],
  ]);
}

function writeCloudControlEnv(config) {
  writeEntries(".env.stop-cloud", [
    ["CLOUDFLARE_API_TOKEN", config.control.cloudflareApiToken],
    ["CLOUDFLARE_ACCOUNT_ID", config.control.cloudflareAccountId],
    ["CLOUDFLARE_PAGES_PROJECTS", config.control.cloudflarePagesProjects],
    ["RENDER_API_KEY", config.control.renderApiKey],
    ["RENDER_OWNER_ID", config.control.renderOwnerId],
    ["RENDER_BLUEPRINT_ID", config.control.renderBlueprintId],
    ["RENDER_SERVICE_IDS", config.control.renderServiceIds],
    ["RENDER_KEY_VALUE_IDS", config.control.renderKeyValueIds],
    ["REDIS_URL", config.control.redisUrl],
  ]);
}

function main() {
  const fallbackMap = collectFallbackEnv();
  const config = buildConfig(fallbackMap);

  validateConfig(config);
  writeCloudEnvFiles(config);

  if (config.flags.includeCloudControl) {
    writeCloudControlEnv(config);
    console.log("[env:generate:ci] Updated apps/*/.env.cloud + .env.stop-cloud");
    return;
  }

  console.log("[env:generate:ci] Updated apps/*/.env.cloud");
}

try {
  main();
} catch (error) {
  console.error(error.message || String(error));
  process.exit(1);
}
