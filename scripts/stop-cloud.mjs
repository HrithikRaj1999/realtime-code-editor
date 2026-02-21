import fs from "fs";
import path from "path";

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";
const RENDER_API_BASE = "https://api.render.com/v1";
const DEFAULT_ENV_FILE = ".env.stop-cloud";
const DEPLOYABLE_RESOURCE_TYPES = new Set([
  "static_site",
  "web_service",
  "private_service",
  "background_worker",
  "cron_job",
]);

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

function resolveCloudflareAuth({ dryRun }) {
  const token = readAnyEnv(["CLOUDFLARE_API_TOKEN"], { required: false });
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

  if (dryRun) {
    return { headers: {}, mode: "dry-run" };
  }

  throw new Error(
    "Missing Cloudflare auth. Set CLOUDFLARE_API_TOKEN (recommended), or CLOUDFLARE_GLOBAL_KEY + CLOUDFLARE_EMAIL.",
  );
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

async function deleteCloudflarePagesProject({ authHeaders, accountId, projectName, dryRun }) {
  const encodedProject = encodeURIComponent(projectName);
  const encodedAccount = encodeURIComponent(accountId);
  const url = `${CLOUDFLARE_API_BASE}/accounts/${encodedAccount}/pages/projects/${encodedProject}`;
  const label = `Cloudflare project "${projectName}" delete`;

  if (dryRun) {
    console.log(`[dry-run] ${label}`);
    return { projectName, deleted: false, skipped: true };
  }

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

async function validateRenderBlueprint({ token, ownerId, blueprintFile, dryRun }) {
  const resolvedPath = path.resolve(process.cwd(), blueprintFile);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Blueprint file not found: ${resolvedPath}`);
  }

  if (dryRun) {
    console.log(`[dry-run] Render blueprint validate: ${resolvedPath}`);
    return { valid: true, plan: null, dryRun: true };
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
  if (body?.plan) {
    const totalActions = body.plan.totalActions ?? "unknown";
    const services = Array.isArray(body.plan.services) ? body.plan.services.length : 0;
    const databases = Array.isArray(body.plan.databases) ? body.plan.databases.length : 0;
    const keyValue = Array.isArray(body.plan.keyValue) ? body.plan.keyValue.length : 0;
    const envGroups = Array.isArray(body.plan.envGroups) ? body.plan.envGroups.length : 0;
    console.log(
      `[render] Plan summary -> actions: ${totalActions}, services: ${services}, databases: ${databases}, key value: ${keyValue}, env groups: ${envGroups}`,
    );
  }

  return body;
}

async function fetchRenderBlueprint({ token, blueprintId, dryRun }) {
  if (dryRun) {
    console.log(`[dry-run] Render fetch blueprint: ${blueprintId}`);
    return { id: blueprintId, resources: [] };
  }

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

async function triggerRenderDeploy({ token, serviceId, serviceName, dryRun }) {
  const label = `Render deploy "${serviceName}" (${serviceId})`;
  if (dryRun) {
    console.log(`[dry-run] ${label}`);
    return { serviceId, serviceName, deployId: null, skipped: true };
  }

  const response = await fetch(`${RENDER_API_BASE}/services/${encodeURIComponent(serviceId)}/deploys`, {
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
  console.log(`[render] Deploy triggered for ${serviceName} (deploy id: ${deployId})`);
  return { serviceId, serviceName, deployId, skipped: false };
}

async function triggerBlueprintServiceDeploys({ token, blueprintId, dryRun }) {
  const blueprint = await fetchRenderBlueprint({ token, blueprintId, dryRun });
  const resources = Array.isArray(blueprint?.resources) ? blueprint.resources : [];
  const deployable = resources.filter((resource) => DEPLOYABLE_RESOURCE_TYPES.has(resource?.type));

  if (deployable.length === 0) {
    console.log(`[render] No deployable services found in blueprint: ${blueprintId}`);
    return [];
  }

  const results = [];
  for (const resource of deployable) {
    const serviceId = resource.id;
    const serviceName = resource.name || serviceId;
    if (!serviceId) {
      continue;
    }
    const result = await triggerRenderDeploy({ token, serviceId, serviceName, dryRun });
    results.push(result);
  }

  return results;
}

async function main() {
  const envFilePath = path.resolve(process.cwd(), process.env.STOP_CLOUD_ENV_FILE || DEFAULT_ENV_FILE);
  if (loadEnvFile(envFilePath)) {
    console.log(`[stop:cloud] Loaded env file: ${envFilePath}`);
  }

  const dryRun = parseBoolean(readAnyEnv(["STOP_CLOUD_DRY_RUN"], { required: false }));
  const cloudflareProjects = parseCloudflareProjects(
    readAnyEnv(["CLOUDFLARE_PAGES_PROJECTS"], {
      required: true,
    }),
  );
  const cloudflareAuth = resolveCloudflareAuth({ dryRun });
  const cloudflareAccountId = readAnyEnv(["CLOUDFLARE_ACCOUNT_ID"], {
    required: !dryRun,
  });

  const renderToken = readAnyEnv(["RENDER_API_KEY"], { required: !dryRun });
  const renderOwnerIdRaw = readAnyEnv(["RENDER_OWNER_ID", "RENDER_OWER_ID"], {
    required: !dryRun,
    label: "RENDER_OWNER_ID",
  });
  const renderOwnerId = renderOwnerIdRaw.replace(/\/settings\/?$/i, "");
  const renderBlueprintFile = readAnyEnv(["RENDER_BLUEPRINT_FILE"], { required: false }) || "render.yaml";
  const renderBlueprintId = readAnyEnv(["RENDER_BLUEPRINT_ID"], { required: false });

  if (cloudflareProjects.length === 0) {
    throw new Error("CLOUDFLARE_PAGES_PROJECTS must contain at least one project name.");
  }
  if (cloudflareProjects.length < 2) {
    console.warn(
      `[stop:cloud] Only ${cloudflareProjects.length} Cloudflare project listed. If you use two pages projects, add both in CLOUDFLARE_PAGES_PROJECTS.`,
    );
  }
  if (dryRun) {
    console.log("[stop:cloud] Running in dry-run mode. No external resources will be changed.");
  }
  if (renderOwnerId && !renderOwnerId.startsWith("tea-")) {
    console.warn(
      `[stop:cloud] RENDER_OWNER_ID usually starts with "tea-". Current value "${renderOwnerId}" may be incorrect for live validation.`,
    );
  }
  if (cloudflareAuth.mode === "global-key" && dryRun === false) {
    console.log("[stop:cloud] Using Cloudflare global API key auth.");
  }

  console.log("[stop:cloud] Starting teardown and blueprint flow...");

  for (const projectName of cloudflareProjects) {
    await deleteCloudflarePagesProject({
      authHeaders: cloudflareAuth.headers,
      accountId: cloudflareAccountId,
      projectName,
      dryRun,
    });
  }

  await validateRenderBlueprint({
    token: renderToken,
    ownerId: renderOwnerId,
    blueprintFile: renderBlueprintFile,
    dryRun,
  });

  if (!renderBlueprintId) {
    console.log(
      "[render] RENDER_BLUEPRINT_ID not set. Validation completed, but deploy trigger was skipped. Set RENDER_BLUEPRINT_ID to trigger deploys for managed services.",
    );
    return;
  }

  await triggerBlueprintServiceDeploys({
    token: renderToken,
    blueprintId: renderBlueprintId,
    dryRun,
  });
}

main().catch((error) => {
  console.error(`[stop:cloud] ${error.message}`);
  process.exit(1);
});
