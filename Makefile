.PHONY: dev up stop down logs db redis-cli ps build clean help

# ─────────────────────────────────────────────────────────────────────────────
# Colours
# ─────────────────────────────────────────────────────────────────────────────
BOLD  := \033[1m
RESET := \033[0m
GREEN := \033[32m
CYAN  := \033[36m

# ─────────────────────────────────────────────────────────────────────────────
# Targets
# ─────────────────────────────────────────────────────────────────────────────

## dev: Start infrastructure only (postgres, redis, mongo)
dev:
	docker compose up -d
	@echo "$(GREEN)$(BOLD)Infrastructure running$(RESET)"
	@echo "  postgres  → localhost:5432"
	@echo "  redis     → localhost:6379"
	@echo "  mongo     → localhost:27017"

## up: Start infrastructure + all application services
up:
	docker compose --profile services up -d
	@echo "$(GREEN)$(BOLD)All services running$(RESET)"

## stop: Stop all running containers (keep volumes)
stop:
	docker compose --profile services stop

## down: Stop and remove containers (keep volumes)
down:
	docker compose --profile services down

## down-v: Stop and remove containers AND volumes (destructive)
down-v:
	docker compose --profile services down -v

## logs: Tail logs for all running containers
logs:
	docker compose --profile services logs -f

## logs-svc: Tail logs for a specific service  →  make logs-svc SVC=auth
logs-svc:
	docker compose logs -f $(SVC)

## db: Open a psql shell inside the postgres container
db:
	docker compose exec postgres psql -U kostin -d kostin_dev

## redis-cli: Open a redis-cli shell inside the redis container
redis-cli:
	docker compose exec redis redis-cli

## mongo-shell: Open a mongosh shell inside the mongo container
mongo-shell:
	docker compose exec mongo mongosh -u kostin -p kostin123 --authenticationDatabase admin kostin_dev

## ps: Show status of all containers
ps:
	docker compose --profile services ps

## build: Build all service images
build:
	docker compose --profile services build

## build-svc: Build a single service image  →  make build-svc SVC=auth
build-svc:
	docker compose build $(SVC)

## clean: Remove stopped containers and dangling images
clean:
	docker compose --profile services down
	docker image prune -f

## help: Show this help message
help:
	@echo "$(BOLD)KostIn — Docker shortcuts$(RESET)"
	@echo ""
	@grep -E '^## ' Makefile | sed 's/## /  $(CYAN)/' | sed 's/:/$(RESET):/'
