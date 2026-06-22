# Nabdh Backend — Implementation Roadmap

> **Document Owner:** Mohamed Zahran
> **Source of Truth:** `docs/Nabdh_Platform_BRD_PRD_System_Design.md` v1.4
> **Scope:** Egypt-only home-nursing marketplace. Modular monolith (NestJS 10+), MongoDB 7 + Mongoose, Socket.IO, MinIO/S3.
> **Audience:** Backend engineers, Flutter 

---

## 1. Executive Summary

The Nabdh backend is a NestJS modular monolith split into 9 domain modules. As of this assessment:

- **Auth module is production-ready** with 55 passing tests (36 unit + 19 e2e), OTP registration, JWT access/refresh with SHA-256 rotation, admin email + TOTP 2FA, and a Twilio SMS provider wired behind a feature flag.
- **Events outbox is implemented** (cron-based poller at 10s intervals, retry tracking, idempotency keys).
- **Health checks, global filters, Request-ID middleware, Joi config validation, ThrottlerModule, and RBAC guards are in place.**
- **8 of 9 business modules are scaffolded only**: schemas + DTOs + module shells exist, but controllers and services return mock data. No real CRUD, no geospatial queries, no Socket.IO auth, no FCM, no payment processing, no audit log capture.
- **Interceptors directory is empty.** No file-upload module. No monitoring/observability. No CI workflow.

The roadmap below is organized as **MVP → Production → Scale**, decomposed into 9 two-week sprints. The MVP (Sprints 1–5) delivers the end-to-end booking flow: registration → request → nurse matching → offers → visit lifecycle → cash payment → rating. Production (Sprints 6–8) adds online payments, admin portal, analytics, and hardening. Scale (Sprint 9+) adds observability, performance work, and CI/CD.

**Critical path:** Users → Location → Booking → Notifications → Payment. Chat runs in parallel once Booking lands. Admin/Analytics depend on all of the above.

**Out of BRD v1.4 scope** (explicitly noted so scope creep is blocked): Donations system, AI features, Content Management beyond the service catalog. These are listed in Section 10 as future considerations.

---

## 2. Current Status Assessment

### 2.1 Module Status Matrix

| Module | Code Files | Schemas | Real CRUD | Tests | Status | Notes |
|--------|-----------|---------|-----------|-------|--------|-------|
| **auth** | 22 | 2 (User, OtpSession, RefreshToken) | ✅ Full | 55 pass | ✅ COMPLETE | OTP, JWT, 2FA, Twilio, refresh rotation |
| **users** | 6 | 5 (User, Patient, Nurse, Address, NurseDocument) | Partial (findById/findByPhone real; profile methods stub) | 0 | ⚠️ PARTIAL | Controller routes unauthenticated, service returns mocks |
| **booking** | 5 | 4 (ServiceRequest, Offer, Booking, Rating) | ❌ None | 0 | ⚠️ SCAFFOLD | Emits `request.created` but with mock IDs |
| **payment** | 5 | 3 (Payment, Wallet, WalletTransaction) | ❌ None | 0 | ⚠️ SCAFFOLD | Webhook endpoints exist, all @Public() |
| **location** | 4 | 1 (LocationHistory) | ❌ None | 0 | ⚠️ SCAFFOLD | No $geoNear implementation |
| **chat** | 3 | 1 (ChatMessage) | ❌ None | 0 | ⚠️ SCAFFOLD | Socket.IO gateway skeleton, no persistence, no socket auth |
| **notifications** | 5 | 1 (Notification) | ❌ None | 0 | ⚠️ SCAFFOLD | @OnEvent handlers log only; no FCM; no persistence |
| **admin** | 5 | 2 (AuditLog, Service) | ❌ None | 0 | ⚠️ SCAFFOLD | All endpoints @Public(); audit log schema exists, not wired |
| **analytics** | 3 | 0 | ❌ None | 0 | ❌ EMPTY | No schemas; service returns hardcoded numbers |
| **events (outbox)** | 4 | 1 (OutboxEvent) | ✅ Processor working | 0 | ✅ IMPLEMENTED | Cron @ 10s, retry/error tracking, idempotency keys |
| **health** | 3 | 0 | ✅ | 0 | ✅ IMPLEMENTED | `/health` + `/health/ready` with DB ping |
| **upload** | 0 | 0 | ❌ | 0 | ❌ MISSING | No MinIO integration despite env vars in validation.ts |

### 2.2 Cross-Cutting Infrastructure

| Area | Status | Notes |
|------|--------|-------|
| AllExceptionsFilter | ✅ Implemented | Mongoose error mapping, Arabic messages |
| RequestIdMiddleware | ✅ Implemented | All routes |
| JwtAuthGuard (global) | ✅ Implemented | `@Public()` opt-out used pervasively on stubs |
| RolesGuard (global) | ✅ Implemented | `@Roles()` decorator available |
| ThrottlerModule | ✅ Implemented | 100 req / 60s global |
| Config validation (Joi) | ✅ Implemented | All env vars documented |
| DatabaseModule | ✅ Implemented | Mongoose connection |
| AuditLog capture | ❌ Missing | Schema exists, no middleware/interceptor writes to it |
| File upload (MinIO) | ❌ Missing | Env vars exist (`S3_*`), no module |
| Interceptors | ❌ Empty | `common/interceptors/` directory empty |
| Logging (Winston) | ⚠️ Dependency only | `winston` in package.json, no logger module |
| Swagger docs | ⚠️ Partial | Decorators on stubs; no API versioning |
| CI/CD | ❌ Missing | No GitHub Actions workflow |
| Docker | ✅ Implemented | Multi-stage Dockerfile + compose (mongo, minio, api) |
| Monitoring | ❌ Missing | No Prometheus, no metrics endpoint |

### 2.3 Technical Debt Register

| ID | Debt | Impact | Fix Window |
|----|------|--------|------------|
| TD-1 | All non-auth controllers use `@Public()` | Security: stubs accept unauthenticated calls | Sprint 1 (replaced as endpoints go live) |
| TD-2 | `users.service.createPatientProfile` returns mock object | Blocks all downstream flows | Sprint 1 |
| TD-3 | No audit log writes despite schema | Compliance gap | Sprint 6 |
| TD-4 | Socket.IO gateway has no auth | Chat/notifications unsecured | Sprint 4 |
| TD-5 | `booking.service` emits events with mock IDs | Event consumers get bad data | Sprint 2 |
| TD-6 | No MongoDB transactions implemented | Wallet/ledger operations unsafe | Sprint 5 |
| TD-7 | `ChatMessage` has no TTL index | Chat history grows unbounded | Sprint 4 |
| TD-8 | Interceptors directory empty | No logging/caching/transform layer | Sprint 6 |
| TD-9 | No CI workflow | Untested merges possible | Sprint 8 |
| TD-10 | `analytics` has no schemas | Module cannot function | Sprint 7 |
| TD-11 | Throttle removed from auth controller | Auth endpoints rely on global limiter only | Sprint 8 |
| TD-12 | `FCM_SERVER_KEY` env var defined but unused | No push notifications | Sprint 3 |

---

## 3. Backend Development Roadmap (Ordered by Priority)

### Phase A — MVP (Sprints 1–5)
**Goal:** End-to-end patient→nurse→visit→cash payment flow live in staging.

### Phase B — Production Release (Sprints 6–8)
**Goal:** Online payments, admin portal, analytics, hardening, CI/CD.

### Phase C — Scale & Optimization (Sprint 9+)
**Goal:** Observability, performance tuning, sharding prep, security audit.

### 3.1 Priority-Ordered Module Backlog

| Priority | Phase | Module | Business Priority | Dependencies | Complexity | Suggested Owner |
|----------|-------|--------|-------------------|--------------|------------|-----------------|
| P0 | MVP | users — real CRUD | Critical | auth (done) | Medium | BE-1 |
| P0 | MVP | upload — MinIO integration | Critical | — | Medium | BE-2 |
| P0 | MVP | location — $geoNear + GPS | Critical | users | Medium | BE-2 |
| P0 | MVP | booking — request + offers + lifecycle | Critical | users, location | High | BE-1 |
| P0 | MVP | booking — SOS dispatch | Critical | booking core | High | BE-1 |
| P0 | MVP | notifications — Socket emit + FCM | High | events outbox (done) | Medium | BE-3 |
| P1 | MVP | chat — real-time messaging | High | booking, Socket auth | Medium | BE-3 |
| P1 | MVP | payment — cash + wallet + commission | High | booking | High | BE-2 |
| P2 | Prod | admin — dashboard + verification + disputes | High | users, booking, payment | High | BE-1 |
| P2 | Prod | audit log — interceptor + capture | High | — | Low | BE-3 |
| P2 | Prod | analytics — schemas + aggregation | Medium | booking, payment | Medium | BE-3 |
| P2 | Prod | payment — Paymob + Fawry webhooks | High | payment core | High | BE-2 |
| P2 | Prod | booking — scheduled + ratings | Medium | booking core | Medium | BE-1 |
| P3 | Prod | security hardening + CI | High | all | Medium | BE-3 / DevOps |
| P3 | Scale | observability (Prometheus, Winston) | Medium | — | Medium | DevOps |
| P3 | Scale | performance (indexes, query profiling) | Medium | — | Medium | BE-1 |
| P3 | Scale | API versioning + OpenAPI publish | Low | — | Low | BE-3 |

---

## 4. Per-Module Detail

### 4.1 Authentication & Authorization (auth) — ✅ COMPLETE

| Item | Detail |
|------|--------|
| **Objective** | OTP registration for patients/nurses, email+password+TOTP for admins, JWT access 15m / refresh 7d with SHA-256 rotation. |
| **Required APIs** | `POST /auth/otp/send`, `POST /auth/otp/verify`, `POST /auth/refresh`, `POST /auth/logout`, `POST /admin/auth/login`, `POST /admin/auth/2fa/verify`, `POST /admin/auth/2fa/setup`, `POST /admin/auth/2fa/activate` — **all implemented.** |
| **Database entities** | `users`, `otp_sessions` (TTL), `refresh_tokens` |
| **External services** | Twilio (SMS), otplib (TOTP), bcryptjs, qrcode |
| **Security** | JWT bearer, refresh token ownership check on logout, TOTP 2FA for admins, global JwtAuthGuard + RolesGuard |
| **Testing** | 36 unit + 19 e2e = 55 tests. Coverage sufficient. |
| **Remaining work** | Add per-endpoint rate limiting (Sprint 8). Replace dev JWT secret in production (ops). |

### 4.2 User Management (users) — ⚠️ PARTIAL

| Item | Detail |
|------|--------|
| **Objective** | Patient + nurse profile CRUD, nurse document upload, address book, nurse availability toggle, admin verification workflow entry point. |
| **Required APIs** | `POST /patient/profile`, `GET /patient/profile`, `PUT /patient/profile`, `POST /patient/addresses`, `GET /patient/addresses`, `DELETE /patient/addresses/:id`, `POST /nurse/profile`, `GET /nurse/profile`, `PUT /nurse/profile`, `POST /nurse/documents`, `GET /nurse/documents`, `DELETE /nurse/documents/:id`, `PATCH /nurse/availability`, `GET /nurses/:id` (public profile for patient) |
| **Database entities** | `users`, `patients`, `nurses`, `addresses`, `nurse_documents` |
| **External services** | MinIO/S3 (file storage for documents + photos) |
| **Security** | JwtAuthGuard; patients access own profile only; nurses access own profile only; admin can list/verify any; document URLs are signed and time-limited. |
| **Testing** | Unit tests for service (mock model), e2e for controller with mongodb-memory-server. Target ≥80% coverage. |
| **Remaining work** | Replace 3 stub methods with real Mongoose operations; add 11 missing endpoints; integrate upload module; add role-based route guards. |

### 4.3 Location (location) — ⚠️ SCAFFOLD

| Item | Detail |
|------|--------|
| **Objective** | Nurse GPS updates, nearby-nurse search via `$geoNear`, ETA calculation, location history trail with 7-day TTL. |
| **Required APIs** | `POST /nurse/location` (auth: nurse only), `GET /nurses/nearby?lat&lng&radiusKm&genderPref` (auth: patient), `GET /nurse/location-history/:nurseId` (auth: admin or self) |
| **Database entities** | `nurses.location` (2dsphere), `location_history` (2dsphere + TTL) |
| **External services** | OSRM or Mapbox Directions for ETA |
| **Security** | Only nurse updates own location; patients query nearby without exposing nurse PII (return only id + distance + rating). |
| **Testing** | Unit: $geoNear query construction. E2E: insert nurses at known coords, assert sorted-by-distance results. |
| **Remaining work** | Implement `updateLocation` (upsert nurse.location + push to location_history); implement `findNearbyNurses` with `$geoNear` aggregation; add ETA helper. |

### 4.4 Booking & Case Management (booking) — ⚠️ SCAFFOLD

| Item | Detail |
|------|--------|
| **Objective** | Patient creates service request → matching algorithm surfaces to nearby nurses → nurses submit offers → patient selects → lifecycle transitions (PENDING_OFFERS → … → CLOSED) → cancellation → SOS dispatch → scheduled bookings → ratings. |
| **Required APIs** | `POST /requests` (patient), `GET /requests/:id`, `GET /requests` (patient: own), `GET /requests/available` (nurse: matching), `POST /offers` (nurse), `GET /offers/:requestId`, `POST /offers/:id/accept` (patient), `POST /bookings/:id/status` (nurse: advance lifecycle), `POST /bookings/:id/cancel`, `POST /requests/sos`, `POST /requests/scheduled`, `POST /bookings/:id/rate` (patient), `GET /bookings/:id`, `GET /bookings` (patient or nurse: own history) |
| **Database entities** | `service_requests`, `offers`, `bookings`, `ratings`, `services` (admin module) |
| **External services** | events outbox (done), location service for matching, notifications service for fan-out |
| **Security** | Patient owns request; nurse sees only matched requests; atomic status transitions via `findOneAndUpdate` with status precondition; no double-booking (compound unique on `offers {requestId, nurseId}`); SOS uses first-accept-wins with atomic `findOneAndUpdate`. |
| **Testing** | Unit: state machine transitions (legal/illegal moves), matching algorithm, SOS atomic accept. E2e: full request→offer→accept→complete flow. |
| **Remaining work** | Everything except schema. Largest module. |

### 4.5 SOS / Emergency Requests — subset of booking

| Item | Detail |
|------|--------|
| **Objective** | First-accept-wins dispatch with 1.5× market avg pricing, 2-min timeout, 20→30km radius expansion, free-text description (no service catalog). |
| **Required APIs** | `POST /requests/sos`, `POST /requests/sos/:id/accept` (nurse, atomic) |
| **Database entities** | `service_requests` (type=SOS, sosDescription) |
| **External services** | notifications (broadcast to all nearby nurses), location (radius expansion) |
| **Security** | Atomic accept via `findOneAndUpdate({ _id, status: PENDING_OFFERS }, { status: NURSE_CONFIRMED })`; only first call succeeds. |
| **Testing** | Unit: concurrent accept race condition (10 simultaneous accepts → exactly 1 winner). |
| **Remaining work** | Implement in booking service (Sprint 2). |

### 4.6 Payment & Wallet (payment) — ⚠️ SCAFFOLD

| Item | Detail |
|------|--------|
| **Objective** | Nurse wallet with prepaid balance (EGP 100 min for cash visits), commission capture on visit completion, Paymob card integration, Fawry reference integration, wallet ledger with double-entry integrity, withdrawals. |
| **Required APIs** | `GET /nurse/wallet`, `GET /nurse/wallet/transactions`, `POST /nurse/wallet/withdraw`, `POST /payments/cash/confirm` (nurse confirms cash collected on visit complete), `POST /webhooks/paymob`, `POST /webhooks/fawry`, `POST /admin/wallets/:nurseId/adjust` (admin) |
| **Database entities** | `payments`, `wallets`, `wallet_transactions` (ledger) |
| **External services** | Paymob API (cards), Fawry API (cash reference), MongoDB multi-document transactions for ledger |
| **Security** | Webhook signature verification (HMAC); admin-only wallet adjustments; atomic ledger via `session.startTransaction()`. |
| **Testing** | Unit: ledger balance invariant (sum of transactions == wallet balance); webhook signature validation. E2e: booking complete → commission deducted → nurse balance updated. |
| **Remaining work** | Cash + wallet + commission in Sprint 5 (MVP); Paymob/Fawry in Sprint 7 (Production). |

### 4.7 Chat (chat) — ⚠️ SCAFFOLD

| Item | Detail |
|------|--------|
| **Objective** | Per-booking real-time messaging between patient and assigned nurse. Message persistence, delivery + read receipts, history retrieval. |
| **Required APIs** | WebSocket: `message:send`, `message:read`, `join:room`. REST: `GET /bookings/:id/messages?before&limit` (paginated history). |
| **Database entities** | `chat_messages` |
| **External services** | Socket.IO (already in deps), Redis adapter optional at scale (not in MVP) |
| **Security** | Socket auth via JWT in handshake; only participants of the booking can join the room; message content length limit; rate limit per socket. |
| **Testing** | Unit: room authorization (non-participant rejected). E2e: two socket clients, message round-trip, persistence verified in DB. |
| **Remaining work** | Add JWT auth to gateway, persist messages, add REST history endpoint, read receipts (Sprint 4). |

### 4.8 Notifications (notifications) — ⚠️ SCAFFOLD

| Item | Detail |
|------|--------|
| **Objective** | In-app notifications list (read/unread), FCM push for Android, Socket.IO real-time emit, event handlers for booking lifecycle. |
| **Required APIs** | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, `POST /notifications/fcm-token` (register device) |
| **Database entities** | `notifications`, plus `fcm_tokens` (new — needs schema) |
| **External services** | Firebase Cloud Messaging (FCM), Socket.IO |
| **Security** | User sees only own notifications; FCM token bound to user ID. |
| **Testing** | Unit: event handler creates correct notification record. E2e: emit `booking.status.changed` → notification persisted + FCM call intercepted. |
| **Remaining work** | Add `FcmToken` schema, FCM provider behind feature flag (like Twilio), persist notifications in @OnEvent handlers, REST endpoints, Socket emit (Sprint 3). |

### 4.9 Admin Panel APIs (admin) — ⚠️ SCAFFOLD

| Item | Detail |
|------|--------|
| **Objective** | Dashboard KPIs, nurse verification queue + approve/reject, user management (list/suspend/ban), booking oversight, dispute handling, service catalog CRUD, commission config (super admin), finance overview. |
| **Required APIs** | `GET /admin/dashboard`, `GET /admin/nurses/pending-verification`, `POST /admin/nurses/:id/verify`, `POST /admin/nurses/:id/reject`, `GET /admin/users`, `PATCH /admin/users/:id/status`, `GET /admin/bookings`, `POST /admin/bookings/:id/dispute`, `POST /admin/services`, `PUT /admin/services/:id`, `PATCH /admin/commission/:serviceId`, `GET /admin/finance/overview`, `GET /admin/audit-logs` |
| **Database entities** | `users`, `nurses`, `bookings`, `services`, `audit_logs` |
| **External services** | All other modules via service injection |
| **Security** | `@Roles(ADMIN)` on every route; super-admin role for commission config; all mutations write to `audit_logs`. |
| **Testing** | Unit: verification SLA calculation. E2e: admin login → verify nurse → audit log written. |
| **Remaining work** | Replace stubs, add ~12 endpoints, wire audit log capture (Sprint 6). |

### 4.10 Analytics & Reporting (analytics) — ❌ EMPTY

| Item | Detail |
|------|--------|
| **Objective** | Aggregated metrics: revenue (daily/weekly/monthly), booking funnel (created→completed→cancelled→disputed), nurse performance, patient demographics, service type distribution. Exportable reports (CSV). |
| **Required APIs** | `GET /analytics/revenue?from&to`, `GET /analytics/bookings?from&to`, `GET /analytics/nurses/:id/performance`, `GET /analytics/services/distribution`, `GET /analytics/export?format=csv` |
| **Database entities** | Aggregations over `bookings`, `payments`, `wallet_transactions`, `users`, `nurses` — no new persistent schemas required for MVP. |
| **External services** | None |
| **Security** | Admin-only (all endpoints `@Roles(ADMIN)`). |
| **Testing** | Unit: aggregation pipeline construction. E2e: seed test data, assert computed totals match. |
| **Remaining work** | Build aggregation pipelines, no schemas needed (Sprint 7). |

### 4.11 Content Management (admin/services) — ⚠️ SCAFFOLD

| Item | Detail |
|------|--------|
| **Objective** | Service catalog CRUD (nameAr, descriptionAr, icon, basePriceMin/Max, durationMinutes, commissionRate, isActive). This is the extent of CMS in BRD v1.4. |
| **Required APIs** | `POST /admin/services`, `GET /services` (public), `GET /services/:id`, `PUT /admin/services/:id`, `DELETE /admin/services/:id` (soft delete via isActive) |
| **Database entities** | `services` |
| **External services** | None |
| **Security** | Read public; write admin-only. |
| **Testing** | Unit + e2e. |
| **Remaining work** | Implement CRUD in admin service (Sprint 6). |

### 4.12 Audit Logs — ❌ NOT WIRED

| Item | Detail |
|------|--------|
| **Objective** | Capture every admin mutation (verify, suspend, commission change, dispute) with actorId, action, resourceType, resourceId, details, IP. |
| **Required APIs** | `GET /admin/audit-logs?actor&action&from&to` (paginated) |
| **Database entities** | `audit_logs` (schema exists) |
| **External services** | None |
| **Security** | Admin-only read; write via interceptor on admin routes. |
| **Testing** | E2e: admin action → audit log entry present with correct actorId + IP. |
| **Remaining work** | Add `AuditLogInterceptor` in `common/interceptors/`, bind to admin controller (Sprint 6). |

### 4.13 File Storage (upload) — ❌ MISSING

| Item | Detail |
|------|--------|
| **Objective** | MinIO/S3 abstraction for nurse document upload, profile photos, service icons. Signed URLs for upload + download. |
| **Required APIs** | `POST /upload` (multipart, returns URL), `GET /upload/signed-url?key` |
| **Database entities** | None (URLs stored on `nurse_documents`, `nurses.photoUrl`, `services.icon`) |
| **External services** | MinIO (dev) / S3 (prod) |
| **Security** | JwtAuthGuard; file type whitelist (pdf, jpg, png); size limit 10MB per document (per `seq-nurse-onboarding.puml`); signed URLs with 15-min expiry; virus scan optional in Production. |
| **Testing** | Unit: presigned URL generation. E2e: upload file → fetch via signed URL → content matches. |
| **Remaining work** | New `upload` module, `UploadService` wrapping MinIO SDK, controller with multer (Sprint 1). |

### 4.14 Monitoring & Observability — ❌ MISSING

| Item | Detail |
|------|--------|
| **Objective** | Structured logs (Winston), Prometheus metrics endpoint, request latency histogram, DB query slow-log, alerting hooks. |
| **Required APIs** | `GET /metrics` (Prometheus format) |
| **Database entities** | None |
| **External services** | Prometheus + Grafana (ops), Winston logger |
| **Security** | `/metrics` admin-only or internal-only behind ALB. |
| **Testing** | Smoke test: metrics endpoint returns 200 with expected keys. |
| **Remaining work** | Winston logger module, `prom-client` integration, `MetricsInterceptor` (Sprint 9). |

### 4.15 Infrastructure & DevOps — ✅ PARTIAL

| Item | Detail |
|------|--------|
| **Done** | Dockerfile (multi-stage, non-root), docker-compose.yml (mongo, minio, api), `.dockerignore`, health endpoints, Joi env validation. |
| **Remaining** | GitHub Actions CI (lint, test, build on PR), Docker Compose healthchecks for all services, `.env.example` for team distribution, ECS Fargate task definition, MongoDB Atlas connection hardening, AWS Secrets Manager integration, ALB + TLS 1.3. |
| **Sprint** | Sprint 8 (CI), Sprint 9 (prod infra). |

---

## 5. Sprint-by-Sprint Plan

### Sprint 1 — Users + Upload + Location (10 days, BE-1 + BE-2)

| Day | Owner | Task |
|-----|-------|------|
| 1–2 | BE-1 | `users.service`: real `createPatientProfile`, `getPatientProfile`, `getNurseProfile`, `updatePatientProfile`, `updateNurseProfile` with Mongoose |
| 1–2 | BE-2 | New `upload` module: `UploadService` (MinIO SDK), `UploadController` with multer, signed URL helper |
| 3 | BE-1 | Patient + nurse DTOs (create/update), validation |
| 3 | BE-2 | Nurse document endpoints: `POST /nurse/documents`, `GET /nurse/documents`, `DELETE /nurse/documents/:id` |
| 4 | BE-1 | Address CRUD endpoints + DTOs |
| 4 | BE-2 | `location.service`: `updateLocation` (upsert nurse.location + location_history), `findNearbyNurses` with `$geoNear` |
| 5 | BE-1 | Nurse availability toggle endpoint, public nurse profile endpoint |
| 5 | BE-2 | ETA helper (OSRM call) |
| 6–7 | BE-1 + BE-2 | Unit tests for users + upload + location services |
| 8 | BE-1 + BE-2 | E2E tests for new endpoints (mongodb-memory-server) |
| 9 | BE-1 + BE-2 | Remove `@Public()` from all users/location endpoints; apply `@Roles` where needed |
| 10 | Both | Swagger decorators, code review, merge |

**Deliverables:** Real user profiles, document upload, nearby nurse search.
**Acceptance:** E2E test: patient registers (auth) → creates profile → uploads address → searches nearby nurses → nurse found with correct distance ordering.

### Sprint 2 — Booking Core + SOS (10 days, BE-1 + BE-2)

| Day | Owner | Task |
|-----|-------|------|
| 1–2 | BE-1 | `booking.service`: `createRequest` with real patient lookup, geo point, persistence |
| 1–2 | BE-2 | Matching algorithm: query nearby nurses (location service), filter by gender pref + verification status + availability, rank by distance + rating |
| 3 | BE-1 | `GET /requests/available` for nurse view |
| 3 | BE-2 | `POST /offers` (nurse submits offer), `GET /offers/:requestId` |
| 4 | BE-1 | `POST /offers/:id/accept` (patient selects) → creates Booking, atomic |
| 4 | BE-2 | Lifecycle transitions: `POST /bookings/:id/status` with state machine validation |
| 5 | BE-1 | Cancellation: patient free before NURSE_CONFIRMED, nurse cancel with penalty |
| 5 | BE-2 | SOS: `POST /requests/sos`, atomic first-accept, 1.5× pricing calc, 2-min timeout |
| 6 | BE-1 | Scheduled bookings: `POST /requests/scheduled`, 30-min pre-broadcast cron |
| 7 | BE-2 | Ratings: `POST /bookings/:id/rate`, update nurse avgRating + totalRatings |
| 8–9 | Both | Unit + e2e tests (state machine, SOS race condition, matching) |
| 10 | Both | Wire real event emission to outbox (replace mock IDs) |

**Deliverables:** Full booking lifecycle, SOS, scheduled, ratings.
**Acceptance:** E2E: patient creates request → nurse sees it → submits offer → patient accepts → nurse advances through lifecycle → completes → patient rates → nurse avgRating updated.

### Sprint 3 — Notifications + FCM (10 days, BE-3)

| Day | Task |
|-----|------|
| 1–2 | `FcmToken` schema; FCM provider behind feature flag (FCM_SERVER_KEY); `POST /notifications/fcm-token` |
| 3 | `notifications.service` @OnEvent handlers: persist Notification record on `request.created`, `offer.submitted`, `booking.status.changed`, `booking.completed` |
| 4 | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` |
| 5 | Socket.IO emit helper: push to user's room on notification create |
| 6 | `notifications.gateway` with JWT auth on handshake (shared with chat) |
| 7–8 | Unit + e2e tests (event → notification persisted + FCM mocked + socket emit verified) |
| 9 | Wire all booking events to notification fan-out |
| 10 | Code review, merge |

**Deliverables:** Real push notifications for all booking events.
**Acceptance:** E2E: booking status change → notification in DB → FCM call intercepted → socket client in user room receives event.

### Sprint 4 — Chat (10 days, BE-3, with BE-1 support)

| Day | Task |
|-----|------|
| 1–2 | `chat.gateway`: JWT auth in handshake, room = `booking:{id}`, verify user is booking participant before join |
| 3 | `message:send` → persist `ChatMessage`, emit `message:received` to room |
| 4 | `message:read` → update `isRead`, broadcast read receipt |
| 5 | REST: `GET /bookings/:id/messages` with cursor pagination |
| 6 | Delivery receipts, unread count endpoint |
| 7 | TTL index on `chat_messages` (optional, 90-day) |
| 8–9 | Unit + e2e tests (auth, room authz, round-trip, pagination) |
| 10 | Code review, merge |

**Deliverables:** Working per-booking chat.
**Acceptance:** E2E: patient + nurse socket clients connect, exchange 5 messages, all persisted, history endpoint returns them in order, non-participant socket rejected.

### Sprint 5 — Payment: Cash + Wallet + Commission (10 days, BE-2)

| Day | Task |
|-----|------|
| 1 | `payment.service`: create Wallet on nurse verification event (`nurse.verified`) |
| 2 | Wallet CRUD: `GET /nurse/wallet`, `GET /nurse/wallet/transactions` |
| 3 | Commission calc on `booking.completed`: lookup service commissionRate, compute amount, create Payment record |
| 4 | MongoDB transaction: credit nurse `availableBalance`, debit `prepaidBalance` (if cash), insert `WalletTransaction` ledger entries |
| 5 | Cash payment: `POST /payments/cash/confirm` (nurse confirms collection), enforce EGP 100 min prepaid balance |
| 6 | SOS pricing: 1.5× 30-day average for service type |
| 7 | Withdrawal request: `POST /nurse/wallet/withdraw` (creates DEBT transaction, admin approves) |
| 8–9 | Unit + e2e tests (ledger invariant, transaction rollback, commission math) |
| 10 | Code review, merge |

**Deliverables:** Cash payment flow, wallet ledger, commission capture.
**Acceptance:** E2E: booking complete → commission deducted → nurse wallet balance correct → ledger sum == balance.

**Phase A (MVP) Gate** — Sprints 1–5 complete. Patient can register, request, get offers, accept, track, chat, pay cash, rate. Nurse can register, verify, receive requests, offer, navigate, chat, get paid.

### Sprint 6 — Admin + Audit + Service Catalog (10 days, BE-1 + BE-3)

| Day | Owner | Task |
|-----|-------|------|
| 1–2 | BE-1 | `admin.service`: dashboard KPIs (real counts from DB) |
| 3 | BE-1 | Nurse verification queue: `GET /admin/nurses/pending-verification`, `POST /admin/nurses/:id/verify` (emits `nurse.verified`), `POST /admin/nurses/:id/reject` |
| 3 | BE-3 | `AuditLogInterceptor` in `common/interceptors/`, bound to admin controller — captures actorId, action, resourceType, IP |
| 4 | BE-1 | User management: `GET /admin/users`, `PATCH /admin/users/:id/status` (suspend/ban) |
| 4 | BE-3 | Service catalog CRUD: `POST /admin/services`, `PUT /admin/services/:id`, `GET /services` (public) |
| 5 | BE-1 | Booking oversight: `GET /admin/bookings`, `POST /admin/bookings/:id/dispute` |
| 5 | BE-3 | Commission config: `PATCH /admin/commission/:serviceId` (super-admin only) |
| 6 | BE-1 | Finance overview: `GET /admin/finance/overview` |
| 7 | BE-3 | `GET /admin/audit-logs` with filters |
| 8–9 | Both | Unit + e2e tests (verify flow, audit log capture, role enforcement) |
| 10 | Both | Remove `@Public()` from all admin endpoints; enforce `@Roles(ADMIN)` |

**Deliverables:** Full admin portal backend, audit trail live.

### Sprint 7 — Analytics + Online Payments (10 days, BE-2 + BE-3)

| Day | Owner | Task |
|-----|-------|------|
| 1–2 | BE-3 | `analytics.service`: revenue aggregation pipeline over `payments` |
| 3 | BE-3 | Booking funnel aggregation, service distribution, nurse performance |
| 4 | BE-3 | CSV export endpoint |
| 5 | BE-3 | Unit + e2e tests for analytics |
| 1–3 | BE-2 | Paymob integration: create payment intent, redirect URL, webhook handler with HMAC verification |
| 4–5 | BE-2 | Fawry integration: reference code generation, webhook handler |
| 6 | BE-2 | Wire payment completion → booking status `PAYMENT_COMPLETED` via event |
| 7 | BE-2 | Refund flow: `POST /admin/payments/:id/refund` |
| 8–9 | BE-2 | Unit + e2e tests (webhook signature, payment→booking linkage) |
| 10 | Both | Code review, merge |

**Deliverables:** Analytics endpoints, Paymob + Fawry live.

### Sprint 8 — Hardening + CI (10 days, BE-3 + DevOps)

| Day | Task |
|-----|------|
| 1 | GitHub Actions workflow: lint, typecheck, test, build on PR |
| 2 | Docker Compose healthchecks for mongo, minio, api |
| 3 | `.env.example` with all vars, documented |
| 4 | Per-endpoint rate limits (auth: 5/min, booking: 30/min, etc.) — replace removed throttle |
| 5 | Input validation audit: every DTO has class-validator rules |
| 6 | Security audit: injection, IDOR, broken auth, mass assignment |
| 7 | Swagger: complete API docs, group by tag, add examples |
| 8 | E2E regression suite: full booking→payment→rating flow |
| 9 | Performance: add missing indexes (verify all schema indexes applied), EXPLAIN on slow queries |
| 10 | Production readiness checklist sign-off |

**Deliverables:** CI live, security audited, docs complete.

**Phase B (Production) Gate** — Sprints 6–8 complete. Admin portal functional, online payments live, audit trail comprehensive, CI prevents bad merges.

### Sprint 9+ — Scale & Optimization

| Task | Sprint |
|------|--------|
| Winston logger module (replace Nest default) | 9 |
| `prom-client` + `/metrics` endpoint + Grafana dashboards | 9 |
| MongoDB Atlas prod provisioning, backup schedule, point-in-time recovery | 9 |
| ECS Fargate task definition + ALB + TLS 1.3 | 9 |
| Query profiling, index tuning, aggregation optimization | 10 |
| Socket.IO Redis adapter (horizontal scale) | 10 |
| Sharding key selection for `bookings`, `wallet_transactions` | 10 |
| API versioning strategy (v2 path) | 10 |
| Load testing (k6 or Artillery) — 10k concurrent bookings | 10 |
| Disaster recovery runbook | 11 |

---

## 6. Team Assignment Recommendations

### 6.1 Recommended Composition

| Role | Count | Focus |
|------|-------|-------|
| BE-1 (Senior) | 1 | Booking, admin, state machines, transactional logic |
| BE-2 (Mid) | 1 | Users, upload, location, payment, integrations |
| BE-3 (Mid) | 1 | Notifications, chat, analytics, cross-cutting (audit, interceptors) |
| DevOps | 0.5 | CI, Docker, Atlas, ECS (shared across team) |
| QA | 0.5 | E2E regression, load tests (Sprint 8+) |

### 6.2 Parallel Track Map (3 backend devs)

```
Sprint 1   BE-1: users CRUD         | BE-2: upload + location      | BE-3: —
Sprint 2   BE-1: booking core       | BE-2: matching + SOS         | BE-3: —
Sprint 3   BE-1: —                  | BE-2: —                      | BE-3: notifications + FCM
Sprint 4   BE-1: chat REST support  | BE-2: —                      | BE-3: chat gateway
Sprint 5   BE-1: —                  | BE-2: payment + wallet       | BE-3: —
Sprint 6   BE-1: admin core         | BE-2: —                      | BE-3: audit + service catalog
Sprint 7   BE-1: —                  | BE-2: Paymob + Fawry         | BE-3: analytics
Sprint 8   BE-1: performance        | BE-2: e2e regression         | BE-3: CI + security audit
```

**Dependency conflict avoidance:**
- BE-1 owns the booking state machine; BE-2 consumes it via service injection (no shared mutation).
- BE-2 owns wallet transactions; BE-1's booking service emits `booking.completed` and does not touch wallet.
- BE-3 owns notifications + chat sockets; consumes events from outbox only — never calls booking service directly.
- Shared interfaces (event payloads, DTOs) are agreed in Sprint 0 design doc before parallel work starts.

### 6.3 If Only 1 Backend Dev

Sequential: S1 → S2 → S3 → S4 → S5 → S6 → S7 → S8 → S9.
**Estimate:** 18–20 weeks for MVP + Production.

### 6.4 If 2 Backend Devs

```
S1: BE-1 users | BE-2 upload + location
S2: BE-1 booking core | BE-2 matching + SOS
S3: BE-1 payment prep (wallet schema, ledger design) | BE-2 notifications + FCM
S4: BE-1 chat | BE-2 payment + wallet
S5: BE-1 admin | BE-2 analytics
S6: BE-1 hardening + CI | BE-2 Paymob + Fawry
```
**Estimate:** 12–14 weeks.

---

## 7. Risks & Blockers

| ID | Risk | Likelihood | Impact | Mitigation | Owner |
|----|------|-----------|--------|------------|-------|
| R-1 | SOS race condition → double-accept | Low | Critical | Atomic `findOneAndUpdate` with status precondition + unit test with 10 concurrent calls | BE-1 |
| R-2 | Wallet ledger drift (balance != sum transactions) | Medium | Critical | MongoDB multi-document transactions; daily reconciliation cron | BE-2 |
| R-3 | $geoNear performance degradation at scale | Medium | Medium | Compound index `{ location: 2dsphere, isOnline: 1, verificationStatus: 1 }`; cap radius | BE-2 |
| R-4 | Twilio SMS delivery to Egypt unreliable | Medium | High | Stub provider for dev; fallback to alphanumeric sender ID; retry queue | BE-3 |
| R-5 | FCM delivery to Egyptian Android devices unreliable | Medium | Medium | Socket.IO fallback for in-app; retry FCM with exponential backoff | BE-3 |
| R-6 | Paymob/Fawry webhook spoofing | Low | Critical | HMAC signature verification; idempotency key on webhook handler | BE-2 |
| R-7 | Nurse verification backlog > 72h SLA | Medium | Medium | Admin dashboard SLA countdown; escalation on overdue | BE-1 |
| R-8 | Socket.IO memory growth at 10k connections | Medium | Medium | Redis adapter in Sprint 10; connection cleanup on disconnect | BE-3 |
| R-9 | MongoDB Atlas region availability (me-south-1) | Low | High | Multi-region replica set; tested failover | DevOps |
| R-10 | Cash payment reconciliation (no online proof) | High | Medium | Nurse prepaid balance enforcement; admin manual reconciliation tool; audit log | BE-2 |
| R-11 | Scope creep into donations / AI features | High | Medium | Explicitly deferred (Section 10); PM sign-off required to add | PM |
| R-12 | Arabic text search performance | Low | Low | MongoDB text index with Arabic stemmer if search added | BE-1 |

### Current Blockers

| Blocker | Status | Resolution |
|---------|--------|------------|
| `users.service` returns mock data | Open | Sprint 1 |
| All non-auth endpoints `@Public()` | Open | Removed as each module goes live (S1, S2, S5, S6) |
| No MinIO integration | Open | Sprint 1 |
| No Socket.IO auth | Open | Sprint 3 (notifications) + Sprint 4 (chat) |
| `analytics` has no schemas | Open | Sprint 7 (aggregations only, no new schemas needed) |

---

## 8. Definition of Done

### 8.1 Per-Sprint DoD

- [ ] All service methods implemented — no mock data, no hardcoded IDs
- [ ] Unit tests pass with ≥80% coverage on new code
- [ ] E2E tests pass for new endpoints
- [ ] No `@Public()` on endpoints requiring auth (unless explicitly public: service catalog GET, health)
- [ ] `@Roles()` applied where role-specific access needed
- [ ] Swagger `@ApiOperation` + `@ApiBearerAuth` on every new endpoint
- [ ] Arabic error messages for user-facing errors
- [ ] No lint errors (`npm run lint`)
- [ ] Docker image builds (`docker build .`)
- [ ] PR reviewed by at least one other backend dev
- [ ] No new TODO comments without linked ticket

### 8.2 Phase A (MVP) DoD

- [ ] Patient can: register (OTP) → create profile → add address → search nearby nurses → create request → receive offers → select nurse → chat → track visit → pay cash → rate
- [ ] Nurse can: register (OTP) → upload documents → (admin verifies) → toggle availability → receive requests → submit offers → accept SOS → advance lifecycle → chat → collect cash → see wallet balance
- [ ] All 9 modules have real implementations (no stubs returning mock data)
- [ ] E2E regression suite covers the full flow above
- [ ] Docker Compose brings up full stack with `make up`
- [ ] Staging environment deployed and accessible to Flutter team

### 8.3 Phase B (Production) DoD

- [ ] Admin can: login with 2FA → view dashboard → verify nurses → manage users → resolve disputes → configure commission → view finance → export analytics
- [ ] Paymob + Fawry webhooks verified with real test credentials
- [ ] Audit log captures every admin mutation
- [ ] CI pipeline blocks merges on failing tests
- [ ] Security audit passed (no critical/high findings)
- [ ] Swagger docs published and shared with Flutter team
- [ ] `.env.example` complete and documented
- [ ] Load test: 1000 concurrent users, p95 latency < 500ms

### 8.4 Phase C (Scale) DoD

- [ ] Prometheus + Grafana dashboards live
- [ ] Winston structured logs shipped to log aggregator
- [ ] MongoDB Atlas prod with automated backups + point-in-time recovery
- [ ] ECS Fargate + ALB + TLS 1.3 in production
- [ ] Load test: 10k concurrent bookings, p95 < 2s
- [ ] Disaster recovery runbook tested
- [ ] Socket.IO Redis adapter for horizontal scale
- [ ] Sharding strategy documented (even if not yet applied)

---

## 9. Infrastructure & DevOps Roadmap

| Item | Phase | Sprint | Owner |
|------|-------|--------|-------|
| Docker Compose (done) | MVP | — | — |
| Multi-stage Dockerfile (done) | MVP | — | — |
| Health endpoints (done) | MVP | — | — |
| GitHub Actions CI | Prod | 8 | DevOps |
| Docker Compose healthchecks | Prod | 8 | DevOps |
| `.env.example` | Prod | 8 | DevOps |
| MongoDB Atlas M10+ provisioning | Prod | 9 | DevOps |
| ECS Fargate task definition | Prod | 9 | DevOps |
| ALB + TLS 1.3 | Prod | 9 | DevOps |
| AWS Secrets Manager | Prod | 9 | DevOps |
| S3 + CloudFront (replace MinIO) | Prod | 9 | DevOps |
| Prometheus + Grafana | Scale | 9 | DevOps |
| Winston logger module | Scale | 9 | BE-3 |
| Socket.IO Redis adapter | Scale | 10 | BE-3 |
| Sharding strategy doc | Scale | 10 | BE-1 |
| Load testing (k6) | Scale | 10 | QA |
| Disaster recovery runbook | Scale | 11 | DevOps |

---

## 10. Out of BRD v1.4 Scope (Future Considerations)

The following areas from the roadmap prompt are **not in BRD v1.4** and are explicitly deferred to prevent scope creep. They require PM sign-off before addition.

| Area | Status | Notes |
|------|--------|-------|
| **Donations & Financial Transactions** (beyond wallet) | Out of scope | BRD covers commission, wallet, Paymob/Fawry, cash only. No donation/fundraising flow defined. |
| **AI Features** | Out of scope | BRD mentions no AI. Possible future: smart nurse ranking, demand prediction, chat translation — requires separate PRD. |
| **Content Management** (beyond service catalog) | Out of scope | BRD's "CMS" = service catalog CRUD only (admin module). No articles, banners, or CMS pages defined. |
| **Multi-language** | Out of scope | BRD: Arabic-only, RTL. English support not planned for Year 1. |
| **Multi-city expansion** | Out of scope | BRD: Greater Cairo only for launch. |

---

## 11. API Surface Summary (Target State)

| Module | Endpoint Count (target) | Auth |
|--------|------------------------|------|
| auth | 8 (done) | Public + JWT |
| users | 13 | JWT + roles |
| booking | 12 | JWT + roles |
| payment | 8 | JWT + roles + webhooks (HMAC) |
| location | 3 | JWT + roles |
| chat | 1 REST + 3 WS | JWT (REST + socket handshake) |
| notifications | 4 | JWT |
| admin | 14 | JWT + ADMIN role |
| analytics | 5 | JWT + ADMIN role |
| upload | 2 | JWT |
| health | 2 (done) | Public |
| **Total** | **~72 endpoints** | |

---

## 12. Diagrams → Module Mapping

Source files in `diagrams/usecase/` and `diagrams/sequence/` (PlantUML + rendered SVG). Each diagram informs one or more modules and sprints below.

### 12.1 Use Case Diagrams

| File | Title | Actors | Use Cases | Modules Informed | Sprint |
|------|-------|--------|-----------|------------------|--------|
| `diagrams/usecase/usecase-overall.puml` | System-Level Use Case | Patient, Nurse, Admin, Super Admin, Paymob, Fawry | 28 use cases across 7 system boundaries | All modules — master scope reference | All |
| `diagrams/usecase/usecase-patient.puml` | Patient Use Case | Patient | 21 patient use cases + 3 payment methods | auth, users, booking, payment, notifications, chat | S1, S2, S4, S5 |
| `diagrams/usecase/usecase-nurse.puml` | Nurse Use Case | Nurse | 27 use cases across 6 groups (account, availability, offers, SOS, visit, wallet) | auth, users, booking, payment, location, chat, notifications | S1, S2, S4, S5 |
| `diagrams/usecase/usecase-admin.puml` | Admin & Super Admin Use Case | Admin, Super Admin (inherits Admin) | 32 use cases across 9 groups | admin, analytics, audit, notifications | S6, S7 |

**Key use cases not previously captured in roadmap:**
- Patient: "Re-book Previous Service" (UC18), "Delete Account (Anonymize)" (UC21), "View Booking History" (UC17)
- Nurse: "View Own Ratings & Reviews" (N27), "View Earnings Analytics" (N25), "Withdraw Offer" (N10), "Reject Incoming Request" (N8), "Reject Assignment" (N12)
- Admin: "Manage Other Admins" (A32, super admin only), "Manage FAQ & Content" (A30), "Add Review Comments" on verification (A4_Reason), "Broadcast Push Notifications" (A29)

### 12.2 Sequence Diagrams

| File | Flow | Key Participants | Modules Involved | Sprint | New Business Rules Surfaced |
|------|------|------------------|------------------|--------|------------------------------|
| `diagrams/sequence/seq-registration.puml` | OTP registration (patient + nurse) | User, App, Gateway, Auth, User Service, SMS, DB | auth, users | ✅ Done | **Refresh token = 30 days** (diagram) vs 7d (current code) — discrepancy, see 12.4 |
| `diagrams/sequence/seq-nurse-onboarding.puml` | Nurse onboarding + verification + license expiry watchdog | Nurse, App, User Service, Document Service, Notification, Admin | users, upload, admin, notifications | S1, S6 | License expiry cron: 30d warning, 7d urgent, auto-offline on expiry; daily cron job; re-verification cycle |
| `diagrams/sequence/seq-booking-overall.puml` | Standard booking end-to-end | Patient, Booking, Location, Notification, Nurse, Payment, Wallet | booking, location, notifications, payment | S2, S5 | **Offer ranking formula**: `score = rating*0.4 + (1/price_norm)*0.3 + (1/eta_norm)*0.3`; **Location update intervals**: SOS 3s, Standard 5s, Idle 30s; **Auto-close after 72h** if no rating; Booking validates "patient has no active booking" |
| `diagrams/sequence/seq-scheduled-booking.puml` | Scheduled booking + cron trigger | Patient, Booking, Scheduler, Notification, Nurse | booking | S2 | Schedule rules: min 2h, max 7d ahead; `broadcast_at = scheduled_for - 30min`; cron runs every minute; **free cancel up to 1h before**; 15-min pre-visit reminder to both parties |
| `diagrams/sequence/seq-sos-emergency.puml` | SOS emergency dispatch | Patient, Booking, Location, Notification, Nurse 1..N, Admin, Payment, Wallet | booking, location, notifications, admin, payment | S2 | **Patient SOS rate limit: 1 per 15 min**; radius 20km expandable to 30km; 2-min timeout → patient notified + admin alerted; 3s location refresh; admin SOS monitor (real-time); SOS completion rate target >95%, acceptance <60s |
| `diagrams/sequence/seq-cancellation-reassign.puml` | Nurse cancellation + reassignment | Patient, Booking, Notification, Nurse, Admin | booking, notifications, admin | S2 | **5 mandatory cancellation reasons** (personal emergency, too far, outside specialization, transport, other); nurse cancellation counter incremented; **cancellation rate >15% triggers admin alert**; reassignment excludes cancelling nurse; audit captures original nurse + reason + time-to-reassignment |
| `diagrams/sequence/seq-payment-wallet.puml` | Payment + wallet + ledger + withdrawal | Patient, Payment, Wallet, Ledger, Nurse, Admin | payment | S5, S7 | **Double-entry ledger**: Patient Payment (DR) → Platform Holding (CR); Commission (DR) → Platform Revenue (CR); Platform Holding (DR) → Nurse Wallet (CR); **Cash: commission from prepaid balance, debt if insufficient**; **Withdrawal methods**: Vodafone Cash, Etisalat Cash/WE Pay, InstaPay; min EGP 100; 1-3 business days; admin processes withdrawal queue |
| `diagrams/sequence/seq-dispute-resolution.puml` | Dispute filing + admin ruling + refund | Patient, Booking, Admin, Nurse, Wallet, Ledger, Notification | booking, admin, payment, notifications | S6 | **Dispute window: 72h after visit completion**; dispute freezes payment + locks rating; admin reviews chat + GPS history + timestamps; **refund deducted from nurse wallet (platform does NOT absorb)**; negative balance tracked as debt against future earnings; final status DISPUTE_REFUNDED or DISPUTE_REJECTED → CLOSED |

### 12.3 Business Rules Surfaced from Diagrams (Must Implement)

| ID | Rule | Source Diagram | Module | Sprint | Priority |
|----|------|----------------|--------|--------|----------|
| BR-D1 | Refresh token TTL = 30 days (not 7d) | seq-registration | auth | Verify | High |
| BR-D2 | License expiry daily cron: 30d warning, 7d urgent, auto-offline on expiry | seq-nurse-onboarding | users | S6 | High |
| BR-D3 | License re-verification cycle (nurse re-uploads → admin re-reviews) | seq-nurse-onboarding | users, admin | S6 | Medium |
| BR-D4 | Offer ranking: `rating*0.4 + (1/price_norm)*0.3 + (1/eta_norm)*0.3` | seq-booking-overall | booking | S2 | High |
| BR-D5 | Patient can re-sort offers by price / rating / ETA | seq-booking-overall | booking | S2 | Medium |
| BR-D6 | Location update intervals: SOS 3s, Standard 5s, Idle 30s | seq-booking-overall | location | S2 | High |
| BR-D7 | Booking auto-close after 72h if no rating submitted | seq-booking-overall | booking | S2 | Medium |
| BR-D8 | Patient cannot have 2 active bookings (validation on request create) | seq-booking-overall | booking | S2 | High |
| BR-D9 | Scheduled booking: min 2h, max 7d ahead; `broadcast_at = scheduled_for - 30min` | seq-scheduled-booking | booking | S2 | High |
| BR-D10 | Scheduled booking: free cancel up to 1h before | seq-scheduled-booking | booking | S2 | High |
| BR-D11 | Scheduled booking: 15-min pre-visit reminder to both parties | seq-scheduled-booking | booking, notifications | S3 | Medium |
| BR-D12 | Scheduler cron runs every minute for due scheduled bookings | seq-scheduled-booking | booking | S2 | High |
| BR-D13 | SOS: patient rate limit 1 per 15 min | seq-sos-emergency | booking | S2 | High |
| BR-D14 | SOS: radius 20km → 30km expansion; 2-min timeout | seq-sos-emergency | booking, location | S2 | High |
| BR-D15 | SOS: admin real-time monitor (dedicated SOS dashboard) | seq-sos-emergency | admin | S6 | Medium |
| BR-D16 | SOS: 3-second location refresh during en-route | seq-sos-emergency | location | S2 | Medium |
| BR-D17 | Nurse cancellation: 5 mandatory predefined reasons | seq-cancellation-reassign | booking | S2 | High |
| BR-D18 | Nurse cancellation counter; rate >15% → admin alert | seq-cancellation-reassign | booking, admin | S2, S6 | Medium |
| BR-D19 | Reassignment: exclude cancelling nurse from re-broadcast | seq-cancellation-reassign | booking | S2 | High |
| BR-D20 | Payment: double-entry ledger (3 entry pairs per payment) | seq-payment-wallet | payment | S5 | High |
| BR-D21 | Cash: commission from prepaid balance; debt if insufficient | seq-payment-wallet | payment | S5 | High |
| BR-D22 | Withdrawal methods: Vodafone Cash, Etisalat Cash/WE Pay, InstaPay | seq-payment-wallet | payment | S5 | Medium |
| BR-D23 | Withdrawal: min EGP 100, 1-3 business days, admin processes queue | seq-payment-wallet | payment, admin | S5, S6 | High |
| BR-D24 | Dispute window: 72h after visit completion | seq-dispute-resolution | booking | S6 | High |
| BR-D25 | Dispute: freeze payment, lock rating | seq-dispute-resolution | booking, payment | S6 | High |
| BR-D26 | Dispute: refund from nurse wallet (platform never absorbs) | seq-dispute-resolution | payment, admin | S6 | High |
| BR-D27 | Dispute: negative balance → debt tracked against future earnings | seq-dispute-resolution | payment | S6 | High |
| BR-D28 | Patient: "Delete Account (Anonymize)" use case | usecase-patient | users | S6 | Low |
| BR-D29 | Patient: "Re-book Previous Service" use case | usecase-patient | booking | S2 | Low |
| BR-D30 | Nurse: "View Own Ratings & Reviews" + "View Earnings Analytics" | usecase-nurse | users, analytics | S7 | Low |
| BR-D31 | Admin: "Manage Other Admins" (super admin only) | usecase-admin | admin | S6 | Medium |
| BR-D32 | Admin: "Broadcast Push Notifications" to all/segmented users | usecase-admin | admin, notifications | S6 | Medium |
| BR-D33 | Admin: "Manage FAQ & Content" | usecase-admin | admin | S6+ | Low |
| BR-D34 | Admin verification: "Add Review Comments" on approve/reject | usecase-admin | admin | S6 | Medium |

### 12.4 Discrepancies Between Diagrams and Current Code

| ID | Topic | Diagram Says | Code Says | Resolution |
|----|-------|--------------|-----------|------------|
| D-1 | Refresh token TTL | 30 days (`seq-registration.puml` line 134, 173) | 7 days (`config/validation.ts` `JWT_REFRESH_EXPIRY: '7d'`) | **Confirm with PM**. BRD §3.6 says "refresh 7d". Diagram says 30d. Recommend following BRD (7d) and updating diagram. |
| D-2 | Nurse `verification_status` on registration | `PENDING` (`seq-registration.puml` line 159) | `INCOMPLETE` (default in `nurse.schema.ts` line 40, enum) | Diagram is correct flow-wise: nurse uploads docs → status becomes PENDING. `INCOMPLETE` is initial state before doc upload. **No conflict** — schema is correct, diagram simplifies. |
| D-3 | DB queries in diagram | SQL syntax (`SELECT * FROM users`, `INSERT INTO patient`) | MongoDB/Mongoose | Diagrams use generic SQL notation for readability. **No conflict** — implement as Mongoose equivalents. |
| D-4 | Document size limit | `< 10MB` (`seq-nurse-onboarding.puml` line 71) | Not enforced yet (no upload module) | Implement 10MB limit in Sprint 1 upload module. Update roadmap Section 4.13 (was 5MB docs / 2MB photos — **change to 10MB per diagram**). |
| D-5 | Payment webhook endpoint paths | `/api/v1/payments/webhook/paymob`, `/api/v1/payments/webhook/fawry` (`seq-payment-wallet.puml`) | `/webhooks/paymob`, `/webhooks/fawry` (current `payment.controller.ts`) | Align to diagram paths in Sprint 5. |
| D-6 | Dispute endpoint path | `POST /api/v1/bookings/{id}/dispute` (`seq-dispute-resolution.puml`) | Not implemented | Add in Sprint 6. |
| D-7 | Admin intervene endpoint | `POST /api/v1/admin/bookings/{id}/intervene` (`seq-dispute-resolution.puml`) | Not implemented | Add in Sprint 6. |
| D-8 | SOS endpoint path | `POST /api/v1/requests/sos` (`seq-sos-emergency.puml`) | Planned in booking controller | Confirm path in Sprint 2. |
| D-9 | Booking status terminal states | `DISPUTE_REFUNDED`, `DISPUTE_REJECTED` → `CLOSED` (`seq-dispute-resolution.puml`) | Not in `BookingStatus` enum (`common/enums/index.ts`) — only `DISPUTE` exists | **Add `DISPUTE_REFUNDED` and `DISPUTE_REJECTED` to enum** in Sprint 6. |
| D-10 | Select offer endpoint | `POST /api/v1/requests/{id}/select-offer` (`seq-booking-overall.puml`) | Planned as `POST /offers/:id/accept` in roadmap Section 4.4 | **Align to diagram**: use `POST /requests/:id/select-offer`. Update roadmap. |
| D-11 | Nurse confirm booking endpoint | `POST /api/v1/nurse/bookings/{id}/confirm` (`seq-booking-overall.puml`) | Planned as `POST /bookings/:id/status` | Add dedicated confirm endpoint in Sprint 2. |
| D-12 | Cancellation endpoint | `POST /api/v1/nurse/bookings/{id}/cancel` + `POST /api/v1/requests/{id}/cancel` (`seq-cancellation-reassign.puml`) | Planned as `POST /bookings/:id/cancel` | Split into role-specific cancel endpoints per diagram. |
| D-13 | Withdrawal endpoint | `POST /api/v1/nurse/wallet/withdraw` (`seq-payment-wallet.puml`) | Planned same | Aligned. |
| D-14 | Admin verify nurse endpoint | `POST /api/v1/admin/nurses/{id}/verify` (`seq-nurse-onboarding.puml`) | Planned same | Aligned. |

### 12.5 Diagram-Informed Endpoint Corrections to Roadmap Section 4

The following endpoint paths from sequence diagrams take precedence over the preliminary paths in Section 4:

| Module | Roadmap Section 4 Path (old) | Diagram Path (authoritative) | Action |
|--------|------------------------------|------------------------------|--------|
| booking | `POST /offers/:id/accept` | `POST /requests/:id/select-offer` | Replace |
| booking | `POST /bookings/:id/status` | `POST /nurse/bookings/:id/confirm` + `PUT /bookings/:id/status` (lifecycle) | Split |
| booking | `POST /bookings/:id/cancel` | `POST /nurse/bookings/:id/cancel` + `POST /requests/:id/cancel` | Split by role |
| booking | (missing) | `POST /bookings/:id/dispute` | Add (S6) |
| admin | (missing) | `POST /admin/bookings/:id/intervene` | Add (S6) |
| payment | `/webhooks/paymob` | `/payments/webhook/paymob` | Align |
| payment | `/webhooks/fawry` | `/payments/webhook/fawry` | Align |
| upload | (5MB docs / 2MB photos) | 10MB per diagram | Update limit |

### 12.6 Diagrams to Create (Missing)

The existing diagrams cover the core flows. The following additional diagrams are recommended for completeness but are **not blocking** for implementation:

| Diagram | Flow | Priority |
|---------|------|----------|
| `seq-chat-messaging.puml` | Socket.IO message send/receive/read | Medium (S4) |
| `seq-notifications-fcm.puml` | Event → notification → FCM + socket emit | Low (S3) |
| `seq-token-refresh.puml` | 401 intercept → refresh → retry | Low (auth done) |
| `seq-admin-login-2fa.puml` | Admin login + TOTP verify | Low (auth done) |
| `usecase-analytics.puml` | Analytics-specific use cases | Low (S7) |
| `seq-audit-log.puml` | Interceptor → audit log write | Low (S6) |

---

## 13. References

- `docs/Nabdh_Platform_BRD_PRD_System_Design.md` v1.4 — source of truth
- `diagrams/usecase/*.puml` — 4 use case diagrams (overall, patient, nurse, admin)
- `diagrams/sequence/*.puml` — 8 sequence diagrams (registration, onboarding, booking, scheduled, SOS, cancellation, payment, dispute)
- `AUTH_API.md` — auth API spec for Flutter team (existing)
- `DOCKER_SETUP.md` — Docker instructions (existing)
- `BACKEND_AGENT_CONTEXT.md` — full C1–C19 decision log (referenced in BRD)

---

*End of Roadmap — Nabdh Backend*
