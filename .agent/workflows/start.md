---
description: how to start the application locally and with Docker
---

# Starting the Application

## Prerequisites

- **Node.js** v18+ and **npm**
- **Redis** running on `localhost:6379` (for local dev without Docker)
- **Docker** and **Docker Compose** (for Docker mode)

---

## Option 1: Local Development (Without Docker)

### Step 1: Install Dependencies (One-time)

From the **root** of the project:

```powershell
# Install root dependencies (concurrently)
npm install

# Install all app dependencies
cd apps/web; npm install; cd ../server; npm install; cd ../orchestrator; npm install; cd ../runner; npm install; cd ../..
```

### Step 2: Start Redis

You need Redis running locally. You can use Docker for just Redis:

```powershell
docker run -d --name redis-local -p 6379:6379 redis:7-alpine
```

### Step 3: Start All Services

**Option A: Start everything together**

```powershell
npm run dev:all
```

This starts all 4 services concurrently:

- Web (Vite) → http://localhost:5173
- Server (Express + Socket.IO) → http://localhost:5000
- Orchestrator (Job Queue) → http://localhost:4000
- Runner (BullMQ Worker) → background process

**Option B: Start services individually** (in separate terminals)

```powershell
# Terminal 1: Frontend
npm run dev:web

# Terminal 2: Backend Server
npm run dev:server

# Terminal 3: Orchestrator
npm run dev:orchestrator

# Terminal 4: Runner Worker
npm run dev:runner
```

**Option C: Just frontend + server** (no code execution)

```powershell
npm run dev
```

### Step 4: Open the App

Go to http://localhost:5173

---

## Option 2: Full Docker (All Services)

### Step 1: Build and Start

```powershell
# From project root
docker-compose up --build
```

Or use the npm script:

```powershell
npm run docker:up
```

This starts all 5 containers:
| Service | Port | Description |
|-------------|-------|--------------------------------|
| client | 5173 | Vite frontend |
| server | 5000 | Express + Socket.IO backend |
| orchestrator| 4000 | Job queue manager |
| redis | 6379 | Redis message bus |
| runner | - | Sandboxed code execution worker|

### Step 2: Open the App

Go to http://localhost:5173

### Step 3: Stop

```powershell
docker-compose down
# or
npm run docker:down
```

### Rebuild after code changes

```powershell
npm run docker:restart
```

---

## Environment Variables

Each app has a `.env` file already configured for local development:

| App          | File                     | Key Variables                      |
| ------------ | ------------------------ | ---------------------------------- |
| web          | `apps/web/.env`          | `VITE_API_URL`, `VITE_WS_URL`      |
| server       | `apps/server/.env`       | `PORT`, `REDIS_HOST`, `JWT_SECRET` |
| orchestrator | `apps/orchestrator/.env` | `PORT`, `REDIS_HOST`               |
| runner       | `apps/runner/.env`       | `REDIS_HOST`                       |

> **Note**: Docker Compose injects its OWN environment variables (see `docker-compose.yml`), which override `.env` files inside containers.

---

## Troubleshooting

| Issue                   | Fix                                                                |
| ----------------------- | ------------------------------------------------------------------ |
| `ECONNREFUSED` on Redis | Make sure Redis is running (`docker ps` or start it)               |
| Port already in use     | Kill the process using the port: `netstat -ano \| findstr :5000`   |
| Frontend blank page     | Check browser console for errors, ensure `VITE_API_URL` is correct |
| Code execution hangs    | Check that orchestrator AND runner are both running                |
