# Nabdh API — Docker Setup

## Prerequisites

- Docker (with Compose V2)
- Git

## Files needed

```
infra/docker/Dockerfile
infra/docker/docker-compose.yml
.env
.dockerignore
```

## Quick start

1. Place the 4 files above in an empty directory:

```
your-project/
  ├── infra/docker/Dockerfile
  ├── infra/docker/docker-compose.yml
  ├── .env
  └── .dockerignore
```


3. Start all services:

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

4. Verify:
capacity-management-platform-safran
```bash
curl http://localhost:3000/api/v1/health
# → {"status":"ok","timestamp":"..."}
```

## Services

| Service | Port | Purpose |
|---------|------|---------|
| **API** | 3000 | NestJS backend |
| **MongoDB** | 27017 | Database |
| **MinIO** | 9000 (API), 9001 (Console) | File storage (S3-compatible) |

## Logs

```bash
docker compose -f infra/docker/docker-compose.yml logs -f api
docker compose -f infra/docker/docker-compose.yml logs -f mongo
```

## Stop

```bash
docker compose -f infra/docker/docker-compose.yml down
```

Use `down -v` to also delete database data (volumes).

## Auth API Docs

See `AUTH_API.md` for all auth endpoints.
