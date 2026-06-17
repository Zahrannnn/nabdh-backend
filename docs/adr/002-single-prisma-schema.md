# ADR 002: Single Prisma Schema

## Status

Accepted

## Context

With 9 domain modules (auth, users, booking, payment, location, chat, notifications, admin, analytics), we needed a database schema strategy that balances developer velocity with clean boundaries.

## Decision

We use a **single `prisma/schema.prisma`** file containing all models, grouped by module comments:

```prisma
// --- module: users ---
model User { ... }

// --- module: booking ---
model ServiceRequest { ... }
```

## Rationale

| Approach | Pros | Cons |
|----------|------|------|
| Single schema | One source of truth, easy migrations, cross-model relations | File can grow large |
| Multi-schema | Strict isolation | Complex migrations, no cross-schema relations, Prisma limitations |

Key factors:
- Prisma does not natively support multi-file schemas without community tools
- Cross-module relations (e.g., `ServiceRequest → Patient`) are essential
- One backend dev — simplicity > isolation
- Models are clearly grouped by `// module:` comments

## Consequences

- All migrations are sequential in one `migrations/` directory
- Module ownership is enforced by convention (comments + code review)
- When extracting a module to a separate service, its models can be copied to a new schema
- The `OutboxEvent` table is shared across all modules for async event dispatch
