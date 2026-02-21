import { runCloudAction } from "./cloud-control.mjs";

runCloudAction("start").catch((error) => {
  console.error(`[start:cloud] ${error.message}`);
  process.exit(1);
});