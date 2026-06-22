# Backend Agent Prompt — Migrate Nabdh Backend to MongoDB

> Copy everything below the line and paste into your backend AI agent.  
> **Context files:** `BACKEND_AGENT_CONTEXT.md` (v1.4), `Nabdh_Platform_BRD_PRD_System_Design.md` (v1.4)

---

## TASK

Migrate the existing **`nabdh_backend`** NestJS modular monolith from **PostgreSQL + Prisma + PostGIS** to **MongoDB 7 + Mongoose**.

This is a **breaking infrastructure change** (decision **C21**). Update all code, Docker, docs, tests, and ADRs. Do not leave Prisma/PostgreSQL artifacts.

---

## CURRENT STATE (expected)

- Repo: `D:\nabdh-platform\nabdh_backend\` (or cloned `nabdh-backend`)
- NestJS modular monolith on port 3000
- Prisma + `prisma/schema.prisma`
- Docker: `postgis/postgis:16-3.4` + MinIO
- ADRs: `001-modular-monolith.md`, `002-single-prisma-schema.md`

---

## TARGET STATE

| Layer | Before | After |
|-------|--------|-------|
| Database | PostgreSQL + PostGIS | **MongoDB 7** |
| ODM | Prisma | **Mongoose** (`@nestjs/mongoose`) |
| Geospatial | PostGIS `ST_MakePoint` / GIST | **GeoJSON Point** + **2dsphere** indexes |
| Outbox | Prisma `OutboxEvent` model | Mongoose `OutboxEvent` schema |
| Docker | `postgres` service | `mongo:7` service |
| Env | `DATABASE_URL` (postgresql) | `MONGODB_URI` |
| Health check | Prisma `$queryRaw` | `mongoose.connection.readyState` |
| Prod | RDS PostgreSQL | **MongoDB Atlas** (document in README) |

---

## MIGRATION STEPS (execute in order)

### 1. Dependencies

```bash
pnpm remove prisma @prisma/client
pnpm add mongoose @nestjs/mongoose
```

Delete:
- `prisma/` directory (schema, migrations, seed)
- `src/database/prisma.service.ts` (if exists)
- ADR `002-single-prisma-schema.md` → replace with `003-mongodb.md`

### 2. Docker

**`infra/docker/docker-compose.yml`:**
- Remove `postgres` service entirely
- Add `mongo` service:

```yaml
mongo:
  image: mongo:7
  ports:
    - "27017:27017"
  environment:
    MONGO_INITDB_ROOT_USERNAME: nabdh
    MONGO_INITDB_ROOT_PASSWORD: nabdh_dev
  volumes:
    - mongo_data:/data/db
  healthcheck:
    test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
    interval: 10s
    timeout: 5s
    retries: 5
```

- Update `api` service `depends_on: mongo` (healthy)
- Remove `01-init-postgis.sql`
- Add `01-mongo-init.js` if needed (create indexes on first boot)

### 3. Environment

**`.env.example`:**

```env
MONGODB_URI=mongodb://nabdh:nabdh_dev@mongo:27017/nabdh?authSource=admin
MONGO_INITDB_ROOT_USERNAME=nabdh
MONGO_INITDB_ROOT_PASSWORD=nabdh_dev
MONGO_DATABASE=nabdh
```

Remove all `DATABASE_URL`, `POSTGRES_*` variables.

### 4. Database Module

**`src/database/database.module.ts`:**

```typescript
MongooseModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    uri: config.get<string>('MONGODB_URI'),
  }),
  inject: [ConfigService],
})
```

Export `DatabaseModule` globally from `AppModule`.

### 5. Mongoose Schemas (per module)

Create `src/modules/<module>/schemas/*.schema.ts` for every Prisma model.

**Naming:** collections use `snake_case` plural via `@Schema({ collection: 'nurses' })`  
**Fields:** `camelCase` in TypeScript  
**IDs:** `Types.ObjectId` with `@Prop({ type: Types.ObjectId, ref: 'User' })`

**Geospatial fields** — replace `lat`/`lng` pairs with:

```typescript
@Prop({
  type: {
    type: String,
    enum: ['Point'],
    required: true,
  },
  coordinates: {
    type: [Number],
    required: true,
  },
})
location: { type: 'Point'; coordinates: [number, number] }; // [lng, lat]
```

**Indexes to create** (in schema or seed script):

```typescript
NurseSchema.index({ location: '2dsphere' });
NurseSchema.index({ isOnline: 1, verificationStatus: 1 });
AddressSchema.index({ location: '2dsphere' });
ServiceRequestSchema.index({ location: '2dsphere' });
OtpSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
OutboxEventSchema.index({ status: 1, createdAt: 1 });
```

### 6. Replace Prisma Calls in Services

For each `*.service.ts` that used `PrismaService`:

| Prisma | Mongoose |
|--------|----------|
| `prisma.user.findUnique({ where: { id } })` | `this.userModel.findById(id)` |
| `prisma.user.create({ data })` | `this.userModel.create(data)` |
| `prisma.user.update({ where, data })` | `this.userModel.findByIdAndUpdate(id, data, { new: true })` |
| `prisma.$transaction([...])` | `session.startTransaction()` with multi-doc writes |
| Raw geo SQL | `$geoNear` or `$near` on `location` field |

**Location matching service** — implement:

```typescript
async findNearbyNurses(lng: number, lat: number, radiusMeters: number, gender?: Gender) {
  const filter: Record<string, unknown> = {
    isOnline: true,
    verificationStatus: 'APPROVED',
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radiusMeters,
      },
    },
  };
  if (gender) filter.gender = gender;
  return this.nurseModel.find(filter).limit(50).exec();
}
```

### 7. Module Registration

Each module imports its schemas:

```typescript
MongooseModule.forFeature([
  { name: Nurse.name, schema: NurseSchema },
])
```

Register models in module `providers` / inject with `@InjectModel(Nurse.name)`.

### 8. Outbox Processor

- Replace Prisma outbox queries with `outboxEventModel.find({ status: 'PENDING' }).sort({ createdAt: 1 }).limit(100)`
- Mark processed: `findByIdAndUpdate(id, { status: 'SENT', processedAt: new Date() })`

### 9. Health Module

```typescript
async checkReady(): Promise<boolean> {
  return this.connection.readyState === 1; // connected
}
```

### 10. Tests

- Replace Prisma test mocks with `mongodb-memory-server` or testcontainers MongoDB
- Update e2e setup to connect to in-memory Mongo
- Remove all `prisma migrate` from CI scripts

### 11. Documentation

Update these files:
- `README.md` — badges, quick start, env table
- `docs/architecture.md` — diagram: MongoDB not PostgreSQL
- `docs/local-development.md` — `docker compose up mongo` not postgres
- `CONTRIBUTING.md` — Mongoose schema conventions not Prisma
- Create `docs/adr/003-mongodb.md` — why MongoDB over PostgreSQL for Nabdh
- Deprecate/remove `docs/adr/002-single-prisma-schema.md`

### 12. Seed Script

Create `scripts/seed-mongo.ts` or `src/database/seed.ts`:
- Seed 7 MVP services (Arabic names from Appendix A)
- Create 2dsphere indexes
- Optional: dev admin user

---

## ACCEPTANCE CRITERIA

- [ ] `pnpm install` succeeds — no Prisma in `package.json`
- [ ] `docker compose up` → api + mongo + minio healthy
- [ ] `GET /api/v1/health/ready` → 200 (Mongo connected)
- [ ] `POST /api/v1/auth/otp/send` → 200
- [ ] `POST /api/v1/requests` → 201 (stub with GeoJSON location)
- [ ] Nearby nurse query uses `$near` / `$geoNear` — no raw SQL
- [ ] `pnpm test` passes
- [ ] `pnpm lint` passes
- [ ] No files reference `prisma`, `postgresql`, `postgis`, or `DATABASE_URL`
- [ ] README documents MongoDB Atlas for production
- [ ] ADR `003-mongodb.md` written

---

## DO NOT

- Add Redis
- Split into microservices
- Keep dual-write to PostgreSQL and MongoDB
- Use `lat`/`lng` separate fields for geospatial queries (use GeoJSON Point)
- Forget `[longitude, latitude]` order in coordinates

---

## DELIVERABLES

1. Summary of files changed (count)
2. List of Mongoose schemas created
3. `curl` output for health + stub endpoints
4. Link to new ADR `003-mongodb.md`
5. Note any breaking API changes (should be none if only DB layer changed)

---

**Start now. Migrate `nabdh_backend` to MongoDB and report deliverables.**
