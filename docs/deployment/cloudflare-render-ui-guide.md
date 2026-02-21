# Cloudflare Pages + Render Deployment Guide (UI Steps)

This guide deploys:
- Frontend (`apps/web`) on Cloudflare Pages
- Backend (`apps/server`) on Render Web Service
- Queue API (`apps/orchestrator`) on Render Private Service
- Job Worker (`apps/runner`) on Render Worker
- Redis on Render Redis

## 1. Environment Strategy (Common + Local/Cloud)

Each app supports:
- `.env.common` for shared variables
- `.env.local` for local mode
- `.env.cloud` for cloud mode

Switching is controlled by:
- `RUN_ON_CLOUD=true|false` (backend)
- `DEPLOY_ENV=local|cloud` (backend)
- `VITE_RUN_ON_CLOUD=true|false` (frontend)

Generate env files from templates:

```bash
npm run setup:env:local
npm run setup:env:cloud
```

Local run:

```bash
npm run dev:local
```

Cloud-like local run:

```bash
npm run dev:cloud
```

## 2. Render Deployment (UI)

### Option A: Blueprint (fastest)

1. Push this repo with `render.yaml` at root.
2. In Render dashboard, click `New` -> `Blueprint`.
3. Select your repo and deploy.
4. After services are created, update `CLIENT_URL` in `codestream-server` to your real Cloudflare Pages URL.

### Option B: Manual Services (UI)

Create services in this order:

1. Redis:
   - Render -> `New` -> `Redis`
   - Name: `codestream-redis`
   - Plan: `Starter` (recommended for reduced cold starts)
   - Set eviction policy to `noeviction` (required by BullMQ to avoid dropped jobs)

2. Orchestrator (Private Service):
   - Render -> `New` -> `Private Service`
   - Environment: `Docker`
   - Root/Context: `apps/orchestrator`
   - Dockerfile: `apps/orchestrator/Dockerfile`
   - Env vars:
     - `DEPLOY_ENV=cloud`
     - `RUN_ON_CLOUD=true`
     - `PORT=4000`
     - `REDIS_HOST=<redis internal host>`
     - `REDIS_PORT=<redis internal port>`

3. Runner (Worker):
   - Render -> `New` -> `Worker`
   - Environment: `Docker`
   - Root/Context: `apps/runner`
   - Dockerfile: `apps/runner/Dockerfile`
   - Env vars:
     - `DEPLOY_ENV=cloud`
     - `RUN_ON_CLOUD=true`
     - `REDIS_HOST=<redis internal host>`
     - `REDIS_PORT=<redis internal port>`

4. Server (Web Service):
   - Render -> `New` -> `Web Service`
   - Environment: `Docker`
   - Root/Context: `apps/server`
   - Dockerfile: `apps/server/Dockerfile`
   - Health Check Path: `/health`
   - Env vars:
     - `DEPLOY_ENV=cloud`
     - `RUN_ON_CLOUD=true`
     - `PORT=5000`
     - `REDIS_HOST=<redis internal host>`
     - `REDIS_PORT=<redis internal port>`
     - `ORCHESTRATOR_URL=http://codestream-orchestrator:4000`
     - `CLIENT_URL=https://<your-cloudflare-pages-domain>`
     - `JWT_SECRET=<strong-random-secret>`

## 3. Cloudflare Pages Deployment (UI)

1. Cloudflare dashboard -> `Workers & Pages` -> `Create` -> `Pages`.
2. Connect your Git repo.
3. Configure build:
   - Framework preset: `Vite`
   - Root directory: `apps/web`
   - Build command: `npm run build:cloud`
   - Build output directory: `dist`
4. Add Environment Variables in Pages project settings:
   - `VITE_RUN_ON_CLOUD=true`
   - `VITE_API_URL=https://<render-server-domain>`
   - `VITE_WS_URL=wss://<render-server-domain>`
   - `VITE_SITE_URL=https://<your-cloudflare-pages-domain>`
5. Deploy.

## 4. Avoiding Cold Starts

Best options:

1. Use `Starter` or higher plans on Render services (recommended).
2. Keep one instance running (plan dependent).
3. Optional: add Render Cron Job to warm health endpoints using:
   - Command: `npm run warmup`
   - Env var: `WARMUP_URLS=https://<render-server-domain>`

Note: Free/spin-down plans can still cold start. Paid always-on plans reduce this significantly.

## 5. Verification Checklist

After deployment:

1. Open frontend URL and create/join room.
2. Confirm WebSocket connects (`Connected` in status bar).
3. Run JavaScript and Python code; ensure console output appears.
4. Confirm chat messages sync between two browser tabs.
5. Verify server health endpoint:
   - `https://<render-server-domain>/health`

## 6. Common Mistakes

1. `CLIENT_URL` missing/incorrect on server (socket CORS issues).
2. `ORCHESTRATOR_URL` incorrect (run button queues nothing).
3. Redis host/port using localhost in cloud.
4. Cloudflare Pages build command not set to `npm run build:cloud`.
5. Using free plan and expecting zero cold starts.
