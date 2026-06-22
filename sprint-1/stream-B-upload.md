# Sprint 1 — Stream B: Upload Module (MinIO / S3)

> **To:** BE-2
> **From:** Backend Lead
> **Subject:** Sprint 1 / Stream B: New Upload Module — MinIO File Storage
> **Sprint:** 1 of 9 (MVP Phase A)
> **Duration:** 10 working days (days 1-3, then hand off to Location stream)
> **Branch:** `feat/sprint-1-upload`

---

## Email Body

BE-2,

Your first task in Sprint 1: build the upload module from scratch. This is a new module under `src/modules/upload/` that wraps MinIO (dev) / S3 (prod) for nurse document upload, profile photos, and service icons.

BE-1 depends on your `UploadService` being ready by day 3 for the nurse document upload endpoint. Build upload first, then move to the Location stream (separate brief).

Full context below: env vars already defined, the service API, controller endpoints, file storage strategy, testing, and the exact dependency to install.

Key points:
- This is a brand new module. Follow the existing module structure (module, controller, service, dto).
- The MinIO bucket may not exist on first run. Your service must create it on init if missing.
- File type whitelist: pdf, jpg, jpeg, png only. Size limit: 10MB.
- Signed URLs for private access (admin reviewing documents). 15-minute expiry.
- Coordinate with BE-1 on the `UploadService` public API on day 1 so they can mock it in tests while you build it.

Standup: daily 10:00. Demo: end of day 10 (combined with Location stream).

---

## 1. Current State

No upload module exists. Env vars already defined in `src/config/validation.ts`:
```javascript
S3_ENDPOINT: 'http://minio:9000'       // MinIO dev, S3 prod
S3_ACCESS_KEY: 'nabdh_minio'
S3_SECRET_KEY: 'nabdh_minio_secret'
S3_BUCKET: 'nabdh-documents'
S3_REGION: 'us-east-1'
```

Docker Compose already runs MinIO (`docker-compose.yml`). Verify it starts:
```bash
docker compose up -d minio
# MinIO console: http://localhost:9001 (nabdh_minio / nabdh_minio_secret)
```

---

## 2. Dependencies to Install

```bash
npm install minio
npm install -D @types/multer
```

Verify these do not conflict with existing deps in `package.json` before installing. `multer` itself comes with `@nestjs/platform-express` (already a dependency). You only need the types.

---

## 3. Module Structure to Create

```
src/modules/upload/
  upload.module.ts
  upload.controller.ts
  upload.service.ts
  dto/
    index.ts
```

---

## 4. UploadService — Public API

This is the interface BE-1 will call. Agree on it with BE-1 on day 1 before building:

```typescript
interface UploadResult {
  url: string;        // accessible URL (MinIO dev, CloudFront prod)
  key: string;        // storage key for deletion + signed URLs
  mimeType: string;
  size: number;
}

class UploadService {
  // Upload a file, return { url, key, mimeType, size }
  async upload(file: Express.Multer.File): Promise<UploadResult>

  // Generate a presigned download URL (15-minute expiry)
  async getSignedUrl(key: string): Promise<string>

  // Delete a file by key
  async delete(key: string): Promise<void>
}
```

### Constructor
- Inject `ConfigService`.
- Read `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_REGION` from env.
- Create a `Minio.Client` instance with the endpoint config.
- Implement `OnModuleInit`: check if bucket exists (`client.bucketExists`), create if missing (`client.makeBucket`).

### upload(file)
1. Generate a storage key: `{userId}/{documentType}/{timestamp}-{random6}.{ext}`
   - `userId`: pass as a parameter or extract from request context. Simplest: add an optional `userId` param to `upload()`.
   - `ext`: derived from `file.originalname` or `file.mimetype`.
2. Put object to MinIO: `client.putObject(bucket, key, file.buffer, file.size, { 'Content-Type': file.mimetype })`.
3. Construct the URL: `http://localhost:9000/{bucket}/{key}` for dev. Read the endpoint from `S3_ENDPOINT` env so it works in Docker too.
4. Return `{ url, key, mimeType: file.mimetype, size: file.size }`.

### getSignedUrl(key)
- `client.presignedGetObject(bucket, key, 900)` (900 seconds = 15 minutes).
- Return the signed URL string.

### delete(key)
- `client.removeObject(bucket, key)`.

---

## 5. UploadController — Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/upload` | JWT | Multipart file upload. Accept `multipart/form-data` with field `file`. Validate type + size. Return `{ url, key, mimeType, size }`. |
| GET | `/upload/signed-url?key=...` | JWT | Get presigned download URL (15-min expiry). |

### POST /upload Implementation

```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('file', {
  limits: { fileSize: 10 * 1024 * 1024 },  // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new BadRequestException('Invalid file type. Allowed: PDF, JPG, PNG'), false);
    }
    cb(null, true);
  },
}))
async upload(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthUser) {
  if (!file) throw new BadRequestException('No file provided');
  return this.uploadService.upload(file, user._id.toString());
}
```

Import `FileInterceptor` and `UploadedFile` from `@nestjs/platform-express`.

### GET /upload/signed-url Implementation

```typescript
@Get('upload/signed-url')
async getSignedUrl(@Query('key') key: string) {
  if (!key) throw new BadRequestException('key query param required');
  const url = await this.uploadService.getSignedUrl(key);
  return { url, expiresIn: 900 };
}
```

### Auth
- Both endpoints require JWT (no `@Public()`).
- Any authenticated user can upload (patients upload profile photos, nurses upload documents, admins upload service icons). No role restriction beyond JWT.

---

## 6. Module Wiring

`upload.module.ts`:
```typescript
@Module({
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],  // BE-1's UsersModule will import this
})
export class UploadModule {}
```

Add `UploadModule` to `imports` array in `src/app.module.ts`.

---

## 7. File Storage Strategy

- **Key format**: `{userId}/{documentType}/{timestamp}-{random6}.{ext}`
  - Example: `507f1f77bcf86cd799439011/NURSING_LICENSE/1719000000-a1b2c3.pdf`
- **Bucket**: `nabdh-documents` (from env `S3_BUCKET`).
- **Dev URL**: `{S3_ENDPOINT}/{S3_BUCKET}/{key}` (e.g. `http://localhost:9000/nabdh-documents/...`)
- **Prod URL**: Will be CloudFront. For Sprint 1, return the MinIO URL directly. A config flag can switch this later.
- **Signed URLs**: For private access (admin reviewing nurse documents). The URL returned by `upload()` is directly accessible in dev for simplicity. In prod, all access goes through signed URLs.

---

## 8. Testing

### Unit Tests: `src/modules/upload/upload.service.spec.ts`
Mock the `Minio.Client` (or mock at the `uploadService` boundary).

Test:
1. `upload()` returns correct `{ url, key, mimeType, size }` with key containing userId + timestamp.
2. `getSignedUrl()` calls `presignedGetObject` with correct bucket + key + 900s expiry.
3. `delete()` calls `removeObject` with correct bucket + key.
4. `OnModuleInit` creates bucket if it does not exist (mock `bucketExists` to return false, assert `makeBucket` called).
5. `OnModuleInit` does not create bucket if it already exists (mock `bucketExists` to return true, assert `makeBucket` not called).

### E2E Tests: `test/upload.e2e-spec.ts`
Seed a user with a JWT token.

Test:
1. `POST /upload` with a real PDF buffer using `supertest` `.attach('file', buffer, 'test.pdf')` -> 201, response has `url`, `key`, `mimeType`, `size`.
2. `POST /upload` with a file > 10MB -> 413 (or 400 from fileFilter).
3. `POST /upload` with a `.exe` file -> 400 "Invalid file type".
4. `POST /upload` with no file -> 400 "No file provided".
5. `POST /upload` without auth -> 401.
6. `GET /upload/signed-url?key=...` -> 200, response has `url` + `expiresIn: 900`.
7. `GET /upload/signed-url` without `key` param -> 400.

For the E2E tests, you can either run against the real MinIO in Docker, or mock the `UploadService` at the module level. Running against real MinIO is more valuable but slower. If mocking, override the provider in the test app module.

---

## 9. Acceptance Criteria (Your Upload Stream)

- [ ] `POST /upload` accepts a PDF, returns `{ url, key, mimeType, size }`
- [ ] `POST /upload` rejects files > 10MB with 413 or 400
- [ ] `POST /upload` rejects non-whitelisted types (e.g. `.exe`) with 400
- [ ] `POST /upload` rejects unauthenticated requests with 401
- [ ] `GET /upload/signed-url?key=...` returns a valid presigned URL with 15-min expiry
- [ ] MinIO bucket auto-created on app startup if missing
- [ ] `UploadService` exported and importable by `UsersModule`
- [ ] `npm run lint` passes
- [ ] `npm test` passes (upload unit suite)
- [ ] `npm run test:e2e` passes (upload e2e suite)
- [ ] Docker image builds: `docker build .` succeeds

---

## 10. Environment Setup

```bash
git checkout main && git pull
git checkout -b feat/sprint-1-upload
npm install minio
npm install -D @types/multer
docker compose up -d minio
# Verify MinIO console: http://localhost:9001
npm run start:dev
npm test
npm run test:e2e
```

---

## 11. Files You Will Create/Modify

**Create:**
- `src/modules/upload/upload.module.ts`
- `src/modules/upload/upload.controller.ts`
- `src/modules/upload/upload.service.ts`
- `src/modules/upload/dto/index.ts`
- `src/modules/upload/upload.service.spec.ts`
- `test/upload.e2e-spec.ts`

**Modify:**
- `src/app.module.ts` (add `UploadModule` to imports)
- `package.json` (add `minio` + `@types/multer`)

---

## 12. Reference Files (read before starting)

- `src/config/validation.ts` — all `S3_*` env vars (lines 16-20)
- `src/common/decorators/current-user.decorator.ts` — `@CurrentUser()` for getting userId
- `src/modules/auth/auth.controller.ts` — reference for controller patterns, Swagger decorators
- `docker-compose.yml` — MinIO service config
- `diagrams/sequence/seq-nurse-onboarding.puml` — document upload flow, 10MB limit, file types (National ID, Nursing License, Profile Photo)

---

## 13. Coordination with BE-1

On day 1, share the `UploadService` interface with BE-1 so they can:
1. Mock it in their unit tests immediately.
2. Wire `UsersModule` to import `UploadModule` on day 3 when your service is ready.

The interface:
```typescript
interface UploadResult {
  url: string;
  key: string;
  mimeType: string;
  size: number;
}

class UploadService {
  async upload(file: Express.Multer.File, userId: string): Promise<UploadResult>
  async getSignedUrl(key: string): Promise<string>
  async delete(key: string): Promise<void>
}
```

If you need to change this interface after day 1, notify BE-1 immediately.

---

## Questions?

Flag in the team channel. Do not block silently. MinIO connection issues in Docker are the most likely blocker. If MinIO does not start, check `docker compose logs minio`.

---

*End of Stream B Brief*
