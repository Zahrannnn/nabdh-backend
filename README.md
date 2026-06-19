# Nabdh Backend

> Real-time home nursing marketplace for Egypt — connecting patients with licensed nursing professionals.

![NestJS](https://img.shields.io/badge/NestJS-10.x-E0234E)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)
![Node](https://img.shields.io/badge/Node-20-339933)
![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## Architecture

```mermaid
graph TB
    P[Flutter Patient App] --> API[Nabdh API :3000]
    N[Flutter Nurse App] --> API
    A[React Admin Panel] --> API
    API --> DB[(MongoDB 7 + 2dsphere)]
    API --> MN[(MinIO S3)]
    
    subgraph "Modular Monolith"
        Auth[Auth]
        Users[Users]
        Booking[Booking]
        Payment[Payment]
        Location[Location]
        Chat[Chat WS]
        Notif[Notifications]
        Admin[Admin]
        Analytics[Analytics]
    end
    
    style API fill:#4a90d9,color:#fff
```

**Architecture Decision:** [Modular Monolith](./docs/adr/001-modular-monolith.md) — one deployable NestJS app, domain modules inside. No microservices, no Redis, no PostgreSQL.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20 LTS |
| pnpm | 9 |
| Docker Desktop | Latest |

---

## Quick Start (5 minutes)

```bash
# 1. Clone
git clone https://github.com/nabdh/nabdh-backend.git
cd nabdh-backend

# 2. Environment
cp .env.example .env

# 3. Install dependencies
pnpm install

# 4. Start infrastructure (MongoDB 7 + MinIO)
docker compose -f infra/docker/docker-compose.yml up -d mongo minio

# 5. Start development server
pnpm start:dev
```

**Verify:**
```bash
curl http://localhost:3000/api/v1/health
# => {"status":"ok","timestamp":"..."}
```

**Swagger docs:** http://localhost:3000/api/docs

---

## Modules

| Module | Responsibilities | Key Routes |
|--------|-----------------|------------|
| **Auth** | OTP send/verify, JWT, refresh tokens | `POST /auth/otp/send`, `/auth/otp/verify`, `/auth/refresh` |
| **Users** | Patient/Nurse profiles, addresses, documents | `GET/POST /patient/profile`, `GET /nurse/profile` |
| **Booking** | Service requests, offers, lifecycle, SOS | `POST /requests`, `GET /requests/:id`, `GET /bookings/:id` |
| **Payment** | Wallet, Paymob/Fawry webhooks, ledger | `GET /nurse/wallet`, `POST /webhooks/paymob` |
| **Location** | GPS tracking, proximity search, ETA | `POST /nurse/location`, `GET /nurses/nearby` |
| **Chat** | Socket.io messaging, delivery tracking | `ws://.../realtime` |
| **Notifications** | FCM push, SMS fallback, in-app | `GET /notifications` |
| **Admin** | Dashboard, disputes, audit logs, SOS monitor | `GET /admin/dashboard`, `GET /admin/audit-logs` |
| **Analytics** | Revenue, booking metrics (stub) | `GET /analytics/revenue`, `/analytics/bookings` |

---

## Environment Variables

See [.env.example](.env.example) for all variables.

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | `3000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://nabdh:nabdh_dev@localhost:27017/nabdh` |
| `JWT_SECRET` | JWT signing secret | `change-me-in-production` |
| `S3_ENDPOINT` | MinIO/S3 endpoint | `http://minio:9000` |

---

## Development

```bash
pnpm start:dev    # Hot-reload dev server
pnpm lint         # ESLint + Prettier
pnpm test         # Unit tests
pnpm test:e2e     # E2E tests
```

### Branch Workflow

```
main ── develop ── feature/*
```

- PRs target `develop`
- `main` requires CI + review
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/)

---

## Docker

```bash
# Full stack
docker compose -f infra/docker/docker-compose.yml up --build

# Single service rebuild
docker compose -f infra/docker/docker-compose.yml up -d --build api
```

---

## CI/CD

| Workflow | Trigger | Jobs |
|----------|---------|------|
| `ci.yml` | PR to `develop`/`main` | lint, test, build, docker build |
| `docker-build.yml` | Push to `develop` | Build & push image to `ghcr.io` |

---

## Related Repos

| Repo | Description |
|------|-------------|
| [nabdh-mobile](https://github.com/nabdh/nabdh-mobile) | Flutter patient & nurse apps |
| [nabdh-admin](https://github.com/nabdh/nabdh-admin) | React/Next.js admin panel |

---

## Team

| Role | Name |
|------|------|
| Backend Lead | `@nabdh/backend-lead` |
| Flutter Developer | `@nabdh/flutter-dev` |
| UI/UX Designer | `@nabdh/designer` |
| AI Engineer | `@nabdh/ai-engineer` |
| Frontend Developer | `@nabdh/frontend-dev` |

---

## License

MIT — see [LICENSE](LICENSE)
