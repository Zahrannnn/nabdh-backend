# API Conventions

## Base URL

```
http://localhost:3000/api/v1
```

## Authentication

- Patients & Nurses: OTP → JWT (access 15min + refresh 7d)
- Admin: email + password + 2FA (TOTP stub)
- JWT payload: `{ sub, type: PATIENT | NURSE | ADMIN, role, iat, exp }`
- Send as `Authorization: Bearer <token>`

## Standard Response Format

### Success
```json
{
  "id": "uuid",
  "status": "PENDING_OFFERS",
  "createdAt": "2026-06-17T12:00:00.000Z"
}
```

### Error
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": ["phone must be a valid Egyptian mobile number"],
  "timestamp": "2026-06-17T12:00:00.000Z",
  "path": "/api/v1/auth/otp/send",
  "requestId": "uuid"
}
```

## Headers

| Header | Description |
|--------|-------------|
| `X-Request-Id` | Auto-generated UUID for request tracing |
| `Authorization` | Bearer JWT token |
| `Content-Type` | `application/json` |

## Pagination

List endpoints return paginated results (MVP stub):
```json
{
  "data": [],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

## Rate Limiting

100 requests per minute per IP address.

## WebSocket

Endpoint: `ws://localhost:3000/api/v1/realtime`

Events:
- `message:send` — Send chat message
- `message:received` — Receive chat message
- `join:room` — Join booking room
