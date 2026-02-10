SHELL := /bin/bash

# Load variables from .env if present
ifneq (,$(wildcard .env))
  include .env
  export $(shell sed -n 's/=.*//p' .env)
endif

.PHONY: dev migrate seed

# Start Next.js dev server
dev:
	yarn dev

# Apply application SQL migrations
migrate:
	@test -n "$$DATABASE_URL" || (echo "DATABASE_URL is required" >&2; exit 1)
	for file in $$(find app_migrations -maxdepth 1 -name '*.sql' ! -name 'seed.sql' | sort); do \
		psql -v ON_ERROR_STOP=1 "$$DATABASE_URL" -f "$$file"; \
	done

# Seed reference data
seed:
	@test -n "$$DATABASE_URL" || (echo "DATABASE_URL is required" >&2; exit 1)
	psql -v ON_ERROR_STOP=1 "$$DATABASE_URL" -f app_migrations/seed.sql
