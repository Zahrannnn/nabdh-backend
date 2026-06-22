# Sprint 1 Kickoff — Users + Upload + Location

> **To:** Maram Shalaby
> **From:** Mohamed Zahran
> **Subject:** Sprint 1 Start: Users CRUD + File Upload + Location (Geospatial)
> **Sprint:** 1 of 9 (MVP Phase A)
> **Duration:** 10 working days
> **Owners:** BE-1 (Users + Booking-adjacent), BE-2 (Upload + Location)
> **Branch:** `feat/sprint-1-users-upload-location`

---

## Email Body

Team,

Sprint 1 starts now. This is the first real implementation sprint after the auth foundation. Three work streams run in parallel:

1. **Users module — real CRUD** (BE-1): replace mock service with real Mongoose operations, add 11 missing endpoints, patient + nurse profile management, address book, nurse document references, availability toggle.
2. **Upload module — new** (BE-2): MinIO/S3 abstraction for nurse document upload, profile photos, service icons. Signed URLs. This is a new module under `src/modules/upload/`.
3. **Location module — geospatial** (BE-2): nurse GPS updates with `2dsphere`, nearby-nurse search via `$geoNear`, location history trail, OSRM ETA helper.

Full context for each stream is in the sections below. Read your assigned section end-to-end before starting. Acceptance criteria at the bottom.

Key reminders:
- Every endpoint gets `JwtAuthGuard` (remove `@Public()` from current stubs), `@Roles()` where role-specific, Swagger `@ApiOperation` + `@ApiBearerAuth`.
- Arabic error messages for user-facing errors. Use the `AllExceptionsFilter` patterns already in place.
- DTOs use `class-validator` decorators. Follow the existing `create-patient.dto.ts` pattern.
- Unit tests with Jest, e2e with `mongodb-memory-server` (already in devDeps). Target 80% coverage on new code.
- Conventional commits. Husky + commitlint already configured.
- Do not touch auth module, events outbox, or schemas unless adding a field. Schemas are already defined.

Dependencies:
- BE-1 depends on BE-2's upload module for the nurse document upload endpoint (day 3 onwards). BE-2 builds upload first (days 1-2), BE-1 starts users CRUD immediately and integrates upload on day 3.
- Location is independent. BE-2 does location after upload (days 4-5).

Blockers to flag immediately: any schema field missing for an endpoint, any env var not documented, any MinIO connection issue in Docker.



Let's build.

---

## Stream 1: Users Module — Real CRUD (BE-1)

### 1.1 Current State

```
src/modules/users/
  dto/
    index.ts
    create-patient.dto.ts        # exists, basic
  schemas/
    user.schema.ts               # User: phone, email, type, status, totpSecret
    patient.schema.ts            # Patient: userId, fullName, gender, dob, photoUrl, medicalInfo
    nurse.schema.ts              # Nurse: userId, fullName, gender, licenseNumber, verificationStatus, isOnline, location, prepaidBalance, avgRating
    address.schema.ts            # Address: patientId, label, location (GeoJSON Point), details
    nurse-document.schema.ts     # NurseDocument: nurseId, type, url, status
  users.controller.ts            # 3 stub endpoints, all @Public()
  users.service.ts               # 3 mock methods + 2 real (findById, findByPhone)
  users.module.ts
```

`users.service.ts` current mock methods (lines 21-32):
```typescript
async createPatientProfile(dto: CreatePatientDto) {
  this.logger.log(`Stub: Patient profile created for ${dto.firstName} ${dto.lastName}`);
  return { id: 'mock-patient-id', ...dto };
}
async getPatientProfile() {
  return { id: 'mock-patient-id', firstName: 'John', lastName: 'Doe' };
}
async getNurseProfile() {
  return { id: 'mock-nurse-id', firstName: 'Jane', lastName: 'Nurse' };
}
```

### 1.2 What to Build

Replace all stubs with real Mongoose operations. Add missing endpoints. The `@CurrentUser()` decorator (already in `src/common/decorators/current-user.decorator.ts`) gives you the authenticated user's `_id` and `type`. Use it to scope queries to the requesting user.

#### Endpoints (12 total)

| # | Method | Path | Auth | Role | Description |
|---|--------|------|------|------|-------------|
| 1 | POST | `/patient/profile` | JWT | PATIENT | Create patient profile (linked to current user) |
| 2 | GET | `/patient/profile` | JWT | PATIENT | Get own patient profile |
| 3 | PUT | `/patient/profile` | JWT | PATIENT | Update own patient profile |
| 4 | POST | `/patient/addresses` | JWT | PATIENT | Add saved address |
| 5 | GET | `/patient/addresses` | JWT | PATIENT | List saved addresses |
| 6 | DELETE | `/patient/addresses/:id` | JWT | PATIENT | Delete saved address (own only) |
| 7 | POST | `/nurse/profile` | JWT | NURSE | Create nurse profile |
| 8 | GET | `/nurse/profile` | JWT | NURSE | Get own nurse profile |
| 9 | PUT | `/nurse/profile` | JWT | NURSE | Update own nurse profile |
| 10 | POST | `/nurse/documents` | JWT | NURSE | Upload document (calls UploadService, stores URL on NurseDocument) |
| 11 | GET | `/nurse/documents` | JWT | NURSE | List own documents |
| 12 | DELETE | `/nurse/documents/:id` | JWT | NURSE | Delete own document |
| 13 | PATCH | `/nurse/availability` | JWT | NURSE | Toggle isOnline (validate: verified, license not expired, EGP 100 prepaid balance, no active booking) |
| 14 | GET | `/nurses/:id` | JWT | PATIENT | Public nurse profile for patient view (limited fields: name, photo, rating, yearsExp, bio. NO phone, NO wallet, NO documents) |

#### DTOs to Create

```
src/modules/users/dto/
  create-patient.dto.ts          # exists — verify fields match Patient schema
  update-patient.dto.ts          # new — PartialType of create
  create-nurse.dto.ts            # new
  update-nurse.dto.ts            # new
  create-address.dto.ts          # new — label, latitude, longitude, details
  update-address.dto.ts          # new
  create-nurse-document.dto.ts   # new — type (enum DocumentType), url (from upload)
  update-availability.dto.ts     # new — isOnline: boolean
```

Follow the existing `create-patient.dto.ts` for style. Use `class-validator` decorators: `@IsString()`, `@IsEnum()`, `@IsOptional()`, `@IsDateString()`, `@IsBoolean()`, `@Min()`, `@Max()`.

#### Service Methods

Each endpoint maps to a service method. Key validation rules:

- **Create patient/nurse profile**: check current user `type` matches. Create profile document linked to `userId`. If nurse, set `verificationStatus = INCOMPLETE`.
- **Update profile**: only own profile. Use `findOneAndUpdate` with `_id` + `userId` filter (prevents IDOR).
- **Address CRUD**: scope by `patientId` = current user's patient profile `_id`.
- **Document upload**: call `UploadService.upload(file)` to get URL, then create `NurseDocument` record with `nurseId`, `type`, `url`, `status: PENDING`.
- **Availability toggle** (`PATCH /nurse/availability`): before setting `isOnline = true`, validate:
  - `nurse.verificationStatus === APPROVED`
  - `nurse.licenseExpiryDate > now`
  - `nurse.prepaidBalance >= 100` (env: `NURSE_MIN_PREPAID_BALANCE`)
  - No active booking (query booking module, or for Sprint 1 just check nurse has no booking with status in `[NURSE_CONFIRMED, EN_ROUTE, ARRIVED, VISIT_STARTED]` — booking service may not be ready, so stub this check with a TODO and revisit in Sprint 2)
- **Public nurse profile** (`GET /nurses/:id`): return only: `fullName`, `photoUrl`, `gender`, `avgRating`, `totalRatings`, `yearsOfExperience`, `bio`, `hourlyRate`. Strip: `phone`, `licenseNumber`, `prepaidBalance`, `verificationStatus`, `location`, `isOnline`.

#### Controller Changes

- Remove `@Public()` from all users endpoints.
- Add `@Roles(UserType.PATIENT)` or `@Roles(UserType.NURSE)` per endpoint.
- Use `@CurrentUser()` decorator to get requesting user.
- Add `@ApiBearerAuth()` (already there) + `@ApiOperation()` (already there, update summaries).

#### Module Wiring

`users.module.ts` must import `UploadModule` (for document upload endpoint) once BE-2 creates it. Coordinate with BE-2 on the `UploadService` public API.

### 1.3 Schemas Reference

Already defined. Read these before building:

- `src/modules/users/schemas/user.schema.ts` — base account
- `src/modules/users/schemas/patient.schema.ts` — patient profile
- `src/modules/users/schemas/nurse.schema.ts` — nurse profile + live location + prepaid balance
- `src/modules/users/schemas/address.schema.ts` — saved patient locations
- `src/modules/users/schemas/nurse-document.schema.ts` — verification documents

If any DTO field doesn't map to a schema field, flag it. Do not silently drop data.

### 1.4 Testing

- **Unit tests**: `users.service.spec.ts` — mock `userModel`, `patientModel`, `nurseModel`, `addressModel`, `nurseDocumentModel`, `uploadService`. Test each method: success path, not-found, IDOR attempt (wrong userId), validation failures.
- **E2E test**: `test/users.e2e-spec.ts` — use `mongodb-memory-server`. Seed a patient user + nurse user with tokens. Test: create profile, get profile, update profile, address CRUD, document upload (mock UploadService), availability toggle (verified nurse vs unverified).

### 1.5 Business Rules from Diagrams

From `diagrams/sequence/seq-nurse-onboarding.puml`:
- Nurse registration creates Nurse profile with `verificationStatus = INCOMPLETE` (schema default). After document upload + profile completion, status transitions to `PENDING` (admin flips to APPROVED/REJECTED in Sprint 6).
- Required documents: National ID, Nursing License, Profile Photo (enum `DocumentType` in `common/enums/index.ts`).
- File size limit: 10MB per document (from sequence diagram).

From `diagrams/usecase/usecase-nurse.puml`:
- Availability toggle requires: VERIFIED status, EGP 100 prepaid balance, license not expired, no active booking.

---

## Stream 2: Upload Module — New (BE-2)

### 2.1 Current State

No upload module exists. Env vars already defined in `src/config/validation.ts`:
```
S3_ENDPOINT: 'http://minio:9000'       # MinIO dev, S3 prod
S3_ACCESS_KEY: 'nabdh_minio'
S3_SECRET_KEY: 'nabdh_minio_secret'
S3_BUCKET: 'nabdh-documents'
S3_REGION: 'us-east-1'
```

Docker Compose already runs MinIO (`docker-compose.yml`). The bucket may not exist on first run — your code must create it if missing.

### 2.2 What to Build

New module: `src/modules/upload/`

```
src/modules/upload/
  upload.module.ts
  upload.controller.ts
  upload.service.ts
  dto/
    index.ts
```

#### UploadService

Wrap MinIO/S3. Use the `minio` npm package (needs installing: `npm install minio`).

Public API:
```typescript
class UploadService {
  // Upload a file, return { url, key, mimeType, size }
  async upload(file: Express.Multer.File): Promise<UploadResult>

  // Generate a presigned download URL (15-min expiry)
  async getSignedUrl(key: string): Promise<string>

  // Delete a file
  async delete(key: string): Promise<void>
}
```

Constructor: read `S3_*` env vars via `@InjectConfig()` or `ConfigService`. Create MinIO client. On module init, check if bucket exists, create if not.

#### UploadController

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/upload` | JWT | Multipart file upload. Accept `multipart/form-data` with field `file`. Validate: type whitelist (pdf, jpg, jpeg, png), size limit 10MB. Return `{ url, key, mimeType, size }`. |
| GET | `/upload/signed-url?key=...` | JWT | Get presigned download URL. |

Use `@UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 }, fileFilter }))` from `@nestjs/platform-express`. The `FileInterceptor` needs `multer` installed (`npm install -D @types/multer` — `multer` itself comes with `@nestjs/platform-express`).

#### Module Wiring

`upload.module.ts` exports `UploadService`. `UsersModule` imports it.

#### File Storage Strategy

- Key format: `{userId}/{documentType}/{timestamp}-{random}.{ext}` (e.g. `user-abc/NURSING_LICENSE/1719000000-rand.pdf`)
- Store in the `nabdh-documents` bucket.
- The returned `url` is the public endpoint for dev (`http://localhost:9000/nabdh-documents/{key}`) — in prod this becomes CloudFront. For Sprint 1, return the MinIO URL directly. Signed URLs are for private access (admin reviewing documents).

### 2.3 Testing

- **Unit tests**: `upload.service.spec.ts` — mock MinIO client. Test: upload returns correct key + URL, bucket creation on init, signed URL generation, delete.
- **E2E test**: `test/upload.e2e-spec.ts` — seed a user with token, POST `/upload` with a real file buffer (use `supertest` `.attach()`), assert 200 + URL. Then GET signed-url, assert URL format.

### 2.4 Dependencies to Install

```bash
npm install minio
npm install -D @types/multer
```

Verify these don't conflict with existing deps in `package.json` before installing.

---

## Stream 3: Location Module — Geospatial (BE-2)

### 3.1 Current State

```
src/modules/location/
  dto/
    index.ts                      # empty
  schemas/
    location-history.schema.ts    # LocationHistory: nurseId, bookingId?, lat, lng, speed, createdAt. TTL 7 days.
  location.controller.ts          # 2 stub endpoints, both @Public()
  location.service.ts             # 2 stub methods (updateLocation, findNearbyNurses)
  location.module.ts
```

`location.service.ts` current stubs:
```typescript
async updateLocation(body: { latitude: number; longitude: number }) {
  this.logger.log(`Stub: Location updated: ${body.latitude}, ${body.longitude}`);
  return { success: true };
}
async findNearbyNurses() {
  return [
    { id: 'nurse-1', distance: 2.5, status: 'ONLINE' },
    { id: 'nurse-2', distance: 5.1, status: 'ONLINE' },
  ];
}
```

### 3.2 What to Build

#### Endpoints (3 total)

| # | Method | Path | Auth | Role | Description |
|---|--------|------|------|------|-------------|
| 1 | POST | `/nurse/location` | JWT | NURSE | Update own GPS location. Body: `{ latitude, longitude, speed? }` |
| 2 | GET | `/nurses/nearby` | JWT | PATIENT | Find nearby nurses. Query: `lat, lng, radiusKm (default 15), genderPref?` |
| 3 | GET | `/nurse/location-history/:nurseId` | JWT | ADMIN or self (NURSE) | GPS trail for a nurse |

#### DTOs

```
src/modules/location/dto/
  update-location.dto.ts          # latitude: number ([-90,90]), longitude: number ([-180,180]), speed?: number
  nearby-query.dto.ts             # lat, lng, radiusKm (default 15, max 50), genderPref? (enum)
```

#### Service Methods

**`updateLocation(nurseId, dto)`**:
1. Update `nurses.location` to `{ type: 'Point', coordinates: [longitude, latitude] }` using `findOneAndUpdate`.
2. Insert into `location_history` collection: `{ nurseId, lat, lng, speed, createdAt: now }`.
3. Return `{ success: true }`.

The `nurses` collection has a `2dsphere` index on `location` (already in `nurse.schema.ts:72`). The `location_history` collection has a TTL index (7 days, already in schema).

**`findNearbyNurses(query)`**:
Use MongoDB aggregation with `$geoNear`:
```javascript
nurseModel.aggregate([
  {
    $geoNear: {
      near: { type: 'Point', coordinates: [lng, lat] },
      distanceField: 'distance',
      maxDistance: radiusKm * 1000,  // meters
      query: {
        isOnline: true,
        verificationStatus: 'APPROVED',
        // genderPref filter if provided
      },
      spherical: true,
    },
  },
  {
    $project: {
      _id: 1,
      fullName: 1,
      photoUrl: 1,
      avgRating: 1,
      yearsOfExperience: 1,
      distance: 1,  // meters
    },
  },
  { $sort: { distance: 1 } },
  { $limit: 50 },
]);
```

Return array of `{ id, fullName, photoUrl, avgRating, yearsOfExperience, distanceKm }` where `distanceKm = (distance / 1000).toFixed(1)`.

Do NOT return: phone, licenseNumber, prepaidBalance, location coordinates, isOnline, verificationStatus.

**`getLocationHistory(nurseId, requesterId, requesterType)`**:
- If requester is the nurse themselves (NURSE, `requesterId === nurseId`): allow.
- If requester is ADMIN: allow.
- Else: 403.
- Query `location_history` by `nurseId`, sort `createdAt desc`, limit 500. Return array of `{ lat, lng, speed, timestamp }`.

#### ETA Helper (optional, day 5 if time permits)

```typescript
async getETA(originLng, originLat, destLng, destLat): Promise<{ etaMinutes: number, distanceMeters: number }>
```
Call OSRM: `GET {OSRM_BASE_URL}/route/v1/driving/{originLng},{originLat};{destLng},{destLat}?overview=false`
Env var `OSRM_BASE_URL` already defined (`config/validation.ts:29`).
If OSRM unavailable, fallback to Haversine distance / 40 km/h average speed.
This helper is used by booking module in Sprint 2, not by any Sprint 1 endpoint. Build it if time permits, otherwise defer.

#### Controller Changes

- Remove `@Public()` from both existing endpoints.
- Add `@Roles(UserType.NURSE)` on `POST /nurse/location`.
- Add `@Roles(UserType.PATIENT)` on `GET /nurses/nearby`.
- Add `@Roles(UserType.ADMIN, UserType.NURSE)` on `GET /nurse/location-history/:nurseId`.
- Use `@CurrentUser()` for nurse's own location update + history.

#### Module Wiring

`location.module.ts` imports `MongooseModule.forFeature` for `Nurse` and `LocationHistory` schemas. Inject `Nurse` model from users module (coordinate with BE-1 on which module exports the Nurse model, or register the schema in both modules — Mongoose allows this).

### 3.3 Testing

- **Unit tests**: `location.service.spec.ts` — mock `nurseModel`, `locationHistoryModel`. Test: `updateLocation` calls both model updates, `findNearbyNurses` builds correct aggregation pipeline (use a spy on `.aggregate()`), `getLocationHistory` enforces ownership.
- **E2E test**: `test/location.e2e-spec.ts` — seed 3 nurses at known coordinates (e.g. downtown Cairo, Giza, Heliopolis). Patient queries nearby with lat/lng of central Cairo, assert results sorted by distance. Test radius filter. Test gender preference filter. Test that offline nurses excluded.

### 3.4 Geospatial Reference

From BRD Section 3.2.1:
- All location fields use GeoJSON Point: `{ type: 'Point', coordinates: [longitude, latitude] }` — **longitude first**.
- 2dsphere indexes already on: `nurses.location`, `service_requests.location`, `location_history.location` (check schema — `location-history.schema.ts` currently has no 2dsphere index, only `{ nurseId: 1, createdAt: -1 }` and TTL. **Add 2dsphere if you plan geo queries on history** — but for Sprint 1 the history endpoint just returns raw points, no geo query needed).

From `diagrams/sequence/seq-booking-overall.puml`:
- Location update intervals: SOS 3s, Standard 5s, Idle 30s. The client controls this. Backend just accepts updates. No rate limiting on the location endpoint for now (Sprint 8).

---

## Acceptance Criteria (End of Sprint 1)

All must pass before sprint close:

### Users
- [ ] `POST /patient/profile` creates a Patient document linked to the authenticated user
- [ ] `GET /patient/profile` returns own profile, 404 if none, 403 if not a PATIENT
- [ ] `PUT /patient/profile` updates own profile only (IDOR test: user A cannot update user B's profile)
- [ ] Address CRUD works end-to-end, scoped to the patient
- [ ] `POST /nurse/profile` creates a Nurse document with `verificationStatus = INCOMPLETE`
- [ ] `PATCH /nurse/availability` rejects unverified nurse with 400 + Arabic message
- [ ] `GET /nurses/:id` returns public profile without sensitive fields

### Upload
- [ ] `POST /upload` accepts a PDF, returns URL + key
- [ ] `POST /upload` rejects files > 10MB with 413
- [ ] `POST /upload` rejects non-whitelisted types (e.g. .exe) with 400
- [ ] `GET /upload/signed-url?key=...` returns a valid presigned URL
- [ ] MinIO bucket auto-created on app startup if missing

### Location
- [ ] `POST /nurse/location` updates `nurses.location` + inserts into `location_history`
- [ ] `GET /nurses/nearby` returns nurses sorted by distance, within radius, only online + approved
- [ ] `GET /nurses/nearby` respects `genderPref` query param
- [ ] `GET /nurse/location-history/:nurseId` returns 403 for other patients, 200 for own nurse or admin

### Cross-Cutting
- [ ] No `@Public()` on any endpoint in users, upload, or location modules
- [ ] `@Roles()` applied per endpoint
- [ ] Swagger docs updated for all new endpoints
- [ ] `npm run lint` passes with no errors
- [ ] `npm test` passes (unit) — target 80% coverage on new code
- [ ] `npm run test:e2e` passes (e2e) — new users + upload + location suites
- [ ] Docker image builds: `docker build .` succeeds
- [ ] No hardcoded mock data remains in users, upload, or location services

### Integration
- [ ] Nurse document upload flow: nurse creates profile, uploads 3 documents, documents appear in `GET /nurse/documents` with URLs accessible via signed URL
- [ ] Patient searches nearby nurses: seed a verified online nurse at a known location, patient queries, nurse appears with correct distance

---

## Environment Setup

```bash
# 1. Pull latest main
git checkout main && git pull

# 2. Create branch
git checkout -b feat/sprint-1-users-upload-location

# 3. Install deps (after BE-2 adds minio)
npm install minio
npm install -D @types/multer

# 4. Start Docker (mongo + minio)
docker compose up -d

# 5. Copy .env.example to .env (if not exists), set JWT_SECRET
cp .env.example .env
# Generate a JWT secret: openssl rand -hex 32

# 6. Run dev
npm run start:dev

# 7. Run tests
npm test
npm run test:e2e
```

## File Map (What You Will Create/Modify)

**BE-1 (Users):**
- Modify: `src/modules/users/users.service.ts` (replace stubs)
- Modify: `src/modules/users/users.controller.ts` (add endpoints, remove @Public, add @Roles)
- Modify: `src/modules/users/users.module.ts` (import UploadModule)
- Modify: `src/modules/users/dto/index.ts` (export new DTOs)
- Create: `src/modules/users/dto/update-patient.dto.ts`
- Create: `src/modules/users/dto/create-nurse.dto.ts`
- Create: `src/modules/users/dto/update-nurse.dto.ts`
- Create: `src/modules/users/dto/create-address.dto.ts`
- Create: `src/modules/users/dto/update-address.dto.ts`
- Create: `src/modules/users/dto/create-nurse-document.dto.ts`
- Create: `src/modules/users/dto/update-availability.dto.ts`
- Create: `src/modules/users/users.service.spec.ts`
- Create: `test/users.e2e-spec.ts`

**BE-2 (Upload + Location):**
- Create: `src/modules/upload/upload.module.ts`
- Create: `src/modules/upload/upload.controller.ts`
- Create: `src/modules/upload/upload.service.ts`
- Create: `src/modules/upload/dto/index.ts`
- Create: `src/modules/upload/upload.service.spec.ts`
- Create: `test/upload.e2e-spec.ts`
- Modify: `src/app.module.ts` (import UploadModule)
- Modify: `src/modules/location/location.service.ts` (replace stubs)
- Modify: `src/modules/location/location.controller.ts` (remove @Public, add @Roles, add history endpoint)
- Modify: `src/modules/location/location.module.ts` (register Nurse + LocationHistory schemas)
- Create: `src/modules/location/dto/update-location.dto.ts`
- Create: `src/modules/location/dto/nearby-query.dto.ts`
- Create: `src/modules/location/location.service.spec.ts`
- Create: `test/location.e2e-spec.ts`
- Modify: `package.json` (add minio + @types/multer)

## Reference Files (Read Before Starting)

- `docs/Nabdh_Platform_BRD_PRD_System_Design.md` — Sections 2.2 (P0 requirements), 3.2 (database), 3.4 (module responsibilities)
- `src/common/enums/index.ts` — all enums (UserType, Gender, VerificationStatus, DocumentType, etc.)
- `src/common/decorators/current-user.decorator.ts` — `@CurrentUser()` usage
- `src/common/decorators/roles.decorator.ts` — `@Roles()` usage
- `src/common/guards/roles.guard.ts` — how role checking works
- `src/modules/auth/auth.controller.ts` — reference for how a complete controller looks
- `src/modules/auth/auth.service.ts` — reference for service patterns
- `diagrams/sequence/seq-nurse-onboarding.puml` — document upload + verification flow
- `diagrams/sequence/seq-booking-overall.puml` — location tracking intervals (3s/5s/30s)
- `diagrams/usecase/usecase-nurse.puml` — nurse use cases (availability toggle requirements)
- `diagrams/usecase/usecase-patient.puml` — patient use cases (address management)

## Questions?

Flag in the team channel. Do not block silently. If a schema field is missing for your endpoint, ask before adding it. If an endpoint path conflicts with a diagram, the diagram wins (see roadmap Section 12.5).

---

*End of Sprint 1 Brief*
