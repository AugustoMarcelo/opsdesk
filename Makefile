# ============================
# Variables
# ============================
COMPOSE=docker compose
PNPM=pnpm

# ============================
# Infra
# ============================
dev-up:
	$(COMPOSE) up -d

dev-down:
	$(COMPOSE) down

dev-logs:
	$(COMPOSE) logs -f

dev-reset:
	$(COMPOSE) down -v
	$(COMPOSE) up -d

# ============================
# API
# ============================
api-dev:
	$(PNPM) --filter api start:dev

api-build:
	$(PNPM) --filter api build

api-logs:
	$(COMPOSE) logs -f api

# ============================
# Worker
# ============================
worker-logs:
	$(COMPOSE) logs -f worker

# ============================
# Database
# ============================
db-migrate:
	$(PNPM) --filter api db:migrate

db-seed:
	$(PNPM) --filter api db:seed

db-reset:
	$(COMPOSE) exec postgres psql -U opsdesk -d opsdesk -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	$(MAKE) db-migrate
	$(MAKE) db-seed