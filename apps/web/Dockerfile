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
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages ./packages

# =========================
# Install dependencies (workspace-aware)
# =========================
RUN pnpm install --filter web...

# =========================
# Copy source code
# =========================
COPY apps/web ./apps/web

# =========================
# Set working dir to web
# =========================
WORKDIR /app/apps/web

# =========================
# Expose Vite dev server port
# =========================
EXPOSE 5173

# =========================
# Start Vite dev server
# =========================
CMD ["pnpm", "dev", "--host"]
