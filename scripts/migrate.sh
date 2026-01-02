#!/bin/sh
set -e

echo "Running database migrations..."
pnpm --filter api db:migrate
