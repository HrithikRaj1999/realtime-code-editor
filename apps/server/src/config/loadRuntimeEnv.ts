import fs from "fs";
import path from "path";
import dotenv from "dotenv";

type DeployEnv = "local" | "cloud";

function parseBoolean(value: string | undefined): boolean | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }
  return undefined;
}

function resolveDeployEnv(): DeployEnv {
  const fromDeployEnv = (process.env.DEPLOY_ENV || "").trim().toLowerCase();
  if (fromDeployEnv === "local" || fromDeployEnv === "cloud") {
    return fromDeployEnv;
  }

  const runOnCloud = parseBoolean(process.env.RUN_ON_CLOUD);
  if (runOnCloud === true) {
    return "cloud";
  }
  if (runOnCloud === false) {
    return "local";
  }

  return process.env.NODE_ENV === "production" ? "cloud" : "local";
}

export function loadRuntimeEnv() {
  const deployEnv = resolveDeployEnv();
  const envFiles = [".env.common", `.env.${deployEnv}`, ".env"];
  const cwd = process.cwd();

  for (const envFile of envFiles) {
    const fullPath = path.join(cwd, envFile);
    if (fs.existsSync(fullPath)) {
      dotenv.config({ path: fullPath, override: true });
    }
  }

  process.env.DEPLOY_ENV = deployEnv;
  process.env.RUN_ON_CLOUD = deployEnv === "cloud" ? "true" : "false";

  return { deployEnv, runOnCloud: deployEnv === "cloud" };
}
