# OpsDesk – Service Desk & Operations POC

OpsDesk is a practical proof-of-concept for a modern operations and support platform that combines ticket management, realtime chat, audit logging, and robust observability on top of a NestJS-based Node.js backend.

---

## 1. Overview

OpsDesk is a **Service Desk/Operations** system that brings together Tickets, Realtime Chat, and full Audit capabilities, exposed through REST and GraphQL APIs. The platform is designed as a realistic backend playground, covering OAuth/OIDC, RBAC, WebSockets, messaging, caching, observability, and Nginx as an edge gateway.

Key features:

- REST + GraphQL APIs
- OAuth2/OIDC authentication
- Role-Based Access Control (RBAC)
- WebSockets for realtime communication
- Message queue for asynchronous processing
- Redis for caching
- Prometheus, Grafana, Loki and optional OpenTelemetry for observability
- Nginx acting as gateway / reverse proxy

---

## 2. POC Vision

**Name:** OpsDesk

### 2.1 Main Use Cases

- Users create and track tickets (incidents/requests).
- Internal teams handle tickets and communicate via realtime chat (WebSocket).
- Ticket events trigger notifications and asynchronous tasks (messaging).
- All operations are protected by RBAC and fully audited.
- Metrics, logs, and tracing are visible through Grafana dashboards.

### 2.2 Suggested Stack

- **Backend:** Node.js (NestJS)
- **Database:** PostgreSQL
- **Cache:** Redis
- **Messaging:** RabbitMQ (initial) or Kafka (advanced phase)
- **Observability:** Prometheus + Grafana + Loki, optional OpenTelemetry
- **Gateway:** Nginx
- **Auth:** OAuth2/OIDC (e.g. Keycloak) or simplified OAuth/JWT in backend for initial phases

---

## 3. Project Phases

Each phase has clear learning goals and deliverables, evolving from fundamentals to production-like operations.

### Phase 0 — Foundations & Architecture

**Goal:** Design and bring up a clean “skeleton” with good separation.

- [x] Monorepo or multi-repo (API, realtime, worker).
- [x] Docker Compose with PostgreSQL + Redis.
- [x] Patterns:
  - [x] Layered architecture (controller/service/repository).
  - [x] DTOs, validation, standardized error responses.
- [x] Data modeling (ERD + normalization):
  - `users`, `roles`, `permissions`, `user_roles`, `role_permissions`
  - `tickets`, `ticket_status_history`
  - `messages` (chat), `audit_log`
- [x] ACID transactions:
  - [x] Create ticket + register event + initial status in a single transaction.
  - [x] Close ticket + write history + audit in a single transaction.

**Deliverables**

- Architecture diagram + ERD.
- Basic CRUD for tickets and users (no auth yet).

---

### Phase 1 — Well-Designed REST API (API Design)

**Goal:** Learn real-world REST API design.

- REST endpoints with pagination, filtering, sorting:
  - `GET /tickets?status=open&assignee=123&sort=-createdAt`
  - `POST /tickets`
  - `PATCH /tickets/:id/status`
- Versioning: `/v1`
- Consistent error handling and idempotency where it makes sense.
- OpenAPI/Swagger documentation.

**Deliverables**

- Postman/Insomnia collection.
- API design checklist (status codes, envelopes, error format, pagination rules).

---

### Phase 2 — OAuth2/OIDC + RBAC (Security & Authorization)

**Goal:** Modern authentication and permission-based authorization.

- OAuth2/OIDC (recommended: Keycloak) using JWT.
- RBAC model:
  - Roles: `admin`, `agent`, `customer`
  - Permissions: `ticket:read`, `ticket:assign`, `ticket:close`, `message:send`, etc.
- Rules:
  - Customer: can only see own tickets.
  - Agent: can see and manage team tickets (start with “any ticket” and refine).
  - Admin: full access.

**Deliverables**

- Auth middleware/guards + permission-based authorization.
- Seed script for roles/permissions + authorization tests.

---

### Phase 3 — WebSockets (Realtime)

**Goal:** Realtime communication with proper rules and basic scalability.

- Per-ticket channel: `ticket:{id}`
- Events:
  - `message:new`
  - `ticket:statusChanged`
  - `typing`
- Authorization:
  - JWT validation on WebSocket handshake.
  - Ticket access verification.
- Strategy for scaling:
  - Redis pub/sub for multi-instance support.

**Deliverables**

- Simple UI (even a single page) showing chat and live ticket events.
- Rate limiting / basic abuse protection.

---

### Phase 4 — GraphQL (Alternative to REST)

**Goal:** Understand where GraphQL helps and where it hurts.

- GraphQL schema:
  - Types: `Ticket`, `Message`, `User`, `AuditEvent`
- Queries with filters.
- Mutations:
  - `createTicket`
  - `sendMessage`
  - `changeTicketStatus`
- Avoid N+1 with DataLoader.
- (Optional advanced) Subscriptions wired to WebSockets.

**Deliverables**

- GraphiQL (or similar) playground with example queries/mutations.
- One-page comparison: REST vs GraphQL (trade-offs, use cases).

---

### Phase 5 — Messaging (RabbitMQ/Kafka) + Workers

**Goal:** Asynchronous processing, retries, DLQ and robust workers.

- When a ticket changes status, publish `TicketStatusChanged` (and other domain events).
- Worker consumes events to:
  - Send “fake” notifications (email/slack).
  - Update projections/cache.
  - Generate daily reports.
- Concepts:
  - Retries with backoff.
  - Dead-letter queues (DLQ).
  - Consumer idempotency.

**Deliverables**

- Documented exchanges/queues (RabbitMQ) or topics (Kafka).
- Worker with metrics (processed, failed, retried).

---

### Phase 6 — Caching (Redis)

**Goal:** Performance with consistency.

- Cache:
  - Lists of tickets for common filters.
  - User permissions (with TTL).
- Invalidation by event:
  - Ticket change publishes an event and invalidates related keys.
- Strategy:
  - Cache-aside + TTL.
  - Optional tag-like behavior for simulations.

**Deliverables**

- Simple benchmark before/after (even local) demonstrating latency improvement.

---

### Phase 7 — Observability (Prometheus, Grafana, Logging)

**Goal:** Operate the service like a production system.

- Metrics:
  - p95 latency per endpoint.
  - Error rate per route.
  - Queue metrics (lag, retries).
  - Active WebSocket connections.
- Structured logs with correlation-id (`request-id`).
- Dashboards in Grafana:
  - API Overview.
  - Worker Overview.
  - Realtime Overview.

**Deliverables**

- 2–3 dashboards ready.
- Basic alerts (e.g. error rate > X per minute).

---

### Phase 8 — Nginx (Gateway / Reverse Proxy)

**Goal:** Learn real-world deployment setups.

- Nginx in front of API + WS + GraphQL:
  - Reverse proxy.
  - Optional gzip/brotli.
  - Asset caching (if there is a UI).
  - Security headers.
- Routes:
  - `/api` → REST backend.
  - `/graphql` → GraphQL backend.
  - `/ws` → WebSocket server.

**Deliverables**

- Well-commented `nginx.conf`.
- Example `curl` usages.

---

## 4. Bonus Challenges

Optional, but very educational:

- **Concurrency/Transactions:** two agents trying to take the same ticket → use `SELECT … FOR UPDATE` or optimistic locking.
- **Advanced RBAC:** permissions scoped by team/project.
- **GraphQL anti N+1:** enforce DataLoader usage patterns.
- **WebSocket scaling:** multiple instances + Redis pub/sub.

---

## 5. Practical Plan for the Developer

This POC doubles as a structured learning track. It can be delivered as:

- Repository README (phases, checklists, and Definition of Done).
- Suggested folder structure:
  - `apps/api`
  - `apps/realtime`
  - `apps/worker`
  - `infra`
  - `packages/shared`
- Initial backlog (epics + tasks) for a Node.js (NestJS) backend.

### Definition of Done (DoD)

For each feature, aim for:

- Endpoints with validation and Swagger/OpenAPI documentation.
- e2e tests for critical flows.
- Structured logs with `request-id`.
- Reproducible migrations + seed scripts.
- Entire stack running with a single `docker compose up`.

---

## 6. Initial Backlog (Node.js / NestJS)

Below is a hands-on initial backlog for the OpsDesk POC using Node.js (NestJS), organized as Epics → User Stories → Technical Tasks.

### EPIC 0 — Setup, Architecture & Local Infra

**US0.1 – Repository Bootstrap**

- [x] Create a monorepo with:
  - `apps/api`
  - `apps/realtime`
  - `apps/worker`
  - `packages/shared`

- [x] Configure:
  - Node 20+
  - pnpm
  - eslint
  - prettier
  - editorconfig
  - commitlint (optional)
- [x] Setup NestJS in `apps/api` with a health endpoint `GET /health`.
- [x] Create `packages/shared` for shared types, DTOs and utilities.

**US0.2 – Base Docker Compose**

- [x] `docker-compose.yml` with:
  - PostgreSQL
  - Redis
  - RabbitMQ (plus optional admin UI)
- [x] Environment variables with `.env.example`.
- [x] Makefile / npm scripts:
  - `dev:up`
  - `dev:down`
  - `db:migrate`
  - `db:seed`

**US0.3 – Minimal Observability**

- [x] Structured logger (Pino or Winston) in the API.
- [x] Correlation ID (`request-id`) middleware/interceptor.

---

### EPIC 1 — Data Modeling & Persistence (PostgreSQL)

**US1.1 – ERD and Migrations**

- [x] Entities/tables:
  - `users`, `roles`, `permissions`, `user_roles`, `role_permissions`
  - `tickets`, `ticket_status_history`
  - `messages`
  - `audit_log`
- [x] Configure ORM (Prisma or TypeORM) with migrations.
- Seed:
  - [x] Roles: `admin`, `agent`, `customer`
  - [x] Basic permissions like `ticket:read`, `ticket:create`, `ticket:assign`, `ticket:close`, `message:send`

**US1.2 – Basic ACID Rules**

- Transaction service for:
  - [x] Create ticket + initial status + audit log.
  - [x] Close ticket + history + audit log.
- [x] Automated test verifying rollback on failure (e.g. error when writing audit log).

---

### EPIC 2 — REST API v1 (API Design)

**US2.1 – Ticket CRUD**

- [x] Endpoints:
  - [x] `POST /v1/tickets` (create)
  - [x] `GET /v1/tickets/:id` (details)
  - [x] `GET /v1/tickets/:id/history` (timeline: created, status changes, messages)
  - [x] `GET /v1/tickets` (list with pagination/filter/sort)
  - [x] `PATCH /v1/tickets/:id` (edit title/description)
  - [x] `PATCH /v1/tickets/:id/status` (change status)
- [x] Standardize:
  - [x] Response envelope
  - [x] Error format (RFC 7807 or custom)

**US2.2 – Minimal User CRUD (admin-only later)**

- [x] `POST /v1/users` (create)
- [x] `GET /v1/users/:id`
- [x] `GET /v1/users`

**US2.3 – Documentation & Quality**

- [x] Swagger/OpenAPI with examples.
- [x] DTO validation using `class-validator` + pipes.
- [x] Basic e2e tests (supertest):
  - [x] health
  - [x] create ticket
  - [x] list tickets

**Ticket history timeline**

The Ticket Detail page shows a chronological timeline of events (created, status changes, messages). API: `GET /v1/tickets/:id/history`.

**Smoke checks**

```bash
TOKEN=$(curl -s -X POST http://localhost:8888/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@opsdesk.dev","password":"123456"}' | jq -r '.accessToken')
TICKET_ID=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8888/api/v1/tickets | jq -r '.data[0].id')
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:8888/api/v1/tickets/$TICKET_ID/history" | jq .
# Expected: { "data": [ { "type": "created"|"status_change"|"message", "id": "...", "createdAt": "...", "payload": {...} }, ... ] }
```

**Expected results**

- Timeline events are sorted by `createdAt` ascending.
- Event types: `created`, `status_change`, `message`.
- Web UI: Ticket Detail page shows the History section below ticket details.

**If this fails**

- **404**: Ensure the ticket exists and you have `ticket:read` permission.
- **Empty data**: Create a ticket, add messages, or change status to populate history.

---

### EPIC 3 — Authentication OAuth2/OIDC + RBAC

**US3.1 – Simple JWT Auth (initial)**

- [x] Implement basic login (username/password from DB) to unblock the POC.
- Issue JWT + optional refresh token.
- [x] Global auth guard on `/v1/*`.

**US3.2 – OIDC (Keycloak)**

- [x] Add Keycloak in `docker-compose` (realm `opsdesk`).
- [x] Configure OIDC client + JWKS validation in API.
- [x] Replace simple auth with OIDC (keep a “dev mode” option).

**US3.3 – Permission-Based RBAC**

- [x] Decorator `@Permissions(...)` + guard.
- [x] Authorization rules:
  - [x] Customer only accesses own tickets.
  - [x] Agent accesses assigned/team tickets (start with “any ticket” then refine).
  - [x] Admin accesses everything.
- [x] e2e tests for authorization (correct 403/404 responses).

**Learning — Global auth and public routes**

**Smoke checks**

```bash
# Public routes (no token)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8888/api/health
# Expected: 200

curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8888/api/metrics
# Expected: 200

# Protected route without token → 401
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8888/api/v1/tickets
# Expected: 401
```

**Controlled tests**

```bash
# Login and access protected route
TOKEN=$(curl -s -X POST http://localhost:8888/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@opsdesk.dev","password":"123456"}' | jq -r '.accessToken')
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8888/api/v1/tickets | jq .
# Expected: 200 + JSON
```

**Expected results**

- `/health`, `/metrics`, `/auth/login` → 200 without token
- `/v1/*` without token → 401
- `/v1/*` with valid Bearer token → 200/403 according to permissions

**If this fails**

- **401 on /auth/login**: Run `pnpm db:seed` and use `admin@opsdesk.dev` / `123456`
- **401 with token**: Token expired — app will attempt refresh; if refresh fails (e.g. refresh token expired), redirect to login. Also check `AUTH_MODE` mismatch.
- **EACCES on API dist**: Run `make api-restart` to use Docker volume for build output

**User provisioning with Keycloak**

When `AUTH_MODE=keycloak`, `POST /v1/users` provisions users in Keycloak first, then mirrors them into the local `users` table with `externalId` set to the Keycloak user ID.

**Required env vars for user provisioning**

- `AUTH_MODE=keycloak`
- `OIDC_ISSUER` (e.g. `http://keycloak:8080/realms/opsdesk`)
- `KEYCLOAK_ADMIN_USERNAME` (default: `admin`)
- `KEYCLOAK_ADMIN_PASSWORD` (default: `admin`)

**Smoke test**

```bash
# Ensure Keycloak is running and AUTH_MODE=keycloak in .env
TOKEN=$(curl -s -X POST http://localhost:8888/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@opsdesk.dev","password":"123456"}' | jq -r '.accessToken')
# Or use Keycloak OIDC flow to obtain a token

curl -s -X POST http://localhost:8888/api/v1/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@example.com","name":"New User","password":"secret123","roleId":"<role-uuid>"}' | jq .
# Expected: 201 + user object with id, email, name, externalId (Keycloak user ID)
```

**Expected results**

- New user appears in Keycloak Admin Console (Users) with the given email and username.
- Local `users` row has `external_id` equal to the Keycloak user ID.
- User can log in via Keycloak OIDC flow.

**If this fails**

- **400 "Failed to obtain Keycloak admin token"**: Check `KEYCLOAK_ADMIN_USERNAME` and `KEYCLOAK_ADMIN_PASSWORD` match Keycloak Admin Console credentials; ensure Keycloak is reachable from the API container (e.g. `keycloak:8080`).
- **400 "User with email or username already exists"**: Email or username is already in Keycloak; use a different value.
- **400 "Invalid OIDC_ISSUER format"**: Ensure `OIDC_ISSUER` is `https://host/realms/realm` or `http://host/realms/realm`.

---

### EPIC 4 — WebSockets (Realtime)

**US4.1 – WebSocket Gateway**

- [x] Create `apps/realtime` (NestJS WebSocket Gateway).
- [x] Authenticate WebSocket via JWT in handshake.
- [x] Use rooms by ticket: `ticket:{id}`.

**US4.2 – Realtime Events**

- [x] Events:
  - [x] `message:new`
  - [x] `ticket:statusChanged`
  - [ ] `typing` (optional — not yet implemented)
- [x] Persist messages in PostgreSQL.

**US4.3 – Basic Scalability**

- [x] Redis pub/sub adapter for multi-instance support (optional/bonus).
- Rate limiting per connection/event (minimal).

---

### EPIC 5 — GraphQL (Alternative to REST)

> **Status: Not yet implemented** — planned for a future iteration. There is no `@nestjs/graphql` configuration in `AppModule`, no resolvers, no DataLoader, and no subscriptions.

**US5.1 – GraphQL Server in API**

- [ ] Enable `@nestjs/graphql` in `apps/api`.
- [ ] Schema:
  - [ ] Types: `Ticket`, `Message`, `User`, `AuditEvent`
- [ ] Queries:
  - [ ] `ticket(id)`
  - [ ] `tickets(filter, paging, sort)`
- [ ] Mutations:
  - [ ] `createTicket`
  - [ ] `changeTicketStatus`
  - [ ] `sendMessage`

**US5.2 – Security & Performance**

- [ ] Apply RBAC to GraphQL (guards).
- [ ] Prevent N+1 issues with DataLoader (e.g. ticket → user/assignee).

**US5.3 – Subscriptions (bonus)**

- [ ] `Subscription messageAdded(ticketId)` tied into the realtime/WS layer.

---

### EPIC 6 — Messaging (RabbitMQ) + Worker

**US6.1 – Domain Event Publishing**

- [x] On ticket creation: publish `ticket.created`.
- [x] On status change: publish `ticket.status_changed`.
- [x] On message sent: publish `message.sent`.

**US6.2 – Worker Consumer**

- [x] `apps/worker` consuming queues.
- [x] Initial jobs:
  - [x] Log "fake" notification.
  - [x] Update/invalidate cache.
  - [x] Async audit logging.
- [x] Configure retries + DLQ.

**US6.3 – Idempotency**

- [x] Ensure reprocessing a message does not duplicate side effects (e.g. store processed IDs or use DB constraints).

**📚 Documentation:** See [EPIC6-MESSAGING-LEARNING-GUIDE.md](docs/EPIC6-MESSAGING-LEARNING-GUIDE.md) for complete implementation details and learning guide.

---

### EPIC 7 — Caching (Redis)

**US7.1 – Cache-Aside for Listings**

- [x] Cache `GET /v1/tickets` for common filter combinations (with TTL).
- [x] Cache user permissions (with TTL).

**US7.2 – Event-Based Invalidation**

- [x] On `ticket.*` events in worker → invalidate relevant keys.

**US7.3 – Measurement**

- [x] Measure latency with and without cache (simple script).

---

### EPIC 8 — Monitoring & Logging (Prometheus/Grafana)

**US8.1 – Metrics**

- [x] Use `prom-client` in API and worker.
- [x] Metrics:
  - [x] HTTP latency (p95).
  - [x] Error rate per route.
  - [x] Jobs processed/failed/retried.
  - [x] Active WebSocket connections.

**US8.2 – Prometheus + Grafana**

- [x] Add Prometheus + Grafana to `docker-compose`.
- [x] Dashboards:
  - [x] “API Overview”
  - [x] “Worker Overview”
  - [x] “Realtime Overview”

**US8.3 – Logs**

- [ ] Loki (optional) + log dashboard — not yet implemented.
- [x] Standard log fields:
  - [x] `service`
  - [x] `request_id`
  - [x] `user_id`
  - [x] `ticket_id`

**US8.4 – Runbook (Dashboards + Alert Tests)**

- [x] Start stack: `docker compose up -d`.
- [x] Access:
  - Prometheus: `http://localhost:9090`
  - Grafana: `http://localhost:3001` (`admin` / `admin`)
- [x] Provisioned dashboards (folder `OpsDesk`):
  - `OpsDesk API`
  - `OpsDesk Worker`
  - `OpsDesk Realtime`

**Learning — Alerting runbook**

**Smoke checks**

- Prometheus rule loading: open `http://localhost:9090/rules` and confirm group `opsdesk-baseline-alerts` is present and healthy.
- Prometheus targets: open `http://localhost:9090/targets` and confirm `api`, `worker`, `realtime` are `UP`.
- API metrics: open `http://localhost:3000/metrics` and check `http_requests_total`, `http_request_errors_total`, and `http_request_duration_seconds_bucket`.
- Worker metrics: open `http://localhost:3003/metrics` and check `worker_processed_total`, `worker_failed_total`, and `worker_rabbitmq_connected`.
- Realtime metrics: open `http://localhost:3002/metrics` and check `realtime_active_connections`.

**Controlled tests**

- `ApiHighErrorRate`:
  - Generate 404/401 traffic for ~5 minutes (threshold is 5% over 5m), e.g.:
    - `while true; do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/v1/does-not-exist; sleep 0.2; done`
- `ApiHighLatencyP95`:
  - Hit the slow endpoint for ~5 minutes (default 1.5s delay per request):
    - `while true; do curl -s -o /dev/null http://localhost:8888/api/health/slow; sleep 0.2; done`
  - Optional: `?delay=2000` for 2s (e.g. `http://localhost:8888/api/health/slow?delay=2000`).
  - Verify firing state in `http://localhost:9090/alerts`.
  - Quick check query in Prometheus UI:
    - `histogram_quantile(0.95, sum by (le, job, instance) (rate(http_request_duration_seconds_bucket{job="api"}[5m])))`
- `WorkerProcessingFailuresWarning` and `WorkerProcessingFailuresCritical`:
  - Publish invalid payloads in RabbitMQ UI (`http://localhost:15672`, `guest/guest`) to exchange `opsdesk.events` with routing key `ticket.created`.
  - One/few failures should trigger warning; sustained bursts (>5 failures in 10m) should trigger critical.
- `RealtimeDown`:
  - Stop realtime service for at least 2 minutes: `docker compose stop realtime`.
  - Start again after alert validation: `docker compose start realtime`.

**Expected results**

- `ApiHighErrorRate` fires as `warning` after condition holds for 5m and clears when error ratio drops.
- `ApiHighLatencyP95` fires as `warning` when API p95 latency is above 1s for 5m.
- `WorkerProcessingFailuresWarning` fires with at least one failure in 10m; `WorkerProcessingFailuresCritical` fires when failures exceed 5 in 10m.
- `RealtimeDown` fires as `critical` when `up{job="realtime"} == 0` for 2m.
- Alert instances include `job` and `instance` labels so you can identify the exact target in Alertmanager/Grafana.

**If this fails**

- No alert appears in Prometheus: verify rules are mounted to `/etc/prometheus/alerts.yml` and check `http://localhost:9090/rules` for parse errors.
- Alert condition true but still `inactive`: check the `for` duration (`5m`/`2m`) and keep the failure condition stable long enough.
- Worker alerts never fire: ensure invalid messages are actually consumed (check worker logs) and confirm `worker_failed_total` is increasing in Prometheus expression browser.
- `RealtimeDown` not firing: verify scrape target is exactly `job="realtime"` in `prometheus.yml` and that Prometheus can no longer scrape `realtime:3002/metrics`.

Alert rules are versioned in `monitoring/prometheus/alerts.yml`, and Grafana provisioning is versioned under `monitoring/grafana/provisioning`.

---

### EPIC 9 — Nginx (Gateway)

**US9.1 – Reverse Proxy**

- [x] Nginx in front of:
  - `/api` → `apps/api`
  - `/graphql` → `apps/api`
  - `/ws` → `apps/realtime`
- [x] Correct WebSocket upgrade headers.
- [x] Basic security headers + gzip.

**Learning — Smoke checks (via gateway on port 8888)**

```bash
# REST API through gateway
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8888/api/health
# Expected: 200

# Login and list tickets (REST)
TOKEN=$(curl -s -X POST http://localhost:8888/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@opsdesk.dev","password":"123456"}' | jq -r '.accessToken')
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8888/api/v1/tickets | jq .
# Expected: JSON array of tickets

# Swagger docs
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8888/api/docs
# Expected: 200
```

**WebSocket through gateway**

Connect to `http://localhost:8888/ws` with path `/ws` (Socket.IO client):

```javascript
import { io } from 'socket.io-client';
const socket = io('http://localhost:8888', { path: '/ws', auth: { token: TOKEN } });
```

**Expected results**

- `GET /api/health` → 200
- `GET /api/v1/tickets` with Bearer token → 200 + JSON
- `GET /api/docs` → 200 (Swagger UI)
- WebSocket handshake to `/ws` → 101 Switching Protocols

**If this fails**

- **502 Bad Gateway**: API or realtime not ready. Run `docker compose up` and wait for services.
- **404 on /api/...**: Ensure trailing slash in nginx `location /api/` and `proxy_pass http://api/`.
- **WebSocket fails (xhr poll error)**: Realtime not on port 3002, or nginx missing `Upgrade`/`Connection` headers.
- **Invalid token on WS**: Token expired or `AUTH_MODE` mismatch between API and realtime.
- **401 on /api/v1/tickets**: Ensure `AUTH_MODE=local` (JWT_SECRET set) and `pnpm db:seed` was run. Use `admin@opsdesk.dev` / `123456`.

---

## 7. Running the Project

- Ensure Docker and Docker Compose are installed.
- Configure `.env` based on `.env.example`.
- Start the stack:
```bash
docker compose up
```
- **Via Nginx gateway (port 8888):**
  - Web UI: `http://localhost:8888`
  - API: `http://localhost:8888/api/v1`
  - Swagger: `http://localhost:8888/api/docs`
  - Health: `http://localhost:8888/api/health`
  - WebSocket: `http://localhost:8888/ws` (Socket.IO path `/ws`)
- **Direct access** (for development): Web UI `:5173`, API `:3000`, Realtime `:3002`, Grafana `:3001`, Prometheus `:9090`.

For the Web UI, use `AUTH_MODE=local` and run `pnpm db:seed` to create the admin user (`admin@opsdesk.dev` / `123456`).

**If localhost:8888 shows the default nginx page instead of the web app:** ensure the web container is running (`docker compose ps`) and restart nginx (`docker compose restart nginx`). The web container runs `pnpm install` on first start, so it may take ~15 seconds to be ready.

**Keycloak "Invalid parameter: redirect_uri":** See [docs/KEYCLOAK-WEB-UI-SETUP.md](docs/KEYCLOAK-WEB-UI-SETUP.md) for step-by-step configuration. Quick fix: add `http://localhost:8888/login` to **Valid redirect URIs** (one per line), set **Root URL** to `http://localhost:8888`, and ensure **Client authentication** is OFF.

---

## 8. Learning — Auth Refresh, Notifications, Dark Theme

**Smoke checks**

- **Auth refresh**: Log in, wait for token expiry (or shorten JWT TTL for testing), trigger an API call — the app should silently refresh and retry; if refresh fails, redirect to `/login`.
- **Prometheus targets**: Open `http://localhost:9090/targets` and confirm `api`, `worker`, `realtime` are `UP`.
- **Notification badge**: Run `pnpm db:migrate` to create `user_notifications`. The bell icon appears in the sidebar header (next to OpsDesk). With two users, have one send a message or change status on a ticket owned by the other — the owner should see the badge count increment.
- **Dark theme**: Click the sun/moon icon in the sidebar or login page; reload the page — the chosen theme should persist.

**Controlled tests**

- **Expired token**: Use a short-lived token (e.g. 1m), wait for expiry, then navigate or trigger a request — expect silent refresh or redirect to login.
- **Prometheus scrape failure**: Stop the API (`docker compose stop api`), check targets for `lastError`; restart API and confirm target returns to `UP`.
- **Cross-user notification**: User A creates a ticket; User B (agent) sends a message or changes status; User A should see the badge increment and receive a realtime `notification:new` event.
- **Theme persistence**: Toggle dark mode, close the tab, reopen — theme should match the last selection.

**Expected results**

- 401 on API → one refresh attempt; on refresh failure → redirect to `/login` and clear auth state.
- Prometheus `api` target `UP` with `metrics_path: /metrics` and healthcheck passing.
- Unread count from `GET /v1/notifications/unread`; badge updates on `notification:new` WebSocket event.
- Sidebar: only "New Ticket" active on `/tickets/new`; only "Tickets" active on `/tickets` and `/tickets/:id`.
- `localStorage` key `opsdesk_theme` stores `light` or `dark`; `dark` class on `<html>` when dark.

**If this fails**

- **No refresh on 401**: Ensure `registerAuthHandler` is called from `AuthProvider` and refresh token is stored; check browser console for refresh errors.
- **Prometheus API pending**: See "If Prometheus shows API target as pending or DOWN" in EPIC 8 section; verify API healthcheck and `metrics_path`.
- **Badge not updating**: Run `pnpm db:migrate` to create `user_notifications`. Ensure WebSocket is connected and user room `user:{id}` is joined on connect; check RabbitMQ and realtime logs for `notification:new` emission. Badge only increments when another user (not you) sends a message or changes status on a ticket you own.
- **Both Tickets and New Ticket active**: Verify `isTicketsActive` / `isNewTicketActive` logic in `Sidebar.tsx`.
- **Theme not persisting**: Check `opsdesk_theme` in `localStorage`; ensure `@custom-variant dark` is in `index.css`.
