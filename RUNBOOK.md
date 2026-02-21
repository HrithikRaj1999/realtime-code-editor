# CodeStream Runbook (Local + Cloud)

This is the long-term operational guide for this repo.
Use this file when setting up from scratch, even years later.

## 1. What This Repo Supports

- Local development with one command (`start:local`) and safe shutdown (`stop:local`).
- Cloud lifecycle control for Render + Cloudflare (`start:cloud`, `stop:cloud`).
- Bitwarden Secrets Manager integration (local `bws` or Docker `bitwarden/bws`).

## 2. Required Tools

Minimum:
- Node.js + npm
- Docker Desktop (recommended)

Optional (for local non-container language runtimes):
- Python
- Java JDK
- Go
- C/C++ toolchain

Notes:
- `start:local` can auto-bootstrap npm dependencies.
- OS-level installs (Node/Docker/compilers) are not force-installed by npm scripts.

## 3. One-Time Cloud Provisioning

### 3.1 Render

1. Deploy `render.yaml` as a Blueprint.
2. Confirm these resources exist:
- `codestream-server`
- `codestream-orchestrator`
- `codestream-runner`
- `codestream-redis` (Key Value / Valkey)
3. Save these identifiers:
- `RENDER_API_KEY`
- `RENDER_OWNER_ID` (team/user id)
- `RENDER_BLUEPRINT_ID`
- `RENDER_KEY_VALUE_IDS` (for Redis/Valkey suspend/resume)

### 3.2 Cloudflare Pages

1. Deploy web app (`apps/web`) to Cloudflare Pages.
2. Save:
- Pages project name (for example `realtime-code-editor`)
- API token with Pages edit rights
- Account ID

Custom token recommended permissions:
- `Account` -> `Cloudflare Pages` -> `Edit`
- `Account` -> `Account Settings` -> `Read`

Get account id via API:

```bash
curl -H "Authorization: Bearer <CLOUDFLARE_API_TOKEN>" https://api.cloudflare.com/client/v4/accounts
```

## 4. Bitwarden Secrets Setup

Use Bitwarden Secrets Manager (Project + Machine Account), not personal vault login items.

1. Create project (example: `realtime-code-editor`).
2. Add secrets listed in section 5.
3. Create machine account and grant project read access.
4. Create access token (copy once).

## 5. Secrets To Store In Bitwarden

### 5.1 Required for strict env generation

- `SERVER_CLIENT_URL`
- `SERVER_JWT_SECRET`
- `SERVER_ORCHESTRATOR_URL` (or `SERVER_ORCHESTRATOR_HOSTPORT`)
- `WEB_VITE_API_URL`
- `WEB_VITE_WS_URL`
- Redis config:
- `SHARED_REDIS_URL`
- or `SHARED_REDIS_HOST` + `SHARED_REDIS_PORT`
- or per-service `*_REDIS_URL` / `*_REDIS_HOST` + `*_REDIS_PORT`

### 5.2 Optional app overrides

- `SERVER_PORT`
- `SERVER_REDIS_URL`
- `SERVER_REDIS_HOST`
- `SERVER_REDIS_PORT`
- `ORCHESTRATOR_PORT`
- `ORCHESTRATOR_REDIS_URL`
- `ORCHESTRATOR_REDIS_HOST`
- `ORCHESTRATOR_REDIS_PORT`
- `RUNNER_REDIS_URL`
- `RUNNER_REDIS_HOST`
- `RUNNER_REDIS_PORT`
- `WEB_VITE_SITE_URL`

### 5.3 Optional local override secrets

- `LOCAL_SERVER_REDIS_HOST`
- `LOCAL_SERVER_ORCHESTRATOR_URL`
- `LOCAL_SERVER_CLIENT_URL`
- `LOCAL_SERVER_JWT_SECRET`
- `LOCAL_ORCHESTRATOR_REDIS_HOST`
- `LOCAL_RUNNER_REDIS_HOST`
- `LOCAL_WEB_VITE_API_URL`
- `LOCAL_WEB_VITE_WS_URL`
- `LOCAL_WEB_VITE_SITE_URL`

### 5.4 Cloud lifecycle control secrets

- `CONTROL_CLOUDFLARE_API_TOKEN`
- `CONTROL_CLOUDFLARE_ACCOUNT_ID`
- `CONTROL_CLOUDFLARE_PAGES_PROJECTS`
- `CONTROL_RENDER_API_KEY`
- `CONTROL_RENDER_OWNER_ID`
- `CONTROL_RENDER_BLUEPRINT_ID`
- `CONTROL_RENDER_SERVICE_IDS` (optional if blueprint is enough)
- `CONTROL_RENDER_KEY_VALUE_IDS`
- `CONTROL_REDIS_URL`

## 6. First-Time Setup (Fresh Clone)

### 6.1 One-command local start with Bitwarden args

```bash
npm run start:local "<BWS_ACCESS_TOKEN>" "<BWS_PROJECT_ID>" true
```

`true` means use Docker image `bitwarden/bws` instead of local `bws` install.

### 6.2 Alternative using env vars

PowerShell:

```powershell
$env:BWS_ACCESS_TOKEN="..."
$env:BWS_PROJECT_ID="..."
$env:BW_USE_DOCKER_BWS="true"
npm run start:local
```

Bash:

```bash
export BWS_ACCESS_TOKEN=...
export BWS_PROJECT_ID=...
export BW_USE_DOCKER_BWS=true
npm run start:local
```

### 6.3 What `start:local` does

- Installs npm dependencies if missing.
- Creates local env files from `.example`.
- Pulls secrets from Bitwarden if token is present.
- Generates cloud env files (`apps/*/.env.cloud`).
- Applies local overrides from `LOCAL_*` keys.
- Ensures Redis is reachable (starts managed `codestream-redis` container if needed).
- Starts local app stack in background.

## 7. Day-to-Day Commands

### 7.1 Local

- Start:

```bash
npm run start:local
```

- Stop:

```bash
npm run stop:local
```

- Foreground dev (manual):

```bash
npm run dev:local
```

### 7.2 Cloud lifecycle

- Start/resume cloud services:

```bash
npm run start:cloud
```

- Stop/suspend cloud services:

```bash
npm run stop:cloud
```

Notes:
- `start:cloud` does not create Cloudflare Pages projects.
- Cloudflare stop/delete requires valid Cloudflare token + account id.

## 8. Validation Checklist

### 8.1 Local

After `start:local`:
- `http://localhost:5173` returns 200
- `http://localhost:5000/health` returns 200

After `stop:local`:
- both endpoints are down

### 8.2 Cloud

`start:cloud` should show:
- Render key-value resumed
- Render services resumed
- Deploy ids created

`stop:cloud` should show:
- Render key-value suspended
- Render services suspended

## 9. Script Reference

Core:
- `setup` -> install dependencies + prepare local env
- `setup:bitwarden` -> setup + Bitwarden sync
- `env:sync:bitwarden` -> sync only
- `start:local` -> smart local start
- `stop:local` -> safe local stop
- `start:cloud` -> cloud resume/deploy
- `stop:cloud` -> cloud suspend

Aliases:
- `setup:local` -> `setup`
- `setup:cloud` -> `start:cloud`
- `all:local` -> `dev:local`

## 10. Recovery After Long Gap

If you forget everything:

1. Clone repo.
2. Get latest Bitwarden machine account token + project id.
3. Run:

```bash
npm run start:local "<BWS_ACCESS_TOKEN>" "<BWS_PROJECT_ID>" true
```

4. For cloud control:

```bash
npm run start:cloud
npm run stop:cloud
```

## 11. Security Rules

- Never commit `.env` files or raw secrets.
- Rotate any secret/token that was pasted into chat, screenshots, or terminal logs.
- Prefer least-privilege API tokens (Cloudflare/Render/Bitwarden).
