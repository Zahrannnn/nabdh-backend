# Backend AI Agent Prompt — Nabdh Platform Bootstrap

> Copy everything below the line and paste it into your backend AI agent.

---

## TASK

You are the **Backend Lead AI Agent** for **Nabdh** — a real-time healthcare marketplace (Uber-like) connecting patients with licensed nursing professionals for home nursing services in **Egypt only**.

Your job is to **bootstrap the entire backend repository from scratch**:

1. Create a production-ready **Modular Monolith** (single NestJS app)
2. Set up **Docker + docker-compose** for local development
3. Initialize a **GitHub repository** with a collaboration-ready **README**
4. Add baseline **CI/CD** (GitHub Actions), linting, and developer tooling

Do **not** implement full business logic yet. Focus on scaffolding, conventions, infra, and a runnable local stack that the team can build on immediately.

---

## CONTEXT

| Item | Value |
|------|-------|
| Product | Nabdh Platform v1.4 |
| Architecture | **Modular Monolith** — one deployable NestJS app, domain modules inside |
| Market | Egypt only (EGP, Paymob, Fawry, Vodafone Cash, InstaPay) |
| Mobile clients | Flutter (Patient + Nurse apps — separate repos later) |
| Admin panel | React/Next.js (separate repo — consumes same API) |
| Team | 1 Backend, 1 Flutter, 1 UI/UX, 1 AI, 1 Frontend |
| Branch strategy | `main` (prod) ← `develop` (integration) ← `feature/*` |

### Domain Modules (inside one app)

| Module | Responsibilities |
|--------|------------------|
| **auth** | OTP send/verify, JWT issue/refresh, session management, guards |
| **users** | Patient/Nurse CRUD, addresses, documents, verification, license expiry cron |
| **booking** | Requests, offers, booking lifecycle, SOS, scheduled bookings, ratings, disputes |
| **payment** | Paymob, Fawry, webhooks, wallet, ledger, commission, withdrawals |
| **location** | Nurse GPS, MongoDB `$geoNear` proximity, ETA (OSRM stub), location history |
| **chat** | Socket.io gateway, messages, delivery tracking |
| **notifications** | FCM push, SMS fallback, in-app notifications, templates |
| **admin** | Dashboard APIs, disputes, audit logs, commission config, SOS monitor |
| **analytics** | Metrics aggregation, reports (stub for MVP) |

**Single HTTP port:** `3000` — all REST + WebSocket on one process.

### Shared Infrastructure (local Docker)

| Component | Image / Version |
|-----------|-----------------|
| **api** | NestJS app (built from Dockerfile) — port `3000` |
| **MongoDB** | `mongo:7` — single database `nabdh` with 2dsphere indexes |
| **MinIO** | `minio/minio` — S3-compatible storage for nurse documents |
| Mailhog | `mailhog/mailhog` — OTP email testing (optional) |

> **No Redis. No microservices. No PostgreSQL.** One app + MongoDB + MinIO.

### Tech Stack (mandatory)

- **Runtime:** Node.js 20 LTS
- **Language:** TypeScript 5.x (strict mode)
- **Framework:** NestJS 10+ — **single application**, domain modules via `@Module()`
- **ODM:** Mongoose via `@nestjs/mongoose` — schemas per module in `schemas/`
- **Validation:** class-validator + class-transformer
- **API Docs:** @nestjs/swagger (OpenAPI 3) at `/api/docs`
- **Testing:** Jest + Supertest (skeleton tests only)
- **Linting:** ESLint + Prettier + Husky + lint-staged + commitlint (conventional commits)
- **Logging:** Winston (structured JSON)
- **Real-time:** `@nestjs/websockets` + Socket.io (in-process rooms)
- **Events:** `@nestjs/event-emitter` (in-process) + MongoDB `outbox_events` collection (async) — **no Redis**
- **Scheduled jobs:** `@nestjs/schedule` (cron for outbox, license expiry, scheduled bookings)

---

## REQUIRED REPO STRUCTURE

```
nabdh-backend/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   └── docker-build.yml
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── CODEOWNERS
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/                    # guards, filters, interceptors, pipes, decorators
│   │   ├── guards/
│   │   ├── filters/
│   │   └── middleware/
│   ├── config/                    # env validation (Joi/Zod)
│   ├── health/                    # GET /health, GET /health/ready
│   ├── database/                  # MongooseModule root config
│   ├── events/                    # EventEmitter types, OutboxProcessor, event payloads
│   └── modules/
│       ├── auth/
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── schemas/
│       │   └── dto/
│       ├── users/
│       ├── booking/
│       ├── payment/
│       ├── location/
│       ├── chat/
│       ├── notifications/
│       ├── admin/
│       └── analytics/
├── test/
│   └── app.e2e-spec.ts
├── infra/
│   └── docker/
│       ├── docker-compose.yml       # api + mongo + minio
│       ├── Dockerfile
│       └── init-scripts/
│           └── 01-mongo-init.js
├── docs/
│   ├── architecture.md
│   ├── api-conventions.md
│   ├── local-development.md
│   └── adr/
│       └── 001-modular-monolith.md
│       └── 003-mongodb.md
├── .env.example
├── .gitignore
├── .nvmrc
├── package.json
├── nest-cli.json
├── tsconfig.json
├── commitlint.config.js
├── README.md
└── LICENSE
```

### Module Boundary Rules (enforce from day 1)

1. Each module has: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`
2. Cross-module access **only** via exported providers (e.g. `UsersService` exported from `UsersModule`, imported by `BookingModule`)
3. **Never** import another module's internal files directly
4. Controllers expose HTTP only — business logic stays in services
5. Module Mongoose schemas live in `src/modules/<name>/schemas/`

---

## DOCKER REQUIREMENTS

### docker-compose.yml must include:

1. **api** — NestJS app, port `3000`, hot-reload in dev via volume mount
2. **mongo** — MongoDB 7, database `nabdh`, volume for persistence, create 2dsphere indexes on startup seed
3. **minio** — console `9001`, API `9000`, auto-create bucket `nabdh-documents`
4. **Health checks** on api (`/health/ready`) and mongo
5. **Named network** `nabdh-network`
6. **depends_on** api → mongo (healthy), minio (started)

### Dockerfile (single):

- Multi-stage build (builder + production)
- Non-root user in production stage
- Expose port `3000`
- `HEALTHCHECK` → `GET /health`

### One-command local start:

```bash
cp .env.example .env
pnpm install
docker compose -f infra/docker/docker-compose.yml up --build
```

App must respond on port `3000` within 60 seconds of a fresh clone.

---

## API CONVENTIONS (enforce in scaffolding)

### Base URL

```
http://localhost:3000/api/v1
```

All routes handled by module controllers in the single app:

| Route | Module |
|-------|--------|
| `POST /api/v1/auth/otp/send` | auth |
| `GET  /api/v1/patient/profile` | users |
| `POST /api/v1/requests` | booking |
| `GET  /api/v1/nurse/wallet` | payment |
| `WS   /api/v1/realtime` | chat |

### Standard error response

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": ["phone must be a valid Egyptian mobile number"],
  "timestamp": "2026-06-17T12:00:00.000Z",
  "path": "/api/v1/auth/otp/send",
  "requestId": "uuid"
}
```

### Auth

- Patients & Nurses: OTP-only → JWT (access 15min + refresh 7d)
- Admin: email + password + 2FA (TOTP stub)
- JWT payload: `{ sub, type: PATIENT|NURSE|ADMIN, role, nurse_status?, iat, exp }`
- Global `JwtAuthGuard` + `RolesGuard` in `common/guards/`

### Key enums (put in `src/common/enums/` or `src/events/types/`)

```typescript
enum UserType { PATIENT = 'PATIENT', NURSE = 'NURSE', ADMIN = 'ADMIN' }
enum BookingStatus { PENDING_OFFERS, NURSE_CONFIRMED, NURSE_EN_ROUTE, NURSE_ARRIVED, VISIT_IN_PROGRESS, VISIT_COMPLETED, CANCELLED, DISPUTED }
enum RequestType { STANDARD = 'STANDARD', SOS = 'SOS', SCHEDULED = 'SCHEDULED' }
enum Gender { MALE = 'MALE', FEMALE = 'FEMALE' }
enum PaymentMethod { CASH = 'CASH', CARD = 'CARD', FAWRY = 'FAWRY' }
```

---

## APP MUST SHIP WITH (scaffold only)

### Global (`app.module.ts` imports all domain modules)

- Global prefix `/api/v1`
- CORS enabled for `localhost:*` in dev
- Rate limiting (100 req/min per IP — `@nestjs/throttler`)
- Request ID middleware (`X-Request-Id`)
- Swagger at `/api/docs`
- `ScheduleModule.forRoot()` for cron jobs
- `EventEmitterModule.forRoot()` for in-process events

### Per module (scaffold each)

- `*.module.ts`, `*.controller.ts`, `*.service.ts`
- At least one stub endpoint with Swagger decorators
- Unit test stub for service

### auth module extras

- `POST /auth/otp/send` — returns `{ success: true }` (stub)
- `POST /auth/otp/verify` — returns mock JWT pair
- `POST /auth/refresh` — returns new access token
- Mongoose schemas: `OtpSession`, `RefreshToken` (TTL on `expiresAt`)

### booking module extras

- `POST /requests` — creates stub request, emits `request.created` via EventEmitter
- Mongoose schemas: `ServiceRequest`, `Offer`, `Booking` (GeoJSON `location` on requests)

### health module

- `GET /health` → `{ status: 'ok' }`
- `GET /health/ready` → checks MongoDB connection

---

## MINIMAL SCHEMAS (Mongoose)

Schemas in `src/modules/<name>/schemas/`. Use `camelCase`, `ObjectId` refs, GeoJSON `Point` for locations.

**users:** User, Patient, Nurse (`location`), Address (`location`), NurseDocument  
**booking:** ServiceRequest (`location`), Offer, Booking, Rating  
**payment:** Payment, Wallet, WalletTransaction  
**auth:** OtpSession (TTL), RefreshToken  
**events:** OutboxEvent  
**notifications:** Notification  
**chat:** ChatMessage  
**location:** LocationHistory (`location`)  
**admin:** Service, AuditLog

---

## DOMAIN EVENTS (`src/events/`)

**No Redis. No inter-service HTTP.**

1. **In-process (sync):** `@nestjs/event-emitter` — e.g. `booking` emits `offer.submitted` → `notifications` listener sends push stub
2. **Outbox (async):** write to `outbox_events` collection → `OutboxProcessor` cron polls and dispatches

| Event | Producer Module | Consumer Module(s) |
|-------|-----------------|---------------------|
| `request.created` | booking | location, notifications |
| `request.sos.created` | booking | location, notifications, admin |
| `offer.submitted` | booking | notifications |
| `offer.selected` | booking | notifications, payment |
| `booking.status.changed` | booking | notifications, location, analytics |
| `booking.completed` | booking | payment, analytics |
| `payment.completed` | payment | notifications, analytics |
| `nurse.verified` | users | notifications |

Include typed event classes + `OutboxProcessor` with idempotency key support.

---

## GITHUB REPO SETUP

1. Create repo: **`nabdh-backend`** (private recommended)
2. Description: `Nabdh Platform — Modular monolith backend (NestJS) for Egypt home nursing marketplace`
3. Topics: `nestjs`, `modular-monolith`, `healthcare`, `marketplace`, `egypt`, `typescript`, `docker`
4. Default branch: `develop`
5. Branch protection: `main` requires PR + CI; `develop` requires CI
6. Initial commit on `develop` with full scaffold
7. Tag `v0.1.0-bootstrap` on `main`

---

## README.md MUST INCLUDE

1. Project banner + one-line description
2. **Architecture diagram** (Mermaid) — single app + modules + infra
3. Prerequisites — Node 20, pnpm 9, Docker Desktop
4. Quick Start — clone → install → migrate → docker up → verify health
5. **Modules table** — module name, responsibilities, key routes
6. Environment variables table
7. Development workflow — branches, commits, PRs
8. Running tests — `pnpm test`, `pnpm test:e2e`
9. API docs — `http://localhost:3000/api/docs`
10. Team ownership placeholders
11. Related repos — `nabdh-mobile`, `nabdh-admin` (TBD)
12. ADR link — why modular monolith (see `docs/adr/001-modular-monolith.md`)

Also create:
- `CONTRIBUTING.md`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `docs/adr/001-modular-monolith.md` — rationale: 1 backend dev, faster MVP, extract modules later if needed

---

## CI/CD (GitHub Actions)

### `ci.yml` — on PR to `develop` or `main`:

```yaml
jobs:
  lint:    # eslint + prettier
  test:    # jest unit + e2e
  build:   # nest build
  docker:  # docker build api image (no push)
```

### `docker-build.yml` — on push to `develop`:

- Build single `nabdh-api` Docker image
- Tag with `sha` and `develop`
- Push to `ghcr.io/<org>/nabdh-api`

---

## ENVIRONMENT VARIABLES (.env.example)

```env
# ── General ──
NODE_ENV=development
LOG_LEVEL=debug
PORT=3000

# ── MongoDB ──
MONGODB_URI=mongodb://nabdh:nabdh_dev@mongo:27017/nabdh?authSource=admin
MONGO_INITDB_ROOT_USERNAME=nabdh
MONGO_INITDB_ROOT_PASSWORD=nabdh_dev
MONGO_DATABASE=nabdh

# ── JWT ──
JWT_SECRET=change-me-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# ── MinIO (S3) ──
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=nabdh_minio
S3_SECRET_KEY=nabdh_minio_secret
S3_BUCKET=nabdh-documents
S3_REGION=us-east-1

# ── External (stubs for MVP) ──
PAYMOB_API_KEY=stub
FAWRY_MERCHANT_CODE=stub
FCM_SERVER_KEY=stub
SMS_PROVIDER=stub
OSRM_BASE_URL=http://router.project-osrm.org

# ── Business Rules ──
COMMISSION_RATE_DEFAULT=0.18
SOS_PRICE_MULTIPLIER=1.5
NURSE_MIN_PREPAID_BALANCE=100
NURSE_VERIFICATION_SLA_HOURS=72
NURSE_SEARCH_RADIUS_KM=15
```

---

## ACCEPTANCE CRITERIA

- [ ] `git clone` + `pnpm install` + `docker compose up` → api healthy on port 3000
- [ ] `GET http://localhost:3000/api/v1/health` → 200
- [ ] `GET http://localhost:3000/api/docs` → Swagger UI loads
- [ ] `POST http://localhost:3000/api/v1/auth/otp/send` → 200 (stub)
- [ ] `POST http://localhost:3000/api/v1/requests` → 201 (stub, emits event)
- [ ] All 9 domain modules scaffolded with module/controller/service
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes (health e2e minimum)
- [ ] README complete — onboard in < 15 minutes
- [ ] GitHub repo with `develop` as default branch
- [ ] No secrets in git — only `.env.example`
- [ ] Single Docker image builds successfully
- [ ] MongoDB 2dsphere indexes created on `nurses.location`, `addresses.location`, `service_requests.location`
- [ ] ADR `001-modular-monolith.md` written

---

## OUT OF SCOPE (do NOT implement now)

- Microservices / multiple deployables
- Redis or message brokers
- Real Paymob/Fawry/FCM/SMS integrations
- Production AWS/Terraform
- Full business logic
- Admin React frontend
- Flutter mobile apps

---

## DELIVERABLES

1. GitHub repo URL
2. File tree output
3. curl output proving health + stub endpoints work
4. ADR for modular monolith + MongoDB/Mongoose choice (`docs/adr/003-mongodb.md`)
5. Sprint 1 notes: Auth module + Users module + global guards

---

## REFERENCE DOCUMENTS

- `BACKEND_AGENT_CONTEXT.md` (v1.4 — MongoDB)
- `Nabdh_Platform_Complete_Documentation_v1.2.pdf`
- `usecase-overall.puml` / `seq-booking-overall.puml`

---

**Start now. Create the repo, scaffold the modular monolith, and report back with the deliverables checklist.**
