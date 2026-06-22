# Sprint 1 — Stream C: Location Module (Geospatial)

> **To:** BE-2
> **From:** Backend Lead
> **Subject:** Sprint 1 / Stream C: Location Module — GPS Updates + Nearby Nurse Search
> **Sprint:** 1 of 9 (MVP Phase A)
> **Duration:** 10 working days (days 4-8, after Upload stream completes)
> **Branch:** `feat/sprint-1-location`

---

## Email Body

BE-2,

After you complete the Upload module (Stream B), pivot to Location. This stream replaces the two stub methods with real geospatial operations: nurse GPS updates with `2dsphere`, nearby-nurse search via MongoDB `$geoNear`, and a location history trail endpoint.

Full context below: current stubs, the 3 endpoints to build, the exact `$geoNear` aggregation pipeline, DTOs, testing with known coordinates, and the OSRM ETA helper (optional).

Key points:
- MongoDB GeoJSON Point uses `[longitude, latitude]` order. Longitude first. Getting this backwards is the most common bug in geospatial code.
- The `2dsphere` index on `nurses.location` already exists in the schema.
- `findNearbyNurses` returns only public fields (no phone, no license, no wallet). This is the data patients see.
- Location history has a 7-day TTL index already set.
- Remove `@Public()` from both existing endpoints. Add `@Roles()`.

Standup: daily 10:00. Demo: end of day 10.

---

## 1. Current State

```
src/modules/location/
  dto/
    index.ts                      # empty
  schemas/
    location-history.schema.ts    # LocationHistory: nurseId, bookingId?, lat, lng, speed, createdAt. TTL 7 days.
  location.controller.ts          # 2 stub endpoints, both @Public()
  location.service.ts             # 2 stub methods
  location.module.ts
```

Current stubs in `location.service.ts` (lines 7-17):
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

Both must be replaced with real Mongoose operations. One new endpoint added (location history).

---

## 2. Endpoints to Build (3 total)

| # | Method | Path | Auth | Role | Description |
|---|--------|------|------|------|-------------|
| 1 | POST | `/nurse/location` | JWT | NURSE | Update own GPS location. Body: `{ latitude, longitude, speed? }` |
| 2 | GET | `/nurses/nearby` | JWT | PATIENT | Find nearby nurses. Query: `lat, lng, radiusKm (default 15), genderPref?` |
| 3 | GET | `/nurse/location-history/:nurseId` | JWT | ADMIN or NURSE (self) | GPS trail for a nurse |

---

## 3. DTOs to Create

```
src/modules/location/dto/
  update-location.dto.ts          # latitude: number [-90,90], longitude: number [-180,180], speed?: number
  nearby-query.dto.ts             # lat: number, lng: number, radiusKm?: number (default 15, max 50), genderPref?: enum
```

Use `class-validator`:
- `@IsNumber()`, `@Min(-90)`, `@Max(90)` for latitude.
- `@IsNumber()`, `@Min(-180)`, `@Max(180)` for longitude.
- `@IsOptional()`, `@IsNumber()`, `@Min(1)`, `@Max(50)` for radiusKm.
- `@IsOptional()`, `@IsEnum(GenderPreference)` for genderPref.

For `nearby-query.dto.ts`, use `@Query()` with a class-transformer-validated DTO. You may need to enable `whitelist: true` and `transform: true` in the global ValidationPipe (check if already set in `main.ts`).

---

## 4. Service Method Specs

### 4.1 updateLocation(nurseId, dto)

1. Update `nurses.location` to `{ type: 'Point', coordinates: [longitude, latitude] }` using `nurseModel.findOneAndUpdate({ userId: nurseId }, { $set: { location: {...} } })`.
   - Note: `nurseId` here is actually the authenticated user's `_id`. The Nurse schema links via `userId`. Check whether the controller should pass `user._id` (User id) or look up the Nurse profile first. Simplest: query `nurseModel.findOne({ userId: user._id })` to get the nurse document, then update.
2. Insert into `location_history`: `{ nurseId: nurseDoc._id, lat: dto.latitude, lng: dto.longitude, speed: dto.speed, createdAt: new Date() }`.
3. Return `{ success: true }`.

**Critical**: GeoJSON coordinates are `[longitude, latitude]`. Longitude first. If you swap them, all nearby queries will return wrong results.

### 4.2 findNearbyNurses(query)

Use MongoDB aggregation with `$geoNear` as the FIRST stage:

```javascript
const pipeline = [
  {
    $geoNear: {
      near: { type: 'Point', coordinates: [query.lng, query.lat] },
      distanceField: 'distance',
      maxDistance: query.radiusKm * 1000,
      query: {
        isOnline: true,
        verificationStatus: 'APPROVED',
      },
      spherical: true,
    },
  },
];

// Add gender filter if provided
if (query.genderPref && query.genderPref !== 'NO_PREFERENCE') {
  pipeline[0].$geoNear.query.gender = query.genderPref;
}

pipeline.push(
  {
    $project: {
      _id: 1,
      fullName: 1,
      photoUrl: 1,
      avgRating: 1,
      yearsOfExperience: 1,
      distance: 1,
    },
  },
  { $sort: { distance: 1 } },
  { $limit: 50 },
);

const results = await nurseModel.aggregate(pipeline);
```

Return array of:
```typescript
{
  id: string,
  fullName: string,
  photoUrl: string,
  avgRating: number,
  yearsOfExperience: number,
  distanceKm: number  // (distance / 1000).toFixed(1)
}
```

**Do NOT return**: phone, licenseNumber, prepaidBalance, location coordinates, isOnline, verificationStatus, userId.

### 4.3 getLocationHistory(nurseId, requesterId, requesterType)

Access control:
- If `requesterType === NURSE` and `requesterId === nurseId` (comparing the Nurse's userId to the requester's user id): allow.
- If `requesterType === ADMIN`: allow.
- Else: 403.

Query:
```javascript
locationHistoryModel
  .find({ nurseId })
  .sort({ createdAt: -1 })
  .limit(500)
  .lean();
```

Return array of `{ lat, lng, speed, timestamp: createdAt }`.

---

## 5. Controller Changes

### Existing endpoints (modify):
- `POST /nurse/location`: remove `@Public()`, add `@Roles(UserType.NURSE)`, use `@CurrentUser()` to get the nurse's user id, pass to service with the validated DTO.
- `GET /nurses/nearby`: remove `@Public()`, add `@Roles(UserType.PATIENT)`, use `@Query()` with `NearbyQueryDto`.

### New endpoint:
- `GET /nurse/location-history/:nurseId`: `@Roles(UserType.ADMIN, UserType.NURSE)`, use `@CurrentUser()` for access control check in the service.

All endpoints: `@ApiBearerAuth()` + `@ApiOperation()`.

---

## 6. Module Wiring

`location.module.ts` must:
- Register `LocationHistory` schema via `MongooseModule.forFeature`.
- Register `Nurse` schema (or import from UsersModule if BE-1 exports it). Coordinate with BE-1. If UsersModule exports the Nurse model, import it. Otherwise, register `MongooseModule.forFeature([{ name: Nurse.name, schema: NurseSchema }])` in LocationModule. Mongoose allows registering the same schema in multiple modules.
- Export `LocationService` if booking module will need it in Sprint 2 (likely yes for ETA helper).

---

## 7. Geospatial Reference

From BRD Section 3.2.1:
- All location fields use GeoJSON Point: `{ type: 'Point', coordinates: [longitude, latitude] }` — **longitude first**.
- 2dsphere indexes already on: `nurses.location` (in `nurse.schema.ts:72`).
- `location_history` currently has `{ nurseId: 1, createdAt: -1 }` and a TTL index. It does NOT have a 2dsphere index. For Sprint 1, the history endpoint returns raw points sorted by time, no geo query needed. Do not add a 2dsphere index unless you plan to geo-query history.

From `diagrams/sequence/seq-booking-overall.puml`:
- Location update intervals: SOS 3s, Standard 5s, Idle 30s. The client controls this. Backend just accepts updates. No rate limiting on the location endpoint for Sprint 1 (defer to Sprint 8).

From `diagrams/sequence/seq-sos-emergency.puml`:
- SOS uses 20km radius, expandable to 30km. Standard uses 15km. The `radiusKm` query param with default 15 covers this.

---

## 8. ETA Helper (Optional — Build if Time Permits)

```typescript
async getETA(originLng: number, originLat: number, destLng: number, destLat: number): Promise<{ etaMinutes: number; distanceMeters: number }>
```

Call OSRM: `GET {OSRM_BASE_URL}/route/v1/driving/{originLng},{originLat};{destLng},{destLat}?overview=false`
Env var `OSRM_BASE_URL` already defined (`config/validation.ts:29`, default `http://router.project-osrm.org`).

Parse response: `routes[0].duration` (seconds) + `routes[0].distance` (meters).

Fallback if OSRM unavailable: Haversine distance / 40 km/h average speed.

This helper is used by the booking module in Sprint 2, not by any Sprint 1 endpoint. Build it if you finish early. Otherwise defer to Sprint 2. Do not block on it.

---

## 9. Testing

### Unit Tests: `src/modules/location/location.service.spec.ts`
Mock `nurseModel`, `locationHistoryModel`.

Test:
1. `updateLocation` calls `nurseModel.findOneAndUpdate` with correct GeoJSON Point (assert `coordinates[0]` is longitude, `coordinates[1]` is latitude).
2. `updateLocation` inserts into `locationHistoryModel`.
3. `findNearbyNurses` calls `nurseModel.aggregate` with a pipeline containing `$geoNear` as the first stage. Use a spy on `.aggregate()` and inspect the passed pipeline.
4. `findNearbyNurses` with `genderPref = FEMALE` adds gender to the `$geoNear.query`.
5. `findNearbyNurses` returns `distanceKm` as `distance / 1000` rounded to 1 decimal.
6. `findNearbyNurses` does not include sensitive fields in the project stage.
7. `getLocationHistory` returns 403 when a patient requests another nurse's history (mock the role check).
8. `getLocationHistory` returns 200 with array when nurse requests own history.
9. `getLocationHistory` returns 200 when admin requests any nurse's history.

### E2E Tests: `test/location.e2e-spec.ts`
Use `mongodb-memory-server`. Seed 3 nurses at known coordinates:

| Nurse | Coordinates (lng, lat) | Location | Online | Verified |
|-------|------------------------|----------|--------|----------|
| Nurse A | [31.2357, 30.0444] | Downtown Cairo | Yes | Yes |
| Nurse B | [31.2156, 30.0081] | Giza | Yes | Yes |
| Nurse C | [31.3263, 30.0915] | Heliopolis | No | Yes |

Patient queries nearby with coordinates of central Cairo [31.2357, 30.0444]:

Test:
1. `GET /nurses/nearby?lat=30.0444&lng=31.2357&radiusKm=15` -> 200, Nurse A first (closest), Nurse B second. Nurse C excluded (offline).
2. `GET /nurses/nearby?lat=30.0444&lng=31.2357&radiusKm=2` -> 200, only Nurse A (within 2km).
3. `GET /nurses/nearby?lat=30.0444&lng=31.2357&genderPref=FEMALE` -> 200, only female nurses (set Nurse A gender to MALE, Nurse B to FEMALE in seed data; assert only Nurse B returns).
4. `POST /nurse/location` with nurse token -> 200, then `GET /nurse/location-history/:nurseId` as same nurse -> 200, array contains the update.
5. `GET /nurse/location-history/:nurseId` as a different nurse -> 403.
6. `GET /nurse/location-history/:nurseId` as admin -> 200.
7. `POST /nurse/location` as a patient -> 403.
8. `GET /nurses/nearby` as a nurse -> 403 (only patients search).

Note: `mongodb-memory-server` supports 2dsphere indexes. Ensure the index is created before running geo queries. The schema's `NurseSchema.index({ location: '2dsphere' })` should handle this on model registration, but if the e2e test creates the model manually, call `NurseSchema.index({ location: '2dsphere' })` or run `createIndexes` explicitly.

---

## 10. Acceptance Criteria (Your Location Stream)

- [ ] `POST /nurse/location` updates `nurses.location` + inserts into `location_history`
- [ ] `POST /nurse/location` stores coordinates as `[longitude, latitude]` (longitude first)
- [ ] `GET /nurses/nearby` returns nurses sorted by distance, within radius, only online + approved
- [ ] `GET /nurses/nearby` respects `genderPref` query param
- [ ] `GET /nurses/nearby` does not return sensitive fields (phone, license, wallet, location coords)
- [ ] `GET /nurse/location-history/:nurseId` returns 403 for other patients, 200 for own nurse, 200 for admin
- [ ] No `@Public()` on any location endpoint
- [ ] `@Roles()` applied per endpoint
- [ ] Swagger docs updated
- [ ] `npm run lint` passes
- [ ] `npm test` passes (location unit suite)
- [ ] `npm run test:e2e` passes (location e2e suite)

---

## 11. Environment Setup

```bash
git checkout main && git pull
git checkout -b feat/sprint-1-location
docker compose up -d
npm run start:dev
npm test
npm run test:e2e
```

---

## 12. Files You Will Create/Modify

**Modify:**
- `src/modules/location/location.service.ts` (replace 2 stubs, add `getLocationHistory`, add `getETA` if time permits)
- `src/modules/location/location.controller.ts` (remove `@Public`, add `@Roles`, add history endpoint)
- `src/modules/location/location.module.ts` (register Nurse + LocationHistory schemas)

**Create:**
- `src/modules/location/dto/update-location.dto.ts`
- `src/modules/location/dto/nearby-query.dto.ts`
- `src/modules/location/dto/index.ts` (update exports)
- `src/modules/location/location.service.spec.ts`
- `test/location.e2e-spec.ts`

---

## 13. Reference Files (read before starting)

- `src/modules/users/schemas/nurse.schema.ts` — Nurse schema with `location` field (GeoJSON Point) + `2dsphere` index (line 72)
- `src/modules/location/schemas/location-history.schema.ts` — LocationHistory schema with TTL index
- `src/common/enums/index.ts` — `Gender`, `GenderPreference`, `UserType` enums
- `src/common/decorators/current-user.decorator.ts` — `@CurrentUser()` usage
- `src/common/decorators/roles.decorator.ts` — `@Roles()` usage
- `src/config/validation.ts` — `OSRM_BASE_URL` env (line 29), `NURSE_SEARCH_RADIUS_KM` (line 35)
- `docs/Nabdh_Platform_BRD_PRD_System_Design.md` — Section 3.2.1 (Geospatial Design), Section 3.2.2 (collections), Section 3.2.3 (indexes)
- `diagrams/sequence/seq-booking-overall.puml` — location tracking intervals (3s/5s/30s)
- `diagrams/sequence/seq-sos-emergency.puml` — SOS radius (20km -> 30km), 3-second refresh

---

## Questions?

Flag in the team channel. The most common bug in geospatial code is swapping latitude and longitude. Double-check: GeoJSON coordinates are `[longitude, latitude]`. Always.

---

*End of Stream C Brief*
