# EPIC 4 — Realtime (WebSockets) Learning Guide

This guide documents how EPIC 4 is implemented in OpsDesk: a **dedicated realtime service** that provides Socket.IO WebSockets with **JWT handshake authentication**, **per-ticket rooms**, and **server-side broadcasts** driven by **domain events**.

---

## What EPIC 4 requires (from `README.md`)

- Create a separate realtime service: `apps/realtime`
- Authenticate WebSocket connections via **JWT in the handshake**
- Use rooms per ticket: `ticket:{id}`
- Support realtime events:
  - `message:new`
  - `ticket:statusChanged`
  - `typing` (optional)
- Persist messages in PostgreSQL (already implemented via REST in `apps/api`)
- Basic scalability: Redis adapter (optional/bonus)

---

## Architecture overview

### Why a separate `apps/realtime` service?

Keeping WebSockets in a dedicated service mirrors real production setups:
- WebSocket connection lifecycles are different from request/response REST traffic
- Scaling WebSockets often requires different tuning and horizontal scaling rules
- A dedicated service is easier to observe and protect (rate limiting, connection caps)

### Dataflow

```mermaid
flowchart LR
  Client-->ApiREST
  ApiREST-->Postgres
  ApiREST-->RabbitMQ
  RabbitMQ-->RealtimeWS
  Client-->RealtimeWS
  RealtimeWS-->Client
```

- **Write path**: clients persist messages through REST (`apps/api`), which writes to Postgres and publishes domain events to RabbitMQ
- **Read/broadcast path**: `apps/realtime` consumes those events and broadcasts them to the correct Socket.IO room

---

## Implementation details (step-by-step)

### Step 1 — Create the realtime service

Files:
- `apps/realtime/package.json`
- `apps/realtime/Dockerfile`
- `apps/realtime/src/main.ts`
- `apps/realtime/src/app.module.ts`

The service listens on `REALTIME_PORT` (default `3002`).

---

### Step 2 — Database access (read-only for EPIC 4)

Files:
- `apps/realtime/src/db/database.service.ts`
- `apps/realtime/src/db/schema/*`

Why it’s needed:
- To authorize `ticket.join`, we need to check ticket ownership (`tickets.owner_id`)
- In Keycloak mode, we need to map `sub` → internal user UUID (via `users.external_id`)

---

### Step 3 — JWT handshake authentication

Files:
- `apps/realtime/src/realtime/realtime-auth.service.ts`
- `apps/realtime/src/realtime/realtime.gateway.ts`

How it works:
- Socket.IO middleware runs during the handshake (`server.use(...)`)
- Token sources:
  - `socket.handshake.auth.token`
  - `Authorization: Bearer <token>` header

Modes:
- **Local mode** (`AUTH_MODE=local`): verify using `JWT_SECRET`
- **Keycloak mode** (default): verify using JWKS from `OIDC_ISSUER`, then resolve `sub` to internal user ID

Result:
- `socket.data.user = { id, roles, permissions }`

---

### Step 4 — Room authorization for `ticket.join`

Files:
- `apps/realtime/src/realtime/realtime.gateway.ts`
- `apps/realtime/src/realtime/tickets.repository.ts`

Rules (matches API behavior in `apps/api/src/auth/ownership.ts`):
- `admin` and `agent` can join any ticket room
- `customer` can only join rooms for tickets they own (`ticket.owner_id === user.id`)

Room name:
- `ticket:{ticketId}`

---

### Step 5 — Broadcasting events (RabbitMQ → Socket.IO)

Files:
- `apps/realtime/src/messaging/rabbitmq-consumer.service.ts`

Bindings:
- Exchange: `opsdesk.events`
- Routing keys:
  - `message.sent`
  - `ticket.status_changed`

Event mapping (EPIC 4 names):
- Domain `message.sent` → broadcast `message:new` to `ticket:{ticketId}`
- Domain `ticket.status_changed` → broadcast `ticket:statusChanged` to `ticket:{ticketId}`

---

### Step 6 — Docker Compose wiring

File:
- `docker-compose.yml`

Added service:
- `realtime` on port `3002`

---

## How to test locally

### 1) Start the stack

```bash
docker compose up
```

### 2) Get a JWT

- Local mode: use `POST /auth/login` on the API to obtain a token
- Keycloak mode: obtain a Keycloak access token and ensure `OIDC_ISSUER` is configured

### 3) Connect to Socket.IO

Pseudo-client flow:
1. Connect to `ws://localhost:3002` with `auth.token`
2. Emit `ticket.join` with the ticket ID
3. Create a message via REST (`POST /v1/messages`) or change a ticket status via REST
4. Observe broadcasts:
   - `message:new`
   - `ticket:statusChanged`

---

## Troubleshooting

- **401 / Invalid token**:
  - Ensure `AUTH_MODE` matches how you obtained the token
  - Local: `JWT_SECRET` must match API signing secret
  - Keycloak: `OIDC_ISSUER` must be the realm issuer URL; JWKS must be reachable from the container

- **Join denied**:
  - Ensure you joined with a user that can access the ticket (role or owner match)
  - In Keycloak mode, confirm the user row exists (or allow auto-resolution via `users.external_id`)

- **No events received**:
  - Ensure API is publishing to `opsdesk.events`
  - Ensure realtime queue is bound to the correct routing keys
  - Ensure you joined the correct room name: `ticket:{id}`

