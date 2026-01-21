# =========================
# Base image
# =========================
FROM node:22-alpine

# =========================
# Enable pnpm
# =========================
RUN corepack enable && corepack prepare pnpm@latest --activate

# =========================
# Working directory
# =========================
WORKDIR /app

# =========================
# Copy workspace manifests
# =========================
COPY pnpm-lock.yaml package.json ./
COPY apps/realtime/package.json apps/realtime/package.json

# =========================
# Install dependencies (workspace-aware)
# =========================
RUN pnpm install --filter realtime...

# =========================
# Copy source code
# =========================
COPY apps/realtime ./apps/realtime
COPY packages ./packages

# =========================
# Set working dir to realtime
# =========================
WORKDIR /app/apps/realtime

EXPOSE 3002

CMD ["pnpm", "start:dev"]

