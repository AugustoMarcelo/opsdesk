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

---

### EPIC 3 — Authentication OAuth2/OIDC + RBAC

**US3.1 – Simple JWT Auth (initial)**

- Implement basic login (username/password from DB) to unblock the POC.
- Issue JWT + optional refresh token.
- Global auth guard on `/v1/*`.

**US3.2 – OIDC (Keycloak)**

- Add Keycloak in `docker-compose` (realm `opsdesk`).
- Configure OIDC client + JWKS validation in API.
- Replace simple auth with OIDC (keep a “dev mode” option).

**US3.3 – Permission-Based RBAC**

- Decorator `@Permissions(...)` + guard.
- Authorization rules:
  - Customer only accesses own tickets.
  - Agent accesses assigned/team tickets (start with “any ticket” then refine).
  - Admin accesses everything.
- e2e tests for authorization (correct 403/404 responses).

---

### EPIC 4 — WebSockets (Realtime)

**US4.1 – WebSocket Gateway**

- Create `apps/realtime` (NestJS WebSocket Gateway).
- Authenticate WebSocket via JWT in handshake.
- Use rooms by ticket: `ticket:{id}`.

**US4.2 – Realtime Events**

- Events:
  - `message:new`
  - `ticket:statusChanged`
  - `typing` (optional)
- Persist messages in PostgreSQL.

**US4.3 – Basic Scalability**

- [x] Redis pub/sub adapter for multi-instance support (optional/bonus).
- Rate limiting per connection/event (minimal).

---

### EPIC 5 — GraphQL (Alternative to REST)

**US5.1 – GraphQL Server in API**

- Enable `@nestjs/graphql` in `apps/api`.
- Schema:
  - Types: `Ticket`, `Message`, `User`, `AuditEvent`
- Queries:
  - `ticket(id)`
  - `tickets(filter, paging, sort)`
- Mutations:
  - `createTicket`
  - `changeTicketStatus`
  - `sendMessage`

**US5.2 – Security & Performance**

- Apply RBAC to GraphQL (guards).
- Prevent N+1 issues with DataLoader (e.g. ticket → user/assignee).

**US5.3 – Subscriptions (bonus)**

- `Subscription messageAdded(ticketId)` tied into the realtime/WS layer.

---

### EPIC 6 — Messaging (RabbitMQ) + Worker

**US6.1 – Domain Event Publishing**

- [x] On ticket creation: publish `ticket.created`.
- On status change: publish `ticket.status_changed`.
- On message sent: publish `message.sent`.

**US6.2 – Worker Consumer**

- `apps/worker` consuming queues.
- Initial jobs:
  - Log “fake” notification.
  - Update/invalidate cache (next phase).
  - Optional async audit logging.
- Configure retries + DLQ.

**US6.3 – Idempotency**

- Ensure reprocessing a message does not duplicate side effects (e.g. store processed IDs or use DB constraints).

---

### EPIC 7 — Caching (Redis)

**US7.1 – Cache-Aside for Listings**

- [x] Cache `GET /v1/tickets` for common filter combinations (with TTL).
- Cache user permissions (with TTL).

**US7.2 – Event-Based Invalidation**

- On `ticket.*` events in worker → invalidate relevant keys.

**US7.3 – Measurement**

- Measure latency with and without cache (simple script).

---

### EPIC 8 — Monitoring & Logging (Prometheus/Grafana)

**US8.1 – Metrics**

- Use `prom-client` in API and worker.
- Metrics:
  - HTTP latency (p95).
  - Error rate per route.
  - Jobs processed/failed/retried.
  - Active WebSocket connections.

**US8.2 – Prometheus + Grafana**

- Add Prometheus + Grafana to `docker-compose`.
- Dashboards:
  - “API Overview”
  - “Worker Overview”
  - “Realtime Overview”

**US8.3 – Logs**

- Loki (optional) + log dashboard.
- Standard log fields:
  - `service`
  - `request_id`
  - `user_id`
  - `ticket_id`

---

### EPIC 9 — Nginx (Gateway)

**US9.1 – Reverse Proxy**

- Nginx in front of:
  - `/api` → `apps/api`
  - `/graphql` → `apps/api`
  - `/ws` → `apps/realtime`
- Correct WebSocket upgrade headers.
- Basic security headers + gzip.

---

## 7. Running the Project

- Ensure Docker and Docker Compose are installed.
- Configure `.env` based on `.env.example`.
- Start the stack:
```bash
docker compose up
```
- Access API at `http://localhost:<port>/v1`.
- Access Swagger at `http://localhost:<port>/docs` (or configured path).
- Access Grafana and other tools via the URLs defined in `docker-compose.yml`.