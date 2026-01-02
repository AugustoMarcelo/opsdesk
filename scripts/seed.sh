#!/bin/sh
set -e

echo "Checking if seed is needed..."

SEED_CHECK=$(pnpm --filter api db:seed:check)

if [ "$SEED_CHECK" = "true" ]; then
  echo "Running seeds..."
  pnpm --filter api db:seed
else
  echo "Seeds already applied"
fi
