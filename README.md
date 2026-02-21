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
- `RUNBOOK.md` - end-to-end operations guide (local + cloud + secrets)

Directory layout:

```text
apps/
  web/
    src/components
    src/hooks
    src/lib
  server/
    src/config
    src/middleware
    src/routes
    src/services
    src/utils
  orchestrator/
    src/config
    src/index.ts
  runner/
    src/config
    src/utils
    src/index.ts
```

Naming conventions:
- folders: lowercase (`services`, `routes`, `utils`, `config`)
- files: kebab-case for multi-word backend files (example: `socket-id-manager.ts`)
- one entrypoint per service (`apps/*/src/index.ts` or `apps/server/server.ts`)

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
- `.env` (manual local overrides)

Switching flags:
- Backend: `DEPLOY_ENV=local|cloud` and `RUN_ON_CLOUD=true|false`
- Frontend: `VITE_RUN_ON_CLOUD=true|false`
- Security policy: hardened execution is permanently enforced for all supported languages.

Load order at runtime:
1. `.env.common`
2. `.env.<local|cloud>`
3. `.env`

Process environment variables (for example Docker `-e`) take precedence over values from env files.

## First-Time Setup

From repo root:

```bash
npm run setup
```

Simple one-command local start (recommended):

```bash
npm run start:local
```

First-time with Bitwarden args (token, project id, use docker bws):

```bash
npm run start:local <BWS_ACCESS_TOKEN> <BWS_PROJECT_ID> <BW_USE_DOCKER_BWS>
```

Example:

```bash
npm run start:local your-token e944853f-244e-4a97-b8c4-b3f800afa3f5 true
```

If you want setup + env sync from Bitwarden Secrets Manager in one command:

```bash
npm run setup:bitwarden
```

or manually:

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

## Bitwarden Secrets Manager Setup

Use this if you want `.env` values pulled securely at setup time.

1. Use one Bitwarden CLI option:
   - Local install (`bws`): https://bitwarden.com/help/secrets-manager-cli/
   - Docker-only (no local install): `bitwarden/bws`
2. Create a Bitwarden machine account and copy its access token.
3. (Optional) Create a dedicated Bitwarden project and note its `project_id`.
4. Add secrets in Bitwarden using env-style names (for example: `SERVER_JWT_SECRET`, `SHARED_REDIS_URL`, `WEB_VITE_API_URL`, `WEB_VITE_WS_URL`, `SERVER_CLIENT_URL`, `SERVER_ORCHESTRATOR_URL`).
5. Export runtime auth in your shell:

```bash
export BWS_ACCESS_TOKEN=...
export BWS_PROJECT_ID=...   # optional
```

PowerShell:

```powershell
$env:BWS_ACCESS_TOKEN="..."
$env:BWS_PROJECT_ID="..."
$env:BW_USE_DOCKER_BWS="true"   # optional: force Docker image instead of local bws
```

6. Run:

```bash
npm run setup:bitwarden
```

This does:
- install root + microservice dependencies
- create local env files from examples
- pull secrets from Bitwarden via `bws`
- generate cloud env files (`apps/*/.env.cloud`)
- apply optional local overrides from `LOCAL_*` secrets (if provided)

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
npm run start:local
```

4. Open:
- `http://localhost:5173`

Stop local safely:

```bash
npm run stop:local
```

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
- `npm run setup` - install root + app dependencies and prepare local env files
- `npm run start:local` - smart local startup (setup/env sync/redis check + start app in background)
- `npm run stop:local` - stop only tracked local app process and managed local redis container
- `npm run setup:local` - alias to `npm run setup`
- `npm run setup:cloud` - alias to `npm run start:cloud`
- `npm run all:local` - alias to `npm run dev:local`
- `npm run setup:bitwarden` - setup + pull secrets from Bitwarden + generate env files
- `npm run env:sync:bitwarden` - pull Bitwarden secrets and regenerate env files
- `npm run dev:local` - start all services in local mode
- `npm run dev:cloud` - start all services with cloud flags
- `npm run build:web` - local web build
- `npm run build:web:cloud` - cloud web build
- `npm run setup:env:local` - create/switch env files for local
- `npm run setup:env:cloud` - create/switch env files for cloud
- `npm run env:generate:ci` - generate cloud `.env` files from CI env vars/secrets
- `npm run stop:cloud` - suspend Render services (and optionally delete Cloudflare Pages projects)
- `npm run start:cloud` - resume Render services and trigger deploys
- `npm run warmup` - hit health endpoints from `WARMUP_URLS`
- `npm run test:load:help` - show load/chaos test commands
- `npm run test:load:cpu-mem` - bounded CPU+RAM container stress
- `npm run test:load:io` - bounded disk I/O container stress
- `npm run test:load:app:start` - start constrained app container
- `npm run test:load:app:stats` - show app container resource usage
- `npm run test:load:app:logs` - tail app container logs
- `npm run test:load:app:inspect` - check OOM/exit status
- `npm run test:load:http` - HTTP load test via isolated `wrk` container
- `npm run test:load:chaos:restart` - stop/start app container
- `npm run test:load:full-retest` - one-command Redis+load+chaos+security retest with pass/fail summary

Load-test env injection:
- Use `LOADTEST_APP_ENV_<KEY>=<VALUE>` with `test:load:app:start` or `test:load:full-retest` to pass `-e KEY=VALUE` into the app container.

Cloud control env notes (`.env.stop-cloud`):
- Cloudflare delete requires either:
- `CLOUDFLARE_API_TOKEN`, or
- `CLOUDFLARE_GLOBAL_KEY` (or `CLOUDFARE_GLOBAL_KEYS`) plus `CLOUDFLARE_EMAIL`.
- Provide `CLOUDFLARE_ACCOUNT_ID`, or let script auto-resolve it from Cloudflare API.
- For Render lifecycle actions, set `RENDER_API_KEY` and either:
- `RENDER_BLUEPRINT_ID` (preferred), or
- `RENDER_SERVICE_IDS` as comma-separated service ids (or `name:id` pairs).
- To suspend/resume Redis/Valkey too, set `RENDER_KEY_VALUE_IDS` (comma-separated `red-...` ids), or provide `REDIS_URL` so id can be auto-detected.

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
- `REDIS_URL=<render keyvalue connection string>`
- `ORCHESTRATOR_URL=http://<orchestrator-private-host>:4000`
- `CLIENT_URL=https://www.techieraj.online` (or your Pages domain)
- `JWT_SECRET=<strong-random-secret>`

Orchestrator (`apps/orchestrator`):
- `DEPLOY_ENV=cloud`
- `RUN_ON_CLOUD=true`
- `PORT=4000`
- `REDIS_URL=<render keyvalue connection string>`

Runner (`apps/runner`):
- `DEPLOY_ENV=cloud`
- `RUN_ON_CLOUD=true`
- `REDIS_URL=<render keyvalue connection string>`

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

## Security Regression Tests

Runner security tests include:
- multi-language basic execution checks (JS/Python/Java/C++/C/Go, auto-skipped if runtime missing)
- JavaScript sandbox checks (`process`/`require` hidden)
- timeout bomb check (infinite loop termination)
- output bomb check (output cap enforcement)
- environment leak check (sanitized env in Python process)

Run:

```bash
npm --prefix apps/runner run test:security
```

## Troubleshooting

- `runtime not found` while running code:
Install missing language runtime locally or use Docker runner.

- No output after Run:
Check Redis connectivity and `ORCHESTRATOR_URL`.

- Socket connection issues:
Check `CLIENT_URL` on server and `VITE_WS_URL` on frontend.

- Cold starts on first request:
Expected on spin-down plans; use paid always-on plans and warmup.
