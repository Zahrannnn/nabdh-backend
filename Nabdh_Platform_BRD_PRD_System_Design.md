# Nabdh Platform — BRD + PRD + System Design

> **Document Version:** 1.4  
> **Last Updated:** June 17, 2026  
> **Geography:** Egypt only  
> **Architecture:** Modular Monolith (NestJS)  
> **Database:** MongoDB 7+ with 2dsphere geospatial indexes  

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.2 | Jun 15, 2026 | Product clarifications (commission, SOS, wallet, gender filter, scheduled bookings) |
| 1.3 | Jun 17, 2026 | Modular Monolith architecture; removed Redis |
| 1.4 | Jun 17, 2026 | **MongoDB** replaces PostgreSQL/PostGIS/Prisma; Mongoose ODM |

---

# PART 1 — Business Requirements (BRD)

## 1.1 Product Summary

**Nabdh** is a real-time healthcare marketplace connecting patients with licensed nursing professionals (ممرض / ممرضة) for home nursing services in **Egypt**.

- **Model:** Uber-like dispatch — request → offers → selection → visit → payment → rating
- **Launch market:** Greater Cairo (Cairo & Giza)
- **Currency:** EGP
- **Language:** Arabic UI only, full RTL

## 1.2 North Star Metric

**Completed visits per month**

## 1.3 Business Model

- Commission on completed visits — **configurable per service type** (typical 15–20%)
- SOS pricing: **1.5×** 30-day average market price for service type
- Cash visits: nurse maintains **EGP 100 minimum prepaid balance**

## 1.4 Year 1 Targets

| KPI | Target |
|-----|--------|
| Registered patients | 50,000 |
| Verified nurses | 2,000 |
| Completed visits/month | 10,000 |
| Monthly GMV | EGP 5M |
| Request-to-first-offer | < 3 minutes |
| SOS acceptance | < 60 seconds |

---

# PART 2 — Product Requirements (PRD)

## 2.1 Product Principles

- Safety First
- Real-Time by Default
- Arabic-Native (RTL)
- Trust through Transparency
- Nurse Empowerment

## 2.2 Key Functional Requirements (P0)

### Patient
- OTP registration, profile, addresses
- Browse services, create requests (standard / scheduled / SOS)
- Gender preference filter on requests
- View offers, select nurse, live tracking, chat
- Pay (cash / Paymob / Fawry), rate nurse

### Nurse
- OTP registration, document upload, verification
- Toggle availability, receive requests, submit offers
- Visit lifecycle, navigation, wallet, chat
- Accept SOS (first-accept wins)

### Admin
- Email + password + 2FA login
- Nurse verification (72h SLA)
- User management, bookings, disputes, service catalog
- Commission config (Super Admin)

## 2.3 v1.4 Decision Log (Authoritative)

| ID | Topic | Decision |
|----|-------|----------|
| C1 | Commission | Configurable per service type (15–20% typical) |
| C2 | SOS pricing | 1.5× 30-day average market price |
| C3 | Cash commission | EGP 100 min prepaid balance; auto-debit |
| C4 | Gender filter | Female / Male / No preference on requests |
| C5 | Patient cancel | Free before `NURSE_CONFIRMED` |
| C14 | Scheduled bookings | MVP: 2h–7d ahead; broadcast 30 min before |
| C20 | Architecture | Modular Monolith — single NestJS app |
| C21 | Database | **MongoDB 7+** with 2dsphere; Mongoose; no PostgreSQL/Prisma |

*(Full C1–C19 log in `BACKEND_AGENT_CONTEXT.md`)*

## 2.4 Booking State Machine

```
PENDING_OFFERS → NURSE_SELECTED → NURSE_CONFIRMED → EN_ROUTE → ARRIVED
  → VISIT_STARTED → VISIT_COMPLETED → PAYMENT_COMPLETED → RATED → CLOSED
```

Branches: `CANCELLED_BY_PATIENT`, `CANCELLED_BY_NURSE`, `EXPIRED`, `DISPUTE`, `SCHEDULED_PENDING`

## 2.5 SOS vs Standard

| Aspect | Standard | SOS |
|--------|----------|-----|
| Matching | Offers → patient selects | First accept wins |
| Radius | 15 km (→ 30) | 20 km (→ 30) |
| Timeout | 10 min | 2 min |
| Pricing | Nurse sets offer | Platform 1.5× market avg |
| Service type | From catalog | Free-text description only |

---

# PART 3 — System Design

## 3.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                 nabdh-api (NestJS Modular Monolith)          │
│   auth · users · booking · payment · location · chat        │
│   notifications · admin · analytics                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
         MongoDB 7                   MinIO / S3
        (2dsphere)                 (documents)
```

- **Single deployable** on port 3000
- **No Redis**, **no microservices** in MVP
- **Module boundaries** via NestJS `@Module()` — extractable later

## 3.2 Database: MongoDB 7+

MongoDB was chosen for:

- **Native geospatial queries** via GeoJSON + **2dsphere** indexes (nurse proximity, patient addresses)
- **Flexible document model** for evolving MVP schemas (offers, SOS metadata, notifications)
- **Horizontal scaling** path via sharding (Phase 2+)
- **Multi-document ACID transactions** for wallet/ledger operations
- **TTL indexes** for OTP sessions and optional chat/message expiry

### 3.2.1 Geospatial Design

All location fields use **GeoJSON Point** with `[longitude, latitude]` order:

```javascript
location: {
  type: 'Point',
  coordinates: [31.2357, 30.0444]  // Cairo example
}
```

**Required 2dsphere indexes:**
- `nurses.location`
- `addresses.location`
- `service_requests.location`
- `location_history.location`

**Nearby nurses query (15 km):**

```javascript
db.nurses.find({
  isOnline: true,
  verificationStatus: 'APPROVED',
  location: {
    $near: {
      $geometry: { type: 'Point', coordinates: [lng, lat] },
      $maxDistance: 15000  // meters
    }
  }
})
```

For complex pipelines (filter + sort by distance), use `$geoNear` as first aggregation stage.

### 3.2.2 Collections

| Collection | Module | Purpose |
|------------|--------|---------|
| `users` | auth/users | Base accounts |
| `patients` | users | Patient profiles |
| `nurses` | users | Nurse profiles + live location |
| `addresses` | users | Saved patient locations |
| `nurse_documents` | users | Verification files (URL to MinIO) |
| `services` | admin | Service catalog |
| `service_requests` | booking | Patient requests |
| `offers` | booking | Nurse bids |
| `bookings` | booking | Confirmed visits |
| `payments` | payment | Payment records |
| `wallets` | payment | Nurse balances |
| `wallet_transactions` | payment | Ledger entries |
| `chat_messages` | chat | In-booking messages |
| `notifications` | notifications | Push/in-app log |
| `location_history` | location | GPS trail |
| `audit_logs` | admin | Admin actions |
| `otp_sessions` | auth | OTP codes (TTL index) |
| `refresh_tokens` | auth | JWT refresh tokens |
| `outbox_events` | events | Async domain events |
| `ratings` | booking | Post-visit reviews |

### 3.2.3 Key Indexes (non-geospatial)

```javascript
// Booking queries
db.bookings.createIndex({ status: 1, createdAt: -1 })
db.bookings.createIndex({ patientId: 1, createdAt: -1 })
db.bookings.createIndex({ nurseId: 1, createdAt: -1 })

// Offers
db.offers.createIndex({ requestId: 1, status: 1 })

// Wallet
db.wallet_transactions.createIndex({ walletId: 1, createdAt: -1 })

// OTP TTL (auto-delete expired)
db.otp_sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// Outbox processor
db.outbox_events.createIndex({ status: 1, createdAt: 1 })
db.outbox_events.createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true })
```

### 3.2.4 Financial Integrity

Wallet credits, commission deductions, and refunds use **MongoDB multi-document transactions**:

```javascript
const session = await mongoose.startSession()
session.startTransaction()
try {
  await Wallet.updateOne({ nurseId }, { $inc: { availableBalance: credit } }, { session })
  await WalletTransaction.create([{ ... }], { session })
  await session.commitTransaction()
} catch (e) {
  await session.abortTransaction()
  throw e
} finally {
  session.endSession()
}
```

## 3.3 API Design

- **REST** at `/api/v1/*`
- **WebSocket** at `/api/v1/realtime`
- **Auth:** JWT Bearer (OTP for patients/nurses; email+2FA for admin)
- **Versioning:** URL-based `/api/v1/`

See `BACKEND_AGENT_CONTEXT.md` Section 9 for full API catalog.

## 3.4 Module Responsibilities

| Module | Responsibilities |
|--------|------------------|
| auth | OTP, JWT, guards, sessions |
| users | Patients, nurses, addresses, documents, verification |
| booking | Requests, offers, lifecycle, SOS, scheduled, ratings |
| payment | Paymob, Fawry, wallet, ledger, withdrawals |
| location | GPS, `$geoNear`, ETA, location history |
| chat | Socket.io, messages |
| notifications | FCM, SMS, in-app |
| admin | Dashboard, disputes, audit, config |
| analytics | Metrics (stub MVP) |

## 3.5 Event-Driven Design

| Type | Technology |
|------|------------|
| In-process | `@nestjs/event-emitter` |
| Async reliable | `outbox_events` collection + cron processor |
| Real-time | Socket.io |

Key events: `request.created`, `offer.submitted`, `booking.completed`, `payment.completed`, `nurse.verified`

## 3.6 Security

- TLS 1.3 in transit
- Encryption at rest (MongoDB Atlas / volume encryption)
- JWT access 15min + refresh 7d
- RBAC guards per route
- Rate limiting at gateway (`@nestjs/throttler`)
- Audit log for admin actions

## 3.7 Local Infrastructure (Docker)

| Service | Image |
|---------|-------|
| api | Custom Dockerfile |
| mongo | `mongo:7` |
| minio | `minio/minio` |

```env
MONGODB_URI=mongodb://nabdh:nabdh_dev@mongo:27017/nabdh?authSource=admin
```

## 3.8 Production Infrastructure (AWS)

| Component | Service |
|-----------|---------|
| Compute | ECS Fargate (single api task, auto-scale later) |
| Database | **MongoDB Atlas** (M10+ in `me-south-1` or nearest) |
| Files | S3 + CloudFront |
| Load balancer | ALB |
| Secrets | AWS Secrets Manager |

---

# PART 4 — UX Requirements (Summary)

- Arabic-only, full RTL
- Patient app: request flow, offers, map tracking, chat, payment
- Nurse app: availability, offers, navigation, wallet
- Admin panel: verification queue, SOS monitor, financial overview

---

# PART 5 — MVP Roadmap (8 Sprints)

| Sprint | Focus |
|--------|-------|
| S1 | Scaffold, auth, users, Mongoose schemas, Docker |
| S2 | Nurse docs, admin verification, notifications stub |
| S3 | Booking requests, `$geoNear` matching, offers |
| S4 | Booking lifecycle, cancellation |
| S5 | Live tracking, chat, scheduled bookings |
| S6 | SOS, cash payments, prepaid balance |
| S7 | Paymob/Fawry, wallet, ratings |
| S8 | Withdrawals, disputes, launch prep |

---

# PART 6 — Tech Stack

## 6.1 Mobile (Flutter)

Flutter 3.x, BLoC, go_router, dio, socket_io_client, firebase_messaging, RTL

## 6.2 Backend

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20 LTS |
| Framework | NestJS 10+ (modular monolith) |
| ODM | **Mongoose** via `@nestjs/mongoose` |
| Validation | class-validator |
| API docs | Swagger |
| Real-time | Socket.io |
| Events | EventEmitter + MongoDB outbox |
| Testing | Jest + Supertest |

## 6.3 Database

| Component | Technology |
|-----------|------------|
| Primary DB | **MongoDB 7+** |
| Geospatial | **GeoJSON + 2dsphere** indexes |
| File storage | MinIO (dev) / S3 (prod) |
| Managed prod | MongoDB Atlas |

## 6.4 Maps & Routing

- OpenStreetMap or Mapbox tiles
- OSRM or Mapbox Directions for ETA
- Geocoding: Nominatim or Mapbox

## 6.5 Payments (Egypt)

- Paymob (cards)
- Fawry (outlets / app)
- Cash (prepaid commission balance)

---

# Appendix A — Service Catalog (MVP)

| # | Service | Price Range (EGP) |
|---|---------|-------------------|
| 1 | Injection (حقن) | 100–200 |
| 2 | IV Fluids (محاليل وريدية) | 200–400 |
| 3 | Blood Pressure | 50–100 |
| 4 | Blood Sugar | 50–100 |
| 5 | Wound Dressing | 150–300 |
| 6 | Home Nursing Visit | 200–500 |
| 7 | Elderly Care | 300–800 |

---

# Appendix B — Glossary

| Term | Definition |
|------|------------|
| GMV | Gross Merchandise Value |
| SOS | Emergency request, first-accept dispatch |
| 2dsphere | MongoDB geospatial index type for GeoJSON |
| GeoJSON Point | `{ type: "Point", coordinates: [lng, lat] }` |
| Modular Monolith | Single deployable with internal domain modules |
| Outbox pattern | Reliable async events via DB collection + poller |

---

*End of Document — Nabdh Platform v1.4*
