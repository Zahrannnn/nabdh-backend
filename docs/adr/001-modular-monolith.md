# ADR 001: Modular Monolith Architecture

## Status

Accepted

## Context

Nabdh is a real-time healthcare marketplace serving Egypt. At MVP stage, we have:

- **1 backend developer** — need to move fast without coordination overhead
- **4 client apps** (Flutter patient, Flutter nurse, React admin, AI agent)
- **Strong domain boundaries** — auth, users, booking, payment, location, chat, notifications, admin, analytics
- **No team experience with distributed systems**

We evaluated microservices vs monolithic approaches.

## Decision

We adopt a **Modular Monolith** — a single NestJS application (`@nestjs/core`) with strict module boundaries enforced by convention and code review:

- One deployable artifact (Docker image)
- One HTTP port (`3000`) for REST + WebSocket
- One PostgreSQL database
- In-process event bus (`@nestjs/event-emitter`) + PostgreSQL outbox table for async
- No Redis, no message broker, no inter-service HTTP

## Rationale

| Factor | Modular Monolith | Microservices |
|--------|-----------------|---------------|
| Time to MVP | Weeks | Months |
| Refactoring cost | Low (extract module later) | High |
| Debugging | Single process | Distributed tracing needed |
| Team productivity | High (1 dev) | Low (overhead > output) |
| Operational complexity | Low | High |
| Scalability | Vertical + read replicas | Horizontal per service |

The modules are structured so that extraction into separate services later is straightforward — they already communicate only via events and exported providers.

## Consequences

- Modules communicate via `@nestjs/event-emitter` (sync) and outbox table (async)
- Cross-module access only via exported providers — no direct file imports
- Each module owns its Prisma models (grouped by `// module:` comments)
- When traffic demands it, hot modules (booking, payment) can be extracted into separate services

## Related

- [Single Prisma Schema Decision](./002-single-prisma-schema.md)
