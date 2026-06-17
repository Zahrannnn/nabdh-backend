# Nabdh Platform — Backend Agent Context File

> **Version:** 1.3  
> **Last Updated:** June 17, 2026  
> **Audience:** Backend AI agent, backend developer, tech lead  
> **Purpose:** Single source of truth for planning, scaffolding, and implementing the Nabdh backend.  
> **Companion file:** `BACKEND_AGENT_PROMPT.md` (bootstrap/scaffold task only)

---

## How to Use This File

1. **Attach or paste this entire file** at the start of every backend agent session.
2. Treat decisions in **Section 4 (v1.2 Decision Log)** as authoritative over older draft text.
3. When implementing a feature, cross-reference: **Module ownership → API → ERD → Events → Sequence diagram**.
4. Do **not** invent business rules not listed here. If ambiguous, flag and ask.
5. All monetary values are **EGP**. All users are **Egypt-only**.

---

## 1. Product Summary


| Field                 | Value                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------- |
| **Product**           | Nabdh — real-time healthcare marketplace                                                 |
| **Model**             | Uber-like dispatch: patient requests → nurses bid → patient selects → visit → pay → rate |
| **Geography**         | **Egypt only** (launch: Greater Cairo — Cairo & Giza)                                    |
| **Currency**          | EGP                                                                                      |
| **Language**          | Arabic UI only, full RTL (backend returns Arabic error messages where user-facing)       |
| **Users**             | Patient, Nursing Professional (ممرض / ممرضة), Admin, Super Admin                         |
| **North Star Metric** | Completed visits per month                                                               |
| **Document Version**  | 1.2 (June 15, 2026)                                                                      |


### Vision

> Make quality home nursing care accessible to every household in Egypt within minutes, powered by technology that respects healthcare standards and empowers nursing professionals.

### Product Principles (affect backend design)

- **Safety First** — verification gates, SOS priority, audit trails
- **Real-Time by Default** — WebSocket for offers, tracking, chat; push < 5s
- **Arabic-Native** — not translated; RTL-aware API responses for user messages
- **Trust through Transparency** — wallet ledger, visible commission, credential verification
- **Nurse Empowerment** — nurses set their own price offers; platform is marketplace not employer

### Terminology


| Term                             | Meaning                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------- |
| **Nurse / Nursing Professional** | Gender-neutral technical term for supply-side licensed provider (male ممرض or female ممرضة) |
| **Service Request**              | Patient's ask for a nursing visit (before nurse is selected)                                |
| **Offer**                        | Nurse's bid (price + ETA) on a request                                                      |
| **Booking**                      | Confirmed assignment after patient selects an offer                                         |
| **GMV**                          | Gross Merchandise Value — total transaction value                                           |
| **Take Rate**                    | Platform commission % of GMV                                                                |


---

## 2. Team & Repositories


| Role             | Count | Repo                                                                             |
| ---------------- | ----- | -------------------------------------------------------------------------------- |
| Backend          | 1     | `nabdh-backend` — **modular monolith** (single NestJS app)                         |
| Flutter          | 1     | `nabdh-mobile` (TBD — single codebase, role switching or separate apps TBD)      |
| Frontend (Admin) | 1     | `nabdh-admin` (TBD — React/Next.js)                                              |
| UI/UX            | 1     | Figma → feeds mobile + admin                                                     |
| AI               | 1     | Algorithmic modules inside backend (scoring, pricing, cron jobs — not ML in MVP) |
| Tech Lead        | 1     | Architecture, code review, sprint planning                                       |


**Git branching:** `main` (production) ← `develop` (integration) ← `feature/`*  
**Sprint cadence:** 2 weeks × 8 sprints = 16 weeks MVP

---

## 3. Business Model & KPIs

### Revenue

- **Primary:** Commission on completed visits — **configurable per service type** (typical 15–20%)
- **SOS:** Same commission rate; platform sets price at **1.5× 30-day average market price** for that service type
- Patient pays nurse's offer price (standard) or platform SOS price (emergency)

```
Patient Pays: EGP 300
  → Commission (e.g. 17.5%): EGP 52.50 → Platform Revenue
  → Nurse Receives: EGP 247.50 → Nurse Wallet
```

### Year 1 Targets


| KPI                     | Target       |
| ----------------------- | ------------ |
| Registered patients     | 50,000       |
| Verified active nurses  | 2,000        |
| Completed visits/month  | 10,000       |
| Monthly GMV             | EGP 5M       |
| Average nurse rating    | ≥ 4.5/5      |
| Cancellation rate       | < 8%         |
| Request-to-first-offer  | < 3 minutes  |
| SOS acceptance time     | < 60 seconds |
| SOS completion rate     | > 95%        |
| Visit completion rate   | > 92%        |
| In-app payment adoption | > 30%        |


### Unit Economics (Month 12 target)


| Metric           | Value             |
| ---------------- | ----------------- |
| AOV              | EGP 350           |
| Commission       | EGP 61.25 (17.5%) |
| Gross margin/txn | EGP 52.50         |
| LTV (8 visits)   | EGP 490           |
| CAC              | EGP 80            |
| LTV:CAC          | 6.1×              |


---

## 4. v1.2 Decision Log (AUTHORITATIVE)

These override any conflicting text elsewhere:


| ID      | Topic                | Decision                                                                                                                         |
| ------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **C1**  | Commission rate      | Admin-configurable **per service type** via Super Admin. Typical 15–20%.                                                         |
| **C2**  | SOS pricing          | **1.5×** average market price from last 30 days of completed bookings. Fallback: service base price mid-point.                   |
| **C3**  | Cash commission      | Nurse must maintain **min EGP 100 prepaid balance** to go online. Auto-debited per cash visit. Top-up: Vodafone Cash / InstaPay. |
| **C4**  | Gender filter        | Patient selects **Female / Male / No preference** on request. Gender badge on offer cards.                                       |
| **C5**  | Patient cancellation | **Free** before nurse confirms (`status < NURSE_CONFIRMED`). After confirm: fee in Phase 2; MVP shows warning only.              |
| **C6**  | Nurse cancel reasons | (1) Personal emergency, (2) Too far, (3) Outside specialization, (4) Transportation issue, (5) Other + free text                 |
| **C7**  | Withdrawals          | Vodafone Cash, Etisalat Cash / WE Pay, InstaPay. Manual processing 1–3 business days. Min EGP 100.                               |
| **C8**  | Verification SLA     | **72 hours** (3 business days). Admin nudge at 48h.                                                                              |
| **C9**  | License expiry       | Warn at **30 days** and **7 days**. Auto-suspend on expiry date. Re-upload + re-approve to restore.                              |
| **C10** | Booking concurrency  | **One active booking per 3-hour window** per nurse. Cannot go online with active booking.                                        |
| **C11** | SOS service type     | **No service selection.** Free-text description only (max 300 chars, optional).                                                  |
| **C12** | Dispute refund       | Admin rules for patient → refund **deducted from nurse wallet**. Debt entry if insufficient balance.                             |
| **C13** | password_hash        | **NULL** for Patient/Nurse (OTP-only). Set for Admin (email + password + 2FA).                                                   |
| **C14** | Scheduled bookings   | **In MVP.** Book 2h–7d ahead. Broadcast **30 min before** scheduled time. Free cancel up to 1h before.                           |
| **C15** | Review editing       | Patient can edit review within **24 hours** of submission.                                                                       |
| **C16** | Data deletion        | **Anonymization** within 30 days. Transaction records retained. Dedicated API endpoint.                                          |
| **C17** | Minimum offers       | **1 offer is enough** — patient can select immediately.                                                                          |
| **C18** | In-app support       | **No dedicated support channel in MVP.** Disputes via booking dispute flow.                                                      |
| **C19** | Nurse cancel rate    | Rate > **15%** → admin alert only in MVP (no auto-suspension).                                                                   |
| **C20** | Architecture         | **Modular Monolith** — single NestJS deployable, domain modules inside one app. No microservices in MVP.                         |


---

## 5. Modular Monolith Architecture

### Overview

One **NestJS application** on port **3000**. Domain logic split into **modules** with strict boundaries — not separate deployments.

```
┌─────────────────────────────────────────────────────────────┐
│                    nabdh-api  (:3000)                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐ │
│  │  auth   │ │  users  │ │ booking │ │ payment │ │location│ │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └────────┘ │
│  ┌─────────┐ ┌──────────────┐ ┌───────┐ ┌───────────┐      │
│  │  chat   │ │ notifications│ │ admin │ │ analytics │      │
│  └─────────┘ └──────────────┘ └───────┘ └───────────┘      │
│  common/ · config/ · health/ · events/ · database/          │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
         PostgreSQL                  MinIO/S3
        (+ PostGIS)              (documents)
```

### Domain Modules


| Module            | Route prefix (examples)                 | Owns                                                                                  |
| ----------------- | --------------------------------------- | ------------------------------------------------------------------------------------- |
| **auth**          | `/api/v1/auth/*`                        | OTP, JWT, sessions, guards                                                            |
| **users**         | `/api/v1/patient/*`, `/api/v1/nurse/*`  | Patients, nurses, addresses, documents, verification, license cron                    |
| **booking**       | `/api/v1/requests/*`, `/api/v1/bookings/*` | Requests, offers, bookings, SOS, scheduled, ratings, disputes, state machine       |
| **payment**       | `/api/v1/payments/*`, wallet routes     | Paymob, Fawry, wallet, ledger, commission, withdrawals                                |
| **location**      | tracking endpoints                      | Nurse GPS, PostGIS, ETA, location history                                             |
| **chat**          | WebSocket `/api/v1/realtime`            | Messages, Socket.io rooms                                                             |
| **notifications** | `/api/v1/notifications/*`               | FCM, SMS, in-app notifications                                                        |
| **admin**         | `/api/v1/admin/*`                       | Dashboard, disputes, audit logs, commission config, SOS monitor                       |
| **analytics**     | internal                                | Metrics, reports (stub)                                                               |


### Module Boundary Rules

1. Cross-module calls via **exported NestJS providers only** — never import internal files
2. Controllers are thin; logic in `*.service.ts`
3. **Single Prisma schema** — tables tagged `// module: booking`
4. **No HTTP between modules** — inject services directly (same process)
5. Modules can be extracted to microservices later by swapping DI for HTTP

### Communication Patterns


| Type        | Technology                     | Use Case                                   |
| ----------- | ------------------------------ | ------------------------------------------ |
| Sync        | NestJS DI (service injection)  | `BookingService` injects `UsersService`    |
| In-process  | `@nestjs/event-emitter`        | Side effects: notify, log, analytics       |
| Async       | PostgreSQL `OutboxEvent` + cron | Reliable background delivery              |
| Real-time   | Socket.io (chat module)        | Offers, tracking, chat                       |
| Scheduled   | `@nestjs/schedule`             | License expiry, scheduled bookings, outbox |


> **No Redis. No microservices.** OTP, sessions, rate limits in PostgreSQL.

### Database Strategy

- **Single PostgreSQL 16** database `nabdh` with **PostGIS**
- **Single `prisma/schema.prisma`** — all models, grouped by module comments
- Foreign keys allowed (same database)
- `OutboxEvent` model for async domain events

---

## 6. Tech Stack (Backend)


| Layer        | Technology                                           |
| ------------ | ---------------------------------------------------- |
| Architecture | **Modular Monolith** — single NestJS deployable      |
| Runtime      | Node.js 20 LTS                                       |
| Language     | TypeScript 5.x (strict)                              |
| Framework    | NestJS 10+                                           |
| ORM          | Prisma — single schema                               |
| Validation   | class-validator + class-transformer                  |
| API Docs     | @nestjs/swagger at `/api/docs`                       |
| Testing      | Jest + Supertest                                     |
| Linting      | ESLint + Prettier + Husky + lint-staged + commitlint |
| Logging      | Winston (structured JSON)                            |
| Real-time    | Socket.io via `@nestjs/websockets` (chat module)     |
| Events       | EventEmitter + PostgreSQL outbox (`src/events/`)     |
| Scheduled    | `@nestjs/schedule`                                   |
| File storage | MinIO (dev) / AWS S3 (prod)                          |
| CI/CD        | GitHub Actions + Docker (single `nabdh-api` image)   |
| Cloud (prod) | ECS Fargate (1 service), RDS PostgreSQL, S3, ALB     |
| Region       | `me-south-1` (Bahrain — closest to Egypt)            |


### Maps & Routing (consumed by location module)


| Component           | Technology                                   |
| ------------------- | -------------------------------------------- |
| Map tiles           | OpenStreetMap or Mapbox                      |
| Geocoding           | Nominatim or Mapbox                          |
| Routing/ETA         | OSRM or Mapbox Directions                    |
| Nurse search radius | 15 km standard (expandable to 30), 20 km SOS |


---

## 7. Domain Model & ERD

### Core Entities


| Entity                | Owner Module | Key Fields                                                                                                                                                      |
| --------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **User**              | auth + user   | `id`, `phone`, `password_hash` (admin only), `type`, `status`, `created_at`                                                                                     |
| **Patient**           | user          | `user_id`, `full_name`, `gender`, `date_of_birth`, `photo_url`                                                                                                  |
| **Nurse**             | user          | `user_id`, `full_name`, `gender`, `license_number`, `license_expiry_date`, `verification_status`, `avg_rating`, `is_online`, `current_lat`, `current_lng`       |
| **NurseDocument**     | user          | `nurse_id`, `type` (ID/LICENSE/PHOTO), `file_url`, `status`                                                                                                     |
| **Address**           | user          | `user_id`, `label`, `governorate`, `city`, `street`, `lat`, `lng`, `notes`                                                                                      |
| **Service**           | admin         | `name_ar`, `description_ar`, `icon`, `base_price_min`, `base_price_max`, `duration_minutes`, `status`, `commission_rate`                                        |
| **ServiceRequest**    | booking       | `patient_id`, `service_id` (nullable for SOS), `type`, `status`, `gender_preference`, `notes`, `sos_description`, `lat`, `lng`, `scheduled_for`, `broadcast_at` |
| **Offer**             | booking       | `request_id`, `nurse_id`, `price`, `eta_minutes`, `status`, `relevance_score`                                                                                   |
| **Booking**           | booking       | `request_id`, `patient_id`, `nurse_id`, `offer_id`, `status`, `en_route_at`, `arrived_at`, `visit_started_at`, `visit_completed_at`                             |
| **Payment**           | payment       | `booking_id`, `amount`, `method`, `provider`, `status`, `provider_reference`                                                                                    |
| **Wallet**            | payment       | `nurse_id`, `available_balance`, `prepaid_balance`, `pending_balance`, `total_earned`, `total_commission`                                                       |
| **WalletTransaction** | payment       | `wallet_id`, `type`, `amount`, `reference_type`, `reference_id`, `description`                                                                                  |
| **ChatMessage**       | chat          | `booking_id`, `sender_id`, `content`, `status`, `sent_at`, `delivered_at`                                                                                       |
| **Rating**            | booking       | `booking_id`, `rater_id`, `ratee_id`, `score`, `review_text`, `editable_until`                                                                                  |
| **Notification**      | notification  | `user_id`, `type`, `title`, `body`, `data`, `read_at`                                                                                                           |
| **LocationHistory**   | location      | `nurse_id`, `booking_id`, `lat`, `lng`, `speed`, `recorded_at`                                                                                                  |
| **AuditLog**          | admin         | `actor_id`, `action`, `resource_type`, `resource_id`, `details`, `ip`, `timestamp`                                                                              |
| **OtpSession**        | auth          | `phone`, `code_hash`, `expires_at`, `attempts`                                                                                                                  |
| **RefreshToken**      | auth          | `user_id`, `token_hash`, `expires_at`, `revoked_at`                                                                                                             |


### Key Enums

```typescript
enum UserType { PATIENT = 'PATIENT', NURSE = 'NURSE', ADMIN = 'ADMIN' }
enum UserStatus { ACTIVE = 'ACTIVE', SUSPENDED = 'SUSPENDED', BANNED = 'BANNED', DELETED = 'DELETED' }
enum VerificationStatus { INCOMPLETE = 'INCOMPLETE', PENDING = 'PENDING', APPROVED = 'APPROVED', REJECTED = 'REJECTED' }
enum Gender { MALE = 'MALE', FEMALE = 'FEMALE' }
enum GenderPreference { MALE = 'MALE', FEMALE = 'FEMALE', NO_PREFERENCE = 'NO_PREFERENCE' }
enum RequestType { STANDARD = 'STANDARD', SOS = 'SOS', SCHEDULED = 'SCHEDULED' }
enum OfferStatus { PENDING = 'PENDING', ACCEPTED = 'ACCEPTED', DECLINED = 'DECLINED', EXPIRED = 'EXPIRED' }
enum PaymentMethod { CASH = 'CASH', CARD = 'CARD', FAWRY = 'FAWRY' }
enum PaymentStatus { PENDING = 'PENDING', COMPLETED = 'COMPLETED', FAILED = 'FAILED', REFUNDED = 'REFUNDED' }
enum WalletTransactionType {
  CREDIT = 'CREDIT', COMMISSION = 'COMMISSION', WITHDRAWAL = 'WITHDRAWAL',
  PREPAID_TOPUP = 'PREPAID_TOPUP', PREPAID_DEBIT = 'PREPAID_DEBIT',
  REFUND_DEDUCTION = 'REFUND_DEDUCTION', DEBT = 'DEBT'
}
enum DocumentType { NATIONAL_ID = 'NATIONAL_ID', NURSING_LICENSE = 'NURSING_LICENSE', PROFILE_PHOTO = 'PROFILE_PHOTO' }
```

### Booking Status State Machine

```
PENDING_OFFERS → OFFER_RECEIVED → NURSE_SELECTED → NURSE_CONFIRMED
    → EN_ROUTE → ARRIVED → VISIT_STARTED → VISIT_COMPLETED
    → PAYMENT_PENDING → PAYMENT_COMPLETED → RATED → CLOSED

Branches:
  → CANCELLED_BY_PATIENT
  → CANCELLED_BY_NURSE → (reassignment) → PENDING_OFFERS
  → REASSIGNMENT
  → EXPIRED (no offers / timeout)
  → DISPUTE → DISPUTE_REFUNDED / DISPUTE_RESOLVED
  → SCHEDULED_PENDING → (at broadcast_at) → PENDING_OFFERS
```


| Status                 | Description                | Trigger                            |
| ---------------------- | -------------------------- | ---------------------------------- |
| `PENDING_OFFERS`       | Waiting for nurse offers   | Request created / broadcast        |
| `OFFER_RECEIVED`       | ≥1 offer submitted         | Nurse submits offer                |
| `NURSE_SELECTED`       | Patient chose a nurse      | Patient selects offer              |
| `NURSE_CONFIRMED`      | Nurse confirmed assignment | Nurse confirms                     |
| `EN_ROUTE`             | Nurse navigating           | Nurse starts navigation            |
| `ARRIVED`              | Nurse at location          | Nurse marks arrived                |
| `VISIT_STARTED`        | Service in progress        | Nurse starts visit                 |
| `VISIT_COMPLETED`      | Service done               | Nurse completes visit              |
| `PAYMENT_PENDING`      | Awaiting payment           | Auto after completion              |
| `PAYMENT_COMPLETED`    | Paid                       | Payment confirmed                  |
| `RATED`                | Ratings submitted          | Both parties rate (or 72h timeout) |
| `CLOSED`               | Terminal                   | Auto-close                         |
| `CANCELLED_BY_PATIENT` | Patient cancelled          | Patient cancel action              |
| `CANCELLED_BY_NURSE`   | Nurse cancelled            | Nurse cancel + reason              |
| `REASSIGNMENT`         | Re-broadcasting            | System after nurse cancel          |
| `EXPIRED`              | Timed out                  | No offers within timeout           |
| `DISPUTE`              | Under review               | Patient/admin flags dispute        |
| `SCHEDULED_PENDING`    | Future booking waiting     | Scheduled request created          |


---

## 8. Business Rules by Domain

### 8.1 Authentication


| Rule               | Value                                          |
| ------------------ | ---------------------------------------------- |
| Patient/Nurse auth | OTP via SMS only                               |
| Admin auth         | Email + password + TOTP 2FA                    |
| OTP length         | 6 digits                                       |
| OTP expiry         | 5 minutes                                      |
| OTP max attempts   | 3 per session                                  |
| Access token TTL   | 15 minutes                                     |
| Refresh token TTL  | 7 days                                         |
| Phone format       | Egyptian mobile: `+20` or `01xxxxxxxxx`        |
| JWT payload        | `{ sub, type, role, nurse_status?, iat, exp }` |


### 8.2 Nurse Verification & Onboarding

**Required documents:** National ID, Nursing License, Profile Photo (max 10MB each; images/PDF)

**Flow:** Register (OTP) → Upload docs → Complete profile → `verification_status = PENDING` → Admin reviews within 72h → APPROVED or REJECTED

**On approval:** Store `license_expiry_date`, `verified_at`. Nurse can go online.

**License expiry cron (daily):**

- 30 days before → warning notification
- 7 days before → urgent warning
- On expiry date → `is_online = false`, block toggle, suspend from requests

**Go online requirements:**

- `verification_status = APPROVED`
- `license_expiry_date > today`
- `prepaid_balance >= 100` (payment-service check)
- No active booking in current 3-hour window

### 8.3 Standard Request & Matching

1. Patient selects service, address, optional notes, optional gender preference
2. Validate: no active booking for patient
3. Create request → `PENDING_OFFERS`
4. Location-service: find online verified nurses within **15 km** (expand to 30 if < 3 matches)
5. Filter by gender preference if set
6. Broadcast push to matching nurses
7. Nurses submit offers (price + ETA)
8. **Offer ranking formula:**
  ```
   score = rating × 0.4 + (1/price_norm) × 0.3 + (1/eta_norm) × 0.3
  ```
9. Patient sees offers in real-time (WebSocket `offer:new`)
10. **1 offer is sufficient** — patient can select immediately
11. Timeout: **10 minutes** with no offers → `EXPIRED`

### 8.4 SOS Emergency Flow


| Aspect            | Standard                       | SOS                                            |
| ----------------- | ------------------------------ | ---------------------------------------------- |
| Trigger           | Request Service button         | SOS button + confirmation                      |
| Service type      | Selected from catalog          | **Free-text description only** (max 300 chars) |
| Matching          | Broadcast → Offers → Selection | **First accept wins**                          |
| Radius            | 15 km (→ 30)                   | 20 km (→ 30)                                   |
| Timeout           | 10 minutes                     | **2 minutes**                                  |
| Pricing           | Nurse sets in offer            | **Platform: 1.5× 30-day avg market price**     |
| Priority          | Normal push                    | Critical push + distinct sound                 |
| Location interval | 5 seconds                      | **3 seconds**                                  |
| Rate limit        | —                              | Max **1 SOS per 15 minutes** per patient       |
| Admin             | Standard dashboard             | **Dedicated SOS monitor**                      |


### 8.5 Scheduled Bookings (MVP)


| Rule              | Value                                                                            |
| ----------------- | -------------------------------------------------------------------------------- |
| Min lead time     | 2 hours from now                                                                 |
| Max lead time     | 7 days from now                                                                  |
| Initial status    | `SCHEDULED_PENDING`                                                              |
| Broadcast trigger | `broadcast_at = scheduled_for - 30 minutes`                                      |
| Cron              | Every minute: find due scheduled requests → set `PENDING_OFFERS` → standard flow |
| Patient cancel    | Free if ≥ 1 hour before `scheduled_for`                                          |
| Reminder          | Push to both parties 15 minutes before `scheduled_for`                           |


### 8.6 Visit Lifecycle & Tracking

- Nurse updates: `EN_ROUTE` → `ARRIVED` → `VISIT_STARTED` → `VISIT_COMPLETED`
- Location updates via WebSocket: nurse → location module → patient map (same process)
- Chat enabled only during active booking (from `NURSE_CONFIRMED` to `CLOSED`)
- Auto-close booking after **72 hours** if no rating submitted

### 8.7 Cancellation

**Patient:**

- Free cancel when `status < NURSE_CONFIRMED`
- After confirm: MVP shows warning, no fee; Phase 2 adds cancellation fee

**Nurse:**

- Can cancel when status ∈ `{NURSE_CONFIRMED, EN_ROUTE, ARRIVED}`
- Must select predefined reason (+ free text for "Other")
- Triggers reassignment: reset request to `PENDING_OFFERS`, exclude cancelling nurse
- Track cancellation rate; alert admin if > **15%** (no auto-action in MVP)

### 8.8 Payments & Wallet

**Methods:** Cash, Card (Paymob), Fawry

**Commission:**

- Rate from `Service.commission_rate` (Super Admin configurable per service type)
- Calculated on `VISIT_COMPLETED` + payment confirmed

**Cash flow:**

- Nurse collects full amount in cash from patient
- Platform commission debited from nurse `prepaid_balance`
- If insufficient prepaid: create debt entry, alert nurse + admin
- Nurse cannot go online if `prepaid_balance < 100`

**In-app flow:**

- Paymob: SDK/iframe → webhook `POST /api/v1/payments/webhook/paymob`
- Fawry: reference number → webhook `POST /api/v1/payments/webhook/fawry`
- On success: credit nurse wallet (amount - commission)

**Ledger:** Double-entry bookkeeping for every transaction


| Transaction          | Debit            | Credit            |
| -------------------- | ---------------- | ----------------- |
| Patient pays EGP 300 | Patient Payment  | Platform Holding  |
| Commission 15%       | Platform Holding | Platform Revenue  |
| Nurse credit         | Platform Holding | Nurse Wallet      |
| Withdrawal           | Nurse Wallet     | Bank Transfer Out |


**Withdrawal:**

- Methods: Vodafone Cash, Etisalat Cash / WE Pay, InstaPay
- Minimum: EGP 100
- Processing: 1–3 business days (manual admin approval in MVP)

### 8.9 Ratings & Reviews

- Both patient and nurse rate 1–5 stars after visit
- Optional text review
- Patient can **edit review within 24 hours** (`editable_until` timestamp)
- Update nurse `avg_rating` on new/edit (exclude outliers in Phase 2)
- Reviews locked after 24h (admin removal only)

### 8.10 Disputes (MVP — basic)

- Patient initiates via `POST /api/v1/bookings/:id/dispute` within 72h of completion
- Sets booking `DISPUTE`, freezes payment if in-app
- Admin reviews: chat history, GPS trail, timestamps
- If patient favored: refund **deducted from nurse wallet** (debt if insufficient)
- No dedicated support chat in MVP

### 8.11 Data Deletion (Compliance)

- `DELETE /api/v1/users/me` or role-specific endpoint
- **Anonymize** PII within 30 days: name → "Deleted User", phone → hash, photos → deleted
- Retain transaction/booking records for legal/compliance
- Egyptian Data Protection Law alignment

---

## 9. API Catalog

**Base URL:** `http://localhost:3000/api/v1` (gateway)  
**Auth header:** `Authorization: Bearer <access_token>`  
**Versioning:** URL-based `/api/v1/`

### 9.1 Auth


| Method | Endpoint           | Description              |
| ------ | ------------------ | ------------------------ |
| POST   | `/auth/otp/send`   | Send OTP to phone        |
| POST   | `/auth/otp/verify` | Verify OTP → JWT pair    |
| POST   | `/auth/refresh`    | Refresh access token     |
| POST   | `/auth/logout`     | Invalidate refresh token |


### 9.2 Patient


| Method              | Endpoint                     | Description                       |
| ------------------- | ---------------------------- | --------------------------------- |
| GET/PUT             | `/patient/profile`           | Profile CRUD                      |
| GET/POST/PUT/DELETE | `/patient/addresses`         | Address CRUD                      |
| GET                 | `/services`                  | List active services              |
| POST                | `/requests`                  | Create standard/scheduled request |
| POST                | `/requests/sos`              | Create SOS request                |
| GET                 | `/requests/:id/offers`       | List offers                       |
| POST                | `/requests/:id/select-offer` | Select nurse offer                |
| POST                | `/requests/:id/cancel`       | Cancel request                    |
| GET                 | `/bookings`                  | List bookings                     |
| GET                 | `/bookings/:id`              | Booking detail                    |
| GET                 | `/bookings/:id/tracking`     | Nurse live location               |
| POST                | `/bookings/:id/rate`         | Rate nurse                        |
| GET/POST            | `/bookings/:id/chat`         | Chat messages                     |
| POST                | `/bookings/:id/dispute`      | Open dispute                      |
| GET                 | `/notifications`             | List notifications                |
| DELETE              | `/patient/account`           | Request account deletion          |


### 9.3 Nurse


| Method  | Endpoint                      | Description                |
| ------- | ----------------------------- | -------------------------- |
| GET/PUT | `/nurse/profile`              | Profile CRUD               |
| POST    | `/nurse/documents`            | Upload verification doc    |
| PUT     | `/nurse/availability`         | Toggle online/offline      |
| PUT     | `/nurse/location`             | Update GPS (REST fallback) |
| GET     | `/nurse/requests`             | Available requests         |
| POST    | `/nurse/offers`               | Submit offer               |
| POST    | `/nurse/bookings/:id/confirm` | Confirm assignment         |
| PUT     | `/nurse/bookings/:id/status`  | Update visit status        |
| POST    | `/nurse/bookings/:id/cancel`  | Cancel with reason         |
| POST    | `/nurse/bookings/:id/rate`    | Rate patient               |
| GET     | `/nurse/wallet`               | Wallet balance             |
| GET     | `/nurse/wallet/transactions`  | Transaction history        |
| POST    | `/nurse/wallet/withdraw`      | Request withdrawal         |
| POST    | `/nurse/wallet/topup`         | Top up prepaid balance     |
| GET     | `/nurse/ratings`              | Ratings received           |
| GET     | `/nurse/earnings`             | Earnings analytics         |


### 9.4 Admin


| Method              | Endpoint                        | Description                              |
| ------------------- | ------------------------------- | ---------------------------------------- |
| POST                | `/admin/auth/login`             | Email + password → 2FA challenge         |
| POST                | `/admin/auth/2fa/verify`        | Complete 2FA → JWT                       |
| GET                 | `/admin/nurses/pending`         | Verification queue                       |
| POST                | `/admin/nurses/:id/verify`      | Approve/reject nurse                     |
| GET                 | `/admin/users`                  | List users (filter by type)              |
| PUT                 | `/admin/users/:id/status`       | Suspend/ban                              |
| GET                 | `/admin/bookings`               | All bookings                             |
| POST                | `/admin/bookings/:id/intervene` | Dispute resolution / refund              |
| GET/POST/PUT/DELETE | `/admin/services`               | Service catalog CRUD                     |
| PUT                 | `/admin/config/commission`      | Set commission per service (Super Admin) |
| GET                 | `/admin/analytics/dashboard`    | Dashboard metrics                        |
| GET                 | `/admin/financial/summary`      | Financial overview                       |
| GET                 | `/admin/audit-logs`             | Audit trail                              |
| GET                 | `/admin/sos/active`             | Active SOS monitor                       |


### 9.5 Payments (internal + webhooks)


| Method | Endpoint                   | Description                |
| ------ | -------------------------- | -------------------------- |
| POST   | `/payments/initiate`       | Start Paymob/Fawry payment |
| POST   | `/payments/webhook/paymob` | Paymob callback            |
| POST   | `/payments/webhook/fawry`  | Fawry callback             |
| POST   | `/payments/cash/record`    | Record cash payment        |


### 9.6 Standard Error Response

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": ["phone must be a valid Egyptian mobile number"],
  "timestamp": "2026-06-17T12:00:00.000Z",
  "path": "/api/v1/auth/otp/send",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 9.7 Pagination

```
GET /resource?page=1&limit=20&sort=-created_at
```

```json
{
  "data": [],
  "meta": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 }
}
```

---

## 10. WebSocket Events

**Namespace:** `/api/v1/realtime` (via gateway → chat-service + booking events)


| Event                    | Direction        | Payload Keys                                             | Description                |
| ------------------------ | ---------------- | -------------------------------------------------------- | -------------------------- |
| `request:new`            | Server → Nurse   | `requestId`, `serviceName`, `distance`, `type`           | New request available      |
| `offer:new`              | Server → Patient | `offerId`, `nurseId`, `price`, `eta`, `rating`, `gender` | New offer received         |
| `offer:selected`         | Server → Nurse   | `bookingId`, `requestId`                                 | Patient selected you       |
| `offer:declined`         | Server → Nurse   | `requestId`                                              | Another nurse was selected |
| `booking:status_changed` | Server → Both    | `bookingId`, `status`, `timestamp`                       | Lifecycle update           |
| `location:update`        | Nurse → Server   | `lat`, `lng`, `heading`, `speed`                         | GPS update                 |
| `location:nurse_update`  | Server → Patient | `lat`, `lng`, `eta`                                      | Map update                 |
| `chat:send`              | Client → Server  | `bookingId`, `content`                                   | Send message               |
| `chat:message`           | Server → Client  | `messageId`, `senderId`, `content`, `sentAt`             | New message                |
| `chat:delivered`         | Server → Client  | `messageId`                                              | Delivery confirmation      |
| `sos:assigned`           | Server → Patient | `nurseId`, `name`, `eta`                                 | SOS nurse assigned         |
| `sos:alert`              | Server → Admin   | `requestId`, `patientId`, `location`                     | SOS monitor                |
| `notification:new`       | Server → Client  | `title`, `body`, `data`                                  | Generic push               |


---

## 11. Domain Events (In-Process + Outbox)

Defined in `src/events/`. Each event has: `eventId`, `eventType`, `timestamp`, `correlationId`, `payload`, `idempotencyKey`.

**Delivery mechanisms:**

1. **In-process** — `@nestjs/event-emitter` listeners in consumer modules
2. **PostgreSQL outbox** — `OutboxEvent` Prisma model; `OutboxProcessor` cron polls and dispatches

**No Redis. No inter-module HTTP.**


| Event                       | Producer Module | Consumer Module(s)                | Trigger                         |
| --------------------------- | -------- | --------------------------------- | ------------------------------- |
| `request.created`           | booking  | location, notifications         | Standard request submitted      |
| `request.sos.created`       | booking  | location, notifications, admin  | SOS triggered                   |
| `request.scheduled.created` | booking  | analytics                         | Scheduled request saved         |
| `request.broadcast`         | booking  | notifications                     | Scheduled broadcast triggered   |
| `offer.submitted`           | booking  | notifications                     | Nurse submits offer             |
| `offer.selected`            | booking  | notifications, payment            | Patient selects offer           |
| `booking.status.changed`    | booking  | notifications, location, analytics | Any status transition        |
| `booking.completed`         | booking  | payment, analytics                | Visit completed                 |
| `booking.cancelled`         | booking  | notifications, analytics          | Cancel by either party          |
| `payment.completed`         | payment  | booking, notifications, analytics | Payment confirmed               |
| `payment.failed`            | payment  | notifications, admin              | Payment failure                 |
| `wallet.credited`           | payment  | notifications                     | Nurse wallet credited           |
| `wallet.prepaid.low`        | payment  | notifications, admin              | Prepaid balance below threshold |
| `nurse.verified`            | users    | notifications                     | Admin approves nurse            |
| `nurse.license.expiring`    | users    | notifications                     | 30d / 7d warning                |
| `nurse.license.expired`     | users    | booking, notifications            | Auto-suspend                    |
| `nurse.location.updated`    | location | booking                           | Active booking tracking         |
| `chat.message.sent`         | chat     | notifications                     | New chat message                |
| `rating.submitted`          | booking  | users, analytics                  | Rating saved                    |
| `dispute.opened`            | booking  | admin, notifications              | Dispute filed                   |
| `user.anonymized`           | users    | analytics                         | Account deleted                 |


---

## 12. Security & Permissions

### Security Layers


| Layer  | Measures                                                                  |
| ------ | ------------------------------------------------------------------------- |
| Client | Certificate pinning, secure token storage (Flutter)                       |
| Edge   | WAF, DDoS, rate limiting                                                  |
| API    | JWT validation, RBAC, input sanitization, CORS                            |
| Data   | AES-256 at rest, TLS 1.3 in transit, parameterized queries, audit logging |
| Admin  | IP allowlist (optional), 2FA mandatory, audit all actions                 |


### RBAC Permissions Matrix


| Feature               | Patient | Nurse (Pending) | Nurse (Verified) | Admin | Super Admin |
| --------------------- | ------- | --------------- | ---------------- | ----- | ----------- |
| Register/Login        | ✅       | ✅               | ✅                | ✅     | ✅           |
| Create Request        | ✅       | ❌               | ❌                | ❌     | ❌           |
| Trigger SOS           | ✅       | ❌               | ❌                | ❌     | ❌           |
| Receive Requests      | ❌       | ❌               | ✅                | ❌     | ❌           |
| Submit Offers         | ❌       | ❌               | ✅                | ❌     | ❌           |
| Toggle Availability   | ❌       | ❌               | ✅                | ❌     | ❌           |
| View Wallet           | ❌       | ❌               | ✅                | ✅     | ✅           |
| Chat (active booking) | ✅       | ❌               | ✅                | ❌     | ❌           |
| Rate/Review           | ✅       | ❌               | ✅                | ❌     | ❌           |
| Verify Nurses         | ❌       | ❌               | ❌                | ✅     | ✅           |
| Manage Users          | ❌       | ❌               | ❌                | ✅     | ✅           |
| View All Bookings     | ❌       | ❌               | ❌                | ✅     | ✅           |
| Financial Reports     | ❌       | ❌               | ❌                | ✅     | ✅           |
| Configure Commission  | ❌       | ❌               | ❌                | ❌     | ✅           |
| Manage Admins         | ❌       | ❌               | ❌                | ❌     | ✅           |
| Delete Own Account    | ✅       | ✅               | ✅                | ❌     | ❌           |


### Rate Limits (gateway)


| Endpoint      | Limit                    |
| ------------- | ------------------------ |
| Global        | 100 req/min per IP       |
| OTP send      | 3 per phone per 15 min   |
| SOS create    | 1 per patient per 15 min |
| Login (admin) | 5 per email per 15 min   |


---

## 13. Non-Functional Requirements


| ID      | Category     | Requirement             | Target                  |
| ------- | ------------ | ----------------------- | ----------------------- |
| NFR-001 | Performance  | API p95 latency         | < 200ms                 |
| NFR-002 | Performance  | Location update latency | < 2s                    |
| NFR-003 | Performance  | Push delivery           | < 5s                    |
| NFR-004 | Availability | Uptime                  | 99.9%                   |
| NFR-005 | Scalability  | Concurrent users        | 50,000+                 |
| NFR-006 | Scalability  | Active bookings         | 5,000+                  |
| NFR-007 | Security     | Encryption at rest      | AES-256                 |
| NFR-008 | Security     | Encryption in transit   | TLS 1.3                 |
| NFR-010 | Security     | OTP expiry              | 5 min                   |
| NFR-020 | Backup       | DB backup               | Daily, 30-day retention |


---

## 14. MVP Service Catalog (Seed Data)


| #   | Arabic Name   | English            | Duration   | Price Range (EGP) |
| --- | ------------- | ------------------ | ---------- | ----------------- |
| 1   | حقن           | Injection          | 15–30 min  | 100–200           |
| 2   | محاليل وريدية | IV Fluids          | 30–60 min  | 200–400           |
| 3   | قياس ضغط الدم | Blood Pressure     | 10–15 min  | 50–100            |
| 4   | قياس السكر    | Blood Sugar        | 10–15 min  | 50–100            |
| 5   | غيار جروح     | Wound Dressing     | 20–45 min  | 150–300           |
| 6   | زيارة تمريض   | Home Nursing Visit | 30–60 min  | 200–500           |
| 7   | رعاية مسنين   | Elderly Care       | 60–120 min | 300–800           |


---

## 15. Sprint Plan (Backend Focus)


| Sprint | Backend Deliverables                                                                                                               | Dependencies |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **S1** | NestJS scaffold, Docker, CI, `auth` + `users` modules (OTP stub, profile), global guards, Prisma schema                          | —            |
| **S2** | Nurse docs (MinIO), `admin` auth + verification, `notifications` stub (FCM), service catalog CRUD                                  | S1           |
| **S3** | `booking` module: request creation, PostGIS matching, offers, WebSocket events                                                    | S2           |
| **S4** | Booking state machine, nurse confirm, cancellation + reassignment                                                                  | S3           |
| **S5** | `location` tracking, `chat` module, scheduled booking cron                                                                       | S4           |
| **S6** | SOS flow, cash payment, prepaid balance, admin dashboard APIs                                                                      | S5           |
| **S7** | Paymob + Fawry, wallet + ledger, ratings, commission engine                                                                        | S6           |
| **S8** | Withdrawals, disputes, `analytics` stubs, audit logs, load testing, prod Docker                                                      | S7           |


**Milestone gates:**

- **Alpha (M2):** Auth + Services + Request + Offers in dev
- **Beta (M3):** Full booking + payments + tracking in staging
- **RC (M3.5):** All MVP + perf testing
- **Launch (M4):** Production + nurse onboarding

---

## 16. AI Developer Modules (MVP — lives in backend)

These are **algorithmic**, not ML, for MVP:


| Module                   | Location          | Description                                      |
| ------------------------ | ----------------- | ------------------------------------------------ |
| Offer scoring            | `booking`         | `rating×0.4 + price×0.3 + eta×0.3` normalization |
| Commission calculator    | `payment`         | Per-service rate lookup + ledger entries         |
| SOS pricing              | `booking`         | 1.5× rolling 30-day average                      |
| Prepaid balance guard    | `payment`         | Block go-online if < EGP 100                     |
| License expiry cron      | `users`           | Daily job: 30d/7d warnings + suspend             |
| Scheduled broadcast cron | `booking`         | Every minute: `broadcast_at <= now`              |
| Chat content filter      | `chat`            | Basic profanity/PII regex (optional MVP)         |
| Analytics aggregator     | `analytics`       | Outbox poller + daily rollup cron → PostgreSQL   |


---

## 17. External Integrations


| Provider                          | Purpose                                 | MVP Status                         | Webhook                         |
| --------------------------------- | --------------------------------------- | ---------------------------------- | ------------------------------- |
| **Paymob**                        | Card payments (Visa, MasterCard, Meeza) | S6–S7                              | `POST /payments/webhook/paymob` |
| **Fawry**                         | Cash at outlets / Fawry app             | S7                                 | `POST /payments/webhook/fawry`  |
| **FCM**                           | Push notifications                      | S2+                                | —                               |
| **SMS** (Vodafone Egypt / Twilio) | OTP delivery                            | S1 (stub → real)                   | —                               |
| **OSRM**                          | ETA / routing                           | S5 (public instance → self-hosted) | —                               |
| **MinIO / S3**                    | Document storage                        | S1                                 | —                               |


---

## 18. Edge Cases (Must Handle)


| #   | Scenario                        | Backend Handling                                         |
| --- | ------------------------------- | -------------------------------------------------------- |
| 1   | No nurses online                | Timeout 10 min → `EXPIRED` + suggest retry               |
| 2   | All nurses reject               | Same as above                                            |
| 3   | Patient offline after selection | Booking continues; sync on reconnect                     |
| 4   | Payment fails                   | Retry → fallback to cash; notify admin                   |
| 5   | Nurse GPS fails                 | Serve last known location; flag stale                    |
| 6   | SOS abuse                       | Rate limit 1/15 min; track false alarms                  |
| 7   | Offer after selection           | Reject with `409 Conflict`                               |
| 8   | Patient active booking          | Block new request creation                               |
| 9   | License expired                 | Force offline; reject offer submission                   |
| 10  | Network drop mid-visit          | Queue status updates; idempotent PUT                     |
| 11  | Insufficient prepaid (cash)     | Allow visit; create debt; block go-online                |
| 12  | Scheduled cancel < 1h           | Reject cancel or apply warning (MVP: allow with warning) |


---

## 19. Out of Scope (MVP)

- Telemedicine / video calls
- EMR / medical records
- Insurance claims
- Multi-language (English)
- AI matching (ML)
- Voice/image chat
- Web patient booking
- Referral/loyalty programs
- Automated license verification (OCR)
- Bank transfer withdrawals (Phase 2)
- Cancellation fees (Phase 2 — MVP warning only)
- Dedicated in-app support chat

---

## 20. Development Conventions

### Code

- **Conventional commits:** `feat(booking): add SOS first-accept flow`
- **PR required** for merge to `develop`; CI must pass
- **DTOs** for all request/response bodies
- **Idempotency-Key** header on payment and booking mutation endpoints
- **correlationId** propagated via `X-Request-Id` middleware (same process)
- **UTC** for all timestamps; store `timestamptz` in PostgreSQL
- **UUID v4** for all primary keys
- **Soft delete** for users (anonymize); hard delete never for financial records

### Testing

- Unit tests: services, utils, state machine transitions
- Integration tests: API e2e with testcontainers (PostgreSQL)
- Contract tests: event payload types in `src/events/`
- Minimum: health e2e + one stub per module from day 1

### Environment Variables

See `BACKEND_AGENT_PROMPT.md` § Environment Variables for full `.env.example` list.

---

## 21. Reference Files in Workspace


| File                                             | Content                         |
| ------------------------------------------------ | ------------------------------- |
| `Nabdh_Platform_Complete_Documentation_v1.2.pdf` | Full BRD + PRD + System Design  |
| `BACKEND_AGENT_PROMPT.md`                        | Bootstrap/scaffold instructions |
| `usecase-overall.puml`                           | System use case diagram         |
| `usecase-patient.puml`                           | Patient use cases               |
| `usecase-nurse.puml`                             | Nurse use cases                 |
| `usecase-admin.puml`                             | Admin use cases                 |
| `seq-booking-overall.puml`                       | Standard booking sequence       |
| `seq-sos-emergency.puml`                         | SOS flow sequence               |
| `seq-scheduled-booking.puml`                     | Scheduled booking sequence      |
| `seq-payment-wallet.puml`                        | Payment & wallet sequence       |
| `seq-nurse-onboarding.puml`                      | Nurse verification sequence     |
| `seq-cancellation-reassign.puml`                 | Cancellation & reassignment     |
| `seq-dispute-resolution.puml`                    | Dispute & refund sequence       |


---

## 22. Constraints & Compliance


| Constraint                   | Impact on Backend                                   |
| ---------------------------- | --------------------------------------------------- |
| Egypt-only                   | EGP, Egyptian phone validation, local payment rails |
| Arabic-only UI               | User-facing `message` fields in Arabic              |
| Manual nurse verification    | Admin APIs + document storage + SLA tracking        |
| No nurse zone restrictions   | PostGIS radius only; no hard city boundaries        |
| Text-only chat (MVP)         | No file upload in chat                              |
| Independent contractor model | Nurses are not employees — no payroll APIs          |
| Egyptian Data Protection     | Anonymization, 30-day deletion SLA, audit logs      |
| Ministry of Health alignment | Verification records retained; license tracking     |


---

## 23. Agent Instructions Summary

When **planning**: map feature → owning module → API → DB tables → events → acceptance criteria.  
When **scaffolding**: follow `BACKEND_AGENT_PROMPT.md` exactly (modular monolith).  
When **implementing**: enforce state machine, idempotency, module boundaries, and v1.2 decision log.  
When **uncertain**: check sequence diagrams first; ask product owner if still ambiguous.  
When **done**: verify against Section 4 decisions + Section 15 sprint scope + acceptance criteria.

---

*End of Backend Agent Context — Nabdh Platform v1.3*