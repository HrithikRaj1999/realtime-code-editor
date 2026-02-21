const rawUrls = process.env.WARMUP_URLS || "";
const targets = rawUrls
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

if (targets.length === 0) {
  console.log("No WARMUP_URLS configured. Nothing to warm.");
  process.exit(0);
}

async function ping(url) {
  const healthUrl = url.endsWith("/health") ? url : `${url.replace(/\/+$/, "")}/health`;
  const startedAt = Date.now();

  try {
    const response = await fetch(healthUrl, {
      method: "GET",
      signal: AbortSignal.timeout(10000),
    });
    const duration = Date.now() - startedAt;
    console.log(`[warmup] ${healthUrl} -> ${response.status} (${duration}ms)`);
  } catch (error) {
    console.error(`[warmup] ${healthUrl} failed`, error);
    process.exitCode = 1;
  }
}

await Promise.all(targets.map((target) => ping(target)));
