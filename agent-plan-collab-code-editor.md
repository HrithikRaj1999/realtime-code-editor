# Agent Plan — Real‑time Collaborative Coding Interview Platform (LeetCode‑style)

Repo analyzed: **code.zip** (CRA React client + Express/Socket.IO server + “/run” endpoint that executes code on the server host via `child_process.exec`).

---

## 0) Current-state audit (what we will fix first)

### What you already have
- **Real-time code sync** via Socket.IO rooms (`code-change` event).
- **Basic presence list** (clients in room).
- **Output sharing** via `output-changed` event (currently emitted by clients).
- **A `/run` API** that writes code to disk and runs it on the **same server machine** (currently supports `js` and `cpp` only).

### Critical issues
1. **Code execution is unsafe**: running arbitrary user code on the API host is a security risk (RCE).
2. **Not scalable**: `exec()` on one node + shared local filesystem doesn’t scale horizontally.
3. **Language list is inconsistent**: UI shows many languages but server supports only `js`/`cpp` right now.
4. **Output sync can loop**: OutputSection emits output on every render because `output` is in the effect dependency array.
5. **No auth/permissions**: anyone with a roomId can join; no roles (interviewer/candidate/observer).
End goal: separate collaboration from execution and make both scalable + secure.

---

## 1) Product goals (what we’re building)

### UI/UX goals (LeetCode-like)
- **3‑pane layout**: Problem (left), Editor (center), Console/Testcases (bottom/right).
- **Top bar**: language selector, theme, run, submit, timer, room controls.
- **Tabs**: Description / Editorial / Solutions / Submissions (optional for MVP).
- **Presence**: avatars, role badges (Interviewer/Candidate), typing indicator, cursor presence.
- **Responsive**: desktop 3‑pane; tablet 2‑pane with toggle; mobile stacked tabs.

### Top 5 languages (MVP)
Pick **5** for real interviews:
1) JavaScript (Node)
2) Python
3) Java
4) C++
5) Go
> Add C# as “phase 2.5” because it’s common in interviews.

### System goals
- **Microservices execution** with strong sandboxing (no host execution).
- **Output streaming** to all users in room (server-originated, not client-originated).
- **Horizontally scalable** collaboration (multiple instances).
- **Multi-cloud deploy** (AWS + GCP) with Terraform.
- **Observability** (logs/metrics/tracing) and strong security posture.

---

## 2) Target architecture (scalable + secure)

### Services (minimum set)
1) **API Gateway / BFF** (REST/GraphQL)
   - Auth, room APIs, problem APIs, run/submit APIs.
2) **Collaboration Service** (WebSocket)
   - Code sync, presence, cursors, chat, broadcast run output.
3) **Execution Orchestrator**
   - Accepts “run” requests, enqueues jobs, streams output events.
4) **Runner Workers** (language runtimes)
   - Stateless workers that compile/run code inside sandboxed containers.
5) **Data Stores**
   - **Postgres**: users, rooms, problems, submissions, audit logs.
   - **Redis**: room presence, rate limit counters, pub/sub for WS fanout, job status cache.
   - **Object storage** (S3/GCS): artifacts, logs, submission bundles (optional).

### Recommended collaboration data model
- Use **CRDT** (Yjs) so multiple users can edit without conflicts.
- Persist Yjs updates periodically (Redis + Postgres snapshot) so reconnects are seamless.

### Execution model (safe)
- Runner executes in **container sandbox** with:
  - CPU/memory limits
  - timeouts (e.g., 2s run, 10s compile)
  - read-only filesystem except `/tmp`
  - no outbound network
  - seccomp/AppArmor (or gVisor / Firecracker where possible)
- Stream stdout/stderr incrementally back to orchestrator → collaboration service → clients.

### Scaling pattern
- WebSockets scale via **Redis Pub/Sub** (or NATS) + sticky sessions at LB.
- Runners scale via **Kubernetes Jobs** / **KEDA** autoscaling (or ECS tasks / Cloud Run jobs).

---

## 3) Tech stack decisions (practical + flexible)

### Frontend
- **Vite + React + TypeScript**
- **shadcn/ui + Tailwind** (design system)
- **Monaco Editor** (closest to LeetCode) OR keep CodeMirror but Monaco is better for “IDE feel”.
- **xterm.js** for terminal output (better than using CodeMirror as an output viewer).
- **i18n**: `react-i18next` + language JSON bundles.

### Backend
- **Node.js + TypeScript** for gateway + collaboration (Socket.IO or ws).
- Execution Orchestrator can be Node or Go (Node is fine for MVP).
- **Queue**: BullMQ (Redis) for MVP; move to NATS/Kafka later.

### Infrastructure
- Docker everywhere.
- Kubernetes path:
  - **AWS**: EKS + ALB Ingress + IAM roles for service accounts
  - **GCP**: GKE + Cloud Load Balancing
- Terraform modules for both (same inputs, different providers).

---

## 4) Implementation plan (phased, shippable)

### Phase 0 — Repo hardening (1–2 days)
- Fix OutputSection loop: emit output only on “RUN_RESULT” event from server.
- Align language keys (`cpp` vs `c++` etc.).
- Add basic env setup: `.env.example` in client/server.
- Add prettier/eslint, consistent TS config.

**Exit criteria**
- Existing app runs locally with no output sync loop.
- `/run` works for js/cpp (still unsafe but stable until Phase 3).

---

### Phase 1 — UI rewrite to LeetCode-style (Frontend MVP) (3–6 days)
**Deliverables**
- New layout using shadcn/ui:
  - `TopNav`, `ProblemPanel`, `EditorPanel`, `ConsolePanel`, `ParticipantsPanel`.
- Theme system:
  - light/dark + “editor theme” selection (Monaco themes).
- Responsive behavior:
  - desktop split panes (resizable)
  - mobile uses tabs: Problem / Code / Console
- Multi-language selector wired to editor syntax highlighting.

**Key implementation**
- Use `react-resizable-panels` for split panes.
- Add `react-i18next` with 5 languages UI strings (English + 4 more of your choice).
- Replace ad-hoc Tailwind with shadcn components (Card, Tabs, Button, Badge, Tooltip, Dialog).

**Exit criteria**
- UI looks like an interview platform (LeetCode-like).
- Works on mobile, tablet, desktop.

---

### Phase 2 — Real-time collaboration upgrade (CRDT + roles) (4–8 days)
**Deliverables**
- Replace “send full code string” with **Yjs** document sync.
- Presence: cursor/selection, typing indicator, roles.
- Room permissions:
  - interviewer can set candidate to “readonly”
  - allow “spectator mode”
- Room persistence:
  - store Yjs updates in Redis and snapshot to Postgres.

**Exit criteria**
- 2–5 users can edit concurrently without conflicts.
- Reconnect restores state within 1–2 seconds.

---

### Phase 3 — Microservices code execution (secure + scalable) (7–14 days)
This is the most important upgrade.

#### 3.1 Execution Orchestrator (API)
- Endpoint: `POST /api/run`
  - body: `{ roomId, language, code, stdin?, timeoutMs?, memoryMb? }`
  - returns: `{ runId }`
- Stores job state in Redis/Postgres.
- Publishes output events: `RUN_STARTED`, `RUN_OUTPUT`, `RUN_FINISHED`, `RUN_ERROR`.

#### 3.2 Runner workers (per language)
- Standard interface:
  - input: code + stdin + limits
  - output: streaming logs + exit code + runtime
- Use one “universal runner” image initially that contains toolchains,
  then split per-language images for faster cold start.

**Sandboxing (MVP)**
- Run inside Docker container with:
  - `--network none`
  - cpu/mem limits
  - tmpfs
  - timeout enforced by orchestrator + runner
- Production hardening:
  - gVisor / Kata Containers
  - seccomp profiles

#### 3.3 Output fanout to all users
- Orchestrator publishes events to Redis pub/sub channel: `room:{roomId}:run:{runId}`
- Collaboration service subscribes and emits to Socket.IO room.

**Exit criteria**
- Running code never touches host filesystem except isolated container tmp.
- Output appears in real-time for all users in the room.
- Multiple runs can execute concurrently.

---

### Phase 4 — Platform features (interview-grade) (5–10 days)
Pick the most useful ones first:
- Problem library + markdown rendering + constraints/examples.
- Testcases panel (visible/hidden tests).
- “Run” (visible tests) vs “Submit” (hidden tests).
- Code templates per language.
- Session timer + notes + chat.
- Shareable room link with invite token.
- Snapshots + replay (time-travel) for interviewer review.

**Exit criteria**
- A complete interview session can happen end-to-end.

---

### Phase 5 — Security, compliance & abuse prevention (parallel, 3–7 days)
**Security controls**
- Auth: email/OAuth (Cognito/Auth0/Firebase) + JWT.
- Room access tokens: signed, expiring.
- Rate limiting: per-IP + per-user for `/run` and WS events.
- Input validation (Zod) for all endpoints.
- Audit logging (room join/leave, run submissions).
- Secrets: AWS Secrets Manager / GCP Secret Manager.
- Network egress blocked in runner.
- Vulnerability scanning: Dependabot + Trivy in CI.

**Exit criteria**
- No anonymous runs in production.
- Abuse/rate controls in place.

---

### Phase 6 — Terraform + multi-cloud deployments (7–12 days)
Provide “choose one” or support both.

#### Option A (recommended): Kubernetes on both clouds
- Terraform modules:
  - `modules/network`
  - `modules/k8s_cluster` (EKS/GKE)
  - `modules/registry` (ECR/Artifact Registry)
  - `modules/postgres` (RDS/CloudSQL)
  - `modules/redis` (Elasticache/Memorystore)
  - `modules/ingress` (ALB/GLB)
  - `modules/observability` (Prometheus/Grafana + OpenTelemetry)

#### Option B: Serverless runners (faster ops, less control)
- AWS: API Gateway + Lambda for control-plane, ECS/Fargate for runners
- GCP: Cloud Run services + Cloud Run jobs for runners

**CI/CD**
- GitHub Actions:
  - build/test
  - docker build & push
  - terraform plan/apply (protected)
  - deploy to cluster

**Exit criteria**
- One-command deploy to AWS and/or GCP from CI.

---

## 5) “Good and flexible” design guidelines (so you can extend later)

### Language plugin system
- `languages/manifest.json`
  - name, id, file extension, compileCmd, runCmd, image
- UI reads manifest to populate dropdown.
- Runner reads same manifest for execution mapping.

### Event contracts (stable)
- Define events in a shared package (`packages/contracts`)
  - `RoomEvent`, `RunEvent`, `PresenceEvent`
- Use versioned schemas to avoid breaking clients.

### Local dev experience
- `docker-compose.dev.yml`:
  - postgres, redis
  - collaboration service
  - orchestrator
  - runner (local docker socket or k8s-in-docker)
- Make “run” work locally without cloud.

---

## 6) End-to-end testing strategy (deep + practical)

### 6.1 Unit tests
- Frontend: Vitest + React Testing Library
  - components: panels, language selector, i18n switching, theme toggle
- Backend: Jest
  - auth guards, room service, run request validation

### 6.2 Integration tests
- Spin up Postgres + Redis in CI (docker services).
- Test flows:
  1) create room → join → presence list
  2) CRDT sync with 2 simulated clients
  3) run request → runner executes → output events persisted

### 6.3 Contract tests (recommended)
- Shared OpenAPI + Zod schemas
- Verify gateway ↔ orchestrator payload compatibility.

### 6.4 E2E UI tests (Playwright)
Scenarios:
1) **Room join** with invite token
2) **Two users** edit simultaneously (CRDT) and both see updates
3) **Run code** and both see streaming output
4) **Switch language** and template loads + highlighting changes
5) **Responsive**: mobile viewport tabs work correctly
6) **Permissions**: interviewer sets candidate read-only, enforcement works

### 6.5 Load & scalability tests
- **k6** for REST endpoints (`/run`, `/rooms`, `/auth`).
- **Artillery** for WebSocket load (presence + edits).
- Runner load:
  - simulate N runs/minute with multiple languages
  - ensure queue + autoscaling works

### 6.6 Security tests
- SAST: CodeQL
- Dependency scan: npm audit + osv-scanner
- Container scan: Trivy
- DAST smoke: OWASP ZAP against staging
- Sandbox tests:
  - infinite loop timeouts
  - fork bombs blocked
  - file system isolation
  - network blocked

### 6.7 Observability tests
- Verify run latency metrics, queue depth, WS disconnect rates.
- Alerts: high error rate, high job timeout rate, high CPU.

---

## 7) Concrete refactor map for your repo

### New monorepo structure (recommended)
```
/apps
  /web              (Vite + React + TS + shadcn)
  /gateway          (REST/BFF)
  /collab-ws        (WebSocket + Yjs)
  /orchestrator     (run/submit + queue)
  /runner           (worker runtime)
/packages
  /contracts        (types + event schemas)
  /ui               (shared UI components)
/infra
  /terraform
  /docker
```

### Migration strategy (low risk)
- Keep current Socket.IO server running while building new UI + services.
- Switch client to new gateway/ws endpoints behind env flags.
- Deprecate `/run` host execution only after runner is live.

---

## 8) Acceptance checklist (what “done” means)
- ✅ LeetCode-like UI with shadcn + Tailwind + responsive split panes
- ✅ Top‑5 languages run safely inside sandboxed runners
- ✅ Output streams live to all room participants
- ✅ Auth + room invite tokens + roles (interviewer/candidate/spectator)
- ✅ Horizontal scaling for WS + runners
- ✅ Terraform deploy on AWS and/or GCP
- ✅ Full test suite: unit + integration + e2e + load + security scans

---

## 9) Suggested “first sprint” task list (highest impact)
1) Fix output loop + normalize language IDs in current code.
2) Build new UI shell (TopNav + 3 panes) using shadcn.
3) Introduce contracts package + OpenAPI.
4) Build orchestrator + one runner (Node + Python).
5) Stream output to room via server events (remove client-originated output).
6) Add auth + room invite tokens.

