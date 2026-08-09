# Session Report — Email-OTP Migration Stabilisation (2026-08-09)

Handoff notes for the next backend engineer. Covers stabilising the NestJS backend after the SMS→Email OTP migration (commit `a53dd18`) through getting the deployed Docker image running with the new code.

## Objective

Complete and stabilize the SMS→Email OTP migration:
- Make JWT identity claims consistent with email-based auth.
- Make `POST /patient/profile` and `POST /nurse/profile` completable after signup.
- Get the dev app running and manually testable via Swagger.
- Ship a working `:develop` Docker image through the existing CI pipeline.

---

## 1. Carried-over work (auth migration fixes)

These were finalised at the start of the session and verified before running the app.

| Area | Problem | Fix |
|---|---|---|
| JWT claims | Tokens still signed `phone` (now optional) after the email migration | `phone`→`email` in `token.service.ts`, `jwt.strategy.ts`, `auth.service.ts` (verifyOtp + refresh), `admin-auth.service.ts` |
| Signup contract | `verifyOtp` never created profile stubs; e2e + sprint-1 design required it | Auto-create Patient/Nurse stubs on new user; nurses get `licenseNumber: PENDING-<id>`, `verificationStatus`/`nurseStatus: INCOMPLETE` |
| Schema | `nurse.licenseExpiryDate` was required, blocking stub creation | Made optional |
| Users module | Profile endpoints used create-or-409, which always conflicted with the stubs | Converted `createPatientProfile`/`createNurseProfile` to `findOneAndUpdate` upsert; `findByPhone`→`findByEmail` |
| E2E | `jest.mock('otplib'/'qrcode')` removed by `a53dd18`; AuthModule still imports otplib (ESM dep breaks ts-jest) → suite could not load | Restored mocks + `UploadService` override (no minio needed) |
| Specs | `admin-auth.service.spec.ts` mocked `bcrypt` (code imports `bcryptjs`); stale phone fixtures | Mock `bcryptjs`; removed phone fields |
| Docs | `AUTH_API.md` still documented the phone flow | Migrated phone→email |

Verified before this session: 44 unit tests pass, 10 auth e2e pass, `tsc --noEmit` clean.

---

## 2. Running the dev app

Infra and boot, and the issues found while getting the app actually running.

### 2.1 Boot crash: OTP email template missing (ENOENT)
`EmailProvider` reads `path.join(__dirname, '../templates/otp-email.html')`. The path only resolves if the HTML asset is copied next to the compiled JS. The original `nest-cli.json` assets `outDir` did not match the compiled layout, so the dev server died on startup with `ENOENT`. The unit/e2e suites never caught it because `EmailProvider` is always mocked/overridden there.

Fixed `nest-cli.json` asset `outDir` so the template lands next to the provider JS. (See §4 for the final value — this was revised twice; the final fix uses a `tsconfig.build.json` plus `outDir: ./dist`, see below.)

### 2.2 `S3_ENDPOINT` env gotcha (no code change)
`.env` has `S3_ENDPOINT=http://minio:9000` (Docker-internal hostname). Running the app on the host crashes `UploadService.onModuleInit` with `ENOTFOUND minio`. On the host we launched with the env override `S3_ENDPOINT=http://localhost:9000` — `.env` file untouched. Tests hit the same issue; the auth e2e sidesteps it by overriding `UploadService`.

### 2.3 Patient profile creation always returned 400
User tested `POST /patient/profile` via Swagger and got:
```
dateOfBirth must be a valid ISO 8601 date string
```
even with a valid ISO input like `2026-08-09T15:27:22.509Z`.

Root cause: a **real pre-existing bug**, not the migration. `create-patient.dto.ts` typed `dateOfBirth?: Date` while the global `ValidationPipe` runs with `enableImplicitConversion: true`. The ISO string was converted to a `Date` object before validation, and `@IsDateString()` fails on Date objects (it validates `isISO8601` strings only). Nurse/booking DTOs already typed these fields as `string`; the patient DTO was inconsistent.

Fix: `dateOfBirth?: Date` → `dateOfBirth?: string`. Mongoose casts to `Date` on save. Verified `POST /patient/profile` → 201. Added a Swagger example (`2002-04-26T00:00:00.000Z`) so the next person has a working sample. Covers `UpdatePatientDto` too (extends `CreatePatientDto`).

### 2.4 "Old app" while testing — stale Docker container hijacked port 3000
The user's manual tests were hitting a stale `nabdh-api` Docker container (image `zahranna/nabdh-backend:dev`, 24h old, `restart: unless-stopped`) that owned `0.0.0.0:3000`. That explained:
- Token payload missing the `email` claim (old image signed `phone: user.phone` = `undefined` → claim dropped → `{sub, type}` only).
- `400` on profile creation (old code).

Stopped the container (`docker stop nabdh-api`); the local dev server then owned :3000 and behaved correctly. Same `JWT_SECRET` in both, so tokens issued by the old image still validated locally.

---

## 3. Shipping a working `:develop` Docker image

After merging the auth work (PR #4), the user pulled and ran the new image but it crashed and the app looked old. Two distinct problems.

### 3.1 Wrong image tag
`docker-compose.yml` referenced `zahranna/nabdh-backend:dev`, but the build workflow (`.github/workflows/docker-build.yml` lines 34–36) only pushes `:develop` and `sha-<git>`. `:dev` on Docker Hub was an old Aug-8 build. `pull_policy: always` cannot help when the tag itself is stale.

Fix: `docker-compose.yml` → `zahranna/nabdh-backend:develop`.

### 3.2 Boot crash on the new image — template path again
The freshly built `:develop` image (post PR #4) crashed on boot:
```
ENOENT: no such file or directory, open '/app/dist/modules/auth/templates/otp-email.html'
```

Root cause — a subtle build-layout divergence:
- `tsconfig.json` has `"include": ["src/**/*", "test/**/*"]` → on the host tsc infers `rootDir = .` and compiles TS to `dist/src/modules/...`.
- The Dockerfile only `COPY src ./src` (no `test/`), so in Docker tsc infers `rootDir = src` and compiles to `dist/modules/...`.
- `nest-cli.json` assets `outDir` is a single fixed path. With `./dist/src` it matched the host layout but not Docker; with `./dist` it matched Docker but not host.

`EmailProvider` does `path.join(__dirname, '../templates/otp-email.html')`, which needs the template next to the provider JS. A fixed `outDir` could not satisfy both builds.

Final fix (PR #5):
- Revert `nest-cli.json` assets `outDir` → `./dist` (matches the Docker TS output `dist/modules/...`).
- Add `tsconfig.build.json` with `include: ["src/**/*"]` so `nest build` / `nest start` on the host now also infer `rootDir = src` → compile to `dist/modules/...`. `../templates` then resolves identically on host and Docker.
- `docker-compose.yml`: `:dev` → `:develop`.

No Dockerfile change was needed: `test/` is already absent in the Docker build context, so Docker already compiles to `dist/modules/...`. Adding `tsconfig.build.json` makes the host behave the same.

After PR #5 merged, the workflow produced a new `:develop` image (built 2026-08-09 16:10Z) that boots cleanly and serves the new code (confirmed: `GET /api/v1/health` → 200, Swagger shows the `dateOfBirth` example + the `string` type).

---

## 4. Files changed this session

Auth migration fixes (PR #4):
- `src/modules/auth/services/token.service.ts`, `src/modules/auth/strategies/jwt.strategy.ts`, `src/modules/auth/auth.service.ts`, `src/modules/auth/services/admin-auth.service.ts` — JWT `phone`→`email`, profile stub creation, unused-import cleanup.
- `src/modules/users/schemas/nurse.schema.ts` — `licenseExpiryDate` optional.
- `src/modules/users/users.service.ts` — upsert profile endpoints, `findByEmail`.
- `src/modules/users/dto/create-patient.dto.ts` — `dateOfBirth` type → string + Swagger example.
- `test/auth.e2e-spec.ts`, `src/modules/auth/services/token.service.spec.ts`, `src/modules/auth/services/admin-auth.service.spec.ts`, `src/modules/auth/auth.service.spec.ts` — test fixes.
- `AUTH_API.md` — docs migration.

Build/deploy fixes (PR #5):
- `nest-cli.json` — assets `outDir: ./dist`.
- `tsconfig.build.json` — new, `include: ["src/**/*"]`.
- `infra/docker/docker-compose.yml` — pull `:develop`.

---

## 5. How to run

```pwsh
# infra (mongo, minio). Do NOT start api — it conflicts with local dev:
docker compose -f infra/docker/docker-compose.yml up -d mongo minio

# dev server (S3_ENDPOINT override required on the host):
set S3_ENDPOINT=http://localhost:9000 && pnpm start:dev

# bring the compose api back when needed (conflicts with local dev):
docker start nabdh-api
```

Local dev: http://localhost:3000/api/v1 — Swagger: http://localhost:3000/api/docs.

---

## 6. Remaining issues / notes

- **`app.e2e-spec.ts` still fails on the host** (`getaddrinfo ENOTFOUND minio`) — `UploadService.onModuleInit` needs S3 at boot. Either run it inside compose or add an `UploadService` override / make `onModuleInit` resilient. Pre-existing, out of scope.
- **Repo-wide CRLF/prettier lint noise** (Windows `git autocrlf` + prettier default `lf`): `i/lf w/crlf` for every file; `lint` reports `Delete ␍` on untouched files (e.g. `app.module.ts`). Consider `.prettierrc` `endOfLine: auto` or `git config core.autocrlf false`. Staged files were cleaned by lint-staged on commit.
- **Pre-existing uncommitted working-tree changes** were present throughout and deliberately excluded from all commits:
  - `infra/docker/Dockerfile`
  - `pnpm-workspace.yaml`
  - `src/modules/upload/upload.service.ts` (`getSignedUrl` cast workaround)
  - `infra/docker/docker-compose-a.yml` (untracked)
  These are a separate concern; review and commit them independently.
- **`.env`** contains real Gmail SMTP app-password creds (dev). OTP emails send for real. Do not commit the file.
- **AWS SDK warning** in the new image: `You are running node v20.20.2` — Node 20 EOL for AWS SDK v3 after Jan 2027. Non-blocking now; plan a Node 22 base image later.
- **Token verification**: fresh verify-OTP tokens now carry `email` + `nurseStatus` claims; `JwtStrategy.validate` always loads the live user from DB by `sub` (token claims are not trusted for role/status).