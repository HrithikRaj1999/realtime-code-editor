# CodeStream Realtime Code Editor

A realtime collaborative code editor with:
- shared editor and chat
- run code via queue-based execution
- multi-language runner (JavaScript, Python, Java, C++, C, Go)
- frontend on Vite/React
- backend split into API gateway (`server`), queue API (`orchestrator`), and worker (`runner`)

## Project Structure

- `apps/web` - frontend (Vite + React + CodeMirror)
- `apps/server` - API gateway + Socket.IO server
- `apps/orchestrator` - submission queue API (BullMQ)
- `apps/runner` - worker that compiles/runs code
- `render.yaml` - Render blueprint (cloud services)
- `docs/deployment/cloudflare-render-ui-guide.md` - detailed cloud UI deployment guide

## Architecture

1. Frontend sends run request to `server` (`/run`).
2. `server` proxies to `orchestrator`.
3. `orchestrator` pushes job to Redis queue.
4. `runner` consumes job, executes code, publishes result.
5. `server` delivers result to clients over Socket.IO.

Default local ports:
- Web: `5173`
- Server: `5000`
- Orchestrator: `4000`
- Redis: `6379`

## Prerequisites (Local)

Required:
- Node.js 18+
- npm 9+
- Redis 7+

For full multi-language execution without Docker runner, install:
- Python (`python3`/`python`)
- Java (`javac`, `java`)
- C/C++ compiler (`gcc`/`g++` or `clang`/`clang++`)
- Go (`go`)

Optional:
- Docker Desktop (recommended for easier Redis/full-stack setup)

## Environment Strategy

Each app supports layered env files:
- `.env.common` (shared)
- `.env.local` (local mode)
- `.env.cloud` (cloud mode)
- `.env` (manual override, highest priority)

Switching flags:
- Backend: `DEPLOY_ENV=local|cloud` and `RUN_ON_CLOUD=true|false`
- Frontend: `VITE_RUN_ON_CLOUD=true|false`

Load order at runtime:
1. `.env.common`
2. `.env.<local|cloud>`
3. `.env`

## First-Time Setup

From repo root:

```bash
npm install
npm run install:all
```

Generate local env files from templates:

```bash
npm run setup:env:local
```

Generate cloud env files from templates:

```bash
npm run setup:env:cloud
```

## Run Locally (Recommended)

1. Start Redis (choose one):

```bash
docker run -d --name codestream-redis -p 6379:6379 redis:7-alpine
```

or use your local Redis service.

2. Ensure env is local mode:

```bash
npm run setup:env:local
```

3. Start all apps:

```bash
npm run dev:local
```

4. Open:
- `http://localhost:5173`

## Run with Docker Compose (Full Stack)

```bash
npm run docker:up
```

Stop:

```bash
npm run docker:down
```

Restart:

```bash
npm run docker:restart
```

## Run in Cloud-Like Mode Locally

```bash
npm run setup:env:cloud
npm run dev:cloud
```

## Useful Scripts

- `npm run dev` - alias for `dev:local`
- `npm run dev:local` - start all services in local mode
- `npm run dev:cloud` - start all services with cloud flags
- `npm run build:web` - local web build
- `npm run build:web:cloud` - cloud web build
- `npm run setup:env:local` - create/switch env files for local
- `npm run setup:env:cloud` - create/switch env files for cloud
- `npm run warmup` - hit health endpoints from `WARMUP_URLS`

## Deploy to Render + Cloudflare Pages

Use the full step-by-step UI guide:
- `docs/deployment/cloudflare-render-ui-guide.md`

Quick summary:
1. Deploy backend services + Redis on Render using `render.yaml` (Blueprint) or manually.
2. Set `CLIENT_URL` on Render server to your frontend domain.
3. Deploy `apps/web` on Cloudflare Pages using cloud build command.
4. Set frontend env vars to Render server URL.

## Production Env Checklist

Server (`apps/server`):
- `DEPLOY_ENV=cloud`
- `RUN_ON_CLOUD=true`
- `PORT=5000`
- `REDIS_HOST=<render redis host>`
- `REDIS_PORT=<render redis port>`
- `ORCHESTRATOR_URL=http://<orchestrator-private-host>:4000`
- `CLIENT_URL=https://www.techieraj.online` (or your Pages domain)
- `JWT_SECRET=<strong-random-secret>`

Orchestrator (`apps/orchestrator`):
- `DEPLOY_ENV=cloud`
- `RUN_ON_CLOUD=true`
- `PORT=4000`
- `REDIS_HOST=<render redis host>`
- `REDIS_PORT=<render redis port>`

Runner (`apps/runner`):
- `DEPLOY_ENV=cloud`
- `RUN_ON_CLOUD=true`
- `REDIS_HOST=<render redis host>`
- `REDIS_PORT=<render redis port>`

Web (`apps/web` / Cloudflare Pages):
- `VITE_RUN_ON_CLOUD=true`
- `VITE_API_URL=https://<render-server-domain>`
- `VITE_WS_URL=wss://<render-server-domain>`
- `VITE_SITE_URL=https://www.techieraj.online`

## Cold Start Reduction

1. Use Render Starter or higher plans for backend services.
2. Keep health check path enabled (`/health` on server).
3. Optionally use scheduled warmup:
   - `WARMUP_URLS=https://<render-server-domain>`
   - command: `npm run warmup`

## Health and Verification

- Server health: `https://<server-domain>/health`
- Verify:
1. open two tabs and join same room
2. confirm chat syncs
3. run JavaScript/Python and check output appears
4. verify socket status shows connected

## Troubleshooting

- `runtime not found` while running code:
Install missing language runtime locally or use Docker runner.

- No output after Run:
Check Redis connectivity and `ORCHESTRATOR_URL`.

- Socket connection issues:
Check `CLIENT_URL` on server and `VITE_WS_URL` on frontend.

- Cold starts on first request:
Expected on spin-down plans; use paid always-on plans and warmup.
