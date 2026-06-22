# Sprint 1 — Stream A: Users Module (Real CRUD)

> **To:** BE-1
> **From:** Backend Lead
> **Subject:** Sprint 1 / Stream A: Users CRUD — Profiles, Addresses, Documents, Availability
> **Sprint:** 1 of 9 (MVP Phase A)
> **Duration:** 10 working days
> **Branch:** `feat/sprint-1-users`

---

## Email Body

BE-1,

Your stream: replace all mock methods in the users service with real Mongoose operations, add 11 missing endpoints, and wire up the nurse document upload endpoint (depends on BE-2's upload module, ready by your day 3).

Full context below: current state, every endpoint to build, every DTO to create, service method specs with validation rules, schema references, testing requirements, and business rules pulled from the sequence diagrams.

Key points:
- Remove `@Public()` from every users endpoint. Add `@Roles()` per endpoint.
- Use the existing `@CurrentUser()` decorator to scope all queries to the requesting user (prevents IDOR).
- DTOs use `class-validator`. Follow the existing `create-patient.dto.ts` pattern.
- Coordinate with BE-2 on the `UploadService` public API (method names, return type) so your document upload endpoint integrates cleanly on day 3.
- Do not modify schemas unless a field is genuinely missing. Flag it first.

Standup: daily 10:00. Demo: end of day 10.

---

## 1. Current State

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

Current mock methods in `users.service.ts` (lines 21-32):
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

These three must be replaced with real Mongoose operations, plus 11 new endpoints added.

---

## 2. Endpoints to Build (14 total)

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
| 13 | PATCH | `/nurse/availability` | JWT | NURSE | Toggle isOnline (validate: verified, license not expired, EGP 100 prepaid, no active booking) |
| 14 | GET | `/nurses/:id` | JWT | PATIENT | Public nurse profile (limited fields only) |

---

## 3. DTOs to Create

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

Use `class-validator` decorators: `@IsString()`, `@IsEnum()`, `@IsOptional()`, `@IsDateString()`, `@IsBoolean()`, `@IsNumber()`, `@Min()`, `@Max()`, `@MaxLength()`. Follow the existing `create-patient.dto.ts` for style.

---

## 4. Service Method Specs

### 4.1 Create Patient Profile
- Check `currentUser.type === PATIENT`, else 403.
- Check no existing Patient for this `userId`, else 409.
- Create Patient document with `userId = currentUser._id`.
- Return created document (lean).

### 4.2 Get Patient Profile
- Query by `userId = currentUser._id`.
- 404 if none.

### 4.3 Update Patient Profile
- `findOneAndUpdate({ _id, userId: currentUser._id }, dto, { new: true })`.
- The `userId` filter prevents IDOR (user A cannot update user B's profile by guessing the profile `_id`).

### 4.4 Address CRUD
- All scoped by `patientId` = the current patient's profile `_id`.
- Create: insert with `patientId`. Validate GeoJSON Point from `{ latitude, longitude }` -> `{ type: 'Point', coordinates: [longitude, latitude] }` (longitude first).
- List: query by `patientId`.
- Delete: `findOneAndDelete({ _id, patientId })` (IDOR-safe).

### 4.5 Create Nurse Profile
- Check `currentUser.type === NURSE`, else 403.
- Check no existing Nurse for this `userId`, else 409.
- Create with `verificationStatus = INCOMPLETE` (schema default, but be explicit).
- Fields: `fullName`, `gender`, `dateOfBirth`, `licenseNumber` (unique), `licenseExpiryDate`, `yearsOfExperience`, `bio`, `hourlyRate`.

### 4.6 Get / Update Nurse Profile
- Same pattern as patient: scope by `userId = currentUser._id`.
- Update uses `findOneAndUpdate` with `userId` filter.

### 4.7 Nurse Document Upload
- Call `UploadService.upload(file)` -> returns `{ url, key, mimeType, size }`.
- Create `NurseDocument` record: `{ nurseId, type: dto.type, url, status: 'PENDING' }`.
- Coordinate with BE-2 on the exact `UploadService` method signature before day 3.

### 4.8 List / Delete Nurse Documents
- List: query by `nurseId`.
- Delete: `findOneAndDelete({ _id, nurseId })` (IDOR-safe). Optionally call `UploadService.delete(key)` to remove from MinIO. Extract the key from the URL.

### 4.9 Availability Toggle (`PATCH /nurse/availability`)
Body: `{ isOnline: boolean }`.

Before setting `isOnline = true`, validate ALL of:
- `nurse.verificationStatus === APPROVED`
- `nurse.licenseExpiryDate > now`
- `nurse.prepaidBalance >= 100` (read from env: `NURSE_MIN_PREPAID_BALANCE`, default 100)
- No active booking: query for bookings with `nurseId` and `status` in `[NURSE_CONFIRMED, EN_ROUTE, ARRIVED, VISIT_STARTED]`. If the booking service is not ready in Sprint 1, stub this check with a `TODO` comment and revisit in Sprint 2. Log a warning so it is visible.

If any check fails, return 400 with an Arabic message explaining which condition was not met.

Setting `isOnline = false` has no preconditions (always allowed).

### 4.10 Public Nurse Profile (`GET /nurses/:id`)
Return ONLY these fields:
- `fullName`, `photoUrl`, `gender`, `avgRating`, `totalRatings`, `yearsOfExperience`, `bio`, `hourlyRate`

Strip these fields (never expose to patients):
- `phone`, `licenseNumber`, `prepaidBalance`, `verificationStatus`, `location`, `isOnline`, `userId`

---

## 5. Controller Changes

- Remove `@Public()` from all users endpoints.
- Add `@Roles(UserType.PATIENT)` on patient endpoints.
- Add `@Roles(UserType.NURSE)` on nurse endpoints.
- Use `@CurrentUser()` to get the authenticated user.
- `@ApiBearerAuth()` + `@ApiOperation()` on every endpoint.
- Group under `@ApiTags('Users')` (already there).

---

## 6. Module Wiring

`users.module.ts` must:
- Register all 5 schemas via `MongooseModule.forFeature`.
- Import `UploadModule` (once BE-2 creates it) for the document upload endpoint.
- Export `UsersService` if other modules need it (booking will in Sprint 2).

---

## 7. Schemas Reference (read before building)

- `src/modules/users/schemas/user.schema.ts` — base account: `phone`, `email`, `type`, `status`, `totpSecret`
- `src/modules/users/schemas/patient.schema.ts` — patient profile
- `src/modules/users/schemas/nurse.schema.ts` — nurse profile + `location` (GeoJSON Point) + `prepaidBalance` + `avgRating` + `isOnline` + `verificationStatus` + `licenseNumber` + `licenseExpiryDate`
- `src/modules/users/schemas/address.schema.ts` — saved patient locations with GeoJSON Point
- `src/modules/users/schemas/nurse-document.schema.ts` — verification documents: `nurseId`, `type`, `url`, `status`

If any DTO field does not map to a schema field, flag it in the channel before adding the field.

---

## 8. Business Rules from Diagrams

From `diagrams/sequence/seq-nurse-onboarding.puml`:
- Nurse registration creates Nurse profile with `verificationStatus = INCOMPLETE`.
- After document upload + profile completion, status transitions to `PENDING` (admin flips to APPROVED/REJECTED in Sprint 6).
- Required documents: National ID, Nursing License, Profile Photo (enum `DocumentType` in `common/enums/index.ts`).
- File size limit: 10MB per document.

From `diagrams/usecase/usecase-nurse.puml`:
- Availability toggle requires: VERIFIED status, EGP 100 prepaid balance, license not expired, no active booking.

From `diagrams/usecase/usecase-patient.puml`:
- Patient manages saved addresses (multiple).
- Patient can delete account (anonymize) — deferred to Sprint 6, not in your scope now.

---

## 9. Testing

### Unit Tests: `src/modules/users/users.service.spec.ts`
Mock `userModel`, `patientModel`, `nurseModel`, `addressModel`, `nurseDocumentModel`, `uploadService`.

Test each method:
- Success path (returns correct data)
- Not-found (404)
- IDOR attempt (user A tries to access user B's profile -> rejected)
- Validation failures (wrong role, missing required field)
- Availability toggle: unverified nurse rejected, insufficient prepaid rejected, expired license rejected, approved nurse with valid prepaid accepted

### E2E Tests: `test/users.e2e-spec.ts`
Use `mongodb-memory-server`. Seed:
- A patient user with JWT token
- A nurse user with JWT token (verified and unverified variants)

Test:
1. Patient creates profile -> 201
2. Patient gets own profile -> 200, correct data
3. Patient updates profile -> 200, fields updated
4. Patient adds address -> 201
5. Patient lists addresses -> 200, includes the new one
6. Patient deletes address -> 204
7. Nurse creates profile -> 201, `verificationStatus = INCOMPLETE`
8. Nurse uploads document (mock UploadService) -> 201
9. Nurse lists documents -> 200
10. Nurse toggles availability when unverified -> 400 + Arabic message
11. Patient gets public nurse profile -> 200, no sensitive fields in response
12. User A cannot access user B's profile (IDOR test)

Target: 80% coverage on new code.

---

## 10. Acceptance Criteria (Your Stream)

- [ ] `POST /patient/profile` creates a Patient document linked to the authenticated user
- [ ] `GET /patient/profile` returns own profile, 404 if none, 403 if not a PATIENT
- [ ] `PUT /patient/profile` updates own profile only (IDOR test passes)
- [ ] Address CRUD works end-to-end, scoped to the patient
- [ ] `POST /nurse/profile` creates a Nurse document with `verificationStatus = INCOMPLETE`
- [ ] `PATCH /nurse/availability` rejects unverified nurse with 400 + Arabic message
- [ ] `GET /nurses/:id` returns public profile without sensitive fields
- [ ] No `@Public()` on any users endpoint
- [ ] `@Roles()` applied per endpoint
- [ ] Swagger docs updated for all new endpoints
- [ ] `npm run lint` passes
- [ ] `npm test` passes (unit) with 80%+ coverage on new code
- [ ] `npm run test:e2e` passes (users suite)
- [ ] No hardcoded mock data remains in `users.service.ts`

---

## 11. Environment Setup

```bash
git checkout main && git pull
git checkout -b feat/sprint-1-users
docker compose up -d
cp .env.example .env   # set JWT_SECRET if not already set
npm run start:dev
npm test
npm run test:e2e
```

---

## 12. Files You Will Create/Modify

**Modify:**
- `src/modules/users/users.service.ts` (replace stubs)
- `src/modules/users/users.controller.ts` (add 11 endpoints, remove `@Public`, add `@Roles`)
- `src/modules/users/users.module.ts` (import UploadModule, register schemas)
- `src/modules/users/dto/index.ts` (export new DTOs)

**Create:**
- `src/modules/users/dto/update-patient.dto.ts`
- `src/modules/users/dto/create-nurse.dto.ts`
- `src/modules/users/dto/update-nurse.dto.ts`
- `src/modules/users/dto/create-address.dto.ts`
- `src/modules/users/dto/update-address.dto.ts`
- `src/modules/users/dto/create-nurse-document.dto.ts`
- `src/modules/users/dto/update-availability.dto.ts`
- `src/modules/users/users.service.spec.ts`
- `test/users.e2e-spec.ts`

---

## 13. Reference Files (read before starting)

- `src/common/enums/index.ts` — all enums (UserType, Gender, VerificationStatus, DocumentType)
- `src/common/decorators/current-user.decorator.ts` — `@CurrentUser()` usage
- `src/common/decorators/roles.decorator.ts` — `@Roles()` usage
- `src/common/guards/roles.guard.ts` — how role checking works
- `src/modules/auth/auth.controller.ts` — reference for a complete controller pattern
- `src/modules/auth/auth.service.ts` — reference for service patterns
- `diagrams/sequence/seq-nurse-onboarding.puml` — document upload + verification flow
- `diagrams/usecase/usecase-nurse.puml` — availability toggle requirements
- `diagrams/usecase/usecase-patient.puml` — address management use cases
- `docs/Nabdh_Platform_BRD_PRD_System_Design.md` — Sections 2.2, 3.2, 3.4

---

## Questions?

Flag in the team channel. Do not block silently. If a schema field is missing for your endpoint, ask before adding it. If an endpoint path conflicts with a diagram, the diagram wins.

---

*End of Stream A Brief*
