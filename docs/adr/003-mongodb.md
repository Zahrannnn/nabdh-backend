# ADR 003: MongoDB 7 with Mongoose ODM

## Status

Accepted (replaces ADR 002 — Single Prisma Schema)

## Context

The initial scaffold used PostgreSQL 16 + PostGIS with Prisma ORM. After evaluating the data model against product requirements, we identified:

- **Geospatial queries** are core to the product ($near, $geoNear, GeoJSON Point)
- **Most relationships are document-embedded or soft-referenced** — no complex joins
- **Schemaless flexibility** suits MVP iteration speed
- **Single-process monolith** doesn't need RLS or connection pooling
- **MongoDB Atlas** on `me-south-1` (Bahrain) is the closest managed DB to Egypt

## Decision

Replace PostgreSQL/PostGIS/Prisma with **MongoDB 7** and **Mongoose ODM**:

| Before | After |
|--------|-------|
| PostgreSQL 16 + PostGIS | MongoDB 7 |
| Prisma ORM | Mongoose via `@nestjs/mongoose` |
| SQL schema + migrations | Mongoose schemas + indexes |
| PostGIS geography type | GeoJSON `Point` + 2dsphere indexes |
| UUID primary keys | MongoDB `ObjectId` |

## Rationale

| Factor | Winner |
|--------|--------|
| Geospatial ($near, $geoNear) | MongoDB — native, simple GeoJSON queries |
| Nurse location updates | MongoDB — write-optimized, no schema migrations |
| Wallet transactions | MongoDB multi-document ACID transactions |
| MVP iteration speed | MongoDB — no migration files, flexible schema |
| Deployment (Bahrain region) | MongoDB Atlas — me-south-1 availability |
| Team size (1 backend) | MongoDB — lower cognitive overhead |

## Consequences

- All Prisma models converted to Mongoose schemas (20 collections)
- `2dsphere` indexes on `nurses.location`, `addresses.location`, `service_requests.location`
- 15 km / 20 km nurse matching via `$near` / `$geoNear`
- MongoDB transactions for wallet operations
- TTL indexes on `otp_sessions.expiresAt` and `refresh_tokens.expiresAt`
- `outbox_events` collection replaces outbox table
- `mongodb-memory-server` for test isolation
- Docker image uses `mongo:7` instead of `postgis/postgis:16-3.4`
