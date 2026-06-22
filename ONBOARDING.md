# Developer Onboarding — Nabdh Backend

> For new backend devs joining the team. Follow these steps top to bottom.

---

## Prerequisites

Install these before cloning:

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | 20 LTS | [nodejs.org](https://nodejs.org) (use `nvm install 20` if you have nvm) |
| **pnpm** | 9+ | `npm install -g pnpm` |
| **Docker Desktop** | latest | [docker.com](https://docker.com) (includes Compose V2) |
| **Git** | 2.40+ | [git-scm.com](https://git-scm.com) |

Verify:
```bash
node -v        # v20.x.x
pnpm -v        # 9.x.x
docker -v      # Docker version 24+
docker compose version   # Compose V2
git -v         # 2.40+
```

---

## Step 1: Clone the repo

```bash
git clone https://github.com/Zahrannnn/nabdh-backend.git
cd nabdh-backend
git checkout develop
```

All work happens on `develop`. Do not work on `main`.

---

## Step 2: Create your feature branch

```bash
git checkout -b feat/sprint-1-<your-stream>
```

Examples:
- `feat/sprint-1-users` (BE-1)
- `feat/sprint-1-upload` (BE-2)
- `feat/sprint-1-location` (BE-2)

---

## Step 3: Install dependencies

```bash
pnpm install
```

This also runs `husky` (via `prepare` script) to set up pre-commit hooks:
- **pre-commit**: lint-staged (eslint + prettier on staged `.ts` files)
- **commit-msg**: commitlint (enforces conventional commits)

---

## Step 4: Set up environment file

```bash
cp .env.example .env
```

Then **generate a real JWT secret** for local dev:
```bash
# macOS / Linux
openssl rand -hex 32

# Windows (PowerShell)
-join ((48..57)+(97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

Open `.env` and replace `JWT_SECRET=change-me-in-production` with the generated value.

The other defaults work for local dev. Do not change `MONGODB_URI` or `S3_*` values, they match the Docker Compose services.

---

## Step 5: Start infrastructure (MongoDB + MinIO)

```bash
make up
```

This runs `docker compose -f infra/docker/docker-compose.yml up -d`.

Verify all 3 services are running:
```bash
docker compose -f infra/docker/docker-compose.yml ps
```

You should see:
- `mongo` — healthy, port 27017
- `minio` — healthy, port 9000 (API) + 9001 (console)
- `api` — may not be running yet (you run it locally with `pnpm start:dev`)

MinIO console: open `http://localhost:9001`, login with `nabdh_minio` / `nabdh_minio_secret`.

---

## Step 6: Run the API locally

```bash
pnpm start:dev
```

You should see NestJS boot with:
```
[Nest] LOG [NestApplication] Nest application successfully started
```

Verify health:
```bash
curl http://localhost:3000/api/v1/health
# → {"status":"ok","timestamp":"..."}

curl http://localhost:3000/api/v1/health/ready
# → {"status":"ok","database":"connected","timestamp":"..."}
```

Swagger docs at `http://localhost:3000/api`.

---

## Step 7: Run tests

```bash
# Unit tests
pnpm test

# E2E tests (uses mongodb-memory-server, no Docker needed)
pnpm test:e2e

# Coverage report
pnpm test:cov
```

All 55 auth tests should pass (36 unit + 19 e2e). If any fail, check your `.env` and Docker services.

---

## Step 8: Read your sprint brief

Find your assigned stream in `sprint-1/`:

| File | Assigned to |
|------|-------------|
| `sprint-1/stream-A-users.md` | BE-1 |
| `sprint-1/stream-B-upload.md` | BE-2 (days 1-3) |
| `sprint-1/stream-C-location.md` | BE-2 (days 4-8) |

Read the entire file before writing any code. It contains:
- Current state of the module
- Every endpoint to build
- Every DTO to create
- Service method specs with validation rules
- Testing requirements
- Acceptance criteria checklist

---

## Step 9: Read the context docs

Before coding, read these:

| File | What | Priority |
|------|------|----------|
| `docs/Nabdh_Platform_BRD_PRD_System_Design.md` | Full requirements (BRD v1.4) | High |
| `BACKEND_ROADMAP.md` | 9-sprint plan, module details, risks | High |
| `AUTH_API.md` | Auth API spec (reference for patterns) | Medium |
| `diagrams/sequence/*.puml` | Sequence diagrams for your flow | Medium |
| `diagrams/usecase/*.puml` | Use case diagrams per actor | Medium |
| `src/common/enums/index.ts` | All enums you will use | High |
| `src/modules/auth/auth.controller.ts` | Reference controller pattern | High |
| `src/modules/auth/auth.service.ts` | Reference service pattern | High |

---

## Commit conventions

This repo enforces **conventional commits** via commitlint. Format:

```
type(scope): subject

optional body
```

| Type | Use for |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or correcting tests |
| `chore` | Build, tooling, deps |

Rules (enforced by hook):
- Subject ≤ 72 chars
- Body lines ≤ 100 chars
- Subject lowercase, no period at end
- Body uses `-` for bullet points

Examples:
```bash
git commit -m "feat(users): add patient profile CRUD endpoints"
git commit -m "fix(upload): handle missing file in multipart request"
git commit -m "docs: add sprint-1 stream briefs"
```

Bad (will be rejected):
```bash
git commit -m "Added stuff"                    # no type
git commit -m "feat: This is a very long subject line exceeding the 72 character limit"  # too long
git commit -m "FEAT: something"                # uppercase
```

---

## Pre-commit hooks (automatic)

When you `git commit`, two hooks run:

1. **lint-staged** — runs `eslint --fix` + `prettier --write` on staged `.ts` files. If lint errors cannot be auto-fixed, the commit fails. Fix the errors manually and commit again.

2. **commitlint** — validates the commit message format. If it fails, rewrite the message and commit again.

These are already configured. You do not need to install anything extra. If hooks are not running, run `pnpm install` again (this triggers `husky` setup via the `prepare` script).

---

## Branch workflow

```
develop (shared integration branch)
  ├── feat/sprint-1-users      (BE-1)
  ├── feat/sprint-1-upload     (BE-2)
  └── feat/sprint-1-location   (BE-2)
```

1. Work on your feature branch.
2. Rebase on `develop` daily to stay in sync:
   ```bash
   git fetch origin
   git rebase origin/develop
   ```
3. Push your branch:
   ```bash
   git push origin feat/sprint-1-<your-stream>
   ```
4. Open a PR to `develop` when your stream is complete and all acceptance criteria pass.
5. Do not merge your own PR. Request review from the backend lead.

---

## Common commands

```bash
# Docker
make up          # start mongo + minio
make down        # stop all services
make logs        # tail all service logs
make ps          # list running services
make clean       # stop + remove volumes + images (nuclear)

# Development
pnpm start:dev        # hot-reload dev server
pnpm start:debug      # with debug port 9229
pnpm build            # compile to dist/
pnpm lint             # eslint fix
pnpm format           # prettier write

# Testing
pnpm test             # unit tests (jest)
pnpm test:watch       # unit tests in watch mode
pnpm test:cov         # unit tests + coverage report
pnpm test:e2e         # e2e tests (mongodb-memory-server)
```

---

## Project structure

```
nabdh-backend/
  src/
    common/           # guards, decorators, filters, middleware, enums
    config/           # Joi env validation, config module
    database/         # Mongoose connection module
    events/           # outbox pattern (cron processor)
    health/           # /health endpoints
    modules/
      auth/           # COMPLETE — OTP, JWT, 2FA, Twilio
      users/          # Sprint 1 — BE-1
      booking/        # Sprint 2
      payment/        # Sprint 5
      location/       # Sprint 1 — BE-2
      chat/           # Sprint 4
      notifications/  # Sprint 3
      admin/          # Sprint 6
      analytics/      # Sprint 7
  test/               # e2e tests
  infra/docker/       # Dockerfile + docker-compose.yml
  diagrams/           # PlantUML use case + sequence diagrams
  docs/               # BRD/PRD/System Design
  sprint-1/           # stream briefs for Sprint 1
```

---

## Troubleshooting

### `pnpm start:dev` fails with MONGODB connection error
- Check Docker is running: `docker ps`
- Check mongo is healthy: `make ps`
- Check `.env` has `MONGODB_URI=mongodb://nabdh:nabdh_dev@localhost:27017/nabdh?authSource=admin`

### MinIO connection refused
- `make up` to start it
- Check `http://localhost:9001` loads in browser
- If port conflict, stop other services using port 9000

### Tests fail with timeout
- E2E tests use `mongodb-memory-server` which downloads MongoDB binary on first run. First `pnpm test:e2e` may be slow. Subsequent runs are fast.
- If it hangs, clear jest cache: `pnpm jest --clearCache`

### Husky hooks not running
- Run `pnpm install` again (triggers `prepare` script)
- Verify `.husky/` directory exists
- On Windows, ensure git core.hooksPath is set: `git config core.hooksPath .husky`

### Commit rejected by commitlint
- Check subject ≤ 72 chars
- Check body lines ≤ 100 chars
- Check format: `type(scope): subject`
- See commit conventions section above

### Port 3000 already in use
- Find and kill the process:
  ```bash
  # macOS/Linux
  lsof -ti:3000 | xargs kill -9
  # Windows
  netstat -ano | findstr :3000
  taskkill /PID <pid> /F
  ```
- Or change `PORT` in `.env`

---

## Daily workflow

1. `git fetch origin && git rebase origin/develop` (sync with latest)
2. `make up` (start infra if not running)
3. `pnpm start:dev` (start API)
4. Write code + tests
5. `pnpm test && pnpm test:e2e` (verify locally)
6. `git add -A && git commit -m "feat(...): ..."` (hooks run automatically)
7. `git push origin feat/sprint-1-<your-stream>`
8. Standup at 10:00

---

## Questions?

- **Channel**: team Slack/Discord
- **Sprint briefs**: `sprint-1/` folder
- **Roadmap**: `BACKEND_ROADMAP.md` or open `BACKEND_ROADMAP.html` in browser
- **BRD**: `docs/Nabdh_Platform_BRD_PRD_System_Design.md`

Do not block silently. Ask early.
