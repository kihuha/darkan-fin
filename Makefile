SHELL := /bin/bash

# Load variables from .env if present
ifneq (,$(wildcard .env))
  include .env
  export $(shell sed -n 's/=.*//p' .env)
endif

.PHONY: dev migrate

# Start Next.js dev server
dev:
	yarn dev

# Apply application SQL migrations
migrate:
	PGPASSWORD="$(DB_PASSWORD)" psql \
		-h "$(DB_HOST)" \
		-p "$(DB_PORT)" \
		-U "$(DB_USER)" \
		-d "$(DB_NAME)" \
		--set ON_ERROR_STOP=1 \
		-f app-migrations/init.sql
