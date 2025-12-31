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
COPY apps/api/package.json apps/api/package.json

# =========================
# Install dependencies (workspace-aware)
# =========================
RUN pnpm install --filter api...

# =========================
# Copy source code
# =========================
COPY apps/api ./apps/api
COPY packages ./packages

# =========================
# Set working dir to API
# =========================
WORKDIR /app/apps/api

# =========================
# Expose API port
# =========================
EXPOSE 3000

# =========================
# Start API
# =========================
CMD ["pnpm", "start:dev"]
