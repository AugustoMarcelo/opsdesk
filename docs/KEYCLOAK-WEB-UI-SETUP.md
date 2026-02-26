# Keycloak Setup for Web UI

Configure the `opsdesk-api` client for the web app OAuth flow.

## Required: Client secret

The token exchange uses a **confidential client** (Client authentication ON). You must:

1. In Keycloak Admin: **Clients** → **opsdesk-api** → **Settings**
2. Set **Client authentication** = **ON**
3. Click **Save**
4. Go to **Credentials** tab and copy the **Client secret**
5. Add to `.env`: `KEYCLOAK_CLIENT_SECRET=<your-secret>`
6. Restart the API: `docker compose restart api`

## Common errors

- **"Invalid parameter: redirect_uri"** → Add the redirect URIs (see below)
- **"Standard flow is disabled for the client"** → Enable **Standard flow** in Client settings (Capability config)
- **"Invalid client or Invalid client credentials"** → Enable **Client authentication** and set `KEYCLOAK_CLIENT_SECRET` in `.env`

## Manual configuration (Keycloak Admin)

1. Open **http://localhost:8080** and log in as `admin` / `admin`
2. Select realm **opsdesk** (top-left dropdown)
3. Go to **Clients** → **opsdesk-api**
4. Open the **Settings** tab
5. Under **Capability config** (or **Authentication flow**), ensure:
   - **Standard flow** = **ON** (required for browser redirect login; if OFF, you get "Standard flow is disabled")
   - **Direct access grants** = ON
6. Set:
   - **Root URL**: `http://localhost:8888`
   - **Valid redirect URIs**: Add each URI on a **separate line**:
     ```
     http://localhost:8888/login
     http://localhost:8888/*
     http://localhost:5173/login
     http://localhost:5173/*
     http://127.0.0.1:8888/login
     http://127.0.0.1:8888/*
     ```
   - **Web origins**: Add each on a separate line:
     ```
     http://localhost:8888
     http://localhost:5173
     http://127.0.0.1:8888
     http://127.0.0.1:5173
     ```
7. Set **Client authentication** = **ON** (required for token exchange)
8. Click **Save**
9. Go to **Credentials** tab and copy the **Client secret** → add to `.env` as `KEYCLOAK_CLIENT_SECRET`

## If the client does not exist

Create a new client:

1. **Clients** → **Create client**
2. **Client type**: OpenID Connect
3. **Client ID**: `opsdesk-api`
4. Click **Next**
5. **Client authentication**: ON
6. **Authorization**: OFF
7. **Authentication flow**: Standard flow, Direct access grants = ON
8. Click **Save**
9. In **Settings**, add the Root URL, Valid redirect URIs, and Web origins as above
10. In **Credentials**, copy the Client secret → add to `.env` as `KEYCLOAK_CLIENT_SECRET`

## Fresh import (reset Keycloak)

To use the pre-configured realm from `keycloak/opsdesk-realm.json`:

```bash
docker compose down
docker volume rm opsdesk_keycloak_data
docker compose up -d
```

Wait for Keycloak to start (~30s), then the realm will be imported automatically.
