import { runCloudAction } from "./cloud-control.mjs";

runCloudAction("stop").catch((error) => {
  console.error(`[stop:cloud] ${error.message}`);
  process.exit(1);
});