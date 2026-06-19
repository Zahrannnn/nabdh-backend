# Local Development

## Prerequisites

- **Node.js** 20 LTS (via `.nvmrc`)
- **pnpm** 9 (`npm install -g pnpm@9`)
- **Docker Desktop** (for MongoDB + MinIO)
- **Git**

## Quick Start

```bash
# 1. Clone
git clone https://github.com/nabdh/nabdh-backend.git
cd nabdh-backend

# 2. Environment
cp .env.example .env

# 3. Install
pnpm install

# 4. Start infrastructure
docker compose -f infra/docker/docker-compose.yml up -d mongo minio

# 5. Start API (hot-reload)
pnpm start:dev
```

App will be available at `http://localhost:3000/api/v1`

## One-Command Start

```bash
cp .env.example .env && pnpm install && pnpm prisma migrate dev && docker compose -f infra/docker/docker-compose.yml up --build
```

## Docker-Only Mode

```bash
cp .env.example .env && pnpm install && docker compose -f infra/docker/docker-compose.yml up --build
```

## Verify

```bash
curl http://localhost:3000/api/v1/health
# {"status":"ok","timestamp":"..."}
```

## Common Tasks

```bash
# Run tests
pnpm test

# E2E tests
pnpm test:e2e

# Lint
pnpm lint

# Prisma Studio (DB GUI)
pnpm prisma:studio

# Generate Prisma client
pnpm prisma:generate

# Create migration
pnpm prisma:migrate --name migration_name
```

## Troubleshooting

**Port conflict on 3000**: Kill existing process or set `PORT=3001` in `.env`

**MongoDB connection refused**: Ensure Docker container is running and `.env` has correct `MONGODB_URI`
