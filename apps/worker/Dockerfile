FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY pnpm-lock.yaml ./

RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile || pnpm install

COPY apps/worker ./apps/worker
COPY packages ./packages

WORKDIR /app/apps/worker

CMD [ "pnpm", "ts-node", "src/consumer.ts" ]