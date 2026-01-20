FROM node:22-alpine

WORKDIR /app

RUN npm install -g pnpm

# Copy worker package file and install dependencies
COPY apps/worker/package.json ./apps/worker/
WORKDIR /app/apps/worker
RUN pnpm install

# Copy source code
COPY apps/worker/src ./src
COPY apps/worker/tsconfig.json ./
COPY packages /app/packages

CMD [ "pnpm", "ts-node", "--transpile-only", "src/consumer.ts" ]
