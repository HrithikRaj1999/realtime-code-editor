import fs from "fs";
import path from "path";

const modeArg = (process.argv[2] || "local").toLowerCase();
if (modeArg !== "local" && modeArg !== "cloud") {
  console.error("Usage: node scripts/setup-env.mjs <local|cloud>");
  process.exit(1);
}

const repoRoot = process.cwd();
const apps = ["web", "server", "orchestrator", "runner"];
const envNames = [".env.common", ".env.local", ".env.cloud"];

function ensureFileFromExample(filePath) {
  if (fs.existsSync(filePath)) {
    return false;
  }

  const examplePath = `${filePath}.example`;
  if (!fs.existsSync(examplePath)) {
    return false;
  }

  fs.copyFileSync(examplePath, filePath);
  return true;
}

function setOrAppendKey(filePath, key, value) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  let updated = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = lines[i].indexOf("=");
    if (separator === -1) {
      continue;
    }

    const currentKey = lines[i].slice(0, separator).trim();
    if (currentKey === key) {
      lines[i] = `${key}=${value}`;
      updated = true;
      break;
    }
  }

  if (!updated) {
    lines.push(`${key}=${value}`);
  }

  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
}

const created = [];

for (const app of apps) {
  const appDir = path.join(repoRoot, "apps", app);
  for (const envName of envNames) {
    const envPath = path.join(appDir, envName);
    if (ensureFileFromExample(envPath)) {
      created.push(path.relative(repoRoot, envPath));
    }
  }
}

const runOnCloud = modeArg === "cloud" ? "true" : "false";

const backendCommonFiles = [
  path.join(repoRoot, "apps", "server", ".env.common"),
  path.join(repoRoot, "apps", "orchestrator", ".env.common"),
  path.join(repoRoot, "apps", "runner", ".env.common"),
];

for (const commonFile of backendCommonFiles) {
  setOrAppendKey(commonFile, "DEPLOY_ENV", modeArg);
  setOrAppendKey(commonFile, "RUN_ON_CLOUD", runOnCloud);
}

setOrAppendKey(path.join(repoRoot, "apps", "web", ".env.common"), "VITE_RUN_ON_CLOUD", runOnCloud);

console.log(`Environment files prepared for mode: ${modeArg}`);
if (created.length) {
  console.log("Created files:");
  for (const file of created) {
    console.log(`- ${file}`);
  }
}
console.log("Next steps:");
console.log(`- Local run: npm run dev:${modeArg}`);
console.log("- Cloudflare build: npm run build:cloud");
