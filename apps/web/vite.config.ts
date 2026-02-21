import fs from "fs";
import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

type DeployEnv = "local" | "cloud";

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const parsed: Record<string, string> = {};
  const content = fs.readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    parsed[key] = value.replace(/\\n/g, "\n");
  }

  return parsed;
}

function resolveDeployEnv(mode: string): DeployEnv {
  const normalizedMode = mode.toLowerCase();
  if (normalizedMode === "local" || normalizedMode === "localdev" || normalizedMode === "development") {
    return "local";
  }
  if (normalizedMode === "cloud" || normalizedMode === "production") {
    return "cloud";
  }

  const fromFlag = (process.env.VITE_RUN_ON_CLOUD || "").trim().toLowerCase();
  if (fromFlag === "true") {
    return "cloud";
  }
  if (fromFlag === "false") {
    return "local";
  }

  return normalizedMode === "production" ? "cloud" : "local";
}

function loadLayeredEnv(deployEnv: DeployEnv): Record<string, string> {
  const cwd = process.cwd();
  const commonEnv = parseEnvFile(path.join(cwd, ".env.common"));
  const targetEnv = parseEnvFile(path.join(cwd, `.env.${deployEnv}`));
  const overrideEnv = parseEnvFile(path.join(cwd, ".env"));
  const processEnv = Object.fromEntries(
    Object.entries(process.env).map(([key, value]) => [key, String(value ?? "")]),
  );

  const merged = {
    ...commonEnv,
    ...targetEnv,
    ...overrideEnv,
    ...processEnv,
  };

  for (const [key, value] of Object.entries(merged)) {
    process.env[key] = value;
  }

  return merged;
}

export default defineConfig(({ mode }) => {
  const deployEnv = resolveDeployEnv(mode);
  const env = loadLayeredEnv(deployEnv);

  const viteDefines = Object.fromEntries(
    Object.entries(env)
      .filter(([key]) => key.startsWith("VITE_"))
      .map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
  );

  return {
    plugins: [react(), tailwindcss()],
    define: viteDefines,
    server: {
      host: true,
      port: 5173,
    },
  };
});
