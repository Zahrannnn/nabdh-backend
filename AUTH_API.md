# Nabdh Auth API — Flutter Integration

**Base URL**: `http://HOST:3000/api/v1`

**Content-Type**: `application/json`

**Email format**: valid email address (e.g. user@example.com)

**Response language**: Arabic for user-facing messages, English for error codes.

---

## 1. Send OTP

```
POST /auth/otp/send
```

### Request
```json
{
  "email": "user@example.com",
  "role": "PATIENT"
}
```

`role`: `"PATIENT"` or `"NURSE"`

### Success 200
```json
{
  "message": "تم إرسال رمز التحقق بنجاح"
}
```

### Errors
| Code | Meaning |
|------|---------|
| 429  | Email rate limit (3 OTP / 15 min per email) |
| 409  | Email registered with different role |

---

## 2. Verify OTP

```
POST /auth/otp/verify
```

### Request
```json
{
  "email": "user@example.com",
  "code": "123456",
  "role": "PATIENT"
}
```

`code`: 6-digit string

### Success 200
```json
{
  "accessToken": "eyJhbG...",
  "refreshToken": "a0b1c2d3e4f5...",
  "isNewUser": true,
  "user": {
    "id": "667a1b2c3d4e5f6a7b8c9d0e",
    "email": "user@example.com",
    "type": "PATIENT",
    "nurseStatus": null
  }
}
```

`isNewUser`: `true` if account was just created (first sign-up), `false` for returning users.

`nurseStatus`: `null` for patients. For nurses: `"INCOMPLETE"`, `"PENDING"`, `"APPROVED"`, `"REJECTED"`.

For **new users**: account and profile stub are auto-created on verify. Patient gets a Patient profile; Nurse gets a Nurse profile with `licenseNumber = PENDING-<userId>` and `verificationStatus = INCOMPLETE`. The nurse/patient completes their profile via the users endpoints.

### Errors
| Code | Meaning |
|------|---------|
| 400  | Invalid/expired OTP code |
| 403  | User suspended or banned |
| 409  | Account exists with different role |

---

## 3. Refresh Token

```
POST /auth/refresh
```

### Request
```json
{
  "refreshToken": "a0b1c2d3e4f5..."
}
```

### Success 200
```json
{
  "accessToken": "eyJhbG...",
  "refreshToken": "new_refresh_token..."
}
```

Old refresh token is revoked. New pair returned (token rotation).

### Errors
| Code | Meaning |
|------|---------|
| 401  | Token invalid or expired |

---

## 4. Logout

```
POST /auth/logout
```

**Headers**: `Authorization: Bearer <accessToken>`

### Request
```json
{
  "refreshToken": "a0b1c2d3e4f5..."
}
```

### Success 200
```json
{
  "message": "تم تسجيل الخروج بنجاح"
}
```

### Errors
| Code | Meaning |
|------|---------|
| 401  | Invalid token or token belongs to different user |

---

## Auth Flow Summary

```
┌─────────┐         ┌───────────┐         ┌──────────┐
│ sendOtp │ ──────> │ verifyOtp │ ──────> │ Logged in│
└─────────┘         └───────────┘         └──────────┘
                         │
                         ├── accessToken: short-lived (15 min)
                         └── refreshToken: long-lived (7 days)
                              Used for /refresh to get new tokens
                              Used in /logout to revoke session
```

### Token usage
- `accessToken`: Pass in `Authorization: Bearer <token>` header for all authenticated endpoints.
- `refreshToken`: Store securely (flutter_secure_storage). Call `/auth/refresh` when accessToken expires (401 response).
- On app logout: call `/auth/logout` with refreshToken to revoke the session server-side.

---

## Global Error Format

All errors follow this shape:
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": ["وصف الخطأ بالعربية"],
  "timestamp": "2026-06-21T15:00:00.000Z",
  "path": "/api/v1/auth/otp/send",
  "requestId": "uuid"
}
```

`message` is always an array of strings (even single message).
