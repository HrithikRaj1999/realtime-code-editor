import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";
const RENDER_API_BASE = "https://api.render.com/v1";
const DEFAULT_ENV_FILE = ".env.stop-cloud";
const VALID_ACTIONS = new Set(["stop", "start"]);
const DEPLOYABLE_RESOURCE_TYPES = new Set([
  "static_site",
  "web_service",
  "private_service",
  "background_worker",
  "cron_job",
  "web",
  "pserv",
  "worker",
]);
const KEY_VALUE_RESOURCE_TYPES = new Set(["key_value", "keyvalue", "redis", "valkey"]);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();
    const hasMatchingQuotes =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (hasMatchingQuotes && value.length >= 2) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return true;
}

function readAnyEnv(names, { required = true, label } = {}) {
  for (const name of names) {
    const value = (process.env[name] || "").trim();
    if (value) {
      return value;
    }
  }

  if (!required) {
    return "";
  }

  const target = label || names.join(" or ");
  throw new Error(`Missing required environment variable: ${target}`);
}

function parseCsv(value) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseBoolean(value) {
  const normalized = (value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function normalizeCloudflareProject(entry) {
  const raw = (entry || "").trim();
  if (!raw) {
    return "";
  }

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const host = (url.hostname || "").toLowerCase();
      if (host.endsWith(".pages.dev")) {
        return host.slice(0, -".pages.dev".length);
      }
      return host;
    } catch {
      return raw;
    }
  }

  return raw.replace(/\/+$/, "");
}

function parseCloudflareProjects(value) {
  const unique = new Set();
  for (const entry of parseCsv(value)) {
    const normalized = normalizeCloudflareProject(entry);
    if (normalized) {
      unique.add(normalized);
    }
  }
  return Array.from(unique);
}

function parseRenderServiceOverrides(value) {
  const services = [];
  for (const entry of parseCsv(value)) {
    const [maybeName, maybeId] = entry.split(":").map((part) => part.trim());
    const id = maybeId ? maybeId : maybeName;
    if (!id) {
      continue;
    }
    services.push({
      id,
      name: maybeId ? maybeName || id : id,
      type: "manual",
    });
  }
  return services;
}

function parseKeyValueOverrides(value) {
  const keyValues = [];
  for (const entry of parseCsv(value)) {
    const [maybeName, maybeId] = entry.split(":").map((part) => part.trim());
    const id = maybeId ? maybeId : maybeName;
    if (!id) {
      continue;
    }
    keyValues.push({
      id,
      name: maybeId ? maybeName || id : id,
      type: "key_value",
    });
  }
  return keyValues;
}

function extractKeyValueIdFromUrl(urlValue) {
  const raw = (urlValue || "").trim();
  if (!raw) {
    return "";
  }

  try {
    const parsed = new URL(raw);
    const host = (parsed.hostname || "").split(".")[0].trim();
    if (/^(red|kv)-[a-z0-9]+$/i.test(host)) {
      return host;
    }
  } catch {
    // fall through to regex parsing
  }

  const match = raw.match(/((?:red|kv)-[a-z0-9]+)/i);
  return match?.[1] || "";
}

function collectKeyValueOverridesFromEnv() {
  const fromIds = parseKeyValueOverrides(
    readAnyEnv(["RENDER_KEY_VALUE_IDS", "RENDER_REDIS_IDS"], { required: false }),
  );

  const urls = [
    readAnyEnv(["REDIS_URL"], { required: false }),
    readAnyEnv(["RENDER_REDIS_URL"], { required: false }),
    readAnyEnv(["RENDER_KEY_VALUE_URL"], { required: false }),
  ];

  const fromUrls = [];
  for (const urlValue of urls) {
    const id = extractKeyValueIdFromUrl(urlValue);
    if (!id) {
      continue;
    }
    fromUrls.push({
      id,
      name: id,
      type: "key_value",
    });
  }

  return mergeResources(fromIds, fromUrls);
}

function stringifyErrorDetails(details) {
  if (!details) {
    return "";
  }
  if (typeof details === "string") {
    return details;
  }
  if (Array.isArray(details)) {
    return details.map((item) => stringifyErrorDetails(item)).join("; ");
  }
  if (typeof details === "object") {
    if (typeof details.message === "string") {
      return details.message;
    }
    if (typeof details.error === "string") {
      return details.error;
    }
    if (Array.isArray(details.errors)) {
      return details.errors.map((item) => stringifyErrorDetails(item)).join("; ");
    }
    return JSON.stringify(details);
  }
  return String(details);
}

async function parseResponseBody(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    const text = await response.text();
    return text ? { raw: text } : null;
  } catch {
    return null;
  }
}

function failIfResponseNotOk({ response, body, label }) {
  if (response.ok) {
    return;
  }
  const details =
    stringifyErrorDetails(body?.errors) ||
    stringifyErrorDetails(body?.message) ||
    stringifyErrorDetails(body) ||
    "No error details provided";
  throw new Error(`${label} failed (${response.status}): ${details}`);
}

function resolveCloudflareAuth({ strict }) {
  const token = readAnyEnv(["CLOUDFLARE_API_TOKEN", "CLOUDFARE_API_TOKEN"], { required: false });
  if (token) {
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      mode: "api-token",
    };
  }

  const globalKey = readAnyEnv(["CLOUDFLARE_GLOBAL_KEY", "CLOUDFARE_GLOBAL_KEYS"], { required: false });
  const email = readAnyEnv(["CLOUDFLARE_EMAIL", "CLOUDFARE_EMAIL"], { required: false });
  if (globalKey && email) {
    return {
      headers: {
        "X-Auth-Key": globalKey,
        "X-Auth-Email": email,
      },
      mode: "global-key",
    };
  }

  if (!strict) {
    return null;
  }

  throw new Error(
    "Missing Cloudflare auth. Set CLOUDFLARE_API_TOKEN (recommended), or CLOUDFLARE_GLOBAL_KEY + CLOUDFLARE_EMAIL.",
  );
}

async function resolveCloudflareAccountId({ authHeaders, configuredAccountId, strict }) {
  if (configuredAccountId) {
    return configuredAccountId;
  }
  if (!authHeaders) {
    if (strict) {
      throw new Error("Missing CLOUDFLARE_ACCOUNT_ID and Cloudflare auth.");
    }
    return "";
  }

  const response = await fetch(`${CLOUDFLARE_API_BASE}/accounts?page=1&per_page=1`, {
    method: "GET",
    headers: {
      ...authHeaders,
      Accept: "application/json",
    },
  });
  const body = await parseResponseBody(response);
  failIfResponseNotOk({ response, body, label: "Cloudflare list accounts" });

  const accountId = body?.result?.[0]?.id || "";
  if (accountId) {
    return accountId;
  }
  if (strict) {
    throw new Error("Could not resolve CLOUDFLARE_ACCOUNT_ID from API.");
  }
  return "";
}

async function deleteCloudflarePagesProject({ authHeaders, accountId, projectName }) {
  const encodedProject = encodeURIComponent(projectName);
  const encodedAccount = encodeURIComponent(accountId);
  const url = `${CLOUDFLARE_API_BASE}/accounts/${encodedAccount}/pages/projects/${encodedProject}`;
  const label = `Cloudflare project "${projectName}" delete`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      ...authHeaders,
      Accept: "application/json",
    },
  });
  const body = await parseResponseBody(response);

  if (response.status === 404) {
    console.log(`[cloudflare] ${projectName} not found. Skipping.`);
    return { projectName, deleted: false, skipped: true };
  }

  failIfResponseNotOk({ response, body, label });

  if (body && body.success === false) {
    throw new Error(`${label} failed: ${stringifyErrorDetails(body.errors)}`);
  }

  console.log(`[cloudflare] Deleted project: ${projectName}`);
  return { projectName, deleted: true, skipped: false };
}

async function cloudflareStopFlow({ strict }) {
  const rawProjects = readAnyEnv(
    ["CLOUDFLARE_PAGES_PROJECTS", "CLOUDFARE_PAGES_PROJECTS", "CLOUDFLARE_PAGES_PROJECT"],
    {
      required: false,
    },
  );
  const projects = rawProjects ? parseCloudflareProjects(rawProjects) : [];

  if (projects.length === 0) {
    console.log("[stop:cloud] No Cloudflare projects configured. Skipping Cloudflare stop.");
    return;
  }
  if (projects.length < 2) {
    console.warn(
      `[stop:cloud] Only ${projects.length} Cloudflare project listed. If you use two pages projects, add both in CLOUDFLARE_PAGES_PROJECTS.`,
    );
  }

  const auth = resolveCloudflareAuth({ strict });
  if (!auth) {
    console.warn(
      "[stop:cloud] Cloudflare auth not configured. Skipping Cloudflare delete. Set CLOUDFLARE_API_TOKEN or global key + email.",
    );
    return;
  }
  if (auth.mode === "global-key") {
    console.log("[stop:cloud] Using Cloudflare global API key auth.");
  }

  const configuredAccountId = readAnyEnv(["CLOUDFLARE_ACCOUNT_ID"], { required: false });
  const accountId = await resolveCloudflareAccountId({
    authHeaders: auth.headers,
    configuredAccountId,
    strict,
  });

  if (!accountId) {
    console.warn(
      "[stop:cloud] Could not resolve CLOUDFLARE_ACCOUNT_ID. Skipping Cloudflare delete. Set CLOUDFLARE_ACCOUNT_ID to enable.",
    );
    return;
  }

  for (const projectName of projects) {
    await deleteCloudflarePagesProject({
      authHeaders: auth.headers,
      accountId,
      projectName,
    });
  }
}

function formatValidationErrors(errors) {
  if (!Array.isArray(errors) || errors.length === 0) {
    return "Unknown validation error";
  }
  return errors
    .map((entry) => {
      const where =
        entry.path && Number.isInteger(entry.line) && Number.isInteger(entry.column)
          ? `${entry.path} (line ${entry.line}, col ${entry.column})`
          : entry.path || `line ${entry.line || "?"}, col ${entry.column || "?"}`;
      return `${where}: ${entry.error || "Unknown error"}`;
    })
    .join("; ");
}

async function validateRenderBlueprint({ token, ownerId, blueprintFile }) {
  const resolvedPath = path.resolve(process.cwd(), blueprintFile);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Blueprint file not found: ${resolvedPath}`);
  }

  const fileBuffer = fs.readFileSync(resolvedPath);
  const form = new FormData();
  form.set("ownerId", ownerId);
  form.set("file", new Blob([fileBuffer], { type: "application/yaml" }), path.basename(resolvedPath));

  const response = await fetch(`${RENDER_API_BASE}/blueprints/validate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: form,
  });
  const body = await parseResponseBody(response);
  failIfResponseNotOk({ response, body, label: "Render blueprint validation" });

  if (!body?.valid) {
    throw new Error(`Render blueprint validation failed: ${formatValidationErrors(body?.errors)}`);
  }

  console.log("[render] Blueprint validation passed.");
  return body;
}

async function fetchRenderBlueprint({ token, blueprintId }) {
  const response = await fetch(`${RENDER_API_BASE}/blueprints/${encodeURIComponent(blueprintId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  const body = await parseResponseBody(response);
  failIfResponseNotOk({ response, body, label: `Render fetch blueprint "${blueprintId}"` });
  return body;
}

function extractDeployableServices(blueprintPayload) {
  const candidates = [];
  if (Array.isArray(blueprintPayload?.resources)) {
    candidates.push(...blueprintPayload.resources);
  }
  if (Array.isArray(blueprintPayload?.blueprint?.resources)) {
    candidates.push(...blueprintPayload.blueprint.resources);
  }
  if (Array.isArray(blueprintPayload?.services)) {
    candidates.push(...blueprintPayload.services);
  }
  if (Array.isArray(blueprintPayload?.plan?.services)) {
    candidates.push(...blueprintPayload.plan.services);
  }

  const serviceMap = new Map();
  for (const resource of candidates) {
    const id = resource?.id || resource?.serviceId || resource?.service?.id || "";
    if (!id) {
      continue;
    }

    const typeRaw = (
      resource?.type ||
      resource?.serviceType ||
      resource?.service?.type ||
      ""
    ).toLowerCase();
    if (typeRaw && !DEPLOYABLE_RESOURCE_TYPES.has(typeRaw)) {
      continue;
    }

    serviceMap.set(id, {
      id,
      name:
        resource?.name ||
        resource?.serviceName ||
        resource?.service?.name ||
        resource?.slug ||
        id,
      type: typeRaw || "service",
    });
  }

  return Array.from(serviceMap.values());
}

function extractKeyValues(blueprintPayload) {
  const candidates = [];
  if (Array.isArray(blueprintPayload?.keyValue)) {
    candidates.push(...blueprintPayload.keyValue);
  }
  if (Array.isArray(blueprintPayload?.keyValues)) {
    candidates.push(...blueprintPayload.keyValues);
  }
  if (Array.isArray(blueprintPayload?.plan?.keyValue)) {
    candidates.push(...blueprintPayload.plan.keyValue);
  }
  if (Array.isArray(blueprintPayload?.plan?.keyValues)) {
    candidates.push(...blueprintPayload.plan.keyValues);
  }
  if (Array.isArray(blueprintPayload?.resources)) {
    candidates.push(...blueprintPayload.resources);
  }
  if (Array.isArray(blueprintPayload?.blueprint?.resources)) {
    candidates.push(...blueprintPayload.blueprint.resources);
  }

  const resourceMap = new Map();
  for (const resource of candidates) {
    const typeRaw = (
      resource?.type ||
      resource?.resourceType ||
      resource?.kind ||
      resource?.datastoreType ||
      ""
    ).toLowerCase();
    if (typeRaw && !KEY_VALUE_RESOURCE_TYPES.has(typeRaw)) {
      continue;
    }

    const id =
      resource?.id ||
      resource?.keyValueId ||
      resource?.redisId ||
      extractKeyValueIdFromUrl(resource?.connectionString || resource?.url || "");
    if (!id) {
      continue;
    }

    resourceMap.set(id, {
      id,
      name: resource?.name || resource?.slug || id,
      type: "key_value",
    });
  }

  return Array.from(resourceMap.values());
}

function mergeResources(primary, secondary) {
  const merged = new Map();
  for (const resource of [...primary, ...secondary]) {
    if (!resource?.id) {
      continue;
    }
    merged.set(resource.id, {
      id: resource.id,
      name: resource.name || resource.id,
      type: resource.type || "service",
    });
  }
  return Array.from(merged.values());
}

async function lifecycleRenderService({ token, service, lifecycleAction }) {
  const label = `Render ${lifecycleAction} "${service.name}" (${service.id})`;

  const response = await fetch(
    `${RENDER_API_BASE}/services/${encodeURIComponent(service.id)}/${lifecycleAction}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    },
  );
  const body = await parseResponseBody(response);

  if (response.status === 404) {
    console.log(`[render] Service not found: ${service.id}. Skipping.`);
    return { ...service, skipped: true };
  }
  if (response.status === 409) {
    console.log(`[render] ${service.name} already in target state (${lifecycleAction}).`);
    return { ...service, skipped: true };
  }

  failIfResponseNotOk({ response, body, label });
  console.log(`[render] ${lifecycleAction} requested for ${service.name}`);
  return { ...service, skipped: false };
}

async function triggerRenderDeploy({ token, service }) {
  const label = `Render deploy "${service.name}" (${service.id})`;
  const response = await fetch(`${RENDER_API_BASE}/services/${encodeURIComponent(service.id)}/deploys`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  const body = await parseResponseBody(response);
  failIfResponseNotOk({ response, body, label });

  const deployId = body?.id || body?.deploy?.id || "unknown";
  console.log(`[render] Deploy triggered for ${service.name} (deploy id: ${deployId})`);
  return { ...service, deployId, skipped: false };
}

async function lifecycleKeyValue({ token, keyValue, lifecycleAction }) {
  const label = `Render key value ${lifecycleAction} "${keyValue.name}" (${keyValue.id})`;

  const response = await fetch(
    `${RENDER_API_BASE}/key-value/${encodeURIComponent(keyValue.id)}/${lifecycleAction}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    },
  );
  const body = await parseResponseBody(response);

  if (response.status === 404) {
    console.log(`[render] Key Value not found: ${keyValue.id}. Skipping.`);
    return { ...keyValue, skipped: true };
  }
  if (response.status === 409) {
    console.log(`[render] ${keyValue.name} already in target state (${lifecycleAction}).`);
    return { ...keyValue, skipped: true };
  }

  failIfResponseNotOk({ response, body, label });
  console.log(`[render] key-value ${lifecycleAction} requested for ${keyValue.name}`);
  return { ...keyValue, skipped: false };
}

async function renderFlow({
  action,
  strict,
  token,
  ownerId,
  blueprintFile,
  blueprintId,
  serviceOverrides,
}) {
  if (!token) {
    if (strict) {
      throw new Error("Missing required environment variable: RENDER_API_KEY");
    }
    console.warn("[render] RENDER_API_KEY missing. Skipping Render actions.");
    return;
  }

  let services = [...serviceOverrides];
  let keyValues = [...collectKeyValueOverridesFromEnv()];

  if (action === "start") {
    if (ownerId && blueprintFile) {
      await validateRenderBlueprint({
        token,
        ownerId,
        blueprintFile,
      });
    } else {
      console.warn(
        "[start:cloud] Missing RENDER_OWNER_ID or RENDER_BLUEPRINT_FILE. Skipping blueprint validation.",
      );
    }
  }

  if (blueprintId) {
    const blueprintPayload = await fetchRenderBlueprint({
      token,
      blueprintId,
    });
    services = mergeResources(services, extractDeployableServices(blueprintPayload));
    keyValues = mergeResources(keyValues, extractKeyValues(blueprintPayload));
  }

  if (services.length === 0 && keyValues.length === 0) {
    if (action === "stop") {
      console.warn(
        "[stop:cloud] No render resources resolved. Set RENDER_BLUEPRINT_ID and/or RENDER_SERVICE_IDS/RENDER_KEY_VALUE_IDS.",
      );
    } else {
      console.warn(
        "[start:cloud] No render resources resolved. Set RENDER_BLUEPRINT_ID and/or RENDER_SERVICE_IDS/RENDER_KEY_VALUE_IDS.",
      );
    }
    return;
  }

  if (action === "stop") {
    for (const keyValue of keyValues) {
      await lifecycleKeyValue({
        token,
        keyValue,
        lifecycleAction: "suspend",
      });
    }
    for (const service of services) {
      await lifecycleRenderService({
        token,
        service,
        lifecycleAction: "suspend",
      });
    }
    return;
  }

  for (const keyValue of keyValues) {
    await lifecycleKeyValue({
      token,
      keyValue,
      lifecycleAction: "resume",
    });
  }

  for (const service of services) {
    await lifecycleRenderService({
      token,
      service,
      lifecycleAction: "resume",
    });
    await triggerRenderDeploy({
      token,
      service,
    });
  }
}

function resolveActionArg(actionInput = "stop") {
  const arg = String(actionInput || "stop").trim().toLowerCase();
  if (!VALID_ACTIONS.has(arg)) {
    throw new Error(`Unsupported action "${arg}". Use "stop" or "start".`);
  }
  return arg;
}

export async function runCloudAction(actionInput = "stop") {
  const action = resolveActionArg(actionInput);
  const envFilePath = path.resolve(process.cwd(), process.env.STOP_CLOUD_ENV_FILE || DEFAULT_ENV_FILE);
  if (loadEnvFile(envFilePath)) {
    console.log(`[${action}:cloud] Loaded env file: ${envFilePath}`);
  }

  const strict = parseBoolean(readAnyEnv(["CLOUD_CONTROL_STRICT"], { required: false }));
  const renderToken = readAnyEnv(["RENDER_API_KEY"], { required: false });
  const renderOwnerIdRaw = readAnyEnv(["RENDER_OWNER_ID", "RENDER_OWER_ID"], {
    required: false,
  });
  const renderOwnerId = renderOwnerIdRaw.replace(/\/settings\/?$/i, "");
  const renderBlueprintFile = readAnyEnv(["RENDER_BLUEPRINT_FILE"], { required: false }) || "render.yaml";
  const renderBlueprintId = readAnyEnv(["RENDER_BLUEPRINT_ID"], { required: false });
  const serviceOverrides = parseRenderServiceOverrides(readAnyEnv(["RENDER_SERVICE_IDS"], { required: false }));

  if (renderOwnerId && !renderOwnerId.startsWith("tea-")) {
    console.warn(
      `[${action}:cloud] RENDER_OWNER_ID usually starts with "tea-". Current value "${renderOwnerId}" may be incorrect for live blueprint validation.`,
    );
  }

  if (action === "stop") {
    console.log("[stop:cloud] Starting cloud stop flow...");
    await cloudflareStopFlow({ strict });
    await renderFlow({
      action: "stop",
      strict,
      token: renderToken,
      ownerId: renderOwnerId,
      blueprintFile: renderBlueprintFile,
      blueprintId: renderBlueprintId,
      serviceOverrides,
    });
    console.log("[stop:cloud] Completed.");
    return;
  }

  console.log("[start:cloud] Starting cloud start flow...");
  if (readAnyEnv(["CLOUDFLARE_PAGES_PROJECTS", "CLOUDFARE_PAGES_PROJECTS"], { required: false })) {
    console.log(
      "[start:cloud] Cloudflare Pages projects are static deployments. This command starts Render services and deploys; Cloudflare project creation is not automatic here.",
    );
  }
  await renderFlow({
    action: "start",
    strict,
    token: renderToken,
    ownerId: renderOwnerId,
    blueprintFile: renderBlueprintFile,
    blueprintId: renderBlueprintId,
    serviceOverrides,
  });
  console.log("[start:cloud] Completed.");
}

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectExecution) {
  const rawAction = process.argv[2] || "stop";
  runCloudAction(rawAction).catch((error) => {
    const action = String(rawAction || "").trim().toLowerCase();
    const prefix = VALID_ACTIONS.has(action) ? `${action}:cloud` : "cloud";
    console.error(`[${prefix}] ${error.message}`);
    process.exit(1);
  });
}
