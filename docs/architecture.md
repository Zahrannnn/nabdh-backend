# Nabdh Architecture

## Overview

Nabdh is a modular monolith backend serving a real-time home nursing marketplace for Egypt. A single NestJS application hosts all domain logic, with strict module boundaries.

## Architecture Diagram

```mermaid
graph TB
    subgraph "Mobile Clients"
        P[Flutter Patient App]
        N[Flutter Nurse App]
    end
    subgraph "Web Clients"
        A[React Admin Panel]
    end
    subgraph "Nabdh API Server :3000"
        GW[API Gateway<br/>Global Prefix /api/v1]
        GW --> Auth[Auth Module]
        GW --> Users[Users Module]
        GW --> Booking[Booking Module]
        GW --> Payment[Payment Module]
        GW --> Location[Location Module]
        GW --> Chat[Chat WebSocket]
        GW --> Notif[Notifications Module]
        GW --> Admin[Admin Module]
        GW --> Analytics[Analytics Module]
        
        subgraph "Event Bus"
            EE[EventEmitter<br/>In-Process]
            OB[Outbox Table<br/>PostgreSQL]
        end
        
        Booking --> EE
        Notif --> EE
        Booking --> OB
    end
    subgraph "Infrastructure"
        DB[(MongoDB 7<br/>2dsphere Geo)]
        MN[(MinIO S3<br/>Documents)]
    end
    
    GW --> PG
    GW --> MN
    
    style GW fill:#4a90d9,color:#fff
    style EE fill:#f39c12,color:#fff
    style OB fill:#e74c3c,color:#fff
```

## Key Decisions

- **Single process** — all REST + WebSocket on port 3000
- **No Redis** — event-emitter + outbox collection for async
- **MongoDB 2dsphere** — location proximity queries
- **MinIO** — S3-compatible document storage

## Module Communication

| Pattern | Mechanism | Use Case |
|---------|-----------|----------|
| Synchronous | Injected service | Cross-module queries (e.g., booking reads user) |
| In-process event | `@nestjs/event-emitter` | Immediate reactions (e.g., notification on offer) |
| Async event | Outbox collection + cron | Reliable dispatch (e.g., analytics aggregation) |
