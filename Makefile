DC = docker compose -f infra/docker/docker-compose.yml

up:
	$(DC) up -d

down:
	$(DC) down

build:
	$(DC) build

restart:
	$(DC) down
	$(DC) up -d

rebuild:
	$(DC) build
	$(DC) up -d

logs:
	$(DC) logs -f

ps:
	$(DC) ps

clean:
	$(DC) down -v --rmi local

start:
	pnpm start:dev

lint:
	pnpm lint

test:
	pnpm test

test-e2e:
	pnpm test:e2e
