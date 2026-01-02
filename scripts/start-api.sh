#!/bin/sh
set -e

./scripts/migrate.sh
./scripts/seed.sh

echo "Starting API..."
pnpm --filter api start:dev
